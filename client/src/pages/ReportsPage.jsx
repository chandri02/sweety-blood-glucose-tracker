import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
import { SkeletonCardsGrid } from '../components/common/Skeleton';

export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();

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
      toast.error(msg, 'Report Error');
    } finally {
      setLoading(false);
    }
  }, [reportType, dailyDate, mtdDate, monthlyYear, monthlyMonth, customStart, customEnd, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasData = reportData && reportData.totalReadings > 0;

  return (
    <div className="reports-page-container">
      {/* 1. Header */}
      <section className="reports-hero">
        <div className="hero-content">
          <h2 className="hero-title">Comprehensive Clinical Reports</h2>
          <p className="hero-subtitle">
            Analyze your blood glucose readings with Daily, Month-to-Date, Monthly, and Custom Date Range clinical reports.
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

      {/* 3. Error Alert with Retry */}
      {error && (
        <div className="alert alert-error" role="alert">
          <div className="alert-content-row">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={fetchReport}
          >
            Try Again
          </button>
        </div>
      )}

      {/* 4. Loading Skeleton or Main Report View */}
      {loading ? (
        <main className="report-results-container">
          <SkeletonCardsGrid />
        </main>
      ) : reportData ? (
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
      ) : null}
    </div>
  );
}
