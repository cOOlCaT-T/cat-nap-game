// js/engine.js — движок (без модулей)
window.Game = {
  renderer: null,
  scene: null,
  camera: null,
  clock: null,
  running: false,
  paused: false,
  isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
  settings: { quality: 'medium', shadows: true, resolution: 75, volume: 70 },
  input: { forward: 0, right: 0, action: false },
  player: null,
  currentLevel: null,
  levels: {},
  THREE: null
};

// Инициализация Three.js (берем из глобальной переменной THREE, загруженной в HTML)
window.Game.THREE = window.THREE;

Game.createRenderer = function() {
  const canvas = document.getElementById('scene');
  const renderer = new Game.THREE.WebGLRenderer({
    canvas: canvas,
    antialias: Game.settings.quality !== 'low',
    powerPreference: 'high-performance',
  });
  Game.applyQuality(renderer);
  Game.renderer = renderer;
};

Game.applyQuality = function(renderer) {
  const q = Game.settings.quality;
  const dpr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'medium' ? 1.5 : 2);
  renderer.setPixelRatio(dpr * (Game.settings.resolution / 100));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = Game.settings.shadows && q !== 'low';
  renderer.shadowMap.type = Game.THREE.PCFSoftShadowMap;
  renderer.toneMapping = Game.THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = q === 'low' ? 0.9 : 1.0;
};

Game.createScene = function() {
  const scene = new Game.THREE.Scene();
  scene.background = new Game.THREE.Color(0x05050a);
  scene.fog = new Game.THREE.Fog(0x05050a, 20, 80);
  Game.scene = scene;

  const camera = new Game.THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.7, 5);
  Game.camera = camera;
};

Game.addLights = function(scene, opts = {}) {
  const amb = new Game.THREE.AmbientLight(0x404060, opts.ambient ?? 0.6);
  scene.add(amb);
  const hemi = new Game.THREE.HemisphereLight(0x8899ff, 0x221100, opts.hemi ?? 0.4);
  scene.add(hemi);
  const dir = new Game.THREE.DirectionalLight(0xffeedd, opts.dir ?? 0.8);
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
};

Game.registerLevel = function(name, levelObj) {
  Game.levels[name] = levelObj;
};

Game.loadLevel = function(name) {
  if (Game.currentLevel && Game.currentLevel.dispose) {
    try { Game.currentLevel.dispose(); } catch (e) { console.warn(e); }
  }
  Game.scene.clear();
  Game.scene.background = new Game.THREE.Color(0x05050a);
  Game.scene.fog = new Game.THREE.Fog(0x05050a, 20, 80);
  Game.addLights(Game.scene, { ambient: 0.5, hemi: 0.35, dir: 0.7 });
  
  Game.input.forward = Game.input.right = 0;

  const level = Game.levels[name];
  if (!level) { console.error('Уровень не найден:', name); return; }

  Game.showLevelLoad(true);
  level.init(Game.scene, Game.camera, function(p) {
    Game.setLevelProgress(p * 100);
  });
  Game.setLevelProgress(100);
  
  setTimeout(function() {
    Game.showLevelLoad(false);
    Game.currentLevel = level;
  }, 300);
};

Game.showLevelLoad = function(show) {
  const el = document.getElementById('levelLoad');
  if (!el) return;
  if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
  if (show) Game.setLevelProgress(0);
};

Game.setLevelProgress = function(p) {
  const fill = document.getElementById('levelBarFill');
  const txt = document.getElementById('levelLoadText');
  if (fill) fill.style.width = p + '%';
  if (txt) txt.textContent = 'Загрузка локации... ' + Math.round(p) + '%';
};

Game.loop = function() {
  if (!Game.running) return;
  requestAnimationFrame(Game.loop);
  const dt = Math.min(Game.clock.getDelta(), 0.1);

  if (!Game.paused && Game.currentLevel && Game.currentLevel.update) {
    Game.currentLevel.update(dt, Game);
  }
  if (!Game.paused && Game.player && Game.player.update) {
    Game.player.update(dt, Game);
  }

  if (Game.renderer && Game.scene && Game.camera) {
    Game.renderer.render(Game.scene, Game.camera);
  }
};

Game.setupKeyboard = function() {
  const map = { KeyW: 'forward+', KeyS: 'forward-', KeyA: 'right-', KeyD: 'right+',
                ArrowUp: 'forward+', ArrowDown: 'forward-', ArrowLeft: 'right-', ArrowRight: 'right+' };
  window.addEventListener('keydown', function(e) {
    if (map[e.code]) { e.preventDefault(); Game.applyMove(map[e.code], true); }
    if (e.code === 'KeyE' || e.code === 'Space') { Game.input.action = true; }
    if (e.code === 'Escape') Game.togglePause();
  });
  window.addEventListener('keyup', function(e) {
    if (map[e.code]) Game.applyMove(map[e.code], false);
    if (e.code === 'KeyE' || e.code === 'Space') Game.input.action = false;
  });
};

Game.applyMove = function(dir, on) {
  const val = on ? 1 : 0;
  if (dir === 'forward+') Game.input.forward = val;
  if (dir === 'forward-') Game.input.forward = val ? -1 : 0;
  if (dir === 'right+') Game.input.right = val;
  if (dir === 'right-') Game.input.right = val ? -1 : 0;
};

Game.setupMobileControls = function() {
  if (!Game.isMobile) return;
  const mob = document.getElementById('mobile');
  if (mob) mob.classList.remove('hidden');

  const zone = document.getElementById('joyZone');
  const knob = document.getElementById('joyKnob');
  if (!zone || !knob) return;
  
  let active = false, cx = 0, cy = 0;
  const maxDist = 40;

  zone.addEventListener('touchstart', function(e) {
    const t = e.changedTouches[0];
    const r = zone.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    active = true; moveKnob(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  zone.addEventListener('touchmove', function(e) {
    if (!active) return;
    const t = e.changedTouches[0];
    moveKnob(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  zone.addEventListener('touchend', function() {
    active = false;
    knob.style.transform = 'translate(0,0)';
    Game.input.forward = 0; Game.input.right = 0;
  });

  function moveKnob(px, py) {
    let dx = px - cx, dy = py - cy;
    const len = Math.hypot(dx, dy);
    if (len > maxDist) { dx = dx / len * maxDist; dy = dy / len * maxDist; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    Game.input.right = dx / maxDist;
    Game.input.forward = -dy / maxDist;
  }

  const btnA = document.getElementById('btnAction');
  if (btnA) {
    btnA.addEventListener('touchstart', function(e) { Game.input.action = true; e.preventDefault(); }, { passive: false });
    btnA.addEventListener('touchend', function() { Game.input.action = false; });
  }

  const btnP = document.getElementById('btnPause');
  if (btnP) btnP.addEventListener('click', Game.togglePause);
};

Game.togglePause = function() {
  if (!Game.running) return;
  Game.paused = !Game.paused;
  const p = document.getElementById('btnPause');
  if (p) p.textContent = Game.paused ? '▶' : '❚❚';
  Game.showHint(Game.paused ? 'Пауза' : null);
};

Game.showHint = function(text) {
  const el = document.getElementById('hint');
  if (!el) return;
  if (text) { el.textContent = text; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
};

Game.showDialog = function(text, onNext) {
  const box = document.getElementById('dialog');
  const txt = document.getElementById('dialogText');
  const nxt = document.getElementById('dialogNext');
  if (!box || !txt || !nxt) return;

  box.classList.remove('hidden');
  txt.textContent = '';
  let i = 0;
  const timer = setInterval(function() {
    txt.textContent += text[i++] || '';
    if (i >= text.length) clearInterval(timer);
  }, 22);
  
  const handler = function() {
    nxt.removeEventListener('click', handler);
    box.classList.add('hidden');
    if (onNext) onNext();
  };
  nxt.addEventListener('click', handler);
};

Game.startGame = function(firstLevel) {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');

  if (!Game.clock) Game.clock = new Game.THREE.Clock();
  if (!Game.renderer) Game.createRenderer();
  Game.createScene();
  Game.setupKeyboard();
  Game.setupMobileControls();
  
  window.removeEventListener('resize', Game.onResize);
  window.addEventListener('resize', Game.onResize);

  Game.running = true;
  Game.paused = false;
  Game.clock.start();
  Game.loop();

  Game.loadLevel(firstLevel || 'level1_bank');
};

Game.onResize = function() {
  if (!Game.renderer || !Game.camera) return;
  Game.camera.aspect = window.innerWidth / window.innerHeight;
  Game.camera.updateProjectionMatrix();
  Game.applyQuality(Game.renderer);
};

Game.applySettingsFromUI = function() {
  Game.settings.quality = document.getElementById('setQuality').value;
  Game.settings.shadows = document.getElementById('setShadows').checked;
  Game.settings.resolution = +document.getElementById('setRes').value;
  Game.settings.volume = +document.getElementById('setVol').value;
  if (Game.renderer) Game.applyQuality(Game.renderer);
};

// Привязка кнопок меню (после загрузки страницы)
window.addEventListener('DOMContentLoaded', function() {
  const btnStart = document.getElementById('btnStart');
  if (btnStart) {
    btnStart.addEventListener('click', function() {
      Game.startGame('level1_bank');
    });
  }
});
