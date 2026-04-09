GPT OCR integration (example)
=============================

This project includes an optional example proxy that forwards uploaded receipt files to a multimodal OpenAI model (ChatGPT) to extract structured items.

Files added:
- `server/gpt-ocr-proxy.js` — example Express proxy that accepts `POST /api/gpt-ocr` with `files[]` and calls OpenAI's Responses API. It expects `OPENAI_API_KEY` in the environment.

How to run (example)
---------------------

1. Install server deps (in project root):

```bash
npm install express multer node-fetch
```

2. Start the proxy (replace with your real key):

```bash
OPENAI_API_KEY=sk-... node server/gpt-ocr-proxy.js
```

3. Start the frontend dev server as usual:

```bash
npm run dev
```

4. In the scanner page, enable the "Usar GPT" toggle and upload files. The frontend will POST to `/api/gpt-ocr` on the same origin.

Notes and caveats
-----------------
- This is an example implementation. The OpenAI API shape and model names may change; you might need to adapt the proxy to your available model (for example, `gpt-4o-mini-vision`, `gpt-4o`, or other multimodal endpoints).
- Do not commit your `OPENAI_API_KEY` to source control.
- The proxy currently sends the files as data URIs inside the prompt. For large files or many pages you should use an upload approach supported by the OpenAI API for binary files.
- If you prefer keeping everything client-side, you can implement a direct client call to OpenAI, but exposing the API key in the frontend is insecure. Use a server proxy instead.

If you want, I can adapt the proxy to your specific OpenAI plan and model, or wire it as an integrated server script in the project (e.g., add npm scripts and a PM2/local dev flow).
