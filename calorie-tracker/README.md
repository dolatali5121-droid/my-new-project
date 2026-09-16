# CalorieSnap

Upload a photo of your meal, get an AI-estimated calorie breakdown, and track your daily intake against a goal.

## How it works

- **Backend** (`server/`): a small Express server with one endpoint, `POST /api/analyze-food`, that sends the uploaded photo to Claude's vision API and returns a structured list of food items with calorie estimates.
- **Frontend** (`public/`): a static single-page app (no build step) that lets you snap/upload a photo, review and confirm the AI's estimate (or add a meal manually), and tracks your daily log and calorie goal in the browser's `localStorage`.

Meal history is stored per-browser (`localStorage`), not on the server, so there's no account system or database to run. The server only proxies the vision request so your Anthropic API key never reaches the browser.

## Setup

```bash
cd calorie-tracker/server
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Then open http://localhost:3001 in your browser.

Without an `ANTHROPIC_API_KEY` set, the app still runs — photo analysis will show an error, but you can still track meals via the "Manual Entry" tab.

## Notes / limitations

- Calorie estimates from a photo are approximate; always spot-check against the editable list before logging (a future improvement would be inline editing of detected items before saving).
- Log data lives in browser `localStorage`, so it's per-device and cleared if site data is cleared. Swapping in a real database (e.g. SQLite) behind a couple of small `/api/log` endpoints would be a natural next step if multi-device sync is needed.
- Uploads are capped at 8MB and must be image files.
