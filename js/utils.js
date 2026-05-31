/* ============================================================
   POOJA'S COUTURE — Shared Utilities
   Formatting, validation, date handling, DOM helpers
   ============================================================ */

const Utils = (() => {
  // ---------- Currency & Number Formatting ----------
  function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '$' + num.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatNumber(num) {
    return (parseFloat(num) || 0).toLocaleString('en-AU');
  }

  function formatCompact(num) {
    num = parseFloat(num) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatPercent(value, decimals = 1) {
    return (parseFloat(value) || 0).toFixed(decimals) + '%';
  }

  // ---------- GST Calculations (Australian 10%) ----------
  function calculateGST(amountExGST) {
    const amount = parseFloat(amountExGST) || 0;
    const gst = amount * 0.1;
    return {
      amountExGST: amount,
      gst: Math.round(gst * 100) / 100,
      total: Math.round((amount + gst) * 100) / 100
    };
  }

  function extractGSTFromTotal(totalIncGST) {
    const total = parseFloat(totalIncGST) || 0;
    const amountExGST = total / 1.1;
    const gst = total - amountExGST;
    return {
      amountExGST: Math.round(amountExGST * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: total
    };
  }

  // ---------- Date Formatting ----------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function formatDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatDateShort(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  function formatDateTime(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${mins} ${ampm}`;
  }

  function formatTime(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${mins} ${ampm}`;
  }

  function formatDateInput(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  function getRelativeTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) return formatDate(date);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  function isToday(date) {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  function isThisMonth(date) {
    const d = new Date(date);
    const today = new Date();
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }

  function isThisYear(date) {
    const d = new Date(date);
    return d.getFullYear() === new Date().getFullYear();
  }

  function daysFromNow(date) {
    const d = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  function getMonthRange(year, month) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, daysInMonth: end.getDate() };
  }

  // ---------- ID Generation ----------
  function generateId() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    );
  }

  // ---------- Validation ----------
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[\d\s\-\+\(\)]{8,15}$/.test(phone);
  }

  function isEmpty(value) {
    return value === null || value === undefined || value === '' ||
      (Array.isArray(value) && value.length === 0);
  }

  // ---------- String Helpers ----------
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function titleCase(str) {
    if (!str) return '';
    return str.split(/[\s_-]+/).map(capitalize).join(' ');
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function truncateText(str, maxLen = 50) {
    if (!str || str.length <= maxLen) return str || '';
    return str.substring(0, maxLen) + '…';
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  }

  // ---------- DOM Helpers ----------
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') el.className = value;
      else if (key === 'innerHTML') el.innerHTML = value;
      else if (key === 'textContent') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'dataset') Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else el.setAttribute(key, value);
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child instanceof HTMLElement) el.appendChild(child);
    });
    return el;
  }

  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Misc Helpers ----------
  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function throttle(fn, limit = 300) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Color helpers for charts
  const CHART_COLORS = [
    '#ECB676', '#CA8F55', '#A4652F', '#F5DABA',
    '#34D399', '#60A5FA', '#A78BFA', '#F87171',
    '#FBBF24', '#FB923C', '#2DD4BF', '#E879F9'
  ];

  function getChartColor(index) {
    return CHART_COLORS[index % CHART_COLORS.length];
  }

  // Avatar color generator based on name
  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#ECB676', '#CA8F55', '#34D399', '#60A5FA', '#A78BFA', '#F87171', '#FBBF24', '#2DD4BF'];
    return colors[Math.abs(hash) % colors.length];
  }

  // ---------- Toast Notifications ----------
  function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = createElement('div', {
      className: `toast toast-${type} animate-slide-in-right`,
      innerHTML: `
        <div class="toast-icon">${getToastIcon(type)}</div>
        <div class="toast-message">${sanitizeHTML(message)}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      `
    });
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function createToastContainer() {
    const container = createElement('div', { id: 'toast-container' });
    document.body.appendChild(container);
    return container;
  }

  function getToastIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  // ---------- Payroll Helpers (AU) ----------
  function calculateSuperannuation(grossSalary) {
    // 11.5% super guarantee rate (2025-26)
    return Math.round(grossSalary * 0.115 * 100) / 100;
  }

  function estimateIncomeTax(annualGross) {
    // Simplified AU tax brackets 2025-26
    const gross = parseFloat(annualGross) || 0;
    if (gross <= 18200) return 0;
    if (gross <= 45000) return (gross - 18200) * 0.16;
    if (gross <= 135000) return 4288 + (gross - 45000) * 0.30;
    if (gross <= 190000) return 31288 + (gross - 135000) * 0.37;
    return 51638 + (gross - 190000) * 0.45;
  }

  function calculateMonthlyTax(annualGross) {
    return Math.round(estimateIncomeTax(annualGross) / 12 * 100) / 100;
  }

  return {
    formatCurrency, formatNumber, formatCompact, formatPercent,
    calculateGST, extractGSTFromTotal,
    MONTHS, MONTHS_FULL, DAYS,
    formatDate, formatDateShort, formatDateTime, formatTime, formatDateInput,
    getRelativeTime, isToday, isThisMonth, isThisYear, daysFromNow, getMonthRange,
    generateId,
    validateEmail, validatePhone, isEmpty,
    capitalize, titleCase, slugify, truncateText, getInitials,
    $, $$, createElement, sanitizeHTML,
    debounce, throttle, deepClone, randomFromArray, randomBetween,
    CHART_COLORS, getChartColor, getAvatarColor,
    showToast,
    calculateSuperannuation, estimateIncomeTax, calculateMonthlyTax
  };
})();
