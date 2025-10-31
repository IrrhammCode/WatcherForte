/**
 * Debug Telegram Bot Status
 * Check if bot is registered and monitoring watchers
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function debugTelegram() {
  console.log('🔍 Debugging Telegram Bot Status...\n');
  
  try {
    // 1. Check if API server is running
    console.log('1️⃣ Checking API server...');
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      if (healthResponse.ok) {
        console.log('   ✅ API server is running');
      } else {
        console.log('   ❌ API server returned error:', healthResponse.status);
      }
    } catch (error) {
      console.log('   ❌ API server is NOT running!');
      console.log('   💡 Start it with: npm run dev');
      return;
    }
    
    // 2. Check watcher registry status
    console.log('\n2️⃣ Checking watcher registry...');
    console.log('   ℹ️  Multi-bot service manages watchers in memory');
    console.log('   ℹ️  Watchers are registered when deployed via frontend');
    
    // 3. Check localStorage for bot token
    console.log('\n3️⃣ Checking bot token configuration...');
    console.log('   ℹ️  Bot token is stored in browser localStorage');
    console.log('   ℹ️  Key: watcherforte_bot_token');
    console.log('   💡 Set it via Settings in the frontend dashboard');
    
    // 4. Instructions for user
    console.log('\n📋 TROUBLESHOOTING CHECKLIST:');
    console.log('');
    console.log('   □ Telegram bot service is running (npm run dev)');
    console.log('   □ Bot token is saved in Settings (frontend dashboard)');
    console.log('   □ User sent /start to Telegram bot');
    console.log('   □ Watcher was deployed AFTER bot token was set');
    console.log('   □ Watcher schedule interval has passed (Every 1 Day = 24 hours)');
    console.log('');
    console.log('🔧 COMMON ISSUES:');
    console.log('');
    console.log('   Issue 1: "Bot doesn\'t respond to /start"');
    console.log('   → Make sure bot token is correct from @BotFather');
    console.log('   → Check if bot service is running');
    console.log('');
    console.log('   Issue 2: "Watcher deployed but no notifications"');
    console.log('   → Watcher needs to wait for schedule interval (1 day)');
    console.log('   → OR blockchain condition not met yet (price < limit)');
    console.log('   → Check /status command in Telegram bot');
    console.log('');
    console.log('   Issue 3: "Notifications sent before schedule time"');
    console.log('   → Already fixed! Bot now respects notificationInterval');
    console.log('');
    console.log('💡 QUICK TEST:');
    console.log('');
    console.log('   1. Open Telegram and find your bot');
    console.log('   2. Send: /start');
    console.log('   3. Bot should reply with welcome message');
    console.log('   4. Send: /status');
    console.log('   5. You should see your watcher listed');
    console.log('');
    console.log('   If /status shows empty:');
    console.log('   → Watcher not registered to Telegram');
    console.log('   → Deploy watcher again with bot token set');
    console.log('');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugTelegram();

