import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';


const app = express();
app.use(cors());
app.use(express.json());


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3001;


// POST /api/generate
// body: { category: string, allowMultipleImpostors?: boolean, giveImpostorFakeWord?: boolean }
app.post('/api/generate', async (req, res) => {
try {
const { category = 'general', allowMultipleImpostors = false, giveImpostorFakeWord = true } = req.body || {};


// Use Responses API; ask for strict JSON back.
const system = `You generate a single, concrete secret word that fits the host's category (or a related, sensible sub-category), and a short vague hint that isn't a giveaway. Optionally, generate a plausible 'fakeWord' that sounds similar or is thematically close (used to help an impostor blend in). Keep it family‑friendly.`;


const user = {
role: 'user',
content: [
{ type: 'text', text: `Category: ${category}\nOptions: allowMultipleImpostors=${allowMultipleImpostors}, giveImpostorFakeWord=${giveImpostorFakeWord}` },
]
};


const response = await client.responses.create({
model: 'o3-mini', // small, fast, good for control; swap models as you like
response_format: { type: 'json_object' },
input: [
{ role: 'system', content: system },
user,
{ role: 'user', content: `Return strict JSON: {"word": string, "hint": string, "fakeWord": string|null}. If fakeWord isn't requested, set it to null. The 'word' must be a single term. Keep hint short.` }
]
});


// Extract JSON output safely
const text = response.output[0]?.content?.[0]?.text ?? '{}';
let data;
try { data = JSON.parse(text); } catch { data = {}; }


// Fallbacks for robustness
if (!data.word) data.word = 'aurora';
if (!data.hint) data.hint = `Common but not the first guess (${data.word?.length || 6} letters)`;
if (!giveImpostorFakeWord) data.fakeWord = null;


res.json({
word: String(data.word).trim(),
hint: String(data.hint).trim(),
fakeWord: data.fakeWord ? String(data.fakeWord).trim() : null
});
} catch (err) {
console.error('LLM error', err?.response?.data || err.message);
res.status(500).json({ error: 'LLM generation failed' });
}
});


app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));