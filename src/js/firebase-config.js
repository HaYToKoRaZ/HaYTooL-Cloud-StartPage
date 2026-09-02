import { initializeApp } from '../lib/firebase/firebase-app.js';
import { getAuth, GithubAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from '../lib/firebase/firebase-auth-web-extension.js';
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from '../lib/firebase/firebase-firestore.js';

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
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export { app, auth, db, GithubAuthProvider, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot };
