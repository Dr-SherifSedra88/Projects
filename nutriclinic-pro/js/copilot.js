/* ============================================================
   NutriClinic Pro — copilot.js
   Patient-aware clinical assistant:
   · Deterministic intent interpreter (Arabic / English / mixed)
   · Knowledge-base retrieval from briefs + uploaded docs
   · Optional external LLM adapter (requires configuration;
     blocked by the hosted preview's security policy — documented)
   Generated content ALWAYS remains a draft for clinician approval.
   ============================================================ */
'use strict';
(function () {

  /* ---------------- text normalization ---------------- */
  function normAr(s) {
    return String(s || '')
      .replace(/[\u064B-\u0652\u0670]/g, '')      // tashkeel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .toLowerCase();
  }
  const norm = s => normAr(s);

  function has(t, ...pats) { return pats.some(p => p.test(t)); }

  const APPROACH_PATTERNS = [
    ['mediterranean', /mediterran|متوسطي/],
    ['dash', /dash/],
    ['keto', /keto|ketogenic|كيتو|كيتوني/],
    ['lowcarb', /low[\s-]?carb|قليل الكربوهيدرات|لو كارب|منخفض الكربوهيدرات/],
    ['lowgi', /low[\s-]?glyc|low[\s-]?gi|جلايسيم|جليسيم|المؤشر الجلايسيمي/],
    ['if', /intermittent|fasting|صيام|صائم/],
    ['glutenfree', /gluten|جلوتين/],
    ['dairyfree', /dairy[\s-]?free|بدون البان|خالي من الالبان|منتجات الالبان/],
    ['lactosefree', /lactose|لاكتوز/],
    ['lowsodium', /low[\s-]?sodium|قليل الصوديوم|قليل الملح/],
    ['highprotein', /high[\s-]?protein|عالي البروتين|عاليه البروتين/],
    ['lowfat', /low[\s-]?fat|قليل الدهون/],
    ['vegetarian', /vegetarian|نباتي(?! صرف| صرفي)/],
    ['vegan', /vegan|نباتي صرف|فيجان/],
    ['renal', /renal|كلى|كلوي|كلي/],
    ['diabetes', /diabet|سكري|السكري/],
    ['heart', /heart[\s-]?healthy|cardiac|قلب|للقلب/],
    ['weightmgmt', /weight[\s-]?manage|إدارة الوزن|اداره الوزن/],
    ['caloriecontrol', /calorie[\s-]?control|محدد السعرات/]
  ];

  const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14, 'واحد': 1, 'اثنين': 2, 'ثلاثه': 3, 'اربعه': 4, 'خمسه': 5, 'سته': 6, 'سبعه': 7, 'عشره': 10 };

  function extractDays(t) {
    let m = t.match(/(\d{1,2})\s*(?:[- ]?day|يوم|ايام|d\b)/);
    if (m) return CN.util.clamp(parseInt(m[1], 10), 1, 60);
    if (/اسبوعين|two weeks|14/.test(t)) return 14;
    if (/اسبوع|week/.test(t)) return 7;
    if (/شهر|month/.test(t)) return 30;
    for (const w in WORD_NUM) { if (new RegExp('(^|\\s)' + w + '(\\s|$)').test(t)) { if (['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'ten', 'fourteen'].includes(w)) { const m2 = t.match(new RegExp(w + '\\s*(?:day|يوم|ايام)')); if (m2) return WORD_NUM[w]; } } }
    return null;
  }

  function findApproaches(t) {
    const ids = [];
    APPROACH_PATTERNS.forEach(([id, re]) => { if (re.test(t)) ids.push(id); });
    return ids;
  }

  function findFoodsInText(t) {
    const hits = [];
    const words = t.split(/[,،;؛]| and | و |مع /).map(s => s.trim()).filter(Boolean);
    CN.FOODS.forEach(f => {
      const en = f.en.toLowerCase(), ar = normAr(f.ar);
      const idf = f.id.replace('f-', '');
      for (const w of words) {
        const nw = normAr(w);
        if (nw.length >= 3 && (en.includes(nw) || ar.includes(nw) || idf.includes(nw) || nw.includes(en.split(' ')[0]) && en.split(' ')[0].length >= 4)) { hits.push(f); break; }
      }
    });
    return CN.util.uniqBy(hits, f => f.id).slice(0, 8);
  }

  function stripCommandWords(t) {
    return t.replace(/(exclude|remove|without|avoid|no)\s+(all\s+)?/g, ' ')
            .replace(/(استبعد|احذف|امنع|بدون|تجنب)\s*(كل|جميع)?\s*/g, ' ')
            .trim();
  }

  /* ---------------- knowledge search ---------------- */
  function tokens(s) { return norm(s).replace(/[^\w\s\u0600-\u06FF]/g, ' ').split(/\s+/).filter(w => w.length > 3); }

  function searchKB(query, opts) {
    opts = opts || {};
    const qt = tokens(query);
    if (!qt.length) return [];
    const results = [];
    (CN.REFS || []).forEach(r => {
      const hay = (r.title + ' ' + r.summary + ' ' + (r.points || []).join(' ') + ' ' + (r.tags || []).join(' ')).toLowerCase();
      let sc = 0; qt.forEach(w => { if (hay.includes(w)) sc += 2; if ((r.title || '').toLowerCase().includes(w)) sc += 2; });
      if (sc > 0) results.push({ type: 'brief', id: r.id, title: r.title, snippet: r.summary, score: sc });
    });
    (CN.store.list('kb') || []).forEach(d => {
      if (!d.text) return;
      const hay = d.text.toLowerCase();
      let sc = 0, hit = null;
      qt.forEach(w => { const i = hay.indexOf(w); if (i >= 0) { sc += 1; if (hit === null) hit = i; } });
      if (sc > 0) {
        const i = Math.max(hit - 60, 0);
        results.push({ type: 'doc', id: d.id, title: d.name, snippet: ('…' + d.text.slice(i, i + 220) + '…'), score: sc });
      }
    });
    return results.sort((a, b) => b.score - a.score).slice(0, opts.limit || 5);
  }

  /* ---------------- external LLM adapter (optional) ---------------- */
  function llmConfigured(settings) {
    const ai = settings && settings.ai;
    return !!(ai && ai.mode === 'llm' && ai.endpoint && ai.key);
  }

  async function callLLM(settings, messages, opts) {
    const ai = settings.ai;
    const url = ai.endpoint.replace(/\/+$/, '') + (ai.endpoint.includes('/chat/completions') ? '' : '/chat/completions');
    const body = { model: ai.model || 'gpt-4o-mini', messages, temperature: 0.2 };
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 45000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ai.key },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(to);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!text) throw new Error('Empty response');
      return text;
    } finally { clearTimeout(to); }
  }

  function deidentify(patient, store) {
    if (!patient) return null;
    const p = CN.util.deepClone(patient);
    p.fullName = 'Patient';
    p.id = 'N/A';
    p.phone = ''; p.email = ''; p.emergency = ''; p.occupation = '';
    if (p.dob) { p.ageYears = CN.util.ageFrom(p.dob).years; p.dob = undefined; }
    return p;
  }

  /* ---------------- patient summary ---------------- */
  function summarize(patient, opts) {
    if (!patient) return { sections: [] };
    const store = CN.store;
    const sections = [];
    const age = patient.dob ? CN.util.ageFrom(patient.dob).years : '—';
    const cw = store.currentWeight(patient);
    const bmi = CN.engine.bmi(cw, patient.heightCm);
    sections.push({
      title: 'copilot.summaryIntro', vars: { name: patient.fullName },
      html: '<div class="kv-2">' +
        '<span>' + CN.i18n.t('common.age') + ' / ' + CN.i18n.t('common.sex') + '</span><b>' + age + ' · ' + CN.i18n.t(patient.sex === 'male' ? 'common.male' : 'common.female') + '</b>' +
        '<span>BMI</span><b>' + CN.fmt.n1(bmi) + ' (' + CN.i18n.t('bmi.' + CN.engine.bmiCat(bmi).key) + ')</b>' +
        '<span>' + CN.i18n.t('np.conditions') + '</span><b>' + CN.util.esc((patient.conditions || []).join(', ') || '—') + '</b>' +
        '<span>' + CN.i18n.t('np.medications') + '</span><b>' + CN.util.esc((patient.medications || []).map(m => m.name).join(', ') || '—') + '</b>' +
        '</div>'
    });
    const assessments = store.list('assessments', { patientId: patient.id });
    const safety = CN.engine.profileSafetyScan(patient, assessments);
    if (safety.length) {
      sections.push({ title: 'assess.safety.title', html: '<div class="flag-list">' + safety.map(f => CN.ui.flag(f.level, CN.util.esc(f.text))).join('') + '</div>' });
    }
    const baseline = ['fbg', 'hba1c', 'tc', 'ldl', 'hdl', 'tg', 'creat', 'tsh', 'hgb', 'vitd'];
    const got = new Set(); assessments.forEach(a => (a.items || []).forEach(i => got.add(i.code)));
    const missing = baseline.filter(c => !got.has(c));
    if (missing.length) sections.push({ title: 'assess.missing.title', html: '<p class="small muted">' + CN.i18n.t('copilot.missingLabs', { list: missing.join(', ') }) + '</p>' });
    const energy = store.list('energy', { patientId: patient.id }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0];
    if (energy) {
      sections.push({
        title: 'energy.approvedTarget',
        html: '<div class="nutri-strip"><div><b>' + CN.fmt.kcal(energy.target) + '</b><span class="muted small"> kcal/day</span></div><div><b>' + CN.fmt.n0(energy.tdee) + '</b><span class="muted small"> TDEE</span></div><div><b>' + CN.fmt.n0(energy.bmr) + '</b><span class="muted small"> BMR</span></div></div>'
      });
    }
    const fus = store.list('followups', { patientId: patient.id });
    const prog = CN.engine.analyzeProgress(patient, fus, energy);
    if (prog.n >= 2) {
      sections.push({
        title: 'fu.progress',
        html: '<div class="kv-2"><span>' + CN.i18n.t('fu.totalChange') + '</span><b>' + CN.fmt.signed(prog.total) + ' kg</b>' +
          '<span>' + CN.i18n.t('fu.avgWeekly') + '</span><b>' + CN.fmt.signed(prog.avgWeekly) + ' kg/wk</b></div>'
      });
    }
    if (fus.length) {
      const last = fus.slice().sort((a, b) => (a.date > b.date ? -1 : 1))[0];
      if (last.nextDate) sections.push({ title: 'patient.nextFU', html: '<p>' + CN.fmt.date(last.nextDate) + '</p>' });
    }
    return { sections };
  }

  /* ---------------- main interpreter ---------------- */
  async function run(input, ctx) {
    /* ctx: {patient, settings} */
    const raw = String(input || '').trim();
    const t = raw; /* keep for display */
    const tn = norm(raw);
    const patient = ctx.patient;
    const settings = ctx.settings || CN.store.settings || {};
    const res = { input: raw, kind: 'info', sections: [], actions: [], chips: [], usedLLM: false };

    /* 1) help */
    if (/^(help|مساعدة|مساعده)$/i.test(raw) || /what can you do|ماذا يمكنك/.test(tn)) {
      res.sections.push({ title: 'copilot.help', html: '<p class="small">' + CN.i18n.t('copilot.help') + '</p>' });
      return res;
    }

    /* 2) summarize */
    if (has(tn, /summar|ligh?l?ight? on|لخص|ملخص|وضع المريض|حاله المريض|حالة المريض|review/)) {
      if (!patient) { res.sections.push({ title: 'copilot.whichPatient', html: '' }); return res; }
      const s = summarize(patient);
      res.kind = 'summary';
      res.sections = s.sections;
      res.actions.push({ type: 'open-patient', label: CN.i18n.t('patient.record') });
      return res;
    }

    /* 3) exclude foods */
    if (has(tn, /exclude|remove (all|any)?|avoid|without|بدون|استبعد|احذف|امنع|تجنب/)) {
      const rest = stripCommandWords(t);
      let items = findFoodsInText(' ' + rest + ' ');
      /* generic categories */
      const generic = [];
      if (/dairy|milk|البان|الالبان|حليب/.test(norm(rest))) generic.push('dairy');
      if (/peanut|فول سوداني|فول سودانى/.test(norm(rest))) generic.push('peanut');
      if (/gluten|جلوتين|قمح/.test(norm(rest))) generic.push('gluten');
      if (/nuts|مكسرات/.test(norm(rest))) generic.push('nuts');
      if (!patient) { res.sections.push({ title: 'copilot.whichPatient', html: '' }); return res; }
      patient.restrictions = patient.restrictions || [];
      const added = [];
      items.forEach(f => { patient.restrictions.push(f.en); added.push((CN.i18n.lang() === 'ar' ? f.ar : f.en)); });
      generic.forEach(g => { if (!patient.restrictions.includes(g)) { patient.restrictions.push(g); added.push(g); } });
      if (!added.length && rest) { patient.restrictions.push(rest.split(/[,،]/)[0].trim()); added.push(rest.split(/[,،]/)[0].trim()); }
      await CN.store.savePatient(patient);
      res.kind = 'exclusions';
      res.sections.push({ title: 'builder.exclusions', html: '<p>' + CN.i18n.t('copilot.exclusionsAdded', { list: CN.util.esc(added.join('، ')) }) + '</p>' });
      res.actions.push({ type: 'open-builder', label: CN.i18n.t('copilot.openBuilder') });
      return res;
    }

    /* 4) replace / swap / affordable alternatives */
    if (has(tn, /replace|substitut|swap|استبدل|بدل|استبدال/)) {
      if (!patient) { res.sections.push({ title: 'copilot.whichPatient', html: '' }); return res; }
      const plans = CN.store.list('plans', { patientId: patient.id }).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      const plan = plans[0];
      if (!plan) { res.sections.push({ title: 'copilot.noPlanYet', html: '' }); return res; }
      const affordable = /affordable|cheap|econom|اقتصادي|رخيص|مصري/.test(tn);
      const lighter = /lighter|light|خفيف|اخف/.test(tn);
      const toFood = (function () {
        const m = t.match(/(?:replace|substitut\w*|swap|استبدل|بدل)\s+(.+?)\s+(?:with|by|بـ|ب|إلى|الى|لـ)\s+(.+)$/i);
        if (m) return { from: m[1].trim(), to: m[2].trim() };
        return null;
      })();
      const changes = [];
      plan.days.forEach((d, di) => {
        d.meals.forEach(m => {
          m.items.forEach(it => {
            const f = CN.foodById(it.foodId); if (!f) return;
            const isTarget = toFood ? (norm(f.en + ' ' + f.ar).includes(norm(toFood.from).split(' ')[0] || '###')) : (affordable ? !(f.tags.includes('affordable') || f.tags.includes('egyptian')) : lighter ? /dinner|عشاء/.test(m.name + CN.i18n.t(m.key || '')) : false);
            if (!isTarget) return;
            const cands = CN.planner.swapCandidates(plan, di, m.id, it.id, patient, affordable ? 'affordable' : 'kcal');
            let cand = cands[0];
            if (lighter) { cand = cands.filter(c => c.food.kcal < f.kcal * 0.85)[0] || cands[0]; if (cand) cand.qty = Math.max(0.25, Math.round(it.qty * 0.7 * 4) / 4); }
            if (toFood && toFood.to) {
              const named = cands.find(c => norm(c.food.en + ' ' + c.food.ar).includes(norm(toFood.to).split(' ')[0]));
              if (named) cand = named;
            }
            if (cand) changes.push({ dayIdx: di, mealId: m.id, itemId: it.id, from: f, cand });
          });
        });
      });
      if (!changes.length) { res.sections.push({ title: 'builder.noPlan', html: '<p class="small muted">' + CN.i18n.t('copilot.help') + '</p>' }); return res; }
      res.kind = 'swap';
      res.plan = plan;
      res.changes = changes;
      res.sections.push({
        title: 'copilot.substitutions',
        html: '<table class="table" style="min-width:0"><thead><tr><th></th><th>' + CN.i18n.t('builder.food') + '</th><th>→</th></tr></thead><tbody>' +
          changes.slice(0, 12).map(c => '<tr><td class="small muted">' + (CN.fmt.date(plan.days[c.dayIdx].date || '') || ('Day ' + (c.dayIdx + 1))) + '</td><td>' + CN.util.esc(CN.i18n.lang() === 'ar' ? c.from.ar : c.from.en) + '</td><td>' + CN.util.esc(CN.i18n.lang() === 'ar' ? c.cand.food.ar : c.cand.food.en) + (c.cand.approx ? ' <span class="chip gold">' + CN.i18n.t('builder.approxBadge') + '</span>' : '') + '</td></tr>').join('') + '</tbody></table>' +
          '<p class="small muted">' + CN.i18n.t('builder.approxNote') + '</p>'
      });
      res.actions.push({ type: 'apply-swaps', label: CN.i18n.t('common.apply'), primary: true });
      return res;
    }

    /* 5) maintenance plan */
    if (has(tn, /maintenance|maintain|ثبات|الحفاظ|للحفاظ/) && has(tn, /plan|diet|نظام|خطه|خطة/)) {
      if (!patient) { res.sections.push({ title: 'copilot.whichPatient', html: '' }); return res; }
      const energy = latestApproved(patient.id);
      const cw = CN.store.currentWeight(patient);
      if (!patient.heightCm || !cw) { res.sections.push({ title: 'energy.noPatientText', html: '' }); return res; }
      const bmr = CN.engine.bmr({ sex: patient.sex, weight: cw, height: patient.heightCm, age: CN.util.ageFrom(patient.dob).years, bfPct: patient.bodyFatPct, method: (energy && energy.equation) || 'mifflin', deviceBmr: patient.deviceBmr }).value;
      const factor = (energy && energy.factor) || CN.engine.activityFactor(patient.lifestyle && patient.lifestyle.activity);
      const tdee = CN.engine.tdee(bmr, factor);
      const mk = makePlan(patient, { kcal: tdee, pG: Math.round(tdee * 0.25 / 4), cG: Math.round(tdee * 0.45 / 4), fG: Math.round(tdee * 0.30 / 9), fiber: 28, sodium: 2300 }, findApproaches(tn), extractDays(tn) || 7, settings);
      res.kind = 'plan'; res.plan = mk.plan;
      res.sections.push({ title: 'copilot.res.target', html: '<p><b>' + CN.fmt.kcal(tdee) + ' kcal/day</b> — ' + CN.i18n.t('energy.rateMaintain') + '</p>' });
      res.sections.push({ title: 'copilot.res.plan', html: planPreviewHTML(mk.plan) });
      res.sections.push({ title: 'copilot.res.analysis', html: analysisHTML(mk.plan) });
      res.actions.push({ type: 'draft-plan', label: CN.i18n.t('copilot.apply'), primary: true });
      return res;
    }

    /* 6) adjust calorie target */
    if (has(tn, /adjust|recalculat|update|عدل|عدّل|حدّث|راجع/) && has(tn, /calorie|kcal|سعرات|السعرات/)) {
      if (!patient) { res.sections.push({ title: 'copilot.whichPatient', html: '' }); return res; }
      const energy = latestApproved(patient.id);
      if (!energy) { res.sections.push({ title: 'energy.noPatientText', html: '' }); res.actions.push({ type: 'open-energy', label: CN.i18n.t('nav.energy') }); return res; }
      const cw = CN.store.currentWeight(patient);
      const method = energy.equation === 'device' ? 'mifflin' : (energy.equation || 'mifflin');
      const bmr = CN.engine.bmr({ sex: patient.sex, weight: cw, height: patient.heightCm, age: CN.util.ageFrom(patient.dob).years, bfPct: patient.bodyFatPct, method, deviceBmr: patient.deviceBmr }).value;
      const factor = CN.engine.activityFactor(patient.lifestyle && patient.lifestyle.activity);
      const tdee = CN.engine.tdee(bmr, factor);
      const deficit = energy.deficit || 0;
      const suggested = Math.round(tdee - deficit);
      res.kind = 'target';
      res.payload = { bmr, tdee, factor, deficit, suggested, prev: energy };
      res.sections.push({
        title: 'copilot.updatedTarget',
        html: '<div class="kv-2"><span>' + CN.i18n.t('energy.resultTarget') + ' (' + CN.i18n.t('common.from') + ')</span><b>' + CN.fmt.kcal(energy.target) + ' kcal</b>' +
          '<span>' + CN.i18n.t('fu.suggested') + '</span><b>' + CN.fmt.kcal(suggested) + ' kcal</b>' +
          '<span>TDEE (' + CN.fmt.kg(cw) + ' kg)</span><b>' + CN.fmt.kcal(tdee) + ' kcal</b></div>'
      });
      res.actions.push({ type: 'review-target', label: CN.i18n.t('fu.applyTarget'), primary: true });
      return res;
    }

    /* 7) generate plan (default for 'generate/create ... plan/diet') */
    if (has(tn, /generate|create|make|build|plan|diet|ولّد|ولد|انشئ|انشي|اعمل|خطه|خطة|نظام/)) {
      if (!patient) { res.sections.push({ title: 'copilot.whichPatient', html: '' }); res.actions.push({ type: 'open-patients', label: CN.i18n.t('nav.patients') }); return res; }
      const energy = latestApproved(patient.id);
      if (!energy) {
        res.sections.push({ title: 'builder.needTarget', html: '<p class="small muted">' + CN.i18n.t('energy.transferNote') + '</p>' });
        res.actions.push({ type: 'open-energy', label: CN.i18n.t('builder.needTargetBtn'), primary: true });
        return res;
      }
      let approaches = findApproaches(tn);
      if (!approaches.length) approaches = ['mediterranean'];
      const days = extractDays(tn) || (settings.defaults && settings.defaults.duration) || 7;
      const combos = CN.checkCombo(approaches);
      const targets = computeTargets(patient, energy, approaches);
      const mk = makePlan(patient, targets, approaches, days, settings);
      res.kind = 'plan'; res.plan = mk.plan; res.combo = combos;
      res.sections.push({ title: 'copilot.res.approach', html: '<p>' + approaches.map(a => CN.util.esc(CN.i18n.lang() === 'ar' ? CN.approachById(a).ar : CN.approachById(a).en)).join(' + ') + '</p>' + comboHTML(combos) });
      res.sections.push({ title: 'copilot.res.target', html: '<div class="nutri-strip"><div><b>' + CN.fmt.kcal(energy.target) + '</b><span class="muted small"> kcal/day</span></div><div><b>' + targets.pG + ' g</b><span class="muted small"> ' + CN.i18n.t('macro.protein') + '</span></div><div><b>' + targets.cG + ' g</b><span class="muted small"> ' + CN.i18n.t('macro.carbs') + '</span></div><div><b>' + targets.fG + ' g</b><span class="muted small"> ' + CN.i18n.t('macro.fat') + '</span></div></div>' });
      res.sections.push({ title: 'copilot.res.plan', html: planPreviewHTML(mk.plan) });
      res.sections.push({ title: 'copilot.res.analysis', html: analysisHTML(mk.plan) });
      const warns = CN.planner.warnings(mk.plan, { patient });
      if (warns.length) res.sections.push({ title: 'copilot.res.warnings', html: '<div class="flag-list">' + warns.slice(0, 5).map(w => CN.ui.flag(w.level, CN.util.esc(CN.i18n.t(w.key, w.vars)))) + '</div>' });
      const kb = searchKB(raw + ' ' + approaches.join(' '), { limit: 2 });
      if (kb.length) res.sections.push({ title: 'copilot.res.refs', html: kb.map(k => '<p class="small"><b>' + CN.util.esc(k.title) + '</b><br><span class="cite">' + CN.util.esc(k.snippet) + '</span></p>').join('') });
      res.actions.push({ type: 'draft-plan', label: CN.i18n.t('copilot.apply'), primary: true });
      res.actions.push({ type: 'open-builder', label: CN.i18n.t('copilot.openBuilder') });
      res.sections.push({ title: 'copilot.disclaimer', html: '<p class="small muted">' + CN.i18n.t('copilot.disclaimer') + '</p>' });
      return res;
    }

    /* 8) fallback: KB hits, optional LLM, help */
    const kb = searchKB(raw, { limit: 4 });
    if (kb.length) {
      res.sections.push({ title: 'copilot.kbHits', html: kb.map(k => '<p class="small"><b>' + CN.util.esc(k.title) + '</b><br><span class="cite">' + CN.util.esc(k.snippet) + '</span></p>').join('') });
    }

    if (llmConfigured(settings)) {
      try {
        const ctxPatient = settings.ai.deidentify ? deidentify(patient) : patient;
        const sys = 'You are a clinical nutrition copilot embedded in a professional clinic workstation. Assist the licensed clinician with evidence-informed suggestions. Never prescribe medications or replace clinical judgment. Reply concisely, structured with short sections. Consider the patient context JSON provided.' + (ctxPatient ? ' PATIENT CONTEXT: ' + JSON.stringify(ctxPatient) : '');
        const out = await callLLM(settings, [ { role: 'system', content: sys }, { role: 'user', content: raw } ]);
        res.usedLLM = true;
        res.sections.push({ title: 'copilot.mode.llm', html: '<div class="ref-body">' + CN.util.esc(out).replace(/\n/g, '<br>') + '</div>' });
        res.sections.push({ title: 'copilot.disclaimer', html: '<p class="small muted">' + CN.i18n.t('copilot.disclaimer') + '</p>' });
        return res;
      } catch (e) {
        res.sections.push({ title: 'copilot.mode.llm', html: '<p class="small muted">' + CN.i18n.t('settings.aiBlocked') + ' (' + CN.util.esc(String(e.message || e)) + ')</p>' });
      }
    }

    if (!kb.length) {
      res.sections.push({ title: 'copilot.notUnderstood', html: '<p class="small muted">' + CN.i18n.t('copilot.help') + '</p>' });
    }
    return res;
  }

  function latestApproved(patientId) {
    return CN.store.list('energy', { patientId }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0] || null;
  }

  function computeTargets(patient, energy, approaches) {
    const em = (energy && energy.macros) || {};
    const m = CN.engine.macros({ patient, target: energy.target, approachIds: [], goal: patient.goal, override: { mode: 'percent', p: em.p, c: em.c, f: em.f, proteinPerKg: em.proteinPerKg, fiber: em.fiber, sodium: em.sodium, fluids: em.fluids } });
    return { kcal: energy.target, pG: m.pG, cG: m.cG, fG: m.fG, fiber: m.fiber, sodium: m.sodium, fluids: m.fluids };
  }

  function makePlan(patient, targets, approaches, days, settings) {
    const def = (settings && settings.defaults) || {};
    const cfg = {
      days, mealsPerDay: 3, snacks: 2,
      window: approaches.includes('if') ? '16' : 'none',
      cuisine: 'egyptian', budget: (patient.lifestyle && patient.lifestyle.budget) || 'medium',
      exclusions: (patient.restrictions || []).slice(), methods: []
    };
    const plan = CN.planner.generate({ patient, approaches, config: cfg, targets, seed: patient.id + '|' + approaches.join(',') + '|' + days + '|' + Date.now().toString(36) });
    plan.title = approaches.map(a => CN.approachById(a).en).join(' + ') + ' · ' + days + '-day plan';
    return { plan, cfg };
  }

  function comboHTML(combo) {
    if (!combo || !combo.results.length) return '';
    return '<div class="flag-list" style="margin-top:8px">' + combo.results.map(r => CN.ui.flag(r.level === 'avoid' ? 'high' : 'mid', CN.util.esc(r.msg))).join('') + '</div>';
  }

  function planPreviewHTML(plan) {
    const d0 = plan.days[0];
    if (!d0) return '';
    return '<p class="small"><b>' + CN.i18n.t('copilot.planPreview', { n: plan.days.length, kcal: CN.fmt.kcal(plan.targets.kcal) }) + '</b></p>' +
      d0.meals.map(m => {
        const t = CN.planner.mealTotals(m);
        return '<div class="meal-block" style="border:1px solid #E3E6EB;border-radius:10px;padding:8px 10px;margin:6px 0">' +
          '<div style="display:flex;justify-content:space-between;gap:8px"><b class="small">' + CN.util.esc(m.name || CN.i18n.t(m.key || '')) + (m.time ? ' · ' + m.time : '') + '</b><span class="small muted">' + CN.fmt.kcal(t.kcal) + ' kcal</span></div>' +
          '<div class="small">' + m.items.map(it => { const f = CN.foodById(it.foodId); return f ? CN.util.esc(CN.i18n.lang() === 'ar' ? f.ar : f.en) + ' — ' + CN.planner.fmtQty(it.qty) + ' ×' : ''; }).join(' · ') + '</div></div>';
      }).join('');
  }

  function analysisHTML(plan) {
    const avg = CN.planner.planAvg(plan);
    return '<div class="nutri-strip"><div><b>' + CN.fmt.kcal(avg.kcal / avg._n) + '</b><span class="muted small"> kcal</span></div>' +
      '<div><b>' + CN.fmt.n0(avg.p / avg._n) + ' g</b><span class="muted small"> ' + CN.i18n.t('macro.protein') + '</span></div>' +
      '<div><b>' + CN.fmt.n0(avg.c / avg._n) + ' g</b><span class="muted small"> ' + CN.i18n.t('macro.carbs') + '</span></div>' +
      '<div><b>' + CN.fmt.n0(avg.f / avg._n) + ' g</b><span class="muted small"> ' + CN.i18n.t('macro.fat') + '</span></div></div>' +
      '<p class="cite">' + CN.i18n.t('copilot.analysisNote') + '</p>';
  }

  /* apply-swaps executor used by the Copilot view */
  async function applySwaps(plan, changes) {
    changes.forEach(c => {
      const d = plan.days[c.dayIdx];
      const m = d && d.meals.find(x => x.id === c.mealId);
      const it = m && m.items.find(x => x.id === c.itemId);
      if (it) { it.foodId = c.cand.food.id; it.qty = c.cand.qty; }
    });
    /* save as a new version */
    return saveAsNewVersion(plan, 'copilot');
  }

  async function saveAsNewVersion(plan, tag) {
    const store = CN.store;
    const existing = CN.store.list('plans', { patientId: plan.patientId }).filter(p => p.groupId === plan.groupId);
    const version = existing.length ? Math.max.apply(null, existing.map(p => p.version || 1)) + 1 : (plan.version || 1);
    const copy = CN.util.deepClone(plan);
    copy.id = null; copy.version = version; copy.basedOn = plan.id || null; copy.status = 'draft';
    copy.updatedAt = CN.util.nowISO();
    if (tag) copy.editedBy = tag;
    return store.save('plans', copy);
  }

  CN.copilot = {
    run, searchKB, summarize, applySwaps, saveAsNewVersion,
    llmConfigured, callLLM, deidentify, norm, findApproaches, extractDays
  };
  console.log('NutriClinic copilot.js loaded');
})();
