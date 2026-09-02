import { initializeApp } from '../lib/firebase/firebase-app.js';
import { getAuth, GithubAuthProvider, signInWithPopup, signInWithCredential, signOut, onAuthStateChanged } from '../lib/firebase/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from '../lib/firebase/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAC68Qs2ct4TW8i1TS_G2gNVaw9ur4Cyr0",
  authDomain: "haytool-cloud-startpage-github.firebaseapp.com",
  projectId: "haytool-cloud-startpage-github",
  storageBucket: "haytool-cloud-startpage-github.firebasestorage.app",
  messagingSenderId: "524900247283",
  appId: "1:524900247283:web:7905a99380660ec3adf986",
  measurementId: "G-L4B22FC4Z3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, GithubAuthProvider, signInWithPopup, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot };
