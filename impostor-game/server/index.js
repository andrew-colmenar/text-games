import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

// --- OpenAI client ---
if (!process.env.OPENAI_API_KEY) {
  console.warn('[server] WARNING: OPENAI_API_KEY is not set. Set it in server/.env');
}
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PORT = process.env.PORT || 3001;

/**
 * POST /api/generate
 * body: { category: string, allowMultipleImpostors?: boolean, giveImpostorFakeWord?: boolean }
 * returns: { word: string, hint: string, fakeWord: string|null }
 */
app.post('/api/generate', async (req, res) => {
  try {
    let { category = 'general', allowMultipleImpostors = false, giveImpostorFakeWord = true } = req.body || {};
    // basic sanitation
    if (typeof category !== 'string') category = 'general';
    category = category.trim().slice(0, 80);

    const system = `You generate a single, concrete secret word that fits the host's category (or a sensible sub-category),
and a short vague hint that isn't a giveaway. Optionally, generate a plausible "fakeWord" that sounds similar or is
thematically close (used to help an impostor blend in). Keep it family-friendly.`;

    // Ask for strict JSON to make parsing trivial on the frontend
    const response = await client.responses.create({
      model: 'o3-mini', // fast + cheap; swap to larger model if you want
      response_format: { type: 'json_object' },
      input: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Category: ${category}\n` +
                `Options: allowMultipleImpostors=${allowMultipleImpostors}, giveImpostorFakeWord=${giveImpostorFakeWord}\n` +
                `Return strict JSON with schema:\n` +
                `{ "word": string, "hint": string, "fakeWord": string | null }.\n` +
                `The "word" must be a single term (no spaces for now). Hint should be short and vague (not a giveaway).\n` +
                `If fakeWord isn't requested, set it to null.`
            }
          ]
        }
      ]
    });

    // Extract text safely across SDK variants
    let rawText =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      response.choices?.[0]?.message?.content ||
      '{}';

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {};
    }

    // Robust fallbacks
    if (!data.word) data.word = 'aurora';
    if (!data.hint) data.hint = `Common but not the first guess (${String(data.word).length} letters)`;
    if (!giveImpostorFakeWord) data.fakeWord = null;
    if (data.fakeWord === undefined) data.fakeWord = giveImpostorFakeWord ? null : null;

    res.json({
      word: String(data.word).trim(),
      hint: String(data.hint).trim(),
      fakeWord: data.fakeWord ? String(data.fakeWord).trim() : null
    });
  } catch (err) {
    console.error('[server] LLM error:', err?.response?.data || err.message || err);
    res.status(500).json({ error: 'LLM generation failed' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
