/* ============================================================
   data.js — v7
   + Багийн ахлагч · хэлэлцээрийн систем (хүсэлт/эсрэг санал)
   + Шагналын эзэмшил (ownerId)
   ============================================================ */

window.DB = (function () {

  const KEY         = 'nzuud_cup_v7';
  const OLD_KEYS    = ['nzuud_cup_v6','nzuud_cup_v5','nzuud_cup_v4','nzuud_cup_v3','nzuud_cup_v2','nzuud_cup'];
  const SESSION_KEY = 'nzuud_cup_session';

  const PALETTE = ['#2563eb','#7c3aed','#db2777','#ea580c',
                   '#059669','#0891b2','#ca8a04','#dc2626'];

  const GAMES   = ['Mobile Legends','Футзал','Футбол','Сагсан бөмбөг','Волейбол','Ширээний теннис','Бадминтон'];
  const FORMATS = ['Round Robin','Хоёр багийн тулаан','Групп + Плейофф','Хасагдсан (Knockout)','Цаг хязгаартай'];
  const PLACES  = ['Голомт Талбай','Спортын Төв Ордон','Сургуулийн Заал','Гадаа талбай','Паркийн талбай'];

  const DEFAULT_TEMPLATES = [
    {
      id: 'tpl_esport',
      name: 'Esport (MOBA / Shooter)',
      icon: '🎮',
      fields: [
        { key: 'kills',   label: 'Алалт',   icon: '⚔️' },
        { key: 'deaths',  label: 'Үхэл',    icon: '💀', lower: true },
        { key: 'assists', label: 'Тусламж', icon: '🤝' }
      ],
      ratio: { label: 'KDA', num: ['kills', 'assists'], den: 'deaths' }
    },
    {
      id: 'tpl_basket',
      name: 'Сагсан бөмбөг',
      icon: '🏀',
      fields: [
        { key: 'points',    label: 'Оноо',   icon: '🏀' },
        { key: 'rebounds',  label: 'Самбар', icon: '🙌' },
        { key: 'assists',   label: 'Ассист', icon: '🎯' },
        { key: 'steals',    label: 'Хулгай', icon: '✋' },
        { key: 'blocks',    label: 'Хаалт',  icon: '🛡️' },
        { key: 'turnovers', label: 'Алдаа',  icon: '❌', lower: true }
      ],
      ratio: { label: 'PIR', num: ['points', 'rebounds', 'assists'], den: 'turnovers' }
    },
    {
      id: 'tpl_football',
      name: 'Хөлбөмбөг',
      icon: '⚽',
      fields: [
        { key: 'goals',   label: 'Гол',     icon: '⚽' },
        { key: 'assists', label: 'Ассист',  icon: '🎯' },
        { key: 'saves',   label: 'Хаалт',   icon: '🧤' },
        { key: 'fouls',   label: 'Зөрчил',  icon: '🟨', lower: true }
      ],
      ratio: { label: 'G+A', num: ['goals', 'assists'], den: null }
    },
    {
      id: 'tpl_volley',
      name: 'Волейбол',
      icon: '🏐',
      fields: [
        { key: 'points', label: 'Оноо',  icon: '🏐' },
        { key: 'aces',   label: 'Эйс',   icon: '🎯' },
        { key: 'blocks', label: 'Хаалт', icon: '🛡️' },
        { key: 'errors', label: 'Алдаа', icon: '❌', lower: true }
      ],
      ratio: null
    },
    {
      id: 'tpl_racket',
      name: 'Ширээний теннис / Бадминтон',
      icon: '🏓',
      fields: [
        { key: 'setsWon',  label: 'Хожсон сет',   icon: '✅' },
        { key: 'setsLost', label: 'Хожгосон сет', icon: '❌', lower: true }
      ],
      ratio: null
    }
  ];

  function guessTemplateId(game) {
    const g = String(game || '').toLowerCase();
    if (!g) return 'tpl_esport';
    if (/mobile|legend|dota|lol|league|valorant|cs\s*go|counter|pubg|free\s*fire|esport|moba|shooter|game/.test(g)) return 'tpl_esport';
    if (/сагсан|basket/.test(g)) return 'tpl_basket';
    if (/футзал|хөлбөмбөг|football|futsal|soccer/.test(g)) return 'tpl_football';
    if (/волейбол|volley/.test(g)) return 'tpl_volley';
    if (/теннис|бадминтон|tennis|badminton|пинг/.test(g)) return 'tpl_racket';
    return 'tpl_esport';
  }

  /* ============================================================
     ЖИЖИГ ТУСЛАХУУД
     ============================================================ */

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const pad = n => String(n).padStart(2, '0');

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function nowIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function diffDays(fromIso, toIso) {
    return Math.round((new Date(toIso + 'T00:00:00') - new Date(fromIso + 'T00:00:00')) / 86400000);
  }

  function strHash(str) {
    let x = 0;
    for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) % 100003;
    return x;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function DEFAULT_USERS() {
    return [{ id: 'u_admin', username: 'admin', password: 'admin123',
              name: 'Админ', role: 'admin', playerId: null }];
  }

  function ratioOf(tpl, tot) {
    if (!tpl || !tpl.ratio) return null;
    const num = Array.isArray(tpl.ratio.num) ? tpl.ratio.num : [];
    if (!num.length) return null;
    const up = num.reduce((s, k) => s + (Number(tot[k]) || 0), 0);
    if (!tpl.ratio.den) return up;
    const dn = Number(tot[tpl.ratio.den]) || 0;
    return up / Math.max(1, dn);
  }

  function maxFor(key) {
    switch (key) {
      case 'setsWon': case 'setsLost': return 4;
      case 'deaths': case 'turnovers': case 'fouls': case 'errors': return 7;
      case 'saves': case 'blocks': case 'steals': return 6;
      case 'points': return 26;
      case 'rebounds': return 14;
      default: return 13;
    }
  }

  /* ============================================================
     СЕСС
     ============================================================ */

  function writeSession(userId, days) {
    const raw = JSON.stringify({ userId, exp: days ? Date.now() + days * 86400000 : 0 });
    try {
      if (days) {
        localStorage.setItem(SESSION_KEY, raw);
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, raw);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) { console.warn('Сесс хадгалж чадсангүй:', e); }
  }

  function readSession() {
    let raw = null;
    try { raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY); }
    catch (e) { return null; }
    if (!raw) return null;

    let s = null;
    try { s = JSON.parse(raw); } catch (e) { return null; }
    if (!s || !s.userId) return null;
    if (s.exp && s.exp < Date.now()) { clearSession(); return null; }
    return s;
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  /* ============================================================
     АНХНЫ (ДЕМО) ӨГӨГДӨЛ
     ============================================================ */

  function seed() {
    const year = new Date().getFullYear();

    const teams = [
      { id: 'tm1', name: 'Алтан Арслан',  icon: '🦁', color: '#f59e0b', captainId: 'p1' },
      { id: 'tm2', name: 'Хар Луу',       icon: '🐉', color: '#ef4444', captainId: 'p3' },
      { id: 'tm3', name: 'Цэнхэр Чоно',   icon: '🐺', color: '#3b82f6', captainId: 'p5' },
      { id: 'tm4', name: 'Ногоон Бүргэд', icon: '🦅', color: '#22c55e', captainId: 'p7' }
    ];

    const players = [
      { id:'p1', name:'Бат-Эрдэнэ', nick:'Bat',  color:PALETTE[0], teamId:'tm1', joined:`${year}-01-05` },
      { id:'p2', name:'Тэмүүлэн',   nick:'Temu', color:PALETTE[1], teamId:'tm1', joined:`${year}-01-05` },
      { id:'p3', name:'Ананд',      nick:'Ana',  color:PALETTE[2], teamId:'tm2', joined:`${year}-01-05` },
      { id:'p4', name:'Содном',     nick:'Sod',  color:PALETTE[3], teamId:'tm2', joined:`${year}-01-05` },
      { id:'p5', name:'Номин',      nick:'Nom',  color:PALETTE[4], teamId:'tm3', joined:`${year}-01-05` },
      { id:'p6', name:'Хүслэн',     nick:'Hus',  color:PALETTE[5], teamId:'tm1', joined:`${year}-01-05` },
      { id:'p7', name:'Ганбат',     nick:'Gana', color:PALETTE[6], teamId:'tm4', joined:`${year}-01-05` },
      { id:'p8', name:'Оюун',       nick:'Oyu',  color:PALETTE[7], teamId:'tm4', joined:`${year}-01-05` }
    ];

    const START = ['02-01','04-05','06-07','08-09'];
    const seasons = [1, 2, 3, 4].map(r => ({
      id: 's' + r,
      year, round: r,
      title: `${r}-р улирал`,
      note: `${r}-р улирал — 6 жижиг тэмцээн`,
      startDate: `${year}-${START[r - 1]}`,
      gapDays: 7,
      defPlace:  PLACES[r % PLACES.length],
      defGame:   GAMES[(r - 1) % GAMES.length],
      defFormat: FORMATS[0]
    }));

    const PL = ['Спортын Төв Ордон','Голомт Талбай','Сургуулийн Заал','Голомт Талбай','Гадаа талбай','Спортын Төв Ордон'];
    const GM = ['Mobile Legends','Mobile Legends','Футзал','Сагсан бөмбөг','Волейбол','Футзал'];
    const FM = ['Хасагдсан (Knockout)','Round Robin','Round Robin','Round Robin','Round Robin','Round Robin'];
    const ALL = ['tm1','tm2','tm3','tm4'];

    const tournaments = [];
    seasons.forEach((s, si) => {
      for (let i = 0; i < 6; i++) {
        tournaments.push({
          id: `t${si + 1}_${i + 1}`,
          year, seasonId: s.id, isFinal: false, no: i + 1,
          title: `${i + 1}-р тэмцээн`,
          date: addDays(s.startDate, i * s.gapDays),
          time: '18:00',
          place: PL[i], game: GM[i], format: FM[i],
          templateId: guessTemplateId(GM[i]),
          status: si < 2 ? 'done' : (si === 2 && i === 0 ? 'ongoing' : 'upcoming'),
          entrants: ALL.slice(),
          note: ''
        });
      }
    });

    tournaments.push({
      id: 'tf', year, seasonId: null, isFinal: true, no: 0,
      title: 'Их тэмцээн — Финал',
      date: `${year}-11-20`, time: '18:00',
      place: 'Спортын Төв Ордон', game: 'Mobile Legends', format: 'Хасагдсан (Knockout)',
      templateId: 'tpl_esport',
      status: 'upcoming', entrants: [],
      note: 'Улирлын шилдэг багууд шалгарч оролцоно'
    });

    const RR = [
      ['tm1','tm2'], ['tm3','tm4'], ['tm1','tm3'],
      ['tm2','tm4'], ['tm1','tm4'], ['tm2','tm3']
    ];

    const matches = [];
    tournaments.filter(t => t.status === 'done').forEach((t, ti) => {
      RR.forEach(([h, a], i) => {
        const hs = (ti * 3 + i * 2) % 5;
        const as = (ti * 2 + i * 3 + 1) % 4;
        matches.push({
          id: uid('m'), tournamentId: t.id, stage: 'Round Robin',
          homeTeamId: h, awayTeamId: a,
          homeScore: hs, awayScore: as,
          winnerTeamId: hs > as ? h : (as > hs ? a : null),
          status: 'done', perfs: []
        });
      });
    });

    const transfers = [
      { id: 'tr1', playerId: 'p6', fromTeamId: 'tm3', toTeamId: 'tm1',
        date: addDays(`${year}-04-05`, 21), year, note: 'Шилжилтийн цонх' }
    ];

    const awards = [
      { id:'aw1', playerId:'p1', ownerId:'p1', icon:'🥇', title:'1-р улирлын MVP',
        note:'Хамгийн тогтвортой тоглолт', date:`${year}-04-10` },
      { id:'aw2', playerId:'p6', ownerId:'p6', icon:'⭐', title:'Шилдэг шилжилт',
        note:'Шинэ багтаа шууд нөлөөлсөн', date:`${year}-05-01` },
      { id:'aw3', playerId:'p3', ownerId:'p3', icon:'🔥', title:'Шилдэг довтлогч',
        note:'Хамгийн олон оноо', date:`${year}-04-12` },

      /* --- Давтамж харуулах демо --- */
      { id:'aw4', playerId:'p1', ownerId:'p1', icon:'🥇', title:'2-р улирлын MVP',
        note:'Дараалан хоёр дахь', date:`${year}-06-15` },
      { id:'aw5', playerId:'p1', ownerId:'p1', icon:'🥇', title:'3-р улирлын MVP',
        note:'Гурав дахь', date:`${year}-08-20` },
      { id:'aw6', playerId:'p1', ownerId:'p1', icon:'🏆', title:'Жилийн MVP',
        note:'Улирлын их аварга', date:`${year}-12-01` },
      { id:'aw7', playerId:'p2', ownerId:'p2', icon:'⭐', title:'1-р улирлын шилдэг шилжилт',
        note:'', date:`${year}-04-11` },
      { id:'aw8', playerId:'p2', ownerId:'p2', icon:'⭐', title:'2-р улирлын шилдэг шилжилт',
        note:'', date:`${year}-06-16` }
    ];

    const teamAtSeed = (pid, date) => {
      const p = players.find(x => x.id === pid);
      const evs = transfers
        .filter(t => t.playerId === pid)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      if (!evs.length) return p ? p.teamId : null;
      let team = evs[0].fromTeamId || null;
      for (const e of evs) {
        if ((e.date || '') <= (date || '')) team = e.toTeamId || null;
        else break;
      }
      return team;
    };

    const tplOf = id => DEFAULT_TEMPLATES.find(t => t.id === id) || DEFAULT_TEMPLATES[0];

    matches.forEach(m => {
      const t = tournaments.find(x => x.id === m.tournamentId);
      const date = t ? t.date : '';
      const tpl  = tplOf(t ? t.templateId : 'tpl_esport');
      m.perfs = [];

      [m.homeTeamId, m.awayTeamId].forEach(tid => {
        players.forEach(p => {
          if (teamAtSeed(p.id, date) !== tid) return;
          const rec = { playerId: p.id, teamId: tid, templateId: tpl.id, mvp: false, note: '' };
          tpl.fields.forEach(f => {
            rec[f.key] = strHash(m.id + '|' + p.id + '|' + f.key) % maxFor(f.key);
          });
          m.perfs.push(rec);
        });
      });

      if (m.perfs.length) {
        let best = m.perfs[0], bestV = -Infinity;
        m.perfs.forEach(x => {
          const v = ratioOf(tpl, x);
          const score = v == null ? (x[Object.keys(x)[4]] || 0) : v;
          if (score > bestV) { bestV = score; best = x; }
        });
        best.mvp = true;
      }
    });

    /* ---------- Демо хэлэлцээрийн хүсэлт ---------- */
    const tradeRequests = [{
      id: 'trq_demo1',
      fromTeamId: 'tm2', toTeamId: 'tm1',
      fromCaptainId: 'p3', toCaptainId: 'p1',
      offerPlayers: ['p4'], offerAwards: [],
      wantPlayers: ['p2'], wantAwards: [],
      note: 'Манай багт довтлогч хэрэгтэй байна. Содномыг санал болгож байна.',
      status: 'pending', parentId: null, counterId: null, reason: '',
      createdAt: nowIso(), resolvedAt: null
    }];

    const users = [
      ...DEFAULT_USERS(),
      { id:'u_bat', username:'bat', password:'bat123',
        name:'Бат-Эрдэнэ', role:'player', playerId:'p1' },
      { id:'u_ana', username:'ana', password:'ana123',
        name:'Ананд', role:'player', playerId:'p3' }
    ];

    return {
      version: 7,
      settings: {
        title: 'Happy Golomt FL',
        theme: 'null',
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        subPerSeason: 6,
        transferGapDays: 3,
        transferDays: 7,
         transferOverride: null,
        finalQualifiers: 4,
        loginRequired: true,
        awardBadgeMode: 'owned',      // 'owned' | 'received' | 'off'
        awardBadgeStyle: 'group',     // 'each' | 'group' | 'compact'
        awardBadgeMax: 3,             // хамгийн ихдээ хэдэн титэл
        awardBadgeMerge: '',          // нэгтгэх түлхүүр үгс (таслалаар)
        recentIcons: ['🏅','🥇','⭐','🔥','👑'],   // сүүлд хэрэглэсэн дүрсүүд
        statTemplates: clone(DEFAULT_TEMPLATES),
        users
      },
      teams, players, seasons, tournaments, matches, transfers, awards, tradeRequests
    };
  }

  /* ============================================================
     CLOUD SYNC — Supabase
     ============================================================ */

  const SYNC = {
    cfg: null,
    client: null,
    ready: false,
    status: 'off',      // off | connecting | online | error
    msg: '',
    ver: 0,             // серверээс мэдэх version
    dirty: false,       // push хүлээж буй өөрчлөлт
    pushTimer: null,
    pollTimer: null,
    pulling: false,
    pushing: false,
    channel: null,
    listeners: [],
    retry: 0
  };

  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(API.state)); }
    catch (e) {
      console.error(e);
      alert('Хадгалж чадсангүй! Хөтчийн сан хүрэлцэхгүй байж магадгүй.');
    }
  }

  function syncEnabled() {
    const c = window.LEAGUE_CONFIG;
    return !!(c && c.supabaseUrl && c.supabaseKey && c.leagueId &&
              String(c.leagueId).indexOf('CHANGE-ME') === -1);
  }

  function syncInfo() {
    return {
      status: SYNC.status, msg: SYNC.msg,
      ready: SYNC.ready, dirty: SYNC.dirty, ver: SYNC.ver
    };
  }

  function syncNotify(reason) {
    SYNC.listeners.forEach(fn => {
      try { fn(reason, syncInfo()); } catch (e) { console.error(e); }
    });
  }

  function syncSet(status, msg) {
    if (SYNC.status === status && SYNC.msg === (msg || '')) return;
    SYNC.status = status;
    SYNC.msg = msg || '';
    syncNotify('status');
  }

  function syncOnChange(fn) {
    if (typeof fn !== 'function') return () => {};
    SYNC.listeners.push(fn);
    return () => { SYNC.listeners = SYNC.listeners.filter(x => x !== fn); };
  }

  function syncInit() {
    if (!syncEnabled()) { syncSet('off', 'Синк тохируулаагүй'); return; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      syncSet('error', 'Supabase SDK ачаалагдаагүй'); return;
    }
    const c = window.LEAGUE_CONFIG;
    SYNC.cfg = c;
    try {
      SYNC.client = window.supabase.createClient(c.supabaseUrl, c.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (e) {
      console.warn('[sync] init:', e);
      syncSet('error', 'Холбогдож чадсангүй');
      return;
    }
    SYNC.ready = true;
    syncSet('connecting', 'Холбогдож байна…');
    syncPull(true);
    syncSubscribe();
    syncStartPolling();
  }

  async function syncPull(initial) {
    if (!SYNC.ready || SYNC.pulling) return;
    SYNC.pulling = true;
    try {
      /* 1) Хөнгөн шалгалт — зөвхөн version */
      const vres = await SYNC.client
        .from('league')
        .select('version')
        .eq('id', SYNC.cfg.leagueId)
        .maybeSingle();
      if (vres.error) throw vres.error;

      /* Мөр байхгүй → локал датаг байршуулна */
      if (!vres.data) { await syncPush(true); return; }

      const ver = Number(vres.data.version) || 0;

      /* Өөрчлөлт алга */
      if (ver === SYNC.ver) { syncSet('online', 'Синк хийгдсэн'); return; }

      /* Локалд илгээгээгүй өөрчлөлт байвал — эхлээд түүнийгээ илгээнэ */
      if (SYNC.dirty && !initial) { syncSchedulePush(0); return; }

      /* 2) Бүтэн датаг татах */
      const dres = await SYNC.client
        .from('league')
        .select('data,version')
        .eq('id', SYNC.cfg.leagueId)
        .maybeSingle();
      if (dres.error) throw dres.error;
      if (!dres.data || !dres.data.data) { await syncPush(true); return; }

      API.state = dres.data.data;
      SYNC.ver   = Number(dres.data.version) || 0;
      SYNC.dirty = false;
      API.migrate();
      saveLocal();
      syncSet('online', 'Шинэчлэгдлээ');
      syncNotify('remote');

    } catch (e) {
      console.warn('[sync] pull:', e);
      syncSet('error', 'Серверт холбогдсонгүй');
    } finally {
      SYNC.pulling = false;
    }
  }

  function syncSchedulePush(delay) {
    if (!SYNC.ready) return;
    SYNC.dirty = true;
    syncSet('connecting', 'Хадгалж байна…');
    clearTimeout(SYNC.pushTimer);
    SYNC.pushTimer = setTimeout(() => syncPush(true),
      typeof delay === 'number' ? delay : 1100);
  }

  async function syncPush(force) {
    if (!SYNC.ready || SYNC.pushing) return { ok: false };
    SYNC.pushing = true;
    try {
      const u = API.currentUser();
      const payload = {
        id: SYNC.cfg.leagueId,
        data: API.state,
        updated_by: u ? (u.username || u.name || 'user') : 'system'
      };

      const res = await SYNC.client
        .from('league')
        .upsert(payload, { onConflict: 'id' })
        .select('version')
        .maybeSingle();
      if (res.error) throw res.error;

      SYNC.ver   = Number(res.data && res.data.version) || (SYNC.ver + 1);
      SYNC.dirty = false;
      SYNC.retry = 0;
      syncSet('online', 'Хадгалагдлаа');
      return { ok: true };

    } catch (e) {
      console.warn('[sync] push:', e);
      SYNC.retry++;
      syncSet('error', 'Хадгалж чадсангүй — дахин оролдоно');
      const wait = Math.min(30000, 2000 * SYNC.retry);
      clearTimeout(SYNC.pushTimer);
      SYNC.pushTimer = setTimeout(() => syncPush(true), wait);
      return { ok: false };
    } finally {
      SYNC.pushing = false;
    }
  }

  function syncStartPolling() {
    clearInterval(SYNC.pollTimer);
    SYNC.pollTimer = setInterval(() => {
      if (!SYNC.ready) return;
      if (SYNC.dirty || SYNC.pushing || SYNC.pulling) return;
      if (document.hidden) return;            // таб идэвхгүй бол алгасна
      syncPull();
    }, 15000);
  }

  function syncSubscribe() {
    if (!SYNC.ready || SYNC.channel) return;
    try {
      SYNC.channel = SYNC.client
        .channel('lg-' + SYNC.cfg.leagueId)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'league',
            filter: 'id=eq.' + SYNC.cfg.leagueId },
          () => { if (!SYNC.dirty && !SYNC.pushing) syncPull(); })
        .subscribe();
    } catch (e) { console.warn('[sync] subscribe:', e); }
  }

  /* Таб руу буцаж ирэхэд шалгах */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && SYNC.ready && !SYNC.dirty) syncPull();
  });

  /* ============================================================
     ҮНДСЭН API
     ============================================================ */

  const API = {
    state: null,

    GAMES, FORMATS, PLACES,
    guessTemplateId, ratioOf,

    load() {
      let data = null;
      try {
        let raw = localStorage.getItem(KEY);
        if (!raw) {
          for (const k of OLD_KEYS) {
            raw = localStorage.getItem(k);
            if (raw) break;
          }
        }
        if (raw) data = JSON.parse(raw);
      } catch (e) { console.warn('Өгөгдөл уншиж чадсангүй:', e); }

      this.state = data || seed();
      this.migrate();

      /* Локалд шууд хадгална */
      saveLocal();

      /* Сервертэй холбогдох (асинхрон — UI хүлээхгүй) */
      syncInit();

      return this.state;
    },

    migrate() {
      const s = this.state;
      const def = seed();
      s.settings = s.settings || {};
      const ds = def.settings;

            ['title','theme','winPoints','drawPoints','lossPoints','subPerSeason',
       'transferGapDays','transferDays','finalQualifiers','loginRequired',
       'awardBadgeMode','awardBadgeStyle','awardBadgeMax','awardBadgeMerge'].forEach(k => {
        if (s.settings[k] === undefined || s.settings[k] === null) s.settings[k] = ds[k];
      });

      /* Сүүлд хэрэглэсэн дүрсүүд */
      if (!Array.isArray(s.settings.recentIcons)) {
        s.settings.recentIcons = ['🏅','🥇','⭐','🔥','👑'];
      }
      s.settings.recentIcons = s.settings.recentIcons
        .filter(x => typeof x === 'string' && x.trim())
        .slice(0, 12);
      if (!s.settings.recentIcons.length) {
        s.settings.recentIcons = ['🏅','🥇','⭐','🔥','👑'];
      }

      /* theme нормчлол */
      if (s.settings.theme !== 'dark' && s.settings.theme !== 'light') {
        s.settings.theme = null;
      }

      if (s.settings.transferOverride === undefined) s.settings.transferOverride = null;

      if (s.settings.adminPass) {
        const legacy = String(s.settings.adminPass);
        s.settings.users = Array.isArray(s.settings.users) ? s.settings.users : DEFAULT_USERS();
        const a = s.settings.users.find(u => u.username === 'admin') || s.settings.users[0];
        if (a) a.password = legacy;
        delete s.settings.adminPass;
      }
      if (!Array.isArray(s.settings.users) || !s.settings.users.length) {
        s.settings.users = DEFAULT_USERS();
      }

      ['teams','players','tournaments','matches','transfers','awards','tradeRequests'].forEach(k => {
        if (!Array.isArray(s[k])) s[k] = [];
      });
      if (!Array.isArray(s.seasons)) s.seasons = [];

      /* v2 → v3 */
      if ((s.version || 2) < 3) {
        const byKey = {};
        const out = [];
        s.tournaments.forEach(t => {
          if (t.isFinal) {
            out.push({ ...t, seasonId: null, no: 0,
              place: t.place || '', game: t.game || '',
              format: t.format || 'Хасагдсан (Knockout)' });
            return;
          }
          const k = `${t.year}_${t.round}`;
          if (!byKey[k]) {
            const sid = uid('s');
            byKey[k] = sid;
            s.seasons.push({
              id: sid, year: t.year, round: t.round,
              title: t.title || `${t.round}-р улирал`, note: '',
              startDate: t.date, gapDays: 7,
              defPlace: '', defGame: '', defFormat: 'Round Robin'
            });
          }
          out.push({ ...t, seasonId: byKey[k], no: t.no || 1,
            place: t.place || '', game: t.game || '',
            format: t.format || 'Round Robin' });
        });
        s.tournaments = out;
        s.version = 3;
      }

      /* v3 → v4 */
      if ((s.version || 3) < 4) {
        s.settings.users.forEach(u => {
          if (!u.role) u.role = 'admin';
          if (u.playerId === undefined) u.playerId = null;
        });
        s.version = 4;
      }

      /* v4 → v5 */
      if ((s.version || 4) < 5) {
        s.matches.forEach(m => { if (!Array.isArray(m.perfs)) m.perfs = []; });
        s.version = 5;
      }

      /* v5 → v6: стат загвар */
      if ((s.version || 5) < 6) {
        s.settings.statTemplates = clone(DEFAULT_TEMPLATES);

        if (Array.isArray(s.settings.statFields) && s.settings.statFields.length) {
          const tpl = s.settings.statTemplates.find(t => t.id === 'tpl_esport');
          if (tpl) {
            const byKey = {};
            s.settings.statFields.forEach(f => { if (f && f.key) byKey[f.key] = f; });
            tpl.fields = tpl.fields.map(f => {
              const o = byKey[f.key];
              return o ? { ...f, label: o.label || f.label, icon: o.icon || f.icon } : f;
            });
          }
        }
        delete s.settings.statFields;

        s.tournaments.forEach(t => {
          if (!t.templateId) t.templateId = guessTemplateId(t.game);
        });
        s.matches.forEach(m => {
          const t = s.tournaments.find(x => x.id === m.tournamentId);
          const tid = (t && t.templateId) || 'tpl_esport';
          (m.perfs || []).forEach(r => { if (!r.templateId) r.templateId = tid; });
        });

        s.version = 6;
      }

      /* v6 → v7: ахлагч + шагналын эзэмшил + хэлэлцээр */
      if ((s.version || 6) < 7) {
        s.teams.forEach(t => { if (t.captainId === undefined) t.captainId = null; });
        s.awards.forEach(a => { if (!a.ownerId) a.ownerId = a.playerId || null; });
        if (!Array.isArray(s.tradeRequests)) s.tradeRequests = [];
        s.version = 7;
      }

      /* ---------- Талбаруудыг үргэлж нөхөх ---------- */
      s.settings.users.forEach(u => {
        if (!u.role) u.role = 'admin';
        if (u.playerId === undefined) u.playerId = null;
      });

      if (!Array.isArray(s.settings.statTemplates) || !s.settings.statTemplates.length) {
        s.settings.statTemplates = clone(DEFAULT_TEMPLATES);
      }
      s.settings.statTemplates = s.settings.statTemplates
        .filter(t => t && t.id)
        .map(t => ({
          id: String(t.id),
          name: String(t.name || t.id),
          icon: String(t.icon || '🏅'),
          fields: (Array.isArray(t.fields) ? t.fields : [])
            .filter(f => f && f.key)
            .map(f => ({
              key: String(f.key),
              label: String(f.label || f.key),
              icon: String(f.icon || ''),
              lower: !!f.lower
            })),
          ratio: (t.ratio && Array.isArray(t.ratio.num) && t.ratio.num.length)
            ? {
                label: String(t.ratio.label || 'Үзүүлэлт'),
                num: t.ratio.num.map(String),
                den: t.ratio.den ? String(t.ratio.den) : null
              }
            : null
        }))
        .filter(t => t.fields.length);
      if (!s.settings.statTemplates.length) {
        s.settings.statTemplates = clone(DEFAULT_TEMPLATES);
      }

      s.seasons.forEach(x => {
        if (typeof x.round !== 'number') x.round = 1;
        if (!x.title) x.title = `${x.round}-р улирал`;
        if (x.gapDays === undefined) x.gapDays = 7;
        if (!x.startDate) x.startDate = '';
        if (x.defPlace === undefined)  x.defPlace = '';
        if (x.defGame === undefined)   x.defGame = '';
        if (x.defFormat === undefined) x.defFormat = 'Round Robin';
      });

      s.tournaments.forEach(t => {
        if (t.isFinal === undefined) t.isFinal = false;
        if (t.year === undefined) t.year = new Date().getFullYear();
        if (t.seasonId === undefined) t.seasonId = null;
        if (t.no === undefined || t.no === null) t.no = t.isFinal ? 0 : 1;
        if (t.place === undefined)  t.place = '';
        if (t.game === undefined)   t.game = '';
        if (t.format === undefined) t.format = '';
        if (!Array.isArray(t.entrants)) t.entrants = [];
        if (!t.templateId) t.templateId = guessTemplateId(t.game);
        if (!s.settings.statTemplates.some(x => x.id === t.templateId)) {
          t.templateId = s.settings.statTemplates[0].id;
        }
      });

      s.matches.forEach(m => {
        if (!Array.isArray(m.perfs)) m.perfs = [];
        m.perfs = m.perfs.filter(x => x && x.playerId);
      });

      s.awards.forEach(x => {
        if (!x.id) x.id = uid('aw');
        if (!x.icon) x.icon = '🏅';
        if (!x.date) x.date = todayIso();
        if (!x.ownerId) x.ownerId = x.playerId || null;
      });

      s.players.forEach(p => {
        if (p.teamId === undefined) p.teamId = null;
        if (!p.color) p.color = PALETTE[0];
      });

      /* Ахлагчийн бүртгэлийг шалгах */
      s.teams.forEach(t => {
        if (t.captainId === undefined) t.captainId = null;
        if (t.captainId) {
          const p = s.players.find(x => x.id === t.captainId);
          if (!p || p.teamId !== t.id) t.captainId = null;
        }
      });

      /* Хэлэлцээрийн талбарууд */
      s.tradeRequests = s.tradeRequests.filter(r => r && r.id && r.fromTeamId && r.toTeamId);
      s.tradeRequests.forEach(r => {
        if (!Array.isArray(r.offerPlayers)) r.offerPlayers = [];
        if (!Array.isArray(r.offerAwards))  r.offerAwards  = [];
        if (!Array.isArray(r.wantPlayers))  r.wantPlayers  = [];
        if (!Array.isArray(r.wantAwards))   r.wantAwards   = [];
        if (!r.status) r.status = 'pending';
        if (!r.createdAt) r.createdAt = nowIso();
        if (r.parentId === undefined) r.parentId = null;
        if (r.counterId === undefined) r.counterId = null;
        if (r.reason === undefined) r.reason = '';
        if (r.resolvedAt === undefined) r.resolvedAt = null;
      });
    },

    save() {
      saveLocal();
      syncSchedulePush();
    },

    reset(useDemo) {
      const prev = this.state;
      const keepUsers =
        (prev && prev.settings && Array.isArray(prev.settings.users) && prev.settings.users.length)
          ? prev.settings.users
          : DEFAULT_USERS();

      [KEY, ...OLD_KEYS].forEach(k => localStorage.removeItem(k));

      if (useDemo) {
        this.state = seed();
        this.state.settings.users = keepUsers;
      } else {
        this.state = {
          version: 7,
          settings: {
            title: 'Happy Golomt FL', theme: 'null',
            winPoints: 3, drawPoints: 1, lossPoints: 0,
            subPerSeason: 6, transferGapDays: 3, transferDays: 7,
            transferOverride: null, finalQualifiers: 4,
            loginRequired: true,
            awardBadgeMode: 'owned', awardBadgeStyle: 'group',
            awardBadgeMax: 3, awardBadgeMerge: '',
            recentIcons: ['🏅','🥇','⭐','🔥','👑'],
            statTemplates: clone(DEFAULT_TEMPLATES),
            users: keepUsers
          },
          teams: [], players: [], seasons: [], tournaments: [],
          matches: [], transfers: [], awards: [], tradeRequests: []
        };
      }
      this.save();
      return this.state;
    },

    uid, nowIso,

    /* ============================================================
       CLOUD SYNC (гадаад)
       ============================================================ */

    sync: {
      enabled:  () => syncEnabled(),
      info:     () => syncInfo(),
      onChange: (fn) => syncOnChange(fn),
      pull:     () => syncPull(true),
      push:     () => syncPush(true),
      status:   () => SYNC.status
    },

    /* ============================================================
       СТАТ ЗАГВАР
       ============================================================ */

    statTemplates() {
      const t = this.state && this.state.settings && this.state.settings.statTemplates;
      return (Array.isArray(t) && t.length) ? t : DEFAULT_TEMPLATES;
    },

    statTemplate(id) {
      return API.statTemplates().find(t => t.id === id) || null;
    },

    templateIdOf(tournamentId) {
      const t = API.tournament(tournamentId);
      if (!t) return API.statTemplates()[0].id;
      const id = t.templateId || guessTemplateId(t.game);
      return API.statTemplate(id) ? id : API.statTemplates()[0].id;
    },

    templateOf(tournamentId) {
      return API.statTemplate(API.templateIdOf(tournamentId)) || API.statTemplates()[0];
    },

    fieldsOf(tournamentId) {
      const t = API.templateOf(tournamentId);
      return t ? t.fields : [];
    },

    saveTemplates(list) {
      if (!Array.isArray(list) || !list.length) {
        return { ok: false, msg: 'Дор хаяж 1 загвар үлдэх ёстой' };
      }
      this.state.settings.statTemplates = clone(list);
      const ids = list.map(t => t.id);
      const first = ids[0];
      this.state.tournaments.forEach(t => {
        if (!ids.includes(t.templateId)) t.templateId = first;
      });
      this.save();
      return { ok: true };
    },

    /* ============================================================
       НЭВТРЭЛТ
       ============================================================ */

    login(username, password, rememberDays) {
      const uname = String(username || '').trim().toLowerCase();
      const pass  = String(password || '');
      if (!uname || !pass) return null;

      const u = (this.state.settings.users || []).find(
        x => String(x.username).toLowerCase() === uname && String(x.password) === pass
      );
      if (!u) return null;

      writeSession(u.id, Number(rememberDays) || 0);
      return { id: u.id, username: u.username, name: u.name || u.username,
               role: u.role || 'admin', playerId: u.playerId || null };
    },

    logout()  { clearSession(); },
    session() { return readSession(); },

    currentUser() {
      const s = readSession();
      if (!s) return null;
      const u = (this.state.settings.users || []).find(x => x.id === s.userId);
      if (!u) { clearSession(); return null; }
      return u;
    },

    currentPlayer() {
      const u = this.currentUser();
      if (!u || !u.playerId) return null;
      return this.player(u.playerId);
    },

    isAdmin() {
      const u = this.currentUser();
      return !!u && (u.role || 'admin') !== 'player';
    },

    loginRequired() {
      return this.state.settings.loginRequired !== false;
    },

    addUser(username, password, name) {
      const uname = String(username || '').trim();
      const pass  = String(password || '').trim();
      const dname = String(name || '').trim() || uname;

      if (!uname)           return { ok: false, msg: 'Хэрэглэгчийн нэр хоосон' };
      if (uname.length < 3) return { ok: false, msg: 'Нэр дор хаяж 3 тэмдэгт' };
      if (/\s/.test(uname)) return { ok: false, msg: 'Нэрт зай байж болохгүй' };
      if (pass.length < 4)  return { ok: false, msg: 'Нууц үг дор хаяж 4 тэмдэгт' };

      const users = this.state.settings.users || (this.state.settings.users = []);
      if (users.some(u => String(u.username).toLowerCase() === uname.toLowerCase())) {
        return { ok: false, msg: `"${uname}" нэр аль хэдийн байна` };
      }
      users.push({ id: uid('u'), username: uname, password: pass,
                   name: dname, role: 'admin', playerId: null });
      this.save();
      return { ok: true };
    },

    createAccount(playerId, username, password, name) {
      const p = this.player(playerId);
      if (!p) return { ok: false, msg: 'Тоглогч олдсонгүй' };
      if (this.accountOf(playerId)) return { ok: false, msg: 'Энэ тоглогчид бүртгэл байна' };

      const uname = String(username || '').trim().toLowerCase();
      const pass  = String(password || '').trim();

      if (uname.length < 3) return { ok: false, msg: 'Нэр дор хаяж 3 тэмдэгт' };
      if (/\s/.test(uname)) return { ok: false, msg: 'Нэрт зай байж болохгүй' };
      if (pass.length < 4)  return { ok: false, msg: 'Нууц үг дор хаяж 4 тэмдэгт' };

      const users = this.state.settings.users || (this.state.settings.users = []);
      if (users.some(u => String(u.username).toLowerCase() === uname)) {
        return { ok: false, msg: `"${uname}" нэр аль хэдийн байна` };
      }
      const u = { id: uid('u'), username: uname, password: pass,
                  name: name || p.name, role: 'player', playerId };
      users.push(u);
      this.save();
      return { ok: true, userId: u.id };
    },

    accountOf(playerId) {
      return (this.state.settings.users || []).find(u => u.playerId === playerId) || null;
    },

    setPassword(id, newPass) {
      const pass = String(newPass || '').trim();
      if (pass.length < 4) return { ok: false, msg: 'Нууц үг дор хаяж 4 тэмдэгт' };
      const u = (this.state.settings.users || []).find(x => x.id === id);
      if (!u) return { ok: false, msg: 'Хэрэглэгч олдсонгүй' };
      u.password = pass;
      this.save();
      return { ok: true };
    },

    changeOwnPassword(userId, current, next) {
      const u = (this.state.settings.users || []).find(x => x.id === userId);
      if (!u) return { ok: false, msg: 'Бүртгэл олдсонгүй' };
      if (String(u.password) !== String(current)) return { ok: false, msg: 'Одоогийн нууц үг буруу' };
      const np = String(next || '').trim();
      if (np.length < 4) return { ok: false, msg: 'Нууц үг дор хаяж 4 тэмдэгт' };
      u.password = np;
      this.save();
      return { ok: true };
    },

    renameUser(id, username, name) {
      const uname = String(username || '').trim();
      if (uname.length < 3) return { ok: false, msg: 'Нэр дор хаяж 3 тэмдэгт' };
      const users = this.state.settings.users || [];
      if (users.some(u => u.id !== id && String(u.username).toLowerCase() === uname.toLowerCase())) {
        return { ok: false, msg: 'Ийм нэртэй хэрэглэгч байна' };
      }
      const u = users.find(x => x.id === id);
      if (!u) return { ok: false, msg: 'Хэрэглэгч олдсонгүй' };
      u.username = uname;
      u.name = String(name || '').trim() || uname;
      this.save();
      return { ok: true };
    },

    deleteUser(id) {
      const me = this.currentUser();
      if (me && me.id === id) return { ok: false, msg: 'Өөрийн бүртгэлээ устгаж болохгүй' };

      const users = this.state.settings.users || [];
      const u = users.find(x => x.id === id);
      if (!u) return { ok: false, msg: 'Хэрэглэгч олдсонгүй' };

      const admins = users.filter(x => (x.role || 'admin') !== 'player');
      if ((u.role || 'admin') !== 'player' && admins.length <= 1) {
        return { ok: false, msg: 'Дор хаяж 1 админ үлдэх ёстой' };
      }
      this.state.settings.users = users.filter(x => x.id !== id);
      this.save();
      return { ok: true };
    },

    /* ============================================================
       ХАЙЛТ
       ============================================================ */

    team:       id => API.state.teams.find(t => t.id === id),
    player:     id => API.state.players.find(p => p.id === id),
    tournament: id => API.state.tournaments.find(t => t.id === id),
    season:     id => API.state.seasons.find(s => s.id === id),
    match:      id => API.state.matches.find(m => m.id === id),
    award:      id => API.state.awards.find(a => a.id === id),

    playersOf(teamId) { return API.state.players.filter(p => p.teamId === teamId); },
    freeAgents()      { return API.state.players.filter(p => !p.teamId); },

    teamsOf(tid) {
      const t = API.tournament(tid);
      return ((t && t.entrants) || []).map(id => API.team(id)).filter(Boolean);
    },

    seasonsOf(year) {
      return API.state.seasons
        .filter(s => s.year === year)
        .sort((a, b) => a.round - b.round);
    },

    tournamentsOfSeason(sid) {
      return API.state.tournaments
        .filter(t => t.seasonId === sid)
        .sort((a, b) => (a.no || 0) - (b.no || 0) ||
                        (a.date || '').localeCompare(b.date || ''));
    },

    finalTournament(year) {
      return API.state.tournaments.find(t => t.year === year && t.isFinal) || null;
    },

    seasonStatus(sid) {
      const ts = API.tournamentsOfSeason(sid);
      if (!ts.length) return 'upcoming';
      if (ts.every(t => t.status === 'done')) return 'done';
      if (ts.some(t => t.status === 'done' || t.status === 'ongoing')) return 'ongoing';
      return 'upcoming';
    },

    seasonSpan(sid) {
      const ds = API.tournamentsOfSeason(sid).map(t => t.date).filter(Boolean).sort();
      return ds.length ? { start: ds[0], end: ds[ds.length - 1] } : null;
    },

    tournamentsOf(year) {
      return API.state.tournaments
        .filter(t => t.year === year)
        .sort((a, b) => {
          const ra = a.isFinal ? 999 : ((API.season(a.seasonId) || {}).round || 0);
          const rb = b.isFinal ? 999 : ((API.season(b.seasonId) || {}).round || 0);
          return ra - rb || (a.no || 0) - (b.no || 0) ||
                 (a.date || '').localeCompare(b.date || '');
        });
    },

    years() {
      const set = new Set();
      API.state.seasons.forEach(s => set.add(s.year));
      API.state.tournaments.forEach(t => set.add(t.year));
      return [...set].sort((a, b) => b - a);
    },

    nextTournament() {
      return API.state.tournaments
        .filter(t => t.status === 'upcoming' || t.status === 'ongoing')
        .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0] || null;
    },

    setTournamentStatus(tid, status) {
      const t = API.tournament(tid);
      if (!t) return;
      t.status = status;
      if (status === 'done') {
        API.state.matches
          .filter(m => m.tournamentId === tid && m.status !== 'done')
          .forEach(m => {
            if (m.homeScore !== '' && m.awayScore !== '') {
              m.status = 'done';
              m.winnerTeamId = API.autoWinnerTeam(m);
            }
          });
      }
      API.save();
    },

    fillSeason(sid) {
      const s = API.season(sid);
      if (!s) return { ok: false, msg: 'Улирал олдсонгүй' };

      const n     = Math.max(1, Number(this.state.settings.subPerSeason) || 6);
      const have  = API.tournamentsOfSeason(sid).map(t => t.no);
      const start = s.startDate || todayIso();
      const gap   = Math.max(1, Number(s.gapDays) || 7);
      let added   = 0;

      for (let i = 1; i <= n; i++) {
        if (have.includes(i)) continue;
        this.state.tournaments.push({
          id: uid('t'), year: s.year, seasonId: sid, isFinal: false, no: i,
          title: `${i}-р тэмцээн`,
          date: addDays(start, (i - 1) * gap),
          time: '18:00',
          place: s.defPlace || '', game: s.defGame || '',
          format: s.defFormat || 'Round Robin',
          templateId: guessTemplateId(s.defGame || ''),
          status: 'upcoming',
          entrants: this.state.teams.map(t => t.id),
          note: ''
        });
        added++;
      }
      this.save();
      return { ok: true, added };
    },

    /* ============================================================
       ОНОО БА ХҮСНЭГТ
       ============================================================ */

    points(w, d) {
      const s = API.state.settings;
      return w * (s.winPoints ?? 3) + d * (s.drawPoints ?? 1);
    },

    autoWinnerTeam(m) {
      const hs = m.homeScore, as = m.awayScore;
      if (hs === '' || as === '' || hs === null || as === null ||
          hs === undefined || as === undefined) return null;
      const h = Number(hs), a = Number(as);
      if (isNaN(h) || isNaN(a)) return null;
      if (h > a) return m.homeTeamId;
      if (a > h) return m.awayTeamId;
      return null;
    },

    buildTable(tids, opts) {
      opts = opts || {};
      const map = new Map();

      const add = id => {
        if (!id) return null;
        if (map.has(id)) return map.get(id);
        const tm = API.team(id);
        if (!tm) return null;
        const row = { teamId: tm.id, name: tm.name, icon: tm.icon, color: tm.color,
                      played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, titles: 0 };
        map.set(id, row);
        return row;
      };

      if (opts.allTeams) API.state.teams.forEach(t => add(t.id));
      else tids.forEach(tid => ((API.tournament(tid) || {}).entrants || []).forEach(add));

      API.state.matches
        .filter(m => m.status === 'done' && tids.includes(m.tournamentId))
        .forEach(m => {
          const hs = Number(m.homeScore) || 0, as = Number(m.awayScore) || 0;
          const h = add(m.homeTeamId), a = add(m.awayTeamId);
          if (h) { h.played++; h.gf += hs; h.ga += as; if (hs > as) h.w++; else if (hs < as) h.l++; else h.d++; }
          if (a) { a.played++; a.gf += as; a.ga += hs; if (as > hs) a.w++; else if (as < hs) a.l++; else a.d++; }
        });

      if (opts.countTitles) {
        tids.forEach(tid => {
          const t = API.tournament(tid);
          if (t && t.status === 'done') {
            const c = API.championOf(tid);
            if (c && map.has(c)) map.get(c).titles++;
          }
        });
      }

      return [...map.values()]
        .map(x => ({ ...x, gd: x.gf - x.ga, pts: API.points(x.w, x.d) }))
        .sort((p, q) =>
          q.pts - p.pts || q.gd - p.gd || q.gf - p.gf || p.name.localeCompare(q.name));
    },

    roundStandings(tid) { return API.buildTable([tid]); },

    seasonStandingsOf(sid) {
      const tids = API.tournamentsOfSeason(sid).map(t => t.id);
      return API.buildTable(tids, { countTitles: true, allTeams: true });
    },

    seasonStandings(year) {
      const tids = API.state.tournaments
        .filter(t => t.year === year && !t.isFinal)
        .map(t => t.id);
      return API.buildTable(tids, { countTitles: true, allTeams: true });
    },

    championOf(tid) {
      const done = API.state.matches.filter(m => m.tournamentId === tid && m.status === 'done');
      if (!done.length) return null;
      const fin = done.find(m => String(m.stage || '').trim() === 'Финал');
      if (fin && fin.winnerTeamId) return fin.winnerTeamId;

      const rows = API.roundStandings(tid).filter(r => r.played > 0);
      return rows.length ? rows[0].teamId : null;
    },

    seasonChampionOf(sid) {
      const rows = API.seasonStandingsOf(sid).filter(r => r.played > 0);
      return rows.length ? rows[0].teamId : null;
    },

    bigChampion(year) {
      const f = API.finalTournament(year);
      return (f && f.status === 'done') ? API.championOf(f.id) : null;
    },

    matchesOf(tid) {
      const order = { 'Хагас финал': 1, '3-р байр': 2, 'Финал': 3, 'Round Robin': 4 };
      return API.state.matches
        .filter(m => m.tournamentId === tid)
        .sort((a, b) => (order[a.stage] || 9) - (order[b.stage] || 9));
    },

    /* ============================================================
       ОГНООНЫ БАГ
       ============================================================ */

    teamAt(playerId, date) {
      const p = API.player(playerId);
      if (!p) return null;

      const evs = API.state.transfers
        .filter(t => t.playerId === playerId)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      if (!evs.length) return p.teamId || null;

      let team = evs[0].fromTeamId || null;
      for (const e of evs) {
        if ((e.date || '') <= (date || '')) team = e.toTeamId || null;
        else break;
      }
      return team;
    },

    playersOfAt(teamId, date) {
      if (!teamId) return [];
      return API.state.players.filter(p => API.teamAt(p.id, date) === teamId);
    },

    tenureStart(playerId) {
      const p = API.player(playerId);
      if (!p) return '';
      const evs = API.state.transfers
        .filter(t => t.playerId === playerId && t.toTeamId === p.teamId)
        .map(t => t.date || '')
        .sort();
      return evs.length ? evs[evs.length - 1] : (p.joined || '');
    },

    /* ============================================================
       АХЛАГЧ
       ============================================================ */

    captainOf(teamId) {
      const t = API.team(teamId);
      if (!t || !t.captainId) return null;
      return API.player(t.captainId);
    },

    isCaptain(playerId) {
      return !!API.captainTeam(playerId);
    },

    captainTeam(playerId) {
      if (!playerId) return null;
      return API.state.teams.find(t => t.captainId === playerId) || null;
    },

    myCaptainTeam() {
      const u = API.currentUser();
      return (u && u.playerId) ? API.captainTeam(u.playerId) : null;
    },

    setCaptain(teamId, playerId) {
      const t = API.team(teamId);
      if (!t) return { ok: false, msg: 'Баг олдсонгүй' };
      if (!playerId) { t.captainId = null; API.save(); return { ok: true }; }
      const p = API.player(playerId);
      if (!p) return { ok: false, msg: 'Тоглогч олдсонгүй' };
      if (p.teamId !== teamId) return { ok: false, msg: 'Тоглогч энэ багт байхгүй' };
      t.captainId = playerId;
      API.save();
      return { ok: true };
    },

    /* ============================================================
       ШАГНАЛЫН ЭЗЭМШИЛ
       ============================================================ */

    awardOwner(a) {
      if (!a) return null;
      return API.player(a.ownerId || a.playerId);
    },

    ownerIdOf(a) {
      return a ? (a.ownerId || a.playerId || null) : null;
    },

    awardsOwnedBy(playerId) {
      if (!playerId) return [];
      return API.state.awards.filter(a => API.ownerIdOf(a) === playerId);
    },

    awardsGivenTo(playerId) {
      return API.state.awards.filter(a => a.playerId === playerId);
    },

    /* ---------- Дүрс (emoji) ---------- */

    recentIcons() {
      const s = API.state.settings;
      return Array.isArray(s.recentIcons) ? s.recentIcons : [];
    },

    pushRecentIcon(ic) {
      const v = String(ic || '').trim();
      if (!v) return [];
      const s = API.state.settings;
      const list = Array.isArray(s.recentIcons) ? s.recentIcons : [];
      s.recentIcons = [v, ...list.filter(x => x !== v)].slice(0, 12);
      API.save();
      return s.recentIcons;
    },

    /** Нэрний хажууд харуулах титэл (тохиргооны дагуу) */
    playerTitleAwards(playerId) {
      if (!playerId) return [];
      const mode = (API.state.settings && API.state.settings.awardBadgeMode) || 'owned';
      if (mode === 'off') return [];

      const list = (mode === 'received')
        ? API.awardsGivenTo(playerId)
        : API.awardsOwnedBy(playerId);

      return list.slice().sort((a, b) =>
        (b.date || '').localeCompare(a.date || ''));
    },

    /* ============================================================
       ХЭЛЭЛЦЭЭР
       ============================================================ */

    tradeRequests() {
      return (API.state.tradeRequests || []).slice();
    },

    tradeRequest(id) {
      return (API.state.tradeRequests || []).find(r => r.id === id);
    },

    /** Тухайн баг руу ирсэн хүсэлтүүд */
    requestsTo(teamId, status) {
      return API.tradeRequests()
        .filter(r => r.toTeamId === teamId && (!status || r.status === status))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },

    /** Тухайн багаас явуулсан хүсэлтүүд */
    requestsFrom(teamId, status) {
      return API.tradeRequests()
        .filter(r => r.fromTeamId === teamId && (!status || r.status === status))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },

    pendingInbox(teamId)  { return API.requestsTo(teamId, 'pending'); },
    pendingOutbox(teamId) { return API.requestsFrom(teamId, 'pending'); },

    tradeHistory(limit) {
      const list = API.tradeRequests()
        .filter(r => r.status !== 'pending')
        .sort((a, b) => (b.resolvedAt || b.createdAt || '').localeCompare(a.resolvedAt || a.createdAt || ''));
      return limit ? list.slice(0, limit) : list;
    },

    /* ---------- Хүсэлт үүсгэх ---------- */
    createTradeRequest(data) {
      const st = API.state;
      if (!Array.isArray(st.tradeRequests)) st.tradeRequests = [];

      const fromTeam = API.team(data.fromTeamId);
      const toTeam   = API.team(data.toTeamId);
      if (!fromTeam || !toTeam) return { ok: false, msg: 'Баг олдсонгүй' };
      if (fromTeam.id === toTeam.id) return { ok: false, msg: 'Ижил баг руу хүсэлт илгээх боломжгүй' };
      if (!fromTeam.captainId) return { ok: false, msg: 'Танай багт ахлагч товлогдоогүй' };
      if (!toTeam.captainId)   return { ok: false, msg: 'Хүлээн авагч багт ахлагч товлогдоогүй' };

      if (!data.isAdmin && data.actorPlayerId && data.actorPlayerId !== fromTeam.captainId) {
        return { ok: false, msg: 'Зөвхөн багийн ахлагч хүсэлт илгээнэ' };
      }

      const offerPlayers = (data.offerPlayers || []).filter(id => {
        const p = API.player(id);
        return p && p.teamId === fromTeam.id && id !== fromTeam.captainId;
      });
      const wantPlayers = (data.wantPlayers || []).filter(id => {
        const p = API.player(id);
        return p && p.teamId === toTeam.id && id !== toTeam.captainId;
      });
      const offerAwards = (data.offerAwards || []).filter(id => {
        const a = API.award(id);
        return a && API.ownerIdOf(a) === fromTeam.captainId;
      });
      const wantAwards = (data.wantAwards || []).filter(id => {
        const a = API.award(id);
        return a && API.ownerIdOf(a) === toTeam.captainId;
      });

      if (!offerPlayers.length && !wantPlayers.length &&
          !offerAwards.length && !wantAwards.length) {
        return { ok: false, msg: 'Дор хаяж нэг тоглогч эсвэл шагнал сонгоно уу' };
      }

      const r = {
        id: uid('trq'),
        fromTeamId: fromTeam.id,
        toTeamId: toTeam.id,
        fromCaptainId: fromTeam.captainId,
        toCaptainId: toTeam.captainId,
        offerPlayers, offerAwards, wantPlayers, wantAwards,
        note: String(data.note || '').slice(0, 500),
        status: 'pending',
        parentId: data.parentId || null,
        counterId: null,
        reason: '',
        createdAt: nowIso(),
        resolvedAt: null
      };
      st.tradeRequests.unshift(r);
      API.save();
      return { ok: true, id: r.id };
    },

    /* ---------- Солилцоог гүйцэтгэх ---------- */
    _runSwap(r) {
      const st = API.state;

      const log = (pid, from, to) => {
        st.transfers.unshift({
          id: uid('tr'), playerId: pid,
          fromTeamId: from, toTeamId: to,
          date: todayIso(), year: new Date().getFullYear(),
          note: 'Ахлагчийн хэлэлцээр'
        });
      };

      (r.offerPlayers || []).forEach(pid => {
        const p = API.player(pid);
        if (!p) return;
        const from = p.teamId;
        p.teamId = r.toTeamId;
        log(pid, from, r.toTeamId);
      });

      (r.wantPlayers || []).forEach(pid => {
        const p = API.player(pid);
        if (!p) return;
        const from = p.teamId;
        p.teamId = r.fromTeamId;
        log(pid, from, r.fromTeamId);
      });

      (r.offerAwards || []).forEach(aid => {
        const a = API.award(aid);
        if (a) a.ownerId = r.toCaptainId;
      });

      (r.wantAwards || []).forEach(aid => {
        const a = API.award(aid);
        if (a) a.ownerId = r.fromCaptainId;
      });
    },

    /* ---------- Зөвшөөрөх ---------- */
    acceptTradeRequest(id, actorPlayerId, isAdmin) {
      const r = API.tradeRequest(id);
      if (!r) return { ok: false, msg: 'Хүсэлт олдсонгүй' };
      if (r.status !== 'pending') return { ok: false, msg: 'Энэ хүсэлт идэвхгүй байна' };

      const toTeam   = API.team(r.toTeamId);
      const fromTeam = API.team(r.fromTeamId);
      if (!toTeam || !fromTeam) return { ok: false, msg: 'Баг олдсонгүй' };

      if (!isAdmin && toTeam.captainId !== actorPlayerId) {
        return { ok: false, msg: 'Зөвхөн хүлээн авагч ахлагч зөвшөөрнө' };
      }
      if (toTeam.captainId !== r.toCaptainId) {
        return { ok: false, msg: 'Хүлээн авагч багийн ахлагч солигдсон байна' };
      }
      if (fromTeam.captainId !== r.fromCaptainId) {
        return { ok: false, msg: 'Илгээгч багийн ахлагч солигдсон байна' };
      }

      const okOffer = (r.offerPlayers || []).every(pid => {
        const p = API.player(pid); return p && p.teamId === fromTeam.id;
      });
      const okWant = (r.wantPlayers || []).every(pid => {
        const p = API.player(pid); return p && p.teamId === toTeam.id;
      });
      if (!okOffer || !okWant) return { ok: false, msg: 'Тоглогчдын баг өөрчлөгдсөн байна' };

      const okOA = (r.offerAwards || []).every(aid => {
        const a = API.award(aid); return a && API.ownerIdOf(a) === r.fromCaptainId;
      });
      const okWA = (r.wantAwards || []).every(aid => {
        const a = API.award(aid); return a && API.ownerIdOf(a) === r.toCaptainId;
      });
      if (!okOA || !okWA) return { ok: false, msg: 'Шагналын эзэмшил өөрчлөгдсөн байна' };

      API._runSwap(r);
      r.status = 'accepted';
      r.resolvedAt = nowIso();
      API.save();
      return { ok: true, players: (r.offerPlayers || []).length + (r.wantPlayers || []).length,
               awards: (r.offerAwards || []).length + (r.wantAwards || []).length };
    },

    /* ---------- Татгалзах ---------- */
    rejectTradeRequest(id, actorPlayerId, isAdmin, reason) {
      const r = API.tradeRequest(id);
      if (!r) return { ok: false, msg: 'Хүсэлт олдсонгүй' };
      if (r.status !== 'pending') return { ok: false, msg: 'Энэ хүсэлт идэвхгүй байна' };

      const toTeam = API.team(r.toTeamId);
      if (!isAdmin && (!toTeam || toTeam.captainId !== actorPlayerId)) {
        return { ok: false, msg: 'Зөвхөн хүлээн авагч ахлагч татгалзана' };
      }

      r.status = 'rejected';
      r.reason = String(reason || '').slice(0, 300);
      r.resolvedAt = nowIso();
      API.save();
      return { ok: true };
    },

    /* ---------- Цуцлах (илгээгч) ---------- */
    cancelTradeRequest(id, actorPlayerId, isAdmin) {
      const r = API.tradeRequest(id);
      if (!r) return { ok: false, msg: 'Хүсэлт олдсонгүй' };
      if (r.status !== 'pending') return { ok: false, msg: 'Энэ хүсэлт идэвхгүй байна' };

      const fromTeam = API.team(r.fromTeamId);
      if (!isAdmin && (!fromTeam || fromTeam.captainId !== actorPlayerId)) {
        return { ok: false, msg: 'Зөвхөн илгээгч ахлагч цуцална' };
      }

      r.status = 'cancelled';
      r.resolvedAt = nowIso();
      API.save();
      return { ok: true };
    },

    /* ---------- Эсрэг санал ---------- */
    counterTradeRequest(id, actorPlayerId, terms, isAdmin) {
      const r = API.tradeRequest(id);
      if (!r) return { ok: false, msg: 'Хүсэлт олдсонгүй' };
      if (r.status !== 'pending') return { ok: false, msg: 'Энэ хүсэлт идэвхгүй байна' };

      const toTeam = API.team(r.toTeamId);
      if (!isAdmin && (!toTeam || toTeam.captainId !== actorPlayerId)) {
        return { ok: false, msg: 'Зөвхөн хүлээн авагч ахлагч эсрэг санал тавина' };
      }

      /* Хуучин хүсэлтийг хаах */
      r.status = 'countered';
      r.resolvedAt = nowIso();

      /* Шинэ хүсэлт — чиглэл эсрэг */
      const res = API.createTradeRequest({
        fromTeamId: r.toTeamId,
        toTeamId:   r.fromTeamId,
        actorPlayerId,
        isAdmin,
        offerPlayers: terms.offerPlayers || [],
        offerAwards:  terms.offerAwards  || [],
        wantPlayers:  terms.wantPlayers  || [],
        wantAwards:   terms.wantAwards   || [],
        note: terms.note || '',
        parentId: r.id
      });

      if (!res.ok) {
        /* Бүтэлгүй бол хуучин хүсэлтийг сэргээх */
        r.status = 'pending';
        r.resolvedAt = null;
        return res;
      }

      r.counterId = res.id;
      API.save();
      return { ok: true, id: res.id };
    },

    /* ============================================================
       ТОГЛОЛТЫН СТАТ
       ============================================================ */

    perfOfMatch(matchId, playerId) {
      const m = API.match(matchId);
      if (!m || !Array.isArray(m.perfs)) return null;
      return m.perfs.find(x => x.playerId === playerId) || null;
    },

    setMatchPerfs(matchId, list, templateId) {
      const m = API.match(matchId);
      if (!m) return { ok: false, msg: 'Тоглолт олдсонгүй' };

      const tplId = templateId || API.templateIdOf(m.tournamentId);
      const tpl = API.statTemplate(tplId) || API.statTemplates()[0];
      const fields = tpl ? tpl.fields : [];

      m.perfs = list.map(x => {
        const rec = { playerId: x.playerId, teamId: x.teamId,
                      mvp: !!x.mvp, note: x.note || '', templateId: tplId };
        fields.forEach(f => { rec[f.key] = Math.max(0, Math.round(Number(x[f.key]) || 0)); });
        return rec;
      });
      API.save();
      return { ok: true, count: m.perfs.length };
    },

    clearMatchPerfs(matchId) {
      const m = API.match(matchId);
      if (!m) return;
      m.perfs = [];
      API.save();
    },

    playerPerf(playerId, year) {
      const templates = API.statTemplates();
      const rows = [];

      API.state.matches.forEach(m => {
        const rec = (m.perfs || []).find(x => x.playerId === playerId);
        if (!rec) return;

        const t = API.tournament(m.tournamentId);
        if (year && (!t || t.year !== year)) return;

        const tplId = rec.templateId
          || (t && t.templateId)
          || guessTemplateId(t ? t.game : '');
        const tpl = templates.find(x => x.id === tplId) || templates[0];
        if (!tpl) return;

        const isHome = m.homeTeamId === rec.teamId;
        const oppId  = isHome ? m.awayTeamId : m.homeTeamId;
        const my     = Number(isHome ? m.homeScore : m.awayScore) || 0;
        const op     = Number(isHome ? m.awayScore : m.homeScore) || 0;

        const values = {};
        tpl.fields.forEach(f => { values[f.key] = Number(rec[f.key]) || 0; });

        rows.push({
          matchId: m.id, match: m,
          tournament: t,
          season: t && t.seasonId ? API.season(t.seasonId) : null,
          year: t ? t.year : 0,
          date: t ? t.date : '',
          stage: m.stage || '',
          teamId: rec.teamId, team: API.team(rec.teamId),
          opponent: API.team(oppId),
          result: m.winnerTeamId === rec.teamId ? 'win' : (m.winnerTeamId ? 'loss' : 'draw'),
          my, op,
          templateId: tpl.id, template: tpl,
          values,
          mvp: !!rec.mvp,
          note: rec.note || ''
        });
      });

      rows.sort((a, b) => (b.date || '').localeCompare(a.date || '') ||
                          String(b.matchId).localeCompare(String(a.matchId)));

      const map = new Map();
      rows.forEach(r => {
        if (!map.has(r.templateId)) {
          map.set(r.templateId, {
            templateId: r.templateId, template: r.template,
            rows: [], matchCount: 0, mvp: 0,
            totals: {}, avg: {}, ratio: null, ratioLabel: null,
            byYear: [], byTournament: []
          });
        }
        const g = map.get(r.templateId);
        g.rows.push(r);
        g.matchCount++;
        if (r.mvp) g.mvp++;
        r.template.fields.forEach(f => {
          g.totals[f.key] = (g.totals[f.key] || 0) + (r.values[f.key] || 0);
        });
      });

      const byTemplate = [...map.values()].map(g => {
        const fields = g.template.fields;

        fields.forEach(f => {
          g.avg[f.key] = g.matchCount ? g.totals[f.key] / g.matchCount : 0;
        });
        g.ratio = ratioOf(g.template, g.totals);
        g.ratioLabel = g.template.ratio ? g.template.ratio.label : null;

        const yMap = new Map();
        const tMap = new Map();

        g.rows.forEach(r => {
          if (!yMap.has(r.year)) {
            const t0 = {}; fields.forEach(f => t0[f.key] = 0);
            yMap.set(r.year, { year: r.year, count: 0, mvp: 0, totals: t0 });
          }
          const gy = yMap.get(r.year);
          gy.count++; if (r.mvp) gy.mvp++;
          fields.forEach(f => gy.totals[f.key] += r.values[f.key] || 0);

          const key = r.tournament ? r.tournament.id : '__none';
          if (!tMap.has(key)) {
            const t0 = {}; fields.forEach(f => t0[f.key] = 0);
            tMap.set(key, { tournament: r.tournament, season: r.season, date: r.date,
                            count: 0, mvp: 0, w: 0, d: 0, l: 0, totals: t0 });
          }
          const gt = tMap.get(key);
          gt.count++; if (r.mvp) gt.mvp++;
          if (r.result === 'win') gt.w++; else if (r.result === 'loss') gt.l++; else gt.d++;
          fields.forEach(f => gt.totals[f.key] += r.values[f.key] || 0);
        });

        const finish = x => {
          x.avg = {};
          fields.forEach(f => { x.avg[f.key] = x.count ? x.totals[f.key] / x.count : 0; });
          x.ratio = ratioOf(g.template, x.totals);
          return x;
        };

        g.byYear = [...yMap.values()].map(finish).sort((a, b) => b.year - a.year);
        g.byTournament = [...tMap.values()].map(finish)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        return g;
      }).sort((a, b) => b.matchCount - a.matchCount);

      return {
        rows, byTemplate,
        matchCount: rows.length,
        templateCount: byTemplate.length
      };
    },

    rowRatio(template, values) {
      return ratioOf(template, values);
    },

    tournamentLeaders(tid) {
      const tpl = API.templateOf(tid);
      const fields = tpl ? tpl.fields : [];
      const out = [];

      API.state.players.forEach(p => {
        const perf = API.playerPerf(p.id);
        const rs = perf.rows.filter(r => r.match && r.match.tournamentId === tid);
        if (!rs.length) return;

        const totals = {}; fields.forEach(f => totals[f.key] = 0);
        let mvp = 0;
        rs.forEach(r => {
          fields.forEach(f => totals[f.key] += r.values[f.key] || 0);
          if (r.mvp) mvp++;
        });
        const avg = {}; fields.forEach(f => avg[f.key] = totals[f.key] / rs.length);

        out.push({
          player: p,
          team: API.team(rs[0].teamId),
          matches: rs.length,
          totals, avg, mvp,
          ratio: ratioOf(tpl, totals),
          ratioLabel: tpl && tpl.ratio ? tpl.ratio.label : null,
          template: tpl
        });
      });

      return out.sort((a, b) =>
        (b.ratio == null ? -1 : b.ratio) - (a.ratio == null ? -1 : a.ratio) ||
        (b.mvp) - (a.mvp) ||
        a.player.name.localeCompare(b.player.name));
    },

    statLeaders(opts) {
      opts = opts || {};
      const templates = API.statTemplates();
      const tplId = opts.templateId || (templates[0] && templates[0].id);
      const tpl = templates.find(t => t.id === tplId) || templates[0];
      if (!tpl) return [];

      const list = API.state.players.map(p => {
        const perf = API.playerPerf(p.id, opts.year || null);
        const g = perf.byTemplate.find(x => x.templateId === tpl.id);
        if (!g) return null;
        return {
          player: p,
          team: API.team(p.teamId),
          template: tpl,
          matches: g.matchCount,
          totals: g.totals,
          avg: g.avg,
          ratio: g.ratio,
          ratioLabel: g.ratioLabel,
          mvp: g.mvp
        };
      }).filter(Boolean);

      const sortBy = opts.sort || 'ratio';

      const val = x => {
        if (sortBy === 'ratio') return x.ratio == null ? -1 : x.ratio;
        if (sortBy === 'mvp') return x.mvp;
        if (sortBy === 'matches') return x.matches;
        const f = tpl.fields.find(y => y.key === sortBy);
        const v = x.totals[sortBy] || 0;
        return (f && f.lower) ? -v : v;
      };

      return list.sort((a, b) =>
        val(b) - val(a) ||
        (b.ratio == null ? -1 : b.ratio) - (a.ratio == null ? -1 : a.ratio) ||
        (b.mvp) - (a.mvp) ||
        a.player.name.localeCompare(b.player.name));
    },

    playerTitles(playerId) {
      return API.state.tournaments
        .filter(t => t.status === 'done')
        .filter(t => API.championOf(t.id) === API.teamAt(playerId, t.date))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map(t => ({
          tournament: t,
          team: API.team(API.championOf(t.id)),
          season: t.seasonId ? API.season(t.seasonId) : null
        }));
    },

    playerMatches(playerId) {
      const out = [];
      API.state.matches
        .filter(m => m.status === 'done')
        .forEach(m => {
          const t = API.tournament(m.tournamentId);
          const date = t ? t.date : '';
          const team = API.teamAt(playerId, date);
          if (!team) return;

          let my = null, op = null, oppId = null;
          if (m.homeTeamId === team)      { my = Number(m.homeScore) || 0; op = Number(m.awayScore) || 0; oppId = m.awayTeamId; }
          else if (m.awayTeamId === team) { my = Number(m.awayScore) || 0; op = Number(m.homeScore) || 0; oppId = m.homeTeamId; }
          else return;

          out.push({
            id: m.id, tournament: t, tournamentId: m.tournamentId,
            stage: m.stage, teamId: team, opponent: API.team(oppId),
            my, op, date,
            result: my > op ? 'win' : (my < op ? 'loss' : 'draw')
          });
        });

      return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },

    playerStats(playerId) {
      const p = API.player(playerId);
      const matches = API.playerMatches(playerId);

      const base = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      const byYear = new Map();

      matches.forEach(m => {
        base.played++;
        base[m.result === 'win' ? 'w' : m.result === 'loss' ? 'l' : 'd']++;
        base.gf += m.my; base.ga += m.op;

        const y = (m.tournament && m.tournament.year) || 0;
        if (!byYear.has(y)) byYear.set(y, { year: y, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
        const r = byYear.get(y);
        r.played++;
        r[m.result === 'win' ? 'w' : m.result === 'loss' ? 'l' : 'd']++;
        r.gf += m.my; r.ga += m.op;
      });

      const fin = x => ({
        ...x,
        gd: x.gf - x.ga,
        pts: API.points(x.w, x.d),
        winRate: x.played ? Math.round(x.w * 100 / x.played) : 0
      });

      return {
        player: p,
        currentTeam: API.team(p ? p.teamId : null),
        tenureStart: API.tenureStart(playerId),
        matches,
        titles: API.playerTitles(playerId),
        awards: API.awardsGivenTo(playerId),
        awardsHeld: API.awardsOwnedBy(playerId).filter(a => a.playerId !== playerId),
        stats: fin(base),
        years: [...byYear.values()].map(fin).sort((a, b) => b.year - a.year)
      };
    },

    awardsOf(playerId) { return API.awardsGivenTo(playerId); },

    allAwards() {
      return API.state.awards.slice()
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },

    /* ============================================================
       ШИЛЖИЛТИЙН ЦОНХ
       ============================================================ */

    transferWindow(year) {
      const s  = API.state.settings;
      const r2 = API.seasonsOf(year).find(x => x.round === 2);
      if (!r2) return null;

      const list = API.tournamentsOfSeason(r2.id).map(t => t.date).filter(Boolean).sort();
      if (!list.length) return null;
      const lastDate = list[list.length - 1];

      const opensAt  = addDays(lastDate, s.transferGapDays ?? 3);
      const closesAt = addDays(opensAt, (s.transferDays ?? 7) - 1);

      const today = todayIso();
      let status = 'closed';
      if (today < opensAt) status = 'upcoming';
      else if (today <= closesAt) status = 'open';

      const ov = s.transferOverride;
      if (ov === 'open' || ov === 'closed') status = ov;

      return {
        year, afterRound: 2, opensAt, closesAt, status,
        daysLeft:  status === 'open'     ? diffDays(today, closesAt) + 1 : 0,
        daysUntil: status === 'upcoming' ? diffDays(today, opensAt) : 0,
        override: ov
      };
    },

    currentTransferWindow() { return API.transferWindow(new Date().getFullYear()); },

    isTransferOpen() {
      const w = this.currentTransferWindow();
      return !!w && w.status === 'open';
    },

    transferPlayer(playerId, toTeamId, note) {
      const p = API.player(playerId);
      if (!p) return { ok: false, msg: 'Тоглогч олдсонгүй' };

      const from = p.teamId || null;
      if (from === toTeamId) return { ok: false, msg: 'Аль хэдийн энэ багт байна' };
      if (toTeamId && !API.team(toTeamId)) return { ok: false, msg: 'Баг олдсонгүй' };

      /* Ахлагч байсан бол ахлагчийн эрхийг чөлөөлөх */
      const oldTeam = API.captainTeam(playerId);
      if (oldTeam) oldTeam.captainId = null;

      p.teamId = toTeamId || null;
      API.state.transfers.unshift({
        id: uid('tr'), playerId,
        fromTeamId: from, toTeamId: toTeamId || null,
        date: todayIso(), year: new Date().getFullYear(),
        note: note || ''
      });
      API.save();
      return { ok: true };
    },

    transfersOf(playerId) {
      return API.state.transfers
        .filter(t => t.playerId === playerId)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },

    teamTransfers(teamId) {
      return API.state.transfers
        .filter(t => t.fromTeamId === teamId || t.toTeamId === teamId)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },

    teamMatches(teamId) {
      return API.state.matches
        .filter(m => m.status === 'done' && (m.homeTeamId === teamId || m.awayTeamId === teamId))
        .map(m => {
          const t      = API.tournament(m.tournamentId);
          const isHome = m.homeTeamId === teamId;
          const oppId  = isHome ? m.awayTeamId : m.homeTeamId;
          const my     = Number(isHome ? m.homeScore : m.awayScore) || 0;
          const op     = Number(isHome ? m.awayScore : m.homeScore) || 0;
          return {
            id: m.id, tournament: t, stage: m.stage,
            opponent: API.team(oppId), my, op,
            result: m.winnerTeamId === teamId ? 'win' : (m.winnerTeamId ? 'loss' : 'draw'),
            date: t ? t.date : ''
          };
        })
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
  };

  return API;
})();