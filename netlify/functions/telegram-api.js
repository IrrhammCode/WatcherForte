/**
 * Netlify Function wrapper for Telegram API
 * This adapts the Express API to Netlify's serverless function format
 */

import { Handler } from '@netlify/functions';
import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

// Import the Express app from api-server
import app from '../../telegram-notifier/api-server.js';

// Wrap Express app with serverless-http
const handler = serverless(app);

export const handler = async (event, context) => {
  // Convert Netlify event to Express-compatible format
  const serverlessHandler = serverless(app);
  return await serverlessHandler(event, context);
};

