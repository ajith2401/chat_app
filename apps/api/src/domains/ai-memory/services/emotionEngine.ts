import OpenAI from "openai";

let _openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
};

export const analyzeEmotionalTone = async (messages: string[]) => {
  if (messages.length === 0) return null;

  const openai = getOpenAI();
  const prompt = `Analyze the emotional tone of the following private messages between a couple. 
  Identify the dominant mood (e.g., romantic, happy, tense, supportive, playful, missing-each-other).
  Provide a brief summary of the emotional state of the relationship.
  
  Messages:
  ${messages.join("\n")}
  
  Return JSON format: { "dominantMood": "...", "emotionalSummary": "...", "intensity": 0-1 }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [{ role: "system", content: "You are an empathetic relationship assistant." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (err) {
    console.error("Emotion analysis failed:", err);
    return null;
  }
};

export const generateEmbedding = async (text: string) => {
  const openai = getOpenAI();
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return null;
  }
};
