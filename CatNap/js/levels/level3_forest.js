// js/levels/level3_forest.js — Глава 1 (финал): ЛЕС → ТРОПИНКА → ИЗБУШКА
import { Game, THREE, showHint, showDialog } from '../engine.js';
import { createPlayer, addBoxCollider } from '../player.js';

let player, group, stage, stageData;

const STAGES = {
  CRASH: 'crash',       // у разбитой машины, искать тропинку
  PATH:  'path',        // идти по тропинке
  HUT:   'hut',         // подойти к избушке и постучать
  END:   'end',         // катсцена конца главы
};

const level = {
  async init(scene, camera, onProgress) {
    group = new THREE.Group();
    scene.add(group);
    player = createPlayer(scene, camera, { x: 0, y: 1.7, z: 10, yaw: Math.PI });
    player.speed = 2.6;
    stage = STAGES.CRASH;
    stageData = {};

    onProgress?.(0.1);
    buildForest();
    onProgress?.(0.5);
    buildCarWreck();
    onProgress?.(0.7);
    buildPath();
    onProgress?.(0.85);
    buildHut();
    onProgress?.(1);

    showDialog('Машина наехала на капкан. Придётся идти пешком.', () => {
      showHint('Найди тропинку сквозь деревья (знак «!»).');
    });
  },

  update(dt) {
    if (player) player.update(dt);
    // лёгкое покачивание тумана/света для атмосферы
    if (stage === STAGES.HUT) {
      const t = Date.now() * 0.001;
      const lamp = group.getObjectByName('hutLamp');
      if (lamp) lamp.intensity = 0.7 + Math.sin(t * 2) * 0.15;
    }
  },

  dispose() {
    group?.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); });
  }
};

// ==================== ЛЕС ====================
function buildForest() {
  // земля
  const matGround = new THREE.MeshStandardMaterial({ color: 0x1a2a15, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // туман леса
  Game.scene.fog = new THREE.Fog(0x0a1410, 8, 50);
  Game.scene.background = new THREE.Color(0x0a1410);

  // деревья (простые: ствол + крона)
  const matTrunk = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
  const matLeaf  = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 1 });
  const treePositions = [];
  // расставляем деревья вокруг, но оставляем коридор для тропинки
  for (let i = 0; i < 60; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    // не ставим на тропинку (коридор шириной 4 по оси Z)
    if (Math.abs(x) < 3 && z < 15 && z > -30) continue;
    if (Math.hypot(x, z - 10) < 6) continue; // место машины
    treePositions.push([x, z]);
  }
  treePositions.forEach(([x, z]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4), matTrunk);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 6), matLeaf);
    crown.position.set(x, 5, z);
    crown.castShadow = true;
    group.add(crown);
    // коллайдер ствола
    const box = new THREE.Box3(
      new THREE.Vector3(x - 0.3, 0, z - 0.3),
      new THREE.Vector3(x + 0.3, 4, z + 0.3)
    );
    player.addCollider(box);
  });

  // лунный свет
  const moon = new THREE.DirectionalLight(0x8899cc, 0.5);
  moon.position.set(-10, 20, -10);
  group.add(moon);
  const amb = new THREE.AmbientLight(0x223344, 0.4);
  group.add(amb);
}

// ==================== РАЗБИТАЯ МАШИНА ====================
function buildCarWreck() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x663333, metalness: 0.3, roughness: 0.7 }));
  body.position.y = 0.6;
  body.rotation.z = 0.15;
  body.rotation.x = -0.1;
  body.castShadow = true;
  g.add(body);
  // капкан под колесом
  const trap = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.3 }));
  trap.rotation.x = Math.PI / 2;
  trap.position.set(-0.8, 0.1, 1.5);
  g.add(trap);
  g.position.set(0, 0, 10);
  group.add(g);
  addBoxCollider(player, body);

  // знак «!» на тропинку (невидимый триггер)
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
  trigger.position.set(0, 1, 2);
  group.add(trigger);
  player.addInteractable(trigger, 'пойти по тропинке', () => {
    if (stage !== STAGES.CRASH) return;
    stage = STAGES.PATH;
    trigger.userData.marker.visible = false;
    showDialog('Ты видишь тропинку сквозь деревья и идёшь по ней.', () => {
      player.teleport(0, 1.7, -5, Math.PI);
      showHint('Иди по тропинке к избушке.');
      // активируем дверь избушки
      const hutDoor = group.getObjectByName('hutDoor');
      if (hutDoor) hutDoor.userData.marker.visible = true;
    });
  });
}

// ==================== ТРОПИНКА ====================
function buildPath() {
  // дорожка из плит
  const matPath = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
  for (let z = 2; z > -28; z -= 2) {
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), matPath);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(0, 0.02, z);
    tile.receiveShadow = true;
    group.add(tile);
  }
}

// ==================== ИЗБУШКА ====================
function buildHut() {
  const hut = new THREE.Group();
  hut.position.set(0, 0, -32);

  // стены
  const matLog = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.95 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), matLog);
  walls.position.y = 2;
  walls.castShadow = walls.receiveShadow = true;
  hut.add(walls);
  addBoxCollider(player, walls);

  // крыша
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }));
  roof.position.y = 5.2;
  roof.rotation.y = Math.PI / 4;
  hut.add(roof);

  // дверь
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
  door.position.set(0, 1.1, 2.55);
  door.name = 'hutDoor';
  hut.add(door);

  // окно (светится)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.9 }));
  win.position.set(1.8, 2, 2.56);
  hut.add(win);

  // лампа у входа (мерцает)
  const lamp = new THREE.PointLight(0xffaa55, 0.8, 10, 2);
  lamp.position.set(0, 2.8, 3);
  lamp.name = 'hutLamp';
  hut.add(lamp);

  group.add(hut);

  // триггер на двери
  player.addInteractable(door, 'постучать в дверь', () => {
    if (stage === STAGES.END) return;
    if (stage !== STAGES.PATH && stage !== STAGES.HUT) return;
    stage = STAGES.HUT;
    door.userData.marker.visible = false;
    startEnding();
  });
  door.userData.marker.visible = false;
}

// ==================== КОНЕЦ ГЛАВЫ (катсцена) ====================
function startEnding() {
  stage = STAGES.END;
  showHint(null);
  // затемнение через диалоги
  const lines = [
    'Ты стучишь в дверь... Тишина.',
    'Слышны медленные шаги за дверью.',
    'Дверь медленно открывается...',
  ];
  let i = 0;
  const next = () => {
    if (i >= lines.length) {
      // финальный затемняющий экран
      fadeToBlack(() => {
        showDialog('КОНЕЦ ГЛАВЫ 1 — «НАЧАЛО»', () => {
          // возврат в меню
          Game.running = false;
          document.getElementById('game').classList.add('hidden');
          document.getElementById('menu').classList.remove('hidden');
          // сброс состояния для повторного прохождения
          Game.currentLevel = null;
          Game.player = null;
        });
      });
    } else {
      showDialog(lines[i++], next);
    }
  };
  next();
}

function fadeToBlack(cb) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;transition:opacity 2s;z-index:999;';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  setTimeout(() => {
    cb();
    setTimeout(() => overlay.remove(), 500);
  }, 2200);
}

export default level;