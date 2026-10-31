// js/player.js — игрок от первого лица + интерактивные объекты
import { Game, THREE, showHint, showDialog } from './engine.js';

// ==================== ИГРОК ====================
export function createPlayer(scene, camera, opts = {}) {
  const p = {
    camera,
    position: new THREE.Vector3(opts.x ?? 0, opts.y ?? 1.7, opts.z ?? 0),
    yaw: opts.yaw ?? 0,
    pitch: 0,
    speed: opts.speed ?? 3.2,
    sprint: false,
    height: 1.7,
    gravity: -18,
    velocityY: 0,
    grounded: true,
    radius: 0.35,
    colliders: [],        // массив THREE.Box3 для коллизий
    interactables: [],    // интерактивные объекты
    nearest: null,
    onAction: null,
    enabled: true,
  };

  camera.position.copy(p.position);

  // -------- обзор (мышь + тач) --------
  setupLook(p);

  // -------- метод обновления --------
  p.update = (dt) => {
    if (!p.enabled) return;

    // движение
    const fwd = Game.input.forward;
    const right = Game.input.right;
    if (fwd || right) {
      const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
      // направление вперёд по yaw
      let dx = (-sin * fwd) + (cos * right);
      let dz = (-cos * fwd) + (-sin * right);
      const len = Math.hypot(dx, dz);
      if (len > 0) { dx /= len; dz /= len; }
      const sp = p.speed * (p.sprint ? 1.7 : 1);
      const nx = p.position.x + dx * sp * dt;
      const nz = p.position.z + dz * sp * dt;
      if (!collide(p, nx, p.position.z)) p.position.x = nx;
      if (!collide(p, p.position.x, nz)) p.position.z = nz;
    }

    // гравитация
    p.velocityY += p.gravity * dt;
    p.position.y += p.velocityY * dt;
    if (p.position.y < p.height) { p.position.y = p.height; p.velocityY = 0; p.grounded = true; }

    // камера
    p.camera.position.copy(p.position);
    p.camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');

    // поиск ближайшего интерактивного объекта
    updateNearest(p);

    // действие
    if (Game.input.action) {
      Game.input.action = false; // одноразово
      if (p.nearest) {
        const obj = p.nearest;
        if (obj.userData.onInteract) obj.userData.onInteract(p);
      }
    }
  };

  // -------- регистрация интерактивного объекта --------
  p.addInteractable = (mesh, label, onInteract) => {
    mesh.userData.interact = true;
    mesh.userData.label = label;
    mesh.userData.onInteract = onInteract;
    p.interactables.push(mesh);
    // маркер "!" над объектом
    const marker = makeMarker();
    marker.position.copy(mesh.position).add(new THREE.Vector3(0, 1.2, 0));
    mesh.add(marker);
    mesh.userData.marker = marker;
    return mesh;
  };

  // -------- коллайдеры --------
  p.addCollider = (box3) => p.colliders.push(box3);

  p.teleport = (x, y, z, yaw) => {
    p.position.set(x, y ?? p.height, z ?? 0);
    if (yaw !== undefined) p.yaw = yaw;
    p.velocityY = 0;
  };

  Game.player = p;
  return p;
}

// ==================== ОБЗОР ====================
function setupLook(p) {
  // мышь (pointer lock по клику)
  const canvas = Game.renderer.domElement;
  canvas.addEventListener('click', () => {
    if (!Game.isMobile && !document.pointerLockElement) canvas.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    p.lockActive = !!document.pointerLockElement;
  });
  document.addEventListener('mousemove', (e) => {
    if (!p.lockActive || Game.isMobile) return;
    p.yaw -= e.movementX * 0.0025;
    p.pitch -= e.movementY * 0.0025;
    clampPitch(p);
  });

  // тач: свайп правой частью экрана
  if (Game.isMobile) {
    let touching = false, lastX = 0, lastY = 0;
    canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      if (t.clientX > window.innerWidth * 0.4) { touching = true; lastX = t.clientX; lastY = t.clientY; }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!touching) return;
      const t = e.changedTouches[0];
      p.yaw -= (t.clientX - lastX) * 0.006;
      p.pitch -= (t.clientY - lastY) * 0.006;
      lastX = t.clientX; lastY = t.clientY;
      clampPitch(p);
    }, { passive: true });
    canvas.addEventListener('touchend', () => { touching = false; });
  }
}

function clampPitch(p) {
  const lim = Math.PI / 2 - 0.05;
  if (p.pitch > lim) p.pitch = lim;
  if (p.pitch < -lim) p.pitch = -lim;
}

// ==================== КОЛЛИЗИИ ====================
function collide(p, x, z) {
  const h = 0.5;
  const min = new THREE.Vector3(x - p.radius, p.position.y - p.height + 0.1, z - p.radius);
  const max = new THREE.Vector3(x + p.radius, p.position.y + 0.1, z + p.radius);
  const testBox = new THREE.Box3(min, max);
  for (const c of p.colliders) {
    if (testBox.intersectsBox(c)) return true;
  }
  return false;
}

// ==================== ПОИСК БЛИЖАЙШЕГО ====================
function updateNearest(p) {
  let best = null, bestDist = 2.4; // радиус взаимодействия
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(p.camera.quaternion);
  for (const obj of p.interactables) {
    if (!obj.visible) continue;
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const dist = wp.distanceTo(p.position);
    if (dist < bestDist) {
      // проверка, что объект примерно перед игроком
      const toObj = wp.clone().sub(p.position).normalize();
      const dot = toObj.dot(forward);
      if (dot > 0.2 || dist < 1.2) { best = obj; bestDist = dist; }
    }
  }
  if (best !== p.nearest) {
    // убрать подсветку у старого
    if (p.nearest && p.nearest.userData.marker) p.nearest.userData.marker.visible = true;
    p.nearest = best;
    if (best && best.userData.label) {
      showHint(Game.isMobile ? 'Нажми «!»' : 'E — ' + best.userData.label);
    } else {
      showHint(null);
    }
  }
}

// ==================== МАРКЕР "!" ====================
function makeMarker() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  // фон-кружок
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220,40,40,0.9)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  // восклицательный знак
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 92px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 64, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.5, 0.5, 0.5);
  sprite.renderOrder = 999;
  return sprite;
}

// ==================== ПРОСТЫЕ КОЛЛАЙДЕРЫ ====================
// Хелпер: добавить стену/коробку как коллайдер
export function addBoxCollider(player, mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  player.addCollider(box);
  return box;
}

// Хелпер: создать комнату (пол + 4 стены) и вернуть коллайдеры
export function buildRoom(scene, w, d, h, matFloor, matWall) {
  const group = new THREE.Group();
  // пол
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  // потолок
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matWall);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = h;
  group.add(ceil);
  // стены
  const makeWall = (x, z, rotY, len) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, h), matWall);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = rotY;
    wall.receiveShadow = true;
    group.add(wall);
    return wall;
  };
  makeWall(0, -d / 2, 0, w);           // задняя
  makeWall(0, d / 2, Math.PI, w);      // передняя
  makeWall(-w / 2, 0, Math.PI / 2, d); // левая
  makeWall(w / 2, 0, -Math.PI / 2, d); // правая
  scene.add(group);
  return group;
}