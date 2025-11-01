# Environment Variables Configuration

## Setup Environment Variables

Gunakan file `.env` untuk mengatur environment variables di development lokal.

## Frontend Environment Variables

File: `frontend/.env`

### Required Variables
```bash
VITE_FINDLABS_USERNAME=your_username_here
VITE_FINDLABS_PASSWORD=your_password_here
```

### Optional Variables
```bash
# JWT Token Expiry (default: 2h)
VITE_JWT_EXPIRY=2h

# Use Mock Data for Development (default: false)
VITE_USE_MOCK_DATA=false
```

### Setup Instructions

1. Copy example file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit `.env` file dan isi dengan credentials Anda:
   ```bash
   VITE_FINDLABS_USERNAME=your_actual_username
   VITE_FINDLABS_PASSWORD=your_actual_password
   ```

3. Restart development server:
   ```bash
   npm run dev
   ```

## Telegram Notifier Environment Variables

File: `telegram-notifier/.env`

### Required Variables
```bash
FINDLABS_USERNAME=your_username_here
FINDLABS_PASSWORD=your_password_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### Optional Variables
```bash
# JWT Token Expiry (default: 2h)
JWT_EXPIRY=2h

# Flow Network (options: testnet, mainnet, emulator)
FLOW_NETWORK=testnet
```

### Setup Instructions

1. Copy example file:
   ```bash
   cd telegram-notifier
   cp .env.example .env
   ```

2. Edit `.env` file dan isi dengan credentials Anda

3. Restart service:
   ```bash
   npm start
   # atau dengan PM2:
   npm run pm2:restart
   ```

## Deployment to Netlify (Frontend)

Untuk deployment ke Netlify, tambahkan environment variables di Netlify Dashboard:

1. Go to **Site settings** > **Environment variables**
2. Add each variable (semua harus diawali `VITE_`):
   - `VITE_FINDLABS_USERNAME`
   - `VITE_FINDLABS_PASSWORD`
   - `VITE_JWT_EXPIRY` (optional)
   - `VITE_USE_MOCK_DATA` (optional)
3. Click **Save**
4. Trigger new deployment

## Deployment to Railway/Render/Fly.io (Telegram Notifier)

Untuk deployment ke Railway/Render/Fly.io, tambahkan environment variables di platform dashboard:

1. Go to your project settings
2. Find **Environment Variables** atau **Config Vars** section
3. Add each variable:
   - `FINDLABS_USERNAME`
   - `FINDLABS_PASSWORD`
   - `TELEGRAM_BOT_TOKEN`
   - `JWT_EXPIRY` (optional)
   - `FLOW_NETWORK` (optional)
4. Save and redeploy

## Important Notes

- **Frontend**: Variables harus diawali `VITE_` untuk di-expose ke browser
- **Telegram Notifier**: Variables tidak perlu `VITE_` prefix
- Jangan commit file `.env` ke git (sudah ada di `.gitignore`)
- Selalu gunakan `.env.example` sebagai template
- Setelah mengubah `.env`, restart service/development server

