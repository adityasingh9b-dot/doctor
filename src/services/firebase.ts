import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC37QeZkmFsl9NNik9kuktlkftkuWykgYE",
  authDomain: "doctor-8edc6.firebaseapp.com",
  databaseURL: "https://doctor-8edc6-default-rtdb.firebaseio.com/",
  projectId: "doctor-8edc6",
  storageBucket: "doctor-8edc6.firebasestorage.app",
  messagingSenderId: "12849007676",
  appId: "1:12849007676:web:a049a76c627e3392aa8739",
  measurementId: "G-HY2JG0C4B9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
