import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'autocfo-hackathon-secret',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_API_TYPE: process.env.AI_API_TYPE || 'openai',
  AI_API_BASE_URL: process.env.AI_API_BASE_URL || 'https://api.groq.com/openai/v1',
  AI_MODEL: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/autocfo',
};
