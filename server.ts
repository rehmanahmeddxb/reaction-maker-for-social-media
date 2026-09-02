import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { proxyVideoHandler } from './server/proxyVideoHandler';

// Load env files (`.env.local` wins over `.env`) so keys can also live in a
// file instead of being exported in the shell.
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client to avoid crashes if GEMINI_API_KEY is not immediately provided
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 2. Real-time Subtitle Translation with Gemini 2.5 Flash
app.post('/api/gemini/translate', async (req, res) => {
  try {
    const { text, targetLang = 'Spanish' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required' });
    }

    const ai = getAI();
    if (!ai) {
      return res.json({
        translation: `[${targetLang}] ${text}`,
        source: 'fallback',
      });
    }

    const prompt = `You are an expert real-time translator for live video reaction subtitles.
Translate the following live reaction speech into natural, conversational, punchy ${targetLang}.
Keep it concise so it fits nicely on a single line of video subtitles. Do not include commentary, formatting, or quotes.

Input speech: "${text}"

Translation:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 60,
        temperature: 0.3,
      },
    });

    const translation = response.text?.trim().replace(/^["']|["']$/g, '') || text;
    return res.json({ translation, source: 'gemini' });
  } catch (error: any) {
    console.error('Gemini translation error:', error?.message || error);
    return res.json({
      translation: req.body?.text || '',
      source: 'fallback-error',
    });
  }
});

// 3. Post-Take Viral Title & Content Generator
app.post('/api/gemini/viral-hooks', async (req, res) => {
  try {
    const { videoTitle = 'Reaction Video', transcriptSnippet = '', durationSecs = 30 } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json({
        titles: [
          `My REAL Reaction to ${videoTitle}! 😱`,
          `I Did NOT Expect This... (${videoTitle})`,
          `Wait for the Ending! Reacting to ${videoTitle}`,
        ],
        openingHook: 'You will not believe what just happened in this video...',
        hashtags: ['#reaction', '#trending', '#mustwatch', '#viral', '#shorts'],
        description: `Check out my genuine live reaction to ${videoTitle}! Don't forget to like and subscribe for more content!`,
        source: 'fallback',
      });
    }

    const prompt = `You are a viral YouTube Shorts, TikTok, and Instagram Reels creator strategist.
A creator just finished recording a reaction video.
Source Video Being Reacted To: "${videoTitle}"
Creator's Spoken Speech Transcript Snippet: "${transcriptSnippet || 'Genuine surprised reaction'}"
Video Length: ${Math.round(durationSecs)} seconds

Generate a viral distribution package in strictly valid JSON with:
1. "titles": an array of 3 high-click-through-rate, curiosity-inducing titles
2. "openingHook": a compelling 1-sentence opening text hook to superimpose or pin
3. "hashtags": an array of 5 top relevant trending hashtags
4. "description": an engaging 2-sentence caption/description with a call to action.

Return ONLY the raw JSON object, no markdown codeblocks or other text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const rawText = response.text?.trim() || '{}';
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Clean possible fences
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    return res.json({
      titles: data.titles || [`Reacting to ${videoTitle}!`],
      openingHook: data.openingHook || 'Wait until you see what happens...',
      hashtags: data.hashtags || ['#reaction', '#viral', '#shorts'],
      description: data.description || `My reaction to ${videoTitle}!`,
      source: 'gemini',
    });
  } catch (error: any) {
    console.error('Gemini viral hooks error:', error?.message || error);
    return res.json({
      titles: [
        `My Unfiltered Reaction to ${req.body.videoTitle || 'This'}!`,
        `I Was NOT Prepared For This...`,
        `Watch This Before It Gets Taken Down!`,
      ],
      openingHook: 'You will not believe how this ended...',
      hashtags: ['#reaction', '#viral', '#mustwatch'],
      description: `My reaction to ${req.body.videoTitle || 'this crazy video'}!`,
      source: 'fallback-error',
    });
  }
});

// 4. Safe CORS Video Proxy (prevents Canvas tainting on external URLs)
app.get('/api/proxy-video', proxyVideoHandler);

// 5. Mount Vite middleware for dev or static files for production
async function startServer() {
  const http = await import('http');
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
      console.error(`   To free port ${PORT}, run:`);
      console.error(`     pkill -f "tsx server.ts" || pkill -f "node.*server"`);
      console.error(`   Or run on a different port:`);
      console.error(`     PORT=${PORT + 1} bash termux.sh (or PORT=${PORT + 1} npm run dev)\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Reaction Studio server running on http://${HOST}:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
