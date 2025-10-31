/**
 * API Server for Telegram Notifications
 * Exposes endpoints for frontend to register watchers
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multiBotService from './multi-bot-service.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Test bot connection
 * POST /api/telegram/test-bot
 * Body: { botToken }
 */
app.post('/api/telegram/test-bot', async (req, res) => {
  try {
    const { botToken } = req.body;
    
    if (!botToken) {
      return res.status(400).json({
        success: false,
        error: 'Bot token is required'
      });
    }
    
    const result = await multiBotService.testBotConnection(botToken);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send test message
 * POST /api/telegram/test-message
 * Body: { botToken, chatId }
 */
app.post('/api/telegram/test-message', async (req, res) => {
  try {
    const { botToken, chatId } = req.body;
    
    if (!botToken || !chatId) {
      return res.status(400).json({
        success: false,
        error: 'Bot token and chat ID are required'
      });
    }
    
    const success = await multiBotService.sendTestMessage(botToken, chatId);
    
    res.json({
      success,
      message: success ? 'Test message sent! Check your Telegram.' : 'Failed to send message'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Register watcher
 * POST /api/telegram/register-watcher
 * Body: { watcherId, botToken, chatId, config }
 */
app.post('/api/telegram/register-watcher', async (req, res) => {
  try {
    const {
      watcherId,
      botToken,
      notificationInterval,
      notifyOnAlert,
      notifyOnStatus,
      notifyOnError,
      watcherName,
      metric,
      eventName,
      bountyType,
      templateId
    } = req.body;
    
    if (!watcherId || !botToken) {
      return res.status(400).json({
        success: false,
        error: 'watcherId and botToken are required'
      });
    }
    
    const success = multiBotService.registerWatcher({
      watcherId,
      botToken,
      notificationInterval: parseInt(notificationInterval) || 60,
      notifyOnAlert: notifyOnAlert !== false,
      notifyOnStatus: notifyOnStatus !== false,
      notifyOnError: notifyOnError !== false,
      watcherName,
      metric,
      eventName, // Pass event name for event watchers
      bountyType, // Pass bounty type (aisports, kittypunch, etc.)
      templateId // Pass template id for brand-specific behavior
    });
    
    res.json({
      success,
      message: success ? 'Watcher registered successfully. User must send /start to bot.' : 'Failed to register watcher'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop watcher notifications (pause without unregistering)
 * POST /api/telegram/watcher/:watcherId/stop
 */
app.post('/api/telegram/watcher/:watcherId/stop', async (req, res) => {
  try {
    const { watcherId } = req.params;
    
    const success = multiBotService.stopWatcher(watcherId);
    
    res.json({
      success,
      message: success ? 'Watcher notifications paused' : 'Watcher not found'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Resume watcher notifications
 * POST /api/telegram/watcher/:watcherId/resume
 */
app.post('/api/telegram/watcher/:watcherId/resume', async (req, res) => {
  try {
    const { watcherId } = req.params;
    
    const success = multiBotService.resumeWatcher(watcherId);
    
    res.json({
      success,
      message: success ? 'Watcher notifications resumed' : 'Watcher not found'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ GET WATCHER LOGS (from Telegram bot notifications)
app.get('/api/telegram/watcher/:watcherId/logs', async (req, res) => {
  try {
    const { watcherId } = req.params;
    
    const logs = multiBotService.getWatcherLogs(watcherId);
    
    res.json({
      success: true,
      logs
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      logs: []
    });
  }
});

/**
 * Unregister watcher
 * DELETE /api/telegram/watcher/:watcherId
 */
app.delete('/api/telegram/watcher/:watcherId', async (req, res) => {
  try {
    const { watcherId } = req.params;
    
    const success = multiBotService.unregisterWatcher(watcherId);
    
    res.json({
      success,
      message: success ? 'Watcher unregistered' : 'Watcher not found'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WatcherForte Telegram Notifier API',
    timestamp: new Date().toISOString()
  });
});

// Start server (only in development/local mode)
// In Vercel/serverless, the server is handled by the platform
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Telegram API Server running on port ${PORT}`);
    console.log(`📡 Test at: http://localhost:${PORT}/health`);
    console.log(`\n💡 Endpoints available:`);
    console.log(`   POST   /api/telegram/test-bot`);
    console.log(`   POST   /api/telegram/test-message`);
    console.log(`   POST   /api/telegram/register-watcher`);
    console.log(`   POST   /api/telegram/watcher/:id/stop`);
    console.log(`   POST   /api/telegram/watcher/:id/resume`);
    console.log(`   DELETE /api/telegram/watcher/:id`);
  });
}

export default app;

