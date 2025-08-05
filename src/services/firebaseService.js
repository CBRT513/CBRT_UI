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
        Status: 'Active',
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
    return this.getAll([where('Status', '==', 'Active')]);
  }

  // Subscribe to active items only
  subscribeToActive(callback) {
    return this.subscribe(callback, [where('Status', '==', 'Active')]);
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
      const supplier = await supplierService.findOrCreate('SupplierName', row.SupplierName);
      const customer = await customerService.findOrCreate('CustomerName', row.CustomerName);
      const item = await itemService.findOrCreate('ItemCode', row.ItemCode, {
        ItemName: row.ItemName
      });
      const size = await sizeService.findOrCreate('SizeName', row.SizeName, {
        SortOrder: 'ascending'
      });
      const barge = await bargeService.findOrCreate('BargeName', row.BargeName, {
        Status: 'Expected',
        ArrivalDateFormatted: new Date().toISOString().split('T')[0]
      });
      
      // Step 2: Create/find product (defines valid supplier+customer+item+size combination)
      const existingProducts = await productService.getAll([
        where('SupplierId', '==', supplier.id),
        where('CustomerId', '==', customer.id),
        where('ItemId', '==', item.id),
        where('SizeId', '==', size.id)
      ]);
      
      let product;
      if (existingProducts.length === 0) {
        const productRef = await productService.create({
          SupplierId: supplier.id,
          CustomerId: customer.id,
          ItemId: item.id,
          SizeId: size.id,
          StandardWeight: parseInt(row.StandardWeight),
          // Display fields for performance
          SupplierName: supplier.SupplierName,
          CustomerName: customer.CustomerName,
          ItemCode: item.ItemCode,
          ItemName: item.ItemName,
          SizeName: size.SizeName,
          Status: 'Active'
        });
        
        // Get the created product
        const newProducts = await productService.getAll([
          where('SupplierId', '==', supplier.id),
          where('CustomerId', '==', customer.id),
          where('ItemId', '==', item.id),
          where('SizeId', '==', size.id)
        ]);
        product = newProducts[0];
      } else {
        product = existingProducts[0];
      }
      
      // Step 3: Create lot (simple lot tracking)
      let lot = await lotService.findOrCreate('LotNumber', row.LotNumber, {
        BargeId: barge.id,
        Status: 'Active'
      });
      
      // Step 4: Create inventory entry (tracks actual available quantities)
      const inventoryRef = await inventoryService.create({
        ProductId: product.id,
        LotNumber: row.LotNumber,
        BargeId: barge.id,
        Quantity: parseInt(row.Quantity),
        QuantityAvailable: parseInt(row.Quantity), // Initially all available
        Barcode: row.Barcode,
        Status: 'Available' // Available, Reserved, Shipped
      });
      
      results.push(inventoryRef);
    }
    
    return results;
  },
  
  // Helper method to get available inventory for a product
  async getAvailableInventory(productId) {
    return inventoryService.getAll([
      where('ProductId', '==', productId),
      where('Status', '==', 'Available'),
      where('QuantityAvailable', '>', 0)
    ]);
  }
};
