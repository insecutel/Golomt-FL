/* ============================================================
   app.js — v7
   + Багийн ахлагч · хэлэлцээрийн систем
   ============================================================ */

(function () {
  const DB  = window.DB;
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');

  let adminTab     = 'seasons';
  let editTeamId   = null;
  let editPlayerId = null;
  let editTourId   = null;
  let editSeasonId = null;
  let editAwardId  = null;
  let resultTid    = null;
  let tourFilter   = 'all';
  let afterLogin   = null;
  let openPerf     = null;
  let statYear     = 'all';
  let statTpl      = null;
  let statSort     = 'ratio';
  let playerQ      = '';
  let playerTeam   = 'all';
  let playerSort   = 'team';
  let perfTpl      = 'all';
  let tradeTo      = null;      // хэлэлцээрийн хүлээн авагч баг

  /* ============================================================
     1. ТУСЛАХ ФУНКЦҮҮД
     ============================================================ */

  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.className = 'toast'; }, 2400);
  }

  const MONTHS = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                  '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return `${d.getFullYear()} оны ${MONTHS[d.getMonth()]}ын ${d.getDate()}`;
  }

  function fmtShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function daysUntil(iso) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + 'T00:00:00') - t) / 86400000);
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function fmt1(n) { return (Math.round((Number(n) || 0) * 10) / 10).toFixed(1); }
  function fmt2(n) { return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }

  function avatar(p, size) {
    if (!p) return `<div class="avatar ${size || ''}" style="background:#4b5563">?</div>`;
    return `<div class="avatar ${size || ''}" style="background:${esc(p.color || '#4b5563')}">${esc(initials(p.name))}</div>`;
  }

  function teamCrest(t, size) {
    if (!t) return `<div class="crest ${size || ''}" style="background:#4b5563">?</div>`;
    return `<div class="crest ${size || ''}" style="background:${esc(t.color || '#4b5563')}">${esc(t.icon || '🛡')}</div>`;
  }

  function statusBadge(status) {
    const label = { upcoming:'Удахгүй', ongoing:'Явагдаж байна',
                    done:'Дууссан', scheduled:'Товлосон' }[status] || status;
    return `<span class="badge ${esc(status)}">${esc(label)}</span>`;
  }

  function windowBadge(w) {
    if (!w) return '';
    const m = {
      open:     ['tw-open',     '🔄 Шилжилт НЭЭЛТТЭЙ'],
      upcoming: ['tw-upcoming', '⏳ Шилжилт удахгүй'],
      closed:   ['tw-closed',   '🔒 Шилжилт хаалттай']
    }[w.status];
    return m ? `<span class="badge ${m[0]}">${m[1]}</span>` : '';
  }

  function resultLabel(r) {
    return { win:'ХОЖЛОО', loss:'ХОЖИГДЛОО', draw:'ТЭНЦЛЭЭ' }[r] || '';
  }
  function resultColor(r) {
    return r === 'win' ? 'var(--accent-2)' : r === 'loss' ? 'var(--danger)' : 'var(--muted)';
  }

  function tplChip(tpl, extra) {
    if (!tpl) return '';
    return `<span class="chip tpl">${esc(tpl.icon || '')} ${esc(tpl.name)}${extra ? ' · ' + esc(extra) : ''}</span>`;
  }

  function tourChips(t) {
    const tpl = DB.templateOf(t.id);
    return [
      tpl      ? `<span class="chip tpl">${esc(tpl.icon || '')} ${esc(tpl.name)}</span>` : '',
      t.place  ? `<span class="chip">📍 ${esc(t.place)}</span>`   : '',
      t.format ? `<span class="chip">🏷 ${esc(t.format)}</span>`  : ''
    ].filter(Boolean).join('');
  }

  function miniTour(t) {
    const champ = t.status === 'done' ? DB.team(DB.championOf(t.id)) : null;
    const tpl = DB.templateOf(t.id);
    return `
      <a class="mini-row" href="#/tournament/${esc(t.id)}">
        <span class="mini-no">${t.isFinal ? '🏆' : esc(t.no || '•')}</span>
        <span class="mini-main">
          <b>${esc(t.title)}</b>
          <span class="muted">${esc(fmtShort(t.date))} ${esc(t.time || '')}</span>
          <span class="mini-tags">
            ${tpl     ? `<span class="tag">${esc(tpl.icon || '')} ${esc(tpl.name)}</span>` : ''}
            ${t.place ? `<span class="tag">📍 ${esc(t.place)}</span>`  : ''}
            ${t.format ? `<span class="tag">🏷 ${esc(t.format)}</span>` : ''}
          </span>
        </span>
        <span class="mini-end">
          ${champ ? `<span class="chip gold">🏆 ${esc(champ.name)}</span>` : statusBadge(t.status)}
        </span>
      </a>`;
  }

  function tourCard(t) {
    const s = t.seasonId ? DB.season(t.seasonId) : null;
    const champ = t.status === 'done' ? DB.team(DB.championOf(t.id)) : null;
    return `
      <a class="card tour-card" href="#/tournament/${esc(t.id)}">
        <div class="tour-head">
          <span class="tour-no">${t.isFinal ? '🏆' : esc(t.no || '•')}</span>
          <h3>${esc(t.title)}</h3>
          ${statusBadge(t.status)}
        </div>
        <div class="tour-sub muted">
          ${t.isFinal ? '🏆 Их тэмцээн' : (s ? esc(s.title) : '—')} ·
          📅 ${esc(fmtDate(t.date))} ${esc(t.time || '')}
        </div>
        <div class="tour-meta">
          ${tourChips(t)}
          <span class="chip">🏟 ${(t.entrants || []).length} баг</span>
        </div>
        ${champ ? `<div class="tour-champ">🥇 Аварга: <b>${esc(champ.name)}</b></div>` : ''}
      </a>`;
  }

  function seasonCards(year) {
    const seasons = DB.seasonsOf(year);
    if (!seasons.length) {
      return `<p class="muted">Улирал бүртгэгдээгүй. <a href="#/admin">Админ хэсэгт</a> нэмээрэй.</p>`;
    }
    return `<div class="grid g-2">${seasons.map(s => {
      const list  = DB.tournamentsOfSeason(s.id);
      const done  = list.filter(t => t.status === 'done').length;
      const pct   = list.length ? Math.round(done * 100 / list.length) : 0;
      const champ = DB.seasonChampionOf(s.id);
      const span  = DB.seasonSpan(s.id);
      return `
        <div class="card season-card">
          <div class="season-head">
            <div>
              <a class="season-title" href="#/season/${esc(s.id)}">${esc(s.title)}</a>
              <div class="muted" style="font-size:.82rem">
                ${span ? esc(fmtShort(span.start)) + ' — ' + esc(fmtShort(span.end)) + ' · ' : ''}
                ${done}/${list.length} тэмцээн дууссан
              </div>
            </div>
            ${champ ? `<span class="chip gold">🏆 ${esc((DB.team(champ) || {}).name || '')}</span>`
                    : statusBadge(DB.seasonStatus(s.id))}
          </div>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <div class="mini-list">
            ${list.map(miniTour).join('') ||
              '<p class="muted" style="font-size:.86rem;margin:0">Тэмцээн үүсгээгүй байна.</p>'}
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  function matchRow(m) {
    const h = DB.team(m.homeTeamId), a = DB.team(m.awayTeamId);
    const hw = m.winnerTeamId === m.homeTeamId;
    const aw = m.winnerTeamId === m.awayTeamId;
    const hs = m.homeScore === '' ? '–' : m.homeScore;
    const as = m.awayScore === '' ? '–' : m.awayScore;
    return `
      <div class="match-row">
        <div class="side ${hw ? 'win' : ''}">${teamCrest(h, 'sm')}<span class="nm">${esc(h ? h.name : '—')}${hw ? ' ✓' : ''}</span></div>
        <div class="score">${esc(hs)} : ${esc(as)}</div>
        <div class="side right ${aw ? 'win' : ''}"><span class="nm">${esc(a ? a.name : '—')}${aw ? ' ✓' : ''}</span>${teamCrest(a, 'sm')}</div>
      </div>`;
  }

  function standingsTable(rows, opts) {
    opts = opts || {};
    if (!rows.length) return '<p class="muted">Хүснэгт хоосон.</p>';
    const showTitles = !!opts.showTitles;
    return `
      <div class="table-wrap"><table>
        <thead><tr>
          <th style="width:48px">#</th>
          <th>Баг</th>
          <th class="num">Тогл.</th>
          <th class="num">Хож.</th>
          <th class="num">Тэнц.</th>
          <th class="num">Хожг.</th>
          <th class="num">Оноо+</th>
          <th class="num">Оноо−</th>
          <th class="num">Зөрүү</th>
          ${showTitles ? '<th class="num">Титэл 🏆</th>' : ''}
          <th class="num">ОНОО</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td class="rank-${i < 3 ? i + 1 : 0}">${i + 1}</td>
              <td>
                <a href="#/team/${esc(r.teamId)}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">
                  ${teamCrest(r, 'sm')}<b>${esc(r.name)}</b>
                  ${opts.championId === r.teamId ? '<span style="color:var(--gold)">🏆</span>' : ''}
                </a>
              </td>
              <td class="num">${r.played}</td>
              <td class="num" style="color:var(--accent-2)">${r.w}</td>
              <td class="num">${r.d}</td>
              <td class="num" style="color:var(--danger)">${r.l}</td>
              <td class="num">${r.gf}</td>
              <td class="num">${r.ga}</td>
              <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td>
              ${showTitles ? `<td class="num">${r.titles || 0}</td>` : ''}
              <td class="num"><b style="font-size:1.05rem">${r.pts}</b></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  function playerOption(p, selectedId) {
    return `<option value="${esc(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${esc(p.name)}</option>`;
  }

  function teamOption(t, selectedId) {
    return `<option value="${esc(t.id)}" ${t.id === selectedId ? 'selected' : ''}>${esc(t.icon)} ${esc(t.name)}</option>`;
  }

  function tplOption(t, selectedId) {
    return `<option value="${esc(t.id)}" ${t.id === selectedId ? 'selected' : ''}>${esc(t.icon)} ${esc(t.name)}</option>`;
  }

  function dataLists() {
    return `
      <datalist id="dlPlaces">${DB.PLACES.map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>
      <datalist id="dlGames">${DB.GAMES.map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>
      <datalist id="dlFormats">${DB.FORMATS.map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
  }

  function tourSelectOptions(selectedId) {
    return DB.years().map(y => {
      const seasons = DB.seasonsOf(y);
      const groups = seasons.map(s => {
        const list = DB.tournamentsOfSeason(s.id);
        if (!list.length) return '';
        return `<optgroup label="${esc(y)} · ${esc(s.title)}">
          ${list.map(t => `<option value="${esc(t.id)}" ${t.id === selectedId ? 'selected' : ''}>${esc(t.no)}. ${esc(t.title)} — ${esc(fmtShort(t.date))}</option>`).join('')}
        </optgroup>`;
      }).join('');
      const f = DB.state.tournaments.filter(t => t.year === y && t.isFinal);
      const fg = f.length
        ? `<optgroup label="${esc(y)} · 🏆 Их тэмцээн">
            ${f.map(t => `<option value="${esc(t.id)}" ${t.id === selectedId ? 'selected' : ''}>🏆 ${esc(t.title)} — ${esc(fmtShort(t.date))}</option>`).join('')}
          </optgroup>`
        : '';
      return groups + fg;
    }).join('');
  }

  /* ============================================================
     1.а  БАГ · ТИТЭЛ · ШАГНАЛ · ТОГЛОЛТЫН ТҮҮХ
     ============================================================ */

  function statCards(s) {
    return `
      <div class="grid g-4">
        <div class="stat"><div class="num">${s.played}</div><div class="lbl">Тоглолт</div></div>
        <div class="stat"><div class="num" style="color:var(--accent-2)">${s.w}</div><div class="lbl">Хожил</div></div>
        <div class="stat"><div class="num">${s.d}</div><div class="lbl">Тэнцээ</div></div>
        <div class="stat"><div class="num" style="color:var(--danger)">${s.l}</div><div class="lbl">Хожигдол</div></div>
        <div class="stat"><div class="num">${s.gf}</div><div class="lbl">Оноо+ (баг)</div></div>
        <div class="stat"><div class="num">${s.ga}</div><div class="lbl">Оноо− (баг)</div></div>
        <div class="stat"><div class="num">${s.gd > 0 ? '+' : ''}${s.gd}</div><div class="lbl">Зөрүү</div></div>
        <div class="stat"><div class="num">${s.pts}</div><div class="lbl">Оноо</div></div>
      </div>
      <div class="progress" title="Хожих хувь"><i style="width:${s.winRate}%"></i></div>
      <div class="muted" style="font-size:.84rem;margin-top:-6px">Хожих хувь: <b>${s.winRate}%</b></div>`;
  }

  function titlesBlock(titles) {
    if (!titles.length) return '<p class="muted">Одоогоор титэл алга. 🎯</p>';
    return `<div class="grid g-3">${titles.map(x => `
      <a class="card tour-card" href="#/tournament/${esc(x.tournament.id)}">
        <div class="tour-head">
          <span class="tour-no">🏆</span>
          <h3>${esc(x.tournament.title)}</h3>
        </div>
        <div class="tour-sub muted">
          ${x.season ? esc(x.season.title) + ' · ' : ''}${esc(fmtDate(x.tournament.date))}
        </div>
        <div class="tour-meta">
          ${teamCrest(x.team, 'xs')}
          <span class="chip gold">${esc(x.team ? x.team.name : '')}</span>
        </div>
      </a>`).join('')}</div>`;
  }

  function awardsBlock(awards) {
    if (!awards.length) return '<p class="muted">Шагнал бүртгэгдээгүй.</p>';
    return `<div class="grid g-3">${awards.map(a => {
      const owner = DB.awardOwner(a);
      const traded = a.ownerId && a.playerId && a.ownerId !== a.playerId;
      return `
      <div class="card award-card">
        <div class="award-icon">${esc(a.icon || '🏅')}</div>
        <div style="min-width:0">
          <div class="award-title">${esc(a.title)}</div>
          ${a.note ? `<div class="muted" style="font-size:.83rem">${esc(a.note)}</div>` : ''}
          <div class="muted" style="font-size:.78rem;margin-top:4px">📅 ${esc(fmtDate(a.date))}</div>
          ${traded && owner ? `<div style="margin-top:6px"><span class="chip gold">👑 эзэмшигч: ${esc(owner.name)}</span></div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function playerMatchHistory(matches, team, limit) {
    if (!matches.length) return '<p class="muted">Тоглолтын түүх алга.</p>';
    const list = limit ? matches.slice(0, limit) : matches;
    return list.map(m => `
      <div class="match-row">
        <div class="side ${m.result === 'win' ? 'win' : ''}">${teamCrest(team, 'sm')}<span class="nm">${esc(team ? team.name : '—')}</span></div>
        <div class="score">${m.my} : ${m.op}</div>
        <div class="side right">${teamCrest(m.opponent, 'sm')}<span class="nm">${esc(m.opponent ? m.opponent.name : '—')}</span></div>
      </div>
      <div class="muted" style="font-size:.78rem;margin:-4px 0 14px 4px">
        <b style="color:${resultColor(m.result)}">${resultLabel(m.result)}</b> ·
        ${esc(m.tournament ? m.tournament.title : '')} · ${esc(fmtDate(m.date))}
      </div>`).join('');
  }

  /* ============================================================
     1.б  ТОГЛОЛТЫН СТАТИСТИКИЙН БЛОКУУД
     ============================================================ */

  function perfCards(g) {
    const tpl = g.template;
    const f = tpl ? tpl.fields : [];

    const cells = [
      `<div class="stat"><div class="num">${g.matchCount}</div><div class="lbl">Тоглолт</div></div>`,
      ...f.map(x => `
        <div class="stat">
          <div class="num">${fmt1(g.avg[x.key])}</div>
          <div class="lbl">
            ${esc(x.icon || '')} ${esc(x.label)} — <b>дундаж</b><br>
            <span style="font-size:.78rem">нийт ${g.totals[x.key]}</span>
          </div>
        </div>`),
      g.ratio != null
        ? `<div class="stat"><div class="num" style="color:var(--accent)">${fmt2(g.ratio)}</div><div class="lbl">${esc(g.ratioLabel || 'Үзүүлэлт')}</div></div>`
        : '',
      `<div class="stat"><div class="num" style="color:var(--gold)">${g.mvp}</div><div class="lbl">🏅 MVP</div></div>`
    ].filter(Boolean);

    return `<div class="grid g-4">${cells.join('')}</div>`;
  }

  function perfGroupTable(groups, opts) {
    const tpl = opts.template;
    const f = tpl ? tpl.fields : [];
    if (!groups.length) return '<p class="muted">Бичигдсэн тоглолт алга.</p>';

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>${esc(opts.label || 'Хугацаа')}</th>
        <th class="num">Тогл.</th>
        ${f.map(x => `<th class="num">${esc(x.icon || '')} ${esc(x.label)} нийт</th>`).join('')}
        ${f.map(x => `<th class="num">${esc(x.icon || '')} ${esc(x.label)} дундаж</th>`).join('')}
        ${tpl && tpl.ratio ? `<th class="num">${esc(tpl.ratio.label)}</th>` : ''}
        <th class="num">MVP</th>
      </tr></thead>
      <tbody>${groups.map(g => `
        <tr>
          <td><b>${esc(opts.render ? opts.render(g) : g.year)}</b></td>
          <td class="num">${g.count}</td>
          ${f.map(x => `<td class="num">${g.totals[x.key] || 0}</td>`).join('')}
          ${f.map(x => `<td class="num" style="color:var(--accent)">${fmt1(g.avg[x.key])}</td>`).join('')}
          ${tpl && tpl.ratio ? `<td class="num"><b>${g.ratio == null ? '—' : fmt2(g.ratio)}</b></td>` : ''}
          <td class="num">${g.mvp ? g.mvp + ' 🏅' : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  function perfHistoryTable(rows, tpl) {
    const f = tpl ? tpl.fields : [];
    if (!rows.length) return '<p class="muted">Тоглолтын стат бүртгэгдээгүй.</p>';

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>Огноо</th>
        <th>Тэмцээн</th>
        <th>Өрсөлдөгч</th>
        <th class="num">Оноо</th>
        ${f.map(x => `<th class="num">${esc(x.icon || '')} ${esc(x.label)}</th>`).join('')}
        ${tpl && tpl.ratio ? `<th class="num">${esc(tpl.ratio.label)}</th>` : ''}
        <th class="num">MVP</th>
      </tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td class="muted">${esc(fmtShort(r.date))}</td>
          <td><a href="#/tournament/${esc(r.tournament ? r.tournament.id : '')}" style="color:inherit;text-decoration:none">${esc(r.tournament ? r.tournament.title : '—')}</a></td>
          <td>
            <a href="#/team/${esc(r.opponent ? r.opponent.id : '')}" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none">
              ${teamCrest(r.opponent, 'xs')}<span>${esc(r.opponent ? r.opponent.name : '—')}</span>
            </a>
          </td>
          <td class="num"><b style="color:${resultColor(r.result)}">${r.my}:${r.op}</b></td>
          ${f.map(x => `<td class="num">${r.values[x.key] || 0}</td>`).join('')}
          ${tpl && tpl.ratio ? `<td class="num">${fmt2(DB.rowRatio(tpl, r.values))}</td>` : ''}
          <td class="num">${r.mvp ? '🏅' : ''}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  function tournamentLeadersTable(tid) {
    const tpl = DB.templateOf(tid);
    const rows = DB.tournamentLeaders(tid);
    if (!rows.length) return '<p class="muted">Энэ тэмцээнд тоглогчийн стат бүртгэгдээгүй.</p>';
    const f = tpl ? tpl.fields : [];

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th style="width:48px">#</th>
        <th>Тоглогч</th>
        <th>Баг</th>
        <th class="num">Тогл.</th>
        ${f.map(x => `<th class="num">${esc(x.icon || '')} ${esc(x.label)}</th>`).join('')}
        ${tpl && tpl.ratio ? `<th class="num">${esc(tpl.ratio.label)}</th>` : ''}
        <th class="num">MVP</th>
      </tr></thead>
      <tbody>${rows.map((r, i) => `
        <tr>
          <td class="rank-${i < 3 ? i + 1 : 0}">${i + 1}</td>
          <td>
            <a href="#/player/${esc(r.player.id)}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">
              ${avatar(r.player, 'sm')}<b>${esc(r.player.name)}</b>
              ${r.mvp ? '<span style="color:var(--gold)">🏅</span>' : ''}
            </a>
          </td>
          <td>${r.team ? teamCrest(r.team, 'xs') + ' ' + esc(r.team.name) : '—'}</td>
          <td class="num">${r.matches}</td>
          ${f.map(x => `<td class="num">${r.totals[x.key] || 0}</td>`).join('')}
          ${tpl && tpl.ratio ? `<td class="num"><b>${r.ratio == null ? '—' : fmt2(r.ratio)}</b></td>` : ''}
          <td class="num">${r.mvp}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  function perfEntry(m) {
    const t = DB.tournament(m.tournamentId);
    const date = t ? t.date : '';
    const tpl = DB.templateOf(m.tournamentId);
    const fields = tpl ? tpl.fields : [];
    const teams = [DB.team(m.homeTeamId), DB.team(m.awayTeamId)].filter(Boolean);
    const rec = Array.isArray(m.perfs) ? m.perfs : [];
    const hasAny = rec.length > 0;
    const cols = `minmax(140px,1fr) 46px ${fields.map(() => '78px').join(' ')} 46px`;

    const oldTpl = rec.find(x => x.templateId && x.templateId !== tpl.id);
    const warn = oldTpl
      ? `<p class="muted" style="font-size:.8rem;color:var(--warn);margin:8px 0 0">
           ⚠️ Энэ тоглолтод өөр загварын (${esc((DB.statTemplate(oldTpl.templateId) || {}).name || oldTpl.templateId)}) бичлэг байна.
           Хадгалахад шинэ загвараар дарж бичигдэнэ.
         </p>`
      : '';

    const group = team => {
      const list = team ? DB.playersOfAt(team.id, date) : [];
      if (!list.length) return '';
      return `
        <div class="perf-team">
          <div class="perf-team-head">
            ${teamCrest(team, 'xs')} <b>${esc(team.name)}</b>
            <span class="muted" style="font-size:.8rem;margin-left:auto">${list.length} тоглогч</span>
          </div>
          <div class="perf-grid">
            <div class="perf-grid-head" style="grid-template-columns:${cols}">
              <span>Тоглогч</span>
              <span class="c">Тогл.</span>
              ${fields.map(f => `<span class="c">${esc(f.icon || '')} ${esc(f.label)}</span>`).join('')}
              <span class="c">MVP</span>
            </div>
            ${list.map(p => {
              const cur = rec.find(x => x.playerId === p.id);
              const on = hasAny ? !!cur : true;
              return `
              <div class="perf-grid-row ${on ? 'on' : ''}" style="grid-template-columns:${cols}">
                <span class="perf-name">${avatar(p, 'sm')}<b>${esc(p.name)}</b></span>
                <span class="c"><input type="checkbox" name="play_${esc(p.id)}" ${on ? 'checked' : ''} /></span>
                ${fields.map(f => `
                  <span class="c"><input type="number" min="0" step="1" inputmode="numeric"
                    name="${esc(f.key)}_${esc(p.id)}"
                    value="${cur ? (cur[f.key] ?? 0) : ''}" placeholder="0" /></span>`).join('')}
                <span class="c"><input type="checkbox" name="mvp_${esc(p.id)}" ${cur && cur.mvp ? 'checked' : ''} /></span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    };

    return `
      <details class="perf-box" ${openPerf === m.id ? 'open' : ''}>
        <summary>
          📊 Тоглогчийн стат
          ${tplChip(tpl)}
          ${rec.length ? `<span class="chip ok">${rec.length} бичлэг</span>`
                       : '<span class="chip">хоосон</span>'}
        </summary>
        <form data-form="perf" class="perf-form">
          <input type="hidden" name="matchId" value="${esc(m.id)}" />
          <input type="hidden" name="templateId" value="${esc(tpl.id)}" />
          <p class="muted" style="font-size:.82rem;margin:10px 0 6px">
            Тоглосон тоглогчийн <b>Тогл.</b> хайрцгийг тэмдэглээд тоог оруулна.
            Тэмдэглээгүй тоглогчийн бичлэг устна. Нэг тоглолтод <b>нэг л MVP</b>.
          </p>
          ${warn}
          ${teams.map(group).join('') || '<p class="muted">Энэ тоглолтод тоглогч олдсонгүй.</p>'}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
            <button class="btn" type="submit">💾 Стат хадгалах</button>
            <button class="btn ghost" type="button" data-action="perf-all" data-id="${esc(m.id)}">✅ Бүгдийг тэмдэглэх</button>
            <button class="btn danger" type="button" data-action="perf-clear" data-id="${esc(m.id)}">🧹 Цэвэрлэх</button>
          </div>
        </form>
      </details>`;
  }

  function perfSection(playerId, title) {
    const perf = DB.playerPerf(playerId);

    if (!perf.matchCount) {
      return `
        <section class="section">
          <h2>${esc(title)}</h2>
          <div class="card">
            <p class="muted" style="margin:0">Тоглолт бүрийн хувийн стат хараахан бүртгэгдээгүй байна.</p>
          </div>
        </section>`;
    }

    const shown = (perfTpl === 'all')
      ? perf.byTemplate
      : perf.byTemplate.filter(g => g.templateId === perfTpl);

    const tabs = perf.byTemplate.length > 1 ? `
      <div class="tpl-tabs">
        <button class="tpl-tab ${perfTpl === 'all' ? 'active' : ''}"
                data-action="perf-tpl" data-tpl="all">
          Бүгд <span class="muted">(${perf.matchCount})</span>
        </button>
        ${perf.byTemplate.map(g => `
          <button class="tpl-tab ${perfTpl === g.templateId ? 'active' : ''}"
                  data-action="perf-tpl" data-tpl="${esc(g.templateId)}">
            ${esc(g.template.icon || '')} ${esc(g.template.name)}
            <span class="muted">(${g.matchCount})</span>
          </button>`).join('')}
      </div>` : '';

    const blocks = shown.map(g => {
      const tpl = g.template;
      const name = `${tpl.icon || ''} ${tpl.name}`.trim();

      return `
        <section class="section">
          <h2>${esc(name)}</h2>
          ${perfCards(g)}
        </section>

        <section class="section">
          <h2>📆 Жилээр — ${esc(name)}</h2>
          ${perfGroupTable(g.byYear, { template: tpl, label: 'Он', render: x => x.year })}
        </section>

        <section class="section">
          <h2>🏆 Тэмцээн тус бүрээр — ${esc(name)}</h2>
          ${perfGroupTable(g.byTournament, {
            template: tpl, label: 'Тэмцээн',
            render: x => (x.tournament ? x.tournament.title : '—') +
                         (x.date ? ' · ' + fmtShort(x.date) : '')
          })}
        </section>

        <section class="section">
          <h2>📋 Тоглолт тус бүрийн түүх (${g.matchCount})</h2>
          ${perfHistoryTable(g.rows, tpl)}
        </section>`;
    }).join('');

    return `
      <section class="section">
        <h2>${esc(title)}</h2>
        ${tabs}
        <p class="muted" style="font-size:.82rem;margin:10px 0 0">
          Нийт <b>${perf.matchCount}</b> тоглолт ·
          <b>${perf.templateCount}</b> төрлийн тоглоом.
          Өөр тоглоомын үзүүлэлтүүд <b>тусад нь</b> бодогдоно.
        </p>
      </section>
      ${blocks}`;
  }

  function compareBlock(a, b) {
    const pa = DB.playerPerf(a.id);
    const pb = DB.playerPerf(b.id);

    const shared = pa.byTemplate
      .filter(x => pb.byTemplate.some(y => y.templateId === x.templateId));

    if (!shared.length) return '';

    const blocks = shared.map(ga => {
      const gb = pb.byTemplate.find(y => y.templateId === ga.templateId);
      const tpl = ga.template;
      const f = tpl.fields;

      const row = (label, va, vb, mode) => {
        const na = Number(String(va).replace(/[^\d.\-]/g, '')) || 0;
        const nb = Number(String(vb).replace(/[^\d.\-]/g, '')) || 0;
        const aWin = mode === 'high' ? na > nb : mode === 'low' ? na < nb : false;
        const bWin = mode === 'high' ? nb > na : mode === 'low' ? nb < na : false;
        return `<div class="cmp-row">
          <span class="cmp-v ${aWin ? 'win' : ''}">${va}</span>
          <span class="cmp-k">${esc(label)}</span>
          <span class="cmp-v ${bWin ? 'win' : ''}">${vb}</span>
        </div>`;
      };

      const rows = [
        row('Тоглолт', ga.matchCount, gb.matchCount, 'high'),
        ...f.map(x => row(
          (x.icon || '') + ' ' + x.label,
          fmt1(ga.avg[x.key]), fmt1(gb.avg[x.key]),
          x.lower ? 'low' : 'high'
        )),
        tpl.ratio ? row(tpl.ratio.label, fmt2(ga.ratio), fmt2(gb.ratio), 'high') : '',
        row('🏅 MVP', ga.mvp, gb.mvp, 'high')
      ].filter(Boolean).join('');

      return `
        <div class="cmp-block">
          <div class="cmp-tpl">${esc(tpl.icon || '')} ${esc(tpl.name)}</div>
          <div class="cmp-body">${rows}</div>
        </div>`;
    }).join('');

    return `
      <section class="section">
        <h2>⚖️ Харьцуулалт</h2>
        <div class="card compare-card">
          <div class="cmp-head">
            <a class="cmp-name" href="#/player/${esc(a.id)}">
              ${avatar(a, 'sm')}<b>${esc(a.name)}</b><span class="chip ok">чи</span>
            </a>
            <span class="cmp-vs">vs</span>
            <a class="cmp-name" href="#/player/${esc(b.id)}">
              ${avatar(b, 'sm')}<b>${esc(b.name)}</b>
            </a>
          </div>
          ${blocks}
          <p class="muted" style="font-size:.78rem;margin:10px 0 0">
            Дундаж үзүүлэлт — зөвхөн стат бичигдсэн тоглолтоос, <b>тоглоом тус бүрээр</b> бодогдоно.
          </p>
        </div>
      </section>`;
  }

  function applyPlayerFilter() {
    const q = String(playerQ || '').trim().toLowerCase();
    let visible = 0;

    document.querySelectorAll('[data-pcard]').forEach(c => {
      const name = c.dataset.pname || '';
      const tid  = c.dataset.pteam || '';
      const okQ  = !q || name.includes(q);
      const okT  = playerTeam === 'all' ? true
                 : playerTeam === '__free' ? (tid === '')
                 : (tid === playerTeam);
      const show = okQ && okT;
      c.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    document.querySelectorAll('[data-pgroup]').forEach(g => {
      const any = [...g.querySelectorAll('[data-pcard]')]
        .some(c => c.style.display !== 'none');
      g.style.display = any ? '' : 'none';
    });

    const cnt = document.getElementById('pCount');
    if (cnt) cnt.textContent = visible;

    const empty = document.getElementById('pEmpty');
    if (empty) empty.style.display = visible ? 'none' : '';
  }

  function playerMiniStats(perf) {
    if (!perf.matchCount) return '<span class="muted">Стат бүртгэгдээгүй</span>';
    return perf.byTemplate.slice(0, 2).map(g => {
      const tpl = g.template;
      const main = tpl.fields.slice(0, 2)
        .map(f => `${f.icon || ''} ${fmt1(g.avg[f.key])}`).join(' · ');
      return `<span class="pmini">${esc(tpl.icon || '')} ${esc(tpl.name)}: ${main}` +
             (tpl.ratio ? ` · <b>${esc(tpl.ratio.label)} ${fmt2(g.ratio)}</b>` : '') +
             `</span>`;
    }).join(' ');
  }

  /* ============================================================
     1.в  ХЭЛЭЛЦЭЭРИЙН БЛОКУУД
     ============================================================ */

  /** Нэг хүсэлтийн зүйлсийг чипээр */
  function tradeItems(players, awards) {
    const parts = [];
    (players || []).forEach(pid => {
      const p = DB.player(pid);
      if (p) parts.push(`<span class="chip">👤 ${esc(p.name)}</span>`);
    });
    (awards || []).forEach(aid => {
      const a = DB.award(aid);
      if (a) parts.push(`<span class="chip gold">${esc(a.icon || '🏅')} ${esc(a.title)}</span>`);
    });
    return parts.length ? parts.join(' ') : '<span class="muted">—</span>';
  }

  /** Тоглогч сонгох жагсаалт (ахлагчийг хаана) */
  function playerPickList(teamId, selectedIds, name) {
    const list = DB.playersOf(teamId);
    const cap  = DB.captainOf(teamId);
    const sel  = selectedIds || [];

    if (!list.length) return '<p class="muted" style="font-size:.85rem">Тоглогч байхгүй.</p>';

    return `<div class="check-list">${list.map(p => {
      const isCap = !!(cap && cap.id === p.id);
      return `<label class="${isCap ? 'pick-disabled' : ''}">
        ${avatar(p, 'sm')}
        <input type="checkbox" name="${esc(name)}" value="${esc(p.id)}"
               ${sel.includes(p.id) ? 'checked' : ''} ${isCap ? 'disabled' : ''} />
        ${esc(p.name)}${isCap ? ' <span class="chip gold">👑</span>' : ''}
      </label>`;
    }).join('')}</div>`;
  }

  /** Шагнал сонгох жагсаалт */
  function awardPickList(playerId, selectedIds, name) {
    const list = DB.awardsOwnedBy(playerId);
    const sel  = selectedIds || [];
    if (!list.length) return '<p class="muted" style="font-size:.85rem">Шагнал байхгүй.</p>';

    return `<div class="check-list">${list.map(a => `
      <label>
        <span>${esc(a.icon || '🏅')}</span>
        <input type="checkbox" name="${esc(name)}" value="${esc(a.id)}"
               ${sel.includes(a.id) ? 'checked' : ''} />
        ${esc(a.title)}
      </label>`).join('')}</div>`;
  }

  /** Хүсэлтийн карт */
  function tradeCard(r, opts) {
    opts = opts || {};
    const fromT = DB.team(r.fromTeamId), toT = DB.team(r.toTeamId);
    const fromC = DB.player(r.fromCaptainId), toC = DB.player(r.toCaptainId);

    const statusMap = {
      pending:   ['tw-upcoming', '⏳ Хүлээгдэж байна'],
      accepted:  ['tw-open',     '✅ Батлагдсан'],
      rejected:  ['tw-closed',   '❌ Татгалзсан'],
      cancelled: ['tw-closed',   '🚫 Цуцлагдсан'],
      countered: ['tw-upcoming', '🔁 Эсрэг санал']
    };
    const st = statusMap[r.status] || ['tw-closed', r.status];

    return `
      <div class="card trade-card">
        <div class="trade-head">
          <div class="trade-teams">
            <a class="trade-team" href="#/team/${esc(r.fromTeamId)}">
              ${teamCrest(fromT, 'sm')}
              <span class="trade-team-txt">
                <b>${esc(fromT ? fromT.name : '—')}</b>
                <span class="muted">${fromC ? '👑 ' + esc(fromC.name) : '—'}</span>
              </span>
            </a>
            <span class="trade-arrow">⇄</span>
            <a class="trade-team" href="#/team/${esc(r.toTeamId)}">
              ${teamCrest(toT, 'sm')}
              <span class="trade-team-txt">
                <b>${esc(toT ? toT.name : '—')}</b>
                <span class="muted">${toC ? '👑 ' + esc(toC.name) : '—'}</span>
              </span>
            </a>
          </div>
          <span class="badge ${st[0]}">${st[1]}</span>
        </div>

        <div class="trade-body">
          <div class="trade-row">
            <span class="trade-lbl">${esc(fromT ? fromT.icon + ' ' + fromT.name : '—')} өгнө</span>
            <span class="trade-items">${tradeItems(r.offerPlayers, r.offerAwards)}</span>
          </div>
          <div class="trade-row">
            <span class="trade-lbl">${esc(toT ? toT.icon + ' ' + toT.name : '—')} өгнө</span>
            <span class="trade-items">${tradeItems(r.wantPlayers, r.wantAwards)}</span>
          </div>
        </div>

        ${r.note ? `<div class="trade-note">💬 ${esc(r.note)}</div>` : ''}
        ${r.reason ? `<div class="trade-note" style="color:var(--danger)">❌ ${esc(r.reason)}</div>` : ''}

        <div class="trade-foot">
          <span class="muted" style="font-size:.76rem">
            ${esc(fmtDateTime(r.createdAt))}
            ${r.resolvedAt ? ' · ' + esc(fmtDateTime(r.resolvedAt)) : ''}
            ${r.parentId ? ' · 🔁 эсрэг санал' : ''}
          </span>
          ${opts.actions || ''}
        </div>

        ${opts.extra || ''}
      </div>`;
  }

  /** Шинэ хүсэлт үүсгэх форм */
  function tradeCreateForm(myTeam, myP) {
    const others = DB.state.teams.filter(t => t.id !== myTeam.id);
    if (!others.length) return '<p class="muted">Өөр баг байхгүй.</p>';

    if (!tradeTo || !DB.team(tradeTo) || tradeTo === myTeam.id) {
      tradeTo = others[0].id;
    }
    const toTeam = DB.team(tradeTo);
    const toCap  = DB.captainOf(tradeTo);
    const open   = DB.isTransferOpen();

    return `
      <div class="field" style="max-width:460px">
        <label>🤝 Хэлэлцээр хийх баг</label>
        <select data-action="trade-to">
          ${others.map(t => {
            const c = DB.captainOf(t.id);
            return `<option value="${esc(t.id)}" ${t.id === tradeTo ? 'selected' : ''}>${esc(t.icon)} ${esc(t.name)}${c ? ' — 👑 ' + esc(c.name) : ' (ахлагчгүй)'}</option>`;
          }).join('')}
        </select>
      </div>

      ${!toCap ? `
        <div class="banner closed" style="margin-bottom:16px">
          <div><b>⚠️ ${esc(toTeam.name)} багт ахлагч товлогдоогүй</b>
          <div class="muted" style="font-size:.85rem">Ахлагчгүй баг руу хэлэлцээр илгээх боломжгүй.</div></div>
        </div>` : ''}

      <form class="card" data-form="trade-new" style="margin-bottom:22px">
        <input type="hidden" name="toTeamId" value="${esc(tradeTo)}" />

        <div class="trade-grid">
          <div class="trade-col">
            <h4>📤 ${esc(myTeam.icon)} ${esc(myTeam.name)} — та өгөх</h4>
            <p class="muted trade-sub">Тоглогч</p>
            ${playerPickList(myTeam.id, [], 'offerPlayers')}
            <p class="muted trade-sub" style="margin-top:14px">👑 Таны эзэмшилд байгаа шагнал</p>
            ${awardPickList(myP.id, [], 'offerAwards')}
          </div>

          <div class="trade-col">
            <h4>📥 ${esc(toTeam.icon)} ${esc(toTeam.name)} — та авах</h4>
            <p class="muted trade-sub">Тоглогч</p>
            ${playerPickList(toTeam.id, [], 'wantPlayers')}
            <p class="muted trade-sub" style="margin-top:14px">👑 Тэдний эзэмшилд байгаа шагнал</p>
            ${toCap ? awardPickList(toCap.id, [], 'wantAwards') : '<p class="muted" style="font-size:.85rem">—</p>'}
          </div>
        </div>

        <div class="field" style="margin-top:16px">
          <label>💬 Тайлбар (сонголтоор)</label>
          <textarea name="note" rows="2" placeholder="ж: Манай багт довтлогч хэрэгтэй байна"></textarea>
        </div>

        <button class="btn" type="submit" ${(!toCap || !open) ? 'disabled' : ''}>📤 Хүсэлт илгээх</button>
        ${!open ? '<p class="muted" style="font-size:.83rem;margin:8px 0 0">⚠️ Шилжилтийн цонх хаалттай байна — хүсэлт илгээх боломжгүй.</p>' : ''}
      </form>`;
  }

  /** Эсрэг саналын форм */
  function tradeCounterForm(r, myTeam, myP) {
    const fromT = DB.team(r.fromTeamId);
    const fromC = DB.player(r.fromCaptainId);
    const open  = DB.isTransferOpen();

    return `
      <details class="counter-box">
        <summary>🔁 Эсрэг санал илгээх</summary>
        <form data-form="trade-counter" class="counter-form">
          <input type="hidden" name="id" value="${esc(r.id)}" />
          <p class="muted" style="font-size:.82rem;margin:10px 0 6px">
            Нөхцөлийг засаад буцааж илгээнэ. Анхны хүсэлт хаагдаж, шинэ хүсэлт үүснэ.
          </p>

          <div class="trade-grid">
            <div class="trade-col">
              <h4>📤 ${esc(myTeam.icon)} ${esc(myTeam.name)} — та өгөх</h4>
              <p class="muted trade-sub">Тоглогч</p>
              ${playerPickList(myTeam.id, r.wantPlayers, 'c_offer_p')}
              <p class="muted trade-sub" style="margin-top:14px">👑 Таны шагнал</p>
              ${awardPickList(myP.id, r.wantAwards, 'c_offer_a')}
            </div>

            <div class="trade-col">
              <h4>📥 ${esc(fromT ? fromT.icon : '')} ${esc(fromT ? fromT.name : '')} — та авах</h4>
              <p class="muted trade-sub">Тоглогч</p>
              ${playerPickList(r.fromTeamId, r.offerPlayers, 'c_want_p')}
              <p class="muted trade-sub" style="margin-top:14px">👑 Тэдний шагнал</p>
              ${fromC ? awardPickList(fromC.id, r.offerAwards, 'c_want_a') : '<p class="muted" style="font-size:.85rem">—</p>'}
            </div>
          </div>

          <div class="field" style="margin-top:14px">
            <label>💬 Тайлбар</label>
            <textarea name="note" rows="2" placeholder="ж: Нэмж нэг тоглогч хэрэгтэй байна"></textarea>
          </div>

          <button class="btn" type="submit" ${!open ? 'disabled' : ''}>📤 Эсрэг санал илгээх</button>
        </form>
      </details>`;
  }

  /* ============================================================
     2. ДЭЛГЭЦҮҮД
     ============================================================ */

  function viewDashboard() {
    const year    = new Date().getFullYear();
    const seasons = DB.seasonsOf(year);
    const subs    = DB.state.tournaments.filter(t => t.year === year && !t.isFinal);
    const finalT  = DB.finalTournament(year);
    const stand   = DB.seasonStandings(year);
    const next    = DB.nextTournament();
    const tw      = DB.transferWindow(year);
    const bigCh   = DB.bigChampion(year);
    const tpls    = DB.statTemplates();

    const perfCount = DB.state.matches.reduce((n, m) => n + ((m.perfs || []).length), 0);

    const stats = `
      <div class="grid g-4">
        <div class="stat"><div class="num">${DB.state.teams.length}</div><div class="lbl">Баг</div></div>
        <div class="stat"><div class="num">${DB.state.players.length}</div><div class="lbl">Тоглогч</div></div>
        <div class="stat"><div class="num">${seasons.length}×${DB.state.settings.subPerSeason}</div><div class="lbl">${year} оны тэмцээн</div></div>
        <div class="stat"><div class="num">${perfCount}</div><div class="lbl">Тоглолтын стат бичлэг</div></div>
      </div>`;

    const finalHtml = finalT ? `
      <section class="section"><h2>🏆 Их тэмцээн</h2>${tourCard(finalT)}</section>` : '';

    let twBanner = '';
    if (tw) {
      if (tw.status === 'open') {
        twBanner = `<div class="banner open">
          <div><b>🔄 Шилжилтийн цонх НЭЭЛТТЭЙ</b>
            <div class="muted" style="font-size:.86rem">${esc(fmtDate(tw.opensAt))} — ${esc(fmtDate(tw.closesAt))} · ${tw.daysLeft} хоног үлдсэн</div>
          </div>
          <a class="btn sm" href="#/trade">🤝 Хэлэлцээр →</a>
        </div>`;
      } else if (tw.status === 'upcoming') {
        twBanner = `<div class="banner">
          <div><b>⏳ Шилжилтийн цонх удахгүй</b>
            <div class="muted" style="font-size:.86rem">${esc(fmtDate(tw.opensAt))} — ${esc(fmtDate(tw.closesAt))} · ${tw.daysUntil} хоногийн дараа нээгдэнэ</div>
          </div>
          <a class="btn ghost sm" href="#/trade">🤝 Хэлэлцээр</a>
        </div>`;
      } else {
        twBanner = `<div class="banner closed">
          <div><b>🔒 Шилжилтийн цонх хаалттай</b>
            <div class="muted" style="font-size:.86rem">2-р улирлын дараа ${esc(fmtDate(tw.opensAt))} — ${esc(fmtDate(tw.closesAt))} нээгдэнэ</div>
          </div>
          <a class="btn ghost sm" href="#/trade">🤝 Хэлэлцээр</a>
        </div>`;
      }
    }

    const me = DB.currentUser();
    const meP = me && me.playerId ? DB.player(me.playerId) : null;
    const mePerf = meP ? DB.playerPerf(meP.id) : null;
    const myCapTeam = meP ? DB.captainTeam(meP.id) : null;
    const inboxN = myCapTeam ? DB.pendingInbox(myCapTeam.id).length : 0;

    const meBanner = meP ? `
      <div class="banner open" style="border-left-color:var(--accent)">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          ${avatar(meP)}
          <div style="min-width:0">
            <b>Сайн байна уу, ${esc(meP.name)}!</b>
            <div class="muted" style="font-size:.85rem">${playerMiniStats(mePerf || { matchCount: 0, byTemplate: [] })}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn sm" href="#/me">👤 Миний профайл</a>
          ${myCapTeam ? `<a class="btn ghost sm" href="#/trade">👑 Хэлэлцээр${inboxN ? ' (' + inboxN + ')' : ''}</a>` : ''}
        </div>
      </div>` : '';

    let nextHtml = '<div class="card"><p class="muted" style="margin:0">Товлосон тэмцээн алга.</p></div>';
    if (next) {
      const s = next.seasonId ? DB.season(next.seasonId) : null;
      const d = daysUntil(next.date);
      const when = d === 0 ? 'Өнөөдөр!' : d > 0 ? `${d} хоногийн дараа` : `${Math.abs(d)} хоногийн өмнө`;
      nextHtml = `
        <div class="card" style="border-color:var(--accent)">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div class="muted" style="font-size:.78rem;font-weight:700;letter-spacing:.05em">ДАРААГИЙН ТЭМЦЭЭН</div>
              <h2 style="margin:6px 0 4px">${next.isFinal ? '🏆 ' : ''}${esc(next.title)}</h2>
              <div class="muted">${esc(s ? s.title : '')} · ${esc(fmtDate(next.date))} ${esc(next.time || '')} · ${(next.entrants || []).length} баг</div>
              <div class="tour-meta">${tourChips(next)}</div>
            </div>
            ${statusBadge(next.status)}
          </div>
          <p style="margin:14px 0 0;font-weight:700;color:var(--accent)">${esc(when)}</p>
          <a class="btn" style="margin-top:14px" href="#/tournament/${esc(next.id)}">Дэлгэрэнгүй →</a>
        </div>`;
    }

    const recent = DB.state.matches
      .filter(m => m.status === 'done')
      .map(m => ({ m, t: DB.tournament(m.tournamentId) }))
      .sort((a, b) => ((b.t?.date || '') + b.m.id).localeCompare((a.t?.date || '') + a.m.id))
      .slice(0, 5);

    const recentHtml = recent.length ? recent.map(({ m, t }) => `
      ${matchRow(m)}
      <div class="muted" style="font-size:.78rem;margin:-4px 0 14px 4px">
        ${esc(t ? t.title : '')} · ${esc(m.stage || '')} · ${esc(t ? fmtDate(t.date) : '')}
      </div>`).join('') : '<p class="muted">Үр дүн бүртгэгдээгүй.</p>';

    const tplTops = tpls.map(tpl => ({
      tpl,
      top: DB.statLeaders({ templateId: tpl.id, sort: 'ratio' }).slice(0, 3)
    })).filter(x => x.top.length);

    return `
      <div class="page-head">
        <h1>🏆 ${esc(DB.state.settings.title)}</h1>
        <p>${year} оны улирал · 4 улирал × ${DB.state.settings.subPerSeason} тэмцээн + Их тэмцээн
          ${bigCh ? ' · Их аварга: ' + esc((DB.team(bigCh) || {}).name || '') : ''}</p>
      </div>

      ${meBanner}
      <section class="section">${stats}</section>
      <section class="section">${twBanner}</section>
      <section class="section"><h2>📅 ${year} оны улирлууд</h2>${seasonCards(year)}</section>
      ${finalHtml}
      <section class="section">${nextHtml}</section>

      ${tplTops.length ? `
        <section class="section">
          <h2>🏅 Тоглоом тус бүрийн шилдгүүд</h2>
          <div class="grid g-2">
            ${tplTops.map(({ tpl, top }) => `
              <div class="card">
                <h3 style="margin-top:0">${esc(tpl.icon || '')} ${esc(tpl.name)}</h3>
                ${top.map((x, i) => `
                  <a class="mini-row" href="#/player/${esc(x.player.id)}">
                    <span class="mini-no rank-${i + 1}">${i + 1}</span>
                    ${avatar(x.player, 'sm')}
                    <span class="mini-main">
                      <b>${esc(x.player.name)}</b>
                      <span class="muted">
                        ${x.template.fields.slice(0, 3).map(f => `${f.icon || ''} ${fmt1(x.avg[f.key])}`).join(' · ')}
                        ${x.template.ratio ? ' · ' + esc(x.template.ratio.label) + ' ' + fmt2(x.ratio) : ''}
                        · 🏅 ${x.mvp}
                      </span>
                    </span>
                  </a>`).join('')}
                <a class="btn ghost sm" style="margin-top:10px"
                   href="#/stats" data-action="stat-set-tpl" data-id="${esc(tpl.id)}">Бүх жагсаалт →</a>
              </div>`).join('')}
          </div>
        </section>` : ''}

      <section class="section"><h2>🔥 Сүүлийн үр дүнгүүд</h2>${recentHtml}</section>
      <section class="section">
        <h2>📊 Оны нэгдсэн хүснэгт</h2>
        ${standingsTable(stand.filter(r => r.played > 0), { showTitles: true, championId: bigCh })}
      </section>`;
  }

  /* ---------- 2.2 Миний профайл ---------- */
  function viewMe() {
    const me = DB.currentUser();
    if (!me) return viewLogin();

    const p = me.playerId ? DB.player(me.playerId) : null;

    if (!p) {
      return `
        <div class="page-head"><h1>👤 Миний профайл</h1></div>
        <div class="card">
          <h3 style="margin-top:0">Таны бүртгэлд тоглогч холбогдоогүй байна</h3>
          <p class="muted">Та админ эрхтэй бол <a href="#/admin">Админ хэсэг</a> рүү орно уу.</p>
          <a class="btn" href="#/admin">⚙️ Админ хэсэг</a>
        </div>`;
    }

    const st = DB.playerStats(p.id);
    const team = st.currentTeam;
    const capTeam = DB.captainTeam(p.id);

    const header = `
      <div class="card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
        ${avatar(p, 'lg')}
        <div style="flex:1;min-width:180px">
          <h1 style="margin:0 0 4px">${esc(p.name)}</h1>
          <div class="muted">
            ${esc(p.nick || '')}${p.joined ? ' · ' + esc(fmtDate(p.joined)) + '-д нэгдсэн' : ''}
          </div>
          <div class="tour-meta" style="margin-top:8px">
            ${capTeam ? `<span class="chip gold">👑 ${esc(capTeam.name)} багийн ахлагч</span>` : ''}
            <a class="chip" href="#/player/${esc(p.id)}" style="text-decoration:none">🔗 Нийтийн профайл</a>
            <a class="chip" href="#/players" style="text-decoration:none">👥 Бүх тоглогч</a>
          </div>
        </div>
        ${team ? `<a class="team-card" style="padding:10px 14px" href="#/team/${esc(team.id)}">
          ${teamCrest(team, 'sm')}
          <div><div class="name" style="font-size:.92rem">${esc(team.name)}</div>
          <div class="sub">одоогийн баг</div></div>
        </a>` : '<span class="badge tw-closed">🆓 Чөлөөт тоглогч</span>'}
      </div>`;

    const yearRows = st.years.length ? `
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Он</th><th class="num">Тогл.</th><th class="num">Хож.</th>
          <th class="num">Тэнц.</th><th class="num">Хожг.</th>
          <th class="num">Оноо+</th><th class="num">Оноо−</th>
          <th class="num">Зөрүү</th><th class="num">ОНОО</th>
        </tr></thead>
        <tbody>${st.years.map(r => `
          <tr>
            <td><b>${r.year}</b></td>
            <td class="num">${r.played}</td>
            <td class="num" style="color:var(--accent-2)">${r.w}</td>
            <td class="num">${r.d}</td>
            <td class="num" style="color:var(--danger)">${r.l}</td>
            <td class="num">${r.gf}</td>
            <td class="num">${r.ga}</td>
            <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td>
            <td class="num"><b>${r.pts}</b></td>
          </tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted">Тоглолт бүртгэгдээгүй.</p>';

    const roster = team ? DB.playersOf(team.id) : [];
    const rosterHtml = roster.length
      ? `<div class="grid g-2">${roster.map(x => `
          <a class="player-card ${x.id === p.id ? 'me' : ''}" href="#/player/${esc(x.id)}">
            ${avatar(x)}
            <div><div class="name">${esc(x.name)}${x.id === p.id ? ' <span class="chip ok">чи</span>' : ''}${capTeam && capTeam.captainId === x.id ? ' <span class="chip gold">👑</span>' : ''}</div>
            <div class="sub">${esc(x.nick || '')}</div></div>
          </a>`).join('')}</div>`
      : '<p class="muted">Багт тоглогч байхгүй.</p>';

    const heldHtml = st.awardsHeld.length ? `
      <section class="section">
        <h2>👑 Миний эзэмшилд байгаа шагналууд (${st.awardsHeld.length})</h2>
        ${awardsBlock(st.awardsHeld)}
      </section>` : '';

    return `
      <div class="page-head">
        <h1>👤 Миний профайл</h1>
        <p>${esc(me.username)} нэрээр нэвтэрсэн</p>
      </div>

      <section class="section">${header}</section>

      ${capTeam ? `
        <section class="section">
          <div class="banner open" style="border-left-color:var(--gold)">
            <div><b>👑 Та ${esc(capTeam.name)} багийн ахлагч</b>
            <div class="muted" style="font-size:.85rem">Тоглогч, шагнал солилцох хэлэлцээр хийх боломжтой</div></div>
            <a class="btn sm" href="#/trade">🤝 Хэлэлцээр →</a>
          </div>
        </section>` : ''}

      ${perfSection(p.id, '🎮 Тоглолтын статистик (хувийн)')}

      <section class="section">
        <h2>📊 Багийн амжилт</h2>
        ${statCards(st.stats)}
      </section>

      <section class="section">
        <h2>📆 Жилээр (баг)</h2>
        ${yearRows}
      </section>

      <section class="section">
        <h2>🏆 Миний титэлүүд (${st.titles.length})</h2>
        ${titlesBlock(st.titles)}
      </section>

      <section class="section">
        <h2>🏅 Миний шагналууд (${st.awards.length})</h2>
        ${awardsBlock(st.awards)}
      </section>

      ${heldHtml}

      ${team ? `<section class="section"><h2>👥 Миний баг — ${esc(team.name)}</h2>${rosterHtml}</section>` : ''}

      <section class="section">
        <h2>⚔️ Багийн тоглолтууд</h2>
        ${playerMatchHistory(st.matches, team, 10)}
      </section>

      <section class="section">
        <h2>🔍 Бусад тоглогчид</h2>
        <div class="card">
          <p class="muted" style="margin:0 0 12px">Бүх тоглогчийн профайл, статистикийг харж болно.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn" href="#/players">👥 Бүх тоглогч (${DB.state.players.length}) →</a>
            <a class="btn ghost" href="#/stats">📊 Топ жагсаалт</a>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>🔐 Бүртгэлийн тохиргоо</h2>
        <form class="card" data-form="mypass" style="max-width:520px" autocomplete="off">
          <div class="field"><label>Одоогийн нууц үг *</label>
            <input type="password" name="current" required autocomplete="current-password" /></div>
          <div class="form-row">
            <div class="field"><label>Шинэ нууц үг *</label>
              <input type="password" name="next" required autocomplete="new-password" /></div>
            <div class="field"><label>Дахин бичих *</label>
              <input type="password" name="again" required autocomplete="new-password" /></div>
          </div>
          <button class="btn" type="submit">💾 Нууц үг солих</button>
          <button class="btn ghost" type="button" data-action="logout">Гарах</button>
        </form>
      </section>`;
  }

  /* ---------- 2.3 Статистик ---------- */
  function viewStats() {
    const tpls  = DB.statTemplates();
    const years = DB.years();

    if (!statTpl || !tpls.some(t => t.id === statTpl)) statTpl = tpls[0].id;
    const tpl = DB.statTemplate(statTpl) || tpls[0];

    const year = statYear === 'all' ? null : Number(statYear);
    const rows = DB.statLeaders({ templateId: tpl.id, year, sort: statSort });

    const yearOptions = [['all', 'Бүх цаг']].concat(years.map(y => [String(y), y + ' он']));

    const sortOptions = [['ratio', (tpl.ratio ? tpl.ratio.label : 'Үзүүлэлт') + ' — шилдэг']]
      .concat(tpl.fields.map(f => [f.key, `${f.icon || ''} ${f.label} — ${f.lower ? 'хамгийн бага' : 'нийт'}`]))
      .concat([['mvp', 'MVP'], ['matches', 'Тоглолтын тоо']]);

    if (!rows.length) {
      return `
        <div class="page-head"><h1>📊 Статистик</h1>
          <p>${esc(tpl.icon || '')} ${esc(tpl.name)} — стат бүртгэгдээгүй байна.</p></div>

        <section class="section">
          <div class="field" style="max-width:420px">
            <label>Тоглоомын төрөл</label>
            <select data-action="stat-tpl">${tpls.map(t => tplOption(t, tpl.id)).join('')}</select>
          </div>
        </section>

        <div class="card">
          <p class="muted" style="margin:0">
            Админ <b>📝 Үр дүн &amp; Стат</b> таб дээр тоглолт бүрийн тоглогчийн статыг оруулсны дараа энд топ жагсаалт гарна.
          </p>
        </div>`;
    }

    const bestOf = key => rows.slice().sort((a, b) => {
      const fa = tpl.fields.find(x => x.key === key);
      const va = a.totals[key] || 0, vb = b.totals[key] || 0;
      return (fa && fa.lower) ? va - vb : vb - va;
    })[0];

    const bestRatio = tpl.ratio ? rows.slice().sort((a, b) => (b.ratio || 0) - (a.ratio || 0))[0] : null;

    return `
      <div class="page-head">
        <h1>📊 Топ жагсаалт</h1>
        <p>${esc(tpl.icon || '')} <b>${esc(tpl.name)}</b> — тоглолт бүрийн бүртгэлээс автоматаар бодогдоно</p>
      </div>

      <section class="section">
        <div class="form-row" style="max-width:860px">
          <div class="field"><label>Тоглоомын төрөл</label>
            <select data-action="stat-tpl">${tpls.map(t => tplOption(t, tpl.id)).join('')}</select></div>
          <div class="field"><label>Он</label>
            <select data-action="stat-year">
              ${yearOptions.map(([v, l]) => `<option value="${esc(v)}" ${String(statYear) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select></div>
          <div class="field"><label>Эрэмбэлэх</label>
            <select data-action="stat-sort">
              ${sortOptions.map(([v, l]) => `<option value="${esc(v)}" ${statSort === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select></div>
        </div>
      </section>

      <section class="section">
        <div class="grid g-3">
          ${tpl.fields.map(f => {
            const best = bestOf(f.key);
            return best ? `
              <a class="card player-card" href="#/player/${esc(best.player.id)}">
                <div class="award-icon">${esc(f.icon || '🏅')}</div>
                <div style="min-width:0">
                  <div class="name">${esc(best.player.name)}</div>
                  <div class="sub">${esc(f.label)} — <b>${best.totals[f.key] || 0}</b> (дундаж ${fmt1(best.avg[f.key])})</div>
                </div>
              </a>` : '';
          }).join('')}
          ${bestRatio ? `
            <a class="card player-card" href="#/player/${esc(bestRatio.player.id)}">
              <div class="award-icon">📈</div>
              <div style="min-width:0">
                <div class="name">${esc(bestRatio.player.name)}</div>
                <div class="sub">Шилдэг ${esc(tpl.ratio.label)} — <b>${fmt2(bestRatio.ratio)}</b></div>
              </div>
            </a>` : ''}
        </div>
      </section>

      <section class="section">
        <div class="table-wrap"><table>
          <thead><tr>
            <th style="width:48px">#</th>
            <th>Тоглогч</th>
            <th>Баг</th>
            <th class="num">Тогл.</th>
            ${tpl.fields.map(f => `<th class="num">${esc(f.icon || '')} ${esc(f.label)} нийт</th>`).join('')}
            ${tpl.fields.map(f => `<th class="num">${esc(f.icon || '')} ${esc(f.label)} дундаж</th>`).join('')}
            ${tpl.ratio ? `<th class="num">${esc(tpl.ratio.label)}</th>` : ''}
            <th class="num">MVP</th>
          </tr></thead>
          <tbody>${rows.map((r, i) => `
            <tr>
              <td class="rank-${i < 3 ? i + 1 : 0}">${i + 1}</td>
              <td>
                <a href="#/player/${esc(r.player.id)}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">
                  ${avatar(r.player, 'sm')}<b>${esc(r.player.name)}</b>
                </a>
              </td>
              <td>${r.team ? teamCrest(r.team, 'xs') + ' ' + esc(r.team.name) : '<span class="muted">Чөлөөт</span>'}</td>
              <td class="num">${r.matches}</td>
              ${tpl.fields.map(f => `<td class="num">${r.totals[f.key] || 0}</td>`).join('')}
              ${tpl.fields.map(f => `<td class="num" style="color:var(--accent)">${fmt1(r.avg[f.key])}</td>`).join('')}
              ${tpl.ratio ? `<td class="num"><b style="font-size:1.02rem">${r.ratio == null ? '—' : fmt2(r.ratio)}</b></td>` : ''}
              <td class="num">${r.mvp ? r.mvp + ' 🏅' : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </section>

      <section class="section">
        <a class="btn ghost" href="#/players">👥 Бүх тоглогчийн жагсаалт →</a>
      </section>`;
  }

  /* ---------- 2.4 ШИЛЖИЛТ / ХЭЛЭЛЦЭЭР ---------- */
  function viewTrade() {
    const me     = DB.currentUser();
    const myP    = me && me.playerId ? DB.player(me.playerId) : null;
    const myTeam = myP ? DB.captainTeam(myP.id) : null;
    const isCap  = !!myTeam;
    const isAdm  = DB.isAdmin();
    const open   = DB.isTransferOpen();
    const w      = DB.currentTransferWindow();

    /* ---------- Цонхны төлөв ---------- */
    let winBanner = '';
    if (w) {
      if (w.status === 'open') {
        winBanner = `<div class="banner open">
          <div><b>🔄 Шилжилтийн цонх НЭЭЛТТЭЙ</b>
            <div class="muted" style="font-size:.86rem">${esc(fmtDate(w.opensAt))} — ${esc(fmtDate(w.closesAt))} · ${w.daysLeft} хоног үлдсэн</div></div>
          ${isAdm ? `<a class="btn sm" href="#/admin">Шилжилт удирдах →</a>` : ''}
        </div>`;
      } else if (w.status === 'upcoming') {
        winBanner = `<div class="banner">
          <div><b>⏳ Шилжилтийн цонх удахгүй</b>
            <div class="muted" style="font-size:.86rem">${esc(fmtDate(w.opensAt))} — ${esc(fmtDate(w.closesAt))} · ${w.daysUntil} хоногийн дараа нээгдэнэ</div></div>
        </div>`;
      } else {
        winBanner = `<div class="banner closed">
          <div><b>🔒 Шилжилтийн цонх хаалттай</b>
            <div class="muted" style="font-size:.86rem">Цонх нээгдсэн үед л хэлэлцээр хийнэ</div></div>
        </div>`;
      }
    } else {
      winBanner = `<div class="banner closed"><div><b>🔒 Шилжилтийн цонх тодорхойгүй</b></div></div>`;
    }

    /* ---------- Түүх ---------- */
    const history = DB.tradeHistory(30);
    const historyHtml = history.length ? `
      <section class="section">
        <h2>📜 Хэлэлцээрийн түүх (${history.length})</h2>
        ${history.map(r => tradeCard(r)).join('')}
      </section>` : '';

    /* ---------- Ахлагч биш ---------- */
    if (!isCap && !isAdm) {
      return `
        <div class="page-head">
          <h1>🔄 Шилжилт</h1>
          <p>Баг хоорондын тоглогч, шагналын хэлэлцээр</p>
        </div>

        ${winBanner}

        <section class="section">
          <div class="card">
            <h3 style="margin-top:0">👑 Та багийн ахлагч биш байна</h3>
            <p class="muted">Хэлэлцээрийг зөвхөн <b>багийн ахлагч</b> хийнэ. Ахлагчийг админ товлоно.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn ghost" href="#/teams">🏟 Багуудыг харах</a>
              <a class="btn ghost" href="#/me">👤 Миний профайл</a>
            </div>
          </div>
        </section>

        <section class="section">
          <h2>👑 Багуудын ахлагчид</h2>
          <div class="grid g-2">
            ${DB.state.teams.map(t => {
              const c = DB.captainOf(t.id);
              return `
                <a class="team-card" href="#/team/${esc(t.id)}">
                  ${teamCrest(t)}
                  <div style="min-width:0">
                    <div class="name">${esc(t.icon)} ${esc(t.name)}</div>
                    <div class="sub">${c ? '👑 ' + esc(c.name) : 'ахлагч товлогдоогүй'}</div>
                  </div>
                </a>`;
            }).join('')}
          </div>
        </section>

        ${historyHtml}`;
    }

    /* ---------- Ахлагчийн панел ---------- */
    let inboxHtml = '', outboxHtml = '', createHtml = '';

    if (isCap) {
      const inbox  = DB.pendingInbox(myTeam.id);
      const outbox = DB.pendingOutbox(myTeam.id);

      createHtml = `
        <section class="section">
          <h2>📤 Шинэ хүсэлт илгээх</h2>
          ${tradeCreateForm(myTeam, myP)}
        </section>`;

      inboxHtml = `
        <section class="section">
          <h2>📥 Ирсэн хүсэлтүүд (${inbox.length})</h2>
          ${inbox.length ? inbox.map(r => {
            const actions = `
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn sm" data-action="trade-accept" data-id="${esc(r.id)}">✅ Зөвшөөрөх</button>
                <button class="btn danger sm" data-action="trade-reject" data-id="${esc(r.id)}">❌ Татгалзах</button>
              </div>`;
            return tradeCard(r, {
              actions,
              extra: tradeCounterForm(r, myTeam, myP)
            });
          }).join('') : '<p class="muted">Ирсэн хүсэлт байхгүй.</p>'}
        </section>`;

      outboxHtml = `
        <section class="section">
          <h2>📤 Явуулсан хүсэлтүүд (${outbox.length})</h2>
          ${outbox.length ? outbox.map(r => {
            const actions = `
              <button class="btn ghost sm" data-action="trade-cancel" data-id="${esc(r.id)}">🚫 Цуцлах</button>`;
            return tradeCard(r, { actions });
          }).join('') : '<p class="muted">Явуулсан хүсэлт байхгүй.</p>'}
        </section>`;
    }

    /* ---------- Админ: бүх хүсэлт ---------- */
    let adminHtml = '';
    if (isAdm) {
      const allPending = DB.tradeRequests().filter(r => r.status === 'pending');
      adminHtml = `
        <section class="section">
          <h2>🛠 Админ — бүх хүсэлт (${allPending.length} хүлээгдэж байна)</h2>
          ${allPending.length ? allPending.map(r => {
            const actions = `
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn sm" data-action="trade-accept" data-id="${esc(r.id)}">✅ Батлах</button>
                <button class="btn ghost sm" data-action="trade-reject" data-id="${esc(r.id)}">❌ Татгалзах</button>
                <button class="btn ghost sm" data-action="trade-cancel" data-id="${esc(r.id)}">🚫 Цуцлах</button>
              </div>`;
            return tradeCard(r, { actions });
          }).join('') : '<p class="muted">Хүлээгдэж буй хүсэлт байхгүй.</p>'}
        </section>`;
    }

    return `
      <div class="page-head">
        <h1>🔄 Шилжилт &amp; Хэлэлцээр</h1>
        <p>${isCap ? `👑 ${esc(myTeam.name)} багийн ахлагч` : 'Админ харагдац'} · тоглогч, шагнал солилцох</p>
      </div>

      ${winBanner}

      ${isCap ? `
        <section class="section">
          <div class="card">
            <h3 style="margin-top:0">${esc(myTeam.icon)} ${esc(myTeam.name)}</h3>
            <div class="tour-meta" style="margin-bottom:12px">
              <span class="chip gold">👑 ${esc(myP.name)}</span>
              <span class="chip">👤 ${DB.playersOf(myTeam.id).length} тоглогч</span>
              <span class="chip">🏅 ${DB.awardsOwnedBy(myP.id).length} шагнал эзэмшилд</span>
            </div>
            <p class="muted" style="font-size:.85rem;margin:0">
              Та өөрийн багийн тоглогчдыг болон <b>өөрийн эзэмшилд байгаа шагналуудыг</b> санал болгож,
              бусдын багийн тоглогч/шагналыг авах хүсэлт илгээнэ.
            </p>
          </div>
        </section>` : ''}

      ${createHtml}
      ${inboxHtml}
      ${outboxHtml}
      ${adminHtml}
      ${historyHtml}

      ${(!history.length && !isCap && !isAdm) ? '' : `
        <section class="section">
          <div class="card" style="border-color:var(--line)">
            <h3 style="margin-top:0">💡 Хэрхэн ажилладаг вэ</h3>
            <ol class="muted" style="font-size:.87rem;margin:0;padding-left:20px">
              <li>Ахлагч <b>📤 хүсэлт илгээх</b> — «би энэ тоглогч/шагналыг өгье, тэр тоглогч/шагналыг авъя»</li>
              <li>Хүлээн авагч ахлагч <b>✅ зөвшөөрөх</b> / <b>🔁 эсрэг санал</b> / <b>❌ татгалзах</b></li>
              <li>Зөвшөөрвөл тоглогчдын баг, шагналын эзэмшигч <b>автоматаар</b> солигдоно</li>
              <li>Ахлагчийг солилцох боломжгүй · цонх хаалттай үед илгээхгүй</li>
            </ol>
          </div>
        </section>`}`;
  }

  /* ---------- 2.5 Улирлууд ---------- */
  function viewSeasons() {
    const years = DB.years();
    if (!years.length) {
      return `<div class="page-head"><h1>🗓 Улирлууд</h1></div>
        <p class="muted">Улирал бүртгэгдээгүй. <a href="#/admin">Админ хэсэгт</a> нэмээрэй.</p>`;
    }
    return `
      <div class="page-head"><h1>🗓 Улирлууд</h1>
        <p>Жил бүр 4 улирал · улирал бүр ${DB.state.settings.subPerSeason} жижиг тэмцээн + 1 Их тэмцээн</p></div>
      ${years.map(y => {
        const f = DB.finalTournament(y);
        return `
          <section class="section">
            <h2>${y} он</h2>
            ${seasonCards(y)}
            ${f ? `<h3 style="margin-top:22px">🏆 Их тэмцээн</h3>${tourCard(f)}` : ''}
          </section>`;
      }).join('')}`;
  }

  /* ---------- 2.6 Нэг улирал ---------- */
  function viewSeason(id) {
    const s = DB.season(id);
    if (!s) return notFound('Улирал олдсонгүй');

    const list  = DB.tournamentsOfSeason(s.id);
    const done  = list.filter(t => t.status === 'done').length;
    const champ = DB.seasonChampionOf(s.id);
    const span  = DB.seasonSpan(s.id);
    const table = DB.seasonStandingsOf(s.id);
    const tids  = list.map(t => t.id);

    const tplBlocks = DB.statTemplates().map(tpl => {
      const rows = [];
      DB.state.players.forEach(p => {
        const perf = DB.playerPerf(p.id, s.year);
        const g = perf.byTemplate.find(x => x.templateId === tpl.id);
        if (!g) return;
        const rs = g.rows.filter(r => r.tournament && tids.includes(r.tournament.id));
        if (!rs.length) return;

        const totals = {}; tpl.fields.forEach(f => totals[f.key] = 0);
        let mvp = 0;
        rs.forEach(r => {
          tpl.fields.forEach(f => totals[f.key] += r.values[f.key] || 0);
          if (r.mvp) mvp++;
        });
        const avg = {}; tpl.fields.forEach(f => avg[f.key] = totals[f.key] / rs.length);

        rows.push({ player: p, team: DB.team(rs[0].teamId), matches: rs.length,
                    totals, avg, mvp, ratio: DB.ratioOf(tpl, totals) });
      });
      rows.sort((a, b) => (b.ratio == null ? -1 : b.ratio) - (a.ratio == null ? -1 : a.ratio)
                       || b.mvp - a.mvp);
      return { tpl, rows };
    }).filter(x => x.rows.length);

    const head = `
      <div class="card">
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
          <div class="tour-no" style="width:52px;height:52px;font-size:1.2rem">${esc(s.round)}</div>
          <div style="flex:1;min-width:180px">
            <h1 style="margin:0 0 4px">${esc(s.title)}</h1>
            <div class="muted">
              ${s.year} он · ${list.length} тэмцээн · ${done} дууссан
              ${span ? ` · ${esc(fmtDate(span.start))} — ${esc(fmtDate(span.end))}` : ''}
            </div>
            ${s.note ? `<div class="muted" style="margin-top:6px">📝 ${esc(s.note)}</div>` : ''}
          </div>
          ${champ ? `<div class="chip gold">🏆 Улирлын аварга: ${esc((DB.team(champ) || {}).name || '')}</div>`
                  : statusBadge(DB.seasonStatus(s.id))}
        </div>
        <div class="progress"><i style="width:${list.length ? Math.round(done * 100 / list.length) : 0}%"></i></div>
      </div>`;

    const tplHtml = tplBlocks.map(({ tpl, rows }) => `
      <section class="section">
        <h2>${esc(tpl.icon || '')} ${esc(tpl.name)} — улирлын стат</h2>
        <div class="table-wrap"><table>
          <thead><tr>
            <th style="width:48px">#</th><th>Тоглогч</th><th>Баг</th><th class="num">Тогл.</th>
            ${tpl.fields.map(f => `<th class="num">${esc(f.icon || '')} нийт</th>`).join('')}
            ${tpl.fields.map(f => `<th class="num">${esc(f.icon || '')} дундаж</th>`).join('')}
            ${tpl.ratio ? `<th class="num">${esc(tpl.ratio.label)}</th>` : ''}
            <th class="num">MVP</th>
          </tr></thead>
          <tbody>${rows.map((r, i) => `
            <tr>
              <td class="rank-${i < 3 ? i + 1 : 0}">${i + 1}</td>
              <td><a href="#/player/${esc(r.player.id)}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">
                ${avatar(r.player, 'sm')}<b>${esc(r.player.name)}</b></a></td>
              <td>${r.team ? teamCrest(r.team, 'xs') + ' ' + esc(r.team.name) : '—'}</td>
              <td class="num">${r.matches}</td>
              ${tpl.fields.map(f => `<td class="num">${r.totals[f.key] || 0}</td>`).join('')}
              ${tpl.fields.map(f => `<td class="num" style="color:var(--accent)">${fmt1(r.avg[f.key])}</td>`).join('')}
              ${tpl.ratio ? `<td class="num"><b>${r.ratio == null ? '—' : fmt2(r.ratio)}</b></td>` : ''}
              <td class="num">${r.mvp}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </section>`).join('');

    return `
      <div class="page-head"><a href="#/seasons" style="text-decoration:none">← Бүх улирал</a></div>
      <section class="section">${head}</section>
      <section class="section">
        <h2>🎯 Жижиг тэмцээнүүд (${list.length})</h2>
        ${list.length
          ? `<div class="grid g-3">${list.map(tourCard).join('')}</div>`
          : '<p class="muted">Тэмцээн үүсгээгүй.</p>'}
      </section>

      ${tplHtml}

      <section class="section">
        <h2>📊 Улирлын нэгдсэн хүснэгт</h2>
        ${standingsTable(table.filter(r => r.played > 0), { showTitles: true, championId: champ })}
      </section>`;
  }

  /* ---------- 2.7 Тэмцээнүүд ---------- */
  function viewTournaments() {
    const years = DB.years();
    if (!years.length) {
      return `<div class="page-head"><h1>🎯 Тэмцээнүүд</h1></div><p class="muted">Тэмцээн алга.</p>`;
    }
    return `
      <div class="page-head"><h1>🎯 Тэмцээнүүд</h1>
        <p>Улирал бүрийн ${DB.state.settings.subPerSeason} жижиг тэмцээн + Их тэмцээн</p></div>
      ${years.map(y => {
        const seasons = DB.seasonsOf(y);
        const f = DB.finalTournament(y);
        return `
          <section class="section">
            <h2>${y} он</h2>
            ${seasons.map(s => {
              const list = DB.tournamentsOfSeason(s.id);
              if (!list.length) return '';
              return `
                <h3 style="margin-top:20px">
                  <a href="#/season/${esc(s.id)}" style="color:inherit;text-decoration:none">${esc(s.title)} →</a>
                </h3>
                <div class="grid g-3">${list.map(tourCard).join('')}</div>`;
            }).join('')}
            ${f ? `<h3 style="margin-top:20px">🏆 Их тэмцээн</h3><div class="grid g-3">${tourCard(f)}</div>` : ''}
          </section>`;
      }).join('')}`;
  }

  /* ---------- 2.8 Нэг тэмцээн ---------- */
  function viewTournament(id) {
    const t = DB.tournament(id);
    if (!t) return notFound('Тэмцээн олдсонгүй');

    const season  = t.seasonId ? DB.season(t.seasonId) : null;
    const matches = DB.matchesOf(id);
    const champ   = t.status === 'done' ? DB.team(DB.championOf(id)) : null;
    const tpl     = DB.templateOf(id);

    const back = season
      ? `<a href="#/season/${esc(season.id)}" style="text-decoration:none">← ${esc(season.title)}</a>`
      : `<a href="#/tournaments" style="text-decoration:none">← Бүх тэмцээн</a>`;

    const head = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap">
          <div>
            <h1 style="margin:0 0 6px">${t.isFinal ? '🏆 ' : ''}${esc(t.title)}</h1>
            <div class="muted">
              ${esc(t.year)} он · ${t.isFinal ? 'Их тэмцээн' : (season ? esc(season.title) + ' · ' + esc(t.no) + '-р тэмцээн' : '')}
            </div>
            ${t.note ? `<div class="muted" style="margin-top:6px">📝 ${esc(t.note)}</div>` : ''}
          </div>
          ${statusBadge(t.status)}
        </div>

        <div class="info-list">
          <div class="info-item"><div class="k">📅 Огноо</div><div class="v">${esc(fmtDate(t.date))}</div></div>
          <div class="info-item"><div class="k">⏰ Цаг</div><div class="v">${esc(t.time || '—')}</div></div>
          <div class="info-item"><div class="k">${esc(tpl.icon || '🎮')} Тоглоом</div><div class="v">${esc(t.game || '—')}</div></div>
          <div class="info-item"><div class="k">📊 Стат загвар</div><div class="v">${esc(tpl.name)}</div></div>
          <div class="info-item"><div class="k">📍 Газар</div><div class="v">${esc(t.place || '—')}</div></div>
          <div class="info-item"><div class="k">🏷 Төрөл</div><div class="v">${esc(t.format || '—')}</div></div>
        </div>

        <div class="tour-meta" style="margin-top:12px">
          ${tpl.fields.map(f => `<span class="chip">${esc(f.icon || '')} ${esc(f.label)}</span>`).join('')}
          ${tpl.ratio ? `<span class="chip ok">📈 ${esc(tpl.ratio.label)}</span>` : ''}
        </div>

        ${champ ? `<div style="margin-top:16px;padding:14px;border-radius:12px;background:var(--surface-2);display:flex;align-items:center;gap:12px">
          ${teamCrest(champ)}<div><div class="muted" style="font-size:.78rem;font-weight:700">${t.isFinal ? '🏆 ИХ АВАРГА' : '🥇 ТЭМЦЭЭНИЙ АВАРГА'}</div>
          <div style="font-weight:800">${esc(champ.name)}</div></div>
        </div>` : ''}

        ${DB.isAdmin() ? `<a class="btn ghost sm" style="margin-top:14px" href="#/admin">✏️ Үр дүн оруулах</a>` : ''}
      </div>`;

    const entrants = DB.teamsOf(id);
    const entrantsHtml = entrants.length
      ? `<div class="grid g-4">${entrants.map(tm => {
          const c = DB.captainOf(tm.id);
          return `
          <a class="team-card" href="#/team/${esc(tm.id)}">
            ${teamCrest(tm, 'sm')}
            <div style="min-width:0"><div class="name" style="font-size:.92rem">${esc(tm.name)}</div>
            <div class="sub">${c ? '👑 ' + esc(c.name) : ''}</div></div>
          </a>`;
        }).join('')}</div>`
      : '<p class="muted">Оролцогч баг бүртгэгдээгүй.</p>';

    let body;
    if (t.isFinal) {
      const stages = ['Хагас финал', '3-р байр', 'Финал'];
      const html = stages.map(st => {
        const list = matches.filter(m => m.stage === st);
        if (!list.length) return '';
        return `<div class="bracket-stage"><h4>${esc(st)}</h4>${list.map(matchRow).join('')}</div>`;
      }).join('');
      body = html ? `<div class="bracket">${html}</div>` : '<p class="muted">Bracket хараахан үүсээгүй.</p>';
    } else {
      body = `
        ${standingsTable(DB.roundStandings(id).filter(r => r.played > 0), { championId: champ ? champ.id : null })}
        <h3 style="margin-top:26px">⚔️ Тоглолтууд</h3>
        ${matches.length ? matches.map(matchRow).join('') : '<p class="muted">Тоглолт бүртгэгдээгүй.</p>'}`;
    }

    return `
      <div class="page-head">${back}</div>
      <section class="section">${head}</section>
      <section class="section"><h2>🏟 Оролцогч багууд (${entrants.length})</h2>${entrantsHtml}</section>

      <section class="section">
        <h2>${esc(tpl.icon || '')} Тоглогчийн статистик — ${esc(tpl.name)}</h2>
        ${tournamentLeadersTable(id)}
      </section>

      <section class="section"><h2>${t.isFinal ? '🏆 Финал bracket' : '📊 Хүснэгт ба тоглолтууд'}</h2>${body}</section>`;
  }

  /* ---------- 2.9 Багууд ---------- */
  function viewTeams() {
    const year  = new Date().getFullYear();
    const stand = DB.seasonStandings(year);
    const teams = DB.state.teams;

    if (!teams.length) {
      return `<div class="page-head"><h1>🏟 Багууд</h1></div>
        <p class="muted">Баг бүртгэгдээгүй. <a href="#/admin">Админ хэсэгт</a> нэмээрэй.</p>`;
    }

    const cards = teams.map(t => {
      const st = stand.find(x => x.teamId === t.id) || {};
      const rank = stand.findIndex(x => x.teamId === t.id) + 1;
      const roster = DB.playersOf(t.id);
      const cap = DB.captainOf(t.id);
      return `
        <a class="team-card" href="#/team/${esc(t.id)}">
          ${teamCrest(t)}
          <div style="min-width:0">
            <div class="name">${esc(t.icon)} ${esc(t.name)}</div>
            <div class="sub">${rank}-р байр · ${st.pts || 0} оноо · ${st.w || 0}Х ${st.d || 0}Т ${st.l || 0}Хг · ${roster.length} тоглогч</div>
            <div class="sub">${cap ? '👑 ' + esc(cap.name) : '<span class="muted">ахлагчгүй</span>'}</div>
          </div>
        </a>`;
    }).join('');

    return `
      <div class="page-head"><h1>🏟 Багууд</h1><p>${teams.length} баг бүртгэлтэй</p></div>
      <section class="section"><div class="grid g-2">${cards}</div></section>
      <section class="section">
        <h2>📊 Оны нэгдсэн хүснэгт</h2>
        ${standingsTable(stand.filter(r => r.played > 0), { showTitles: true })}
      </section>`;
  }

  /* ---------- 2.10 Нэг баг ---------- */
  function viewTeam(id) {
    const t = DB.team(id);
    if (!t) return notFound('Баг олдсонгүй');

    const year  = new Date().getFullYear();
    const stand = DB.seasonStandings(year);
    const st    = stand.find(x => x.teamId === id) || {};
    const rank  = stand.findIndex(x => x.teamId === id) + 1;
    const roster = DB.playersOf(id);
    const matches = DB.teamMatches(id);
    const transfers = DB.teamTransfers(id);
    const cap = DB.captainOf(id);

    const header = `
      <div class="card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
        ${teamCrest(t, 'lg')}
        <div style="flex:1;min-width:180px">
          <h1 style="margin:0 0 4px">${esc(t.icon)} ${esc(t.name)}</h1>
          <div class="muted">${esc(rank)}-р байр · ${esc(year)} оны улирал</div>
          <div class="tour-meta" style="margin-top:8px">
            ${cap ? `<span class="chip gold">👑 Ахлагч: ${esc(cap.name)}</span>` : '<span class="chip">ахлагчгүй</span>'}
          </div>
        </div>
        <div style="display:flex;gap:22px;flex-wrap:wrap">
          <div><div style="font-size:1.5rem;font-weight:800">${st.pts || 0}</div><div class="muted" style="font-size:.8rem">Оноо</div></div>
          <div><div style="font-size:1.5rem;font-weight:800">${st.w || 0}</div><div class="muted" style="font-size:.8rem">Хожил</div></div>
          <div><div style="font-size:1.5rem;font-weight:800">${st.d || 0}</div><div class="muted" style="font-size:.8rem">Тэнцээ</div></div>
          <div><div style="font-size:1.5rem;font-weight:800">${st.titles || 0}🏆</div><div class="muted" style="font-size:.8rem">Титэл</div></div>
        </div>
      </div>`;

    const tplBlocks = DB.statTemplates().map(tpl => {
      const rows = [];
      roster.forEach(p => {
        const perf = DB.playerPerf(p.id);
        const g = perf.byTemplate.find(x => x.templateId === tpl.id);
        if (!g) return;
        const rs = g.rows.filter(r => r.teamId === id);
        if (!rs.length) return;
        const totals = {}; tpl.fields.forEach(f => totals[f.key] = 0);
        let mvp = 0;
        rs.forEach(r => {
          tpl.fields.forEach(f => totals[f.key] += r.values[f.key] || 0);
          if (r.mvp) mvp++;
        });
        const avg = {}; tpl.fields.forEach(f => avg[f.key] = totals[f.key] / rs.length);
        rows.push({ player: p, matches: rs.length, totals, avg, mvp, ratio: DB.ratioOf(tpl, totals) });
      });
      rows.sort((a, b) => (b.ratio == null ? -1 : b.ratio) - (a.ratio == null ? -1 : a.ratio) || b.mvp - a.mvp);
      return { tpl, rows };
    }).filter(x => x.rows.length);

    const tplHtml = tplBlocks.map(({ tpl, rows }) => `
      <section class="section">
        <h2>${esc(tpl.icon || '')} ${esc(tpl.name)} — тоглогчдын стат</h2>
        <div class="table-wrap"><table>
          <thead><tr>
            <th style="width:48px">#</th><th>Тоглогч</th><th class="num">Тогл.</th>
            ${tpl.fields.map(f => `<th class="num">${esc(f.icon || '')} нийт</th>`).join('')}
            ${tpl.fields.map(f => `<th class="num">${esc(f.icon || '')} дундаж</th>`).join('')}
            ${tpl.ratio ? `<th class="num">${esc(tpl.ratio.label)}</th>` : ''}
            <th class="num">MVP</th>
          </tr></thead>
          <tbody>${rows.map((r, i) => `
            <tr>
              <td class="rank-${i < 3 ? i + 1 : 0}">${i + 1}</td>
              <td><a href="#/player/${esc(r.player.id)}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">
                ${avatar(r.player, 'sm')}<b>${esc(r.player.name)}</b>${cap && cap.id === r.player.id ? ' <span class="chip gold">👑</span>' : ''}</a></td>
              <td class="num">${r.matches}</td>
              ${tpl.fields.map(f => `<td class="num">${r.totals[f.key] || 0}</td>`).join('')}
              ${tpl.fields.map(f => `<td class="num" style="color:var(--accent)">${fmt1(r.avg[f.key])}</td>`).join('')}
              ${tpl.ratio ? `<td class="num"><b>${r.ratio == null ? '—' : fmt2(r.ratio)}</b></td>` : ''}
              <td class="num">${r.mvp}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </section>`).join('');

    const rosterHtml = roster.length ? roster.map(p => `
      <a class="player-card" href="#/player/${esc(p.id)}">
        ${avatar(p)}
        <div style="min-width:0">
          <div class="name">${esc(p.name)}${cap && cap.id === p.id ? ' <span class="chip gold">👑 ахлагч</span>' : ''}</div>
          <div class="sub">${esc(p.nick || '')} · ${esc(p.joined ? fmtDate(p.joined) + '-д нэгдсэн' : '')}</div>
        </div>
      </a>`).join('') : '<p class="muted">Тоглогч байхгүй.</p>';

    const matchesHtml = matches.length ? matches.map(m => `
      <div class="match-row">
        <div class="side ${m.result === 'win' ? 'win' : ''}">${teamCrest(t, 'sm')}<span class="nm">${esc(t.name)}</span></div>
        <div class="score">${m.my} : ${m.op}</div>
        <div class="side right">${teamCrest(m.opponent, 'sm')}<span class="nm">${esc(m.opponent ? m.opponent.name : '—')}</span></div>
      </div>
      <div class="muted" style="font-size:.78rem;margin:-4px 0 14px 4px">
        <b style="color:${resultColor(m.result)}">${resultLabel(m.result)}</b> ·
        ${esc(m.tournament ? m.tournament.title : '')} · ${esc(fmtDate(m.date))}
      </div>`).join('') : '<p class="muted">Тоглолтын түүх алга.</p>';

    const trHtml = transfers.length ? transfers.map(tr => {
      const p = DB.player(tr.playerId);
      const from = DB.team(tr.fromTeamId), to = DB.team(tr.toTeamId);
      const incoming = tr.toTeamId === id;
      return `
        <div class="tr-row">
          ${avatar(p, 'sm')}
          <b>${esc(p ? p.name : '—')}</b>
          <span style="color:${incoming ? 'var(--accent-2)' : 'var(--danger)'}">${incoming ? '➜ ирсэн' : '⬅ явсан'}</span>
          <span class="muted">${esc(from ? from.name : 'чөлөөт')} → ${esc(to ? to.name : 'чөлөөт')}</span>
          <span class="muted" style="margin-left:auto;font-size:.8rem">${esc(fmtDate(tr.date))}</span>
        </div>`;
    }).join('') : '<p class="muted">Шилжилт байхгүй.</p>';

    return `
      <div class="page-head"><a href="#/teams" style="text-decoration:none">← Бүх баг</a></div>
      <section class="section">${header}</section>
      ${tplHtml}
      <section class="section"><h2>👥 Бүрэлдэхүүн (${roster.length})</h2><div class="grid g-2">${rosterHtml}</div></section>
      <section class="section"><h2>⚔️ Тоглолтын түүх</h2>${matchesHtml}</section>
      <section class="section"><h2>🔄 Шилжилтүүд</h2>${trHtml}</section>`;
  }

  /* ---------- 2.11 Тоглогчид ---------- */
  function viewPlayers() {
    const players = DB.state.players;
    if (!players.length) {
      return `<div class="page-head"><h1>👤 Тоглогчид</h1></div>
        <p class="muted">Тоглогч бүртгэгдээгүй. <a href="#/admin">Админ хэсэгт</a> нэмээрэй.</p>`;
    }

    const me = DB.currentUser();
    const mePid = me && me.playerId ? me.playerId : null;
    const meP   = mePid ? DB.player(mePid) : null;
    const tpls  = DB.statTemplates();

    const rows = players.map(p => {
      const perf = DB.playerPerf(p.id);
      return {
        player: p,
        team: DB.team(p.teamId),
        perf,
        mvp: perf.byTemplate.reduce((s, g) => s + g.mvp, 0),
        matches: perf.matchCount,
        top: perf.byTemplate[0] || null
      };
    });

    const val = x => {
      switch (playerSort) {
        case 'mvp':     return x.mvp;
        case 'matches': return x.matches;
        case 'ratio':   return x.top && x.top.ratio != null ? x.top.ratio : -1;
        case 'primary': {
          if (!x.top) return -1;
          const f = x.top.template.fields[0];
          return f ? (x.top.totals[f.key] || 0) : -1;
        }
        default: return 0;
      }
    };

    const sorted = rows.slice().sort((a, b) => {
      if (playerSort === 'name') return a.player.name.localeCompare(b.player.name);
      return val(b) - val(a) || a.player.name.localeCompare(b.player.name);
    });

    const card = (x, rank) => {
      const p = x.player;
      const isMe = mePid === p.id;
      const capT = DB.captainTeam(p.id);
      return `
        <a class="player-card pcard ${isMe ? 'me' : ''}"
           href="#/player/${esc(p.id)}"
           data-pcard
           data-pname="${esc((p.name + ' ' + (p.nick || '')).toLowerCase())}"
           data-pteam="${esc(p.teamId || '')}">
          ${rank != null ? `<span class="pcard-rank rank-${rank < 3 ? rank + 1 : 0}">${rank + 1}</span>` : ''}
          ${avatar(p)}
          <div style="min-width:0;flex:1">
            <div class="name">
              ${esc(p.name)}
              ${isMe ? '<span class="chip ok">чи</span>' : ''}
              ${capT ? '<span class="chip gold">👑</span>' : ''}
              ${DB.accountOf(p.id) ? '<span class="chip">🔑</span>' : ''}
            </div>
            <div class="sub pmini-wrap">
              ${x.team ? esc(x.team.icon + ' ' + x.team.name) + ' · ' : ''}${playerMiniStats(x.perf)}
            </div>
          </div>
          ${teamCrest(x.team, 'sm')}
        </a>`;
    };

    const toolbar = `
      <div class="filter-bar">
        <div class="field" style="margin:0;flex:1;min-width:200px">
          <label>🔍 Хайх (нэр / хоч)</label>
          <input type="search" data-action="player-q" value="${esc(playerQ)}"
                 placeholder="ж: Бат" autocomplete="off" />
        </div>
        <div class="field" style="margin:0">
          <label>Баг</label>
          <select data-action="player-team">
            <option value="all" ${playerTeam === 'all' ? 'selected' : ''}>Бүх баг (${DB.state.teams.length})</option>
            ${DB.state.teams.map(t => `<option value="${esc(t.id)}" ${playerTeam === t.id ? 'selected' : ''}>${esc(t.icon)} ${esc(t.name)}</option>`).join('')}
            <option value="__free" ${playerTeam === '__free' ? 'selected' : ''}>🆓 Чөлөөт</option>
          </select>
        </div>
        <div class="field" style="margin:0">
          <label>Эрэмбэлэх</label>
          <select data-action="player-sort">
            <option value="team"    ${playerSort === 'team'    ? 'selected' : ''}>Багаар бүлэглэх</option>
            <option value="ratio"   ${playerSort === 'ratio'   ? 'selected' : ''}>Үзүүлэлт (KDA / PIR)</option>
            <option value="primary" ${playerSort === 'primary' ? 'selected' : ''}>Гол үзүүлэлт</option>
            <option value="mvp"     ${playerSort === 'mvp'     ? 'selected' : ''}>MVP</option>
            <option value="matches" ${playerSort === 'matches' ? 'selected' : ''}>Тоглолтын тоо</option>
            <option value="name"    ${playerSort === 'name'    ? 'selected' : ''}>Нэр (A→Z)</option>
          </select>
        </div>
      </div>`;

    let body;
    if (playerSort === 'team') {
      const groups = DB.state.teams.map(t => ({
        team: t,
        list: rows.filter(x => x.player.teamId === t.id)
                  .sort((a, b) => a.player.name.localeCompare(b.player.name))
      }));
      const free = rows.filter(x => !x.player.teamId)
                       .sort((a, b) => a.player.name.localeCompare(b.player.name));
      if (free.length) groups.push({ team: null, list: free });

      body = groups.filter(g => g.list.length).map(g => {
        const cap = g.team ? DB.captainOf(g.team.id) : null;
        return `
        <div data-pgroup>
          <h3 style="margin-top:22px">
            ${g.team ? teamCrest(g.team, 'sm') + ' ' + esc(g.team.name) : '🆓 Чөлөөт тоглогчид'}
            ${cap ? `<span class="chip gold">👑 ${esc(cap.name)}</span>` : ''}
            <span class="muted" style="font-size:.84rem;font-weight:600"> — ${g.list.length} тоглогч</span>
          </h3>
          <div class="grid g-2">${g.list.map(x => card(x, null)).join('')}</div>
        </div>`;
      }).join('');
    } else {
      body = `<div class="grid g-2" data-pgroup>${sorted.map((x, i) => card(x, i)).join('')}</div>`;
    }

    return `
      <div class="page-head">
        <h1>👤 Тоглогчид</h1>
        <p><b id="pCount">${players.length}</b> тоглогч · нэрэн дээр дараад бүрэн профайлыг харна</p>
      </div>

      <section class="section">
        <div class="tpl-tabs" style="margin-bottom:12px">
          ${tpls.map(t => `<span class="chip tpl">${esc(t.icon || '')} ${esc(t.name)}</span>`).join('')}
        </div>
      </section>

      ${meP ? `
        <div class="banner open" style="border-left-color:var(--accent)">
          <div style="display:flex;align-items:center;gap:12px">
            ${avatar(meP)}
            <div><b>Таны карт тодруулсан байна</b>
            <div class="muted" style="font-size:.85rem">«чи» тэмдэгтэй карт нь таны профайл</div></div>
          </div>
          <a class="btn sm" href="#/me">👤 Миний профайл →</a>
        </div>` : ''}

      <section class="section">${toolbar}</section>

      <section class="section">
        <div id="pEmpty" class="card" style="display:none">
          <p class="muted" style="margin:0">🔍 Тохирох тоглогч олдсонгүй. Хайлтаа өөрчилж үзээрэй.</p>
        </div>
        ${body}
      </section>`;
  }

  /* ---------- 2.12 Нэг тоглогч ---------- */
  function viewPlayer(id) {
    const p = DB.player(id);
    if (!p) return notFound('Тоглогч олдсонгүй');

    const me   = DB.currentUser();
    const isMe = !!(me && me.playerId === p.id);
    const meP  = (me && me.playerId && !isMe) ? DB.player(me.playerId) : null;

    const st   = DB.playerStats(p.id);
    const team = st.currentTeam;
    const capTeam = DB.captainTeam(p.id);

    const meBanner = isMe ? `
      <div class="banner open" style="border-left-color:var(--accent)">
        <div><b>👤 Энэ бол таны профайл</b>
        <div class="muted" style="font-size:.85rem">Хувийн тохиргоо, нууц үг солих хэсэг #/me хуудсан дээр байна</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn sm" href="#/me">Миний профайл →</a>
          <a class="btn ghost sm" href="#/players">👥 Бүх тоглогч</a>
        </div>
      </div>` : '';

    const transfers = DB.transfersOf(id);
    const trHtml = transfers.length ? transfers.map(tr => {
      const from = DB.team(tr.fromTeamId), to = DB.team(tr.toTeamId);
      return `
        <div class="tr-row">
          <span class="muted">${esc(fmtDate(tr.date))}</span>
          <span>${esc(from ? from.icon + ' ' + from.name : '🆓 Чөлөөт')}</span>
          <b>➜</b>
          <span>${esc(to ? to.icon + ' ' + to.name : '🆓 Чөлөөт')}</span>
          ${tr.note ? `<span class="muted" style="font-size:.82rem">${esc(tr.note)}</span>` : ''}
        </div>`;
    }).join('') : '<p class="muted">Шилжилт байхгүй.</p>';

    const header = `
      <div class="card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
        ${avatar(p, 'lg')}
        <div style="flex:1;min-width:180px">
          <h1 style="margin:0 0 4px">${esc(p.name)}</h1>
          <div class="muted">${esc(p.nick || '')} · ${esc(p.joined ? fmtDate(p.joined) + '-д нэгдсэн' : '')}</div>
          <div class="tour-meta" style="margin-top:8px">
            ${capTeam ? `<span class="chip gold">👑 ${esc(capTeam.name)} ахлагч</span>` : ''}
            ${isMe ? '<span class="chip ok">👤 чи</span>' : ''}
            ${DB.accountOf(p.id) ? '<span class="chip ok">🔑 Бүртгэлтэй</span>' : ''}
            ${st.titles.length ? `<span class="chip gold">🏆 ${st.titles.length} титэл</span>` : ''}
            ${st.awards.length ? `<span class="chip gold">🏅 ${st.awards.length} шагнал</span>` : ''}
            ${st.awardsHeld.length ? `<span class="chip gold">👑 ${st.awardsHeld.length} эзэмшилд</span>` : ''}
          </div>
        </div>
        ${team ? `<a class="team-card" style="padding:10px 14px" href="#/team/${esc(team.id)}">
          ${teamCrest(team, 'sm')}
          <div><div class="name" style="font-size:.92rem">${esc(team.name)}</div>
          <div class="sub">одоогийн баг</div></div>
        </a>` : '<span class="badge tw-closed">🆓 Чөлөөт тоглогч</span>'}
      </div>`;

    const heldHtml = st.awardsHeld.length ? `
      <section class="section">
        <h2>👑 Эзэмшилд байгаа шагналууд (${st.awardsHeld.length})</h2>
        ${awardsBlock(st.awardsHeld)}
      </section>` : '';

    return `
      <div class="page-head">
        <a href="#/players" style="text-decoration:none">← Бүх тоглогч</a>
        ${isMe ? ' · <a href="#/me" style="text-decoration:none">👤 Миний профайл</a>' : ''}
      </div>

      ${meBanner}

      <section class="section">${header}</section>

      ${perfSection(p.id, '🎮 Тоглолтын статистик')}

      ${meP ? compareBlock(meP, p) : ''}

      <section class="section">
        <h2>📊 Багийн амжилт</h2>
        ${statCards(st.stats)}
      </section>

      <section class="section">
        <h2>📆 Жилээр (баг)</h2>
        ${st.years.length ? `
          <div class="table-wrap"><table>
            <thead><tr>
              <th>Он</th><th class="num">Тогл.</th><th class="num">Хож.</th>
              <th class="num">Тэнц.</th><th class="num">Хожг.</th>
              <th class="num">Оноо+</th><th class="num">Оноо−</th>
              <th class="num">Зөрүү</th><th class="num">ОНОО</th>
            </tr></thead>
            <tbody>${st.years.map(r => `
              <tr>
                <td><b>${r.year}</b></td>
                <td class="num">${r.played}</td>
                <td class="num" style="color:var(--accent-2)">${r.w}</td>
                <td class="num">${r.d}</td>
                <td class="num" style="color:var(--danger)">${r.l}</td>
                <td class="num">${r.gf}</td>
                <td class="num">${r.ga}</td>
                <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td>
                <td class="num"><b>${r.pts}</b></td>
              </tr>`).join('')}</tbody>
          </table></div>` : '<p class="muted">Тоглолт бүртгэгдээгүй.</p>'}
      </section>

      <section class="section">
        <h2>🏆 Титэлүүд (${st.titles.length})</h2>
        ${titlesBlock(st.titles)}
      </section>

      <section class="section">
        <h2>🏅 Шагналууд (${st.awards.length})</h2>
        ${awardsBlock(st.awards)}
      </section>

      ${heldHtml}

      <section class="section"><h2>🔄 Шилжилтийн түүх</h2>${trHtml}</section>
      <section class="section"><h2>⚔️ Багийн тоглолтууд</h2>${playerMatchHistory(st.matches, team, 10)}</section>

      <section class="section">
        <a class="btn ghost" href="#/players">← Бүх тоглогчийн жагсаалт</a>
      </section>`;
  }

  function notFound(msg) {
    return `<div class="page-head"><h1>😕 ${esc(msg)}</h1>
      <p><a href="#/dashboard">← Нүүр хуудас</a></p></div>`;
  }

  /* ============================================================
     3. АДМИН ХЭСЭГ
     ============================================================ */

  function viewAdmin() {
    const me = DB.currentUser();
    if (!me) return viewLogin();

    if (me.role === 'player') {
      return `
        <div class="page-head"><h1>🚫 Хандах эрхгүй</h1></div>
        <div class="card">
          <p class="muted" style="margin-top:0">Та тоглогчийн бүртгэлээр нэвтэрсэн байна. Админ хэсэгт хандах эрх байхгүй.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn" href="#/me">👤 Миний профайл</a>
            <a class="btn ghost" href="#/trade">🤝 Хэлэлцээр</a>
          </div>
        </div>`;
    }

    const tabs = [
      ['seasons',    '🗓 Улирлууд'],
      ['tournaments','🎯 Тэмцээнүүд'],
      ['teams',      '🏟 Багууд'],
      ['players',    '👤 Тоглогчид'],
      ['results',    '📝 Үр дүн & Стат'],
      ['transfers',  '🔄 Шилжилт'],
      ['awards',     '🏅 Шагнал'],
      ['templates',  '📊 Стат загвар'],
      ['settings',   '⚙️ Тохиргоо'],
      ['accounts',   '🔐 Бүртгэлүүд'],
      ['data',       '💾 Өгөгдөл']
    ];

    let body = '';
    if (adminTab === 'seasons')     body = adminSeasons();
    if (adminTab === 'tournaments') body = adminTournaments();
    if (adminTab === 'teams')       body = adminTeams();
    if (adminTab === 'players')     body = adminPlayers();
    if (adminTab === 'results')     body = adminResults();
    if (adminTab === 'transfers')   body = adminTransfers();
    if (adminTab === 'awards')      body = adminAwards();
    if (adminTab === 'templates')   body = adminTemplates();
    if (adminTab === 'settings')    body = adminSettings();
    if (adminTab === 'accounts')    body = adminAccounts();
    if (adminTab === 'data')        body = adminData();

    return `
      <div class="page-head">
        <h1>⚙️ Админ хэсэг</h1>
        <p>Улирал, тэмцээн, баг, тоглогч, үр дүн, стат загвар — бүгдийг эндээс удирдана.</p>
      </div>

      <div class="admin-bar">
        <div class="subtabs">
          ${tabs.map(([k, label]) =>
            `<button data-action="admin-tab" data-tab="${k}" class="${adminTab === k ? 'active' : ''}">${label}</button>`
          ).join('')}
        </div>
        <div class="user-chip">
          <span class="avatar" style="background:var(--accent)">${esc(initials(me.name || me.username))}</span>
          <span><b>${esc(me.name || me.username)}</b></span>
          <button class="btn ghost sm" data-action="logout">Гарах</button>
        </div>
      </div>

      <section class="section">${body}</section>`;
  }

    function viewLogin(gate) {
    return `
      <div class="login-wrap ${gate ? 'gate' : ''}">
        <form class="login-card" data-form="login" autocomplete="on">
          <span class="lock">${gate ? '🔒' : '🔐'}</span>
          <h1>${gate ? esc(DB.state.settings.title) : 'Нэвтрэх'}</h1>
          <p class="sub">${gate ? 'Үргэлжлүүлэхийн тулд нэвтэрнэ үү' : 'Тоглогч болон админ нэвтэрнэ'}</p>

          <div class="login-error" id="loginErr"></div>

          <div class="field">
            <label>Хэрэглэгчийн нэр</label>
            <input name="username" autocomplete="username" required
                   placeholder="Нэрээ оруулна уу" autocapitalize="off" spellcheck="false" />
          </div>

          <div class="field">
            <label>Нууц үг</label>
            <div class="pw-wrap">
              <input type="password" name="password" id="pwInput"
                     autocomplete="current-password" required placeholder="••••••••" />
              <button class="pw-toggle" type="button" data-action="pw-toggle">👁</button>
            </div>
          </div>

          <button class="btn" type="submit" style="width:100%">Нэвтрэх</button>
        </form>
      </div>`;
  }
  /* ---------- 3.1 Улирлууд ---------- */
  function adminSeasons() {
    const editing = editSeasonId ? DB.season(editSeasonId) : null;
    const curYear = new Date().getFullYear();
    const seasons = DB.state.seasons.slice().sort((a, b) => (b.year - a.year) || (a.round - b.round));
    const n = DB.state.settings.subPerSeason;

    return `
      <h2>🗓 Улирлууд</h2>
      <p class="muted">Жил бүр 4 улирал. Улирал бүр <b>${n} жижиг тэмцээн</b>-тэй байна.</p>

      <form class="card" data-form="season" style="margin-bottom:22px">
        ${dataLists()}
        <input type="hidden" name="id" value="${esc(editing ? editing.id : '')}" />
        <div class="form-row">
          <div class="field"><label>Он *</label>
            <input type="number" name="year" min="2020" max="2100" required
                   value="${esc(editing ? editing.year : curYear)}" /></div>
          <div class="field"><label>Улирлын дугаар *</label>
            <input type="number" name="round" min="1" max="12" required
                   value="${esc(editing ? editing.round : 1)}" /></div>
          <div class="field"><label>Нэр *</label>
            <input name="title" required placeholder="ж: 1-р улирал"
                   value="${esc(editing ? editing.title : '')}" /></div>
          <div class="field"><label>Эхлэх огноо</label>
            <input type="date" name="startDate"
                   value="${esc(editing ? editing.startDate : new Date().toISOString().slice(0, 10))}" /></div>
          <div class="field"><label>Тэмцээний хоорондын хоног</label>
            <input type="number" name="gapDays" min="1" max="60"
                   value="${esc(editing ? editing.gapDays : 7)}" /></div>
        </div>

        <div class="form-row">
          <div class="field"><label>Анхдагч газар</label>
            <input name="defPlace" list="dlPlaces" value="${esc(editing ? editing.defPlace : '')}" placeholder="ж: Голомт Талбай" /></div>
          <div class="field"><label>Анхдагч тоглоом</label>
            <input name="defGame" list="dlGames" value="${esc(editing ? editing.defGame : '')}" placeholder="ж: Mobile Legends" /></div>
          <div class="field"><label>Анхдагч төрөл</label>
            <input name="defFormat" list="dlFormats" value="${esc(editing ? editing.defFormat : 'Round Robin')}" placeholder="ж: Round Robin" /></div>
        </div>

        <div class="field"><label>Тайлбар</label>
          <input name="note" value="${esc(editing ? editing.note : '')}" placeholder="ж: 6 тэмцээний нийлбэр оноогоор аварга тодорно" /></div>

        <button class="btn" type="submit">${editing ? '💾 Шинэчлэх' : '➕ Улирал нэмэх'}</button>
        ${editing ? `<button class="btn ghost" type="button" data-action="season-cancel">Болих</button>` : ''}
      </form>

      <h2>Бүх улирал</h2>
      ${seasons.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Улирал</th><th>Он</th><th class="num">Тэмцээн</th><th>Хугацаа</th><th></th></tr></thead>
          <tbody>${seasons.map(s => {
            const list = DB.tournamentsOfSeason(s.id);
            const span = DB.seasonSpan(s.id);
            return `<tr>
              <td><b>${esc(s.title)}</b></td>
              <td class="muted">${s.year}</td>
              <td class="num">${list.length}/${n}</td>
              <td class="muted" style="font-size:.84rem">${span ? esc(fmtShort(span.start)) + ' — ' + esc(fmtShort(span.end)) : '—'}</td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn ghost sm" data-action="season-gen"  data-id="${esc(s.id)}">⚡ ${n} тэмцээн үүсгэх</button>
                <button class="btn ghost sm" data-action="season-edit" data-id="${esc(s.id)}">Засах</button>
                <button class="btn danger sm" data-action="season-del" data-id="${esc(s.id)}">Устгах</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : '<p class="muted">Улирал бүртгэгдээгүй.</p>'}`;
  }

  /* ---------- 3.2 Тэмцээнүүд ---------- */
  function adminTournaments() {
    const s = DB.state;
    const editing = editTourId ? DB.tournament(editTourId) : null;
    const curYear = new Date().getFullYear();
    const tpls = DB.statTemplates();

    if (!s.teams.length) {
      return `<div class="card"><b>Эхлээд баг үүсгэх хэрэгтэй.</b>
        <p class="muted" style="margin:8px 0 0">"🏟 Багууд" табаас дор хаяж 2 баг нэмээрэй.</p></div>`;
    }

    const allSeasons = s.seasons.slice().sort((a, b) => (b.year - a.year) || (a.round - b.round));
    const filtered = s.tournaments.filter(t => {
      if (tourFilter === 'all')   return true;
      if (tourFilter === 'final') return t.isFinal;
      return t.seasonId === tourFilter;
    }).sort((a, b) =>
      (b.year - a.year) ||
      (((DB.season(a.seasonId) || {}).round || 99) - ((DB.season(b.seasonId) || {}).round || 99)) ||
      ((a.no || 0) - (b.no || 0)));

    const editTpl = editing ? DB.templateIdOf(editing.id) : (tpls[0] ? tpls[0].id : '');

    return `
      <h2>🎯 Тэмцээнүүд</h2>
      <p class="muted">
        Тэмцээн бүрд <b>тоглоом</b> болон <b>стат загвар</b>-аа зааж өгнө.
        Загвар нь тоглоомын нэрээр автоматаар таамаглагдана.
      </p>

      <form class="card" data-form="tournament" style="margin-bottom:22px">
        ${dataLists()}
        <input type="hidden" name="id" value="${esc(editing ? editing.id : '')}" />

        <div class="form-row">
          <div class="field"><label>Төрөл *</label>
            <select name="isFinal">
              <option value="0" ${editing && !editing.isFinal ? 'selected' : ''}>Улирлын жижиг тэмцээн</option>
              <option value="1" ${editing && editing.isFinal ? 'selected' : ''}>🏆 Их тэмцээн (Финал)</option>
            </select></div>
          <div class="field"><label>Улирал</label>
            <select name="seasonId">
              <option value="">— (Их тэмцээнд шаардлагагүй) —</option>
              ${allSeasons.map(x => `<option value="${esc(x.id)}" ${editing && editing.seasonId === x.id ? 'selected' : ''}>${x.year} · ${esc(x.title)}</option>`).join('')}
            </select></div>
          <div class="field"><label>Улирал доторх дугаар</label>
            <input type="number" name="no" min="0" max="99" value="${esc(editing ? editing.no : 1)}" /></div>
          <div class="field"><label>Он *</label>
            <input type="number" name="year" min="2020" max="2100" required value="${esc(editing ? editing.year : curYear)}" /></div>
        </div>

        <div class="field"><label>Нэр *</label>
          <input name="title" required placeholder="ж: 3-р тэмцээн"
                 value="${esc(editing ? editing.title : '')}" /></div>

        <div class="form-row">
          <div class="field"><label>🎮 Тоглоом</label>
            <input name="game" list="dlGames" placeholder="ж: Mobile Legends"
                   data-action="tour-game"
                   value="${esc(editing ? editing.game : '')}" /></div>
          <div class="field"><label>📊 Стат загвар *</label>
            <select name="templateId" data-role="tour-tpl">
              ${tpls.map(t => tplOption(t, editTpl)).join('')}
            </select></div>
        </div>

        <div class="form-row">
          <div class="field"><label>📍 Газар</label>
            <input name="place" list="dlPlaces" placeholder="ж: Голомт Талбай"
                   value="${esc(editing ? editing.place : '')}" /></div>
          <div class="field"><label>🏷 Төрөл / формат</label>
            <input name="format" list="dlFormats" placeholder="ж: Round Robin"
                   value="${esc(editing ? editing.format : 'Round Robin')}" /></div>
        </div>

        <div class="form-row">
          <div class="field"><label>Огноо *</label>
            <input type="date" name="date" required value="${esc(editing ? editing.date : new Date().toISOString().slice(0, 10))}" /></div>
          <div class="field"><label>Цаг</label>
            <input type="time" name="time" value="${esc(editing ? (editing.time || '18:00') : '18:00')}" /></div>
          <div class="field"><label>Төлөв</label>
            <select name="status">
              ${[['upcoming','Удахгүй'],['ongoing','Явагдаж байна'],['done','Дууссан']]
                .map(([v, l]) => `<option value="${v}" ${editing && editing.status === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select></div>
        </div>

        <div class="field"><label>Тайлбар</label>
          <input name="note" value="${esc(editing ? editing.note : '')}" placeholder="ж: Бүх баг хоорондоо нэг удаа" /></div>

        <div class="field">
          <label>Оролцогч багууд <span class="muted">(их тэмцээнд хоосон орхивол автоматаар шалгарина)</span></label>
          <div class="check-list">
            ${s.teams.map(t => `
              <label>${teamCrest(t, 'xs')}
                <input type="checkbox" name="entrants" value="${esc(t.id)}"
                  ${editing && (editing.entrants || []).includes(t.id) ? 'checked' : ''} />
                ${esc(t.name)}</label>`).join('')}
          </div>
        </div>

        <button class="btn" type="submit">${editing ? '💾 Шинэчлэх' : '➕ Тэмцээн үүсгэх'}</button>
        ${editing ? `<button class="btn ghost" type="button" data-action="tour-cancel">Болих</button>` : ''}
      </form>

      <div class="field" style="max-width:420px">
        <label>Шүүх</label>
        <select data-action="tour-filter">
          <option value="all" ${tourFilter === 'all' ? 'selected' : ''}>Бүх тэмцээн (${s.tournaments.length})</option>
          <option value="final" ${tourFilter === 'final' ? 'selected' : ''}>🏆 Их тэмцээн</option>
          ${allSeasons.map(x => `<option value="${esc(x.id)}" ${tourFilter === x.id ? 'selected' : ''}>${x.year} · ${esc(x.title)}</option>`).join('')}
        </select>
      </div>

      <div style="margin-top:18px">
        ${filtered.length ? `
          <div class="table-wrap"><table>
            <thead><tr><th>№</th><th>Тэмцээн</th><th>Улирал</th><th>Огноо</th><th>Тоглоом</th><th>Стат загвар</th><th class="num">Стат</th><th>Төлөв</th><th></th></tr></thead>
            <tbody>${filtered.map(t => {
              const se = t.seasonId ? DB.season(t.seasonId) : null;
              const tpl = DB.templateOf(t.id);
              const perfN = DB.matchesOf(t.id).reduce((n, m) => n + ((m.perfs || []).length), 0);
              return `<tr>
                <td>${t.isFinal ? '🏆' : esc(t.no)}</td>
                <td><b>${esc(t.title)}</b></td>
                <td class="muted">${se ? esc(se.title) : '—'}</td>
                <td>${esc(fmtShort(t.date))} ${esc(t.time || '')}</td>
                <td class="muted">${esc(t.game || '—')}</td>
                <td>${tplChip(tpl)}</td>
                <td class="num">${perfN ? `<span class="chip ok">${perfN}</span>` : '<span class="muted">—</span>'}</td>
                <td>${statusBadge(t.status)}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn ghost sm" data-action="tour-edit" data-id="${esc(t.id)}">Засах</button>
                  <button class="btn danger sm" data-action="tour-del" data-id="${esc(t.id)}">Устгах</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>` : '<p class="muted">Тэмцээн байхгүй.</p>'}
      </div>`;
  }

  /* ---------- 3.3 Багууд (ахлагч товлох) ---------- */
  function adminTeams() {
    const teams = DB.state.teams;
    const editing = editTeamId ? DB.team(editTeamId) : null;
    const COLORS = ['#f59e0b','#ef4444','#3b82f6','#22c55e','#8b5cf6','#ec4899','#06b6d4','#64748b'];

    return `
      <h2>🏟 Багууд</h2>
      <p class="muted">
        Тоглогчид багт харьяалагдана. <b>👑 Ахлагч</b> нь тухайн багийг төлөөлж
        бусдын багтай тоглогч/шагнал солилцох эрхтэй.
      </p>

      <form class="card" data-form="team" style="margin-bottom:22px">
        <input type="hidden" name="id" value="${esc(editing ? editing.id : '')}" />
        <div class="form-row">
          <div class="field"><label>Багийн нэр *</label>
            <input name="name" value="${esc(editing ? editing.name : '')}" placeholder="ж: Алтан Арслан" required /></div>
          <div class="field"><label>Сүлд (emoji)</label>
            <input name="icon" value="${esc(editing ? editing.icon : '🛡')}" maxlength="4" /></div>
          <div class="field"><label>Өнгө</label>
            <select name="color">
              ${COLORS.map(c => `<option value="${c}" ${editing && editing.color === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select></div>
        </div>
        <button class="btn" type="submit">${editing ? '💾 Шинэчлэх' : '➕ Баг нэмэх'}</button>
        ${editing ? `<button class="btn ghost" type="button" data-action="team-cancel">Болих</button>` : ''}
      </form>

      ${teams.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Баг</th><th>👑 Ахлагч</th><th class="num">Тоглогч</th><th class="num">Шилжилт</th><th></th></tr></thead>
          <tbody>${teams.map(t => {
            const n = DB.playersOf(t.id).length;
            const tr = DB.teamTransfers(t.id).length;
            const roster = DB.playersOf(t.id);
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:10px">${teamCrest(t, 'sm')}<b>${esc(t.name)}</b></div></td>
              <td>
                <select data-action="team-captain" data-id="${esc(t.id)}" style="max-width:190px">
                  <option value="">— Ахлагчгүй —</option>
                  ${roster.map(p => `<option value="${esc(p.id)}" ${t.captainId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
                </select>
              </td>
              <td class="num">${n}</td>
              <td class="num">${tr}</td>
              <td style="text-align:right">
                <button class="btn ghost sm" data-action="team-edit" data-id="${esc(t.id)}">Засах</button>
                <button class="btn danger sm" data-action="team-del" data-id="${esc(t.id)}">Устгах</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : '<p class="muted">Баг бүртгэгдээгүй.</p>'}`;
  }

  /* ---------- 3.4 Тоглогчид ---------- */
  function adminPlayers() {
    const players = DB.state.players;
    const teams = DB.state.teams;
    const editing = editPlayerId ? DB.player(editPlayerId) : null;
    const PALETTE = ['#2563eb','#7c3aed','#db2777','#ea580c','#059669','#0891b2','#ca8a04','#dc2626'];
    const editingAcc = editing ? DB.accountOf(editing.id) : null;

    return `
      <h2>👤 Тоглогчид</h2>
      <p class="muted">Тоглогч бүрд <b>нэвтрэх бүртгэл</b> үүсгэж өгвөл тэр өөрөө нэвтэрч хувийн статистик, шагналаа харна.</p>

      <form class="card" data-form="player" style="margin-bottom:22px">
        <input type="hidden" name="id" value="${esc(editing ? editing.id : '')}" />
        <div class="form-row">
          <div class="field"><label>Нэр *</label>
            <input name="name" value="${esc(editing ? editing.name : '')}" placeholder="ж: Бат-Эрдэнэ" required /></div>
          <div class="field"><label>Хоч</label>
            <input name="nick" value="${esc(editing ? editing.nick : '')}" placeholder="ж: Bat" /></div>
          <div class="field"><label>Баг</label>
            <select name="teamId">
              <option value="">— Чөлөөт —</option>
              ${teams.map(t => teamOption(t, editing ? editing.teamId : '')).join('')}
            </select></div>
          <div class="field"><label>Өнгө</label>
            <select name="color">
              ${PALETTE.map(c => `<option value="${c}" ${editing && editing.color === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select></div>
          <div class="field"><label>Нэгдсэн огноо</label>
            <input type="date" name="joined" value="${esc(editing ? editing.joined : new Date().toISOString().slice(0, 10))}" /></div>
        </div>

        ${!editingAcc ? `
          <div class="form-row">
            <div class="field"><label>🔑 Нэвтрэх нэр <span class="muted">(сонголтоор)</span></label>
              <input name="accUser" placeholder="ж: bat" autocapitalize="off" spellcheck="false" /></div>
            <div class="field"><label>🔑 Нууц үг</label>
              <input name="accPass" placeholder="ж: bat2026" /></div>
          </div>` : `
          <p class="muted" style="font-size:.86rem">
            🔑 Бүртгэл: <code>${esc(editingAcc.username)}</code> —
            нууц үг солих бол <b>🔐 Бүртгэлүүд</b> таб руу орно уу.
          </p>`}

        <button class="btn" type="submit">${editing ? '💾 Шинэчлэх' : '➕ Нэмэх'}</button>
        ${editing ? `<button class="btn ghost" type="button" data-action="player-cancel">Болих</button>` : ''}
      </form>

      ${players.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Тоглогч</th><th>Хоч</th><th>Баг</th><th>👑</th><th class="num">Тогл.</th><th>Бүртгэл</th><th>Шагнал</th><th></th></tr></thead>
          <tbody>${players.map(p => {
            const t = DB.team(p.teamId);
            const acc = DB.accountOf(p.id);
            const aw = DB.awardsGivenTo(p.id).length;
            const held = DB.awardsOwnedBy(p.id).filter(a => a.playerId !== p.id).length;
            const pf = DB.playerPerf(p.id);
            const capT = DB.captainTeam(p.id);
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:10px">${avatar(p, 'sm')}<b>${esc(p.name)}</b></div></td>
              <td class="muted">${esc(p.nick || '—')}</td>
              <td>${t ? teamCrest(t, 'xs') + ' ' + esc(t.name) : '<span class="muted">Чөлөөт</span>'}</td>
              <td>${capT ? '<span class="chip gold">👑</span>' : ''}</td>
              <td class="num">${pf.matchCount}</td>
              <td>${acc ? `<span class="chip ok">🔑 ${esc(acc.username)}</span>`
                       : `<button class="btn ghost sm" data-action="player-acc" data-id="${esc(p.id)}">🔑 Бүртгэл үүсгэх</button>`}</td>
              <td class="muted">${aw ? aw + ' 🏅' : '—'}${held ? ` <span class="chip gold">👑${held}</span>` : ''}</td>
              <td style="text-align:right;white-space:nowrap">
                ${acc ? `<button class="btn ghost sm" data-action="user-pass" data-id="${esc(acc.id)}">🔑 Код</button>` : ''}
                <button class="btn ghost sm" data-action="player-edit" data-id="${esc(p.id)}">Засах</button>
                <button class="btn danger sm" data-action="player-del" data-id="${esc(p.id)}">Устгах</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : '<p class="muted">Тоглогч бүртгэгдээгүй.</p>'}`;
  }

  /* ---------- 3.5 Үр дүн & Стат ---------- */
  function adminResults() {
    const s = DB.state;
    if (!s.tournaments.length) return '<p class="muted">Эхлээд улирал, тэмцээн үүсгээрэй.</p>';

    if (!resultTid || !DB.tournament(resultTid)) {
      const nxt = DB.nextTournament();
      resultTid = (nxt && nxt.id) || s.tournaments[0].id;
    }
    const cur = DB.tournament(resultTid);
    const matches = DB.matchesOf(cur.id);
    const entrants = DB.teamsOf(cur.id);
    const season = cur.seasonId ? DB.season(cur.seasonId) : null;
    const tpl = DB.templateOf(cur.id);
    const perfTotal = matches.reduce((n, m) => n + ((m.perfs || []).length), 0);

    const matchCards = matches.length ? matches.map(m => {
      const h = DB.team(m.homeTeamId), a = DB.team(m.awayTeamId);
      const winSel = m.winnerTeamId || 'auto';
      const recN = (m.perfs || []).length;
      return `
        <div class="card" style="margin-bottom:14px">
          <form data-form="match">
            <input type="hidden" name="id" value="${esc(m.id)}" />
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
              <b>${esc(m.stage || 'Тоглолт')}</b>
              <span class="muted" style="font-size:.82rem">
                ${esc(h ? h.name : '?')} vs ${esc(a ? a.name : '?')}
                ${recN ? ` · <span style="color:var(--accent-2)">📊 ${recN} бичлэг</span>` : ''}
              </span>
            </div>
            <div class="form-row">
              <div class="field"><label>${esc(h ? h.name : 'Баг A')} — оноо</label>
                <input type="number" name="homeScore" value="${esc(m.homeScore ?? '')}" min="0" /></div>
              <div class="field"><label>${esc(a ? a.name : 'Баг B')} — оноо</label>
                <input type="number" name="awayScore" value="${esc(m.awayScore ?? '')}" min="0" /></div>
              <div class="field"><label>Ялагч</label>
                <select name="winnerTeamId">
                  <option value="auto" ${winSel === 'auto' ? 'selected' : ''}>Авто (оноогоор)</option>
                  <option value="${esc(m.homeTeamId)}" ${winSel === m.homeTeamId ? 'selected' : ''}>${esc(h ? h.name : 'A')}</option>
                  <option value="${esc(m.awayTeamId)}" ${winSel === m.awayTeamId ? 'selected' : ''}>${esc(a ? a.name : 'B')}</option>
                </select></div>
              <div class="field"><label>Шат</label>
                <input name="stage" value="${esc(m.stage || '')}" placeholder="ж: Финал" /></div>
            </div>
            <button class="btn sm" type="submit">💾 Оноо хадгалах</button>
            <button class="btn danger sm" type="button" data-action="match-del" data-id="${esc(m.id)}">Устгах</button>
          </form>
          ${perfEntry(m)}
        </div>`;
    }).join('') : '<p class="muted">Матч байхгүй. Доороос үүсгээрэй.</p>';

    let genBtns = '';
    if (!cur.isFinal) {
      genBtns = `<button class="btn ghost sm" data-action="gen-roundrobin">🔁 Round Robin хуваарь үүсгэх</button>`;
    } else {
      const semis = matches.filter(m => m.stage === 'Хагас финал' && m.status === 'done');
      genBtns = `
        <button class="btn ghost sm" data-action="gen-bracket">🏆 Оны шилдгээр bracket үүсгэх</button>
        ${semis.length === 2 ? `<button class="btn ghost sm" data-action="gen-nextstage">➡️ Финал + 3-р байр үүсгэх</button>` : ''}`;
    }

    return `
      <h2>📝 Үр дүн ба тоглогчийн стат</h2>

      <div class="field" style="max-width:520px">
        <label>Тэмцээн сонгох</label>
        <select data-action="result-select">${tourSelectOptions(cur.id)}</select>
      </div>

      <div class="card" style="margin:16px 0 22px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
          <div>
            <b>${cur.isFinal ? '🏆 ' : ''}${esc(cur.title)}</b>
            <div class="muted" style="font-size:.84rem">
              ${season ? esc(season.title) + ' · ' : ''}${esc(fmtDate(cur.date))}
              ${cur.place ? ' · 📍' + esc(cur.place) : ''}
              ${cur.game ? ' · 🎮' + esc(cur.game) : ''}
            </div>
            <div class="tour-meta" style="margin-top:8px">
              ${tplChip(tpl, tpl.fields.map(f => f.label).join(' / '))}
              <span class="chip">📊 ${perfTotal} стат бичлэг · ${matches.length} тоглолт</span>
            </div>
          </div>
          ${statusBadge(cur.status)}
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 22px">${genBtns}</div>

      ${entrants.length >= 2 || matches.length ? matchCards : '<p class="muted">Эхлээд хуваарь үүсгээрэй.</p>'}

      ${entrants.length >= 2 ? `
        <h3 style="margin-top:26px">➕ Гараар матч нэмэх</h3>
        <form class="card" data-form="new-match">
          <div class="form-row">
            <div class="field"><label>Баг A</label>
              <select name="homeTeamId">${entrants.map(t => teamOption(t)).join('')}</select></div>
            <div class="field"><label>Баг B</label>
              <select name="awayTeamId">${entrants.map(t => teamOption(t, entrants[1] && entrants[1].id)).join('')}</select></div>
            <div class="field"><label>Шат</label>
              <input name="stage" value="Round Robin" /></div>
          </div>
          <button class="btn" type="submit">➕ Нэмэх</button>
        </form>` : ''}

      <h3 style="margin-top:26px">Тэмцээний төлөв</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost sm" data-action="set-status" data-id="${esc(cur.id)}" data-status="upcoming">Удахгүй</button>
        <button class="btn ghost sm" data-action="set-status" data-id="${esc(cur.id)}" data-status="ongoing">Явагдаж байна</button>
        <button class="btn sm" data-action="set-status" data-id="${esc(cur.id)}" data-status="done">✅ Дууссан гэж тэмдэглэх</button>
      </div>
      <p class="muted" style="font-size:.84rem;margin-top:8px">
        "Дууссан" болгоход оноо оруулсан матчууд хаагдаж, аварга автоматаар тодорхойлогдоно.
      </p>`;
  }

  /* ---------- 3.6 Шилжилт (админ) ---------- */
  function adminTransfers() {
    const year = new Date().getFullYear();
    const w = DB.transferWindow(year);
    const s = DB.state;
    const isOpen = DB.isTransferOpen();
    const pending = DB.tradeRequests().filter(r => r.status === 'pending');

    const winCard = w ? `
      <div class="card" style="margin-bottom:22px;border-color:${w.status === 'open' ? 'var(--accent-2)' : 'var(--line)'}">
        <h3 style="margin-top:0">🔄 ${year} оны шилжилтийн цонх</h3>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
          ${windowBadge(w)}
          <span class="muted" style="font-size:.88rem">
            ${esc(fmtDate(w.opensAt))} — ${esc(fmtDate(w.closesAt))} · 2-р улирлын сүүлийн тэмцээний дараа
          </span>
        </div>
        <p class="muted" style="font-size:.85rem;margin:0 0 12px">
          Тохиргоо: 2-р улирал дууссанаас <b>${s.settings.transferGapDays} хоногийн</b> дараа нээгдэж,
          <b>${s.settings.transferDays} хоног</b> нээлттэй байна.
          ${w.override ? `<br><span style="color:var(--warn)">⚠️ Гараар удирдаж байна (${w.override}).</span>` : ''}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost sm" data-action="tw-open">🔓 Гараар нээх</button>
          <button class="btn ghost sm" data-action="tw-close">🔒 Гараар хаах</button>
          <button class="btn ghost sm" data-action="tw-auto">♻️ Автомат (огноогоор)</button>
        </div>
      </div>` : '';

    const rosterCards = s.teams.map(t => {
      const list = DB.playersOf(t.id);
      const cap = DB.captainOf(t.id);
      return `
        <div class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            ${teamCrest(t, 'sm')}<b>${esc(t.name)}</b>
            ${cap ? `<span class="chip gold">👑 ${esc(cap.name)}</span>` : '<span class="chip">ахлагчгүй</span>'}
            <span class="muted" style="font-size:.82rem;margin-left:auto">${list.length} тоглогч</span>
          </div>
          ${list.length ? list.map(p => {
            const otherTeams = s.teams.filter(x => x.id !== t.id);
            return `
              <div class="assign-row">
                <div style="display:flex;align-items:center;gap:8px">${avatar(p, 'sm')}<b>${esc(p.name)}</b>
                  ${cap && cap.id === p.id ? '<span class="chip gold">👑</span>' : ''}</div>
                <select data-action="move-player" data-id="${esc(p.id)}">
                  <option value="">— Шилжүүлэх —</option>
                  ${otherTeams.map(x => `<option value="${esc(x.id)}">${esc(x.icon)} ${esc(x.name)}</option>`).join('')}
                  <option value="__free">🆓 Чөлөөт болгох</option>
                </select>
              </div>`;
          }).join('') : '<p class="muted" style="font-size:.86rem;margin:0">Тоглогч байхгүй.</p>'}
        </div>`;
    }).join('');

    const free = DB.freeAgents();
    const freeCard = free.length ? `
      <div class="card" style="margin-bottom:22px">
        <h3 style="margin-top:0">🆓 Чөлөөт тоглогчид</h3>
        ${free.map(p => `
          <div class="assign-row">
            <div style="display:flex;align-items:center;gap:8px">${avatar(p, 'sm')}<b>${esc(p.name)}</b></div>
            <select data-action="move-player" data-id="${esc(p.id)}">
              <option value="">— Багт авах —</option>
              ${s.teams.map(x => `<option value="${esc(x.id)}">${esc(x.icon)} ${esc(x.name)}</option>`).join('')}
            </select>
          </div>`).join('')}
      </div>` : '';

    const hist = s.transfers.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const histHtml = hist.length ? hist.slice(0, 30).map(tr => {
      const p = DB.player(tr.playerId);
      const from = DB.team(tr.fromTeamId), to = DB.team(tr.toTeamId);
      return `
        <div class="tr-row">
          ${avatar(p, 'sm')}
          <b>${esc(p ? p.name : '—')}</b>
          <span class="muted">${esc(from ? from.icon + ' ' + from.name : '🆓 Чөлөөт')}</span>
          <b style="color:var(--accent)">➜</b>
          <span>${esc(to ? to.icon + ' ' + to.name : '🆓 Чөлөөт')}</span>
          <span class="muted" style="margin-left:auto;font-size:.8rem">${esc(fmtDate(tr.date))}</span>
        </div>`;
    }).join('') : '<p class="muted">Шилжилт бүртгэгдээгүй.</p>';

    const pendingCard = `
      <div class="card" style="margin-bottom:22px;border-color:${pending.length ? 'var(--warn)' : 'var(--line)'}">
        <h3 style="margin-top:0">🤝 Хэлэлцээрийн хүсэлтүүд (${pending.length} хүлээгдэж байна)</h3>
        <p class="muted" style="font-size:.85rem;margin:0 0 12px">
          Ахлагчид хоорондоо хүсэлт илгээж байна. Бүрэн удирдлагыг <a href="#/trade">🤝 Хэлэлцээр</a> хуудсан дээр хийнэ.
        </p>
        ${pending.length ? pending.slice(0, 8).map(r => {
          const fromT = DB.team(r.fromTeamId), toT = DB.team(r.toTeamId);
          return `
            <div class="tr-row">
              <span>${esc(fromT ? fromT.icon + ' ' + fromT.name : '—')}</span>
              <b style="color:var(--accent)">⇄</b>
              <span>${esc(toT ? toT.icon + ' ' + toT.name : '—')}</span>
              <span class="muted" style="font-size:.8rem">${esc(fmtDateTime(r.createdAt))}</span>
              <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn sm" data-action="trade-accept" data-id="${esc(r.id)}">✅</button>
                <button class="btn ghost sm" data-action="trade-reject" data-id="${esc(r.id)}">❌</button>
              </span>
            </div>`;
        }).join('') : '<p class="muted" style="margin:0">Хүлээгдэж буй хүсэлт байхгүй.</p>'}
      </div>`;

    return `
      <h2>🔄 Шилжилт ба хэлэлцээр</h2>
      ${winCard}
      ${pendingCard}

      ${!isOpen ? `<div class="banner closed" style="margin-bottom:20px">
        <div><b>⚠️ Шилжилтийн цонх хаалттай байна</b>
        <div class="muted" style="font-size:.85rem">Цонх нээлттэй үед л хэлэлцээр хийнэ. Админ гараар нээж болно.</div></div>
      </div>` : ''}

      <h3>Багуудын бүрэлдэхүүн <span class="muted" style="font-size:.85rem">(админ шууд шилжүүлэх)</span></h3>
      <div class="grid g-2" style="margin-bottom:22px">${rosterCards}</div>

      ${freeCard}

      <h3>Шилжилтийн түүх</h3>
      ${histHtml}`;
  }

  /* ---------- 3.7 Шагнал ---------- */
  function adminAwards() {
    const s = DB.state;
    const editing = editAwardId ? DB.award(editAwardId) : null;
    const ICONS = ['🏅','🥇','🥈','🥉','⭐','🔥','👑','🎯','💪','🚀'];

    if (!s.players.length) {
      return `<div class="card"><b>Эхлээд тоглогч нэмэх хэрэгтэй.</b>
        <p class="muted" style="margin:8px 0 0">"👤 Тоглогчид" табаас тоглогч нэмээрэй.</p></div>`;
    }

    const list = DB.allAwards();

    return `
      <h2>🏅 Шагналууд</h2>
      <p class="muted">
        Шагнал нь <b>хүлээн авсан тоглогч</b> (playerId) болон <b>одоогийн эзэмшигч</b> (ownerId) гэсэн хоёр талбартай.
        Ахлагчид хэлэлцээрээр эзэмшигчийг сольж болно.
      </p>

      <form class="card" data-form="award" style="margin-bottom:22px">
        <input type="hidden" name="id" value="${esc(editing ? editing.id : '')}" />
        <div class="form-row">
          <div class="field"><label>Тоглогч (хүлээн авагч) *</label>
            <select name="playerId" required>
              ${s.players.map(p => playerOption(p, editing ? editing.playerId : '')).join('')}
            </select></div>
          <div class="field"><label>Шагналын нэр *</label>
            <input name="title" required placeholder="ж: 1-р улирлын MVP"
                   value="${esc(editing ? editing.title : '')}" /></div>
          <div class="field"><label>Дүрс</label>
            <select name="icon">
              ${ICONS.map(i => `<option value="${i}" ${editing && editing.icon === i ? 'selected' : ''}>${i}</option>`).join('')}
            </select></div>
          <div class="field"><label>Огноо</label>
            <input type="date" name="date"
                   value="${esc(editing ? editing.date : new Date().toISOString().slice(0, 10))}" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>👑 Одоогийн эзэмшигч <span class="muted">(хоосон = хүлээн авагч)</span></label>
            <select name="ownerId">
              <option value="">— хүлээн авагч —</option>
              ${s.players.map(p => `<option value="${esc(p.id)}" ${editing && editing.ownerId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
            </select></div>
          <div class="field"><label>Тайлбар</label>
            <input name="note" value="${esc(editing ? editing.note : '')}" placeholder="ж: Хамгийн олон оноо авсан" /></div>
        </div>

        <button class="btn" type="submit">${editing ? '💾 Шинэчлэх' : '➕ Шагнал нэмэх'}</button>
        ${editing ? `<button class="btn ghost" type="button" data-action="award-cancel">Болих</button>` : ''}
      </form>

      <h2>Олгосон шагналууд (${list.length})</h2>
      ${list.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Дүрс</th><th>Шагнал</th><th>Хүлээн авагч</th><th>👑 Эзэмшигч</th><th>Огноо</th><th></th></tr></thead>
          <tbody>${list.map(a => {
            const p = DB.player(a.playerId);
            const owner = DB.awardOwner(a);
            const traded = a.ownerId && a.playerId && a.ownerId !== a.playerId;
            return `<tr>
              <td style="font-size:1.2rem">${esc(a.icon || '🏅')}</td>
              <td><b>${esc(a.title)}</b>${a.note ? `<div class="muted" style="font-size:.8rem">${esc(a.note)}</div>` : ''}</td>
              <td>${p ? `<div style="display:flex;align-items:center;gap:8px">${avatar(p, 'sm')}<span>${esc(p.name)}</span></div>` : '<span class="muted">—</span>'}</td>
              <td>${owner ? `<span class="chip ${traded ? 'gold' : ''}">${esc(owner.name)}</span>` : '<span class="muted">—</span>'}</td>
              <td class="muted">${esc(fmtShort(a.date))}</td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn ghost sm" data-action="award-edit" data-id="${esc(a.id)}">Засах</button>
                <button class="btn danger sm" data-action="award-del" data-id="${esc(a.id)}">Устгах</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : '<p class="muted">Шагнал бүртгэгдээгүй.</p>'}`;
  }

  /* ---------- 3.8 Стат загвар ---------- */
  function tplRowHtml(f) {
    return `
      <div class="tpl-row" data-tpl-row>
        <input class="tf-key"   data-tf="key"   value="${esc(f ? f.key : '')}"   placeholder="key" />
        <input class="tf-label" data-tf="label" value="${esc(f ? f.label : '')}" placeholder="Нэр" />
        <input class="tf-icon"  data-tf="icon"  value="${esc(f ? f.icon : '')}"  placeholder="🏅" maxlength="4" />
        <label class="tf-lower"><input type="checkbox" data-tf="lower" ${f && f.lower ? 'checked' : ''} /> доогуур</label>
        <button class="btn danger sm" type="button" data-action="tpl-row-del">✖</button>
      </div>`;
  }

  function tplCardHtml(tpl) {
    const used = DB.state.tournaments.filter(t => DB.templateIdOf(t.id) === tpl.id).length;
    return `
      <div class="card tpl-card" data-tpl-card data-tpl-id="${esc(tpl.id)}">
        <div class="tpl-head">
          <input class="tpl-icon" value="${esc(tpl.icon || '')}" maxlength="4" placeholder="🏅" />
          <input class="tpl-name" value="${esc(tpl.name)}" placeholder="Загварын нэр" />
          <span class="chip ${used ? 'ok' : ''}">${used} тэмцээн</span>
          <button class="btn danger sm" type="button" data-action="tpl-del" data-id="${esc(tpl.id)}">🗑 Загвар устгах</button>
        </div>

        <div class="tpl-fields">
          <div class="tpl-row-head">
            <span>key</span><span>Нэр</span><span>Дүрс</span><span></span><span></span>
          </div>
          ${tpl.fields.map(tplRowHtml).join('')}
        </div>
        <button class="btn ghost sm" type="button" data-action="tpl-row-add">➕ Талбар нэмэх</button>

        <div class="tpl-ratio">
          <h4>Үзүүлэлт (KDA / PIR / G+A)</h4>
          <div class="form-row">
            <div class="field"><label>Нэр</label>
              <input class="tpl-ratio-label" value="${esc(tpl.ratio ? tpl.ratio.label : '')}" placeholder="ж: KDA" /></div>
            <div class="field"><label>Хүртэх талбарууд (таслалаар)</label>
              <input class="tpl-ratio-num" value="${esc(tpl.ratio ? tpl.ratio.num.join(', ') : '')}" placeholder="ж: kills, assists" /></div>
            <div class="field"><label>Хуваах талбар (сонголтоор)</label>
              <input class="tpl-ratio-den" value="${esc(tpl.ratio && tpl.ratio.den ? tpl.ratio.den : '')}" placeholder="ж: deaths" /></div>
          </div>
        </div>
      </div>`;
  }

  function adminTemplates() {
    const tpls = DB.statTemplates();

    return `
      <h2>📊 Стат загвар</h2>
      <p class="muted">
        Тоглоом бүр өөрийн гэсэн <b>стат загвар</b>-тай байна. Тэмцээн бүрд <b>🎯 Тэмцээнүүд</b> таб дээр загвараа зааж өгнө.
      </p>

      <form data-form="templates">
        ${tpls.map(tplCardHtml).join('')}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 26px">
          <button class="btn ghost" type="button" data-action="tpl-add">➕ Шинэ загвар нэмэх</button>
          <button class="btn" type="submit">💾 Бүх загварыг хадгалах</button>
        </div>
      </form>

      <div class="card" style="border-color:var(--warn)">
        <h3 style="margin-top:0">⚠️ Анхаарах</h3>
        <ul class="muted" style="font-size:.87rem;margin:0;padding-left:20px">
          <li><b>key</b> — латин үсгээр, хоосон зайгүй. Дараа нь солихгүй байхыг хичээ.</li>
          <li>Загвар устгавал түүнийг ашиглаж байсан тэмцээнүүд <b>эхний загвар</b> руу шилжинэ.</li>
          <li>Тоглолт бүрт бичигдсэн стат нь <b>тухайн үеийн загвараа</b> санаж үлддэг тул хуучин түүх зөв хадгалагдана.</li>
        </ul>
      </div>`;
  }

  /* ---------- 3.9 Тохиргоо ---------- */
  function adminSettings() {
    const s = DB.state.settings;
    return `
      <h2>⚙️ Тохиргоо</h2>
      <p class="muted">Эдгээр утгууд нь оноо бодох, шилжилтийн цонх, улирлын бүтцэд шууд нөлөөлнө.</p>

      <form class="card" data-form="settings" style="max-width:760px">
        <div class="field"><label>Тэмцээний нэр</label>
          <input name="title" value="${esc(s.title)}" required /></div>

        <div class="form-row">
          <div class="field"><label>Хожил — оноо</label>
            <input type="number" name="winPoints" min="0" max="10" value="${esc(s.winPoints)}" /></div>
          <div class="field"><label>Тэнцээ — оноо</label>
            <input type="number" name="drawPoints" min="0" max="10" value="${esc(s.drawPoints)}" /></div>
          <div class="field"><label>Хожигдол — оноо</label>
            <input type="number" name="lossPoints" min="0" max="10" value="${esc(s.lossPoints)}" /></div>
        </div>

        <div class="form-row">
          <div class="field"><label>Нэг улиралд хэдэн тэмцээн</label>
            <input type="number" name="subPerSeason" min="1" max="20" value="${esc(s.subPerSeason)}" /></div>
          <div class="field"><label>Их тэмцээнд хэдэн баг</label>
            <input type="number" name="finalQualifiers" min="2" max="16" value="${esc(s.finalQualifiers)}" /></div>
        </div>

        <div class="form-row">
          <div class="field"><label>Шилжилт: улирлын дараа (хоног)</label>
            <input type="number" name="transferGapDays" min="0" max="90" value="${esc(s.transferGapDays)}" /></div>
          <div class="field"><label>Шилжилт: нээлттэй (хоног)</label>
            <input type="number" name="transferDays" min="1" max="90" value="${esc(s.transferDays)}" /></div>
        </div>

        <label class="remember" style="margin:14px 0 18px">
          <input type="checkbox" name="loginRequired"
                 ${s.loginRequired !== false ? 'checked' : ''} />
          🔒 Бүх сайтад нэвтрэх шаардлагатай (зочинд юу ч харагдахгүй)
        </label>

        <button class="btn" type="submit">💾 Хадгалах</button>
      </form>`;
  }

  /* ---------- 3.10 Бүртгэлүүд ---------- */
  function adminAccounts() {
    const me = DB.currentUser();
    const users = DB.state.settings.users || [];

    const rows = users.map(u => {
      const isPlayer = (u.role || 'admin') === 'player';
      const p = u.playerId ? DB.player(u.playerId) : null;
      const capT = p ? DB.captainTeam(p.id) : null;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              ${p ? avatar(p, 'sm')
                  : `<span class="avatar" style="width:28px;height:28px;font-size:.7rem;background:var(--accent)">${esc(initials(u.name || u.username))}</span>`}
              <b>${esc(u.name || u.username)}</b>
              ${u.id === me.id ? '<span class="badge ongoing">чи</span>' : ''}
            </div>
          </td>
          <td><code>${esc(u.username)}</code></td>
          <td>${isPlayer
                ? `<span class="chip">👤 Тоглогч${p ? ': ' + esc(p.name) : ''}</span>${capT ? ` <span class="chip gold">👑 ${esc(capT.name)}</span>` : ''}`
                : '<span class="chip gold">⚙️ Админ</span>'}</td>
          <td><div class="pw-cell">
            <code data-pw="${esc(u.password)}">••••••</code>
            <button data-action="pw-show">👁</button>
          </div></td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn ghost sm" data-action="user-rename" data-id="${esc(u.id)}">Засах</button>
            <button class="btn ghost sm" data-action="user-pass"   data-id="${esc(u.id)}">Код солих</button>
            ${u.id !== me.id ? `<button class="btn danger sm" data-action="user-del" data-id="${esc(u.id)}">Устгах</button>` : ''}
          </td>
        </tr>`;
    }).join('');

    return `
      <h2>🔐 Бүртгэлүүд</h2>
      <p class="muted">Админ ба тоглогчийн бүртгэлүүд. Тоглогчийн бүртгэлийг "👤 Тоглогчид" табаас үүсгэнэ.</p>

      <form class="card" data-form="user" style="margin-bottom:22px" autocomplete="off">
        <h3 style="margin-top:0">➕ Шинэ админ</h3>
        <div class="form-row">
          <div class="field"><label>Хэрэглэгчийн нэр *</label>
            <input name="username" placeholder="ж: bat" required autocapitalize="off" spellcheck="false" /></div>
          <div class="field"><label>Нууц үг *</label>
            <input name="password" type="text" placeholder="ж: bat2026" required /></div>
          <div class="field"><label>Дэлгэцийн нэр</label>
            <input name="name" placeholder="ж: Бат-Эрдэнэ" /></div>
        </div>
        <button class="btn" type="submit">Нэмэх</button>
      </form>

      <div class="table-wrap"><table>
        <thead><tr><th>Хүн</th><th>Нэвтрэх нэр</th><th>Эрх</th><th>Нууц үг</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>

      <div class="card" style="margin-top:22px;border-color:var(--warn)">
        <h3 style="margin-top:0">⚠️ Аюулгүй байдлын зөвлөмж</h3>
        <p class="muted" style="font-size:.87rem;margin:0">
          Нууц үг хөтөч дотор <b>энгийн текстээр</b> хадгалагдана — <b>чухал нууц үг бүү хэрэглэ</b>.
        </p>
      </div>`;
  }

  /* ---------- 3.11 Өгөгдөл ---------- */
  function adminData() {
    const s = DB.state;
    const perfN = s.matches.reduce((n, m) => n + ((m.perfs || []).length), 0);
    const tradeN = (s.tradeRequests || []).length;

    return `
      <h2>💾 Өгөгдөл</h2>
      <p class="muted">Бүх мэдээлэл зөвхөн <b>энэ хөтөч дотор</b> хадгалагдана.
      <br><span style="font-size:.84rem">💡 Бүртгэлүүд (нэр + нууц үг) JSON дотор багтсан тул файлаа хэнд ч бүү илгээ.</span></p>

      <div class="grid g-3" style="margin-bottom:16px">
        <div class="stat"><div class="num">${s.teams.length}</div><div class="lbl">Баг</div></div>
        <div class="stat"><div class="num">${s.players.length}</div><div class="lbl">Тоглогч</div></div>
        <div class="stat"><div class="num">${s.seasons.length}</div><div class="lbl">Улирал</div></div>
        <div class="stat"><div class="num">${s.tournaments.length}</div><div class="lbl">Тэмцээн</div></div>
        <div class="stat"><div class="num">${s.matches.length}</div><div class="lbl">Тоглолт</div></div>
        <div class="stat"><div class="num">${perfN}</div><div class="lbl">Стат бичлэг</div></div>
        <div class="stat"><div class="num">${s.awards.length}</div><div class="lbl">Шагнал</div></div>
        <div class="stat"><div class="num">${tradeN}</div><div class="lbl">Хэлэлцээр</div></div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-top:0">📤 Нөөцлөх</h3>
        <button class="btn" data-action="export">JSON татаж авах</button>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-top:0">📥 Сэргээх</h3>
        <input type="file" accept=".json,application/json" data-action="import" />
      </div>

      <div class="card" style="border-color:var(--danger)">
        <h3 style="margin-top:0">⚠️ Аюултай үйлдэл</h3>
        <p class="muted" style="font-size:.88rem">Бүх өгөгдлийг устгана. Бүртгэлүүд хадгалагдана.</p>
        <button class="btn danger" data-action="reset-empty">Бүгдийг устгах</button>
        <button class="btn danger" data-action="reset-demo">Демо өгөгдөлд буцаах</button>
      </div>`;
  }

  /* ============================================================
     4. ROUTER
     ============================================================ */

  function parseHash() {
    const h = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const [view, id] = h.split('/');
    return { view: view || 'dashboard', id: id || null };
  }

  function renderUserChip() {
    const box = document.getElementById('userChip');
    if (!box) return;
    const me = DB.currentUser();
    if (!me) { box.innerHTML = ''; return; }

    const p = me.playerId ? DB.player(me.playerId) : null;
    const label = me.name || me.username;
    const href  = me.role === 'player' ? '#/me' : '#/admin';

    box.innerHTML = `
      <a class="user-chip" href="${href}" style="text-decoration:none" title="${esc(href)}">
        <span class="avatar" style="background:${p ? esc(p.color || '#5b8cff') : 'var(--accent)'}">${esc(initials(label))}</span>
        <span><b>${esc(label)}</b></span>
      </a>`;
  }

  function render() {
    const me = DB.currentUser();
    const locked = DB.loginRequired() && !me;

    document.body.classList.toggle('locked', locked);

    document.querySelectorAll('#mainNav a').forEach(a => {
      const hideTab = locked || (a.dataset.tab === 'admin' && me && me.role === 'player');
      a.style.display = hideTab ? 'none' : '';
    });

    if (locked) {
      const h = location.hash || '';
      const skip = ['', '#', '#/'];
      afterLogin = skip.includes(h) ? null : h;

      app.innerHTML = viewLogin(true);
      renderUserChip();
      renderSyncChip();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    const { view, id } = parseHash();
    let html;
    try {
      switch (view) {
        case 'seasons':     html = viewSeasons();        break;
        case 'season':      html = viewSeason(id);       break;
        case 'tournaments': html = viewTournaments();    break;
        case 'tournament':  html = viewTournament(id);   break;
        case 'teams':       html = viewTeams();          break;
        case 'team':        html = viewTeam(id);         break;
        case 'players':     html = viewPlayers();        break;
        case 'player':      html = viewPlayer(id);       break;
        case 'stats':       html = viewStats();          break;
        case 'trade':       html = viewTrade();          break;
        case 'me':          html = viewMe();             break;
        case 'admin':       html = viewAdmin();          break;
        default:            html = viewDashboard();
      }
    } catch (err) {
      console.error('Дэлгэц зурах алдаа:', err);
      html = `
        <div class="page-head"><h1>⚠️ Алдаа гарлаа</h1>
          <p class="muted">${esc(String((err && err.message) || err))}</p></div>
        <div class="card">
          <p class="muted" style="margin-top:0">Хуудсаа дахин ачаалж үзээрэй.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn" href="#/dashboard">← Нүүр хуудас</a>
            <a class="btn ghost" href="#/players">👥 Тоглогчид</a>
          </div>
        </div>`;
    }
    app.innerHTML = html;
    renderUserChip();
    renderSyncChip();

    if (view === 'players') applyPlayerFilter();

    const navKey = view === 'season'  ? 'seasons'
                 : view === 'tournament' ? 'tournaments'
                 : view === 'team'     ? 'teams'
                 : view === 'player'   ? 'players' : view;

    document.querySelectorAll('#mainNav a').forEach(a => {
      a.classList.toggle('active', a.dataset.tab === navKey);
    });

    scrollNavIntoView();

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ============================================================
     5. CLICK HANDLER
     ============================================================ */

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a  = el.dataset.action;
    const id = el.dataset.id;

    if (a === 'admin-tab') {
      adminTab = el.dataset.tab;
      editSeasonId = editTourId = editTeamId = editPlayerId = editAwardId = null;
      render(); return;
    }
    if (a === 'sync-pull') {
      if (!DB.sync || !DB.sync.enabled()) return;
      toast('🔄 Серверээс шалгаж байна…', '');
      DB.sync.pull();
      return;
    }

    if (a === 'logout') {
      DB.logout();
      afterLogin = null; openPerf = null; perfTpl = 'all'; tradeTo = null;
      playerQ = ''; playerTeam = 'all'; playerSort = 'team';
      toast('Гарлаа', 'ok');
      if (location.hash === '#/dashboard') render(); else location.hash = '#/dashboard';
      return;
    }

    if (a === 'pw-toggle') {
      const inp = document.getElementById('pwInput');
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      el.textContent = show ? '🙈' : '👁';
      inp.focus();
      return;
    }

    /* ---- Хэлэлцээр ---- */
    if (a === 'trade-accept') {
      const me = DB.currentUser();
      const myPid = me && me.playerId;
      if (!confirm('Энэ хэлэлцээрийг батлах уу? Тоглогч, шагнал шууд солигдоно.')) return;
      const res = DB.acceptTradeRequest(id, myPid, DB.isAdmin());
      if (!res.ok) return toast(res.msg, 'err');
      toast(`✅ Батлагдлаа — ${res.players} тоглогч, ${res.awards} шагнал солигдлоо`, 'ok');
      render(); return;
    }
    if (a === 'trade-reject') {
      const me = DB.currentUser();
      const myPid = me && me.playerId;
      const reason = prompt('Татгалзсан шалтгаан (сонголтоор):', '');
      if (reason === null) return;
      const res = DB.rejectTradeRequest(id, myPid, DB.isAdmin(), reason);
      if (!res.ok) return toast(res.msg, 'err');
      toast('Татгалзлаа', 'ok');
      render(); return;
    }
    if (a === 'trade-cancel') {
      const me = DB.currentUser();
      const myPid = me && me.playerId;
      if (!confirm('Энэ хүсэлтийг цуцлах уу?')) return;
      const res = DB.cancelTradeRequest(id, myPid, DB.isAdmin());
      if (!res.ok) return toast(res.msg, 'err');
      toast('Цуцлагдлаа', 'ok');
      render(); return;
    }

    /* ---- Профайл: загварын шүүлт ---- */
    if (a === 'perf-tpl') { perfTpl = el.dataset.tpl || 'all'; render(); return; }

    if (a === 'stat-set-tpl') { statTpl = el.dataset.id; statSort = 'ratio'; }

    /* ---- Стат загвар ---- */
    if (a === 'tpl-row-add') {
      const card = el.closest('[data-tpl-card]');
      if (!card) return;
      const box = card.querySelector('.tpl-fields');
      if (!box) return;
      const div = document.createElement('div');
      div.innerHTML = tplRowHtml(null).trim();
      const row = div.firstElementChild;
      box.appendChild(row);
      const k = row.querySelector('[data-tf="key"]');
      if (k) k.focus();
      return;
    }
    if (a === 'tpl-row-del') {
      const row = el.closest('[data-tpl-row]');
      const box = row ? row.parentElement : null;
      if (!row || !box) return;
      if (box.querySelectorAll('[data-tpl-row]').length <= 1) {
        return toast('Дор хаяж 1 талбар үлдэх ёстой', 'err');
      }
      row.remove();
      return;
    }
    if (a === 'tpl-del') {
      const card = el.closest('[data-tpl-card]');
      if (!card) return;
      const used = DB.state.tournaments.filter(t => DB.templateIdOf(t.id) === id).length;
      if (!confirm(`Энэ загварыг устгах уу?${used ? `\n(${used} тэмцээн ашиглаж байна — эхний загварт шилжинэ)` : ''}`)) return;
      card.remove();
      toast('Устгагдлаа — «💾 Бүх загварыг хадгалах» дарж баталгаажуулна', '');
      return;
    }
    if (a === 'tpl-add') {
      const form = document.querySelector('form[data-form="templates"]');
      if (!form) return;
      const name = prompt('Шинэ загварын нэр:', 'Мини футбол');
      if (name === null) return;
      const n = String(name).trim();
      if (!n) return;
      const tid = 'tpl_' + Date.now().toString(36);
      const tpl = { id: tid, name: n, icon: '🏅',
                    fields: [{ key: 'points', label: 'Оноо', icon: '⭐' }], ratio: null };
      const holder = document.createElement('div');
      holder.innerHTML = tplCardHtml(tpl).trim();
      const card = holder.firstElementChild;
      const anchor = form.querySelector('[data-action="tpl-add"]');
      const wrap = anchor ? anchor.closest('div') : null;
      if (wrap) form.insertBefore(card, wrap);
      else form.appendChild(card);
      toast('Загвар нэмэгдлээ — талбаруудыг бөглөөд хадгална уу', 'ok');
      return;
    }

    /* ---- Тоглолтын стат ---- */
    if (a === 'perf-all') {
      const box = el.closest('.perf-box');
      if (!box) return;
      box.querySelectorAll('input[type="checkbox"][name^="play_"]')
         .forEach(c => { c.checked = true; });
      box.querySelectorAll('.perf-grid-row').forEach(r => r.classList.add('on'));
      toast('Бүх тоглогч тэмдэглэгдлээ', 'ok');
      return;
    }
    if (a === 'perf-clear') {
      const box = el.closest('.perf-box');
      if (!box) return;
      if (!confirm('Энэ тоглолтын статыг цэвэрлэх үү?')) return;
      box.querySelectorAll('input[type="checkbox"]').forEach(c => { c.checked = false; });
      box.querySelectorAll('input[type="number"]').forEach(n => { n.value = ''; });
      box.querySelectorAll('.perf-grid-row').forEach(r => r.classList.remove('on'));
      toast('Цэвэрлэгдлээ — хадгалахаа мартуузай', '');
      return;
    }

    /* ---- Улирал ---- */
    if (a === 'season-edit')   { editSeasonId = id; adminTab = 'seasons'; render(); return; }
    if (a === 'season-cancel') { editSeasonId = null; render(); return; }
    if (a === 'season-gen') {
      const n = DB.state.settings.subPerSeason;
      if (!confirm(`Энэ улиралд дутуу байгаа тэмцээнүүдийг (нийт ${n}) автоматаар үүсгэх үү?`)) return;
      const res = DB.fillSeason(id);
      if (!res.ok) return toast(res.msg, 'err');
      toast(res.added ? `${res.added} тэмцээн үүслээ` : 'Бүгд аль хэдийн байна', res.added ? 'ok' : '');
      render(); return;
    }
    if (a === 'season-del') {
      const s = DB.season(id);
      if (!s) return;
      const list = DB.tournamentsOfSeason(id);
      if (!confirm(`"${s.title}" улирлыг түүний ${list.length} тэмцээн, тоглолт, статын хамт устгах уу?`)) return;
      const tids = list.map(t => t.id);
      DB.state.tournaments = DB.state.tournaments.filter(t => t.seasonId !== id);
      DB.state.matches = DB.state.matches.filter(m => !tids.includes(m.tournamentId));
      DB.state.seasons = DB.state.seasons.filter(x => x.id !== id);
      if (editSeasonId === id) editSeasonId = null;
      if (resultTid && tids.includes(resultTid)) resultTid = null;
      DB.save(); toast('Улирал устгагдлаа', 'ok'); render(); return;
    }

    /* ---- Тэмцээн ---- */
    if (a === 'tour-edit')   { editTourId = id; adminTab = 'tournaments'; render(); return; }
    if (a === 'tour-cancel') { editTourId = null; render(); return; }
    if (a === 'tour-del') {
      const t = DB.tournament(id);
      if (!t) return;
      if (!confirm(`"${t.title}" тэмцээнийг тоглолт, статынх нь хамт устгах уу?`)) return;
      DB.state.tournaments = DB.state.tournaments.filter(x => x.id !== id);
      DB.state.matches = DB.state.matches.filter(m => m.tournamentId !== id);
      if (editTourId === id) editTourId = null;
      if (resultTid === id)  resultTid = null;
      if (openPerf && !DB.match(openPerf)) openPerf = null;
      DB.save(); toast('Устгагдлаа', 'ok'); render(); return;
    }
    if (a === 'set-status') {
      DB.setTournamentStatus(id, el.dataset.status);
      toast('Төлөв шинэчлэгдлээ', 'ok'); render(); return;
    }

    /* ---- Багууд ---- */
    if (a === 'team-edit')   { editTeamId = id; adminTab = 'teams'; render(); return; }
    if (a === 'team-cancel') { editTeamId = null; render(); return; }
    if (a === 'team-del') {
      const t = DB.team(id);
      const used = DB.state.tournaments.filter(x => (x.entrants || []).includes(id)).length;
      if (used) return toast(`Энэ баг ${used} тэмцээнд оролцож байна.`, 'err');
      if (!confirm(`"${t.name}" багийг устгах уу? Тоглогчид нь чөлөөт болно.`)) return;
      DB.state.players.forEach(p => { if (p.teamId === id) p.teamId = null; });
      DB.state.teams = DB.state.teams.filter(x => x.id !== id);
      DB.state.tradeRequests = (DB.state.tradeRequests || [])
        .filter(r => r.fromTeamId !== id && r.toTeamId !== id);
      DB.save(); toast('Устгагдлаа', 'ok'); render(); return;
    }

    /* ---- Тоглогчид ---- */
    if (a === 'player-edit')   { editPlayerId = id; adminTab = 'players'; render(); return; }
    if (a === 'player-cancel') { editPlayerId = null; render(); return; }
    if (a === 'player-del') {
      const p = DB.player(id);
      const acc = DB.accountOf(id);
      if (!confirm(`"${p.name}" тоглогчийг устгах уу?\n(Тоглолтын стат бичлэгүүд нь үлдэнэ${acc ? ', бүртгэл ' + acc.username + ' устана' : ''})`)) return;
      DB.state.players = DB.state.players.filter(x => x.id !== id);
      DB.state.awards  = DB.state.awards.filter(x => x.playerId !== id);
      DB.state.teams.forEach(t => { if (t.captainId === id) t.captainId = null; });
      DB.state.matches.forEach(m => {
        if (Array.isArray(m.perfs)) m.perfs = m.perfs.filter(x => x.playerId !== id);
      });
      if (acc) DB.state.settings.users = DB.state.settings.users.filter(u => u.playerId !== id);
      DB.save(); toast('Устгагдлаа', 'ok'); render(); return;
    }
    if (a === 'player-acc') {
      const p = DB.player(id);
      if (!p) return;
      const def = String(p.nick || p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const uname = prompt(`"${p.name}" тоглогчид нэвтрэх нэр өгнө үү:`, def);
      if (uname === null) return;
      const pass = prompt(`"${uname}" нэвтрэх нууц үг (дор хаяж 4 тэмдэгт):`, '1234');
      if (pass === null) return;
      const res = DB.createAccount(p.id, uname, pass, p.name);
      if (!res.ok) return toast(res.msg, 'err');
      toast('Бүртгэл үүслээ: ' + uname, 'ok'); render(); return;
    }

    /* ---- Шагнал ---- */
    if (a === 'award-edit')   { editAwardId = id; adminTab = 'awards'; render(); return; }
    if (a === 'award-cancel') { editAwardId = null; render(); return; }
    if (a === 'award-del') {
      if (!confirm('Энэ шагналыг устгах уу?')) return;
      DB.state.awards = DB.state.awards.filter(x => x.id !== id);
      DB.save(); toast('Устгагдлаа', 'ok'); render(); return;
    }

    /* ---- Тоглолт ---- */
    if (a === 'match-del') {
      if (!confirm('Энэ тоглолтыг тоглогчийн статынх нь хамт устгах уу?')) return;
      DB.state.matches = DB.state.matches.filter(m => m.id !== id);
      if (openPerf === id) openPerf = null;
      DB.save(); toast('Устгагдлаа', 'ok'); render(); return;
    }

    if (a === 'gen-roundrobin') {
      const t = DB.tournament(resultTid);
      const ids = (t.entrants || []).slice();
      if (ids.length < 2) return toast('Дор хаяж 2 баг хэрэгтэй', 'err');
      if (DB.matchesOf(resultTid).length &&
          !confirm('Энэ тэмцээнд тоглолт байна. Бүгдийг устгаж дахин үүсгэх үү? (Стат ч устана)')) return;
      DB.state.matches = DB.state.matches.filter(m => m.tournamentId !== resultTid);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          DB.state.matches.push({
            id: DB.uid('m'), tournamentId: resultTid, stage: 'Round Robin',
            homeTeamId: ids[i], awayTeamId: ids[j],
            homeScore: '', awayScore: '', winnerTeamId: null, status: 'scheduled',
            perfs: []
          });
        }
      }
      DB.save();
      toast(`${ids.length * (ids.length - 1) / 2} тоглолт үүслээ`, 'ok');
      render(); return;
    }

    if (a === 'gen-bracket') {
      const t = DB.tournament(resultTid);
      const n = DB.state.settings.finalQualifiers ?? 4;
      const stand = DB.seasonStandings(t.year).filter(x => x.played > 0);
      if (stand.length < 2) return toast('Оны хүснэгт хангалтгүй', 'err');

      const top = stand.slice(0, n).map(x => x.teamId);
      if (top.length < 2) return toast('Хангалттай баг алга', 'err');

      if (DB.matchesOf(resultTid).length &&
          !confirm('Финалд тоглолт байна. Бүгдийг устгаж дахин үүсгэх үү?')) return;

      t.entrants = top;
      DB.state.matches = DB.state.matches.filter(m => m.tournamentId !== resultTid);

      const addMatch = (stage, h, a2) => DB.state.matches.push({
        id: DB.uid('m'), tournamentId: resultTid, stage,
        homeTeamId: h, awayTeamId: a2,
        homeScore: '', awayScore: '', winnerTeamId: null, status: 'scheduled', perfs: []
      });

      if (top.length >= 4) {
        addMatch('Хагас финал', top[0], top[3]);
        addMatch('Хагас финал', top[1], top[2]);
      } else {
        addMatch('Финал', top[0], top[1]);
      }
      DB.save();
      toast('Bracket үүслээ', 'ok'); render(); return;
    }

    if (a === 'gen-nextstage') {
      const semis = DB.matchesOf(resultTid).filter(m => m.stage === 'Хагас финал' && m.status === 'done');
      if (semis.length !== 2) return toast('Хагас финалууд дуусаагүй байна', 'err');

      const winners = semis.map(m => m.winnerTeamId);
      const losers  = semis.map(m => m.winnerTeamId === m.homeTeamId ? m.awayTeamId : m.homeTeamId);
      if (winners.some(w => !w)) return toast('Хагас финалууд тэнцээтэй байна', 'err');

      const existing = DB.matchesOf(resultTid).filter(m => m.stage === 'Финал' || m.stage === '3-р байр');
      if (existing.length && !confirm('Финал/3-р байр аль хэдийн байна. Нэмж үүсгэх үү?')) return;

      DB.state.matches.push({
        id: DB.uid('m'), tournamentId: resultTid, stage: '3-р байр',
        homeTeamId: losers[0], awayTeamId: losers[1],
        homeScore: '', awayScore: '', winnerTeamId: null, status: 'scheduled', perfs: []
      });
      DB.state.matches.push({
        id: DB.uid('m'), tournamentId: resultTid, stage: 'Финал',
        homeTeamId: winners[0], awayTeamId: winners[1],
        homeScore: '', awayScore: '', winnerTeamId: null, status: 'scheduled', perfs: []
      });
      DB.save();
      toast('Финал + 3-р байрын тоглолт үүслээ', 'ok'); render(); return;
    }

    /* ---- Шилжилтийн цонх ---- */
    if (a === 'tw-open')  { DB.state.settings.transferOverride = 'open';   DB.save(); toast('Цонх нээгдлээ (гараар)', 'ok'); render(); return; }
    if (a === 'tw-close') { DB.state.settings.transferOverride = 'closed'; DB.save(); toast('Цонх хаагдлаа (гараар)', 'ok'); render(); return; }
    if (a === 'tw-auto')  { DB.state.settings.transferOverride = null;     DB.save(); toast('Автомат горим', 'ok'); render(); return; }

    /* ---- Бүртгэл ---- */
    if (a === 'pw-show') {
      const code = el.parentElement.querySelector('code');
      if (!code) return;
      const real = code.dataset.pw || '';
      const hidden = code.textContent === '••••••';
      code.textContent = hidden ? real : '••••••';
      el.textContent = hidden ? '🙈' : '👁';
      return;
    }
    if (a === 'user-pass') {
      const u = (DB.state.settings.users || []).find(x => x.id === id);
      if (!u) return;
      const np = prompt(`"${u.username}" — ШИНЭ нууц үг:`, '');
      if (np === null) return;
      const res = DB.setPassword(id, np);
      if (!res.ok) return toast(res.msg, 'err');
      toast('Нууц үг солигдлоо', 'ok'); render(); return;
    }
    if (a === 'user-rename') {
      const u = (DB.state.settings.users || []).find(x => x.id === id);
      if (!u) return;
      const nu = prompt('Хэрэглэгчийн нэр:', u.username);
      if (nu === null) return;
      const nn = prompt('Дэлгэцийн нэр:', u.name || u.username);
      if (nn === null) return;
      const res = DB.renameUser(id, nu, nn);
      if (!res.ok) return toast(res.msg, 'err');
      toast('Шинэчлэгдлээ', 'ok'); render(); return;
    }
    if (a === 'user-del') {
      const u = (DB.state.settings.users || []).find(x => x.id === id);
      if (!u) return;
      const isP = (u.role || 'admin') === 'player';
      if (!confirm(`"${u.username}" ${isP ? 'тоглогчийн' : 'админы'} бүртгэлийг устгах уу?`)) return;
      const res = DB.deleteUser(id);
      if (!res.ok) return toast(res.msg, 'err');
      toast('Устгагдлаа', 'ok'); render(); return;
    }

    /* ---- Өгөгдөл ---- */
    if (a === 'export') {
      const blob = new Blob([JSON.stringify(DB.state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `golomt-fl-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast('Файл татагдлаа', 'ok'); return;
    }
    if (a === 'reset-empty') {
      if (!confirm('БҮХ өгөгдөл (стат, хэлэлцээр ч) устах болно. Итгэлтэй байна уу?')) return;
      DB.reset(false); toast('Хоосон болголоо', 'ok'); render(); return;
    }
    if (a === 'reset-demo') {
      if (!confirm('Демо өгөгдөлд буцаах уу?')) return;
      DB.reset(true); toast('Демо өгөгдөл ачааллаа', 'ok'); render(); return;
    }
  });

  /* ============================================================
     6. CHANGE HANDLER
     ============================================================ */

  document.addEventListener('change', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;

    if (a === 'result-select') { resultTid = el.value; openPerf = null; render(); return; }
    if (a === 'tour-filter')   { tourFilter = el.value; render(); return; }
    if (a === 'stat-year')     { statYear = el.value; render(); return; }
    if (a === 'stat-sort')     { statSort = el.value; render(); return; }
    if (a === 'stat-tpl')      { statTpl = el.value; statSort = 'ratio'; render(); return; }

    if (a === 'player-q')    { playerQ = el.value; applyPlayerFilter(); return; }
    if (a === 'player-team') { playerTeam = el.value; applyPlayerFilter(); return; }
    if (a === 'player-sort') { playerSort = el.value; render(); return; }

    /* Хэлэлцээрийн хүлээн авагч баг */
    if (a === 'trade-to') { tradeTo = el.value; render(); return; }

    /* Багийн ахлагч товлох */
    if (a === 'team-captain') {
      const res = DB.setCaptain(el.dataset.id, el.value || null);
      if (!res.ok) { toast(res.msg, 'err'); render(); return; }
      toast(el.value ? '👑 Ахлагч товлогдлоо' : 'Ахлагч хасагдлаа', 'ok');
      render(); return;
    }

    if (el.name && el.name.startsWith('play_')) {
      const row = el.closest('.perf-grid-row');
      if (row) row.classList.toggle('on', el.checked);
      return;
    }

    if (a === 'move-player') {
      const playerId = el.dataset.id;
      const to = el.value;
      if (!to) return;

      if (!DB.isTransferOpen() &&
          !confirm('Шилжилтийн цонх хаалттай байна. Гэсэн ч шилжүүлэх үү?')) {
        el.value = ''; return;
      }

      const p = DB.player(playerId);
      const target = to === '__free' ? null : to;
      const targetName = target ? (DB.team(target) || {}).name : 'Чөлөөт';

      const capWarn = DB.captainTeam(playerId) ? '\n⚠️ Энэ тоглогч багийн ахлагч — ахлагчийн эрх чөлөөлөгдөнө.' : '';

      if (!confirm(`${p.name}-г "${targetName}" руу шилжүүлэх үү?${capWarn}`)) { el.value = ''; return; }

      const res = DB.transferPlayer(playerId, target, 'Гараар шилжүүлсэн');
      if (!res.ok) { toast(res.msg, 'err'); el.value = ''; return; }
      toast(`${p.name} → ${targetName}`, 'ok');
      render();
      return;
    }

    if (a === 'import') {
      const file = el.files && el.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || typeof data !== 'object') throw new Error('буруу формат');
          DB.state = data;
          DB.migrate();
          DB.save();
          toast('Амжилттай сэргээлээ', 'ok');
          render();
        } catch (err) {
          toast('Файл уншиж чадсангүй: ' + err.message, 'err');
        }
      };
      reader.readAsText(file);
      return;
    }
  });

  /* ============================================================
     6.б  INPUT HANDLER
     ============================================================ */

  document.addEventListener('input', e => {
    const q = e.target.closest('[data-action="player-q"]');
    if (q) { playerQ = q.value; applyPlayerFilter(); return; }

    const g = e.target.closest('[data-action="tour-game"]');
    if (g) {
      const form = g.closest('form[data-form="tournament"]');
      const sel = form ? form.querySelector('[data-role="tour-tpl"]') : null;
      if (sel) {
        const guess = DB.guessTemplateId(g.value);
        if ([...sel.options].some(o => o.value === guess)) sel.value = guess;
      }
    }
  });

  /* ============================================================
     7. SUBMIT HANDLER
     ============================================================ */

  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();

    const kind = form.dataset.form;
    const fd = new FormData(form);
    const val = n => (fd.get(n) || '').toString().trim();
    const num = (n, d) => { const v = Number(val(n)); return isNaN(v) ? d : v; };
    const all = n => fd.getAll(n).map(String);

    /* ---- Нэвтрэх ---- */
    if (kind === 'login') {
      const errBox = document.getElementById('loginErr');
      if (errBox) errBox.textContent = '';

      /* «Намайг сана» хайрцаг хасагдсан — 30 хоног хадгална */
      const user = DB.login(val('username'), val('password'), 30);

      if (!user) {
        if (errBox) errBox.textContent = '⚠️ Хэрэглэгчийн нэр эсвэл нууц үг буруу';
        const pw = form.querySelector('[name="password"]');
        if (pw) { pw.value = ''; pw.focus(); }
        return;
      }

      toast(`Тавтай морил, ${user.name}!`, 'ok');

      const def = user.role === 'player'
        ? '#/me'
        : (DB.loginRequired() ? '#/dashboard' : '#/admin');

      let target = afterLogin || def;
      if (user.role === 'player' && String(target).startsWith('#/admin')) target = '#/me';

      afterLogin = null;
      perfTpl = 'all'; tradeTo = null;
      if (user.role !== 'player') adminTab = 'seasons';

      if (location.hash === target) render();
      else location.hash = target;
      return;
    }

    /* ---- Шинэ хэлэлцээрийн хүсэлт ---- */
    if (kind === 'trade-new') {
      const me = DB.currentUser();
      const myPid = me && me.playerId;
      const myTeam = myPid ? DB.captainTeam(myPid) : null;
      if (!myTeam) return toast('Та багийн ахлагч биш байна', 'err');
      if (!DB.isTransferOpen() && !DB.isAdmin()) {
        return toast('Шилжилтийн цонх хаалттай байна', 'err');
      }

      const res = DB.createTradeRequest({
        fromTeamId: myTeam.id,
        toTeamId: val('toTeamId'),
        actorPlayerId: myPid,
        isAdmin: DB.isAdmin(),
        offerPlayers: all('offerPlayers'),
        offerAwards:  all('offerAwards'),
        wantPlayers:  all('wantPlayers'),
        wantAwards:   all('wantAwards'),
        note: val('note')
      });
      if (!res.ok) return toast(res.msg, 'err');
      toast('📤 Хүсэлт илгээгдлээ', 'ok');
      render(); return;
    }

    /* ---- Эсрэг санал ---- */
    if (kind === 'trade-counter') {
      const me = DB.currentUser();
      const myPid = me && me.playerId;
      if (!DB.isTransferOpen() && !DB.isAdmin()) {
        return toast('Шилжилтийн цонх хаалттай байна', 'err');
      }

      const res = DB.counterTradeRequest(val('id'), myPid, {
        offerPlayers: all('c_offer_p'),
        offerAwards:  all('c_offer_a'),
        wantPlayers:  all('c_want_p'),
        wantAwards:   all('c_want_a'),
        note: val('note')
      }, DB.isAdmin());

      if (!res.ok) return toast(res.msg, 'err');
      toast('🔁 Эсрэг санал илгээгдлээ', 'ok');
      render(); return;
    }

    /* ---- Стат загвар ---- */
    if (kind === 'templates') {
      const cards = [...form.querySelectorAll('[data-tpl-card]')];
      const list = [];

      cards.forEach(card => {
        const tid = card.dataset.tplId;
        const nameEl = card.querySelector('.tpl-name');
        const iconEl = card.querySelector('.tpl-icon');
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) return;

        const rows = [...card.querySelectorAll('[data-tpl-row]')];
        const seen = new Set();
        const fields = rows.map(r => {
          const g = s => { const el = r.querySelector(`[data-tf="${s}"]`); return el ? el.value.trim() : ''; };
          const lowerEl = r.querySelector('[data-tf="lower"]');
          const key = g('key').replace(/\s+/g, '_');
          const label = g('label') || key;
          if (!key) return null;
          if (seen.has(key)) return null;
          seen.add(key);
          return { key, label, icon: g('icon'), lower: !!(lowerEl && lowerEl.checked) };
        }).filter(Boolean);

        if (!fields.length) return;

        const rl = card.querySelector('.tpl-ratio-label');
        const rn = card.querySelector('.tpl-ratio-num');
        const rd = card.querySelector('.tpl-ratio-den');

        const rlabel = rl ? rl.value.trim() : '';
        const rnum = rn ? rn.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        const rden = rd ? rd.value.trim() : '';

        let ratio = null;
        if (rlabel && rnum.length) {
          const valid = rnum.filter(k => fields.some(f => f.key === k));
          if (valid.length) {
            ratio = {
              label: rlabel,
              num: valid,
              den: (rden && fields.some(f => f.key === rden)) ? rden : null
            };
          }
        }

        list.push({ id: tid, name, icon: iconEl ? iconEl.value.trim() || '🏅' : '🏅', fields, ratio });
      });

      if (!list.length) return toast('Дор хаяж 1 загвар, 1 талбар хэрэгтэй', 'err');

      const res = DB.saveTemplates(list);
      if (!res.ok) return toast(res.msg, 'err');
      toast(`${list.length} загвар хадгалагдлаа`, 'ok');
      render();
      return;
    }

    /* ---- Тоглолтын стат ---- */
    if (kind === 'perf') {
      const m = DB.match(val('matchId'));
      if (!m) return toast('Тоглолт олдсонгүй', 'err');

      const t = DB.tournament(m.tournamentId);
      const date = t ? t.date : '';
      const tplId = val('templateId') || DB.templateIdOf(m.tournamentId);
      const tpl = DB.statTemplate(tplId) || DB.statTemplates()[0];
      const fields = tpl ? tpl.fields : [];

      const list = [];
      let mvpUsed = false;
      let mvpExtra = 0;

      DB.state.players.forEach(p => {
        if (!fd.get('play_' + p.id)) return;

        const tid = DB.teamAt(p.id, date);
        if (tid !== m.homeTeamId && tid !== m.awayTeamId) return;

        const rec = { playerId: p.id, teamId: tid, note: '' };
        fields.forEach(f => {
          rec[f.key] = Math.max(0, Math.round(Number(fd.get(f.key + '_' + p.id)) || 0));
        });

        if (fd.get('mvp_' + p.id)) {
          if (mvpUsed) mvpExtra++;
          else { rec.mvp = true; mvpUsed = true; }
        } else rec.mvp = false;

        list.push(rec);
      });

      const res = DB.setMatchPerfs(m.id, list, tplId);
      if (!res.ok) return toast(res.msg, 'err');

      openPerf = m.id;
      toast(`💾 ${res.count} тоглогчийн стат хадгалагдлаа` +
            (mvpExtra ? ` (${mvpExtra} илүү MVP-г үл хайхран нэг л MVP авлаа)` : ''), 'ok');
      render();
      return;
    }

    /* ---- Өөрийн нууц үг ---- */
    if (kind === 'mypass') {
      const me = DB.currentUser();
      if (!me) return;
      if (val('next') !== val('again')) return toast('Шинэ нууц үг хоёр таарахгүй байна', 'err');
      const res = DB.changeOwnPassword(me.id, val('current'), val('next'));
      if (!res.ok) return toast(res.msg, 'err');
      toast('Нууц үг солигдлоо', 'ok');
      form.reset();
      return;
    }

    /* ---- Шинэ админ ---- */
    if (kind === 'user') {
      const res = DB.addUser(val('username'), val('password'), val('name'));
      if (!res.ok) return toast(res.msg, 'err');
      toast('Админ нэмэгдлээ', 'ok'); render(); return;
    }

    /* ---- Тохиргоо ---- */
    if (kind === 'settings') {
      const s = DB.state.settings;
      s.title           = val('title') || s.title;
      s.winPoints       = num('winPoints', 3);
      s.drawPoints      = num('drawPoints', 1);
      s.lossPoints      = num('lossPoints', 0);
      s.subPerSeason    = Math.max(1, num('subPerSeason', 6));
      s.finalQualifiers = Math.max(2, num('finalQualifiers', 4));
      s.transferGapDays = Math.max(0, num('transferGapDays', 3));
      s.transferDays    = Math.max(1, num('transferDays', 7));
      s.loginRequired   = !!fd.get('loginRequired');
      DB.save(); toast('Тохиргоо хадгалагдлаа', 'ok'); render(); return;
    }

    /* ---- Улирал ---- */
    if (kind === 'season') {
      const title = val('title');
      if (!title) return toast('Нэрээ оруулна уу', 'err');
      const data = {
        year:      num('year', new Date().getFullYear()),
        round:     Math.max(1, num('round', 1)),
        title,
        startDate: val('startDate'),
        gapDays:   Math.max(1, num('gapDays', 7)),
        defPlace:  val('defPlace'),
        defGame:   val('defGame'),
        defFormat: val('defFormat'),
        note:      val('note')
      };
      const id = val('id');
      if (id) {
        Object.assign(DB.season(id), data);
        editSeasonId = null;
        toast('Шинэчлэгдлээ', 'ok');
      } else {
        DB.state.seasons.push({ id: DB.uid('s'), ...data });
        toast('Улирал нэмэгдлээ', 'ok');
      }
      DB.save(); render(); return;
    }

    /* ---- Тэмцээн ---- */
    if (kind === 'tournament') {
      const isFinal = val('isFinal') === '1';
      const tpls = DB.statTemplates();
      let tplId = val('templateId');
      if (!tpls.some(t => t.id === tplId)) tplId = DB.guessTemplateId(val('game'));
      if (!tpls.some(t => t.id === tplId)) tplId = tpls[0].id;

      const data = {
        year:      num('year', new Date().getFullYear()),
        isFinal,
        seasonId:  isFinal ? null : (val('seasonId') || null),
        no:        Math.max(0, num('no', isFinal ? 0 : 1)),
        title:     val('title'),
        place:     val('place'),
        game:      val('game'),
        format:    val('format'),
        templateId: tplId,
        date:      val('date'),
        time:      val('time'),
        status:    val('status'),
        note:      val('note'),
        entrants:  fd.getAll('entrants')
      };
      if (!data.title || !data.date) return toast('Нэр, огноо заавал', 'err');
      if (!isFinal && !data.seasonId) return toast('Жижиг тэмцээнд улирал сонгоно уу', 'err');

      const id = val('id');
      if (id) {
        Object.assign(DB.tournament(id), data);
        editTourId = null;
        toast('Шинэчлэгдлээ', 'ok');
      } else {
        const newId = DB.uid('t');
        DB.state.tournaments.push({ id: newId, ...data });
        resultTid = newId;
        toast('Тэмцээн үүслээ', 'ok');
      }
      DB.save(); render(); return;
    }

    /* ---- Баг ---- */
    if (kind === 'team') {
      const name = val('name');
      if (!name) return toast('Нэрээ оруулна уу', 'err');
      const data = { name, icon: val('icon') || '🛡', color: val('color') };
      const id = val('id');
      if (id) { Object.assign(DB.team(id), data); editTeamId = null; toast('Шинэчлэгдлээ', 'ok'); }
      else    { DB.state.teams.push({ id: DB.uid('tm'), captainId: null, ...data }); toast('Баг нэмэгдлээ', 'ok'); }
      DB.save(); render(); return;
    }

    /* ---- Тоглогч ---- */
    if (kind === 'player') {
      const name = val('name');
      if (!name) return toast('Нэрээ оруулна уу', 'err');

      const data = { name, nick: val('nick'), teamId: val('teamId') || null,
                     color: val('color'), joined: val('joined') };
      const id = val('id');
      let pid = id;

      if (id) {
        const p = DB.player(id);
        const oldTeam = p ? p.teamId : null;
        Object.assign(p, data);
        /* Баг солигдвол ахлагчийн эрх чөлөөлөх */
        if (oldTeam !== data.teamId) {
          DB.state.teams.forEach(t => { if (t.captainId === id) t.captainId = null; });
        }
        editPlayerId = null;
        toast('Шинэчлэгдлээ', 'ok');
      } else {
        pid = DB.uid('p');
        DB.state.players.push({ id: pid, ...data });
        toast('Тоглогч нэмэгдлээ', 'ok');
      }

      const au = val('accUser');
      if (au) {
        const res = DB.createAccount(pid, au, val('accPass'), name);
        if (!res.ok) toast('Тоглогч хадгалагдсан, гэхдээ бүртгэл: ' + res.msg, 'err');
        else toast('🔑 Нэвтрэх бүртгэл үүслээ: ' + au, 'ok');
      }

      DB.save(); render(); return;
    }

    /* ---- Шагнал ---- */
    if (kind === 'award') {
      const pid = val('playerId');
      const title = val('title');
      if (!pid) return toast('Тоглогч сонгоно уу', 'err');
      if (!title) return toast('Шагналын нэрээ оруулна уу', 'err');

      const ownerRaw = val('ownerId');
      const data = { playerId: pid, title, icon: val('icon') || '🏅',
                     note: val('note'), date: val('date'),
                     ownerId: ownerRaw || pid };
      const id = val('id');
      if (id) {
        Object.assign(DB.award(id), data);
        editAwardId = null;
        toast('Шинэчлэгдлээ', 'ok');
      } else {
        DB.state.awards.push({ id: DB.uid('aw'), ...data });
        toast('Шагнал нэмэгдлээ', 'ok');
      }
      DB.save(); render(); return;
    }

    /* ---- Тоглолтын оноо ---- */
    if (kind === 'match') {
      const m = DB.match(val('id'));
      if (!m) return;
      m.stage        = val('stage');
      m.homeScore    = val('homeScore') === '' ? '' : Number(val('homeScore'));
      m.awayScore    = val('awayScore') === '' ? '' : Number(val('awayScore'));
      const w        = val('winnerTeamId');
      m.winnerTeamId = (!w || w === 'auto') ? DB.autoWinnerTeam(m) : w;
      m.status       = (m.homeScore !== '' && m.awayScore !== '') ? 'done' : 'scheduled';
      if (!Array.isArray(m.perfs)) m.perfs = [];
      DB.save();
      toast(m.status === 'done' ? 'Үр дүн хадгалагдлаа' : 'Хадгалагдлаа (оноо дутуу)',
            m.status === 'done' ? 'ok' : '');
      render(); return;
    }

    /* ---- Шинэ тоглолт ---- */
    if (kind === 'new-match') {
      const h = val('homeTeamId'), a2 = val('awayTeamId');
      if (!h || !a2) return toast('Хоёр баг сонгоно уу', 'err');
      if (h === a2)  return toast('Ижил багийг сонгож болохгүй', 'err');
      DB.state.matches.push({
        id: DB.uid('m'), tournamentId: resultTid,
        stage: val('stage') || 'Round Robin',
        homeTeamId: h, awayTeamId: a2,
        homeScore: '', awayScore: '', winnerTeamId: null, status: 'scheduled',
        perfs: []
      });
      DB.save(); toast('Тоглолт нэмэгдлээ', 'ok'); render(); return;
    }
  });

  /* ============================================================
     8. ХАРАНХУЙ / ГЭРЭЛ
     ============================================================ */

  const themeBtn = document.getElementById('themeBtn');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    DB.state.settings.theme = next;
    DB.save();
    applyTheme(next);
  });

  /* ---------- Гүйлгэхэд header-д сүүдэр ---------- */
  const topbar = document.getElementById('topbar');
  if (topbar) {
    const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Мобайл: идэвхтэй цэсийг харагдуулах ---------- */
  function scrollNavIntoView() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    const act = nav.querySelector('a.active');
    if (!act) return;
    const nr = nav.getBoundingClientRect();
    const ar = act.getBoundingClientRect();
    if (ar.left < nr.left || ar.right > nr.right) {
      act.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ============================================================
     8.б  CLOUD SYNC — төлөв + listener
     ============================================================ */

  function renderSyncChip() {
    const box = document.getElementById('syncChip');
    if (!box) return;

    if (!DB.sync || !DB.sync.enabled()) { box.innerHTML = ''; return; }

    const s = DB.sync.info();
    const map = {
      off:        ['sync-off',  'Синк унтраалттай'],
      connecting: ['sync-wait', s.msg || 'Хадгалж байна…'],
      online:     ['sync-ok',   s.msg || 'Синк хийгдсэн'],
      error:      ['sync-err',  s.msg || 'Холболтын алдаа']
    };
    const m = map[s.status] || map.off;

    box.innerHTML = `
      <button class="sync-chip ${m[0]}" type="button"
              data-action="sync-pull" title="${esc(m[1])} — дарах: дахин шалгах">
        <span class="sync-dot"></span>
        <span class="sync-txt">${esc(m[1])}</span>
      </button>`;
  }

  if (DB.sync && DB.sync.onChange) {
    DB.sync.onChange((reason) => {
      if (reason === 'remote') {
        toast('🔄 Бусад хэрэглэгчийн өөрчлөлт ирлээ', 'ok');
        render();
      } else {
        renderSyncChip();
      }
    });
  }

  /* ============================================================
     9. ЭХЛҮҮЛЭХ
     ============================================================ */

  try {
    /* 1) Өгөгдөл ачаалах (DB.state энд л үүснэ) */
    DB.load();

    /* 2) Анхны ачаалалтад системийн theme-ийг дагах */
    if (!DB.state.settings.theme) {
      const sysDark = window.matchMedia &&
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
      DB.state.settings.theme = sysDark ? 'dark' : 'light';
      DB.save();
    }

    /* 3) Theme хэрэглэх */
    applyTheme(DB.state.settings.theme || 'dark');

    /* 4) Хөлийн он */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* 5) Router */
    window.addEventListener('hashchange', () => {
      openPerf = null;
      perfTpl = 'all';
      render();
    });

    render();

    if (!location.hash) location.hash = '#/dashboard';

  } catch (err) {
    console.error('Эхлүүлэх алдаа:', err);
    if (app) {
      app.innerHTML = `
        <div class="page-head"><h1>⚠️ Эхлүүлэх алдаа</h1>
          <p class="muted">${esc(String((err && err.message) || err))}</p></div>
        <div class="card">
          <p class="muted" style="margin-top:0">
            Хуудсаа <b>Ctrl+Shift+R</b> дарж дахин ачаалаад үзээрэй.
          </p>
          <button class="btn" onclick="localStorage.clear(); location.reload();">
            🧹 Сан цэвэрлээд дахин ачаалах
          </button>
        </div>`;
    }
  }
})();