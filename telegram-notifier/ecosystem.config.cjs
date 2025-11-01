/**
 * PM2 Ecosystem Config
 * Untuk menjalankan telegram-notifier sebagai background service
 * 
 * Install PM2: npm install -g pm2
 * Start: pm2 start ecosystem.config.cjs
 * Stop: pm2 stop telegram-notifier
 * Restart: pm2 restart telegram-notifier
 * Logs: pm2 logs telegram-notifier
 * Status: pm2 status
 */

module.exports = {
  apps: [{
    name: 'telegram-notifier',
    script: 'index.js',
    cwd: './telegram-notifier',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      API_PORT: 3001
    },
    error_file: './logs/telegram-notifier-error.log',
    out_file: './logs/telegram-notifier-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

