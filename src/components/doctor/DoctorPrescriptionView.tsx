import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  Send,
  UserCheck,
} from 'lucide-react';
import {
  ClientUser,
  Prescription,
  PrescriptionMedicine,
  ClinicConfig,
  DOCTOR_ADMIN,
} from '../../types';
import { downloadPrescriptionPDF } from '../../services/pdfGenerator';
import { sendMedicineAlarmNotification } from '../../services/notificationService';
import { getTodayDateString } from '../../services/dataStore';
import { useTheme } from '../../context/ThemeContext';

interface DoctorPrescriptionViewProps {
  clients: ClientUser[];
  clinicConfig: ClinicConfig;
  selectedClient?: ClientUser | null;
  onSavePrescription: (rx: Prescription) => void;
  recentPrescriptions: Prescription[];
  onPrescriptionIssued?: (patientName: string) => void;
}

export const DoctorPrescriptionView: React.FC<DoctorPrescriptionViewProps> = ({
  clients,
  clinicConfig,
  selectedClient,
  onSavePrescription,
  recentPrescriptions,
  onPrescriptionIssued,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedClientId, setSelectedClientId] = useState<string>(
    selectedClient?.id || clients[0]?.id || ''
  );

  useEffect(() => {
    if (selectedClient?.id) {
      setSelectedClientId(selectedClient.id);
    }
  }, [selectedClient]);

  // Clinical Details - initialized completely EMPTY as instructed:
  // "do not fill 2. Provisional Diagnosis & Vitals automatically with default values, leave it empty"
  const [diagnosis, setDiagnosis] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [generalAdvice, setGeneralAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Medicines List - initialized completely EMPTY as instructed:
  // "do not add dummy medicines Amoxicillin + Clavulanic Acid 625mg yourself, leave that space empty, doctor will add himself"
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);

  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const clientObj = clients.find((c) => c.id === selectedClientId) || clients[0];

  const handleAddMedicineRow = () => {
    const newMed: PrescriptionMedicine = {
      id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      description: '',
      dosageSlots: { breakfast: true, lunch: false, dinner: true },
      timing: 'after',
      times: ['08:30'], // Multiple times array with native clock picker support
      durationDays: 5,
    };
    setMedicines([...medicines, newMed]);
  };

  const handleRemoveMedicineRow = (id: string) => {
    setMedicines(medicines.filter((m) => m.id !== id));
  };

  const handleUpdateMed = (
    id: string,
    field: keyof PrescriptionMedicine,
    value: any
  ) => {
    setMedicines(
      medicines.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };
  
  const handleAddMedTime = (medId: string) => {
    setMedicines(
      medicines.map((m) => {
        if (m.id === medId) {
          return { ...m, times: [...m.times, '12:00'] };
        }
        return m;
      })
    );
  };

  const handleRemoveMedTime = (medId: string, timeIndex: number) => {
    setMedicines(
      medicines.map((m) => {
        if (m.id === medId) {
          const newTimes = m.times.filter((_, idx) => idx !== timeIndex);
          return { ...m, times: newTimes.length > 0 ? newTimes : ['08:30'] };
        }
        return m;
      })
    );
  };

  const handleUpdateMedTime = (medId: string, timeIndex: number, value: string) => {
    setMedicines(
      medicines.map((m) => {
        if (m.id === medId) {
          const newTimes = [...m.times];
          newTimes[timeIndex] = value;
          return { ...m, times: newTimes };
        }
        return m;
      })
    );
  };

  const handleToggleDosageSlot = (
    id: string,
    slot: 'breakfast' | 'lunch' | 'dinner'
  ) => {
    setMedicines(
      medicines.map((m) => {
        if (m.id === id) {
          return {
            ...m,
            dosageSlots: {
              ...m.dosageSlots,
              [slot]: !m.dosageSlots[slot],
            },
          };
        }
        return m;
      })
    );
  };

  const handleSubmitPrescription = (downloadPdf = false) => {
    if (!clientObj) {
      alert('Please select a client first.');
      return;
    }

    const validMeds = medicines.filter((m) => m.name.trim().length > 0);
    if (validMeds.length === 0) {
      alert('Please add at least one medicine with a name.');
      return;
    }

    const rx: Prescription = {
      id: `rx-${Date.now()}`,
      patientId: clientObj.id,
      patientName: clientObj.name,
      patientPhone: clientObj.phone,
      patientAge: clientObj.age || 28,
      patientGender: clientObj.gender || 'Male',
      doctorName: DOCTOR_ADMIN.name,
      doctorRegNo: DOCTOR_ADMIN.regNumber,
      clinicName: clinicConfig.name,
      clinicAddress: clinicConfig.address,
      clinicPhone: DOCTOR_ADMIN.phone,
      date: getTodayDateString(),
      diagnosis: diagnosis.trim() || 'General Consultation',
      symptoms: symptomsInput
        ? symptomsInput.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      vitals: {
        bp: bp || undefined,
        pulse: pulse || undefined,
        temperature: temperature || undefined,
        spo2: spo2 || undefined,
      },
      medicines: validMeds,
      generalAdvice: generalAdvice.trim(),
      followUpDate: followUpDate || undefined,
      createdAt: Date.now(),
    };

    onSavePrescription(rx);

    // Trigger immediate reminder notification simulation for patient device
    const firstMed = validMeds[0];
    const doseLabel = Object.entries(firstMed.dosageSlots)
      .filter(([_, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
      .join('/');

    sendMedicineAlarmNotification(
      firstMed.name,
      doseLabel || '1 Dose',
      firstMed.timing === 'before' ? 'Before food' : 'After food',
      firstMed.description
    );

    if (downloadPdf) {
      downloadPrescriptionPDF(rx);
    }

    // "on clicking save & issue prescription on client phone button, doctor should be redurected to appointments ( next day queue ) with an alert that ( prescribed )"
    if (onPrescriptionIssued) {
      onPrescriptionIssued(clientObj.name);
    } else {
      alert(`(Prescribed)\nPrescription successfully issued to ${clientObj.name} (${clientObj.phone})!`);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            <span>Digital Prescription Console</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Issue prescriptions with dose schedule, PDF download & push reminder alarms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmitPrescription(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <Download className="w-4 h-4 text-sky-500" />
            <span>Save & PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmitPrescription(false)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Save & Issue Prescription to Client Phone</span>
          </button>
        </div>
      </div>

      {notificationStatus && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            isDark
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{notificationStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationStatus(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Select Client Card */}
      {/* Requirement: "iN Select Prescribed Client dropdown box in ADMIN Isssue Prescription screen, only show names with phone numbers only, no passkey there needed." */}
      <div
        className={`rounded-2xl p-5 border space-y-3 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              1. Select Prescribed Client
            </h3>
          </div>

          <div className="w-full sm:w-80">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
              }`}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {clientObj && (
          <div
            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center">
                {clientObj.name.charAt(0)}
              </span>
              <div>
                <strong className="block">{clientObj.name}</strong>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Phone: {clientObj.phone}
                </span>
              </div>
            </div>
            <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Demographics: {clientObj.age || 28} Yrs, {clientObj.gender || 'Male'}
            </div>
          </div>
        )}
      </div>

      {/* Clinical Notes & Vitals - EMPTY BY DEFAULT */}
      {/* Requirement: "do not fill 2. Provisional Diagnosis & Vitals automatically with default values, leave it empty" */}
      <div
        className={`rounded-2xl p-5 border space-y-4 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider">
          2. Provisional Diagnosis & Vitals
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              className={`block text-xs font-semibold mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}
            >
              Diagnosis / Clinical Impression
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter provisional diagnosis..."
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}
            >
              Reported Symptoms
            </label>
            <input
              type="text"
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              placeholder="e.g. Fever, Cough (comma separated)..."
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
              }`}
            />
          </div>
        </div>

        {/* Vitals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div>
            <label className={`block text-[11px] mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              BP (mmHg)
            </label>
            <input
              type="text"
              value={bp}
              onChange={(e) => setBp(e.target.value)}
              placeholder="e.g. 120/80"
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
              }`}
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Pulse (bpm)
            </label>
            <input
              type="text"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              placeholder="e.g. 72"
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
              }`}
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Temp (°F)
            </label>
            <input
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="e.g. 98.6"
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
              }`}
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              SpO2 (%)
            </label>
            <input
              type="text"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              placeholder="e.g. 98"
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Prescribed Medicines (Exact user-specified format) */}
      {/* Requirement: "do not add dummy medicines Amoxicillin + Clavulanic Acid 625mg yourself, leave that space empty, doctor will add himself" */}
      <div
        className={`rounded-2xl p-5 border space-y-4 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              3. Prescribed Medicines & Reminder Schedule
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Each medicine: Name, Description, Dosage (B/L/D), Food Timing, and Reminder Time
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddMedicineRow}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </div>

        {medicines.length === 0 ? (
          <div
            className={`rounded-xl p-6 text-center space-y-2 border border-dashed ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              No medicines added yet. Click &quot;+ Add Medicine&quot; above to prescribe.
            </p>
            <button
              type="button"
              onClick={handleAddMedicineRow}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Medicine</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {medicines.map((med, index) => (
              <div
                key={med.id}
                className={`rounded-xl p-4 border space-y-3 ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div
                  className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-zinc-800' : 'border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/15 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <span>Medicine Item #{index + 1}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveMedicineRow(med.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                    title="Remove medicine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Required: 'Name' textbox & 'Description' textbox */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}
                    >
                      Name (Medicine & Strength) *
                    </label>
                    <input
                      type="text"
                      required
                      value={med.name}
                      onChange={(e) => handleUpdateMed(med.id, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol 650mg"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isDark
                          ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}
                    >
                      Description & Instructions *
                    </label>
                    <input
                      type="text"
                      value={med.description}
                      onChange={(e) => handleUpdateMed(med.id, 'description', e.target.value)}
                      placeholder="e.g. Take for fever relief. Do not skip."
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isDark
                          ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Required: dosage breakfast/lunch/dinner, before/after select, and reminder time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-end">
                  {/* Dosage Checkboxes: Breakfast, Lunch, Dinner */}
                  <div>
                    <label
                      className={`block text-[11px] font-semibold mb-1.5 ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}
                    >
                      Dosage Slots (B / L / D)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => {
                        const isActive = med.dosageSlots[slot];
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleDosageSlot(med.id, slot)}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                              isActive
                                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                : isDark
                                ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {slot === 'breakfast' ? 'Bkfast' : slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Before / After options select */}
                  <div>
                    <label
                      className={`block text-[11px] font-semibold mb-1.5 ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}
                    >
                      Food Timing
                    </label>
                    <select
                      value={med.timing}
                      onChange={(e) => handleUpdateMed(med.id, 'timing', e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="before">Before Food (Khane se pehle)</option>
                      <option value="after">After Food (Khane ke baad)</option>
                    </select>
                  </div>

                 {/* Alarm Time pickers with multiple time support */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={`block text-[11px] font-semibold flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Notification Times (Alarm Clocks)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddMedTime(med.id)}
                        className="text-[10px] text-sky-500 hover:underline font-semibold"
                      >
                        + Add Time
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {med.times?.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-1 bg-black/20 p-1.5 rounded-xl border border-zinc-700/50">
                          <input
                            type="time"
                            value={t}
                            onChange={(e) => handleUpdateMedTime(med.id, tIdx, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                              isDark ? 'bg-zinc-900 border-zinc-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                            }`}
                          />
                          {med.times.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedTime(med.id, tIdx)}
                              className="text-rose-500 hover:text-rose-400 px-1 text-xs font-bold"
                              title="Remove time slot"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Advice & Follow-up */}
      <div
        className={`rounded-2xl p-5 border space-y-3 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider">
          4. Doctor Advice & Next Follow-Up
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label
              className={`block text-xs font-semibold mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}
            >
              General Advice to Patient
            </label>
            <input
              type="text"
              value={generalAdvice}
              onChange={(e) => setGeneralAdvice(e.target.value)}
              placeholder="e.g. Rest, drink warm water, avoid cold items..."
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}
            >
              Follow-up Consultation Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSubmitPrescription(true)}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-colors ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
          }`}
        >
          <Download className="w-4 h-4 text-sky-500" />
          <span>Save & Download PDF</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubmitPrescription(false)}
          className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
          <span>Save & Issue Prescription to Client Phone</span>
        </button>
      </div>
    </div>
  );
};
