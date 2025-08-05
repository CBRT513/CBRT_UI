// Clear Firestore utility
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

export const clearCollection = async (collectionName) => {
  console.log("Clearing collection:", collectionName);
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const deletePromises = querySnapshot.docs.map(document => 
      deleteDoc(doc(db, collectionName, document.id))
    );
    
    await Promise.all(deletePromises);
    console.log("Cleared", querySnapshot.docs.length, "documents from", collectionName);
    return querySnapshot.docs.length;
  } catch (error) {
    console.error("Error clearing", collectionName, error);
    throw error;
  }
};

export const clearAllCollections = async () => {
  const collections = [
    "stagedBarcodes",
    "barcodes", 
    "products",
    "inventory",
    "lots",
    "barges",
    "sizes",
    "items",
    "customers",
    "suppliers",
    "carriers",
    "trucks",
    "releases"
  ];
  
  console.log("Starting to clear all collections...");
  const results = {};
  
  for (const collectionName of collections) {
    try {
      const deletedCount = await clearCollection(collectionName);
      results[collectionName] = deletedCount;
    } catch (error) {
      results[collectionName] = "Error: " + error.message;
    }
  }
  
  console.log("Clear results:", results);
  return results;
};

export const clearTestingData = async () => {
  const collections = [
    "barcodes",
    "barges", 
    "items",
    "lots",
    "products",
    "inventory",
    "sizes"
  ];
  
  console.log("Starting to clear testing collections...");
  const results = {};
  
  for (const collectionName of collections) {
    try {
      const deletedCount = await clearCollection(collectionName);
      results[collectionName] = deletedCount;
    } catch (error) {
      results[collectionName] = "Error: " + error.message;
    }
  }
  
  console.log("Clear testing results:", results);
  return results;
};
