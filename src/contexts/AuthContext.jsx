// Role-based Authentication Context for CBRT UI
// Supports: Email/Password, Google Auth
// Anonymous only enabled in dev with VITE_ENABLE_ANON=true

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { logger } from '../utils/logger';

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  OFFICE: 'office', 
  LOADER: 'loader',
  VIEWER: 'viewer'
};

// Role permissions matrix
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    crudMasters: true,      // customers, items, sizes, suppliers
    crudReleases: true,     // create/edit releases
    advanceStaged: true,    // Staged → Loaded
    verifyReleases: true,   // verify releases
    viewBarcodes: true,     // view barcode data
    editBarcodes: true,     // edit barcode data
    viewUmsEvents: true,    // view UMS events
    manageStaff: true       // manage staff records
  },
  [ROLES.OFFICE]: {
    crudMasters: true,
    crudReleases: true,
    advanceStaged: true,
    verifyReleases: true,
    viewBarcodes: true,
    editBarcodes: false,
    viewUmsEvents: true,
    manageStaff: false
  },
  [ROLES.LOADER]: {
    crudMasters: false,
    crudReleases: false,
    advanceStaged: true,    // Can move Staged → Loaded
    verifyReleases: false,
    viewBarcodes: true,     // Read-only barcode access
    editBarcodes: false,
    viewUmsEvents: false,
    manageStaff: false
  },
  [ROLES.VIEWER]: {
    crudMasters: false,
    crudReleases: false,
    advanceStaged: false,
    verifyReleases: false,
    viewBarcodes: true,     // Read-only access
    editBarcodes: false,
    viewUmsEvents: false,
    manageStaff: false
  }
};

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if anonymous auth is enabled (dev only)
  const isAnonEnabled = import.meta.env.VITE_ENABLE_ANON === 'true';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      logger.info('Auth state changed', { 
        hasUser: !!firebaseUser,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email 
      });

      if (firebaseUser) {
        try {
          // Get user role and profile from staff collection
          const userProfile = await getUserProfile(firebaseUser);
          
          const userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            ...userProfile
          };

          setUser(userData);
          logger.setUserContext(userData);
          
          logger.info('User authenticated successfully', {
            role: userData.role,
            email: userData.email
          });
        } catch (err) {
          logger.error('Failed to get user profile', err);
          setError('Failed to load user profile');
          setUser(null);
        }
      } else {
        setUser(null);
        logger.setUserContext({ id: 'anonymous', role: 'none', email: 'none' });
        logger.info('User signed out');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const getUserProfile = async (firebaseUser) => {
    try {
      // Try to get profile from staff collection first
      const staffDocRef = doc(db, 'staff', firebaseUser.uid);
      const staffDoc = await getDoc(staffDocRef);
      
      if (staffDoc.exists()) {
        const staffData = staffDoc.data();
        return {
          role: staffData.role || ROLES.VIEWER,
          name: staffData.name || staffData.displayName,
          phone: staffData.phone,
          receiveNewRelease: staffData.receiveNewRelease || false
        };
      }
      
      // Fallback: check for admin by email
      const adminEmails = ['admin@cbrt.com', 'office@cbrt.com'];
      if (adminEmails.includes(firebaseUser.email)) {
        return {
          role: ROLES.ADMIN,
          name: firebaseUser.displayName || 'Admin',
          phone: null,
          receiveNewRelease: false
        };
      }
      
      // Default to viewer role
      logger.warn('User not found in staff collection, defaulting to viewer', {
        email: firebaseUser.email,
        uid: firebaseUser.uid
      });
      
      return {
        role: ROLES.VIEWER,
        name: firebaseUser.displayName || 'Guest',
        phone: null,
        receiveNewRelease: false
      };
    } catch (err) {
      logger.error('Error fetching user profile', err);
      return {
        role: ROLES.VIEWER,
        name: 'Guest',
        phone: null,
        receiveNewRelease: false
      };
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      logger.info('Email sign-in successful', { email });
      
      return result;
    } catch (err) {
      logger.error('Email sign-in failed', err);
      setError(err.message);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      logger.info('Google sign-in successful', { email: result.user.email });
      
      return result;
    } catch (err) {
      logger.error('Google sign-in failed', err);
      setError(err.message);
      throw err;
    }
  };

  const signInAnonymous = async () => {
    if (!isAnonEnabled) {
      throw new Error('Anonymous auth is disabled in production');
    }
    
    try {
      setError(null);
      setLoading(true);
      
      const result = await signInAnonymously(auth);
      logger.info('Anonymous sign-in successful');
      
      return result;
    } catch (err) {
      logger.error('Anonymous sign-in failed', err);
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      logger.info('User signed out successfully');
    } catch (err) {
      logger.error('Sign out failed', err);
      throw err;
    }
  };

  // Permission checking utilities
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    return PERMISSIONS[user.role]?.[permission] || false;
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const canAccessRoute = (routePath) => {
    if (!user) return false;
    
    // Define route access rules
    const routeAccess = {
      '/': true, // Home accessible to all authenticated users
      '/new-release': hasPermission('crudReleases'),
      '/releases': true, // All can view releases (filtered by role in security rules)
      '/customers': hasPermission('crudMasters') || hasPermission('viewBarcodes'),
      '/suppliers': hasPermission('crudMasters') || hasPermission('viewBarcodes'),
      '/items': hasPermission('crudMasters') || hasPermission('viewBarcodes'),
      '/sizes': hasPermission('crudMasters') || hasPermission('viewBarcodes'),
      '/barcodes': hasPermission('viewBarcodes'),
      '/staff': hasPermission('manageStaff'),
      '/staging': hasPermission('advanceStaged'),
      '/verification': hasPermission('verifyReleases'),
      '/loading': hasPermission('advanceStaged')
    };
    
    return routeAccess[routePath] !== false;
  };

  const value = {
    user,
    loading,
    error,
    signInWithEmail,
    signInWithGoogle,
    signInAnonymous: isAnonEnabled ? signInAnonymous : null,
    signOut,
    hasPermission,
    hasRole,
    hasAnyRole,
    canAccessRoute,
    roles: ROLES,
    permissions: PERMISSIONS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;