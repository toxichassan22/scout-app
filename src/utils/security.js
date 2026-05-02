import { STORAGE_KEYS } from '../data/mockData';

const blockedCtrlKeys = new Set(['a', 'c', 's', 'p', 'u', 'x']);
const blockedMetaKeys = new Set(['a', 'c', 's', 'p', 'u', 'x']);

const showBlur = () => {
  const blur = document.getElementById('screen-blur');
  if (blur) {
    blur.style.display = 'flex';
    document.documentElement.classList.add('privacy-locked');
  }
};

const hideBlur = () => {
  const blur = document.getElementById('screen-blur');
  if (blur) {
    blur.style.display = 'none';
    document.documentElement.classList.remove('privacy-locked');
  }
};

const isEditableTarget = (target) => {
  const element = target instanceof Element ? target : null;
  return Boolean(element?.closest('input, textarea, [contenteditable="true"], [data-allow-copy="true"]'));
};

const clearSelection = () => {
  const selection = window.getSelection?.();
  if (selection?.removeAllRanges) selection.removeAllRanges();
};

const blockClipboard = (event) => {
  if (isEditableTarget(event.target)) return true;
  event.preventDefault();
  event.stopPropagation();
  try {
    event.clipboardData?.setData('text/plain', '');
    navigator.clipboard?.writeText('');
  } catch {
    // Clipboard writes are permission-dependent in browsers.
  }
  clearSelection();
  return false;
};

const blockEvent = (event) => {
  if (isEditableTarget(event.target)) return true;
  event.preventDefault();
  event.stopPropagation();
  clearSelection();
  return false;
};

const isScreenshotHotkey = (event) => {
  const key = String(event.key || '').toLowerCase();
  const code = String(event.code || '').toLowerCase();
  const isPrintScreen = key === 'printscreen' || code === 'printscreen';
  const hasSystemModifier = event.metaKey || event.ctrlKey;

  return (
    isPrintScreen ||
    (event.metaKey && event.shiftKey && key === 's') ||
    (event.metaKey && event.shiftKey && code === 'keys') ||
    (event.ctrlKey && event.shiftKey && key === 's') ||
    (hasSystemModifier && isPrintScreen)
  );
};

export const initSecurity = () => {
  document.addEventListener('contextmenu', blockEvent, true);
  document.addEventListener('copy', blockClipboard, true);
  document.addEventListener('cut', blockClipboard, true);
  document.addEventListener('paste', blockEvent, true);
  document.addEventListener('selectstart', blockEvent, true);
  document.addEventListener(
    'selectionchange',
    () => {
      const active = document.activeElement;
      if (isEditableTarget(active)) return;
      clearSelection();
    },
    true,
  );
  document.addEventListener('dragstart', blockEvent, true);
  document.addEventListener('drop', blockEvent, true);

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (isEditableTarget(event.target)) return;
    if (isScreenshotHotkey(event)) {
      blockEvent(event);
      showBlur();
      return;
    }
    if ((event.ctrlKey && blockedCtrlKeys.has(key)) || (event.metaKey && blockedMetaKeys.has(key))) {
      blockEvent(event);
      return;
    }
    if (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) {
      blockEvent(event);
      return;
    }
    if (event.key === 'F12') {
      blockEvent(event);
      return;
    }
  }, true);

  document.addEventListener('keyup', async (event) => {
    if (!isScreenshotHotkey(event)) return;
    blockEvent(event);
    try {
      await navigator.clipboard?.writeText('');
    } catch {
      // Clipboard access is permission-dependent; the visual block remains best-effort.
    }
    showBlur();
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) showBlur();
  });

  window.addEventListener('beforeprint', (event) => {
    showBlur();
    blockEvent(event);
  });
  window.addEventListener('pagehide', showBlur);
  window.addEventListener('blur', showBlur);
  window.addEventListener('freeze', showBlur);

  const blur = document.getElementById('screen-blur');
  blur?.addEventListener('pointerdown', hideBlur, true);
  blur?.addEventListener('click', hideBlur, true);
};

export const getDeviceId = () => {
  let deviceId = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
  }
  return deviceId;
};
