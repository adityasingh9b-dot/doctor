import { 
  ref, 
  get, 
  set, 
  push, 
  update, 
  onValue, 
  off 
} from 'firebase/database';
import { db } from './firebase';
import {
  Appointment,
  ClinicConfig,
  Prescription,
  FirebaseSyncConfig,
  ClientUser,
  DOCTOR_ADMIN,
} from '../types';

const STORAGE_KEYS = {
  APPOINTMENTS: 'dr_doctor_appointments',
  PRESCRIPTIONS: 'dr_doctor_prescriptions',
  CLIENTS: 'dr_doctor_clients',
  CLINIC: 'dr_doctor_clinic_config',
  FIREBASE: 'dr_doctor_firebase_config',
  AUTH_SESSION: 'dr_doctor_auth_session',
};

export const DEFAULT_CLINIC: ClinicConfig = {
  name: 'Dr. Doctor Healthcare & Multispeciality Clinic',
  doctorName: DOCTOR_ADMIN.name,
  qualification: DOCTOR_ADMIN.qualification,
  regNumber: DOCTOR_ADMIN.regNumber,
  phone: DOCTOR_ADMIN.phone,
  address: 'Suite 204, Medanta Wellness Center, Main Road',
  consultationFee: 500,
  cabinName: 'Consultation Room 1',
};

// Date helpers
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextDayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatReadableDate(dateInput: string | number | undefined): string {
  if (!dateInput) return '';
  try {
    const str = String(dateInput).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    if (/^\d+$/.test(str)) {
      const d = new Date(Number(str));
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return str;
  } catch {
    return String(dateInput);
  }
}

export function fromDDMMYYYYToISO(ddmmyyyy: string): string {
  const clean = ddmmyyyy.trim();
  const parts = clean.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return clean;
}

export function isTimestampToday(timestamp?: number | string): boolean {
  if (!timestamp) return false;
  try {
    const d = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
}

export function time12To24(time12?: string): string {
  if (!time12) return '08:00';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '08:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = (match[3] || 'AM').toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function time24To12(time24?: string): string {
  if (!time24) return '08:00 AM';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export function calculateAgeFromDob(dobStr?: string): number | undefined {
  if (!dobStr) return undefined;
  try {
    let y = 0, m = 0, d = 0;
    if (dobStr.includes('/')) {
      const parts = dobStr.split('/').map(Number);
      d = parts[0];
      m = parts[1];
      y = parts[2];
    } else if (dobStr.includes('-')) {
      const parts = dobStr.split('-').map(Number);
      y = parts[0];
      m = parts[1];
      d = parts[2];
    }
    if (!y || !m || !d) return undefined;
    const today = new Date();
    let age = today.getFullYear() - y;
    const monthDiff = today.getMonth() + 1 - m;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return undefined;
  }
}

export const INITIAL_CLIENTS: ClientUser[] = [
  {
    id: 'client-1',
    name: 'Rahul Sharma',
    phone: '9876543210',
    passkey: '1111',
    dob: '1995-04-12',
    age: 29,
    gender: 'Male',
    registeredAt: Date.now() - 7 * 86400000,
  },
  {
    id: 'client-2',
    name: 'Ananya Iyer',
    phone: '9811122334',
    passkey: '2222',
    dob: '1998-08-25',
    age: 26,
    gender: 'Female',
    registeredAt: Date.now() - 5 * 86400000,
  },
  {
    id: 'client-3',
    name: 'Kevin Peters',
    phone: '9822233445',
    passkey: '3333',
    dob: '1982-11-05',
    age: 42,
    gender: 'Male',
    registeredAt: Date.now() - 3 * 86400000,
  },
  {
    id: 'client-4',
    name: 'Sunita Verma',
    phone: '9833344556',
    passkey: '4444',
    dob: '1972-02-18',
    age: 52,
    gender: 'Female',
    registeredAt: Date.now() - 1 * 86400000,
  },
];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-demo-101',
    appointmentId: 'apt-1',
    patientId: 'client-2',
    patientName: 'Ananya Iyer',
    patientAge: 26,
    patientGender: 'Female',
    patientPhone: '9811122334',
    doctorName: DOCTOR_ADMIN.name,
    doctorRegNo: DOCTOR_ADMIN.regNumber,
    clinicName: DEFAULT_CLINIC.name,
    clinicAddress: DEFAULT_CLINIC.address,
    clinicPhone: DOCTOR_ADMIN.phone,
    date: getTodayDateString(),
    diagnosis: 'Acute Upper Respiratory Tract Infection & Mild Pharyngitis',
    symptoms: ['Dry Cough', 'Low Grade Fever (99.6°F)', 'Sore Throat'],
    vitals: {
      bp: '120/80',
      pulse: '76',
      temperature: '99.4',
      spo2: '98',
      weight: '58',
    },
    medicines: [
      {
        id: 'm-1',
        name: 'Amoxicillin + Potassium Clavulanate (625mg)',
        description: 'Broad spectrum antibiotic to clear throat and chest infection.',
        dosageSlots: { breakfast: true, lunch: false, dinner: true },
        timing: 'after',
        time: '09:00 AM',
        durationDays: 5,
      },
      {
        id: 'm-2',
        name: 'Paracetamol 650mg (Dolo)',
        description: 'For body ache, throat discomfort, and fever control.',
        dosageSlots: { breakfast: true, lunch: true, dinner: true },
        timing: 'after',
        time: '02:00 PM',
        durationDays: 3,
      },
      {
        id: 'm-3',
        name: 'Pantoprazole 40mg (Pan 40)',
        description: 'Antacid to prevent stomach irritation from antibiotics.',
        dosageSlots: { breakfast: true, lunch: false, dinner: false },
        timing: 'before',
        time: '08:00 AM',
        durationDays: 5,
      },
    ],
    generalAdvice: 'Drink plenty of lukewarm fluids, avoid cold drinks, complete full antibiotic course.',
    followUpDate: getNextDayDateString(),
    createdAt: Date.now() - 3600000,
  },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    tokenNumber: 1,
    patientId: 'client-2',
    patientName: 'Ananya Iyer',
    patientPhone: '9811122334',
    patientAge: 26,
    patientGender: 'Female',
    date: getTodayDateString(),
    isNextDay: false,
    reasonForVisit: 'Severe sore throat and coughing since 2 days',
    bookedAt: Date.now() - 50 * 60 * 1000,
    status: 'in-cabin',
    cabinNumber: 'Room 1',
    calledAt: Date.now() - 10 * 60 * 1000,
    prescriptionId: 'rx-demo-101',
  },
  {
    id: 'apt-2',
    tokenNumber: 2,
    patientId: 'client-1',
    patientName: 'Rahul Sharma',
    patientPhone: '9876543210',
    patientAge: 29,
    patientGender: 'Male',
    date: getTodayDateString(),
    isNextDay: false,
    reasonForVisit: 'Allergic runny nose, sneezing fits, headache',
    bookedAt: Date.now() - 35 * 60 * 1000,
    status: 'waiting',
  },
  {
    id: 'apt-3',
    tokenNumber: 1,
    patientId: 'client-3',
    patientName: 'Kevin Peters',
    patientPhone: '9822233445',
    patientAge: 42,
    patientGender: 'Male',
    date: getNextDayDateString(),
    isNextDay: true,
    reasonForVisit: 'Next-day routine blood pressure follow-up and prescription refill',
    bookedAt: Date.now() - 20 * 60 * 1000,
    status: 'waiting',
  },
  {
    id: 'apt-4',
    tokenNumber: 2,
    patientId: 'client-4',
    patientName: 'Sunita Verma',
    patientPhone: '9833344556',
    patientAge: 52,
    patientGender: 'Female',
    date: getNextDayDateString(),
    isNextDay: true,
    reasonForVisit: 'Next-day fasting glucose review and knee pain consultation',
    bookedAt: Date.now() - 10 * 60 * 1000,
    status: 'waiting',
  },
];

// ---------------------------------------------------------------------------
// FIREBASE REALTIME DATABASE SYNC FUNCTIONS
// ---------------------------------------------------------------------------

// CLIENTS
export function loadClients(): ClientUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return raw ? JSON.parse(raw) : INITIAL_CLIENTS;
  } catch {
    return INITIAL_CLIENTS;
  }
}

export function saveClients(clients: ClientUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    set(ref(db, 'clinic/clients'), clients).catch((err) => console.error('Firebase saveClients error:', err));
  } catch (err) {
    console.error('Failed to save clients:', err);
  }
}

// APPOINTMENTS
export function loadAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    const list: Appointment[] = raw ? JSON.parse(raw) : INITIAL_APPOINTMENTS;
    return list.sort((a, b) => a.bookedAt - b.bookedAt);
  } catch {
    return INITIAL_APPOINTMENTS;
  }
}

export function saveAppointments(list: Appointment[]): void {
  try {
    const sorted = [...list].sort((a, b) => a.bookedAt - b.bookedAt);
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(sorted));
    set(ref(db, 'clinic/appointments'), sorted).catch((err) => console.error('Firebase saveAppointments error:', err));
  } catch (err) {
    console.error('Failed to save appointments:', err);
  }
}

// PRESCRIPTIONS
export function loadPrescriptions(): Prescription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS);
    return raw ? JSON.parse(raw) : INITIAL_PRESCRIPTIONS;
  } catch {
    return INITIAL_PRESCRIPTIONS;
  }
}

export function savePrescriptions(list: Prescription[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(list));
    set(ref(db, 'clinic/prescriptions'), list).catch((err) => console.error('Firebase savePrescriptions error:', err));
  } catch (err) {
    console.error('Failed to save prescriptions:', err);
  }
}

// CLINIC CONFIG
export function loadClinicConfig(): ClinicConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLINIC);
    return raw ? JSON.parse(raw) : DEFAULT_CLINIC;
  } catch {
    return DEFAULT_CLINIC;
  }
}

export function saveClinicConfig(cfg: ClinicConfig): void {
  localStorage.setItem(STORAGE_KEYS.CLINIC, JSON.stringify(cfg));
  set(ref(db, 'clinic/config'), cfg).catch((err) => console.error('Firebase saveClinicConfig error:', err));
}

// FIREBASE CONFIG
export function loadFirebaseConfig(): FirebaseSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FIREBASE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    rtdbUrl: 'https://doctor-8edc6-default-rtdb.firebaseio.com/',
    apiKey: 'AIzaSyC37QeZkmFsl9NNik9kuktlkftkuWykgYE',
    projectId: 'doctor-8edc6',
    isConnected: true,
  };
}

export function saveFirebaseConfig(cfg: FirebaseSyncConfig): void {
  localStorage.setItem(STORAGE_KEYS.FIREBASE, JSON.stringify(cfg));
}

// AUTH SESSION
export interface AuthSession {
  role: 'doctor' | 'client';
  user: {
    id: string;
    name: string;
    phone: string;
    passkey: string;
    age?: number;
    gender?: string;
  };
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveAuthSession(session: AuthSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
}

// SUBSCRIBE TO REALTIME DATABASE SYNC
export function subscribeToRealtimeSync(onUpdate: () => void): () => void {
  const clinicRef = ref(db, 'clinic');
  
  // Attach live Firebase listener
  const listener = onValue(clinicRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.clients) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(Object.values(data.clients)));
      }
      if (data.appointments) {
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(Object.values(data.appointments)));
      }
      if (data.prescriptions) {
        localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(Object.values(data.prescriptions)));
      }
      if (data.config) {
        localStorage.setItem(STORAGE_KEYS.CLINIC, JSON.stringify(data.config));
      }
      onUpdate();
    }
  }, (error) => {
    console.error('Firebase realtime sync listener error:', error);
  });

  // Fallback broadcast channel for multi-tab sync
  const broadcastChannel =
    typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel('dr_doctor_clinic_sync')
      : null;

  const bcHandler = () => {
    onUpdate();
  };
  broadcastChannel?.addEventListener('message', bcHandler);

  return () => {
    off(clinicRef, 'value', listener);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', bcHandler);
      broadcastChannel.close();
    }
  };
}
