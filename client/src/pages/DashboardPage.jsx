import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
  getCustomReport,
} from '../api/reports.api';
import ReportControls from '../components/reports/ReportControls';
import ReportSummaryCards from '../components/reports/ReportSummaryCards';
import DailyReadingList from '../components/reports/DailyReadingList';
import DailyBreakdownTable from '../components/reports/DailyBreakdownTable';
import EmptyState from '../components/reports/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();

  // Selected report type: 'daily' | 'month-to-date' | 'monthly' | 'custom'
  const [reportType, setReportType] = useState('daily');

  // Input states
  const today = new Date().toISOString().split('T')[0];
  const [dailyDate, setDailyDate] = useState(today);
  const [mtdDate, setMtdDate] = useState(today);

  const currentDate = new Date();
  const [monthlyYear, setMonthlyYear] = useState(currentDate.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(currentDate.getMonth() + 1);

  // Default custom range: last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const [customStart, setCustomStart] = useState(fourteenDaysAgo.toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(today);

  // Report state
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = null;
      if (reportType === 'daily') {
        data = await getDailyReport(dailyDate);
      } else if (reportType === 'month-to-date') {
        data = await getMonthToDateReport(mtdDate);
      } else if (reportType === 'monthly') {
        data = await getMonthlyReport(monthlyYear, monthlyMonth);
      } else if (reportType === 'custom') {
        data = await getCustomReport(customStart, customEnd);
      }
      setReportData(data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load report. Please try again.';
      setError(msg);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, dailyDate, mtdDate, monthlyYear, monthlyMonth, customStart, customEnd]);

  // Re-fetch report when reportType or date parameters change
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasData = reportData && reportData.totalReadings > 0;

  return (
    <div className="dashboard-container">
      {/* 1. Header greeting */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <h2 className="hero-title">Welcome back, {user?.name || 'Patient'}!</h2>
          <p className="hero-subtitle">
            Track, analyze, and monitor your blood glucose trends across four comprehensive reporting views.
          </p>
        </div>
      </section>

      {/* 2. Report Type & Date Controls */}
      <section className="dashboard-controls-section">
        <ReportControls
          reportType={reportType}
          setReportType={setReportType}
          dailyDate={dailyDate}
          setDailyDate={setDailyDate}
          mtdDate={mtdDate}
          setMtdDate={setMtdDate}
          monthlyYear={monthlyYear}
          setMonthlyYear={setMonthlyYear}
          monthlyMonth={monthlyMonth}
          setMonthlyMonth={setMonthlyMonth}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          onRefresh={fetchReport}
          loading={loading}
        />
      </section>

      {/* 3. Error Alert */}
      {error && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 4. Loading indicator */}
      {loading && (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner"></div>
          <p>Calculating clinical metrics...</p>
        </div>
      )}

      {/* 5. Main Report View */}
      {!loading && reportData && (
        <main className="report-results-container">
          {/* Summary Metric Cards */}
          <ReportSummaryCards reportData={reportData} />

          {/* Daily View: Individual readings or empty state */}
          {reportType === 'daily' && (
            hasData ? (
              <DailyReadingList readings={reportData.readings} date={reportData.date} />
            ) : (
              <EmptyState message={`No glucose readings recorded for ${reportData.date}.`} />
            )
          )}

          {/* Range Views: Daily Breakdown or empty state */}
          {reportType !== 'daily' && (
            hasData ? (
              <DailyBreakdownTable
                dailyBreakdown={reportData.dailyBreakdown}
                periodTitle={
                  reportType === 'month-to-date'
                    ? `From ${reportData.startDate} through ${reportData.endDate}`
                    : reportType === 'monthly'
                    ? `Full month of ${reportData.startDate} to ${reportData.endDate}`
                    : `Custom range: ${reportData.startDate} to ${reportData.endDate}`
                }
              />
            ) : (
              <EmptyState
                message={`No glucose readings found between ${reportData.startDate || 'start'} and ${reportData.endDate || 'end'}.`}
              />
            )
          )}
        </main>
      )}
    </div>
  );
}
