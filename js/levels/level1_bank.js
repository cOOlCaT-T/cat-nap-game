// js/levels/level1_bank.js — Глава 1: БАНК (без модулей)
window.Level1Bank = {
  player: null,
  group: null,
  tasks: null,
  mainLights: [],

  init: function(scene, camera, onProgress) {
    const THREE = Game.THREE;
    const self = this;
    
    this.group = new THREE.Group();
    scene.add(this.group);
    
    this.player = Player.create(scene, camera, { x: 0, y: 1.7, z: 4, yaw: Math.PI });
    this.player.speed = 2.6;
    
    this.tasks = [
      { id: 'pc', label: 'Выключить компьютер', done: false },
      { id: 'safe', label: 'Проверить хранилище', done: false },
      { id: 'light', label: 'Выключить свет', done: false },
      { id: 'exit', label: 'Закрыть банк на ключ', done: false }
    ];

    if (onProgress) onProgress(0.15);

    const matFloor = new THREE.MeshStandardMaterial({ color: 0x6b6f78, roughness: 0.9 });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
    const matWood  = new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 0.8 });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.7, roughness: 0.3 });

    const W = 14, D = 12, H = 3.2;
    Player.buildRoom(this.group, W, D, H, matFloor, matWall);
    this.addWallColliders(W, D, H);

    if (onProgress) onProgress(0.35);

    // Рабочий стол
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.0), matWood);
    desk.position.set(-3.5, 0.4, -1.5);
    desk.castShadow = desk.receiveShadow = true;
    this.group.add(desk);
    Player.addBoxCollider(this.player, desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.1), matMetal);
    monitor.position.set(-3.5, 1.15, -1.7);
    this.group.add(monitor);

    const screenMat = new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x2a6aff, emissiveIntensity: 0.9 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), screenMat);
    screen.position.set(-3.5, 1.15, -1.64);
    this.group.add(screen);

    this.player.addInteractable(monitor, 'выключить компьютер', function() {
      if (self.tasks[0].done) return;
      self.tasks[0].done = true;
      screenMat.emissiveIntensity = 0;
      screenMat.emissive.setHex(0x000000);
      screenMat.color.setHex(0x111111);
      self.updateMarkers();
      self.nextTaskHint();
    });

    if (onProgress) onProgress(0.5);

    // Хранилище
    const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.2), matMetal);
    vaultDoor.position.set(5.5, 1.3, -D/2 + 0.12);
    vaultDoor.castShadow = true;
    this.group.add(vaultDoor);

    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 24), matMetal);
    wheel.position.set(5.5, 1.4, -D/2 + 0.25);
    this.group.add(wheel);

    this.player.addInteractable(vaultDoor, 'проверить хранилище', function() {
      if (self.tasks[1].done) return;
      if (!self.tasks[0].done) { Game.showDialog('Сначала выключи компьютер.'); return; }
      self.tasks[1].done = true;
      Game.showDialog('Хранилище заперто. Всё в порядке.');
      self.updateMarkers();
      self.nextTaskHint();
    });

    if (onProgress) onProgress(0.65);

    // Выключатель
    const swPanel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.08), matMetal);
    swPanel.position.set(-W/2 + 0.1, 1.6, 3);
    this.group.add(swPanel);
    this.player.addInteractable(swPanel, 'выключить свет', function() {
      if (self.tasks[2].done) return;
      if (!self.tasks[1].done) { Game.showDialog('Сначала проверь хранилище.'); return; }
      self.tasks[2].done = true;
      self.mainLights.forEach(function(l) { l.intensity = 0.05; });
      Game.scene.fog = new THREE.Fog(0x05050a, 8, 40);
      Game.showDialog('Свет выключен. Пора уходить.');
      self.updateMarkers();
      self.nextTaskHint();
    });

    if (onProgress) onProgress(0.75);

    // Входная дверь
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.15), matWood);
    door.position.set(0, 1.2, D/2 - 0.08);
    this.group.add(door);
    this.player.addInteractable(door, 'закрыть банк на ключ', function() {
      if (self.tasks[3].done) return;
      if (!self.tasks[2].done) { Game.showDialog('Сначала выключи свет.'); return; }
      self.tasks[3].done = true;
      Game.showDialog('Банк закрыт. Ключ в кармане.', function() {
        self.transitionToStreet();
      });
    });

    // Освещение
    this.mainLights = [];
    const lampPositions = [[-4, H-0.2, -3], [4, H-0.2, -3], [0, H-0.2, 2]];
    lampPositions.forEach(function(pos) {
      const lamp = new THREE.PointLight(0xfff0dd, 0.9, 12, 2);
      lamp.position.set(pos[0], pos[1], pos[2]);
      self.group.add(lamp);
      self.mainLights.push(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffeeaa, emissiveIntensity: 0.6 }));
      bulb.position.copy(lamp.position);
      self.group.add(bulb);
    });

    const emerg = new THREE.PointLight(0xff3333, 0.15, 8);
    emerg.position.set(0, 2.5, -D/2 + 1);
    this.group.add(emerg);

    // Декор
    for (let i = 0; i < 2; i++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 0.5), matWall);
      col.position.set(-2 + i * 4, H/2, 0);
      col.castShadow = true;
      this.group.add(col);
      Player.addBoxCollider(this.player, col);
    }

    if (onProgress) onProgress(0.9);

    this.updateMarkers();
    Game.showHint(null);
    
    setTimeout(function() {
      Game.showDialog('Конец смены. Нужно закончить дела в банке — смотри на знак «!».');
      self.nextTaskHint();
    }, 600);

    if (onProgress) onProgress(1);
  },

  update: function(dt) {
    if (this.player) this.player.update(dt);
    if (this.player) {
      this.player.interactables.forEach(function(o) {
        const m = o.userData.marker;
        if (m && m.visible) m.position.y = 1.2 + Math.sin(Date.now() * 0.003) * 0.1;
      });
    }
  },

  dispose: function() {
    if (this.group) {
      this.group.traverse(function(o) { 
        if (o.geometry) o.geometry.dispose(); 
        if (o.material) o.material.dispose && o.material.dispose(); 
      });
    }
  },

  addWallColliders: function(W, D, H) {
    const THREE = Game.THREE;
    const t = 0.3;
    const boxes = [
      { x: 0, z: -D/2 - t/2, w: W + 2*t, d: t },
      { x: 0, z: D/2 + t/2, w: W + 2*t, d: t },
      { x: -W/2 - t/2, z: 0, w: t, d: D + 2*t },
      { x: W/2 + t/2, z: 0, w: t, d: D + 2*t },
    ];
    const self = this;
    boxes.forEach(function(b) {
      const box = new THREE.Box3(
        new THREE.Vector3(b.x - b.w/2, 0, b.z - b.d/2),
        new THREE.Vector3(b.x + b.w/2, H, b.z + b.d/2)
      );
      self.player.addCollider(box);
    });
  },

  updateMarkers: function() {
    const self = this;
    this.player.interactables.forEach(function(obj) {
      const m = obj.userData.marker;
      if (!m) return;
      const label = (obj.userData.label || '').toLowerCase();
      let show = false;
      if (label.indexOf('компьютер') !== -1) show = !self.tasks[0].done;
      if (label.indexOf('хранилище') !== -1) show = self.tasks[0].done && !self.tasks[1].done;
      if (label.indexOf('свет') !== -1) show = self.tasks[1].done && !self.tasks[2].done;
      if (label.indexOf('ключ') !== -1) show = self.tasks[2].done && !self.tasks[3].done;
      m.visible = show;
    });
  },

  nextTaskHint: function() {
    const next = this.tasks.find(function(t) { return !t.done; });
    if (next) Game.showHint('Задача: ' + next.label);
    else Game.showHint(null);
  },

  transitionToStreet: function() {
    const self = this;
    Game.paused = true;
    Game.showDialog('Ты выходишь из банка. На улице тихо и темно...', function() {
      Game.registerLevel('level2_street', window.Level2Street);
      Game.loadLevel('level2_street');
    });
  }
};

// Регистрируем уровень при загрузке скрипта
Game.registerLevel('level1_bank', window.Level1Bank);
