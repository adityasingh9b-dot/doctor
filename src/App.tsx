import React, { useState, useEffect } from 'react';
import {
  ClientUser,
  Appointment,
  Prescription,
  ClinicConfig,
  FirebaseSyncConfig,
  QueueStatus,
  DOCTOR_ADMIN,
} from './types';
import {
  loadAppointments,
  saveAppointments,
  loadPrescriptions,
  savePrescriptions,
  loadClients,
  saveClients,
  loadClinicConfig,
  loadFirebaseConfig,
  saveFirebaseConfig,
  loadAuthSession,
  saveAuthSession,
  subscribeToRealtimeSync,
  AuthSession,
} from './services/dataStore';
import { sendMedicineAlarmNotification } from './services/notificationService';
import { AuthScreen } from './components/AuthScreen';
import { DoctorAdminView } from './components/doctor/DoctorAdminView';
import { ClientPatientView } from './components/client/ClientPatientView';
import { FirebaseModal } from './components/FirebaseModal';
import { SIHGuideModal } from './components/SIHGuideModal';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Global State
  const [clinic] = useState<ClinicConfig>(loadClinicConfig);
  const [clients, setClients] = useState<ClientUser[]>(loadClients);
  const [appointments, setAppointments] = useState<Appointment[]>(loadAppointments);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(loadPrescriptions);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseSyncConfig>(loadFirebaseConfig);

  // Initial Auth Screen: user explicitly asked:
  // "make a login screen initialy which will be shown first in app , asking for phone number and password, and if the entered ph no and password matches with ADMIN, then enter as doctor"
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    return loadAuthSession(); // null on first load so Login Screen is shown first
  });

  // Modals
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showSIHGuide, setShowSIHGuide] = useState(false);

  // Multi-tab realtime synchronization
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync(() => {
      setClients(loadClients());
      setAppointments(loadAppointments());
      setPrescriptions(loadPrescriptions());
    });
    return unsubscribe;
  }, []);

  // Background medicine dose reminder alarm check at the time set by doctor
  useEffect(() => {
    const triggeredAlarms = new Set<string>();

    const interval = setInterval(() => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const isPM = currentH >= 12;
      const h12 = currentH % 12 || 12;
      const h12Str = String(h12).padStart(2, '0');
      const ampm = isPM ? 'PM' : 'AM';

      // Support both 24hr format "14:30" and 12hr format "02:30 PM"
      const format24 = `${String(currentH).padStart(2, '0')}:${currentM}`;
      const format12 = `${h12Str}:${currentM} ${ampm}`;

      prescriptions.forEach((rx) => {
        rx.medicines.forEach((med) => {
          if (!med.time) return;
          const cleanMedTime = med.time.trim().toUpperCase();

          if (
            (cleanMedTime === format24 || cleanMedTime === format12) &&
            !triggeredAlarms.has(`${rx.id}-${med.id}-${format24}`)
          ) {
            const slots = [];
            if (med.dosageSlots?.breakfast) slots.push('Breakfast');
            if (med.dosageSlots?.lunch) slots.push('Lunch');
            if (med.dosageSlots?.dinner) slots.push('Dinner');
            const doseLabel = slots.join('/') || '1 Dose';

            sendMedicineAlarmNotification(
              med.name,
              doseLabel,
              med.timing === 'before' ? 'Before food' : 'After food',
              med.description
            );

            triggeredAlarms.add(`${rx.id}-${med.id}-${format24}`);
          }
        });
      });
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [prescriptions]);

  // Auth Handlers
  const handleLoginDoctor = () => {
    const docSession: AuthSession = {
      role: 'doctor',
      user: {
        id: 'doc-admin',
        name: DOCTOR_ADMIN.name,
        phone: DOCTOR_ADMIN.phone,
        passkey: DOCTOR_ADMIN.passkey,
      },
    };
    setAuthSession(docSession);
    saveAuthSession(docSession);
  };

  const handleLoginClient = (clientUser: ClientUser) => {
    const clientSession: AuthSession = {
      role: 'client',
      user: clientUser,
    };
    setAuthSession(clientSession);
    saveAuthSession(clientSession);
  };

  const handleLogout = () => {
    setAuthSession(null);
    saveAuthSession(null);
  };

  // Client Management Handlers
  const handleRegisterClient = (newClient: ClientUser) => {
    const updated = [newClient, ...clients.filter((c) => c.id !== newClient.id)];
    setClients(updated);
    saveClients(updated);
  };

  const handleUpdateClient = (updatedClient: ClientUser) => {
    const updated = clients.map((c) => (c.id === updatedClient.id ? updatedClient : c));
    setClients(updated);
    saveClients(updated);
  };

  const handleDeleteClient = (clientId: string) => {
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    saveClients(updated);
  };

  // Appointment Handlers
  const handleBookAppointment = (newApt: Appointment) => {
    const updated = [...appointments, newApt];
    setAppointments(updated);
    saveAppointments(updated);
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    const targetApt = appointments.find((a) => a.id === appointmentId);
    if (!targetApt) return;
    const targetDate = targetApt.date;

    const remaining = appointments.filter((a) => a.id !== appointmentId);

    // Re-number appointments on target date in chronological order of booking
    // "koi person apni appointment book krke usko baad me delete bhi kar sake aisa kro, taaki uske niche wale ab upar queue me aa jaye uske number par, jab vo appointment delete kare."
    const dateAppointments = remaining
      .filter((a) => a.date === targetDate)
      .sort((a, b) => a.bookedAt - b.bookedAt);

    const renumberedMap = new Map<string, number>();
    dateAppointments.forEach((apt, idx) => {
      renumberedMap.set(apt.id, idx + 1);
    });

    const updated = remaining.map((a) => {
      if (renumberedMap.has(a.id)) {
        return { ...a, tokenNumber: renumberedMap.get(a.id)! };
      }
      return a;
    });

    setAppointments(updated);
    saveAppointments(updated);
  };

  const handleUpdateAppointmentStatus = (id: string, status: QueueStatus) => {
    const updated = appointments.map((a) =>
      a.id === id ? { ...a, status, completedAt: status === 'completed' ? Date.now() : a.completedAt } : a
    );
    setAppointments(updated);
    saveAppointments(updated);
  };

  const handleCallPatient = (apt: Appointment) => {
    const updated = appointments.map((a) =>
      a.id === apt.id
        ? { ...a, status: 'in-cabin' as QueueStatus, calledAt: Date.now(), cabinNumber: clinic.cabinName }
        : a
    );
    setAppointments(updated);
    saveAppointments(updated);
  };

  // Prescription Handlers
  const handleSavePrescription = (newRx: Prescription) => {
    const updated = [newRx, ...prescriptions.filter((p) => p.id !== newRx.id)];
    setPrescriptions(updated);
    savePrescriptions(updated);

    // If linked to an appointment, mark prescriptionId
    if (newRx.appointmentId) {
      const aptUpdated = appointments.map((a) =>
        a.id === newRx.appointmentId ? { ...a, prescriptionId: newRx.id } : a
      );
      setAppointments(aptUpdated);
      saveAppointments(aptUpdated);
    }
  };

  const handleSaveFirebaseConfig = (cfg: FirebaseSyncConfig) => {
    setFirebaseConfig(cfg);
    saveFirebaseConfig(cfg);
  };

  // Selected client for client view
  const currentClientObj: ClientUser =
    authSession?.role === 'client'
      ? clients.find((c) => c.id === authSession.user.id) ||
        (authSession.user as ClientUser)
      : clients[0];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isDark ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* If not logged in, show initial Login Screen asking for phone & passkey */}
      {!authSession ? (
        <AuthScreen
          clients={clients}
          onLoginDoctor={handleLoginDoctor}
          onLoginClient={handleLoginClient}
        />
      ) : authSession.role === 'doctor' ? (
        /* DOCTOR ADMIN VIEW */
        <DoctorAdminView
          clients={clients}
          appointments={appointments}
          prescriptions={prescriptions}
          clinicConfig={clinic}
          onLogout={handleLogout}
          onOpenFirebase={() => setShowFirebaseModal(true)}
          onRegisterClient={handleRegisterClient}
          onUpdateClient={handleUpdateClient}
          onDeleteClient={handleDeleteClient}
          onSavePrescription={handleSavePrescription}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
          onCallPatient={handleCallPatient}
          onBookAppointment={handleBookAppointment}
        />
      ) : (
        /* CLIENT / PATIENT VIEW */
        <ClientPatientView
          client={currentClientObj}
          appointments={appointments}
          prescriptions={prescriptions}
          clinicConfig={clinic}
          onLogout={handleLogout}
          onBookAppointment={handleBookAppointment}
          onDeleteAppointment={handleDeleteAppointment}
        />
      )}

      {/* Firebase Telemetry & RTDB Modal */}
      <FirebaseModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
        config={firebaseConfig}
        onSaveConfig={handleSaveFirebaseConfig}
      />

      {/* SIH Guide Modal */}
      <SIHGuideModal
        isOpen={showSIHGuide}
        onClose={() => setShowSIHGuide(false)}
      />
    </div>
  );
}
