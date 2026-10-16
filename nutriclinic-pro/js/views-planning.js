/* ============================================================
   NutriClinic Pro — views-planning.js
   Diet Plan Builder · AI Nutrition Copilot · Follow-Up Management
   ============================================================ */
'use strict';
(function () {
  const t = (k, v) => CN.i18n.t(k, v);
  const esc = CN.util.esc;
  const n2 = v => (Math.round((+v) * 100) / 100);

  /* ================= Diet Plan Builder ================= */
  CN.views.builder = {
    _state: null,
    _approachIds: [],

    render(root) {
      const p = CN.app.patient();
      let h = CN.vh.pageHead('builder.title', 'builder.sub');
      if (!p) { root.innerHTML = h + '<div class="card">' + CN.vh.needPatient('builder.patientNeeded') + '</div>'; bindSimple(root); return; }

      const energy = CN.store.list('energy', { patientId: p.id }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0];
      if (!energy) {
        root.innerHTML = h + '<div class="card">' + CN.ui.empty(t('builder.needTarget'), t('energy.transferNote'), '<button class="btn btn-primary" data-act="goto-energy">' + CN.icon('calculator') + esc(t('builder.needTargetBtn')) + '</button>', 'calculator') + '</div>';
        bindSimple(root);
        return;
      }

      /* load pending plan from Copilot? */
      if (CN.app.pendingPlanId) {
        const pl = CN.store.get('plans', CN.app.pendingPlanId);
        CN.app.pendingPlanId = null;
        if (pl && pl.patientId === p.id) this._state = { plan: pl, dayIdx: 0, dirty: false, origStatus: pl.status };
      }
      if (this._state && this._state.plan && this._state.plan.patientId !== p.id) this._state = null;

      root.innerHTML = h + '<div id="bw"></div>';
      this._root = root;
      const self = this;
      renderMain();
      bindSimple(root);

      function targetsFromEnergy() {
        const em = energy.macros || {};
        const m = CN.engine.macros({ patient: p, target: energy.target, approachIds: [], goal: p.goal, override: { mode: 'percent', p: em.p, c: em.c, f: em.f, proteinPerKg: em.proteinPerKg, fiber: em.fiber, sodium: em.sodium, fluids: em.fluids } });
        return { kcal: energy.target, pG: m.pG, cG: m.cG, fG: m.fG, fiber: m.fiber, sodium: m.sodium, fluids: m.fluids };
      }

      function renderMain() {
        const bw = root.querySelector('#bw');
        if (!self._state || !self._state.plan) bw.innerHTML = renderCreate();
        else bw.innerHTML = renderEditor();
        bindMain();
      }

      /* ---------- create panel ---------- */
      function renderCreate() {
        const defs = (CN.store.settings || {}).defaults || {};
        const drafts = CN.store.list('plans', { patientId: p.id }).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        const groups = {};
        drafts.forEach(d => { (groups[d.groupId] = groups[d.groupId] || []).push(d); });
        const tpls = CN.store.list('templates');
        let h = '';

        h += '<div class="banner">' + CN.icon('target') + '<span>' + esc(t('energy.approvedTarget')) + ': <b>' + CN.fmt.kcal(energy.target) + ' kcal</b> · ' +
          esc(t('macro.protein')) + ' ' + energy.macros.pG + ' g · ' + esc(t('macro.carbs')) + ' ' + energy.macros.cG + ' g · ' + esc(t('macro.fat')) + ' ' + energy.macros.fG + ' g</span></div>';

        h += '<div class="grid grid-2-1"><div>';
        h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('builder.approaches')) + '</h2><span class="small muted">' + esc(t('builder.combineHint')) + '</span></div>' +
          '<div class="grid grid-3" id="bApproaches">' + CN.APPROACHES.map(a => {
            const on = self._approachIds.includes(a.id);
            return '<label class="card pad-sm" style="cursor:pointer;border-color:' + (on ? 'var(--gold)' : 'var(--line)') + '"><span class="flex"><input type="checkbox" data-ap="' + a.id + '"' + (on ? ' checked' : '') + '/><span><b class="small">' + esc(CN.i18n.lang() === 'ar' ? a.ar : a.en) + '</b><br><span class="xsmall muted">' + esc(CN.i18n.lang() === 'ar' ? (a.descAr || a.desc) : a.desc) + '</span></span></span></label>';
          }).join('') + '</div>' +
          '<div id="bCompat" class="mt-2"></div></div>';

        h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('builder.config')) + '</h2></div>' +
          '<div class="form-grid-3">' +
          fld(t('builder.duration'), '<select class="select" id="bDays"><option value="1">' + esc(t('builder.d1')) + '</option><option value="3">' + esc(t('builder.d3')) + '</option><option value="7" selected>' + esc(t('builder.d7')) + '</option><option value="14">' + esc(t('builder.d14')) + '</option><option value="custom">' + esc(t('builder.custom')) + '</option></select>' + '<input class="input mt-1" type="number" id="bDaysCustom" min="1" max="60" placeholder="' + esc(t('builder.customDays')) + '" style="display:none"/>') +
          fld(t('builder.meals'), '<select class="select" id="bMeals">' + [2, 3, 4].map(n => '<option value="' + n + '"' + (n === 3 ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>') +
          fld(t('builder.snacks'), '<select class="select" id="bSnacks">' + [0, 1, 2, 3].map(n => '<option value="' + n + '"' + (n === 2 ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>') +
          fld(t('builder.window'), '<select class="select" id="bWindow"><option value="none">' + esc(t('builder.window.none')) + '</option><option value="16">' + esc(t('builder.window.16')) + '</option><option value="14">' + esc(t('builder.window.14')) + '</option><option value="18">' + esc(t('builder.window.18')) + '</option></select>') +
          fld(t('builder.cuisine'), '<select class="select" id="bCuisine"><option value="egyptian" selected>' + esc(t('builder.cuisine.egyptian')) + '</option><option value="mediterranean">' + esc(t('builder.cuisine.mediterranean')) + '</option><option value="mixed">' + esc(t('builder.cuisine.mixed')) + '</option></select>') +
          fld(t('builder.budget'), '<select class="select" id="bBudget">' + ['low', 'medium', 'high'].map(v => '<option value="' + v + '"' + ((p.lifestyle && p.lifestyle.budget) === v ? ' selected' : '') + '>' + esc(t('np.budget.' + v)) + '</option>').join('') + '</select>') +
          '</div>' +
          '<div class="field"><label>' + esc(t('builder.exclusions')) + '</label>' +
          '<div class="flex flex-wrap" id="bExcl">' + exChips(p) + '<input class="input" id="bExclInput" style="max-width:220px" placeholder="' + esc(t('builder.excludeAdd')) + '" data-excl-input/></div>' +
          '<div class="hint">' + esc(t('builder.exclusionsFrom')) + '</div></div>' +
          '<div class="flex mt-2"><button class="btn btn-primary btn-lg" data-x="generate">' + CN.icon('wand') + esc(t('builder.generate')) + '</button></div>' +
          '</div>';
        h += '</div>';

        h += '<div>';
        h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('builder.templates')) + '</h3></div>' +
          (tpls.length ? tpls.map(tp => '<div class="stat-line"><span><b>' + esc(CN.i18n.lang() === 'ar' && tp.nameAr ? tp.nameAr : tp.name) + '</b><br><span class="xsmall muted">' + esc((tp.approachIds || []).join(' + ')) + '</span></span><span class="flex"><button class="btn btn-ghost btn-sm" data-tpl="' + tp.id + '">' + esc(t('builder.applyTemplate')) + '</button><button class="btn btn-quiet btn-sm" data-tpldel="' + tp.id + '">' + CN.icon('trash') + '</button></span></div>').join('') : '<p class="muted small">—</p>') +
          '</div>';
        h += '<div class="card"><div class="card-h"><h3>' + esc(t('builder.versions')) + '</h3></div>' +
          (Object.keys(groups).length ? Object.keys(groups).map(gid => {
            const v = groups[gid].sort((a, b) => b.version - a.version)[0];
            return '<div class="stat-line"><span><b class="small">' + esc(v.title || t('builder.planTitle')) + '</b> ' + CN.ui.statusPill(v.status) + '<br><span class="xsmall muted">' + esc(t('builder.version', { n: v.version })) + ' · ' + esc(CN.fmt.date(v.updatedAt)) + '</span></span><button class="btn btn-ghost btn-sm" data-open-plan="' + v.id + '">' + esc(t('common.open')) + '</button></div>';
          }).join('') : '<p class="muted small">' + esc(t('builder.noVersions')) + '</p>') +
          '</div>';
        h += '</div></div>';
        return h;

        function fld(label, input) { return '<div class="field"><label>' + esc(label) + '</label>' + input + '</div>'; }
        function exChips(p2) {
          const list = autoExclusions(p2);
          return list.map(e => '<span class="chip gold" data-exc="' + esc(e) + '">' + esc(e) + ' <span style="cursor:pointer" data-excrm="' + esc(e) + '">×</span></span>').join('');
        }
      }

      function autoExclusions(p2) {
        const list = [];
        (p2.allergies || []).forEach(a => { if (a.type !== 'note' && a.type !== 'preference') list.push(a.name); });
        (p2.intolerances || []).forEach(a => list.push(a.name));
        (p2.restrictions || []).forEach(r => list.push(r));
        return CN.util.uniqBy(list, x => x.toLowerCase());
      }

      /* ---------- editor ---------- */
      function renderEditor() {
        const st = self._state;
        const plan = st.plan;
        const day = plan.days[st.dayIdx] || plan.days[0];
        const tgt = plan.targets;
        let h = '';

        h += '<div class="card mb-3"><div class="flex flex-wrap">' +
          '<input class="input" id="bTitle" value="' + esc(plan.title || '') + '" placeholder="' + esc(t('builder.planTitle')) + '" style="max-width:420px;font-weight:600"/>' +
          '<span class="chip line">' + esc(t('builder.version', { n: plan.version || 1 })) + '</span>' + CN.ui.statusPill(plan.status) +
          '<span class="chip">' + CN.fmt.kcal(tgt.kcal) + ' kcal</span>' +
          '<span class="chip gray">' + esc((plan.approachIds || []).map(a => CN.i18n.lang() === 'ar' ? CN.approachById(a).ar : CN.approachById(a).en).join(' + ')) + '</span>' +
          '<span class="ml-auto"></span>' +
          '<button class="btn btn-ghost btn-sm" data-x="preview">' + CN.icon('eye') + esc(t('common.preview')) + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-x="compare">' + CN.icon('swap') + esc(t('builder.compare')) + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-x="saveTpl">' + CN.icon('save') + esc(t('builder.saveAsTemplate')) + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-x="regen">' + CN.icon('refresh') + esc(t('builder.regenerate')) + '</button>' +
          '<button class="btn btn-primary btn-sm" data-x="save">' + CN.icon('save') + esc(t('builder.savePlan')) + '</button>' +
          (plan.status !== 'approved' ? '<button class="btn btn-gold btn-sm" data-x="approve">' + CN.icon('check') + esc(t('builder.approve')) + '</button>' : '') +
          '<button class="btn btn-quiet btn-sm" data-x="close">' + esc(t('common.discard')) + '</button>' +
          '</div>' +
          (st.origStatus === 'approved' ? '<p class="cite mt-1">' + esc(t('builder.editingApproved')) + '</p>' : '') + '</div>';

        /* day tabs */
        h += '<div class="card mb-3"><div class="day-tabs">' + plan.days.map((d, i) => '<button class="day-tab' + (i === st.dayIdx ? ' on' : '') + '" data-day="' + i + '">' + esc(t('builder.dayN', { n: i + 1 })) + '</button>').join('') +
          '<button class="day-tab" data-x="dupDay" title="' + esc(t('builder.duplicateDay')) + '">' + CN.icon('copy') + '</button>' +
          '<button class="day-tab" data-x="clearDay" title="' + esc(t('builder.clearDay')) + '">' + CN.icon('trash') + '</button>' +
          '<button class="day-tab" data-x="addDay">+ ' + esc(t('builder.day')) + '</button>' +
          '</div>';

        if (day) {
          h += day.meals.map((m, mi) => mealCard(m, mi)).join('');
          h += '<div class="flex mt-2"><button class="btn btn-ghost btn-sm" data-x="addMeal">' + CN.icon('plus') + esc(t('builder.addMeal')) + '</button></div>';
          h += totalsBar(day);
        }
        h += '</div>';

        /* checks */
        const warns = CN.planner.warnings(plan, { patient: p });
        h += '<div class="card"><div class="card-h"><h3>' + esc(t('builder.warnings')) + '</h3></div>' +
          (warns.length ? '<div class="flag-list">' + warns.map(w => CN.ui.flag(w.level, esc(t(w.key, w.vars)))) .join('') + '</div>' : '<div class="alert ok">' + CN.icon('check') + '<div>' + esc(t('builder.check.ok')) + '</div></div>') +
          '</div>';
        return h;

        function mealCard(m, mi) {
          const mt = CN.planner.mealTotals(m);
          let hh = '<div class="meal-card"><div class="meal-head">' +
            '<input class="input" style="max-width:190px;font-weight:600" value="' + esc(m.name || t(m.key || '')) + '" data-mname="' + m.id + '"/>' +
            '<input class="input" style="max-width:90px" value="' + esc(m.time || '') + '" placeholder="12:00" data-mtime="' + m.id + '"/>' +
            '<span class="m-kcal"><span class="chip">' + CN.fmt.kcal(mt.kcal) + ' kcal</span>' +
            '<button class="btn btn-icon btn-quiet" data-mup="' + m.id + '" title="' + esc(t('builder.moveUp')) + '">▲</button>' +
            '<button class="btn btn-icon btn-quiet" data-mdown="' + m.id + '" title="' + esc(t('builder.moveDown')) + '">▼</button>' +
            '<button class="btn btn-icon btn-quiet" data-mdel="' + m.id + '" title="' + esc(t('common.remove')) + '">' + CN.icon('trash') + '</button>' +
            '<button class="btn btn-ghost btn-sm" data-addfood="' + m.id + '">' + CN.icon('plus') + esc(t('builder.addFood')) + '</button></span></div>';
          if (!m.items.length) hh += '<div class="item-row"><span class="muted small">' + esc(t('assess.noItemsYet')) + '</span></div>';
          m.items.forEach((it, ii) => { hh += itemRow(m, it); });
          hh += '</div>';
          return hh;
        }

        function itemRow(m, it) {
          const f = CN.foodById(it.foodId);
          if (!f) return '';
          const tot = CN.planner.itemTotals(it);
          const mode = ((CN.store.settings || {}).defaults || {}).portionMode || 'household';
          let hh = '<div class="item-row">' +
            '<div class="food-cell"><span class="food-en">' + esc(CN.i18n.lang() === 'ar' ? f.ar : f.en) + '</span><span class="food-ar">' + esc(CN.i18n.lang() === 'ar' ? f.en : f.ar) + '</span></div>' +
            '<div class="flex"><input class="input" style="max-width:74px" type="number" step="0.25" min="0.1" value="' + it.qty + '" data-iqty="' + m.id + '|' + it.id + '"/><span class="xsmall muted">' + esc(mode === 'household' ? '× ' + t('builder.perUnit') : 'g') + '</span></div>' +
            '<div class="num col-macro">' + CN.fmt.kcal(tot.kcal) + '<span class="u">kcal</span></div>' +
            '<div class="num col-macro">' + CN.fmt.n1(tot.p) + '<span class="u">' + esc(t('macro.protein')) + '</span></div>' +
            '<div class="num col-macro">' + CN.fmt.n1(tot.c) + '<span class="u">' + esc(t('macro.carbs')) + '</span></div>' +
            '<div class="num col-macro">' + CN.fmt.n1(tot.f) + '<span class="u">' + esc(t('macro.fat')) + '</span></div>' +
            '<div class="item-actions">' +
            '<button class="btn btn-ghost btn-sm" data-swap="' + m.id + '|' + it.id + '" title="' + esc(t('builder.smartReplace')) + '">' + CN.icon('swap') + '</button>' +
            '<button class="btn btn-icon btn-quiet" data-iup="' + m.id + '|' + it.id + '">▲</button>' +
            '<button class="btn btn-icon btn-quiet" data-idown="' + m.id + '|' + it.id + '">▼</button>' +
            '<button class="btn btn-icon btn-quiet" data-idel="' + m.id + '|' + it.id + '">' + CN.icon('trash') + '</button>' +
            '</div></div>';
          if (it.alt && it.alt.length) {
            hh += '<div class="item-alts"><span class="small strong">' + esc(t('builder.alternatives')) + ':</span>' +
              it.alt.map((a, aix) => { const af = CN.foodById(a.foodId); return af ? '<span class="alt-chip">' + esc(CN.i18n.lang() === 'ar' ? af.ar : af.en) + ' (' + CN.planner.fmtQty(a.qty) + '×) <span style="cursor:pointer" data-altdel="' + m.id + '|' + it.id + '|' + aix + '">×</span></span>' : ''; }).join('') +
              '<button class="alt-chip" data-swap="' + m.id + '|' + it.id + '|alt">+ ' + esc(t('builder.addAlternative')) + '</button></div>';
          }
          return hh;
        }

        function totalsBar(day2) {
          const tot = CN.planner.dayTotals(day2);
          const rows = [['kcal', tot.kcal, tgt.kcal, 0], ['p', tot.p, tgt.pG, 1], ['c', tot.c, tgt.cG, 1], ['f', tot.f, tgt.fG, 1]];
          return '<div class="totals-bar">' +
            '<div class="t-item"><span class="t-label">' + esc(t('builder.totals')) + '</span><span class="t-value">' + CN.fmt.kcal(tot.kcal) + ' <span class="xsmall">kcal</span></span></div>' +
            '<div class="t-sep"></div>' +
            ['p', 'c', 'f'].map(mk => {
              const val = mk === 'p' ? tot.p : mk === 'c' ? tot.c : tot.f;
              const tgtv = mk === 'p' ? tgt.pG : mk === 'c' ? tgt.cG : tgt.fG;
              const d = val - tgtv;
              return '<div class="t-item"><span class="t-label">' + esc(t(mk === 'p' ? 'macro.protein' : mk === 'c' ? 'macro.carbs' : 'macro.fat')) + ' <span class="xsmall">(' + esc(t('builder.target')) + ' ' + tgtv + 'g)</span></span><span class="t-value">' + CN.fmt.n1(val) + ' g<span class="delta ' + (Math.abs(d) <= Math.max(tgtv * 0.1, 3) ? '' : d > 0 ? 'neg' : 'pos') + '">' + CN.fmt.signed(d) + '</span></span></div>';
            }).join('') +
            '<div class="t-sep"></div>' +
            '<div class="t-item"><span class="t-label">' + esc(t('builder.fiber')) + '</span><span class="t-value">' + CN.fmt.n0(tot.fiber) + ' g</span></div>' +
            '<div class="t-item"><span class="t-label">' + esc(t('builder.sodium')) + '</span><span class="t-value">' + CN.fmt.n0(tot.sodium) + ' mg</span></div>' +
            '</div>';
        }
      }

      /* ---------- main bindings ---------- */
      function bindMain() {
        const st = self._state;
        const $ = s => root.querySelector(s);
        if (!st || !st.plan) {
          /* create panel bindings */
          root.querySelectorAll('[data-ap]').forEach(cb => cb.onchange = () => {
            const id = cb.getAttribute('data-ap');
            if (cb.checked) { if (!self._approachIds.includes(id)) self._approachIds.push(id); }
            else self._approachIds = self._approachIds.filter(x => x !== id);
            const label = cb.closest('label');
            if (label) label.style.borderColor = cb.checked ? 'var(--gold)' : 'var(--line)';
            renderCompat();
          });
          renderCompat();
          function renderCompat() {
            const compat = $('#bCompat');
            if (!compat) return;
            if (self._approachIds.length > 1) {
              const c = CN.checkCombo(self._approachIds);
              compat.innerHTML = c.results.length
                ? '<div class="flag-list">' + c.results.map(r => CN.ui.flag(r.level === 'avoid' ? 'high' : 'mid', esc(r.msg))).join('') + '</div>'
                : '<div class="alert ok">' + CN.icon('check') + '<div>' + esc(t('builder.compatOk')) + '</div></div>';
            } else compat.innerHTML = '';
          }
          const daysSel = $('#bDays');
          if (daysSel) daysSel.onchange = () => { $('#bDaysCustom').style.display = daysSel.value === 'custom' ? '' : 'none'; };
          const gen = $('[data-x=generate]');
          if (gen) gen.onclick = () => {
            if (!self._approachIds.length) { CN.toast(t('builder.pickApproaches'), 'burg'); return; }
            const combo = CN.checkCombo(self._approachIds);
            if (combo.worst === 'avoid') { CN.toast(combo.results.find(r => r.level === 'avoid').msg, 'burg'); return; }
            const exInput = $('#bExclInput');
            const exclusions = autoExclusions(p).slice();
            if (exInput && exInput.value.trim()) exclusions.push(exInput.value.trim());
            root.querySelectorAll('[data-exc]').forEach(ch => exclusions.push(ch.getAttribute('data-exc')));
            const days = daysSel.value === 'custom' ? CN.util.clamp(CN.util.parseNum($('#bDaysCustom').value) || 1, 1, 60) : CN.util.parseNum(daysSel.value);
            const cfg = {
              days, mealsPerDay: CN.util.parseNum($('#bMeals').value), snacks: CN.util.parseNum($('#bSnacks').value),
              window: $('#bWindow').value, cuisine: $('#bCuisine').value, budget: $('#bBudget').value,
              exclusions: CN.util.uniqBy(exclusions, x => x.toLowerCase()), methods: []
            };
            const plan = CN.planner.generate({ patient: p, approaches: self._approachIds, config: cfg, targets: targetsFromEnergy(), seed: Date.now().toString(36) + p.id });
            plan.title = self._approachIds.map(a => CN.approachById(a).en).join(' + ') + ' · ' + days + '-day plan';
            self._state = { plan, dayIdx: 0, dirty: true, origStatus: null };
            CN.toast(t('builder.generated'));
            renderMain();
          };
          root.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => {
            const tpl = CN.store.get('templates', b.getAttribute('data-tpl'));
            if (!tpl) return;
            const plan = CN.planner.fromTemplate(tpl, { patient: p, targets: targetsFromEnergy(), approachIds: tpl.approachIds, exclusions: autoExclusions(p) });
            plan.title = (tpl.name || t('builder.planTitle')) + ' — ' + p.fullName;
            self._state = { plan, dayIdx: 0, dirty: true, origStatus: null };
            renderMain();
          });
          root.querySelectorAll('[data-tpldel]').forEach(b => b.onclick = async () => {
            if (await CN.modal.confirm({ message: t('common.delete') + '?', danger: true })) { await CN.store.remove('templates', b.getAttribute('data-tpldel')); CN.app.renderCurrent(); }
          });
          root.querySelectorAll('[data-open-plan]').forEach(b => b.onclick = () => {
            const pl = CN.store.get('plans', b.getAttribute('data-open-plan'));
            if (pl) { self._state = { plan: pl, dayIdx: 0, dirty: false, origStatus: pl.status }; renderMain(); }
          });
          return;
        }

        /* editor bindings */
        const plan = st.plan;
        root.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { st.dayIdx = +b.getAttribute('data-day'); renderMain(); });
        root.querySelectorAll('[data-mname]').forEach(inp => inp.addEventListener('change', () => { const m = mealById(inp.getAttribute('data-mname')); if (m) { m.name = inp.value; markDirty(); } }));
        root.querySelectorAll('[data-mtime]').forEach(inp => inp.addEventListener('change', () => { const m = mealById(inp.getAttribute('data-mtime')); if (m) { m.time = inp.value; markDirty(); } }));
        root.querySelectorAll('[data-iqty]').forEach(inp => inp.addEventListener('change', () => {
          const [mid, iid] = inp.getAttribute('data-iqty').split('|');
          CN.planner.updateItem(plan, st.dayIdx, mid, iid, { qty: CN.util.parseNum(inp.value) || 0.25 });
          markDirty(); renderMain();
        }));
        bind2('[data-swap]', b => openSwapModal(b.getAttribute('data-swap')));
        bind2('[data-iup]', b => { const [mid, iid] = b.getAttribute('data-iup').split('|'); CN.planner.moveItem(plan, st.dayIdx, mid, iid, -1); markDirty(); renderMain(); });
        bind2('[data-idown]', b => { const [mid, iid] = b.getAttribute('data-idown').split('|'); CN.planner.moveItem(plan, st.dayIdx, mid, iid, 1); markDirty(); renderMain(); });
        bind2('[data-idel]', b => { const [mid, iid] = b.getAttribute('data-idel').split('|'); CN.planner.removeItem(plan, st.dayIdx, mid, iid); markDirty(); renderMain(); });
        bind2('[data-altdel]', b => { const [mid, iid, aix] = b.getAttribute('data-altdel').split('|'); CN.planner.removeAlternative(plan, st.dayIdx, mid, iid, +aix); markDirty(); renderMain(); });
        bind2('[data-mup]', b => { moveMeal(b.getAttribute('data-mup'), -1); });
        bind2('[data-mdown]', b => { moveMeal(b.getAttribute('data-mdown'), 1); });
        bind2('[data-mdel]', b => { const id = b.getAttribute('data-mdel'); const day = plan.days[st.dayIdx]; if (day) { day.meals = day.meals.filter(m => m.id !== id); markDirty(); renderMain(); } });
        bind2('[data-addfood]', b => openAddFoodModal(b.getAttribute('data-addfood')));

        bind2('[data-x=dupDay]', () => { CN.planner.duplicateDay(plan, st.dayIdx); st.dayIdx = plan.days.length - 1; markDirty(); renderMain(); });
        bind2('[data-x=clearDay]', () => { CN.planner.clearDay(plan, st.dayIdx); markDirty(); renderMain(); });
        bind2('[data-x=addDay]', () => { CN.planner.duplicateDay(plan, st.dayIdx); st.dayIdx = plan.days.length - 1; markDirty(); renderMain(); });
        bind2('[data-x=addMeal]', () => { const day = plan.days[st.dayIdx]; CN.planner.addMeal(plan, st.dayIdx, '', ''); markDirty(); renderMain(); });

        const titleInp = root.querySelector('#bTitle');
        if (titleInp) titleInp.addEventListener('change', () => { plan.title = titleInp.value; markDirty(); });

        bind2('[data-x=save]', async () => { await savePlan(false); });
        bind2('[data-x=approve]', async () => { await savePlan(true); });
        bind2('[data-x=close]', async () => {
          if (!st.dirty || await CN.modal.confirm({ message: t('common.discard') + '?' })) { self._state = null; renderMain(); }
        });
        bind2('[data-x=regen]', async () => {
          if (!await CN.modal.confirm({ message: t('builder.regenerateConfirm') })) return;
          const fresh = CN.planner.generate({ patient: p, approaches: plan.approachIds, config: plan.config, targets: plan.targets, seed: Date.now().toString(36) });
          fresh.groupId = plan.groupId; fresh.id = plan.id; fresh.version = plan.version; fresh.title = plan.title;
          self._state.plan = fresh; markDirty(); renderMain();
          CN.toast(t('builder.generated'));
        });
        bind2('[data-x=saveTpl]', () => {
          const m = CN.modal.open({
            title: t('builder.saveAsTemplate'), narrow: true,
            body: '<div class="field"><label>' + esc(t('builder.templateName')) + '</label><input class="input" id="tplName" value="' + esc(plan.title || '') + '"/></div>',
            foot: '<button class="btn btn-ghost" data-x="c">' + esc(t('common.cancel')) + '</button><button class="btn btn-primary" data-x="s">' + esc(t('common.save')) + '</button>',
            onMount(box, mm) {
              box.querySelector('[data-x=c]').onclick = () => mm.close();
              box.querySelector('[data-x=s]').onclick = async () => {
                const name = box.querySelector('#tplName').value.trim() || 'Template';
                const tpl = CN.planner.toTemplate(plan, name);
                await CN.store.save('templates', tpl);
                CN.toast(t('builder.templateSaved')); mm.close();
              };
            }
          });
        });
        bind2('[data-x=preview]', () => previewModal(plan, st.dayIdx));
        bind2('[data-x=compare]', () => compareModal(plan));

        function bind2(sel, fn) { root.querySelectorAll(sel).forEach(el => { el.onclick = () => fn(el); }); }
        function mealById(id) { const day = plan.days[st.dayIdx]; return day ? day.meals.find(m => m.id === id) : null; }
        function moveMeal(id, dir) {
          const day = plan.days[st.dayIdx]; if (!day) return;
          const i = day.meals.findIndex(m => m.id === id); if (i < 0) return;
          const j = i + dir; if (j < 0 || j >= day.meals.length) return;
          const tmp = day.meals[i]; day.meals[i] = day.meals[j]; day.meals[j] = tmp;
          markDirty(); renderMain();
        }
        function markDirty() { st.dirty = true; }
      }

      async function savePlan(approve) {
        const st = self._state; const plan = st.plan;
        let saved;
        if (plan.id) {
          const stored = CN.store.get('plans', plan.id);
          if (st.origStatus === 'approved' || (stored && stored.status === 'approved')) {
            saved = await CN.copilot.saveAsNewVersion(plan, 'builder');
          } else {
            saved = await CN.store.save('plans', plan);
          }
        } else {
          saved = await CN.store.save('plans', plan);
        }
        if (approve) { saved.status = 'approved'; saved.approvedAt = CN.util.nowISO(); saved = await CN.store.save('plans', saved); }
        st.plan = saved; st.dirty = false; st.origStatus = saved.status;
        CN.toast(approve ? t('builder.approvedOk') : t('builder.planSaved'));
        renderMain();
      }

      /* ---------- add food ---------- */
      function openAddFoodModal(mealId) {
        const st = self._state; const plan = st.plan;
        const exFn = CN.planner.buildExclusionFn({ exclusions: plan.config.exclusions || [], patient: p, approachIds: plan.approachIds });
        let results = [];
        const m = CN.modal.open({
          title: t('builder.addFoodTitle'), wide: true,
          body: '<div class="flex mb-2"><div class="searchbox grow">' + CN.icon('search') + '<input class="input" id="afQ" placeholder="' + esc(t('builder.foodSearchPlaceholder')) + '"/></div>' +
            '<select class="select" id="afGroup" style="width:170px"><option value="">' + esc(t('common.all')) + '</option>' + CN.FOOD_GROUPS.map(g => '<option value="' + g.id + '">' + esc(CN.i18n.lang() === 'ar' ? g.ar : g.en) + '</option>').join('') + '</select></div>' +
            '<div id="afList" style="max-height:46vh;overflow-y:auto"></div>',
          onMount(box, mm) {
            const list = box.querySelector('#afList');
            function refresh() {
              const q = box.querySelector('#afQ').value.trim().toLowerCase();
              const g = box.querySelector('#afGroup').value;
              results = CN.FOODS.filter(f => exFn(f)).filter(f => !g || f.group === g).filter(f => !q || f.en.toLowerCase().includes(q) || String(f.ar).includes(q)).slice(0, 40);
              if (!results.length) { list.innerHTML = '<p class="muted small">' + esc(t('builder.noFoodFound')) + '</p>'; return; }
              list.innerHTML = '<div class="table-scroll"><table class="table"><thead><tr><th>' + t('foods.col.en') + '</th><th>' + t('foods.col.portion') + '</th><th>kcal</th><th>P/C/F</th><th></th></tr></thead><tbody>' +
                results.map((f, i) => '<tr><td>' + esc(CN.i18n.lang() === 'ar' ? f.ar : f.en) + '</td><td class="small muted">' + esc(f.ptext) + '</td><td>' + f.kcal + '</td><td class="small">' + f.p + '/' + f.c + '/' + f.f + '</td>' +
                  '<td class="actions"><input class="input" type="number" step="0.25" value="1" data-q="' + i + '" style="width:74px"/><button class="btn btn-primary btn-sm" data-add="' + i + '">' + esc(t('common.add')) + '</button></td></tr>').join('') + '</tbody></table></div>';
              list.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
                const idx = +b.getAttribute('data-add');
                const qtyInp = list.querySelector('[data-q="' + idx + '"]');
                const qty = Math.max(0.1, CN.util.parseNum(qtyInp.value) || 1);
                CN.planner.addItem(plan, st.dayIdx, mealId, results[idx].id, qty);
                self._state.dirty = true;
                CN.toast(t('common.saved'));
                mm.close(); renderMain();
              });
            }
            box.querySelector('#afQ').addEventListener('input', CN.util.debounce(refresh, 200));
            box.querySelector('#afGroup').addEventListener('change', refresh);
            refresh();
          }
        });
      }

      /* ---------- smart replace ---------- */
      function openSwapModal(key) {
        const parts = key.split('|');
        const mealId = parts[0], itemId = parts[1], asAlt = parts[2] === 'alt';
        const st = self._state; const plan = st.plan;
        const day = plan.days[st.dayIdx];
        const meal = day.meals.find(x => x.id === mealId);
        const item = meal && meal.items.find(x => x.id === itemId);
        const food = item && CN.foodById(item.foodId);
        if (!food) return;
        let objective = 'kcal';
        const m = CN.modal.open({
          title: t('builder.replaceTitle', { food: CN.i18n.lang() === 'ar' ? food.ar : food.en }),
          sub: t('builder.approxNote'), wide: true,
          body: '<div class="field"><label>' + esc(t('builder.objective')) + '</label><div class="seg" id="swObj">' +
            [['kcal', 'builder.obj.kcal'], ['protein', 'builder.obj.protein'], ['carb', 'builder.obj.carb'], ['fat', 'builder.obj.fat'], ['affordable', 'builder.obj.affordable']].map(o => '<button data-o="' + o[0] + '" class="' + (o[0] === 'kcal' ? 'on' : '') + '">' + esc(t(o[1])) + '</button>').join('') + '</div></div>' +
            '<div id="swList"></div>',
          onMount(box, mm) {
            const list = box.querySelector('#swList');
            function refresh() {
              const cands = CN.planner.swapCandidates(plan, st.dayIdx, mealId, itemId, p, objective);
              if (!cands.length) { list.innerHTML = '<p class="muted small">' + esc(t('builder.noFoodFound')) + '</p>'; return; }
              list.innerHTML = '<div class="table-scroll"><table class="table"><thead><tr><th>' + t('foods.col.en') + '</th><th>' + t('builder.qty') + '</th><th>kcal Δ</th><th></th></tr></thead><tbody>' +
                cands.map((c, i) => '<tr><td>' + esc(CN.i18n.lang() === 'ar' ? c.food.ar : c.food.en) + (c.approx ? ' <span class="chip gold">' + esc(t('builder.approxBadge')) + '</span>' : '') + '<br><span class="xsmall muted">' + esc(c.food.ptext) + '</span></td>' +
                  '<td>' + CN.planner.fmtQty(c.qty) + '× <span class="xsmall muted">(' + Math.round(c.food.grams * c.qty) + 'g)</span></td>' +
                  '<td class="tnum">' + CN.fmt.signed(c.deltaKcal) + '</td>' +
                  '<td class="actions"><button class="btn btn-primary btn-sm" data-use="' + i + '">' + esc(t('common.apply')) + '</button>' +
                  (asAlt ? '' : '<button class="btn btn-ghost btn-sm" data-alt="' + i + '">+ ' + esc(t('builder.alternatives')) + '</button>') + '</td></tr>').join('') + '</tbody></table></div>';
              list.querySelectorAll('[data-use]').forEach(b => b.onclick = () => {
                CN.planner.applySwap(plan, st.dayIdx, mealId, itemId, cands[+b.getAttribute('data-use')]);
                st.dirty = true; mm.close(); renderMain();
                CN.toast(t('builder.swapped', { a: CN.i18n.lang() === 'ar' ? food.ar : food.en, b: CN.i18n.lang() === 'ar' ? cands[+b.getAttribute('data-use')].food.ar : cands[+b.getAttribute('data-use')].food.en }));
              });
              list.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => {
                const c = cands[+b.getAttribute('data-alt')];
                CN.planner.addAlternative(plan, st.dayIdx, mealId, itemId, c.food.id, c.qty);
                st.dirty = true; mm.close(); renderMain();
              });
            }
            box.querySelectorAll('#swObj [data-o]').forEach(b => b.onclick = () => {
              objective = b.getAttribute('data-o');
              box.querySelectorAll('#swObj [data-o]').forEach(x => x.classList.toggle('on', x === b));
              refresh();
            });
            refresh();
          }
        });
      }

      /* ---------- preview & compare ---------- */
      function previewModal(plan, dayIdx) {
        const day = plan.days[dayIdx];
        const tot = CN.planner.dayTotals(day);
        const m = CN.modal.open({
          title: t('builder.previewMode') + ' — ' + t('builder.dayN', { n: dayIdx + 1 }), wide: true,
          body: '<div class="ref-body">' + day.meals.map(meal => {
            const mt = CN.planner.mealTotals(meal);
            return '<h3 style="color:var(--burgundy)">' + esc(meal.name || t(meal.key || '')) + ' <span class="muted small">' + esc(meal.time || '') + '</span></h3>' +
              '<ul>' + meal.items.map(it => { const f = CN.foodById(it.foodId); return f ? '<li>' + esc(CN.i18n.lang() === 'ar' ? f.ar : f.en) + ' — ' + esc(CN.planner.itemPortionText(it, 'household')) + (it.alt && it.alt.length ? ' <span class="muted">(' + esc(t('rpt.alts')) + ': ' + it.alt.map(a => { const af = CN.foodById(a.foodId); return af ? esc(CN.i18n.lang() === 'ar' ? af.ar : af.en) : ''; }).filter(Boolean).join(' / ') + ')</span>' : '') + '</li>' : ''; }).join('') + '</ul>';
          }).join('') + '<p class="small"><b>' + esc(t('builder.totals')) + ':</b> ' + CN.fmt.kcal(tot.kcal) + ' kcal · ' + esc(t('macro.protein')) + ' ' + CN.fmt.n1(tot.p) + ' g · ' + esc(t('macro.carbs')) + ' ' + CN.fmt.n1(tot.c) + ' g · ' + esc(t('macro.fat')) + ' ' + CN.fmt.n1(tot.f) + ' g</p></div>',
          foot: '<button class="btn btn-ghost" data-x="c">' + esc(t('common.close')) + '</button><button class="btn btn-primary" data-x="pdf">' + CN.icon('print') + esc(t('rpt.previewBtn')) + '</button>',
          onMount(box, mm) {
            box.querySelector('[data-x=c]').onclick = () => mm.close();
            box.querySelector('[data-x=pdf]').onclick = async () => {
              mm.close();
              const html = await CN.pdf.buildDietPlanReport(plan, p, CN.store.settings, {});
              CN.pdf.preview(html, { fontSize: (CN.store.settings.pdfTemplates && CN.store.settings.pdfTemplates[0] && CN.store.settings.pdfTemplates[0].fontSize) || 12 });
            };
          }
        });
      }
      function compareModal(plan) {
        const versions = CN.store.list('plans', { patientId: p.id }).filter(x => x.groupId === plan.groupId).sort((a, b) => a.version - b.version);
        if (versions.length < 2) { CN.toast(t('builder.noVersions'), 'gold'); return; }
        const opts = versions.map(v => '<option value="' + v.id + '">' + esc(t('builder.version', { n: v.version })) + ' · ' + esc(CN.fmt.date(v.updatedAt)) + '</option>').join('');
        const m = CN.modal.open({
          title: t('builder.compareTitle'), wide: true,
          body: '<div class="form-grid-2"><div class="field"><label>' + esc(t('builder.vA')) + '</label><select class="select" id="cA">' + opts + '</select></div>' +
            '<div class="field"><label>' + esc(t('builder.vB')) + '</label><select class="select" id="cB">' + opts + '</select></div></div><div id="cOut"></div>',
          onMount(box, mm) {
            const sA = box.querySelector('#cA'), sB = box.querySelector('#cB');
            sB.selectedIndex = versions.length - 1;
            function render() {
              const a = versions.find(v => v.id === sA.value), b = versions.find(v => v.id === sB.value);
              const diffs = CN.planner.diffPlans(a, b);
              box.querySelector('#cOut').innerHTML = diffs.length ? '<ul class="ref-body" style="padding-inline-start:18px">' + diffs.map(d => '<li class="diff-' + d.type + '">' + esc(t(d.key, d.vars)) + '</li>').join('') + '</ul>' : '<p class="muted small">—</p>';
            }
            sA.onchange = render; sB.onchange = render; render();
          }
        });
      }
    }
  };

  /* ================= Copilot ================= */
  CN.views.copilot = {
    _messages: [],
    render(root) {
      const p = CN.app.patient();
      const settings = CN.store.settings || {};
      const llmOn = CN.copilot.llmConfigured(settings);
      let h = CN.vh.pageHead('copilot.title', 'copilot.sub');
      h += '<div class="cop-wrap">';
      h += '<div class="card"><div class="cop-stream" id="copStream"></div>' +
        '<div class="cop-input"><textarea class="textarea grow" id="copInput" placeholder="' + esc(t('copilot.inputPlaceholder')) + '" rows="2"></textarea>' +
        '<button class="btn btn-primary" id="copSend">' + CN.icon('send') + esc(t('copilot.send')) + '</button></div>' +
        '<div class="mt-2" id="copChips"></div>' +
        '<div class="trace mt-2">' + CN.icon('shield') + ' ' + esc(t('copilot.disclaimer')) + '</div></div>';

      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('copilot.context')) + '</h3><span class="chip line">' + esc(t('copilot.mode')) + ': ' + esc(llmOn ? t('copilot.mode.llm') : t('copilot.mode.alg')) + '</span></div>';
      if (p) {
        const cw = CN.store.currentWeight(p);
        const bmi = CN.engine.bmi(cw, p.heightCm);
        const energy = CN.store.list('energy', { patientId: p.id }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0];
        h += '<div class="flex mb-2">' + CN.vh.avatar(p.fullName, 'lg') + '<div><b>' + esc(p.fullName) + '</b><br><span class="small muted">' + esc(p.id) + ' · ' + (p.dob ? CN.util.ageFrom(p.dob).years + ' y' : '') + ' · BMI ' + CN.fmt.n1(bmi) + '</span></div></div>' +
          '<div class="small">' + esc(t('np.conditions')) + ': ' + esc((p.conditions || []).join(', ') || '—') + '<br>' +
          esc(t('np.allergies')) + ': ' + esc((p.allergies || []).map(a => a.name).join(', ') || '—') +
          ((p.restrictions || []).length ? '<br>' + esc(t('builder.exclusions')) + ': ' + esc(p.restrictions.join(', ')) : '') +
          (energy ? '<br>' + esc(t('energy.approvedTarget')) + ': <b>' + CN.fmt.kcal(energy.target) + ' kcal</b>' : '') + '</div>' +
          '<p class="cite mt-1">' + esc(t('copilot.contextAuto')) + '</p>';
      } else {
        h += '<p class="muted small">' + esc(t('copilot.noPatient')) + '</p>';
      }
      h += '</div>';
      h += '<div class="card"><div class="card-h"><h3>' + esc(t('copilot.examples')) + '</h3></div><div class="flex flex-col" id="copExamples">' +
        ['ex1', 'ex2', 'ex3', 'ex4', 'ex5', 'ex6', 'ex7', 'ex8'].map(k => '<button class="prompt-chip" style="text-align:start" data-ex="' + k + '">' + esc(t('copilot.' + k)) + '</button>').join('') +
        '</div>' +
        (llmOn ? '<p class="cite mt-2">' + esc(t('settings.aiConfigured')) + '</p>' : '<p class="cite mt-2">' + esc(t('copilot.mode.llmNote')) + '</p>') +
        '</div>';
      h += '</div></div>';
      root.innerHTML = h;

      const stream = root.querySelector('#copStream');
      const input = root.querySelector('#copInput');
      const self = this;

      if (!self._messages.length) {
        self._messages.push({ who: 'bot', html: '<div class="m-title">' + CN.icon('sparkles') + esc(CN.APP_NAME) + '</div><p>' + esc(t('copilot.sub')) + '</p>' + (p ? '<p class="small muted">' + esc(t('copilot.contextAuto')) + '</p>' : '') });
      }
      paint();

      function paint() {
        stream.innerHTML = self._messages.map(msg => '<div class="msg ' + msg.who + '">' + msg.html + '</div>').join('');
        stream.scrollTop = stream.scrollHeight;
      }

      root.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { input.value = t('copilot.' + b.getAttribute('data-ex')); input.focus(); });
      root.querySelector('#copSend').onclick = send;
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });

      async function send() {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        self._messages.push({ who: 'user', html: esc(text) });
        paint();
        const thinking = { who: 'bot', html: '<div class="m-title">' + CN.icon('sparkles') + '…</div>' };
        self._messages.push(thinking); paint();
        try {
          const res = await CN.copilot.run(text, { patient: CN.app.patient(), settings: CN.store.settings || {} });
          thinking.html = renderResponse(res);
          paint();
          bindActions(res);
        } catch (e) {
          thinking.html = '<div class="m-title">' + CN.icon('alert') + '</div><p>' + esc(String(e.message || e)) + '</p>';
          paint();
        }
      }

      function renderResponse(res) {
        let hh = '<div class="m-title">' + CN.icon('sparkles') + esc(CN.APP_NAME) + '</div>';
        res.sections.forEach(s => {
          hh += '<div class="mt-1">' + (s.title ? '<div class="small strong">' + esc(t(s.title, s.vars)) + '</div>' : '') + '<div class="small">' + s.html + '</div></div>';
        });
        if (res.actions && res.actions.length) {
          hh += '<div class="msg-actions">' + res.actions.map((a, i) => '<button class="btn ' + (a.primary ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-copact="' + i + '">' + esc(a.label) + '</button>').join('') + '</div>';
        }
        return hh;
      }

      function bindActions(res) {
        const last = stream.lastElementChild;
        if (!last) return;
        last.querySelectorAll('[data-copact]').forEach(b => b.onclick = async () => {
          const a = res.actions[+b.getAttribute('data-copact')];
          if (!a) return;
          if (a.type === 'draft-plan' && res.plan) {
            const saved = await CN.store.save('plans', res.plan);
            CN.toast(t('copilot.draftReady'));
            CN.app.pendingPlanId = saved.id;
            CN.app.route('builder');
          } else if (a.type === 'open-builder') {
            if (res.plan && !res.plan.id) { const saved = await CN.store.save('plans', res.plan); CN.app.pendingPlanId = saved.id; }
            CN.app.route('builder');
          } else if (a.type === 'apply-swaps' && res.plan) {
            const saved = await CN.copilot.applySwaps(res.plan, res.changes);
            CN.toast(t('copilot.draftReady'));
            CN.app.pendingPlanId = saved.id;
            CN.app.route('builder');
          } else if (a.type === 'review-target' && res.payload) {
            CN.app.pendingTargetPayload = { patientId: CN.app.patient().id, suggested: res.payload.suggested };
            CN.app.route('energy');
          } else if (a.type === 'open-energy') {
            CN.app.route('energy');
          } else if (a.type === 'open-patients') {
            CN.app.route('patients');
          } else if (a.type === 'open-patient' && CN.app.patient()) {
            CN.vh.openDrawer(CN.app.patient().id);
          }
        });
      }
    }
  };

  /* ================= Follow-Up Management ================= */
  CN.views.followup = {
    render(root) {
      const p = CN.app.patient();
      let h = CN.vh.pageHead('fu.title', 'fu.sub',
        p ? '<button class="btn btn-primary" data-act="add">' + CN.icon('plus') + esc(t('fu.new')) + '</button>' : '');
      if (!p) { root.innerHTML = h + '<div class="card">' + CN.vh.needPatient('fu.selectPatient') + '</div>'; bindSimple(root); return; }

      const fus = CN.store.list('followups', { patientId: p.id }).sort((a, b) => (a.date > b.date ? -1 : 1));
      const energy = CN.store.list('energy', { patientId: p.id }).filter(e => e.status === 'approved').sort((a, b) => (a.date > b.date ? -1 : 1))[0];
      const prog = CN.engine.analyzeProgress(p, fus, energy);
      const re = energy ? CN.engine.reassess({ patient: p, followups: fus, energyPlan: energy, settings: CN.store.settings }) : null;

      h += '<div class="grid grid-2-1">';

      /* left: visits */
      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('fu.progress')) + '</h2></div>';
      if (prog.n < 2) h += '<p class="muted small">' + esc(t('fu.needTwo')) + '</p>';
      else {
        h += '<div class="grid grid-3 mb-2">' +
          mbox(t('fu.totalChange'), CN.fmt.signed(prog.total) + ' kg', CN.fmt.signed(prog.pct) + '%') +
          mbox(t('fu.avgWeekly'), CN.fmt.signed(prog.avgWeekly) + ' kg', '') +
          mbox(t('fu.vsExpected'), prog.vsExpected ? t('fu.' + prog.vsExpected) : '—', (function () { const a = []; if (isFinite(prog.expectedWeekly)) a.push(t('fu.expected') + ' ' + CN.fmt.signed(prog.expectedWeekly) + ' kg/wk'); return a.join(' · '); })()) +
          '</div>' +
          CN.chart.line({ series: [
            { name: t('fu.actual'), color: '#14213D', area: true, points: prog.series.map(s => ({ x: s.date, y: s.kg })) },
            (function () { if (!isFinite(prog.expectedWeekly) || prog.n < 2) return null; const pts = []; let y = prog.series[0].kg; prog.series.forEach(s => { pts.push({ x: s.date, y: y }); y += prog.expectedWeekly * (CN.util.daysBetween(s.date, prog.series[Math.min(prog.series.indexOf(s) + 1, prog.series.length - 1)].date) / 7); }); return { name: t('fu.expected'), color: '#C6A667', dashed: true, points: pts }; })()
          ].filter(Boolean), height: 230, yFmt: v => CN.fmt.n1(v), xFmt: d => CN.fmt.date(d) });
      }
      h += '</div>';

      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('fu.scheduled')) + '</h2></div><div id="fuSched"></div></div>';

      if (!fus.length) h += '<div class="card">' + CN.ui.empty(t('fu.none'), '', '<button class="btn btn-primary" data-act="add">' + esc(t('fu.new')) + '</button>', 'calendarCheck') + '</div>';
      else {
        h += '<div class="card"><div class="card-h"><h2>' + esc(t('patient.fus')) + '</h2></div>' + fus.map(f =>
          '<details class="exp"><summary>' + esc(CN.fmt.date(f.date)) + ' · ' + CN.fmt.n1(f.weight) + ' kg · ' + esc(t('fu.adherence.' + (f.adherence || 'good'))) + (f.nextDate ? ' · ' + esc(t('patient.nextFU')) + ': ' + esc(CN.fmt.date(f.nextDate)) : '') + '</summary><div class="exp-body">' +
          '<div class="kv-2">' +
          kvRow(t('fu.weight'), CN.fmt.n1(f.weight) + ' kg') + kvRow(t('fu.waist'), CN.fmt.n1(f.waistCm) + ' cm') + kvRow(t('fu.bodyFat'), CN.fmt.n1(f.bodyFatPct) + ' %') +
          kvRow(t('fu.adherence'), t('fu.adherence.' + (f.adherence || 'good'))) + kvRow(t('fu.appetite'), t('fu.appetite.' + (f.appetite || 'normal'))) +
          (f.gi ? kvRow(t('fu.gi'), f.gi) : '') + (f.feedback ? kvRow(t('fu.feedback'), f.feedback) : '') + (f.observations ? kvRow(t('fu.observations'), f.observations) : '') + (f.medChanges ? kvRow(t('fu.medChanges'), f.medChanges) : '') +
          '</div>' +
          '<div class="mt-2"><button class="btn btn-quiet btn-sm" data-fudel="' + f.id + '">' + CN.icon('trash') + ' ' + esc(t('common.delete')) + '</button></div>' +
          '</div></details>').join('') + '</div>';
      }
      h += '</div>';

      /* right: reassessment */
      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('fu.reassess')) + '</h3></div>' +
        '<p class="small muted">' + esc(t('fu.reassessText')) + '</p>';
      if (!re || !energy) h += '<p class="muted small">—</p>';
      else {
        if (re.changed) {
          h += '<div class="grid grid-2">' + mbox(t('fu.prevTarget'), CN.fmt.kcal(re.prevTarget) + ' kcal', '') + mbox(t('fu.suggested'), CN.fmt.kcal(re.suggested) + ' kcal', '') + '</div>';
        } else {
          h += '<div class="alert ok">' + CN.icon('check') + '<div>' + esc(t('fu.noReassess')) + '</div></div>';
        }
        if (re.reasons && re.reasons.length) h += '<div class="small mt-1"><b>' + esc(t('fu.reasons')) + ':</b><ul style="padding-inline-start:18px">' + re.reasons.map(r => '<li>' + esc(t(r.key)) + '</li>').join('') + '</ul></div>';
        if (re.changed) h += '<button class="btn btn-primary btn-sm" data-x="applyre">' + CN.icon('check') + esc(t('fu.applyTarget')) + '</button>';
      }
      h += '</div>';

      /* engine comparison */
      if (fus.length >= 2) {
        h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('fu.compare')) + '</h3></div><div id="fuCompare"></div></div>';
      }

      h += '<div class="card"><div class="card-h"><h3>' + esc(t('patient.overview')) + '</h3></div>' +
        CN.vh.kv([
          [t('bc.weight'), CN.fmt.kg(CN.store.currentWeight(p)) + ' kg'],
          [t('np.targetWeight'), CN.fmt.kg(p.targetWeight) + ' kg'],
          [t('energy.approvedTarget'), energy ? CN.fmt.kcal(energy.target) + ' kcal' : '—'],
          [t('patient.lastFU'), fus.length ? CN.fmt.date(fus[0].date) : '—']
        ]) + '</div>';
      h += '</div></div>';

      root.innerHTML = h;

      const addBtn = root.querySelector('[data-act=add]');
      if (addBtn) addBtn.onclick = () => openFuModal(p, () => CN.app.renderCurrent());
      root.querySelectorAll('[data-fudel]').forEach(b => b.onclick = async (e) => {
        e.preventDefault();
        if (await CN.modal.confirm({ message: t('common.delete') + '?', danger: true })) { await CN.store.remove('followups', b.getAttribute('data-fudel')); CN.app.renderCurrent(); }
      });
      const apBtn = root.querySelector('[data-x=applyre]');
      if (apBtn && re && re.changed && energy) apBtn.onclick = async () => {
        if (!await CN.modal.confirm({ message: t('fu.applyTarget') + ': ' + CN.fmt.kcal(re.suggested) + ' kcal?', confirmText: t('common.approve') })) return;
        const rec = Object.assign({}, energy);
        delete rec.id; delete rec.updatedAt; delete rec.createdAt;
        rec.date = CN.util.todayISO();
        rec.target = re.suggested;
        const delta = Math.abs(energy.tdee - re.suggested);
        if (p.goal === 'loss') rec.deficit = delta; else rec.surplus = delta;
        rec.status = 'approved'; rec.approvedAt = CN.util.nowISO();
        rec.explanation = t('fu.reassessText');
        await CN.store.save('energy', rec);
        CN.toast(t('fu.appliedTarget', { v: rec.target }));
        CN.app.renderCurrent();
      };

      /* schedule list: upcoming/overdue across this patient */
      const sched = root.querySelector('#fuSched');
      if (sched) {
        const entries = [];
        fus.forEach(f => { if (f.nextDate) entries.push({ date: f.nextDate, from: f.date, who: 'next' }); });
        if (!entries.length) sched.innerHTML = '<p class="muted small">' + esc(t('fu.noneScheduled')) + '</p>';
        else {
          entries.sort((a, b) => (a.date > b.date ? 1 : -1));
          sched.innerHTML = entries.map(e => {
            const diff = CN.util.daysBetween(CN.util.todayISO(), e.date);
            return '<div class="stat-line"><span>' + CN.icon('calendar') + ' ' + esc(CN.fmt.date(e.date)) + ' <span class="muted small">(' + esc(t('common.from')) + ' ' + esc(CN.fmt.date(e.from)) + ')</span></span>' +
              (diff < 0 ? '<span class="status overdue">' + esc(t('dash.overdueBy', { n: -diff })) + '</span>' : '<span class="status upcoming">' + (diff === 0 ? esc(t('dash.today')) : esc(t('dash.dueIn', { n: diff }))) + '</span>') + '</div>';
          }).join('');
        }
      }
      /* compare visits */
      const cmp = root.querySelector('#fuCompare');
      if (cmp && fus.length >= 2) {
        const opts = fus.map((f, i) => '<option value="' + i + '">' + esc(CN.fmt.date(f.date)) + '</option>').join('');
        cmp.innerHTML = '<div class="form-grid-2"><div class="field"><label>' + esc(t('fu.compareA')) + '</label><select class="select" id="fuA">' + opts + '</select></div>' +
          '<div class="field"><label>' + esc(t('fu.compareB')) + '</label><select class="select" id="fuB">' + opts + '</select></div></div><div id="fuDelta"></div>';
        const sA = cmp.querySelector('#fuA'), sB = cmp.querySelector('#fuB');
        sB.selectedIndex = Math.min(1, fus.length - 1);
        function renderD() {
          const a = fus[+sA.value], b = fus[+sB.value];
          const rows = [['weight', t('fu.weight')], ['waistCm', t('fu.waist')], ['bodyFatPct', t('fu.bodyFat')], ['muscleKg', t('fu.muscle')]];
          cmp.querySelector('#fuDelta').innerHTML = '<table class="table" style="min-width:0"><thead><tr><th></th><th>' + esc(CN.fmt.date(a.date)) + '</th><th>' + esc(CN.fmt.date(b.date)) + '</th><th>Δ</th></tr></thead><tbody>' +
            rows.map(r2 => { const va = CN.util.parseNum(a[r2[0]]), vb = CN.util.parseNum(b[r2[0]]); return '<tr><td>' + esc(r2[1]) + '</td><td>' + CN.fmt.n1(va) + '</td><td>' + CN.fmt.n1(vb) + '</td><td><b>' + CN.fmt.signed(vb - va) + '</b></td></tr>'; }).join('') + '</tbody></table>';
        }
        sA.onchange = renderD; sB.onchange = renderD; renderD();
      }
      bindSimple(root);

      function mbox(label, value, sub) { return '<div class="measure-box"><div class="mb-label">' + esc(label) + '</div><div class="mb-value">' + esc(value) + '</div><div class="mb-sub">' + esc(sub || '') + '</div></div>'; }
      function kvRow(k, v) { return '<span>' + esc(k) + '</span><b>' + esc(v) + '</b>'; }
      function openFuModal(patient, onSaved) { return openFuModalFn(patient, onSaved); }
    }
  };

  /* follow-up modal (module-level) */
  function openFuModalFn(patient, onSaved) {
    const m = CN.modal.open({
      title: t('fu.new'), sub: patient.fullName, wide: true,
      foot: '<button class="btn btn-ghost" data-x="c">' + esc(t('common.cancel')) + '</button><button class="btn btn-primary" data-x="s">' + CN.icon('save') + esc(t('fu.save')) + '</button>',
      body: '<div class="form-grid-3">' +
        fl(t('fu.date'), '<input class="input" type="date" id="fuD" value="' + CN.util.todayISO() + '"/>') +
        fl(t('fu.weight'), '<input class="input" type="number" step="0.1" id="fuW" value="' + CN.fmt.kg(CN.store.currentWeight(patient)) + '"/>') +
        fl(t('fu.waist'), '<input class="input" type="number" step="0.1" id="fuWa" value="' + esc(patient.waistCm || '') + '"/>') +
        fl(t('fu.bodyFat'), '<input class="input" type="number" step="0.1" id="fuBF" value="' + esc(patient.bodyFatPct || '') + '"/>') +
        fl(t('fu.muscle'), '<input class="input" type="number" step="0.1" id="fuM" value="' + esc(patient.muscleKg || '') + '"/>') +
        fl(t('fu.visceral'), '<input class="input" type="number" step="0.1" id="fuV" value="' + esc(patient.visceralFat || '') + '"/>') +
        '</div><div class="form-grid-2">' +
        fl(t('fu.adherence'), '<select class="select" id="fuAd">' + ['excellent', 'good', 'fair', 'poor'].map(v => '<option value="' + v + '"' + (v === 'good' ? ' selected' : '') + '>' + esc(t('fu.adherence.' + v)) + '</option>').join('') + '</select>') +
        fl(t('fu.appetite'), '<select class="select" id="fuAp">' + ['normal', 'decreased', 'increased'].map(v => '<option value="' + v + '">' + esc(t('fu.appetite.' + v)) + '</option>').join('') + '</select>') +
        '</div><div class="form-grid-2">' +
        fl(t('fu.gi'), '<input class="input" id="fuGI"/>') +
        fl(t('fu.medChanges'), '<input class="input" id="fuMed"/>') +
        '</div>' +
        fl(t('fu.feedback'), '<textarea class="textarea" id="fuFb" rows="2"></textarea>') +
        fl(t('fu.observations'), '<textarea class="textarea" id="fuOb" rows="2"></textarea>') +
        '<div class="form-grid-2">' +
        fl(t('fu.labsNote'), '<input class="input" id="fuLabs"/>') +
        fl(t('fu.nextDate'), '<input class="input" type="date" id="fuN"/>') +
        '</div>',
      onMount(box, mm) {
        box.querySelector('[data-x=c]').onclick = () => mm.close();
        box.querySelector('[data-x=s]').onclick = async () => {
          const g = id => box.querySelector(id).value;
          const gn = id => CN.util.parseNum(g(id));
          const rec = {
            patientId: patient.id, date: g('#fuD') || CN.util.todayISO(),
            weight: gn('#fuW'), waistCm: gn('#fuWa'), bodyFatPct: gn('#fuBF'), muscleKg: gn('#fuM'), visceral: gn('#fuV'),
            adherence: g('#fuAd'), appetite: g('#fuAp'), gi: g('#fuGI'), medChanges: g('#fuMed'),
            feedback: g('#fuFb'), observations: g('#fuOb'), labsNote: g('#fuLabs'),
            nextDate: g('#fuN') || null
          };
          await CN.store.save('followups', rec);
          if (isFinite(rec.weight)) await CN.store.appendWeight(patient, rec.weight, rec.date, 'clinic');
          ['waistCm', 'bodyFatPct', 'muscleKg', 'visceralFat'].forEach(k => { });
          if (isFinite(rec.waistCm)) patient.waistCm = rec.waistCm;
          if (isFinite(rec.bodyFatPct)) patient.bodyFatPct = rec.bodyFatPct;
          if (isFinite(rec.muscleKg)) patient.muscleKg = rec.muscleKg;
          if (isFinite(rec.visceral)) patient.visceralFat = rec.visceral;
          await CN.store.savePatient(patient);
          CN.toast(t('fu.saved'));
          mm.close();
          if (onSaved) onSaved();
        };
      }
    });
    function fl(label, input) { return '<div class="field"><label>' + esc(label) + '</label>' + input + '</div>'; }
  }

  function bindSimple(root) {
    root.querySelectorAll('[data-act=goto-energy]').forEach(b => b.onclick = () => CN.app.route('energy'));
    root.querySelectorAll('[data-act=goto-patients]').forEach(b => b.onclick = () => CN.app.route('patients'));
  }

  console.log('NutriClinic views-planning.js loaded');
})();
