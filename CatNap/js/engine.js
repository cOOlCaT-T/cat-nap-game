// js/engine.js — движок игры "Кэт Нап"
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ==================== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ====================
export const Game = {
  renderer: null,
  scene: null,
  camera: null,
  clock: new THREE.Clock(),
  running: false,
  paused: false,
  isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
  settings: { quality: 'medium', shadows: true, resolution: 75, volume: 70 },
  input: { forward: 0, right: 0, action: false, look: { x: 0, y: 0 } },
  player: null,
  currentLevel: null,
  levels: {},          // реестр уровней { name: {init, update, dispose} }
  listeners: [],
};

// ==================== РЕНДЕРЕР ====================
function createRenderer() {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: Game.settings.quality !== 'low',
    powerPreference: 'high-performance',
  });
  applyQuality(renderer);
  Game.renderer = renderer;
}

function applyQuality(renderer) {
  const q = Game.settings.quality;
  const dpr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'medium' ? 1.5 : 2);
  renderer.setPixelRatio(dpr * (Game.settings.resolution / 100));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = Game.settings.shadows && q !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = q === 'low' ? 0.9 : 1.0;
}

// ==================== СЦЕНА / КАМЕРА ====================
function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.Fog(0x05050a, 20, 80);
  Game.scene = scene;

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.7, 5);
  Game.camera = camera;
}

// ==================== БАЗОВЫЙ СВЕТ ====================
export function addLights(scene, opts = {}) {
  const amb = new THREE.AmbientLight(0x404060, opts.ambient ?? 0.6);
  scene.add(amb);

  const hemi = new THREE.HemisphereLight(0x8899ff, 0x221100, opts.hemi ?? 0.4);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffeedd, opts.dir ?? 0.8);
  dir.position.set(5, 12, 6);
  if (Game.settings.shadows) {
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
  }
  scene.add(dir);
  return { amb, hemi, dir };
}

// ==================== МЕНЕДЖЕР УРОВНЕЙ ====================
export function registerLevel(name, levelObj) {
  Game.levels[name] = levelObj;
}

export async function loadLevel(name, onProgress) {
  // очистка предыдущего
  if (Game.currentLevel && Game.currentLevel.dispose) {
    try { Game.currentLevel.dispose(); } catch (e) { console.warn(e); }
  }
  Game.scene.clear();
  createSceneBaseLight();
  Game.input.forward = Game.input.right = 0;

  const level = Game.levels[name];
  if (!level) { console.error('Уровень не найден:', name); return; }

  showLevelLoad(true);
  if (onProgress) onProgress(0.2);
  await level.init(Game.scene, Game.camera, (p) => {
    if (onProgress) onProgress(p);
    setLevelProgress(p * 100);
  });
  if (onProgress) onProgress(1);
  setLevelProgress(100);
  await new Promise(r => setTimeout(r, 300));
  showLevelLoad(false);

  Game.currentLevel = level;
  Game.currentLevelName = name;
}

function createSceneBaseLight() {
  addLights(Game.scene, { ambient: 0.5, hemi: 0.35, dir: 0.7 });
}

function showLevelLoad(show) {
  const el = document.getElementById('levelLoad');
  if (!el) return;
  el.classList.toggle('hidden', !show);
  if (show) setLevelProgress(0);
}
function setLevelProgress(p) {
  const fill = document.getElementById('levelBarFill');
  const txt = document.getElementById('levelLoadText');
  if (fill) fill.style.width = p + '%';
  if (txt) txt.textContent = 'Загрузка локации... ' + Math.round(p) + '%';
}

// ==================== ИГРОВОЙ ЦИКЛ ====================
function loop() {
  if (!Game.running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(Game.clock.getDelta(), 0.1);

  if (!Game.paused && Game.currentLevel && Game.currentLevel.update) {
    Game.currentLevel.update(dt, Game);
  }
  // обновление игрока (если уровень его использует)
  if (!Game.paused && Game.player && Game.player.update) {
    Game.player.update(dt, Game);
  }

  Game.renderer.render(Game.scene, Game.camera);
}

// ==================== ВВОД: КЛАВИАТУРА ====================
function setupKeyboard() {
  const map = { KeyW: 'forward+', KeyS: 'forward-', KeyA: 'right-', KeyD: 'right+',
                ArrowUp: 'forward+', ArrowDown: 'forward-', ArrowLeft: 'right-', ArrowRight: 'right+' };
  window.addEventListener('keydown', (e) => {
    if (map[e.code]) { e.preventDefault(); applyMove(map[e.code], true); }
    if (e.code === 'KeyE' || e.code === 'Space') { Game.input.action = true; }
    if (e.code === 'Escape') togglePause();
  });
  window.addEventListener('keyup', (e) => {
    if (map[e.code]) applyMove(map[e.code], false);
    if (e.code === 'KeyE' || e.code === 'Space') Game.input.action = false;
  });
}
function applyMove(dir, on) {
  const val = on ? 1 : 0;
  if (dir === 'forward+') Game.input.forward = val;
  if (dir === 'forward-') Game.input.forward = val ? -1 : 0;
  if (dir === 'right+') Game.input.right = val;
  if (dir === 'right-') Game.input.right = val ? -1 : 0;
}

// ==================== ВВОД: МОБИЛЬНЫЙ ДЖОЙСТИК ====================
function setupMobileControls() {
  if (!Game.isMobile) return;
  document.getElementById('mobile').classList.remove('hidden');

  const zone = document.getElementById('joyZone');
  const knob = document.getElementById('joyKnob');
  let active = false, cx = 0, cy = 0;
  const maxDist = 40;

  zone.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    const r = zone.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    active = true; moveKnob(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    if (!active) return;
    const t = e.changedTouches[0];
    moveKnob(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  zone.addEventListener('touchend', () => {
    active = false;
    knob.style.transform = 'translate(0,0)';
    Game.input.forward = 0; Game.input.right = 0;
  });

  function moveKnob(px, py) {
    let dx = px - cx, dy = py - cy;
    const len = Math.hypot(dx, dy);
    if (len > maxDist) { dx = dx / len * maxDist; dy = dy / len * maxDist; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    Game.input.right = dx / maxDist;
    Game.input.forward = -dy / maxDist;
  }

  // кнопка действия
  const btnA = document.getElementById('btnAction');
  btnA.addEventListener('touchstart', (e) => { Game.input.action = true; e.preventDefault(); }, { passive: false });
  btnA.addEventListener('touchend', () => { Game.input.action = false; });

  // пауза
  document.getElementById('btnPause').addEventListener('click', togglePause);
}

// ==================== ПАУЗА ====================
export function togglePause() {
  if (!Game.running) return;
  Game.paused = !Game.paused;
  const p = document.getElementById('btnPause');
  if (p) p.textContent = Game.paused ? '▶' : '❚❚';
  document.getElementById('hint').classList.toggle('hidden', Game.paused);
}

// ==================== UI-ХЕЛПЕРЫ ====================
export function showHint(text) {
  const el = document.getElementById('hint');
  if (!el) return;
  if (text) { el.textContent = text; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

export function showDialog(text, onNext) {
  const box = document.getElementById('dialog');
  const txt = document.getElementById('dialogText');
  const nxt = document.getElementById('dialogNext');
  box.classList.remove('hidden');
  txt.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    txt.textContent += text[i++] || '';
    if (i >= text.length) clearInterval(timer);
  }, 22);
  const handler = () => {
    nxt.removeEventListener('click', handler);
    box.classList.add('hidden');
    if (onNext) onNext();
  };
  nxt.addEventListener('click', handler);
}

// ==================== СТАРТ ====================
export function startGame(firstLevel = 'level1_bank') {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');

  if (!Game.renderer) createRenderer();
  createScene();
  Game.scene.clear();
  createSceneBaseLight();
  setupKeyboard();
  setupMobileControls();
  window.addEventListener('resize', onResize);

  Game.running = true;
  Game.paused = false;
  Game.clock.start();
  loop();

  // загрузка первой главы
  import('./levels/level1_bank.js').then((m) => {
    registerLevel('level1_bank', m.default);
    loadLevel(firstLevel);
  }).catch(err => {
    console.error('Не удалось загрузить главу:', err);
    showDialog('Ошибка загрузки уровня. Проверь консоль.');
  });
}

function onResize() {
  if (!Game.renderer) return;
  Game.camera.aspect = window.innerWidth / window.innerHeight;
  Game.camera.updateProjectionMatrix();
  applyQuality(Game.renderer);
}

// ==================== НАСТРОЙКИ ИЗ UI ====================
export function applySettingsFromUI() {
  Game.settings.quality = document.getElementById('setQuality').value;
  Game.settings.shadows = document.getElementById('setShadows').checked;
  Game.settings.resolution = +document.getElementById('setRes').value;
  Game.settings.volume = +document.getElementById('setVol').value;
  if (Game.renderer) applyQuality(Game.renderer);
}

// Экспорт для уровней
export { THREE };