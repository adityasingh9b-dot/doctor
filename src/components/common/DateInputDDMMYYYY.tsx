import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatReadableDate, fromDDMMYYYYToISO } from '../../services/dataStore';
import { useTheme } from '../../context/ThemeContext';

interface DateInputDDMMYYYYProps {
  id?: string;
  value: string; // Accepts either YYYY-MM-DD or DD/MM/YYYY
  onChange: (isoValue: string, ddmmyyyyValue: string) => void;
  min?: string; // ISO YYYY-MM-DD
  max?: string; // ISO YYYY-MM-DD
  required?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export const DateInputDDMMYYYY: React.FC<DateInputDDMMYYYYProps> = ({
  id,
  value,
  onChange,
  min,
  max,
  required,
  placeholder = 'DD/MM/YYYY',
  className = '',
  label,
  helperText,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hiddenNativeDateRef = useRef<HTMLInputElement>(null);

  // Format incoming value into DD/MM/YYYY for display
  const displayVal = formatReadableDate(value);

  // Convert to ISO (YYYY-MM-DD) for native date input
  const isoVal = value && value.includes('/') ? fromDDMMYYYYToISO(value) : value;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9/]/g, '');

    // Auto add slashes if user types continuous numbers
    if (input.length === 2 && !input.includes('/')) {
      input = `${input}/`;
    } else if (input.length === 5 && input.split('/').length === 2) {
      input = `${input}/`;
    }

    if (input.length > 10) {
      input = input.slice(0, 10);
    }

    if (input.length === 10) {
      const iso = fromDDMMYYYYToISO(input);
      onChange(iso, input);
    } else {
      onChange(input, input);
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedIso = e.target.value;
    if (selectedIso) {
      const ddmmyyyy = formatReadableDate(selectedIso);
      onChange(selectedIso, ddmmyyyy);
    }
  };

  const openCalendarPicker = () => {
    if (disabled) return;
    try {
      if (hiddenNativeDateRef.current) {
        if ('showPicker' in hiddenNativeDateRef.current) {
          (hiddenNativeDateRef.current as any).showPicker();
        } else {
          hiddenNativeDateRef.current.focus();
          hiddenNativeDateRef.current.click();
        }
      }
    } catch {
      hiddenNativeDateRef.current?.click();
    }
  };

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={id}
          className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          disabled={disabled}
          required={required}
          value={displayVal}
          onChange={handleTextChange}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-wider font-mono ${
            isDark
              ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600'
              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
          } ${className}`}
        />

        {/* Calendar Picker Icon Button */}
        <button
          type="button"
          onClick={openCalendarPicker}
          disabled={disabled}
          className={`absolute right-2.5 p-1.5 rounded-lg transition-colors text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 focus:outline-none`}
          title="Pick date from calendar"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Hidden native date picker synced to the field */}
        <input
          ref={hiddenNativeDateRef}
          type="date"
          tabIndex={-1}
          min={min}
          max={max}
          value={isoVal}
          onChange={handleNativePickerChange}
          className="sr-only pointer-events-none opacity-0 absolute"
          aria-hidden="true"
        />
      </div>

      {helperText && (
        <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};
