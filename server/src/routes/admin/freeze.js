import { Router } from 'express';
import prisma from '../../db.js';
import { validate, zBoolean } from '../../middleware/validate.js';

const router = Router();

// Admin Emergency Freeze / Unfreeze Switch
const emergencyFreezeSchema = { body: { frozen: zBoolean('الحالة') } };
router.post('/emergency-freeze', validate(emergencyFreezeSchema), async (req, res) => {
  try {
    const { frozen } = req.body;
    await prisma.systemSetting.upsert({
      where: { key: 'EMERGENCY_FREEZE' },
      update: { value: frozen ? 'true' : 'false' },
      create: { key: 'EMERGENCY_FREEZE', value: frozen ? 'true' : 'false' }
    });

    if (req.io) {
      req.io.emit('emergency:freeze', { frozen: !!frozen });
    }

    res.json({ success: true, frozen: !!frozen });
  } catch (err) {
    req.log.error({ err }, 'admin emergency freeze failed');
    res.status(500).json({ success: false, error: 'فشل في تغيير حالة الطوارئ', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
