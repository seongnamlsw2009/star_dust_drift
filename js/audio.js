'use strict';
// Web Audio 합성 효과음 + 간단한 절차적 BGM (외부 음원 없음)
const Sound = (() => {
  let ctx = null, sfxG = null, bgmG = null, timer = null, step = 0, track = null, shotN = 0, curName = '';
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) { resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      sfxG = ctx.createGain(); bgmG = ctx.createGain();
      sfxG.connect(ctx.destination); bgmG.connect(ctx.destination);
      applyVol();
    } catch (e) { ctx = null; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function applyVol() {
    if (!ctx) return;
    sfxG.gain.value = Store.data.vol.sfx * 0.5;
    bgmG.gain.value = Store.data.vol.bgm * 0.3;
  }
  function tone(f, d, type, vol, slide, when, dest) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol == null ? 0.3 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, vol) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * d);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = vol == null ? 0.3 : vol;
    s.connect(g); g.connect(sfxG); s.start();
  }

  const SFX = {
    shot: () => { if ((shotN++ % 3) === 0) tone(980, 0.04, 'square', 0.035, -400); },
    hit: () => tone(300, 0.05, 'square', 0.05, -100),
    kill: () => { tone(220, 0.12, 'sawtooth', 0.12, -140); noise(0.1, 0.1); },
    die: () => { tone(260, 0.5, 'sawtooth', 0.25, -220); noise(0.4, 0.25); },
    dash: () => { tone(420, 0.16, 'triangle', 0.22, 700); noise(0.08, 0.08); },
    item: () => { tone(880, 0.06, 'square', 0.08); tone(1320, 0.08, 'square', 0.08, 0, 0.05); },
    wave: () => { tone(520, 0.1, 'triangle', 0.18); tone(780, 0.14, 'triangle', 0.18, 0, 0.09); },
    warn: () => { for (let i = 0; i < 3; i++) tone(200, 0.28, 'sawtooth', 0.22, 0, i * 0.5); },
    phase: () => { tone(330, 0.2, 'square', 0.2, 300); noise(0.2, 0.15); },
    boom: () => { noise(0.8, 0.45); tone(120, 0.8, 'sawtooth', 0.3, -80); },
    pick: () => { tone(660, 0.1, 'triangle', 0.25); tone(990, 0.18, 'triangle', 0.25, 0, 0.1); },
    ready: () => tone(740, 0.08, 'sine', 0.15),
    shield: () => { tone(500, 0.3, 'triangle', 0.25, -300); noise(0.15, 0.15); },
    clear: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.25, 0, i * 0.14)); },
    click: () => tone(600, 0.04, 'square', 0.1)
  };
  function play(n) { if (ctx && SFX[n]) { try { SFX[n](); } catch (e) { /* ignore */ } } }

  // BGM: 16스텝 시퀀서. 숫자는 root 기준 반음, null은 쉼표
  const TRACKS = {
    title:  { bpm: 84,  root: 57, wave: 'triangle', lead: [12,null,15,null,19,null,15,null,12,null,14,null,17,null,14,null], bass: [0,null,null,null,-5,null,null,null,-3,null,null,null,-7,null,null,null] },
    intro:  { bpm: 60,  root: 50, wave: 'sine',     lead: [12,null,null,null,null,null,10,null,null,null,null,null,7,null,null,null], bass: [0,null,null,null,null,null,null,null,-2,null,null,null,null,null,null,null] },
    stage1: { bpm: 126, root: 52, wave: 'square',   lead: [12,null,15,12,null,17,15,null,19,null,17,15,12,null,10,null], bass: [0,null,0,null,-5,null,-5,null,-3,null,-3,null,-7,null,-7,null] },
    stage2: { bpm: 132, root: 49, wave: 'sawtooth', lead: [12,15,null,19,17,null,15,12,null,14,17,null,19,22,null,19], bass: [0,null,7,null,-2,null,5,null,-4,null,3,null,-5,null,2,null] },
    stage3: { bpm: 138, root: 46, wave: 'sawtooth', lead: [12,null,13,null,15,null,13,null,12,null,10,null,13,null,12,null], bass: [0,0,null,0,-2,-2,null,-2,-4,-4,null,-4,-5,-5,null,-5] },
    c2s1:   { bpm: 120, root: 55, wave: 'triangle', lead: [12,null,14,null,17,null,19,null,17,null,14,null,12,null,9,null], bass: [0,null,null,0,-5,null,null,-5,-7,null,null,-7,-9,null,null,-9] },
    c2s2:   { bpm: 136, root: 50, wave: 'square',   lead: [12,15,17,null,19,17,15,null,12,15,19,null,22,19,17,null], bass: [0,null,0,null,-3,null,-3,null,-5,null,-5,null,-7,null,-7,null] },
    c2s3:   { bpm: 144, root: 47, wave: 'sawtooth', lead: [12,null,15,null,13,null,17,null,15,null,12,null,10,null,13,null], bass: [0,0,null,-2,-2,null,-5,-5,null,-7,-7,null,-8,-8,null,-10] },
    c3s1:   { bpm: 128, root: 53, wave: 'triangle', lead: [12,null,16,null,19,null,16,null,14,null,17,null,21,null,17,null], bass: [0,null,0,null,-4,null,-4,null,-2,null,-2,null,-5,null,-5,null] },
    c3s2:   { bpm: 140, root: 51, wave: 'square',   lead: [12,16,19,null,24,19,16,null,14,17,21,null,26,21,17,null], bass: [0,null,-5,null,0,null,-7,null,-2,null,-7,null,-3,null,-8,null] },
    c3s3:   { bpm: 150, root: 48, wave: 'sawtooth', lead: [12,null,15,null,18,null,15,null,13,null,16,null,19,null,16,12], bass: [0,0,null,0,-3,-3,null,-3,-5,-5,null,-5,-8,-8,null,-10] },
    final3: { bpm: 174, root: 43, wave: 'sawtooth', lead: [12,15,18,21,18,15,12,15,14,17,20,23,20,17,14,11], bass: [0,0,-4,-4,0,0,-6,-6,-8,-8,-4,-4,-9,-9,-6,-6] },
    final2: { bpm: 168, root: 44, wave: 'sawtooth', lead: [12,15,19,22,19,15,12,15,17,20,24,20,17,15,12,10], bass: [0,0,-3,-3,0,0,-5,-5,-7,-7,-3,-3,-8,-8,-5,-5] },
    mid:    { bpm: 150, root: 50, wave: 'square',   lead: [12,12,null,15,12,null,17,15,12,null,19,17,15,null,12,null], bass: [0,null,0,0,null,0,-5,null,-5,-5,null,-5,-3,null,-3,-3] },
    final:  { bpm: 160, root: 45, wave: 'sawtooth', lead: [12,15,19,15,12,15,20,15,12,14,17,14,12,14,19,14], bass: [0,0,null,0,0,null,0,0,-4,-4,null,-4,-7,-7,null,-7] },
    outro:  { bpm: 72,  root: 55, wave: 'triangle', lead: [12,null,16,null,19,null,24,null,23,null,19,null,16,null,12,null], bass: [0,null,null,null,-5,null,null,null,-8,null,null,null,-12,null,null,null] }
  };

  function stepOnce() {
    if (!ctx || !track) return;
    const i = step % 16; step++;
    const l = track.lead[i], b = track.bass[i];
    const d = 60 / track.bpm / 4;
    if (l != null) tone(hz(track.root + l), d * 1.8, track.wave, 0.5, 0, 0, bgmG);
    if (b != null) tone(hz(track.root + b - 12), d * 2.5, 'triangle', 0.7, 0, 0, bgmG);
    if (i % 4 === 0 && track.bpm > 100) tone(80, 0.08, 'sine', 0.7, -40, 0, bgmG); // 킥
  }
  function bgm(name) {
    if (!ctx || name === curName) return;
    stopBgm();
    track = TRACKS[name]; curName = name; step = 0;
    if (!track) return;
    timer = setInterval(stepOnce, 60 / track.bpm / 4 * 1000);
  }
  function stopBgm() { if (timer) clearInterval(timer); timer = null; track = null; curName = ''; }

  return { init, resume, applyVol, play, bgm, stopBgm };
})();
