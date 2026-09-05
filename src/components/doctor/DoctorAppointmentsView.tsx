import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle,
  IndianRupee,
  RotateCcw,
} from 'lucide-react';
import { Appointment, QueueStatus, ClientUser } from '../../types';
import { formatReadableDate, isTimestampToday } from '../../services/dataStore';
import { useTheme } from '../../context/ThemeContext';

interface DoctorAppointmentsViewProps {
  appointments: Appointment[];
  clients: ClientUser[];
  onUpdateStatus: (id: string, status: QueueStatus) => void;
  onDeleteAppointment: (id: string) => void;
  onSelectClientForPrescription: (client: ClientUser) => void;
  prescribedAlertToast?: string | null;
  onClearPrescribedAlert?: () => void;
}

export const DoctorAppointmentsView: React.FC<DoctorAppointmentsViewProps> = ({
  appointments,
  clients,
  onUpdateStatus,
  onDeleteAppointment,
  onSelectClientForPrescription,
  prescribedAlertToast,
  onClearPrescribedAlert,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Requirement: "by default doctor ki screen ALL appointments tab pr rehni chiye, jis me sab appointments visible ho. no matter what day, and waha se 'next day' and 'today' hatakar aise classification tabs daaalo: 'All', 'Pending', 'Completed'"
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [aptToDelete, setAptToDelete] = useState<Appointment | null>(null);

  // Counts
  const pendingCount = appointments.filter((a) => a.status !== 'completed').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  // Real-time Today's Completed and Earnings
  const todayCompletedAppointments = appointments.filter(
    (a) =>
      a.status === 'completed' &&
      (isTimestampToday(a.completedAt) || (!a.completedAt && isTimestampToday(a.date)))
  );
  const calculatedTodayEarnings = todayCompletedAppointments.length * 500;

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (activeFilter === 'pending') return apt.status !== 'completed';
    if (activeFilter === 'completed') return apt.status === 'completed';
    return true; // 'all'
  });

  const handleConfirmDeleteAppointment = () => {
    if (!aptToDelete) return;
    onDeleteAppointment(aptToDelete.id);
    setAptToDelete(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Prescribed alert toast redirect banner */}
      {prescribedAlertToast && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            isDark
              ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold">{prescribedAlertToast}</span>
          </div>
          {onClearPrescribedAlert && (
            <button
              type="button"
              onClick={onClearPrescribedAlert}
              className="text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Header & Classification Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-500" />
            <span>All Appointments & OPD Queue</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Comprehensive queue • Strict First-Come-First-Serve (FCFS)
          </p>
        </div>

        {/* Classification Filter Pills: 'All', 'Pending', 'Completed' */}
        <div
          className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-semibold ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeFilter === 'all'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeFilter === 'pending'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeFilter === 'completed'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Live Revenue & FCFS Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Today's Revenue Strip */}
        

        
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div
            className={`rounded-2xl p-8 text-center space-y-2 border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}
          >
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold">No Appointments Found</h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {activeFilter === 'pending'
                ? 'No pending consultations in the queue.'
                : activeFilter === 'completed'
                ? 'No completed appointments yet. Click "Completed" on an appointment to mark it done and add +₹500.'
                : 'No appointments scheduled.'}
            </p>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const clientObj = clients.find((c) => c.phone.replace(/\D/g, '') === apt.patientPhone.replace(/\D/g, ''));
            const dateDDMMYYYY = formatReadableDate(apt.date);
            const isCompleted = apt.status === 'completed';

            return (
              <div
                key={apt.id}
                className={`rounded-2xl p-4 border transition-all ${
                  isCompleted
                    ? isDark
                      ? 'border-emerald-900/40 bg-emerald-950/10'
                      : 'border-emerald-200/80 bg-emerald-50/30 shadow-xs'
                    : isDark
                    ? 'bg-zinc-900 border-zinc-800 hover:border-sky-500/50'
                    : 'bg-white border-slate-200 hover:border-sky-500/50 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Token & Details */}
                  <div className="flex items-start gap-3">
                    <div className="text-center shrink-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-xs ${
                          isCompleted ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                          Seat
                        </span>
                        <span className="text-lg font-black leading-none">
                          #{apt.tokenNumber}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">{apt.patientName}</h3>

                        {/* Date badge formatted as DD/MM/YYYY */}
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wide ${
                            isDark
                              ? 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          Date: {dateDDMMYYYY}
                        </span>

                        {/* Status badge */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isCompleted ? 'COMPLETED' : 'PENDING'}
                        </span>

                        {isCompleted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            +₹500 Earned
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex flex-wrap items-center gap-2 text-xs ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1 font-mono font-medium">
                          <Phone className="w-3 h-3 text-sky-500" />
                          <span>{apt.patientPhone}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            Booked: {formatReadableDate(apt.bookedAt)}{' '}
                            {new Date(apt.bookedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </div>

                      {apt.reasonForVisit && (
                        <p
                          className={`text-[11px] mt-1 px-2.5 py-1 rounded-lg border ${
                            isDark
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <strong className="font-semibold">Reason: </strong>
                          {apt.reasonForVisit}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center flex-wrap gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                    {/* Primary Button: 'Completed' - immediately credits +500 to doctor's today revenue */}
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(apt.id, 'completed')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                        title="Mark Completed (Adds ₹500 to Today's Revenue)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                            isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Done (₹500)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(apt.id, 'waiting')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-xs"
                          title="Undo to Pending"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Quick Issue Rx */}
                    <button
                      type="button"
                      onClick={() => {
                        if (clientObj) {
                          onSelectClientForPrescription(clientObj);
                        } else {
                          onSelectClientForPrescription({
                            id: apt.patientId || `client-${apt.patientPhone}`,
                            name: apt.patientName,
                            phone: apt.patientPhone,
                            passkey: '1111',
                            age: apt.patientAge || 28,
                            gender: apt.patientGender || 'Male',
                            registeredAt: Date.now(),
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-500" />
                      <span>Issue Rx</span>
                    </button>

                    {/* Delete Appointment Button */}
                    <button
                      type="button"
                      onClick={() => setAptToDelete(apt)}
                      className={`p-1.5 rounded-xl text-xs border transition-colors ${
                        isDark
                          ? 'border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'
                          : 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Cancel / Delete Appointment (Shifts lower seats up)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete / Cancel Appointment Modal */}
      {aptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 border space-y-4 shadow-xl ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">Cancel Appointment?</h3>
            </div>

            <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              Are you sure you want to cancel the appointment for{' '}
              <strong>{aptToDelete.patientName}</strong> (Seat #{aptToDelete.tokenNumber}) on{' '}
              <strong>{formatReadableDate(aptToDelete.date)}</strong>?
            </p>

            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              <strong>Strict FCFS Queue Rule:</strong> Deleting this appointment will immediately shift all subsequent patients forward to earlier seat numbers. If this appointment was completed today, its ₹500 will be removed from today&apos;s earnings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAptToDelete(null)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Keep Seat
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteAppointment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Yes, Delete Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
