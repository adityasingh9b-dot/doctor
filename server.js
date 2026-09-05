import express from "express";
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
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 Medicine Notification Worker is running live!");
});

// Background check function running every 1 minute
async function checkAndSendReminders() {
  try {
    const rootSnapshot = await db.ref("/").once("value");
    if (!rootSnapshot.exists()) return;

    const data = rootSnapshot.val();
    const patients = data.patients || {};
    const allPrescriptions = [];

    for (const [, val] of Object.entries(data)) {
      if (val && typeof val === "object" && val.medicines && (val.patientId || val.clientId)) {
        allPrescriptions.push(val);
      }
    }

    if (data.clinic?.prescriptions) {
      const cList = Array.isArray(data.clinic.prescriptions) ? data.clinic.prescriptions : Object.values(data.clinic.prescriptions);
      allPrescriptions.push(...cList.filter(Boolean));
    }

    if (data.prescriptions) {
      const pList = Array.isArray(data.prescriptions) ? data.prescriptions : Object.values(data.prescriptions);
      allPrescriptions.push(...pList.filter(Boolean));
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

    for (const rx of allPrescriptions) {
      if (!rx || !rx.medicines) continue;

      const patientId = rx.patientId || rx.clientId;
      const patientData = patients[patientId] || {};
      const fcmToken = patientData.fcmToken || rx.fcmToken;

      if (!fcmToken) continue;

      const medList = Array.isArray(rx.medicines) ? rx.medicines : Object.values(rx.medicines);

      for (const med of medList) {
        if (!med || !med.times) continue;
        const timesArray = Array.isArray(med.times) ? med.times : Object.values(med.times);

        for (const t of timesArray) {
          if (!t) continue;
          const cleanTime = String(t).trim().toUpperCase();

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
              await messaging.send(message);
              console.log(`✅ Push sent to patient ${patientId} for ${med.name}`);
            } catch (error) {
              console.error(`❌ Error sending push to ${patientId}:`, error);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in background check:", err);
  }
}

// Start interval loop (every 60 seconds)
setInterval(checkAndSendReminders, 60000);

app.listen(PORT, () => {
  console.log(`🚀 Render Server is running on port ${PORT}`);
});
