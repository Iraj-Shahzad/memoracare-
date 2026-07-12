/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

// SVG Icons as inline components
const PDFIcon = () => (
  <svg
    className="w-4 h-4"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
    <text x="8" y="16" fontSize="6" fontWeight="bold" fill="white">
      PDF
    </text>
  </svg>
);

const ExcelIcon = () => (
  <svg
    className="w-4 h-4"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
    <text x="7" y="16" fontSize="7" fontWeight="bold" fill="white">
      XLS
    </text>
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const ViewIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// Report type definitions
interface Report {
  id: string;
  title: string;
  date: string;
  type: "Medication" | "Routine" | "Recognition" | "Summary" | "Emergency";
  format: "PDF" | "Excel";
  status: "Ready" | "Processing";
}

// Sample reports data
const SAMPLE_REPORTS: Report[] = [
  {
    id: "1",
    title: "Weekly Medication Report",
    date: "Apr 14, 2026",
    type: "Medication",
    format: "PDF",
    status: "Ready",
  },
  {
    id: "2",
    title: "Daily Routine Summary",
    date: "Apr 13, 2026",
    type: "Routine",
    format: "PDF",
    status: "Ready",
  },
  {
    id: "3",
    title: "Face Recognition Log",
    date: "Apr 12, 2026",
    type: "Recognition",
    format: "Excel",
    status: "Ready",
  },
  {
    id: "4",
    title: "Monthly Health Overview",
    date: "Apr 10, 2026",
    type: "Summary",
    format: "PDF",
    status: "Ready",
  },
  {
    id: "5",
    title: "Medication Compliance Report",
    date: "Apr 7, 2026",
    type: "Medication",
    format: "PDF",
    status: "Ready",
  },
  {
    id: "6",
    title: "Emergency Alerts Log",
    date: "Apr 5, 2026",
    type: "Emergency",
    format: "PDF",
    status: "Ready",
  },
];

const FILTER_TABS = [
  "All",
  "Medication",
  "Routine",
  "Recognition",
  "Weekly Summary",
];

export default function ReportsPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [reports, setReports] = useState<Report[]>(SAMPLE_REPORTS);
  const [selectedReport, setSelectedReport] = useState<Report>(SAMPLE_REPORTS[0]);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportType, setReportType] = useState("Medication");
  const [fromDate, setFromDate] = useState("2026-04-08");
  const [toDate, setToDate] = useState("2026-04-14");
  const [format, setFormat] = useState("PDF");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/reports/patient/${patientId}`).catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((r: any) => ({
            id: r._id || r.id,
            title: r.title || "Report",
            date: r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
            type: r.type || "Summary",
            format: r.format || "PDF",
            status: r.status || "Ready",
          }));
          setReports(mapped);
          setSelectedReport(mapped[0]);
        }
      } catch (err) {
        console.error("Reports fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [patientId]);

  // Filter reports based on active tab
  const filteredReports =
    activeTab === "All"
      ? reports
      : reports.filter((report) => {
          if (activeTab === "Weekly Summary") {
            return report.type === "Summary";
          }
          return report.type === activeTab;
        });

  const handleGenerateReport = () => {
    setShowGenerateModal(false);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen bg-[#f0fdf4]">
          <PatientSidebar />
          <div className="ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading reports...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      {/* Sidebar */}
      <PatientSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-[260px] flex flex-col">
        {/* Topbar */}
        <Topbar title="Medical Reports" subtitle="View and generate your health reports" />

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="flex gap-6 h-full">
            {/* Left Side - Report List */}
            <div className="w-[60%] flex flex-col">
              {/* Generate New Report Button */}
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mb-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0d8975] transition-colors w-full"
              >
                <PlusIcon />
                Generate New Report
              </button>

              {/* Filter Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? "bg-[#0d9488] text-white"
                        : "bg-white text-[#1a3c34] border border-gray-200 hover:border-[#0d9488]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Report Cards List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedReport.id === report.id
                        ? "bg-white border-2 border-[#0d9488] shadow-md"
                        : "bg-white border border-gray-200 hover:border-[#0d9488]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1a3c34] text-sm">
                          {report.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Generated {report.date}
                        </p>
                      </div>
                      <div className="text-[#0d9488]">
                        {report.format === "PDF" ? <PDFIcon /> : <ExcelIcon />}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-[#f0fdf4] text-[#0d9488] text-xs font-medium rounded">
                          {report.type}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          {report.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#0d9488] border border-[#0d9488] rounded hover:bg-[#f0fdf4] transition-colors">
                        <DownloadIcon />
                        Download
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#0d9488] border border-[#0d9488] rounded hover:bg-[#f0fdf4] transition-colors">
                        <ViewIcon />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Report Preview */}
            <div className="w-[40%] bg-white rounded-lg border border-gray-200 p-6 flex flex-col overflow-y-auto">
              {/* Report Title */}
              <h2 className="text-2xl font-bold text-[#1a3c34] mb-6">
                {selectedReport.title}
              </h2>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-[#f0fdf4] rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Period</p>
                  <p className="font-semibold text-[#1a3c34] text-sm">
                    Apr 8-14, 2026
                  </p>
                </div>
                <div className="p-4 bg-[#f0fdf4] rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Entries</p>
                  <p className="font-semibold text-[#1a3c34] text-sm">47</p>
                </div>
                <div className="p-4 bg-[#f0fdf4] rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Compliance Rate</p>
                  <p className="font-semibold text-[#0d9488] text-sm">87%</p>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="mb-8">
                <h3 className="font-semibold text-[#1a3c34] mb-4 text-sm">
                  Daily Compliance
                </h3>
                <div className="flex items-end justify-between h-40 gap-2">
                  {[
                    { day: "Mon", value: 85 },
                    { day: "Tue", value: 90 },
                    { day: "Wed", value: 88 },
                    { day: "Thu", value: 87 },
                    { day: "Fri", value: 92 },
                    { day: "Sat", value: 86 },
                    { day: "Sun", value: 81 },
                  ].map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center">
                        <div
                          className="w-full bg-[#0d9488] rounded-t"
                          style={{ height: `${(item.value / 100) * 120}px` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{item.day}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Findings */}
              <div className="mb-8">
                <h3 className="font-semibold text-[#1a3c34] mb-4 text-sm">
                  Key Findings
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-sm text-gray-700">
                    <span className="text-[#0d9488] font-bold">•</span>
                    Medication compliance improved by 5% compared to last week
                  </li>
                  <li className="flex gap-3 text-sm text-gray-700">
                    <span className="text-[#0d9488] font-bold">•</span>
                    Morning routine adherence shows consistent pattern
                  </li>
                  <li className="flex gap-3 text-sm text-gray-700">
                    <span className="text-[#0d9488] font-bold">•</span>
                    One missed medication on Apr 10 - follow-up recommended
                  </li>
                  <li className="flex gap-3 text-sm text-gray-700">
                    <span className="text-[#0d9488] font-bold">•</span>
                    Overall system functionality operating at optimal levels
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-auto pt-6 border-t border-gray-200">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0d8975] transition-colors">
                  <DownloadIcon />
                  Download PDF
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#0d9488] text-[#0d9488] rounded-lg font-semibold hover:bg-[#f0fdf4] transition-colors">
                  <ExcelIcon />
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1a3c34]">
                Generate New Report
              </h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-5">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-semibold text-[#1a3c34] mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[#1a3c34] focus:outline-none focus:border-[#0d9488]"
                >
                  <option>Medication</option>
                  <option>Routine</option>
                  <option>Recognition</option>
                  <option>Weekly Summary</option>
                  <option>Custom</option>
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-sm font-semibold text-[#1a3c34] mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[#1a3c34] focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-sm font-semibold text-[#1a3c34] mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[#1a3c34] focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-semibold text-[#1a3c34] mb-3">
                  Format
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="PDF"
                      checked={format === "PDF"}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-4 h-4 accent-[#0d9488]"
                    />
                    <span className="text-sm text-[#1a3c34]">PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Excel"
                      checked={format === "Excel"}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-4 h-4 accent-[#0d9488]"
                    />
                    <span className="text-sm text-[#1a3c34]">Excel</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-[#1a3c34] rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="flex-1 px-4 py-2 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0d8975] transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
