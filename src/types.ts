export type QueueStatus = 'waiting' | 'in-cabin' | 'completed' | 'cancelled';

export const DOCTOR_ADMIN = {
  name: 'Dr. Doctor',
  phone: '9369250645',
  passkey: '1234',
  regNumber: 'MCI-936925/2020',
  qualification: 'MBBS, MD (Senior Physician & Clinic Director)',
};

export interface ClientUser {
  id: string;
  name: string;
  phone: string;
  passkey: string;
  dob?: string; // Date of Birth YYYY-MM-DD
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  registeredAt: number;
  notes?: string;
}

export interface PrescriptionMedicine {
  id: string;
  name: string; // 'Name' textbox
  description: string; // 'Description' textbox
  dosageSlots: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  timing: 'before' | 'after'; // before / after options select
  time: string; // Exact time string (e.g. "08:30" or "08:30 AM")
  durationDays?: number;
  takenToday?: boolean;
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone: string;
  doctorName: string;
  doctorRegNo: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  date: string;
  diagnosis?: string;
  symptoms?: string[];
  vitals?: {
    bp?: string;
    pulse?: string;
    temperature?: string;
    spo2?: string;
    weight?: string;
  };
  medicines: PrescriptionMedicine[];
  generalAdvice?: string;
  followUpDate?: string;
  createdAt: number;
}

export interface Appointment {
  id: string;
  tokenNumber: number; // 1, 2, 3 strictly by arrival
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';
  date: string; // appointment date (Today or Next Day: YYYY-MM-DD)
  isNextDay?: boolean;
  reasonForVisit: string;
  bookedAt: number; // Exact timestamp for FCFS strict queue ordering
  status: QueueStatus;
  cabinNumber?: string;
  calledAt?: number;
  completedAt?: number;
  prescriptionId?: string;
}

export interface ClinicConfig {
  name: string;
  doctorName: string;
  qualification: string;
  regNumber: string;
  phone: string;
  address: string;
  consultationFee: number;
  cabinName: string;
}

export interface FirebaseSyncConfig {
  rtdbUrl: string;
  apiKey: string;
  projectId: string;
  isConnected: boolean;
  lastSyncedAt?: number;
}
