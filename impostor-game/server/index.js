import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3001;

app.post('/api/generate', async (req, res) => {
  try {
    let {
      category = 'general',
      allowMultipleImpostors = false,
      giveImpostorFakeWord = true
    } = req.body || {};
    if (typeof category !== 'string') category = 'general';
    category = category.trim().slice(0, 80);

    const system = `You generate a secret word that fits the host's category (a completely random word that most people would know from the category is ideal),
and a short vague hint that isn't a giveaway. Never make the hint too obvious, usually pretty vague and give very very vague hints from time to time too
Some examples (don't use these examples specifically, but gives you an idea of the kind of words and hints you should generate): 
    - if the category is "Lakers Players" a good secret word might be "Lamar Odom" (not the most obvious one, but still well known and associated with category) and a good hint might be "Power Forward".
    - if the category is "animals" a good secret word might be "chicken" (can pick common ones, just not too often, and usually avoid the top most common ones) and a good hint might be "farm animal" (less vague) or "edible" (more vague) and even "legs" (super vague).
    - if the category is "animals" a good secret word might be "Anteater" and a good hint might be "claws".
    - if the category is "movies" a good secret word might be "The Matrix" and a good hint might be "action" (less vague) or "fiction" (extra vague).
    - if the category is "food" a good secret word might be "pancakes" and a good hint might be "breakfast food" (less vague) or "sweet" (more vague).
    - if the category is "countries" a good secret word might be "Kenya" and a good hint might be "poor". 
    - if the category is "foods" a good secret word might be "popcorn" and a good hint might be "snack".
    - if the category is "shows" a good secret word might be "How I Met Your Mother" and a good hint might be "sitcom".
    - if the category is "song" a good secret word might be "Fein (By Playboi Carti)" or "Carnival (by Kanye West)" and a good hint might be "social media viral".
    - if the category is "rap song" a good secret word might be "HUMBLE (by Kendrick Lamar)" and a good hint might be "Kendrick Lamar".
    - if the category is "rapper" a good secret word might be "Lil Tecca" and a good hint might be "younger rapper".

Optionally, generate a plausible "fakeWord" that is slightly thematically similar. Typically a word that may be adjacent to the secret word in some non-obvious way. Not too similar but should have a trait or a few in common without giving it away.
Some more examples:
    - if the category is "animals" and the secret word is "Elephant" a good fake word might be "Giraffe" as they both are big time zoo attractions.
    - if the category is "animals" and the secret word is "Tiger" a good fake word might be "Cheetah" as they both are striped animals.
    - if the category is "food" and the secret word is "Pancakes" a good fake word might be "Cake" as they both are sweet foods.
    - if the category is "movies" and the secret word is "The Matrix" a good fake word might be "Inception" as they both are mind-bending movies.
`

;

    const userPrompt =
      `Return ONLY a compact JSON object (no prose, no code fences).\n` +
      `Schema: {"word": string, "hint": string, "fakeWord": string|null}\n` +
      `Rules:\n` +
      `- "word" should be one term (one word or short phrase)\n` +
      `- "hint" is short and vague (typically one word, not a giveaway)\n` +
      `- If fakeWord isn't requested, set it to null\n\n` +
      `Category: ${category}\n` +
      `Options: allowMultipleImpostors=${allowMultipleImpostors}, giveImpostorFakeWord=${giveImpostorFakeWord}`;

    // ✅ Chat Completions with JSON-mode response_format
    const chat = await client.chat.completions.create({
      model: 'gpt-4o-mini',                 // pick any chat model that supports JSON response_format
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.2
    });

    const raw = chat.choices?.[0]?.message?.content ?? '{}';

    let data;
    try { data = JSON.parse(raw); } catch { data = {}; }

    // Fallbacks
    if (!data.word) data.word = 'bruh';
    if (!data.hint) data.hint = `this shit broke)`;
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
