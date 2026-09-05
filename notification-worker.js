import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getDatabase } from "firebase-admin/database";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://doctor-8edc6-default-rtdb.firebaseio.com/"
});

const db = getDatabase();
const messaging = getMessaging();

const sentAlarms = new Set();
console.log("🚀 Medicine Notification Background Worker Started...");

setInterval(async () => {
  try {
    const rootSnapshot = await db.ref("/").once("value");
    if (!rootSnapshot.exists()) return;

    const data = rootSnapshot.val();
    const patients = data.patients || {};
    const prescriptionsNode = data.prescriptions || data.clinic?.prescriptions || {};

    const now = new Date();
    const currentH = now.getHours();
    const currentM = String(now.getMinutes()).padStart(2, '0');
    const isPM = currentH >= 12;
    const h12 = currentH % 12 || 12;
    const h12Str = String(h12).padStart(2, '0');
    const ampm = isPM ? 'PM' : 'AM';

    const format24 = `${String(currentH).padStart(2, '0')}:${currentM}`;
    const format12 = `${h12Str}:${currentM} ${ampm}`;
    const todayDateStr = now.toISOString().split('T')[0];

    if (now.getMinutes() === 0) {
      sentAlarms.clear();
    }

    // Har patient ke liye independent check
    for (const [patientId, patientData] of Object.entries(patients)) {
      const fcmToken = patientData.fcmToken;
      if (!fcmToken) continue; // Agar token nahi hai toh skip karo

      // Sirf is specific patient ki prescriptions filter karo
      const patientPrescriptions = 
        patientData.prescriptions || 
        patientData.clinic?.prescriptions || 
        Object.values(prescriptionsNode).filter(rx => rx.patientId === patientId || rx.clientId === patientId);

      if (!patientPrescriptions) continue;

      const rxList = Array.isArray(patientPrescriptions) 
        ? patientPrescriptions 
        : Object.values(patientPrescriptions);

      rxList.forEach((rx) => {
        if (!rx.medicines) return;

        rx.medicines.forEach((med, medIdx) => {
          const timesArray = med.times || (med.time ? [med.time] : []);
          if (!Array.isArray(timesArray)) return;

          timesArray.forEach((t) => {
            if (!t) return;
            const cleanTime = String(t).trim().toUpperCase();
            const alarmKey = `${patientId}-${rx.id || medIdx}-${cleanTime}-${todayDateStr}`;

            if (
              (cleanTime === format24 || cleanTime === format12) &&
              !sentAlarms.has(alarmKey)
            ) {
              const slots = [];
              if (med.dosageSlots?.breakfast) slots.push('Breakfast');
              if (med.dosageSlots?.lunch) slots.push('Lunch');
              if (med.dosageSlots?.dinner) slots.push('Dinner');
              const doseLabel = slots.join('/') || '1 Dose';

              const message = {
                notification: {
                  title: `⏰ Medicine Reminder: ${med.name}`,
                  body: `Time to take ${doseLabel} (${med.timing === 'before' ? 'Before food' : 'After food'}). ${med.description ? `Note: ${med.description}` : ''}`
                },
                token: fcmToken // Target token strictly ishi patient ka hai
              };

              messaging.send(message)
                .then((response) => {
                  console.log(`✅ Push sent to patient ${patientId} (${patientData.name}) for ${med.name} at ${cleanTime}`);
                  sentAlarms.add(alarmKey);
                })
                .catch((error) => {
                  console.error(`❌ Error sending push to ${patientId}:`, error);
                });
            }
          });
        });
      });
    }
  } catch (err) {
    console.error("Error in worker polling loop:", err);
  }
}, 30000);


