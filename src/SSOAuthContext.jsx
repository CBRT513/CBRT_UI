import { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithGoogle, signOutAll } from "./lib/firebase";
import { api } from "./lib/api";

const Ctx = createContext({ ready:false, user:null, role:null, login:async()=>{}, logout:async()=>{} });

export function SSOAuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user,  setUser]  = useState(null);
  const [role,  setRole]  = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => { 
      setUser(u); 
      setReady(true);
      
      // Fetch role from broker if SSO is enabled and user is signed in
      if (u && String(import.meta.env.VITE_ENABLE_SSO) === 'true') {
        try {
          const userData = await api('/cbrt/me');
          setRole(userData.role || 'viewer');
        } catch (err) {
          console.warn('Could not fetch user role:', err);
          setRole('viewer'); // Default to viewer if fetch fails
        }
      } else {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <Ctx.Provider value={{ ready, user, role, login: signInWithGoogle, logout: signOutAll }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
export default SSOAuthProvider;