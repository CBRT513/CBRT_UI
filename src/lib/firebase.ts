import { initializeApp, getApps } from "firebase/app";
import { getAuth, onIdTokenChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);

let refreshTimer: number | undefined;

export async function getIdToken(): Promise<string | null> {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
}

function scheduleRefresh() {
  if (!auth.currentUser) return;
  auth.currentUser.getIdTokenResult().then(res => {
    const expMs = res.expirationTime ? new Date(res.expirationTime).getTime() : Date.now() + 55*60*1000;
    const delay = Math.max(1000, expMs - Date.now() - 5*60*1000);
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(async () => {
      try { await auth.currentUser?.getIdToken(true); } finally { scheduleRefresh(); }
    }, delay);
  }).catch(() => {});
}

onIdTokenChanged(auth, async (u) => {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  if (u) { await u.getIdToken(true); scheduleRefresh(); }
});

export async function signInWithGoogle() {
  const prov = new GoogleAuthProvider();
  await signInWithPopup(auth, prov);
}

export async function signOutAll() {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  await auth.signOut();
}