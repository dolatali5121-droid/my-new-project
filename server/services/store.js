const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "..", "..", "data", "meals.json");

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, "utf8").trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function save(meals) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(meals, null, 2));
}

function listByDate(date) {
  return load()
    .filter((m) => m.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function dailyTotals(days) {
  const meals = load();
  const totals = {};
  for (const m of meals) {
    totals[m.date] = (totals[m.date] || 0) + m.totalCalories;
  }
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, totalCalories: Math.round(totals[key] || 0) });
  }
  return result;
}

function create(meal) {
  const meals = load();
  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...meal,
  };
  meals.push(record);
  save(meals);
  return record;
}

function remove(id) {
  const meals = load();
  const next = meals.filter((m) => m.id !== id);
  const removed = next.length !== meals.length;
  if (removed) save(next);
  return removed;
}

module.exports = { listByDate, dailyTotals, create, remove };
