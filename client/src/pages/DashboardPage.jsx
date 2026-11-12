import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
  getCustomReport,
} from '../api/reports.api';
import { getReadings } from '../api/readings.api';
import ReportControls from '../components/reports/ReportControls';
import ReportSummaryCards from '../components/reports/ReportSummaryCards';
import DashboardChartSection from '../components/charts/DashboardChartSection';
import RecentReadings from '../components/dashboard/RecentReadings';
import ReadingModal from '../components/readings/ReadingModal';
import { SkeletonCardsGrid } from '../components/common/Skeleton';

export default function DashboardPage({ onNavigateToReadings, refreshTrigger }) {
  const { user } = useAuth();
  const toast = useToast();

  // Period selector state: 'daily' | 'month-to-date' | 'monthly' | 'custom'
  const [reportType, setReportType] = useState('month-to-date');

  const today = new Date().toISOString().split('T')[0];
  const [dailyDate, setDailyDate] = useState(today);
  const [mtdDate, setMtdDate] = useState(today);

  const currentDate = new Date();
  const [monthlyYear, setMonthlyYear] = useState(currentDate.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(currentDate.getMonth() + 1);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const [customStart, setCustomStart] = useState(fourteenDaysAgo.toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(today);

  // Data states
  const [reportData, setReportData] = useState(null);
  const [recentReadings, setRecentReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick Add Reading Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch report data for selected period
  const fetchDashboardData = useCallback(async () => {
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
      const msg = err.response?.data?.error?.message || 'Failed to load dashboard metrics.';
      setError(msg);
      setReportData(null);
      toast.error(msg, 'Metrics Error');
    } finally {
      setLoading(false);
    }
  }, [reportType, dailyDate, mtdDate, monthlyYear, monthlyMonth, customStart, customEnd, toast]);

  // Fetch recent readings
  const fetchRecentReadings = useCallback(async () => {
    setRecentLoading(true);
    try {
      const data = await getReadings({ page: 1, limit: 5 });
      setRecentReadings(data.readings || []);
    } catch {
      // Non-fatal for dashboard
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

  useEffect(() => {
    fetchRecentReadings();
  }, [fetchRecentReadings, refreshTrigger]);

  function handleReadingSaved() {
    toast.success('Reading logged and dashboard metrics updated.');
    fetchDashboardData();
    fetchRecentReadings();
  }

  return (
    <div className="dashboard-container">
      {/* 1. Header Hero */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">Clinical Health Overview</div>
          <h2 className="hero-title">Welcome back, {user?.name || 'Patient'}!</h2>
          <p className="hero-subtitle">
            Monitor your glucose control, view dynamic trend visualizations, and analyze time-slot patterns in real time.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Log Reading
          </button>
        </div>
      </section>

      {/* 2. Reporting Period Controls */}
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
          onRefresh={fetchDashboardData}
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
            onClick={fetchDashboardData}
          >
            Try Again
          </button>
        </div>
      )}

      {/* 4. Dynamic Summary Cards (4 Cards) */}
      <section className="dashboard-metrics-section">
        {loading ? (
          <SkeletonCardsGrid />
        ) : (
          <ReportSummaryCards reportData={reportData} />
        )}
      </section>

      {/* 5. Chart Visualization Section (Trend & Slot Comparison) */}
      <section className="dashboard-visualization-section">
        <DashboardChartSection
          reportType={reportType}
          reportData={reportData}
          loading={loading}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </section>

      {/* 6. Recent Readings Section */}
      <section className="dashboard-recent-section">
        <RecentReadings
          readings={recentReadings}
          loading={recentLoading}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onNavigateToReadings={onNavigateToReadings}
        />
      </section>

      {/* Quick Add Reading Modal */}
      <ReadingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={handleReadingSaved}
      />
    </div>
  );
}
