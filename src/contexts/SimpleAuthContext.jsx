import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL params (from auth portal redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const uid = params.get('uid');
    const email = params.get('email');
    const claims = params.get('claims');
    
    if (token) {
      // Parse claims if provided
      let parsedClaims = {};
      try {
        if (claims) parsedClaims = JSON.parse(claims);
      } catch (e) {
        console.error('Failed to parse claims:', e);
      }
      
      // Store token and user info
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', uid);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userClaims', JSON.stringify(parsedClaims));
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setCurrentUser({ uid, email, token, claims: parsedClaims });
    } else {
      // Check for existing token
      const storedToken = localStorage.getItem('authToken');
      const storedUid = localStorage.getItem('userId');
      const storedEmail = localStorage.getItem('userEmail');
      const storedClaims = localStorage.getItem('userClaims');
      
      if (storedToken) {
        let parsedClaims = {};
        try {
          if (storedClaims) parsedClaims = JSON.parse(storedClaims);
        } catch (e) {
          console.error('Failed to parse stored claims:', e);
        }
        
        setCurrentUser({ 
          uid: storedUid, 
          email: storedEmail, 
          token: storedToken,
          claims: parsedClaims
        });
      }
    }
    
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userClaims');
    setCurrentUser(null);
    
    // Redirect to auth portal
    const authPortalUrl = import.meta.env.VITE_AUTH_PORTAL_URL || 'https://sso.test';
    window.location.href = authPortalUrl;
  };

  const value = {
    currentUser,
    userRole: 'operator', // Default role
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}