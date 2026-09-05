import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.database();
const messaging = admin.messaging();

export const checkMedicineReminders = onSchedule(
  "every 1 minutes",
  async () => {
    try {
      const rootSnapshot = await db.ref("/").once("value");
      if (!rootSnapshot.exists()) return null;

      const data = rootSnapshot.val();
      const patients = data.patients || {};

      let allPrescriptions = [];

      // 1. Root level indexed prescriptions (jaise 0, 1, 2... jo aapke DB mein hain)
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && val.medicines && (val.patientId || val.clientId)) {
          allPrescriptions.push(val);
        }
      }

      // 2. Clinic prescriptions node check karo
      if (data.clinic?.prescriptions) {
        const cList = Array.isArray(data.clinic.prescriptions) 
          ? data.clinic.prescriptions 
          : Object.values(data.clinic.prescriptions);
        allPrescriptions.push(...cList.filter(Boolean));
      }

      // 3. Direct prescriptions node check karo
      if (data.prescriptions) {
        const pList = Array.isArray(data.prescriptions) 
          ? data.prescriptions 
          : Object.values(data.prescriptions);
        allPrescriptions.push(...pList.filter(Boolean));
      }

      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(
        now.getTime() + istOffset + (now.getTimezoneOffset() * 60000),
      );

      const currentH = istDate.getHours();
      const currentM = String(istDate.getMinutes()).padStart(2, "0");
      const isPM = currentH >= 12;
      const h12 = currentH % 12 || 12;
      const h12Str = String(h12).padStart(2, "0");
      const ampm = isPM ? "PM" : "AM";

      const format24 = `${String(currentH).padStart(2, "0")}:${currentM}`;
      const format12 = `${h12Str}:${currentM} ${ampm}`;

      console.log(`⏰ Cloud Function IST Time checked: ${format24} / ${format12}`);
      console.log(`📦 Total prescriptions scanned: ${allPrescriptions.length}`);

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
                const response = await messaging.send(message);
                console.log(`✅ Cloud Push sent successfully to patient ${patientId} for ${med.name} at ${cleanTime}`);
              } catch (error) {
                console.error(`❌ Error sending cloud push to ${patientId}:`, error);
              }
            }
          }
        }
      }
      return null;
    } catch (err) {
      console.error("Error in Cloud Function scheduler:", err);
      return null;
    }
  },
);
