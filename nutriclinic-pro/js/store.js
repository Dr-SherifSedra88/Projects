/* ============================================================
   NutriClinic Pro — store.js
   Persistent local data layer (IndexedDB) with in-memory cache.
   Standalone build: all data stays in this browser/device.
   Production deployment path: server API + PostgreSQL (see docs).
   ============================================================ */
'use strict';
(function () {

  const DB_NAME = 'cnp_clinic_v1';
  const DB_VER = 2;
  const JSON_STORES = ['patients', 'assessments', 'measurements', 'energy', 'plans', 'followups', 'templates', 'kb', 'foods'];
  const KV_STORE = 'kv';

  let db = null;
  const cache = {}; // storeName -> array
  let readyResolve; const ready = new Promise(r => { readyResolve = r; });

  function openDb() {
    return new Promise((res, rej) => {
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VER); }
      catch (e) { rej(e); return; }
      req.onupgradeneeded = ev => {
        const d = ev.target.result;
        JSON_STORES.forEach(s => {
          if (!d.objectStoreNames.contains(s)) {
            const os = d.createObjectStore(s, { keyPath: 'id' });
            if (s !== 'templates') os.createIndex('patientId', 'patientId', { unique: false });
          }
        });
        if (!d.objectStoreNames.contains('files')) {
          const fs = d.createObjectStore('files', { keyPath: 'id' });
          fs.createIndex('patientId', 'patientId', { unique: false });
        }
        if (!d.objectStoreNames.contains(KV_STORE)) d.createObjectStore(KV_STORE);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }

  function tx(store, mode, fn) {
    if (!db) return Promise.resolve(); /* memory-only fallback */
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const os = t.objectStore(store);
      let out;
      try { out = fn(os); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }

  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  async function loadAll() {
    if (!db) throw new Error('no-db');
    for (const s of JSON_STORES) cache[s] = await reqP(db.transaction(s).objectStore(s).getAll());
    cache.files = await reqP(db.transaction('files').objectStore('files').getAll());
    cache.settings = await getKV('settings');
    cache.meta = await getKV('meta');
  }

  async function getKV(key) {
    if (!db) return null;
    return reqP(db.transaction(KV_STORE).objectStore(KV_STORE).get(key));
  }
  async function setKV(key, val) {
    return tx(KV_STORE, 'readwrite', os => os.put(val, key));
  }

  const saveQ = new Map(); // per-store write queue to serialize
  function queue(store, fn) {
    const prev = saveQ.get(store) || Promise.resolve();
    const next = prev.then(fn, fn);
    saveQ.set(store, next);
    return next;
  }

  async function persistMeta() { if (db) await setKV('meta', store.meta); }

  function touch() { CN.bus.emit('data-changed'); }

  const store = {
    ready,
    settings: null,
    meta: null,

    async init() {
      try {
        db = await openDb();
        await loadAll();
      } catch (e) {
        console.error('IndexedDB unavailable — running in-memory only', e);
        JSON_STORES.forEach(s => cache[s] = cache[s] || []);
        cache.files = [];
        cache.settings = null; cache.meta = null;
        this.memoryOnly = true;
      }
      this.settings = cache.settings || null;
      this.meta = cache.meta || { firstRun: true, patientSeq: 0, demo: false };
      readyResolve(this);
      return this;
    },

    /* ---------- settings ---------- */
    async saveSettings(patch) {
      this.settings = Object.assign({}, this.settings || {}, patch);
      cache.settings = this.settings;
      await setKV('settings', this.settings);
      CN.bus.emit('settings-changed', this.settings);
      return this.settings;
    },
    defaultSettings() {
      return {
        clinic: { name: 'NutriClinic Center', nameAr: 'مركز نيوتركلينك', physician: '', title: '', contact: '', address: '', logoFileId: null, accent: '#14213D' },
        defaults: { equation: 'mifflin', activity: 'light', deficitPref: 'moderate', surplusPref: 'moderate', duration: 7, portionMode: 'household', units: 'metric', fuInterval: 14 },
        ai: { mode: 'algorithmic', endpoint: '', model: '', key: '', deidentify: true },
        customFields: [],
        pdfTemplates: [],
        lang: 'en'
      };
    },

    /* ---------- generic JSON store ---------- */
    list(storeName, opts) {
      opts = opts || {};
      let arr = (cache[storeName] || []).slice();
      if (opts.patientId) arr = arr.filter(x => x.patientId === opts.patientId);
      if (opts.filter) arr = arr.filter(opts.filter);
      if (opts.sortBy) arr.sort((a, b) => { const av = opts.sortBy(a), bv = opts.sortBy(b); return opts.sortDir === 'asc' ? (av > bv ? 1 : av < bv ? -1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0); });
      return arr;
    },
    get(storeName, id) { return (cache[storeName] || []).find(x => x.id === id) || null; },
    save(storeName, obj) {
      if (!obj.id) obj.id = CN.util.uid(storeName.slice(0, 3));
      obj.updatedAt = CN.util.nowISO();
      if (!obj.createdAt) obj.createdAt = obj.updatedAt;
      return queue(storeName, async () => {
        await tx(storeName, 'readwrite', os => os.put(obj));
        const arr = cache[storeName] || (cache[storeName] = []);
        const i = arr.findIndex(x => x.id === obj.id);
        if (i >= 0) arr[i] = obj; else arr.push(obj);
        touch();
        return obj;
      });
    },
    remove(storeName, id) {
      return queue(storeName, async () => {
        await tx(storeName, 'readwrite', os => os.delete(id));
        cache[storeName] = (cache[storeName] || []).filter(x => x.id !== id);
        touch();
      });
    },

    /* ---------- patients ---------- */
    patients(opts) { return this.list('patients', opts); },
    getPatient(id) { return this.get('patients', id); },
    async nextPatientId() {
      this.meta.patientSeq = (this.meta.patientSeq || 0) + 1;
      await setKV('meta', this.meta);
      const y = new Date().getFullYear();
      return 'CNP-' + y + '-' + String(this.meta.patientSeq).padStart(4, '0');
    },
    async savePatient(p) {
      if (!p.id) p.id = await this.nextPatientId();
      return this.save('patients', p);
    },
    async deletePatientDeep(patientId) {
      for (const s of ['assessments', 'measurements', 'energy', 'plans', 'followups']) {
        const items = this.list(s, { patientId });
        for (const it of items) await this.remove(s, it.id);
      }
      const files = this.listFiles({ patientId });
      for (const f of files) await this.removeFile(f.id);
      await this.remove('patients', patientId);
    },

    /* measurements timeline (weight entries appended to patient.weights + body comp records) */
    appendWeight(patient, kg, date, source) {
      patient.weights = patient.weights || [];
      if (patient.initialWeight && !patient.weights.length) {
        patient.weights.push({ date: patient.regDate || CN.util.todayISO(), kg: +patient.initialWeight, source: 'clinic' });
      }
      patient.weights.push({ date: date || CN.util.todayISO(), kg: +kg, source: source || 'clinic' });
      patient.currentWeight = +kg;
      return this.savePatient(patient);
    },
    currentWeight(p) {
      if (!p) return NaN;
      if (p.weights && p.weights.length) return p.weights[p.weights.length - 1].kg;
      return CN.util.parseNum(p.currentWeight);
    },

    /* ---------- files (blobs) ---------- */
    listFiles(opts) {
      opts = opts || {};
      let arr = (cache.files || []).slice();
      if (opts.patientId) arr = arr.filter(f => f.patientId === opts.patientId);
      if (opts.kind) arr = arr.filter(f => f.kind === opts.kind);
      arr.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
      return arr;
    },
    async saveFile(rec) {
      rec.id = rec.id || CN.util.uid('file');
      rec.uploadedAt = rec.uploadedAt || CN.util.nowISO();
      await tx('files', 'readwrite', os => os.put(rec));
      cache.files = (cache.files || []).filter(f => f.id !== rec.id); cache.files.push(rec);
      touch();
      return rec;
    },
    getFile(id) { return (cache.files || []).find(f => f.id === id) || null; },
    async removeFile(id) {
      await tx('files', 'readwrite', os => os.delete(id));
      cache.files = (cache.files || []).filter(f => f.id !== id);
      touch();
    },

    /* ---------- export / import / wipe ---------- */
    async exportAll() {
      const data = { app: 'NutriClinic Pro', version: CN.version, exportedAt: CN.util.nowISO(), stores: {}, meta: this.meta };
      JSON_STORES.forEach(s => data.stores[s] = cache[s] || []);
      data.stores.settings = this.settings;
      data.files = [];
      for (const f of cache.files || []) {
        const entry = { id: f.id, name: f.name, mime: f.mime, size: f.size, kind: f.kind, patientId: f.patientId, uploadedAt: f.uploadedAt, notes: f.notes, text: f.text || null };
        try {
          if (f.blob && f.size <= 2500000) entry.dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(f.blob); });
        } catch (e) { /* skip large */ }
        data.files.push(entry);
      }
      return data;
    },
    async importAll(data) {
      if (!data || !data.stores) throw new Error('Unrecognized backup file');
      for (const s of JSON_STORES) {
        const arr = data.stores[s] || [];
        cache[s] = [];
        await tx(s, 'readwrite', os => { os.clear(); arr.forEach(x => os.put(x)); });
        cache[s] = arr;
      }
      if (data.stores.settings) { this.settings = data.stores.settings; cache.settings = this.settings; await setKV('settings', this.settings); }
      if (data.meta) { this.meta = data.meta; await setKV('meta', this.meta); }
      if (data.files) {
        for (const fe of data.files) {
          let blob = null;
          if (fe.dataUrl) { try { blob = await (await fetch(fe.dataUrl)).blob(); } catch (e) { blob = null; } }
          await this.saveFile({ id: fe.id, name: fe.name, mime: fe.mime, size: fe.size, kind: fe.kind, patientId: fe.patientId, uploadedAt: fe.uploadedAt, notes: fe.notes, text: fe.text, blob });
        }
      }
      touch();
    },
    async wipeAll() {
      for (const s of JSON_STORES) { await tx(s, 'readwrite', os => os.clear()); cache[s] = []; }
      await tx('files', 'readwrite', os => os.clear()); cache.files = [];
      this.settings = null; cache.settings = null; await setKV('settings', null);
      this.meta = { firstRun: true, patientSeq: 0, demo: false }; await setKV('meta', this.meta);
      touch();
    },

    /* ---------- demo seed ---------- */
    async seedDemo() {
      const T = CN.util;
      const today = T.todayISO();
      const d = (n) => T.addDays(today, -n);

      const p1 = {
        id: null, fullName: 'Mona Abdelrahman', dob: '1984-04-12', sex: 'female', phone: '+20 100 555 1122', email: 'mona.a@example.com',
        occupation: 'School teacher', regDate: d(84), emergency: 'Husband — +20 100 555 3344',
        heightCm: 162, initialWeight: 92, targetWeight: 75, currentWeight: 88.6,
        waistCm: 102, hipCm: 118, bodyFatPct: 38, muscleKg: 24.1, visceralFat: 12, tbwKg: 31.5, deviceBmr: null,
        weights: [ { date: d(84), kg: 92, source: 'clinic' }, { date: d(56), kg: 90.2, source: 'clinic' }, { date: d(28), kg: 89.1, source: 'clinic' }, { date: d(2), kg: 88.6, source: 'clinic' } ],
        conditions: ['Type 2 diabetes mellitus', 'Hypertension'], surgeries: 'None', family: 'Mother — T2DM; Father — IHD',
        medications: [ { name: 'Metformin', dose: '1000 mg', freq: '2×/day' }, { name: 'Amlodipine', dose: '5 mg', freq: '1×/day' } ],
        supplements: 'Vitamin D 50000 IU weekly (prescribed)',
        allergies: [ { name: 'None known', type: 'note' } ], intolerances: [], gi: 'Occasional bloating',
        notes: 'Motivated; works standing most of the day. Prefers Egyptian home cooking; limited budget for imports.',
        pregnancy: 'na', lifestyle: { activity: 'light', exerciseFreq: 1, sleep: 6, smoking: 'no', water: 1.5, eatingHabits: 'Skips breakfast, large evening meal', mealsPerDay: 3, prefs: ['foul', 'chicken', 'rice'], dislikes: ['liver'], culture: 'No pork', budget: 'low', prep: 'Cooks for family; limited time mornings' },
        goal: 'loss', status: 'active', custom: {}, tags: ['diabetes', 'hypertension']
      };
      await this.savePatient(p1);

      const a1 = [];
      a1.push(await this.save('assessments', { patientId: p1.id, date: d(84), items: [
        { code: 'fbg', label: 'Fasting glucose', value: 142, unit: 'mg/dL', refLow: 70, refHigh: 99 },
        { code: 'hba1c', label: 'HbA1c', value: 7.8, unit: '%', refLow: 4, refHigh: 5.6 },
        { code: 'tc', label: 'Total cholesterol', value: 214, unit: 'mg/dL', refLow: 100, refHigh: 200 },
        { code: 'ldl', label: 'LDL-C', value: 138, unit: 'mg/dL', refLow: 50, refHigh: 130 },
        { code: 'hdl', label: 'HDL-C', value: 42, unit: 'mg/dL', refLow: 50, refHigh: 90 },
        { code: 'tg', label: 'Triglycerides', value: 186, unit: 'mg/dL', refLow: 40, refHigh: 150 },
        { code: 'creat', label: 'Creatinine', value: 0.8, unit: 'mg/dL', refLow: 0.6, refHigh: 1.1 },
        { code: 'egfr', label: 'eGFR', value: 92, unit: 'mL/min/1.73m²', refLow: 90, refHigh: 120 },
        { code: 'tsh', label: 'TSH', value: 2.1, unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 },
        { code: 'vitd', label: 'Vitamin D (25-OH)', value: 18, unit: 'ng/mL', refLow: 30, refHigh: 100 },
        { code: 'hgb', label: 'Hemoglobin', value: 12.1, unit: 'g/dL', refLow: 12, refHigh: 15 }
      ], bp: { sys: 142, dia: 88, pulse: 82 }, notes: 'Baseline panel.' }));
      a1.push(await this.save('assessments', { patientId: p1.id, date: d(28), items: [
        { code: 'fbg', label: 'Fasting glucose', value: 126, unit: 'mg/dL', refLow: 70, refHigh: 99 },
        { code: 'hba1c', label: 'HbA1c', value: 7.2, unit: '%', refLow: 4, refHigh: 5.6 },
        { code: 'tg', label: 'Triglycerides', value: 168, unit: 'mg/dL', refLow: 40, refHigh: 150 },
        { code: 'ldl', label: 'LDL-C', value: 129, unit: 'mg/dL', refLow: 50, refHigh: 130 }
      ], bp: { sys: 134, dia: 84, pulse: 78 }, notes: 'Improving on plan.' }));

      for (const m of [
        { date: d(84), weight: 92, bodyFatPct: 39.5, muscleKg: 23.4, visceral: 13, waistCm: 104, hipCm: 119, notes: 'Baseline device scan (InBody).' },
        { date: d(28), weight: 89.1, bodyFatPct: 37.2, muscleKg: 24.0, visceral: 12, waistCm: 101.5, hipCm: 118, notes: '' },
        { date: d(2), weight: 88.6, bodyFatPct: 36.6, muscleKg: 24.1, visceral: 12, waistCm: 100.5, hipCm: 117.5, notes: '' }
      ]) { m.patientId = p1.id; m.source = 'device'; await this.save('measurements', m); }

      const e1 = await this.save('energy', { patientId: p1.id, date: d(84),
        equation: 'mifflin', weightBasis: 92, bmr: 1512, activity: 'light', factor: 1.375, tdee: 2079,
        goal: 'loss', deficit: 450, deficitLabel: 'moderate', target: 1630,
        macros: { mode: 'percent', p: 30, c: 40, f: 30, proteinPerKg: 1.4, fiber: 30, sodium: 2000, fluids: 2500 },
        safety: { level: 'mid', flags: ['Diabetes — coordinate targets with glucose-lowering therapy; monitor for hypoglycemia.', 'Deficit kept moderate in view of T2DM.'] },
        explanation: 'Moderate deficit (≈450 kcal) from a TDEE of 2,079 kcal — expected loss ≈ 0.4 kg/week.',
        status: 'approved', approvedAt: d(84) });

      await this.save('followups', { patientId: p1.id, date: d(56), weight: 90.2, waistCm: 103, bodyFatPct: 38.4, adherence: 'good', appetite: 'normal', gi: 'Less bloating', feedback: 'Hunger manageable; breakfast now included.', observations: 'Good initial response.', medChanges: 'None', nextDate: d(28) });
      await this.save('followups', { patientId: p1.id, date: d(28), weight: 89.1, waistCm: 101.5, bodyFatPct: 37.2, adherence: 'good', appetite: 'normal', gi: '', feedback: 'Energy better; family supportive.', observations: 'Continue current plan; reassess target at next visit.', medChanges: 'None', nextDate: d(-6) });
      await this.save('followups', { patientId: p1.id, date: d(2), weight: 88.6, waistCm: 100.5, bodyFatPct: 36.6, adherence: 'fair', appetite: 'increased', gi: '', feedback: 'Ramadan-style gatherings recently; some sweets.', observations: 'Slight slowdown this interval — adherence dip, not metabolic. Continue target.', medChanges: 'None', nextDate: null });

      /* Patient 2 — athlete, gain */
      const p2 = {
        id: null, fullName: 'Ahmed Samir', dob: '2000-01-25', sex: 'male', phone: '+20 101 222 8877', email: 'ahmed.s@example.com',
        occupation: 'Software engineer / powerlifter', regDate: d(60), emergency: 'Father — +20 101 222 1100',
        heightCm: 178, initialWeight: 67.5, targetWeight: 78, currentWeight: 68.8,
        waistCm: 76, hipCm: 94, bodyFatPct: 12, muscleKg: 34.2, visceralFat: 4, tbwKg: 44, deviceBmr: 1695,
        weights: [ { date: d(60), kg: 67.5, source: 'clinic' }, { date: d(30), kg: 68.1, source: 'clinic' }, { date: d(3), kg: 68.8, source: 'clinic' } ],
        conditions: [], surgeries: 'None', family: 'Unremarkable',
        medications: [], supplements: 'Vitamin D 1000 IU/day; creatine 5 g/day',
        allergies: [], intolerances: [], gi: '', notes: 'Seeks lean gain to 78 kg; trains 5–6×/week (strength + cardio). Late-night schedule.',
        pregnancy: 'na', lifestyle: { activity: 'very', exerciseFreq: 6, sleep: 7, smoking: 'no', water: 3, eatingHabits: '3 meals + 2 snacks; protein focus', mealsPerDay: 5, prefs: ['chicken', 'rice', 'oats', 'eggs'], dislikes: [], culture: 'No pork', budget: 'medium', prep: 'Meal preps on weekends' },
        goal: 'gain', status: 'active', custom: {}, tags: ['athlete']
      };
      await this.savePatient(p2);
      await this.save('assessments', { patientId: p2.id, date: d(60), items: [
        { code: 'hgb', label: 'Hemoglobin', value: 15.2, unit: 'g/dL', refLow: 13, refHigh: 17 },
        { code: 'vitd', label: 'Vitamin D (25-OH)', value: 24, unit: 'ng/mL', refLow: 30, refHigh: 100 },
        { code: 'creat', label: 'Creatinine', value: 1.1, unit: 'mg/dL', refLow: 0.7, refHigh: 1.3 },
        { code: 'tsh', label: 'TSH', value: 1.8, unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 }
      ], bp: { sys: 118, dia: 72, pulse: 62 }, notes: 'Baseline; vitamin D low-normal.' });
      await this.save('measurements', { patientId: p2.id, date: d(60), weight: 67.5, bodyFatPct: 12.5, muscleKg: 33.8, visceral: 4, source: 'device', notes: 'InBody baseline.' });
      await this.save('measurements', { patientId: p2.id, date: d(3), weight: 68.8, bodyFatPct: 12, muscleKg: 34.2, visceral: 4, source: 'device', notes: '' });
      await this.save('energy', { patientId: p2.id, date: d(60), equation: 'katch', weightBasis: 67.5, bmr: 1695, activity: 'very', factor: 1.725, tdee: 2924, goal: 'gain', surplus: 400, surplusLabel: 'moderate', target: 3324, macros: { mode: 'perKg', p: 30, c: 45, f: 25, proteinPerKg: 1.8, fiber: 30, sodium: 2300, fluids: 3500 }, safety: { level: 'low', flags: [] }, explanation: 'Moderate surplus (+400 kcal) for lean gain ≈ 0.4 kg/week.', status: 'approved', approvedAt: d(60) });
      await this.save('followups', { patientId: p2.id, date: d(30), weight: 68.1, waistCm: 76, bodyFatPct: 12.2, adherence: 'excellent', appetite: 'increased', gi: '', feedback: 'Strength improving; appetite up.', observations: 'Lean gain on track (~0.2 kg/wk).', medChanges: '—', nextDate: d(4) });

      /* Patient 3 — underweight + lactose intolerance */
      const p3 = {
        id: null, fullName: 'Salma Hassan', dob: '1995-09-30', sex: 'female', phone: '+20 106 777 3001', email: 'salma.h@example.com',
        occupation: 'Graphic designer', regDate: d(35), emergency: 'Sister — +20 106 777 3002',
        heightCm: 158, initialWeight: 44.2, targetWeight: 51, currentWeight: 44.9,
        waistCm: 62, hipCm: 88, bodyFatPct: 20, muscleKg: 19.2, visceralFat: 2, tbwKg: 26, deviceBmr: 1210,
        weights: [ { date: d(35), kg: 44.2, source: 'clinic' }, { date: d(4), kg: 44.9, source: 'clinic' } ],
        conditions: ['Iron-deficiency anemia (mild)'], surgeries: 'None', family: 'Mother — hypothyroidism',
        medications: [ { name: 'Ferrous sulfate', dose: '65 mg', freq: 'alternate days' } ],
        supplements: 'Folate 400 µg/day',
        allergies: [], intolerances: [ { name: 'Lactose', type: 'intolerance', notes: 'Bloating with milk; aged cheese tolerated' } ], gi: 'Bloating with milk products; irregular bowel habit',
        notes: 'Underweight work-up: TSH, glucose, kidney, inflammation all unremarkable; celiac serology negative. Wants steady weight gain.',
        pregnancy: 'na', lifestyle: { activity: 'light', exerciseFreq: 2, sleep: 6.5, smoking: 'no', water: 1.2, eatingHabits: 'Irregular meals; low appetite in mornings', mealsPerDay: 3, prefs: ['yogurt (lactose-free)', 'pasta', 'fruit'], dislikes: ['seafood'], culture: 'Halal', budget: 'medium', prep: 'Limited cooking skill' },
        goal: 'gain', status: 'active', custom: {}, tags: ['lactose', 'anemia']
      };
      await this.savePatient(p3);
      await this.save('assessments', { patientId: p3.id, date: d(35), items: [
        { code: 'hgb', label: 'Hemoglobin', value: 10.8, unit: 'g/dL', refLow: 12, refHigh: 15 },
        { code: 'ferritin', label: 'Ferritin', value: 12, unit: 'ng/mL', refLow: 30, refHigh: 300 },
        { code: 'tsh', label: 'TSH', value: 1.9, unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 },
        { code: 'fbg', label: 'Fasting glucose', value: 88, unit: 'mg/dL', refLow: 70, refHigh: 99 },
        { code: 'creat', label: 'Creatinine', value: 0.7, unit: 'mg/dL', refLow: 0.6, refHigh: 1.1 }
      ], bp: { sys: 105, dia: 68, pulse: 74 }, notes: 'Underweight work-up essentially normal; treat anemia nutritionally + supplement.' });
      await this.save('measurements', { patientId: p3.id, date: d(35), weight: 44.2, bodyFatPct: 20.5, muscleKg: 19.0, visceral: 2, source: 'device', notes: '' });
      await this.save('energy', { patientId: p3.id, date: d(35), equation: 'mifflin', weightBasis: 44.2, bmr: 1210, activity: 'light', factor: 1.375, tdee: 1664, goal: 'gain', surplus: 350, surplusLabel: 'moderate', target: 2014, macros: { mode: 'perKg', p: 30, c: 45, f: 25, proteinPerKg: 1.5, fiber: 25, sodium: 2300, fluids: 2000 }, safety: { level: 'low', flags: ['Underweight — organic causes assessed; monitor refeeding tolerance.'] }, explanation: 'Moderate surplus (+350 kcal) toward target weight ≈ 0.3 kg/week.', status: 'approved', approvedAt: d(35) });
      await this.save('followups', { patientId: p3.id, date: d(4), weight: 44.9, waistCm: 62, bodyFatPct: 20.2, adherence: 'fair', appetite: 'decreased', gi: 'Bloating resolved after lactose reduction', feedback: 'Appetite still low in mornings; evening meals easier.', observations: 'Steady small gain; add energy-dense snacks.', medChanges: 'None', nextDate: null });

      /* Demo plan versions (generated by the deterministic engine) */
      if (CN.planner) {
        try {
          const targets1 = { kcal: e1.target, pG: e1.macros.pG, cG: e1.macros.cG, fG: e1.macros.fG, fiber: e1.macros.fiber || 28, sodium: e1.macros.sodium || 2000 };
          const plan1 = CN.planner.generate({ patient: p1, approaches: ['diabetes', 'mediterranean'], config: { days: 7, mealsPerDay: 3, snacks: 2, window: 'none', cuisine: 'egyptian', budget: 'low', exclusions: [] }, targets: targets1, seed: 'demo-mona-v1' });
          plan1.title = 'Diabetes-oriented Mediterranean · 7-day plan';
          plan1.status = 'approved'; plan1.approvedAt = d(56);
          const saved1 = await this.save('plans', plan1);
          const plan2 = CN.util.deepClone(plan1);
          plan2.id = null; plan2.version = 2; plan2.basedOn = saved1.id; plan2.status = 'draft';
          try { plan2.days[0].meals[0].items[0].qty = Math.max(0.25, plan2.days[0].meals[0].items[0].qty - 0.25); } catch (e) { }
          await this.save('plans', plan2);
          const e3 = (this.list('energy', { patientId: p3.id })[0] || {});
          if (e3 && e3.target) {
            const plan3 = CN.planner.generate({ patient: p3, approaches: ['dairyfree', 'mediterranean'], config: { days: 3, mealsPerDay: 3, snacks: 2, window: 'none', cuisine: 'egyptian', budget: 'medium', exclusions: ['lactose'] }, targets: { kcal: e3.target, pG: e3.macros.pG, cG: e3.macros.cG, fG: e3.macros.fG, fiber: 25, sodium: 2300 }, seed: 'demo-salma-v1' });
            plan3.title = 'Dairy-free Mediterranean · 3-day plan';
            await this.save('plans', plan3);
          }
        } catch (e) { console.warn('demo plan seed skipped', e); }
      }

      /* One template */
      await this.save('templates', {
        id: 'tpl-med-weightloss', name: 'Mediterranean Weight Loss Template', nameAr: 'قالب متوسطي لإنقاص الوزن',
        approachIds: ['mediterranean', 'lowgi'], config: { duration: 7, mealsPerDay: 3, snacks: 2, window: 'none', cuisine: 'mediterranean', budget: 'medium' },
        targets: { kcal: 1500, p: 27, c: 42, f: 31 }, createdAt: CN.util.nowISO(), notes: 'Balanced Mediterranean pattern for weight reduction; personalize to patient targets.'
      });

      this.meta.demo = true;
      this.meta.firstRun = false;
      await setKV('meta', this.meta);
      touch();
      return true;
    },

    /* demo helpers */
    isDemo() { return !!(this.meta && this.meta.demo); },
    async _persistMeta() { await persistMeta(); }
  };

  CN.store = store;
  console.log('NutriClinic store.js loaded');
})();
