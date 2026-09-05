import React, { useState } from 'react';
import {
  CalendarPlus,
  Ticket,
  FileText,
  Bell,
  Clock,
  Download,
  CheckCircle,
  LogOut,
  Volume2,
  Stethoscope,
  Sparkles,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import {
  ClientUser,
  Appointment,
  Prescription,
  ClinicConfig,
} from '../../types';
import { downloadPrescriptionPDF } from '../../services/pdfGenerator';
import {
  requestNotificationAccess,
  getNotificationStatus,
  sendMedicineAlarmNotification,
  getNextUpcomingDose,
} from '../../services/notificationService';
import { getNextDayDateString, formatReadableDate } from '../../services/dataStore';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';

interface ClientPatientViewProps {
  client: ClientUser;
  appointments: Appointment[];
  prescriptions: Prescription[];
  clinicConfig: ClinicConfig;
  onLogout: () => void;
  onBookAppointment: (apt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
}

export const ClientPatientView: React.FC<ClientPatientViewProps> = ({
  client,
  appointments,
  prescriptions,
  clinicConfig,
  onLogout,
  onBookAppointment,
  onDeleteAppointment,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Mobile navigation menu tab: 'token' | 'book' | 'prescriptions' | 'reminders'
  const [activeTab, setActiveTab] = useState<'token' | 'book' | 'prescriptions' | 'reminders'>('token');

  const nextDayStr = getNextDayDateString();

  // Next-Day Booking Form State
  const [bookingDate, setBookingDate] = useState(nextDayStr);
  const [reason, setReason] = useState('');
  const [bookingSuccessToast, setBookingSuccessToast] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Notification status
  const [notifPermission, setNotifPermission] = useState(getNotificationStatus());
  const [testAlarmTriggered, setTestAlarmTriggered] = useState(false);

  // Client's appointments (filtered by patientId OR phone)
  const myAppointments = appointments.filter(
    (a) => a.patientId === client.id || a.patientPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')
  );

  // Active or upcoming waiting appointment for this client
  const activeAppointment = myAppointments.find(
    (a) => a.status === 'waiting' || a.status === 'in-cabin'
  );

  // Client's prescriptions
  const myPrescriptions = prescriptions.filter(
    (p) => p.patientId === client.id || p.patientPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')
  );

  // Calculate strict FCFS position for active appointment
  const allAppointmentsForDate = activeAppointment
    ? appointments
        .filter((a) => a.date === activeAppointment.date)
        .sort((a, b) => a.bookedAt - b.bookedAt)
    : [];

  const waitingAheadCount = activeAppointment
    ? allAppointmentsForDate.filter(
        (a) => a.status === 'waiting' && a.bookedAt < activeAppointment.bookedAt
      ).length
    : 0;

  // Next available token for booking date
  const existingForBookingDate = appointments.filter((a) => a.date === bookingDate);
  const nextAvailableSeatNumber = existingForBookingDate.length + 1;

  // Next upcoming dose across patient's prescriptions
  const allMeds = myPrescriptions.flatMap((rx) => rx.medicines);
  const nextDose = getNextUpcomingDose(allMeds);

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationAccess();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleTestMedicineNotification = () => {
    const sampleMed = allMeds[0] || {
      name: 'Paracetamol 650mg',
      dosageSlots: { breakfast: true, lunch: false, dinner: true },
      timing: 'after',
      description: 'Take with water after food',
    };

    const slots = [];
    if (sampleMed.dosageSlots?.breakfast) slots.push('Breakfast');
    if (sampleMed.dosageSlots?.lunch) slots.push('Lunch');
    if (sampleMed.dosageSlots?.dinner) slots.push('Dinner');
    const doseText = slots.join('/') || '1 Dose';

    sendMedicineAlarmNotification(
      sampleMed.name,
      doseText,
      sampleMed.timing === 'before' ? 'Before food' : 'After food',
      sampleMed.description
    );

    setTestAlarmTriggered(true);
    setTimeout(() => setTestAlarmTriggered(false), 4000);
  };

  const handleConfirmNextDayBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    // Requirement: "A person cannot book more than 1 appointment at the same time, so add this feature too, to check already existing appointment."
    if (activeAppointment) {
      setBookingError(
        `You already have an active appointment (Seat #${activeAppointment.tokenNumber} for ${formatReadableDate(
          activeAppointment.date
        )}). A person cannot book more than 1 appointment at the same time. If you wish to book another date, please delete or cancel your existing appointment first.`
      );
      return;
    }

    if (!reason.trim()) {
      setBookingError('Please enter the reason for your clinic consultation.');
      return;
    }

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      tokenNumber: nextAvailableSeatNumber,
      patientId: client.id,
      patientName: client.name,
      patientPhone: client.phone,
      patientAge: client.age || 28,
      patientGender: client.gender || 'Male',
      date: bookingDate,
      isNextDay: bookingDate === nextDayStr,
      reasonForVisit: reason.trim(),
      bookedAt: Date.now(), // Strict FCFS timestamp
      status: 'waiting',
    };

    onBookAppointment(newApt);
    setReason('');
    setBookingSuccessToast(
      `Appointment booked! You are Seat #${newApt.tokenNumber} in the queue for ${formatReadableDate(bookingDate)}.`
    );
    setActiveTab('token');
  };

  const handleConfirmCancelAppointment = () => {
    if (!activeAppointment) return;
    const seatNum = activeAppointment.tokenNumber;
    onDeleteAppointment(activeAppointment.id);
    setIsCancelModalOpen(false);
    setBookingSuccessToast(`Appointment (Seat #${seatNum}) was cancelled. Your seat was released and patients below have moved up.`);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isDark ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 border-b px-4 py-3 sm:px-6 transition-colors ${
          isDark
            ? 'bg-zinc-950/90 border-zinc-800 text-white backdrop-blur-md'
            : 'bg-white/90 border-slate-200 text-slate-900 backdrop-blur-md'
        }`}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight">{client.name}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  PATIENT
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Ph: {client.phone} • {clinicConfig.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              type="button"
              onClick={onLogout}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-rose-300 hover:bg-rose-950/40'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Natural fit for both mobile & desktop) */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 pb-24 space-y-4">
        {/* Navigation Menu Pills */}
        <div
          className={`p-1.5 rounded-2xl border flex items-center justify-around text-xs font-semibold ${
            isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'token'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Seat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'book'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Book Next Day</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescriptions')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'prescriptions'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rx & PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'reminders'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alarms</span>
          </button>
        </div>

        {bookingSuccessToast && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{bookingSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setBookingSuccessToast('')}
              className="text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: MY TOKEN & QUEUE POSITION */}
        {activeTab === 'token' && (
          <div className="space-y-4">
            {activeAppointment ? (
              <div
                className={`rounded-2xl p-6 border text-center space-y-4 shadow-sm ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    FCFS Queued Appointment
                  </span>
                  <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    {formatReadableDate(activeAppointment.date)}
                  </h2>
                </div>

                {/* Big Token Number Card */}
                <div className="py-1">
                  <div className="w-28 h-28 mx-auto bg-sky-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-sm">
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                      Your Seat
                    </span>
                    <span className="text-4xl font-black tracking-tight">
                      #{activeAppointment.tokenNumber}
                    </span>
                    <span className="text-[10px] font-medium opacity-90">
                      FCFS Verified
                    </span>
                  </div>
                </div>

                {/* Queue Status & Position in Booked List */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 text-xs text-left ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>
                      Position in Booked List:
                    </span>
                    <strong className="font-bold">
                      Seat #{activeAppointment.tokenNumber} of {allAppointmentsForDate.length}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>
                      Patients Ahead in Queue:
                    </span>
                    <strong className="text-sky-600 dark:text-sky-400 font-bold">
                      {waitingAheadCount === 0 ? 'You are Next in Line!' : `${waitingAheadCount} ahead`}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>
                      Consultation Status:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        activeAppointment.status === 'in-cabin'
                          ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {activeAppointment.status === 'in-cabin' ? 'NOW IN CABIN' : 'WAITING IN QUEUE'}
                    </span>
                  </div>
                </div>

                {/* Clinic Cabin Info */}
                <div
                  className={`text-left text-xs space-y-1 p-3 rounded-xl border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {clinicConfig.doctorName}
                    </span>
                    <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                      {clinicConfig.cabinName}
                    </span>
                  </div>
                  <p className="text-[11px]">{clinicConfig.address}</p>
                </div>

                {activeAppointment.status === 'in-cabin' && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 font-bold animate-pulse">
                    <Volume2 className="w-4 h-4" />
                    <span>Doctor has buzzed your token! Please enter Cabin.</span>
                  </div>
                )}

                {/* Cancel / Delete Appointment Button as requested by user */}
                {/* Requirement: "koi person apni appointment book krke usko baad me delete bhi kar sake aisa kro, taaki uske niche wale ab upar queue me aa jaye uske number par, jab vo appointment delete kare." */}
                {activeAppointment.status === 'waiting' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors ${
                        isDark
                          ? 'bg-rose-950/20 border-rose-800/40 text-rose-300 hover:bg-rose-950/40'
                          : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Cancel / Delete My Appointment</span>
                    </button>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Releases Seat #{activeAppointment.tokenNumber} so patients behind move up in the queue
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`rounded-2xl p-8 text-center space-y-3 border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}
              >
                <Ticket className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold">No Active Seat Scheduled</h3>
                  <p className={`text-xs max-w-xs mx-auto mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    You don&apos;t have an active appointment scheduled right now. Click below to book your seat for the next day!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs inline-flex items-center gap-2"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Book Next Day Appointment</span>
                </button>
              </div>
            )}

            {/* Current Booked List for the Day (See your number in booked list) */}
            {allAppointmentsForDate.length > 0 && (
              <div
                className={`rounded-2xl p-5 border space-y-3 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      Booked List ({formatReadableDate(activeAppointment?.date || nextDayStr)})
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold">
                    {allAppointmentsForDate.length} Booked
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {allAppointmentsForDate.map((apt) => {
                    const isMe = apt.patientId === client.id || apt.patientPhone === client.phone;
                    return (
                      <div
                        key={apt.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          isMe
                            ? isDark
                              ? 'bg-sky-950/40 border-sky-700 text-sky-200 font-bold'
                              : 'bg-sky-50 border-sky-300 text-sky-900 font-bold'
                            : isDark
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isMe
                                ? 'bg-sky-600 text-white'
                                : isDark
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            #{apt.tokenNumber}
                          </span>
                          <span>{isMe ? `${apt.patientName} (You)` : `${apt.patientName.slice(0, 1)}*** ${apt.patientName.split(' ')[1] || ''}`}</span>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${
                            apt.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-amber-500/20 text-amber-600'
                          }`}
                        >
                          {apt.status === 'completed' ? 'Done' : 'Waiting'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOK NEXT DAY APPOINTMENT */}
        {activeTab === 'book' && (
          <div
            className={`rounded-2xl p-6 border space-y-4 shadow-sm ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold">
                STRICT FCFS BOOKING
              </span>
              <h2 className="text-base font-bold mt-1.5">
                Book Next-Day Appointment
              </h2>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Jo pehle book karega, uska number top par! Strict chronological seat allocation.
              </p>
            </div>

            {/* Check already existing appointment rule:
                "A person cannot book more than 1 appointment at the same time, so add this feature too, to check already existing appointment." */}
            {activeAppointment ? (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark
                    ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block text-xs font-bold">
                      Active Appointment Already Scheduled
                    </strong>
                    <p className="text-xs">
                      You currently hold <strong>Seat #{activeAppointment.tokenNumber}</strong> for{' '}
                      <strong>{formatReadableDate(activeAppointment.date)}</strong>. A patient cannot book more than 1 appointment at the same time.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('token')}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    View My Active Seat
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      isDark
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-300 hover:bg-rose-900/50'
                        : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Cancel Existing Appointment
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Seat Forecast Badge */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Live Next Seat Availability:
                    </span>
                    <span className="text-xs sm:text-sm font-bold">
                      For {formatReadableDate(bookingDate)}
                    </span>
                  </div>
                  <div className="px-3.5 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-black shadow-xs text-center">
                    Seat #{nextAvailableSeatNumber}
                  </div>
                </div>

                {bookingError && (
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      isDark
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {bookingError}
                  </div>
                )}

                <form onSubmit={handleConfirmNextDayBooking} className="space-y-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}
                    >
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      min={nextDayStr}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                      }`}
                    />
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Pre-selected to tomorrow ({formatReadableDate(nextDayStr)})
                    </p>
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}
                    >
                      Reason for Visit / Symptoms *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Follow-up consultation, persistent cough, fever since 2 days..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isDark
                          ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div
                    className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>FCFS Priority Guarantee:</span>
                    </div>
                    <p>
                      Your booking timestamp is registered. In Dr. Doctor&apos;s queue, who books first gets the first seat.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Confirm Booking & Get Seat #{nextAvailableSeatNumber}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* TAB 3: PRESCRIPTIONS & PDF DOWNLOAD */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold">My Doctor Prescriptions</h2>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Digital prescription with dosage schedule & official signed PDF
              </p>
            </div>

            {myPrescriptions.length === 0 ? (
              <div
                className={`rounded-2xl p-8 text-center space-y-3 border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}
              >
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold">No Prescriptions Issued Yet</h3>
                  <p className={`text-xs max-w-xs mx-auto mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Once Dr. Doctor prescribes your medicines, they will appear here with automatic reminder alarms and PDF downloads.
                  </p>
                </div>
              </div>
            ) : (
              myPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className={`rounded-2xl p-5 border space-y-4 shadow-sm ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-sky-600 dark:text-sky-400 font-bold block">
                        Prescription #{rx.id.slice(-6)}
                      </span>
                      <h3 className="text-sm font-bold">{formatReadableDate(rx.date)}</h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadPrescriptionPDF(rx)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  {rx.diagnosis && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className={`block font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        Provisional Diagnosis:
                      </span>
                      <span className="font-bold">{rx.diagnosis}</span>
                    </div>
                  )}

                  {/* Medicines List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      Prescribed Medicines ({rx.medicines.length}):
                    </span>

                    {rx.medicines.map((med, idx) => (
                      <div
                        key={med.id || idx}
                        className={`p-3 rounded-xl border space-y-2 text-xs ${
                          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="block font-bold">{med.name}</strong>
                            {med.description && (
                              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                {med.description}
                              </p>
                            )}
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-bold shrink-0">
                            ⏰ {med.time || '08:00 AM'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded-md font-medium ${
                              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Timing: {med.timing === 'before' ? 'Before food (Khali pet)' : 'After food (Khane ke baad)'}
                          </span>

                          <div className="flex items-center gap-1">
                            {med.dosageSlots?.breakfast && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                Breakfast
                              </span>
                            )}
                            {med.dosageSlots?.lunch && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                                Lunch
                              </span>
                            )}
                            {med.dosageSlots?.dinner && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                Dinner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rx.generalAdvice && (
                    <div className="text-xs">
                      <strong className="block text-slate-500 mb-0.5">Doctor Advice:</strong>
                      <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{rx.generalAdvice}</p>
                    </div>
                  )}

                  {/* One-Click PDF Download Bar */}
                  <button
                    type="button"
                    onClick={() => downloadPrescriptionPDF(rx)}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center justify-center gap-2 border transition-colors ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800'
                        : 'bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Signed PDF with Seal</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: MEDICINE ALARM REMINDERS */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold">Medicine Reminder Alarms</h2>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                At the time prescribed, your phone will alert you: &quot;It&apos;s medicine time!&quot;
              </p>
            </div>

            {/* Notification Permission Card */}
            <div
              className={`rounded-2xl p-5 border space-y-3 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">Push Notifications</h3>
                    <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Status: {notifPermission === 'granted' ? 'Enabled (Active)' : 'Action Required'}
                    </span>
                  </div>
                </div>

                {notifPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleRequestNotifications}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Enable Alarms
                  </button>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                )}
              </div>

              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                When enabled, your device will play an audio alarm chime and show push notifications for all scheduled medicine times.
              </p>
            </div>

            {/* Upcoming Dose Highlight Card */}
            {nextDose && (
              <div
                className={`rounded-2xl p-5 border space-y-3 ${
                  isDark ? 'bg-zinc-900 border-sky-800/60' : 'bg-sky-50/70 border-sky-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    Next Upcoming Dose
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-xs font-mono font-bold">
                    ⏰ {nextDose.nextTime}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold">{nextDose.medicineName}</h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    Dose: {nextDose.dosage} ({nextDose.timing})
                  </p>
                  {nextDose.description && (
                    <p className={`text-[11px] italic mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      &quot;{nextDose.description}&quot;
                    </p>
                  )}
                </div>

                <div className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Scheduled in ~{Math.round(nextDose.minutesRemaining / 60)} hrs ({nextDose.minutesRemaining} mins)</span>
                </div>
              </div>
            )}

            {/* Test Alarm Button */}
            <div
              className={`rounded-2xl p-5 border space-y-3 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Test Audio Alarm Chime
                </h3>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Click below to simulate the exact notification sound and alert: *&quot;⏰ It&apos;s medicine time!&quot;*
              </p>

              <button
                type="button"
                onClick={handleTestMedicineNotification}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>Test &quot;It&apos;s Medicine Time!&quot; Alarm Now</span>
              </button>

              {testAlarmTriggered && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 text-center font-bold animate-in fade-in">
                  🔔 Alarm Sound Played & Push Alert Dispatched!
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 border-t py-2 px-4 flex items-center justify-around max-w-xl mx-auto transition-colors ${
          isDark ? 'bg-zinc-950/95 border-zinc-800' : 'bg-white/95 border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('token')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'token' ? 'text-sky-600 dark:text-sky-400 font-bold' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px]">My Seat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('book')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'book' ? 'text-sky-600 dark:text-sky-400 font-bold' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <CalendarPlus className="w-5 h-5" />
          <span className="text-[10px]">Book</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prescriptions')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'prescriptions' ? 'text-sky-600 dark:text-sky-400 font-bold' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Rx & PDF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'reminders' ? 'text-sky-600 dark:text-sky-400 font-bold' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[10px]">Alarms</span>
        </button>
      </nav>

      {/* CANCEL APPOINTMENT CONFIRMATION MODAL */}
      {isCancelModalOpen && activeAppointment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-2xl max-w-sm w-full p-6 border shadow-xl space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Cancel Appointment?</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Release Seat #{activeAppointment.tokenNumber} for {formatReadableDate(activeAppointment.date)}.
                </p>
              </div>
            </div>

            <p className={`text-xs p-3 rounded-xl border ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              Patients behind you in the queue will move up into your seat number.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Keep Seat
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelAppointment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Yes, Cancel & Release Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
