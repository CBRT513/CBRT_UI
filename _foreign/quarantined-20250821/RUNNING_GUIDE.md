# CBRT System - Running Guide

## 🚀 System is Now Running!

All Docker containers are up and running. Here's how to access and use the CBRT Warehouse Management System.

## 📍 Access Points

### Primary Interfaces

| Service | URL | Purpose | Credentials |
|---------|-----|---------|-------------|
| **CBRT Frontend** | http://localhost:5173 | Main warehouse management UI | Any email/password (emulator mode) |
| **Firebase Emulator UI** | http://localhost:4000 | View/manage Firebase data | No auth required |
| **Grafana Dashboard** | http://localhost:3000 | System monitoring | admin / admin |
| **Jaeger Tracing** | http://localhost:16686 | Request tracing | No auth required |
| **Prometheus** | http://localhost:9090 | Metrics explorer | No auth required |

## 🎯 Quick Tour

### 1. Access the Main Application
```bash
# Open in browser
open http://localhost:5173
```

**What you'll see:**
- Login screen (use any email/password - it's in emulator mode)
- Dashboard with release overview
- Full warehouse management interface

### 2. Key Features to Explore

#### Release Management
1. Navigate to **Releases** in the menu
2. Click **New Release** to create a shipment
3. Select customer and items
4. Generate BOL (Bill of Lading)
5. Progress through stages: Create → Stage → Verify → Complete

#### Inventory Management
1. Go to **Managers → Items**
2. View current inventory levels
3. Add new products
4. Track lot numbers
5. Check availability in real-time

#### Customer & Carrier Management
1. Access **Managers → Customers**
2. Add/edit customer information
3. Manage carrier details
4. Track shipment history

### 3. Firebase Emulator Dashboard
```bash
# Open Firebase UI
open http://localhost:4000
```

**Available tabs:**
- **Authentication**: View/manage users
- **Firestore**: Browse database collections
- **Functions**: Monitor cloud functions

### 4. Monitoring Stack
```bash
# Grafana (metrics dashboards)
open http://localhost:3000
# Login: admin / admin

# Jaeger (distributed tracing)
open http://localhost:16686

# Prometheus (raw metrics)
open http://localhost:9090
```

## 🏗️ Architecture Overview

### Currently Running (Active)
```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│         http://localhost:5173           │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Firebase Emulators Suite           │
│  • Auth (port 9099)                     │
│  • Firestore (port 8081)                │
│  • Functions (port 5001)                │
│  • UI (port 4000)                       │
└─────────────────────────────────────────┘
                    │
      ┌─────────────┴─────────────┐
      ▼                           ▼
┌──────────────┐           ┌──────────────┐
│  PostgreSQL  │           │    Redis     │
│   (port 5432)│           │  (port 6379) │
└──────────────┘           └──────────────┘
```

### Monitoring Stack (Active)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Grafana    │  │  Prometheus  │  │    Jaeger    │
│  (port 3000) │  │ (port 9090)  │  │ (port 16686) │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 📊 Sample Workflows

### Create and Process a Release
1. **Login**: http://localhost:5173
2. **Create Release**:
   - Click "Releases" → "New Release"
   - Select customer: "ABC Corporation"
   - Add items with quantities
   - Save release
3. **Stage Items**:
   - Go to "Warehouse" → "Staging"
   - Scan/enter barcodes
   - Confirm staging
4. **Verify & Complete**:
   - Navigate to "Verification"
   - Verify quantities
   - Generate BOL PDF
   - Mark as complete

### View Data in Firebase
1. **Open Firebase UI**: http://localhost:4000
2. **Navigate to Firestore tab**
3. **Browse collections**:
   - `releases` - All shipment releases
   - `customers` - Customer records
   - `items` - Product catalog
   - `lots` - Lot tracking
   - `audit_logs` - System audit trail

## 🛠️ Managing the System

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f cbrt-firebase
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker restart cbrt-frontend
```

### Stop Everything
```bash
docker-compose down

# With data cleanup
docker-compose down -v
```

## 🔍 Debugging Tips

### Frontend Not Loading?
```bash
# Check frontend logs
docker logs cbrt-frontend

# Restart frontend
docker restart cbrt-frontend
```

### Firebase Emulator Issues?
```bash
# Check emulator status
docker logs cbrt-firebase

# Restart emulators
docker restart cbrt-firebase
```

### Database Connection?
```bash
# Test PostgreSQL
docker exec cbrt-postgres pg_isready

# Connect to database
docker exec -it cbrt-postgres psql -U ums -d ums
```

## 📈 What's Working vs Designed

### ✅ Fully Functional (Demo Mode)
- Complete React UI with all CRUD operations
- Release management workflow
- BOL PDF generation
- Inventory tracking
- Customer/Carrier management
- Basic role-based access
- Firebase authentication
- Firestore database
- Audit logging
- Data import/export

### 📐 Designed but Not Integrated
- Kubernetes service mesh (Istio)
- STRICT mTLS between services
- Advanced RBAC/ABAC policies
- Graph database operations
- Cryptographic audit trail
- PII redaction engine
- Consent management
- Circuit breakers
- Rate limiting
- Distributed tracing integration

## 🎉 Next Steps

### For Development
1. Make UI changes in `src/` directory
2. Changes auto-reload via Vite HMR
3. Firebase data persists in emulator

### For Testing
1. Use Firebase UI to modify data
2. Test workflows in the main app
3. Monitor with Grafana/Prometheus

### For Production Readiness
1. Replace Firebase emulators with real Firebase
2. Deploy PostgreSQL with proper credentials
3. Enable service mesh features
4. Implement UMS identity layer
5. Configure production monitoring

## 📝 Quick Commands Reference

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View all logs
docker-compose logs -f

# Access main app
open http://localhost:5173

# Access Firebase UI
open http://localhost:4000

# Access Grafana
open http://localhost:3000

# Check service health
docker-compose ps
```

## 🆘 Getting Help

If you encounter issues:
1. Check logs: `docker-compose logs [service-name]`
2. Verify ports are free: `lsof -i :5173`
3. Restart services: `docker-compose restart`
4. Clean rebuild: `docker-compose down -v && docker-compose up -d`

---

**System Status**: 🟢 All services running
**Environment**: Local Development (Docker Compose)
**Mode**: Demo/Emulator Mode