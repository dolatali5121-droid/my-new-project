# StudyFlow — Smart Study Planner & Task Manager

A student productivity web app built with **plain HTML, CSS and vanilla JavaScript**.
No backend, no database, no API calls, no external libraries or fonts — open
`index.html` and it runs.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Greeting, live stats (due today, completed this week, focus minutes, study streak), today's and upcoming tasks, per-subject progress bars |
| **Tasks** | Create / edit / delete tasks with subject, due date, priority, time estimate and notes; filter by All / Today / Upcoming / Overdue / Completed; filter by subject; sort by due date, priority, newest or title; undo delete |
| **Weekly planner** | Monday–Sunday board, navigate weeks, click a day to add a task already dated for it, click a task pill to edit |
| **Focus timer** | Pomodoro-style focus / short break / long break with a progress dial, configurable lengths, automatic cycle handling, per-subject session logging and a WebAudio chime |
| **Subjects** | Add courses with a colour from the palette; colours tint tasks, planner pills and charts |
| **Settings** | Timer lengths, daily focus goal, sound toggle, night mode, JSON export / import backup, erase-all |
| **Everything else** | Responsive (desktop sidebar → mobile drawer), keyboard shortcuts (`n` = new task, `/` = search, `Esc` = close dialog), reduced-motion and print styles, data saved to `localStorage` |

## File structure

```
study-planner/
├── index.html          # All markup: shell, six views, task dialog
├── css/
│   └── styles.css      # Design tokens, layout, components, responsive rules
└── js/
    ├── utils.js        # DOM + date/format helpers (no dependencies)
    ├── store.js        # State, localStorage persistence, pub/sub, all mutations
    ├── ui.js           # Toasts, task row markup, the task dialog
    ├── tasks.js        # Tasks view: filter / sort / search + subject manager
    ├── planner.js      # Weekly planner board
    ├── timer.js        # Pomodoro focus timer
    ├── dashboard.js    # Dashboard stats and lists
    ├── settings.js     # Preferences, theme, backup / restore
    └── app.js          # Bootstrap: navigation, drawer, shortcuts
```

Scripts are plain `<script>` tags (not ES modules) on purpose, so the app also
works when opened straight from the file system.

## Preview it

**Easiest — double-click:** open `study-planner/index.html` in any modern browser.

**With a local server** (optional, nicer URLs and live reload friendliness):

```bash
cd study-planner

# Python 3
python3 -m http.server 8000

# or Node
npx http-server -p 8000
```

Then visit <http://localhost:8000>.

## Data & privacy

All tasks, subjects, sessions and settings live in this browser's
`localStorage` under the key `studyflow.v1`. Nothing is sent anywhere.
Use **Settings → Export backup** to save a JSON copy, and **Import backup**
to restore it (handy when moving between browsers).

Clearing your browser's site data — or using **Settings → Erase all data** —
removes everything permanently.
