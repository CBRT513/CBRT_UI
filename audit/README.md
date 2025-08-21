# Firestore Audit Report

Generated: 2025-08-20T23:11:56.377Z

## Summary
- Total Collections: 23
- Empty Collections: 7
- Collections with Errors: 0
- Collections with Missing Fields: 10

## Collection Details

### allocations
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### audit_logs
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### auditLogs
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### barcodes
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: barcode, itemCode, status, createdAt
- **Field Coverage**:
  - barcode: 0%
  - itemCode: 0%
  - status: 0%
  - createdAt: 0%


### barges
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: bargeNumber, name, status, capacity
- **Field Coverage**:
  - bargeNumber: 0%
  - name: 0%
  - status: 0%
  - capacity: 0%


### bols
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### carriers
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: name, contactName, phone, status
- **Field Coverage**:
  - name: 0%
  - contactName: 0%
  - phone: 0%
  - status: 0%


### customers
- **Status**: ✅ Active
- **Document Count**: 3
- **Missing Required Fields**: name
- **Field Coverage**:
  - name: 0%
  - contactName: 100%
  - phone: 100%
  - address: 100%
  - city: 100%
  - state: 100%
  - status: 100%


### emailQueue
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### items
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: itemCode, name, status, quantity
- **Field Coverage**:
  - itemCode: 0%
  - name: 0%
  - status: 0%
  - quantity: 0%


### logs
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### lots
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: lotNumber, itemCode, quantity, status
- **Field Coverage**:
  - lotNumber: 0%
  - itemCode: 0%
  - quantity: 0%
  - status: 0%


### notifications
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### releases
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: releaseNumber, customer, status, items, createdAt
- **Field Coverage**:
  - releaseNumber: 0%
  - customer: 0%
  - status: 0%
  - items: 0%
  - createdAt: 0%


### sizes
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: sizeCode, description, dimensions
- **Field Coverage**:
  - sizeCode: 0%
  - description: 0%
  - dimensions: 0%


### staff
- **Status**: ✅ Active
- **Document Count**: 4
- **Missing Required Fields**: None
- **Field Coverage**:
  - name: 100%
  - email: 50%
  - role: 100%
  - status: 100%


### staging
- **Status**: ❌ Empty
- **Document Count**: 0
- **Missing Required Fields**: None
- **Field Coverage**:



### suppliers
- **Status**: ✅ Active
- **Document Count**: 3
- **Missing Required Fields**: name, contactName, phone, address, city, state, status
- **Field Coverage**:
  - name: 0%
  - contactName: 0%
  - phone: 0%
  - address: 0%
  - city: 0%
  - state: 0%
  - status: 0%


### system_alerts
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### test_analyses
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:



### trucks
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: truckNumber, carrier, status, capacity
- **Field Coverage**:
  - truckNumber: 0%
  - carrier: 0%
  - status: 0%
  - capacity: 0%


### users
- **Status**: ✅ Active
- **Document Count**: 2
- **Missing Required Fields**: None
- **Field Coverage**:



### verifications
- **Status**: ✅ Active
- **Document Count**: 1
- **Missing Required Fields**: None
- **Field Coverage**:




## Next Steps


### Seed Empty Collections
Run the following to add sample data:
```bash
pnpm audit:fs -- --seed
```



### Fix Missing Fields
Some collections are missing required fields. Review the data model and update Firestore documents.



