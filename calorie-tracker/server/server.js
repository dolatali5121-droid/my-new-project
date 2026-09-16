require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 3001;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

app.get('/api/health', (req, res) => {
  res.json({ ok: true, visionConfigured: Boolean(anthropic) });
});

const ANALYSIS_SYSTEM_PROMPT = `You are a nutrition estimation assistant. You will be shown a photo of a meal.
Identify each distinct food/drink item visible, estimate a reasonable portion size, and estimate calories per item.
Respond with ONLY valid JSON (no markdown fences, no commentary) matching this exact shape:
{
  "items": [
    { "name": string, "quantity": string, "calories": number }
  ],
  "totalCalories": number,
  "confidence": "low" | "medium" | "high",
  "notes": string
}
Rules:
- "quantity" should be a short human-readable portion description, e.g. "1 medium bowl (~350g)".
- "calories" per item and "totalCalories" must be integers.
- "totalCalories" must equal the sum of item calories.
- "confidence" reflects how certain you are given image quality and how identifiable the food/portions are.
- "notes" is a short (<200 char) caveat, e.g. about hidden ingredients or oil/sauce assumptions. Empty string if none.
- If the image does not appear to contain food, return an empty "items" array, "totalCalories": 0, "confidence": "low", and explain in "notes".`;

app.post('/api/analyze-food', upload.single('image'), async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({
      error: 'Photo analysis is not configured on this server. Set ANTHROPIC_API_KEY and restart, or add the meal manually.',
    });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded.' });
  }

  try {
    const base64Image = req.file.buffer.toString('base64');
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.file.mimetype,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Analyze this meal photo and estimate calories per the required JSON schema.',
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new Error('No text response from model');
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch (parseErr) {
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (!match) throw parseErr;
      parsed = JSON.parse(match[0]);
    }

    res.json(parsed);
  } catch (err) {
    console.error('Analysis failed:', err.message);
    res.status(502).json({ error: 'Failed to analyze the photo. Please try again or add the meal manually.' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image uploads are allowed') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Calorie tracker server listening on http://localhost:${PORT}`);
  if (!anthropic) {
    console.warn('ANTHROPIC_API_KEY not set — photo analysis endpoint will return 503 until configured.');
  }
});
