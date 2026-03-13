const Groq = require('groq-sdk');

let groq = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('✅ Groq AI client initialized');
} else {
  console.warn('⚠️  Groq API key not set — AI features will be disabled');
}

module.exports = groq;
