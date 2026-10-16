/* ============================================================
   NutriClinic Pro — engine.js
   Deterministic, testable clinical calculations.
   No AI involved here: BMR, TDEE, deficit/surplus, safety,
   macronutrient targets, progress analysis, reassessment.
   ============================================================ */
'use strict';
(function () {

  const K = { kcalPerKgFat: 7700 };
  const E = {};

  /* ---------------- basic anthropometry ---------------- */
  E.bmi = (kg, cm) => (kg > 0 && cm > 0) ? (kg / Math.pow(cm / 100, 2)) : NaN;
  E.bmiCat = function (v) {
    if (!isFinite(v)) return { key: 'na', en: '—' };
    if (v < 18.5) return { key: 'underweight', en: 'Underweight' };
    if (v < 25) return { key: 'normal', en: 'Normal weight' };
    if (v < 30) return { key: 'overweight', en: 'Overweight' };
    if (v < 35) return { key: 'obese1', en: 'Obesity class I' };
    if (v < 40) return { key: 'obese2', en: 'Obesity class II' };
    return { key: 'obese3', en: 'Obesity class III' };
  };
  E.whr = (waist, hip) => (waist > 0 && hip > 0) ? waist / hip : NaN;
  E.whrRisk = function (v, sex) {
    if (!isFinite(v)) return { key: 'na', en: '—' };
    const cut = sex === 'male' ? 0.95 : 0.85;
    const inter = sex === 'male' ? 0.90 : 0.80;
    if (v >= cut) return { key: 'high', en: 'High risk' };
    if (v >= inter) return { key: 'inter', en: 'Increased risk' };
    return { key: 'low', en: 'Low risk' };
  };
  E.idealWeightRange = function (cm) {
    if (!cm) return [NaN, NaN];
    const m = cm / 100;
    return [18.5 * m * m, 24.9 * m * m];
  };
  E.adjustedWeight = function (actual, cm) {
    const [il, ih] = E.idealWeightRange(cm); const ideal = (il + ih) / 2;
    if (!isFinite(actual) || !isFinite(ideal)) return actual;
    return ideal + 0.25 * (actual - ideal);
  };

  /* ---------------- BMR ---------------- */
  E.BMR_METHODS = [
    { id: 'mifflin', needsBf: false },
    { id: 'harris', needsBf: false },
    { id: 'roza', needsBf: false },
    { id: 'katch', needsBf: true },
    { id: 'cunningham', needsBf: true },
    { id: 'device', needsDevice: true }
  ];

  E.bmr = function (m) {
    const { sex, weight, height, age, bfPct, method } = m;
    const s = (sex === 'male') ? 1 : 0;
    let value = NaN, formula = '';
    switch (method) {
      case 'mifflin':
        value = 10 * weight + 6.25 * height - 5 * age + (s ? 5 : -161);
        formula = 'Mifflin-St Jeor: 10×W + 6.25×H − 5×A ' + (s ? '+5' : '−161');
        break;
      case 'harris':
        value = s ? (66.473 + 13.7516 * weight + 5.0033 * height - 6.755 * age)
                  : (655.0955 + 9.5634 * weight + 1.8496 * height - 4.6756 * age);
        formula = 'Harris-Benedict (1919)';
        break;
      case 'roza':
        value = s ? (88.362 + 13.397 * weight + 4.799 * height - 5.677 * age)
                  : (447.593 + 9.247 * weight + 3.098 * height - 4.33 * age);
        formula = 'Revised Harris-Benedict (Roza & Shizgal, 1984)';
        break;
      case 'katch': {
        const lbm = weight * (1 - bfPct / 100);
        value = 370 + 21.6 * lbm;
        formula = 'Katch-McArdle: 370 + 21.6 × LBM(' + CN.fmt.n1(lbm) + ' kg)';
        break;
      }
      case 'cunningham': {
        const lbm = weight * (1 - bfPct / 100);
        value = 500 + 22 * lbm;
        formula = 'Cunningham: 500 + 22 × LBM(' + CN.fmt.n1(lbm) + ' kg)';
        break;
      }
      case 'device':
        value = m.deviceBmr;
        formula = 'Measured (body-composition device)';
        break;
      default: value = NaN;
    }
    return { value: isFinite(value) ? Math.round(value) : NaN, formula, method, measured: method === 'device' };
  };

  /* ---------------- Activity & TDEE ---------------- */
  E.ACTIVITY = [
    { id: 'sedentary', factor: 1.2 },
    { id: 'light', factor: 1.375 },
    { id: 'moderate', factor: 1.55 },
    { id: 'very', factor: 1.725 },
    { id: 'extra', factor: 1.9 }
  ];
  E.activityFactor = id => { const a = E.ACTIVITY.find(x => x.id === id); return a ? a.factor : 1.375; };
  E.tdee = (bmr, factor) => (isFinite(bmr) && isFinite(factor)) ? Math.round(bmr * factor) : NaN;

  /* ---------------- condition helpers ---------------- */
  E.profileText = function (patient) {
    if (!patient) return '';
    const parts = []
      .concat(patient.conditions || [])
      .concat(patient.tags || [])
      .concat(patient.gi ? [patient.gi] : [])
      .concat(patient.notes ? [patient.notes] : []);
    return parts.join(' | ').toLowerCase();
  };
  E.has = function (patient, re) { return re.test(E.profileText(patient)); };
  E.COND = {
    diabetes: /diabet|سكري|insulin|hba1c/,
    hypertension: /hypertens|blood pressure|ضغط/,
    ckd: /kidney|renal|ckd|nephro|كلى|كلوي/,
    cvd: /heart|cardiac|ihd|chf|coronary|stroke|قلب/,
    thyroid: /thyroid|hypothyroid|hyperthyroid|غدة/,
    pcos: /pcos|polycystic/,
    gout: /gout|uric/,
    liver: /liver|hepatic|كبد/,
    anemia: /anemi|anemia|فقر دم/,
    ed: /eating disorder|anorex|bulimi|eating-disorder/,
    gi: /ibs|colitis|celiac|reflux|gastritis|constipation|القولون|قولون/
  };

  /* ---------------- calorie target suggestions ---------------- */
  /* Returns candidate deficit/surplus options + safety evaluation. Deterministic, guideline-informed heuristics. */
  E.suggestTarget = function (ctx) {
    /* ctx: {patient, bmr, tdee, goal, settings, hasAssessment, weight} */
    const p = ctx.patient || {};
    const goal = ctx.goal || 'loss';
    const bmi = E.bmi(ctx.weight, p.heightCm);
    const age = (p.dob ? CN.util.ageFrom(p.dob).years : (CN.util.parseNum(p.age) || 40));
    const flags = [];
    const block = { loss: false };

    if (p.pregnancy === 'pregnant' || p.pregnancy === 'lactating') { block.loss = true; flags.push({ level: 'high', key: 'energy.flagPregnancy' }); }
    if (E.has(p, E.COND.ed)) { block.loss = true; flags.push({ level: 'high', key: 'energy.flagEd' }); }

    const out = { goal, options: [], recommended: null, flags, bmi };

    if (goal === 'loss') {
      const mk = (id, kcal, note) => ({ id, kcal, target: Math.round(ctx.tdee - kcal) });
      const opt = [];
      if (bmi >= 30) {
        opt.push(mk('mild', 275));
        opt.push(mk('moderate', 450));
        if (!block.loss) opt.push(mk('larger', 675), { supervision: true });
      } else if (bmi >= 27) {
        opt.push(mk('mild', 275));
        opt.push(mk('moderate', 450));
      } else if (bmi >= 25) {
        opt.push(mk('mild', 250));
      } else {
        flags.push({ level: 'high', key: 'energy.flagNoLoss' });
      }
      out.options = opt.filter(Boolean);
      out.recommended = out.options.find(o => o.id === 'moderate') ? 'moderate' : (out.options[0] ? out.options[0].id : null);
      if (block.loss) out.options = [];
      if (out.options.length) {
        out.options = out.options.map(o => {
          const t = o.target;
          const warns = [];
          if (t < 800) { warns.push({ level: 'high', text: 'Below 800 kcal — very-low-calorie territory (PSMF-level). Requires strict medical supervision.' }); }
          else {
            const floor = (p.sex === 'female') ? 1200 : 1500;
            if (t < floor) warns.push({ level: 'mid', key: 'energy.flagFloor' });
            if (t < ctx.bmr) warns.push({ level: 'mid', key: 'energy.flagBmr' });
          }
          return Object.assign({}, o, { warns });
        });
      }
      if (E.has(p, E.COND.diabetes)) flags.push({ level: 'mid', key: 'energy.flagComorbid' });
      if (E.has(p, E.COND.ckd) || E.has(p, E.COND.cvd) || E.has(p, E.COND.liver)) flags.push({ level: 'mid', key: 'energy.flagComorbid' });
      if (age >= 65) flags.push({ level: 'mid', text: 'Older adult: prefer smaller deficits and higher protein to protect lean mass.' });
      out.rateNote = 'deficit';
    } else if (goal === 'gain') {
      const mk = (id, kcal) => ({ id, kcal, target: Math.round(ctx.tdee + kcal) });
      out.options = [mk('mild', 300), mk('moderate', 450), mk('larger', 650)];
      if (bmi >= 30) { out.options = out.options.slice(0, 1); flags.push({ level: 'mid', text: 'BMI already elevated — weight gain is not typically indicated; individualize the therapeutic objective.' }); }
      out.recommended = 'moderate';
      if (!ctx.hasAssessment) flags.push({ level: 'mid', text: 'Underweight work-up: confirm organic causes were assessed (CBC, thyroid, glucose, kidney, inflammation) before refeeding.' });
      out.rateNote = 'surplus';
    } else { /* maintain */
      out.suggested = Math.round(ctx.tdee);
      out.recommended = 'maintain';
      out.rateNote = 'maintain';
      out.options = [{ id: 'maintain', kcal: 0, target: Math.round(ctx.tdee) }];
    }
    return out;
  };

  E.rate = function (deltaKcal, direction) {
    /* direction: 'loss' | 'gain' — returns kg per week estimate */
    if (!isFinite(deltaKcal)) return NaN;
    const v = Math.abs(deltaKcal) * 7 / K.kcalPerKgFat;
    return direction === 'loss' ? -v : v;
  };

  /* ---------------- macronutrients ---------------- */
  E.defaultProteinPerKg = function (patient, goal) {
    const p = patient || {};
    let g = 1.0;
    if (goal === 'loss') g = 1.4;
    else if (goal === 'gain') g = 1.6;
    if (E.has(p, E.COND.ckd)) g = 0.8;
    if ((p.lifestyle && p.lifestyle.exerciseFreq >= 5) || (p.tags || []).includes('athlete')) g = Math.max(g, 1.8);
    const age = p.dob ? CN.util.ageFrom(p.dob).years : 40;
    if (age >= 65) g = Math.max(g, 1.2);
    return g;
  };

  E.macros = function (ctx) {
    /* ctx: {patient, target, approachIds, goal, settings, override:{mode,p,c,f,proteinPerKg,fiber,sodium,fluids}} */
    const o = ctx.override || {};
    const approaches = (ctx.approachIds || []).map(id => CN.approachById(id)).filter(Boolean);
    let P, C, F;
    const avgP = approaches.length ? Math.round(approaches.reduce((s, a) => s + a.macro.p, 0) / approaches.length) : 25;
    const avgC = approaches.length ? Math.round(approaches.reduce((s, a) => s + a.macro.c, 0) / approaches.length) : 45;
    if (o.mode === 'percent' && (o.p !== undefined || o.c !== undefined || o.f !== undefined)) {
      P = (o.p !== undefined && o.p !== null && isFinite(o.p)) ? +o.p : avgP;
      C = (o.c !== undefined && o.c !== null && isFinite(o.c)) ? +o.c : avgC;
      F = (o.f !== undefined && o.f !== null && isFinite(o.f)) ? +o.f : Math.max(0, 100 - P - C);
    }
    else if (approaches.length) {
      P = avgP;
      C = avgC;
      F = 100 - P - C;
    } else { P = 25; C = 45; F = 30; }
    const target = ctx.target || 2000;
    const pG = Math.round(target * P / 100 / 4);
    const cG = Math.round(target * C / 100 / 4);
    const fG = Math.round(target * F / 100 / 9);
    const proteinPerKg = o.proteinPerKg || E.defaultProteinPerKg(ctx.patient, ctx.goal);
    let sodium = o.sodium;
    if (!sodium) sodium = approaches.length ? Math.min.apply(null, approaches.map(a => a.sodiumLimit || 2300)) : 2300;
    let fiber = o.fiber;
    if (!fiber) fiber = Math.max(14 * target / 1000, approaches.length ? Math.max.apply(null, approaches.map(a => a.fiberMin || 25)) : 25);
    const w = CN.store.currentWeight(ctx.patient) || CN.util.parseNum(ctx.patient && ctx.patient.currentWeight) || 70;
    const fluids = o.fluids || Math.round(Math.min(Math.max(30 * w, 1500), 4000) / 50) * 50;
    return { mode: o.mode || (approaches.length ? 'percent' : 'percent'), p: P, c: C, f: F, pG, cG, fG, proteinPerKg, fiber: Math.round(fiber), sodium, fluids, approaches: ctx.approachIds || [] };
  };

  /* ---------------- safety evaluation for a chosen target ---------------- */
  E.safetyFor = function (ctx) {
    /* ctx: {patient, bmr, tdee, target, goal} */
    const p = ctx.patient || {};
    const flags = [];
    const age = p.dob ? CN.util.ageFrom(p.dob).years : 40;
    if (ctx.goal === 'loss') {
      if (p.pregnancy === 'pregnant' || p.pregnancy === 'lactating') flags.push({ level: 'high', key: 'energy.flagPregnancy' });
      if (E.has(p, E.COND.ed)) flags.push({ level: 'high', key: 'energy.flagEd' });
      if (ctx.target < 800) flags.push({ level: 'high', text: 'Very-low-calorie target (<800 kcal) — PSMF-territory; strict supervision, supplements and monitoring required.' });
      else {
        const floor = (p.sex === 'female') ? 1200 : 1500;
        if (ctx.target < floor) flags.push({ level: 'mid', key: 'energy.flagFloor' });
      }
      if (ctx.target < ctx.bmr) flags.push({ level: 'mid', key: 'energy.flagBmr' });
      const bmi = E.bmi(CN.store.currentWeight(p), p.heightCm);
      if (bmi < 18.5) flags.push({ level: 'high', key: 'energy.flagNoLoss' });
      if (age < 18) flags.push({ level: 'high', text: 'Patient under 18 — pediatric energy planning requires specialist protocols.' });
    }
    return flags;
  };

  /* ---------------- progress analysis ---------------- */
  E.progressSeries = function (patient, followups) {
    const pts = [];
    (patient && patient.weights || []).forEach(w => pts.push({ date: w.date, kg: w.kg, src: w.source || 'clinic' }));
    (followups || []).forEach(f => { if (f.weight) pts.push({ date: f.date, kg: +f.weight, src: 'followup' }); });
    pts.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    /* dedupe same-date (keep last) */
    const out = [];
    pts.forEach(pt => { const ex = out.find(x => x.date === pt.date); if (ex) Object.assign(ex, pt); else out.push(pt); });
    return out;
  };

  E.analyzeProgress = function (patient, followups, energyPlan) {
    const series = E.progressSeries(patient, followups);
    const res = { series, n: series.length };
    if (series.length < 2) return res;
    const first = series[0], last = series[series.length - 1];
    const weeks = Math.max(CN.util.daysBetween(first.date, last.date) / 7, 0.14);
    res.total = last.kg - first.kg;
    res.pct = first.kg ? (res.total / first.kg * 100) : NaN;
    res.weeks = weeks;
    res.avgWeekly = res.total / weeks;
    const plan = energyPlan;
    if (plan && plan.status === 'approved' && isFinite(plan.tdee) && isFinite(plan.target)) {
      res.expectedWeekly = (plan.target - plan.tdee) * 7 / K.kcalPerKgFat; /* negative for loss */
    }
    if (isFinite(res.expectedWeekly)) {
      const diff = res.avgWeekly - res.expectedWeekly;
      const tol = Math.max(Math.abs(res.expectedWeekly) * 0.35, 0.1);
      res.vsExpected = Math.abs(diff) <= tol ? 'on' : (res.avgWeekly < res.expectedWeekly ? 'slower' : 'faster');
    }
    /* goal reach check */
    const target = CN.util.parseNum(patient && patient.targetWeight);
    if (target) {
      const goal = patient.goal || 'loss';
      res.targetWeight = target;
      res.goalReached = (goal === 'loss' && last.kg <= target) || (goal === 'gain' && last.kg >= target);
    }
    return res;
  };

  /* Recent weekly rate over last k intervals */
  E.recentRate = function (series, k) {
    if (!series || series.length < 2) return NaN;
    const n = Math.min(k || 2, series.length - 1);
    const a = series[series.length - 1 - n], b = series[series.length - 1];
    const weeks = Math.max(CN.util.daysBetween(a.date, b.date) / 7, 0.14);
    return (b.kg - a.kg) / weeks;
  };

  /* ---------------- reassessment ---------------- */
  E.reassess = function (ctx) {
    /* ctx: {patient, followups, energyPlan, settings} */
    const p = ctx.patient;
    const prog = E.analyzeProgress(p, ctx.followups, ctx.energyPlan);
    const reasons = [];
    const out = { changed: false, reasons, prevTarget: ctx.energyPlan ? ctx.energyPlan.target : null, suggested: ctx.energyPlan ? ctx.energyPlan.target : null, prog };
    if (prog.n < 2) { reasons.push({ key: 'fu.reason.none' }); return out; }
    const lastFu = (ctx.followups || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''))[ctx.followups.length - 1];
    const rate = E.recentRate(prog.series, 2);
    const weeksSinceFirst = Math.max(CN.util.daysBetween(prog.series[0].date, prog.series[prog.series.length - 1].date) / 7, 0.3);
    const staleDays = lastFu ? CN.util.daysBetween(lastFu.date, CN.util.todayISO()) : 999;
    const interval = (ctx.settings && ctx.settings.defaults && ctx.settings.defaults.fuInterval) || 14;

    if (ctx.energyPlan && ctx.energyPlan.status !== 'approved') { reasons.push({ key: 'fu.reason.none' }); return out; }

    if (prog.goalReached) {
      /* maintenance suggestion */
      const w = prog.series[prog.series.length - 1].kg;
      const bmrNew = E.bmr({ sex: p.sex, weight: w, height: p.heightCm, age: CN.util.ageFrom(p.dob).years, bfPct: p.bodyFatPct, method: ctx.energyPlan.equation === 'device' ? 'mifflin' : (ctx.energyPlan.equation || 'mifflin') }).value;
      const tdeeNew = E.tdee(bmrNew, ctx.energyPlan.factor || E.activityFactor(p.lifestyle && p.lifestyle.activity));
      out.changed = true; out.suggested = Math.round(tdeeNew); out.reason = 'reached';
      reasons.push({ key: 'fu.reason.reached' });
      return out;
    }
    if (staleDays > interval + 21) { reasons.push({ key: 'fu.reason.stale' }); }
    const expected = prog.expectedWeekly;
    if (isFinite(expected) && p.goal === 'loss') {
      const slowThreshold = Math.abs(expected) * 0.5;
      if (isFinite(rate) && Math.abs(rate) < 0.05 && weeksSinceFirst > 3 && staleDays < 14) {
        reasons.push({ key: 'fu.reason.plateau' });
      } else if (isFinite(rate) && rate > -slowThreshold && rate < 0) {
        /* slower than expected over recent interval(s) */
        if (weeksSinceFirst > 2.5) {
          out.changed = true;
          out.suggested = Math.max((out.prevTarget || 1600) - 125, 1000);
          out.reason = 'slow';
          reasons.push({ key: 'fu.reason.slow' });
        }
      } else if (isFinite(rate) && expected < 0 && rate < expected * 1.6) {
        out.changed = true;
        out.suggested = Math.min((out.prevTarget || 1600) + 125, 3600);
        out.reason = 'fast';
        reasons.push({ key: 'fu.reason.fast' });
      }
    }
    if (!out.changed && reasons.length === 0) reasons.push({ key: 'fu.reason.none' });
    return out;
  };

  /* ---------------- lab flags ---------------- */
  E.labFlag = function (item) {
    const v = CN.util.parseNum(item.value);
    if (!isFinite(v)) return null;
    const lo = CN.util.parseNum(item.refLow), hi = CN.util.parseNum(item.refHigh);
    if (isFinite(hi) && v > hi) return 'high';
    if (isFinite(lo) && v < lo) return 'low';
    if (isFinite(lo) || isFinite(hi)) return 'normal';
    return null;
  };

  /* ---------------- clinical safety scan for a patient profile ---------------- */
  E.profileSafetyScan = function (patient, assessments) {
    const flags = [];
    const p = patient || {};
    const labs = [];
    (assessments || []).forEach(a => (a.items || []).forEach(i => labs.push(i)));
    const get = code => { const hit = labs.slice().reverse().find(i => i.code === code); return hit ? CN.util.parseNum(hit.value) : NaN; };

    if (E.has(p, E.COND.ckd)) flags.push({ level: 'mid', text: 'Renal profile: individualize protein, potassium, phosphorus and sodium with nephrology guidance.' });
    const k = get('potassium');
    if (isFinite(k) && k > 5.3) flags.push({ level: 'high', text: 'Elevated potassium — review potassium-rich foods (fruits, legumes, leafy greens) with the treating team.' });
    const na = get('sodium');
    if (isFinite(na) && na < 133) flags.push({ level: 'high', text: 'Low serum sodium — review fluid/sodium advice before any low-sodium plan.' });
    const egfr = get('egfr');
    if (isFinite(egfr) && egfr < 45) flags.push({ level: 'mid', text: 'Reduced eGFR — protein targets should follow renal guidance (typically restricted in non-dialysis CKD).' });
    const hba1c = get('hba1c');
    if (isFinite(hba1c) && hba1c > 9) flags.push({ level: 'mid', text: 'HbA1c markedly elevated — prioritize glycemic control coordination; avoid aggressive unsupervised carbohydrate manipulation.' });
    const hgb = get('hgb');
    if (isFinite(hgb) && hgb < 11) flags.push({ level: 'mid', text: 'Low hemoglobin — ensure iron/B12/folate assessment and adequate protein.' });
    const vitd = get('vitd');
    if (isFinite(vitd) && vitd < 20) flags.push({ level: 'low', text: 'Low vitamin D — correction typically indicated (per physician).' });
    if (p.pregnancy === 'pregnant') flags.push({ level: 'mid', text: 'Pregnancy: energy, iron, folate, calcium and iodine needs increase — no weight-loss targets.' });
    if (p.pregnancy === 'lactating') flags.push({ level: 'mid', text: 'Lactation: add ≈330–400 kcal/day over pre-pregnancy needs; ensure fluids and micronutrients.' });
    return flags;
  };

  CN.engine = E;
  console.log('NutriClinic engine.js loaded');
})();
