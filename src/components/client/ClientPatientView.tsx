import React, { useEffect, useState } from 'react';

import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MapPin,
  Pill,
  Share2, // <-- Yeh add karein
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Users,
  Volume2,
} from 'lucide-react';

import {
  ClientUser,
  Appointment,
  Prescription,
  ClinicConfig,
} from '../../types';
import { downloadPrescriptionPDF } from '../../services/pdfGenerator';
import { getNextUpcomingDose } from '../../services/notificationService';
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

type ClientTab = 'home' | 'appointments' | 'records' | 'account';


const getSmartBookingDateString = (): string => {
  const now = new Date();
  const currentHour = now.getHours();
  
  const targetDate = new Date(now);
  
  // Agar 6 PM (18:00) ya uske baad hai, toh agle din shifting karein
  if (currentHour >= 18) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  // Agar calculated date Sunday (Day 0) hai, toh Monday (+1 day further) shift karein
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};





// ---- Small pure helpers (presentation only) ----
const toTime = (d: string | number): number => {
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// Full date label used to group records
const getMonthLabel = (d: string | number): string => {
  return formatReadableDate(d);
};

const formatMinutes = (m: number): string =>
  m < 60 ? `${m} min${m === 1 ? '' : 's'}` : `~${Math.round(m / 60)} hrs (${m} mins)`;

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

  // Bottom navigation tab
  const [activeTab, setActiveTab] = useState<ClientTab>('home');

  const nextDayStr = getNextDayDateString();

  // Booking form state using 6pm and Sunday smart logic
  const initialSmartDate = getSmartBookingDateString();
  const [bookingDate, setBookingDate] = useState(initialSmartDate);
  const [reason, setReason] = useState('');
  
 // Dynamic booking time logic (15 mins gap from last booked or current time)
  const todayAppointments = appointments
    .filter((a) => a.date === bookingDate)
    .sort((a, b) => (b.bookedAt || 0) - (a.bookedAt || 0));
  
  const lastAppointment = todayAppointments[0];
  const calculatedDefaultTime = lastAppointment && lastAppointment.bookedAt
    ? new Date(lastAppointment.bookedAt + 15 * 60 * 1000).toTimeString().slice(0, 5)
    : new Date().toTimeString().slice(0, 5);

  const [bookingTime, setBookingTime] = useState(calculatedDefaultTime);

  // Add this useEffect so time updates dynamically when bookingDate changes
  useEffect(() => {
    setBookingTime(calculatedDefaultTime);
  }, [bookingDate, appointments]);
  
  const [bookingSuccessToast, setBookingSuccessToast] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // View-only UI state
  const [showPastAppointments, setShowPastAppointments] = useState(false);
  const [expandedRxId, setExpandedRxId] = useState<string | null>(null);

  // Always start a tab at the top
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  // Client's appointments (filtered by patientId OR phone)
  const myAppointments = appointments.filter(
    (a) => a.patientId === client.id || a.patientPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')
  );

  // Active or upcoming waiting appointment for this client
  const activeAppointment = myAppointments.find(
    (a) => a.status === 'waiting' || a.status === 'in-cabin'
  );

  // Past (completed) appointments, newest first
  const completedAppointments = myAppointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => toTime(b.date) - toTime(a.date) || b.bookedAt - a.bookedAt);
  const latestCompleted = completedAppointments[0];

  // Client's prescriptions, newest first
  const myPrescriptions = prescriptions.filter(
    (p) => p.patientId === client.id || p.patientPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')
  );
  const sortedPrescriptions = [...myPrescriptions].sort((a, b) => toTime(b.date) - toTime(a.date));
  const latestPrescription = sortedPrescriptions[0];

  // Group prescriptions by month for the Records tab
  const prescriptionGroups = sortedPrescriptions.reduce<{ label: string; items: Prescription[] }[]>(
    (groups, rx) => {
      const label = getMonthLabel(rx.date);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(rx);
      } else {
        groups.push({ label, items: [rx] });
      }
      return groups;
    },
    []
  );

  // Strict first-come-first-served position for the active appointment
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

  // Account summary
  const initials = client.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const personalDetails: { label: string; value: string }[] = [
    { label: 'Full Name', value: client.name },
    { label: 'Phone', value: client.phone },
    ...(client.age ? [{ label: 'Age', value: `${client.age} years` }] : []),
    ...(client.gender ? [{ label: 'Gender', value: String(client.gender) }] : []),
  ];

  // ---- Handlers (unchanged behaviour) ----
  
 
 
 
const handleSharePrescription = async (rx: Prescription) => {
    // Clean formatted text template for fallback or text sharing
    const shareText = 
      `📋 *PRESCRIPTION SUMMARY*\n` +
      `----------------------------------\n` +
      `🏥 *${clinicConfig.name}*\n` +
      `👨‍⚕️ Doctor: ${clinicConfig.doctorName}\n` +
      `📅 Date: ${formatReadableDate(rx.date)}\n` +
      `🔖 Rx ID: #${rx.id.slice(-6)}\n` +
      `${rx.diagnosis ? `🩺 Diagnosis: ${rx.diagnosis}\n` : ''}` +
      `----------------------------------\n` +
      `💊 *Prescribed Medicines:*\n` +
      rx.medicines.map((m, idx) => `  ${idx + 1}. *${m.name}* (${m.timing === 'before' ? 'Before food' : 'After food'})${m.times?.length ? ` - [${m.times.join(', ')}]` : ''}`).join('\n') +
      `${rx.generalAdvice ? `\n\n💡 *Advice:* ${rx.generalAdvice}` : ''}\n` +
      `----------------------------------`;

    try {
      // 1. Try generating and sharing PDF file first
      const doc = downloadPrescriptionPDF(rx, { returnPdfInstance: true });
      if (doc) {
        const pdfBlob = doc.output('blob');
        const fileName = `Prescription-${rx.id.slice(-6)}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `Prescription #${rx.id.slice(-6)}`,
            text: `Official prescription from ${clinicConfig.doctorName} dated ${formatReadableDate(rx.date)}`,
            files: [pdfFile],
          });
          return;
        }
      }
    } catch (pdfErr) {
      console.log('PDF sharing skipped/failed, falling back to text share:', pdfErr);
    }

    // 2. Fallback: Share formatted text directly if PDF sharing fails or isn't supported
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Prescription #${rx.id.slice(-6)}`,
          text: shareText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        alert('Prescription text details copied to clipboard!');
      } else {
        alert('Sharing is not supported on this browser.');
      }
    } catch (textErr: any) {
      // Ignore AbortError if user simply cancelled the share dialog
      if (textErr.name !== 'AbortError') {
        console.log('Error sharing prescription text:', textErr);
      }
    }
  };
 
 
 
  
  const handleConfirmNextDayBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    // A patient cannot hold more than one active appointment at a time.
    if (activeAppointment) {
      setBookingError(
        `You already have an active appointment (Seat #${activeAppointment.tokenNumber} for ${formatReadableDate(
          activeAppointment.date
        )}). A person cannot book more than 1 appointment at the same time. If you wish to book another date, please cancel your existing appointment first.`
      );
      return;
    }

    if (!reason.trim()) {
      setBookingError('Please enter the reason for your clinic consultation.');
      return;
    }

    const targetTimestamp = bookingTime 
      ? new Date(`${bookingDate}T${bookingTime}`).getTime() 
      : Date.now();

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
      bookedAt: Number.isNaN(targetTimestamp) ? Date.now() : targetTimestamp, // 15 mins gap or current timestamp
      status: 'waiting',
    };

    onBookAppointment(newApt);
    setReason('');
    setBookingSuccessToast(
      `Appointment booked! You are Seat #${newApt.tokenNumber} in the queue for ${formatReadableDate(bookingDate)}.`
    );
  };

  const handleConfirmCancelAppointment = () => {
    if (!activeAppointment) return;
    const seatNum = activeAppointment.tokenNumber;
    onDeleteAppointment(activeAppointment.id);
    setIsCancelModalOpen(false);
    setBookingSuccessToast(`Appointment (Seat #${seatNum}) was cancelled. Your seat was released and patients below have moved up.`);
  };

  // Jump to Records and open the matching prescription (or the latest one)
  const openPrescriptionFor = (date?: string) => {
    const match = date ? sortedPrescriptions.find((rx) => rx.date === date) : undefined;
    const target = match ?? latestPrescription;
    setExpandedRxId(target ? target.id : null);
    setActiveTab('records');
  };

  // ---- Theme tokens (white/green and black/green) ----
  const ui = {
    page: isDark ? 'bg-black text-zinc-100' : 'bg-slate-100 text-slate-900',
    shell: isDark ? 'bg-black' : 'bg-white',
    band: isDark ? 'bg-zinc-900' : 'bg-slate-100',
    card: isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200',
    inset: isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200',
    tint: isDark ? 'bg-green-950/40 border-green-900/60' : 'bg-green-50 border-green-100',
    tintDivider: isDark ? 'border-green-900/60' : 'border-green-200',
    tintButton: isDark
      ? 'bg-zinc-900 text-green-400 border border-zinc-800 hover:bg-zinc-800'
      : 'bg-white text-green-700 border border-green-100 hover:bg-green-50',
    muted: isDark ? 'text-zinc-400' : 'text-slate-500',
    faint: isDark ? 'text-zinc-500' : 'text-slate-400',
    accent: isDark ? 'text-green-400' : 'text-green-600',
    accentStrong: isDark ? 'text-green-300' : 'text-green-700',
    iconTile: isDark ? 'bg-green-950/60' : 'bg-green-50',
    rowBorder: isDark ? 'border-zinc-800' : 'border-slate-200',
    hero: isDark
      ? 'bg-gradient-to-br from-green-900 via-green-950 to-black'
      : 'bg-gradient-to-br from-green-600 to-emerald-700',
    input: isDark
      ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600'
      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white',
    outlineButton: isDark
      ? 'border-green-700 text-green-400 hover:bg-green-950/40'
      : 'border-green-600 text-green-700 hover:bg-green-50',
    dangerButton: isDark
      ? 'bg-zinc-900 border-rose-900/60 text-rose-300 hover:bg-rose-950/40'
      : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50',
  };

  const band = <div className={`h-2 ${ui.band}`} />;

  const pageHeader = (title: string) => (
    <div className="px-5 pt-7 pb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className={`mt-0.5 text-sm font-semibold ${ui.accent}`}>{client.name}</p>
    </div>
  );

  const sectionTitle = (title: string, right?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {right}
    </div>
  );

  // ---- Reusable cards ----
  const renderActiveAppointmentCard = (variant: 'home' | 'full') => {
    if (!activeAppointment) return null;
    const inCabin = activeAppointment.status === 'in-cabin';

    return (
      <div className={`rounded-2xl border p-5 ${ui.tint} ${variant === 'home' ? 'shadow-lg' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm">
              <span className={`font-bold ${ui.accentStrong}`}>
                {inCabin ? 'Now in Cabin' : 'Waiting in Queue'}
              </span>{' '}
              <span className={ui.muted}>Appointment</span>
            </p>
            <p className="text-base mt-0.5">for {client.name}</p>
          </div>

          <div className="w-16 h-16 shrink-0 rounded-xl bg-green-600 text-white flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Seat</span>
            <span className="text-2xl font-black leading-none">#{activeAppointment.tokenNumber}</span>
          </div>
        </div>

        <p className="mt-3 text-lg font-bold leading-snug">{clinicConfig.doctorName}</p>
        <p className={`text-sm ${ui.muted}`}>
          {clinicConfig.name} • {clinicConfig.cabinName}
        </p>
        <p className="mt-2 text-base font-bold">
          {formatReadableDate(activeAppointment.date)}
        </p>

        <div className={`my-4 border-t ${ui.tintDivider}`} />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className={`text-xs ${ui.muted}`}>Patients Ahead</p>
            <p className={`font-bold ${ui.accentStrong}`}>
              {waitingAheadCount === 0 ? 'You are next!' : `${waitingAheadCount} ahead`}
            </p>
          </div>
          <div>
            <p className={`text-xs ${ui.muted}`}>Position in List</p>
            <p className="font-bold">
              Seat #{activeAppointment.tokenNumber} of {allAppointmentsForDate.length}
            </p>
          </div>
        </div>

        {inCabin && (
          <div className="mt-4 p-3 bg-green-500/20 border border-green-500/40 rounded-xl text-sm flex items-center justify-center gap-2 font-bold animate-pulse">
            <Volume2 className="w-4 h-4" />
            <span>Doctor has buzzed your token! Please enter Cabin.</span>
          </div>
        )}

        {variant === 'home' ? (
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${ui.tintButton}`}
          >
            <span>View Queue Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          activeAppointment.status === 'waiting' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className={`w-full rounded-xl py-3 text-sm font-semibold border flex items-center justify-center gap-2 transition-colors ${ui.dangerButton}`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Cancel Appointment</span>
              </button>
              <p className={`mt-1.5 text-xs text-center ${ui.faint}`}>
                Releases Seat #{activeAppointment.tokenNumber} so patients behind move up in the queue
              </p>
            </div>
          )
        )}
      </div>
    );
  };

  const renderCompletedAppointmentCard = (apt: Appointment) => (
    <div className={`rounded-2xl border p-5 ${ui.tint}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <span className={`font-bold ${ui.accentStrong}`}>Completed</span>{' '}
            <span className={ui.muted}>Appointment</span>
          </p>
          <p className="text-base mt-0.5">for {apt.patientName}</p>
        </div>

        <div
          className={`w-16 h-16 shrink-0 rounded-xl border-2 flex items-center justify-center ${
            isDark ? 'bg-green-950/60 border-green-800' : 'bg-green-100 border-green-300'
          }`}
        >
          <Stethoscope className={`w-7 h-7 ${ui.accentStrong}`} />
        </div>
      </div>

      <p className="mt-3 text-lg font-bold leading-snug">{clinicConfig.doctorName}</p>
      <p className={`text-sm ${ui.muted}`}>{clinicConfig.name}</p>
      <p className="mt-2 text-base font-bold">
        {formatReadableDate(apt.date)} | Seat #{apt.tokenNumber}
      </p>

      <div className={`my-4 border-t ${ui.tintDivider}`} />

      <button
        type="button"
        onClick={() => openPrescriptionFor(apt.date)}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${ui.tintButton}`}
      >
        View Prescription
      </button>
    </div>
  );

  const navItems: { id: ClientTab; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'appointments', label: 'Appointments', Icon: CalendarCheck },
    { id: 'records', label: 'Records', Icon: FolderOpen },
    { id: 'account', label: 'Account', Icon: User },
  ];
  const activeIndex = navItems.findIndex((item) => item.id === activeTab);

  const quickActions: {
    key: string;
    label: string;
    Icon: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
  }[] = [
    {
      key: 'book',
      label: 'Book Appointment',
      Icon: CalendarPlus,
      onClick: () => setActiveTab('appointments'),
    },
    {
      key: 'rx',
      label: 'Prescriptions',
      Icon: FileText,
      onClick: () => openPrescriptionFor(),
    },
    {
      key: 'pdf',
      label: 'Latest Rx PDF',
      Icon: Download,
      onClick: () => {
        if (latestPrescription) downloadPrescriptionPDF(latestPrescription);
      },
      disabled: !latestPrescription,
    },
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors ${ui.page}`}>
      <div className={`relative max-w-xl mx-auto min-h-screen flex flex-col pb-28 ${ui.shell}`}>
        {/* Toast (booking / cancellation feedback) */}
        {bookingSuccessToast && (
          <div className="fixed top-3 inset-x-0 z-50 max-w-xl mx-auto px-4">
            <div
              className={`p-3.5 rounded-xl text-sm flex items-start justify-between gap-3 border shadow-lg ${
                isDark
                  ? 'bg-green-950 border-green-800 text-green-200'
                  : 'bg-green-50 border-green-200 text-green-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span>{bookingSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setBookingSuccessToast('')}
                className="text-xs font-semibold hover:underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ===================== HOME ===================== */}
        {activeTab === 'home' && (
          <>
            <header className={`relative overflow-hidden px-5 pt-6 pb-24 text-white ${ui.hero}`}>
              <div aria-hidden className="absolute -right-10 -top-12 w-48 h-48 rounded-full bg-white/10" />
              <div aria-hidden className="absolute -left-16 top-20 w-40 h-40 rounded-full bg-white/5" />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="leading-tight min-w-0">
                    <p className="text-base font-bold tracking-tight truncate">{clinicConfig.name}</p>
                    <p className="text-[11px] text-white/75 truncate">{clinicConfig.doctorName}</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <h1 className="relative mt-8 text-2xl font-bold tracking-tight">
                Hello,{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className="underline underline-offset-4 decoration-white/60"
                >
                  {client.name}
                </button>
              </h1>
            </header>

            <div className="relative z-10 -mt-16 px-4 pb-6 space-y-4">
              {activeAppointment ? (
                renderActiveAppointmentCard('home')
              ) : (
                <>
                  <div className={`rounded-2xl border shadow-lg p-5 ${ui.card}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold leading-snug tracking-tight">
                          Book Doctor Appointment
                        </h2>
                        <p className={`mt-1 text-sm ${ui.muted}`}>
                          Reserve your seat with {clinicConfig.doctorName}
                        </p>
                      </div>
                      <div
                        className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center ${ui.iconTile}`}
                      >
                        <Stethoscope className={`w-7 h-7 ${ui.accent}`} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('appointments')}
                      className={`mt-4 w-full flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm transition-colors ${ui.inset}`}
                    >
                      <span className={ui.muted}>
                        Next available: {formatReadableDate(nextDayStr)}
                      </span>
                      <CalendarPlus className={`w-5 h-5 ${ui.accent}`} />
                    </button>
                  </div>

                  {latestCompleted && renderCompletedAppointmentCard(latestCompleted)}
                </>
              )}
            </div>

            {nextDose && (
              <>
                {band}
                <section className="px-5 py-5">
                  {sectionTitle('Next Medicine Dose')}
                  <div className={`rounded-2xl border p-4 ${ui.card}`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${ui.iconTile}`}
                      >
                        <Pill className={`w-5 h-5 ${ui.accent}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold leading-snug">{nextDose.medicineName}</h3>
                          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-600 text-white text-xs font-bold">
                            <Clock className="w-3 h-3" />
                            {nextDose.nextTime}
                          </span>
                        </div>
                        <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                          Dose: {nextDose.dosage} ({nextDose.timing})
                        </p>
                        {nextDose.description && (
                          <p className={`mt-1 text-xs italic ${ui.muted}`}>
                            &quot;{nextDose.description}&quot;
                          </p>
                        )}
                        <p className={`mt-2 text-xs flex items-center gap-1 ${ui.muted}`}>
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>In {formatMinutes(nextDose.minutesRemaining)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {band}
            <section className="px-5 py-5">
              {sectionTitle('Quick Access')}
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map(({ key, label, Icon, onClick, disabled }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className={`flex flex-col items-center gap-2 ${
                      disabled ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <span
                      className={`w-full h-20 rounded-2xl border flex items-center justify-center transition-colors ${ui.card} ${
                        disabled ? '' : isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-8 h-8 ${ui.accent}`} strokeWidth={1.6} />
                    </span>
                    <span className="text-xs font-medium text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ===================== APPOINTMENTS ===================== */}
        {activeTab === 'appointments' && (
          <>
            {pageHeader('Appointments')}
            {band}

            {activeAppointment ? (
              <>
                <section className="px-5 py-5">
                  {sectionTitle('Upcoming Appointment')}
                  {renderActiveAppointmentCard('full')}
                  <p className={`mt-3 text-xs ${ui.faint}`}>
                    You can book a new appointment once this one is completed or cancelled.
                  </p>
                </section>

                {allAppointmentsForDate.length > 0 && (
                  <>
                    {band}
                    <section className="px-5 py-5">
                      {sectionTitle(
                        `Queue for ${formatReadableDate(activeAppointment.date)}`,
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${ui.accent}`}>
                          <Users className="w-4 h-4" />
                          {allAppointmentsForDate.length} Booked
                        </span>
                      )}

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {allAppointmentsForDate.map((apt) => {
                          const isMe = apt.patientId === client.id || apt.patientPhone === client.phone;
                          return (
                            <div
                              key={apt.id}
                              className={`px-3.5 py-3 rounded-xl border flex items-center justify-between text-sm transition-colors ${
                                isMe
                                  ? isDark
                                    ? 'bg-green-950/40 border-green-700 text-green-200 font-bold'
                                    : 'bg-green-50 border-green-300 text-green-900 font-bold'
                                  : `${ui.inset} ${isDark ? 'text-zinc-300' : 'text-slate-700'}`
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    isMe
                                      ? 'bg-green-600 text-white'
                                      : isDark
                                      ? 'bg-zinc-800 text-zinc-300'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  #{apt.tokenNumber}
                                </span>
                                <span>
                                  {isMe
                                    ? `${apt.patientName} (You)`
                                    : `${apt.patientName.slice(0, 1)}*** ${apt.patientName.split(' ')[1] || ''}`}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-semibold ${
                                  apt.status === 'completed'
                                    ? 'bg-green-500/20 text-green-600'
                                    : 'bg-amber-500/20 text-amber-600'
                                }`}
                              >
                                {apt.status === 'completed' ? 'Done' : 'Waiting'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}
              </>
            ) : (
              <section className="px-5 py-5">
                {sectionTitle('Book Doctor Appointment')}
                <p className={`-mt-1 mb-4 text-sm ${ui.muted}`}>
                  You have no active booking. Pick a date and tell us the reason for your visit to reserve your seat.
                </p>

                {/* Seat preview */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${ui.inset}`}>
                  <div>
                    <span className={`text-[11px] uppercase font-bold block ${ui.muted}`}>
                      Next Available Seat
                    </span>
                    <span className="text-sm font-bold">For {formatReadableDate(bookingDate)}</span>
                  </div>
                  <div className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-black text-center shadow-sm">
                    Seat #{nextAvailableSeatNumber}
                  </div>
                </div>

                {bookingError && (
                  <div
                    className={`mt-4 p-3.5 rounded-xl text-sm border flex items-start gap-2.5 ${
                      isDark
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <form onSubmit={handleConfirmNextDayBooking} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Appointment Time *</label>
                    
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      min={initialSmartDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-green-500 ${ui.input}`}
                    />
                    
                    <p className={`text-xs mt-1.5 ${ui.faint}`}>
  {lastAppointment ? `Next available time: ${calculatedDefaultTime}` : `Current default time: ${calculatedDefaultTime}`}
</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      Reason for Visit / Symptoms *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Follow-up consultation, persistent cough, fever since 2 days..."
                      className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-green-500 ${ui.input}`}
                    />
                  </div>

                  <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${ui.inset} ${ui.muted}`}>
                    <div className={`flex items-center gap-1.5 font-semibold ${ui.accent}`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>First Come, First Served</span>
                    </div>
                    <p>
                      Seats are allotted strictly in the order bookings are made. You can cancel anytime before your turn to release your seat.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Confirm Booking & Get Seat #{nextAvailableSeatNumber}</span>
                  </button>
                </form>
              </section>
            )}

            {band}
            <section className="px-5 py-5 space-y-3">
              {sectionTitle('Recent Appointments')}

              {latestCompleted ? (
                <>
                  {renderCompletedAppointmentCard(latestCompleted)}

                  {completedAppointments.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPastAppointments((prev) => !prev)}
                        className={`w-full rounded-xl border-2 px-4 py-3.5 text-sm font-semibold flex items-center justify-between transition-colors ${ui.outlineButton}`}
                      >
                        <span className="flex items-center gap-3">
                          <CalendarCheck className="w-5 h-5" />
                          View Past Appointments ({completedAppointments.length - 1})
                        </span>
                        <ChevronRight
                          className={`w-5 h-5 transition-transform ${showPastAppointments ? 'rotate-90' : ''}`}
                        />
                      </button>

                      {showPastAppointments && (
                        <div className="space-y-2">
                          {completedAppointments.slice(1).map((apt) => (
                            <div
                              key={apt.id}
                              className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${ui.card}`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold">{formatReadableDate(apt.date)}</p>
                                <p className={`text-xs mt-0.5 truncate ${ui.muted}`}>
                                  {apt.reasonForVisit || clinicConfig.doctorName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] px-2.5 py-1 rounded-full uppercase font-semibold bg-green-500/20 text-green-600">
                                  Seat #{apt.tokenNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openPrescriptionFor(apt.date)}
                                  className={`text-xs font-semibold hover:underline ${ui.accent}`}
                                >
                                  Prescription
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className={`rounded-2xl border p-6 text-center ${ui.inset}`}>
                  <CalendarCheck className={`w-9 h-9 mx-auto ${ui.faint}`} />
                  <p className={`mt-2 text-sm ${ui.muted}`}>No past appointments yet.</p>
                </div>
              )}
            </section>
          </>
        )}



{/* ===================== RECORDS ===================== */}
        {activeTab === 'records' && (
          <>
            {pageHeader('My Health Records')}
            {band}

            <section className="px-5 py-5 space-y-5">
              {myPrescriptions.length === 0 ? (
                <div className={`rounded-2xl border p-8 text-center space-y-3 ${ui.inset}`}>
                  <FileText className={`w-10 h-10 mx-auto ${ui.faint}`} />
                  <div>
                    <h3 className="text-base font-bold">No Prescriptions Issued Yet</h3>
                    <p className={`text-sm max-w-xs mx-auto mt-1 ${ui.muted}`}>
                      Once {clinicConfig.doctorName} prescribes your medicines, they will appear here with medicine reminders and PDF downloads.
                    </p>
                  </div>
                </div>
              ) : (
                prescriptionGroups.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <h2 className={`text-xl font-bold ${ui.muted}`}>{group.label}</h2>

                    {group.items.map((rx) => {
                      const isOpen = expandedRxId === rx.id;
                      return (
                        <div key={rx.id} className={`rounded-2xl border overflow-hidden ${ui.card}`}>
                          <button
                            type="button"
                            onClick={() => setExpandedRxId(isOpen ? null : rx.id)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center gap-4 p-4 text-left"
                          >
                            <div
                              className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center ${ui.iconTile}`}
                            >
                              <FileText className={`w-6 h-6 ${ui.accent}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs ${ui.muted}`}>Advised by: {clinicConfig.doctorName}</p>
                              <p className="text-base font-bold leading-snug">
                                Prescription #{rx.id.slice(-6)}
                              </p>
                              <p className={`mt-0.5 text-sm flex items-center gap-1.5 flex-wrap ${ui.muted}`}>
                                <span>{formatReadableDate(rx.date)}</span>
                                <span>|</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                    isDark ? 'bg-green-950/60 text-green-300' : 'bg-green-50 text-green-700'
                                  }`}
                                >
                                  Rx
                                </span>
                                <span>
                                  {rx.medicines.length} medicine{rx.medicines.length === 1 ? '' : 's'}
                                </span>
                              </p>
                            </div>

                            <ChevronDown
                              className={`w-5 h-5 shrink-0 transition-transform ${ui.muted} ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isOpen && (
                            <div className={`border-t px-4 py-4 space-y-4 ${ui.rowBorder}`}>
                              {rx.diagnosis && (
                                <div className={`p-3.5 rounded-xl border text-sm ${ui.inset}`}>
                                  <span className={`block text-xs font-semibold ${ui.muted}`}>
                                    Provisional Diagnosis
                                  </span>
                                  <span className="font-bold">{rx.diagnosis}</span>
                                </div>
                              )}

                              {/* Medicines List */}
                              <div className="space-y-2.5">
                                <span className="text-xs font-bold uppercase tracking-wider block">
                                  Prescribed Medicines ({rx.medicines.length})
                                </span>

                                {rx.medicines.map((med, idx) => (
                                  <div
                                    key={med.id || idx}
                                    className={`p-3.5 rounded-xl border space-y-2.5 text-sm ${ui.inset}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <strong className="block font-bold">{med.name}</strong>
                                        {med.description && (
                                          <p className={`text-xs mt-0.5 ${ui.muted}`}>{med.description}</p>
                                        )}
                                      </div>

                                      <span
                                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                          isDark ? 'bg-green-950/60 text-green-300' : 'bg-green-100 text-green-700'
                                        }`}
                                      >
                                        <Clock className="w-3 h-3" />
                                        {med.times && med.times.length > 0 ? med.times.join(', ') : '08:00 AM'}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span
                                        className={`px-2 py-1 rounded-md font-medium ${
                                          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        Timing: {med.timing === 'before' ? 'Before food (Khali pet)' : 'After food (Khane ke baad)'}
                                      </span>

                                      <div className="flex items-center gap-1">
                                        {med.dosageSlots?.breakfast && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-bold">
                                            Breakfast
                                          </span>
                                        )}
                                        {med.dosageSlots?.lunch && (
                                          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 text-[10px] font-bold">
                                            Lunch
                                          </span>
                                        )}
                                        {med.dosageSlots?.dinner && (
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 text-[10px] font-bold">
                                            Dinner
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {rx.generalAdvice && (
                                <div className="text-sm">
                                  <strong className={`block text-xs mb-0.5 ${ui.muted}`}>Doctor Advice</strong>
                                  <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                    {rx.generalAdvice}
                                  </p>
                                </div>
                              )}

                              {/* Download & Share Action Buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => downloadPrescriptionPDF(rx)}
                                  className="py-3 px-3 rounded-xl text-xs font-semibold bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                >
                                  <Download className="w-4 h-4 shrink-0" />
                                  <span>Download PDF</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const shareText = `Prescription #${rx.id.slice(-6)} from ${clinicConfig.doctorName} (${clinicConfig.name})\nDate: ${formatReadableDate(rx.date)}\nMedicines: ${rx.medicines.map(m => m.name).join(', ')}`;
                                      if (navigator.share) {
                                        await navigator.share({
                                          title: `Prescription #${rx.id.slice(-6)}`,
                                          text: shareText,
                                        });
                                      } else {
                                        alert('Sharing is not supported on this browser.');
                                      }
                                    } catch (err) {
                                      console.log('Error sharing:', err);
                                    }
                                  }}
                                  className={`py-3 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
                                    isDark
                                      ? 'bg-zinc-800 border-zinc-700 text-green-400 hover:bg-zinc-700'
                                      : 'bg-white border-slate-300 text-green-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <Share2 className="w-4 h-4 shrink-0" />
                                  <span>Share Prescription</span>
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </section>
          </>
        )}



        {/* ===================== ACCOUNT ===================== */}
        {activeTab === 'account' && (
          <>
            <div className="px-5 pt-8 pb-6 text-center">
              <div
                className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-md ${
                  isDark
                    ? 'bg-gradient-to-br from-green-700 to-green-900'
                    : 'bg-gradient-to-br from-green-500 to-emerald-700'
                }`}
              >
                {initials || <User className="w-10 h-10" />}
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight">{client.name}</h1>
              <p className={`mt-1 text-sm ${ui.muted}`}>
                ID: {String(client.id).slice(-8).toUpperCase()}
              </p>
              <p className={`text-sm ${ui.muted}`}>{client.phone}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className={`p-3.5 rounded-xl border text-center transition-colors ${ui.card}`}
                >
                  <span className={`block text-xl font-black ${ui.accent}`}>{completedAppointments.length}</span>
                  <span className={`text-[11px] uppercase font-bold tracking-wider ${ui.muted}`}>
                    Visits Completed
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('records')}
                  className={`p-3.5 rounded-xl border text-center transition-colors ${ui.card}`}
                >
                  <span className={`block text-xl font-black ${ui.accent}`}>{myPrescriptions.length}</span>
                  <span className={`text-[11px] uppercase font-bold tracking-wider ${ui.muted}`}>
                    Prescriptions
                  </span>
                </button>
              </div>
            </div>

            {band}
            <section>
              <h2 className={`px-5 pt-4 pb-1 text-xs font-bold uppercase tracking-wider ${ui.muted}`}>
                Personal Details
              </h2>
              {personalDetails.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between gap-4 px-5 py-3.5 border-b ${ui.rowBorder}`}
                >
                  <span className={`text-sm ${ui.muted}`}>{item.label}</span>
                  <span className="text-sm font-semibold text-right">{item.value}</span>
                </div>
              ))}
            </section>

            {band}
            <section>
              <h2
                className={`px-5 pt-4 pb-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${ui.muted}`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Clinic Details
              </h2>
              {[
                { label: 'Clinic', value: clinicConfig.name },
                { label: 'Doctor', value: clinicConfig.doctorName },
                { label: 'Cabin', value: clinicConfig.cabinName },
                { label: 'Address', value: clinicConfig.address },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-start justify-between gap-4 px-5 py-3.5 border-b ${ui.rowBorder}`}
                >
                  <span className={`text-sm shrink-0 ${ui.muted}`}>{item.label}</span>
                  <span className="text-sm font-semibold text-right">{item.value}</span>
                </div>
              ))}
            </section>

            {band}
            <div className={`flex items-center justify-between gap-4 px-5 py-3 border-b ${ui.rowBorder}`}>
              <span className="text-base">Appearance</span>
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={onLogout}
              className={`flex items-center gap-3 px-5 py-4 text-base font-semibold text-left transition-colors border-b ${ui.rowBorder} ${
                isDark ? 'text-rose-300 hover:bg-rose-950/30' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-40 max-w-xl mx-auto border-t backdrop-blur-md transition-colors ${
          isDark ? 'bg-zinc-950/95 border-zinc-800' : 'bg-white/95 border-slate-200'
        } shadow-[0_-4px_16px_rgba(15,23,42,0.06)]`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative grid grid-cols-4">
          <span
            aria-hidden
            className={`absolute -top-px left-0 h-[3px] w-1/4 transition-transform duration-300 ${
              isDark ? 'bg-green-400' : 'bg-green-600'
            }`}
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />

          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 pt-3 pb-2.5 transition-colors ${
                  isActive
                    ? `font-bold ${ui.accent}`
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.2 : 1.7} />
                <span className="text-[11px] leading-none">{label}</span>
              </button>
            );
          })}
        </div>
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
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Cancel Appointment?</h3>
                <p className={`text-sm ${ui.muted}`}>
                  Release Seat #{activeAppointment.tokenNumber} for {formatReadableDate(activeAppointment.date)}.
                </p>
              </div>
            </div>

            <p className={`text-sm p-3 rounded-xl border ${ui.inset} ${ui.muted}`}>
              Patients behind you in the queue will move up into your seat number.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${
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
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm"
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
