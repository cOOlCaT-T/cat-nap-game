// js/levels/level2_street.js — Глава 2: УЛИЦА → ПОДЪЕЗД → КВАРТИРА (без модулей)
window.Level2Street = {
  player: null,
  group: null,
  stage: '',
  stageData: {},

  init: function(scene, camera, onProgress) {
    const THREE = Game.THREE;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.player = Player.create(scene, camera, { x: 0, y: 1.7, z: 8, yaw: Math.PI });
    this.player.speed = 2.8;
    this.stage = 'street';
    this.stageData = {};

    if (onProgress) onProgress(0.1);
    this.buildStreet();
    if (onProgress) onProgress(0.7);

    Game.showDialog('Наконец-то смена закончена. Машина стоит рядом.', function() {
      Game.showHint('Подойди к машине (знак «!»).');
    });
    if (onProgress) onProgress(1);
  },

  update: function(dt) {
    if (this.player) this.player.update(dt);
  },

  dispose: function() {
    if (this.group) {
      this.group.traverse(function(o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose && o.material.dispose();
      });
    }
  },

  buildStreet: function() {
    const THREE = Game.THREE;
    const self = this;
    const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 1 });
    const matWallBld = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.95 });
    const matWindowOff = new THREE.MeshStandardMaterial({ color: 0x0a0a10 });
    const matWindowOn  = new THREE.MeshStandardMaterial({ color: 0xffd88a, emissive: 0xffcc66, emissiveIntensity: 0.8 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), matAsphalt);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const building = function(x, z, w, h, d) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWallBld);
      b.position.set(x, h / 2, z);
      b.castShadow = b.receiveShadow = true;
      self.group.add(b);
      Player.addBoxCollider(self.player, b);
      
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
          self.group.add(win);
        }
      }
    };
    
    building(-10, 0, 8, 16, 10);
    building(10, 0, 8, 16, 10);
    building(-10, -25, 8, 20, 10);
    building(10, -25, 8, 20, 10);

    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffdd88, emissiveIntensity: 1 });
    [[-4, 5], [4, -5], [-4, -18], [4, -30]].forEach(function(pos) {
      const x = pos[0], z = pos[1];
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x222 }));
      pole.position.set(x, 2, z);
      self.group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2), lampMat);
      head.position.set(x, 4, z);
      self.group.add(head);
      const light = new THREE.PointLight(0xffcc88, 0.7, 14, 2);
      light.position.set(x, 4, z);
      self.group.add(light);
    });

    const car = this.makeCar();
    car.position.set(2.5, 0, 6);
    this.group.add(car);
    this.player.addInteractable(car, 'сесть в машину', function() {
      if (self.stage !== 'street') return;
      self.stage = 'car';
      Game.showDialog('Ты садишься в машину и едешь домой...', function() {
        self.loadEntrance();
      });
    });
  },

  makeCar: function() {
    const THREE = Game.THREE;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x883333, metalness: 0.4, roughness: 0.5 }));
    body.position.y = 0.7;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0x222 }));
    cabin.position.set(0, 1.3, -0.2);
    g.add(cabin);
    const hl = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 1 });
    [-0.7, 0.7].forEach(function(x) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.15), hl);
      l.position.set(x, 0.7, -2);
      g.add(l);
    });
    return g;
  },

  clearGroup: function() {
    const THREE = Game.THREE;
    if (!this.group) return;
    this.group.traverse(function(o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose && o.material.dispose();
    });
    Game.scene.remove(this.group);
    this.group = new THREE.Group();
    Game.scene.add(this.group);
    this.player.interactables.length = 0;
    this.player.colliders.length = 0;
  },

  loadEntrance: function() {
    const THREE = Game.THREE;
    const self = this;
    this.clearGroup();
    this.stage = 'entrance';

    const matFloor = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 1 });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 1 });

    Player.buildRoom(this.group, 4, 30, 3, matFloor, matWall);
    const boxes = [
      new THREE.Box3(new THREE.Vector3(-2.2, 0, -15), new THREE.Vector3(-2, 3, 15)),
      new THREE.Box3(new THREE.Vector3(2, 0, -15), new THREE.Vector3(2.2, 3, 15)),
      new THREE.Box3(new THREE.Vector3(-2, 0, 15), new THREE.Vector3(2, 3, 15.2)),
    ];
    boxes.forEach(function(b) { self.player.addCollider(b); });

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
    door.position.set(0, 1.1, -14.9);
    this.group.add(door);

    for (let i = -12; i <= 12; i += 6) {
      const l = new THREE.PointLight(0xffe0b0, 0.5, 8, 2);
      l.position.set(0, 2.8, i);
      this.group.add(l);
    }

    this.player.teleport(0, 1.7, 13, Math.PI);
    this.player.addInteractable(door, 'открыть квартиру ключом', function() {
      if (self.stage !== 'entrance') return;
      self.stage = 'apartment';
      Game.showDialog('Дверь тихонько открывается...', function() { self.loadApartment(); });
    });
    Game.showHint('Поднимись на 5-й этаж (иди вперёд).');
  },

  loadApartment: function() {
    const THREE = Game.THREE;
    const self = this;
    this.clearGroup();
    this.stage = 'apartment';

    const matFloor = new THREE.MeshStandardMaterial({ color: 0x6a5540, roughness: 0.9 });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 1 });

    const hall = Player.buildRoom(this.group, 8, 7, 3, matFloor, matWall);
    hall.position.set(0, 0, -2);
    const kitchen = Player.buildRoom(this.group, 5, 5, 3, matFloor, matWall);
    kitchen.position.set(7, 0, 2);
    const bedroom = Player.buildRoom(this.group, 5, 5, 3, matFloor, matWall);
    bedroom.position.set(-7, 0, 2);

    const hallBoxes = [
      new THREE.Box3(new THREE.Vector3(-4.2, 0, -5.5), new THREE.Vector3(-4, 3, 1.5)),
      new THREE.Box3(new THREE.Vector3(4, 0, -5.5), new THREE.Vector3(4.2, 3, 1.5)),
      new THREE.Box3(new THREE.Vector3(-4, 0, -5.7), new THREE.Vector3(4, 3, -5.5)),
      new THREE.Box3(new THREE.Vector3(-4, 0, 1.5), new THREE.Vector3(4, 3, 1.7)),
    ];
    hallBoxes.forEach(function(b) { self.player.addCollider(b); });

    const hallLight = new THREE.PointLight(0xffdd99, 0.9, 10, 2);
    hallLight.position.set(0, 2.7, -2);
    this.group.add(hallLight);
    const kitLight = new THREE.PointLight(0xffeedd, 0.7, 8, 2);
    kitLight.position.set(7, 2.7, 2);
    this.group.add(kitLight);
    const bedLight = new THREE.PointLight(0x8899ff, 0.4, 6, 2);
    bedLight.position.set(-7, 2.5, 2);
    this.group.add(bedLight);

    const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
    table.position.set(0, 0.4, -3);
    this.group.add(table);
    Player.addBoxCollider(this.player, table);

    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.25), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    radio.position.set(0, 1.0, -3.2);
    this.group.add(radio);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    bowl.position.set(0, 0.9, -3);
    bowl.visible = false;
    this.group.add(bowl);

    const fridge = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3 }));
    fridge.position.set(7, 1, 0);
    this.group.add(fridge);
    Player.addBoxCollider(this.player, fridge);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x445577 }));
    bed.position.set(-7, 0.25, 3);
    this.group.add(bed);
    Player.addBoxCollider(this.player, bed);

    this.player.teleport(0, 1.7, 1.0, Math.PI);

    this.player.addInteractable(fridge, 'достать доширак', function() {
      if (self.stageData.ramen) return;
      self.stageData.ramen = true;
      bowl.visible = true;
      fridge.userData.marker.visible = false;
      radio.userData.marker.visible = true;
      Game.showDialog('Доширак готов. Отнеси тарелку в зал и поставь на стол.');
      Game.showHint('Поставь доширак на стол в зале и включи радио.');
    });

    this.player.addInteractable(radio, 'включить радио', function() {
      if (!self.stageData.ramen) return;
      radio.userData.marker.visible = false;
      self.playRadioScene(bed);
    });

    this.player.addInteractable(bed, 'лечь спать', function() {
      if (!self.stageData.radioDone) { Game.showDialog('Сначала поешь и послушай новости.'); return; }
      bed.userData.marker.visible = false;
      Game.showDialog('Ты ложишься на кровать и засыпаешь...', function() {
        setTimeout(function() { self.loadMorning(); }, 800);
      });
    });

    radio.userData.marker.visible = false;
    bed.userData.marker.visible = false;

    Game.showDialog('Ты дома. Возьми доширак из холодильника на кухне.');
    Game.showHint('Сходи на кухню (знак «!»).');
  },

  playRadioScene: function(bed) {
    const self = this;
    this.stageData.radioDone = true;
    const lines = [
      'Ты ешь доширак и слушаешь радио...',
      'РАДИО: «СРОЧНЫЕ НОВОСТИ! Недалеко от города на заводе игрушек случилась мистика!»',
      'РАДИО: «Все работники за 1 час пропали. На полу кровь и странные следы...»',
      'РАДИО: «Ни за что не выходите из дома, пока не прояснятся обстоятельства... (помехи)»',
      'Ты знаешь, что завтра у тебя выходной. Ты решаешь отправиться в то место завтра.',
    ];
    let i = 0;
    const next = function() {
      if (i >= lines.length) {
        bed.userData.marker.visible = true;
        Game.showHint('Иди в спальню и ложись спать.');
        return;
      }
      Game.showDialog(lines[i++], next);
    };
    next();
  },

  loadMorning: function() {
    const THREE = Game.THREE;
    const self = this;
    this.clearGroup();
    this.stage = 'morning';

    const matFloor = new THREE.MeshStandardMaterial({ color: 0x6a5540, roughness: 0.9 });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 1 });
    Player.buildRoom(this.group, 6, 6, 3, matFloor, matWall);
    
    const l = new THREE.PointLight(0xaaccff, 1.0, 12, 2);
    l.position.set(0, 2.7, 0);
    this.group.add(l);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
    shelf.position.set(-2, 1.4, -2.7);
    this.group.add(shelf);
    
    const keys = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.8, roughness: 0.3 }));
    keys.position.set(-2, 1.5, -2.7);
    this.group.add(keys);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
    door.position.set(2, 1.1, 2.9);
    this.group.add(door);

    this.player.teleport(0, 1.7, 2, Math.PI);

    this.player.addInteractable(keys, 'взять ключи от машины', function() {
      self.stageData.hasKeys = true;
      keys.visible = false;
      keys.userData.marker.visible = false;
      door.userData.marker.visible = true;
      Game.showDialog('Ключи в кармане. Пора выходить.');
    });

    this.player.addInteractable(door, 'выйти из квартиры', function() {
      if (!self.stageData.hasKeys) { Game.showDialog('Сначала возьми ключи.'); return; }
      self.stage = 'drive';
      Game.showDialog('Ты выходишь на улицу и садишься в машину.', function() {
        Game.showDialog('Ты едешь по лесу... Вдруг машина наезжает на капкан!', function() {
          Game.registerLevel('level3_forest', window.Level3Forest);
          Game.loadLevel('level3_forest');
        });
      });
    });

    door.userData.marker.visible = false;
    Game.showDialog('Утро. Возьми ключи с полки (знак «!»).');
    Game.showHint('Возьми ключи от машины.');
  }
};

// Регистрируем уровень при загрузке скрипта
Game.registerLevel('level2_street', window.Level2Street);
