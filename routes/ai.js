const express = require('express');
const router = express.Router();
const groq = require('../config/groq');
const authMiddleware = require('../middleware/auth');

// POST /api/ai/enhance-bio - AI Bio Enhancer
router.post('/enhance-bio', authMiddleware, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service is not configured. Please set GROQ_API_KEY.' });
    }

    const { bio } = req.body;
    if (!bio) {
      return res.status(400).json({ error: 'Bio text is required' });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional LinkedIn bio writer. Enhance the given bio to make it more professional, engaging, and impactful. Keep it concise (2-4 sentences max). Maintain the same general meaning but improve the language, tone, and impact. Return ONLY the enhanced bio text, nothing else.'
        },
        {
          role: 'user',
          content: `Please enhance this LinkedIn bio:\n\n"${bio}"`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 300
    });

    const enhancedBio = completion.choices[0]?.message?.content?.trim();
    res.json({ enhancedBio });
  } catch (error) {
    console.error('AI Bio enhance error:', error);
    res.status(500).json({ error: 'Failed to enhance bio' });
  }
});

// POST /api/ai/enhance-caption - AI Caption Enhancer
router.post('/enhance-caption', authMiddleware, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service is not configured. Please set GROQ_API_KEY.' });
    }

    const { caption } = req.body;
    if (!caption) {
      return res.status(400).json({ error: 'Caption text is required' });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a social media expert specializing in LinkedIn posts. Enhance the given post caption to make it more engaging, professional, and likely to get interactions. Add relevant emojis and hashtags. Keep the same core message but improve the writing quality. Return ONLY the enhanced caption text, nothing else.'
        },
        {
          role: 'user',
          content: `Please enhance this LinkedIn post caption:\n\n"${caption}"`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500
    });

    const enhancedCaption = completion.choices[0]?.message?.content?.trim();
    res.json({ enhancedCaption });
  } catch (error) {
    console.error('AI Caption enhance error:', error);
    res.status(500).json({ error: 'Failed to enhance caption' });
  }
});

module.exports = router;
