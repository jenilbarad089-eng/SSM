/**
 * Smart Society Management System - Indian Standard Time (IST) Engine
 * Live real-time clock and date synchronized to Asia/Kolkata (UTC+5:30)
 */

const ISTClock = {
  timeFormatter: new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }),

  dateFormatter: new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }),

  fullDateFormatter: new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }),

  getTime(date = new Date()) {
    return this.timeFormatter.format(date).toUpperCase();
  },

  getDate(date = new Date()) {
    return this.dateFormatter.format(date);
  },

  getFullDate(date = new Date()) {
    return this.fullDateFormatter.format(date);
  },

  getTimestamp(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
    return parts.replace(',', '');
  },

  updateAll() {
    const now = new Date();
    const timeStr = this.getTime(now);
    const dateStr = this.getDate(now);
    const fullDateStr = this.getFullDate(now);

    // Update time elements
    document.querySelectorAll('#istLiveTime, .ist-live-time').forEach(el => {
      el.textContent = `${timeStr} (IST)`;
    });

    // Update date elements
    document.querySelectorAll('#istLiveDate, .ist-live-date').forEach(el => {
      el.textContent = dateStr;
    });

    // Update full date/time elements
    document.querySelectorAll('#istFullDateTime, .ist-full-datetime').forEach(el => {
      el.textContent = `${dateStr} • ${timeStr} (IST)`;
    });

    // Update dashboard specific elements
    const adminTime = document.getElementById('adminDashboardISTTime');
    if (adminTime) adminTime.textContent = timeStr + ' (IST)';
    const adminDate = document.getElementById('adminDashboardISTDate');
    if (adminDate) adminDate.textContent = fullDateStr;

    const guardTime = document.getElementById('guardGateISTTime');
    if (guardTime) guardTime.textContent = timeStr + ' (IST)';
    const guardDate = document.getElementById('guardGateISTDate');
    if (guardDate) guardDate.textContent = fullDateStr;

    const commTime = document.getElementById('commDashboardISTTime');
    if (commTime) commTime.textContent = timeStr + ' (IST)';
    const commDate = document.getElementById('commDashboardISTDate');
    if (commDate) commDate.textContent = fullDateStr;

    const resTime = document.getElementById('resDashboardISTTime');
    if (resTime) resTime.textContent = timeStr + ' (IST)';
    const resDate = document.getElementById('resDashboardISTDate');
    if (resDate) resDate.textContent = fullDateStr;
  },

  init() {
    this.updateAll();
    setInterval(() => this.updateAll(), 1000);
  }
};

window.IST = ISTClock;
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ISTClock.init());
  } else {
    ISTClock.init();
  }
}
