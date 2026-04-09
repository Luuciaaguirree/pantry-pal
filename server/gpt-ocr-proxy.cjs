/**
 * CommonJS version of the proxy for environments where package.json sets "type": "module".
 * Run with: OPENAI_API_KEY='' node server/gpt-ocr-proxy.cjs
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
    const parts = [];
    const rawTexts = [];

    for (const f of files) {
      const buf = f.buffer;
      const b64 = buf.toString('base64');
      const datauri = `data:${f.mimetype};base64,${b64}`;
      parts.push({ fileName: f.originalname, datauri });
      rawTexts.push({ fileName: f.originalname, text: `(sent to model as data URI of ${f.originalname})` });
    }

    const system = `You are a helpful assistant that extracts structured data from supermarket receipts. Return ONLY a JSON object with keys: items (array of objects) and rawTexts (array with fileName and extractedText). Each item must have: name (string), quantity (number), unit (string), price (number, euros), daysUntilExpiry (number).`;

    const userParts = parts.map((p, i) => `File ${i + 1}: ${p.fileName}\n${p.datauri}`).join('\n\n');
    const user = `Extract the purchased items from these files. Return valid JSON only. Files:\n\n${userParts}`;

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

    let outText = '';
    try {
      outText = (j.output && j.output[0] && (j.output[0].content || j.output[0].text)) || JSON.stringify(j);
    } catch (e) {
      outText = JSON.stringify(j);
    }

    let parsed = null;
    try {
      const maybe = outText.trim();
      parsed = JSON.parse(maybe);
    } catch (e) {
      return res.json({ items: [], rawTexts: rawTexts.map((r) => ({ ...r, text: outText })) });
    }

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
