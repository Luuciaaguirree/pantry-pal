/**
 * Example proxy server that accepts uploaded files and forwards them to an OpenAI
 * multimodal Responses endpoint to extract structured information from receipts.
 *
 * WARNING: This is an example. You must set OPENAI_API_KEY in the environment.
 * Install dependencies:
 *   npm install express multer node-fetch
 *
 * Run:
 *   OPENAI_API_KEY=sk-... node server/gpt-ocr-proxy.js
 *
 * The proxy exposes POST /api/gpt-ocr which accepts multipart/form-data files[]
 * and returns JSON { items: [...], rawTexts: [{ fileName, text }] }.
 */

const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');

const upload = multer();
const app = express();
const PORT = process.env.PORT || 5174;

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set — proxy will not be able to call OpenAI');
}

app.post('/api/gpt-ocr', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    // Build a simple prompt asking the model to extract items. We include a short
    // sample instruction and send each file as base64 to help a multimodal model.
    const parts = [];
    const rawTexts = [];

    for (const f of files) {
      // f.buffer is available with multer memory storage
      const buf = f.buffer;
      const b64 = buf.toString('base64');
      // include as data URI; model may accept if it's a multimodal endpoint
      const datauri = `data:${f.mimetype};base64,${b64}`;
      parts.push({ fileName: f.originalname, datauri });
      rawTexts.push({ fileName: f.originalname, text: `(sent to model as data URI of ${f.originalname})` });
    }

    // Construct a prompt — the prompt asks the model to return strict JSON.
    const system = `You are a helpful assistant that extracts structured data from supermarket receipts. Return ONLY a JSON object with keys: items (array of objects) and rawTexts (array with fileName and extractedText). Each item must have: name (string), quantity (number), unit (string), price (number, euros), daysUntilExpiry (number).`;

    const userParts = parts.map((p, i) => `File ${i + 1}: ${p.fileName}\n${p.datauri}`).join('\n\n');
    const user = `Extract the purchased items from these files. Return valid JSON only. Files:\n\n${userParts}`;

    // Call OpenAI Responses API (example). Adjust to the exact API/version you have access to.
    const openaiUrl = 'https://api.openai.com/v1/responses';
    const body = {
      model: 'gpt-4o-mini-vision',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_output_tokens: 1500,
    };

    // NOTE: This is a minimal example; depending on the model and API you may need
    // to attach files differently or use the older chat/completions endpoints.
    const resp = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('OpenAI error', resp.status, txt);
      return res.status(502).json({ error: 'OpenAI error', detail: txt });
    }

    const j = await resp.json();

    // Try to find text output — adjust depending on response shape
    let outText = '';
    try {
      outText = (j.output && j.output[0] && (j.output[0].content || j.output[0].text)) || JSON.stringify(j);
    } catch (e) {
      outText = JSON.stringify(j);
    }

    // attempt to parse JSON from model
    let parsed = null;
    try {
      // model is expected to return JSON only
      const maybe = outText.trim();
      parsed = JSON.parse(maybe);
    } catch (e) {
      // parsing failed — return model text in rawTexts and empty items
      return res.json({ items: [], rawTexts: rawTexts.map((r) => ({ ...r, text: outText })) });
    }

    // Validate shape
    if (!parsed || !Array.isArray(parsed.items)) {
      return res.json({ items: [], rawTexts: rawTexts.map((r) => ({ ...r, text: outText })) });
    }

    return res.json({ items: parsed.items, rawTexts: parsed.rawTexts || rawTexts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

app.listen(PORT, () => console.log(`GPT OCR proxy listening on ${PORT}`));
