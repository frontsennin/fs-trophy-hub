import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB5DWQpgrOSSjeaByKxYyiyegzNu68E72k",
  authDomain: "fs-trophy-hub.firebaseapp.com",
  projectId: "fs-trophy-hub",
  storageBucket: "fs-trophy-hub.firebasestorage.app",
  messagingSenderId: "896717126794",
  appId: "1:896717126794:web:479e0337366c5b80a18173",
  measurementId: "G-7D4E3XQYQH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
