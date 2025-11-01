/**
 * WatcherForte Multi-Bot Telegram Notification Service
 * 
 * Supports multiple users with their own bots!
 * Each watcher can have different bot token & chat ID
 */

import TelegramBot from 'node-telegram-bot-api';
import * as fcl from '@onflow/fcl';
import cron from 'node-cron';
import dotenv from 'dotenv';
import https from 'https';
import fetch from 'node-fetch';
import FindLabsAPI from './findlabs-api.js';

dotenv.config();

// HTTPS agent for fetch requests
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false
});

// Configuration
const FLOW_ACCESS_API = process.env.FLOW_ACCESS_API || 'http://localhost:8888';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_SECONDS) || 30;

// Configure Flow FCL
fcl.config({
  'accessNode.api': FLOW_ACCESS_API,
  'flow.network': process.env.FLOW_NETWORK || 'emulator'
});

// Store active bot instances
// Key: bot token, Value: { bot instance, watchers[] }
const activeBots = new Map();

// Watcher registry
// Key: watcher ID, Value: { botToken, chatId, config, lastNotification }
const watcherRegistry = new Map();

// ✅ LOGS REGISTRY: Store notification logs (in-memory, last 100 per watcher)
const watcherLogs = new Map();

function saveNotificationLog(watcherId, logEntry) {
  if (!watcherLogs.has(watcherId)) {
    watcherLogs.set(watcherId, []);
  }
  const logs = watcherLogs.get(watcherId);
  logs.push(logEntry);
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.shift();
  }
}

export function getWatcherLogs(watcherId) {
  return watcherLogs.get(watcherId) || [];
}

console.log('🤖 WatcherForte Multi-Bot Notifier Starting...');
console.log(`📡 Flow Access API: ${FLOW_ACCESS_API}`);
console.log(`🔄 Check Interval: ${CHECK_INTERVAL} seconds`);

/**
 * ======================
 * BOT MANAGEMENT
 * ======================
 */

/**
 * Get or create bot instance for a token
 * @param {string} botToken - Telegram bot token
 * @returns {TelegramBot} Bot instance
 */
function getBotInstance(botToken) {
  if (activeBots.has(botToken)) {
    return activeBots.get(botToken).bot;
  }
  
  try {
    // Enable polling to receive messages
    const bot = new TelegramBot(botToken, { polling: true });
    
    // Listen for /start command to auto-detect chat ID
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.username || msg.from.first_name || 'User';
      
      console.log(`✨ New /start from ${username} (Chat ID: ${chatId})`);
      
      // Find all watchers for this bot without chat ID
      let linkedCount = 0;
      for (const [watcherId, watcher] of watcherRegistry) {
        if (watcher.botToken === botToken && !watcher.chatId) {
          watcher.chatId = chatId;
          console.log(`✅ Linked watcher ${watcherId} to Chat ID ${chatId}`);
          linkedCount++;
          
          // Build notification list
          const notifications = [];
          if (watcher.notifyOnAlert) notifications.push('• 🚨 Alerts (when condition met)');
          if (watcher.notifyOnStatus) notifications.push('• 🔔 Regular status updates');
          if (watcher.notifyOnError) notifications.push('• ⚠️ Error notifications');
          
          const notificationText = notifications.length > 0 
            ? notifications.join('\n') 
            : '• 📢 All notifications enabled';
          
          // Send welcome message
          const welcomeMessage = `🎉 *Welcome to WatcherForte!*

Your watcher is now connected and ready!

📊 *Watcher:* ${watcher.watcherName || watcherId}
🔔 *Update Interval:* ${watcher.notificationInterval} minutes
✅ *Status:* Active

You'll receive notifications here for:
${notificationText}

💡 *Commands:*
/status - Quick watcher status
/list - Detailed watcher list
/watcher <name> - View specific watcher
/bots - Active bots overview
/help - Show all commands

🚀 Your watcher is monitoring now!`;
          
          try {
            await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
            console.log(`📤 Sent welcome message to ${chatId}`);
          } catch (error) {
            console.error(`❌ Failed to send welcome message to ${chatId}:`, error.message);
          }
        }
      }
      
      // If no watchers were linked, send a generic welcome
      if (linkedCount === 0) {
        const genericMessage = `👋 *Welcome to WatcherForte!*

Your bot is ready, but no watchers are registered yet.

To get started:
1. Go to WatcherForte Dashboard
2. Deploy a new watcher
3. Enable Telegram notifications with this bot

💡 *Commands:*
/list - View watcher list
/bots - System overview
/help - Show all commands

Need help? Visit the dashboard at http://localhost:5174`;
        
        try {
          await bot.sendMessage(chatId, genericMessage, { parse_mode: 'Markdown' });
          console.log(`📤 Sent generic welcome to ${chatId}`);
        } catch (error) {
          console.error(`❌ Failed to send generic welcome:`, error.message);
        }
      }
    });
    
    // Handle /status command
    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      let statusMessage = '📊 *Your Active Watchers:*\n\n';
      let hasWatchers = false;
      
      for (const [watcherId, watcher] of watcherRegistry) {
        if (watcher.botToken === botToken && watcher.chatId === chatId) {
          hasWatchers = true;
          const bountyIcon = watcher.bountyType === 'aisports' ? '🏀' : watcher.bountyType === 'kittypunch' ? '🥊' : '';
          
          // Get metric icon
          let metricIcon = '📊';
          let metricDisplay = watcher.metric || 'price';
          if (watcher.metric === 'price') metricIcon = '💰';
          else if (watcher.metric === 'transaction') metricIcon = '📊';
          else if (watcher.metric === 'event') metricIcon = '🎮';
          else if (watcher.metric === 'juice-price') { metricIcon = '💰'; metricDisplay = '$JUICE Price'; }
          else if (watcher.metric === 'juice-whale') { metricIcon = '🐋'; metricDisplay = 'Whale Tracking'; }
          else if (watcher.metric === 'player-stats') { metricIcon = '🏀'; metricDisplay = 'Player Performance'; }
          else if (watcher.metric === 'vault-activity') { metricIcon = '🏆'; metricDisplay = 'Fast Break Vaults'; }
          else if (watcher.metric === 'nft-marketplace') { metricIcon = '🎴'; metricDisplay = 'NFT Trading'; }
          
          statusMessage += `${bountyIcon} ${metricIcon} *${watcher.watcherName || watcherId}*\n`;
          statusMessage += `   Metric: ${metricDisplay}\n`;
          statusMessage += `   Interval: ${watcher.notificationInterval}min\n\n`;
        }
      }
      
      if (!hasWatchers) {
        statusMessage = '⚠️ No active watchers found for this chat.';
      }
      
      try {
        await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Failed to send status:', error.message);
      }
    });
    
    // Handle /list command (alias for status with more details)
    bot.onText(/\/list/, async (msg) => {
      const chatId = msg.chat.id;
      let listMessage = '📋 *Your Watchers List:*\n\n';
      let hasWatchers = false;
      let count = 0;
      
      for (const [watcherId, watcher] of watcherRegistry) {
        if (watcher.botToken === botToken && watcher.chatId === chatId) {
          hasWatchers = true;
          count++;
          const bountyIcon = watcher.bountyType === 'aisports' ? '🏀' : watcher.bountyType === 'kittypunch' ? '🥊' : '';
          
          // Get metric icon
          let metricIcon = '📊';
          let metricDisplay = watcher.metric || 'price';
          if (watcher.metric === 'price') metricIcon = '💰';
          else if (watcher.metric === 'transaction') metricIcon = '📊';
          else if (watcher.metric === 'event') metricIcon = '🎮';
          else if (watcher.metric === 'juice-price') { metricIcon = '💰'; metricDisplay = '$JUICE Price'; }
          else if (watcher.metric === 'juice-whale') { metricIcon = '🐋'; metricDisplay = 'Whale Tracking'; }
          else if (watcher.metric === 'player-stats') { metricIcon = '🏀'; metricDisplay = 'Player Performance'; }
          else if (watcher.metric === 'vault-activity') { metricIcon = '🏆'; metricDisplay = 'Fast Break Vaults'; }
          else if (watcher.metric === 'nft-marketplace') { metricIcon = '🎴'; metricDisplay = 'NFT Trading'; }
          
          listMessage += `${count}. ${bountyIcon} ${metricIcon} *${watcher.watcherName || watcherId}*\n`;
          listMessage += `   📍 ID: \`${watcherId}\`\n`;
          listMessage += `   📊 Metric: ${metricDisplay}\n`;
          if (watcher.metric === 'event' && watcher.eventName) {
            listMessage += `   🎯 Event: ${watcher.eventName}\n`;
          }
          listMessage += `   ⏱️ Interval: ${watcher.notificationInterval}min\n`;
          listMessage += `   🔔 Alerts: ${watcher.notifyOnAlert ? '✅' : '❌'}\n\n`;
        }
      }
      
      if (!hasWatchers) {
        listMessage = '⚠️ No watchers registered yet.\n\n';
        listMessage += '💡 Deploy a watcher at: http://localhost:5174';
      } else {
        listMessage += `\n💡 Use \`/watcher <name>\` for details`;
      }
      
      try {
        await bot.sendMessage(chatId, listMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Failed to send list:', error.message);
      }
    });
    
    // Handle /bots command (show all active bots)
    bot.onText(/\/bots/, async (msg) => {
      const chatId = msg.chat.id;
      
      // Check if user has any watchers
      let userHasAccess = false;
      for (const [watcherId, watcher] of watcherRegistry) {
        if (watcher.botToken === botToken && watcher.chatId === chatId) {
          userHasAccess = true;
          break;
        }
      }
      
      if (!userHasAccess) {
        try {
          await bot.sendMessage(chatId, '⚠️ You need to have an active watcher to use this command.', { parse_mode: 'Markdown' });
        } catch (error) {
          console.error('Failed to send bots message:', error.message);
        }
        return;
      }
      
      let botsMessage = '🤖 *Active Bots Overview:*\n\n';
      botsMessage += `📡 Total Active Bots: ${activeBots.size}\n`;
      botsMessage += `📊 Total Watchers: ${watcherRegistry.size}\n\n`;
      
      // Show watchers for this bot
      botsMessage += `*Your Watchers on this Bot:*\n`;
      let count = 0;
      for (const [watcherId, watcher] of watcherRegistry) {
        if (watcher.botToken === botToken && watcher.chatId === chatId) {
          count++;
          const bountyIcon = watcher.bountyType === 'aisports' ? '🏀' : watcher.bountyType === 'kittypunch' ? '🥊' : '';
          const metricIcon = watcher.metric === 'price' ? '💰' : watcher.metric === 'transaction' ? '📊' : '🎮';
          botsMessage += `${count}. ${bountyIcon} ${metricIcon} ${watcher.watcherName || watcherId}\n`;
        }
      }
      
      if (count === 0) {
        botsMessage += '   No watchers for this chat yet.\n';
      }
      
      botsMessage += `\n💡 Use \`/list\` to see detailed info`;
      
      try {
        await bot.sendMessage(chatId, botsMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Failed to send bots info:', error.message);
      }
    });
    
    // Handle /watcher <name> command (show specific watcher details)
    bot.onText(/\/watcher(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const watcherQuery = match[1]?.trim();
      
      if (!watcherQuery) {
        const helpMsg = '📍 *Usage:* `/watcher <name>`\n\n' +
          'Example: `/watcher FROTH Tracker`\n\n' +
          'Use `/list` to see your watchers.';
        try {
          await bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
        } catch (error) {
          console.error('Failed to send watcher help:', error.message);
        }
        return;
      }
      
      // Find watcher by name or ID
      let foundWatcher = null;
      let foundWatcherId = null;
      
      for (const [watcherId, watcher] of watcherRegistry) {
        if (watcher.botToken === botToken && watcher.chatId === chatId) {
          // Match by name or ID
          const watcherName = watcher.watcherName || watcherId;
          if (watcherName.toLowerCase().includes(watcherQuery.toLowerCase()) || 
              watcherId.toLowerCase().includes(watcherQuery.toLowerCase())) {
            foundWatcher = watcher;
            foundWatcherId = watcherId;
            break;
          }
        }
      }
      
      if (!foundWatcher) {
        try {
          await bot.sendMessage(chatId, 
            `❌ Watcher "${watcherQuery}" not found.\n\nUse \`/list\` to see available watchers.`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error('Failed to send not found message:', error.message);
        }
        return;
      }
      
      // Build detailed watcher info
      const bountyIcon = foundWatcher.bountyType === 'aisports' ? '🏀' : 
                         foundWatcher.bountyType === 'kittypunch' ? '🥊' : '';
      const metricIcon = foundWatcher.metric === 'price' ? '💰' : 
                        foundWatcher.metric === 'transaction' ? '📊' : '🎮';
      
      let detailMsg = `${bountyIcon} ${metricIcon} *${foundWatcher.watcherName || foundWatcherId}*\n\n`;
      detailMsg += `📍 *Watcher ID:* \`${foundWatcherId}\`\n`;
      detailMsg += `📊 *Metric Type:* ${foundWatcher.metric || 'price'}\n`;
      if (foundWatcher.metric === 'event' && foundWatcher.eventName) {
        detailMsg += `🎯 *Event Type:* ${foundWatcher.eventName}\n`;
      }
      if (foundWatcher.bountyType) {
        const bountyLabel = foundWatcher.bountyType === 'aisports' ? 'aiSports Fantasy' :
                            foundWatcher.bountyType === 'kittypunch' ? 'KittyPunch' :
                            foundWatcher.bountyType;
        detailMsg += `🏆 *Bounty:* ${bountyLabel}\n`;
      }
      detailMsg += `⏱️ *Check Interval:* ${foundWatcher.notificationInterval} minutes\n\n`;
      
      detailMsg += `*Notification Settings:*\n`;
      detailMsg += `🚨 Alerts: ${foundWatcher.notifyOnAlert ? '✅ Enabled' : '❌ Disabled'}\n`;
      detailMsg += `🔔 Status Updates: ${foundWatcher.notifyOnStatus ? '✅ Enabled' : '❌ Disabled'}\n`;
      detailMsg += `⚠️ Error Notifications: ${foundWatcher.notifyOnError ? '✅ Enabled' : '❌ Disabled'}\n\n`;
      
      if (foundWatcher.lastNotification) {
        const lastNotif = new Date(foundWatcher.lastNotification);
        detailMsg += `📤 *Last Notification:*\n   ${lastNotif.toLocaleString()}\n\n`;
      }
      
      if (foundWatcher.lastStatus) {
        detailMsg += `*Last Status:*\n`;
        if (foundWatcher.metric === 'price') {
          detailMsg += `💵 Value: ${foundWatcher.lastStatus.currentValue}\n`;
          detailMsg += `🎯 Limit: ${foundWatcher.lastStatus.limit}\n`;
        } else if (foundWatcher.metric === 'transaction') {
          detailMsg += `🔢 Transactions: ${foundWatcher.lastStatus.transactionCount}\n`;
          detailMsg += `💰 Volume: ${foundWatcher.lastStatus.totalVolume}\n`;
        } else if (foundWatcher.metric === 'event') {
          detailMsg += `🎮 Events: ${foundWatcher.lastStatus.eventsDetected}\n`;
          detailMsg += `📋 Latest: ${foundWatcher.lastStatus.latestEvent}\n`;
        }
      } else {
        detailMsg += `⏳ *Status:* Waiting for first check...`;
      }
      
      try {
        await bot.sendMessage(chatId, detailMsg, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Failed to send watcher details:', error.message);
      }
    });
    
    // Handle /help command
    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = `🤖 *WatcherForte Bot Commands*

*Basic Commands:*
/start - Connect and activate bot
/status - Quick status of your watchers
/list - Detailed list of all watchers

*Watcher Info:*
/watcher <name> - View specific watcher details
Example: \`/watcher FROTH\`

*System Info:*
/bots - Show active bots overview

*Help:*
/help - Show this message

---

📊 *What This Bot Does:*
• Monitors Flow blockchain watchers
• Sends alerts when conditions are met
• Regular status updates
• Error notifications

🔗 Dashboard: http://localhost:5174

Need help? Check the documentation!`;
      
      try {
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Failed to send help:', error.message);
      }
    });
    
    // Handle polling errors
    bot.on('polling_error', (error) => {
      console.error(`❌ Polling error for bot ${botToken.substring(0, 10)}...:`, error.message);
    });
    
    activeBots.set(botToken, {
      bot,
      botToken,
      watchers: [],
      createdAt: Date.now()
    });
    
    console.log(`✅ Created bot instance for token: ${botToken.substring(0, 10)}...`);
    console.log(`   Polling enabled for auto chat detection`);
    return bot;
    
  } catch (error) {
    console.error('❌ Failed to create bot instance:', error);
    console.error('   Error details:', error.message);
    return null;
  }
}

/**
 * Register a watcher with Telegram notifications
 * @param {Object} watcherConfig
 */
export function registerWatcher(watcherConfig) {
  const { 
    watcherId,
    botToken,
    notificationInterval = 60,
    notifyOnAlert = true,
    notifyOnStatus = true,
    notifyOnError = true,
    watcherName,
    metric,
    eventName,
    bountyType,
    templateId
  } = watcherConfig;
  
  if (!botToken) {
    console.error('❌ Missing bot token for watcher:', watcherId);
    return false;
  }
  
  // Get or create bot instance
  const bot = getBotInstance(botToken);
  if (!bot) {
    console.error('❌ Failed to get bot instance for watcher:', watcherId);
    return false;
  }
  
  // Register watcher (chatId will be set when user sends /start)
  watcherRegistry.set(watcherId, {
    botToken,
    chatId: null, // Will be auto-detected when user sends /start
    notificationInterval,
    notifyOnAlert,
    notifyOnStatus,
    notifyOnError,
    watcherName,
    metric,
    eventName, // Store event name for event watchers
    bountyType, // Store bounty type (aisports, kittypunch, etc.)
    templateId, // Store template id (dapper-nba, dapper-nfl, ...)
    lastNotification: null,
    lastStatus: null
  });
  
  // Add watcher to bot's watcher list
  const botData = activeBots.get(botToken);
  if (botData && !botData.watchers.includes(watcherId)) {
    botData.watchers.push(watcherId);
  }
  
  console.log(`✅ Registered watcher ${watcherId} with bot ${botToken.substring(0, 10)}...`);
  console.log(`   ⏳ Waiting for user to send /start to detect Chat ID`);
  console.log(`   Interval: ${notificationInterval}min`);
  
  return true;
}

/**
 * Unregister a watcher
 * @param {string} watcherId
 */
export function unregisterWatcher(watcherId) {
  const watcher = watcherRegistry.get(watcherId);
  if (!watcher) return false;
  
  // Remove from bot's watcher list
  const botData = activeBots.get(watcher.botToken);
  if (botData) {
    botData.watchers = botData.watchers.filter(id => id !== watcherId);
    
    // If no watchers left for this bot, clean up
    if (botData.watchers.length === 0) {
      botData.bot.stopPolling();
      activeBots.delete(watcher.botToken);
      console.log(`🗑️  Removed bot instance (no watchers left): ${watcher.botToken.substring(0, 10)}...`);
    }
  }
  
  watcherRegistry.delete(watcherId);
  console.log(`🗑️  Unregistered watcher: ${watcherId}`);
  
  return true;
}

/**
 * Stop watcher notifications (pause without unregistering)
 * @param {string} watcherId
 * @returns {boolean}
 */
export function stopWatcher(watcherId) {
  const watcher = watcherRegistry.get(watcherId);
  if (!watcher) {
    console.warn(`⚠️  Watcher ${watcherId} not found`);
    return false;
  }
  
  watcher.stopped = true;
  console.log(`⛔ Stopped watcher: ${watcherId} (notifications paused)`);
  
  return true;
}

/**
 * Resume watcher notifications
 * @param {string} watcherId
 * @returns {boolean}
 */
export function resumeWatcher(watcherId) {
  const watcher = watcherRegistry.get(watcherId);
  if (!watcher) {
    console.warn(`⚠️  Watcher ${watcherId} not found`);
    return false;
  }
  
  watcher.stopped = false;
  console.log(`✅ Resumed watcher: ${watcherId} (notifications active)`);
  
  return true;
}

/**
 * ======================
 * NOTIFICATION FUNCTIONS
 * ======================
 */

/**
 * Send status update to user
 * @param {string} watcherId
 * @param {Object} statusData
 */
export async function sendStatusUpdate(watcherId, statusData) {
  const watcher = watcherRegistry.get(watcherId);
  if (!watcher || !watcher.notifyOnStatus) return;
  
  // Check if chat ID is set (user must send /start first)
  if (!watcher.chatId) {
    console.log(`⏳ Watcher ${watcherId}: Waiting for user to send /start`);
    return;
  }
  
  // Check if it's time for status update
  const timeSinceLastNotif = Date.now() - (watcher.lastNotification || 0);
  const intervalMs = watcher.notificationInterval * 60 * 1000;
  
  if (timeSinceLastNotif < intervalMs) {
    return; // Not time yet
  }
  
  const bot = getBotInstance(watcher.botToken);
  if (!bot) return;
  
  // Customize message based on metric type
  let message = '';
  const metric = watcher.metric || 'price';
  
  if (metric === 'price') {
    // 💰 PRICE TRACKING
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      // 😺 CRYPTOKITTIES MEOWCOIN PRICE UPDATE
      message = `
😺 *CryptoKitties MeowCoin Price Update*

💰 *Token:* ${watcher.watcherName || 'MeowCoin'}
💵 *Current Price:* ${statusData.currentValue}
🎯 *Your Target:* ${statusData.limit}
📈 *24h Change:* ${statusData.change24h || 'N/A'}

${statusData.conditionMet ? '🚨 *ALERT!* MeowCoin price exceeded your target!' : '✅ Price is within your target range'}

💡 *Track MeowCoin on CryptoKitties marketplace*

⏰ Next update in ${watcher.notificationInterval} minutes
    `;
    } else if (watcher.bountyType === 'dapper-insights') {
      // 🏀 NBA TOP SHOT / DAPPER PRICE UPDATE
      const mockDisclaimer = watcher._usingMockPrice 
        ? '\n⚠️ _Estimated price (no recent sales data)_\n' 
        : '';
      
      message = `
🏀 *NBA Top Shot Price Update*

📊 *Moment:* ${watcher.watcherName || watcherId}
💵 *Current Price:* ${statusData.currentValue}${mockDisclaimer}
🎯 *Your Target:* ${statusData.limit}
📈 *24h Change:* ${statusData.change24h || 'N/A'}

${statusData.conditionMet ? '🚨 *ALERT!* Moment price exceeded your target!' : '✅ Price is within your target range'}

💡 *Track your investment on NBA Top Shot marketplace*

⏰ Next update in ${watcher.notificationInterval} minutes
    `;
    } else if (watcher.templateId === 'beezie-collectible' || watcher.bountyType === 'beezie') {
      // 🎨 BEEZIE COLLECTIBLE PRICE STATUS (Task 1)
      message = `
💰 *Beezie Collectible Price Update*

🎨 *Collectible:* ${watcher.watcherName || watcherId}
💵 *ALT.xyz Fair Market Value:* ${statusData.currentValue}
🎯 *Your Target:* ${statusData.limit}
📈 *24h Change:* ${statusData.change24h || 'N/A'}

${statusData.conditionMet ? '🚨 *ALERT!* Price exceeded your target!' : '✅ Price is within your target range'}

💡 *Tracking ALT.xyz Fair Market Value (auto-updated every 24h)*

⏰ Next update in ${watcher.notificationInterval} minutes
    `;
    } else {
      // Generic price tracking
      const unavailableWarning = (statusData.currentValue.includes('unavailable') || statusData.limit.includes('not set'))
        ? '\n⚠️ *Note:* Price data or target limit is currently unavailable. Check dashboard for details.'
        : '';
      
      message = `
💰 *Price Tracker Update*

📊 *Asset:* ${watcher.watcherName || watcherId}
💵 *Current Price:* ${statusData.currentValue}
🎯 *Your Limit:* ${statusData.limit}
📈 *24h Change:* ${statusData.change24h || 'N/A'}

${statusData.conditionMet ? '🚨 *ALERT!* Price exceeded your limit!' : (statusData.currentValue.includes('unavailable') || statusData.limit.includes('not set') ? '⚠️ *Unable to check* - Price or target unavailable' : '✅ Price is within your target range')}${unavailableWarning}

⏰ Next update in ${watcher.notificationInterval} minutes
    `;
    }
  } else if (metric === 'transaction') {
    // 📊 TRANSACTION VOLUME
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
🐋 *CryptoKitties Whale Alert & Sales Update*

😺 *Asset:* ${watcher.watcherName || 'MeowCoin'}
📊 *Activity:* ${statusData.currentValue}
🎯 *Threshold:* ${statusData.limit}
💵 *Volume 24h:* ${statusData.volume24h || 'N/A'}

${statusData.conditionMet ? '🚨 *ALERT!* Large transfer or sales activity detected!' : '✅ Activity is within normal range'}

💡 *Track whale movements & marketplace activity*

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL MARKETPLACE ACTIVITY
      message = `
📊 *MFL Marketplace Activity Update*

⚽ *Marketplace:* ${watcher.watcherName || 'MFL Players'}
🔢 *24h Transactions:* ${statusData.transactionCount || '0'}
💰 *Volume (FLOW):* ${statusData.totalVolume || 'N/A'}
📈 *Trend:* ${statusData.trend || 'Monitoring...'}

📥 *Transfers:* ${statusData.buyCount || 0} | 📤 *Sales:* ${statusData.sellCount || 0}

${statusData.conditionMet ? '🚨 *HIGH ACTIVITY!* Trading volume spike detected!' : '✅ Normal marketplace activity'}

💡 *Track MFL player NFT trading volume & marketplace trends*

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    } else {
      // Generic transaction tracking
      message = `
📊 *Transaction Volume Update*

📦 *Asset:* ${watcher.watcherName || watcherId}
🔢 *24h Transactions:* ${statusData.transactionCount || '0'}
💰 *Volume (USD):* ${statusData.totalVolume || 'N/A'}
📈 *Trend:* ${statusData.trend || 'Monitoring...'}
${statusData.priceChange ? `📊 *Price Change:* ${statusData.priceChange}` : ''}

📥 *Buys:* ${statusData.buyCount || 0} | 📤 *Sells:* ${statusData.sellCount || 0}

${statusData.conditionMet ? '🚨 *HIGH ACTIVITY!* Volume spike detected!' : '✅ Normal trading activity'}

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    }
  } else if (metric === 'event') {
    // 🎮 GAME EVENTS
    // ✅ CHECK: Is this MFL?
    if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      message = `
⚽ *MFL Football Events Update*

🎯 *Watcher:* ${watcher.watcherName || watcherId}
🔔 *Events Detected:* ${statusData.eventsDetected || '0'}
📋 *Latest Event:* ${statusData.latestEvent || 'No new events'}
⏱️ *Last Event:* ${statusData.lastEventTime || 'N/A'}
${statusData.blockHeight ? `📦 *Block Height:* ${statusData.blockHeight}` : ''}

${statusData.conditionMet ? '🎉 *NEW MFL EVENT!* Check details above' : '👀 Watching for: Player transfers, level ups, matches, competitions, delegations'}

💡 *Track MFL on-chain football events: transfers, matches, competitions*

⏰ Next scan in ${watcher.notificationInterval} minutes
    `;
    } else {
      // Generic game events
      message = `
🎮 *Game Events Update*

🎯 *Watcher:* ${watcher.watcherName || watcherId}
🔔 *Events Detected:* ${statusData.eventsDetected || '0'}
📋 *Latest Event:* ${statusData.latestEvent || 'No new events'}
⏱️ *Last Event:* ${statusData.lastEventTime || 'N/A'}
${statusData.blockHeight ? `📦 *Block Height:* ${statusData.blockHeight}` : ''}

${statusData.conditionMet ? '🎉 *NEW EVENT!* Check details above' : '👀 Watching for: NFT Mints, Rewards, Achievements, High Scores'}

⏰ Next scan in ${watcher.notificationInterval} minutes
    `;
    }
  } else if (metric === 'ownership') {
    // 👤 NFT OWNERSHIP STATUS
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
👤 *CryptoKitties NFT Ownership Status*

😺 *NFT Tracker:* ${watcher.watcherName || watcherId}
📍 *Current Status:* ${statusData.currentValue}
👁️ *Monitoring:* CryptoKitties NFT ownership transfers

✅ *Status:* ${statusData.conditionMet ? '🚨 Transfer detected!' : 'No changes - Still monitoring'}

💡 *Track CryptoKitties NFT ownership*

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL PLAYER OWNERSHIP STATUS
      message = `
👤 *MFL Player Ownership Status*

⚽ *Player Tracker:* ${watcher.watcherName || watcherId}
📍 *Current Status:* ${statusData.currentValue}
👁️ *Monitoring:* MFL Player NFT ownership transfers

✅ *Status:* ${statusData.conditionMet ? '🚨 Transfer detected!' : 'No changes - Still monitoring'}

💡 *Track when MFL player NFTs change hands between managers*

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    } else {
      // NBA Top Shot / Generic ownership
      message = `
👤 *NBA Top Shot Ownership Status*

🏀 *Moment Tracker:* ${watcher.watcherName || watcherId}
📍 *Current Status:* ${statusData.currentValue}
👁️ *Monitoring:* Ownership transfers

✅ *Status:* ${statusData.conditionMet ? '🚨 Transfer detected!' : 'No changes - Still monitoring'}

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    }
  } else if (metric === 'nft-floor') {
    // 📉 NFT FLOOR PRICE STATUS
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
📉 *CryptoKitties NFT Floor Price Update*

😺 *Collection:* ${watcher.watcherName || 'CryptoKitties NFT'}
💵 *Current Floor:* ${statusData.currentValue}
🎯 *Your Target:* ${statusData.limit}

${statusData.conditionMet ? '🚨 *ALERT!* Floor price reached your target!' : '✅ Floor price below target - good buying opportunity'}

💡 *Track CryptoKitties NFT collection floor price*

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL PLAYER FLOOR PRICE STATUS
      message = `
📉 *MFL Player Collection Floor Price Update*

⚽ *Collection:* ${watcher.watcherName || 'MFL Players'}
💵 *Current Floor:* ${statusData.currentValue}
🎯 *Your Target:* ${statusData.limit}

${statusData.conditionMet ? '🚨 *ALERT!* Floor price reached your target!' : '✅ Floor price below target - good buying opportunity'}

💡 *Track MFL Player NFT collection floor price*

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    } else {
      // NBA Top Shot / Generic floor price
      message = `
📉 *NBA Top Shot Floor Price Update*

🏀 *Collection:* ${watcher.watcherName || watcherId}
💵 *Current Floor:* ${statusData.currentValue}
🎯 *Your Target:* ${statusData.limit}

${statusData.conditionMet ? '🚨 *ALERT!* Floor price reached your target!' : '✅ Floor price below target - good buying opportunity'}

⏰ Next check in ${watcher.notificationInterval} minutes
    `;
    }
  } else {
    // Generic fallback
    message = `
🔔 *WatcherForte Status Update*

📊 *Watcher:* ${watcher.watcherName || watcherId}
💰 *Current Value:* ${statusData.currentValue}
🎯 *Your Limit:* ${statusData.limit}
📈 *24h Change:* ${statusData.change24h || 'N/A'}
✅ *Status:* ${statusData.conditionMet ? '🚨 ALERT TRIGGERED!' : 'Watching...'}

⏰ Next check in: ${watcher.notificationInterval} minutes
    `;
  }
  
  try {
    await bot.sendMessage(watcher.chatId, message, { parse_mode: 'Markdown' });
    watcher.lastNotification = Date.now();
    watcher.lastStatus = statusData;
    console.log(`📤 [${metric.toUpperCase()}] Status update sent to ${watcher.chatId} for watcher ${watcherId}`);
  } catch (error) {
    console.error(`❌ Failed to send status to ${watcher.chatId}:`, error.message);
  }
}

/**
 * Send alert when condition is met
 * @param {string} watcherId
 * @param {Object} alertData
 */
export async function sendAlert(watcherId, alertData) {
  const watcher = watcherRegistry.get(watcherId);
  if (!watcher || !watcher.notifyOnAlert) return;
  
  // Check if chat ID is set
  if (!watcher.chatId) {
    console.log(`⏳ Watcher ${watcherId}: Cannot send alert, waiting for /start`);
    return;
  }
  
  const bot = getBotInstance(watcher.botToken);
  if (!bot) return;
  
  // Customize alert based on metric type
  let message = '';
  const metric = watcher.metric || 'price';
  const timestamp = new Date().toLocaleString();
  
  if (metric === 'price') {
    // 💰 PRICE ALERT
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      // 😺 CRYPTOKITTIES MEOWCOIN PRICE ALERT
      message = `
🚨 *CRYPTOKITTIES MEOWCOIN PRICE ALERT!*

😺 *Token:* ${watcher.watcherName || 'MeowCoin'}

📈 *Current Price:* ${alertData.currentValue}
🎯 *Your Target:* ${alertData.limit}
📊 *Change:* ${alertData.change || '+0.00%'}

⚡ *MeowCoin price has exceeded your target!*

💡 *Action Ideas:*
• Consider trading on CryptoKitties marketplace
• Monitor price trends
• Check whale movements

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.templateId === 'beezie-collectible' || watcher.bountyType === 'beezie') {
      // 🎨 BEEZIE COLLECTIBLE PRICE ALERT (Task 1 + Task 3)
      message = `
🚨 *BEEZIE COLLECTIBLE PRICE ALERT!*

🎨 *Collectible:* ${watcher.watcherName || watcherId}

📈 *Current Price (ALT.xyz):* ${alertData.currentValue}
🎯 *Your Target:* ${alertData.limit}
📊 *Change:* ${alertData.change || '+0.00%'}

${alertData.isClawPull ? '💎 *CLAW PULL DETECTED!* High-value sale!' : ''}

⚡ *ALT.xyz Fair Market Value exceeded your target!*

💡 *Action Ideas:*
• Consider selling on Beezie marketplace
• Monitor price trends
• Track market movements
• Check for "Claw Pull" opportunities

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.bountyType === 'dapper-insights') {
      // 🏀 NBA TOP SHOT PRICE ALERT
      message = `
🚨 *NBA TOP SHOT PRICE ALERT!*

🏀 *Moment:* ${watcher.watcherName || watcherId}

📈 *Current Price:* ${alertData.currentValue}
🎯 *Your Target:* ${alertData.limit}
📊 *Change:* ${alertData.change || '+0.00%'}

⚡ *Moment price has exceeded your target!*

💡 *Action Ideas:*
• Consider selling on marketplace
• List at higher price
• Monitor price trends

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else {
      // Generic price alert
      message = `
🚨 *PRICE ALERT!*

💰 *${watcher.watcherName || watcherId}*

📈 *Current Price:* ${alertData.currentValue}
🎯 *Your Target:* ${alertData.limit}
📊 *Change:* ${alertData.change || '+0.00%'}

⚡ *Price has exceeded your limit!*

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    }
  } else if (metric === 'transaction') {
    // 📊 VOLUME ALERT / WHALE ALERT
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
🐋 *CRYPTOKITTIES WHALE ALERT!*

😺 *${watcher.watcherName || 'MeowCoin'}*

💰 *Transfer Amount:* ${alertData.transactionCount || alertData.currentValue}
🎯 *Threshold:* ${alertData.limit}
💵 *Volume 24h:* ${alertData.volumeUSD || 'N/A'}
📊 *Change:* ${alertData.change || 'N/A'}

⚡ *Large MeowCoin transfer detected!*

💡 This could indicate:
• Whale movement 🐋
• Marketplace activity 📊
• Trading activity 💹

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL MARKETPLACE ACTIVITY ALERT
      message = `
🚨 *MFL MARKETPLACE ACTIVITY ALERT!*

⚽ *${watcher.watcherName || 'MFL Players'}*

🔢 *24h Transactions:* ${alertData.transactionCount || alertData.currentValue}
💰 *Total Volume (FLOW):* ${alertData.volumeUSD || 'N/A'}
🎯 *Threshold:* ${alertData.limit}
📈 *Activity Level:* ${alertData.activityLevel || 'Very High'}

📥 *Transfers:* ${alertData.buyCount || 0}
📤 *Sales:* ${alertData.sellCount || 0}

⚡ *Unusual MFL marketplace activity detected!*

💡 This could indicate:
• High player trading activity ⚽
• Rare player sales 🏆
• Market trends shifting 📊

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else {
      // Generic volume alert
      message = `
🚨 *VOLUME SPIKE ALERT!*

📊 *${watcher.watcherName || watcherId}*

🔢 *24h Transactions:* ${alertData.transactionCount || alertData.currentValue}
💰 *Total Volume:* ${alertData.volumeUSD || 'N/A'}
🎯 *Threshold:* ${alertData.limit}
📈 *Activity Level:* ${alertData.activityLevel || 'Very High'}
📊 *Change:* ${alertData.change || 'N/A'}

📥 *Buys:* ${alertData.buyCount || 0}
📤 *Sells:* ${alertData.sellCount || 0}

⚡ *Unusual trading activity detected!*

💡 This could indicate:
• Viral moment 🔥
• Major announcement 📢
• Community event 🎉

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    }
  } else if (metric === 'event') {
    // 🎮/🏀 EVENT ALERT (Game-specific)
    const bountyType = watcher.bountyType || 'generic';
    
    if (bountyType === 'aisports') {
      // 🏀 AISPORTS-SPECIFIC ALERT
      const eventEmoji = alertData.eventEmoji || '🏀';
      message = `
${eventEmoji} *FANTASY BASKETBALL ALERT!*

🏀 *${watcher.watcherName || watcherId}*

🔔 *Event:* ${alertData.eventType || 'New Activity'}
📋 *Details:* ${alertData.eventDetails || alertData.currentValue}
${alertData.playerName ? `👤 *Player:* ${alertData.playerName}` : ''}
${alertData.stats ? `📊 *Stats:* ${alertData.stats}` : ''}
${alertData.juiceAmount ? `💰 *$JUICE Amount:* ${alertData.juiceAmount}` : ''}
⏱️ *Time:* ${alertData.eventTime || timestamp}

${alertData.totalEvents > 1 ? `🎯 *Total Events:* ${alertData.totalEvents}` : ''}

⚡ *What happened:*
${alertData.actionRequired || 'A new fantasy basketball event was detected!'}

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (bountyType === 'kittypunch') {
      // 🥊 KITTYPUNCH-SPECIFIC ALERT
      const eventEmoji = alertData.eventEmoji || '🥊';
      message = `
${eventEmoji} *KITTYPUNCH GAME EVENT!*

🥊 *${watcher.watcherName || watcherId}*

🔔 *Event:* ${alertData.eventType || 'New Activity'}
📋 *Details:* ${alertData.eventDetails || alertData.currentValue}
👤 *Player:* #${alertData.playerId || 'Unknown'}
${alertData.rewardAmount ? `🎁 *FROTH Reward:* ${alertData.rewardAmount}` : ''}
⏱️ *Time:* ${alertData.eventTime || timestamp}

${alertData.totalEvents > 1 ? `🎯 *Total Events:* ${alertData.totalEvents}` : ''}

⚡ *What happened:*
${alertData.actionRequired || 'A new game event was detected!'}

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL-SPECIFIC EVENT ALERT
      const eventEmoji = alertData.eventEmoji || '⚽';
      message = `
${eventEmoji} *MFL FOOTBALL EVENT ALERT!*

⚽ *${watcher.watcherName || watcherId}*

🔔 *Event:* ${alertData.eventType || 'New MFL Activity'}
📋 *Details:* ${alertData.eventDetails || alertData.currentValue}
${alertData.playerId ? `⚽ *Player ID:* ${alertData.playerId}` : ''}
${alertData.matchId ? `🎮 *Match ID:* ${alertData.matchId}` : ''}
${alertData.competitionId ? `🏆 *Competition:* ${alertData.competitionId}` : ''}
⏱️ *Time:* ${alertData.eventTime || timestamp}

${alertData.totalEvents > 1 ? `🎯 *Total Events:* ${alertData.totalEvents}` : ''}

⚡ *What happened:*
${alertData.actionRequired || 'A new MFL on-chain football event was detected! (Player transfer, level up, match result, competition, etc.)'}

💡 Track: Player transfers, level ups, matches, competitions, delegations

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.templateId === 'beezie-collectible' || watcher.bountyType === 'beezie') {
      // 🎨 BEEZIE MARKETPLACE EVENT ALERT (Task 3)
      const eventEmoji = alertData.eventEmoji || '🎨';
      message = `
${eventEmoji} *BEEZIE MARKETPLACE EVENT!*

🎨 *${watcher.watcherName || watcherId}*

🔔 *Event:* ${alertData.eventType || 'New Collectible Activity'}
📋 *Details:* ${alertData.eventDetails || alertData.currentValue}
${alertData.collectibleId ? `🎴 *Collectible ID:* ${alertData.collectibleId}` : ''}
${alertData.price ? `💰 *Price:* ${alertData.price} USD` : ''}
${alertData.isClawPull ? `💎 *CLAW PULL!* High-value sale detected!` : ''}
⏱️ *Time:* ${alertData.eventTime || timestamp}

⚡ *What happened:*
${alertData.actionRequired || 'A new Beezie marketplace event was detected! (New collectible drop, big price change, or "Claw Pull" high-value sale)'}

💡 Track: New drops, price changes, "Claw Pulls"

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else {
      // Generic event alert
      message = `
${alertData.eventEmoji || '🎉'} *NEW GAME EVENT!*

🎮 *${watcher.watcherName || watcherId}*

🔔 *Event:* ${alertData.eventType || 'New Activity'}
📋 *Details:* ${alertData.eventDetails || alertData.currentValue}
👤 *Player:* #${alertData.playerId || 'Unknown'}
📦 *Block:* ${alertData.blockHeight || 'N/A'}
⏱️ *Time:* ${alertData.eventTime || timestamp}

${alertData.totalEvents > 1 ? `🎯 *Total Events:* ${alertData.totalEvents}` : ''}

⚡ *What happened:*
${alertData.actionRequired || 'A new event was detected in the game!'}

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    }
  } else if (metric === 'ownership') {
    // 👤 NFT OWNERSHIP CHANGE
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
👤 *CRYPTOKITTIES NFT OWNERSHIP TRANSFER!*

😺 *NFT:* ${alertData.nftName || alertData.momentName || alertData.currentValue}

👨‍💼 *Previous Owner:*
\`${alertData.previousOwner}\`

👨‍💼 *New Owner:*
\`${alertData.newOwner}\`

${alertData.salePrice ? `💰 *Sale Price:* ${alertData.salePrice}` : ''}

⚡ *What this means:*
This CryptoKitties NFT has changed hands!
${alertData.salePrice ? 'It was sold on the marketplace.' : 'It was transferred between wallets.'}

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL PLAYER OWNERSHIP TRANSFER
      message = `
👤 *MFL PLAYER OWNERSHIP TRANSFER!*

⚽ *Player:* ${alertData.playerName || alertData.currentValue}

👨‍💼 *Previous Owner (Manager):*
\`${alertData.previousOwner}\`

👨‍💼 *New Owner (Manager):*
\`${alertData.newOwner}\`

${alertData.salePrice ? `💰 *Sale Price:* ${alertData.salePrice} FLOW` : ''}

⚡ *What this means:*
This MFL Player NFT has changed hands!
${alertData.salePrice ? 'It was sold on the MFL marketplace.' : 'It was transferred between managers.'}

💡 Track player trades and manager-to-manager transfers

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else {
      // NBA Top Shot / Generic ownership
      message = `
👤 *NBA TOP SHOT OWNERSHIP TRANSFER!*

🏀 *Moment:* ${alertData.momentName || alertData.currentValue}

👨‍💼 *Previous Owner:*
\`${alertData.previousOwner}\`

👨‍💼 *New Owner:*
\`${alertData.newOwner}\`

${alertData.salePrice ? `💰 *Sale Price:* ${alertData.salePrice}` : ''}

⚡ *What this means:*
This Moment has changed hands!
${alertData.salePrice ? 'It was sold on the marketplace.' : 'It was transferred between wallets.'}

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    }
  } else if (metric === 'nft-floor') {
    // 📉 NFT FLOOR PRICE ALERT
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
📉 *CRYPTOKITTIES NFT FLOOR PRICE ALERT!*

😺 *Collection:* ${alertData.collectionName || 'CryptoKitties NFT'}

💵 *Current Floor Price:* ${alertData.currentValue}
🎯 *Your Target:* ${alertData.limit}

${alertData.volume24h ? `📊 *24h Volume:* $${alertData.volume24h.toLocaleString()}` : ''}
${alertData.sales24h ? `🔢 *24h Sales:* ${alertData.sales24h}` : ''}

⚡ *CryptoKitties floor price reached your target!*

💡 *Action Ideas:*
• Consider buying at floor
• List your CryptoKitties NFTs
• Monitor market trends

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else if (watcher.templateId === 'mfl-player' || watcher.bountyType === 'mfl') {
      // ⚽ MFL PLAYER FLOOR PRICE ALERT
      message = `
📉 *MFL PLAYER COLLECTION FLOOR PRICE ALERT!*

⚽ *Collection:* ${alertData.collectionName || 'MFL Players'}

💵 *Current Floor Price:* ${alertData.currentValue} FLOW
🎯 *Your Target:* ${alertData.limit} FLOW

${alertData.volume24h ? `📊 *24h Volume:* ${alertData.volume24h.toLocaleString()} FLOW` : ''}
${alertData.sales24h ? `🔢 *24h Sales:* ${alertData.sales24h}` : ''}

⚡ *MFL Player floor price reached your target!*

💡 *Action Ideas:*
• Consider buying players at floor
• List your MFL Player NFTs
• Monitor marketplace trends
• Track player value movements

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else {
      // NBA Top Shot / Generic floor price
      message = `
📉 *NBA TOP SHOT FLOOR PRICE ALERT!*

🏀 *Collection:* ${alertData.collectionName || 'NBA Top Shot'}

💵 *Current Floor Price:* ${alertData.currentValue}
🎯 *Your Target:* ${alertData.limit}

${alertData.volume24h ? `📊 *24h Volume:* $${alertData.volume24h.toLocaleString()}` : ''}
${alertData.sales24h ? `🔢 *24h Sales:* ${alertData.sales24h}` : ''}

⚡ *Floor price reached your target!*

💡 *Action Ideas:*
• Consider buying at floor
• List your Moments
• Monitor market trends

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    }
  } else if (metric === 'balance') {
    // 💳 BALANCE CHANGE ALERT
    // ✅ CHECK: Is this CryptoKitties?
    if (watcher.templateId === 'cryptokitties-meowcoins') {
      message = `
💳 *CRYPTOKITTIES BALANCE CHANGE ALERT!*

😺 *Wallet:* ${watcher.watcherName || 'MeowCoin Wallet'}

💰 *Current Balance:* ${alertData.currentValue}
🎯 *Threshold:* ${alertData.limit}
📈 *Change:* ${alertData.change || 'N/A'}

⚡ *MeowCoin balance change detected!*

💡 *This could mean:*
• Large deposit/withdrawal
• Trading activity
• Wallet activity

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    } else {
      // Generic balance alert
      message = `
💳 *BALANCE CHANGE ALERT!*

📊 *Wallet:* ${watcher.watcherName || watcherId}

💰 *Current Balance:* ${alertData.currentValue}
🎯 *Threshold:* ${alertData.limit}
📈 *Change:* ${alertData.change || 'N/A'}

⚡ *Balance change detected!*

🔗 Dashboard: http://localhost:5174
🕐 ${timestamp}
    `;
    }
  } else {
    // Generic fallback
    message = `
🚨 *ALERT! Condition Met!*

📊 *Watcher:* ${watcher.watcherName || watcherId}
💰 *Current Value:* ${alertData.currentValue}
🎯 *Your Limit:* ${alertData.limit}
📈 *Change:* ${alertData.change || 'N/A'}

⚡ *Action Required?*
🔗 Check dashboard: http://localhost:5174

🕐 ${timestamp}
    `;
  }
  
  try {
    await bot.sendMessage(watcher.chatId, message, { parse_mode: 'Markdown' });
    console.log(`🚨 [${metric.toUpperCase()}] Alert sent to ${watcher.chatId} for watcher ${watcherId}`);
    
    // ✅ Update lastNotification timestamp to prevent spam
    watcher.lastNotification = Date.now();
    console.log(`⏰ Updated lastNotification for watcher ${watcherId}`);
    
    // ✅ SAVE NOTIFICATION LOG
    saveNotificationLog(watcherId, {
      timestamp: Date.now(),
      type: 'notification',
      message: `🔔 Telegram notification sent: ${metric === 'price' ? 'Price alert triggered' : metric === 'transaction' ? 'Transaction threshold reached' : 'Event detected'}`,
      data: {
        metric,
        currentValue: alertData.currentValue,
        limit: alertData.limit
      }
    });
    
  } catch (error) {
    console.error(`❌ Failed to send alert to ${watcher.chatId}:`, error.message);
  }
}

/**
 * Send error notification
 * @param {string} watcherId
 * @param {Error} error
 */
export async function sendError(watcherId, error) {
  const watcher = watcherRegistry.get(watcherId);
  if (!watcher || !watcher.notifyOnError) return;
  
  // Check if chat ID is set
  if (!watcher.chatId) {
    console.log(`⏳ Watcher ${watcherId}: Cannot send error, waiting for /start`);
    return;
  }
  
  const bot = getBotInstance(watcher.botToken);
  if (!bot) return;
  
  const message = `
⚠️ *WatcherForte Warning*

📊 *Watcher:* ${watcher.watcherName || watcherId}
❌ ${error.message}
🔄 Retrying automatically...

📞 Contact support if this persists
🕐 ${new Date().toLocaleString()}
  `;
  
  try {
    await bot.sendMessage(watcher.chatId, message, { parse_mode: 'Markdown' });
    console.log(`⚠️  Error notification sent to ${watcher.chatId} for watcher ${watcherId}`);
  } catch (err) {
    console.error(`❌ Failed to send error notification:`, err.message);
  }
}

/**
 * ======================
 * BLOCKCHAIN MONITORING
 * ======================
 */

/**
 * Fetch token balance from blockchain
 * @param {string} address - Wallet address
 * @param {string} tokenSymbol - Token symbol (e.g., 'FlowToken')
 * @returns {Promise<number>} Token balance
 */
async function getTokenBalance(address, tokenSymbol = 'FlowToken') {
  try {
    const script = `
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    
    let vaultRef = account.capabilities.borrow<&FlowToken.Vault>(/public/flowTokenBalance)
        ?? panic("Could not borrow FlowToken vault")
    
    return vaultRef.balance
}
    `;
    
    const balance = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)]
    });
    
    return parseFloat(balance) || 0;
  } catch (error) {
    console.error(`❌ Failed to fetch balance for ${address}:`, error.message);
    return 0;
  }
}

/**
 * Fetch FROTH price - Hybrid approach
 * Price: GeckoTerminal API
 * Metadata: Find Labs API
 * @returns {Promise<number>} Price in USD
 */
async function getFrothPrice() {
  try {
    // Get FROTH data (price from GeckoTerminal, metadata from Find Labs)
    console.log('💰 Fetching FROTH data (price from GeckoTerminal, metadata from Find Labs)...');
    const frothData = await FindLabsAPI.getFrothTokenData();
    
    console.log(`🔍 getFrothPrice - Received data:`, {
      hasData: !!frothData,
      price: frothData?.price,
      priceType: typeof frothData?.price,
      source: frothData?.source
    });
    
    if (frothData && typeof frothData.price === 'number') {
      if (frothData.price > 0) {
        console.log(`✅ FROTH price: $${frothData.price.toFixed(6)} USD (from GeckoTerminal)`);
        if (frothData.holders > 0) {
          console.log(`   📊 Metadata: ${frothData.holders} holders, ${frothData.transfers} transfers (from Find Labs)`);
        }
        return frothData.price;
      } else {
        console.warn(`⚠️ FROTH price is 0 or negative: ${frothData.price}`);
        console.warn(`   Data source: ${frothData.source || 'unknown'}`);
        return 0;
      }
    } else {
      console.error(`❌ Invalid FROTH data structure:`, JSON.stringify(frothData, null, 2));
      console.error(`   Type of price: ${typeof frothData?.price}, Value: ${frothData?.price}`);
      return 0;
    }
  } catch (error) {
    console.error('❌ Failed to fetch FROTH price:', error.message);
    console.error('❌ Error stack:', error.stack);
    return 0;
  }
}

/**
 * Fetch transaction volume for FROTH token
 * @returns {Promise<Object>} Transaction volume data
 */
async function getFrothTransactionVolume() {
  try {
    // Primary source: GeckoTerminal API
    const response = await fetch(
      'https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba'
    );
    
    if (response.ok) {
      const data = await response.json();
      const attrs = data.data?.attributes || {};
      
      // Get pool data for more detailed volume info
      const poolsResponse = await fetch(
        'https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba/pools'
      );
      
      let transactionCount24h = 0;
      let buyCount = 0;
      let sellCount = 0;
      
      if (poolsResponse.ok) {
        const poolsData = await poolsResponse.json();
        const pools = poolsData.data || [];
        
        // Sum up transactions from all pools
        pools.forEach(pool => {
          const poolAttrs = pool.attributes || {};
          transactionCount24h += parseInt(poolAttrs.transactions?.h24?.buys || 0);
          transactionCount24h += parseInt(poolAttrs.transactions?.h24?.sells || 0);
          buyCount += parseInt(poolAttrs.transactions?.h24?.buys || 0);
          sellCount += parseInt(poolAttrs.transactions?.h24?.sells || 0);
        });
      }
      
      return {
        volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
        volume6h: parseFloat(attrs.volume_usd?.h6) || 0,
        volume1h: parseFloat(attrs.volume_usd?.h1) || 0,
        transactionCount24h: transactionCount24h || Math.floor(Math.random() * 500) + 100,
        buyCount: buyCount || Math.floor(transactionCount24h * 0.55),
        sellCount: sellCount || Math.floor(transactionCount24h * 0.45),
        priceChangePercent: parseFloat(attrs.price_change_percentage?.h24) || 0,
        timestamp: Date.now() / 1000
      };
    }
    
    // Fallback: Generate realistic mock data
    return generateMockVolumeData();
    
  } catch (error) {
    console.error('❌ Failed to fetch transaction volume:', error.message);
    return generateMockVolumeData();
  }
}

/**
 * Generate mock transaction volume data
 * @returns {Object} Mock volume data
 */
function generateMockVolumeData() {
  const transactionCount = Math.floor(Math.random() * 500) + 100;
  const volumeUSD = transactionCount * (Math.random() * 0.01 + 0.003);
  
  return {
    volume24h: parseFloat(volumeUSD.toFixed(2)),
    volume6h: parseFloat((volumeUSD * 0.25).toFixed(2)),
    volume1h: parseFloat((volumeUSD * 0.04).toFixed(2)),
    transactionCount24h: transactionCount,
    buyCount: Math.floor(transactionCount * 0.55),
    sellCount: Math.floor(transactionCount * 0.45),
    priceChangePercent: (Math.random() * 10 - 5).toFixed(2),
    timestamp: Date.now() / 1000
  };
}

/**
 * Fetch game events for FROTH/KittyPunch
 * @returns {Promise<Object>} Game events data
 */
async function getGameEvents() {
  try {
    // TODO: In production, query Flow blockchain events
    // For now, we'll use mock data based on recent blocks
    
    const latestBlock = await fcl.block({ sealed: true });
    
    // Mock event types for KittyPunch game
    const eventTypes = [
      { type: 'NFT_MINT', name: 'KittyPunch NFT Minted', emoji: '🎨' },
      { type: 'REWARD_CLAIMED', name: 'Reward Claimed', emoji: '🎁' },
      { type: 'GAME_COMPLETED', name: 'Game Round Completed', emoji: '🎮' },
      { type: 'HIGH_SCORE', name: 'New High Score', emoji: '🏆' },
      { type: 'ACHIEVEMENT', name: 'Achievement Unlocked', emoji: '⭐' }
    ];
    
    // Generate 1-3 random events
    const numEvents = Math.floor(Math.random() * 3);
    const events = [];
    
    for (let i = 0; i < numEvents; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const playerId = Math.floor(Math.random() * 10000);
      const amount = Math.floor(Math.random() * 1000) + 50;
      
      let details = '';
      switch(eventType.type) {
        case 'NFT_MINT':
          details = `KittyPunch NFT #${playerId} minted`;
          break;
        case 'REWARD_CLAIMED':
          details = `${amount} FROTH claimed by player #${playerId}`;
          break;
        case 'GAME_COMPLETED':
          details = `Player #${playerId} completed game round`;
          break;
        case 'HIGH_SCORE':
          details = `New record: ${amount * 100} points by player #${playerId}`;
          break;
        case 'ACHIEVEMENT':
          details = `Player #${playerId} unlocked rare achievement`;
          break;
      }
      
      events.push({
        type: eventType.type,
        name: eventType.name,
        emoji: eventType.emoji,
        details: details,
        blockHeight: latestBlock.height - Math.floor(Math.random() * 10),
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        playerId: playerId
      });
    }
    
    return {
      eventsDetected: events.length,
      latestEvent: events[0] || null,
      allEvents: events,
      blockHeight: latestBlock.height,
      timestamp: Date.now() / 1000
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch game events:', error.message);
    return {
      eventsDetected: 0,
      latestEvent: null,
      allEvents: [],
      blockHeight: 0,
      timestamp: Date.now() / 1000
    };
  }
}

/**
 * Get watcher data from blockchain
 * @param {string} watcherId - Watcher ID
 * @returns {Promise<Object|null>} Watcher data
 */
async function getWatcherData(watcherId) {
  try {
    const script = `
import WatcherRegistry from 0x0d2b623d26790e50

access(all) struct FullWatcherData {
    access(all) let watcherData: WatcherRegistry.WatcherData?
    access(all) let priceHistory: [WatcherRegistry.PriceEntry]?
    access(all) let currentPrice: UFix64?
    
    init(
        watcherData: WatcherRegistry.WatcherData?,
        priceHistory: [WatcherRegistry.PriceEntry]?,
        currentPrice: UFix64?
    ) {
        self.watcherData = watcherData
        self.priceHistory = priceHistory
        self.currentPrice = currentPrice
    }
}

access(all) fun main(watcherID: UInt64): FullWatcherData {
    let watcher = WatcherRegistry.getWatcherData(watcherID: watcherID)
    let history = WatcherRegistry.getPriceHistory(watcherID: watcherID)
    
    var currentPrice: UFix64? = nil
    if history != nil && history!.length > 0 {
        currentPrice = history![history!.length - 1].price
    }
    
    return FullWatcherData(
        watcherData: watcher,
        priceHistory: history,
        currentPrice: currentPrice
    )
}
    `;
    
    console.log(`📡 Fetching watcher data for ID ${watcherId}...`);
    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(watcherId, t.UInt64)]
    });
    
    console.log(`✅ Raw watcher data received:`, JSON.stringify(result, null, 2));
    
    if (result && result.watcherData) {
      console.log(`📊 WatcherData fields:`, {
        watcherID: result.watcherData.watcherID,
        targetSerial: result.watcherData.targetSerial,
        priceLimit: result.watcherData.priceLimit,
        priceLimitType: typeof result.watcherData.priceLimit,
        scheduleDelay: result.watcherData.scheduleDelay,
        isActive: result.watcherData.isActive
      });
    } else {
      console.warn(`⚠️ Watcher data is null or missing`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to fetch watcher ${watcherId}:`, error.message);
    console.error(`   Error stack:`, error.stack);
    return null;
  }
}

let lastCheckedBlock = 0;

// Export function untuk dipanggil dari external cron service (jika diperlukan)
export async function monitorBlockchain() {
  try {
    const latestBlock = await fcl.block({ sealed: true });
    
    if (latestBlock.height > lastCheckedBlock) {
      console.log(`🔍 Checking block ${latestBlock.height}...`);
      
      // Check all registered watchers
      for (const [watcherId, watcher] of watcherRegistry) {
        // Only check if user has connected (sent /start)
        if (!watcher.chatId) {
          console.log(`⏳ Watcher ${watcherId}: Waiting for /start command`);
          continue;
        }
        
        // ✅ CHECK 1: Is watcher stopped by user?
        // Note: We can't access localStorage from Node.js, but we can add API endpoint
        // For now, we'll add a 'stopped' flag that can be set via API
        if (watcher.stopped === true) {
          console.log(`⛔ Watcher ${watcherId}: Stopped by user, skipping`);
          continue;
        }
        
        // ✅ CHECK 2: Has enough time passed since last notification?
        const now = Date.now();
        const intervalMs = (watcher.notificationInterval || 60) * 60 * 1000; // Convert minutes to ms
        
        if (watcher.lastNotification) {
          const timeSinceLastNotif = now - watcher.lastNotification;
          
          if (timeSinceLastNotif < intervalMs) {
            const minutesRemaining = Math.ceil((intervalMs - timeSinceLastNotif) / 60000);
            console.log(`⏱️  Watcher ${watcherId}: Next check in ${minutesRemaining} minutes`);
            continue; // Skip this watcher, not yet time
          }
        }
        
        console.log(`✅ Watcher ${watcherId}: Interval passed, checking now...`);
        
        try {
          let statusData = null;
          
          // Fetch data based on metric type
          if (watcher.metric === 'price') {
            // 💰 PRICE TRACKING
            console.log(`💰 Checking price for watcher ${watcherId}...`);
            
            // ✅ CHECK: What type of asset is this?
            let currentPrice = 0;
            const watcherData = await getWatcherData(watcherId);
            
            if (watcher.bountyType === 'dapper-insights') {
              // 🏀 NBA TOP SHOT / DAPPER PRICE
              console.log(`🏀 Fetching NBA Top Shot Moment price for watcher ${watcherId}...`);
              
              if (watcherData && watcherData.watcherData) {
                const momentId = watcherData.watcherData.targetSerial; // Moment ID
                
                // Use Find Labs API to get Moment price
                const nftData = await FindLabsAPI.getNFTOwner(momentId);
                
                if (nftData && nftData.salePrice) {
                  currentPrice = parseFloat(nftData.salePrice);
                  
                  if (nftData._isMockData) {
                    console.log(`⚠️  Using estimated floor price for Moment #${momentId}: $${currentPrice}`);
                    // Store mock data flag for message formatting
                    watcher._usingMockPrice = true;
                  } else {
                    console.log(`✅ Real sale price for Moment #${momentId}: $${currentPrice}`);
                    watcher._usingMockPrice = false;
                  }
                } else {
                  // No price data at all
                  console.log(`⚠️ No price data for Moment #${momentId}`);
                  currentPrice = 0;
                  watcher._usingMockPrice = false;
                }
              }
            } else if (watcher.templateId === 'beezie-collectible' || watcher.bountyType === 'beezie') {
              // 🎨 BEEZIE COLLECTIBLE PRICE (Task 1)
              console.log(`🎨 Fetching Beezie collectible ALT.xyz value for watcher ${watcherId}...`);
              
              if (watcherData && watcherData.watcherData) {
                const assetId = watcherData.watcherData.targetSerial; // Beezie URL or certificate serial
                const gradingCompany = watcher.targetAsset || 'PSA'; // From form selection
                
                // ✅ Check if assetId is a Beezie URL or certificate serial
                let certificateSerial = assetId;
                let altValue = null;
                
                if (assetId.includes('beezie.io/marketplace/collectible/')) {
                  // It's a Beezie URL - need to extract tokenID, fetch metadata, extract serial
                  console.log(`🔗 Detected Beezie URL, extracting tokenID...`);
                  
                  const tokenID = FindLabsAPI.extractTokenIdFromBeezieUrl(assetId);
                  if (tokenID) {
                    console.log(`✅ Extracted tokenID: ${tokenID}`);
                    
                    // Fetch Beezie metadata
                    const metadata = await FindLabsAPI.getBeezieCollectibleMetadata(tokenID);
                    if (metadata) {
                      certificateSerial = FindLabsAPI.extractCertificateSerial(metadata);
                      console.log(`✅ Extracted certificate serial: ${certificateSerial}`);
                      
                      // Update grading company from metadata if available
                      if (metadata.gradingCompany) {
                        gradingCompany = metadata.gradingCompany;
                      }
                    }
                  }
                }
                
                // Fetch ALT.xyz Fair Market Value
                if (certificateSerial) {
                  altValue = await FindLabsAPI.fetchAltFairMarketValue(certificateSerial, gradingCompany);
                  
                  if (altValue && altValue.fairMarketValue) {
                    currentPrice = altValue.fairMarketValue;
                    console.log(`✅ ALT.xyz Fair Market Value for ${certificateSerial}: $${currentPrice}`);
                  } else {
                    console.warn(`⚠️  Failed to fetch ALT.xyz value for ${certificateSerial}`);
                    currentPrice = 0;
                  }
                } else {
                  console.warn(`⚠️  Could not determine certificate serial for watcher ${watcherId}`);
                  currentPrice = 0;
                }
              }
            } else {
              // Generic token price - check template type
              const templateId = watcher.templateId || '';
              const targetAsset = watcherData?.watcherData?.targetSerial || '';
              
              // Check if this is custom-flow-token template
              if (templateId === 'custom-flow-token') {
                // Custom Flow Token - use CoinGecko for price (Find Labs doesn't provide price data)
                console.log(`💰 Fetching custom Flow token price (USD) for watcher ${watcherId}...`);
                console.log(`   Token symbol: ${targetAsset}`);
                
                try {
                  // Try CoinGecko first (best for mainstream tokens like FLOW)
                  console.log(`   Trying CoinGecko...`);
                  const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${targetAsset.toLowerCase()}&vs_currencies=usd&include_24hr_vol=true`;
                  const cgResponse = await fetch(cgUrl, { agent: httpsAgent });
                  
                  if (cgResponse.ok) {
                    const cgData = await cgResponse.json();
                    const tokenData = cgData[targetAsset.toLowerCase()];
                    
                    if (tokenData && tokenData.usd) {
                      currentPrice = parseFloat(tokenData.usd);
                      console.log(`✅ Custom Flow token (${targetAsset}) price from CoinGecko: $${currentPrice.toFixed(6)} USD`);
                      console.log(`   Volume 24h: $${tokenData.usd_24h_vol ? parseFloat(tokenData.usd_24h_vol).toFixed(2) : 'N/A'}`);
                    } else {
                      console.warn(`   CoinGecko: Token ${targetAsset} not found, trying alternative sources...`);
                      currentPrice = 0;
                    }
                  } else {
                    console.warn(`   CoinGecko returned ${cgResponse.status}, trying alternative sources...`);
                    currentPrice = 0;
                  }
                  
                  // If CoinGecko failed, try GeckoTerminal for Flow EVM tokens
                  if (currentPrice === 0) {
                    console.log(`   Trying GeckoTerminal (Flow EVM)...`);
                    // Note: GeckoTerminal requires token address, not symbol
                    // For now, we can't get price without knowing the address
                    console.warn(`   GeckoTerminal requires token contract address, cannot fetch by symbol alone`);
                  }
                  
                  // Final check
                  if (currentPrice === 0 || isNaN(currentPrice)) {
                    console.warn(`⚠️ WARNING: Custom Flow token price not available`);
                    console.warn(`   Token: ${targetAsset}`);
                    console.warn(`   Tried: CoinGecko`);
                    console.warn(`   Note: Token may not be listed on CoinGecko or requires contract address for DEX price`);
                  }
                  
                } catch (priceError) {
                  console.error(`❌ Error fetching custom Flow token price:`, priceError.message);
                  console.error(`   Error stack:`, priceError.stack);
                  currentPrice = 0;
                }
              } else if (targetAsset === 'FROTH' || targetAsset.includes('FROTH')) {
                // FROTH token - use GeckoTerminal (USD price)
                console.log(`💰 Fetching FROTH price for watcher ${watcherId}...`);
                try {
                  currentPrice = await getFrothPrice();
                  console.log(`💰 getFrothPrice() returned: ${currentPrice} (type: ${typeof currentPrice})`);
                  
                  if (currentPrice === 0 || isNaN(currentPrice)) {
                    console.warn(`⚠️ WARNING: FROTH price is $0.00 or NaN`);
                    console.warn(`   This means GeckoTerminal/CoinGecko API failed or returned invalid data`);
                    console.warn(`   Check logs above for detailed API response`);
                  } else {
                    console.log(`✅ FROTH price result: $${currentPrice.toFixed(6)} USD`);
                  }
                } catch (priceError) {
                  console.error(`❌ Error in getFrothPrice() for watcher ${watcherId}:`, priceError.message);
                  console.error(`   Error stack:`, priceError.stack);
                  currentPrice = 0;
                }
              } else {
                // Other generic tokens - try Find Labs API (USD price)
                console.log(`💰 Fetching generic token price (USD) for watcher ${watcherId}...`);
                console.log(`   Token symbol: ${targetAsset}`);
                
                try {
                  const tokenPriceData = await FindLabsAPI.getTokenPrice('flow', targetAsset);
                  currentPrice = parseFloat(tokenPriceData?.price || 0);
                  
                  if (currentPrice > 0 && !isNaN(currentPrice)) {
                    console.log(`✅ Generic token (${targetAsset}) price: $${currentPrice.toFixed(6)} USD`);
                  } else {
                    console.warn(`⚠️ WARNING: Generic token price is $0.00 or invalid`);
                    console.warn(`   Token: ${targetAsset}`);
                    console.warn(`   Price data may not be available for this token`);
                  }
                } catch (priceError) {
                  console.error(`❌ Error fetching generic token price:`, priceError.message);
                  console.error(`   Error stack:`, priceError.stack);
                  currentPrice = 0;
                }
              }
            }
            
            // 🐛 DEBUG: Log blockchain data
            console.log(`🔍 DEBUG - Watcher ${watcherId} blockchain data:`, {
              hasWatcherData: !!watcherData,
              hasWatcherDataInner: !!watcherData?.watcherData,
              watcherDataFull: JSON.stringify(watcherData?.watcherData, null, 2),
              priceLimit: watcherData?.watcherData?.priceLimit,
              priceLimitType: typeof watcherData?.watcherData?.priceLimit,
              targetSerial: watcherData?.watcherData?.targetSerial,
              bountyType: watcher.bountyType,
              currentPrice: currentPrice,
              currentPriceType: typeof currentPrice
            });
            
            if (watcherData && watcherData.watcherData) {
              // UFix64 from Cadence comes as string, need to parse
              const limitRaw = watcherData.watcherData.priceLimit;
              const limit = typeof limitRaw === 'string' ? parseFloat(limitRaw) : parseFloat(limitRaw || 0);
              
              console.log(`🔍 Price check details:`, {
                currentPrice: currentPrice,
                currentPriceType: typeof currentPrice,
                limit: limit,
                limitType: typeof limit,
                limitRaw: limitRaw,
                limitRawType: typeof limitRaw
              });
              
              // Only check condition if we have a valid price
              if (currentPrice === 0) {
                console.warn(`⚠️ Cannot check condition - price is 0`);
                console.warn(`   This means getFrothPrice() failed or returned 0`);
                console.warn(`   Check logs above for GeckoTerminal API errors`);
                statusData = {
                  currentValue: `$0.00 USD (Price unavailable)`,
                  limit: limit > 0 ? `$${limit.toFixed(2)} USD` : `$0.00 USD (Limit not set)`,
                  change24h: 'N/A',
                  conditionMet: false // Don't trigger alert if price is unavailable
                };
              } else if (limit === 0 || isNaN(limit)) {
                console.warn(`⚠️ Price limit is 0 or invalid: ${limitRaw}`);
                console.warn(`   This means watcher may not have priceLimit set correctly in blockchain`);
                statusData = {
                  currentValue: `$${currentPrice.toFixed(4)} USD`,
                  limit: `$0.00 USD (Limit not set)`,
                  change24h: 'N/A',
                  conditionMet: false
                };
              } else {
                const conditionMet = currentPrice >= limit;
                
                console.log(`💰 Price check - Current: $${currentPrice.toFixed(6)}, Limit: $${limit.toFixed(6)}, Met: ${conditionMet}`);
                
                statusData = {
                  currentValue: `$${currentPrice.toFixed(4)} USD`,
                  limit: `$${limit.toFixed(2)} USD`,
                  change24h: 'N/A',
                  conditionMet
                };
                
                // Send alert if condition met AND price is valid
                if (conditionMet) {
                  await sendAlert(watcherId, {
                    currentValue: `$${currentPrice.toFixed(4)} USD`,
                    limit: `$${limit.toFixed(2)} USD`,
                    change: 'Price above limit!'
                  });
                }
              }
            } else {
              console.warn(`⚠️ No watcher data found for watcher ${watcherId}`);
            }
          } 
          else if (watcher.metric === 'transaction') {
            // 📊 TRANSACTION VOLUME
            console.log(`📊 Checking transaction volume for watcher ${watcherId}...`);
            
            // Fetch real transaction volume data
            const volumeData = await getFrothTransactionVolume();
            const watcherData = await getWatcherData(watcherId);
            
            // Use priceLimit as volume threshold (interpret as transaction count threshold)
            const threshold = watcherData?.watcherData?.priceLimit || 200;
            const conditionMet = volumeData.transactionCount24h > threshold;
            
            // Calculate trend
            let trend = 'Normal';
            if (volumeData.transactionCount24h > threshold * 1.5) trend = 'Very High';
            else if (volumeData.transactionCount24h > threshold) trend = 'High Activity';
            else if (volumeData.transactionCount24h < threshold * 0.5) trend = 'Low Activity';
            
            statusData = {
              currentValue: `${volumeData.transactionCount24h} transactions`,
              transactionCount: volumeData.transactionCount24h,
              totalVolume: `$${volumeData.volume24h.toFixed(2)}`,
              buyCount: volumeData.buyCount,
              sellCount: volumeData.sellCount,
              trend: trend,
              limit: `${Math.floor(threshold)} transactions`,
              priceChange: `${volumeData.priceChangePercent}%`,
              conditionMet
            };
            
            // Send alert if high volume detected
            if (conditionMet) {
              const percentChange = Math.floor(((volumeData.transactionCount24h - threshold) / threshold) * 100);
              await sendAlert(watcherId, {
                currentValue: volumeData.transactionCount24h,
                transactionCount: volumeData.transactionCount24h,
                limit: Math.floor(threshold),
                activityLevel: trend,
                change: `+${percentChange}%`,
                volumeUSD: `$${volumeData.volume24h.toFixed(2)}`,
                buyCount: volumeData.buyCount,
                sellCount: volumeData.sellCount
              });
            }
          }
          else if (watcher.metric === 'event') {
            // 🎮 GAME EVENTS
            console.log(`🎮 Checking game events for watcher ${watcherId}...`);
            
            // Fetch real game events
            const eventsData = await getGameEvents();
            const hasNewEvents = eventsData.eventsDetected > 0;
            const latestEvent = eventsData.latestEvent;
            
            statusData = {
              currentValue: hasNewEvents ? `${eventsData.eventsDetected} new event(s)` : 'Monitoring game events',
              eventsDetected: eventsData.eventsDetected.toString(),
              latestEvent: latestEvent ? latestEvent.details : 'No new events',
              lastEventTime: latestEvent ? new Date(latestEvent.timestamp).toLocaleString() : 'N/A',
              blockHeight: eventsData.blockHeight,
              allEvents: eventsData.allEvents,
              conditionMet: hasNewEvents
            };
            
            // Send alert if new event detected
            if (hasNewEvents && latestEvent) {
              await sendAlert(watcherId, {
                currentValue: latestEvent.details,
                eventType: latestEvent.name,
                eventDetails: latestEvent.details,
                eventEmoji: latestEvent.emoji,
                eventTime: new Date(latestEvent.timestamp).toLocaleString(),
                blockHeight: latestEvent.blockHeight,
                playerId: latestEvent.playerId,
                totalEvents: eventsData.eventsDetected,
                actionRequired: 'A new event was detected in the game!'
              });
            }
          }
          // 🏀 AISPORTS METRICS
          else if (watcher.metric === 'juice-price') {
            // 💰 $JUICE PRICE TRACKING
            console.log(`💰 Checking $JUICE price for watcher ${watcherId}...`);
            
            try {
              // ✅ REAL DATA from Find Labs API
              console.log(`   Calling FindLabsAPI.getJuiceTokenData()...`);
              const juiceData = await FindLabsAPI.getJuiceTokenData();
              
              console.log(`   Received juiceData:`, {
                hasData: !!juiceData,
                price: juiceData?.price,
                priceType: typeof juiceData?.price,
                source: juiceData?.source
              });
              
              const currentPrice = parseFloat(juiceData?.price || 0);
              const watcherData = await getWatcherData(watcherId);
              
              console.log(`💰 $JUICE Price result: $${currentPrice} (from ${juiceData?.source || 'unknown'})`);
              
              if (watcherData && watcherData.watcherData) {
                const limitRaw = watcherData.watcherData.priceLimit;
                const limit = typeof limitRaw === 'string' ? parseFloat(limitRaw) : parseFloat(limitRaw || 0);
                
                console.log(`🔍 JUICE price check details:`, {
                  currentPrice,
                  currentPriceType: typeof currentPrice,
                  limit,
                  limitType: typeof limit,
                  limitRaw,
                  isNaNPrice: isNaN(currentPrice),
                  isNaNLimit: isNaN(limit)
                });
                
                // Only check condition if we have valid price and limit
                if (currentPrice === 0 || isNaN(currentPrice)) {
                  console.warn(`⚠️ Cannot check JUICE condition - price is 0 or invalid`);
                  statusData = {
                    currentValue: `$0.00 USD (Price unavailable)`,
                    limit: limit > 0 ? `$${limit.toFixed(2)} USD` : `$0.00 USD (Limit not set)`,
                    change24h: 'N/A',
                    conditionMet: false
                  };
                } else if (limit === 0 || isNaN(limit)) {
                  console.warn(`⚠️ Cannot check JUICE condition - limit is 0 or invalid`);
                  statusData = {
                    currentValue: `$${currentPrice.toFixed(4)} USD`,
                    limit: `$0.00 USD (Limit not set)`,
                    change24h: `${juiceData.change24h > 0 ? '+' : ''}${juiceData.change24h || 0}%`,
                    conditionMet: false
                  };
                } else {
                  const conditionMet = currentPrice >= limit;
                  
                  console.log(`💰 $JUICE Price check - Current: $${currentPrice.toFixed(6)}, Limit: $${limit.toFixed(6)}, Met: ${conditionMet}`);
                  console.log(`   📊 Volume 24h: $${juiceData.volume24h || 0}, Change: ${juiceData.change24h || 0}%`);
                  
                  statusData = {
                    currentValue: `$${currentPrice.toFixed(4)} USD`,
                    limit: `$${limit.toFixed(4)} USD`,
                    change24h: `${juiceData.change24h > 0 ? '+' : ''}${juiceData.change24h || 0}%`,
                    conditionMet
                  };
                  
                  if (conditionMet) {
                    await sendAlert(watcherId, {
                      currentValue: `$${currentPrice.toFixed(4)} USD`,
                      limit: `$${limit.toFixed(4)} USD`,
                      change24h: `${juiceData.change24h > 0 ? '+' : ''}${juiceData.change24h || 0}%`,
                      volume24h: juiceData.volume24h || 0,
                      message: '🏀 $JUICE price alert!'
                    });
                    watcher.lastNotification = Date.now();
                  }
                }
              } else {
                console.warn(`⚠️ No watcher data found for watcher ${watcherId}`);
              }
            } catch (error) {
              console.error(`❌ Error fetching $JUICE price:`, error.message);
              console.error(`   Error stack:`, error.stack);
              console.error(`   Error type: ${error.constructor.name}`);
            }
          }
          else if (watcher.metric === 'juice-whale') {
            // 🐋 WHALE TRACKING
            console.log(`🐋 Checking whale activity for watcher ${watcherId}...`);
            
            try {
              const watcherData = await getWatcherData(watcherId);
              
              if (watcherData && watcherData.watcherData) {
                const threshold = parseFloat(watcherData.watcherData.priceLimit);
                
                // ✅ REAL DATA from Find Labs API - Get recent $JUICE transfers
                const recentTransfers = await FindLabsAPI.getJuiceTransfers(20);
                
                // Check for whale transfers exceeding threshold
                const whaleTransfers = recentTransfers.filter(t => t.amount >= threshold);
                const whaleDetected = whaleTransfers.length > 0;
                
                if (whaleDetected) {
                  const largestTransfer = whaleTransfers.reduce((max, t) => t.amount > max.amount ? t : max);
                  const transferAmount = Math.floor(largestTransfer.amount);
                  
                  console.log(`🐋 Whale detected! Transfer: ${transferAmount} $JUICE (threshold: ${threshold})`);
                  console.log(`   From: ${largestTransfer.from.substring(0, 10)}...`);
                  console.log(`   To: ${largestTransfer.to.substring(0, 10)}...`);
                  
                  statusData = {
                    currentValue: `${transferAmount.toLocaleString()} $JUICE transferred`,
                    limit: `${Math.floor(threshold).toLocaleString()} $JUICE minimum`,
                    conditionMet: true
                  };
                  
                  await sendAlert(watcherId, {
                    currentValue: `${transferAmount.toLocaleString()} $JUICE`,
                    from: largestTransfer.from,
                    to: largestTransfer.to,
                    limit: `${Math.floor(threshold).toLocaleString()} $JUICE threshold`,
                    message: '🐋 Whale alert! Large $JUICE transfer detected!'
                  });
                  watcher.lastNotification = Date.now();
                } else {
                  console.log(`🐋 No whale activity above ${threshold} $JUICE threshold`);
                  statusData = {
                    currentValue: 'No whale activity detected',
                    limit: `${Math.floor(threshold).toLocaleString()} $JUICE minimum`,
                    conditionMet: false
                  };
                }
              }
            } catch (error) {
              console.error(`❌ Error checking whale activity:`, error.message);
            }
          }
          else if (watcher.metric === 'player-stats') {
            // 🏀 PLAYER PERFORMANCE (via Find Labs API)
            console.log(`🏀 Checking player stats for watcher ${watcherId}...`);
            const watcherData = await getWatcherData(watcherId);
            
            if (watcherData && watcherData.watcherData) {
              const threshold = parseInt(watcherData.watcherData.priceLimit);
              
              try {
                // ✅ Get player stats from Find Labs API (NFT metadata)
                const players = await FindLabsAPI.getPlayerStats();
                
                if (players && players.length > 0) {
                  // Check if any player exceeded threshold
                  const topPerformer = players.find(p => p.stats.points >= threshold);
                  
                  if (topPerformer) {
                    console.log(`🏀 Player alert! ${topPerformer.playerName}: ${topPerformer.stats.points} pts (threshold: ${threshold})`);
                    
                    statusData = {
                      currentValue: `${topPerformer.playerName}: ${topPerformer.stats.points} pts`,
                      limit: `${threshold}+ points threshold`,
                      conditionMet: true
                    };
                    
                    await sendAlert(watcherId, {
                      currentValue: `${topPerformer.playerName} scored ${topPerformer.stats.points} points!`,
                      limit: `${threshold}+ points threshold`,
                      message: `🏀 Player performance alert!\n\n📊 Stats:\n   Points: ${topPerformer.stats.points}\n   Assists: ${topPerformer.stats.assists}\n   Rebounds: ${topPerformer.stats.rebounds}\n   Efficiency: ${topPerformer.stats.efficiency}%`
                    });
                    watcher.lastNotification = Date.now();
                  } else {
                    // No player exceeded threshold
                    const bestPlayer = players[0];
                    console.log(`🏀 No player alert. Best: ${bestPlayer.playerName} (${bestPlayer.stats.points} pts)`);
                    
                    statusData = {
                      currentValue: `${bestPlayer.playerName}: ${bestPlayer.stats.points} pts`,
                      limit: `${threshold}+ points threshold`,
                      conditionMet: false
                    };
                  }
                }
              } catch (error) {
                console.error(`❌ Error checking player stats:`, error.message);
              }
            }
          }
          else if (watcher.metric === 'vault-activity') {
            // 🏆 FAST BREAK VAULTS (via Find Labs API)
            console.log(`🏆 Checking vault activity for watcher ${watcherId}...`);
            const watcherData = await getWatcherData(watcherId);
            
            if (watcherData && watcherData.watcherData) {
              const threshold = parseFloat(watcherData.watcherData.priceLimit);
              
              try {
                // ✅ Get vault activity from Find Labs API
                const vaults = await FindLabsAPI.getVaultActivity(5);
                
                if (vaults && vaults.length > 0) {
                  // Check if any vault meets threshold
                  const bigVault = vaults.find(v => v.totalDeposits >= threshold);
                  
                  if (bigVault) {
                    console.log(`🏆 Vault alert! ${bigVault.vaultName}: ${bigVault.totalDeposits} $JUICE (threshold: ${threshold})`);
                    
                    statusData = {
                      currentValue: `${bigVault.vaultName}: ${Math.floor(bigVault.totalDeposits)} $JUICE`,
                      limit: `${Math.floor(threshold)} $JUICE minimum pool`,
                      conditionMet: true
                    };
                    
                    await sendAlert(watcherId, {
                      currentValue: `${bigVault.vaultName}\nDeposits: ${Math.floor(bigVault.totalDeposits)} $JUICE`,
                      limit: `${Math.floor(threshold)} $JUICE threshold`,
                      message: `🏆 Fast Break Vault activity!\n\n💰 Vault Details:\n   Total Deposits: ${Math.floor(bigVault.totalDeposits)} $JUICE\n   Rewards: ${Math.floor(bigVault.rewards)} $JUICE\n   APY: ${bigVault.apy}%\n   Participants: ${bigVault.participants}`
                    });
                    watcher.lastNotification = Date.now();
                  } else {
                    // No vault exceeds threshold
                    const topVault = vaults[0];
                    console.log(`🏆 No vault alert. Top: ${topVault.vaultName} (${Math.floor(topVault.totalDeposits)} $JUICE)`);
                    
                    statusData = {
                      currentValue: `${topVault.vaultName}: ${Math.floor(topVault.totalDeposits)} $JUICE`,
                      limit: `${Math.floor(threshold)} $JUICE minimum pool`,
                      conditionMet: false
                    };
                  }
                }
              } catch (error) {
                console.error(`❌ Error checking vault activity:`, error.message);
              }
            }
          }
          else if (watcher.metric === 'nft-marketplace') {
            // 🎴 NFT TRADING
            console.log(`🎴 Checking NFT marketplace for watcher ${watcherId}...`);
            
            try {
              const watcherData = await getWatcherData(watcherId);
              
              if (watcherData && watcherData.watcherData) {
                const threshold = parseFloat(watcherData.watcherData.priceLimit);
                
                // ✅ REAL DATA from Find Labs API - Get recent aiSports NFT transfers
                const recentSales = await FindLabsAPI.getAiSportsNFTActivity(15);
                
                // Filter for high-value sales above threshold
                const highValueSales = recentSales.filter(sale => sale.price >= threshold);
                const saleDetected = highValueSales.length > 0;
                
                if (saleDetected) {
                  const topSale = highValueSales.reduce((max, s) => s.price > max.price ? s : max);
                  const salePrice = Math.floor(topSale.price);
                  
                  console.log(`🎴 High-value NFT sale detected! ${topSale.nftName} - ${salePrice} $JUICE`);
                  console.log(`   From: ${topSale.from.substring(0, 10)}...`);
                  console.log(`   To: ${topSale.to.substring(0, 10)}...`);
                  
                  statusData = {
                    currentValue: `${topSale.nftName} sold for ${salePrice.toLocaleString()} $JUICE`,
                    limit: `${Math.floor(threshold).toLocaleString()} $JUICE minimum`,
                    conditionMet: true
                  };
                  
                  await sendAlert(watcherId, {
                    currentValue: `${topSale.nftName}`,
                    price: `${salePrice.toLocaleString()} $JUICE`,
                    from: topSale.from,
                    to: topSale.to,
                    limit: `${Math.floor(threshold).toLocaleString()} $JUICE threshold`,
                    message: '🎴 aiSports NFT sale alert!'
                  });
                  watcher.lastNotification = Date.now();
                } else {
                  console.log(`🎴 No high-value sales above ${threshold} $JUICE threshold`);
                  statusData = {
                    currentValue: 'No high-value NFT sales',
                    limit: `${Math.floor(threshold).toLocaleString()} $JUICE minimum`,
                    conditionMet: false
                  };
                }
              }
            } catch (error) {
              console.error(`❌ Error checking NFT marketplace:`, error.message);
            }
          }
          // 🏀 NBA TOP SHOT / DAPPER METRICS
          else if (watcher.metric === 'ownership') {
            // 👤 NFT OWNERSHIP CHANGE (Dapper)
            console.log(`👤 Checking NFT ownership for watcher ${watcherId}...`);
            
            try {
              const watcherData = await getWatcherData(watcherId);
              
              if (watcherData && watcherData.watcherData) {
                const targetSerial = watcherData.watcherData.targetSerial; // Moment ID
                // Detect brand (NBA vs NFL) for correct nft_type and labels
                const isNBA = watcher.templateId === 'dapper-nba' || (watcher.eventName && watcher.eventName.startsWith('TopShot.'));
                const isNFL = watcher.templateId === 'dapper-nfl' || (watcher.eventName && watcher.eventName.startsWith('AllDay.'));
                const nftType = isNFL 
                  ? 'A.e4cf4bdc1751c65d.AllDay'
                  : 'A.0b2a3299cc857e29.TopShot';
                const brandLabel = isNFL ? 'NFL ALL DAY' : 'NBA Top Shot';

                // ✅ Use Find Labs API to check ownership changes
                const nftData = await FindLabsAPI.getNFTOwner(targetSerial, nftType);
                
                if (nftData && nftData.ownerChanged) {
                  console.log(`👤 Ownership changed! Moment #${targetSerial}`);
                  console.log(`   From: ${nftData.previousOwner}`);
                  console.log(`   To: ${nftData.newOwner}`);
                  
                  statusData = {
                    currentValue: `Moment #${targetSerial} transferred`,
                    limit: 'Ownership change detected',
                    conditionMet: true
                  };
                  
                  await sendAlert(watcherId, {
                    currentValue: `${brandLabel} Moment #${targetSerial}`,
                    previousOwner: nftData.previousOwner,
                    newOwner: nftData.newOwner,
                    momentName: nftData.momentName || 'Moment',
                    salePrice: nftData.salePrice,
                    message: `👤 ${brandLabel} ownership transfer!`
                  });
                  watcher.lastNotification = Date.now();
                } else {
                  console.log(`👤 No ownership changes for Moment #${targetSerial}`);
                  statusData = {
                    currentValue: 'No ownership changes',
                    limit: 'Monitoring...',
                    conditionMet: false
                  };
                }
              }
            } catch (error) {
              console.error(`❌ Error checking NFT ownership:`, error.message);
            }
          }
          else if (watcher.metric === 'nft-floor') {
            // 📉 NFT FLOOR PRICE (Dapper)
            console.log(`📉 Checking floor price for watcher ${watcherId}...`);
            
            try {
              const watcherData = await getWatcherData(watcherId);
              
              if (watcherData && watcherData.watcherData) {
                const collectionId = watcherData.watcherData.targetSerial;
                const threshold = parseFloat(watcherData.watcherData.priceLimit);
                
                // ✅ Use Find Labs API
                const floorData = await FindLabsAPI.getNFTFloorPrice(collectionId);
                
                if (floorData) {
                  const currentFloor = parseFloat(floorData.floorPrice);
                  const conditionMet = currentFloor >= threshold;
                  
                  console.log(`📉 Floor: $${currentFloor}, Target: $${threshold}`);
                  
                  statusData = {
                    currentValue: `$${currentFloor.toFixed(2)}`,
                    limit: `$${threshold.toFixed(2)}`,
                    conditionMet
                  };
                  
                  if (conditionMet) {
                    await sendAlert(watcherId, {
                      currentValue: `$${currentFloor.toFixed(2)}`,
                      collectionName: floorData.collectionName,
                      limit: `$${threshold.toFixed(2)}`,
                      volume24h: floorData.volume24h,
                      message: '📉 Floor price alert!'
                    });
                    watcher.lastNotification = Date.now();
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Error checking floor price:`, error.message);
            }
          }
          else {
            // Other metrics not implemented
            console.log(`⏭️  Metric '${watcher.metric}' not implemented for watcher ${watcherId}`);
            continue;
          }
          
          // Send status update if we have data
          if (statusData) {
            await sendStatusUpdate(watcherId, statusData);
          }
          
        } catch (error) {
          console.error(`❌ Error checking watcher ${watcherId}:`, error.message);
          await sendError(watcherId, error);
        }
      }
      
      lastCheckedBlock = latestBlock.height;
    }
    
  } catch (error) {
    console.error('❌ Error monitoring blockchain:', error);
  }
}

// Start monitoring
// Monitoring akan jalan terus dengan setInterval
// Untuk deployment ke Railway/Render/Fly.io atau local dengan PM2
setInterval(monitorBlockchain, CHECK_INTERVAL * 1000);
console.log(`🔄 Started monitoring interval: every ${CHECK_INTERVAL} seconds`);

/**
 * ======================
 * API ENDPOINTS (for frontend)
 * ======================
 */

/**
 * Test bot connection
 * @param {string} botToken
 * @returns {Promise<Object>}
 */
export async function testBotConnection(botToken) {
  try {
    const bot = new TelegramBot(botToken, { polling: false });
    const botInfo = await bot.getMe();
    
    return {
      success: true,
      username: botInfo.username,
      name: botInfo.first_name,
      id: botInfo.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send test message to verify chat ID
 * @param {string} botToken
 * @param {string} chatId
 * @returns {Promise<boolean>}
 */
export async function sendTestMessage(botToken, chatId) {
  try {
    const bot = new TelegramBot(botToken, { polling: false });
    
    const testMessage = `
🧪 *WatcherForte Test*

✅ Connection successful!
Your bot is ready to send notifications.

🕐 ${new Date().toLocaleString()}
    `;
    
    await bot.sendMessage(chatId, testMessage, { parse_mode: 'Markdown' });
    return true;
  } catch (error) {
    console.error('Test message failed:', error);
    return false;
  }
}

/**
 * ======================
 * CLEANUP
 * ======================
 */

// Daily cleanup of inactive bots
cron.schedule('0 0 * * *', () => {
  console.log('🧹 Running daily cleanup...');
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  for (const [botToken, botData] of activeBots) {
    if (botData.watchers.length === 0 && (now - botData.createdAt) > oneDayMs) {
      botData.bot.stopPolling();
      activeBots.delete(botToken);
      console.log(`🗑️  Removed inactive bot: ${botToken.substring(0, 10)}...`);
    }
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  for (const [_, botData] of activeBots) {
    botData.bot.stopPolling();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  for (const [_, botData] of activeBots) {
    botData.bot.stopPolling();
  }
  process.exit(0);
});

console.log('✅ Multi-Bot service started!');
console.log('📡 Listening for watcher registrations...');
console.log('🔄 Monitoring blockchain...');
console.log(`\n💡 Active bots: ${activeBots.size}`);
console.log(`📊 Registered watchers: ${watcherRegistry.size}`);

export default {
  registerWatcher,
  unregisterWatcher,
  stopWatcher,
  resumeWatcher,
  sendStatusUpdate,
  sendAlert,
  sendError,
  testBotConnection,
  sendTestMessage
};

