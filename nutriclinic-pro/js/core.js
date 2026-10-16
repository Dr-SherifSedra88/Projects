/* ============================================================
   NutriClinic Pro — core.js
   Namespace, utilities, formatters, icons, toasts, modals, drawers.
   No external dependencies. No green (design rule).
   ============================================================ */
'use strict';
window.CN = window.CN || {};

CN.version = '1.0.0';
CN.APP_NAME = 'NutriClinic Pro';

/* ---------------- DOM & utility ---------------- */
CN.util = (function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, d) => { const p = Math.pow(10, d || 0); return Math.round((+v || 0) * p) / p; };

  function parseNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v === null || v === undefined) return NaN;
    let s = String(v).trim();
    if (!s) return NaN;
    const arDigits = '٠١٢٣٤٥٦٧٨٩';
    const faDigits = '۰۱۲۳۴۵۶۷۸۹';
    s = s.replace(/[٠-٩]/g, ch => String(arDigits.indexOf(ch)))
         .replace(/[۰-۹]/g, ch => String(faDigits.indexOf(ch)))
         .replace(/[,\u066C\u060C]/g, '.') // unify decimal commas? keep last dot rule below
         .replace(/[,\s]/g, '');
    const m = s.match(/-?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : NaN;
  }

  function debounce(fn, ms) {
    let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 250); };
  }

  function download(name, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
  }

  function readFileAsText(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
  }
  function readFileAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  function readFileAsArrayBuffer(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });
  }

  function isoLocal(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  const todayISO = () => isoLocal(new Date());
  const nowISO = () => new Date().toISOString();

  function addDays(iso, days) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + (+days || 0)); return isoLocal(d); }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

  function ageFrom(dob) {
    if (!dob) return { years: NaN, months: NaN, label: '—' };
    const b = new Date(dob + 'T00:00:00'), n = new Date();
    let years = n.getFullYear() - b.getFullYear();
    let months = n.getMonth() - b.getMonth();
    if (n.getDate() < b.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    const label = years >= 2 ? (years + ' y') : (years * 12 + months) + ' mo';
    return { years, months, label };
  }

  const sumBy = (arr, fn) => (arr || []).reduce((s, x) => s + (fn(x) || 0), 0);
  function groupBy(arr, fn) { const m = {}; (arr || []).forEach(x => { const k = fn(x); (m[k] = m[k] || []).push(x); }); return m; }
  function uniqBy(arr, fn) { const seen = new Set(); return (arr || []).filter(x => { const k = fn(x); if (seen.has(k)) return false; seen.add(k); return true; }); }
  const deepClone = o => JSON.parse(JSON.stringify(o));
  const sortByDesc = (arr, fn) => (arr || []).slice().sort((a, b) => (fn(b) > fn(a) ? 1 : fn(b) < fn(a) ? -1 : 0));
  const sortByAsc = (arr, fn) => (arr || []).slice().sort((a, b) => (fn(a) > fn(b) ? 1 : fn(a) < fn(b) ? -1 : 0));

  function initials(name) {
    const parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0] ? p[0].toUpperCase() : '').join('') || '?';
  }

  function bytes(n) {
    if (n === null || n === undefined) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }

  /* open a file picker and resolve chosen files */
  function pickFiles(opts) {
    return new Promise(res => {
      const inp = el('input', { type: 'file' });
      if (opts && opts.accept) inp.accept = opts.accept;
      if (opts && opts.multiple) inp.multiple = true;
      inp.onchange = () => res(Array.from(inp.files || []));
      inp.click();
    });
  }

  return { $, $$, el, esc, uid, clamp, round, parseNum, debounce, download, readFileAsText, readFileAsDataURL, readFileAsArrayBuffer, todayISO, nowISO, addDays, daysBetween, ageFrom, sumBy, groupBy, uniqBy, deepClone, sortByDesc, sortByAsc, initials, bytes, pct, pickFiles };
})();

/* ---------------- Formatters ---------------- */
CN.fmt = (function () {
  const lang = () => (CN.i18n ? CN.i18n.lang() : 'en');
  const loc = () => (lang() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
  function num(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString(loc(), { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 1 : d });
  }
  const n0 = v => num(v, 0);
  const n1 = v => num(v, 1);
  const kcal = v => (isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—');
  const kg = v => (isFinite(v) ? Number(v).toFixed(1) : '—');
  const cm = v => (isFinite(v) ? Number(v).toFixed(1) : '—');
  const signed = v => (isFinite(v) ? (v > 0 ? '+' : '') + num(v, 1) : '—');
  function date(iso) {
    if (!iso) return '—';
    const d = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return '—';
    try { return d.toLocaleDateString(loc(), { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  function dateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso); if (isNaN(d)) return '—';
    try { return d.toLocaleDateString(loc(), { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return String(iso); }
  }
  const weekday = iso => { try { return new Date(iso + 'T00:00:00').toLocaleDateString(loc(), { weekday: 'short' }); } catch (e) { return ''; } };
  const pctF = v => (isFinite(v) ? Math.round(v) + '%' : '—');
  return { num, n0, n1, kcal, kg, cm, signed, date, dateTime, weekday, pctF };
})();

/* ---------------- tiny event bus ---------------- */
CN.bus = (function () {
  const map = {};
  return {
    on(ev, fn) { (map[ev] = map[ev] || []).push(fn); return () => this.off(ev, fn); },
    off(ev, fn) { map[ev] = (map[ev] || []).filter(f => f !== fn); },
    emit(ev, data) { (map[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
  };
})();

/* ---------------- Icons (inline SVG, stroke: currentColor) ---------------- */
CN.icon = (function () {
  const P = {
    dashboard: '<rect x="3" y="3" width="7.5" height="9.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6"/><rect x="13.5" y="12" width="7.5" height="9" rx="1.6"/><rect x="3" y="16" width="7.5" height="5" rx="1.6"/>',
    users: '<path d="M16.5 21v-1.8a4 4 0 0 0-4-4h-6a4 4 0 0 0-4 4V21"/><circle cx="9.5" cy="7.5" r="3.6"/><path d="M21.5 21v-1.8a4 4 0 0 0-3-3.85"/><path d="M15.5 4.1a3.6 3.6 0 0 1 0 6.9"/>',
    userPlus: '<path d="M15 21v-1.8a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4V21"/><circle cx="8" cy="7.5" r="3.6"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    stethoscope: '<path d="M5 3v5.5a5 5 0 0 0 10 0V3"/><path d="M5 3H3.6"/><path d="M15 3h1.4"/><path d="M10 13.5V16a4.5 4.5 0 0 0 4.5 4.5H16"/><circle cx="19" cy="20" r="2"/><path d="M19 18v-.5"/>',
    flame: '<path d="M12 2.5c2 4.6 5.8 6.4 5.8 10.7a5.8 5.8 0 0 1-11.6 0c0-2 .8-3.7 2-5.4.1 1.6.9 2.6 2 3-.6-2.6.1-5.6 1.8-8.3z"/>',
    calculator: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><rect x="7.5" y="5.5" width="9" height="3.6" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.8h.01M12 16.8h.01M15.5 16.8h.01"/>',
    activity: '<path d="M22 12h-4l-3 8.5L9 3.5 6 12H2"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17.5" rx="2"/><path d="M9 4V3.2A1.7 1.7 0 0 1 10.7 1.5h2.6A1.7 1.7 0 0 1 15 3.2V4"/><path d="M9 10.5h6M9 14.2h6M9 17.9h3.5"/>',
    sparkles: '<path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5z"/><path d="M18.8 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/><path d="M5.5 15.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
    calendarCheck: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/><path d="M9 15l2.2 2.2L15.5 13"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V5.5"/><path d="M4.5 12v6.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V12"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    fileText: '<path d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 2v6h6"/><path d="M15.5 13H8.5M15.5 16.5H8.5M11 10H8.5"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.2 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.8 15a1.6 1.6 0 0 0-1.47-.97H3.2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.46-1 1.6 1.6 0 0 0-.32-1.77l-.06-.06A2 2 0 1 1 7.2 4.37l.06.06a1.6 1.6 0 0 0 1.77.32h.01a1.6 1.6 0 0 0 .97-1.47V3.2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.46h.01a1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77v.01a1.6 1.6 0 0 0 1.47.97h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.46.97z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    swap: '<path d="M7 4l-4 4 4 4"/><path d="M3 8h13"/><path d="M17 20l4-4-4-4"/><path d="M21 16H8"/>',
    print: '<path d="M6 9V3h12v6"/><path d="M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-6A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H18"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5"/><path d="M12 17.3h.01"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.7 2.6 4 6 4 9.5s-1.3 6.9-4 9.5c-2.7-2.6-4-6-4-9.5s1.3-6.9 4-9.5z"/>',
    scale: '<path d="M12 3v3"/><rect x="4" y="6" width="16" height="16" rx="2.5"/><path d="M8.5 11h.01M15.5 11h.01"/><path d="M8.5 15.5a3.5 3.5 0 0 1 7 0"/>',
    ruler: '<path d="M3 17.5L17.5 3l3.5 3.5L6.5 21z"/><path d="M7 13l2.5 2.5M10.5 9.5L13 12M14 6l2.5 2.5"/>',
    heart: '<path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 0 0-7.1 7.1l1.3 1.3L12 21l7.1-7 1.3-1.3a5 5 0 0 0 0-7.1z"/><path d="M2.5 12.5h4l1.5-3 3 6 2-4.5 1 1.5h7.5"/>',
    droplet: '<path d="M12 2.7s6.5 7 6.5 12A6.5 6.5 0 0 1 5.5 14.7c0-5 6.5-12 6.5-12z"/>',
    moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>',
    utensils: '<path d="M7 2.5v7a2.5 2.5 0 0 0 5 0v-7"/><path d="M9.5 2.5v19"/><path d="M17 2.5c-1.7 0-3 2.2-3 5v4.5h3V21"/><path d="M17 2.5V12"/>',
    wallet: '<rect x="2.5" y="5.5" width="19" height="14" rx="2.5"/><path d="M16 12.5h4.5"/><path d="M2.5 9h19"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
    filter: '<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    refresh: '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    eye: '<path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
    trendUp: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    trendDown: '<path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 8.6 8.6 0 0 1-3.4-.7L3 21l1.8-5.2a8.4 8.4 0 1 1 16.2-4.3z"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    shield: '<path d="M12 22s8-3.6 8-10V5.5L12 2 4 5.5V12c0 6.4 8 10 8 10z"/><path d="M9.5 11.5l2 2 3.5-4"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    user: '<circle cx="12" cy="7.5" r="4"/><path d="M4.5 21v-1.5a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5V21"/>',
    phone: '<path d="M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.7 2 2 0 0 1 2-2.2h2.6a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1l-1.1 1.1a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.45c.9.34 1.85.57 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6.5l9 6.5 9-6.5"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2.5 12.5h19"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2.5 3H20a2 2 0 0 1 2 2z"/>',
    table: '<rect x="3" y="3.5" width="18" height="17" rx="2"/><path d="M3 9.5h18M3 15.5h18M9.5 3.5v17"/>',
    chartLine: '<path d="M3 3v18h18"/><path d="M6.5 15l4-5 3.5 3 6-7"/>',
    bookOpen: '<path d="M2 4.5h6.5A3.5 3.5 0 0 1 12 8v13a3 3 0 0 0-3-3H2z"/><path d="M22 4.5h-6.5A3.5 3.5 0 0 0 12 8v13a3 3 0 0 1 3-3h7z"/>',
    target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6"/>',
    layers: '<path d="M12 2.5l10 5.5-10 5.5L2 8z"/><path d="M2 13l10 5.5L22 13"/><path d="M2 17.5L12 23l10-5.5"/>',
    archive: '<rect x="2.5" y="4" width="19" height="4.5" rx="1.5"/><path d="M4.5 8.5V20a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.5"/><path d="M10 12.5h4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    arrowRight: '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',
    arrowLeft: '<path d="M20 12H4"/><path d="M10 6l-6 6 6 6"/>',
    wand: '<path d="M15 4V2.5M15 21.5V20M8 9l12 12M19.8 15.8L21 14.6M4.2 4.2L3 5.4M21 8h-1.5M4.5 15H3"/><path d="M14 8l2-2"/>',
    pieChart: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.3-2.8 4"/><path d="M12 17.3h.01"/>',
    filter2: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    fastForward: '<path d="M5.5 4.5L13 12l-7.5 7.5z"/><path d="M13 4.5L20.5 12 13 19.5z"/>',
    timer: '<circle cx="12" cy="13" r="8.5"/><path d="M12 9.5V13l2.5 1.5"/><path d="M9.5 2h5"/>',
    boxes: '<path d="M12 2.8l4.5 2.6v5.2L12 13.2 7.5 10.6V5.4z"/><path d="M19 12.3l2.8 1.6v3.2L19 18.7l-2.8-1.6v-3.2z"/><path d="M5 12.3l2.8 1.6v3.2L5 18.7l-2.8-1.6v-3.2z"/>'
  };
  function icon(name, cls) {
    const p = P[name] || P.info;
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  return icon;
})();

/* ---------------- Toasts ---------------- */
CN.toast = function (msg, kind, ms) {
  const host = CN.util.$('#toasts');
  if (!host) return;
  const t = CN.util.el('div', { class: 'toast' + (kind === 'burg' ? ' burg' : kind === 'gold' ? ' gold' : '') });
  t.innerHTML = CN.icon(kind === 'burg' ? 'alert' : kind === 'gold' ? 'info' : 'check') + '<span>' + CN.util.esc(msg) + '</span>';
  host.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, ms || 3600);
};

/* ---------------- Modals & drawers ---------------- */
CN.modal = (function () {
  const stack = [];
  const layer = () => CN.util.$('#layer');

  function sync() { const l = layer(); if (l) l.classList.toggle('active', l.children.length > 0); }

  function open(opts) {
    opts = opts || {};
    const noClose = !!opts.noClose;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    const box = document.createElement('div');
    box.className = 'modal' + (opts.wide ? ' wide' : '') + (opts.narrow ? ' narrow' : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    if (opts.labelledBy) box.setAttribute('aria-labelledby', opts.labelledBy);
    box.innerHTML =
      '<div class="modal-head"><div><h3 id="' + (opts.labelledBy || '') + '">' + CN.util.esc(opts.title || '') + '</h3>' +
      (opts.sub ? '<div class="sub">' + CN.util.esc(opts.sub) + '</div>' : '') + '</div>' +
      (noClose ? '' : '<button class="modal-x" aria-label="Close">' + CN.icon('close') + '</button>') + '</div>' +
      '<div class="modal-body"></div>' +
      (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '');
    wrap.appendChild(box);
    const body = box.querySelector('.modal-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    const handle = {
      root: box, body, noClose,
      close(result) {
        const i = stack.indexOf(handle); if (i >= 0) stack.splice(i, 1);
        CN._escStack = (CN._escStack || []).filter(x => x.escOwner !== handle);
        wrap.remove(); sync();
        if (opts.onClose) opts.onClose(result);
      },
      setBody(html) { body.innerHTML = html; },
      setFoot(html) { const f = box.querySelector('.modal-foot'); if (f) f.innerHTML = html; }
    };
    const xBtn = box.querySelector('.modal-x');
    if (xBtn) xBtn.addEventListener('click', () => handle.close());
    wrap.addEventListener('mousedown', e => { if (e.target === wrap && !opts.sticky && !noClose) handle.close(); });
    layer().appendChild(wrap);
    stack.push(handle);
    (CN._escStack = CN._escStack || []).push({ close: () => handle.close(), noClose, escOwner: handle });
    sync();
    if (opts.onMount) try { opts.onMount(box, handle); } catch (e) { console.error(e); }
    const focusable = box.querySelector('input:not([type=hidden]), select, textarea, button.btn');
    if (focusable) setTimeout(() => focusable.focus(), 60);
    return handle;
  }

  function closeAll() { stack.slice().forEach(h => h.close()); }

  function confirmDlg(o) {
    o = o || {};
    return new Promise(res => {
      const foot = '<button class="btn btn-ghost" data-v="0">' + CN.util.esc(o.cancelText || CN.i18n.t('common.cancel')) + '</button>' +
                   '<button class="btn ' + (o.danger ? 'btn-acc' : 'btn-primary') + '" data-v="1">' + CN.util.esc(o.confirmText || CN.i18n.t('common.confirm')) + '</button>';
      const m = open({
        title: o.title || CN.i18n.t('common.confirm'), narrow: true,
        body: '<p>' + CN.util.esc(o.message || '') + '</p>', foot,
        onMount(box, h) {
          box.querySelectorAll('.modal-foot [data-v]').forEach(b => b.addEventListener('click', () => { h.close(); res(b.getAttribute('data-v') === '1'); }));
        },
        onClose() { res(false); }
      });
    });
  }

  CN._escStack = CN._escStack || [];
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const st = CN._escStack;
    if (!st.length) return;
    const top = st[st.length - 1];
    if (top.noClose) return;
    e.preventDefault();
    top.close();
  });

  return { open, closeAll, confirm: confirmDlg };
})();

CN.drawer = (function () {
  const stack = [];
  const layer = () => CN.util.$('#layer');
  function sync() { const l = layer(); if (l) l.classList.toggle('active', l.children.length > 0); }

  function open(opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'drawer-backdrop';
    const d = document.createElement('div');
    d.className = 'drawer';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="drawer-head"></div><div class="drawer-body"></div>';
    const head = d.querySelector('.drawer-head');
    if (typeof opts.head === 'string') head.innerHTML = opts.head;
    else if (opts.head) head.appendChild(opts.head);
    const body = d.querySelector('.drawer-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    wrap.appendChild(d);

    const handle = {
      root: d, head, body,
      close() { const i = stack.indexOf(handle); if (i >= 0) stack.splice(i, 1); CN._escStack = (CN._escStack || []).filter(x => x.escOwner !== handle); wrap.remove(); sync(); if (opts.onClose) opts.onClose(); }
    };
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) handle.close(); });
    layer().appendChild(wrap);
    stack.push(handle);
    (CN._escStack = CN._escStack || []).push({ close: () => handle.close(), noClose: false, escOwner: handle });
    sync();
    if (opts.onMount) try { opts.onMount(d, handle); } catch (e) { console.error(e); }
    return handle;
  }
  return { open };
})();

/* Re-usable HTML snippets */
CN.ui = {
  empty(title, text, actionHtml, icon) {
    return '<div class="empty"><div class="e-ico">' + CN.icon(icon || 'folder') + '</div><h3>' + CN.util.esc(title) + '</h3><p>' + CN.util.esc(text || '') + '</p>' + (actionHtml || '') + '</div>';
  },
  statusPill(status) {
    const map = { draft: 'draft', approved: 'approved', overdue: 'overdue', upcoming: 'upcoming', archived: 'archived', active: 'approved' };
    const cls = map[status] || 'upcoming';
    const label = CN.i18n.t('status.' + (cls === 'approved' ? 'approved' : cls)) || cls;
    return '<span class="status ' + cls + '">' + CN.util.esc(label) + '</span>';
  },
  chip(text, kind) { return '<span class="chip ' + (kind || '') + '">' + CN.util.esc(text) + '</span>'; },
  flag(kind, html) { return '<div class="flag ' + kind + '">' + CN.icon(kind === 'high' ? 'alert' : kind === 'mid' ? 'info' : 'check') + '<div>' + html + '</div></div>'; },
  mtb: v => (v === null || v === undefined || !isFinite(v)) ? '—' : CN.fmt.n1(v)
};

console.log('NutriClinic core.js loaded — v' + CN.version);
