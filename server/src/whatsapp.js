import path from 'node:path';
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import logger from './logger.js';

const GROUP_ID_PATTERN = /^[^@\s]+@g\.us$/;
const RECONNECT_DELAY_MS = 15_000;

let socket = null;
let initialization = null;
let reconnectTimer = null;
let ready = false;
let state = 'disabled';
let shuttingDown = false;

const configuredGroupId = () => {
  const value = String(process.env.WHATSAPP_SUPPORT_GROUP_ID || '').trim();
  return GROUP_ID_PATTERN.test(value) ? value : '';
};

const whatsappEnabled = () => process.env.WHATSAPP_ENABLED === 'true' || Boolean(configuredGroupId());

const sessionPath = () => path.resolve(
  String(process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.baileys_auth')).trim(),
);

const serviceError = (code, message) => Object.assign(new Error(message), {
  code,
  statusCode: 503,
});

function scheduleReconnect() {
  if (shuttingDown || reconnectTimer || !whatsappEnabled()) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initializeWhatsApp();
  }, RECONNECT_DELAY_MS);
  reconnectTimer.unref?.();
}

async function listGroups(current) {
  if (process.env.WHATSAPP_LIST_GROUPS !== 'true') return;
  try {
    const groups = await current.groupFetchAllParticipating();
    const availableGroups = Object.entries(groups)
      .map(([id, group]) => ({ name: group.subject || 'بدون اسم', id }))
      .filter(group => GROUP_ID_PATTERN.test(group.id));
    logger.info({ groups: availableGroups }, 'WhatsApp support groups available for setup');
  } catch (error) {
    logger.error({ err: error }, 'failed to list WhatsApp support groups');
  }
}

function handleConnectionUpdate(current, update) {
  const { connection, lastDisconnect, qr } = update;
  if (qr) {
    ready = false;
    state = 'qr_pending';
    logger.warn('WhatsApp support QR generated; scan it from a secure server console');
    if (process.env.WHATSAPP_QR_TO_TERMINAL === 'true') qrcode.generate(qr, { small: true });
  }
  if (connection === 'open') {
    ready = true;
    state = 'ready';
    logger.info('WhatsApp support client is ready');
    void listGroups(current);
  }
  if (connection !== 'close') return;

  ready = false;
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const loggedOut = statusCode === DisconnectReason.loggedOut;
  state = loggedOut ? 'logged_out' : 'disconnected';
  if (socket === current) socket = null;
  if (loggedOut) {
    logger.error('WhatsApp support session was logged out; scan a new QR after clearing the session');
    return;
  }
  logger.warn({ statusCode }, 'WhatsApp support client disconnected; reconnecting');
  scheduleReconnect();
}

export function initializeWhatsApp() {
  if (shuttingDown || !whatsappEnabled()) {
    state = 'disabled';
    return Promise.resolve(false);
  }
  if (ready) return Promise.resolve(true);
  if (initialization) return initialization;
  if (socket) return Promise.resolve(false);

  state = 'starting';
  initialization = (async () => {
    const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath());
    if (shuttingDown) return false;
    const current = makeWASocket({
      auth: authState,
      browser: Browsers.ubuntu('Scout Support'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      logger: logger.child({ component: 'whatsapp' }),
    });
    socket = current;
    current.ev.on('creds.update', saveCreds);
    current.ev.on('connection.update', update => handleConnectionUpdate(current, update));
    return true;
  })()
    .catch(error => {
      ready = false;
      state = 'error';
      socket = null;
      logger.error({ err: error }, 'WhatsApp support client initialization failed');
      scheduleReconnect();
      return false;
    })
    .finally(() => {
      initialization = null;
    });
  return initialization;
}

export async function sendWhatsAppSupportMessage(text) {
  const groupId = configuredGroupId();
  if (!groupId) throw serviceError('WHATSAPP_NOT_CONFIGURED', 'لم يتم إعداد جروب دعم واتساب على السيرفر بعد');
  if (!ready || !socket) throw serviceError('WHATSAPP_NOT_READY', 'خدمة واتساب غير جاهزة حالياً؛ جرّب بعد اكتمال اتصال رقم الدعم');

  try {
    await socket.sendMessage(groupId, { text });
  } catch (error) {
    logger.error({ err: error }, 'WhatsApp support message failed');
    throw serviceError('WHATSAPP_SEND_FAILED', 'تعذر إرسال رسالة الدعم إلى واتساب حالياً');
  }
}

export function getWhatsAppStatus() {
  return { configured: Boolean(configuredGroupId()), ready, state };
}

export async function shutdownWhatsApp() {
  shuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  ready = false;
  const current = socket;
  socket = null;
  current?.end?.(undefined);
}
