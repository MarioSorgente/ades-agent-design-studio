# THOR Chrome Extension (MVP)

Local-only prompt scanner for Claude. No backend, no API keys, no telemetry.

## Setup
1. `cd thor-extension`
2. `npm install`

## Run
- Dev: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Tests: `npm run test`

## Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `thor-extension/.output/chrome-mv3`

## Test on Claude
1. Open `https://claude.ai`
2. Write/paste a prompt
3. Click the THOR extension icon
4. Confirm scan report appears with tokens, waste level, issues, and suggestion.

## Notes
- Supported target: Claude only.
- Footer roadmap in popup: Claude first · ChatGPT next · Cursor coming soon.
