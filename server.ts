import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System instructions per role
const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  agile_coach: `You are the Kanso Project Assistant and Agile Coach. Kanso is a minimalist personal ticketing platform with a 4-stage workflow:
1. "Just Written" (backlog draft)
2. "Under Review" (active execution & review)
3. "Verified" (tested and confirmed)
4. "Uploaded" (final delivered/released)

Every ticket in Kanso has:
- Title
- Description (what needs to be accomplished)
- Notes (separate personal execution memos, scratchpad ideas, technical caveats)
- Priority (low, medium, high, urgent)
- Category

Help the user break down projects, plan tickets, write clear acceptance criteria, and refine their solo workflow. Be concise, structured, and practical.`,

  code_architect: `You are the Kanso Technical Architect and Senior Engineer. Help the user with system design, debugging, API specifications, and writing clear technical notes for their tickets. When suggesting tickets, clearly format the Title, Description, and Notes separately.`,

  fast_assistant: `You are a high-speed productivity assistant for Kanso Workspaces. Answer quickly, concisely, and directly. Provide bullet points and actionable ticket checklists.`,
};

// POST /api/chat - Multi-turn Gemini chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], role = 'agile_coach', taskType = 'general' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Select model based on task requirements:
    // - Complex tasks: gemini-3.1-pro-preview
    // - General tasks: gemini-3.5-flash
    // - Fast tasks: gemini-3.1-flash-lite
    let modelName = 'gemini-3.5-flash';
    if (taskType === 'fast' || role === 'fast_assistant') {
      modelName = 'gemini-3.1-flash-lite';
    } else if (taskType === 'complex' || role === 'code_architect') {
      modelName = 'gemini-3.5-flash'; // default reliable tier
    }

    const systemInstruction = SYSTEM_INSTRUCTIONS[role] || SYSTEM_INSTRUCTIONS.agile_coach;

    // Build multi-turn contents format
    const contents: any[] = [];

    // Append prior conversation history
    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.text && item.role) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.text) }],
          });
        }
      }
    }

    // Append the latest user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      text: response.text || 'No response generated.',
      model: modelName,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate response from Gemini API',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
