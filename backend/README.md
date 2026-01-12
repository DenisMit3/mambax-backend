# MambaX Backend API

Backend API for MambaX Dating Platform built with FastAPI.

## CORS Configuration

The API uses secure CORS with dynamic origin validation to support:
- **Vercel deployments**: All `*.vercel.app` subdomains (including preview URLs)
- **Telegram Mini App**: `web.telegram.org`
- **Local development**: `localhost` and `127.0.0.1`
- **Custom origins**: Via `ALLOWED_ORIGINS` environment variable

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of additional allowed origins | `https://my-app.com,https://staging.my-app.com` |
| `ENVIRONMENT` | Set to `development` or `production` | `production` |

### Local Development

In development mode (`ENVIRONMENT=development`):
- All localhost ports are allowed (http and https)
- Local network IPs are allowed (192.168.*, 10.*, 172.16-31.*)

```bash
# .env file for local development
ENVIRONMENT=development
ALLOWED_ORIGINS=
```

### Production (Vercel)

Set these environment variables in Vercel Dashboard → Project Settings → Environment Variables:

```bash
ENVIRONMENT=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com
```

**Automatically Allowed Origins** (no configuration needed):
- **Vercel deployments**: All `*.vercel.app` subdomains including:
  - Production: `https://mambax-frontend.vercel.app`
  - Preview: `https://mambax-frontend-git-feature-xyz.vercel.app`
  - Branch previews: `https://mambax-frontend-abc123.vercel.app`
- **Telegram Mini App**: `https://web.telegram.org`

**Custom Domain Examples**:
```bash
# Single custom domain
ALLOWED_ORIGINS=https://dating.example.com

# Multiple origins (production + staging)
ALLOWED_ORIGINS=https://dating.example.com,https://staging.dating.example.com

# With Telegram web app iframe origin (if needed)
ALLOWED_ORIGINS=https://dating.example.com,https://web.telegram.org
```

### Testing CORS

```bash
# Test allowed origin
curl -I -X OPTIONS https://your-api.vercel.app/health \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: GET"

# Should return: Access-Control-Allow-Origin: https://your-frontend.vercel.app

# Test blocked origin
curl -I -X OPTIONS https://your-api.vercel.app/health \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET"

# Should return: 403 Forbidden
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error in browser | Check that request origin is in allowed list |
| Preflight fails | Verify OPTIONS requests reach FastAPI (not blocked by Vercel edge) |
| Credentials not sent | Ensure origin is explicitly allowed (not using wildcard) |
| Preview URL blocked | All `*.vercel.app` URLs are automatically allowed |

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

- `GET /` - Static index page
- `GET /health` - Health check
- `GET /init` - Initialize database
- `POST /auth/telegram` - Telegram login
- `GET /me` - Current user profile
- `GET /profiles` - Browse profiles
- `GET /matches` - User matches
- `GET /matches/{id}/messages` - Chat messages
- `POST /upload` - File upload

## Deployment

See `vercel.json` for Vercel configuration. CORS is handled entirely by FastAPI middleware.
