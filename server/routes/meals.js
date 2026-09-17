const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { analyzeFoodImage } = require("../services/foodAnalysis");
const store = require("../services/store");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

function isValidDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// Analyze an uploaded food photo and return a draft calorie estimate (not yet saved to the log).
router.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const imageBuffer = fs.readFileSync(req.file.path);
    const analysis = await analyzeFoodImage({
      base64: imageBuffer.toString("base64"),
      mediaType: req.file.mimetype,
    });

    res.json({
      ...analysis,
      imageUrl: `/uploads/${req.file.filename}`,
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(502).json({ error: err.message || "Failed to analyze image" });
  }
});

// Save a (possibly user-edited) meal to the daily log.
router.post("/meals", (req, res) => {
  const { date, items, totalCalories, imageUrl, mealName } = req.body || {};

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }
  if (typeof totalCalories !== "number" || totalCalories < 0) {
    return res.status(400).json({ error: "totalCalories must be a non-negative number" });
  }

  const meal = store.create({
    date,
    mealName: mealName || items.map((i) => i.name).join(", "),
    items,
    totalCalories,
    imageUrl: imageUrl || null,
  });

  res.status(201).json(meal);
});

// List meals (and total) for a given date.
router.get("/meals", (req, res) => {
  const date = req.query.date;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: "date query param must be in YYYY-MM-DD format" });
  }
  const meals = store.listByDate(date);
  const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0);
  res.json({ date, meals, totalCalories: Math.round(totalCalories) });
});

// Delete a logged meal.
router.delete("/meals/:id", (req, res) => {
  const removed = store.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: "Meal not found" });
  res.status(204).end();
});

// Daily calorie totals for the last N days, for the history view.
router.get("/summary", (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
  res.json({ days: store.dailyTotals(days) });
});

module.exports = router;
