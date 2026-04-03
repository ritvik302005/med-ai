const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  buildChatFallback,
  buildInteractionFallback,
  buildScanFallback,
  buildSymptomsFallback,
} = require('../utils/aiFallback');

function isOpenAIConfigured() {
  return (
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE'
  );
}

function extractTextContent(content) {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item?.type === 'text') {
          return item.text || '';
        }

        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function extractAssistantText(data) {
  return data?.choices?.[0]?.message?.content || '';
}

function parseJsonFromText(text, fallbackValue) {
  if (!text || typeof text !== 'string') {
    return fallbackValue;
  }

  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return fallbackValue;
  }
}

// @route   POST /api/ai/chat
// @desc    Proxy AI chat requests to OpenAI
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', max_tokens = 300 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    if (!isOpenAIConfigured()) {
      return res.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: buildChatFallback(messages),
            },
          },
        ],
        fallback: true,
      });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        max_tokens,
        messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    res.json({ ...response.data, fallback: false });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message;
    res.status(status).json({ error: { message } });
  }
});

// @route   POST /api/ai/scan
// @desc    Proxy prescription scan requests to OpenAI Vision
router.post('/scan', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o', max_tokens = 2000 } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    if (!isOpenAIConfigured()) {
      const result = buildScanFallback(messages);
      return res.json({
        result,
        rawText: JSON.stringify(result),
        fallback: true,
      });
    }

    const systemMessage = {
      role: 'system',
      content: 'You are a pharmacist AI. Extract ALL medicine names from the prescription and return ONLY a valid JSON array. No markdown, no extra text. Format: [{"branded":"BrandName","generic":"GenericName","composition":"ActiveIngredient (dose)","usage":"what it treats","brandedPrice":120,"genericPrice":35,"sideEffects":"common side effects","category":"drug category"}]. Use realistic Indian INR prices.',
    };

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        max_tokens,
        messages: [systemMessage, ...messages],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const rawText = extractAssistantText(response.data);
    const parsedResult = parseJsonFromText(rawText, buildScanFallback(messages));
    res.json({ result: parsedResult, rawText, fallback: false });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message;
    res.status(status).json({ error: { message } });
  }
});

// @route   POST /api/ai/interaction
// @desc    Check drug interactions via AI
router.post('/interaction', async (req, res) => {
  try {
    const { medicines } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      return res.status(400).json({ message: 'At least 2 medicines required' });
    }

    if (!isOpenAIConfigured()) {
      const result = buildInteractionFallback(medicines);
      return res.json({
        result,
        rawText: JSON.stringify(result),
        fallback: true,
      });
    }

    const prompt = `Check drug interaction between: ${medicines.join(' AND ')}. Return ONLY JSON: {"safe":true/false,"severity":"none/mild/moderate/severe","title":"brief title","description":"2-3 sentence explanation","recommendation":"what patient should do","symptoms":["symptom1","symptom2"]}`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: 'You are a clinical pharmacist. Return only valid JSON, no markdown.',
          },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const rawText = extractAssistantText(response.data);
    const parsedResult = parseJsonFromText(rawText, buildInteractionFallback(medicines));
    res.json({ result: parsedResult, rawText, fallback: false });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message;
    res.status(status).json({ error: { message } });
  }
});

// @route   POST /api/ai/symptoms
// @desc    Get medicine suggestions for symptoms via AI
router.post('/symptoms', async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !symptoms.trim()) {
      return res.status(400).json({ message: 'Symptoms description required' });
    }

    if (!isOpenAIConfigured()) {
      const result = buildSymptomsFallback(symptoms);
      return res.json({
        result,
        rawText: JSON.stringify(result),
        fallback: true,
      });
    }

    const prompt = `Patient symptoms: "${symptoms}". Suggest 4-6 medicines commonly used for these symptoms. Return ONLY JSON array: [{"branded":"BrandName","generic":"GenericName","composition":"ingredient (dose)","usage":"treats what","brandedPrice":120,"genericPrice":35,"category":"type","warning":"important warning if any"}]`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'You are a clinical pharmacist AI. Suggest medicines for symptoms. Always include a warning. Return only valid JSON array.',
          },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const rawText = extractAssistantText(response.data);
    const parsedResult = parseJsonFromText(rawText, buildSymptomsFallback(symptoms));
    res.json({ result: parsedResult, rawText, fallback: false });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message;
    res.status(status).json({ error: { message } });
  }
});

module.exports = router;
