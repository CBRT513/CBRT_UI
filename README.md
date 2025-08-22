# CBRT UI

React-based UI for the Container Barge Rail Terminal (CBRT) system.

## SSO Configuration

### Enable SSO Mode
Set `VITE_ENABLE_SSO=true` in your `.env` file to enable SSO authentication via Firebase Auth (barge2rail-auth project) and API calls to the broker.

### Health Check
Visit `/health` to verify broker connectivity. Should return:
```json
{
  "ok": true,
  "service": "broker",
  "env": "staging",
  "version": "v1",
  "time": "..."
}
```

### SSO Feature Flag
- **VITE_ENABLE_SSO=false** (default): Uses legacy Firestore client for all data operations
- **VITE_ENABLE_SSO=true**: Routes all data operations through broker API with Bearer token authentication

### Role-Based Access Control
When SSO is enabled, routes are protected by role guards:
- `/ops/queues` - Requires `viewer` role or higher
- `/stage/:id` - Requires `loader` role or higher  
- `/verify/:id` - Requires `supervisor` role or higher
- `/load/:id` - Requires `loader` role or higher

## Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.development.local

# Run development server
npm run dev
```

### Build
```bash
# Development build
npm run build -- --mode development

# Staging build (with SSO enabled)
npm run build -- --mode staging

# Production build
npm run build -- --mode production
```

## Firebase Projects

### Development
- Project: `cbrt-app-ui-dev`
- URL: https://cbrt-app-ui-dev.web.app

### Staging  
- Project: `cbrt-ui-staging`
- URL: https://cbrt-ui-staging.web.app
- SSO: Enabled by default

## Feature Flags

Configure in `.env` file:
- `VITE_ENABLE_SSO` - Enable SSO authentication
- `VITE_ENABLE_SUPERSACK` - Enable F6 BOL features
- `VITE_SHOW_AGING` - Show aging timers in queues
- `VITE_NOTIFS_DRY_RUN` - Dry run mode for notifications
- `VITE_API_BASE` - Broker API base URL

## React + Vite

This project uses React 18 with Vite for fast development and optimized builds.

### ESLint Configuration

The project includes ESLint for code quality. To expand the configuration for production:
- Consider migrating to TypeScript
- Enable type-aware lint rules
- See the [TypeScript template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for integration details