// src/services/fcm.ts
import { getToken } from "firebase/messaging";
import { ref, update } from "firebase/database";

export async function requestAndSaveFCMToken(patientId: string, dbInstance: any, messagingInstance: any) {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messagingInstance, {
        vapidKey: 'BCbxydIkLapMbo5TbepT1UwT_QLLmZbdDN4H_en_0BgjPhAxLjVrsEzk3eJrYZ_1kiswjey_9ipRHRdgDhmaApc'
      });
      
      if (token && patientId) {
        await update(ref(dbInstance, `patients/${patientId}`), {
          fcmToken: token
        });
        console.log("FCM Token saved successfully:", token);
      }
    } else {
      console.log('Notification permission denied.');
    }
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
  }
}
