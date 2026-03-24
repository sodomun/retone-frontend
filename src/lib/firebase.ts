// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA4pOZqWrcu0FLWD3x7hu7-XoKl9sHi_Tw",
    authDomain: "retone-chat-app.firebaseapp.com",
    projectId: "retone-chat-app",
    storageBucket: "retone-chat-app.firebasestorage.app",
    messagingSenderId: "890542908922",
    appId: "1:890542908922:web:e6bff0bc1a799ada563043",
    measurementId: "G-STW2B96W6B"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, db };