import { playMedicineChime } from './sound';
import { PrescriptionMedicine } from '../types';
import { getFCMToken, db } from './firebase';
import { ref, set } from 'firebase/database';

let notificationPermission: NotificationPermission = 'default';

if (typeof window !== 'undefined' && 'Notification' in window) {
  notificationPermission = Notification.permission;
}

export async function requestNotificationAccess(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    notificationPermission = perm;
    return perm === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

export function getNotificationStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Registers device for Firebase Cloud Messaging (FCM) and saves token to database
 */
export async function registerDeviceForPush(patientId: string): Promise<string | null> {
  try {
    const granted = await requestNotificationAccess();
    if (granted) {
      const token = await getFCMToken();
      if (token && patientId) {
        const tokenRef = ref(db, `patients/${patientId}/fcmToken`);
        await set(tokenRef, token);
        console.log('FCM Token successfully saved to DB for patient:', patientId);
        return token;
      }
    }
  } catch (error) {
    console.error('Failed to register device for push notifications:', error);
  }
  return null;
}

export function sendMedicineAlarmNotification(
  medicineName: string,
  doseText: string,
  timingText: string,
  descriptionText?: string
): void {
  // Always trigger hospital-grade audio chime
  playMedicineChime();

  // Trigger system notification if permitted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(`⏰ It's medicine time!`, {
        body: `Time to take: ${medicineName} (${doseText}, ${timingText}). ${
          descriptionText ? `Instructions: ${descriptionText}` : ''
        }`,
        icon: '/favicon.ico',
        tag: `med-${medicineName}-${Date.now()}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Browser Notification error:', e);
    }
  }
}

/**
 * Parses time string like "08:30" or "08:30 AM" or "2:30 PM" to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const parts = clean.replace(/[APM\s]/g, '').split(':');
  let hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Calculates next upcoming dose time and minutes remaining
 */
export function getNextUpcomingDose(medicines: PrescriptionMedicine[]): {
  nextTime: string;
  medicineName: string;
  dosage: string;
  timing: string;
  description?: string;
  minutesRemaining: number;
} | null {
  if (!medicines || medicines.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let closestDiff = Infinity;
  let closestItem: {
    nextTime: string;
    medicineName: string;
    dosage: string;
    timing: string;
    description?: string;
    minutesRemaining: number;
  } | null = null;

  medicines.forEach((med) => {
    if (!med.time) return;
    const targetMinutes = parseTimeToMinutes(med.time);

    let diff = targetMinutes - currentMinutes;
    if (diff <= 0) {
      diff += 24 * 60; // Next day
    }

    if (diff < closestDiff) {
      closestDiff = diff;
      const slots = [];
      if (med.dosageSlots?.breakfast) slots.push('Breakfast');
      if (med.dosageSlots?.lunch) slots.push('Lunch');
      if (med.dosageSlots?.dinner) slots.push('Dinner');
      const dosageSummary = slots.join('/') || '1 Dose';

      closestItem = {
        nextTime: med.time,
        medicineName: med.name,
        dosage: dosageSummary,
        timing: med.timing === 'before' ? 'Before Food' : 'After Food',
        description: med.description,
        minutesRemaining: diff,
      };
    }
  });

  return closestItem;
}
