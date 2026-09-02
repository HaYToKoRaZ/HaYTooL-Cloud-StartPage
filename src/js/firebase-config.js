import { initializeApp } from '../lib/firebase/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from '../lib/firebase/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from '../lib/firebase/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAmAQjLcdlpwDWaAM7TAmORs0qWHFw8dcE",
  authDomain: "haytool-startpage-v4.firebaseapp.com",
  projectId: "haytool-startpage-v4",
  storageBucket: "haytool-startpage-v4.firebasestorage.app",
  messagingSenderId: "2909602953",
  appId: "1:2909602953:web:d6accc61f831c5af543258"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot };
