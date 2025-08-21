# CBRT Warehouse Management System - Complete Overview

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (optional, for local development)
- 8GB RAM minimum
- Ports 3000, 4000, 5173, 8081, 9099 available

### Step 1: Setup Environment
```bash
# Copy environment template
cp .env.example .env

# No changes needed for local development - defaults work!
```

### Step 2: Start Everything
```bash
# Start all services with Docker Compose
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
docker-compose ps

# Check logs if needed
docker-compose logs -f frontend
```

### Step 3: Access the System

## 🌐 URLs to Visit

### Main Application
- **Frontend UI**: http://localhost:5173
  - Login with demo credentials (any email/password in emulator mode)
  - Main warehouse management interface
  - Release management, BOL generation, inventory tracking

### Development Tools
- **Firebase Emulator UI**: http://localhost:4000
  - View Firestore data
  - Manage authentication
  - Monitor functions

- **Grafana Dashboard**: http://localhost:3000
  - Username: `admin`
  - Password: `admin`
  - Monitoring and metrics

- **Jaeger Tracing**: http://localhost:16686
  - Distributed tracing UI
  - Request flow visualization

- **Prometheus**: http://localhost:9090
  - Metrics explorer
  - Alert manager

## 📁 System Architecture

```
CBRT System
├── Frontend Layer (React + Vite)
│   ├── Warehouse Management UI
│   ├── Release Management
│   ├── BOL Generation
│   └── Inventory Tracking
│
├── Data Layer (Firebase)
│   ├── Firestore (NoSQL Database)
│   ├── Authentication
│   └── Cloud Functions
│
├── Identity & Policy Layer (Designed, Not Yet Integrated)
│   ├── PostgreSQL (UMS Database)
│   ├── RBAC/ABAC Guards
│   ├── Audit Trail
│   └── Graph Database
│
└── Observability Layer
    ├── Prometheus (Metrics)
    ├── Grafana (Dashboards)
    └── Jaeger (Tracing)
```

## 🎯 Current Features (Working)

### 1. Warehouse Management
- **Release Creation**: Create and manage shipment releases
- **BOL Generation**: Generate Bills of Lading as PDFs
- **Inventory Tracking**: Real-time inventory availability
- **Barcode Management**: Track items with barcodes

### 2. User Roles
- **Admin**: Full system access
- **Office**: Administrative functions
- **Loader**: Warehouse operations
- **Viewer**: Read-only access

### 3. Data Management
- **Customer Management**: CRUD operations for customers
- **Carrier Management**: Truck and carrier tracking
- **Product Management**: Item and product catalogs
- **Lot Management**: Batch and lot tracking

### 4. Workflow Features
- **Multi-step Release Process**: Create → Stage → Verify → Complete
- **SMS Notifications**: Alert system for shipments
- **Audit Logging**: Track all changes
- **Data Import**: Bulk CSV imports

## 🔧 Designed Components (Not Yet Integrated)

### 1. Service Mesh (Milestone G)
- **Istio Configuration**: Complete YAML manifests ready
- **mTLS**: Strict mutual TLS between services
- **Circuit Breakers**: Fault tolerance patterns
- **Rate Limiting**: Token bucket implementation
- **Location**: `infra/` directory (specs exist, not deployed)

### 2. Identity & Schema Plane (Milestone H)
- **UMS Database**: PostgreSQL schema with ULIDs
- **RBAC System**: Role-based access control
- **ABAC Policies**: Attribute-based access control
- **Audit Trail**: Immutable, hash-chained audit log
- **Graph Database**: Entity relationships and traversal
- **Location**: `db/migrations/` and `src/ums/` (specs exist, not deployed)

### 3. Integration Layer (Milestone F)
- **Fabric Client**: HTTP client with retry logic
- **Policy Checker**: Local policy evaluation
- **Trace Propagation**: W3C and B3 headers
- **Location**: `src/lib/integration/` (specs exist, not deployed)

## 🔍 API Endpoints

### Current Firebase Functions
```javascript
// Authentication
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify

// Releases
GET  /api/releases
POST /api/releases
PUT  /api/releases/:id
DELETE /api/releases/:id

// BOL Generation
POST /api/bol/generate
GET  /api/bol/:id

// Inventory
GET  /api/inventory/availability
POST /api/inventory/check
```

### Planned UMS APIs (Designed, Not Active)
```javascript
// Users & Identity
POST /api/ums/users
GET  /api/ums/users/:id
PUT  /api/ums/users/:id

// Policy Evaluation
POST /api/ums/policies/evaluate
GET  /api/ums/policies

// Graph Operations
POST /api/ums/graph/traverse
POST /api/ums/graph/entities

// Audit Trail
GET  /api/ums/audit/events
POST /api/ums/audit/verify
```

## 🛠️ Development Commands

### Docker Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart frontend

# Clean everything (including volumes)
docker-compose down -v
```

### Local Development (without Docker)
```bash
# Install dependencies
npm install

# Start Firebase emulators
firebase emulators:start

# Start frontend dev server
npm run dev

# Build for production
npm run build
```

### Database Operations (when UMS is integrated)
```bash
# Connect to PostgreSQL
docker exec -it cbrt-postgres psql -U ums

# Run migrations (future)
npm run db:migrate

# Seed data (future)
npm run db:seed
```

## 📊 Monitoring & Debugging

### View Application Logs
```bash
# Frontend logs
docker-compose logs -f frontend

# Firebase emulator logs
docker-compose logs -f firebase-emulators

# All logs
docker-compose logs -f
```

### Check Service Health
```bash
# See all running containers
docker-compose ps

# Check specific service
curl http://localhost:5173  # Frontend
curl http://localhost:4000  # Firebase UI
```

### Database Inspection
```bash
# Connect to PostgreSQL
docker exec -it cbrt-postgres psql -U ums -d ums

# Sample queries
\dt  # List tables
SELECT * FROM users LIMIT 5;
SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 10;
```

## 🎨 UI Navigation Guide

### Homepage (http://localhost:5173)
1. **Login Screen**: Use any email/password in emulator mode
2. **Dashboard**: Overview of releases and inventory
3. **Navigation Menu**:
   - Releases: Manage shipments
   - Warehouse: Staging and verification
   - Managers: CRUD for all entities
   - Reports: Analytics and exports

### Key Workflows
1. **Create Release**:
   - Navigate to Releases → New Release
   - Select customer and items
   - Generate BOL
   - Move through staging → verification → completion

2. **Manage Inventory**:
   - Go to Managers → Items
   - Add/edit products
   - Track lot numbers
   - View availability

3. **Generate Reports**:
   - Access Reports section
   - Export to CSV/PDF
   - View audit logs

## 🔐 Security Features

### Currently Active
- Firebase Authentication
- Role-based UI access
- Firestore security rules
- Audit logging

### Designed but Not Integrated
- mTLS between services
- SPIFFE identity
- Zero-trust networking
- PII redaction
- Consent management
- Cryptographic audit trail

## 🚧 Demo vs Production

### What's Working (Demo State)
✅ Full UI with all CRUD operations
✅ Firebase backend with emulators
✅ BOL PDF generation
✅ Basic role management
✅ Inventory tracking
✅ SMS notifications (mock)

### What's Designed (Not Deployed)
📋 Kubernetes service mesh
📋 PostgreSQL identity database
📋 Advanced RBAC/ABAC policies
📋 Graph database operations
📋 Distributed tracing
📋 Circuit breakers
📋 Rate limiting

### Integration Points
The system is designed with clear integration points:
1. **Auth**: Firebase Auth → UMS Identity
2. **Database**: Firestore → PostgreSQL + Firestore hybrid
3. **Policies**: Frontend roles → RBAC/ABAC guards
4. **Audit**: Basic logging → Immutable audit trail
5. **Network**: Direct HTTP → Service mesh with mTLS

## 📝 Configuration Files

### Key Files to Know
- `.env` - Environment variables
- `docker-compose.yml` - Service definitions
- `firebase.json` - Firebase emulator config
- `package.json` - Node dependencies
- `vite.config.js` - Frontend build config

### Environment Variables
```bash
# Most important ones
VITE_USE_EMULATORS=true  # Use local Firebase
DB_HOST=localhost         # PostgreSQL location
REDIS_HOST=localhost      # Session store
API_PORT=8091            # UMS API (future)
```

## 🎯 Next Steps

### To Activate Designed Features
1. **Deploy UMS Database**:
   ```bash
   # Create migrations directory
   mkdir -p db/migrations
   # Copy migration files
   # Run migrations
   docker exec cbrt-postgres psql -U ums < migrations.sql
   ```

2. **Enable Service Mesh**:
   ```bash
   # Install Istio
   istioctl install
   # Apply policies
   kubectl apply -f infra/mesh/
   ```

3. **Integrate Identity Layer**:
   - Update Firebase auth to use UMS
   - Map roles to new RBAC system
   - Enable policy evaluation

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Find and kill process
   lsof -i :5173
   kill -9 <PID>
   ```

2. **Docker Container Won't Start**:
   ```bash
   # Check logs
   docker-compose logs [service-name]
   # Rebuild
   docker-compose build --no-cache
   ```

3. **Firebase Emulator Issues**:
   ```bash
   # Clear emulator data
   rm -rf .firebase/
   # Restart
   docker-compose restart firebase-emulators
   ```

4. **Database Connection Failed**:
   ```bash
   # Check PostgreSQL is running
   docker-compose ps postgres
   # Test connection
   docker exec cbrt-postgres pg_isready
   ```

## 📚 Documentation Map

- **This File**: System overview and operations
- **README.md**: Original project documentation
- **docs/F4_REPORT.md**: Security implementation
- **docs/G_FABRIC_GUIDE.md**: Service mesh design
- **docs/H_IDENTITY_MODEL.md**: Identity system design
- **docs/H_UMS_SCHEMA.md**: Database schema

## 🎉 Summary

You have a **fully functional warehouse management system** with:
- ✅ Complete React UI with all features
- ✅ Firebase backend (local emulators)
- ✅ Docker Compose for easy startup
- ✅ Monitoring stack ready

Plus **comprehensive designs** for:
- 📐 Enterprise service mesh
- 📐 Identity and policy management
- 📐 Graph database
- 📐 Immutable audit system

**To explore**: Start with `docker-compose up -d`, visit http://localhost:5173, and navigate through the warehouse management features. The Firebase Emulator UI at http://localhost:4000 lets you see all the data operations in real-time.

---

*System built with security, scalability, and observability in mind. Currently running in demo mode with full production designs ready for deployment.*