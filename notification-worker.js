import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getDatabase } from "firebase-admin/database";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://doctor-8edc6-default-rtdb.firebaseio.com/"
});

const db = getDatabase(app);
const messaging = getMessaging(app);

console.log("🚀 Medicine Notification Background Worker Started...");

// Helper: Convert YYYY-MM-DD or timestamp to a clean midnight Date object in IST
function getISTDateOnly(dateInput) {
  let d;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('-').map(Number);
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(dateInput);
  }
  
  // Shift to IST offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(d.getTime() + istOffset + (d.getTimezoneOffset() * 60000));
  return new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
}

async function runWorker() {
  try {
    const rootSnapshot = await db.ref("/").once("value");
    if (!rootSnapshot.exists()) {
      console.log("❌ Database root is empty.");
      await db.goOffline();
      process.exit(0);
    }

    const data = rootSnapshot.val();
    const patients = data.patients || {};

    let allPrescriptions = [];

    // Root level entries ko scan karo
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && val.medicines && val.patientId) {
        allPrescriptions.push(val);
      }
    }

    if (data.prescriptions) {
      const pList = Array.isArray(data.prescriptions) ? data.prescriptions : Object.values(data.prescriptions);
      allPrescriptions.push(...pList.filter(Boolean));
    }
    if (data.clinic?.prescriptions) {
      const cList = Array.isArray(data.clinic.prescriptions) ? data.clinic.prescriptions : Object.values(data.clinic.prescriptions);
      allPrescriptions.push(...cList.filter(Boolean));
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset + (now.getTimezoneOffset() * 60000));

    const currentH = istDate.getHours();
    const currentM = String(istDate.getMinutes()).padStart(2, "0");
    const isPM = currentH >= 12;
    const h12 = currentH % 12 || 12;
    const h12Str = String(h12).padStart(2, "0");
    const ampm = isPM ? "PM" : "AM";

    const format24 = `${String(currentH).padStart(2, "0")}:${currentM}`;
    const format12 = `${h12Str}:${currentM} ${ampm}`;
    
    // Today's Date String for unique notification tracking (YYYY-MM-DD)
    const todayDateStr = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;

    console.log(`⏰ Current IST Time checked: ${format24} / ${format12} on ${todayDateStr}`);
    console.log(`📦 Total prescriptions found: ${allPrescriptions.length}`);

    for (const rx of allPrescriptions) {
      if (!rx || !rx.medicines) continue;
      
      const patientId = rx.patientId || rx.clientId;
      const patientObj = patients[patientId] || {};
      const fcmToken = patientObj.fcmToken || rx.fcmToken;

      if (!fcmToken) {
        console.log(`⚠️ Skipping prescription: No FCM token found for patient ${patientId}`);
        continue;
      }

      // Check Prescription Duration Validity
      const rxStartDate = getISTDateOnly(rx.date || rx.createdAt);
      const todayMidnight = new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate());
      
      const diffTime = todayMidnight.getTime() - rxStartDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Agar prescription future ki hai ya purani ho chuki hai toh skip karo
      if (diffDays < 0) {
        console.log(`⏳ Skipping Rx ${rx.id}: Prescription start date is in the future.`);
        continue;
      }

      const medList = Array.isArray(rx.medicines) ? rx.medicines : Object.values(rx.medicines);

      for (const med of medList) {
        if (!med || !med.times) continue;

        // Check if today falls within med's prescribed durationDays (default to 5 if not specified)
        const durationDays = Number(med.durationDays) || 5;
        if (diffDays >= durationDays) {
          console.log(`🛑 Medicine '${med.name}' course completed (${diffDays} days passed of ${durationDays} days duration). Skipping.`);
          continue;
        }

        const timesArray = Array.isArray(med.times) ? med.times : Object.values(med.times);

        for (const t of timesArray) {
          if (!t) continue;
          const cleanTime = String(t).trim().toUpperCase();

          if (cleanTime === format24 || cleanTime === format12) {
            // Deduplication Check: Ensure 1 notification per medicine per time slot per day
            const sentLogRef = db.ref(`notificationLogs/${patientId}/${rx.id}/${med.id || 'med'}/${todayDateStr}/${cleanTime.replace(':', '-')}`);
            const logSnapshot = await sentLogRef.once("value");

            if (logSnapshot.exists()) {
              console.log(`ℹ️ Notification already sent today for '${med.name}' at ${cleanTime}. Skipping duplicate.`);
              continue;
            }

            const slots = [];
            if (med.dosageSlots?.breakfast) slots.push("Breakfast");
            if (med.dosageSlots?.lunch) slots.push("Lunch");
            if (med.dosageSlots?.dinner) slots.push("Dinner");
            const doseLabel = slots.join("/") || "1 Dose";

            const timingText = med.timing === "before" ? "Before food" : "After food";
            const descText = med.description ? `Note: ${med.description}` : "";
            const bodyText = `Time to take ${doseLabel} (${timingText}). ${descText}`.trim();

            const message = {
              notification: {
                title: `⏰ Medicine Reminder: ${med.name}`,
                body: bodyText,
              },
              token: fcmToken,
            };

            try {
              const response = await messaging.send(message);
              console.log(`✅ Push sent successfully for ${med.name} to patient ${patientId}. Response:`, response);
              
              // Mark as sent in Firebase Realtime Database to prevent duplicate triggers in the same minute
              await sentLogRef.set({
                sentAt: Date.now(),
                time: cleanTime
              });
            } catch (error) {
              console.error(`❌ Error sending push for ${med.name}:`, error);
            }
          }
        }
      }
    }

    console.log("🏁 Worker execution finished successfully.");
    await db.goOffline();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error in worker execution:", err);
    await db.goOffline();
    process.exit(1);
  }intValue
}

runWorker();
