// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore/lite";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth/web-extension";
import { exp } from "firebase/firestore/pipelines";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAkEIkCPX-5dxyG3IUePv5yuv_5zTT7hZY",
    authDomain: "retone-message-app.firebaseapp.com",
    projectId: "retone-message-app",
    storageBucket: "retone-message-app.firebasestorage.app",
    messagingSenderId: "455664691448",
    appId: "1:455664691448:web:d8ad85215d9456f681330d",
    measurementId: "G-GKYZQ3NRTN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, db };