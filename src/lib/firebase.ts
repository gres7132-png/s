// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For more information on how to get this, visit:
// https://firebase.google.com/docs/web/setup#available-libraries

// IMPORTANT: This configuration is now connected to your Firebase project.
export const firebaseConfig = {"apiKey":"AIzaSyDnFrJWS2t_05w8i3rLen8UXK6nP8eNY1g","authDomain":"fundflow-wzhal.firebaseapp.com","projectId":"fundflow-wzhal","storageBucket":"fundflow-wzhal.appspot.com","messagingSenderId":"231100893920","appId":"1:231100893920:web:1a2b3c4d5e6f7g8h9i0j"};

// Initialize Firebase for client-side usage
// This pattern prevents re-initializing the app on every hot-reload
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
