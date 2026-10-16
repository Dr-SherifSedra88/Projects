/* ============================================================
   NutriClinic Pro — pdf.js
   A4 report composition (branded clinic / plain print modes,
   Arabic + English), on-screen preview and print-to-PDF pipeline.
   ============================================================ */
'use strict';
(function () {

  const esc = CN.util.esc;
  const t = (k, v) => CN.i18n.t(k, v);

  function nameFor(f) {
    if (!f) return '';
    return CN.i18n.lang() === 'ar' ? (f.ar + ' (' + f.en + ')') : (f.en + (f.ar ? ' (' + f.ar + ')' : ''));
  }

  async function logoDataUrl(settings) {
    try {
      const id = settings && settings.clinic && settings.clinic.logoFileId;
      if (!id) return null;
      const rec = CN.store.getFile(id);
      if (!rec || !rec.blob) return null;
      return await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(rec.blob); });
    } catch (e) { return null; }
  }

  function defaults(settings) {
    const c = (settings && settings.clinic) || {};
    return {
      mode: 'branded', heading: t('rpt.dietPlan'), showLogo: true, showNutrition: true, showSummary: true, showGuidance: true,
      fontSize: 12, margins: 14, accent: c.accent || '#14213D', signature: true,
      clinicName: CN.i18n.lang() === 'ar' ? (c.nameAr || c.name || '') : (c.name || c.nameAr || ''),
      physician: c.physician || '', title: c.title || '', contact: c.contact || '', address: c.address || ''
    };
  }

  function headBlock(o, logo, planTitle) {
    if (o.mode === 'plain') {
      return '<div style="margin-bottom:10px"><h1 style="border-bottom:2px solid #14213D;padding-bottom:6px">' + esc(planTitle || o.heading) + '</h1>' +
        '<div class="small muted">' + (o.plainMode === true ? esc(t('rpt.plainMode')) : '') + '</div></div>';
    }
    return '<div class="sheet-head"><div>' +
      '<h1>' + esc(planTitle || o.heading) + '</h1>' +
      '<div class="small muted">' + esc(o.clinicName || '') + '</div></div>' +
      '<div class="sheet-clinic">' + (o.showLogo && logo ? '<img class="sheet-logo" src="' + logo + '" alt=""/>' : '') +
      (o.physician ? '<div><b>' + esc(o.physician) + '</b></div>' : '') +
      (o.title ? '<div>' + esc(o.title) + '</div>' : '') +
      (o.contact ? '<div>' + esc(o.contact) + '</div>' : '') +
      (o.address ? '<div>' + esc(o.address) + '</div>' : '') +
      '</div></div>';
  }

  function metaBlock(rows) {
    return '<div class="sheet-meta">' + rows.map(r => '<div><span class="kv-label">' + esc(r[0]) + ':</span> <b>' + esc(r[1] || '—') + '</b></div>').join('') + '</div>';
  }

  function fmtQtyText(it) {
    const f = CN.foodById(it.foodId);
    if (!f) return '';
    const mode = (CN.store.settings && CN.store.settings.defaults && CN.store.settings.defaults.portionMode) || 'household';
    return mode === 'household' ? (CN.planner.fmtQty(it.qty) + ' × ' + f.ptext) : (Math.round(f.grams * it.qty) + ' g');
  }

  /* ---------------- diet plan report ---------------- */
  async function buildDietPlanReport(plan, patient, settings, opts) {
    const o = Object.assign(defaults(settings), opts || {});
    const logo = o.mode === 'branded' && o.showLogo ? await logoDataUrl(settings) : null;
    const rtl = CN.i18n.lang() === 'ar';
    let h = headBlock(o, logo, o.heading);
    h += metaBlock([
      [t('rpt.forPatient'), (patient.fullName || '') + ' (' + (patient.id || '') + ')'],
      [t('common.date'), CN.fmt.date(CN.util.todayISO())],
      [t('common.age'), patient.dob ? (CN.util.ageFrom(patient.dob).years + ' y') : '—'],
      [t('common.sex'), t(patient.sex === 'male' ? 'common.male' : 'common.female')],
      [t('builder.duration'), plan.days.length + ' ' + t('common.days')],
      [t('energy.resultTarget'), CN.fmt.kcal(plan.targets.kcal) + ' kcal/day']
    ]);

    plan.days.forEach((d, di) => {
      const tot = CN.planner.dayTotals(d);
      h += '<div class="avoid-break" style="margin-top:12px"><h2>' + esc(t('builder.dayN', { n: di + 1 })) + '</h2>';
      d.meals.forEach(m => {
        const mt = CN.planner.mealTotals(m);
        h += '<div class="meal-block"><h3>' + esc(m.name || t(m.key || '')) + (m.time ? ' — ' + esc(m.time) : '') + '</h3>';
        h += '<table><thead><tr><th>' + t('rpt.food') + '</th><th>' + t('rpt.portion') + '</th>' +
          (o.showNutrition ? '<th>kcal</th><th>' + t('macro.protein') + '</th><th>' + t('macro.carbs') + '</th><th>' + t('macro.fat') + '</th>' : '') +
          '</tr></thead><tbody>';
        m.items.forEach(it => {
          const f = CN.foodById(it.foodId); if (!f) return;
          const q = it.qty;
          h += '<tr><td>' + esc(nameFor(f)) + '</td><td>' + esc(fmtQtyText(it)) + '</td>' +
            (o.showNutrition ? '<td>' + CN.fmt.kcal(f.kcal * q) + '</td><td>' + CN.fmt.n1(f.p * q) + '</td><td>' + CN.fmt.n1(f.c * q) + '</td><td>' + CN.fmt.n1(f.f * q) + '</td>' : '') + '</tr>';
          if (it.alt && it.alt.length) {
            const altTxt = it.alt.map(a => { const af = CN.foodById(a.foodId); return af ? esc(nameFor(af)) + ' (' + CN.planner.fmtQty(a.qty) + ' ×)' : ''; }).join(' · ');
            if (altTxt) h += '<tr><td colspan="' + (o.showNutrition ? 6 : 2) + '" class="cite">' + t('rpt.alts') + ': ' + altTxt + '</td></tr>';
          }
        });
        if (o.showNutrition) {
          h += '<tr class="rpt-totals"><td colspan="2">' + t('common.total') + '</td><td>' + CN.fmt.kcal(mt.kcal) + '</td><td>' + CN.fmt.n1(mt.p) + '</td><td>' + CN.fmt.n1(mt.c) + '</td><td>' + CN.fmt.n1(mt.f) + '</td></tr>';
        }
        h += '</tbody></table>';
        if (m.note) h += '<div class="small muted">' + t('rpt.notes') + ': ' + esc(m.note) + '</div>';
        h += '</div>';
      });
      if (o.showNutrition) {
        h += '<p class="small"><b>' + t('builder.totals') + ':</b> ' + CN.fmt.kcal(tot.kcal) + ' kcal · ' +
          t('macro.protein') + ' ' + CN.fmt.n1(tot.p) + ' g · ' + t('macro.carbs') + ' ' + CN.fmt.n1(tot.c) + ' g · ' +
          t('macro.fat') + ' ' + CN.fmt.n1(tot.f) + ' g · ' + t('macro.fiber') + ' ' + CN.fmt.n1(tot.fiber) + ' g</p>';
      }
      h += '</div>';
    });

    if (o.showSummary) {
      h += '<div class="avoid-break"><h2>' + t('common.summary') + '</h2><table><thead><tr><th>' + t('rpt.day') + '</th><th>kcal</th><th>' + t('macro.protein') + '</th><th>' + t('macro.carbs') + '</th><th>' + t('macro.fat') + '</th></tr></thead><tbody>';
      plan.days.forEach((d, di) => {
        const tot = CN.planner.dayTotals(d);
        h += '<tr><td>' + (di + 1) + '</td><td>' + CN.fmt.kcal(tot.kcal) + '</td><td>' + CN.fmt.n0(tot.p) + '</td><td>' + CN.fmt.n0(tot.c) + '</td><td>' + CN.fmt.n0(tot.f) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }

    if (o.showGuidance && plan.notes && plan.notes.length) {
      h += '<div class="avoid-break"><h2>' + t('builder.instructions') + '</h2><ul>' + plan.notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></div>';
    }

    if (o.signature && o.mode === 'branded') {
      h += '<div class="sign"><div class="line">' + esc(o.physician || t('rpt.approvalLine')) + '</div><div class="line">' + t('common.date') + '</div></div>';
    }
    h += '<div class="foot-note">' + esc(t('rpt.exportedOn', { d: CN.fmt.date(CN.util.todayISO()) })) + ' · NutriClinic Pro — ' + esc(t('copilot.disclaimer')) + '</div>';
    return wrapSheet(h, o, rtl);
  }

  function wrapSheet(inner, o, rtl) {
    const fs = (o.fontSize || 12);
    return '<div class="sheet-body" style="font-size:' + fs + 'px" dir="' + (rtl ? 'rtl' : 'ltr') + '">' + inner + '</div>';
  }

  /* ---------------- patient summary report ---------------- */
  async function buildPatientSummary(patient, settings, opts) {
    const store = CN.store;
    const o = Object.assign(defaults(settings), opts || {});
    const logo = o.mode === 'branded' && o.showLogo ? await logoDataUrl(settings) : null;
    const rtl = CN.i18n.lang() === 'ar';
    let h = headBlock(o, logo, t('rpt.patientSummary'));
    const cw = store.currentWeight(patient);
    h += metaBlock([
      [t('rpt.forPatient'), (patient.fullName || '') + ' (' + (patient.id || '') + ')'],
      [t('common.date'), CN.fmt.date(CN.util.todayISO())],
      [t('common.age'), patient.dob ? (CN.util.ageFrom(patient.dob).years + ' y') : '—'],
      [t('common.sex'), t(patient.sex === 'male' ? 'common.male' : 'common.female')],
      [t('np.height'), patient.heightCm ? patient.heightCm + ' cm' : '—'],
      ['BMI', CN.fmt.n1(CN.engine.bmi(cw, patient.heightCm)) + ' (' + t('bmi.' + CN.engine.bmiCat(CN.engine.bmi(cw, patient.heightCm)).key) + ')']
    ]);

    h += '<h2>' + t('np.section.personal') + '</h2><table><tbody>';
    [['np.fullName', patient.fullName], ['np.dob', CN.fmt.date(patient.dob)], ['np.phone', patient.phone],
     ['np.occupation', patient.occupation], ['np.emergency', patient.emergency]].forEach(r => {
      h += '<tr><td style="width:34%">' + t(r[0]) + '</td><td>' + esc(r[1] || '—') + '</td></tr>';
    });
    h += '</tbody></table>';

    h += '<h2>' + t('np.section.medical') + '</h2><table><tbody>';
    [['np.conditions', (patient.conditions || []).join(', ')], ['np.medications', (patient.medications || []).map(m => m.name + ' ' + (m.dose || '')).join('; ')],
     ['np.allergies', (patient.allergies || []).map(a => a.name).join(', ')], ['np.intolerances', (patient.intolerances || []).map(a => a.name).join(', ')],
     ['np.notes', patient.notes]].forEach(r => {
      h += '<tr><td style="width:34%">' + t(r[0]) + '</td><td>' + esc(r[1] || '—') + '</td></tr>';
    });
    h += '</tbody></table>';

    const fus = store.list('followups', { patientId: patient.id });
    const energy = store.list('energy', { patientId: patient.id }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0];
    const prog = CN.engine.analyzeProgress(patient, fus, energy);
    if (prog.n >= 2) {
      h += '<h2>' + t('fu.progress') + '</h2><table><tbody>' +
        '<tr><td>' + t('fu.totalChange') + '</td><td>' + CN.fmt.signed(prog.total) + ' kg (' + CN.fmt.signed(prog.pct) + '%)</td></tr>' +
        '<tr><td>' + t('fu.avgWeekly') + '</td><td>' + CN.fmt.signed(prog.avgWeekly) + ' kg/week</td></tr>' +
        (energy ? '<tr><td>' + t('energy.approvedTarget') + '</td><td>' + CN.fmt.kcal(energy.target) + ' kcal/day</td></tr>' : '') +
        '</tbody></table>';
    }

    const assessments = store.list('assessments', { patientId: patient.id });
    if (assessments.length) {
      const latest = assessments.sort((a, b) => (a.date > b.date ? -1 : 1))[0];
      h += '<h2>' + t('assess.chronology') + '</h2><table><thead><tr><th>' + t('common.date') + '</th><th>' + t('assess.itemLabel') + '</th><th>' + t('common.value') + '</th><th>' + t('common.range') + '</th></tr></thead><tbody>';
      latest.items.forEach(i => { h += '<tr><td>' + esc(latest.date) + '</td><td>' + esc(i.label) + '</td><td>' + esc(i.value + ' ' + (i.unit || '')) + '</td><td>' + esc((i.refLow || '') + '–' + (i.refHigh || '')) + '</td></tr>'; });
      h += '</tbody></table>';
    }
    h += '<div class="foot-note">' + esc(t('rpt.exportedOn', { d: CN.fmt.date(CN.util.todayISO()) })) + ' · NutriClinic Pro</div>';
    return wrapSheet(h, o, rtl);
  }

  /* ---------------- follow-up report ---------------- */
  async function buildFollowupReport(patient, settings, opts) {
    const store = CN.store;
    const o = Object.assign(defaults(settings), opts || {});
    const logo = o.mode === 'branded' && o.showLogo ? await logoDataUrl(settings) : null;
    const rtl = CN.i18n.lang() === 'ar';
    const fus = store.list('followups', { patientId: patient.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
    let h = headBlock(o, logo, t('rpt.followupReport'));
    h += metaBlock([[t('rpt.forPatient'), patient.fullName + ' (' + patient.id + ')'], [t('common.date'), CN.fmt.date(CN.util.todayISO())]]);
    h += '<table><thead><tr><th>' + t('common.date') + '</th><th>' + t('fu.weight') + '</th><th>' + t('fu.waist') + '</th><th>' + t('fu.bodyFat') + '</th><th>' + t('fu.adherence') + '</th><th>' + t('fu.observations') + '</th></tr></thead><tbody>';
    fus.forEach(f => {
      h += '<tr><td>' + esc(f.date) + '</td><td>' + CN.fmt.n1(f.weight) + '</td><td>' + CN.fmt.n1(f.waistCm) + '</td><td>' + CN.fmt.n1(f.bodyFatPct) + '</td><td>' + esc(f.adherence || '') + '</td><td>' + esc(f.observations || '') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="foot-note">NutriClinic Pro</div>';
    return wrapSheet(h, o, rtl);
  }

  /* ---------------- assessment report ---------------- */
  async function buildAssessmentReport(patient, settings, opts) {
    const store = CN.store;
    const o = Object.assign(defaults(settings), opts || {});
    const logo = o.mode === 'branded' && o.showLogo ? await logoDataUrl(settings) : null;
    const rtl = CN.i18n.lang() === 'ar';
    const list = store.list('assessments', { patientId: patient.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
    let h = headBlock(o, logo, t('rpt.assessmentReport'));
    h += metaBlock([[t('rpt.forPatient'), patient.fullName + ' (' + patient.id + ')'], [t('common.date'), CN.fmt.date(CN.util.todayISO())]]);
    list.forEach(a => {
      h += '<div class="avoid-break"><h2>' + esc(CN.fmt.date(a.date)) + (a.bp ? ' · BP ' + a.bp.sys + '/' + a.bp.dia : '') + '</h2><table><thead><tr><th>' + t('assess.itemLabel') + '</th><th>' + t('common.value') + '</th><th>' + t('common.unit') + '</th><th>' + t('common.range') + '</th></tr></thead><tbody>';
      (a.items || []).forEach(i => {
        const flag = CN.engine.labFlag(i);
        h += '<tr><td>' + esc(i.label) + (flag && flag !== 'normal' ? ' <span class="badge-print">' + esc(flag === 'high' ? t('assess.high') : t('assess.low')) + '</span>' : '') + '</td><td>' + esc(i.value) + '</td><td>' + esc(i.unit || '') + '</td><td>' + esc((i.refLow || '') + '–' + (i.refHigh || '')) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    });
    h += '<div class="foot-note">' + esc(t('assess.disclaimer')) + '</div>';
    return wrapSheet(h, o, rtl);
  }

  /* ---------------- preview & print ---------------- */
  function preview(html, opts) {
    opts = opts || {};
    const layer = CN.util.$('#layer');
    const wrap = document.createElement('div');
    wrap.className = 'preview-overlay';
    const rtl = CN.i18n.lang() === 'ar';
    wrap.innerHTML =
      '<div class="preview-toolbar">' +
      '<button class="btn btn-primary" id="pvPrint">' + CN.icon('print') + CN.util.esc(t('rpt.printBtn')) + '</button>' +
      '<button class="btn btn-ghost" id="pvClose">' + CN.util.esc(t('common.close')) + '</button>' +
      '<span class="small muted">' + CN.util.esc(t('common.printHint')) + '</span></div>' +
      '<div class="a4' + (rtl ? ' rtl' : '') + '">' + html + '</div>';
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
    function close() { wrap.remove(); layer.classList.toggle('active', layer.children.length > 0); }
    layer.appendChild(wrap);
    layer.classList.add('active');
    wrap.querySelector('#pvClose').addEventListener('click', close);
    wrap.querySelector('#pvPrint').addEventListener('click', () => print(html, opts));
    return { close };
  }

  function print(html, opts) {
    opts = opts || {};
    const root = CN.util.$('#print-root');
    const rtl = CN.i18n.lang() === 'ar' || opts.dir === 'rtl';
    const fs = (opts.fontSize || 12);
    root.innerHTML = '<div class="print-sheet' + (rtl ? ' rtl-sheet' : '') + '" style="font-size:' + fs + 'px">' + html + '</div>';
    const prevTitle = document.title;
    if (opts.title) document.title = opts.title;
    const done = () => { document.title = prevTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch (e) { CN.toast('Print failed: ' + e.message, 'burg'); } }, 80);
  }

  CN.pdf = { buildDietPlanReport, buildPatientSummary, buildFollowupReport, buildAssessmentReport, preview, print, logoDataUrl, defaults, nameFor };
  console.log('NutriClinic pdf.js loaded');
})();
