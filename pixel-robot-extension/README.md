# 🤖 Pixel Robot Mouse Follower — Chrome Extension (Manifest V3)

A cute, zero-dependency Manifest V3 Chrome Extension that adds an animated Pixel Art Robot overlay following your mouse cursor across any webpage with smooth physics, blinking eyes, jetpack flames, particle trails, and interactive click reactions!

---

## 🌟 Key Features

1. **Manifest V3 Compliant**: Built strictly with modern Manifest V3 specifications (`activeTab`, `storage`).
2. **100% Pure Canvas Rendering**: Zero external image assets or heavy dependencies. All pixel art and animations are programmatically rendered on a crisp 32x32 pixel matrix buffer scaled with `image-rendering: pixelated`.
3. **Smooth Lerp Physics & Movement**: Follows your cursor fluidly using Linear Interpolation physics.
4. **Directional Flipping & Tilting**: Robot flips horizontally depending on whether it is moving left or right, and tilts smoothly based on horizontal velocity.
5. **State Animations & Details**:
   - **Idle Bobbing**: Floating vertical sine-wave motion when stationary.
   - **Pulsing LED Antenna & Chest**: Glowing red/cyan LEDs on antenna tip and chest core.
   - **Periodic Eye Blinking**: Eyes automatically blink every few seconds.
   - **Jetpack Thruster Flames**: Animated flame pixels beneath the feet.
6. **Particle Energy Trail**: Emits trailing energy sparks (Cyan Laser, Ember Bonfire, or Rainbow) as the robot flies.
7. **Interactive Click Reaction**: Clicking near the robot triggers a happy hop jump, a burst of star particles, and floating text badges (`⚡ BEEP BOOP!`).
8. **Non-Blocking Overlay**: Configured with `pointer-events: none` on the main overlay canvas so it never interferes with webpage clicks, text selections, or buttons.
9. **Customization Popup**: Clean extension popup window to toggle ON/OFF, adjust follow speed, and select particle trail color themes.

---

## 📁 Extension File Structure

```
pixel-robot-extension/
├── manifest.json   # Chrome Manifest V3 configuration
├── content.js      # Core canvas engine, physics, pixel robot drawing, and particles
├── styles.css      # Fixed non-blocking canvas overlay styling
├── popup.html      # Extension settings popup UI
├── popup.js        # Settings handler via chrome.storage.local
└── README.md       # Installation guide & specifications
```

---

## 🛠️ How to Install & Test in Chrome / Edge / Brave

1. Open **Google Chrome** (or any Chromium browser like Edge / Brave).
2. Navigate to `chrome://extensions/` in your browser URL bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the folder:
   `d:\app scout\pixel-robot-extension`
6. Done! Open any webpage (e.g., `https://wikipedia.org` or `https://google.com`), move your mouse, and watch your cute Pixel Robot follow you around! 🎉
