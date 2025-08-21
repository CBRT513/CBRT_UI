import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { api } from '../lib/api';

export const listReleasesByStatus = async (status) => {
  // Check SSO flag and route to API if enabled
  if (String(import.meta.env.VITE_ENABLE_SSO) === "true") {
    const result = await api(`/cbrt/releases?status=${status}`);
    return result.items || [];
  }
  
  // Legacy Firestore path
  try {
    const releasesRef = collection(db, 'releases');
    const q = query(
      releasesRef, 
      where('status', '==', status)
    );
    
    const snapshot = await getDocs(q);
    
    const releases = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        number: data.number || data.ReleaseNumber || data.releaseNumber || doc.id,
        customerName: data.customerName || data.customer?.name || 'Unknown',
        shipToName: data.shipToName || data.shipTo?.name || '',
        status: data.status,
        statusChangedAt: data.statusChangedAt || data.updatedAt || data.createdAt,
        stagingLocation: data.stagingLocation,
        stagedBy: data.stagedBy,
        verifiedBy: data.verifiedBy,
        loadedAt: data.loadedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        attachments: data.attachments || {},
        carrierMode: data.carrierMode
      };
    });
    
    // Sort by statusChangedAt in JavaScript since Firestore may not have the index
    return releases.sort((a, b) => {
      const dateA = a.statusChangedAt?.toDate ? a.statusChangedAt.toDate() : new Date(a.statusChangedAt);
      const dateB = b.statusChangedAt?.toDate ? b.statusChangedAt.toDate() : new Date(b.statusChangedAt);
      return dateA - dateB;
    });
  } catch (error) {
    console.error('Error fetching releases by status:', error);
    return [];
  }
};

export const getReleaseById = async (releaseId) => {
  // Check SSO flag and route to API if enabled
  if (String(import.meta.env.VITE_ENABLE_SSO) === "true") {
    return api(`/cbrt/releases/${releaseId}`);
  }
  
  // Legacy Firestore path
  try {
    const releaseRef = doc(db, 'releases', releaseId);
    const releaseSnap = await getDoc(releaseRef);
    
    if (!releaseSnap.exists()) {
      throw new Error('Release not found');
    }
    
    const data = releaseSnap.data();
    return {
      id: releaseSnap.id,
      ...data,
      statusChangedAt: data.statusChangedAt || data.updatedAt || data.createdAt
    };
  } catch (error) {
    console.error('Error fetching release:', error);
    throw error;
  }
};