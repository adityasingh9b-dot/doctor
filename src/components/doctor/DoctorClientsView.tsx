import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  KeyRound,
  Phone,
  User,
  FileText,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { ClientUser, Prescription } from '../../types';
import { calculateAgeFromDob, formatReadableDate } from '../../services/dataStore';
import { downloadPrescriptionPDF } from '../../services/pdfGenerator';
import { useTheme } from '../../context/ThemeContext';

interface DoctorClientsViewProps {
  clients: ClientUser[];
  prescriptions: Prescription[];
  onRegisterClient: (client: ClientUser) => void;
  onUpdateClient: (client: ClientUser) => void;
  onDeleteClient: (clientId: string) => void;
  onSelectClientForPrescription: (client: ClientUser) => void;
  onSelectClientForBooking?: (client: ClientUser) => void;
}

export const DoctorClientsView: React.FC<DoctorClientsViewProps> = ({
  clients,
  prescriptions,
  onRegisterClient,
  onUpdateClient,
  onDeleteClient,
  onSelectClientForPrescription,
  onSelectClientForBooking: _onSelectClientForBooking,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientUser | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientUser | null>(null);

  // Requirement: "that hide passkeys is on by default, only clicking on it will show the passkeys, otherwise passkeys will not be shown by default in ADMIN app"
  const [showAllPasskeys, setShowAllPasskeys] = useState(false);
  const [revealedPasskeys, setRevealedPasskeys] = useState<Set<string>>(new Set());

  // View Prescription Modal State
  // Requirement: "add a button in clients directory where doctors can also see the current prescription for a particular client they have prescribed as 'view prescription' in place of 'book next day' button in doctor's ADMIN UI"
  const [selectedClientForViewRx, setSelectedClientForViewRx] = useState<ClientUser | null>(null);
  const [viewRxIndex, setViewRxIndex] = useState(0);

  const togglePasskeyReveal = (clientId: string) => {
    setRevealedPasskeys((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const isPasskeyVisible = (clientId: string) => showAllPasskeys || revealedPasskeys.has(clientId);

  // New Client Form State (Only: name, ph no, passkey, gender, DOB)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [passkey, setPasskey] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Edit Client Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPasskey, setEditPasskey] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [editDob, setEditDob] = useState('');
  const [editError, setEditError] = useState('');

  // Search filtering by name OR phone number
  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.replace(/\D/g, '').includes(q);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !phone.trim() || !passkey.trim() || !dob) {
      setFormError('Please fill in Name, Phone Number, Passkey, and DOB.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Phone number should be at least 10 digits.');
      return;
    }

    // Check existing phone
    const exists = clients.some((c) => c.phone.replace(/\D/g, '') === cleanPhone);
    if (exists) {
      setFormError('A client with this phone number is already registered!');
      return;
    }

    const computedAge = calculateAgeFromDob(dob) || 28;

    const newClient: ClientUser = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      passkey: passkey.trim(),
      gender,
      dob,
      age: computedAge,
      registeredAt: Date.now(),
    };

    onRegisterClient(newClient);

    // Reset
    setName('');
    setPhone('');
    setPasskey('');
    setGender('Male');
    setDob('');
    setIsRegisterModalOpen(false);

    showToast(`Client ${newClient.name} registered successfully!`);
  };

  const handleOpenEditModal = (client: ClientUser) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditPhone(client.phone);
    setEditPasskey(client.passkey);
    setEditGender(client.gender || 'Male');
    setEditDob(client.dob || '1995-01-01');
    setEditError('');
  };

  const handleSaveEditedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setEditError('');

    if (!editName.trim() || !editPhone.trim() || !editPasskey.trim() || !editDob) {
      setEditError('Please fill in all fields (Name, Phone, Passkey, DOB).');
      return;
    }

    const cleanPhone = editPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setEditError('Phone number must be at least 10 digits.');
      return;
    }

    // Check duplicate phone with other clients
    const duplicate = clients.some(
      (c) => c.id !== editingClient.id && c.phone.replace(/\D/g, '') === cleanPhone
    );
    if (duplicate) {
      setEditError('Another client already has this phone number.');
      return;
    }

    const computedAge = calculateAgeFromDob(editDob) || editingClient.age || 28;

    const updated: ClientUser = {
      ...editingClient,
      name: editName.trim(),
      phone: cleanPhone,
      passkey: editPasskey.trim(),
      gender: editGender,
      dob: editDob,
      age: computedAge,
    };

    onUpdateClient(updated);
    setEditingClient(null);
    showToast(`Updated details for ${updated.name}!`);
  };

  const handleConfirmDelete = () => {
    if (!clientToDelete) return;
    const deletedName = clientToDelete.name;
    onDeleteClient(clientToDelete.id);
    setClientToDelete(null);
    showToast(`Client ${deletedName} was deleted.`);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
            <span>Registered Clients Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-mono font-bold">
              {clients.length} Total
            </span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Manage client records, edit details, or remove clients with phone & passkey credentials
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Client</span>
        </button>
      </div>

      {toastMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            isDark
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search Bar & Passkey Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-3 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by Name or Phone number..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              isDark
                ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-2.5 text-xs font-semibold ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Clear
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAllPasskeys(!showAllPasskeys)}
          className={`px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
          }`}
        >
          {showAllPasskeys ? (
            <EyeOff className="w-4 h-4 text-sky-500" />
          ) : (
            <Eye className="w-4 h-4 text-slate-400" />
          )}
          <span>{showAllPasskeys ? 'Hide Passkeys' : 'Show Passkeys'}</span>
        </button>
      </div>

      {/* Clients List Cards */}
      <div className="space-y-2.5">
        {filteredClients.length === 0 ? (
          <div
            className={`rounded-2xl p-8 text-center space-y-2 border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}
          >
            <User className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold">No Clients Found</h3>
            <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {searchQuery
                ? `No patient matches "${searchQuery}". Check the phone number or name spelling.`
                : 'No clients registered yet. Click "Register New Client" above to add patients.'}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const ageDisplay = client.dob
              ? `${calculateAgeFromDob(client.dob) || client.age || 28} Yrs`
              : `${client.age || 28} Yrs`;

            return (
              <div
                key={client.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 hover:border-sky-500/50'
                    : 'bg-white border-slate-200 hover:border-sky-500/50 shadow-xs'
                }`}
              >
                {/* Client Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold leading-tight">{client.name}</h3>
                      <div
                        className={`flex flex-wrap items-center gap-2 text-xs mt-0.5 ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1 font-mono font-medium">
                          <Phone className="w-3 h-3 text-sky-500" />
                          <span>{client.phone}</span>
                        </span>
                        <span>•</span>
                        <span className="text-[11px]">
                          {ageDisplay}, {client.gender || 'Male'}
                        </span>
                        {client.dob && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>DOB: {formatReadableDate(client.dob)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passkey Badge, Edit, Delete & Quick Actions */}
                <div className="flex items-center flex-wrap gap-2 pl-11 sm:pl-0">
                  {/* Client Passkey Display (Clickable to reveal/hide) */}
                  <button
                    type="button"
                    onClick={() => togglePasskeyReveal(client.id)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                    title={isPasskeyVisible(client.id) ? 'Click to hide passkey' : 'Click to show passkey'}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Passkey:
                    </span>
                    <span className="font-mono font-bold tracking-wider">
                      {isPasskeyVisible(client.id) ? client.passkey : '••••'}
                    </span>
                    {isPasskeyVisible(client.id) ? (
                      <EyeOff className="w-3 h-3 text-zinc-400 ml-0.5" />
                    ) : (
                      <Eye className="w-3 h-3 text-zinc-400 ml-0.5" />
                    )}
                  </button>

                  {/* Edit Client Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(client)}
                    className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-colors ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title="Edit client details"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-500" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  {/* Delete Client Button */}
                  <button
                    type="button"
                    onClick={() => setClientToDelete(client)}
                    className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-colors ${
                      isDark
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-400 hover:bg-rose-900/50'
                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                    }`}
                    title="Delete client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>

                  {/* Quick Prescribe */}
                  <button
                    type="button"
                    onClick={() => onSelectClientForPrescription(client)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Issue Rx</span>
                  </button>

                  {/* View Prescription Button (Replaces Book Next Day as requested) */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientForViewRx(client);
                      setViewRxIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="View current prescription for this client"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-500" />
                    <span>View Prescription</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REGISTER CLIENT MODAL (Only: Name, Phone, Passkey, Gender, DOB from calendar) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-2xl max-w-md w-full p-6 border shadow-xl space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Register New Client</h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Enter Name, Phone, Passkey, Gender & Date of Birth
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className={`p-1 rounded-lg ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  isDark
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}
                >
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDark
                      ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
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
                    Passkey *
                  </label>
                  <input
                    type="text"
                    required
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="e.g. 5555"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    DOB (Select from Calendar) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDob(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {dob && (
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Calculated Age: <strong className="text-sky-600 dark:text-sky-400">{calculateAgeFromDob(dob)} Years</strong>
                </p>
              )}

              <div
                className={`pt-3 flex items-center justify-end gap-2 border-t ${
                  isDark ? 'border-zinc-800' : 'border-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white rounded-xl shadow-xs"
                >
                  Save & Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT DETAILS MODAL */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-2xl max-w-md w-full p-6 border shadow-xl space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Update Client Details</h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Editing: {editingClient.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className={`p-1 rounded-lg ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  isDark
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditedClient} className="space-y-3">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}
                >
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDark
                      ? 'bg-black/50 border-zinc-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-black/50 border-zinc-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    Passkey *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPasskey}
                    onChange={(e) => setEditPasskey(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-black/50 border-zinc-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    Gender *
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}
                  >
                    DOB (Select from Calendar) *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditDob(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {editDob && (
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Calculated Age: <strong className="text-sky-600 dark:text-sky-400">{calculateAgeFromDob(editDob)} Years</strong>
                </p>
              )}

              <div
                className={`pt-3 flex items-center justify-end gap-2 border-t ${
                  isDark ? 'border-zinc-800' : 'border-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {clientToDelete && (
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
                <h3 className="text-sm font-bold">Delete Client?</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  This will remove {clientToDelete.name} ({clientToDelete.phone}) from the registered directory.
                </p>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span>
                Passkey: {isPasskeyVisible(clientToDelete.id) ? clientToDelete.passkey : '••••'} • Registered on {new Date(clientToDelete.registeredAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Yes, Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CURRENT PRESCRIPTION MODAL */}
      {selectedClientForViewRx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col border shadow-2xl overflow-hidden ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    Current Prescription: {selectedClientForViewRx.name}
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Ph: {selectedClientForViewRx.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientForViewRx(null)}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {(() => {
                const clientRxList = prescriptions
                  .filter(
                    (p) =>
                      p.patientId === selectedClientForViewRx.id ||
                      p.patientPhone.replace(/\D/g, '') === selectedClientForViewRx.phone.replace(/\D/g, '')
                  )
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (clientRxList.length === 0) {
                  return (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 mx-auto flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">No Prescription Prescribed Yet</h4>
                        <p className={`text-xs max-w-xs mx-auto mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          No digital prescription has been prescribed for {selectedClientForViewRx.name} yet.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const client = selectedClientForViewRx;
                          setSelectedClientForViewRx(null);
                          onSelectClientForPrescription(client);
                        }}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs inline-flex items-center gap-2"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Issue Prescription Now</span>
                      </button>
                    </div>
                  );
                }

                const currentRx = clientRxList[viewRxIndex] || clientRxList[0];

                return (
                  <div className="space-y-4">
                    {/* Switcher if multiple prescriptions exist */}
                    {clientRxList.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className={`text-[10px] font-semibold uppercase ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          History:
                        </span>
                        {clientRxList.map((rx, idx) => (
                          <button
                            key={rx.id}
                            type="button"
                            onClick={() => setViewRxIndex(idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                              (clientRxList[viewRxIndex]?.id || clientRxList[0].id) === rx.id
                                ? 'bg-sky-600 text-white font-bold'
                                : isDark
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {idx === 0 ? 'Current / Latest' : `Rx #${rx.id.slice(-4)}`} ({formatReadableDate(rx.date)})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Prescription Details Card */}
                    <div
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold text-sky-600 dark:text-sky-400 block">
                            Rx ID: #{currentRx.id.slice(-6)}
                          </span>
                          <strong className="text-sm font-bold">
                            Date: {formatReadableDate(currentRx.date)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadPrescriptionPDF(currentRx)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>

                      {currentRx.diagnosis && (
                        <div className="pt-1">
                          <span className={`text-[11px] font-semibold block ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Provisional Diagnosis:
                          </span>
                          <span className="font-bold text-sm text-sky-600 dark:text-sky-400">
                            {currentRx.diagnosis}
                          </span>
                        </div>
                      )}

                      {/* Vitals if recorded */}
                      {currentRx.vitals && Object.values(currentRx.vitals).some(Boolean) && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {currentRx.vitals.bp && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                              <strong>BP:</strong> {currentRx.vitals.bp}
                            </span>
                          )}
                          {currentRx.vitals.pulse && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                              <strong>Pulse:</strong> {currentRx.vitals.pulse}
                            </span>
                          )}
                          {currentRx.vitals.temperature && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                              <strong>Temp:</strong> {currentRx.vitals.temperature}
                            </span>
                          )}
                          {currentRx.vitals.spo2 && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                              <strong>SpO2:</strong> {currentRx.vitals.spo2}
                            </span>
                          )}
                          {currentRx.vitals.weight && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                              <strong>Weight:</strong> {currentRx.vitals.weight}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Prescribed Medicines */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Prescribed Medicines ({currentRx.medicines?.length || 0}):
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Auto phone reminders active
                        </span>
                      </div>

                      {currentRx.medicines && currentRx.medicines.length > 0 ? (
                        currentRx.medicines.map((med, idx) => (
                          <div
                            key={med.id || idx}
                            className={`p-3 rounded-xl border space-y-1.5 ${
                              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <strong className="text-xs font-bold block">{med.name}</strong>
                                {med.description && (
                                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    {med.description}
                                  </p>
                                )}
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold shrink-0">
                                ⏰ {med.time || '08:00 AM'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                Timing: {med.timing === 'before' ? 'Before food (Khali pet)' : 'After food (Khane ke baad)'}
                              </span>

                              <div className="flex items-center gap-1 text-[10px]">
                                {med.dosageSlots?.breakfast && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                                    Breakfast
                                  </span>
                                )}
                                {med.dosageSlots?.lunch && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                                    Lunch
                                  </span>
                                )}
                                {med.dosageSlots?.dinner && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                                    Dinner
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={`text-xs italic ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          No medicines listed in this prescription.
                        </p>
                      )}
                    </div>

                    {/* Advice */}
                    {currentRx.generalAdvice && (
                      <div
                        className={`p-3 rounded-xl border text-xs ${
                          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <strong className={`block text-[11px] mb-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Doctor Advice & Instructions:
                        </strong>
                        <p className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                          {currentRx.generalAdvice}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div
              className={`p-4 border-t flex items-center justify-between gap-2 ${
                isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  const client = selectedClientForViewRx;
                  setSelectedClientForViewRx(null);
                  onSelectClientForPrescription(client);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                <span>Issue New / Re-prescribe</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClientForViewRx(null)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
