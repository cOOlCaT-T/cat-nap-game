// js/levels/level2_street.js — Глава 2: УЛИЦА → ПОДЪЕЗД → КВАРТИРА → СОН → УТРО
import { Game, THREE, showHint, showDialog } from '../engine.js';
import { createPlayer, addBoxCollider, buildRoom } from '../player.js';

let player, group, stage, stageData;

// этапы главы
const STAGES = {
  STREET: 'street',      // на улице: подойти к машине
  CAR:    'car',         // сел в машину → едем домой (загрузка)
  ENTRANCE: 'entrance',  // подъезд: подняться на 5 этаж
  APARTMENT: 'apartment',// квартира: кухня → доширак → зал → радио → сон
  MORNING: 'morning',    // утро: взять ключи → выйти
  DRIVE:  'drive',       // едем в лес (переход к главе 3)
};

const level = {
  async init(scene, camera, onProgress) {
    group = new THREE.Group();
    scene.add(group);
    player = createPlayer(scene, camera, { x: 0, y: 1.7, z: 8, yaw: Math.PI });
    player.speed = 2.8;
    stage = STAGES.STREET;
    stageData = {};

    onProgress?.(0.1);
    buildStreet();
    onProgress?.(0.7);

    showDialog('Наконец-то смена закончена. Машина стоит рядом.', () => {
      showHint('Подойди к машине (знак «!»).');
    });
    onProgress?.(1);
  },

  update(dt) {
    if (player) player.update(dt);
  },

  dispose() {
    group?.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); });
  }
};

// ==================== УЛИЦА ====================
function buildStreet() {
  const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 1 });
  const matWallBld = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.95 });
  const matWindowOff = new THREE.MeshStandardMaterial({ color: 0x0a0a10 });
  const matWindowOn  = new THREE.MeshStandardMaterial({ color: 0xffd88a, emissive: 0xffcc66, emissiveIntensity: 0.8 });

  // земля (дорога)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), matAsphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // пятиэтажки по бокам
  const building = (x, z, w, h, d) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWallBld);
    b.position.set(x, h / 2, z);
    b.castShadow = b.receiveShadow = true;
    group.add(b);
    addBoxCollider(player, b);
    // окна на фасаде (обращённом к дороге)
    const cols = Math.floor(w / 2.5), rows = Math.floor(h / 3);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = Math.random() > 0.55;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), on ? matWindowOn : matWindowOff);
        const wx = x - w/2 + 1.5 + c * 2.5;
        const wy = 2 + r * 3;
        const wz = z + (z > 0 ? -d/2 - 0.02 : d/2 + 0.02);
        win.position.set(wx, wy, wz);
        win.rotation.y = z > 0 ? Math.PI : 0;
        group.add(win);
      }
    }
  };
  building(-10, 0, 8, 16, 10);
  building(10, 0, 8, 16, 10);
  building(-10, -25, 8, 20, 10);
  building(10, -25, 8, 20, 10);

  // фонари
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffdd88, emissiveIntensity: 1 });
  [[-4, 5], [4, -5], [-4, -18], [4, -30]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x222 }));
    pole.position.set(x, 2, z);
    group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2), lampMat);
    head.position.set(x, 4, z);
    group.add(head);
    const light = new THREE.PointLight(0xffcc88, 0.7, 14, 2);
    light.position.set(x, 4, z);
    group.add(light);
  });

  // МАШИНА игрока
  const car = makeCar();
  car.position.set(2.5, 0, 6);
  group.add(car);
  player.addInteractable(car, 'сесть в машину', () => {
    if (stage !== STAGES.STREET) return;
    stage = STAGES.CAR;
    showDialog('Ты садишься в машину и едешь домой...', () => {
      // «загрузка локации» — переходим сразу к подъезду
      loadEntrance();
    });
  });
}

function makeCar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x883333, metalness: 0.4, roughness: 0.5 }));
  body.position.y = 0.7;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0x222 }));
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  // фары
  const hl = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 1 });
  [-0.7, 0.7].forEach(x => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.15), hl);
    l.position.set(x, 0.7, -2);
    g.add(l);
  });
  return g;
}

// ==================== ПОДЪЕЗД ====================
function loadEntrance() {
  clearGroup();
  stage = STAGES.ENTRANCE;

  const matFloor = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 1 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 1 });

  // лестничная клетка: длинный коридор вверх по этажам (упрощённо — коридор с «этажами»)
  const corridor = buildRoom(group, 4, 30, 3, matFloor, matWall);
  // коллайдеры стен коридора
  const boxes = [
    new THREE.Box3(new THREE.Vector3(-2.2, 0, -15), new THREE.Vector3(-2, 3, 15)),
    new THREE.Box3(new THREE.Vector3(2, 0, -15), new THREE.Vector3(2.2, 3, 15)),
    new THREE.Box3(new THREE.Vector3(-2, 0, 15), new THREE.Vector3(2, 3, 15.2)),
  ];
  boxes.forEach(b => player.addCollider(b));

  // дверь квартиры в конце (5 этаж)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
  door.position.set(0, 1.1, -14.9);
  group.add(door);

  // освещение
  for (let i = -12; i <= 12; i += 6) {
    const l = new THREE.PointLight(0xffe0b0, 0.5, 8, 2);
    l.position.set(0, 2.8, i);
    group.add(l);
  }

  player.teleport(0, 1.7, 13, Math.PI);
  player.addInteractable(door, 'открыть квартиру ключом', () => {
    if (stage !== STAGES.ENTRANCE) return;
    stage = STAGES.APARTMENT;
    showDialog('Дверь тихонько открывается...', () => loadApartment());
  });
  showHint('Поднимись на 5-й этаж (иди вперёд).');
}

// ==================== КВАРТИРА ====================
function loadApartment() {
  clearGroup();
  stage = STAGES.APARTMENT;

  const matFloor = new THREE.MeshStandardMaterial({ color: 0x6a5540, roughness: 0.9 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 1 });

  // зал (большая комната)
  const hall = buildRoom(group, 8, 7, 3, matFloor, matWall);
  hall.position.set(0, 0, -2);
  // кухня (справа)
  const kitchen = buildRoom(group, 5, 5, 3, matFloor, matWall);
  kitchen.position.set(7, 0, 2);
  // маленькая комната (спальня, слева)
  const bedroom = buildRoom(group, 5, 5, 3, matFloor, matWall);
  bedroom.position.set(-7, 0, 2);

  // коллайдеры внешних стен (упрощённо)
  const walls = [
    [-4, 2, -0.1, 8, 0.2], // зал зад
    [4, 2, -0.1, 0.2, 7],  // зал право...
  ];
  // проще: добавим границы по периметру зала
  const hallBoxes = [
    new THREE.Box3(new THREE.Vector3(-4.2, 0, -5.5), new THREE.Vector3(-4, 3, 1.5)),
    new THREE.Box3(new THREE.Vector3(4, 0, -5.5), new THREE.Vector3(4.2, 3, 1.5)),
    new THREE.Box3(new THREE.Vector3(-4, 0, -5.7), new THREE.Vector3(4, 3, -5.5)),
    new THREE.Box3(new THREE.Vector3(-4, 0, 1.5), new THREE.Vector3(4, 3, 1.7)),
  ];
  hallBoxes.forEach(b => player.addCollider(b));

  // свет в зале
  const hallLight = new THREE.PointLight(0xffdd99, 0.9, 10, 2);
  hallLight.position.set(0, 2.7, -2);
  group.add(hallLight);
  const kitLight = new THREE.PointLight(0xffeedd, 0.7, 8, 2);
  kitLight.position.set(7, 2.7, 2);
  group.add(kitLight);
  const bedLight = new THREE.PointLight(0x8899ff, 0.4, 6, 2);
  bedLight.position.set(-7, 2.5, 2);
  group.add(bedLight);

  // стол в зале с радио
  const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
  table.position.set(0, 0.4, -3);
  group.add(table);
  addBoxCollider(player, table);

  // радио
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.25), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  radio.position.set(0, 1.0, -3.2);
  group.add(radio);
  // тарелка (появляется позже)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  bowl.position.set(0, 0.9, -3);
  bowl.visible = false;
  group.add(bowl);

  // холодильник на кухне
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3 }));
  fridge.position.set(7, 1, 0);
  group.add(fridge);
  addBoxCollider(player, fridge);

  // кровать в спальне
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x445577 }));
  bed.position.set(-7, 0.25, 3);
  group.add(bed);
  addBoxCollider(player, bed);

  // ключи на полке (утро)
  const keys = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.8 }));
  keys.position.set(-1.5, 1.5, -4);
  keys.visible = false;
  group.add(keys);

  player.teleport(0, 1.7, 1.0, Math.PI);

  // ---- маркеры: холодильник → радио → кровать ----
  player.addInteractable(fridge, 'достать доширак', () => {
    if (stageData.ramen) return;
    stageData.ramen = true;
    bowl.visible = true;
    fridge.userData.marker.visible = false;
    radio.userData.marker.visible = true;
    showDialog('Доширак готов. Отнеси тарелку в зал и поставь на стол.', () => {
      // перемещаем тарелку на стол
      bowl.position.set(0, 0.9, -3);
    });
    showHint('Поставь доширак на стол в зале и включи радио.');
    // обновляем интерактив стола/радио
  });

  player.addInteractable(radio, 'включить радио', () => {
    if (!stageData.ramen) return;
    radio.userData.marker.visible = false;
    playRadioScene();
  });

  // кровать (сон) — доступна после радио
  player.addInteractable(bed, 'лечь спать', () => {
    if (!stageData.radioDone) { showDialog('Сначала поешь и послушай новости.'); return; }
    bed.userData.marker.visible = false;
    showDialog('Ты ложишься на кровать и засыпаешь...', () => {
      setTimeout(() => loadMorning(), 800);
    });
  });

  // стартовое состояние маркеров
  radio.userData.marker.visible = false;
  bed.userData.marker.visible = false;

  showDialog('Ты дома. Возьми доширак из холодильника на кухне.');
  showHint('Сходи на кухню (знак «!»).');
}

// ==================== КАТСЦЕНА: РАДИО ====================
function playRadioScene() {
  stageData.radioDone = true;
  // затемнение не нужно — просто диалоги
  const lines = [
    'Ты ешь доширак и слушаешь радио...',
    'РАДИО: «СРОЧНЫЕ НОВОСТИ! Недалеко от города на заводе игрушек случилась мистика!»',
    'РАДИО: «Все работники за 1 час пропали. На полу кровь и странные следы...»',
    'РАДИО: «Ни за что не выходите из дома, пока не прояснятся обстоятельства... (помехи)»',
    'Ты знаешь, что завтра у тебя выходной. Ты решаешь отправиться в то место завтра.',
  ];
  let i = 0;
  const next = () => {
    if (i >= lines.length) {
      // разрешаем сон
      Game.player.interactables.forEach(o => {
        if ((o.userData.label || '').includes('спать')) o.userData.marker.visible = true;
      });
      showHint('Иди в спальню и ложись спать.');
      return;
    }
    showDialog(lines[i++], next);
  };
  next();
}

// ==================== УТРО ====================
function loadMorning() {
  clearGroup();
  stage = STAGES.MORNING;

  const matFloor = new THREE.MeshStandardMaterial({ color: 0x6a5540, roughness: 0.9 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 1 });
  const room = buildRoom(group, 6, 6, 3, matFloor, matWall);
  // свет утра (ярче, голубоватый)
  const l = new THREE.PointLight(0xaaccff, 1.0, 12, 2);
  l.position.set(0, 2.7, 0);
  group.add(l);

  // полка с ключами
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
  shelf.position.set(-2, 1.4, -2.7);
  group.add(shelf);
  const keys = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.8, roughness: 0.3 }));
  keys.position.set(-2, 1.5, -2.7);
  group.add(keys);

  // дверь
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
  door.position.set(2, 1.1, 2.9);
  group.add(door);

  player.teleport(0, 1.7, 2, Math.PI);

  player.addInteractable(keys, 'взять ключи от машины', () => {
    stageData.hasKeys = true;
    keys.visible = false;
    keys.userData.marker.visible = false;
    door.userData.marker.visible = true;
    showDialog('Ключи в кармане. Пора выходить.');
  });

  player.addInteractable(door, 'выйти из квартиры', () => {
    if (!stageData.hasKeys) { showDialog('Сначала возьми ключи.'); return; }
    stage = STAGES.DRIVE;
    showDialog('Ты выходишь на улицу и садишься в машину.', () => {
      showDialog('Ты едешь по лесу... Вдруг машина наезжает на капкан!', () => {
        // переход к главе 3 (лес)
        import('./level3_forest.js').then(m => {
          import('../engine.js').then(eng => {
            eng.registerLevel('level3_forest', m.default);
            eng.loadLevel('level3_forest');
          });
        }).catch(err => {
          console.error(err);
          showDialog('Глава 3 ещё не готова. Конец демо.');
        });
      });
    });
  });

  door.userData.marker.visible = false;
  showDialog('Утро. Возьми ключи с полки (знак «!»).');
  showHint('Возьми ключи от машины.');
}

// ==================== ВСПОМОГАТЕЛЬНОЕ ====================
function clearGroup() {
  if (!group) return;
  // удаляем только меши, сохраняем игрока
  group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose?.();
  });
  Game.scene.remove(group);
  group = new THREE.Group();
  Game.scene.add(group);
  // сбрасываем интерактивы игрока
  player.interactables.length = 0;
  player.colliders.length = 0;
}

export default level;