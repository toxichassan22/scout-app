import { Router } from 'express';
import { getGpuStatus, startGpuInstance, stopGpuInstance, checkGpuHealth } from '../../gpuService.js';
import logger from '../../logger.js';

const router = Router();

/**
 * GET /api/admin/gpu/status
 * Returns current EC2 status and GPU health
 */
router.get('/status', async (req, res) => {
  try {
    const [statusResult, healthResult] = await Promise.all([
      getGpuStatus(),
      checkGpuHealth(),
    ]);

    res.json({
      success: true,
      ...statusResult,
      health: healthResult,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get GPU status');
    res.status(500).json({
      success: false,
      error: err.message || 'فشل في استعلام حالة سيرفر الـ GPU',
    });
  }
});

/**
 * POST /api/admin/gpu/start
 * Starts the EC2 GPU instance
 */
router.post('/start', async (req, res) => {
  try {
    const result = await startGpuInstance();
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to start GPU instance');
    res.status(500).json({
      success: false,
      error: err.message || 'فشل في تشغيل سيرفر الـ GPU',
    });
  }
});

/**
 * POST /api/admin/gpu/stop
 * Stops the EC2 GPU instance
 */
router.post('/stop', async (req, res) => {
  try {
    const result = await stopGpuInstance();
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to stop GPU instance');
    res.status(500).json({
      success: false,
      error: err.message || 'فشل في إيقاف سيرفر الـ GPU',
    });
  }
});

/**
 * GET /api/admin/gpu/health
 * Checks FastAPI readiness on the GPU server
 */
router.get('/health', async (req, res) => {
  try {
    const health = await checkGpuHealth();
    res.json({
      success: true,
      ...health,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      ready: false,
      error: err.message || 'تعذر فحص جاهزية سيرفر الذكاء الاصطناعي',
    });
  }
});

export default router;
