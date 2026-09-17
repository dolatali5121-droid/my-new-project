const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

const REPORT_TOOL = {
  name: "report_food_analysis",
  description: "Report the food items identified in the photo along with estimated portion sizes and calories.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "Each distinct food or drink item visible in the photo.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short name of the food item" },
            portion: { type: "string", description: "Estimated portion size, e.g. '1 cup', '150g', '1 medium slice'" },
            calories: { type: "number", description: "Estimated calories for this item's portion" },
          },
          required: ["name", "portion", "calories"],
        },
      },
      totalCalories: { type: "number", description: "Sum of calories across all items" },
      confidence: { type: "string", enum: ["low", "medium", "high"], description: "Confidence in the estimate given photo quality and portion visibility" },
      notes: { type: "string", description: "Any caveats, e.g. hidden ingredients, unclear portions" },
    },
    required: ["items", "totalCalories", "confidence"],
  },
};

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file (see .env.example) to enable food photo analysis."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

async function analyzeFoodImage({ base64, mediaType }) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "report_food_analysis" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text:
              "Identify every distinct food or drink item in this photo and estimate a reasonable calorie count for each, " +
              "based on the visible portion size. Use typical nutrition values for similar foods. Report your findings with the report_food_analysis tool.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("The model did not return a structured food analysis.");
  }
  return toolUse.input;
}

module.exports = { analyzeFoodImage };
