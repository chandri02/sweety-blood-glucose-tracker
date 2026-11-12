import React from 'react';

export default function ReportControls({
  reportType,
  setReportType,
  dailyDate,
  setDailyDate,
  mtdDate,
  setMtdDate,
  monthlyYear,
  setMonthlyYear,
  monthlyMonth,
  setMonthlyMonth,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  onRefresh,
  loading,
}) {
  const today = new Date().toISOString().split('T')[0];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="report-controls-card">
      {/* 1. Report Type Switcher Tabs */}
      <div className="report-type-tabs" role="tablist" aria-label="Report Types">
        <button
          type="button"
          role="tab"
          aria-selected={reportType === 'daily'}
          className={`tab-btn ${reportType === 'daily' ? 'active' : ''}`}
          onClick={() => setReportType('daily')}
        >
          📅 Daily Report
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportType === 'month-to-date'}
          className={`tab-btn ${reportType === 'month-to-date' ? 'active' : ''}`}
          onClick={() => setReportType('month-to-date')}
        >
          📈 Month-to-Date
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportType === 'monthly'}
          className={`tab-btn ${reportType === 'monthly' ? 'active' : ''}`}
          onClick={() => setReportType('monthly')}
        >
          🗓️ Full Monthly
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportType === 'custom'}
          className={`tab-btn ${reportType === 'custom' ? 'active' : ''}`}
          onClick={() => setReportType('custom')}
        >
          🔍 Custom Range
        </button>
      </div>

      {/* 2. Contextual Date Controls */}
      <div className="date-selectors-row">
        {reportType === 'daily' && (
          <div className="input-group">
            <label htmlFor="daily-date-picker">Select Date:</label>
            <input
              id="daily-date-picker"
              type="date"
              max={today}
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="form-input"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDailyDate(today)}
            >
              Today
            </button>
          </div>
        )}

        {reportType === 'month-to-date' && (
          <div className="input-group">
            <label htmlFor="mtd-date-picker">Reference Date (through):</label>
            <input
              id="mtd-date-picker"
              type="date"
              max={today}
              value={mtdDate}
              onChange={(e) => setMtdDate(e.target.value)}
              className="form-input"
            />
            <span className="control-hint">
              Aggregates from the 1st of the month through this date
            </span>
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="input-group-row">
            <div className="input-group">
              <label htmlFor="monthly-month-select">Month:</label>
              <select
                id="monthly-month-select"
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                className="form-select"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="monthly-year-select">Year:</label>
              <select
                id="monthly-year-select"
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(Number(e.target.value))}
                className="form-select"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {reportType === 'custom' && (
          <div className="input-group-row">
            <div className="input-group">
              <label htmlFor="custom-start-date">Start Date:</label>
              <input
                id="custom-start-date"
                type="date"
                max={customEnd || today}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="custom-end-date">End Date:</label>
              <input
                id="custom-end-date"
                type="date"
                min={customStart}
                max={today}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
}
