/* ============================================================
   NutriClinic Pro — views-core.js
   Shared view helpers + Dashboard, Patients, New Patient,
   and the comprehensive patient-record drawer.
   ============================================================ */
'use strict';
(function () {

  const T = () => CN.util;
  const t = (k, v) => CN.i18n.t(k, v);
  const esc = CN.util.esc;

  /* ============ shared helpers ============ */
  const vh = CN.vh = {
    pageHead(titleKey, subKey, rightHtml) {
      return '<div class="page-head"><div class="ttl"><h1>' + esc(t(titleKey)) + '</h1>' + (subKey ? '<div class="sub">' + esc(t(subKey)) + '</div>' : '') + '</div>' + (rightHtml ? '<div class="page-actions">' + rightHtml + '</div>' : '') + '</div>';
    },
    chips(arr, cls) { return (arr || []).map(a => '<span class="tag ' + (cls || '') + '">' + esc(a) + '</span>').join(' '); },
    kv(pairs) {
      return '<dl class="kv">' + pairs.map(p => '<dt>' + esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : esc(p[1] || '—')) + '</dd>').join('') + '</dl>';
    },
    needPatient(msgKey) {
      return CN.ui.empty(t('common.noPatient'), t(msgKey || 'common.selectPatientFirst'), '<button class="btn btn-primary" data-act="goto-patients">' + CN.icon('users') + esc(t('nav.patients')) + '</button>', 'user');
    },
    activePatient() { return CN.app.patient(); },
    nextFU(patientId) {
      const fus = CN.store.list('followups', { patientId });
      if (!fus.length) return null;
      const sorted = fus.sort((a, b) => (a.date < b.date ? 1 : -1));
      const withNext = sorted.find(f => f.nextDate);
      return withNext ? withNext.nextDate : null;
    },
    fuChip(dateStr) {
      if (!dateStr) return '<span class="muted small">—</span>';
      const today = CN.util.todayISO();
      const diff = CN.util.daysBetween(today, dateStr);
      if (diff < 0) return '<span class="status overdue">' + esc(t('dash.overdueBy', { n: -diff })) + '</span>';
      if (diff === 0) return '<span class="status upcoming">' + esc(t('dash.today')) + '</span>';
      return '<span class="status upcoming">' + esc(t('dash.dueIn', { n: diff })) + '</span>';
    },
    bmiOf(patient) { return CN.engine.bmi(CN.store.currentWeight(patient), patient.heightCm); },
    goalChip(goal) { return '<span class="chip">' + esc(t('goal.' + (goal || 'therapeutic') + '.short')) + '</span>'; },
    avatar(name, cls) { return '<span class="avatar ' + (cls || '') + '">' + esc(CN.util.initials(name)) + '</span>'; },

    openDrawer(patientId, startTab) {
      const patient = CN.store.getPatient(patientId);
      if (!patient) return;
      const state = { tab: startTab || 'overview', patient };
      const head = document.createElement('div');
      head.className = 'spread w-100';
      const bodyEl = document.createElement('div');

      const d = CN.drawer.open({
        head: head,
        body: bodyEl,
        onMount() { render(); }
      });

      function render() {
        const p = state.patient;
        head.innerHTML =
          '<div class="flex grow">' + vh.avatar(p.fullName, 'lg') +
          '<div><h3>' + esc(p.fullName) + ' <span class="muted small">' + esc(p.id) + '</span></h3>' +
          '<div class="small muted">' + (p.dob ? CN.util.ageFrom(p.dob).years + ' y · ' : '') + esc(t(p.sex === 'male' ? 'common.male' : 'common.female')) +
          ' · BMI ' + CN.fmt.n1(vh.bmiOf(p)) + ' · ' + esc(t('bmi.' + CN.engine.bmiCat(vh.bmiOf(p)).key)) + '</div></div></div>' +
          '<div class="flex">' +
          '<button class="btn btn-ghost btn-sm" data-x="edit">' + CN.icon('edit') + esc(t('patient.edit')) + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-x="setactive">' + CN.icon('target') + esc(t('topbar.activePatient')) + '</button>' +
          '<button class="modal-x" data-x="close">' + CN.icon('close') + '</button></div>';
        head.querySelector('[data-x=close]').onclick = () => d.close();
        head.querySelector('[data-x=setactive]').onclick = () => { CN.app.setPatient(p.id); CN.toast(t('common.saved')); };
        head.querySelector('[data-x=edit]').onclick = () => vh.patientFormModal(p, saved => { state.patient = saved; render(); CN.bus.emit('data-changed'); });

        const tabs = [['overview', t('patient.overview')], ['labs', t('patient.labs')], ['measure', t('patient.measure')], ['plans', t('patient.plans')], ['fus', t('patient.fus')], ['files', t('patient.files')]];
        let h = '<div class="tabs">' + tabs.map(tb => '<button class="tab' + (state.tab === tb[0] ? ' on' : '') + '" data-tab="' + tb[0] + '">' + esc(tb[1]) + '</button>').join('') + '</div>';
        h += '<div id="drawer-panel">' + panel(state.tab, p) + '</div>';
        bodyEl.innerHTML = h;
        bodyEl.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.getAttribute('data-tab'); render(); });
        bindPanel(bodyEl, p);
      }

      function panel(tab, p) {
        if (tab === 'overview') return overviewPanel(p);
        if (tab === 'labs') return labsPanel(p);
        if (tab === 'measure') return measurePanel(p);
        if (tab === 'plans') return plansPanel(p);
        if (tab === 'fus') return fusPanel(p);
        if (tab === 'files') return filesPanel(p);
        return '';
      }

      function overviewPanel(p) {
        const cw = CN.store.currentWeight(p);
        const bmi = vh.bmiOf(p);
        const whrV = CN.engine.whr(p.waistCm, p.hipCm);
        const energy = CN.store.list('energy', { patientId: p.id }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0];
        const fus = CN.store.list('followups', { patientId: p.id });
        const prog = CN.engine.analyzeProgress(p, fus, energy);
        let h = '<div class="grid grid-2">';
        h += '<div class="card pad-sm"><div class="card-h"><h3>' + esc(t('np.section.personal')) + '</h3></div>' + vh.kv([
          [t('np.phone'), p.phone], [t('np.email'), p.email], [t('np.occupation'), p.occupation],
          [t('np.regDate'), CN.fmt.date(p.regDate)], [t('np.emergency'), p.emergency]
        ]) + '</div>';
        h += '<div class="card pad-sm"><div class="card-h"><h3>' + esc(t('np.section.measure')) + '</h3></div>' +
          '<div class="measure-grid">' +
          box(t('bc.weight'), CN.fmt.kg(cw), '') +
          box('BMI', CN.fmt.n1(bmi), t('bmi.' + CN.engine.bmiCat(bmi).key)) +
          box(t('np.targetWeight'), CN.fmt.kg(p.targetWeight), p.targetWeight && cw ? CN.fmt.signed(cw - p.targetWeight) + ' kg' : '') +
          box(t('np.bodyFat'), p.bodyFatPct ? CN.fmt.n1(p.bodyFatPct) + '%' : '—', '') +
          box(t('np.waist'), p.waistCm ? CN.fmt.n1(p.waistCm) : '—', isFinite(whrV) ? 'WHR ' + (Math.round(whrV * 100) / 100) : '') +
          '</div>';
        h += '</div>';
        h += '</div>';

        let chips = '';
        (p.conditions || []).forEach(c => chips += '<span class="chip burg">' + esc(c) + '</span> ');
        (p.allergies || []).forEach(a => { if (a.type !== 'note') chips += '<span class="chip gold">' + esc(a.name) + '</span> '; });
        (p.intolerances || []).forEach(a => chips += '<span class="chip gray">' + esc(a.name) + '</span> ');
        if (chips) h += '<div class="card pad-sm mt-2"><div class="card-h"><h3>' + esc(t('np.section.medical')) + '</h3><button class="btn btn-quiet btn-sm" data-x="goto" data-view="assessment">' + esc(t('patient.labs')) + '</button></div><div class="tag-list">' + chips + '</div>' +
          ((p.medications || []).length ? '<div class="small muted mt-2">' + t('patient.medicationSchedule') + ': ' + esc(p.medications.map(m => m.name + ' ' + (m.dose || '') + (m.freq ? ' · ' + m.freq : '')).join('; ')) + '</div>' : '') + '</div>';

        if (prog.n >= 2) {
          h += '<div class="card pad-sm mt-2"><div class="card-h"><h3>' + esc(t('fu.progress')) + '</h3><span class="chip line">' + esc(t('goal.' + (p.goal || 'therapeutic') + '.short')) + '</span></div>' +
            '<div class="grid grid-3">' +
            box(t('fu.totalChange'), CN.fmt.signed(prog.total) + ' kg', CN.fmt.signed(prog.pct) + '%') +
            box(t('fu.avgWeekly'), CN.fmt.signed(prog.avgWeekly) + ' kg', '') +
            box(t('energy.approvedTarget'), energy ? CN.fmt.kcal(energy.target) : '—', 'kcal/day') +
            '</div>' +
            '<div class="mt-2">' + CN.chart.line({ series: [{ name: t('bc.weight'), color: '#14213D', points: prog.series.map(s => ({ x: s.date, y: s.kg })), area: true }], height: 190, yFmt: v => CN.fmt.n1(v), xFmt: d => CN.fmt.date(d) }) + '</div></div>';
        }

        if (p.custom && Object.keys(p.custom).length) {
          const fields = CN.store.settings.customFields || [];
          h += '<div class="card pad-sm mt-2"><div class="card-h"><h3>' + esc(t('np.section.custom')) + '</h3></div>' + vh.kv(Object.keys(p.custom).map(k => {
            const f = fields.find(x => x.id === k);
            return [f ? (CN.i18n.lang() === 'ar' && f.labelAr ? f.labelAr : f.label) : k, p.custom[k]];
          })) + '</div>';
        }
        return h;
      }

      function box(label, value, sub) { return '<div class="measure-box"><div class="mb-label">' + esc(label) + '</div><div class="mb-value">' + esc(value) + '</div><div class="mb-sub">' + esc(sub || '') + '</div></div>'; }

      function labsPanel(p) {
        const list = CN.store.list('assessments', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
        let h = '<div class="spread mb-2"><span class="muted small">' + list.length + ' ' + esc(t('builder.day') + 's') + '</span><button class="btn btn-ghost btn-sm" data-x="goto" data-view="assessment">' + CN.icon('stethoscope') + esc(t('patient.labs')) + '</button></div>';
        if (!list.length) return h + CN.ui.empty(t('patient.noLabs'), '', '', 'stethoscope');
        h += list.slice(0, 4).map(a => {
          let rows = (a.items || []).slice(0, 8).map(i => {
            const flag = CN.engine.labFlag(i);
            const cls = flag === 'high' ? 'burg' : flag === 'low' ? 'gold' : 'gray';
            return '<tr><td>' + esc(i.label) + '</td><td class="tnum">' + esc(i.value + ' ' + (i.unit || '')) + '</td><td>' + (flag ? '<span class="chip ' + cls + '">' + esc(t('assess.' + flag)) + '</span>' : '') + '</td></tr>';
          }).join('');
          return '<div class="card pad-sm mb-2"><div class="spread"><b class="small">' + esc(CN.fmt.date(a.date)) + (a.bp ? ' · BP ' + a.bp.sys + '/' + a.bp.dia : '') + '</b></div>' +
            '<table class="table" style="min-width:0"><tbody>' + rows + '</tbody></table>' + ((a.items || []).length > 8 ? '<div class="small muted">+' + ((a.items || []).length - 8) + '…</div>' : '') + '</div>';
        }).join('');
        return h;
      }

      function measurePanel(p) {
        const list = CN.store.list('measurements', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
        let h = '<div class="spread mb-2"><span class="muted small">' + list.length + '</span><button class="btn btn-ghost btn-sm" data-x="goto" data-view="bodycomp">' + CN.icon('activity') + esc(t('bc.record')) + '</button></div>';
        if (!list.length) return h + CN.ui.empty(t('patient.noMeas'), '', '', 'activity');
        const series = list.slice().sort((a, b) => (a.date > b.date ? 1 : -1));
        h += '<div class="mb-2">' + CN.chart.line({ series: [
          { name: t('bc.bodyFat') + ' %', color: '#800020', points: series.filter(x => x.bodyFatPct).map(x => ({ x: x.date, y: x.bodyFatPct })) },
          { name: t('bc.muscle') + ' kg', color: '#C6A667', points: series.filter(x => x.muscleKg).map(x => ({ x: x.date, y: x.muscleKg })) }
        ], height: 200, yFmt: v => CN.fmt.n1(v), xFmt: d => CN.fmt.date(d) }) + '</div>';
        h += '<div class="table-scroll"><table class="table"><thead><tr><th>' + t('common.date') + '</th><th>' + t('bc.weight') + '</th><th>' + t('bc.bodyFat') + '</th><th>' + t('bc.muscle') + '</th><th>' + t('bc.visceral') + '</th><th>' + t('bc.waist') + '</th></tr></thead><tbody>' +
          list.map(m => '<tr><td>' + esc(CN.fmt.date(m.date)) + '</td><td>' + CN.fmt.n1(m.weight) + '</td><td>' + CN.fmt.n1(m.bodyFatPct) + '</td><td>' + CN.fmt.n1(m.muscleKg) + '</td><td>' + CN.fmt.n1(m.visceral) + '</td><td>' + CN.fmt.n1(m.waistCm) + '</td></tr>').join('') + '</tbody></table></div>';
        return h;
      }

      function plansPanel(p) {
        const list = CN.store.list('plans', { patientId: p.id }).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        const groups = {};
        list.forEach(pl => { (groups[pl.groupId] = groups[pl.groupId] || []).push(pl); });
        let h = '<div class="spread mb-2"><span class="muted small">' + Object.keys(groups).length + ' plan group(s)</span><button class="btn btn-ghost btn-sm" data-x="goto" data-view="builder">' + CN.icon('clipboard') + esc(t('builder.title')) + '</button></div>';
        if (!list.length) return h + CN.ui.empty(t('patient.noPlan'), '', '', 'clipboard');
        h += Object.keys(groups).map(gid => {
          const vers = groups[gid].sort((a, b) => b.version - a.version);
          const v = vers[0];
          return '<div class="card pad-sm mb-2"><div class="spread"><b class="small">' + esc(v.title || t('builder.planTitle')) + '</b>' + CN.ui.statusPill(v.status) + '</div>' +
            '<div class="small muted mt-1">' + vers.length + ' version(s) · ' + esc(t('builder.version', { n: v.version })) + ' · ' + CN.fmt.kcal(v.targets.kcal) + ' kcal · ' + esc(CN.fmt.date(v.updatedAt)) + '</div></div>';
        }).join('');
        return h;
      }

      function fusPanel(p) {
        const list = CN.store.list('followups', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
        let h = '<div class="spread mb-2"><span class="muted small">' + list.length + '</span><button class="btn btn-ghost btn-sm" data-x="goto" data-view="followup">' + CN.icon('calendarCheck') + esc(t('fu.new')) + '</button></div>';
        if (!list.length) return h + CN.ui.empty(t('patient.noFU'), '', '', 'calendarCheck');
        h += list.map(f => '<div class="card pad-sm mb-2"><div class="spread"><b class="small">' + esc(CN.fmt.date(f.date)) + '</b>' + (f.nextDate ? vh.fuChip(f.nextDate) : '') + '</div>' +
          '<div class="small muted mt-1">' + t('fu.weight') + ': ' + CN.fmt.n1(f.weight) + ' kg · ' + t('fu.adherence') + ': ' + esc(t('fu.adherence.' + (f.adherence || 'good'))) + (f.feedback ? ' · ' + esc(f.feedback) : '') + '</div></div>').join('');
        return h;
      }

      function filesPanel(p) {
        const files = CN.store.listFiles({ patientId: p.id });
        let h = '<div class="spread mb-2"><span class="muted small">' + files.length + '</span>' +
          '<button class="btn btn-ghost btn-sm" data-x="upload">' + CN.icon('upload') + esc(t('common.upload')) + '</button></div>';
        if (!files.length) return h + CN.ui.empty(t('refs.noDocs'), '', '', 'folder');
        h += files.map(f => '<div class="stat-line"><span>' + CN.icon('fileText') + ' ' + esc(f.name) + ' <span class="muted small">' + CN.util.bytes(f.size) + ' · ' + esc(CN.fmt.date(f.uploadedAt)) + '</span></span>' +
          '<span class="flex"><button class="btn btn-quiet btn-sm" data-x="dl" data-id="' + f.id + '">' + esc(t('file.download')) + '</button>' +
          '<button class="btn btn-quiet btn-sm" data-x="del" data-id="' + f.id + '">' + CN.icon('trash') + '</button></span></div>').join('');
        return h;
      }

      function bindPanel(root, p) {
        root.querySelectorAll('[data-x=goto]').forEach(b => b.onclick = () => { d.close(); CN.app.setPatient(p.id); CN.app.route(b.getAttribute('data-view')); });
        const up = root.querySelector('[data-x=upload]');
        if (up) up.onclick = async () => {
          const files = await CN.util.pickFiles({ multiple: true });
          for (const f of files) {
            await CN.store.saveFile({ name: f.name, mime: f.type, size: f.size, kind: 'other', patientId: p.id, blob: f });
          }
          CN.toast(t('assess.fileAdded')); render();
        };
        root.querySelectorAll('[data-x=dl]').forEach(b => b.onclick = () => {
          const rec = CN.store.getFile(b.getAttribute('data-id'));
          if (rec && rec.blob) CN.util.download(rec.name, rec.blob);
        });
        root.querySelectorAll('[data-x=del]').forEach(b => b.onclick = async () => {
          if (await CN.modal.confirm({ message: t('file.deleteConfirm'), danger: true })) { await CN.store.removeFile(b.getAttribute('data-id')); render(); }
        });
      }
    },

    /* patient add/edit modal (also used by New Patient view) */
    patientFormModal(existing, onSaved, opts) {
      opts = opts || {};
      const isEdit = !!existing;
      const p = existing ? CN.util.deepClone(existing) : { sex: 'female', goal: 'loss', pregnancy: 'na', lifestyle: { activity: 'light', budget: 'medium' }, weights: [], custom: {} };
      const settings = CN.store.settings || {};
      const fields = settings.customFields || [];
      const m = CN.modal.open({
        title: isEdit ? t('patient.edit') : t('np.title'),
        sub: isEdit ? p.id : t('np.sub'),
        wide: true,
        foot: '<button class="btn btn-ghost" data-x="cancel">' + esc(t('common.cancel')) + '</button>' +
              '<button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(isEdit ? t('common.saveChanges') : t('np.save')) + '</button>',
        body: patientFormHTML(p, fields),
        onMount(box, m) {
          box.querySelector('[data-x=cancel]').onclick = () => m.close();
          box.querySelector('[data-x=save]').onclick = async () => {
            const err = collectPatient(box, p);
            if (err) { CN.toast(err, 'burg'); return; }
            const saved = await CN.store.savePatient(p);
            CN.toast(t('np.saved.ok', { id: saved.id }));
            m.close();
            if (onSaved) onSaved(saved);
            CN.bus.emit('data-changed');
          };
        }
      });
      return m;
    }
  };

  function ageText(dob) { const a = CN.util.ageFrom(dob); return isFinite(a.years) ? a.label : ''; }

  function patientFormHTML(p, fields) {
    const l = p.lifestyle || {};
    let h = '';
    h += '<div class="section-title">' + esc(t('np.section.personal')) + '</div><div class="form-grid-3">';
    h += f('np.fullName', text('fullName', p.fullName, 'np.fullName', true));
    h += f('np.dob', '<input class="input" type="date" data-f="dob" value="' + esc(p.dob || '') + '"/><div class="hint" data-age></div>');
    h += f('common.sex', '<select class="select" data-f="sex"><option value="female"' + (p.sex === 'female' ? ' selected' : '') + '>' + esc(t('common.female')) + '</option><option value="male"' + (p.sex === 'male' ? ' selected' : '') + '>' + esc(t('common.male')) + '</option></select>');
    h += f('np.phone', text('phone', p.phone));
    h += f('np.email', text('email', p.email));
    h += f('np.occupation', text('occupation', p.occupation));
    h += f('np.regDate', '<input class="input" type="date" data-f="regDate" value="' + esc(p.regDate || CN.util.todayISO()) + '"/>');
    h += f('np.emergency', text('emergency', p.emergency));
    h += '</div>';

    h += '<div class="section-title">' + esc(t('np.section.measure')) + '</div><div class="form-grid-3">';
    h += f('np.height', num('heightCm', p.heightCm, 'cm'));
    h += f('np.initialWeight', num('initialWeight', p.initialWeight, 'kg'));
    h += f('np.targetWeight', num('targetWeight', p.targetWeight, 'kg'));
    h += f('np.waist', num('waistCm', p.waistCm, 'cm'));
    h += f('np.hip', num('hipCm', p.hipCm, 'cm'));
    h += f('np.bodyFat', num('bodyFatPct', p.bodyFatPct, '%'));
    h += f('np.muscle', num('muscleKg', p.muscleKg, 'kg'));
    h += f('np.visceral', num('visceralFat', p.visceralFat, ''));
    h += f('np.tbw', num('tbwKg', p.tbwKg, 'kg'));
    h += f('np.deviceBmr', num('deviceBmr', p.deviceBmr, 'kcal'));
    h += '</div>';

    h += '<div class="section-title">' + esc(t('np.section.medical')) + '</div><div class="form-grid">';
    h += f('np.conditions', text('conditions', (p.conditions || []).join(', ')));
    h += f('np.surgeries', text('surgeries', p.surgeries));
    h += f('np.family', text('family', p.family));
    h += f('np.medications', '<textarea class="textarea" data-f="medications" rows="2" placeholder="e.g. Metformin 1000 mg 2×/day">' + esc((p.medications || []).map(x => x.name + ' ' + (x.dose || '') + ' ' + (x.freq || '')).join('\n')) + '</textarea>');
    h += f('np.supplements', text('supplements', p.supplements));
    h += f('np.allergies', '<textarea class="textarea" data-f="allergies" rows="2" placeholder="' + esc(t('np.allergiesHint')) + '">' + esc((p.allergies || []).map(a => a.name + (a.type && a.type !== 'note' ? ' (' + a.type + ')' : '')).join('\n')) + '</textarea>');
    h += f('np.intolerances', '<textarea class="textarea" data-f="intolerances" rows="2">' + esc((p.intolerances || []).map(a => a.name + (a.notes ? ' — ' + a.notes : '')).join('\n')) + '</textarea>');
    h += f('np.gi', text('gi', p.gi));
    h += f('np.pregnancy', '<select class="select" data-f="pregnancy">' + ['na', 'pregnant', 'lactating'].map(v => '<option value="' + v + '"' + (p.pregnancy === v ? ' selected' : '') + '>' + esc(t('np.pregnancy.' + v)) + '</option>').join('') + '</select>');
    h += '</div>';
    h += f('np.notes', '<textarea class="textarea" data-f="notes" rows="2">' + esc(p.notes) + '</textarea>');

    h += '<div class="section-title">' + esc(t('np.section.lifestyle')) + '</div><div class="form-grid-3">';
    h += f('np.activity', '<select class="select" data-f="lifestyle.activity">' + ['sedentary', 'light', 'moderate', 'very', 'extra'].map(v => '<option value="' + v + '"' + (l.activity === v ? ' selected' : '') + '>' + esc(t('activity.' + v + '.short')) + '</option>').join('') + '</select>');
    h += f('np.exerciseFreq', num('lifestyle.exerciseFreq', l.exerciseFreq, '/wk'));
    h += f('np.sleep', num('lifestyle.sleep', l.sleep, 'h'));
    h += f('np.smoking', text('lifestyle.smoking', l.smoking));
    h += f('np.water', num('lifestyle.water', l.water, 'L'));
    h += f('np.mealsPerDay', num('lifestyle.mealsPerDay', l.mealsPerDay, ''));
    h += f('np.eatingHabits', text('lifestyle.eatingHabits', l.eatingHabits));
    h += f('np.prefs', text('lifestyle.prefs', (l.prefs || []).join(', ')));
    h += f('np.dislikes', text('lifestyle.dislikes', (l.dislikes || []).join(', ')));
    h += f('np.culture', text('lifestyle.culture', l.culture));
    h += f('np.budget', '<select class="select" data-f="lifestyle.budget">' + ['low', 'medium', 'high'].map(v => '<option value="' + v + '"' + (l.budget === v ? ' selected' : '') + '>' + esc(t('np.budget.' + v)) + '</option>').join('') + '</select>');
    h += f('np.prep', text('lifestyle.prep', l.prep));
    h += '</div>';

    h += '<div class="section-title">' + esc(t('np.section.goal')) + '</div><div class="form-grid">';
    h += f('np.goalField', '<select class="select" data-f="goal">' + ['loss', 'maintain', 'gain', 'therapeutic'].map(v => '<option value="' + v + '"' + (p.goal === v ? ' selected' : '') + '>' + esc(t('goal.' + v)) + '</option>').join('') + '</select>');
    h += '</div><label class="check"><input type="checkbox" data-f="consent"' + (p.consent ? ' checked' : '') + '/><span>' + esc(t('np.consent')) + '</span></label>';

    if (fields.length) {
      h += '<div class="section-title">' + esc(t('np.section.custom')) + '</div><div class="form-grid">';
      fields.forEach(cf => {
        const val = (p.custom || {})[cf.id] || '';
        const label = CN.i18n.lang() === 'ar' && cf.labelAr ? cf.labelAr : cf.label;
        if (cf.type === 'select') {
          h += f(label, '<select class="select" data-cf="' + cf.id + '">' + ['', ...(cf.options || [])].map(o => '<option value="' + esc(o) + '"' + (val === o ? ' selected' : '') + '>' + esc(o || '—') + '</option>').join('') + '</select>');
        } else if (cf.type === 'number') {
          h += f(label, '<input class="input" type="number" step="any" data-cf="' + cf.id + '" value="' + esc(val) + '"/>');
        } else {
          h += f(label, '<input class="input" data-cf="' + cf.id + '" value="' + esc(val) + '"/>');
        }
      });
      h += '</div>';
    }
    return h;

    function f(label, inputHtml) { return '<div class="field"><label>' + esc(label) + '</label>' + inputHtml + '</div>'; }
    function text(name, val, ph) { return '<input class="input" data-f="' + name + '" value="' + esc(val || '') + '" placeholder="' + esc(ph ? t(ph) : '') + '"/>'; }
    function num(name, val, unit) { return '<input class="input" type="number" step="any" inputmode="decimal" data-f="' + name + '" value="' + (val || val === 0 ? val : '') + '"/>' + (unit ? '<div class="hint">' + unit + '</div>' : ''); }
  }

  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o || {})[k], obj); }
  function setPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
  }

  function collectPatient(box, p) {
    const numFields = ['heightCm', 'initialWeight', 'targetWeight', 'waistCm', 'hipCm', 'bodyFatPct', 'muscleKg', 'visceralFat', 'tbwKg', 'deviceBmr'];
    const arrayText = { conditions: null, allergies: null, intolerances: null, 'lifestyle.prefs': null, 'lifestyle.dislikes': null };
    const medsRaw = box.querySelector('[data-f=medications]') ? box.querySelector('[data-f=medications]').value : '';
    box.querySelectorAll('[data-f]').forEach(inp => {
      const key = inp.getAttribute('data-f');
      if (key === 'medications') return;
      if (key === 'consent') { p.consent = inp.checked; return; }
      if (key === 'dob') { p.dob = inp.value || null; return; }
      let v = inp.value;
      if (inp.type === 'number') v = v === '' ? null : CN.util.parseNum(v);
      if (arrayText.hasOwnProperty(key)) {
        const arr = v.split(/,|\n/).map(s => s.trim()).filter(Boolean);
        if (key === 'conditions') p.conditions = arr;
        else if (key === 'lifestyle.prefs') setPath(p, key, arr);
        else if (key === 'lifestyle.dislikes') setPath(p, key, arr);
        else if (key === 'allergies') {
          p.allergies = arr.map(s => {
            const m = s.match(/^(.+?)\s*[(（]([^)）]+)[)）]\s*$/);
            const name = m ? m[1].trim() : s;
            let type = 'allergy';
            if (m) { const tt = m[2].toLowerCase(); if (/intoler|عدم تحمل/.test(tt)) type = 'intolerance'; else if (/prefer|تفضيل/.test(tt)) type = 'preference'; else if (/note|ملاحظ/.test(tt)) type = 'note'; }
            return { name, type };
          });
        } else if (key === 'intolerances') {
          p.intolerances = arr.map(s => { const m = s.split('—'); return { name: m[0].trim(), type: 'intolerance', notes: m[1] ? m[1].trim() : '' }; });
        }
      } else {
        setPath(p, key, v);
      }
    });
    /* meds lines */
    p.medications = medsRaw.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
      const m = line.match(/^(\S+(?:\s+\S+)?)\s+(\d+\s*\S*)?\s*(.*)$/);
      return m ? { name: m[1], dose: m[2] || '', freq: m[3] || '' } : { name: line, dose: '', freq: '' };
    });
    /* custom fields */
    box.querySelectorAll('[data-cf]').forEach(inp => {
      const id = inp.getAttribute('data-cf');
      p.custom = p.custom || {};
      const v = inp.type === 'number' ? (inp.value === '' ? null : CN.util.parseNum(inp.value)) : inp.value;
      if (v !== '' && v !== null && v !== undefined) p.custom[id] = v; else delete p.custom[id];
    });
    /* weights timeline */
    if (p.initialWeight && (!p.weights || !p.weights.length)) p.weights = [{ date: p.regDate || CN.util.todayISO(), kg: p.initialWeight, source: 'clinic' }];
    if (!p.fullName || !p.fullName.trim()) return t('np.saved.nameRequired');
    if (p.heightCm && (p.heightCm < 50 || p.heightCm > 250)) return t('common.invalidNumber');
    return null;
  }
  CN.vh.collectPatient = collectPatient;
  CN.vh.patientFormHTML = patientFormHTML;

  /* ============ Dashboard ============ */
  CN.views = CN.views || {};
  CN.views.dashboard = {
    render(root) {
      const store = CN.store;
      const patients = store.patients();
      const today = CN.util.todayISO();
      const month = today.slice(0, 7);
      const active = patients.filter(p => p.status !== 'archived');
      const newThisMonth = patients.filter(p => (p.regDate || '').slice(0, 7) === month).length;
      /* follow-ups */
      const upcoming = []; const overdue = [];
      patients.forEach(p => {
        const next = CN.vh.nextFU(p.id);
        if (!next) return;
        const diff = CN.util.daysBetween(today, next);
        if (diff < 0) overdue.push({ p, date: next, diff });
        else upcoming.push({ p, date: next, diff });
      });
      upcoming.sort((a, b) => a.diff - b.diff);
      overdue.sort((a, b) => a.diff - b.diff);
      const drafts = store.list('plans').filter(pl => pl.status === 'draft').length;
      const recent = patients.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6);

      let h = CN.vh.pageHead('dash.title', 'dash.sub',
        '<button class="btn btn-primary" data-act="new-patient">' + CN.icon('userPlus') + esc(t('topbar.quickNew')) + '</button>');

      if (store.isDemo()) {
        h += '<div class="banner soft">' + CN.icon('info') + '<span>' + esc(t('dash.sampleBanner')) + '</span><button class="btn btn-ghost btn-sm" data-act="clear-demo">' + esc(t('dash.clearSample')) + '</button></div>';
      }

      h += '<div class="grid grid-4 mb-3">' +
        kpi('users', '', t('dash.totalPatients'), patients.length, t('dash.activePatients') + ': ' + active.length) +
        kpi('userPlus', 'gold', t('dash.newThisMonth'), newThisMonth, '') +
        kpi('calendarCheck', 'burg', t('dash.upcomingFU'), upcoming.length, t('dash.missedFU') + ': ' + overdue.length) +
        kpi('clipboard', '', t('dash.pendingDrafts'), drafts, '') +
        '</div>';

      h += '<div class="grid grid-2-1">';

      /* left column */
      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('dash.recentPatients')) + '</h2><button class="btn btn-quiet btn-sm" data-act="goto-patients">' + esc(t('patients.title')) + ' ' + CN.icon('chevronRight') + '</button></div>';
      if (!recent.length) h += CN.ui.empty(t('patients.empty.title'), t('patients.empty.text'), '<button class="btn btn-primary btn-sm" data-act="new-patient">' + esc(t('patients.new')) + '</button>', 'users');
      else {
        h += '<div class="table-scroll"><table class="table"><thead><tr><th>' + t('patients.col.name') + '</th><th>' + t('patients.col.id') + '</th><th>BMI</th><th>' + t('patients.col.goal') + '</th><th>' + t('patients.col.nextFU') + '</th><th></th></tr></thead><tbody>';
        recent.forEach(p => {
          const bmi = CN.vh.bmiOf(p);
          h += '<tr><td><div class="flex">' + CN.vh.avatar(p.fullName, 'sm') + '<b>' + esc(p.fullName) + '</b></div></td>' +
            '<td class="muted tnum">' + esc(p.id) + '</td>' +
            '<td class="tnum">' + CN.fmt.n1(bmi) + '</td>' +
            '<td>' + CN.vh.goalChip(p.goal) + '</td>' +
            '<td>' + CN.vh.fuChip(CN.vh.nextFU(p.id)) + '</td>' +
            '<td class="actions"><button class="btn btn-ghost btn-sm" data-open="' + p.id + '">' + esc(t('common.open')) + '</button></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';

      /* weight chart for active patient */
      const ap = CN.app.patient();
      if (ap) {
        const fus = CN.store.list('followups', { patientId: ap.id });
        const series = CN.engine.progressSeries(ap, fus);
        if (series.length >= 2) {
          h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('dash.chartTitle', { name: ap.fullName })) + '</h2><button class="btn btn-quiet btn-sm" data-open="' + ap.id + '">' + esc(t('patient.record')) + '</button></div>' +
            CN.chart.line({ series: [{ name: t('bc.weight'), color: '#14213D', area: true, points: series.map(s => ({ x: s.date, y: s.kg })) }], height: 210, yFmt: v => CN.fmt.n1(v), xFmt: d => CN.fmt.date(d) }) + '</div>';
        }
      }
      h += '</div>';

      /* right column */
      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('dash.quickActions')) + '</h2></div>' +
        qa('userPlus', 'dash.qa.newPatient', 'dash.qa.newPatientSub', 'new-patient') +
        qa('calculator', 'dash.qa.energy', 'dash.qa.energySub', 'goto-energy') +
        qa('clipboard', 'dash.qa.plan', 'dash.qa.planSub', 'goto-builder') +
        qa('sparkles', 'dash.qa.copilot', 'dash.qa.copilotSub', 'goto-copilot') +
        '</div>';

      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('dash.upcomingList')) + '</h2></div>';
      if (!upcoming.length) h += '<p class="muted small">' + esc(t('dash.noUpcoming')) + '</p>';
      else upcoming.slice(0, 6).forEach(u => { h += apptRow(u, false); });
      h += '</div>';

      if (overdue.length) {
        h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('dash.missedList')) + '</h2></div>';
        overdue.slice(0, 6).forEach(u => { h += apptRow(u, true); });
        h += '</div>';
      }
      h += '</div>';
      h += '</div>';

      root.innerHTML = h;

      root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => CN.vh.openDrawer(b.getAttribute('data-open')));
      root.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
        const a = b.getAttribute('data-act');
        if (a === 'new-patient') CN.app.route('newpatient');
        else if (a === 'goto-patients') CN.app.route('patients');
        else if (a === 'goto-energy') { if (!CN.app.patient()) { CN.app.route('patients'); return; } CN.app.route('energy'); }
        else if (a === 'goto-builder') { if (!CN.app.patient()) { CN.app.route('patients'); return; } CN.app.route('builder'); }
        else if (a === 'goto-copilot') CN.app.route('copilot');
        else if (a === 'clear-demo') {
          if (await CN.modal.confirm({ message: t('settings.wipeConfirm'), danger: true, confirmText: t('settings.wipe') })) {
            await CN.store.wipeAll(); CN.toast(t('settings.wiped')); location.reload();
          }
        }
      });
      function kpi(icon, cls, label, value, sub) {
        return '<div class="card kpi"><div class="k-ico ' + cls + '">' + CN.icon(icon) + '</div><div><div class="k-label">' + esc(label) + '</div><div class="k-value tnum">' + CN.fmt.n0(value) + '</div><div class="k-sub">' + esc(sub || '') + '</div></div></div>';
      }
      function qa(icon, k1, k2, act) {
        return '<button class="menu-item" data-act="' + act + '" style="width:100%;border-radius:10px;padding:10px 12px"><span class="k-ico" style="width:36px;height:36px;flex:0 0 36px;border-radius:10px;background:var(--navy-tint);color:var(--navy);display:flex;align-items:center;justify-content:center">' + CN.icon(icon) + '</span><span><b>' + esc(t(k1)) + '</b><br><span class="small muted">' + esc(t(k2)) + '</span></span>' + CN.icon('chevronRight', '') + '</button>';
      }
      function apptRow(u, overdueRow) {
        return '<div class="appt"><div class="date-box"><div class="d-day">' + u.date.slice(8, 10) + '</div><div class="d-mon">' + u.date.slice(5, 7) + '</div></div>' +
          '<div class="grow"><b class="small">' + esc(u.p.fullName) + '</b><br><span class="small muted">' + esc(u.p.id) + '</span></div>' +
          (overdueRow ? '<span class="status overdue">' + esc(t('dash.overdueBy', { n: -u.diff })) + '</span>' : '<span class="status upcoming">' + (u.diff === 0 ? esc(t('dash.today')) : esc(t('dash.dueIn', { n: u.diff }))) + '</span>') +
          '</div>';
      }
    }
  };

  /* ============ Patients list ============ */
  CN.views.patients = {
    state: { q: '', status: 'active', goal: '' },
    render(root) {
      const s = this.state;
      let list = CN.store.patients();
      if (s.status === 'active') list = list.filter(p => p.status !== 'archived');
      else if (s.status === 'archived') list = list.filter(p => p.status === 'archived');
      if (s.goal) list = list.filter(p => p.goal === s.goal);
      if (s.q) {
        const q = s.q.toLowerCase();
        list = list.filter(p => (p.fullName || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q) || String(p.phone || '').includes(q));
      }
      list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

      let h = CN.vh.pageHead('patients.title', 'patients.sub',
        '<button class="btn btn-primary" data-act="new">' + CN.icon('userPlus') + esc(t('patients.new')) + '</button>');
      h += '<div class="card pad-sm mb-3"><div class="flex flex-wrap">' +
        '<div class="searchbox grow" style="min-width:220px">' + CN.icon('search') + '<input class="input" id="ptSearch" placeholder="' + esc(t('patients.searchPlaceholder')) + '" value="' + esc(s.q) + '"/></div>' +
        '<select class="select" id="ptStatus" style="width:150px"><option value="active"' + (s.status === 'active' ? ' selected' : '') + '>' + esc(t('status.active')) + '</option><option value="archived"' + (s.status === 'archived' ? ' selected' : '') + '>' + esc(t('status.archived')) + '</option><option value="all"' + (s.status === 'all' ? ' selected' : '') + '>' + esc(t('common.all')) + '</option></select>' +
        '<select class="select" id="ptGoal" style="width:170px"><option value="">' + esc(t('patients.filterGoal')) + ': ' + esc(t('common.all')) + '</option>' + ['loss', 'maintain', 'gain', 'therapeutic'].map(g => '<option value="' + g + '"' + (s.goal === g ? ' selected' : '') + '>' + esc(t('goal.' + g)) + '</option>').join('') + '</select>' +
        '<span class="muted small">' + esc(t('patients.count', { n: list.length })) + '</span>' +
        '</div></div>';

      if (!list.length) {
        h += '<div class="card">' + CN.ui.empty(t('patients.empty.title'), t('patients.empty.text'), '<button class="btn btn-primary" data-act="new">' + esc(t('patients.new')) + '</button>', 'users') + '</div>';
      } else {
        h += '<div class="table-scroll"><table class="table"><thead><tr>' +
          '<th>' + t('patients.col.name') + '</th><th>' + t('patients.col.id') + '</th><th>' + t('patients.col.age') + '</th><th>' + t('patients.col.sex') + '</th><th>BMI</th><th>' + t('patients.col.goal') + '</th><th>' + t('patients.col.nextFU') + '</th><th>' + t('patients.col.updated') + '</th><th></th></tr></thead><tbody>';
        list.forEach(p => {
          const bmi = CN.vh.bmiOf(p);
          h += '<tr>' +
            '<td><div class="flex">' + CN.vh.avatar(p.fullName, 'sm') + '<div><b>' + esc(p.fullName) + '</b>' + (p.status === 'archived' ? ' <span class="status archived">' + esc(t('status.archived')) + '</span>' : '') + '</div></div></td>' +
            '<td class="muted tnum">' + esc(p.id) + '</td>' +
            '<td>' + (p.dob ? esc(CN.util.ageFrom(p.dob).years) : '—') + '</td>' +
            '<td>' + esc(t(p.sex === 'male' ? 'common.male' : 'common.female')) + '</td>' +
            '<td class="tnum">' + CN.fmt.n1(bmi) + ' <span class="muted xsmall">' + esc(t('bmi.' + CN.engine.bmiCat(bmi).key)) + '</span></td>' +
            '<td>' + CN.vh.goalChip(p.goal) + '</td>' +
            '<td>' + CN.vh.fuChip(CN.vh.nextFU(p.id)) + '</td>' +
            '<td class="muted small">' + esc(CN.fmt.date((p.updatedAt || '').slice(0, 10))) + '</td>' +
            '<td class="actions">' +
            '<button class="btn btn-ghost btn-sm" data-open="' + p.id + '">' + esc(t('patients.openRecord')) + '</button>' +
            '<button class="btn btn-icon btn-quiet" data-edit="' + p.id + '" title="' + esc(t('patient.edit')) + '">' + CN.icon('edit') + '</button>' +
            '<button class="btn btn-icon btn-quiet" data-arch="' + p.id + '" title="' + esc(p.status === 'archived' ? t('patient.unarchive') : t('patient.archive')) + '">' + CN.icon('archive') + '</button>' +
            '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      root.innerHTML = h;

      const rerender = () => { CN.app.renderCurrent(); };
      root.querySelector('#ptSearch').addEventListener('input', CN.util.debounce(e => { s.q = e.target.value; rerender(); }, 220));
      root.querySelector('#ptStatus').onchange = e => { s.status = e.target.value; rerender(); };
      root.querySelector('#ptGoal').onchange = e => { s.goal = e.target.value; rerender(); };
      root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => CN.vh.openDrawer(b.getAttribute('data-open')));
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
        const p = CN.store.getPatient(b.getAttribute('data-edit'));
        CN.vh.patientFormModal(p, () => rerender());
      });
      root.querySelectorAll('[data-arch]').forEach(b => b.onclick = async () => {
        const p = CN.store.getPatient(b.getAttribute('data-arch'));
        if (!p) return;
        if (p.status === 'archived') { p.status = 'active'; await CN.store.savePatient(p); CN.toast(t('common.saved')); rerender(); }
        else if (await CN.modal.confirm({ message: t('patient.archive') + ' — ' + p.fullName + '?', confirmText: t('patient.archive') })) {
          p.status = 'archived'; await CN.store.savePatient(p); rerender();
        }
      });
      root.querySelector('[data-act=new]').onclick = () => CN.app.route('newpatient');
    }
  };

  /* ============ New Patient ============ */
  CN.views.newpatient = {
    render(root) {
      const settings = CN.store.settings || {};
      const fields = settings.customFields || [];
      const p = { sex: 'female', goal: 'loss', pregnancy: 'na', lifestyle: { activity: (settings.defaults && settings.defaults.activity) || 'light', budget: 'medium' }, weights: [], custom: {}, regDate: CN.util.todayISO() };
      let h = CN.vh.pageHead('np.title', 'np.sub');
      h += '<div class="card" style="max-width:1100px">' + CN.vh.patientFormHTML(p, fields) +
        '<div class="divider"></div>' +
        '<div class="flex" style="justify-content:flex-end">' +
        '<button class="btn btn-ghost" data-x="cancel">' + esc(t('common.cancel')) + '</button>' +
        '<button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(t('np.save')) + '</button>' +
        '</div></div>';
      root.innerHTML = h;
      root.querySelector('[data-x=cancel]').onclick = () => CN.app.route('dashboard');
      root.querySelector('[data-x=save]').onclick = async () => {
        const err = CN.vh.collectPatient(root, p);
        if (err) { CN.toast(err, 'burg'); return; }
        const saved = await CN.store.savePatient(p);
        CN.toast(t('np.saved.ok', { id: saved.id }));
        CN.app.setPatient(saved.id);
        CN.app.route('dashboard');
        setTimeout(() => CN.vh.openDrawer(saved.id), 200);
      };
      /* live age */
      const dob = root.querySelector('[data-f=dob]');
      if (dob) dob.addEventListener('change', () => { const el = root.querySelector('[data-age]'); if (el) el.textContent = ageText(dob.value); });
    }
  };

  console.log('NutriClinic views-core.js loaded');
})();
