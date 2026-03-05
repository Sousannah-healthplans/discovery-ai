# Environment Variable Setup

The frontend now uses a centralized configuration system that reads the backend URL from environment variables.

## Local Development

1. Create a `.env` file in the `discovery-ai` directory:
   ```
   REACT_APP_DISCOVERY_BACKEND=http://localhost:5000
   ```

2. Restart your development server:
   ```bash
   npm start
   ```

## Production (Railway)

1. Go to your Railway project dashboard
2. Navigate to **Variables** tab
3. Add a new environment variable:
   - **Name**: `REACT_APP_DISCOVERY_BACKEND`
   - **Value**: Your Railway backend URL (e.g., `https://web-production-c309a.up.railway.app`)

4. Redeploy your frontend service

## Notes

- The `.env` file is **not** gitignored (as per your requirements), so it will be committed to the repository
- For local development, the `.env` file will override the default Railway URL
- For production, Railway environment variables will override the `.env` file at build time
- All frontend components now use the centralized `BACKEND_URL` from `src/lib/config.js`

