import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken } from "firebase/messaging";

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
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export async function getFCMToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'BCbxydIkLapMbo5TbepT1UwT_QLLmZbdDN4H_en_0BgjPhAxLjVrsEzk3eJrYZ_1kiswjey_9ipRHRdgDhmaApc'
    });
    if (currentToken) {
      console.log('FCM Device Token acquired:', currentToken);
      return currentToken;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
}
