// src/services/firebaseService.js - Elegant Products + Inventory Model
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';

/** * Generic Firebase service for CRUD operations */
export class FirebaseService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collection = collection(db, collectionName);
  }

  // Create a new document
  async create(data) {
    try {
      const docRef = await addDoc(this.collection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef;
    } catch (error) {
      console.error('Error creating ' + this.collectionName + ':', error);
      throw error;
    }
  }

  // Update an existing document
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return docRef;
    } catch (error) {
      console.error('Error updating ' + this.collectionName + ':', error);
      throw error;
    }
  }

  // Delete a document
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting ' + this.collectionName + ':', error);
      throw error;
    }
  }

  // Get all documents
  async getAll(constraints = []) {
    try {
      const q = query(this.collection, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting ' + this.collectionName + ':', error);
      throw error;
    }
  }

  // Find documents by field value
  async findBy(field, value) {
    try {
      const q = query(this.collection, where(field, '==', value));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error finding ' + this.collectionName + ' by ' + field + ':', error);
      throw error;
    }
  }

  // Find or create a document
  async findOrCreate(field, value, additionalData = {}) {
    try {
      const existing = await this.findBy(field, value);
      if (existing.length > 0) {
        return existing[0];
      }
      
      const docRef = await this.create({
        [field]: value,
        status: 'Active',
        ...additionalData
      });
      
      // Return the created document
      const newDocs = await this.findBy(field, value);
      return newDocs[0];
    } catch (error) {
      console.error('Error finding or creating ' + this.collectionName + ':', error);
      throw error;
    }
  }

  // Subscribe to real-time updates
  subscribe(callback, constraints = []) {
    const q = query(this.collection, ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    }, (error) => {
      console.error('Error subscribing to ' + this.collectionName + ':', error);
    });
  }

  // Get active items only
  async getActive() {
    return this.getAll([where('status', '==', 'Active')]);
  }

  // Subscribe to active items only
  subscribeToActive(callback) {
    return this.subscribe(callback, [where('status', '==', 'Active')]);
  }
}

// Create service instances for each collection
export const customerService = new FirebaseService('customers');
export const supplierService = new FirebaseService('suppliers');
export const carrierService = new FirebaseService('carriers');
export const truckService = new FirebaseService('trucks');
export const itemService = new FirebaseService('items');
export const sizeService = new FirebaseService('sizes');
export const bargeService = new FirebaseService('barges');
export const lotService = new FirebaseService('lots');
export const releaseService = new FirebaseService('releases');
export const staffService = new FirebaseService('staff');

// NEW: Elegant data model services
export const productService = new FirebaseService('products');
export const inventoryService = new FirebaseService('inventory');

// ELEGANT: Simplified barcode operations using Products + Inventory model
export const barcodeOperations = {
  async generateFromStaged(stagedData) {
    const results = [];
    
    for (const row of stagedData) {
      // Step 1: Create basic entities
      const supplier = await supplierService.findOrCreate('supplierName', row.supplierName);
      const customer = await customerService.findOrCreate('customerName', row.customerName);
      const item = await itemService.findOrCreate('itemCode', row.itemCode, {
        itemName: row.itemName
      });
      const size = await sizeService.findOrCreate('sizeName', row.sizeName, {
        sortOrder: 'ascending'
      });
      const barge = await bargeService.findOrCreate('bargeName', row.bargeName, {
        status: 'Expected',
        arrivalDateFormatted: new Date().toISOString().split('T')[0]
      });
      
      // Step 2: Create/find product (defines valid supplier+customer+item+size combination)
      const existingProducts = await productService.getAll([
        where('supplierId', '==', supplier.id),
        where('customerId', '==', customer.id),
        where('itemId', '==', item.id),
        where('sizeId', '==', size.id)
      ]);
      
      let product;
      if (existingProducts.length === 0) {
        const productRef = await productService.create({
          supplierId: supplier.id,
          customerId: customer.id,
          itemId: item.id,
          sizeId: size.id,
          standardWeight: parseInt(row.standardWeight),
          // Display fields for performance
          supplierName: supplier.supplierName,
          customerName: customer.customerName,
          itemCode: item.itemCode,
          itemName: item.itemName,
          sizeName: size.sizeName,
          status: 'Active'
        });
        
        // Get the created product
        const newProducts = await productService.getAll([
          where('supplierId', '==', supplier.id),
          where('customerId', '==', customer.id),
          where('itemId', '==', item.id),
          where('sizeId', '==', size.id)
        ]);
        product = newProducts[0];
      } else {
        product = existingProducts[0];
      }
      
      // Step 3: Create lot (simple lot tracking)
      let lot = await lotService.findOrCreate('lotNumber', row.lotNumber, {
        bargeId: barge.id,
        status: 'Active'
      });
      
      // Step 4: Create inventory entry (tracks actual available quantities)
      const inventoryRef = await inventoryService.create({
        productId: product.id,
        lotNumber: row.lotNumber,
        bargeId: barge.id,
        quantity: parseInt(row.quantity),
        quantityAvailable: parseInt(row.quantity), // Initially all available
        barcode: row.barcode,
        status: 'Available' // Available, Reserved, Shipped
      });
      
      results.push(inventoryRef);
    }
    
    return results;
  },
  
  // Helper method to get available inventory for a product
  async getAvailableInventory(productId) {
    return inventoryService.getAll([
      where('productId', '==', productId),
      where('status', '==', 'Available'),
      where('quantityAvailable', '>', 0)
    ]);
  }
};
