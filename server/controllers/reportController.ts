import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Report from '../models/Report';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
import Routine from '../models/Routine';
import RoutineLog from '../models/RoutineLog';
import { canAccessPatient } from '../utils/access';

// @desc Get all reports
// @route GET /api/reports
export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (type) query.type = type;

    // Scope reports based on role
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (patient) query.patient = patient._id;
    } else if (req.user.role === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: req.user.id });
      if (caregiver && caregiver.assignedPatients.length > 0) {
        query.patient = { $in: caregiver.assignedPatients };
      }
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: reports.length, total, reports });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get reports for a specific patient
// @route GET /api/reports/patient/:patientId
export const getPatientReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const reports = await Report.find({ patient: patientId })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err: any) {
    next(err);
  }
};

// @desc Generate a new report
// @route POST /api/reports/generate
export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, type, format, from, to } = req.body;

    const patient = await Patient.findById(patientId).populate('user', 'name');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const period = {
      from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: to ? new Date(to) : new Date(),
    };

    // Gather report data based on type
    const reportData: any = {};
    const dateQuery = { $gte: period.from, $lte: period.to };

    if (type === 'medication' || type === 'compliance' || type === 'weekly_summary' || type === 'monthly_overview') {
      const medLogs = await MedicationLog.find({ patient: patientId, scheduledTime: dateQuery })
        .populate('medication', 'name dosage');
      const total = medLogs.length;
      const taken = medLogs.filter((l) => l.status === 'taken').length;
      reportData.medication = { total, taken, missed: medLogs.filter((l) => l.status === 'missed').length, complianceRate: total > 0 ? Math.round((taken / total) * 100) : 0 };
    }

    if (type === 'routine' || type === 'weekly_summary' || type === 'monthly_overview') {
      const routineLogs = await RoutineLog.find({ patient: patientId, scheduledDate: dateQuery })
        .populate('routine', 'activityName');
      const total = routineLogs.length;
      const completed = routineLogs.filter((l) => l.status === 'completed').length;
      reportData.routine = { total, completed, missed: routineLogs.filter((l) => l.status === 'missed').length, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }

    const title = `${type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} - ${(patient as any).user.name}`;

    const report = await Report.create({
      generatedBy: req.user.id,
      patient: patientId,
      type,
      title,
      period,
      format: format || 'pdf',
      status: 'ready',
      data: reportData,
    });

    res.status(201).json({ success: true, report });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get single report
// @route GET /api/reports/:id
export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate('generatedBy', 'name');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (!(await canDownload(req, report))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this report' });
    }

    res.status(200).json({ success: true, report });
  } catch (err: any) {
    next(err);
  }
};

// @desc Download report as a real PDF or Excel file
// @route GET /api/reports/:id/download?format=pdf|excel
export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report: any = await Report.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate('generatedBy', 'name');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (!(await canDownload(req, report))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this report' });
    }

    const patientName = report.patient?.user?.name || 'Unknown Patient';
    const generatedBy = report.generatedBy?.name || '—';
    const { from, to } = reportPeriod(report);

    // Pull the detailed logs for the period (empty for system reports with no patient).
    let medLogs: any[] = [];
    let routineLogs: any[] = [];
    if (report.patient?._id) {
      const pid = report.patient._id;
      medLogs = await MedicationLog.find({ patient: pid, scheduledTime: { $gte: from, $lte: to } })
        .populate('medication', 'name dosage')
        .sort({ scheduledTime: 1 });
      routineLogs = await RoutineLog.find({ patient: pid, scheduledDate: { $gte: from, $lte: to } })
        .populate('routine', 'activityName')
        .sort({ scheduledDate: 1 });
    }

    const ctx = { report, patientName, generatedBy, from, to, medLogs, routineLogs };
    const fmt = String(req.query.format || report.format || 'pdf').toLowerCase();

    if (fmt === 'excel' || fmt === 'xlsx') {
      return sendExcel(res, ctx);
    }
    return sendPdf(res, ctx);
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete report
// @route DELETE /api/reports/:id
export const deleteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (!(await canDownload(req, report))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this report' });
    }
    await report.deleteOne();
    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (err: any) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A report is downloadable by admin, or by whoever can access its patient.
async function canDownload(req: Request, report: any): Promise<boolean> {
  const patientId = report.patient?._id ? report.patient._id.toString() : report.patient?.toString();
  if (!patientId) return req.user.role === 'admin';
  return canAccessPatient(req.user, patientId);
}

function reportPeriod(report: any) {
  const from = report.period?.from ? new Date(report.period.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = report.period?.to ? new Date(report.period.to) : new Date();
  return { from, to };
}

function fmtDate(d: any): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function safeName(s: string): string {
  return (s || 'report').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'report';
}

interface ReportCtx {
  report: any;
  patientName: string;
  generatedBy: string;
  from: Date;
  to: Date;
  medLogs: any[];
  routineLogs: any[];
}

// ---- PDF ----
function sendPdf(res: Response, ctx: ReportCtx) {
  const { report, patientName, generatedBy, from, to, medLogs, routineLogs } = ctx;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName(report.title)}.pdf"`);
  doc.pipe(res);

  const TEAL = '#0d9488';
  const INK = '#1a3c34';
  const GREY = '#64748b';

  // Header
  doc.fillColor(TEAL).fontSize(22).font('Helvetica-Bold').text('MemoryCare');
  doc.moveDown(0.2);
  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text(report.title);
  doc.moveDown(0.4);
  doc.fillColor(GREY).fontSize(10).font('Helvetica');
  doc.text(`Patient: ${patientName}`);
  doc.text(`Period: ${fmtDate(from)} - ${fmtDate(to)}`);
  doc.text(`Generated by: ${generatedBy}  |  ${fmtDate(new Date())}`);
  doc.moveDown(0.6);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);

  const section = (title: string) => {
    doc.moveDown(0.5).fillColor(INK).fontSize(13).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
  };
  const stat = (label: string, value: any) => {
    doc.fillColor(GREY).fontSize(10).font('Helvetica').text(`${label}: `, { continued: true });
    doc.fillColor(INK).font('Helvetica-Bold').text(String(value));
  };

  // Medication summary + table
  if (report.data?.medication) {
    const m = report.data.medication;
    section('Medication Summary');
    stat('Total scheduled', m.total);
    stat('Taken', m.taken);
    stat('Missed', m.missed);
    stat('Compliance rate', `${m.complianceRate}%`);
  }
  if (medLogs.length) {
    section('Medication Log');
    doc.font('Courier').fontSize(9).fillColor(INK);
    doc.text('DATE'.padEnd(16) + 'MEDICATION'.padEnd(32) + 'STATUS');
    doc.fillColor(GREY);
    medLogs.forEach((l) => {
      const name = (l.medication?.name || '-').slice(0, 30);
      doc.text(fmtDate(l.scheduledTime).padEnd(16) + name.padEnd(32) + l.status);
    });
  }

  // Routine summary + table
  if (report.data?.routine) {
    const r = report.data.routine;
    section('Routine Summary');
    stat('Total scheduled', r.total);
    stat('Completed', r.completed);
    stat('Missed', r.missed);
    stat('Completion rate', `${r.completionRate}%`);
  }
  if (routineLogs.length) {
    section('Routine Log');
    doc.font('Courier').fontSize(9).fillColor(INK);
    doc.text('DATE'.padEnd(16) + 'ACTIVITY'.padEnd(32) + 'STATUS');
    doc.fillColor(GREY);
    routineLogs.forEach((l) => {
      const name = (l.routine?.activityName || '-').slice(0, 30);
      doc.text(fmtDate(l.scheduledDate).padEnd(16) + name.padEnd(32) + l.status);
    });
  }

  if (!report.data?.medication && !report.data?.routine && !medLogs.length && !routineLogs.length) {
    doc.fillColor(GREY).fontSize(11).font('Helvetica').text('No records found for this period.');
  }

  doc.moveDown(2);
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
    .text('Generated by MemoryCare. This document is for care-coordination purposes and is not a substitute for medical advice.', { align: 'center' });

  doc.end();
}

// ---- Excel ----
async function sendExcel(res: Response, ctx: ReportCtx) {
  const { report, patientName, generatedBy, from, to, medLogs, routineLogs } = ctx;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MemoryCare';

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } } as any;
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } } as any;

  // Summary sheet
  const s = wb.addWorksheet('Summary');
  s.columns = [{ header: 'Field', key: 'f', width: 26 }, { header: 'Value', key: 'v', width: 44 }];
  s.getRow(1).eachCell((c) => { c.fill = headerFill; c.font = headerFont; });
  s.addRow({ f: 'Report', v: report.title });
  s.addRow({ f: 'Patient', v: patientName });
  s.addRow({ f: 'Period', v: `${fmtDate(from)} - ${fmtDate(to)}` });
  s.addRow({ f: 'Generated by', v: generatedBy });
  s.addRow({ f: 'Generated on', v: fmtDate(new Date()) });
  if (report.data?.medication) {
    const m = report.data.medication;
    s.addRow({});
    s.addRow({ f: 'Medications — total', v: m.total });
    s.addRow({ f: 'Medications — taken', v: m.taken });
    s.addRow({ f: 'Medications — missed', v: m.missed });
    s.addRow({ f: 'Compliance rate', v: `${m.complianceRate}%` });
  }
  if (report.data?.routine) {
    const r = report.data.routine;
    s.addRow({});
    s.addRow({ f: 'Routines — total', v: r.total });
    s.addRow({ f: 'Routines — completed', v: r.completed });
    s.addRow({ f: 'Routines — missed', v: r.missed });
    s.addRow({ f: 'Completion rate', v: `${r.completionRate}%` });
  }

  // Medication logs sheet
  if (medLogs.length) {
    const ws = wb.addWorksheet('Medication Logs');
    ws.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Medication', key: 'med', width: 32 },
      { header: 'Dosage', key: 'dose', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    ws.getRow(1).eachCell((c) => { c.fill = headerFill; c.font = headerFont; });
    medLogs.forEach((l) => ws.addRow({
      date: fmtDate(l.scheduledTime),
      med: l.medication?.name || '-',
      dose: l.medication?.dosage || '',
      status: l.status,
    }));
  }

  // Routine logs sheet
  if (routineLogs.length) {
    const ws = wb.addWorksheet('Routine Logs');
    ws.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Activity', key: 'act', width: 32 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    ws.getRow(1).eachCell((c) => { c.fill = headerFill; c.font = headerFont; });
    routineLogs.forEach((l) => ws.addRow({
      date: fmtDate(l.scheduledDate),
      act: l.routine?.activityName || '-',
      status: l.status,
    }));
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName(report.title)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}
