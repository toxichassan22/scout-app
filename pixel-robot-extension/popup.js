document.addEventListener('DOMContentLoaded', () => {
  const toggleRobot = document.getElementById('toggleRobot');
  const selectSpeed = document.getElementById('selectSpeed');
  const selectTrail = document.getElementById('selectTrail');

  // Load stored settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['robotEnabled', 'robotSpeed', 'robotTrail'], (res) => {
      if (res.robotEnabled !== undefined) toggleRobot.checked = res.robotEnabled;
      if (res.robotSpeed !== undefined) selectSpeed.value = String(res.robotSpeed);
      if (res.robotTrail !== undefined) selectTrail.value = res.robotTrail;
    });
  }

  // Save changes
  toggleRobot.addEventListener('change', () => {
    chrome.storage.local.set({ robotEnabled: toggleRobot.checked });
  });

  selectSpeed.addEventListener('change', () => {
    chrome.storage.local.set({ robotSpeed: parseFloat(selectSpeed.value) });
  });

  selectTrail.addEventListener('change', () => {
    chrome.storage.local.set({ robotTrail: selectTrail.value });
  });
});
