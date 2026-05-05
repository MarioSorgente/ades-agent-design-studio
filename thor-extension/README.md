# THOR Chrome Extension MVP

Local-only Chrome extension MVP for scanning prompts on Claude and showing token-waste indicators.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in dev mode:
   ```bash
   npm run dev
   ```
3. Or create production build:
   ```bash
   npm run build
   ```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:
   - `.output/chrome-mv3-dev` for `npm run dev`
   - `.output/chrome-mv3` for `npm run build`

## Test on Claude

1. Open `https://claude.ai`
2. Write or paste a prompt in Claude input.
3. Click the **THOR Prompt Scanner** extension icon.
4. Review local scan report in popup.
