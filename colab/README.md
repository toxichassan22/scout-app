# StreamingT2V on Google Colab

This folder contains everything needed to host the **StreamingT2V** text-to-video
model on a free (or Pro) Google Colab GPU and expose it as a small HTTP API
that the Scout Camp web app calls during the "تصميم الفيديو" competition.

## Files

| File | Purpose |
| ---- | ------- |
| [`StreamingT2V_Server.ipynb`](StreamingT2V_Server.ipynb) | Open this in Colab and click `Run all`. Installs StreamingT2V, downloads weights, launches the FastAPI server, and prints a public ngrok URL. |
| [`server.py`](server.py) | The actual FastAPI server. The notebook downloads it from this repository at runtime so the latest version is always used. |

## One-time setup

1. **Clone this repository** (or upload `colab/server.py` manually). The
   notebook expects to fetch `server.py` from
   `https://raw.githubusercontent.com/toxichassan22/scout-app/main/colab/server.py`.
2. **Get an ngrok auth token** from <https://dashboard.ngrok.com> (free tier is
   fine).
3. **Open the notebook in Colab** by clicking
   [`StreamingT2V_Server.ipynb`](StreamingT2V_Server.ipynb) → `Open in Colab`,
   then choose `Runtime → Change runtime type → GPU`.
4. **Add Colab Secrets** (`Tools → Secrets`):
   - `NGROK_AUTHTOKEN` — required.
   - `SCOUT_API_TOKEN` — optional shared secret; the web app must send the same
     value in its `x-api-token` header. Recommended whenever the Colab is
     reachable from the public internet.
5. **`Run all`**. After a few minutes you will see something like:
   ```
   >>> Public URL: https://abcd-1234.ngrok-free.app
   ```
6. Open the Scout Camp admin panel → **الإعدادات** → paste:
   - `رابط الـ API` = the ngrok URL.
   - `توكن الحماية` = the same value you used for `SCOUT_API_TOKEN` (leave
     blank if you skipped it).

The teams' "تصميم الفيديو" page will now generate real videos via Colab.

## API contract

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET`  | `/`              | Health check + queue stats. |
| `POST` | `/generate`      | Body: `{ prompt, team_name?, base_model?, num_frames?, num_steps?, seed?, negative_prompt? }`. Returns `{ job_id, status: "queued", queue_position }`. |
| `GET`  | `/status/{id}`   | Returns `{ status: "queued"|"processing"|"done"|"failed", video_url?, error?, ... }`. |
| `GET`  | `/videos/{id}.mp4` | The generated MP4 (only after `status === "done"`). |

If `SCOUT_API_TOKEN` is set, every request must include
`x-api-token: <token>` (the React app does this automatically).

## Caveats

- Colab's free tier disconnects after ~12 hours and on idle. Keep the tab open
  during the festival.
- Each `ngrok` URL is regenerated when the notebook restarts. Update the admin
  settings whenever you re-launch the Colab.
- Generated videos live in Colab's ephemeral disk (`/content/api_results`).
  Download anything important before shutting the runtime down.
- The first generation is slow because StreamingT2V loads several models. Once
  warm, subsequent requests are noticeably faster.
