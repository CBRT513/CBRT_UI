// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAfFS_p_a_tZNTzoFZN7u7k4pA8FYdVkLk",
    authDomain: "cbrt-app-ui-dev.firebaseapp.com",
    projectId: "cbrt-app-ui-dev",
    storageBucket: "cbrt-app-ui-dev.firebasestorage.app",
    messagingSenderId: "1087116999170",
    appId: "1:1087116999170:web:e99afb7f4d076f8d75051b",
    measurementId: "G-0ZEBLX6VX0"
  };

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);