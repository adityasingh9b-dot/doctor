import jsPDF from 'jspdf';
import { Prescription } from '../types';
import { formatReadableDate } from './dataStore';

export function generatePrescriptionPDF(rx: Prescription): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  // Header Banner
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.roundedRect(10, y, pageWidth - 20, 26, 2, 2, 'F');

  // Clinic Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const clinicTitle = doc.splitTextToSize(rx.clinicName || 'DR. DOCTOR HEALTHCARE CLINIC', 115);
  doc.text(clinicTitle, 15, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(rx.clinicAddress || 'Medanta Complex, 2nd Floor, Main Road', 15, y + 15);
  doc.text(`Helpline: ${rx.clinicPhone || '9369250645'} | OPD: 09:00 AM - 08:00 PM`, 15, y + 20);

  // Doctor Info on right side of header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(rx.doctorName || 'Dr. Doctor', pageWidth - 15, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Reg. No: ${rx.doctorRegNo || 'MCI-936925/2020'}`, pageWidth - 15, y + 14, { align: 'right' });
  doc.text('MBBS, MD (Senior Consultant)', pageWidth - 15, y + 19, { align: 'right' });

  y += 30;

  // Patient Info Card - 2 distinct columns with clear padding to prevent any text overlapping
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, pageWidth - 20, 24, 2, 2, 'FD');

  const formattedDate = formatReadableDate(rx.date);

  // Left column: Patient Details
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Patient Name:', 14, y + 6);
  doc.setFont('helvetica', 'normal');
  const patientNameFormatted = doc.splitTextToSize(rx.patientName || 'N/A', 75);
  doc.text(patientNameFormatted, 40, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Age / Gender:', 14, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rx.patientAge || '28'} Yrs / ${rx.patientGender || 'Male'}`, 40, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Mobile / ID:', 14, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rx.patientPhone}`, 40, y + 18);

  // Right column: Prescription Details
  const rightColX = pageWidth - 65;
  doc.setFont('helvetica', 'bold');
  doc.text('Prescription #:', rightColX, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${rx.id.slice(-6).toUpperCase()}`, rightColX + 26, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Date (DD/MM/YYYY):', rightColX - 10, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formattedDate}`, rightColX + 26, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', rightColX, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 118, 110);
  doc.text('Verified Active Rx', rightColX + 26, y + 18);

  y += 28;

  // Clinical Vitals Bar if present
  if (rx.vitals) {
    const vitalsText = [
      rx.vitals.bp ? `BP: ${rx.vitals.bp} mmHg` : '',
      rx.vitals.pulse ? `Pulse: ${rx.vitals.pulse} bpm` : '',
      rx.vitals.temperature ? `Temp: ${rx.vitals.temperature}°F` : '',
      rx.vitals.spo2 ? `SpO2: ${rx.vitals.spo2}%` : '',
      rx.vitals.weight ? `Wt: ${rx.vitals.weight} kg` : '',
    ].filter(Boolean).join('   |   ');

    if (vitalsText) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(10, y, pageWidth - 20, 7.5, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 118, 110);
      doc.text('Vitals:', 14, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(vitalsText, 27, y + 5);
      y += 11;
    }
  }

  // Provisional Diagnosis
  if (rx.diagnosis) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text('PROVISIONAL DIAGNOSIS & CLINICAL NOTES:', 10, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const splitDiag = doc.splitTextToSize(rx.diagnosis, pageWidth - 20);
    doc.text(splitDiag, 10, y);
    y += splitDiag.length * 4 + 3;
  }

  // Rx Symbol Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 118, 110);
  doc.text('℞ Prescribed Medicines', 10, y + 2);
  y += 5;

  // Medicines Table Header with exact matching column widths
  const startX = 10;
  const colWidths = [48, 54, 30, 30, 28]; // Total 190mm
  const headers = [
    'Medicine Name',
    'Instructions & Details',
    'Dose (B/L/D)',
    'Food Timing',
    'Alarm Time',
  ];

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(startX, y, pageWidth - 20, 7.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  let currentX = startX;
  headers.forEach((h, idx) => {
    doc.text(h, currentX + 3, y + 5);
    currentX += colWidths[idx];
  });

  y += 8.5;

  // Medicines Rows - with dynamic line wrapping and variable row height to prevent ANY overlap
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rx.medicines.forEach((med, index) => {
    const medNameLines = doc.splitTextToSize(med.name, colWidths[0] - 5);
    const medDescLines = doc.splitTextToSize(med.description || 'Take as directed', colWidths[1] - 5);

    // Dosage Slots (Breakfast / Lunch / Dinner)
    const slots = [];
    if (med.dosageSlots?.breakfast) slots.push('Breakfast');
    if (med.dosageSlots?.lunch) slots.push('Lunch');
    if (med.dosageSlots?.dinner) slots.push('Dinner');
    const doseSummary = slots.join(', ') || '1 Dose';
    const doseLines = doc.splitTextToSize(doseSummary, colWidths[2] - 5);

    // Timing label
    const timingLabel = med.timing === 'before' ? 'Before Food' : 'After Food';

    // Calculate maximum lines for this row
    const lineCount = Math.max(medNameLines.length, medDescLines.length, doseLines.length, 1);
    const rowHeight = Math.max(9, lineCount * 4 + 4);

    // Alternate row fill
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, y, pageWidth - 20, rowHeight, 'F');
    }

    // Border line under row
    doc.setDrawColor(241, 245, 249);
    doc.line(startX, y + rowHeight, startX + pageWidth - 20, y + rowHeight);

    // Col 0: Name
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(medNameLines, startX + 3, y + 4.5);

    // Col 1: Description
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(medDescLines, startX + colWidths[0] + 3, y + 4.5);

    // Col 2: Dosage
    doc.setTextColor(30, 41, 59);
    doc.text(doseLines, startX + colWidths[0] + colWidths[1] + 3, y + 4.5);

    // Col 3: Food Timing
    doc.text(timingLabel, startX + colWidths[0] + colWidths[1] + colWidths[2] + 3, y + 4.5);

    // Col 4: Alarm Time (no broken unicode emoji)
    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.text(med.time || '08:00 AM', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    y += rowHeight;
  });

  y += 5;

  // Doctor Advice & Instructions
  if (rx.generalAdvice) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text('DOCTOR ADVICE & INSTRUCTIONS:', 10, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitAdvice = doc.splitTextToSize(rx.generalAdvice, pageWidth - 20);
    doc.text(splitAdvice, 10, y);
    y += splitAdvice.length * 4 + 4;
  }

  // Follow-up Date (DD/MM/YYYY)
  if (rx.followUpDate) {
    const formattedFollowUp = formatReadableDate(rx.followUpDate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text(`Next Follow-up Consultation Date: ${formattedFollowUp}`, 10, y);
    y += 7;
  }

  // Bottom Notice & Doctor Signature positioned cleanly
  const footerY = Math.max(y + 8, 242);

  // Mobile App Notification Reminder Sync Notice
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(153, 246, 228);
  doc.roundedRect(10, footerY, 115, 22, 2, 2, 'FD');
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DR. DOCTOR PHONE APP ALARM SYNC ACTIVE', 14, footerY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text('Prescribed alarm times automatically ring on the client phone.', 14, footerY + 11);
  doc.text('Keep app notification permissions enabled for audio reminders.', 14, footerY + 16);

  // Signature on the right
  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth - 75, footerY + 12, pageWidth - 15, footerY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(rx.doctorName || 'Dr. Doctor', pageWidth - 45, footerY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Authorized Physician Seal (${rx.doctorRegNo || 'MCI-936925'})`, pageWidth - 45, footerY + 20, { align: 'center' });

  // Bottom Page Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Dr. Doctor Smart Clinic OS — Certified Digital Medical Prescription', pageWidth / 2, 287, { align: 'center' });

  return doc;
}

/**
 * Requirement: when downloading pdf, it's name should be saved as: PatientName_phonenumber.pdf
 */
export function downloadPrescriptionPDF(rx: Prescription) {
  const doc = generatePrescriptionPDF(rx);
  const cleanName = (rx.patientName || 'Patient').trim().replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPhone = (rx.patientPhone || '').trim().replace(/[^0-9]/g, '');
  const fileName = `${cleanName}_${cleanPhone || 'rx'}.pdf`;
  doc.save(fileName);
}
