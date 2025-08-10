// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 🔐 Firebase config — use your own keys if different
const firebaseConfig = {
  apiKey: 'AIzaSyAfFS_p_a_tZNTzoFZN7u7k4pA8FYdVkLk',
  authDomain: 'cbrt-app-ui-dev.firebaseapp.com',
  projectId: 'cbrt-app-ui-dev',
  storageBucket: 'cbrt-app-ui-dev.firebasestorage.app',  // FIXED: Correct bucket name
  messagingSenderId: '1087116999170',
  appId: '1:1087116999170:web:e99afb7f4d076f8d75051b',
  measurementId: 'G-0ZEBLX6VX0',
};

// 🚀 Initialize
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);