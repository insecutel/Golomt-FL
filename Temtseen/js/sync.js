/* ============================================================
   sync.js — Supabase realtime sync
   data.js, app.js-ийг өөрчлөхгүйгээр ажиллана
   ============================================================ */

(function () {
  'use strict';

  const cfg = window.LEAGUE_CONFIG || {};
  const STORE_KEY = 'nzuud_cup_v7';

  const S = {
    client: null, ready: false,
    status: 'off', msg: '',
    ver: 0, dirty: false, busy: false, suppress: false,
    pushTimer: null, pollTimer: null, channel: null, retry: 0
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function enabled() {
    return !!(cfg.supabaseUrl && cfg.supabaseKey && cfg.leagueId &&
              String(cfg.leagueId).indexOf('CHANGE-ME') === -1 &&
              String(cfg.supabaseUrl).indexOf('http') === 0);
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function writeState(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('[sync] write:', e); }
  }

  function renderChip() {
    const box = document.getElementById('syncChip');
    if (!box) return;
    if (!enabled()) { box.innerHTML = ''; return; }

    const map = {
      off:        ['sync-off',  'Синк унтраалттай'],
      connecting: ['sync-wait', S.msg || 'Холбогдож байна…'],
      online:     ['sync-ok',   S.msg || 'Синк хийгдсэн'],
      error:      ['sync-err',  S.msg || 'Холболтын алдаа']
    };
    const m = map[S.status] || map.off;

    box.innerHTML =
      '<button class="sync-chip ' + m[0] + '" type="button" data-sync="pull"' +
        ' title="' + esc(m[1]) + ' — дарах: дахин шалгах">' +
        '<span class="sync-dot"></span>' +
        '<span class="sync-txt">' + esc(m[1]) + '</span>' +
      '</button>';
  }

  function setStatus(st, msg) {
    if (S.status === st && S.msg === (msg || '')) return;
    S.status = st; S.msg = msg || '';
    renderChip();
  }

  function rerender() {
    try { window.dispatchEvent(new Event('hashchange')); }
    catch (e) {
      const h = location.hash || '#/dashboard';
      location.hash = '#/';
      setTimeout(function () { location.hash = h; }, 20);
    }
  }

  /* ---------- ТАТАХ ---------- */
  async function pull(initial) {
    if (!S.ready || S.busy) return;
    S.busy = true;
    try {
      const vres = await S.client.from('league')
        .select('version').eq('id', cfg.leagueId).maybeSingle();
      if (vres.error) throw vres.error;

      if (!vres.data) { S.busy = false; await push(true); return; }

      const ver = Number(vres.data.version) || 0;
      if (ver === S.ver) { setStatus('online', 'Синк хийгдсэн'); S.busy = false; return; }
      if (S.dirty && !initial) { S.busy = false; schedulePush(0); return; }

      const dres = await S.client.from('league')
        .select('data,version').eq('id', cfg.leagueId).maybeSingle();
      if (dres.error) throw dres.error;
      if (!dres.data || !dres.data.data) { S.busy = false; await push(true); return; }

      S.suppress = true;
      writeState(dres.data.data);
      if (window.DB && typeof window.DB.load === 'function') window.DB.load();
      S.suppress = false;

      S.ver = Number(dres.data.version) || 0;
      S.dirty = false;
      setStatus('online', 'Шинэчлэгдлээ');
      rerender();

    } catch (e) {
      console.warn('[sync] pull:', e);
      S.suppress = false;
      setStatus('error', 'Серверт холбогдсонгүй');
    } finally { S.busy = false; }
  }

  /* ---------- ИЛГЭЭХ ---------- */
  function schedulePush(delay) {
    if (!S.ready || S.suppress) return;
    S.dirty = true;
    setStatus('connecting', 'Хадгалж байна…');
    clearTimeout(S.pushTimer);
    S.pushTimer = setTimeout(function () { push(); },
      typeof delay === 'number' ? delay : 1100);
  }

  async function push(force) {
    if (!S.ready || S.busy || S.suppress) return;
    const state = readState();
    if (!state) return;
    S.busy = true;
    try {
      const res = await S.client.from('league')
        .upsert({ id: cfg.leagueId, data: state }, { onConflict: 'id' })
        .select('version').maybeSingle();
      if (res.error) throw res.error;
      S.ver = Number(res.data && res.data.version) || (S.ver + 1);
      S.dirty = false; S.retry = 0;
      setStatus('online', 'Хадгалагдлаа');
    } catch (e) {
      console.warn('[sync] push:', e);
      S.retry++;
      setStatus('error', 'Хадгалж чадсангүй — дахин оролдоно');
      clearTimeout(S.pushTimer);
      const wait = Math.min(30000, 2000 * S.retry);
      S.pushTimer = setTimeout(function () { push(true); }, wait);
    } finally { S.busy = false; }
  }

  /* ---------- POLLING ---------- */
  function startPolling() {
    clearInterval(S.pollTimer);
    S.pollTimer = setInterval(function () {
      if (!S.ready || S.busy || S.dirty) return;
      if (document.hidden) return;
      pull();
    }, 15000);
  }

  /* ---------- REALTIME ---------- */
  function subscribe() {
    if (!S.ready || S.channel) return;
    try {
      S.channel = S.client.channel('lg-' + cfg.leagueId)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'league',
            filter: 'id=eq.' + cfg.leagueId },
          function () { if (!S.dirty && !S.busy) pull(); })
        .subscribe();
    } catch (e) { console.warn('[sync] subscribe:', e); }
  }

  /* ---------- DB.save-ыг боох ---------- */
  function wrapSave() {
    if (!window.DB || typeof window.DB.save !== 'function') return false;
    if (window.DB.__syncWrapped) return true;
    const orig = window.DB.save.bind(window.DB);
    window.DB.save = function () { orig(); schedulePush(); };
    window.DB.__syncWrapped = true;
    return true;
  }

  /* ---------- ЭХЛҮҮЛЭХ ---------- */
  function init() {
    if (!enabled()) { S.status = 'off'; renderChip(); return; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      setStatus('error', 'Supabase SDK ачаалагдаагүй'); return;
    }
    try {
      S.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (e) {
      console.warn('[sync] init:', e);
      setStatus('error', 'Холбогдож чадсангүй'); return;
    }
    S.ready = true;
    setStatus('connecting', 'Холбогдож байна…');
    if (!wrapSave()) setTimeout(wrapSave, 300);
    pull(true); subscribe(); startPolling(); renderChip();
  }

  /* ---------- ҮЙЛДЭЛ ---------- */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-sync="pull"]');
    if (!el || !enabled()) return;
    setStatus('connecting', 'Шалгаж байна…');
    pull(true);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && S.ready && !S.dirty) pull();
  });

  window.addEventListener('online', function () { if (S.ready) pull(); });

  /* ---------- БЭЛЭН ---------- */
  function boot() {
    if (!document.getElementById('syncChip')) {
      const tr = document.querySelector('.top-right');
      if (tr) {
        const span = document.createElement('span');
        span.id = 'syncChip';
        tr.insertBefore(span, tr.firstChild);
      }
    }
    renderChip();
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }

  window.SYNC = {
    enabled: enabled,
    info: function () {
      return { status: S.status, msg: S.msg, ver: S.ver, ready: S.ready, dirty: S.dirty };
    },
    pull: function () { return pull(true); },
    push: function () { return push(true); }
  };

})();