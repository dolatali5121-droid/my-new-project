/* app.js — bootstraps the application: navigation, the mobile drawer,
   keyboard shortcuts and module wiring. Loaded last. */
const App = (() => {
  'use strict';

  const { $, $$ } = Utils;

  const VIEWS = {
    dashboard: { title: 'Dashboard',    subtitle: 'Your day at a glance' },
    tasks:     { title: 'Tasks',        subtitle: 'Everything on your plate' },
    planner:   { title: 'Weekly planner', subtitle: 'Spread the workload across the week' },
    timer:     { title: 'Focus timer',  subtitle: 'Work in distraction-free blocks' },
    subjects:  { title: 'Subjects',     subtitle: 'Courses, colours and progress' },
    settings:  { title: 'Settings',     subtitle: 'Preferences and local data' }
  };

  let current = 'dashboard';

  function go(view) {
    if (!VIEWS[view]) view = 'dashboard';
    current = view;

    $$('.view').forEach(section => section.classList.toggle('is-active', section.id === `view-${view}`));
    $$('.nav__item').forEach(item => item.classList.toggle('is-active', item.dataset.view === view));

    $('#viewTitle').textContent = VIEWS[view].title;
    $('#viewSubtitle').textContent = VIEWS[view].subtitle;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);

    closeDrawer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const openDrawer  = () => { $('#sidebar').classList.add('is-open'); $('#scrim').hidden = false; };
  const closeDrawer = () => { $('#sidebar').classList.remove('is-open'); $('#scrim').hidden = true; };

  function initNav() {
    document.addEventListener('click', e => {
      const trigger = e.target.closest('[data-view]');
      if (!trigger) return;
      go(trigger.dataset.view);
      if (trigger.dataset.filter) Tasks.setFilter(trigger.dataset.filter);
    });

    $('#menuBtn').addEventListener('click', openDrawer);
    $('#scrim').addEventListener('click', closeDrawer);
    $('#quickAddBtn').addEventListener('click', () => UI.openTaskModal());

    window.addEventListener('hashchange', () => go(location.hash.slice(1)));

    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n') { e.preventDefault(); UI.openTaskModal(); }
      if (e.key === '/') { e.preventDefault(); $('#globalSearch').focus(); }
    });
  }

  function init() {
    Store.load();
    Settings.applyTheme(Store.settings.theme);

    UI.initModal();
    Tasks.init();
    Planner.init();
    Timer.init();
    Dashboard.init();
    Settings.init();
    initNav();

    go(location.hash.slice(1) || 'dashboard');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { go, get current() { return current; } };
})();
