import { STORAGE_KEYS } from '../data/mockData';

export const initSecurity = () => {
  // Reserved for future security hooks. No-op for now.
};

export const getDeviceId = () => {
  let deviceId = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!deviceId) {
    deviceId = (crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
  }
  return deviceId;
};
