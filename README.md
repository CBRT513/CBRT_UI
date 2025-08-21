# CBRT UI - Cincinnati Barge & Rail Terminal

Warehouse Management System with integrated UMS Graph API for knowledge extraction.

## Features

- Bill of Lading (BOL) generation and management
- Inventory tracking and availability
- Release workflow system (Release → Staging → Verification → BOL)
- Barcode scanning and management
- Customer/Supplier/Carrier management
- **UMS Graph API Integration** (feature-flagged)
  - Document search
  - Entity extraction
  - Knowledge graph management

## Quick Start

```bash
# Copy environment variables
cp .env.example .env.local

# Install dependencies
npm install

# Start development server
npm run dev

# Start UMS API (in separate terminal)
cd /usr/local/share/universal-memory-system
source venv/bin/activate
uvicorn src.api_service:app --host 127.0.0.1 --port 8091 --reload
```

## Environment Setup

Create `.env.local`:
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# UMS Graph API
VITE_UMS_GRAPH_BASE_URL=http://127.0.0.1:8091
VITE_FEATURE_UMS=true

# Environment
VITE_ENVIRONMENT=development
```

## UMS Integration

When `VITE_FEATURE_UMS=true`, access the UMS Explorer at `/umsexplorer`:
- Search documents and entities
- Extract entities from text (rule/LLM/hybrid modes)
- View knowledge graph relationships

See [docs/integration/UMS_GRAPH.md](docs/integration/UMS_GRAPH.md) for detailed API documentation.

## Deployment

### Automatic Deployment

- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch or create version tag

### Manual Deployment

```bash
# Build application
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Deploy with functions
cd functions && npm run build && cd ..
firebase deploy --only hosting,functions
```

## Project Structure

```
src/
├── routes/          # Main application routes
├── managers/        # Data management components
├── services/        # Business logic
├── lib/
│   ├── ums/        # UMS Graph API client
│   └── auth/       # Firebase authentication
├── hooks/          # React hooks
└── firebase/       # Firebase configuration
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## CI/CD

GitHub Actions workflows:
- **CI**: Runs on PR and push (lint, test, build)
- **Deploy**: Automatic deployment to staging/production

Required GitHub Secrets:
- `FIREBASE_TOKEN`
- `VITE_FIREBASE_*` (Firebase config)

## Tech Stack

- React + Vite
- Firebase (Auth, Firestore, Functions, Hosting)
- Tailwind CSS
- UMS Graph API integration
- GitHub Actions CI/CD
