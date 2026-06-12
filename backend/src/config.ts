import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'autocfo-hackathon-secret',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_API_TYPE: process.env.AI_API_TYPE || 'openai',
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DB_PATH: process.env.DATABASE_URL || './data/autocfo.db',
};
