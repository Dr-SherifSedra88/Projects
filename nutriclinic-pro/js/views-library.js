/* ============================================================
   NutriClinic Pro — views-library.js
   Food Database · Clinical References · Reports & PDF · Settings
   ============================================================ */
'use strict';
(function () {
  const t = (k, v) => CN.i18n.t(k, v);
  const esc = CN.util.esc;

  /* ================= Food Database ================= */
  CN.views.foods = {
    _q: '', _group: '', _tag: '', _mode: 'household', _limit: 60,
    render(root) {
      const self = this;
      let list = CN.FOODS.slice();
      const q = this._q.toLowerCase();
      if (this._group) list = list.filter(f => f.group === this._group);
      if (this._tag) list = list.filter(f => f.tags.includes(this._tag));
      if (q) list = list.filter(f => f.en.toLowerCase().includes(q) || String(f.ar).includes(q) || f.id.includes(q));
      const total = list.length;
      list = list.slice(0, this._limit);

      let h = CN.vh.pageHead('foods.title', 'foods.sub',
        '<button class="btn btn-ghost" data-act="recipe">' + CN.icon('utensils') + esc(t('foods.addRecipe')) + '</button>' +
        '<button class="btn btn-primary" data-act="add">' + CN.icon('plus') + esc(t('foods.addFood')) + '</button>');

      h += '<div class="card pad-sm mb-3"><div class="flex flex-wrap">' +
        '<div class="searchbox grow" style="min-width:240px">' + CN.icon('search') + '<input class="input" id="fdQ" placeholder="' + esc(t('foods.searchPlaceholder')) + '" value="' + esc(this._q) + '"/></div>' +
        '<select class="select" id="fdGroup" style="width:180px"><option value="">' + esc(t('foods.filterGroup')) + '</option>' + CN.FOOD_GROUPS.map(g => '<option value="' + g.id + '"' + (this._group === g.id ? ' selected' : '') + '>' + esc(CN.i18n.lang() === 'ar' ? g.ar : g.en) + '</option>').join('') + '</select>' +
        '<select class="select" id="fdTag" style="width:190px"><option value="">' + esc(t('foods.filterTags')) + '</option>' + CN.FOOD_TAGS.map(tg => '<option value="' + tg + '"' + (this._tag === tg ? ' selected' : '') + '>' + esc(t('foods.tag.' + tg) === 'foods.tag.' + tg ? tg : t('foods.tag.' + tg)) + '</option>').join('') + '</select>' +
        '<div class="seg"><button data-mode="household" class="' + (this._mode === 'household' ? 'on' : '') + '">' + esc(t('foods.portionHousehold')) + '</button><button data-mode="grams" class="' + (this._mode === 'grams' ? 'on' : '') + '">' + esc(t('foods.portionGrams')) + '</button></div>' +
        '<span class="muted small">' + esc(t('foods.count', { n: total })) + '</span>' +
        '</div></div>';

      h += '<div class="table-scroll"><table class="table"><thead><tr>' +
        '<th>' + t('foods.col.en') + '</th><th>' + t('foods.col.ar') + '</th><th>' + t('foods.col.portion') + '</th><th>kcal</th><th>P</th><th>C</th><th>F</th><th>' + t('foods.col.fiber') + '</th><th>' + t('foods.col.sodium') + '</th><th>' + t('foods.col.source') + '</th></tr></thead><tbody>';
      list.forEach(f => {
        h += '<tr data-food="' + f.id + '" style="cursor:pointer"><td><b>' + esc(f.en) + '</b>' + (f.custom ? ' <span class="chip gold">' + esc(t('common.custom')) + '</span>' : '') + '</td><td>' + esc(f.ar) + '</td>' +
          '<td class="small">' + esc(self._mode === 'household' ? f.ptext : f.grams + ' g') + '</td>' +
          '<td class="tnum">' + f.kcal + '</td><td class="tnum">' + f.p + '</td><td class="tnum">' + f.c + '</td><td class="tnum">' + f.f + '</td>' +
          '<td class="tnum small">' + (f.fiber === null || f.fiber === undefined ? '—' : f.fiber) + '</td><td class="tnum small">' + (f.sodium === null || f.sodium === undefined ? '—' : CN.fmt.n0(f.sodium)) + '</td>' +
          '<td class="muted xsmall">' + esc(f.source) + '</td></tr>';
      });
      h += '</tbody></table></div>';
      if (total > list.length) h += '<div class="center mt-2"><button class="btn btn-ghost" data-act="more">' + esc(t('common.showMore')) + ' (' + (total - list.length) + ')</button></div>';
      h += '<div class="alert info mt-3">' + CN.icon('info') + '<div><b>' + esc(t('foods.assumptions')) + ':</b> ' + esc(t('foods.assumptionsText')) + '</div></div>';

      root.innerHTML = h;
      const rerender = () => CN.app.renderCurrent();
      root.querySelector('#fdQ').addEventListener('input', CN.util.debounce(e => { self._q = e.target.value; rerender(); }, 220));
      root.querySelector('#fdGroup').onchange = e => { self._group = e.target.value; rerender(); };
      root.querySelector('#fdTag').onchange = e => { self._tag = e.target.value; rerender(); };
      root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { self._mode = b.getAttribute('data-mode'); rerender(); });
      const more = root.querySelector('[data-act=more]'); if (more) more.onclick = () => { self._limit += 100; rerender(); };
      root.querySelector('[data-act=add]').onclick = () => openFoodForm(null, rerender);
      root.querySelector('[data-act=recipe]').onclick = () => openRecipeForm(rerender);
      root.querySelectorAll('[data-food]').forEach(tr => tr.onclick = () => openFoodDetail(tr.getAttribute('data-food'), rerender));
    }
  };

  function openFoodDetail(id, onChange) {
    const f = CN.foodById(id);
    if (!f) return;
    const per100 = (v) => v === null || v === undefined ? '—' : (Math.round((v / f.grams) * 100 * 10) / 10);
    const m = CN.modal.open({
      title: CN.i18n.lang() === 'ar' ? f.ar : f.en, sub: (f.en) + ' · ' + f.source, narrow: true,
      body: '<div class="nutri-strip mb-2"><div><b>' + f.kcal + '</b><span class="muted small"> kcal</span></div><div><b>' + f.p + ' g</b><span class="muted small"> P</span></div><div><b>' + f.c + ' g</b><span class="muted small"> C</span></div><div><b>' + f.f + ' g</b><span class="muted small"> F</span></div></div>' +
        '<div class="kv-2">' +
        '<span>' + esc(t('rpt.portion')) + '</span><b>' + esc(f.ptext) + ' (' + f.grams + ' g)</b>' +
        '<span>' + esc(t('foods.per100')) + '</span><b>' + per100(f.kcal) + ' kcal · P ' + per100(f.p) + ' · C ' + per100(f.c) + ' · F ' + per100(f.f) + '</b>' +
        (f.fiber !== null ? '<span>' + esc(t('macro.fiber')) + '</span><b>' + f.fiber + ' g /portion</b>' : '') +
        (f.sodium !== null ? '<span>' + esc(t('macro.sodium')) + '</span><b>' + CN.fmt.n0(f.sodium) + ' mg /portion</b>' : '') +
        (f.gi ? '<span>GI</span><b>' + esc(f.gi) + '</b>' : '') +
        '<span>' + esc(t('foods.allergens')) + '</span><b>' + esc(f.tags.filter(x => ['gluten', 'dairy', 'egg', 'nuts', 'peanut', 'sesame', 'seafood'].includes(x)).join(', ') || t('foods.none')) + '</b>' +
        '</div>' +
        (f.micros ? '<p class="small muted mt-2">' + CN.icon('info') + ' ' + esc(f.micros) + '</p>' : '') +
        (f.custom ? '<p class="cite mt-1">' + esc(t('foods.verify')) + '</p>' : '') +
        '<div class="tag-list mt-2">' + f.tags.map(x => '<span class="tag">' + esc(t('foods.tag.' + x) === 'foods.tag.' + x ? x : t('foods.tag.' + x)) + '</span>').join('') + '</div>',
      foot: f.custom ? '<button class="btn btn-danger" data-x="del">' + esc(t('common.delete')) + '</button>' : '',
      onMount(box, mm) {
        const del = box.querySelector('[data-x=del]');
        if (del) del.onclick = async () => {
          if (!await CN.modal.confirm({ message: t('common.delete') + '?', danger: true })) return;
          await CN.store.remove('foods', f.id);
          const i = CN.FOODS.findIndex(x => x.id === f.id); if (i >= 0) CN.FOODS.splice(i, 1);
          mm.close(); if (onChange) onChange();
        };
      }
    });
  }

  function openFoodForm(existing, onSaved) {
    const f = existing || { en: '', ar: '', group: 'protein', ptext: '100 g', grams: 100, p: 0, c: 0, f: 0, fiber: null, sodium: null, tags: [] };
    const m = CN.modal.open({
      title: t('foods.addFood'), wide: true,
      body: '<div class="form-grid-3">' +
        fl('English name', '<input class="input" id="cfEn" value="' + esc(f.en) + '"/>') +
        fl('الاسم بالعربية', '<input class="input" id="cfAr" value="' + esc(f.ar) + '"/>') +
        fl(t('foods.col.group'), '<select class="select" id="cfG">' + CN.FOOD_GROUPS.map(g => '<option value="' + g.id + '"' + (f.group === g.id ? ' selected' : '') + '>' + esc(CN.i18n.lang() === 'ar' ? g.ar : g.en) + '</option>').join('') + '</select>') +
        '</div><div class="form-grid-3">' +
        fl(t('rpt.portion') + ' (household text)', '<input class="input" id="cfPtext" value="' + esc(f.ptext) + '"/>') +
        fl('Portion grams', '<input class="input" type="number" id="cfGrams" value="' + f.grams + '"/>') +
        fl('kcal (auto = 4/4/9)', '<input class="input" type="number" id="cfKcal" value="' + f.kcal + '" disabled/>') +
        '</div><div class="form-grid-3">' +
        fl('Protein g', '<input class="input" type="number" step="0.1" id="cfP" value="' + f.p + '"/>') +
        fl('Carbs g', '<input class="input" type="number" step="0.1" id="cfC" value="' + f.c + '"/>') +
        fl('Fat g', '<input class="input" type="number" step="0.1" id="cfF" value="' + f.f + '"/>') +
        '</div><div class="form-grid-2">' +
        fl('Fiber g /portion', '<input class="input" type="number" step="0.1" id="cfFib" value="' + (f.fiber === null ? '' : f.fiber) + '"/>') +
        fl('Sodium mg /portion', '<input class="input" type="number" id="cfSod" value="' + (f.sodium === null ? '' : f.sodium) + '"/>') +
        '</div>' +
        '<div class="field"><label>Tags</label><div class="flex flex-wrap">' + CN.FOOD_TAGS.map(tg => '<label class="check"><input type="checkbox" data-tg="' + tg + '"' + (f.tags.includes(tg) ? ' checked' : '') + '/><span class="small">' + esc(tg) + '</span></label>').join('') + '</div></div>',
      foot: '<button class="btn btn-ghost" data-x="c">' + esc(t('common.cancel')) + '</button><button class="btn btn-primary" data-x="s">' + CN.icon('save') + esc(t('foods.saveFood')) + '</button>',
      onMount(box, mm) {
        const calc = () => {
          const p = CN.util.parseNum(box.querySelector('#cfP').value) || 0, c = CN.util.parseNum(box.querySelector('#cfC').value) || 0, ff = CN.util.parseNum(box.querySelector('#cfF').value) || 0;
          box.querySelector('#cfKcal').value = Math.round(p * 4 + c * 4 + ff * 9);
        };
        ['#cfP', '#cfC', '#cfF'].forEach(s => box.querySelector(s).addEventListener('input', calc));
        box.querySelector('[data-x=c]').onclick = () => mm.close();
        box.querySelector('[data-x=s]').onclick = async () => {
          const en = box.querySelector('#cfEn').value.trim();
          if (!en) { CN.toast(t('common.requiredMark'), 'burg'); return; }
          const grams = CN.util.parseNum(box.querySelector('#cfGrams').value) || 100;
          const p = CN.util.parseNum(box.querySelector('#cfP').value) || 0, c = CN.util.parseNum(box.querySelector('#cfC').value) || 0, ff = CN.util.parseNum(box.querySelector('#cfF').value) || 0;
          const rec = {
            id: f.id || ('f-custom-' + CN.util.uid('x').slice(-6)),
            en, ar: box.querySelector('#cfAr').value.trim() || en, group: box.querySelector('#cfG').value,
            ptext: box.querySelector('#cfPtext').value.trim() || (grams + ' g'), grams,
            p: Math.round(p * 10) / 10, c: Math.round(c * 10) / 10, f: Math.round(ff * 10) / 10, kcal: Math.round(p * 4 + c * 4 + ff * 9),
            fiber: box.querySelector('#cfFib').value === '' ? null : CN.util.parseNum(box.querySelector('#cfFib').value),
            sodium: box.querySelector('#cfSod').value === '' ? null : CN.util.parseNum(box.querySelector('#cfSod').value),
            sugar: null, gi: null, micros: null,
            tags: Array.from(box.querySelectorAll('[data-tg]:checked')).map(x => x.getAttribute('data-tg')),
            source: 'Custom (clinic)', custom: true
          };
          await CN.store.save('foods', rec);
          const i = CN.FOODS.findIndex(x => x.id === rec.id);
          if (i >= 0) CN.FOODS[i] = rec; else CN.FOODS.push(rec);
          CN.toast(t('foods.saved'));
          mm.close();
          if (onSaved) onSaved();
        };
      }
    });
    function fl(label, input) { return '<div class="field"><label>' + esc(label) + '</label>' + input + '</div>'; }
  }

  function openRecipeForm(onSaved) {
    const rows = [];
    const m = CN.modal.open({
      title: t('foods.recipe'), sub: t('foods.recipeHint'), wide: true,
      body: '<div class="form-grid-3">' +
        '<div class="field"><label>Recipe name (EN)</label><input class="input" id="rcEn" placeholder="e.g. Koshary (home)"/></div>' +
        '<div class="field"><label>اسم الوصفة (AR)</label><input class="input" id="rcAr"/></div>' +
        '<div class="field"><label>' + esc(t('foods.yield')) + '</label><input class="input" type="number" id="rcYield" value="1000"/></div>' +
        '</div>' +
        '<div class="section-title">' + esc(t('foods.ingredients')) + '</div><div id="rcRows"></div>' +
        '<div class="flex mt-1"><select class="select" id="rcPick" style="max-width:320px">' + CN.FOODS.slice(0, 400).map(f => '<option value="' + f.id + '">' + esc(CN.i18n.lang() === 'ar' ? f.ar : f.en) + '</option>').join('') + '</select>' +
        '<input class="input" type="number" step="0.5" id="rcQty" value="1" style="width:90px"/>' +
        '<button class="btn btn-ghost btn-sm" data-x="addI">' + CN.icon('plus') + esc(t('foods.addIngredient')) + '</button></div>' +
        '<div id="rcTotals" class="mt-2"></div>',
      foot: '<button class="btn btn-ghost" data-x="c">' + esc(t('common.cancel')) + '</button><button class="btn btn-primary" data-x="s">' + esc(t('foods.saveFood')) + '</button>',
      onMount(box, mm) {
        const rowsHost = box.querySelector('#rcRows');
        function render() {
          rowsHost.innerHTML = rows.length ? rows.map((r, i) => {
            const f = CN.foodById(r.foodId);
            return '<div class="stat-line"><span>' + esc(f ? (CN.i18n.lang() === 'ar' ? f.ar : f.en) : r.foodId) + ' — ' + CN.planner.fmtQty(r.qty) + '× <span class="muted small">≈' + Math.round((f ? f.grams : 0) * r.qty) + ' g</span></span><button class="btn btn-quiet btn-sm" data-rm="' + i + '">' + CN.icon('trash') + '</button></div>';
          }).join('') : '<p class="muted small">—</p>';
          rowsHost.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { rows.splice(+b.getAttribute('data-rm'), 1); render(); });
          const tot = rows.reduce((s, r) => { const f = CN.foodById(r.foodId); if (f) { s.kcal += f.kcal * r.qty; s.p += f.p * r.qty; s.c += f.c * r.qty; s.f += f.f * r.qty; } return s; }, { kcal: 0, p: 0, c: 0, f: 0 });
          const yieldG = CN.util.parseNum(box.querySelector('#rcYield').value) || 1;
          box.querySelector('#rcTotals').innerHTML = '<div class="nutri-strip"><div><b>' + CN.fmt.n0(tot.kcal) + '</b><span class="muted small"> kcal total</span></div><div><b>' + CN.fmt.n0(tot.kcal / yieldG * 100) + '</b><span class="muted small"> kcal/100g</span></div><div><b>' + CN.fmt.n1(tot.p) + ' g</b><span class="muted small"> P</span></div><div><b>' + CN.fmt.n1(tot.c) + ' g</b><span class="muted small"> C</span></div><div><b>' + CN.fmt.n1(tot.f) + ' g</b><span class="muted small"> F</span></div></div>';
        }
        box.querySelector('[data-x=addI]').onclick = () => {
          rows.push({ foodId: box.querySelector('#rcPick').value, qty: Math.max(0.25, CN.util.parseNum(box.querySelector('#rcQty').value) || 1) });
          render();
        };
        box.querySelector('#rcYield').addEventListener('input', render);
        box.querySelector('[data-x=c]').onclick = () => mm.close();
        box.querySelector('[data-x=s]').onclick = async () => {
          const en = box.querySelector('#rcEn').value.trim() || 'Recipe';
          if (!rows.length) { CN.toast(t('common.requiredMark'), 'burg'); return; }
          const yieldG = CN.util.parseNum(box.querySelector('#rcYield').value) || 1;
          const tot = rows.reduce((s, r) => { const f = CN.foodById(r.foodId); if (f) { s.kcal += f.kcal * r.qty; s.p += f.p * r.qty; s.c += f.c * r.qty; s.f += f.f * r.qty; } return s; }, { kcal: 0, p: 0, c: 0, f: 0 });
          const rec = {
            id: 'f-custom-' + CN.util.uid('x').slice(-6),
            en, ar: box.querySelector('#rcAr').value.trim() || en, group: 'mixed',
            ptext: '1 serving (≈100 g, yield ' + yieldG + ' g)', grams: 100,
            p: Math.round(tot.p / yieldG * 1000) / 10, c: Math.round(tot.c / yieldG * 1000) / 10, f: Math.round(tot.f / yieldG * 1000) / 10,
            kcal: Math.round(tot.kcal / yieldG * 100),
            fiber: null, sodium: null, sugar: null, gi: null, micros: CN.i18n.t('foods.recipeHint'),
            tags: ['custom'], source: 'Custom recipe (clinic)', custom: true
          };
          await CN.store.save('foods', rec);
          CN.FOODS.push(rec);
          CN.toast(t('foods.reciped'));
          mm.close();
          if (onSaved) onSaved();
        };
        render();
      }
    });
  }

  /* ================= Clinical References ================= */
  CN.views.refs = {
    _q: '',
    render(root) {
      const self = this;
      const q = this._q.toLowerCase();
      const briefs = CN.REFS.filter(r => !q || (r.title + ' ' + r.summary + ' ' + (r.points || []).join(' ')).toLowerCase().includes(q));
      const docs = CN.store.list('kb');
      const settings = CN.store.settings || {};

      let h = CN.vh.pageHead('refs.title', 'refs.sub',
        '<button class="btn btn-primary" data-act="upload">' + CN.icon('upload') + esc(t('refs.upload')) + '</button>');
      h += '<div class="searchbox mb-3" style="max-width:520px">' + CN.icon('search') + '<input class="input" id="rfQ" placeholder="' + esc(t('refs.searchPlaceholder')) + '" value="' + esc(this._q) + '"/></div>';

      h += '<div class="grid grid-2-1"><div>';
      h += '<div class="section-title">' + esc(t('refs.briefs')) + ' (' + briefs.length + ')</div>';
      h += '<div class="grid grid-2">' + briefs.map(r => '<div class="ref-card" data-ref="' + r.id + '"><h4>' + esc(r.title) + '</h4><div class="small muted">' + esc(r.summary.slice(0, 130)) + '…</div><div class="tag-list mt-1">' + (r.tags || []).slice(0, 4).map(tg => '<span class="tag">' + esc(tg) + '</span>').join('') + '</div></div>').join('') + '</div>';
      if (!briefs.length) h += '<p class="muted small">' + esc(t('refs.noResults')) + '</p>';

      h += '<div class="section-title mt-3">' + esc(t('refs.kb')) + '</div>';
      h += '<div class="card">' + (docs.length ? docs.map(d => '<div class="stat-line"><span>' + CN.icon('fileText') + ' <b class="small">' + esc(d.name) + '</b><br><span class="xsmall muted">' + CN.util.bytes(d.size) + ' · ' + esc(CN.fmt.date(d.uploadedAt)) + ' · ' + esc(d.text ? t('refs.textExtracted') : t('refs.fileStored')) + '</span></span><span class="flex">' +
        '<button class="btn btn-quiet btn-sm" data-dl="' + d.id + '">' + esc(t('common.download')) + '</button>' +
        '<button class="btn btn-quiet btn-sm" data-del="' + d.id + '">' + CN.icon('trash') + '</button></span></div>').join('') : '<p class="muted small">' + esc(t('refs.noDocs')) + '</p>') +
        '<p class="cite mt-1">' + esc(t('refs.uploadHint')) + '</p></div>';
      h += '</div>';

      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('refs.hierarchy')) + '</h3></div><ol class="ref-body" style="padding-inline-start:18px">' + CN.KB_HIERARCHY.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol><p class="cite">' + esc(t('refs.hierarchyNote')) + '</p></div>';
      h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('refs.external')) + '</h3></div>' +
        CN.EXTERNAL_SOURCES.map(s => '<div class="stat-line"><span><b class="small">' + esc(s.name) + '</b><br><span class="xsmall muted">' + esc(s.note) + '</span></span>' +
          '<a class="btn btn-ghost btn-sm" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + CN.icon('external') + esc(t('common.open')) + '</a></div>').join('') + '</div>';
      h += '<div class="card"><div class="card-h"><h3>' + esc(t('refs.research')) + '</h3></div>' +
        '<p class="small muted">' + esc(t('refs.researchHint')) + '</p>' +
        '<div class="field"><input class="input" id="rsQ" placeholder="' + esc(t('refs.queryPlaceholder')) + '"/></div>' +
        '<div class="flex"><button class="btn btn-ghost btn-sm" data-act="copyq">' + CN.icon('copy') + esc(t('refs.copyQuery')) + '</button>' +
        '<select class="select" id="rsSrc" style="width:220px">' + CN.EXTERNAL_SOURCES.map(s => '<option value="' + esc(s.url) + '">' + esc(s.name) + '</option>').join('') + '</select>' +
        '<button class="btn btn-primary btn-sm" data-act="openq">' + CN.icon('external') + esc(t('refs.openSource')) + '</button></div>' +
        '<p class="cite mt-2">' + CN.icon('shield') + ' ' + esc(t('refs.deidentify')) + '</p></div>';
      h += '</div></div>';

      root.innerHTML = h;
      const rerender = () => CN.app.renderCurrent();
      root.querySelector('#rfQ').addEventListener('input', CN.util.debounce(e => { self._q = e.target.value; rerender(); }, 240));
      root.querySelectorAll('[data-ref]').forEach(c => c.onclick = () => openBrief(c.getAttribute('data-ref')));
      root.querySelector('[data-act=upload]').onclick = () => uploadKB(rerender);
      root.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => { const rec = CN.store.get('kb', b.getAttribute('data-dl')); if (rec && rec.blob) CN.util.download(rec.name, rec.blob); });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await CN.modal.confirm({ message: t('file.deleteConfirm'), danger: true })) { await CN.store.remove('kb', b.getAttribute('data-del')); CN.toast(t('refs.removed')); rerender(); }
      });
      root.querySelector('[data-act=copyq]').onclick = async () => {
        const q2 = root.querySelector('#rsQ').value.trim();
        try { await navigator.clipboard.writeText(q2); CN.toast(t('refs.copied')); } catch (e) { CN.toast('Copy failed — select manually', 'burg'); }
      };
      root.querySelector('[data-act=openq]').onclick = () => {
        const q2 = root.querySelector('#rsQ').value.trim();
        const base = root.querySelector('#rsSrc').value;
        const url = base + (q2 ? (base.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q2) : '');
        window.open(url, '_blank', 'noopener');
      };
    }
  };

  function openBrief(id) {
    const r = CN.REFS.find(x => x.id === id);
    if (!r) return;
    CN.modal.open({
      title: CN.i18n.lang() === 'ar' ? r.titleAr || r.title : r.title, sub: r.src, wide: true,
      body: '<div class="ref-body"><p>' + esc(r.summary) + '</p><ul>' + (r.points || []).map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
        (r.cites ? '<p class="cite">' + esc(r.cites) + '</p>' : '') +
        '<p class="cite">' + esc(CN.KB_DISCLAIMER) + '</p></div>'
    });
  }

  async function uploadKB(onDone) {
    const files = await CN.util.pickFiles({ multiple: true, accept: '.pdf,.docx,.xlsx,.csv,.txt,.md,.json' });
    for (const file of files) {
      let text = null;
      const isText = /text|json|csv|markdown/.test(file.type) || /\.(txt|md|csv|json)$/i.test(file.name);
      if (isText) {
        try { text = (await CN.util.readFileAsText(file)).slice(0, 400000); } catch (e) { text = null; }
      }
      await CN.store.save('kb', { name: file.name, mime: file.type, size: file.size, kind: 'kb', text, blob: file, uploadedAt: CN.util.nowISO() });
    }
    CN.toast(t('refs.added'));
    if (onDone) onDone();
  }

  /* ================= Reports & PDF ================= */
  CN.views.reports = {
    _state: { type: 'dietPlan', planId: '', template: 'branded', fontSize: 12 },
    render(root) {
      const p = CN.app.patient();
      const self = this;
      let h = CN.vh.pageHead('rpt.title', 'rpt.sub');
      if (!p) { root.innerHTML = h + '<div class="card">' + CN.vh.needPatient('common.selectPatientFirst') + '</div>'; bindSimple(root); return; }

      const settings = CN.store.settings || {};
      const customTpls = settings.pdfTemplates || [];
      const plans = CN.store.list('plans', { patientId: p.id }).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      const st = this._state;
      if (!st.planId && plans.length) st.planId = plans[0].id;

      h += '<div class="grid grid-2-1"><div>';
      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('rpt.reportType')) + '</h2></div>' +
        '<div class="seg mb-2" id="rpType">' + [['dietPlan', 'rpt.dietPlan'], ['patientSummary', 'rpt.patientSummary'], ['followupReport', 'rpt.followupReport'], ['assessmentReport', 'rpt.assessmentReport']].map(x => '<button data-ty="' + x[0] + '" class="' + (st.type === x[0] ? 'on' : '') + '">' + esc(t(x[1])) + '</button>').join('') + '</div>' +
        (st.type === 'dietPlan' ? '<div class="field"><label>' + esc(t('rpt.selectPlan')) + '</label><select class="select" id="rpPlan">' +
          (plans.length ? plans.map(pl => '<option value="' + pl.id + '"' + (st.planId === pl.id ? ' selected' : '') + '>' + esc((pl.title || t('builder.planTitle')) + ' · ' + t('builder.version', { n: pl.version }) + ' · ' + CN.fmt.date(pl.updatedAt)) + '</option>').join('') : '<option value="">' + esc(t('rpt.noPlans')) + '</option>') +
          '</select></div>' : '') +
        '<div class="field"><label>' + esc(t('rpt.template')) + '</label><select class="select" id="rpTpl">' +
          '<option value="branded"' + (st.template === 'branded' ? ' selected' : '') + '>' + esc(t('rpt.branded')) + '</option>' +
          '<option value="plain"' + (st.template === 'plain' ? ' selected' : '') + '>' + esc(t('rpt.plain')) + '</option>' +
          customTpls.map(tp => '<option value="' + tp.id + '"' + (st.template === tp.id ? ' selected' : '') + '>' + esc(tp.name) + '</option>').join('') +
          '</select></div>' +
        '</div>';

      h += '<div class="card mb-3"><div class="card-h"><h2>' + esc(t('rpt.editTemplate')) + '</h2></div>' +
        '<div class="form-grid-2">' +
        '<div class="field"><label>' + esc(t('rpt.heading')) + '</label><input class="input" id="rpHeading" value="' + esc(st.heading || '') + '" placeholder="' + esc(t('rpt.dietPlan')) + '"/></div>' +
        '<div class="field"><label>' + esc(t('rpt.fontSize')) + '</label><select class="select" id="rpFont">' + [10, 11, 12, 13].map(v => '<option value="' + v + '"' + (st.fontSize === v ? ' selected' : '') + '>' + v + ' px</option>').join('') + '</select></div>' +
        '</div>' +
        '<div class="flex flex-wrap">' +
        ['showLogo', 'showNutrition', 'showSummary', 'showGuidelines', 'signature'].map(k => '<label class="check"><input type="checkbox" data-opt="' + k + '"' + ((st[k] === undefined ? (k !== 'showGuidelines' || true) : st[k]) ? ' checked' : '') + '/><span>' + esc(t('rpt.' + k)) + '</span></label>').join('') +
        '</div>' +
        '<div class="flex mt-3"><button class="btn btn-primary" data-x="preview">' + CN.icon('eye') + esc(t('rpt.previewBtn')) + '</button>' +
        '<button class="btn btn-ghost" data-x="saveTpl">' + CN.icon('save') + esc(t('rpt.saveTemplate')) + '</button></div>' +
        '</div>';
      h += '</div>';

      h += '<div>';
      h += '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('rpt.previewTitle')) + '</h3></div><p class="muted small">' + esc(t('rpt.emptyPreview')) + '</p><p class="cite">' + esc(t('common.printHint')) + '</p></div>';
      h += '<div class="card" id="rpTplList"><div class="card-h"><h3>' + esc(t('rpt.template')) + '</h3></div>' +
        (customTpls.length ? customTpls.map(tp => '<div class="stat-line"><span>' + esc(tp.name) + ' <span class="muted small">' + esc(tp.mode) + '</span></span><button class="btn btn-quiet btn-sm" data-tpldel="' + tp.id + '">' + CN.icon('trash') + '</button></div>').join('') : '<p class="muted small">—</p>') +
        '</div>';
      h += '</div></div>';

      root.innerHTML = h;

      root.querySelectorAll('#rpType [data-ty]').forEach(b => b.onclick = () => { st.type = b.getAttribute('data-ty'); CN.app.renderCurrent(); });
      const pp = root.querySelector('#rpPlan'); if (pp) pp.onchange = () => { st.planId = pp.value; };
      const tp = root.querySelector('#rpTpl'); if (tp) tp.onchange = () => { st.template = tp.value; const cust = customTpls.find(x => x.id === tp.value); if (cust) { st.fontSize = cust.fontSize || 12; st.heading = cust.heading; st.showLogo = cust.showLogo; st.showNutrition = cust.showNutrition; st.showSummary = cust.showSummary; st.showGuidelines = cust.showGuidelines; st.signature = cust.signature; } CN.app.renderCurrent(); };
      root.querySelector('#rpHeading').addEventListener('change', e => { st.heading = e.target.value; });
      root.querySelector('#rpFont').onchange = e => { st.fontSize = +e.target.value; };
      root.querySelectorAll('[data-opt]').forEach(cb => cb.onchange = () => { st[cb.getAttribute('data-opt')] = cb.checked; });
      root.querySelectorAll('[data-tpldel]').forEach(b => b.onclick = async () => {
        if (await CN.modal.confirm({ message: t('common.delete') + '?', danger: true })) {
          const arr = (CN.store.settings.pdfTemplates || []).filter(x => x.id !== b.getAttribute('data-tpldel'));
          await CN.store.saveSettings({ pdfTemplates: arr });
          CN.app.renderCurrent();
        }
      });
      root.querySelector('[data-x=saveTpl]').onclick = () => {
        const m = CN.modal.open({
          title: t('rpt.newTemplate'), narrow: true,
          body: '<div class="field"><label>' + esc(t('rpt.templateName')) + '</label><input class="input" id="ntName" value="' + esc(st.heading || t('rpt.dietPlan')) + '"/></div>',
          foot: '<button class="btn btn-ghost" data-x="c">' + esc(t('common.cancel')) + '</button><button class="btn btn-primary" data-x="s">' + esc(t('common.save')) + '</button>',
          onMount(box, mm) {
            box.querySelector('[data-x=c]').onclick = () => mm.close();
            box.querySelector('[data-x=s]').onclick = async () => {
              const arr = (CN.store.settings.pdfTemplates || []).slice();
              arr.push({ id: CN.util.uid('tpl'), name: box.querySelector('#ntName').value.trim() || 'Template', mode: st.template, heading: st.heading, fontSize: st.fontSize, showLogo: !!st.showLogo, showNutrition: !!st.showNutrition, showSummary: !!st.showSummary, showGuidelines: !!st.showGuidelines, signature: !!st.signature });
              await CN.store.saveSettings({ pdfTemplates: arr });
              CN.toast(t('rpt.templateSaved')); mm.close();
            };
          }
        });
      };
      root.querySelector('[data-x=preview]').onclick = async () => {
        const headingDefault = st.type === 'dietPlan' ? t('rpt.dietPlan') : st.type === 'patientSummary' ? t('rpt.patientSummary') : st.type === 'followupReport' ? t('rpt.followupReport') : t('rpt.assessmentReport');
        const opts = { mode: st.template === 'plain' ? 'plain' : 'branded', heading: st.heading || headingDefault, fontSize: st.fontSize, showLogo: st.showLogo, showNutrition: st.showNutrition, showSummary: st.showSummary, showGuidelines: st.showGuidelines, signature: st.signature };
        let html;
        if (st.type === 'dietPlan') {
          const plan = CN.store.get('plans', st.planId);
          if (!plan) { CN.toast(t('rpt.needPlan'), 'burg'); return; }
          html = await CN.pdf.buildDietPlanReport(plan, p, settings, opts);
        } else if (st.type === 'patientSummary') html = await CN.pdf.buildPatientSummary(p, settings, opts);
        else if (st.type === 'followupReport') html = await CN.pdf.buildFollowupReport(p, settings, opts);
        else html = await CN.pdf.buildAssessmentReport(p, settings, opts);
        CN.pdf.preview(html, { fontSize: st.fontSize });
      };
      bindSimple(root);
    }
  };

  /* ================= Settings ================= */
  CN.views.settings = {
    _tab: 'clinic',
    render(root) {
      const self = this;
      const settings = CN.store.settings || CN.store.defaultSettings();
      const h0 = CN.vh.pageHead('settings.title', 'settings.sub');
      const tabs = [['clinic', 'settings.clinic'], ['defaults', 'settings.defaults'], ['ai', 'settings.ai'], ['fields', 'settings.customFields'], ['data', 'settings.data'], ['about', 'settings.about']];
      let h = h0 + '<div class="tabs">' + tabs.map(tb => '<button class="tab' + (this._tab === tb[0] ? ' on' : '') + '" data-tab="' + tb[0] + '">' + esc(t(tb[1])) + '</button>').join('') + '</div><div id="stBody"></div>';
      root.innerHTML = h;
      root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { self._tab = b.getAttribute('data-tab'); CN.app.renderCurrent(); });
      const body = root.querySelector('#stBody');

      if (this._tab === 'clinic') {
        const c = settings.clinic || {};
        body.innerHTML = '<div class="card" style="max-width:900px"><div class="form-grid-2">' +
          fl('settings.clinicName', '<input class="input" data-s="clinic.name" value="' + esc(c.name || '') + '"/>') +
          fl('settings.clinicNameAr', '<input class="input" data-s="clinic.nameAr" value="' + esc(c.nameAr || '') + '"/>') +
          fl('settings.physician', '<input class="input" data-s="clinic.physician" value="' + esc(c.physician || '') + '"/>') +
          fl('settings.physicianTitle', '<input class="input" data-s="clinic.title" value="' + esc(c.title || '') + '"/>') +
          fl('settings.contact', '<input class="input" data-s="clinic.contact" value="' + esc(c.contact || '') + '"/>') +
          fl('settings.address', '<input class="input" data-s="clinic.address" value="' + esc(c.address || '') + '"/>') +
          '</div>' +
          '<div class="field"><label>' + esc(t('settings.logo')) + '</label><div class="flex"><span id="logoPrev">' + (c.logoFileId ? '' : '<span class="muted small">' + esc(t('settings.logoNone')) + '</span>') + '</span><button class="btn btn-ghost btn-sm" data-x="logo">' + CN.icon('upload') + esc(t('settings.logoUpload')) + '</button></div></div>' +
          '<div class="field"><label>' + esc(t('settings.accent')) + '</label><select class="select" data-s="clinic.accent" style="max-width:220px">' + [['#14213D', 'Deep Navy'], ['#800020', 'Burgundy'], ['#C6A667', 'Soft Gold']].map(x => '<option value="' + x[0] + '"' + ((c.accent || '#14213D') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>' +
          '<div class="divider"></div><button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(t('settings.saveBtn')) + '</button></div>';
        const lp = body.querySelector('#logoPrev');
        if (lp && c.logoFileId) {
          CN.pdf.logoDataUrl(settings).then(u => { if (u) lp.innerHTML = '<img src="' + u + '" style="height:54px;border-radius:8px"/>'; });
        }
        body.querySelector('[data-x=logo]').onclick = async () => {
          const files = await CN.util.pickFiles({ accept: 'image/*' });
          if (!files.length) return;
          const f = files[0];
          const rec = await CN.store.saveFile({ name: f.name, mime: f.type, size: f.size, kind: 'logo', blob: f });
          await CN.store.saveSettings({ clinic: Object.assign({}, c, { logoFileId: rec.id }) });
          CN.toast(t('common.saved')); CN.app.renderCurrent();
        };
        bindSave(body);
      }

      if (this._tab === 'defaults') {
        const d = settings.defaults || {};
        body.innerHTML = '<div class="card" style="max-width:900px"><div class="form-grid-2">' +
          fl('settings.defaultEq', '<select class="select" data-s="defaults.equation">' + CN.engine.BMR_METHODS.map(m => '<option value="' + m.id + '"' + (d.equation === m.id ? ' selected' : '') + '>' + esc(t('energy.eq.' + m.id)) + '</option>').join('') + '</select>') +
          fl('settings.defaultActivity', '<select class="select" data-s="defaults.activity">' + CN.engine.ACTIVITY.map(a => '<option value="' + a.id + '"' + (d.activity === a.id ? ' selected' : '') + '>' + esc(t('activity.' + a.id + '.short')) + ' (×' + a.factor + ')</option>').join('') + '</select>') +
          fl('settings.deficitPref', '<select class="select" data-s="defaults.deficitPref">' + ['mild', 'moderate', 'larger'].map(v => '<option value="' + v + '"' + (d.deficitPref === v ? ' selected' : '') + '>' + esc(t('energy.opt.' + v)) + '</option>').join('') + '</select>') +
          fl('settings.surplusPref', '<select class="select" data-s="defaults.surplusPref">' + ['mild', 'moderate', 'larger'].map(v => '<option value="' + v + '"' + (d.surplusPref === v ? ' selected' : '') + '>' + esc(t('energy.opt.' + v)) + '</option>').join('') + '</select>') +
          fl('settings.duration', '<input class="input" type="number" data-s="defaults.duration" value="' + (d.duration || 7) + '"/>') +
          fl('settings.portionMode', '<select class="select" data-s="defaults.portionMode"><option value="household"' + (d.portionMode === 'household' ? ' selected' : '') + '>' + esc(t('foods.portionHousehold')) + '</option><option value="grams"' + (d.portionMode === 'grams' ? ' selected' : '') + '>' + esc(t('foods.portionGrams')) + '</option></select>') +
          fl('settings.units', '<select class="select" data-s="defaults.units"><option value="metric"' + (d.units !== 'imperial' ? ' selected' : '') + '>' + esc(t('settings.units.metric')) + '</option><option value="imperial"' + (d.units === 'imperial' ? ' selected' : '') + '>' + esc(t('settings.units.imperial')) + '</option></select>') +
          fl('settings.fuInterval', '<input class="input" type="number" data-s="defaults.fuInterval" value="' + (d.fuInterval || 14) + '"/>') +
          fl('settings.lang', '<select class="select" id="stLang"><option value="en"' + (CN.i18n.lang() === 'en' ? ' selected' : '') + '>English</option><option value="ar"' + (CN.i18n.lang() === 'ar' ? ' selected' : '') + '>العربية</option></select>') +
          '</div><div class="divider"></div><button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(t('settings.saveBtn')) + '</button></div>';
        body.querySelector('#stLang').onchange = async e => {
          const l = e.target.value;
          CN.i18n.setLang(l);
          await CN.store.saveSettings({ lang: l });
          CN.app.renderChrome();
        };
        bindSave(body);
      }

      if (this._tab === 'ai') {
        const ai = settings.ai || {};
        const on = CN.copilot.llmConfigured(settings);
        body.innerHTML = '<div class="card" style="max-width:900px">' +
          '<div class="alert info">' + CN.icon('shield') + '<div>' + esc(t('settings.aiKeyNote')) + '</div></div>' +
          '<div class="alert warn">' + CN.icon('alert') + '<div>' + esc(t('settings.aiBlocked')) + '</div></div>' +
          '<div class="form-grid-2">' +
          fl('settings.aiMode', '<select class="select" id="aiMode"><option value="algorithmic"' + (ai.mode !== 'llm' ? ' selected' : '') + '>' + esc(t('copilot.mode.alg')) + '</option><option value="llm"' + (ai.mode === 'llm' ? ' selected' : '') + '>' + esc(t('copilot.mode.llm')) + '</option></select>') +
          fl('settings.aiEndpoint', '<input class="input" id="aiEndpoint" placeholder="https://api.example.com/v1" value="' + esc(ai.endpoint || '') + '"/>') +
          fl('settings.aiModel', '<input class="input" id="aiModel" placeholder="gpt-4o-mini" value="' + esc(ai.model || '') + '"/>') +
          fl('settings.aiKey', '<input class="input" type="password" id="aiKey" value="' + esc(ai.key || '') + '"/>') +
          '</div>' +
          '<label class="check"><input type="checkbox" id="aiDeid"' + (ai.deidentify !== false ? ' checked' : '') + '/><span>' + esc(t('settings.aiDeidentify')) + '</span></label>' +
          '<div class="divider"></div><div class="flex"><button class="btn btn-primary" data-x="save">' + CN.icon('save') + esc(t('settings.saveBtn')) + '</button>' +
          '<button class="btn btn-ghost" data-x="test">' + esc(t('settings.aiTest')) + '</button>' +
          '<span class="small muted">' + esc(t('settings.aiStatus')) + ': ' + esc(on ? t('settings.aiConfigured') : t('settings.aiNotConfigured')) + '</span></div>' +
          '<div id="aiTestOut" class="mt-2"></div>' +
          '</div>';
        bindSave(body, async () => { });
        body.querySelector('[data-x=test]').onclick = async () => {
          const out = body.querySelector('#aiTestOut');
          const ai2 = { mode: 'llm', endpoint: body.querySelector('#aiEndpoint').value.trim(), model: body.querySelector('#aiModel').value.trim(), key: body.querySelector('#aiKey').value.trim() };
          if (!ai2.endpoint || !ai2.key) { out.innerHTML = '<div class="alert warn">' + esc(t('settings.aiNotConfigured')) + '</div>'; return; }
          out.innerHTML = '<div class="muted small">…</div>';
          try {
            const res = await CN.copilot.callLLM({ ai: ai2 }, [{ role: 'user', content: 'ping — reply with the single word: pong' }], { timeout: 20000 });
            out.innerHTML = '<div class="alert ok">' + CN.icon('check') + '<div>' + esc(t('settings.aiTestOk') + ' ' + String(res).slice(0, 80)) + '</div></div>';
          } catch (e) {
            out.innerHTML = '<div class="alert danger">' + CN.icon('alert') + '<div>' + esc(t('settings.aiTestFail', { err: String(e.message || e) })) + '</div></div>';
          }
        };
      }

      if (this._tab === 'fields') {
        const fields = settings.customFields || [];
        body.innerHTML = '<div class="card mb-3"><div class="card-h"><h3>' + esc(t('settings.customFields')) + '</h3></div><p class="small muted">' + esc(t('settings.customFieldsHint')) + '</p>' +
          (fields.length ? fields.map(cf => '<div class="stat-line"><span><b class="small">' + esc(cf.label) + (cf.labelAr ? ' / ' + esc(cf.labelAr) : '') + '</b> <span class="muted xsmall">' + esc(t('settings.type.' + cf.type)) + (cf.options ? ' · ' + esc(cf.options.join(', ')) : '') + '</span></span><button class="btn btn-quiet btn-sm" data-cfdel="' + cf.id + '">' + CN.icon('trash') + '</button></div>').join('') : '<p class="muted small">—</p>') +
          '</div>' +
          '<div class="card" style="max-width:900px"><div class="section-title">' + esc(t('settings.addField')) + '</div><div class="form-grid-2">' +
          fl('settings.fieldLabel', '<input class="input" id="cfL"/>') +
          fl('settings.fieldLabelAr', '<input class="input" id="cfLA"/>') +
          fl('settings.fieldType', '<select class="select" id="cfT"><option value="text">' + esc(t('settings.type.text')) + '</option><option value="number">' + esc(t('settings.type.number')) + '</option><option value="select">' + esc(t('settings.type.select')) + '</option></select>') +
          fl('settings.fieldOptions', '<input class="input" id="cfO"/>') +
          '</div><button class="btn btn-primary btn-sm" data-x="addf">' + CN.icon('plus') + esc(t('settings.addField')) + '</button></div>';
        body.querySelectorAll('[data-cfdel]').forEach(b => b.onclick = async () => {
          if (!await CN.modal.confirm({ message: t('settings.removeFieldConfirm'), danger: true })) return;
          const arr = (CN.store.settings.customFields || []).filter(x => x.id !== b.getAttribute('data-cfdel'));
          await CN.store.saveSettings({ customFields: arr });
          CN.app.renderCurrent();
        });
        body.querySelector('[data-x=addf]').onclick = async () => {
          const label = body.querySelector('#cfL').value.trim();
          if (!label) { CN.toast(t('common.requiredMark'), 'burg'); return; }
          const arr = (CN.store.settings.customFields || []).slice();
          arr.push({ id: 'cf-' + CN.util.uid('x').slice(-6), label, labelAr: body.querySelector('#cfLA').value.trim(), type: body.querySelector('#cfT').value, options: body.querySelector('#cfO').value.split(',').map(s => s.trim()).filter(Boolean) });
          await CN.store.saveSettings({ customFields: arr });
          CN.toast(t('settings.fieldAdded')); CN.app.renderCurrent();
        };
      }

      if (this._tab === 'data') {
        body.innerHTML = '<div class="card" style="max-width:900px">' +
          '<div class="alert info">' + CN.icon('shield') + '<div>' + esc(t('settings.securityNote')) + '</div></div>' +
          '<div class="flex flex-col" style="max-width:420px">' +
          '<button class="btn btn-ghost" data-x="export">' + CN.icon('download') + esc(t('settings.exportData')) + '</button>' +
          '<button class="btn btn-ghost" data-x="import">' + CN.icon('upload') + esc(t('settings.importData')) + '</button>' +
          '<button class="btn btn-ghost" data-x="demo">' + CN.icon('database') + esc(t('settings.loadDemo')) + '</button>' +
          '<button class="btn btn-danger" data-x="wipe">' + CN.icon('trash') + esc(t('settings.wipe')) + '</button>' +
          '</div></div>';
        body.querySelector('[data-x=export]').onclick = async () => {
          const data = await CN.store.exportAll();
          CN.util.download('nutriclinic-backup-' + CN.util.todayISO() + '.json', JSON.stringify(data), 'application/json');
          CN.toast(t('settings.exported'));
        };
        body.querySelector('[data-x=import]').onclick = async () => {
          const files = await CN.util.pickFiles({ accept: '.json' });
          if (!files.length) return;
          try {
            const text = await CN.util.readFileAsText(files[0]);
            await CN.store.importAll(JSON.parse(text));
            CN.toast(t('settings.imported'));
            CN.app.renderCurrent();
          } catch (e) { CN.toast(t('settings.importFail', { err: String(e.message || e) }), 'burg'); }
        };
        body.querySelector('[data-x=demo]').onclick = async () => {
          if (!await CN.modal.confirm({ message: t('settings.loadDemo') + '?', confirmText: t('common.confirm') })) return;
          await CN.store.seedDemo();
          CN.toast(t('settings.demoLoaded'));
          location.reload();
        };
        body.querySelector('[data-x=wipe]').onclick = async () => {
          if (!await CN.modal.confirm({ message: t('settings.wipeConfirm'), danger: true, confirmText: t('settings.wipe') })) return;
          await CN.store.wipeAll();
          CN.toast(t('settings.wiped'));
          location.reload();
        };
      }

      if (this._tab === 'about') {
        body.innerHTML = '<div class="card" style="max-width:760px">' +
          '<h3>' + esc(CN.APP_NAME) + '</h3>' +
          '<p class="small muted">' + esc(t('settings.aboutText', { ver: CN.version })) + '</p>' +
          '<div class="kv-2 mt-2">' +
          '<span>' + esc(t('settings.units')) + '</span><b>kg · cm · kcal · mg</b>' +
          '<span>' + esc(t('common.language')) + '</span><b>' + (CN.i18n.lang() === 'ar' ? 'العربية' : 'English') + '</b>' +
          '<span>' + esc(t('topbar.envNote')) + '</span><b>IndexedDB · local</b>' +
          '</div>' +
          '<p class="cite mt-2">' + esc(t('copilot.disclaimer')) + '</p>' +
          '</div>';
      }

      function fl(labelKey, input) { return '<div class="field"><label>' + esc(t(labelKey)) + '</label>' + input + '</div>'; }

      function bindSave(scope) {
        const btn = scope.querySelector('[data-x=save]');
        if (!btn) return;
        btn.onclick = async () => {
          const patch = {};
          scope.querySelectorAll('[data-s]').forEach(inp => {
            const path = inp.getAttribute('data-s');
            const v = inp.type === 'number' ? CN.util.parseNum(inp.value) : inp.value;
            setDeep(patch, path, v);
          });
          if (self._tab === 'ai') {
            patch.ai = { mode: scope.querySelector('#aiMode').value, endpoint: scope.querySelector('#aiEndpoint').value.trim(), model: scope.querySelector('#aiModel').value.trim(), key: scope.querySelector('#aiKey').value.trim(), deidentify: scope.querySelector('#aiDeid').checked };
          }
          await CN.store.saveSettings(patch);
          CN.toast(t('settings.saved'));
          CN.app.renderChrome();
        };
      }
      function setDeep(obj, path, v) {
        const parts = path.split('.');
        let o = obj;
        for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
        o[parts[parts.length - 1]] = v;
      }
    }
  };

  function bindSimple(root) {
    root.querySelectorAll('[data-act=goto-patients]').forEach(b => b.onclick = () => CN.app.route('patients'));
  }
  function fl(label, input) { return '<div class="field"><label>' + esc(label) + '</label>' + input + '</div>'; }

  console.log('NutriClinic views-library.js loaded');
})();
