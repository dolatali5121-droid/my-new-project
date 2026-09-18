# Smart Study Planner & Task Manager

**StudyFlow** — a student productivity tool built with nothing but HTML, CSS and vanilla
JavaScript. No backend, no database, no API calls and no third-party libraries: open the
HTML file and the whole app runs in the browser.

---

## Preview it in the browser

### Option 1 — just open the file (simplest)

Double-click `study-planner/index.html`, or drag it into a browser window. Everything
works over `file://`, including saving your data.

### Option 2 — serve it locally (recommended for development)

A local server gives you clean URLs and a proper reload story. From the `study-planner`
folder run **any one** of these:

```bash
# Python (pre-installed on macOS and most Linux systems)
python3 -m http.server 8000

# Node.js
npx serve .
npx http-server -p 8000
```

Then open <http://localhost:8000> in your browser.

> **Tip:** VS Code users can right-click `index.html` → *Open with Live Server* for
> automatic reloading while editing.

---

## Project structure

```
study-planner/
├── index.html          # Every screen's markup + the inline SVG icon sprite
├── README.md           # This file
├── css/
│   ├── base.css        # Design tokens (green/white + dark theme), reset, typography
│   ├── layout.css      # App shell: sidebar, topbar, view grids, responsive rules
│   └── components.css  # Buttons, cards, task rows, timetable, dial, dialogs, toasts
└── js/
    ├── utils.js        # DOM builders, date maths, duration/clock formatting
    ├── store.js        # State, localStorage persistence, seed data, selectors
    ├── dashboard.js    # Greeting, stat cards, up-next, focus chart, subject rings
    ├── tasks.js        # Task list, filters, sorting, search, task dialog
    ├── schedule.js     # Weekly timetable grid and block dialog
    ├── subjects.js     # Subject cards, colour picker, subject dialog
    ├── timer.js        # Pomodoro timer, session logging, Web Audio chime
    ├── settings.js     # Preferences form, JSON export/import, reset
    └── app.js          # Toasts, confirm dialog, routing, theme, global wiring
```

Scripts are plain classic `<script>` tags (not ES modules) precisely so the app also works
from `file://`, where module imports would be blocked by CORS.

---

## Features

### Dashboard
- Time-aware greeting and a plain-language summary of the day.
- Stat cards: due today, overdue, completed this week, focus time vs. weekly goal.
- **Up next** — the five most urgent open tasks, tickable in place.
- **Today's timetable** — the current day's blocks, with the in-progress one highlighted.
- Focus-minutes bar chart for the current week and a progress ring per subject.

### Tasks
- Create, edit, complete and delete tasks; deletion is undoable from the toast.
- Subject, priority (high/medium/low), due date, due time, time estimate and notes.
- Filters: All / Today / This week / Overdue / Completed, plus a subject filter.
- Sort by due date, priority, newest or A–Z. Completed tasks always sink to the bottom.
- Overdue work is flagged in red everywhere it appears.

### Timetable
- Mon–Sun grid from 07:00 to 22:00, colour-coded by subject, current day highlighted.
- Click a block to edit it, or double-click empty space to create one at that time.
- Scrolls horizontally on small screens rather than squashing.

### Subjects
- Colour-coded courses with teacher/room and a weekly study-hour goal.
- Per-subject open/done task counts and focus time logged this week.
- Deleting a subject keeps its tasks — they simply become unassigned.

### Focus timer
- Pomodoro with configurable focus / short break / long break lengths.
- Auto-advances to a break, and to a long break every fourth focus session.
- Optional end-of-session chime, synthesised with the Web Audio API (no audio files).
- Finished focus sessions are logged against the task you picked and feed the dashboard.

### Settings
- Display name, weekly focus goal, timer lengths, chime on/off.
- Export your planner to JSON, import it back, or reset to the sample data.

### Throughout
- **Responsive** from 320px phones to wide desktops; the sidebar becomes a drawer below 960px.
- **Light and dark** green/white themes; the first run follows your OS preference.
- **Keyboard shortcuts:** `n` new task · `/` focus search · `g` then `d`/`t`/`s`/`c`/`f`
  to jump to Dashboard, Tasks, Schedule (timetable), Courses (subjects) or Focus timer ·
  `Esc` closes the mobile drawer.
- Accessible markup: landmarks, labelled controls, focus-visible rings, `aria-live` toasts,
  and a `prefers-reduced-motion` guard.

---

## How data is stored

Everything lives in a single `localStorage` key: **`studyflow.v1`**. That means:

- Your planner is private to this browser on this device — nothing is uploaded anywhere.
- Clearing site data or using a private window will clear it, so use **Settings → Export
  JSON** for a backup.
- The first run seeds a realistic sample week (4 subjects, 6 tasks, 7 timetable blocks and
  some focus sessions) so the interface is never empty. **Settings → Reset everything**
  brings it back.

---

## Developing further

There is no build step — edit a file and refresh the page.

Some natural next steps:

- A monthly calendar view alongside the weekly timetable.
- Recurring tasks and repeating timetable blocks across terms.
- Browser notifications for imminent deadlines (`Notification` API).
- A service worker so the app is installable and fully offline.
- Drag-and-drop to reschedule timetable blocks.
