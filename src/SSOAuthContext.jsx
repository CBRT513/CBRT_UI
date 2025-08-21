import { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithGoogle, signOutAll } from "./lib/firebase";

const Ctx = createContext({ ready:false, user:null, role:null, login:async()=>{}, logout:async()=>{} });

export function SSOAuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user,  setUser]  = useState(null);
  const [role,  setRole]  = useState(null); // Optional: wire /me later

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => { setUser(u); setReady(true); });
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