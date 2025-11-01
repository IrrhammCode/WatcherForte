# Setup Telegram Notifier sebagai Background Service

## Cara 1: Menggunakan PM2 (Recommended)

### Install PM2
```bash
npm install -g pm2
```

### Start Service
```bash
cd telegram-notifier
pm2 start ecosystem.config.cjs
```

### PM2 Commands
```bash
# Lihat status
pm2 status

# Lihat logs
pm2 logs telegram-notifier

# Stop service
pm2 stop telegram-notifier

# Restart service
pm2 restart telegram-notifier

# Delete dari PM2
pm2 delete telegram-notifier

# Auto-start saat boot (Windows)
pm2 startup
pm2 save
```

### Auto-start saat Windows Boot
```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

## Cara 2: Menggunakan Windows Task Scheduler

1. Buka Task Scheduler
2. Create Basic Task
3. Name: "WatcherForte Telegram Notifier"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `node`
7. Arguments: `C:\Users\Ayden\WatcherForte\WatcherForte\telegram-notifier\index.js`
8. Start in: `C:\Users\Ayden\WatcherForte\WatcherForte\telegram-notifier`

## Cara 3: Deploy ke Cloud (Paling Reliable)

### Railway (Recommended)
1. Buat akun di railway.app
2. New Project → Deploy from GitHub
3. Select repo: WatcherForte
4. Root Directory: `telegram-notifier`
5. Start Command: `npm start`
6. Add Environment Variables:
   - `FLOW_ACCESS_API`
   - `CHECK_INTERVAL_SECONDS`
   - `FLOW_NETWORK`
7. Deploy otomatis jalan terus!

### Render
1. New → Web Service
2. Connect GitHub
3. Root Directory: `telegram-notifier`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Free tier: Sleep setelah 15 menit idle (tapi jalan terus kalau ada traffic)

### Fly.io
1. Install flyctl
2. `fly launch` di folder telegram-notifier
3. Auto jalan terus dengan free tier $5/month

## Troubleshooting

### PM2 tidak auto-restart
```bash
# Cek log
pm2 logs telegram-notifier --lines 50

# Cek apakah ada error
pm2 monit
```

### Service mati setelah restart
```bash
# Setup startup script
pm2 startup
pm2 save
```

