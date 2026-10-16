/* ============================================================
   NutriClinic Pro — views-clinical.js
   Clinical Assessment · Energy Calculator · Body Composition
   ============================================================ */
'use strict';
(function () {
  const t = (k, v) => CN.i18n.t(k, v);
  const esc = CN.util.esc;
  const n2 = v => (Math.round((+v) * 100) / 100);

  /* ---------------- lab catalog ---------------- */
  const LAB_CATALOG = [
    { code: 'fbg', label: 'Fasting glucose', group: 'glucose', unit: 'mg/dL', refLow: 70, refHigh: 99 },
    { code: 'ppg', label: 'Postprandial glucose', group: 'glucose', unit: 'mg/dL', refLow: null, refHigh: 140 },
    { code: 'hba1c', label: 'HbA1c', group: 'glucose', unit: '%', refLow: 4, refHigh: 5.6 },
    { code: 'tc', label: 'Total cholesterol', group: 'lipid', unit: 'mg/dL', refLow: 100, refHigh: 200 },
    { code: 'ldl', label: 'LDL cholesterol', group: 'lipid', unit: 'mg/dL', refLow: 50, refHigh: 130 },
    { code: 'hdl', label: 'HDL cholesterol', group: 'lipid', unit: 'mg/dL', refLow: 40, refHigh: 90 },
    { code: 'tg', label: 'Triglycerides', group: 'lipid', unit: 'mg/dL', refLow: 40, refHigh: 150 },
    { code: 'creat', label: 'Creatinine', group: 'renal', unit: 'mg/dL', refLow: 0.6, refHigh: 1.1 },
    { code: 'bun', label: 'BUN', group: 'renal', unit: 'mg/dL', refLow: 7, refHigh: 20 },
    { code: 'egfr', label: 'eGFR', group: 'renal', unit: 'mL/min/1.73m²', refLow: 90, refHigh: 120 },
    { code: 'alt', label: 'ALT', group: 'liver', unit: 'U/L', refLow: 7, refHigh: 56 },
    { code: 'ast', label: 'AST', group: 'liver', unit: 'U/L', refLow: 10, refHigh: 40 },
    { code: 'tsh', label: 'TSH', group: 'thyroid', unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 },
    { code: 'ft4', label: 'Free T4', group: 'thyroid', unit: 'ng/dL', refLow: 0.8, refHigh: 1.8 },
    { code: 'wbc', label: 'WBC', group: 'cbc', unit: '10³/µL', refLow: 4, refHigh: 11 },
    { code: 'hgb', label: 'Hemoglobin', group: 'cbc', unit: 'g/dL', refLow: 12, refHigh: 17 },
    { code: 'plt', label: 'Platelets', group: 'cbc', unit: '10³/µL', refLow: 150, refHigh: 450 },
    { code: 'vitd', label: 'Vitamin D (25-OH)', group: 'vitamin', unit: 'ng/mL', refLow: 30, refHigh: 100 },
    { code: 'b12', label: 'Vitamin B12', group: 'vitamin', unit: 'pg/mL', refLow: 200, refHigh: 900 },
    { code: 'ferritin', label: 'Ferritin', group: 'mineral', unit: 'ng/mL', refLow: 30, refHigh: 300 },
    { code: 'iron', label: 'Serum iron', group: 'mineral', unit: 'µg/dL', refLow: 60, refHigh: 170 },
    { code: 'ca', label: 'Calcium', group: 'mineral', unit: 'mg/dL', refLow: 8.5, refHigh: 10.5 },
    { code: 'k', label: 'Potassium', group: 'mineral', unit: 'mmol/L', refLow: 3.5, refHigh: 5.1 },
    { code: 'na', label: 'Sodium', group: 'mineral', unit: 'mmol/L', refLow: 135, refHigh: 145 },
    { code: 'mg', label: 'Magnesium', group: 'mineral', unit: 'mg/dL', refLow: 1.7, refHigh: 2.2 },
    { code: 'uric', label: 'Uric acid', group: 'other', unit: 'mg/dL', refLow: 3.5, refHigh: 7.2 },
    { code: 'crp', label: 'CRP', group: 'other', unit: 'mg/L', refLow: 0, refHigh: 5 },
    { code: 'esr', label: 'ESR', group: 'other', unit: 'mm/hr', refLow: 0, refHigh: 20 }
  ];
  const GROUP_LABELS = { glucose: 'Glucose control', lipid: 'Lipid profile', renal: 'Kidney function', liver: 'Liver function', thyroid: 'Thyroid', cbc: 'CBC', vitamin: 'Vitamins', mineral: 'Minerals', other: 'Other' };

  CN.views.assessment = {
    render(root) {
      const p = CN.app.patient();
      let h = CN.vh.pageHead('assess.title', 'assess.sub',
        p ? '<button class="btn btn-primary" data-act="add">' + CN.icon('plus') + esc(t('assess.newPanel')) + '</button>' : '');
      if (!p) { root.innerHTML = h + '<div class="card">' + CN.vh.needPatient('energy.noPatientText') + '</div>'; bindSimple(root); return; }

      const panels = CN.store.list('assessments', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
      const safety = CN.engine.profileSafetyScan(p, panels);
      const got = new Set(); panels.forEach(a => (a.items || []).forEach(i => got.add(i.code)));
      const baseline = ['fbg', 'hba1c', 'tc', 'ldl', 'hdl', 'tg', 'creat', 'tsh', 'hgb', 'vitd'];
      const missing = baseline.filter(c => !got.has(c));

      h += '<div class="grid grid-2-1">';
      h += '<div>';
      if (!panels.length) {
        h += '<div class="card">' + CN.ui.empty(t('assess.noPanels'), t('assess.intro'), '<button class="btn btn-primary" data-act="add">' + esc(t('assess.addFirst')) + '</button>', 'stethoscope') + '</div>';
      } else {
        panels.forEach(panel => {
          const files = CN.store.listFiles({ patientId: p.id }).filter(f => f.panelId === panel.id);
          h += '<div class="card mb-3"><div class="spread mb-2"><div><b>' + esc(CN.fmt.date(panel.date)) + '</b>' +
            (panel.bp ? ' <span class="chip line">BP ' + panel.bp.sys + '/' + panel.bp.dia + (panel.bp.pulse ? ' · ♥ ' + panel.bp.pulse : '') + '</span>' : '') +
            (panel.notes ? '<div class="small muted">' + esc(panel.notes) + '</div>' : '') + '</div>' +
            '<div class="flex"><button class="btn btn-quiet btn-sm" data-attach="' + panel.id + '">' + CN.icon('upload') + '</button>' +
            '<button class="btn btn-quiet btn-sm" data-del="' + panel.id + '">' + CN.icon('trash') + '</button></div></div>';
          h += '<div class="table-scroll"><table class="table" style="min-width:0"><thead><tr><th>' + t('assess.itemLabel') + '</th><th>' + t('common.value') + '</th><th>' + t('common.range') + '</th><th>' + t('common.status') + '</th></tr></thead><tbody>';
          (panel.items || []).forEach(i => {
            const flag = CN.engine.labFlag(i);
            const cls = flag === 'high' ? 'burg' : flag === 'low' ? 'gold' : 'gray';
            h += '<tr><td>' + esc(i.label) + '</td><td class="tnum">' + esc(i.value) + ' <span class="muted small">' + esc(i.unit || '') + '</span></td>' +
              '<td class="muted small">' + esc((i.refLow !== null && i.refLow !== undefined && i.refLow !== '' ? i.refLow : '') + '–' + (i.refHigh !== null && i.refHigh !== undefined && i.refHigh !== '' ? i.refHigh : '')) + '</td>' +
              '<td>' + (flag ? '<span class="chip ' + cls + '">' + esc(t('assess.' + flag)) + '</span>' : '—') + '</td></tr>';
          });
          h += '</tbody></table></div>';
          if (files.length) h += '<div class="small muted mt-1">' + files.map(f => '<span class="food-chip" data-dl="' + f.id + '" style="cursor:pointer">' + CN.icon('fileText') + ' ' + esc(f.name) + '</span>').join(' ') + '</div>';
          h += '</div>';
        });
      }
      h += '<div class="alert info">' + CN.icon('info') + '<div>' + esc(t('assess.disclaimer')) + '</div></div>';
      h += '</div>';

      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('assess.missing.title')) + '</h3></div>' +
        (missing.length ? '<div class="tag-list">' + missing.map(m => { const c = LAB_CATALOG.find(x => x.code === m); return '<span class="chip gold">' + esc(c ? c.label : m) + '</span>'; }).join(' ') + '</div>'
          : '<div class="alert ok">' + CN.icon('check') + '<div>' + esc(t('assess.missing.ok')) + '</div></div>') + '</div>';
      h += '<div class="card"><div class="card-h"><h3>' + esc(t('assess.safety.title')) + '</h3></div>' +
        (safety.length ? '<div class="flag-list">' + safety.map(f => CN.ui.flag(f.level, esc(f.text))).join('') + '</div>' : '<p class="muted small">' + esc(t('assess.safety.none')) + '</p>') +
        '<p class="cite mt-2">' + esc(t('assess.flagsNote')) + '</p></div>';
      h += '</div></div>';

      root.innerHTML = h;
      const addBtn = root.querySelector('[data-act=add]');
      if (addBtn) addBtn.onclick = () => openPanelModal(p, () => CN.app.renderCurrent());
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await CN.modal.confirm({ message: t('assess.deletePanelConfirm'), danger: true })) {
          await CN.store.remove('assessments', b.getAttribute('data-del'));
          CN.app.renderCurrent();
        }
      });
      root.querySelectorAll('[data-attach]').forEach(b => b.onclick = async () => {
        const files = await CN.util.pickFiles({ multiple: true });
        for (const f of files) await CN.store.saveFile({ name: f.name, mime: f.type, size: f.size, kind: 'lab', patientId: p.id, panelId: b.getAttribute('data-attach'), blob: f });
        CN.toast(t('assess.fileAdded')); CN.app.renderCurrent();
      });
      root.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => { const rec = CN.store.getFile(b.getAttribute('data-dl')); if (rec && rec.blob) CN.util.download(rec.name, rec.blob); });
      bindSimple(root);
    }
  };

  function bindSimple(root) {
    root.querySelectorAll('[data-act=goto-patients]').forEach(b => b.onclick = () => CN.app.route('patients'));
  }

  function openPanelModal(patient, onSaved) {
    let rows = [];
    const m = CN.modal.open({
      title: t('assess.newPanel'), sub: patient.fullName + ' · ' + patient.id, wide: true,
      foot: '<button class="btn btn-ghost" data-x="cancel">' + esc(t('common.cancel')) + '</button>' +
            '<button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(t('assess.addPanel')) + '</button>',
      body:
        '<div class="form-grid-3">' +
        '<div class="field"><label>' + esc(t('assess.panelDate')) + '</label><input class="input" type="date" id="pnDate" value="' + CN.util.todayISO() + '"/></div>' +
        '<div class="field"><label>' + esc(t('assess.bp')) + ' — ' + esc(t('assess.systolic')) + '</label><input class="input" type="number" id="pnSys" placeholder="120"/></div>' +
        '<div class="field"><label>' + esc(t('assess.diastolic')) + '</label><input class="input" type="number" id="pnDia" placeholder="80"/></div>' +
        '</div>' +
        '<div class="field"><label>' + esc(t('assess.pulse')) + '</label><input class="input" type="number" id="pnPulse" style="max-width:140px" placeholder="72"/></div>' +
        '<div class="section-title">' + esc(t('assess.chooseItems')) + '</div>' +
        '<div id="pnRows"></div>' +
        '<div id="pnPicker" class="grid grid-3">' +
        Object.keys(GROUP_LABELS).map(g => {
          const items = LAB_CATALOG.filter(c => c.group === g);
          if (!items.length) return '';
          return '<div class="card pad-sm"><div class="small strong mb-1">' + esc(GROUP_LABELS[g]) + '</div>' +
            items.map(c => '<label class="check"><input type="checkbox" data-code="' + c.code + '"/><span class="small">' + esc(c.label) + ' <span class="muted xsmall">' + esc(c.unit) + '</span></span></label>').join('') + '</div>';
        }).join('') + '</div>' +
        '<div class="flex mt-2"><button class="btn btn-ghost btn-sm" data-x="custom">' + CN.icon('plus') + esc(t('assess.customItem')) + '</button></div>' +
        '<div class="field mt-2"><label>' + esc(t('common.notes')) + '</label><input class="input" id="pnNotes"/></div>' +
        '<div id="pnErr" class="err"></div>',
      onMount(box, modal) {
        const rowsHost = box.querySelector('#pnRows');
        function renderRows() {
          if (!rows.length) { rowsHost.innerHTML = '<p class="muted small">' + esc(t('assess.noItemsYet')) + '</p>'; return; }
          rowsHost.innerHTML = '<div class="table-scroll"><table class="table" style="min-width:0"><thead><tr><th>' + t('assess.itemLabel') + '</th><th>' + t('common.value') + '</th><th>' + t('common.unit') + '</th><th>' + t('assess.refLow') + '</th><th>' + t('assess.refHigh') + '</th><th></th></tr></thead><tbody>' +
            rows.map((r, i) => '<tr>' +
              '<td><input class="input" data-r="label" data-i="' + i + '" value="' + esc(r.label) + '"/></td>' +
              '<td><input class="input" type="number" step="any" data-r="value" data-i="' + i + '" value="' + esc(r.value || '') + '" style="width:90px"/></td>' +
              '<td><input class="input" data-r="unit" data-i="' + i + '" value="' + esc(r.unit || '') + '" style="width:90px"/></td>' +
              '<td><input class="input" type="number" step="any" data-r="refLow" data-i="' + i + '" value="' + (r.refLow === null || r.refLow === undefined ? '' : r.refLow) + '" style="width:80px"/></td>' +
              '<td><input class="input" type="number" step="any" data-r="refHigh" data-i="' + i + '" value="' + (r.refHigh === null || r.refHigh === undefined ? '' : r.refHigh) + '" style="width:80px"/></td>' +
              '<td><button class="btn btn-icon btn-quiet" data-x="rm" data-i="' + i + '">' + CN.icon('trash') + '</button></td></tr>').join('') +
            '</tbody></table></div>';
          rowsHost.querySelectorAll('[data-r]').forEach(inp => inp.addEventListener('input', () => {
            const i = +inp.getAttribute('data-i'), f = inp.getAttribute('data-r');
            rows[i][f] = inp.value;
          }));
          rowsHost.querySelectorAll('[data-x=rm]').forEach(b => b.onclick = () => {
            const code = rows[+b.getAttribute('data-i')].code;
            const cb = box.querySelector('[data-code="' + code + '"]'); if (cb) cb.checked = false;
            rows.splice(+b.getAttribute('data-i'), 1); renderRows();
          });
        }
        box.querySelectorAll('[data-code]').forEach(cb => cb.addEventListener('change', () => {
          const code = cb.getAttribute('data-code');
          if (cb.checked) { if (!rows.find(r => r.code === code)) { const c = LAB_CATALOG.find(x => x.code === code); rows.push({ code: c.code, label: c.label, unit: c.unit, refLow: c.refLow, refHigh: c.refHigh, value: '' }); } }
          else rows = rows.filter(r => r.code !== code);
          renderRows();
        }));
        box.querySelector('[data-x=custom]').onclick = () => {
          rows.push({ code: 'custom-' + CN.util.uid('x').slice(-6), label: '', unit: '', refLow: null, refHigh: null, value: '' });
          renderRows();
          const inputs = rowsHost.querySelectorAll('[data-r=label]'); if (inputs.length) inputs[inputs.length - 1].focus();
        };
        renderRows();
        box.querySelector('[data-x=cancel]').onclick = () => modal.close();
        box.querySelector('[data-x=save]').onclick = async () => {
          const items = rows.map(r => ({
            code: r.code, label: (r.label || '').trim(), unit: (r.unit || '').trim(),
            value: r.value === '' ? null : (isFinite(CN.util.parseNum(r.value)) ? CN.util.parseNum(r.value) : r.value),
            refLow: r.refLow === '' || r.refLow === null ? null : CN.util.parseNum(r.refLow),
            refHigh: r.refHigh === '' || r.refHigh === null ? null : CN.util.parseNum(r.refHigh)
          })).filter(r => r.label && r.value !== null && r.value !== '');
          if (!items.length) { box.querySelector('#pnErr').textContent = t('assess.noItemsYet'); return; }
          const bpS = CN.util.parseNum(box.querySelector('#pnSys').value), bpD = CN.util.parseNum(box.querySelector('#pnDia').value);
          const rec = {
            patientId: patient.id, date: box.querySelector('#pnDate').value || CN.util.todayISO(),
            items, notes: box.querySelector('#pnNotes').value.trim(),
            bp: isFinite(bpS) && isFinite(bpD) ? { sys: bpS, dia: bpD, pulse: CN.util.parseNum(box.querySelector('#pnPulse').value) || null } : null
          };
          await CN.store.save('assessments', rec);
          /* update BP into patient quick fields */
          if (rec.bp) { patient.lastBP = rec.bp; await CN.store.savePatient(patient); }
          CN.toast(t('common.saved'));
          modal.close();
          if (onSaved) onSaved();
        };
      }
    });
  }

  /* ================= Energy Calculator ================= */
  CN.views.energy = {
    render(root) {
      const p = CN.app.patient();
      let h = CN.vh.pageHead('energy.title', 'energy.sub');
      if (!p) { root.innerHTML = h + '<div class="card">' + CN.vh.needPatient('energy.noPatientText') + '</div>'; bindSimple(root); return; }

      const settings = CN.store.settings || {};
      const defs = settings.defaults || {};
      const cw = CN.store.currentWeight(p);
      const st = this._state && this._state.patientId === p.id ? this._state : (this._state = {
        patientId: p.id,
        method: p.deviceBmr ? (defs.equation === 'device' ? 'device' : (defs.equation || 'mifflin')) : (defs.equation || 'mifflin'),
        weightBasis: 'current', activity: (p.lifestyle && p.lifestyle.activity) || defs.activity || 'light',
        customFactor: '', goal: p.goal || 'loss', optionId: null, customDelta: '',
        overrides: {}, prefill: null
      });
      if (CN.app.pendingTargetPayload && CN.app.pendingTargetPayload.patientId === p.id) {
        st.prefill = CN.app.pendingTargetPayload; CN.app.pendingTargetPayload = null;
      }

      h += '<div id="energyWrap"></div>' +
        '<div class="card mt-3"><div class="card-h"><h2>' + esc(t('energy.history')) + '</h2></div><div id="energyHistory"></div></div>';
      root.innerHTML = h;
      this._root = root;
      const self = this;
      renderWizard();
      renderHistory();
      bindSimple(root);

      function computeAll() {
        const height = CN.util.parseNum(p.heightCm);
        const weightRaw = CN.store.currentWeight(p);
        const weight = st.weightBasis === 'adjusted' ? CN.engine.adjustedWeight(weightRaw, height) : weightRaw;
        const age = p.dob ? CN.util.ageFrom(p.dob).years : CN.util.parseNum(p.age);
        const bf = (function () {
          const ms = CN.store.list('measurements', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
          const latest = ms.find(m => m.bodyFatPct) || null;
          return latest ? latest.bodyFatPct : CN.util.parseNum(p.bodyFatPct);
        })();
        const bmr = CN.engine.bmr({ sex: p.sex, weight, height, age, bfPct: bf, method: st.method, deviceBmr: CN.util.parseNum(p.deviceBmr) });
        const factor = st.activity === 'custom' ? (CN.util.parseNum(st.customFactor) || 1.375) : CN.engine.activityFactor(st.activity);
        const tdee = CN.engine.tdee(bmr.value, factor);
        const hasAssessment = CN.store.list('assessments', { patientId: p.id }).length > 0;
        const sug = CN.engine.suggestTarget({ patient: p, bmr: bmr.value, tdee, goal: st.goal, hasAssessment, weight: weightRaw });
        return { height, weight, weightRaw, age, bf, bmr, factor, tdee, sug, hasAssessment };
      }

      function currentTarget(c) {
        if (st.goal === 'maintain') return c.tdee;
        if (st.goal === 'therapeutic') return CN.util.parseNum(st.customDelta) || null;
        const sign = st.goal === 'gain' ? +1 : -1;
        let delta = null;
        if (st.customDelta !== '') delta = CN.util.parseNum(st.customDelta);
        else {
          const opt = c.sug.options.find(o => o.id === st.optionId) || c.sug.options.find(o => o.id === c.sug.recommended) || c.sug.options[0];
          delta = opt ? opt.kcal : null;
          st.optionId = opt ? opt.id : null;
        }
        if (delta === null || !isFinite(delta)) return null;
        return Math.round(c.tdee + sign * delta);
      }

      function renderWizard() {
        const c = computeAll();
        const target = currentTarget(c);
        const wrap = root.querySelector('#energyWrap');
        let w = '';

        if (st.prefill) {
          w += '<div class="banner gold">' + CN.icon('info') + '<span>' + esc(t('copilot.updatedTarget')) + ' — <b>' + CN.fmt.kcal(st.prefill.suggested) + ' kcal</b></span><button class="btn btn-gold btn-sm" data-x="usefill">' + esc(t('common.apply')) + '</button></div>';
        }

        /* Step 1 */
        w += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('energy.step1')) + '</h2><span class="chip line">' + esc(t('energy.formula')) + ': ' + esc(c.bmr.formula || '') + '</span></div>' +
          '<div class="form-grid-3">' +
          field(t('energy.equation'), '<select class="select" id="enMethod">' + CN.engine.BMR_METHODS.map(m => '<option value="' + m.id + '"' + (st.method === m.id ? ' selected' : '') + (m.needsDevice && !p.deviceBmr ? ' disabled' : '') + '>' + esc(t('energy.eq.' + m.id)) + '</option>').join('') + '</select>') +
          field(t('energy.weightBasis'), '<select class="select" id="enBasis"><option value="current"' + (st.weightBasis === 'current' ? ' selected' : '') + '>' + esc(t('energy.weightBasis.current')) + ' (' + CN.fmt.kg(c.weightRaw) + ' kg)</option><option value="adjusted"' + (st.weightBasis === 'adjusted' ? ' selected' : '') + '>' + esc(t('energy.weightBasis.adjusted')) + '</option></select>') +
          (st.method === 'device' ? field(t('np.deviceBmr'), '<input class="input" type="number" id="enDevice" value="' + esc(p.deviceBmr || '') + '"/>') : '') +
          '</div>' +
          ((st.method === 'katch' || st.method === 'cunningham') && !isFinite(c.bf) ? '<div class="alert warn">' + CN.icon('alert') + '<div>' + esc(t('energy.eq.katch')) + ' — ' + esc(t('bc.bodyFat')) + ': ' + esc(t('common.notSet')) + '</div></div>' : '') +
          (st.method === 'device' ? '<p class="cite">' + esc(t('energy.eq.deviceNote')) + '</p>' : '') +
          '<div class="divider"></div>' +
          '<div class="flex"><div class="measure-box grow"><div class="mb-label">' + esc(c.bmr.measured ? t('energy.bmrDeviceResult') : t('energy.bmrResult')) + '</div><div class="mb-value">' + CN.fmt.kcal(c.bmr.value) + ' <span class="small muted">kcal</span></div><div class="mb-sub">' + esc(c.bmr.formula || '') + '</div></div>' +
          '<div class="measure-box grow"><div class="mb-label">' + esc(t('energy.step2')) + '</div><div class="mb-value">' + CN.fmt.kcal(c.tdee) + ' <span class="small muted">kcal</span></div><div class="mb-sub">' + esc(t('energy.factorUsed')) + ': ×' + c.factor + '</div></div></div>' +
          '</div>';

        /* Step 2 */
        w += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('energy.step2')) + '</h2></div>' +
          '<div class="form-grid-2">' +
          field(t('np.activityLevel'), '<select class="select" id="enActivity">' + CN.engine.ACTIVITY.map(a => '<option value="' + a.id + '"' + (st.activity === a.id ? ' selected' : '') + '>' + esc(t('activity.' + a.id)) + ' (×' + a.factor + ')</option>').join('') + '<option value="custom"' + (st.activity === 'custom' ? ' selected' : '') + '>' + esc(t('energy.customFactor')) + '</option></select>') +
          (st.activity === 'custom' ? field(t('energy.customFactor'), '<input class="input" type="number" step="0.01" id="enFactor" value="' + esc(st.customFactor || '') + '" placeholder="1.375"/>') : '') +
          '</div>' +
          '<p class="small muted">' + esc(t('energy.tdeeNote')) + '</p></div>';

        /* Step 3 */
        w += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('energy.step3')) + '</h2></div>' +
          '<div class="seg mb-2" id="enGoal">' + ['loss', 'maintain', 'gain', 'therapeutic'].map(g => '<button data-g="' + g + '" class="' + (st.goal === g ? 'on' : '') + '">' + esc(t('goal.' + g)) + '</button>').join('') + '</div>';

        if (st.goal === 'loss' || st.goal === 'gain') {
          const opts = c.sug.options;
          if (!opts.length) {
            w += '<div class="alert danger">' + CN.icon('alert') + '<div>' + esc(t(c.sug.flags.length && c.sug.flags[0].key ? c.sug.flags[0].key : 'energy.noSafety')) + '</div></div>';
          } else {
            w += '<div class="section-title">' + esc(st.goal === 'loss' ? t('energy.deficitTitle') : t('energy.surplusTitle')) + '</div><div class="grid grid-3">' + opts.map(o => {
              const on = (st.customDelta === '' && (st.optionId || c.sug.recommended) === o.id);
              const warns = o.warns || [];
              return '<button class="card pad-sm" data-opt="' + o.id + '" style="text-align:start;cursor:pointer;border-color:' + (on ? 'var(--gold)' : 'var(--line)') + '">' +
                '<div class="flex"><b>' + esc(t('energy.opt.' + o.id)) + '</b>' + (on ? '<span class="chip gold">✓</span>' : '') + '</div>' +
                '<div class="k-value" style="font-size:20px">' + CN.fmt.kcal(o.kcal) + ' <span class="xsmall muted">kcal ' + esc(st.goal === 'loss' ? '−' : '+') + '</span></div>' +
                '<div class="small muted">' + esc(t('energy.resultTarget')) + ': <b>' + CN.fmt.kcal(o.target) + '</b></div>' +
                (warns.length ? '<div class="chip burg mt-1">' + esc(t('energy.reviewRequired')) + '</div>' : '') +
                '</button>';
            }).join('') + '</div>';
            w += field(t('energy.manualAdjust'), '<input class="input" type="number" id="enCustomDelta" value="' + esc(st.customDelta) + '" placeholder="' + esc(st.goal === 'loss' ? '450' : '400') + '" style="max-width:200px"/>');
          }
        } else if (st.goal === 'maintain') {
          w += '<p class="small muted">' + esc(t('energy.transferNote')) + '</p>';
        } else {
          w += field(t('energy.resultTarget'), '<input class="input" type="number" id="enCustomDelta" value="' + esc(st.customDelta) + '" style="max-width:200px"/>');
        }

        if (target) {
          const delta = st.goal === 'loss' || st.goal === 'gain' ? Math.abs(c.tdee - target) : (c.tdee - target);
          const rate = st.goal === 'loss' ? CN.engine.rate(delta, 'loss') : st.goal === 'gain' ? CN.engine.rate(delta, 'gain') : 0;
          w += '<div class="divider"></div><div class="flex flex-wrap">' +
            '<div class="measure-box grow"><div class="mb-label">' + esc(t('energy.resultTarget')) + '</div><div class="mb-value" style="font-size:26px">' + CN.fmt.kcal(target) + ' <span class="small muted">kcal/day</span></div></div>' +
            '<div class="measure-box grow"><div class="mb-label">' + esc(t('energy.estimatedRate')) + '</div><div class="mb-value" style="font-size:26px">' + (st.goal === 'maintain' ? esc(t('energy.rateMaintain')) : esc(t('energy.rateVal', { v: n2(Math.abs(rate)) }))) + '</div></div>' +
            '<div class="measure-box grow"><div class="mb-label">BMR / TDEE / ' + esc(t('builder.target')) + '</div><div class="mb-value" style="font-size:15px">' + CN.fmt.kcal(c.bmr.value) + ' / ' + CN.fmt.kcal(c.tdee) + ' / ' + CN.fmt.kcal(target) + '</div><div class="mb-sub">kcal</div></div>' +
            '</div>';

          const flags = (c.sug.flags || []).filter(f => st.goal !== 'maintain');
          const specFlags = (st.goal === 'loss' || st.goal === 'gain') && st.customDelta !== '' ? CN.engine.safetyFor({ patient: p, bmr: c.bmr.value, tdee: c.tdee, target, goal: st.goal }) : (function () {
            const opt = (c.sug.options || []).find(o => o.id === (st.optionId || c.sug.recommended));
            return (opt && opt.warns || []).slice();
          })();
          const allFlags = flags.concat(specFlags);
          if (allFlags.length) {
            w += '<div class="section-title">' + esc(t('energy.safetyFlags')) + '</div><div class="flag-list">' + allFlags.map(f => CN.ui.flag(f.level, esc(f.key ? t(f.key) : f.text))).join('') + '</div>';
          } else {
            w += '<p class="small muted">' + esc(t('energy.noSafety')) + '</p>';
          }
          w += '<p class="cite">' + esc(t('energy.approveHint')) + '</p>';
        }
        w += '</div>';

        /* Step 4 — macros + approve */
        if (target) {
          const apx = st.goal === 'gain' ? ['highprotein'] : (CN.views.builder && CN.views.builder._approachIds ? CN.views.builder._approachIds : []);
          const mac = CN.engine.macros({ patient: p, target, approachIds: apx, goal: st.goal, override: st.overrides });
          w += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('energy.step4')) + '</h2><span class="small muted">' + esc(t('macro.recalcHint')) + '</span></div>' +
            '<div class="grid grid-4">' +
            macroBox('macro.protein', mac.pG, mac.p + '%', 'p') +
            macroBox('macro.carbs', mac.cG, mac.c + '%', 'c') +
            macroBox('macro.fat', mac.fG, mac.f + '%', 'f') +
            '<div class="measure-box"><div class="mb-label">' + esc(t('macro.fiber')) + ' / ' + esc(t('macro.sodium')) + '</div><div class="mb-value" style="font-size:15px">' + mac.fiber + ' g / ' + CN.fmt.n0(mac.sodium) + ' mg</div><div class="mb-sub">' + esc(t('macro.fluids')) + ': ' + CN.fmt.n0(mac.fluids) + ' ml</div></div>' +
            '</div>' +
            '<div class="form-grid-3 mt-2">' +
            field(t('macro.protein') + ' %', '<input class="input" type="number" id="mP" value="' + mac.p + '"/>') +
            field(t('macro.carbs') + ' %', '<input class="input" type="number" id="mC" value="' + mac.c + '"/>') +
            field(t('macro.fat') + ' %', '<input class="input" type="number" id="mF" value="' + mac.f + '"/>') +
            '</div><p class="cite">' + esc(t('macro.canEdit')) + '</p>' +
            '<div class="divider"></div>' +
            '<div class="flex" style="justify-content:flex-end"><button class="btn btn-primary btn-lg" data-x="approve">' + CN.icon('check') + esc(t('energy.approveTarget')) + '</button></div>' +
            '</div>';
        }

        wrap.innerHTML = w;
        bindWizard(c, target);
        if (st.prefill) wrap.querySelector('[data-x=usefill]').onclick = () => { st.customDelta = String(Math.abs(c.tdee - st.prefill.suggested)); st.optionId = null; st.prefill = null; renderWizard(); };

        function macroBox(labelKey, grams, pct, mk) {
          return '<div class="measure-box"><div class="mb-label">' + esc(t(labelKey)) + '</div><div class="mb-value">' + CN.fmt.n0(grams) + ' g</div><div class="mb-sub">' + pct + ' ' + esc(t('macro.ofCalories')) + '</div></div>';
        }
      }

      function bindWizard(c, target) {
        const $ = s => root.querySelector(s);
        const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
        on('#enMethod', 'change', e => { st.method = e.target.value; renderWizard(); });
        on('#enBasis', 'change', e => { st.weightBasis = e.target.value; renderWizard(); });
        on('#enDevice', 'change', e => { p.deviceBmr = CN.util.parseNum(e.target.value); CN.store.savePatient(p); renderWizard(); });
        on('#enActivity', 'change', e => { st.activity = e.target.value; renderWizard(); });
        on('#enFactor', 'input', CN.util.debounce(e => { st.customFactor = e.target.value; renderWizard(); }, 400));
        on('#enCustomDelta', 'input', CN.util.debounce(e => { st.customDelta = e.target.value; renderWizard(); }, 500));
        root.querySelectorAll('#enGoal [data-g]').forEach(b => b.onclick = () => { st.goal = b.getAttribute('data-g'); st.customDelta = ''; renderWizard(); });
        root.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { st.optionId = b.getAttribute('data-opt'); st.customDelta = ''; renderWizard(); });
        on('#mP', 'input', CN.util.debounce(e => { st.overrides = Object.assign({}, st.overrides, { mode: 'percent', p: CN.util.parseNum(e.target.value) }); renderWizard(); }, 500));
        on('#mC', 'input', CN.util.debounce(e => { st.overrides = Object.assign({}, st.overrides, { mode: 'percent', c: CN.util.parseNum(e.target.value) }); renderWizard(); }, 500));
        on('#mF', 'input', CN.util.debounce(e => { st.overrides = Object.assign({}, st.overrides, { mode: 'percent', f: CN.util.parseNum(e.target.value) }); renderWizard(); }, 500));

        const ab = root.querySelector('[data-x=approve]');
        if (ab) ab.onclick = async () => {
          if (!target) return;
          const mac = CN.engine.macros({ patient: p, target, approachIds: [], goal: st.goal, override: st.overrides });
          const flagsAll = (c.sug.flags || []).map(f => f.text || t(f.key)).concat(CN.engine.safetyFor({ patient: p, bmr: c.bmr.value, tdee: c.tdee, target, goal: st.goal }).map(f => f.text || t(f.key)));
          const delta = Math.abs(c.tdee - target);
          const rec = {
            patientId: p.id, date: CN.util.todayISO(),
            equation: st.method, weightBasis: c.weight, bmr: c.bmr.value, activity: st.activity, factor: c.factor, tdee: c.tdee,
            goal: st.goal,
            deficit: st.goal === 'loss' ? delta : 0, surplus: st.goal === 'gain' ? delta : 0,
            deficitLabel: st.customDelta !== '' ? 'custom' : (st.optionId || c.sug.recommended || 'custom'),
            surplusLabel: st.customDelta !== '' ? 'custom' : (st.optionId || c.sug.recommended || 'custom'),
            target: Math.round(target),
            macros: { mode: mac.mode, p: mac.p, c: mac.c, f: mac.f, proteinPerKg: mac.proteinPerKg, fiber: mac.fiber, sodium: mac.sodium, fluids: mac.fluids },
            safety: { level: flagsAll.length ? 'mid' : 'low', flags: flagsAll },
            explanation: (t('energy.deficitNote') + ' ' + t('energy.rateVal', { v: n2(Math.abs(st.goal === 'maintain' ? 0 : CN.engine.rate(delta, st.goal === 'loss' ? 'loss' : 'gain'))) })).trim(),
            status: 'approved', approvedAt: CN.util.nowISO()
          };
          /* supersede previous approved plans' approval (history preserved) */
          await CN.store.save('energy', rec);
          CN.toast(t('energy.approvedOk'));
          renderHistory();
        };
      }

      function renderHistory() {
        const list = CN.store.list('energy', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
        const host = root.querySelector('#energyHistory');
        if (!list.length) { host.innerHTML = '<p class="muted small">—</p>'; return; }
        host.innerHTML = '<div class="table-scroll"><table class="table"><thead><tr><th>' + t('common.date') + '</th><th>BMR</th><th>TDEE</th><th>' + t('energy.resultTarget') + '</th><th>' + t('common.status') + '</th></tr></thead><tbody>' +
          list.map(e => '<tr><td>' + esc(CN.fmt.date(e.date)) + '</td><td>' + CN.fmt.kcal(e.bmr) + '</td><td>' + CN.fmt.kcal(e.tdee) + '</td><td><b>' + CN.fmt.kcal(e.target) + '</b> kcal</td><td>' + CN.ui.statusPill(e.status) + '</td></tr>').join('') +
          '</tbody></table></div>';
      }

      function field(label, inputHtml) { return '<div class="field"><label>' + esc(label) + '</label>' + inputHtml + '</div>'; }
    }
  };

  /* ================= Body Composition ================= */
  CN.views.bodycomp = {
    render(root) {
      const p = CN.app.patient();
      let h = CN.vh.pageHead('bc.title', 'bc.sub',
        p ? '<button class="btn btn-primary" data-act="add">' + CN.icon('plus') + esc(t('bc.record')) + '</button>' : '');
      if (!p) { root.innerHTML = h + '<div class="card">' + CN.vh.needPatient('energy.noPatientText') + '</div>'; bindSimple(root); return; }

      const list = CN.store.list('measurements', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
      const series = list.slice().sort((a, b) => (a.date > b.date ? 1 : -1));

      h += '<div class="grid grid-2-1">';
      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('bc.chart')) + '</h2>' +
        '<select class="select" id="bcMetric" style="width:170px">' +
        ['weight', 'bodyFat', 'muscle', 'visceral', 'waist'].map(m => '<option value="' + m + '"' + ((this._metric || 'weight') === m ? ' selected' : '') + '>' + esc(t(m === 'weight' ? 'bc.weight' : m === 'bodyFat' ? 'bc.bodyFat' : m === 'muscle' ? 'bc.muscle' : m === 'visceral' ? 'bc.visceral' : 'bc.waist')) + '</option>').join('') +
        '</select></div><div id="bcChart"></div></div>';
      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('bc.history')) + '</h2></div>';
      if (!list.length) h += CN.ui.empty(t('patient.noMeas'), '', '', 'activity');
      else {
        h += '<div class="table-scroll"><table class="table"><thead><tr><th>' + t('common.date') + '</th><th>' + t('bc.weight') + '</th><th>' + t('bc.bodyFat') + '</th><th>' + t('bc.muscle') + '</th><th>' + t('bc.visceral') + '</th><th>' + t('bc.waist') + '</th><th>' + t('bc.source') + '</th><th></th></tr></thead><tbody>';
        list.forEach(m => {
          h += '<tr><td>' + esc(CN.fmt.date(m.date)) + '</td><td>' + CN.fmt.n1(m.weight) + '</td><td>' + CN.fmt.n1(m.bodyFatPct) + '</td><td>' + CN.fmt.n1(m.muscleKg) + '</td><td>' + CN.fmt.n1(m.visceral) + '</td><td>' + CN.fmt.n1(m.waistCm) + '</td>' +
            '<td class="muted small">' + esc(t('bc.source.' + (m.source || 'device'))) + '</td>' +
            '<td class="actions"><button class="btn btn-icon btn-quiet" data-del="' + m.id + '">' + CN.icon('trash') + '</button></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div></div>';

      /* compare */
      h += '<div>';
      if (list.length >= 2) {
        h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('bc.compareSel')) + '</h3></div><div id="bcDeltas"></div></div>';
      }
      h += '<div class="card"><div class="card-h"><h3>' + esc(t('np.section.measure')) + '</h3></div>' +
        CN.vh.kv([
          [t('bc.weight'), CN.fmt.kg(CN.store.currentWeight(p)) + ' kg'],
          [t('np.targetWeight'), CN.fmt.kg(p.targetWeight) + ' kg'],
          [t('np.bodyFat'), p.bodyFatPct ? CN.fmt.n1(p.bodyFatPct) + ' %' : '—'],
          [t('np.muscle'), p.muscleKg ? CN.fmt.n1(p.muscleKg) + ' kg' : '—'],
          [t('np.visceral'), p.visceralFat ? CN.fmt.n1(p.visceralFat) : '—'],
          [t('np.tbw'), p.tbwKg ? CN.fmt.n1(p.tbwKg) + ' kg' : '—'],
          [t('np.waist'), p.waistCm ? CN.fmt.n1(p.waistCm) + ' cm' : '—'],
          [t('patient.whr'), (function () { const v = CN.engine.whr(p.waistCm, p.hipCm); return isFinite(v) ? (Math.round(v * 100) / 100) + ' · ' + t('assess.' + (CN.engine.whrRisk(v, p.sex).key === 'high' ? 'high' : 'normal')) : '—'; })()]
        ]) + '</div>';
      h += '</div></div>';

      root.innerHTML = h;
      this._root = root;
      const self = this;
      root.querySelector('[data-act=add]').onclick = () => openMeasureModal(p, () => CN.app.renderCurrent());
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await CN.modal.confirm({ message: t('common.delete') + '?', danger: true })) {
          await CN.store.remove('measurements', b.getAttribute('data-del'));
          CN.app.renderCurrent();
        }
      });
      const met = root.querySelector('#bcMetric');
      if (met) met.onchange = () => { self._metric = met.value; drawChart(); };
      drawChart();
      if (list.length >= 2) renderCompare();
      bindSimple(root);

      function drawChart() {
        const metric = self._metric || 'weight';
        const host = root.querySelector('#bcChart');
        if (!host) return;
        let pts = [];
        let name = '', color = '#14213D';
        if (metric === 'weight') { pts = CN.engine.progressSeries(p, CN.store.list('followups', { patientId: p.id })).map(s => ({ x: s.date, y: s.kg })); name = t('bc.weight'); }
        else {
          const key = metric === 'bodyFat' ? 'bodyFatPct' : metric === 'muscle' ? 'muscleKg' : metric === 'visceral' ? 'visceral' : 'waistCm';
          pts = series.filter(m => isFinite(CN.util.parseNum(m[key]))).map(m => ({ x: m.date, y: CN.util.parseNum(m[key]) }));
          name = t(metric === 'bodyFat' ? 'bc.bodyFat' : metric === 'muscle' ? 'bc.muscle' : metric === 'visceral' ? 'bc.visceral' : 'bc.waist');
          color = metric === 'bodyFat' ? '#800020' : metric === 'muscle' ? '#C6A667' : '#14213D';
        }
        host.innerHTML = pts.length >= 2 ? CN.chart.line({ series: [{ name, color, area: true, points: pts }], height: 230, yFmt: v => CN.fmt.n1(v), xFmt: d => CN.fmt.date(d) }) : '<p class="muted small">' + esc(t('fu.needTwo')) + '</p>';
      }

      function renderCompare() {
        const host = root.querySelector('#bcDeltas');
        const opts = list.map((m, i) => '<option value="' + i + '">' + esc(CN.fmt.date(m.date)) + '</option>').join('');
        host.innerHTML = '<div class="form-grid-2"><div class="field"><label>' + esc(t('fu.compareA')) + '</label><select class="select" id="bcA">' + opts + '</select></div>' +
          '<div class="field"><label>' + esc(t('fu.compareB')) + '</label><select class="select" id="bcB">' + opts + '</select></div></div><div id="bcDeltaBody"></div>';
        const selA = host.querySelector('#bcA'), selB = host.querySelector('#bcB');
        selB.selectedIndex = Math.min(1, list.length - 1);
        function render() {
          const a = list[+selA.value], b = list[+selB.value];
          const rows = [['weight', t('bc.weight')], ['bodyFatPct', t('bc.bodyFat')], ['muscleKg', t('bc.muscle')], ['visceral', t('bc.visceral')], ['waistCm', t('bc.waist')]];
          host.querySelector('#bcDeltaBody').innerHTML = '<table class="table" style="min-width:0"><thead><tr><th></th><th>' + esc(CN.fmt.date(a.date)) + '</th><th>' + esc(CN.fmt.date(b.date)) + '</th><th>Δ</th></tr></thead><tbody>' +
            rows.map(r2 => {
              const va = CN.util.parseNum(a[r2[0]]), vb = CN.util.parseNum(b[r2[0]]);
              const d = (isFinite(va) && isFinite(vb)) ? vb - va : NaN;
              return '<tr><td>' + esc(r2[1]) + '</td><td>' + CN.fmt.n1(va) + '</td><td>' + CN.fmt.n1(vb) + '</td><td><b class="' + (d < 0 ? '' : '') + '">' + CN.fmt.signed(d) + '</b></td></tr>';
            }).join('') + '</tbody></table>';
        }
        selA.onchange = render; selB.onchange = render; render();
      }
    }
  };

  function openMeasureModal(patient, onSaved) {
    const existingBF = patient.bodyFatPct || '';
    const m = CN.modal.open({
      title: t('bc.record'), sub: patient.fullName, wide: true,
      foot: '<button class="btn btn-ghost" data-x="cancel">' + esc(t('common.cancel')) + '</button>' +
            '<button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(t('common.save')) + '</button>',
      body: '<div class="form-grid-3">' +
        f('bc weight', '<input class="input" type="number" step="0.1" id="mcW" value="' + CN.fmt.kg(CN.store.currentWeight(patient)) + '"/>', t('bc.weight')) +
        f('bf', '<input class="input" type="number" step="0.1" id="mcBF" value="' + esc(existingBF) + '"/>', t('bc.bodyFat')) +
        f('mu', '<input class="input" type="number" step="0.1" id="mcM" value="' + esc(patient.muscleKg || '') + '"/>', t('bc.muscle')) +
        f('vis', '<input class="input" type="number" step="0.1" id="mcV" value="' + esc(patient.visceralFat || '') + '"/>', t('bc.visceral')) +
        f('tbw', '<input class="input" type="number" step="0.1" id="mcT" value="' + esc(patient.tbwKg || '') + '"/>', t('bc.tbw')) +
        f('waist', '<input class="input" type="number" step="0.1" id="mcWa" value="' + esc(patient.waistCm || '') + '"/>', t('bc.waist')) +
        f('hip', '<input class="input" type="number" step="0.1" id="mcH" value="' + esc(patient.hipCm || '') + '"/>', t('bc.hip')) +
        f('bmr', '<input class="input" type="number" id="mcB" value="' + esc(patient.deviceBmr || '') + '"/>', t('bc.bmrDevice')) +
        f('src', '<select class="select" id="mcS"><option value="device">' + esc(t('bc.source.device')) + '</option><option value="clinic">' + esc(t('bc.source.clinic')) + '</option><option value="patient">' + esc(t('bc.source.patient')) + '</option></select>', t('bc.source')) +
        '</div>' +
        '<div class="field"><label>' + esc(t('bc.notes')) + '</label><input class="input" id="mcN"/></div>' +
        '<div class="field" style="max-width:220px"><label>' + esc(t('fu.date')) + '</label><input class="input" type="date" id="mcD" value="' + CN.util.todayISO() + '"/></div>',
      onMount(box, modal) {
        box.querySelector('[data-x=cancel]').onclick = () => modal.close();
        box.querySelector('[data-x=save]').onclick = async () => {
          const g = id => CN.util.parseNum(box.querySelector(id).value);
          const date = box.querySelector('#mcD').value || CN.util.todayISO();
          const rec = {
            patientId: patient.id, date,
            weight: g('#mcW'), bodyFatPct: g('#mcBF'), muscleKg: g('#mcM'), visceral: g('#mcV'), tbwKg: g('#mcT'),
            waistCm: g('#mcWa'), hipCm: g('#mcH'), bmrDevice: g('#mcB'),
            source: box.querySelector('#mcS').value, notes: box.querySelector('#mcN').value.trim()
          };
          await CN.store.save('measurements', rec);
          /* sync latest values onto the patient record */
          if (isFinite(rec.weight)) await CN.store.appendWeight(patient, rec.weight, date, rec.source);
          ['bodyFatPct', 'muscleKg', 'visceralFat', 'tbwKg', 'waistCm', 'hipCm', 'deviceBmr'].forEach(k => {
            const src = { bodyFatPct: 'bodyFatPct', muscleKg: 'muscleKg', visceralFat: 'visceral', tbwKg: 'tbwKg', waistCm: 'waistCm', hipCm: 'hipCm', deviceBmr: 'bmrDevice' }[k];
            const v = rec[src];
            if (isFinite(v) && v !== 0) patient[k] = v;
          });
          await CN.store.savePatient(patient);
          CN.toast(t('bc.saved'));
          modal.close();
          if (onSaved) onSaved();
        };
      }
    });
    function f(cls, input, label) { return '<div class="field"><label>' + esc(label) + '</label>' + input + '</div>'; }
  }

  console.log('NutriClinic views-clinical.js loaded');
})();
