# Environment Variables for Vercel Deployment

## Required Environment Variables

Tambahkan environment variables berikut di Vercel Dashboard (Settings > Environment Variables):

### Find Labs API Credentials
```
VITE_FINDLABS_USERNAME=your_username_here
VITE_FINDLABS_PASSWORD=your_password_here
```

### Optional
```
VITE_JWT_EXPIRY=2h
VITE_USE_MOCK_DATA=false
```

## How to Add in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add each variable:
   - Key: `VITE_FINDLABS_USERNAME`
   - Value: (your Find Labs username)
   - Environments: Production, Preview, Development (select all)
5. Repeat for `VITE_FINDLABS_PASSWORD`
6. Click **Save**
7. Redeploy your application

## Note

- Variables prefixed with `VITE_` are exposed to the browser
- Make sure to set these for **Production**, **Preview**, and **Development** environments
- After adding variables, you need to **Redeploy** for changes to take effect

