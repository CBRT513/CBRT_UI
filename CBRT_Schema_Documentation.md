# CBRT UI - Complete Database Schema Documentation

## Overview
Cincinnati Barge & Rail Terminal (CBRT) Warehouse Management System database schema for Firestore collections.

**Generated:** August 21, 2025  
**System:** React + Vite + Firebase/Firestore  
**Purpose:** Warehouse operations, inventory tracking, BOL generation, and release management

---

## Field Naming Conventions

The system handles both **camelCase** and **PascalCase** field naming for backwards compatibility:
- **New/Preferred:** camelCase (e.g., `customerName`, `itemCode`)
- **Legacy:** PascalCase (e.g., `CustomerName`, `ItemCode`)
- **Import fields:** Often use original CSV naming preserved in `original*` fields

---

## Core Collections

### 1. **suppliers**
Supplier/vendor companies that provide materials.

```typescript
{
  id: string,                    // Firestore document ID
  supplierName: string,          // Company name (camelCase)
  SupplierName?: string,         // Legacy field (PascalCase)
  bolPrefix: string,             // BOL prefix for identification (e.g., "YAS", "TRX")
  BOLPrefix?: string,            // Legacy field
  contactName?: string,          // Primary contact person
  phone?: string,                // Contact phone number
  email?: string,                // Contact email
  address?: string,              // Company address
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Connected to `barcodes` via `bolPrefix`/`BOLPrefix`
- Connected to `barges` via supplier linking
- Used in release workflows for supplier selection

---

### 2. **customers**
Customer companies that receive materials.

```typescript
{
  id: string,                    // Firestore document ID
  customerName: string,          // Company name (camelCase)
  CustomerName?: string,         // Legacy field (PascalCase)
  companyName?: string,          // Alternative company name field
  contactName?: string,          // Primary contact person
  phone?: string,                // Contact phone number
  email?: string,                // Contact email
  address?: string,              // Company address
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Connected to `barcodes` via `customerName`
- Used in release workflows for customer selection
- Filtered by supplier relationships in release entry

---

### 3. **items**
Inventory items/products that can be tracked and released.

```typescript
{
  id: string,                    // Firestore document ID
  itemCode: string,              // Unique item identifier (camelCase)
  ItemCode?: string,             // Legacy field (PascalCase)
  itemName: string,              // Descriptive item name (camelCase)
  ItemName?: string,             // Legacy field (PascalCase)
  originalItemCode?: string,     // Original CSV import value
  originalItemName?: string,     // Original CSV import value
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Connected to `barcodes` via `itemCode`
- Related to `sizes` through barcode associations
- Used in release line items

---

### 4. **sizes**
Size variations for items (e.g., "6X16", "12X24").

```typescript
{
  id: string,                    // Firestore document ID
  sizeName: string,              // Size identifier (camelCase, e.g., "6X16")
  SizeName?: string,             // Legacy field (PascalCase)
  originalSizeName?: string,     // Original CSV import value
  sortOrder: 'ascending' | 'descending', // Sort preference
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Connected to `barcodes` via `sizeName`
- Associated with `items` through barcodes
- Used in release size selection (conditionally required)

---

### 5. **lots**
Lot numbers for inventory batching and tracking.

```typescript
{
  id: string,                    // Firestore document ID
  lotNumber: string,             // Lot identifier (camelCase)
  LotNumber?: string,            // Legacy field (PascalCase)
  itemCode: string,              // Associated item code
  originalLotNumber?: string,    // Original CSV import value
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Connected to `barcodes` via `lotNumber`
- Associated with specific `items` via `itemCode`
- Optional field in release entry

---

### 6. **barges**
Barge vessels that transport materials.

```typescript
{
  id: string,                    // Firestore document ID
  bargeName: string,             // Barge identifier (camelCase)
  BargeName?: string,            // Legacy field (PascalCase)
  bargeNumber?: string,          // Alternative identifier
  name?: string,                 // Alternative name field
  originalBargeName?: string,    // Original CSV import value
  supplierName: string,          // Associated supplier name
  SupplierName?: string,         // Legacy field
  supplierId: string,            // Supplier document reference
  SupplierId?: string,           // Legacy field
  bolPrefix: string,             // BOL prefix from supplier
  arrivalDate?: string,          // Expected/actual arrival date (optional)
  ArrivalDate?: string,          // Legacy field
  status: 'Expected' | 'Working' | 'Completed' | 'Active', // Operational status
  Status?: string,               // Legacy field
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Connected to `suppliers` via `supplierId` and `bolPrefix`
- Referenced in `barcodes` via `bargeName`
- Set during data import process

---

### 7. **barcodes** ⭐
**Central collection** linking all inventory data together.

```typescript
{
  id: string,                    // Firestore document ID
  barcode: string,               // Generated barcode value (concatenated)
  
  // Core item identification
  itemCode: string,              // Item identifier (camelCase)
  itemName: string,              // Item description (camelCase)
  sizeName: string,              // Size identifier (camelCase)
  lotNumber: string,             // Lot identifier (camelCase)
  bargeName: string,             // Barge identifier (camelCase)
  barcodeIdentifier: string,     // Additional barcode component (camelCase)
  
  // Original CSV values (preserved for reference)
  originalItemCode?: string,     // Original import value
  originalItemName?: string,     // Original import value
  originalSizeName?: string,     // Original import value
  originalLotNumber?: string,    // Original import value
  originalBargeName?: string,    // Original import value
  originalBarcodeIdentifier?: string, // Original import value
  
  // Business relationships
  customerName: string,          // Customer company name
  CustomerName?: string,         // Legacy field
  customerId?: string,           // Customer document reference
  supplierName: string,          // Supplier company name
  SupplierName?: string,         // Legacy field
  supplierId?: string,           // Supplier document reference
  BOLPrefix: string,             // BOL prefix for supplier matching
  bolPrefix?: string,            // Alternative field
  
  // Inventory data
  quantity: number,              // Available quantity (default: 1)
  standardWeight?: number,       // Weight per unit
  
  // Status tracking
  status: 'Active' | 'Available', // Inventory status
  Status?: string,               // Legacy field
  
  // Timestamps
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Barcode Generation Formula:**
```
barcode = bargeName + itemCode + lotNumber + barcodeIdentifier + sizeName
```

**Key Relationships:**
- **Central hub** connecting all other collections
- Links `suppliers` via `BOLPrefix`/`supplierName`
- Links `customers` via `customerName`
- Links `items` via `itemCode`
- Links `sizes` via `sizeName`
- Links `lots` via `lotNumber`
- Links `barges` via `bargeName`

---

### 8. **staff**
Warehouse staff members for notifications and assignments.

```typescript
{
  id: string,                    // Firestore document ID
  name: string,                  // Staff member name
  phone?: string,                // Phone number for SMS notifications
  email?: string,                // Email address
  role?: string,                 // Job role/title
  receivesNewRelease: boolean,   // Gets notified of new releases
  status: 'Active' | 'Inactive', // Employment status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

**Key Relationships:**
- Used for SMS notifications in release workflow
- Filtered for active staff with phone numbers

---

### 9. **carriers**
Transportation companies for shipment delivery.

```typescript
{
  id: string,                    // Firestore document ID
  carrierName: string,           // Company name (camelCase)
  CarrierName?: string,          // Legacy field (PascalCase)
  contactName?: string,          // Primary contact person
  phone?: string,                // Contact phone number
  email?: string,                // Contact email
  dotNumber?: string,            // DOT registration number
  mcNumber?: string,             // MC registration number
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

---

### 10. **trucks**
Delivery vehicles for transportation.

```typescript
{
  id: string,                    // Firestore document ID
  truckNumber: string,           // Truck identifier
  carrierId?: string,            // Associated carrier reference
  licensePlate?: string,         // Vehicle license plate
  driverName?: string,           // Current driver name
  capacity?: number,             // Load capacity
  status: 'Active' | 'Inactive' | 'In Transit' | 'Maintenance', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

---

### 11. **releases** ⭐
**Primary workflow collection** for material release orders.

```typescript
{
  id: string,                    // Firestore document ID
  ReleaseNumber: string,         // Unique release identifier
  SupplierId: string,            // Selected supplier reference
  CustomerId: string,            // Selected customer reference
  PickupDate?: string,           // Scheduled pickup date (optional)
  
  // Line items for release
  LineItems: Array<{
    ItemId: string,              // Selected item reference
    SizeId?: string,             // Selected size reference (conditional)
    LotId?: string,              // Selected lot reference (optional)
    Quantity: number,            // Requested quantity
    // Calculated fields populated during submission:
    itemName?: string,           // Item description
    itemCode?: string,           // Item code
    sizeName?: string,           // Size name
    lotNumber?: string           // Lot number
  }>,
  
  // Calculated totals
  TotalItems: number,            // Sum of all line item quantities
  TotalWeight: number,           // Calculated weight (TotalItems * 2200)
  
  // Workflow status
  Status: 'Entered' | 'Staged' | 'Verified' | 'Loaded' | 'Complete',
  
  // Audit fields
  CreatedAt: Date,               // Release creation timestamp
  CreatedBy: string,             // User who created (default: 'Office')
  UpdatedAt?: Date,              // Last modification timestamp
  UpdatedBy?: string             // Last user to modify
}
```

**Workflow States:**
1. **Entered** - Initial state after creation
2. **Staged** - Items prepared for pickup
3. **Verified** - Quantities and items confirmed
4. **Loaded** - Items loaded onto transport
5. **Complete** - Release fulfilled

---

### 12. **products** (Optional/Legacy)
Legacy product definitions - may be superseded by items collection.

```typescript
{
  id: string,                    // Firestore document ID
  productCode?: string,          // Product identifier
  productName?: string,          // Product description
  category?: string,             // Product category
  status: 'Active' | 'Inactive', // Operational status
  createdAt: Date,               // Record creation timestamp
  updatedAt: Date                // Last modification timestamp
}
```

---

## Data Import Process

### CSV Import Flow
1. **Parse CSV** with expected columns:
   - `itemCode`, `itemName`, `sizeName`, `bargeName`
   - `lotNumber`, `barcodeIdentifier`, `customerName`
   - `BOLPrefix`, `quantity`, `standardWeight`

2. **Normalization** applied to all fields:
   - Remove spaces: `replace(/\s+/g, '')`
   - Convert backslashes: `replace(/\\/g, '/')`
   - Convert to uppercase: `toUpperCase()`
   - Trim whitespace: `trim()`

3. **Entity Creation** (deduplicated):
   - Create unique `sizes` from `sizeName`
   - Create unique `items` from `itemCode` + `itemName`
   - Create unique `lots` from `lotNumber` + `itemCode`
   - Create unique `barges` with supplier linkage
   - Create `barcodes` linking all entities

4. **Supplier/Customer Linking**:
   - Match suppliers by `BOLPrefix`
   - Match customers by `customerName`
   - Store both IDs and names in barcodes

---

## Business Rules

### Release Entry Logic
1. **Supplier Selection** → Filters customers by barcode relationships
2. **Customer Selection** → Enables item selection
3. **Item Selection** → Auto-populates sizes if available
4. **Size Selection** → Conditionally required based on availability
5. **Lot Selection** → Always optional
6. **Quantity Validation** → Checked against barcode availability

### Field Requirements
- **Size Field**: Required only if sizes are available for selected item
- **Lot Field**: Always optional
- **Auto-selection**: Single-option dropdowns auto-select
- **Empty Dropdowns**: Show "None available" when no options

### Availability Calculation
```typescript
// Pseudocode for availability calculation
function calculateAvailability(supplierId, customerId, itemId, sizeId?, lotId?) {
  const supplier = findSupplier(supplierId);
  const customer = findCustomer(customerId);
  const item = findItem(itemId);
  
  let barcodes = filterBarcodes({
    bolPrefix: supplier.bolPrefix,
    customerName: customer.customerName,
    itemCode: item.itemCode,
    status: 'Active' || 'Available'
  });
  
  if (sizeId) {
    const size = findSize(sizeId);
    barcodes = barcodes.filter(b => b.sizeName === size.sizeName);
  }
  
  if (lotId) {
    const lot = findLot(lotId);
    barcodes = barcodes.filter(b => b.lotNumber === lot.lotNumber);
  }
  
  return barcodes.reduce((sum, b) => sum + (b.quantity || 1), 0);
}
```

---

## System Architecture Notes

### Authentication
- Uses Firebase Anonymous Authentication
- No user accounts or permissions currently implemented

### Real-time Updates
- Firestore real-time listeners via `useFirestoreCollection` hook
- Automatic UI updates when data changes

### Data Consistency
- Handles both camelCase and PascalCase throughout system
- Original import values preserved in `original*` fields
- Normalization applied consistently during import

### Performance Considerations
- Collections optimized for real-time queries
- Barcodes collection is central hub but may need indexing for large datasets
- Consider pagination for large collections

---

## Migration Notes

### From Legacy System
- PascalCase fields maintained for backwards compatibility
- Gradual migration to camelCase preferred
- Import process handles field name variations

### Future Enhancements
- Consider adding indexes for frequently queried fields
- May need user authentication and permissions
- Could benefit from batch operations for large imports

---

## Project File Structure

### 📁 **Root Configuration**
```
/Users/cerion/CBRT_UI/
├── package.json              # Main project dependencies & scripts
├── package-lock.json         # Dependency lock file
├── vite.config.js            # Vite build configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── eslint.config.js          # ESLint configuration
├── firebase.json             # Firebase project configuration
├── firestore.json            # Firestore rules and indexes
├── cors.json                 # CORS configuration
├── .firebaserc               # Firebase project aliases
├── .env.example              # Environment variables template
├── .env.local                # Local environment variables
└── README.md                 # Project documentation
```

### 📁 **Source Code Structure (`/src/`)**

#### **Main Application**
```
src/
├── main.jsx                  # Application entry point
├── App.jsx                   # Root React component with routing
└── index.css                 # Global styles
```

#### **Core Components (`/src/components/`)**
```
components/
├── LoadingStates.jsx         # Loading, error, empty state components
├── Manager.jsx               # Base manager component template
├── PageHeader.jsx            # Common page header component
├── Icons.jsx                 # SVG icon components
├── BOLPreview.jsx            # Bill of Lading preview component
├── WarehouseAuth.jsx         # Warehouse authentication component
├── FirebaseLogin.jsx         # Firebase authentication component
├── LoginComponent.jsx        # General login component
├── InventoryAvailabilityTest.jsx  # Inventory testing component
├── QuickSystemCheck.jsx      # System health check component
├── TestAnalysisDashboard.jsx # Testing dashboard component
├── AnalysisHistory.jsx       # Analysis history display
├── NotificationPanel.jsx     # Notification management
├── ConflictResolutionDialog.jsx  # Data conflict resolution
├── IntegrationConfigPanel.jsx     # Integration configuration
├── IntegrationHealthPanel.jsx     # Integration health monitoring
├── IntegrationManager.jsx         # Integration management
└── WorkflowChainBuilder.jsx       # Workflow chain builder
```

#### **Business Logic Routes (`/src/routes/`)**
```
routes/
├── Home.jsx                  # Dashboard/landing page
├── NewRelease.jsx           # ⭐ Release entry form (main workflow)
├── Releases.jsx             # Release list view
├── ReleaseDetails.jsx       # Individual release details
├── ReleaseWorkflowDashboard.jsx  # Workflow management dashboard
├── ExpectedShipments.jsx    # Shipment expectations view
├── WarehouseApp.jsx         # Main warehouse application
├── WarehouseStaging.jsx     # Legacy warehouse staging
├── WarehouseStagingNew.jsx  # New warehouse staging workflow
├── WarehouseVerification.jsx     # Legacy verification
├── WarehouseVerificationNew.jsx  # New verification workflow
├── ShipmentLoading.jsx      # Shipment loading workflow
├── PDFTestPage.jsx          # PDF generation testing
└── UmsExplorer.jsx          # UMS system explorer (feature-flagged)
```

#### **Data Management (`/src/managers/`)**
```
managers/
├── StaffManager.jsx         # Staff/employee management
├── CustomerManager.jsx      # Customer management
├── SupplierManager.jsx      # Supplier management
├── CarrierManager.jsx       # Transportation carrier management
├── TruckManager.jsx         # Vehicle management
├── ItemManager.jsx          # Inventory item management
├── SizeManager.jsx          # Item size management
├── ProductManager.jsx       # Product definition management
├── BargeManager.jsx         # Barge vessel management
├── LotManager.jsx           # Inventory lot management
├── BarcodeManager.jsx       # Barcode management
└── BOLManager.jsx           # Bill of Lading management
```

#### **Modal Components (`/src/modals/`)**
```
modals/
├── Modal.jsx                # Base modal component
├── StaffModal.jsx           # Staff creation/edit modal
├── CustomerModal.jsx        # Customer creation/edit modal
├── SupplierModal.jsx        # Supplier creation/edit modal
├── CarrierModal.jsx         # Carrier creation/edit modal
├── TruckModal.jsx           # Truck creation/edit modal
├── ItemModal.jsx            # Item creation/edit modal
├── SizeModal.jsx            # Size creation/edit modal
├── ProductModal.jsx         # Product creation/edit modal
├── BargeModal.jsx           # Barge creation/edit modal
├── LotModal.jsx             # Lot creation/edit modal
└── BarcodeModal.jsx         # Barcode creation/edit modal
```

#### **Business Services (`/src/services/`)**
```
services/
├── auth-client.js                    # Authentication client service
├── firebaseService.js                # Firebase utilities
├── bolService.js                     # Bill of Lading business logic
├── bolPDFService.js                  # BOL PDF generation
├── pickTicketService.js              # Pick ticket generation
├── smsService.js                     # SMS notification service
├── inventoryAvailabilityService.js   # Inventory availability calculation
├── releaseWorkflowService.js         # Release workflow management
├── releaseNotificationService.js     # Release notifications
├── dataValidationService.js          # Data validation utilities
├── duplicateDetectionService.js      # Duplicate detection logic
├── systemMonitoringService.js        # System health monitoring
└── testAnalysisService.js            # Test analysis utilities
```

#### **React Hooks (`/src/hooks/`)**
```
hooks/
├── useFirestore.js                   # Firestore data fetching hook
├── useInventoryAvailability.js       # Inventory availability hook
└── useTrucksWithCarriers.js          # Truck-carrier relationship hook
```

#### **Context Providers (`/src/contexts/`)**
```
contexts/
├── AuthContext.jsx                   # Authentication context
└── SimpleAuthContext.jsx             # Simplified auth context
```

#### **Utility Functions (`/src/utils/`)**
```
utils/
├── index.js                          # General utilities
├── logger.js                         # Logging utilities
├── workflowMonitor.js                # Workflow monitoring
├── transactionHelper.js              # Database transaction helpers
├── clearFirestore.js                 # Database cleanup utilities
├── quickWarehouseSetup.js            # Warehouse setup automation
├── testSMSSetup.js                   # SMS testing setup
└── mvpSMSTest.js                     # MVP SMS testing
```

#### **Constants (`/src/constants/`)**
```
constants/
├── index.js                          # General constants
└── logo.js                           # Logo/branding constants
```

#### **Specialized Features (`/src/features/`)**
```
features/
└── bol-generation/
    ├── BOLGenerator.jsx              # BOL generation component
    └── bolManager.jsx                # BOL management logic
```

#### **Testing Suite (`/src/tests/`)**
```
tests/
├── WorkflowAutomatedTest.jsx         # Automated workflow testing
├── WorkflowCompleteE2ETest.jsx       # End-to-end workflow tests
├── WorkflowStressTest.jsx            # Stress testing component
├── ContinuousChaosTest.jsx           # Chaos testing component
├── E2IntegrationTests.js             # Integration test suite
├── E2WorkflowBenchmarks.js           # Performance benchmarks
└── run-d5-validation.js              # D5 validation runner
```

#### **Data Management (`/src/pages/`)**
```
pages/
└── DataImportManager.jsx             # CSV import management
```

### 📁 **Firebase Functions (`/functions/`)**
```
functions/
├── package.json                      # Functions dependencies
├── package-lock.json                 # Functions dependency lock
├── index.js                          # Cloud Functions entry point
├── .eslintrc.js                      # Functions ESLint config
└── tsconfig.json                     # TypeScript configuration
```

### 📁 **Documentation (`/docs/`)**
```
docs/
├── D5_VALIDATION_REPORT.md           # Validation testing report
├── E1_COLLABORATION_REPORT.md        # Collaboration analysis
├── E1_GOVERNANCE_POLICIES.md         # Governance documentation
├── E2_API_REFERENCE.md               # API reference documentation
├── E2_COLLABORATION_WORKFLOWS_REPORT.md  # Workflow analysis
├── dev/
│   └── FIRESTORE_AUDIT.md            # Database audit documentation
└── integration/
    └── UMS_GRAPH.md                  # UMS integration graph
```

### 📁 **Development Tools & Scripts**
```
/
├── scripts/
│   ├── firestore_bulk_seed.js        # Database seeding script
│   ├── firestoreSchema.js            # Schema generation script
│   └── normalizeFirestore.js         # Data normalization script
├── audit/
│   ├── firestore_audit.json          # Audit results
│   ├── collections.map.json          # Collection mapping
│   └── README.md                     # Audit documentation
├── generate_manager.js               # Manager component generator
├── temp_import.js                    # Temporary import script
└── check-field-naming.mjs            # Field naming validation
```

### 📁 **Development Configuration**
```
.vscode/
└── settings.json                     # VS Code workspace settings

.claude/
└── settings.local.json               # Claude Code local settings

.github/workflows/
├── ci.yml                           # Continuous integration
└── deploy.yml                       # Deployment automation
```

### 📁 **Build Output**
```
dist/                                # Production build output (auto-generated)
public/                              # Static assets
```

---

## Key Architectural Patterns

### **Component Organization**
- **Managers**: CRUD operations for each entity type
- **Modals**: Form components for create/edit operations  
- **Routes**: Page-level components with business logic
- **Services**: Reusable business logic and API interactions
- **Hooks**: Custom React hooks for data fetching and state management

### **File Naming Conventions**
- **Components**: PascalCase (e.g., `CustomerManager.jsx`)
- **Services**: camelCase (e.g., `inventoryAvailabilityService.js`)
- **Utilities**: camelCase (e.g., `workflowMonitor.js`)
- **Constants**: camelCase (e.g., `index.js`)

### **Import Patterns**
```javascript
// React imports
import React, { useState, useEffect } from 'react';

// External libraries
import { collection, addDoc } from 'firebase/firestore';

// Internal utilities
import { useFirestoreCollection } from '../hooks/useFirestore';
import { db } from '../firebase/config';

// Components
import Modal from '../modals/Modal';
```

### **State Management**
- **Local State**: React `useState` for component-specific data
- **Global State**: React Context for authentication
- **Server State**: Custom Firestore hooks with real-time updates
- **Form State**: Direct state management in modal components

### **Data Flow**
```
Firestore Database
       ↓
useFirestoreCollection Hook
       ↓
Manager Components
       ↓
Modal Components
       ↓
Form Submission
       ↓
Service Layer
       ↓
Firestore Database
```

---

**Document Version:** 1.1  
**Last Updated:** August 21, 2025  
**Maintained By:** CBRT Development Team