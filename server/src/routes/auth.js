import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'digital_scout_camp_secret_key_2026';

// Team Login
router.post('/team/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة السر مطلوبان' });
    }

    const team = await prisma.team.findUnique({ where: { username } });
    if (!team) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }

    const validPassword = await bcrypt.compare(password, team.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }

    const token = jwt.sign(
      { id: team.id, username: team.username, role: 'team', label: team.label },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: team.id, username: team.username, role: 'team', label: team.label }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في السيرفر عند تسجيل الدخول' });
  }
});

// Judge Login
router.post('/judge/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة السر مطلوبان' });
    }

    const judge = await prisma.judge.findUnique({ where: { username } });
    if (!judge) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }

    const validPassword = await bcrypt.compare(password, judge.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }

    const token = jwt.sign(
      { id: judge.id, name: judge.name, username: judge.username, role: 'judge' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: judge.id, name: judge.name, username: judge.username, role: 'judge' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في السيرفر عند تسجيل دخول المحكم' });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة السر مطلوبان' });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: admin.id, username: admin.username, role: 'admin' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في السيرفر عند تسجيل دخول الأدمن' });
  }
});

// Current User Info
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
