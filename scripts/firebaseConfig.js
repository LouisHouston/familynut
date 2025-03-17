import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Correct import for Firestore

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOM,
  projectId:  process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket:  process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
  measurementId:  process.env.measurementId
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
//const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);


export { db, auth };
