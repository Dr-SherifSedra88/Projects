/* ============================================================
   NutriClinic Pro — app.js
   Bootstrap, application shell (sidebar/topbar), routing,
   first-run setup and global patient context.
   ============================================================ */
'use strict';
(function () {
  const t = (k, v) => CN.i18n.t(k, v);
  const esc = CN.util.esc;
  const $ = s => document.querySelector(s);

  const ROUTES = {
    dashboard: 'dashboard', patients: 'patients', newpatient: 'newpatient', assessment: 'assessment',
    energy: 'energy', bodycomp: 'bodycomp', builder: 'builder', copilot: 'copilot', followup: 'followup',
    foods: 'foods', refs: 'refs', reports: 'reports', settings: 'settings'
  };

  const NAV = [
    { group: 'nav.group.clinical', items: [
      { id: 'dashboard', icon: 'dashboard' }, { id: 'patients', icon: 'users' }, { id: 'newpatient', icon: 'userPlus' },
      { id: 'assessment', icon: 'stethoscope' }, { id: 'energy', icon: 'calculator' }, { id: 'bodycomp', icon: 'activity' } ] },
    { group: 'nav.group.planning', items: [
      { id: 'builder', icon: 'clipboard' }, { id: 'copilot', icon: 'sparkles' }, { id: 'followup', icon: 'calendarCheck' } ] },
    { group: 'nav.group.library', items: [
      { id: 'foods', icon: 'database' }, { id: 'refs', icon: 'book' } ] },
    { group: 'nav.group.system', items: [
      { id: 'reports', icon: 'fileText' }, { id: 'settings', icon: 'settings' } ] }
  ];

  const app = CN.app = {
    pendingPlanId: null,
    pendingTargetPayload: null,
    _route: 'dashboard',

    patient() {
      const id = this._patientId;
      return id ? CN.store.getPatient(id) : null;
    },
    setPatient(id) {
      this._patientId = id || null;
      try { localStorage.setItem('cnp.activePatient', id || ''); } catch (e) { }
      this.renderTopbar();
      this.renderCurrent();
    },

    route(name) {
      if (location.hash === '#/' + name) this.routeFromHash();
      else location.hash = '#/' + name;
    },
    routeFromHash() {
      const m = String(location.hash || '').replace(/^#\/?/, '');
      const name = ROUTES[m] ? m : 'dashboard';
      this._route = name;
      this.renderNav();
      this.renderCurrent();
      const v = $('#view'); if (v) v.scrollTop = 0;
      window.scrollTo(0, 0);
    },

    renderCurrent() {
      const view = CN.views[this._route] || CN.views.dashboard;
      const host = $('#view');
      if (!host || !view) return;
      try { view.render(host); }
      catch (e) { console.error(e); host.innerHTML = '<div class="alert danger">' + CN.icon('alert') + '<div>View error: ' + esc(String(e.message || e)) + '</div></div>'; }
    },

    async init() {
      await CN.store.init();

      /* custom foods into the runtime database */
      (CN.store.list('foods') || []).forEach(f => { if (!CN.foodById(f.id)) CN.FOODS.push(f); });

      this._patientId = null;
      try { this._patientId = localStorage.getItem('cnp.activePatient') || null; } catch (e) { }
      if (this._patientId && !CN.store.getPatient(this._patientId)) this._patientId = null;

      const boot = $('#boot');
      const shell = $('#app');

      if (!CN.store.settings || (CN.store.meta && CN.store.meta.firstRun)) {
        await firstRun();
      }

      const settings = CN.store.settings || {};
      CN.i18n.setLang(settings.lang || 'en');
      if (boot) boot.hidden = true;
      if (shell) shell.hidden = false;

      this.renderChrome();
      this.routeFromHash();

      window.addEventListener('hashchange', () => this.routeFromHash());
      CN.bus.on('lang', () => { this.renderChrome(); this.renderCurrent(); });
      CN.bus.on('data-changed', () => this.renderTopbar());
      CN.bus.on('settings-changed', () => this.renderChrome());
    },

    renderChrome() {
      this.renderSidebar();
      this.renderTopbar();
    },

    renderSidebar() {
      const settings = CN.store.settings || {};
      const clinic = (settings.clinic && (CN.i18n.lang() === 'ar' ? (settings.clinic.nameAr || settings.clinic.name) : settings.clinic.name)) || CN.APP_NAME;
      const patientsN = CN.store.patients().filter(p => p.status !== 'archived').length;
      const draftsN = CN.store.list('plans').filter(p => p.status === 'draft').length;
      let h = '<div class="side-brand"><span class="mark"><svg viewBox="0 0 64 64" width="34" height="34"><rect width="64" height="64" rx="14" fill="rgba(198,166,103,.18)"/><path d="M14 42h10l6-16 6 22 5-14h9" fill="none" stroke="#C6A667" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span><span class="name">' + esc(CN.APP_NAME) + '</span><br><span class="sub">' + esc(clinic) + '</span></span></div>';
      h += '<nav class="side-nav">';
      NAV.forEach(g => {
        h += '<div class="nav-group">' + esc(t(g.group)) + '</div>';
        g.items.forEach(it => {
          let badge = '';
          if (it.id === 'patients' && patientsN) badge = '<span class="nav-badge">' + patientsN + '</span>';
          if (it.id === 'builder' && draftsN) badge = '<span class="nav-badge">' + draftsN + '</span>';
          h += '<button class="nav-item" data-nav="' + it.id + '">' + CN.icon(it.icon, 'nav-ico') + '<span>' + esc(t('nav.' + it.id)) + '</span>' + badge + '</button>';
        });
      });
      h += '</nav>';
      h += '<div class="side-foot"><span class="ver">v' + CN.version + '</span><span>' + esc(t('app.tagline')) + '</span></div>';
      const sb = $('#sidebar');
      if (!sb) return;
      sb.innerHTML = h;
      sb.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
        this.route(b.getAttribute('data-nav'));
        this.closeSidebar();
      });
      this.renderNav();
    },

    renderNav() {
      document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.getAttribute('data-nav') === this._route));
    },

    renderTopbar() {
      const p = this.patient();
      const activeCount = CN.store.patients().filter(x => x.status !== 'archived').length;
      const settings = CN.store.settings || {};
      const clinicName = (settings.clinic && (CN.i18n.lang() === 'ar' ? (settings.clinic.nameAr || settings.clinic.name) : settings.clinic.name)) || '';
      let h = '';
      h += '<button class="tb-btn tb-burger" id="tbBurger" aria-label="Menu">' + CN.icon('list') + '</button>';
      h += '<div style="position:relative"><button class="patient-picker" id="tbPatient">' +
        (p ? CN.vh.avatar(p.fullName, 'sm') : '<span class="avatar sm gold">?</span>') +
        '<span><span class="pp-name">' + esc(p ? p.fullName : t('topbar.selectPatient')) + '</span><br><span class="pp-sub">' + esc(p ? (p.id + ' · ' + CN.i18n.t('bmi.' + CN.engine.bmiCat(CN.vh.bmiOf(p)).key)) : (activeCount ? CN.i18n.t('patients.count', { n: activeCount }) : t('topbar.noPatients'))) + '</span></span>' +
        CN.icon('chevronDown') + '</button><div id="tbPatientMenu"></div></div>';
      h += '<span class="tb-spacer"></span>';
      h += '<div class="lang-toggle" role="group" aria-label="Language"><button data-lang="en" class="' + (CN.i18n.lang() === 'en' ? 'on' : '') + '">EN</button><button data-lang="ar" class="' + (CN.i18n.lang() === 'ar' ? 'on' : '') + '">ع</button></div>';
      h += '<span class="clinic-chip hide-sm">' + CN.icon('shield') + ' ' + esc(clinicName) + '</span>';
      h += '<button class="btn btn-primary btn-sm hide-sm" data-newpat>' + CN.icon('plus') + esc(t('topbar.newPatient')) + '</button>';
      const tb = $('#topbar');
      if (!tb) return;
      tb.innerHTML = h;

      tb.querySelector('#tbBurger').onclick = () => this.toggleSidebar();
      tb.querySelector('#tbPatient').onclick = (e) => { e.stopPropagation(); this.togglePatientMenu(); };
      tb.querySelectorAll('[data-lang]').forEach(b => b.onclick = async () => {
        const l = b.getAttribute('data-lang');
        if (l === CN.i18n.lang()) return;
        CN.i18n.setLang(l);
        await CN.store.saveSettings({ lang: l });
      });
      tb.querySelector('[data-newpat]').onclick = () => this.route('newpatient');
    },

    togglePatientMenu() {
      const host = $('#tbPatientMenu');
      if (!host) return;
      if (host.__open) { host.innerHTML = ''; host.__open = false; return; }
      const self = this;
      const patients = CN.store.patients().filter(x => x.status !== 'archived');
      host.__open = true;
      host.innerHTML = '<div class="menu" style="top:54px;inset-inline-start:0">' +
        '<div class="menu-head">' + esc(t('topbar.selectPatient')) + '</div>' +
        '<div style="padding:8px"><div class="searchbox">' + CN.icon('search') + '<input class="input" id="pmQ" placeholder="' + esc(t('patients.searchPlaceholder')) + '"/></div></div>' +
        '<div class="menu-list" id="pmList">' + menuItems(patients) + '</div>' +
        '<div class="menu-foot"><button class="btn btn-ghost btn-sm" id="pmNew">' + CN.icon('plus') + esc(t('topbar.newPatient')) + '</button>' +
        (this._patientId ? '<button class="btn btn-quiet btn-sm" id="pmClear">' + esc(t('common.clear')) + '</button>' : '') + '</div></div>';
      const close = () => { host.innerHTML = ''; host.__open = false; document.removeEventListener('click', outside); };
      const outside = e => { if (!host.contains(e.target)) close(); };
      setTimeout(() => document.addEventListener('click', outside), 0);
      host.querySelector('#pmNew').onclick = () => { close(); self.route('newpatient'); };
      const clr = host.querySelector('#pmClear');
      if (clr) clr.onclick = () => { close(); self.setPatient(null); };
      host.querySelector('#pmQ').addEventListener('input', CN.util.debounce(e => {
        const q = e.target.value.toLowerCase();
        host.querySelector('#pmList').innerHTML = menuItems(patients.filter(x => (x.fullName || '').toLowerCase().includes(q) || (x.id || '').toLowerCase().includes(q)));
        bindItems();
      }, 180));
      bindItems();
      function bindItems() {
        host.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { close(); self.setPatient(b.getAttribute('data-pick')); });
      }
      function menuItems(list) {
        if (!list.length) return '<div style="padding:12px" class="muted small">' + esc(t('topbar.noPatients')) + '</div>';
        return list.map(x => '<button class="menu-item" data-pick="' + x.id + '">' + CN.vh.avatar(x.fullName, 'sm') + '<span><b>' + esc(x.fullName) + '</b><br><span class="xsmall muted">' + esc(x.id) + '</span></span></button>').join('');
      }
    },

    toggleSidebar() {
      const sb = $('#sidebar');
      let bd = $('#saBackdrop');
      if (!bd) { bd = document.createElement('div'); bd.id = 'saBackdrop'; bd.className = 'sa-backdrop'; document.body.appendChild(bd); bd.onclick = () => this.closeSidebar(); }
      sb.classList.toggle('open');
      bd.classList.toggle('on', sb.classList.contains('open'));
    },
    closeSidebar() {
      const sb = $('#sidebar'); const bd = $('#saBackdrop');
      if (sb) sb.classList.remove('open');
      if (bd) bd.classList.remove('on');
    }
  };

  /* ---------------- first-run setup ---------------- */
  function firstRun() {
    return new Promise(resolve => {
      const defaults = CN.store.defaultSettings();
      const m = CN.modal.open({
        title: t('setup.welcome'), sticky: true, noClose: true,
        sub: t('app.subtagline'),
        body:
          '<p class="small mbl">' + esc(t('settings.securityNote')) + '</p>' +
          '<div class="form-grid-2">' +
          '<div class="field"><label>' + esc(t('settings.clinicName')) + '</label><input class="input" id="frName" value="NutriClinic Center"/></div>' +
          '<div class="field"><label>' + esc(t('settings.clinicNameAr')) + '</label><input class="input" id="frNameAr" value="مركز نيوتركلينك"/></div>' +
          '<div class="field"><label>' + esc(t('settings.physician')) + '</label><input class="input" id="frDoc" placeholder="Dr. …"/></div>' +
          '<div class="field"><label>' + esc(t('common.language')) + '</label><select class="select" id="frLang"><option value="en">English</option><option value="ar">العربية</option></select></div>' +
          '</div>' +
          '<div class="alert info mt-2">' + CN.icon('info') + '<div>' + esc(t('dash.sampleBanner')) + '</div></div>',
        foot: '<button class="btn btn-ghost" data-x="empty">' + esc(t('setup.startEmpty')) + '</button>' +
              '<button class="btn btn-primary" data-x="demo">' + CN.icon('database') + esc(t('setup.loadDemo')) + '</button>',
        onMount(box, modal) {
          const finish = async (withDemo) => {
            const lang = box.querySelector('#frLang').value;
            const patch = {
              clinic: Object.assign({}, defaults.clinic, { name: box.querySelector('#frName').value.trim() || defaults.clinic.name, nameAr: box.querySelector('#frNameAr').value.trim() || defaults.clinic.nameAr, physician: box.querySelector('#frDoc').value.trim() }),
              lang
            };
            await CN.store.saveSettings(patch);
            CN.store.meta.firstRun = false;
            if (withDemo) { await CN.store.seedDemo(); }
            else { CN.store.meta.demo = false; await CN.store._persistMeta(); }
            modal.close();
            resolve(true);
          };
          box.querySelector('[data-x=demo]').onclick = () => finish(true);
          box.querySelector('[data-x=empty]').onclick = () => finish(false);
        }
      });
    });
  }

  /* kick off */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => app.init());
  else app.init();

  console.log('NutriClinic app.js loaded');
})();
