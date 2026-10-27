import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

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
4. "Verified by QA" (final delivered/released)

Every ticket in Kanso has:
- Title
- Description (what needs to be accomplished)
- Notes (separate personal execution memos, scratchpad ideas, technical caveats)
- Priority (low, medium, high, critical)
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

// POST /api/analyze-ticket-image - Gemini Vision image-to-ticket generator endpoint
app.post('/api/analyze-ticket-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', additionalPrompt = '', categories = [] } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Strip any data:image/*;base64, prefix
    const cleanBase64 = String(imageBase64).replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const categoryListStr = Array.isArray(categories) && categories.length > 0
      ? `Available project categories: ${categories.join(', ')}.`
      : 'Suggested categories: Bug, Feature, Design, Refactor, DevOps, Documentation, or "Verified by Admin or Owner or Project Manager".';

    const systemInstruction = `You are an expert Agile engineering lead and UX/QA inspector.
You inspect uploaded screenshots, UI mockups, bug screenshots, error stack traces, architecture diagrams, whiteboard sketches, or system photos, and convert them into a structured Kanso ticket.

Carefully inspect the image:
- Extract or synthesize an actionable, high-clarity title.
- Draft a thorough, professional description detailing what the issue or requirement is, context shown in the image, and acceptance criteria or steps to fix/reproduce.
- Extract or propose technical notes (e.g. implementation details, CSS/DOM hints, root cause speculation, edge cases).
- Suggest priority: 'low' | 'medium' | 'high' | 'critical' based on severity of errors or importance of feature.
- Suggest the best matching category from: ${categoryListStr}.

Always return strictly valid JSON according to the schema.`;

    const userPrompt = additionalPrompt
      ? `Analyze this image to generate a project ticket. User guidance: "${additionalPrompt}"`
      : 'Inspect this image thoroughly and generate a complete project ticket specification.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: userPrompt,
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Clear, actionable ticket title',
            },
            description: {
              type: Type.STRING,
              description: 'Detailed description of the issue or feature with acceptance criteria',
            },
            notes: {
              type: Type.STRING,
              description: 'Technical implementation notes, caveats, edge cases',
            },
            priority: {
              type: Type.STRING,
              description: 'Ticket priority: low, medium, high, or critical',
            },
            category: {
              type: Type.STRING,
              description: 'Best matching category name',
            },
            summary: {
              type: Type.STRING,
              description: 'One sentence visual summary',
            },
          },
          required: ['title', 'description', 'priority'],
        },
        temperature: 0.2,
      },
    });

    const rawText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = {
        title: 'Issue identified from uploaded image',
        description: rawText,
        notes: '',
        priority: 'medium',
      };
    }

    // Normalize priority
    const allowedPriorities = ['low', 'medium', 'high', 'critical'];
    let priority = String(parsedData.priority || 'medium').toLowerCase();
    if (!allowedPriorities.includes(priority)) {
      priority = priority === 'urgent' ? 'critical' : 'medium';
    }
    parsedData.priority = priority;

    return res.json({
      success: true,
      ticket: parsedData,
    });
  } catch (error: any) {
    console.error('Gemini vision ticket analysis error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze ticket image with Gemini Vision',
    });
  }
});

// POST /api/extract-image-text - Extract text / OCR from image for quick notes
app.post('/api/extract-image-text', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', mode = 'full' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const cleanBase64 = String(imageBase64).replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const promptText = mode === 'summary'
      ? 'Examine this image and extract a concise summary with key bullet points of all readable information, notes, or error messages.'
      : 'Extract all readable text, labels, error messages, code snippets, notes, or whiteboard diagram items from this image verbatim. Format with clean markdown headers and bullet lists.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        temperature: 0.2,
      },
    });

    const extractedText = response.text || '';
    return res.json({
      success: true,
      text: extractedText,
    });
  } catch (error: any) {
    console.error('Gemini OCR image-to-text error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract text from image',
    });
  }
});

// POST /api/transcribe-audio - Transcribe voice recordings / audio memos
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const cleanBase64 = String(audioBase64).replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe this spoken audio accurately into clear, well-punctuated text. Format into readable paragraphs or bullet points if multiple thoughts or action items are mentioned.',
          },
        ],
      },
    });

    const transcript = response.text || '';
    return res.json({
      success: true,
      text: transcript,
    });
  } catch (error: any) {
    console.error('Gemini audio transcription error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to transcribe audio note',
    });
  }
});

// POST /api/convert-note-to-ticket - AI structured ticket generation from note
app.post('/api/convert-note-to-ticket', async (req, res) => {
  try {
    const { noteTitle, noteContent, projectName, categories = [] } = req.body;

    if (!noteContent && !noteTitle) {
      return res.status(400).json({ error: 'Note title or content is required' });
    }

    const categoryListStr = Array.isArray(categories) && categories.length > 0
      ? `Available project categories: ${categories.join(', ')}.`
      : 'Suggested categories: Feature, Bug, UI/UX, Backend, Mobile, Infrastructure, Documentation.';

    const systemInstruction = `You are a Senior Technical Project Manager.
Transform the provided scratchpad note into a well-crafted development ticket for ${projectName || 'the project'}.
Break down the note into:
1. Title: High-clarity, concise action title (under 70 chars).
2. Description: Detailed problem statement, user story or specification, and acceptance criteria.
3. Notes: Key technical caveats, execution scratchpad details, or edge cases from the original note.
4. Priority: 'low' | 'medium' | 'high' | 'critical'.
5. Category: The most appropriate category from: ${categoryListStr}.

Always return strictly valid JSON.`;

    const userPrompt = `Convert this note into a complete issue ticket:
Title: "${noteTitle || ''}"
Content:
"""
${noteContent || ''}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            notes: { type: Type.STRING },
            priority: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ['title', 'description', 'priority'],
        },
        temperature: 0.3,
      },
    });

    const rawText = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        title: noteTitle || 'New Ticket from Note',
        description: noteContent || '',
        notes: '',
        priority: 'medium',
      };
    }

    const allowedPriorities = ['low', 'medium', 'high', 'critical'];
    let priority = String(parsed.priority || 'medium').toLowerCase();
    if (!allowedPriorities.includes(priority)) {
      priority = priority === 'urgent' ? 'critical' : 'medium';
    }
    parsed.priority = priority;

    return res.json({
      success: true,
      ticket: parsed,
    });
  } catch (error: any) {
    console.error('Convert note to ticket error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to convert note to ticket',
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
