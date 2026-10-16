/* ============================================================
   NutriClinic Pro — planner.js
   Deterministic diet-plan generator (approximately 100-kcal
   exchange portions), plan editing operations, smart exchange,
   validation warnings and version diffing.
   ============================================================ */
'use strict';
(function () {

  /* ---------------- seeded PRNG ---------------- */
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const MEAL_TIMES = { 'meal.breakfast': 7 * 60 + 30, 'meal.snack1': 10 * 60 + 30, 'meal.lunch': 13 * 60 + 30, 'meal.snack2': 16 * 60 + 30, 'meal.dinner': 19 * 60 + 30, 'meal.snack3': 21 * 60 };
  const MEAL_ORDER = ['meal.breakfast', 'meal.snack1', 'meal.lunch', 'meal.snack2', 'meal.dinner', 'meal.snack3'];
  const MAIN_KEYS = ['meal.breakfast', 'meal.lunch', 'meal.dinner'];
  const SNACK_KEYS = ['meal.snack1', 'meal.snack2', 'meal.snack3'];

  function fmtQty(q) {
    const map = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1.25: '1¼', 1.5: '1½', 1.75: '1¾', 2.5: '2½', 2.75: '2¾', 3.5: '3½' };
    if (map[q]) return map[q];
    return (Math.round(q * 100) / 100).toString();
  }

  function itemTotals(it) {
    const f = CN.foodById(it.foodId);
    if (!f) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sodium: 0 };
    const q = +it.qty || 0;
    return {
      kcal: f.kcal * q, p: f.p * q, c: f.c * q, f: f.f * q,
      fiber: (f.fiber || 0) * q, sodium: (f.sodium || 0) * q
    };
  }
  function mealTotals(meal) {
    return (meal.items || []).reduce((s, it) => {
      const t = itemTotals(it);
      s.kcal += t.kcal; s.p += t.p; s.c += t.c; s.f += t.f; s.fiber += t.fiber; s.sodium += t.sodium;
      return s;
    }, { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sodium: 0 });
  }
  function dayTotals(day) {
    return (day.meals || []).reduce((s, m) => {
      const t = mealTotals(m);
      s.kcal += t.kcal; s.p += t.p; s.c += t.c; s.f += t.f; s.fiber += t.fiber; s.sodium += t.sodium;
      return s;
    }, { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sodium: 0 });
  }
  function planAvg(plan) {
    const n = plan.days.length || 1;
    return plan.days.reduce((s, d) => {
      const t = dayTotals(d); s.kcal += t.kcal; s.p += t.p; s.c += t.c; s.f += t.f; s.fiber += t.fiber; s.sodium += t.sodium;
      return s;
    }, { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sodium: 0, _n: n });
  }

  /* ---------------- food eligibility ---------------- */
  function normalizeEx(s) { return String(s || '').trim().toLowerCase(); }

  function foodMatchesTerm(f, term) {
    term = normalizeEx(term);
    if (!term) return false;
    return f.id.toLowerCase().includes(term) || f.en.toLowerCase().includes(term) || String(f.ar).includes(String(term)) || f.tags.some(t => t.toLowerCase() === term);
  }

  function buildExclusionFn(ctx) {
    /* ctx: {exclusions:[str], patient, approachIds} */
    const terms = [];
    (ctx.exclusions || []).forEach(e => { const t = normalizeEx(e); if (t) terms.push(t); });
    const apx = (ctx.approachIds || []).map(id => CN.approachById(id)).filter(Boolean);
    const exIds = new Set();
    const exTags = new Set();
    apx.forEach(a => { (a.excludeIds || []).forEach(i => exIds.add(i)); (a.excludeTags || []).forEach(t => exTags.add(t)); });
    /* patient allergies & intolerances auto-exclude */
    const pat = ctx.patient || {};
    (pat.allergies || []).forEach(a => { if (a.type !== 'note' && a.type !== 'preference') { const t = normalizeEx(a.name); if (t && t !== 'none known') terms.push(t); } });
    (pat.intolerances || []).forEach(a => { const t = normalizeEx(a.name); if (t) terms.push(t); });
    (pat.restrictions || []).forEach(r => { const t = normalizeEx(r); if (t) terms.push(t); });
    /* generic mapping so terms like 'dairy', 'milk', 'lactose', 'gluten' work */
    const GENERIC = {
      'dairy': ['dairy'], 'milk': ['dairy'], 'lactose': ['dairy'],
      'gluten': ['gluten'], 'wheat': ['gluten'], 'nuts': ['nuts'], 'tree nuts': ['nuts'],
      'peanut': ['peanut'], 'peanuts': ['peanut'], 'egg': ['egg'], 'eggs': ['egg'],
      'soy': ['soy'], 'seafood': ['seafood'], 'fish': ['seafood'], 'sesame': ['sesame']
    };
    const genericTags = new Set();
    terms.forEach(t => { (GENERIC[t] || []).forEach(g => genericTags.add(g)); });

    return function allowed(f) {
      if (exIds.has(f.id)) return false;
      for (const t of exTags) if (f.tags.includes(t)) return false;
      for (const g of genericTags) if (f.tags.includes(g)) return false;
      for (const t of terms) { if (foodMatchesTerm(f, t)) return false; }
      return true;
    };
  }

  function scoreFood(f, ctx) {
    let s = 0;
    const apx = ctx.approaches || [];
    apx.forEach(a => { (a.favorTags || []).forEach(t => { if (f.tags.includes(t)) s += 1.6; }); });
    if (ctx.budget === 'low' && f.tags.includes('affordable')) s += 1.4;
    if (ctx.cuisine === 'egyptian' && f.tags.includes('egyptian')) s += 1.2;
    if (ctx.cuisine === 'mediterranean' && (f.tags.includes('egyptian') || f.tags.includes('mediterranean') || f.id.includes('olive'))) s += 0.8;
    (ctx.prefs || []).forEach(p => { if (p && (f.en.toLowerCase().includes(p) || String(f.ar).includes(p))) s += 1.2; });
    (ctx.disliked || []).forEach(p => { if (p && (f.en.toLowerCase().includes(p) || String(f.ar).includes(p))) s -= 3; });
    if (f.group === 'snack' || f.tags.includes('treat')) s -= 0.8;
    return s;
  }

  /* ---------------- plan structure helpers ---------------- */
  function slotPlan(config, approachIds) {
    const primary = (approachIds || [])[0] || 'custom';
    const base = CN.approachTemplate(primary);
    let keys = [];
    const mains = config.mealsPerDay >= 4 ? ['meal.breakfast', 'meal.snack1', 'meal.lunch', 'meal.dinner'] : (config.mealsPerDay === 2 ? ['meal.lunch', 'meal.dinner'] : MAIN_KEYS.slice());
    keys = keys.concat(mains.filter(k => !k.startsWith('meal.snack')));
    const snacks = SNACK_KEYS.slice(0, CN.util.clamp(config.snacks || 0, 0, 3));
    keys = keys.concat(snacks);
    keys.sort((a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b));
    const chosen = base.meals.filter(m => keys.includes(m.key));
    /* ensure canonical set even if template lacks a key (e.g., keto template has no snack2) */
    keys.forEach(k => {
      if (!chosen.find(m => m.key === k)) {
        const t = CN.BASE_TEMPLATE.meals.find(m => m.key === k);
        if (t) chosen.push(t);
      }
    });
    chosen.sort((a, b) => MEAL_ORDER.indexOf(a.key) - MEAL_ORDER.indexOf(b.key));
    const total = chosen.reduce((s, m) => s + m.share, 0);
    chosen.forEach(m => m.share = m.share / total);
    return chosen;
  }

  function timesFor(chosen, windowKey) {
    const win = CN.FASTING_WINDOWS[windowKey || 'none'];
    const times = {};
    if (!win) { chosen.forEach(m => { times[m.key] = MEAL_TIMES[m.key] || 12 * 60; }); return times; }
    const n = chosen.length;
    const span = win.end - win.start;
    chosen.forEach((m, i) => {
      const frac = n === 1 ? 0.5 : (i + 0.5) / n;
      times[m.key] = Math.round(win.start + frac * span / 5) * 5;
    });
    return times;
  }

  function minsToHHMM(mins) { const h = Math.floor(mins / 60), m = mins % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

  /* ---------------- generator ---------------- */
  function generate(cfg) {
    /* cfg: {patient, energyPlan, approaches:[ids], config:{days,mealsPerDay,snacks,window,cuisine,budget,methods,exclusions,disliked,prefs}, targets:{kcal,pG,cG,fG,fiber,sodium}, seed} */
    const cfgX = cfg.config || {};
    const approachIds = cfg.approaches || [];
    const apx = approachIds.map(id => CN.approachById(id)).filter(Boolean);
    const exFn = buildExclusionFn({ exclusions: cfgX.exclusions || [], patient: cfg.patient, approachIds });
    const sctx = { approaches: apx, budget: cfgX.budget, cuisine: cfgX.cuisine, prefs: cfgX.prefs || (cfg.patient && cfg.patient.lifestyle && cfg.patient.lifestyle.prefs) || [], disliked: cfgX.disliked || (cfg.patient && cfg.patient.lifestyle && cfg.patient.lifestyle.dislikes) || [] };
    const rand = mulberry32(hashStr(cfg.seed || (String((cfg.patient && cfg.patient.id) || 'p') + approachIds.join(',') + cfgX.days + cfgX.mealsPerDay)));

    const chosen = slotPlan(cfgX, approachIds);
    const times = timesFor(chosen, cfgX.window);
    const targets = cfg.targets || { kcal: 2000, pG: 100, cG: 225, fG: 67, fiber: 25, sodium: 2300 };
    const isKeto = approachIds.includes('keto');

    const days = [];
    for (let di = 0; di < (cfgX.days || 7); di++) {
      const used = new Set();
      const meals = chosen.map(m => {
        const mealKcal = targets.kcal * m.share;
        const items = [];
        m.slots.forEach(slot => {
          const slotKcal = mealKcal * slot.frac;
          const groups = slot.groups.slice();
          let pool = CN.FOODS.filter(f => groups.includes(f.group) && exFn(f));
          if (isKeto) {
            pool = pool.filter(f => !(f.group === 'carb' || f.group === 'fruit' || f.group === 'snack'));
            if (slot.groups.includes('carb')) pool = pool.filter(f => f.group === 'veg');
          }
          if (!pool.length) return;
          pool = pool.slice().sort((a, b) => scoreFood(b, sctx) - scoreFood(a, sctx));
          const top = pool.slice(0, Math.min(pool.length, 10)).filter(f => !used.has(f.id));
          const pickFrom = top.length ? top : pool.slice(0, Math.min(pool.length, 10));
          const food = pickFrom[Math.floor(rand() * pickFrom.length)];
          used.add(food.id);
          let qty = slotKcal / food.kcal;
          qty = Math.max(0.25, Math.round(qty * 4) / 4);
          items.push({ id: CN.util.uid('it'), foodId: food.id, qty, alt: [] });
        });
        return { id: CN.util.uid('meal'), key: m.key, name: '', time: minsToHHMM(times[m.key] || 12 * 60), items, note: '' };
      });
      /* scale day to target kcal, then nudge protein/carbs */
      scaleDay(meals, targets.kcal);
      nudgeMacros(meals, targets);
      scaleDay(meals, targets.kcal);
      days.push({ idx: di, label: '', meals });
    }

    const plan = {
      id: null, groupId: CN.util.uid('pg'), version: 1, basedOn: null,
      patientId: cfg.patient ? cfg.patient.id : null,
      title: '', approachIds,
      config: {
        days: cfgX.days || 7, mealsPerDay: cfgX.mealsPerDay || 3, snacks: cfgX.snacks || 0,
        window: cfgX.window || 'none', cuisine: cfgX.cuisine || 'egyptian', budget: cfgX.budget || 'medium',
        methods: cfgX.methods || [], exclusions: cfgX.exclusions || []
      },
      targets: { kcal: Math.round(targets.kcal), pG: Math.round(targets.pG), cG: Math.round(targets.cG), fG: Math.round(targets.fG), fiber: Math.round(targets.fiber || 25), sodium: Math.round(targets.sodium || 2300) },
      days, notes: [], status: 'draft', createdAt: CN.util.nowISO(), updatedAt: CN.util.nowISO()
    };
    return plan;
  }

  function scaleDay(meals, targetKcal) {
    for (let iter = 0; iter < 3; iter++) {
      const t = meals.reduce((s, m) => { const x = mealTotals(m); return s + x.kcal; }, 0);
      if (t <= 0) break;
      const factor = targetKcal / t;
      if (Math.abs(factor - 1) < 0.015) break;
      meals.forEach(m => m.items.forEach(it => {
        let q = it.qty * factor;
        q = Math.max(0.25, Math.round(q * 4) / 4);
        it.qty = q;
      }));
    }
  }

  function nudgeMacros(meals, targets) {
    const t = meals.reduce((s, m) => { const x = mealTotals(m); s.p += x.p; s.c += x.c; s.f += x.f; return s; }, { p: 0, c: 0, f: 0 });
    if (targets.pG && t.p < targets.pG * 0.88) {
      const factor = Math.min(1.35, targets.pG / Math.max(t.p, 1));
      meals.forEach(m => m.items.forEach(it => {
        const f = CN.foodById(it.foodId);
        if (f && (f.group === 'protein' || f.tags.includes('highProtein'))) it.qty = Math.round(it.qty * factor * 4) / 4;
      }));
    }
    if (targets.pG && t.p > targets.pG * 1.12) {
      const factor = Math.max(0.7, targets.pG / t.p);
      meals.forEach(m => m.items.forEach(it => {
        const f = CN.foodById(it.foodId);
        if (f && (f.group === 'protein' || f.tags.includes('highProtein'))) it.qty = Math.max(0.25, Math.round(it.qty * factor * 4) / 4);
      }));
    }
    const t2 = meals.reduce((s, m) => { const x = mealTotals(m); s.c += x.c; return s; }, { c: 0 });
    if (targets.cG && targets.cG > 60 && t2.c < targets.cG * 0.85) {
      const factor = Math.min(1.35, targets.cG / Math.max(t2.c, 1));
      meals.forEach(m => m.items.forEach(it => {
        const f = CN.foodById(it.foodId);
        if (f && (f.group === 'carb' || f.group === 'fruit')) it.qty = Math.round(it.qty * factor * 4) / 4;
      }));
    }
    if (targets.cG && targets.cG > 60 && t2.c > targets.cG * 1.18) {
      const factor = Math.max(0.7, targets.cG / t2.c);
      meals.forEach(m => m.items.forEach(it => {
        const f = CN.foodById(it.foodId);
        if (f && (f.group === 'carb' || f.group === 'fruit')) it.qty = Math.max(0.25, Math.round(it.qty * factor * 4) / 4);
      }));
    }
  }

  /* ---------------- editing ops ---------------- */
  function dayOf(plan, dayIdx) { return plan.days[dayIdx < 0 ? plan.days.length + dayIdx : dayIdx]; }
  function mealOf(plan, dayIdx, mealId) { const d = dayOf(plan, dayIdx); return d ? d.meals.find(m => m.id === mealId) : null; }

  function addItem(plan, dayIdx, mealId, foodId, qty) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    m.items.push({ id: CN.util.uid('it'), foodId, qty: qty || 1, alt: [] });
  }
  function updateItem(plan, dayIdx, mealId, itemId, patch) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    const it = m.items.find(i => i.id === itemId); if (!it) return;
    Object.assign(it, patch);
    if (it.qty !== undefined) it.qty = Math.max(0.05, +it.qty || 0);
  }
  function removeItem(plan, dayIdx, mealId, itemId) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    m.items = m.items.filter(i => i.id !== itemId);
  }
  function moveItem(plan, dayIdx, mealId, itemId, dir) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    const i = m.items.findIndex(x => x.id === itemId); if (i < 0) return;
    const j = dir < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= m.items.length) return;
    const tmp = m.items[i]; m.items[i] = m.items[j]; m.items[j] = tmp;
  }
  function addMeal(plan, dayIdx, name, time) {
    const d = dayOf(plan, dayIdx); if (!d) return;
    d.meals.push({ id: CN.util.uid('meal'), key: null, name: name || '', time: time || '', items: [], note: '' });
  }
  function removeMeal(plan, dayIdx, mealId) {
    const d = dayOf(plan, dayIdx); if (!d) return;
    d.meals = d.meals.filter(m => m.id !== mealId);
  }
  function duplicateDay(plan, dayIdx) {
    const d = dayOf(plan, dayIdx); if (!d) return;
    const copy = JSON.parse(JSON.stringify(d));
    copy.idx = plan.days.length;
    copy.meals.forEach(m => { m.id = CN.util.uid('meal'); m.items.forEach(i => { i.id = CN.util.uid('it'); }); });
    plan.days.push(copy);
  }
  function clearDay(plan, dayIdx) { const d = dayOf(plan, dayIdx); if (d) d.meals.forEach(m => m.items = []); }

  function addAlternative(plan, dayIdx, mealId, itemId, foodId, qty) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    const it = m.items.find(i => i.id === itemId); if (!it) return;
    it.alt = it.alt || [];
    it.alt.push({ foodId, qty: qty || it.qty });
  }
  function removeAlternative(plan, dayIdx, mealId, itemId, idx) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    const it = m.items.find(i => i.id === itemId); if (!it || !it.alt) return;
    it.alt.splice(idx, 1);
  }

  /* ---------------- smart exchange ---------------- */
  function swapCandidates(plan, dayIdx, mealId, itemId, ctx, objective) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return [];
    const it = m.items.find(i => i.id === itemId); if (!it) return [];
    const f = CN.foodById(it.foodId); if (!f) return [];
    const exFn = buildExclusionFn({ exclusions: (plan.config.exclusions || []), patient: ctx.patient, approachIds: plan.approachIds });
    const base = itemTotals(it);
    const obj = objective || 'kcal';
    let pool = CN.FOODS.filter(c => c.id !== f.id && exFn(c));
    /* same broad family first */
    const fam = c => (c.group === f.group) ? 0 : (['protein', 'dairy', 'legume'].includes(c.group) && ['protein', 'dairy', 'legume'].includes(f.group)) ? 1 : (['carb', 'veg'].includes(c.group) && ['carb', 'veg'].includes(f.group)) ? 1 : 2;
    const out = [];
    pool.forEach(c => {
      let qty = it.qty, approx = false, delta = 0;
      const ct = { kcal: c.kcal, p: c.p, c: c.c, f: c.f };
      if (obj === 'kcal') {
        qty = base.kcal / Math.max(c.kcal, 1);
        delta = 0;
        const pDiff = Math.abs(c.p * qty - base.p) / Math.max(base.p, 1);
        const cDiff = Math.abs(c.c * qty - base.c) / Math.max(base.c, 1);
        approx = pDiff > 0.3 || cDiff > 0.3;
      } else if (obj === 'protein') {
        qty = c.p > 0 ? base.p / c.p : 0;
        delta = c.kcal * qty - base.kcal;
        approx = Math.abs(delta) > base.kcal * 0.2 + 30;
      } else if (obj === 'carb') {
        qty = c.c > 0 ? base.c / c.c : 0;
        delta = c.kcal * qty - base.kcal;
        approx = Math.abs(delta) > base.kcal * 0.2 + 30;
      } else if (obj === 'fat') {
        qty = c.f > 0 ? base.f / c.f : 0;
        delta = c.kcal * qty - base.kcal;
        approx = Math.abs(delta) > base.kcal * 0.2 + 30;
      } else { /* therapeutic / affordable */
        qty = base.kcal / Math.max(c.kcal, 1);
        approx = true;
      }
      if (!isFinite(qty) || qty <= 0) return;
      qty = Math.max(0.1, Math.round(qty * 4) / 4);
      let score = -fam(c) * 10;
      if (obj === 'affordable' && (c.tags.includes('affordable') || c.tags.includes('egyptian'))) score += 25;
      if (ct.p && obj === 'protein') score += Math.min(ct.p / 5, 8);
      const apx = plan.approachIds.map(id => CN.approachById(id)).filter(Boolean);
      apx.forEach(a => { (a.favorTags || []).forEach(t => { if (c.tags.includes(t)) score += 2; }); if ((a.excludeIds || []).includes(c.id)) score -= 999; });
      score += (ctx.prefs || []).some(p => p && (c.en.toLowerCase().includes(p) || String(c.ar).includes(p))) ? 3 : 0;
      score -= (ctx.disliked || []).some(p => p && (c.en.toLowerCase().includes(p) || String(c.ar).includes(p))) ? 6 : 0;
      out.push({ food: c, qty, deltaKcal: delta, approx, score });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function applySwap(plan, dayIdx, mealId, itemId, cand) {
    const m = mealOf(plan, dayIdx, mealId); if (!m) return;
    const it = m.items.find(i => i.id === itemId); if (!it) return;
    it.foodId = cand.food.id;
    it.qty = cand.qty;
  }

  /* ---------------- validation ---------------- */
  function warnings(plan, ctx) {
    const out = [];
    const targets = plan.targets || {};
    const exFn = buildExclusionFn({ exclusions: (plan.config.exclusions || []), patient: ctx.patient, approachIds: plan.approachIds });
    const isKeto = (plan.approachIds || []).includes('keto');
    plan.days.forEach((d, di) => {
      const t = dayTotals(d);
      const dayNo = di + 1;
      if (targets.kcal && Math.abs(t.kcal - targets.kcal) > targets.kcal * 0.07) {
        out.push({ day: dayNo, level: 'mid', key: 'builder.check.kcal', vars: { } });
      }
      ['p', 'c', 'f'].forEach(mk => {
        const target = mk === 'p' ? targets.pG : mk === 'c' ? targets.cG : targets.fG;
        if (target && Math.abs(t[mk] - target) > target * 0.10) {
          const label = CN.i18n.t(mk === 'p' ? 'macro.protein' : mk === 'c' ? 'macro.carbs' : 'macro.fat');
          out.push({ day: dayNo, level: 'low', key: 'builder.check.macro', vars: { m: label } });
        }
      });
      if (targets.sodium && t.sodium > targets.sodium * 1.12) out.push({ day: dayNo, level: 'mid', key: 'builder.check.sodium' });
      if (targets.fiber && t.fiber < Math.min(targets.fiber, 25) * 0.75) out.push({ day: dayNo, level: 'low', key: 'builder.check.fiber' });
      if (isKeto && t.c > 35) out.push({ day: dayNo, level: 'mid', key: 'builder.check.keto' });
      /* exclusion scan */
      d.meals.forEach(m => m.items.forEach(it => {
        const f = CN.foodById(it.foodId);
        if (f && !exFn(f)) out.push({ day: dayNo, level: 'high', key: 'builder.check.excluded', vars: { f: f.en } });
      }));
      const empty = d.meals.some(m => !m.items.length);
      if (empty) out.push({ day: dayNo, level: 'low', key: 'builder.check.empty', vars: { n: dayNo } });
    });
    /* dedupe by key+day */
    const seen = new Set(); const dd = [];
    out.forEach(w => { const k = w.day + '|' + w.key + '|' + JSON.stringify(w.vars || {}); if (!seen.has(k)) { seen.add(k); dd.push(w); } });
    return dd.slice(0, 24);
  }

  /* ---------------- version diff ---------------- */
  function diffPlans(a, b) {
    const out = [];
    const mealKey = m => (m.key || '') + '|' + (m.name || '');
    const aM = {}; (a.days[0] && a.days[0].meals || []).forEach(m => aM[mealKey(m)] = m);
    const bM = {}; (b.days[0] && b.days[0].meals || []).forEach(m => bM[mealKey(m)] = m);
    Object.keys(bM).forEach(k => { if (!aM[k]) out.push({ type: 'add', key: 'builder.diffMealAdded', vars: { m: bM[k].name || CN.i18n.t(bM[k].key || '') } }); });
    Object.keys(aM).forEach(k => { if (!bM[k]) out.push({ type: 'del', key: 'builder.diffMealRemoved', vars: { m: aM[k].name || CN.i18n.t(aM[k].key || '') } }); });
    Object.keys(bM).forEach(k => {
      const ma = aM[k], mb = bM[k];
      if (!ma || !mb) return;
      const aI = {}; (ma.items || []).forEach(i => aI[i.foodId] = i);
      const bI = {}; (mb.items || []).forEach(i => bI[i.foodId] = i);
      Object.keys(bI).forEach(fid => {
        const f = CN.foodById(fid);
        if (!aI[fid]) out.push({ type: 'add', key: 'builder.diffItemAdded', vars: { f: f ? f.en : fid } });
        else if (Math.abs(aI[fid].qty - bI[fid].qty) > 0.2) out.push({ type: 'chg', key: 'builder.diffQty', vars: { f: f ? f.en : fid, a: fmtQty(aI[fid].qty), b: fmtQty(bI[fid].qty) } });
      });
      Object.keys(aI).forEach(fid => {
        if (!bI[fid]) { const f = CN.foodById(fid); out.push({ type: 'del', key: 'builder.diffItemRemoved', vars: { f: f ? f.en : fid } }); }
      });
    });
    return out;
  }

  /* ---------------- templates ---------------- */
  function toTemplate(plan, name) {
    const d0 = plan.days[0] || { meals: [] };
    const kcalBase = Math.max(dayTotals(d0).kcal, 1);
    return {
      id: null, name: name || 'Custom template', approachIds: plan.approachIds.slice(),
      config: JSON.parse(JSON.stringify(plan.config)),
      targets: { pct: pctTargets(plan.targets) },
      structure: d0.meals.map(m => ({
        key: m.key, name: m.name || '', time: m.time || '',
        items: m.items.map(it => { const f = CN.foodById(it.foodId); return f ? { foodId: it.foodId, q: Math.round(it.qty / kcalBase * 2000 * 100) / 100 } : null; }).filter(Boolean)
      })),
      createdAt: CN.util.nowISO(), notes: 'Structure stored normalized to a 2,000-kcal day.'
    };
  }
  function pctTargets(t) {
    const kcal = t.kcal || 2000;
    return {
      p: Math.round((t.pG * 4) / kcal * 100), c: Math.round((t.cG * 4) / kcal * 100), f: Math.round((t.fG * 9) / kcal * 100)
    };
  }
  function fromTemplate(tpl, cfg) {
    /* cfg: {patient, targets, approachIds} → returns plan skeleton (draft) */
    const kcal = cfg.targets.kcal || 2000;
    const plan = {
      id: null, groupId: CN.util.uid('pg'), version: 1,
      patientId: cfg.patient ? cfg.patient.id : null,
      title: '', approachIds: (cfg.approachIds && cfg.approachIds.length ? cfg.approachIds : tpl.approachIds).slice(),
      config: Object.assign({}, tpl.config, { exclusions: (cfg.exclusions || tpl.config.exclusions || []).slice() }),
      targets: { kcal: Math.round(kcal), pG: Math.round(cfg.targets.pG), cG: Math.round(cfg.targets.cG), fG: Math.round(cfg.targets.fG), fiber: 25, sodium: cfg.targets.sodium || 2300 },
      days: [], notes: [], status: 'draft', createdAt: CN.util.nowISO(), updatedAt: CN.util.nowISO()
    };
    for (let di = 0; di < plan.config.days; di++) {
      const meals = tpl.structure.map(ms => ({
        id: CN.util.uid('meal'), key: ms.key, name: ms.name, time: ms.time, note: '',
        items: ms.items.map(x => ({ id: CN.util.uid('it'), foodId: x.foodId, qty: Math.max(0.1, Math.round(x.q * kcal / 2000 * 4) / 4), alt: [] }))
      }));
      scaleDay(meals, kcal);
      plan.days.push({ idx: di, label: '', meals });
    }
    return plan;
  }

  /* ---------------- misc helpers for views ---------------- */
  function itemPortionText(it, mode) {
    const f = CN.foodById(it.foodId);
    const grams = f ? Math.round(f.grams * it.qty) : '';
    if (mode === 'household' && f) return fmtQty(it.qty) + ' × ' + f.ptext;
    return grams + ' g';
  }
  function sumItem(it) { return itemTotals(it); }

  CN.planner = {
    generate, dayTotals, mealTotals, planAvg, itemTotals, sumItem,
    addItem, updateItem, removeItem, moveItem, addMeal, removeMeal, duplicateDay, clearDay,
    addAlternative, removeAlternative,
    swapCandidates, applySwap,
    warnings, diffPlans, toTemplate, fromTemplate,
    fmtQty, itemPortionText, buildExclusionFn, slotPlan
  };
  console.log('NutriClinic planner.js loaded');
})();
