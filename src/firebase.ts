import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#config-object

const firebaseConfig = {
    apiKey: "AIzaSyCCxOS3b4K5v6kEl8CmA1n1qKZdAZN6CTI",
    authDomain: "pm-interview-buddy.firebaseapp.com",
    projectId: "pm-interview-buddy",
    storageBucket: "pm-interview-buddy.firebasestorage.app",
    messagingSenderId: "128172581700",
    appId: "1:128172581700:web:20a8ed830ad8f184b92d11",
    measurementId: "G-S9WXE2MZ78"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Export app for use with other Firebase services (Functions, etc.)
export { app };

export default app;
