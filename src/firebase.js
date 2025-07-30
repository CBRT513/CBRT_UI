import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAfFS_p_a_tZNTzoFZN7u7k4pA8FYdVkLk",
  authDomain: "cbrt-app-ui-dev.firebaseapp.com",
  projectId: "cbrt-app-ui-dev",
  storageBucket: "cbrt-app-ui-dev.appspot.com",
  messagingSenderId: "1087116999170",
  appId: "1:1087116999170:web:e99afb7f4d076f8d75051b",
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
