# CalorieSnap

Upload a photo of your meal and get an instant AI-powered calorie estimate. Save it to your daily log and track intake against a goal over time.

## How it works

- **Upload**: pick or take a photo of a meal.
- **Analyze**: the photo is sent to Claude's vision model, which identifies each food item, estimates a portion size, and estimates calories per item.
- **Review & save**: edit any item or calorie estimate before saving it to your log for a chosen date.
- **Track**: see today's total against your daily calorie goal, and a 7-day history chart.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and add your Anthropic API key:
   ```
   cp .env.example .env
   ```
   Get a key at https://console.anthropic.com/
3. Start the server:
   ```
   npm start
   ```
4. Open http://localhost:3000

## Notes

- Meal data is stored in `data/meals.json` and uploaded photos in `uploads/` — both are gitignored since they're local, per-user data.
- The daily calorie goal is stored in the browser's `localStorage`.
- Calorie estimates from photo analysis are approximate; always use your judgment for medical or dietary decisions.

## Project structure

```
server/
  index.js              Express app entry point
  routes/meals.js        API routes: analyze, save/list/delete meals, summary
  services/foodAnalysis.js  Claude vision call for food identification
  services/store.js      JSON-file-backed storage for meals
public/
  index.html, styles.css, app.js   Frontend (no build step)
```
