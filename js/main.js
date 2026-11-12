'use strict';
// 진입점: 화면 상태 전환, 메뉴, 인트로/아웃트로, 고정 60Hz 루프
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const screens = ['title', 'mode', 'chapter', 'ship', 'skills', 'diff', 'practice', 'how', 'log', 'settings', 'pause', 'upgrade', 'result'];

  let state = 'TITLE';   // TITLE | DIFF | HOW | SETTINGS | INTRO | PLAYING | PAUSED | UPGRADE | OUTRO | RESULT
  let diffKey = 'normal';
  let cine = null;       // 시네마틱 { lines, t, next }
  let time = 0;
  let gameChapter = 0;                            // 스토리 모드 챕터 (0 = 챕터 1, 1 = 챕터 2)
  let gameMode = 'story';                         // story | challenge | endless
  let practiceMode = false;                       // 연습 모드 진행 중인지
  const pcfg = { diff: 'normal', chapter: 0, stage: 0, target: 1, ups: false }; // 연습 설정 (target: 1~5 웨이브 | 'mid' | 'final')

  Store.load();
  Input.init(canvas);
  Game.init();

  // 기체 선택 / 스킬 트리 화면 상태
  let shipKey = SHIPS[Store.data.lastShip] ? Store.data.lastShip : 'astra';
  Player.shipDef = SHIPS[shipKey];
  let skillShip = shipKey, skillSel = null;

  /* ---------- 화면 크기 ---------- */
  function resize() {
    const s = Math.max(0.3, Math.min(window.innerWidth / 640, window.innerHeight / 640));
    document.documentElement.style.setProperty('--u', s + 'px');
    Input.scale = s;
  }
  window.addEventListener('resize', resize);
  resize();

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch-on');

  /* ---------- 화면 표시 ---------- */
  function show(name) {
    for (const s of screens) $('s-' + s).classList.toggle('show', s === name);
    if (name) {
      const b = $('s-' + name).querySelector('button.primary, button');
      if (b) setTimeout(() => b.focus({ preventScroll: true }), 0);
    }
    const playing = state === 'PLAYING';
    $('btn-dash').classList.toggle('active', playing);
    $('btn-skill').classList.toggle('active', playing);
    $('btn-pause').classList.toggle('active', playing);
    $('skip-hint').classList.toggle('show', state === 'INTRO' || state === 'OUTRO');
  }

  function setState(s) {
    state = s;
    switch (s) {
      case 'TITLE': show('title'); Sound.bgm('title'); break;
      case 'MODE': show('mode'); break;
      case 'CHAPTER': buildChapterCards(); show('chapter'); break;
      case 'SHIP': buildShipCards(); show('ship'); break;
      case 'SKILLS': renderSkills(); show('skills'); break;
      case 'DIFF': buildDiffCards(); show('diff'); break;
      case 'PRACTICE': buildPractice(); show('practice'); break;
      case 'HOW': show('how'); break;
      case 'LOG': buildLog(); show('log'); break;
      case 'SETTINGS': syncSettings(); show('settings'); break;
      case 'INTRO': show(null); break;
      case 'PLAYING': show(null); break;
      case 'COUNT': show(null); break;
      case 'PAUSED': buildPauseInfo(); show('pause'); break;
      case 'UPGRADE': show('upgrade'); break;
      case 'OUTRO': show(null); break;
      case 'RESULT': show('result'); break;
    }
  }

  /* ---------- 난이도 선택 ---------- */
  function recordLine(k) {
    if (gameMode === 'story') return '최고 점수 ' + (Store.data.best[ck(k)] || 0).toLocaleString();
    const r = (Store.data.modeBest || {})[gameMode + ':' + k];
    if (!r) return '기록 없음';
    return gameMode === 'endless' ? `최고 ${r.wave}웨이브 · ${r.score.toLocaleString()}점` : `최고 점수 ${r.score.toLocaleString()}` + (r.time ? ' · ' + fmtTime(r.time) : '');
  }
  // 스토리 모드 기록 키: 챕터 2는 'c2:' 접두어로 분리 저장
  function ck(k, ch) { const c = ch != null ? ch : gameChapter; return c > 0 ? 'c' + (c + 1) + ':' + k : k; }
  const chTag = c => c > 0 ? 'CH.' + (c + 1) + ' ' : '';
  function fmtTime(t) { return Math.floor(t / 60) + '분 ' + String(Math.floor(t % 60)).padStart(2, '0') + '초'; }

  function buildDiffCards() {
    const wrap = $('diff-cards');
    wrap.innerHTML = '';
    $('diff-title').textContent = { story: '챕터 ' + (gameChapter + 1) + ' — 난이도 선택', challenge: '도전 모드 — 난이도 선택', endless: '무한 모드 — 난이도 선택' }[gameMode];
    $('diff-desc').textContent = { story: '', challenge: '5웨이브가 모두 중간보스전 · 스테이지 끝마다 최종보스 · 스킬 포인트 없음',
      endless: '쓰러질 때까지 반복되며 갈수록 강해집니다 · 스킬 포인트 없음' }[gameMode];
    for (const k of DIFF_ORDER) {
      const D = DIFFS[k];
      const boss = BOSSES[finalOf(D, gameChapter)];
      const known = !!Store.data.cleared[ck(k)];
      const b = document.createElement('button');
      b.className = 'dcard';
      b.style.setProperty('--c', D.color);
      b.innerHTML =
        `<div class="nm">${D.name}</div>` +
        `<div class="bs"><span class="sil"></span>${gameMode === 'challenge' ? '보스 18기 연속' : gameMode === 'endless' ? '최종보스 순환' : '최종보스: ' + (known ? boss.name : '???')}</div>` +
        `<div class="st">목숨 ${D.lives} · 대쉬 충전 ${D.dashCool}초<br>${recordLine(k)}</div>`;
      b.addEventListener('click', () => { diffKey = k; Sound.init(); Sound.play('click'); startRun(); });
      wrap.appendChild(b);
    }
  }

  /* ---------- 챕터 선택 (스토리 모드) ---------- */
  // 챕터 해금: 이전 챕터를 Normal 이상 난이도로 클리어해야 다음 챕터를 플레이할 수 있다
  const UNLOCK_DIFFS = ['normal', 'hard', 'nightmare'];
  function chapterUnlocked(i) {
    return i <= 0 || UNLOCK_DIFFS.some(k => Store.data.cleared[ck(k, i - 1)]);
  }

  /* ---------- 업데이트 기록 ---------- */
  const UPDATE_LOG = [
    { v: 'V1.2.0', items: [
      '스토리 모드 챕터 3 「성좌의 회랑」 추가 — 새로운 잡몹(도깨비불·감시자·보루), 중간보스 3종(페르세우스·카시오페이아·히드라), 난이도별 최종보스 4종(리라·오리온·시그너스·궁수자리 A*)',
      '챕터 3 전용 신규 패턴 추가: 다각형 · 소용돌이 · 창 · 교차 사격, 신규 이동 경로 진자',
      '강화 적 추가: Hard·Nightmare에서 모든 챕터에 쉴드를 두른 적(방패병·이지스·보루병) 등장 (중간보스·최종보스 제외)',
      '연습 모드를 타이틀 메뉴에서 시작 → 모드 선택으로 이동, 연습 모드에서 챕터 3 선택 가능',
      '챕터 3도 이전 챕터를 Normal 이상으로 클리어해야 해금'
    ] },
    { v: 'V1.1.0', items: [
      '기체별 고유 스킬 추가 (Q / SKILL 버튼) 및 스킬 강화 노드 3종씩 추가',
      '스킬 노드 탭의 노드·아이콘 크기 축소',
      '챕터 해금 조건 추가: 이전 챕터를 Normal 이상으로 클리어해야 다음 챕터 진입 가능',
      '업데이트 기록 탭 추가',
      '스킬 트리 노드를 글자 대신 그림 아이콘으로 변경',
      'ESC로 일시정지 후 복귀 시 3초 카운트다운',
      '업그레이드 모듈 18종으로 확장, 메뉴 단일 열 정렬, 모드별 설명 변경',
      '대기 중 기체가 앞으로 나가던 문제 수정, 챕터 설명을 스토리 중심으로 변경'
    ] },
    { v: 'V1.0.5', items: [
      '스토리 모드 챕터 2 추가 (새로운 잡몹·중간보스·최종보스)',
      '도전 모드·무한 모드 추가, 시작 시 모드 선택 화면 표시'
    ] },
    { v: 'V1.0.0', items: [
      '기체 4종(아스트라·헬리오스·세레스·베가)과 스킬 노드(육각 트리)·패시브 노드 추가',
      '연습 모드 추가, 모바일 인트로 건너뛰기 버그 수정, 대쉬 버튼을 왼쪽으로 이동',
      '난이도 4종, 3스테이지 5웨이브, 중간보스·최종보스, 대쉬, 인트로·아웃트로 및 세계관 추가'
    ] }
  ];
  function buildLog() {
    $('log-list').innerHTML = UPDATE_LOG.map(e =>
      `<div class="lg"><b>${e.v}</b><ul>${e.items.map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('');
  }

  function buildChapterCards() {
    const wrap = $('chapter-cards');
    wrap.innerHTML = '';
    const info = [
      { act: 'chapter1', color: '#7fb8ff', desc: '서기 2487년, 은하 중심의 암흑 구역 「공허의 심장」에서 검은 파도가 일어났다. 꺼져 가는 별들 사이를 가르며 인류의 마지막 항성 「솔라리스」를 지켜라.' },
      { act: 'chapter2', color: '#7dffc8', desc: '검은 파도가 멎고 백 일이 지난 뒤, 외행성대 너머에서 정체불명의 함대 잔해가 깨어난다. 낯선 신호의 근원을 거슬러 올라가라.' },
      { act: 'chapter3', color: '#ffb86b', desc: '잔해의 신호를 거슬러 닿은 곳은 은하 중심 너머, 별자리로 이루어진 거대한 회랑이었다. 그곳의 별들은 누군가의 부름에 따라 질서 정연하게 움직이고 있었다.' }
    ];
    info.forEach((c, i) => {
      const done = DIFF_ORDER.filter(k => Store.data.cleared[ck(k, i)]).length;
      const locked = !chapterUnlocked(i);
      const b = document.createElement('button');
      b.className = 'ccard' + (locked ? ' locked' : ''); b.dataset.act = locked ? 'chapterLocked' : c.act;
      b.style.setProperty('--c', c.color);
      b.innerHTML = `<span class="cn">${Story.chapters[i].name}</span><span class="nm">${Story.chapters[i].title}</span>` +
        `<span class="ds">${locked ? '🔒 잠김 — 이전 챕터를 Normal 이상 난이도로 클리어하면 열립니다.' : c.desc}</span><span class="bs">클리어한 난이도 ${done} / ${DIFF_ORDER.length}</span>`;
      wrap.appendChild(b);
    });
  }

  /* ---------- 기체 선택 ---------- */
  const STAT_LABELS = [['power', '화력'], ['mobility', '기동'], ['defense', '방어'], ['support', '지원']];

  function selectShip(k) {
    shipKey = k;
    Store.data.lastShip = k; Store.save();
    Player.shipDef = SHIPS[k];
  }

  function buildShipCards() {
    const wrap = $('ship-cards');
    wrap.innerHTML = '';
    for (const k of Ships.order) {
      const def = SHIPS[k];
      const b = document.createElement('button');
      b.className = 'scard' + (k === shipKey ? ' on' : '');
      b.style.setProperty('--c', def.color);
      const pips = STAT_LABELS.map(([key, label]) =>
        `<div class="r"><span>${label}</span><i>${[1, 2, 3, 4, 5].map(n => `<b class="${n <= def.stars[key] ? 'f' : ''}"></b>`).join('')}</i></div>`).join('');
      b.innerHTML = `<canvas width="116" height="116"></canvas><div><div class="sn">${def.name}</div><div class="sr">${def.role}</div>` +
        `<div class="pips">${pips}</div><div class="sp">스킬 포인트 ${Ships.points(k)}</div></div>`;
      const c = b.querySelector('canvas').getContext('2d');
      Ships.drawShip(c, def, 58, 62, def.color, true, 2.4);
      b.addEventListener('click', () => { Sound.init(); Sound.play('click'); selectShip(k); buildShipCards(); });
      wrap.appendChild(b);
    }
  }

  /* ---------- 스킬 트리 (육각 노드 + 간선, SVG) ---------- */
  function renderSkills() {
    const k = skillShip, def = SHIPS[k], d = Ships.data(k);
    const tabs = $('skill-tabs');
    tabs.innerHTML = '';
    for (const id of Ships.order) {
      const b = document.createElement('button');
      b.className = 'chip' + (id === k ? ' on' : '');
      b.textContent = SHIPS[id].name;
      b.addEventListener('click', () => { Sound.play('click'); skillShip = id; skillSel = null; renderSkills(); });
      tabs.appendChild(b);
    }
    $('skill-pts').innerHTML = `<b style="color:${def.color}">${def.name}</b> · ${def.role} — 스킬 포인트 <b>${Ships.points(k)}</b> ` +
      `<span class="dim">(획득 ${d.earned} · 사용 ${Ships.spent(k)})</span>`;

    const ss = Ships.skillStats(k), sd = def.skill;
    $('skill-card').innerHTML = `<svg viewBox="-14 -14 28 28" class="skico">${Ships.iconSvg({ icon: sd.icon })}</svg>` +
      `<div><b>고유 스킬 · ${sd.name}</b> <span class="tg">Q / SKILL</span><br>${sd.desc}<br>` +
      `<span class="dim">쿨타임 ${ss.cool.toFixed(1)}초` + (sd.dur ? ` · 지속 ${ss.dur.toFixed(1)}초` : ` · 유도탄 ${ss.cnt}발`) +
      ` · 위력 +${Math.round(ss.pow * 100)}%</span></div>`;
    // 육각 격자 좌표(q,r)를 화면 좌표로 변환하고, 트리 전체를 가운데로 맞춘다
    // 트리의 가로·세로 범위에 맞춰 격자 크기를 자동으로 줄여 영역(540×210) 안에 들어오게 한다
    const ux = n => Math.sqrt(3) * (n.q + n.r / 2), uy = n => 1.5 * n.r;
    const spanX = Math.max(...def.nodes.map(ux)) - Math.min(...def.nodes.map(ux));
    const spanY = Math.max(...def.nodes.map(uy)) - Math.min(...def.nodes.map(uy));
    const S = Math.min(32, 540 / (spanX + 1.2), 175 / (spanY + 1.2)), R = S * 0.5, pos = {};
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const n of def.nodes) {
      const x = S * ux(n), y = S * uy(n);
      pos[n.id] = { x, y };
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const ox = 320 - (x0 + x1) / 2, oy = 118 - (y0 + y1) / 2;
    for (const id in pos) { pos[id].x += ox; pos[id].y += oy; }
    const hex = (x, y, r) => [0, 1, 2, 3, 4, 5].map(i => {
      const a = Math.PI / 180 * (60 * i + 30);
      return (x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1);
    }).join(' ');

    let svg = '';
    for (const [a, b] of def.edges) {
      const on = Ships.isActive(k, a) && Ships.isActive(k, b);
      svg += `<line class="edge${on ? ' on' : ''}" x1="${pos[a].x.toFixed(1)}" y1="${pos[a].y.toFixed(1)}" x2="${pos[b].x.toFixed(1)}" y2="${pos[b].y.toFixed(1)}"/>`;
    }
    for (const n of def.nodes) {
      const st = Ships.isActive(k, n.id) ? 'on' : (Ships.reachable(k, n.id) ? 'reach' : 'lock');
      svg += `<g class="nd ${st}${n.sk ? ' sk' : ''}${skillSel === n.id ? ' sel' : ''}" data-id="${n.id}"><polygon points="${hex(pos[n.id].x, pos[n.id].y, R)}"/>` +
        `<g class="ic" transform="translate(${pos[n.id].x.toFixed(1)},${pos[n.id].y.toFixed(1)}) scale(${(R / 21).toFixed(2)})">${Ships.iconSvg(n)}</g></g>`;
    }
    svg += '<text class="cap" x="320" y="252">패시브 노드 — 연결 없이 2포인트로 활성화</text>';
    def.passives.forEach((p, i) => {
      const x = 320 + (i - 1) * 170, y = 290;
      const st = Ships.isActive(k, p.id) ? 'on' : 'reach';
      svg += `<g class="nd pas ${st}${skillSel === p.id ? ' sel' : ''}" data-id="${p.id}"><circle cx="${x}" cy="${y}" r="18"/>` +
        `<g class="ic" transform="translate(${x},${y}) scale(1)">${Ships.iconSvg(p)}</g><text class="lb" x="${x}" y="${y + 32}">${p.name}</text></g>`;
    });
    const el = $('skill-svg');
    el.style.setProperty('--c', def.color);
    el.innerHTML = svg;
    el.querySelectorAll('.nd').forEach(g => g.addEventListener('click', () => {
      Sound.init(); Sound.play('click'); skillSel = g.dataset.id; renderSkills();
    }));

    // 선택한 노드 설명 + 활성화 버튼 상태
    const info = $('skill-info'), buy = $('skill-buy');
    if (!skillSel) {
      info.innerHTML = '노드를 눌러 효과를 확인하세요.<br><span class="st">코어에서 선으로 이어진 노드부터 1포인트로 활성화할 수 있습니다.</span>';
      buy.disabled = true; buy.textContent = '활성화';
      return;
    }
    const pas = Ships.passive(k, skillSel), o = pas || Ships.node(k, skillSel);
    const cost = pas ? pas.cost : 1, active = Ships.isActive(k, skillSel), pts = Ships.points(k);
    const can = pas ? Ships.canBuyPassive(k, skillSel) : Ships.canBuyNode(k, skillSel);
    let status;
    if (o.core) status = '시작 노드 (항상 활성)';
    else if (active) status = '활성화됨';
    else if (!pas && !Ships.reachable(k, skillSel)) status = '잠김 — 활성 노드와 이어진 노드부터 활성화하세요';
    else status = pts >= cost ? '활성화할 수 있습니다' : '포인트가 부족합니다 (' + pts + '/' + cost + ')';
    info.innerHTML = `<b>${o.name}</b>${pas ? '<span class="tg">패시브</span>' : ''} <span class="cost">${o.core ? '' : '비용 ' + cost + 'P'}</span><br>` +
      `${o.sk ? '<span class="tg">스킬</span> ' : ''}${Ships.describe(o.mod)}<br><span class="st">${status}</span>`;
    buy.disabled = !can;
    buy.textContent = active ? '활성화됨' : '활성화 (' + cost + 'P)';
  }

  /* ---------- 연습 모드 설정 ---------- */
  function buildPractice() {
    const form = $('practice-form');
    form.innerHTML = '';
    if (!chapterUnlocked(pcfg.chapter)) pcfg.chapter = 0;
    const stg = CH_STAGES[pcfg.chapter];
    const finalBoss = BOSSES[finalOf(DIFFS[pcfg.diff], pcfg.chapter)];
    if (pcfg.target !== 'mid' && pcfg.target !== 'final' && (pcfg.target < 1 || pcfg.target > 5)) pcfg.target = 1;
    const groups = [
      { label: '챕터', key: 'chapter', items: [{ v: 0, t: '챕터 1' }, { v: 1, t: chapterUnlocked(1) ? '챕터 2' : '🔒 챕터 2', lock: !chapterUnlocked(1) }, { v: 2, t: chapterUnlocked(2) ? '챕터 3' : '🔒 챕터 3', lock: !chapterUnlocked(2) }] },
      { label: '난이도', key: 'diff', items: DIFF_ORDER.map(k => ({ v: k, t: DIFFS[k].name })) },
      { label: '스테이지', key: 'stage', items: [0, 1, 2].map(i => ({ v: i, t: 'STAGE ' + (i + 1) })) },
      { label: '구간', key: 'target', items: [1, 2, 3, 4, 5].map(n => ({ v: n, t: '웨이브 ' + n })).concat([
        { v: 'mid', t: '중간보스 · ' + BOSSES[stg[pcfg.stage].mid].name },
        { v: 'final', t: '최종보스' + (Store.data.cleared[ck(pcfg.diff, pcfg.chapter)] ? ' · ' + finalBoss.name : '') }
      ]) },
      { label: '업그레이드', key: 'ups', items: [{ v: false, t: '없음' }, { v: true, t: '진행 수준 지급' }] }
    ];
    groups.forEach((g, gi) => {
      const row = document.createElement('div'); row.className = 'prow';
      const lab = document.createElement('span'); lab.className = 'pl'; lab.textContent = g.label;
      const chips = document.createElement('div'); chips.className = 'chips';
      g.items.forEach((it, ii) => {
        const b = document.createElement('button');
        b.className = 'chip' + (pcfg[g.key] === it.v ? ' on' : '');
        b.textContent = it.t;
        if (it.lock) b.classList.add('locked');
        b.addEventListener('click', () => {
          Sound.init(); Sound.play('click');
          if (it.lock) return;
          pcfg[g.key] = it.v;
          buildPractice();
          const nb = form.querySelectorAll('.prow')[gi].querySelectorAll('.chip')[ii];
          if (nb) nb.focus({ preventScroll: true });
        });
        chips.appendChild(b);
      });
      row.appendChild(lab); row.appendChild(chips); form.appendChild(row);
    });
  }

  function practiceLabel() {
    const st = chTag(pcfg.chapter) + 'STAGE ' + (pcfg.stage + 1);
    if (pcfg.target === 'mid') return st + ' 중간보스 ' + BOSSES[CH_STAGES[pcfg.chapter][pcfg.stage].mid].name;
    if (pcfg.target === 'final') return chTag(pcfg.chapter) + '최종보스 ' + BOSSES[finalOf(DIFFS[pcfg.diff], pcfg.chapter)].name;
    return st + ' · WAVE ' + pcfg.target;
  }

  function startPracticeRun() {
    practiceMode = true; diffKey = pcfg.diff; cine = null;
    Input.clearPressed();
    Game.start(diffKey, { chapter: pcfg.chapter, stage: pcfg.stage, target: pcfg.target, ups: pcfg.ups }, shipKey);
    setState('PLAYING');
  }

  /* ---------- 설정 ---------- */
  function syncSettings() {
    $('v-sfx').value = Store.data.vol.sfx;
    $('v-bgm').value = Store.data.vol.bgm;
    $('o-shake').checked = !!Store.data.shake;
    $('o-cb').checked = !!Store.data.colorblind;
    $('o-intro').checked = !!Store.data.skipIntro;
  }
  $('v-sfx').addEventListener('input', e => { Store.data.vol.sfx = +e.target.value; Sound.applyVol(); Store.save(); });
  $('v-bgm').addEventListener('input', e => { Store.data.vol.bgm = +e.target.value; Sound.applyVol(); Store.save(); });
  $('o-shake').addEventListener('change', e => { Store.data.shake = e.target.checked; Store.save(); });
  $('o-cb').addEventListener('change', e => { Store.data.colorblind = e.target.checked; Bullets.buildSprites(); Store.save(); });
  $('o-intro').addEventListener('change', e => { Store.data.skipIntro = e.target.checked; Store.save(); });

  /* ---------- 진행 ---------- */
  function startRun() {
    practiceMode = false;
    Input.clearPressed();
    if (gameMode !== 'story' || Store.data.skipIntro) { beginPlay(); return; } // 도전·무한 모드는 인트로 없이 바로 시작
    cine = { lines: Story.chapters[gameChapter].introLines, t: 0, per: 2.6, next: beginPlay, title: gameChapter > 0 ? 'CHAPTER ' + (gameChapter + 1) + ' — ' + Story.chapters[gameChapter].title : '' };
    Sound.bgm('intro');
    setState('INTRO');
  }

  function beginPlay() {
    cine = null;
    Game.start(diffKey, null, shipKey, gameMode, gameChapter);
    setState('PLAYING');
  }

  function retry() { Sound.init(); if (practiceMode) startPracticeRun(); else startRun(); }

  function pause() {
    if (state !== 'PLAYING' && state !== 'COUNT') return; // 카운트다운 중에도 다시 일시정지할 수 있다
    setState('PAUSED');
  }
  // 일시정지에서 돌아오면 바로 시작하지 않고 3초 카운트다운 뒤에 재개한다
  let countT = 0;
  function resume() {
    if (state !== 'PAUSED') return;
    Input.clearPressed();
    countT = 3;
    setState('COUNT');
  }

  function buildPauseInfo() {
    const owned = UPGRADES.filter(u => Player.ups[u.id]).map(u => `${u.name} Lv${Player.ups[u.id]}`);
    $('pause-info').innerHTML = (practiceMode ? `연습 모드 · ${Player.shipDef.name} · ${DIFFS[diffKey].name} · ${practiceLabel()}<br>` :
      modePauseLine()) +
      `보유 업그레이드: ${owned.length ? owned.join(', ') : '없음'}`;
  }

  function modePauseLine() {
    const nm = Player.shipDef.name + ' · ' + DIFFS[diffKey].name;
    if (gameMode === 'endless') return `무한 모드 · ${nm} · LOOP ${Game.loop + 1} · ${Game.waveTotal}웨이브 돌파<br>`;
    if (gameMode === 'challenge') return `도전 모드 · ${nm} · STAGE ${Game.stageIdx + 1} (${Game.waveIdx >= 5 ? '최종보스' : '보스 ' + (Game.waveIdx + 1) + '/5'})<br>`;
    return `${Game.chapter > 0 ? 'CH.' + (Game.chapter + 1) + ' · ' : ''}${nm} · STAGE ${Game.stageIdx + 1} (${Game.phase === 'boss' ? 'BOSS' : 'WAVE ' + Math.min(5, Game.waveIdx + 1)})<br>`;
  }

  /* ---------- 업그레이드 선택 ---------- */
  Game.onUpgrade = choices => {
    const wrap = $('up-cards');
    wrap.innerHTML = '';
    choices.forEach((u, i) => {
      const b = document.createElement('button');
      b.className = 'ucard';
      b.innerHTML = `<div class="k">${i + 1}</div><div class="n">${u.name}</div><div class="d">${u.desc}</div><div class="l">Lv ${(Player.ups[u.id] || 0)} → ${(Player.ups[u.id] || 0) + 1} / ${u.max}</div>`;
      b.addEventListener('click', () => pickUpgrade(u.id));
      wrap.appendChild(b);
    });
    Input.clearPressed();
    setState('UPGRADE');
  };
  function pickUpgrade(id) {
    if (state !== 'UPGRADE') return;
    Game.pickUpgrade(id);
    Input.clearPressed();
    setState('PLAYING');
  }

  /* ---------- 클리어 / 게임 오버 ---------- */
  Game.onClear = () => {
    if (Game.practice || gameMode !== 'story') { showResult(); return; } // 연습·도전 모드: 아웃트로 없이 바로 결과
    Store.data.cleared[ck(diffKey, Game.chapter)] = true;
    cine = { lines: Story.chapters[Game.chapter].outro[diffKey], t: 0, per: 3.0, next: showResult, title: chTag(Game.chapter) + 'ENDING — ' + DIFFS[diffKey].name };
    Sound.bgm('outro');
    setState('OUTRO');
  };
  Game.onGameOver = () => { Sound.stopBgm(); showResult(); };

  function showResult() {
    cine = null;
    const cleared = !!(Game.result && Game.result.cleared);
    const D = DIFFS[diffKey];
    if (Game.practice) { // 연습 결과: 기록을 저장하지 않는다
      const pm = Math.floor(Game.runT / 60), ps = Math.floor(Game.runT % 60);
      $('r-title').textContent = '연습 종료';
      $('r-diff').textContent = Player.shipDef.name + ' · ' + D.name + ' · ' + practiceLabel();
      const prow = [['소요 시간', pm + '분 ' + String(ps).padStart(2, '0') + '초'], ['피격 횟수', Game.hits + '회'], ['격추', Game.kills + '기']];
      $('r-table').innerHTML = prow.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
      $('r-new').textContent = '';
      $('r-ups').textContent = '연습 모드의 기록은 저장되지 않습니다.';
      $('r-practice-btn').style.display = '';
      Sound.bgm('title');
      setState('RESULT');
      return;
    }
    $('r-practice-btn').style.display = 'none';
    if (gameMode !== 'story') { showModeResult(cleared, D); return; }
    let isNew = false;
    const rk = ck(diffKey, Game.chapter);
    if (Game.score > (Store.data.best[rk] || 0)) { Store.data.best[rk] = Game.score; isNew = true; }
    let newTime = false;
    if (cleared && (!Store.data.bestTime[rk] || Game.runT < Store.data.bestTime[rk])) { Store.data.bestTime[rk] = Game.runT; newTime = true; }
    Store.save();
    $('r-title').textContent = cleared ? (Game.chapter > 0 ? 'CHAPTER ' + (Game.chapter + 1) + ' CLEAR' : 'GAME CLEAR') : 'GAME OVER';
    $('r-diff').textContent = (Game.chapter > 0 ? 'CH.' + (Game.chapter + 1) + ' · ' : '') + Player.shipDef.name + ' · ' + D.name + ' · ' + (cleared ? BOSSES[Game.diffFinal()].name + ' 격파' : 'STAGE ' + (Game.stageIdx + 1) + '에서 쓰러짐');
    const mm = Math.floor(Game.runT / 60), ss = Math.floor(Game.runT % 60);
    const rows = [
      ['점수', Game.score.toLocaleString()],
      ['클리어 시간', mm + '분 ' + String(ss).padStart(2, '0') + '초'],
      ['피격 횟수', Game.hits + '회'],
      ['격추', Game.kills + '기']
    ];
    if (cleared) rows.push(['클리어 보너스', '+' + Game.result.bonus.toLocaleString()]);
    $('r-table').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    $('r-new').textContent = isNew ? '★ 신기록! ★' : (newTime ? '★ 최단 클리어 시간! ★' : '');
    const owned = UPGRADES.filter(u => Player.ups[u.id]).map(u => `${u.name} Lv${Player.ups[u.id]}`);
    $('r-ups').textContent = '선택한 업그레이드: ' + (owned.length ? owned.join(', ') : '없음');
    Sound.bgm('title');
    setState('RESULT');
  }

  // 도전 / 무한 모드 결과: 점수·진행도 기록
  function showModeResult(cleared, D) {
    const key = gameMode + ':' + diffKey;
    const old = Store.data.modeBest[key];
    const wave = Game.waveTotal;
    let isNew = false;
    const rec = Object.assign({ score: 0, time: 0, wave: 0 }, old);
    if (Game.score > rec.score) { rec.score = Game.score; isNew = true; }
    if (gameMode === 'endless') rec.wave = Math.max(rec.wave, wave);
    let newTime = false;
    if (gameMode === 'challenge' && cleared && (!rec.time || Game.runT < rec.time)) { rec.time = Game.runT; newTime = true; }
    Store.data.modeBest[key] = rec; Store.save();
    const nm = Player.shipDef.name + ' · ' + D.name;
    const rows = [['점수', Game.score.toLocaleString()]];
    if (gameMode === 'endless') {
      $('r-title').textContent = 'ENDLESS 종료';
      $('r-diff').textContent = nm + ' · LOOP ' + (Game.loop + 1) + ' STAGE ' + (Game.stageIdx + 1) + '에서 쓰러짐';
      rows.push(['돌파 웨이브', wave + '웨이브 (최고 ' + rec.wave + ')'], ['격파한 보스', Game.bossKills + '기']);
    } else {
      $('r-title').textContent = cleared ? 'CHALLENGE CLEAR' : 'GAME OVER';
      $('r-diff').textContent = nm + ' · ' + (cleared ? '모든 최종보스 격파' : 'STAGE ' + (Game.stageIdx + 1) + ' ' + (Game.waveIdx >= 5 ? '최종보스전' : '보스 ' + (Game.waveIdx + 1) + '/5') + '에서 쓰러짐');
      rows.push(['격파한 보스', Game.bossKills + '기 / 18기']);
      if (cleared) rows.push(['클리어 시간', fmtTime(Game.runT)], ['클리어 보너스', '+' + Game.result.bonus.toLocaleString()]);
    }
    if (gameMode === 'endless') rows.push(['플레이 시간', fmtTime(Game.runT)]);
    rows.push(['피격 횟수', Game.hits + '회'], ['격추', Game.kills + '기']);
    $('r-table').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    $('r-new').textContent = isNew ? '★ 신기록! ★' : (newTime ? '★ 최단 클리어 시간! ★' : '');
    const owned = UPGRADES.filter(u => Player.ups[u.id]).map(u => `${u.name} Lv${Player.ups[u.id]}`);
    $('r-ups').textContent = '선택한 업그레이드: ' + (owned.length ? owned.join(', ') : '없음');
    Sound.bgm('title');
    setState('RESULT');
  }

  /* ---------- 버튼 이벤트 ---------- */
  const ACTS = {
    start: () => { Sound.init(); Sound.play('click'); setState('MODE'); },
    story: () => { Sound.play('click'); gameMode = 'story'; setState('CHAPTER'); },
    chapter1: () => { Sound.play('click'); gameChapter = 0; setState('DIFF'); },
    chapter3: () => { if (!chapterUnlocked(2)) return; Sound.play('click'); gameChapter = 2; setState('DIFF'); },
    chapter2: () => { if (!chapterUnlocked(1)) return; Sound.play('click'); gameChapter = 1; setState('DIFF'); },
    chapterLocked: () => { Sound.play('click'); },
    log: () => { Sound.play('click'); setState('LOG'); },
    diffBack: () => { Sound.play('click'); setState(gameMode === 'story' ? 'CHAPTER' : 'MODE'); },
    challenge: () => { Sound.init(); Sound.play('click'); gameMode = 'challenge'; gameChapter = 0; setState('DIFF'); },
    endless: () => { Sound.init(); Sound.play('click'); gameMode = 'endless'; gameChapter = 0; setState('DIFF'); },
    ship: () => { Sound.play('click'); setState('SHIP'); },
    skills: () => { Sound.play('click'); skillShip = shipKey; skillSel = null; setState('SKILLS'); },
    skillsBack: () => { Sound.play('click'); setState('SHIP'); },
    skillBuy: () => {
      const ok = Ships.passive(skillShip, skillSel) ? Ships.buyPassive(skillShip, skillSel) : Ships.buyNode(skillShip, skillSel);
      if (ok) { Sound.play('pick'); renderSkills(); }
    },
    skillReset: () => { Sound.play('click'); Ships.reset(skillShip); skillSel = null; renderSkills(); },
    how: () => { Sound.play('click'); setState('HOW'); },
    settings: () => { Sound.play('click'); setState('SETTINGS'); },
    practice: () => { Sound.init(); Sound.play('click'); setState('PRACTICE'); },
    practiceStart: () => { Sound.play('click'); startPracticeRun(); },
    title: () => { Sound.play('click'); Sound.init(); cine = null; Bullets.clear(); setState('TITLE'); },
    resume: () => resume(),
    restart: () => { Sound.play('click'); retry(); },
    retry: () => { Sound.play('click'); retry(); }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    Sound.init();
    const f = ACTS[b.dataset.act];
    if (f) f();
  });
  $('btn-skill').addEventListener('touchstart', e => { Input.pressed.skillBtn = true; e.preventDefault(); }, { passive: false });
  $('btn-skill').addEventListener('mousedown', () => { Input.pressed.skillBtn = true; });
  $('btn-dash').addEventListener('touchstart', e => { Input.pressed.dashBtn = true; e.preventDefault(); }, { passive: false });
  $('btn-dash').addEventListener('mousedown', () => { Input.pressed.dashBtn = true; });
  $('btn-pause').addEventListener('click', pause);

  // 시네마틱 스킵 (클릭/Enter/Space)
  canvas.addEventListener('click', () => skipCine());
  // 모바일: input.js가 touchstart의 기본 동작을 막아 click이 생기지 않으므로 터치도 직접 처리한다
  canvas.addEventListener('touchstart', () => skipCine(), { passive: true });
  function skipCine() {
    if ((state === 'INTRO' || state === 'OUTRO') && cine) { const n = cine.next; cine = null; n(); }
  }

  // 메뉴에서 위/아래 키로 버튼 이동, 숫자 키로 업그레이드 선택
  window.addEventListener('keydown', e => {
    if (state === 'INTRO' || state === 'OUTRO') {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); skipCine(); }
      return;
    }
    if (state === 'PLAYING' || state === 'COUNT') {
      if (e.code === 'Escape' || e.code === 'KeyP') pause();
      return;
    }
    if (state === 'PAUSED') {
      if (e.code === 'Escape' || e.code === 'KeyP') resume();
    }
    if (state === 'UPGRADE') {
      const n = parseInt(e.key, 10);
      const c = Game.upgradeChoices;
      if (n >= 1 && c && c[n - 1]) pickUpgrade(c[n - 1].id);
    }
    if (state === 'RESULT' && e.code === 'KeyR') retry();
    if (state === 'SHIP' && e.key >= '1' && e.key <= '4') { selectShip(Ships.order[+e.key - 1]); buildShipCards(); }
    if (state === 'DIFF' && e.key >= '1' && e.key <= '4') {
      diffKey = DIFF_ORDER[+e.key - 1]; Sound.init(); startRun();
    }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      const vis = document.querySelector('.screen.show');
      if (!vis) return;
      const bs = Array.from(vis.querySelectorAll('button'));
      if (!bs.length) return;
      const i = bs.indexOf(document.activeElement);
      const d = e.code === 'ArrowDown' ? 1 : -1;
      bs[(i + d + bs.length) % bs.length].focus();
      e.preventDefault();
    }
  });

  // 포커스를 잃거나 탭을 전환하면 자동 일시정지
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ---------- 렌더 ---------- */
  function drawCine() {
    Game.drawBackdrop(ctx, time, 0, true, gameMode === 'story' ? gameChapter : 0);
    ctx.save();
    ctx.textAlign = 'center';
    const c = cine;
    if (c.title) { ctx.font = 'bold 20px ' + UI_FONT; ctx.fillStyle = '#ffe28a'; ctx.fillText(c.title, W / 2, 110); }
    const total = c.lines.length;
    const idx = Math.min(total - 1, Math.floor(c.t / c.per));
    // 줄바꿈된 높이를 먼저 계산해, 긴 문장이 두 줄로 꺾여도 다음 문장과 겹치지 않게 쌓는다.
    // 전체 높이는 모든 줄 기준으로 고정해서, 새 줄이 나타나도 앞 줄이 움직이지 않는다.
    const LH = 28, GAP = 30, MAXW = 520;
    const blocks = c.lines.map(line => {
      ctx.font = (line.startsWith('[') ? '' : 'bold ') + '18px ' + UI_FONT;
      return wrapLines(line, MAXW);
    });
    const totalH = blocks.reduce((s, b) => s + b.length * LH, 0) + GAP * (total - 1);
    let y = Math.max(150, (H - totalH) / 2 + 18);
    for (let i = 0; i < total; i++) {
      if (i <= idx) {
        const a = Math.min(1, (c.t - i * c.per) / 0.9);
        ctx.globalAlpha = i === idx ? a : 0.55;
        const line = c.lines[i];
        ctx.font = (line.startsWith('[') ? '' : 'bold ') + '18px ' + UI_FONT;
        ctx.fillStyle = line.startsWith('[') ? '#9fd8ff' : '#ffffff';
        blocks[i].forEach((t, k) => ctx.fillText(t, W / 2, y + k * LH));
      }
      y += blocks[i].length * LH + GAP;
    }
    ctx.restore();
    // 인트로: 아스트라 발진 연출
    if (c.next === beginPlay && idx === total - 1) {
      const k = Math.max(0, c.t - (total - 1) * c.per);
      Player.ship(ctx, W - 50, H - 60 - k * k * 14, Player.shipDef.color, true);
    }
  }
  // 현재 ctx.font 기준으로 maxW에 맞게 줄바꿈한 줄 배열을 돌려준다
  function wrapLines(text, maxW) {
    const out = [];
    let line = '';
    for (const w of text.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; }
      else line = t;
    }
    out.push(line);
    return out;
  }

  // 재개 카운트다운: 플레이 영역을 살짝 어둡게 하고 3·2·1을 크게 표시
  function drawCountdown() {
    const n = Math.max(1, Math.ceil(countT)), f = n - countT; // f: 이번 숫자가 나타난 뒤 경과(0~1)
    ctx.save();
    ctx.fillStyle = 'rgba(3,5,16,0.45)'; ctx.fillRect(0, 0, PW, H);
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.max(0.15, 1 - f * 0.85);
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#7fb8ff'; ctx.shadowBlur = 24;
    ctx.font = 'bold ' + Math.round(120 * (1 + (1 - Math.min(1, f * 3)) * 0.35)) + 'px ' + UI_FONT;
    ctx.fillText(String(n), PW / 2, H * 0.47);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.font = '15px ' + UI_FONT; ctx.fillStyle = '#cfd8ff';
    ctx.fillText('곧 재개합니다 · ESC로 다시 일시정지', PW / 2, H * 0.47 + 44);
    ctx.restore();
  }

  function renderBackground() {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    Game.drawBackdrop(ctx, time, state === 'TITLE' || state === 'DIFF' || state === 'HOW' || state === 'LOG' || state === 'SETTINGS' || state === 'MODE' || state === 'CHAPTER' || state === 'SHIP' || state === 'SKILLS' || state === 'PRACTICE' ? 0 : Game.stageIdx, true,
      state === 'DIFF' && gameMode === 'story' ? gameChapter : (state === 'PLAYING' || state === 'PAUSED' || state === 'UPGRADE' || state === 'RESULT' ? undefined : 0));
  }

  /* ---------- 메인 루프 (고정 60Hz 업데이트) ---------- */
  const DT = 1 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    let n = 0;
    while (acc >= DT && n < 5) {
      step(DT);
      acc -= DT; n++;
    }
    if (n === 5) acc = 0;
    draw();
    requestAnimationFrame(frame);
  }
  function step(dt) {
    time += dt;
    Game.updateBg(dt);
    if (state === 'PLAYING') Game.update(dt);
    else if (state === 'COUNT') { countT -= dt; if (countT <= 0) { Input.clearPressed(); Input.takeTouchMove(); setState('PLAYING'); } }
    else if (state === 'UPGRADE') { Game.time += dt; Game.updateFx(dt); }
    if ((state === 'INTRO' || state === 'OUTRO') && cine) {
      cine.t += dt;
      if (cine.t > cine.lines.length * cine.per + 1.2) { const n = cine.next; cine = null; n(); }
    }
    Input.clearPressedIfIdle && Input.clearPressedIfIdle();
  }
  function draw() {
    if ((state === 'INTRO' || state === 'OUTRO') && cine) { ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H); drawCine(); return; }
    if (state === 'PLAYING' || state === 'COUNT' || state === 'PAUSED' || state === 'UPGRADE' || state === 'RESULT') {
      if (state === 'RESULT' && !Game.result) { renderBackground(); return; }
      Game.render(ctx);
      if (state === 'COUNT') drawCountdown();
      return;
    }
    renderBackground();
  }

  setState('TITLE');
  requestAnimationFrame(frame);

  // 테스트용 훅 (헤드리스 검증에서 사용)
  window.__dm = { Game, Player, Bullets, Ships, setState, startRun, beginPlay, step, draw, getState: () => state, pickUpgrade,
    setDiff: k => { diffKey = k; }, setShip: k => selectShip(k), getShip: () => shipKey, setMode: m => { gameMode = m; }, setChapter: c => { gameChapter = c; } };
})();
