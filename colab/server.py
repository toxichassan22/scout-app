"""StreamingT2V API server for the Scout Camp digital festival.

This module is meant to be launched from Google Colab via
``StreamingT2V_Server.ipynb``. It wraps the official StreamingT2V
``inference.py`` CLI with a small FastAPI service that the React
front-end can call to queue prompts, poll status, and stream the
generated MP4 back to the browser.

Environment variables consumed at start-up:

* ``SCOUT_API_TOKEN`` (optional) - if set, every request must send the
  same value in the ``x-api-token`` header. Used to keep the public
  ngrok endpoint from being abused while Colab is running.
* ``NGROK_AUTHTOKEN``              - personal ngrok auth token.
* ``STREAMING_REPO_DIR``           - clone path for the StreamingT2V
  repository. Defaults to ``/content/StreamingT2V``.
* ``STREAMING_RESULTS_DIR``        - where generated videos are written.
  Defaults to ``/content/api_results``.
* ``STREAMING_PORT``               - local port for uvicorn. Defaults
  to ``8000``.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

REPO_DIR = Path(os.environ.get("STREAMING_REPO_DIR", "/content/StreamingT2V"))
INFERENCE_DIR = REPO_DIR / "t2v_enhanced"
RESULTS_ROOT = Path(os.environ.get("STREAMING_RESULTS_DIR", "/content/api_results"))
RESULTS_ROOT.mkdir(parents=True, exist_ok=True)
API_TOKEN = os.environ.get("SCOUT_API_TOKEN", "").strip()
PORT = int(os.environ.get("STREAMING_PORT", "8000"))

app = FastAPI(title="Scout Camp - StreamingT2V API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    team_name: Optional[str] = None
    base_model: str = Field(default="ModelscopeT2V")
    num_frames: int = Field(default=56, ge=24, le=600)
    num_steps: int = Field(default=50, ge=10, le=100)
    seed: int = 33
    negative_prompt: str = ""


JOBS: Dict[str, Dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()
QUEUE: List[str] = []
WORKER_BUSY = threading.Event()


def _check_token(token: Optional[str]) -> None:
    if API_TOKEN and (token or "").strip() != API_TOKEN:
        raise HTTPException(status_code=401, detail="invalid token")


def _build_inference_command(job: Dict[str, Any], output_dir: Path) -> List[str]:
    cmd: List[str] = [
        sys.executable,
        "inference.py",
        "--prompt",
        job["prompt"],
        "--output_dir",
        str(output_dir),
        "--base_model",
        job["base_model"],
        "--num_frames",
        str(job["num_frames"]),
        "--num_steps",
        str(job["num_steps"]),
        "--seed",
        str(job["seed"]),
        "--offload_models",
    ]
    if job.get("negative_prompt"):
        cmd.extend(["--negative_prompt", job["negative_prompt"]])
    return cmd


def _run_inference(job_id: str) -> None:
    job_dir = RESULTS_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    with JOBS_LOCK:
        job = JOBS[job_id]
        job["status"] = "processing"
        job["started_at"] = time.time()
        snapshot = dict(job)

    cmd = _build_inference_command(snapshot, job_dir)
    log_path = job_dir / "inference.log"
    with open(log_path, "wb") as log_file:
        proc = subprocess.run(
            cmd,
            cwd=INFERENCE_DIR,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            check=False,
        )

    mp4_files = sorted(job_dir.rglob("*.mp4"))
    with JOBS_LOCK:
        job = JOBS[job_id]
        if proc.returncode == 0 and mp4_files:
            chosen = mp4_files[-1]
            target = job_dir / "video.mp4"
            if chosen.resolve() != target.resolve():
                shutil.copy2(chosen, target)
            job["status"] = "done"
            job["video_path"] = str(target)
        else:
            job["status"] = "failed"
            job["error"] = (
                f"exit_code={proc.returncode}; "
                f"video_found={bool(mp4_files)}; see inference.log"
            )
        job["finished_at"] = time.time()


def _worker_loop() -> None:
    while True:
        job_id: Optional[str] = None
        with JOBS_LOCK:
            if QUEUE:
                job_id = QUEUE.pop(0)
        if not job_id:
            time.sleep(0.5)
            continue
        try:
            WORKER_BUSY.set()
            _run_inference(job_id)
        except Exception as exc:  # pragma: no cover - defensive guard
            with JOBS_LOCK:
                JOBS[job_id]["status"] = "failed"
                JOBS[job_id]["error"] = repr(exc)
                JOBS[job_id]["finished_at"] = time.time()
        finally:
            WORKER_BUSY.clear()


@app.get("/")
def health() -> Dict[str, Any]:
    with JOBS_LOCK:
        return {
            "ok": True,
            "service": "scout-streaming-t2v",
            "queue_size": len(QUEUE),
            "busy": WORKER_BUSY.is_set(),
            "jobs_total": len(JOBS),
            "auth_required": bool(API_TOKEN),
        }


@app.post("/generate")
def generate(
    req: GenerateRequest,
    x_api_token: Optional[str] = Header(default=None, alias="x-api-token"),
) -> Dict[str, Any]:
    _check_token(x_api_token)
    if not INFERENCE_DIR.exists():
        raise HTTPException(status_code=503, detail="model not ready")
    job_id = uuid.uuid4().hex
    with JOBS_LOCK:
        JOBS[job_id] = {
            "id": job_id,
            "status": "queued",
            "prompt": req.prompt,
            "team_name": req.team_name,
            "base_model": req.base_model,
            "num_frames": req.num_frames,
            "num_steps": req.num_steps,
            "seed": req.seed,
            "negative_prompt": req.negative_prompt,
            "created_at": time.time(),
        }
        QUEUE.append(job_id)
        position = len(QUEUE)
    return {"job_id": job_id, "status": "queued", "queue_position": position}


@app.get("/status/{job_id}")
def status(
    job_id: str,
    x_api_token: Optional[str] = Header(default=None, alias="x-api-token"),
) -> Dict[str, Any]:
    _check_token(x_api_token)
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="unknown job")
        queue_position = (QUEUE.index(job_id) + 1) if job_id in QUEUE else 0
        return {
            "id": job_id,
            "status": job["status"],
            "video_url": f"/videos/{job_id}.mp4" if job["status"] == "done" else None,
            "error": job.get("error"),
            "created_at": job.get("created_at"),
            "started_at": job.get("started_at"),
            "finished_at": job.get("finished_at"),
            "queue_position": queue_position,
        }


@app.get("/videos/{job_id}.mp4")
def video(job_id: str) -> FileResponse:
    target = RESULTS_ROOT / job_id / "video.mp4"
    if not target.exists():
        raise HTTPException(status_code=404, detail="video not ready")
    return FileResponse(target, media_type="video/mp4")


def start_worker() -> None:
    """Start the background inference worker (idempotent)."""
    if not getattr(start_worker, "_started", False):
        threading.Thread(target=_worker_loop, daemon=True).start()
        start_worker._started = True  # type: ignore[attr-defined]


def main() -> None:
    import uvicorn  # local import keeps the module importable without uvicorn

    start_worker()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")


if __name__ == "__main__":
    main()
