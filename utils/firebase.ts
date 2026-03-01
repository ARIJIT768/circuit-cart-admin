import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRNNlic6Wn0JwESvCweDPdYIGLxgrRB6c",
  authDomain: "circuit-cart-8722c.firebaseapp.com",
  projectId: "circuit-cart-8722c",
  storageBucket: "circuit-cart-8722c.firebasestorage.app",
  messagingSenderId: "14712627049",
  appId: "1:14712627049:web:32246d6a7eba33b10467f8",
  measurementId: "G-7HV1GQBV32"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export the services so your Admin pages can use them!
export const db = getFirestore(app);
export const auth = getAuth(app);