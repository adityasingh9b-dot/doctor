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
      const prescriptionsNode =
        data.prescriptions || data.clinic?.prescriptions || {};

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

      for (const [patientId, patientData] of Object.entries(patients)) {
        const fcmToken = patientData.fcmToken;
        if (!fcmToken) continue;

        const patientPrescriptions =
          patientData.prescriptions ||
          patientData.clinic?.prescriptions ||
          Object.values(prescriptionsNode).filter(
            (rx) => rx.patientId === patientId ||
              rx.clientId === patientId,
          );

        if (!patientPrescriptions) continue;

        const rxList = Array.isArray(patientPrescriptions) ?
          patientPrescriptions :
          Object.values(patientPrescriptions);

        rxList.forEach((rx) => {
          if (!rx.medicines) return;

          rx.medicines.forEach((med, medIdx) => {
            const timesArray = med.times ||
              (med.time ? [med.time] : []);
            if (!Array.isArray(timesArray)) return;

            timesArray.forEach((t) => {
              if (!t) return;
              const cleanTime = String(t).trim().toUpperCase();

              if (cleanTime === format24 || cleanTime === format12) {
                const slots = [];
                if (med.dosageSlots?.breakfast) slots.push("Breakfast");
                if (med.dosageSlots?.lunch) slots.push("Lunch");
                if (med.dosageSlots?.dinner) slots.push("Dinner");
                const doseLabel = slots.join("/") || "1 Dose";

                const timingText = med.timing === "before" ?
                  "Before food" : "After food";
                const descText = med.description ?
                  `Note: ${med.description}` : "";
                const bodyText =
                  `Time to take ${doseLabel} (${timingText}). ${descText}`
                    .trim();

                const message = {
                  notification: {
                    title: `⏰ Medicine Reminder: ${med.name}`,
                    body: bodyText,
                  },
                  token: fcmToken,
                };

                messaging.send(message)
                  .then((response) => {
                    console.log(
                      `✅ Cloud Push sent to patient ${patientId} ` +
                      `for ${med.name} at ${cleanTime}`,
                    );
                    return response;
                  })
                  .catch((error) => {
                    console.error(
                      `❌ Error sending cloud push to ${patientId}:`,
                      error,
                    );
                  });
              }
            });
          });
        });
      }
      return null;
    } catch (err) {
      console.error("Error in Cloud Function scheduler:", err);
      return null;
    }
  },
);
