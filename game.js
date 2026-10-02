/* Log Slasher — v1.0.0
 * Swipe the right way to slash each log before time runs out.
 * Pure Canvas 2D + Web Audio, no dependencies.
 */
(() => {
'use strict';

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- save
const SAVE_KEY = 'logslasher.v1';
const save = Object.assign({
  best: 0, games: 0, sfx: true, music: true, vib: true,
  lang: (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en',
  tutorialDone: false, seen: {},
}, (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } })());
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } }

// ---------------------------------------------------------------- i18n
const STR = {
  ko: {
    subtitle: '한 칼에 베어라', best: '최고 기록', play: '시작', how: '플레이 방법', settings: '설정',
    howNote: '제한 시간 안에 계속 베어 시간을 채우세요. 틀리면 시간이 깎이고 콤보가 끊깁니다. 콤보를 쌓아 FEVER를 발동하면 어느 방향으로 베어도 성공!',
    ok: '확인', sfx: '효과음', music: '배경음악', vibration: '진동', language: '언어', resetData: '기록 초기화',
    paused: '일시정지', resume: '계속하기', restart: '처음부터', home: '홈으로',
    newBest: '신기록!', logs: '벤 통나무', maxCombo: '최대 콤보', retry: '다시 하기', share: '공유',
    timeUp: '시간 초과!', boom: '펑!', stage: 'STAGE', fever: 'FEVER!', miss: 'MISS',
    resetConfirm: '최고 기록과 설정을 모두 초기화할까요?', resetDone: '초기화했어요', copied: '클립보드에 복사했어요',
    shareText: (s) => `Log Slasher에서 ${s}점을 기록했어요! 한 칼에 베어 보세요 🪵⚔️`,
    hV: '<b>위쪽 갈라짐</b> → 아래로 내려 베기', hL: '<b>왼쪽 홈</b> → 오른쪽으로 베기', hR: '<b>오른쪽 홈</b> → 왼쪽으로 베기',
    hH: '<b>쇠테 통나무</b> → 같은 방향으로 두 번', hB: '<b>화약통</b> → 위로 쳐내기! 다른 방향은 폭발', hG: '<b>황금 통나무</b> → 아무 방향이나 OK, 보너스',
    tV: '갈라진 틈! 아래로 베세요', tL: '왼쪽 홈! 오른쪽으로 베세요', tR: '오른쪽 홈! 왼쪽으로 베세요',
    tH: '쇠테가 감겼어요! 두 번 베세요', tB: '화약통! 위로 쳐내세요', tG: '황금 통나무! 아무 방향이나 베세요',
    tutorialDone: '준비 완료! 이제 시간이 흐릅니다', ready: 'READY',
    ranks: ['나무꾼 견습생', '장작 패는 자', '숲의 검객', '베기의 달인', '통나무 학살자', '검성', '전설의 나무꾼'],
  },
  en: {
    subtitle: 'ONE SWIPE, ONE CUT', best: 'BEST', play: 'PLAY', how: 'How to Play', settings: 'Settings',
    howNote: 'Keep slashing to refill the timer. A wrong cut costs time and breaks your combo. Build combo to trigger FEVER — then any direction works!',
    ok: 'OK', sfx: 'Sound FX', music: 'Music', vibration: 'Vibration', language: 'Language', resetData: 'Reset data',
    paused: 'Paused', resume: 'Resume', restart: 'Restart', home: 'Home',
    newBest: 'NEW BEST!', logs: 'Logs', maxCombo: 'Max combo', retry: 'Retry', share: 'Share',
    timeUp: "TIME'S UP!", boom: 'BOOM!', stage: 'STAGE', fever: 'FEVER!', miss: 'MISS',
    resetConfirm: 'Reset best score and all settings?', resetDone: 'Data reset', copied: 'Copied to clipboard',
    shareText: (s) => `I scored ${s} in Log Slasher! Can you beat it? 🪵⚔️`,
    hV: '<b>Split on top</b> → swipe down', hL: '<b>Notch on left</b> → swipe right', hR: '<b>Notch on right</b> → swipe left',
    hH: '<b>Iron-banded</b> → same swipe twice', hB: '<b>Powder keg</b> → swipe UP! Anything else explodes', hG: '<b>Golden log</b> → any direction, bonus',
    tV: 'A split! Swipe DOWN', tL: 'Notch on the left! Swipe RIGHT', tR: 'Notch on the right! Swipe LEFT',
    tH: 'Iron bands! Slash it twice', tB: 'Powder keg! Swipe UP', tG: 'Golden log! Any direction',
    tutorialDone: 'All set! The clock is ticking', ready: 'READY',
    ranks: ['Apprentice', 'Woodsplitter', 'Forest Blade', 'Slash Adept', 'Log Slayer', 'Sword Saint', 'Legend'],
  },
};
const RANK_SCORES = [0, 500, 1500, 3000, 6000, 10000, 16000];
const t = (k) => STR[save.lang][k];
function applyI18n() {
  document.documentElement.lang = save.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  buildHowList();
}

// ---------------------------------------------------------------- audio
const Audio = (() => {
  let ac = null, master, sfxBus, musicBus, noiseBuf;
  let musicOn = false, nextNote = 0, step = 0, schedTimer = null, melodyIdx = 7;
  const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic
  const ROOT = 146.83; // D3
  const freqOf = (deg) => ROOT * Math.pow(2, (SCALE[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applySettings();
  }
  function applySettings() {
    if (!ac) return;
    sfxBus.gain.value = save.sfx ? 1 : 0;
    if (save.music && wantMusic) startMusic(); else stopMusic();
  }
  const ok = () => ac && save.sfx;

  function env(g, t0, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  }
  function noise(t0, dur, type, f0, f1, q, peak, bus = sfxBus) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); env(g, t0, 0.004, peak, dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }
  function tone(t0, type, f0, f1, dur, peak, bus = sfxBus, attack = 0.004) {
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); env(g, t0, attack, peak, dur);
    o.connect(g).connect(bus);
    o.start(t0); o.stop(t0 + attack + dur + 0.05);
  }

  const sfx = {
    slash() { if (!ok()) return; const t0 = ac.currentTime; noise(t0, 0.13, 'bandpass', 5000, 900, 1.2, 0.5); },
    chop(combo) {
      if (!ok()) return; const t0 = ac.currentTime;
      tone(t0, 'sine', 210, 70, 0.12, 0.7);
      noise(t0, 0.06, 'lowpass', 2500, 400, 0.7, 0.45);
      const deg = 5 + Math.min(combo, 40) % 10;
      tone(t0 + 0.01, 'triangle', freqOf(deg) * 2, freqOf(deg) * 2, 0.18, 0.08);
    },
    clang() {
      if (!ok()) return; const t0 = ac.currentTime;
      [523, 1187, 1730, 2463].forEach((f, i) => tone(t0, i % 2 ? 'square' : 'sine', f, f * 0.98, 0.35 - i * 0.05, 0.09));
      noise(t0, 0.05, 'highpass', 4000, 3000, 0.7, 0.3);
    },
    wrong() {
      if (!ok()) return; const t0 = ac.currentTime;
      tone(t0, 'sawtooth', 150, 80, 0.28, 0.25);
      tone(t0, 'square', 155, 82, 0.28, 0.1);
      noise(t0, 0.1, 'lowpass', 800, 200, 1, 0.4);
    },
    boom(big = true) {
      if (!ok()) return; const t0 = ac.currentTime;
      noise(t0, big ? 1.1 : 0.45, 'lowpass', big ? 1800 : 2500, 60, 0.8, big ? 1 : 0.5);
      tone(t0, 'sine', 90, 28, big ? 0.9 : 0.4, big ? 0.9 : 0.4);
    },
    toss() { if (!ok()) return; const t0 = ac.currentTime; noise(t0, 0.25, 'bandpass', 600, 4000, 2, 0.35); tone(t0, 'sine', 300, 900, 0.2, 0.15); },
    gold() { if (!ok()) return; const t0 = ac.currentTime; [0, 2, 4, 7].forEach((d, i) => tone(t0 + i * 0.05, 'triangle', freqOf(10 + d), freqOf(10 + d), 0.3, 0.12)); },
    fever() { if (!ok()) return; const t0 = ac.currentTime; for (let i = 0; i < 8; i++) tone(t0 + i * 0.045, 'square', freqOf(5 + i), freqOf(5 + i), 0.18, 0.06); },
    levelUp() { if (!ok()) return; const t0 = ac.currentTime; [0, 2, 5].forEach((d, i) => tone(t0 + i * 0.09, 'triangle', freqOf(7 + d), freqOf(7 + d), 0.35, 0.14)); },
    over() { if (!ok()) return; const t0 = ac.currentTime; [7, 5, 3, 0].forEach((d, i) => tone(t0 + i * 0.16, 'triangle', freqOf(d), freqOf(d) * 0.99, 0.4, 0.16)); },
    click() { if (!ok()) return; tone(ac.currentTime, 'sine', 900, 600, 0.05, 0.12); },
    tick() { if (!ok()) return; tone(ac.currentTime, 'square', 1400, 1400, 0.03, 0.05); },
  };

  // --- generative music: taiko + koto-ish pluck on D minor pentatonic
  let wantMusic = false;
  function pluck(t0, f, vol) {
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine';
    o1.frequency.value = f; o2.frequency.value = f * 2.005;
    const filt = ac.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(f * 8, t0); filt.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + 0.4);
    const g = ac.createGain(); env(g, t0, 0.004, vol, 0.9);
    const g2 = ac.createGain(); g2.gain.value = 0.35;
    o1.connect(filt); o2.connect(g2).connect(filt); filt.connect(g).connect(musicBus);
    o1.start(t0); o2.start(t0); o1.stop(t0 + 1); o2.stop(t0 + 1);
  }
  function taiko(t0, vol) {
    tone(t0, 'sine', 120, 45, 0.35, vol, musicBus, 0.003);
    noise(t0, 0.08, 'lowpass', 600, 150, 0.7, vol * 0.4, musicBus);
  }
  function scheduler() {
    const intense = Game.fever > 0 ? 2 : Game.state === 'play' ? 1 : 0;
    const bpm = intense === 2 ? 132 : intense === 1 ? 104 + Math.min(Game.level, 10) * 2 : 84;
    const s16 = 60 / bpm / 4;
    while (nextNote < ac.currentTime + 0.12) {
      const st = step % 32;
      if (st % 8 === 0) taiko(nextNote, st === 0 ? 0.55 : 0.4);
      if (intense >= 1 && (st === 6 || st === 22 || st === 14)) taiko(nextNote, 0.22);
      if (intense === 2 && st % 2 === 1) noise(nextNote, 0.03, 'highpass', 8000, 7000, 0.7, 0.08, musicBus);
      if (st % 16 === 0) pluck(nextNote, freqOf(st === 0 ? -5 : -3), 0.2);
      const p = intense ? 0.55 : 0.32;
      if (st % 2 === 0 && Math.random() < p) {
        melodyIdx = clamp(melodyIdx + pick([-2, -1, -1, 1, 1, 2, 0]), 3, 13);
        pluck(nextNote, freqOf(melodyIdx), 0.13 + Math.random() * 0.05);
      }
      nextNote += s16; step++;
    }
  }
  function startMusic() {
    if (!ac || musicOn) return;
    musicOn = true; nextNote = ac.currentTime + 0.05; step = 0;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setValueAtTime(0.32, ac.currentTime);
    schedTimer = setInterval(scheduler, 25);
  }
  function stopMusic() { if (!musicOn) return; musicOn = false; clearInterval(schedTimer); }
  function setWantMusic(v) { wantMusic = v; applySettings(); }
  function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  return { init, sfx, applySettings, setWantMusic, suspend, resume };
})();

const vibrate = (p) => { if (save.vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } };

// ---------------------------------------------------------------- canvas & layout
const cvs = $('game');
const ctx = cvs.getContext('2d');
let W = 0, H = 0, DPR = 1, safeTop = 0, safeBottom = 0;
const L = {}; // layout
let mountains = [], trees = [], stars = [];

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
  const cs = getComputedStyle($('safe'));
  safeTop = parseFloat(cs.paddingTop) || 0; safeBottom = parseFloat(cs.paddingBottom) || 0;

  L.horizon = H * 0.43;
  L.ground = H * 0.79;
  L.logW = Math.min(W * 0.46, H * 0.25, 260);
  L.logH = L.logW * 1.12;
  spriteCache.clear();

  const r = mulberry(7);
  mountains = [0, 1].map((layer) => {
    const pts = []; const n = 14;
    const base = L.horizon - (layer ? H * 0.02 : H * 0.07);
    const amp = layer ? H * 0.06 : H * 0.11;
    for (let i = 0; i <= n; i++) pts.push([W * i / n, base - Math.abs(Math.sin(i * 1.3 + layer * 2 + r() * 2)) * amp - r() * amp * 0.3]);
    return pts;
  });
  trees = [];
  for (let x = -10; x < W + 20; x += rand(10, 26)) trees.push([x, rand(H * 0.025, H * 0.06)]);
  stars = [];
  for (let i = 0; i < 70; i++) stars.push([r() * W, r() * L.horizon * 0.9, r() * 1.4 + 0.3, r() * 6]);
}

function slotRect(p) {
  const s = 1 / (1 + 0.5 * p);
  const w = L.logW * s, h = L.logH * s;
  const bottom = L.horizon + (L.ground - L.horizon) * s;
  return { x: W / 2 - w / 2, y: bottom - h, w, h, s };
}

// ---------------------------------------------------------------- log sprites
const spriteCache = new Map();
const WOOD = { dark: '#4a2715', mid: '#8b552f', light: '#b67a45', top: '#e8be8a', ring: '#c4925e', rim: '#5a311a', inner: '#f3d2a2' };
const GOLD = { dark: '#7a4e08', mid: '#d9a520', light: '#ffe27a', top: '#fff0b0', ring: '#e6bb45', rim: '#9a6510', inner: '#fff6cf' };
const NOTCH_Y = 0.56; // notch height as fraction of body

function getSprite(kind, hard, variant) {
  const key = kind + hard + variant;
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(L.logW * DPR); c.height = Math.ceil(L.logH * DPR);
    drawLogSprite(c.getContext('2d'), c.width, c.height, kind, hard, variant);
    spriteCache.set(key, c);
  }
  return c;
}

function logGeom(w, h) { const e = w * 0.26; return { e, top: e / 2, bodyH: h - e, notchY: e / 2 + (h - e) * NOTCH_Y }; }

function drawLogSprite(g, w, h, kind, hard, variant) {
  if (kind === 'B') return drawKeg(g, w, h);
  const P = kind === 'G' ? GOLD : WOOD;
  const { e, notchY } = logGeom(w, h);
  const rx = w / 2 - w * 0.02, cx = w / 2;
  const r = mulberry(31 + variant * 97 + (kind === 'G' ? 5 : 0));

  // body
  g.save();
  g.beginPath();
  g.moveTo(cx - rx, e / 2);
  g.lineTo(cx - rx, h - e / 2);
  g.ellipse(cx, h - e / 2, rx, e / 2 - 1, 0, Math.PI, 0, true);
  g.lineTo(cx + rx, e / 2);
  g.closePath();
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, P.dark); grad.addColorStop(0.18, P.mid); grad.addColorStop(0.38, P.light);
  grad.addColorStop(0.62, P.mid); grad.addColorStop(1, P.dark);
  g.fillStyle = grad; g.fill();
  g.clip();
  // bark lines
  g.lineCap = 'round';
  for (let i = 0; i < 13; i++) {
    const x = r() * w, wob = w * 0.04;
    g.strokeStyle = `rgba(30,12,4,${0.25 + r() * 0.3})`;
    g.lineWidth = w * (0.01 + r() * 0.022);
    g.beginPath();
    g.moveTo(x, e * 0.3);
    g.bezierCurveTo(x + rand(-wob, wob), h * 0.35, x + (r() - 0.5) * wob * 2, h * 0.7, x + (r() - 0.5) * wob, h);
    g.stroke();
  }
  for (let i = 0; i < 5; i++) { // knots
    const kx = cx + (r() - 0.5) * w * 0.6, ky = e + r() * (h - e * 1.6);
    if (Math.abs(ky - notchY) < h * 0.15) continue;
    g.fillStyle = 'rgba(40,16,6,0.45)';
    g.beginPath(); g.ellipse(kx, ky, w * 0.035, w * 0.06, 0, 0, Math.PI * 2); g.fill();
  }
  // bottom shade
  const sh = g.createLinearGradient(0, h * 0.6, 0, h);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);

  if (hard) drawBands(g, w, h, e, [0.2, 0.86]);

  // side notches
  if (kind === 'L' || kind === 'R') {
    const dir = kind === 'L' ? 1 : -1;
    const x0 = kind === 'L' ? cx - rx - 1 : cx + rx + 1;
    const depth = w * 0.36, nh = h * 0.12;
    g.beginPath();
    g.moveTo(x0, notchY - nh); g.lineTo(x0 + dir * depth, notchY); g.lineTo(x0, notchY + nh * 0.75); g.closePath();
    const ng = g.createLinearGradient(x0, notchY - nh, x0, notchY + nh);
    ng.addColorStop(0, P.inner); ng.addColorStop(0.55, P.top); ng.addColorStop(0.56, '#7a4a28'); ng.addColorStop(1, '#5a3218');
    g.fillStyle = ng; g.fill();
    g.strokeStyle = '#2a1206'; g.lineWidth = w * 0.022; g.lineJoin = 'round'; g.stroke();
    // chip marks around notch
    g.strokeStyle = 'rgba(255,230,190,0.5)'; g.lineWidth = w * 0.012;
    g.beginPath(); g.moveTo(x0 + dir * depth * 0.2, notchY - nh * 1.15); g.lineTo(x0 + dir * depth * 0.5, notchY - nh * 0.7); g.stroke();
  }
  g.restore();

  // top face
  g.fillStyle = P.rim;
  g.beginPath(); g.ellipse(cx, e / 2, rx, e / 2 - 1, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = P.top;
  g.beginPath(); g.ellipse(cx, e / 2, rx * 0.88, e / 2 * 0.8, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = P.ring; g.lineWidth = Math.max(1, w * 0.008);
  for (let k = 1; k <= 4; k++) { g.beginPath(); g.ellipse(cx + w * 0.02, e / 2, rx * 0.88 * k / 5, e / 2 * 0.8 * k / 5, 0, 0, Math.PI * 2); g.stroke(); }

  if (kind === 'V') {
    // split across top & down the front
    g.fillStyle = '#1e0c04';
    g.beginPath();
    g.moveTo(cx - rx * 0.92, e / 2 - 1);
    g.lineTo(cx - rx * 0.4, e / 2 - e * 0.06); g.lineTo(cx, e / 2 + e * 0.04); g.lineTo(cx + rx * 0.45, e / 2 - e * 0.04);
    g.lineTo(cx + rx * 0.92, e / 2 - 1);
    g.lineTo(cx + rx * 0.45, e / 2 + e * 0.06); g.lineTo(cx, e / 2 + e * 0.16); g.lineTo(cx - rx * 0.4, e / 2 + e * 0.04);
    g.closePath(); g.fill();
    const y0 = e * 0.85, y1 = e / 2 + (h - e) * 0.5, hw = w * 0.07;
    g.beginPath();
    g.moveTo(cx - hw, y0); g.lineTo(cx + hw, y0);
    g.lineTo(cx + hw * 0.35, y0 + (y1 - y0) * 0.35); g.lineTo(cx + hw * 0.6, y0 + (y1 - y0) * 0.55);
    g.lineTo(cx, y1);
    g.lineTo(cx - hw * 0.2, y0 + (y1 - y0) * 0.6); g.lineTo(cx - hw * 0.55, y0 + (y1 - y0) * 0.3);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,220,170,0.55)'; g.lineWidth = w * 0.01; g.stroke();
  }
  if (kind === 'G') {
    drawStar(g, cx, e / 2 + (h - e) * 0.5, w * 0.17, '#fffbe6', '#b67a10');
  }
}

function drawBands(g, w, h, e, ys) {
  ys.forEach((fy) => {
    const y = e / 2 + (h - e) * fy, bh = h * 0.075;
    const bg = g.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, '#2c3036'); bg.addColorStop(0.35, '#c9d0d8'); bg.addColorStop(0.5, '#8a929c'); bg.addColorStop(1, '#2c3036');
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(0, y - bh / 2);
    g.quadraticCurveTo(w / 2, y - bh / 2 + e * 0.35, w, y - bh / 2);
    g.lineTo(w, y + bh / 2);
    g.quadraticCurveTo(w / 2, y + bh / 2 + e * 0.35, 0, y + bh / 2);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = w * 0.01; g.stroke();
    g.fillStyle = '#e8eef5';
    [0.25, 0.5, 0.75].forEach((fx) => {
      const ry = y + e * 0.35 * (1 - Math.pow((fx - 0.5) * 2, 2)) * 0.5;
      g.beginPath(); g.arc(w * fx, ry, w * 0.018, 0, Math.PI * 2); g.fill();
    });
  });
}

function drawStar(g, x, y, R, fill, stroke) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fillStyle = fill; g.fill();
  g.lineWidth = R * 0.14; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke();
}

function drawKeg(g, w, h) {
  const top = h * 0.18, e = w * 0.22, cx = w / 2, rxT = w * 0.38, bulge = w * 0.49;
  // fuse
  g.strokeStyle = '#3a2a1a'; g.lineWidth = w * 0.035; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, top); g.quadraticCurveTo(cx + w * 0.02, top - h * 0.1, cx + w * 0.12, top - h * 0.13); g.stroke();
  g.strokeStyle = '#d8c39a'; g.lineWidth = w * 0.015; g.setLineDash([w * 0.02, w * 0.02]); g.stroke(); g.setLineDash([]);
  // body
  g.save();
  g.beginPath();
  g.moveTo(cx - rxT, top);
  g.quadraticCurveTo(cx - bulge * 1.18, (top + h) / 2, cx - rxT, h - e / 2);
  g.ellipse(cx, h - e / 2, rxT, e / 2 - 1, 0, Math.PI, 0, true);
  g.quadraticCurveTo(cx + bulge * 1.18, (top + h) / 2, cx + rxT, top);
  g.closePath();
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#4a0b0b'); grad.addColorStop(0.35, '#d23a2a'); grad.addColorStop(0.5, '#b42a20'); grad.addColorStop(1, '#4a0b0b');
  g.fillStyle = grad; g.fill(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = w * 0.012;
  for (let i = 1; i < 7; i++) { const x = w * i / 7; g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(cx + (x - cx) * 1.25, (top + h) / 2, x, h); g.stroke(); }
  [0.12, 0.88].forEach((fy) => {
    const y = top + (h - top) * fy;
    g.fillStyle = '#1b1b1f';
    g.beginPath(); g.moveTo(0, y - h * 0.035); g.quadraticCurveTo(cx, y - h * 0.035 + e * 0.6, w, y - h * 0.035);
    g.lineTo(w, y + h * 0.035); g.quadraticCurveTo(cx, y + h * 0.035 + e * 0.6, 0, y + h * 0.035); g.fill();
  });
  // skull emblem
  const sy = top + (h - top) * 0.5, sr = w * 0.15;
  g.fillStyle = '#f7efe0';
  g.beginPath(); g.arc(cx, sy - sr * 0.15, sr, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - sr * 0.55, sy + sr * 0.5, sr * 1.1, sr * 0.55);
  g.fillStyle = '#2a0808';
  g.beginPath(); g.arc(cx - sr * 0.4, sy - sr * 0.1, sr * 0.28, 0, Math.PI * 2); g.arc(cx + sr * 0.4, sy - sr * 0.1, sr * 0.28, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx, sy + sr * 0.15); g.lineTo(cx - sr * 0.12, sy + sr * 0.4); g.lineTo(cx + sr * 0.12, sy + sr * 0.4); g.fill();
  g.restore();
  // lid
  g.fillStyle = '#3a1f10';
  g.beginPath(); g.ellipse(cx, top, rxT, e / 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a5a32';
  g.beginPath(); g.ellipse(cx, top, rxT * 0.86, e / 2 * 0.75, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = w * 0.01;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * rxT * 0.3, top - e * 0.33); g.lineTo(cx + i * rxT * 0.3, top + e * 0.33); g.stroke(); }
}
const KEG_FUSE = (w, h) => ({ x: w / 2 + w * 0.12, y: h * 0.18 - h * 0.13 });

// ---------------------------------------------------------------- game state
const DIR_FOR = { V: 'down', L: 'right', R: 'left', B: 'up' };
const ARROW = { down: '↓', right: '→', left: '←', up: '↑' };
const Game = {
  state: 'title', // title | play | paused | dying | over
  queue: [], score: 0, combo: 0, maxCombo: 0, cuts: 0, level: 1,
  time: 0.7, started: false, fever: 0, feverGauge: 0, stun: 0, grace: 0,
  tutorial: false, tutorialStep: 0, dyingT: 0, overReason: '',
  displayScore: 0, comboPop: 0, levelBanner: 0, feverBanner: 0, hintPulse: 0,
  shake: 0, flash: 0, flashColor: '#fff', frontJolt: 0, frontTint: 0, shift: 0, demoT: 0, slowmo: 1,
  bgPhase: 1, bgTarget: 1, prevKind: '',
};
let pieces = [], particles = [], floaters = [], slashes = [], trail = [], petals = [];
let nextId = 1;

const TUTORIAL_SEQ = ['V', 'L', 'R', 'V', 'R', 'L', 'V'];

function makeLog(kind, hard = 0) { return { id: nextId++, kind, hard, variant: (Math.random() * 3) | 0 }; }

function genLog() {
  const lv = Game.level;
  const roll = Math.random();
  const pBomb = lv >= 3 && Game.prevKind !== 'B' ? Math.min(0.07 + 0.012 * (lv - 3), 0.15) : 0;
  const pGold = lv >= 2 ? 0.03 : 0;
  let log;
  if (roll < pBomb) log = makeLog('B');
  else if (roll < pBomb + pGold) log = makeLog('G');
  else {
    const kind = pick(['V', 'L', 'R']);
    const pHard = lv >= 2 ? Math.min(0.08 + 0.02 * (lv - 2), 0.22) : 0;
    log = makeLog(kind, Math.random() < pHard ? 1 : 0);
  }
  Game.prevKind = log.kind;
  return log;
}

function fillQueue() {
  while (Game.queue.length < 7) {
    if (Game.tutorial && Game.tutorialStep + Game.queue.length < TUTORIAL_SEQ.length) {
      Game.queue.push(makeLog(TUTORIAL_SEQ[Game.tutorialStep + Game.queue.length]));
    } else Game.queue.push(genLog());
  }
}

function hintFor(log) {
  if (!log || Game.state !== 'play') return null;
  if (Game.tutorial && Game.tutorialStep < TUTORIAL_SEQ.length) return log.kind;
  if (log.kind === 'B' && !save.seen.B) return 'B';
  if (log.kind === 'G' && !save.seen.G) return 'G';
  if (log.hard && !save.seen.H) return 'H';
  return null;
}

function resetRun() {
  Object.assign(Game, {
    queue: [], score: 0, combo: 0, maxCombo: 0, cuts: 0, level: 1, time: 0.75, started: false,
    fever: 0, feverGauge: 0, stun: 0, grace: 0, dyingT: 0, displayScore: 0, comboPop: 0,
    levelBanner: 0, feverBanner: 0, shake: 0, flash: 0, frontJolt: 0, frontTint: 0, shift: 0, slowmo: 1,
    bgTarget: 0, prevKind: '',
  });
  Game.tutorial = !save.tutorialDone; Game.tutorialStep = 0;
  pieces = []; particles = []; floaters = []; slashes = []; trail = [];
  fillQueue();
}

function startGame() {
  Audio.init();
  resetRun();
  Game.state = 'play';
  Game.grace = 0.35;
  showScreen(null);
  $('btnPause').classList.remove('hidden');
  Audio.setWantMusic(true);
}

function frontRect() {
  const r = slotRect(Game.shift);
  const j = Game.frontJolt;
  r.x += Math.sin(j * 60) * j * 30;
  return r;
}

function scoreFor() { return 10 * Math.min(1 + Math.floor(Game.combo / 20), 5) * (Game.fever > 0 ? 2 : 1); }

function handleSwipe(dir) {
  if (Game.state !== 'play' || Game.stun > 0) return;
  const log = Game.queue[0];
  if (!log) return;
  const fever = Game.fever > 0;
  const hint = hintFor(log);

  let correct = log.kind === 'G' || DIR_FOR[log.kind] === dir || fever;
  if (log.kind === 'B') correct = dir === 'up' || fever;

  if (!correct) {
    if (log.kind === 'B' && hint !== 'B') { explodeFront(); return; }
    wrongCut(!!hint);
    return;
  }

  if (log.hard && !fever) { // break the bands first
    log.hard = 0;
    const r = frontRect();
    Audio.sfx.clang(); vibrate(15);
    Game.frontJolt = 0.12; Game.shake = Math.max(Game.shake, 5);
    for (let i = 0; i < 18; i++) spark(r.x + r.w * rand(0.1, 0.9), r.y + r.h * pick([0.25, 0.87]), '#ffe9a0');
    addSlash(dir, r);
    Game.time = Math.min(1, Game.time + 0.02);
    if (hint === 'H') { save.seen.H = true; persist(); }
    return;
  }

  const r = frontRect();
  Game.queue.shift();
  Game.shift = 1;
  fillQueue();
  addSlash(dir, r);
  Audio.sfx.slash();

  if (log.kind === 'B') {
    tossKeg(log, r);
    Game.time = Math.min(1, Game.time + 0.05);
    if (hint === 'B') { save.seen.B = true; persist(); }
  } else {
    cutPieces(log, r, dir);
    Audio.sfx.chop(Game.combo);
    vibrate(8);
    if (log.kind === 'G') {
      Audio.sfx.gold();
      Game.time = Math.min(1, Game.time + 0.12);
      Game.score += 50;
      floatText('+50', r.x + r.w / 2, r.y - 10, '#ffe066', 30);
      for (let i = 0; i < 24; i++) spark(r.x + r.w / 2, r.y + r.h / 2, pick(['#fff3a0', '#ffd23f', '#ffffff']), 500);
      if (hint === 'G') { save.seen.G = true; persist(); }
    }
  }

  Game.combo++; Game.maxCombo = Math.max(Game.maxCombo, Game.combo); Game.comboPop = 1;
  Game.cuts++;
  const pts = scoreFor();
  Game.score += pts;
  Game.time = Math.min(1, Game.time + (fever ? 0.03 : 0.052));
  if (!Game.started && !Game.tutorial) Game.started = true;
  if (!fever) {
    Game.feverGauge += 1 / 30;
    if (Game.feverGauge >= 1) startFever();
  }
  if (Game.combo > 0 && Game.combo % 25 === 0) floatText(`${Game.combo} COMBO!`, W / 2, Math.min(L.ground + 40, H - safeBottom - 60), '#ffd56b', 34, 1.1);

  if (Game.tutorial) {
    Game.tutorialStep++;
    if (Game.tutorialStep >= TUTORIAL_SEQ.length) {
      Game.tutorial = false; save.tutorialDone = true; persist();
      Game.score = 0; Game.cuts = 0; Game.combo = 0; Game.time = 0.75; Game.grace = 1.2;
      floatText(t('tutorialDone'), W / 2, L.horizon + 30, '#ffffff', 24, 2);
      Audio.sfx.levelUp();
    }
  }

  const lv = 1 + Math.floor(Game.cuts / 20);
  if (lv !== Game.level) {
    Game.level = lv; Game.levelBanner = 1;
    Game.bgTarget = (lv - 1) * 0.5;
    Audio.sfx.levelUp();
  }
}

function wrongCut(isHint) {
  const r = frontRect();
  Audio.sfx.wrong(); vibrate(isHint ? 20 : [30, 30, 30]);
  Game.frontJolt = 0.25; Game.frontTint = 1; Game.shake = 10;
  floatText(t('miss'), r.x + r.w / 2, r.y - 10, '#ff6b6b', 30);
  if (isHint || Game.tutorial) return;
  Game.time -= 0.14;
  Game.combo = 0; Game.feverGauge = Math.max(0, Game.feverGauge - 0.5);
  Game.stun = 0.18;
  Game.flash = 0.35; Game.flashColor = '#ff3030';
  if (Game.time <= 0) die('time');
}

function explodeFront() {
  const r = frontRect();
  const log = Game.queue.shift(); fillQueue();
  explosion(r.x + r.w / 2, r.y + r.h * 0.55, 1.6);
  Audio.sfx.boom(true); vibrate([80, 40, 160]);
  Game.flash = 1; Game.flashColor = '#fff1c0'; Game.shake = 26;
  for (let i = 0; i < 6; i++) {
    const spr = getSprite(log.kind, 0, log.variant);
    const sx = (i % 3) * spr.width / 3, sy = Math.floor(i / 3) * spr.height / 2;
    pieces.push({ img: spr, sx, sy, sw: spr.width / 3, sh: spr.height / 2,
      x: r.x + r.w * ((i % 3) / 3 + 1 / 6), y: r.y + r.h * (Math.floor(i / 3) / 2 + 0.25), w: r.w / 3, h: r.h / 2,
      vx: rand(-900, 900), vy: rand(-1300, -500), rot: 0, vr: rand(-14, 14), alpha: 1, gravity: 2600 });
  }
  die('boom');
}

function die(reason) {
  if (Game.state !== 'play') return;
  Game.state = 'dying'; Game.dyingT = 0; Game.overReason = reason;
  Game.time = Math.max(0, Game.time);
  if (reason === 'time') { Audio.sfx.wrong(); vibrate(60); }
  $('btnPause').classList.add('hidden');
}

function finishGame() {
  Game.state = 'over';
  Audio.sfx.over();
  save.games++;
  const isBest = Game.score > save.best;
  if (isBest) save.best = Game.score;
  persist();
  $('overReason').textContent = Game.overReason === 'boom' ? t('boom') : t('timeUp');
  $('overScore').textContent = Game.score.toLocaleString();
  $('overBest').textContent = save.best.toLocaleString();
  $('overLogs').textContent = Game.cuts;
  $('overCombo').textContent = Game.maxCombo;
  let ri = 0; RANK_SCORES.forEach((s, i) => { if (Game.score >= s) ri = i; });
  $('overRank').textContent = t('ranks')[ri];
  $('newBest').classList.toggle('hidden', !isBest || Game.score === 0);
  showScreen('scrOver');
}

function startFever() {
  Game.fever = 6; Game.feverGauge = 1; Game.feverBanner = 1;
  Audio.sfx.fever(); vibrate([20, 30, 20]);
  Game.flash = 0.5; Game.flashColor = '#ffd36b';
}

// ---------------------------------------------------------------- effects
function addSlash(dir, r) {
  const cx = r.x + r.w / 2;
  const { notchY } = logGeom(r.w, r.h);
  let x0, y0, x1, y1;
  if (dir === 'down') { x0 = cx + r.w * 0.05; y0 = r.y - r.h * 0.25; x1 = cx - r.w * 0.05; y1 = r.y + r.h * 1.1; }
  else if (dir === 'up') { x0 = cx - r.w * 0.1; y0 = r.y + r.h * 1.1; x1 = cx + r.w * 0.1; y1 = r.y - r.h * 0.4; }
  else {
    const y = r.y + notchY; const s = dir === 'right' ? 1 : -1;
    x0 = cx - s * r.w * 0.85; y0 = y + r.h * 0.06; x1 = cx + s * r.w * 0.85; y1 = y - r.h * 0.06;
  }
  slashes.push({ x0, y0, x1, y1, t: 0, gold: Game.fever > 0 });
}

function cutPieces(log, r, dir) {
  const spr = getSprite(log.kind, 0, log.variant);
  const SW = spr.width, SH = spr.height;
  const k = r.w / SW;
  const vertical = dir === 'down' || dir === 'up';
  if (vertical) {
    [-1, 1].forEach((s) => {
      pieces.push({ img: spr, sx: s < 0 ? 0 : SW / 2, sy: 0, sw: SW / 2, sh: SH,
        x: r.x + r.w / 2 + s * r.w / 4, y: r.y + r.h / 2, w: r.w / 2, h: r.h,
        vx: s * rand(380, 520), vy: rand(-520, -380), rot: 0, vr: s * rand(3, 5), alpha: 1, gravity: 2400 });
    });
  } else {
    const s = dir === 'right' ? 1 : -1;
    const { notchY } = logGeom(SW, SH);
    pieces.push({ img: spr, sx: 0, sy: 0, sw: SW, sh: notchY,
      x: r.x + r.w / 2, y: r.y + notchY * k / 2, w: r.w, h: notchY * k,
      vx: s * rand(900, 1150), vy: rand(-620, -450), rot: 0, vr: s * rand(6, 9), alpha: 1, gravity: 2400 });
    pieces.push({ img: spr, sx: 0, sy: notchY, sw: SW, sh: SH - notchY,
      x: r.x + r.w / 2, y: r.y + (notchY + (SH - notchY) / 2) * k, w: r.w, h: (SH - notchY) * k,
      vx: s * 60, vy: 0, rot: 0, vr: 0, alpha: 1, gravity: 0, sink: true });
  }
  const cx = r.x + r.w / 2, cy = vertical ? r.y + r.h * 0.3 : r.y + logGeom(r.w, r.h).notchY;
  const cols = log.kind === 'G' ? ['#ffe27a', '#fff6cf', '#d9a520'] : ['#f3d2a2', '#c4925e', '#8b552f', '#e8be8a'];
  for (let i = 0; i < 16; i++) {
    const a = vertical ? rand(-Math.PI, 0) : (dir === 'right' ? rand(-1.2, 0.2) : rand(Math.PI - 0.2, Math.PI + 1.2));
    const sp = rand(250, 750);
    particles.push({ x: cx + rand(-10, 10), y: cy + rand(-10, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.8), max: 0.8,
      size: rand(3, 8), color: pick(cols), rot: rand(0, 6), vr: rand(-15, 15), gravity: 1600, kind: 'chip' });
  }
}

function tossKeg(log, r) {
  const spr = getSprite('B', 0, 0);
  if (Game.state !== 'play') { pieces.push({ img: spr, sx: 0, sy: 0, sw: spr.width, sh: spr.height, x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h, vx: rand(-150, 150), vy: -1700, rot: 0, vr: rand(-8, 8), alpha: 1, gravity: 900, explodeIn: 0.42 }); return; }
  Audio.sfx.toss(); vibrate(12);
  pieces.push({ img: spr, sx: 0, sy: 0, sw: spr.width, sh: spr.height, x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h,
    vx: rand(-150, 150), vy: -1700, rot: 0, vr: rand(-8, 8), alpha: 1, gravity: 900, explodeIn: 0.42 });
}

function spark(x, y, color, speed = 400) {
  const a = rand(0, Math.PI * 2), sp = rand(speed * 0.3, speed);
  particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: rand(0.25, 0.55), max: 0.55, size: rand(2, 4), color, gravity: 900, kind: 'spark' });
}

function explosion(x, y, scale) {
  for (let i = 0; i < 40 * scale; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(100, 900) * scale;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.8), max: 0.8, size: rand(4, 10) * scale,
      color: pick(['#fff3b0', '#ffb347', '#ff6a2a', '#ff3d1f']), gravity: 300, kind: 'fire' });
  }
  for (let i = 0; i < 14 * scale; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(40, 260) * scale;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: rand(0.8, 1.5), max: 1.5, size: rand(14, 30) * scale,
      color: '#3a3038', gravity: -60, kind: 'smoke' });
  }
  particles.push({ x, y, life: 0.35, max: 0.35, size: 120 * scale, kind: 'ring', vx: 0, vy: 0, gravity: 0, color: '#fff' });
}

function floatText(text, x, y, color, size, life = 0.9) {
  floaters.push({ text, x, y, color, size, life, max: life });
}

// ---------------------------------------------------------------- update
function update(dt) {
  const g = Game;
  g.hintPulse += dt;
  if (g.state === 'dying') {
    g.dyingT += dt;
    g.slowmo = lerp(g.slowmo, 0.25, 0.1);
    if (g.dyingT > 1.1) finishGame();
  } else g.slowmo = lerp(g.slowmo, 1, 0.2);
  const sdt = dt * g.slowmo;

  g.shift = Math.max(0, g.shift - sdt / 0.085);
  g.frontJolt = Math.max(0, g.frontJolt - sdt);
  g.frontTint = Math.max(0, g.frontTint - sdt * 3);
  g.shake = Math.max(0, g.shake - dt * 60);
  g.flash = Math.max(0, g.flash - dt * 2.2);
  g.comboPop = Math.max(0, g.comboPop - dt * 5);
  g.levelBanner = Math.max(0, g.levelBanner - dt * 0.6);
  g.feverBanner = Math.max(0, g.feverBanner - dt * 0.8);
  g.displayScore = g.displayScore + (g.score - g.displayScore) * Math.min(1, dt * 14);
  if (Math.abs(g.score - g.displayScore) < 0.5) g.displayScore = g.score;
  g.bgPhase += (g.bgTarget - g.bgPhase) * Math.min(1, dt * 0.8);

  if (g.state === 'play') {
    g.stun = Math.max(0, g.stun - dt);
    g.grace = Math.max(0, g.grace - dt);
    if (g.fever > 0) {
      g.fever -= dt; g.feverGauge = Math.max(0, g.fever / 6);
      if (g.fever <= 0) { g.fever = 0; g.feverGauge = 0; }
    } else if (g.started && g.grace <= 0 && !hintFor(g.queue[0])) {
      const drain = Math.min(0.085 + 0.017 * (g.level - 1), 0.38);
      const prev = g.time;
      g.time -= drain * dt;
      if (prev > 0.25 && g.time <= 0.25) Audio.sfx.tick();
      if (g.time <= 0) { g.time = 0; die('time'); }
    }
  }

  if (g.state === 'title') {
    g.demoT -= dt;
    if (g.demoT <= 0 && g.queue.length) {
      g.demoT = rand(0.55, 0.95);
      const log = g.queue[0];
      const dir = log.kind === 'G' ? 'down' : DIR_FOR[log.kind];
      const r = frontRect();
      g.queue.shift(); g.shift = 1; fillQueue();
      addSlash(dir, r);
      if (log.kind === 'B') tossKeg(log, r); else cutPieces(log, r, dir);
    }
  }

  for (const p of pieces) {
    p.vy += p.gravity * sdt; p.x += p.vx * sdt; p.y += p.vy * sdt; p.rot += p.vr * sdt;
    if (p.sink) { p.y += 260 * sdt; p.alpha -= sdt * 3.5; }
    if (p.explodeIn !== undefined) {
      p.explodeIn -= sdt;
      if (p.explodeIn <= 0) { p.alpha = 0; explosion(p.x, p.y, 0.7); if (g.state === 'play') { Audio.sfx.boom(false); g.shake = Math.max(g.shake, 6); } }
    }
    if (p.y > H + 300) p.alpha = 0;
  }
  pieces = pieces.filter((p) => p.alpha > 0);
  for (const p of particles) {
    p.vy += p.gravity * sdt; p.x += p.vx * sdt; p.y += p.vy * sdt; p.life -= sdt;
    if (p.rot !== undefined) p.rot += p.vr * sdt;
    if (p.kind === 'smoke' || p.kind === 'fire') { p.vx *= 0.96; p.vy *= 0.96; }
  }
  particles = particles.filter((p) => p.life > 0);
  for (const f of floaters) { f.life -= dt; f.y -= 50 * dt; }
  floaters = floaters.filter((f) => f.life > 0);
  for (const s of slashes) s.t += dt;
  slashes = slashes.filter((s) => s.t < 0.22);
  const now = performance.now();
  trail = trail.filter((p) => now - p.t < 110);

  if (petals.length < 26) petals.push({ x: rand(-20, W), y: -10, vx: rand(10, 40), vy: rand(30, 70), rot: rand(0, 6), vr: rand(-2, 2), s: rand(3, 6), ph: rand(0, 6) });
  for (const p of petals) { p.ph += dt; p.x += (p.vx + Math.sin(p.ph * 1.5) * 25) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
  petals = petals.filter((p) => p.y < H + 10 && p.x < W + 30);
}

// ---------------------------------------------------------------- render
const PALETTES = [
  // skyTop, skyBottom, farMtn, nearMtn, groundTop, groundBottom, sun, petal
  ['#4f8fd6', '#d8ecf2', '#8fb1c4', '#5f8796', '#7a9a52', '#3d5a2a', '#fff6d0', '#ffd1dc'],
  ['#3a2c6e', '#ffa070', '#8c5d8c', '#5a3b60', '#7a6440', '#3a2a1c', '#ffd27a', '#ffc2a8'],
  ['#080a20', '#30305e', '#2b2e58', '#1c1e3c', '#2e3a2c', '#141a14', '#f6f2da', '#c8d0ff'],
];
function paletteAt(phase) {
  const n = PALETTES.length;
  const i = ((Math.floor(phase) % n) + n) % n, j = (i + 1) % n, f = phase - Math.floor(phase);
  return PALETTES[i].map((c, k) => mixHex(c, PALETTES[j][k], f));
}

function render(time) {
  const g = Game;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const pal = paletteAt(g.state === 'title' ? 1 : g.bgPhase);
  const night = (() => { const p = ((g.state === 'title' ? 1 : g.bgPhase) % 3 + 3) % 3; return p < 1 ? 0 : p < 2 ? p - 1 : 3 - p; })();

  ctx.save();
  if (g.shake > 0) ctx.translate(rand(-g.shake, g.shake) * 0.6, rand(-g.shake, g.shake) * 0.6);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, L.horizon);
  sky.addColorStop(0, pal[0]); sky.addColorStop(1, pal[1]);
  ctx.fillStyle = sky; ctx.fillRect(-40, -40, W + 80, L.horizon + 40);
  if (night > 0.05) {
    ctx.fillStyle = '#fff';
    for (const s of stars) { ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(time / 600 + s[3])); ctx.fillRect(s[0], s[1], s[2], s[2]); }
    ctx.globalAlpha = 1;
  }
  // sun / moon
  const sunY = L.horizon - H * 0.17, sunX = W * 0.72, sunR = Math.min(W, H) * 0.08;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 3.5);
  glow.addColorStop(0, pal[6]); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.35; ctx.fillStyle = glow; ctx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);
  ctx.globalAlpha = 1; ctx.fillStyle = pal[6];
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

  // mountains
  [pal[2], pal[3]].forEach((col, li) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, L.horizon + 2);
    for (const p of mountains[li]) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(W, L.horizon + 2); ctx.closePath(); ctx.fill();
  });
  // tree line
  ctx.fillStyle = pal[3];
  ctx.globalAlpha = 0.9;
  for (const [x, h] of trees) { ctx.beginPath(); ctx.moveTo(x - h * 0.3, L.horizon + 1); ctx.lineTo(x, L.horizon - h); ctx.lineTo(x + h * 0.3, L.horizon + 1); ctx.fill(); }
  ctx.globalAlpha = 1;

  // ground
  const gr = ctx.createLinearGradient(0, L.horizon, 0, H);
  gr.addColorStop(0, pal[4]); gr.addColorStop(1, pal[5]);
  ctx.fillStyle = gr; ctx.fillRect(-40, L.horizon, W + 80, H - L.horizon + 40);
  // path toward horizon
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.moveTo(W / 2 - L.logW * 0.15, L.horizon); ctx.lineTo(W / 2 + L.logW * 0.15, L.horizon);
  ctx.lineTo(W / 2 + L.logW * 1.1, H); ctx.lineTo(W / 2 - L.logW * 1.1, H); ctx.fill();

  // fever glow
  if (g.fever > 0) {
    const fg = ctx.createRadialGradient(W / 2, L.ground - L.logH / 2, 10, W / 2, L.ground - L.logH / 2, Math.max(W, H) * 0.7);
    fg.addColorStop(0, `rgba(255,210,90,${0.35 + 0.1 * Math.sin(time / 90)})`); fg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,240,200,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + time / 900, r0 = Math.max(W, H) * 0.35, r1 = r0 + 60 + 40 * Math.sin(time / 120 + i);
      ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, L.ground - L.logH / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, L.ground - L.logH / 2 + Math.sin(a) * r1); ctx.stroke();
    }
  }

  // logs (back to front)
  {
    for (let i = g.queue.length - 1; i >= 0; i--) {
      const log = g.queue[i];
      const r = i === 0 ? frontRect() : slotRect(i + g.shift);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + r.h - r.w * 0.06, r.w * 0.6, r.w * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      let y = r.y;
      if (i === 0 && g.shift > 0) y -= Math.sin(g.shift * Math.PI) * r.h * 0.04;
      ctx.drawImage(getSprite(log.kind, log.hard, log.variant), r.x, y, r.w, r.h);
      if (i === 0 && g.frontTint > 0) {
        ctx.globalAlpha = g.frontTint * 0.45; ctx.fillStyle = '#ff2020';
        ctx.fillRect(r.x + r.w * 0.05, y + r.w * 0.1, r.w * 0.9, r.h - r.w * 0.15); ctx.globalAlpha = 1;
      }
      if (log.kind === 'B') { // fuse spark
        const f = KEG_FUSE(r.w, r.h);
        const fx = r.x + f.x, fy = y + f.y, sr = r.w * 0.05 * (1 + 0.3 * Math.sin(time / 40 + log.id));
        ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(fx, fy, sr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,140,40,0.6)'; ctx.beginPath(); ctx.arc(fx, fy, sr * 2, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.4 && i < 3) spark(fx, fy, pick(['#ffe27a', '#ff9a3d']), 140 * r.s);
      }
      if (log.kind === 'G' && Math.random() < 0.15 && i < 3) spark(r.x + rand(0, r.w), y + rand(0, r.h), '#fff6c0', 60);
    }
  }

  // pieces
  for (const p of pieces) {
    ctx.save();
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  // particles
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.kind === 'chip') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (p.kind === 'smoke') {
      ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'ring') {
      ctx.strokeStyle = p.color; ctx.lineWidth = 8 * a; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - a) + 10, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.kind === 'fire' ? a : 1), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // slashes
  for (const s of slashes) {
    const grow = clamp(s.t / 0.05, 0, 1), fade = 1 - clamp((s.t - 0.05) / 0.17, 0, 1);
    const ex = lerp(s.x0, s.x1, grow), ey = lerp(s.y0, s.y1, grow);
    const nx = -(s.y1 - s.y0), ny = s.x1 - s.x0, nl = Math.hypot(nx, ny) || 1;
    const bow = 0.08 * nl;
    const mx = (s.x0 + ex) / 2 + nx / nl * bow * grow, my = (s.y0 + ey) / 2 + ny / nl * bow * grow;
    ctx.lineCap = 'round';
    ctx.globalAlpha = fade * 0.5; ctx.strokeStyle = s.gold ? '#ffcf4a' : '#9fe3ff'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // finger trail
  if (trail.length > 1) {
    const now = performance.now();
    ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff';
    for (let i = 1; i < trail.length; i++) {
      const a = 1 - (now - trail[i].t) / 110;
      ctx.globalAlpha = a * 0.8; ctx.lineWidth = 2 + a * 7;
      ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // petals
  ctx.fillStyle = pal[7];
  for (const p of petals) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (g.state === 'play' || g.state === 'dying' || g.state === 'paused') drawHUD(time);

  // floaters
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const a = clamp(f.life / f.max * 2, 0, 1);
    const pop = 1 + Math.max(0, (f.life / f.max - 0.85)) * 3;
    ctx.globalAlpha = a;
    ctx.font = `900 ${f.size * pop}px ${FONT}`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (g.flash > 0) { ctx.globalAlpha = Math.min(g.flash, 1) * 0.5; ctx.fillStyle = g.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  // low-time vignette
  if (g.state === 'play' && g.started && g.time < 0.25 && g.fever <= 0) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(255,0,0,0)'); v.addColorStop(1, `rgba(255,0,0,${0.25 + 0.15 * Math.sin(time / 100)})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
}

const FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';

function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawHUD(time) {
  const g = Game;
  const top = safeTop + 14;
  // timer bar
  const bx = 64, bw = W - 128, bh = 18, by = top + 13;
  roundRect(bx - 3, by - 3, bw + 6, bh + 6, 12); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  const tv = clamp(g.time, 0, 1);
  if (tv > 0) {
    const low = tv < 0.25 && g.fever <= 0;
    const col = g.fever > 0 ? ['#fff3a0', '#ffb030'] : low ? ['#ff8a8a', '#e02d2d'] : tv < 0.5 ? ['#ffe68a', '#f2a71f'] : ['#b6ff8a', '#3fbf3a'];
    const grd = ctx.createLinearGradient(0, by, 0, by + bh); grd.addColorStop(0, col[0]); grd.addColorStop(1, col[1]);
    roundRect(bx, by, Math.max(bh, bw * tv), bh, 9); ctx.fillStyle = grd;
    if (low) ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time / 70);
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(bx + 4, by + 3, Math.max(0, bw * tv - 8), 4, 2); ctx.fill();
  }
  // clock icon
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(bx - 22, by + bh / 2, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx - 22, by + bh / 2); ctx.lineTo(bx - 22, by + bh / 2 - 6); ctx.moveTo(bx - 22, by + bh / 2); ctx.lineTo(bx - 17, by + bh / 2 + 2); ctx.stroke();

  // fever gauge
  const fy = by + bh + 9, fh = 7;
  roundRect(bx, fy, bw, fh, 4); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
  if (g.feverGauge > 0) {
    roundRect(bx, fy, Math.max(fh, bw * g.feverGauge), fh, 4);
    ctx.fillStyle = g.fever > 0 ? `hsl(${(time / 4) % 360},100%,65%)` : '#ffcc40'; ctx.fill();
  }
  ctx.font = `900 11px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = g.feverGauge >= 0.999 || g.fever > 0 ? '#fff3a0' : 'rgba(255,255,255,0.7)';
  ctx.fillText('FEVER', bx - 44, fy + fh / 2);

  // score
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const sy = fy + 52;
  ctx.font = `900 ${Math.min(56, W * 0.13)}px ${FONT}`;
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(30,15,5,0.65)'; ctx.lineJoin = 'round';
  const sTxt = Math.round(g.displayScore).toLocaleString();
  ctx.strokeText(sTxt, W / 2, sy); ctx.fillStyle = '#fff'; ctx.fillText(sTxt, W / 2, sy);

  // combo & multiplier
  if (g.combo >= 2) {
    const sc = 1 + g.comboPop * 0.35;
    ctx.save(); ctx.translate(W / 2, sy + 44); ctx.scale(sc, sc);
    ctx.font = `900 22px ${FONT}`;
    const mult = Math.min(1 + Math.floor(g.combo / 20), 5) * (g.fever > 0 ? 2 : 1);
    const txt = `${g.combo} COMBO` + (mult > 1 ? `  ×${mult}` : '');
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = g.fever > 0 ? '#fff3a0' : '#ffc857'; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  // stage banner
  if (g.levelBanner > 0) {
    const a = clamp(g.levelBanner * 3, 0, 1), p = 1 - g.levelBanner;
    ctx.globalAlpha = a;
    ctx.font = `900 ${Math.min(44, W * 0.11)}px ${FONT}`;
    const x = W / 2 + (p < 0.15 ? (1 - easeOutBack(p / 0.15)) * W : 0);
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(`${t('stage')} ${g.level}`, x, L.horizon - H * 0.07);
    ctx.fillStyle = '#ffe2b0'; ctx.fillText(`${t('stage')} ${g.level}`, x, L.horizon - H * 0.07);
    ctx.globalAlpha = 1;
  }
  if (g.feverBanner > 0) {
    const a = clamp(g.feverBanner * 3, 0, 1), sc = 1 + (1 - g.feverBanner) * 0.3;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, L.horizon - H * 0.02); ctx.scale(sc, sc); ctx.rotate(-0.06);
    ctx.font = `900 italic ${Math.min(64, W * 0.16)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#7a2a08'; ctx.strokeText(t('fever'), 0, 0);
    const fg = ctx.createLinearGradient(0, -30, 0, 30); fg.addColorStop(0, '#fff7c0'); fg.addColorStop(1, '#ff9a2a');
    ctx.fillStyle = fg; ctx.fillText(t('fever'), 0, 0);
    ctx.restore();
  }

  // hints
  const log = g.queue[0];
  const hint = g.state === 'play' ? hintFor(log) : null;
  if (hint) {
    const r = frontRect();
    const dir = hint === 'G' ? 'down' : DIR_FOR[hint === 'H' ? log.kind : hint];
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const ph = (g.hintPulse % 1.1) / 1.1;
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir];
    const len = r.w * 0.9, sx = cx - d[0] * len / 2, sy2 = cy - d[1] * len / 2;
    const hx = sx + d[0] * len * ph, hy = sy2 + d[1] * len * ph;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([2, 14]);
    ctx.beginPath(); ctx.moveTo(sx, sy2); ctx.lineTo(sx + d[0] * len, sy2 + d[1] * len); ctx.stroke(); ctx.setLineDash([]);
    // hand
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `900 30px ${FONT}`; ctx.fillStyle = '#3a1608'; ctx.fillText(ARROW[dir], hx, hy + 1);
    const msg = t('t' + hint);
    ctx.font = `800 ${Math.min(20, W * 0.05)}px ${FONT}`;
    const tw = ctx.measureText(msg).width + 32, ty = Math.min(L.ground + 52, H - safeBottom - 40);
    roundRect(W / 2 - tw / 2, ty - 22, tw, 44, 22); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, ty);
  } else if (g.state === 'play' && !g.started && !g.tutorial) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time / 200);
    ctx.font = `900 ${Math.min(26, W * 0.065)}px ${FONT}`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    const ty = Math.min(L.ground + 52, H - safeBottom - 40);
    ctx.strokeText(t('ready'), W / 2, ty); ctx.fillStyle = '#fff'; ctx.fillText(t('ready'), W / 2, ty);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- input
const ptr = { id: null, x: 0, y: 0, done: false };
function swipeDir(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
const threshold = () => clamp(Math.min(W, H) * 0.055, 22, 48);

cvs.addEventListener('pointerdown', (e) => {
  Audio.init();
  if (Game.state !== 'play') return;
  if (ptr.id !== null && ptr.id !== e.pointerId) { // second finger: finish first
    ptr.id = null;
  }
  ptr.id = e.pointerId; ptr.x = e.clientX; ptr.y = e.clientY; ptr.done = false;
  trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  e.preventDefault();
}, { passive: false });
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerId !== ptr.id) return;
  trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  if (ptr.done) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
  if (Math.hypot(dx, dy) >= threshold()) { ptr.done = true; handleSwipe(swipeDir(dx, dy)); }
}, { passive: true });
const endPtr = (e) => {
  if (e.pointerId !== ptr.id) return;
  if (!ptr.done && e.type === 'pointerup') {
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (Math.hypot(dx, dy) >= threshold() * 0.55) handleSwipe(swipeDir(dx, dy));
  }
  ptr.id = null;
};
cvs.addEventListener('pointerup', endPtr);
cvs.addEventListener('pointercancel', endPtr);
document.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
  if (map[e.key] && Game.state === 'play') {
    e.preventDefault();
    const r = frontRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[map[e.key]];
    const n = performance.now();
    for (let i = 0; i <= 6; i++) trail.push({ x: cx + d[0] * r.w * (i / 6 - 0.5), y: cy + d[1] * r.h * (i / 6 - 0.5), t: n - (6 - i) * 10 });
    handleSwipe(map[e.key]);
  } else if (e.key === 'Escape' || e.key === 'p') {
    if (Game.state === 'play') pause(); else if (Game.state === 'paused') resume();
  } else if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement) && (Game.state === 'title' || Game.state === 'over') && !document.querySelector('.modal:not(.hidden):not(#scrOver)')) {
    e.preventDefault(); Audio.sfx.click(); startGame();
  }
});

// ---------------------------------------------------------------- UI
const screens = ['scrTitle', 'scrHow', 'scrSettings', 'scrPause', 'scrOver'];
function showScreen(id) { screens.forEach((s) => $(s).classList.toggle('hidden', s !== id)); }
let modalReturn = 'scrTitle';
function openModal(id, from) { modalReturn = from; showScreen(id); if (id === 'scrSettings') syncSettings(); }

function toTitle() {
  Game.state = 'title';
  resetRun();
  Game.tutorial = false; Game.queue = []; fillQueue();
  Game.demoT = 0.8;
  $('titleBest').textContent = save.best.toLocaleString();
  $('btnPause').classList.add('hidden');
  showScreen('scrTitle');
}
function pause() {
  if (Game.state !== 'play') return;
  Game.state = 'paused'; ptr.id = null;
  $('btnPause').classList.add('hidden');
  showScreen('scrPause');
}
function resume() {
  if (Game.state !== 'paused') return;
  Game.state = 'play'; Game.grace = 0.8;
  $('btnPause').classList.remove('hidden');
  showScreen(null);
}

function buildHowList() {
  const list = $('howList'); if (!list || !L.logW) return;
  list.innerHTML = '';
  [['V', 0, 'hV', '↓'], ['L', 0, 'hL', '→'], ['R', 0, 'hR', '←'], ['L', 1, 'hH', '→→'], ['B', 0, 'hB', '↑'], ['G', 0, 'hG', '✦']].forEach(([k, hard, key, arrow]) => {
    const item = document.createElement('div'); item.className = 'how-item';
    const c = document.createElement('canvas'); c.width = 54 * DPR; c.height = 62 * DPR;
    drawLogSprite(c.getContext('2d'), c.width, c.height, k, hard, 0);
    const a = document.createElement('div'); a.className = 'arrow'; a.textContent = arrow;
    const tx = document.createElement('div'); tx.className = 'txt'; tx.innerHTML = t(key);
    item.append(c, a, tx); list.append(item);
  });
}

function syncSettings() {
  $('optSfx').checked = save.sfx; $('optMusic').checked = save.music; $('optVib').checked = save.vib; $('optLang').value = save.lang;
}
let toastTimer = 0;
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 1800); }

const click = (id, fn) => $(id).addEventListener('click', () => { Audio.init(); Audio.sfx.click(); fn(); });
click('btnPlay', startGame);
click('btnHow', () => openModal('scrHow', 'scrTitle'));
click('btnSettings', () => openModal('scrSettings', 'scrTitle'));
click('btnPause', pause);
click('btnResume', resume);
click('btnRestart', startGame);
click('btnPauseSettings', () => openModal('scrSettings', 'scrPause'));
click('btnQuit', toTitle);
click('btnRetry', startGame);
click('btnHome', toTitle);
click('btnShare', async () => {
  const text = STR[save.lang].shareText(Game.score.toLocaleString());
  const url = location.protocol.startsWith('http') ? location.href.split('#')[0] : undefined;
  try {
    if (navigator.share) await navigator.share({ title: 'Log Slasher', text, url });
    else { await navigator.clipboard.writeText(url ? `${text} ${url}` : text); toast(t('copied')); }
  } catch (e) { /* user cancelled */ }
});
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { Audio.sfx.click(); showScreen(modalReturn); }));
$('optSfx').addEventListener('change', (e) => { save.sfx = e.target.checked; persist(); Audio.applySettings(); Audio.sfx.click(); });
$('optMusic').addEventListener('change', (e) => { save.music = e.target.checked; persist(); Audio.applySettings(); });
$('optVib').addEventListener('change', (e) => { save.vib = e.target.checked; persist(); vibrate(20); });
$('optLang').addEventListener('change', (e) => { save.lang = e.target.value; persist(); applyI18n(); });
click('btnReset', () => {
  if (!confirm(t('resetConfirm'))) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  Object.assign(save, { best: 0, games: 0, sfx: true, music: true, vib: true, tutorialDone: false, seen: {} });
  persist(); syncSettings(); applyI18n(); Audio.applySettings();
  $('titleBest').textContent = '0';
  toast(t('resetDone'));
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); Audio.suspend(); } else Audio.resume();
});
window.addEventListener('resize', () => { resize(); buildHowList(); });

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  if (Game.state !== 'paused') update(dt);
  render(now);
  requestAnimationFrame(frame);
}

resize();
applyI18n();
toTitle();
document.addEventListener('pointerdown', () => { Audio.init(); Audio.setWantMusic(true); }, { once: true });
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// test hook (no effect on gameplay)
window.__LS = { Game, handleSwipe, startGame, update, render, counts: () => ({ pieces: pieces.length, particles: particles.length, petals: petals.length }) };
})();
