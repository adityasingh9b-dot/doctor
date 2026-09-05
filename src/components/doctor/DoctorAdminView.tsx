import React, { useState } from 'react';
import {
  Calendar,
  Users,
  FileText,
  Activity,
  IndianRupee,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  ClientUser,
  Appointment,
  Prescription,
  ClinicConfig,
  QueueStatus,
} from '../../types';
import { DoctorHeader } from './DoctorHeader';
import { DoctorClientsView } from './DoctorClientsView';
import { DoctorPrescriptionView } from './DoctorPrescriptionView';
import { DoctorAppointmentsView } from './DoctorAppointmentsView';
import { getTodayDateString, getNextDayDateString, formatReadableDate } from '../../services/dataStore';
import { useTheme } from '../../context/ThemeContext';

interface DoctorAdminViewProps {
  clients: ClientUser[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  clinicConfig: ClinicConfig;
  onLogout: () => void;
  onOpenFirebase: () => void;
  onRegisterClient: (client: ClientUser) => void;
  onUpdateClient: (client: ClientUser) => void;
  onDeleteClient: (clientId: string) => void;
  onSavePrescription: (rx: Prescription) => void;
  onUpdateAppointmentStatus: (id: string, status: QueueStatus) => void;
  onDeleteAppointment: (id: string) => void;
  onCallPatient: (apt: Appointment) => void;
  onBookAppointment: (apt: Appointment) => void;
}

export const DoctorAdminView: React.FC<DoctorAdminViewProps> = ({
  clients,
  appointments,
  prescriptions,
  clinicConfig,
  onLogout,
  onOpenFirebase,
  onRegisterClient,
  onUpdateClient,
  onDeleteClient,
  onSavePrescription,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onCallPatient: _onCallPatient,
  onBookAppointment,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'appointments' | 'clients' | 'prescribe' | 'overview'>('appointments');
  const [targetPrescriptionClient, setTargetPrescriptionClient] = useState<ClientUser | null>(null);
  const [prescribedAlertToast, setPrescribedAlertToast] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const nextDayStr = getNextDayDateString();

  const nextDayCount = appointments.filter((a) => a.date === nextDayStr || a.isNextDay).length;
  const todayWaitingCount = appointments.filter(
    (a) => a.date === todayStr && !a.isNextDay && a.status === 'waiting'
  ).length;

  // Requirement: "in overview stats, show also todays earnings where each appointment +500 only completed one, so add 500 only after clicking complete by doctor, becoz they can be deleted in future... also today no of patients"
  const todayAppointments = appointments.filter(
    (a) =>
      (a.date === todayStr && !a.isNextDay) ||
      (a.completedAt && new Date(a.completedAt).toISOString().split('T')[0] === todayStr)
  );

  const todayCompletedAppointments = appointments.filter(
    (a) =>
      a.status === 'completed' &&
      ((a.date === todayStr && !a.isNextDay) ||
        (a.completedAt && new Date(a.completedAt).toISOString().split('T')[0] === todayStr))
  );

  const todayCompletedCount = todayCompletedAppointments.length;
  const todayEarnings = todayCompletedCount * 500;
  const todayPatientsCount = todayAppointments.length;

  const handleSelectClientForPrescription = (client: ClientUser) => {
    setTargetPrescriptionClient(client);
    setActiveTab('prescribe');
  };

  const handlePrescriptionIssued = (patientName: string) => {
    // "on clicking save & issue prescription on client phone button, doctor should be redurected to appointments ( next day queue ) with an alert that ( prescribed )"
    alert(`(Prescribed)\nPrescription successfully issued to ${patientName} and sent to their phone!`);
    setPrescribedAlertToast(`(Prescribed) Prescription successfully issued to ${patientName}`);
    setActiveTab('appointments');
  };

  const handleSelectClientForBooking = (client: ClientUser) => {
    // Check if client already has an active appointment
    const hasActive = appointments.find(
      (a) =>
        (a.patientId === client.id || a.patientPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')) &&
        (a.status === 'waiting' || a.status === 'in-cabin')
    );

    if (hasActive) {
      alert(
        `${client.name} already has an active appointment (Seat #${hasActive.tokenNumber} on ${formatReadableDate(
          hasActive.date
        )}).\nA person cannot book more than 1 appointment at the same time.`
      );
      return;
    }

    const nextDayAppts = appointments.filter((a) => a.date === nextDayStr || a.isNextDay);
    const nextToken = nextDayAppts.length + 1;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      tokenNumber: nextToken,
      patientId: client.id,
      patientName: client.name,
      patientPhone: client.phone,
      patientAge: client.age || 28,
      patientGender: client.gender || 'Male',
      date: nextDayStr,
      isNextDay: true,
      reasonForVisit: 'Follow-up scheduled by Dr. Doctor',
      bookedAt: Date.now(),
      status: 'waiting',
    };

    onBookAppointment(newApt);
    setActiveTab('appointments');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isDark ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <DoctorHeader onLogout={onLogout} onOpenFirebase={onOpenFirebase} />

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24">
        {/* Simple segmented navigation bar */}
        <div
          className={`mb-6 p-1.5 rounded-2xl border flex items-center justify-around text-xs font-semibold ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'appointments'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Next-Day Queue</span>
            <span className="sm:hidden">Queue</span>
            <span className="text-[11px] opacity-80">({appointments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'clients'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Clients Directory</span>
            <span className="sm:hidden">Clients</span>
            <span className="text-[11px] opacity-80">({clients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescribe')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'prescribe'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Issue Prescription</span>
            <span className="sm:hidden">Rx</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Overview & Stats</span>
            <span className="sm:hidden">Stats</span>
          </button>
        </div>

        {/* Dynamic Content Views */}
        {activeTab === 'appointments' && (
          <DoctorAppointmentsView
            appointments={appointments}
            clients={clients}
            onUpdateStatus={onUpdateAppointmentStatus}
            onDeleteAppointment={onDeleteAppointment}
            onSelectClientForPrescription={handleSelectClientForPrescription}
            prescribedAlertToast={prescribedAlertToast}
            onClearPrescribedAlert={() => setPrescribedAlertToast(null)}
          />
        )}

        {activeTab === 'clients' && (
          <DoctorClientsView
            clients={clients}
            prescriptions={prescriptions}
            onRegisterClient={onRegisterClient}
            onUpdateClient={onUpdateClient}
            onDeleteClient={onDeleteClient}
            onSelectClientForPrescription={handleSelectClientForPrescription}
            onSelectClientForBooking={handleSelectClientForBooking}
          />
        )}

        {activeTab === 'prescribe' && (
          <DoctorPrescriptionView
            clients={clients}
            clinicConfig={clinicConfig}
            selectedClient={targetPrescriptionClient}
            onSavePrescription={onSavePrescription}
            recentPrescriptions={prescriptions}
            onPrescriptionIssued={handlePrescriptionIssued}
          />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-500" />
                  <span>Clinic Health & OPD Overview</span>
                </h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Real-time earnings, patient volume, and appointment analytics
                </p>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  OPD Active Today
                </span>
              </div>
            </div>

            {/* Primary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Today's Earnings (Requirement: Each appointment +500 only completed one) */}
              <div
                className={`rounded-2xl p-4 border space-y-1.5 transition-all ${
                  isDark
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-100'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Today&apos;s Earnings
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  ₹{todayEarnings}
                </div>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 block font-medium">
                  ₹500 × {todayCompletedCount} completed
                </span>
              </div>

              {/* Today's Number of Patients (Requirement: also today no of patients) */}
              <div
                className={`rounded-2xl p-4 border space-y-1.5 transition-all ${
                  isDark
                    ? 'bg-sky-950/20 border-sky-800/40 text-sky-100'
                    : 'bg-sky-50/70 border-sky-200 text-sky-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    Today&apos;s Patients
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-sky-600 dark:text-sky-400">
                  {todayPatientsCount}
                </div>
                <span className="text-[10px] text-sky-700/80 dark:text-sky-300/80 block font-medium">
                  {todayCompletedCount} done • {todayWaitingCount} waiting
                </span>
              </div>

              {/* Next-Day Bookings */}
              <div
                className={`rounded-2xl p-4 border space-y-1.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Next-Day Queue
                  </span>
                  <Calendar className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black">
                  {nextDayCount}
                </div>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 block font-medium">
                  FCFS Queued Seats
                </span>
              </div>

              {/* Waiting in OPD */}
              <div
                className={`rounded-2xl p-4 border space-y-1.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Waiting in OPD
                  </span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-500">
                  {todayWaitingCount}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                  Pending Consultation
                </span>
              </div>

              {/* Prescriptions Issued */}
              <div
                className={`rounded-2xl p-4 border space-y-1.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Prescriptions
                  </span>
                  <FileText className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black">
                  {prescriptions.length}
                </div>
                <span className="text-[10px] text-zinc-500 block font-medium">
                  PDF & Alarms
                </span>
              </div>

              {/* Registered Clients */}
              <div
                className={`rounded-2xl p-4 border space-y-1.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Clients Directory
                  </span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black">
                  {clients.length}
                </div>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 block font-medium">
                  Registered Clients
                </span>
              </div>
            </div>

            {/* Financial & Operational Summary Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block font-bold">
                    Doctor Consultation Fee Tracking (₹500 / Completed Patient)
                  </strong>
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>
                    Earnings are credited strictly after Dr. Doctor marks an appointment as Completed in the queue. Cancelled or deleted appointments are immediately excluded.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                <div className="text-right">
                  <span className={`text-[10px] block uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Today Completed
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {todayCompletedCount} Patients
                  </strong>
                </div>
                <div className="text-right border-l pl-4 border-slate-200 dark:border-zinc-800">
                  <span className={`text-[10px] block uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Net Earnings
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    ₹{todayEarnings}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick FCFS Queue explanation */}
            <div
              className={`rounded-2xl p-5 border space-y-2 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Clinic Operations & Rules Summary
              </h3>
              <ul className={`text-xs space-y-1.5 list-disc pl-4 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                <li>
                  <strong>First-Come, First-Served:</strong> Next-day appointments are queued strictly by booking timestamp.
                </li>
                <li>
                  <strong>Automatic Re-indexing:</strong> When an appointment is deleted or cancelled, all subsequent patients in that queue automatically shift up to take the earlier seat number.
                </li>
                <li>
                  <strong>Single Active Appointment Limit:</strong> A person cannot book more than 1 active appointment at the same time.
                </li>
                <li>
                  <strong>Earnings Calculation:</strong> Each appointment adds ₹500 to today&apos;s earnings only after Dr. Doctor clicks &ldquo;Completed&rdquo;.
                </li>
                <li>
                  <strong>Real-Time Alarm Notifications:</strong> Prescribed medicines trigger audio alarms and notifications on the client&apos;s phone at the exact time set by Dr. Doctor.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
