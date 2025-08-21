// BOL Service - handles all BOL operations
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";

export const bolService = {
  
  // Generate next BOL number for a supplier
  async generateBOLNumber(supplierPrefix) {
    try {
      const bolsQuery = query(
        collection(db, "bols"),
        where("bolPrefix", "==", supplierPrefix),
        orderBy("bolNumber", "desc"),
        limit(1)
      );
      
      const snapshot = await getDocs(bolsQuery);
      let nextNumber = 1;
      
      if (!snapshot.empty) {
        const lastBOL = snapshot.docs[0].data();
        const lastNumber = parseInt(lastBOL.bolNumber.replace(supplierPrefix, ""));
        nextNumber = lastNumber + 1;
      }
      
      return supplierPrefix + nextNumber.toString().padStart(5, "0");
    } catch (error) {
      console.error("Error generating BOL number:", error);
      throw error;
    }
  },

  // Create new BOL
  async createBOL(bolData) {
    try {
      const docRef = await addDoc(collection(db, "bols"), {
        ...bolData,
        status: "Generated",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return docRef.id;
    } catch (error) {
      console.error("Error creating BOL:", error);
      throw error;
    }
  },

  // Update BOL
  async updateBOL(bolId, updates) {
    try {
      await updateDoc(doc(db, "bols", bolId), {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating BOL:", error);
      throw error;
    }
  },

  // Void BOL
  async voidBOL(bolId) {
    try {
      await updateDoc(doc(db, "bols", bolId), {
        status: "Voided",
        voidedAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error voiding BOL:", error);
      throw error;
    }
  }
};
