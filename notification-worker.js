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

console.log("🚀 Medicine Notification Background Worker Started...");

async function runWorker() {
  try {
    const rootSnapshot = await db.ref("/").once("value");
    if (!rootSnapshot.exists()) {
      console.log("❌ Database root is empty.");
      process.exit(0);
    }

    const data = rootSnapshot.val();
    const patients = data.patients || {};

    // Collect all prescriptions from everywhere in the DB (root level objects, prescriptions node, patient nodes)
    let allPrescriptions = [];
    
    // 1. Check root level objects (e.g., rx-... keys directly at root)
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val.medicines || val.patientId || key.startsWith('rx-'))) {
        allPrescriptions.push(val);
      }
    }

    // 2. Check explicit prescriptions node if exists
    if (data.prescriptions) {
      const pNode = Array.isArray(data.prescriptions) ? data.prescriptions : Object.values(data.prescriptions);
      allPrescriptions.push(...pNode);
    }

    // 3. Check inside each patient node
    for (const [patientId, patientData] of Object.entries(patients)) {
      if (patientData.prescriptions) {
        const pList = Array.isArray(patientData.prescriptions) ? patientData.prescriptions : Object.values(patientData.prescriptions);
        allPrescriptions.push(...pList);
      }
    }

    const now = new Date();
    // IST Offset adjustment (+5:30)
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

    console.log(`⏰ Current IST Time checked: ${format24} / ${format12}`);
    console.log(`📦 Total prescriptions found across DB: ${allPrescriptions.length}`);

    for (const rx of allPrescriptions) {
      if (!rx || !rx.medicines) continue;
      
      const patientId = rx.patientId || rx.clientId;
      const patientData = patients[patientId] || {};
      const fcmToken = patientData.fcmToken || rx.fcmToken;

      if (!fcmToken) {
        console.log(`⚠️ No FCM token found for prescription/patient: ${patientId}`);
        continue;
      }

      const medList = Array.isArray(rx.medicines) ? rx.medicines : Object.values(rx.medicines);

      for (const [medIdx, med] of medList.entries()) {
        const timesArray = med.times || (med.time ? [med.time] : []);
        if (!Array.isArray(timesArray)) continue;

        for (const t of timesArray) {
          if (!t) continue;
          const cleanTime = String(t).trim().toUpperCase();

          console.log(`🔍 Checking medicine '${med.name}' scheduled at '${cleanTime}' against current time '${format24}' / '${format12}'`);

          if (cleanTime === format24 || cleanTime === format12) {
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
              console.log(`✅ Push sent successfully for ${med.name} at ${cleanTime}. Response:`, response);
            } catch (error) {
              console.error(`❌ Error sending push for ${med.name}:`, error);
            }
          }
        }
      }
    }

    console.log("🏁 Worker execution finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error in worker execution:", err);
    process.exit(1);
  }
}

runWorker();
