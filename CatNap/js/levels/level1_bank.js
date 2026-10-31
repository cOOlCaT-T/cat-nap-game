// js/levels/level1_bank.js — Глава 1: БАНК (вечер, конец смены)
import { Game, THREE, showHint, showDialog, loadLevel } from '../engine.js';
import { createPlayer, addBoxCollider, buildRoom } from '../player.js';

let player, group, tasks, taskIndex, radioDone = false;

const TASKS = [
  { id: 'pc',    label: 'Выключить компьютер' },
  { id: 'safe',  label: 'Проверить хранилище' },
  { id: 'light', label: 'Выключить свет' },
  { id: 'exit',  label: 'Закрыть банк на ключ' },
];

const level = {
  async init(scene, camera, onProgress) {
    group = new THREE.Group();
    scene.add(group);
    player = createPlayer(scene, camera, { x: 0, y: 1.7, z: 4, yaw: Math.PI });
    player.speed = 2.6;
    tasks = TASKS.map(t => ({ ...t, done: false }));
    taskIndex = 0;
    radioDone = false;

    onProgress?.(0.15);

    // ---------- МАТЕРИАЛЫ ----------
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x6b6f78, roughness: 0.9 });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
    const matWood  = new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 0.8 });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.7, roughness: 0.3 });

    // ---------- ПОМЕЩЕНИЕ (главный зал 14x12) ----------
    const W = 14, D = 12, H = 3.2;
    const room = buildRoom(group, W, D, H, matFloor, matWall);
    addWallColliders(W, D, H);

    onProgress?.(0.35);

    // ---------- РАБОЧИЙ СТОЛ С КОМПЬЮТЕРОМ ----------
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.0), matWood);
    desk.position.set(-3.5, 0.4, -1.5);
    desk.castShadow = desk.receiveShadow = true;
    group.add(desk);
    addBoxCollider(player, desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.1), matMetal);
    monitor.position.set(-3.5, 1.15, -1.7);
    group.add(monitor);

    const screenMat = new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x2a6aff, emissiveIntensity: 0.9 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), screenMat);
    screen.position.set(-3.5, 1.15, -1.64);
    group.add(screen);

    player.addInteractable(monitor, 'выключить компьютер', () => {
      if (tasks[0].done) return;
      tasks[0].done = true;
      screenMat.emissiveIntensity = 0;
      screenMat.emissive.setHex(0x000000);
      screenMat.color.setHex(0x111111);
      updateMarkers();
      nextTaskHint();
    });

    onProgress?.(0.5);

    // ---------- ХРАНИЛИЩЕ ----------
    const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.2), matMetal);
    vaultDoor.position.set(5.5, 1.3, -D/2 + 0.12);
    vaultDoor.castShadow = true;
    group.add(vaultDoor);

    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 24), matMetal);
    wheel.position.set(5.5, 1.4, -D/2 + 0.25);
    group.add(wheel);

    player.addInteractable(vaultDoor, 'проверить хранилище', () => {
      if (tasks[1].done) return;
      if (!tasks[0].done) { showDialog('Сначала выключи компьютер.'); return; }
      tasks[1].done = true;
      showDialog('Хранилище заперто. Всё в порядке.');
      updateMarkers();
      nextTaskHint();
    });

    onProgress?.(0.65);

    // ---------- ВЫКЛЮЧАТЕЛЬ СВЕТА ----------
    const swPanel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.08), matMetal);
    swPanel.position.set(-W/2 + 0.1, 1.6, 3);
    group.add(swPanel);
    player.addInteractable(swPanel, 'выключить свет', () => {
      if (tasks[2].done) return;
      if (!tasks[1].done) { showDialog('Сначала проверь хранилище.'); return; }
      tasks[2].done = true;
      mainLights.forEach(l => l.intensity = 0.05);
      Game.scene.fog = new THREE.Fog(0x05050a, 8, 40);
      showDialog('Свет выключен. Пора уходить.');
      updateMarkers();
      nextTaskHint();
    });

    onProgress?.(0.75);

    // ---------- ВХОДНАЯ ДВЕРЬ ----------
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.15), matWood);
    door.position.set(0, 1.2, D/2 - 0.08);
    group.add(door);
    player.addInteractable(door, 'закрыть банк на ключ', () => {
      if (tasks[3].done) return;
      if (!tasks[2].done) { showDialog('Сначала выключи свет.'); return; }
      tasks[3].done = true;
      showDialog('Банк закрыт. Ключ в кармане.', () => {
        transitionToStreet();
      });
    });

    // ---------- ОСВЕЩЕНИЕ БАНКА ----------
    mainLights = [];
    const lampPositions = [[-4, H-0.2, -3], [4, H-0.2, -3], [0, H-0.2, 2]];
    lampPositions.forEach(([x,y,z]) => {
      const lamp = new THREE.PointLight(0xfff0dd, 0.9, 12, 2);
      lamp.position.set(x, y, z);
      group.add(lamp);
      mainLights.push(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffeeaa, emissiveIntensity: 0.6 }));
      bulb.position.copy(lamp.position);
      group.add(bulb);
    });

    const emerg = new THREE.PointLight(0xff3333, 0.15, 8);
    emerg.position.set(0, 2.5, -D/2 + 1);
    group.add(emerg);

    // ---------- ДЕКОР ----------
    for (let i = 0; i < 2; i++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 0.5), matWall);
      col.position.set(-2 + i * 4, H/2, 0);
      col.castShadow = true;
      group.add(col);
      addBoxCollider(player, col);
    }
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matWood);
    chair.position.set(-3.5, 0.25, -0.3);
    group.add(chair);
    addBoxCollider(player, chair);

    onProgress?.(0.9);

    // ---------- ЗАПУСК ----------
    updateMarkers();
    showHint(null);
    setTimeout(() => {
      showDialog('Конец смены. Нужно закончить дела в банке — смотри на знак «!».');
      nextTaskHint();
    }, 600);

    onProgress?.(1);
  },

  update(dt) {
    if (player) player.update(dt);
    if (player) player.interactables.forEach(o => {
      const m = o.userData.marker;
      if (m && m.visible) m.position.y = 1.2 + Math.sin(Date.now() * 0.003) * 0.1;
    });
  },

  dispose() {
    group?.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); });
  }
};

// ==================== ВСПОМОГАТЕЛЬНОЕ ====================
let mainLights = [];

function addWallColliders(W, D, H) {
  const t = 0.3;
  const boxes = [
    { x: 0, z: -D/2 - t/2, w: W + 2*t, d: t },
    { x: 0, z: D/2 + t/2, w: W + 2*t, d: t },
    { x: -W/2 - t/2, z: 0, w: t, d: D + 2*t },
    { x: W/2 + t/2, z: 0, w: t, d: D + 2*t },
  ];
  boxes.forEach(b => {
    const box = new THREE.Box3(
      new THREE.Vector3(b.x - b.w/2, 0, b.z - b.d/2),
      new THREE.Vector3(b.x + b.w/2, H, b.z + b.d/2)
    );
    player.addCollider(box);
  });
}

function updateMarkers() {
  player.interactables.forEach(obj => {
    const m = obj.userData.marker;
    if (!m) return;
    const label = (obj.userData.label || '').toLowerCase();
    let show = false;
    if (label.includes('компьютер')) show = !tasks[0].done;
    if (label.includes('хранилище')) show = tasks[0].done && !tasks[1].done;
    if (label.includes('свет')) show = tasks[1].done && !tasks[2].done;
    if (label.includes('ключ')) show = tasks[2].done && !tasks[3].done;
    m.visible = show;
  });
}

function nextTaskHint() {
  const next = tasks.find(t => !t.done);
  if (next) showHint('Задача: ' + next.label);
  else showHint(null);
}

// ==================== ИСПРАВЛЕННЫЙ ПЕРЕХОД ====================
function transitionToStreet() {
  Game.paused = true;
  showDialog('Ты выходишь из банка. На улице тихо и темно...', () => {
    import('./level2_street.js').then(async (m) => {
      const eng = await import('../engine.js');
      eng.registerLevel('level2_street', m.default);
      eng.loadLevel('level2_street');
    }).catch(err => {
      console.error(err);
      showDialog('Следующая глава ещё не готова. Конец демо.');
    });
  });
}

export default level;