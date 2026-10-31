// js/levels/level3_forest.js — Глава 1 (финал): ЛЕС → ИЗБУШКА (без модулей)
window.Level3Forest = {
  player: null,
  group: null,
  stage: '',
  stageData: {},

  init: function(scene, camera, onProgress) {
    const THREE = Game.THREE;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.player = Player.create(scene, camera, { x: 0, y: 1.7, z: 10, yaw: Math.PI });
    this.player.speed = 2.6;
    this.stage = 'crash';
    this.stageData = {};

    if (onProgress) onProgress(0.1);
    this.buildForest();
    if (onProgress) onProgress(0.5);
    this.buildCarWreck();
    if (onProgress) onProgress(0.7);
    this.buildPath();
    if (onProgress) onProgress(0.85);
    this.buildHut();
    if (onProgress) onProgress(1);

    Game.showDialog('Машина наехала на капкан. Придётся идти пешком.', function() {
      Game.showHint('Найди тропинку сквозь деревья (знак «!»).');
    });
  },

  update: function(dt) {
    if (this.player) this.player.update(dt);
    if (this.stage === 'hut') {
      const t = Date.now() * 0.001;
      const lamp = this.group.getObjectByName('hutLamp');
      if (lamp) lamp.intensity = 0.7 + Math.sin(t * 2) * 0.15;
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

  buildForest: function() {
    const THREE = Game.THREE;
    const self = this;
    const matGround = new THREE.MeshStandardMaterial({ color: 0x1a2a15, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), matGround);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    Game.scene.fog = new THREE.Fog(0x0a1410, 8, 50);
    Game.scene.background = new THREE.Color(0x0a1410);

    const matTrunk = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
    const matLeaf  = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 1 });
    
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      if (Math.abs(x) < 3 && z < 15 && z > -30) continue;
      if (Math.hypot(x, z - 10) < 6) continue;
      
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4), matTrunk);
      trunk.position.set(x, 2, z);
      trunk.castShadow = true;
      this.group.add(trunk);
      
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 6), matLeaf);
      crown.position.set(x, 5, z);
      crown.castShadow = true;
      this.group.add(crown);
      
      const box = new THREE.Box3(new THREE.Vector3(x - 0.3, 0, z - 0.3), new THREE.Vector3(x + 0.3, 4, z + 0.3));
      this.player.addCollider(box);
    }

    const moon = new THREE.DirectionalLight(0x8899cc, 0.5);
    moon.position.set(-10, 20, -10);
    this.group.add(moon);
    const amb = new THREE.AmbientLight(0x223344, 0.4);
    this.group.add(amb);
  },

  buildCarWreck: function() {
    const THREE = Game.THREE;
    const self = this;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x663333, metalness: 0.3, roughness: 0.7 }));
    body.position.y = 0.6;
    body.rotation.z = 0.15;
    body.rotation.x = -0.1;
    body.castShadow = true;
    g.add(body);
    
    const trap = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.3 }));
    trap.rotation.x = Math.PI / 2;
    trap.position.set(-0.8, 0.1, 1.5);
    g.add(trap);
    g.position.set(0, 0, 10);
    this.group.add(g);
    Player.addBoxCollider(this.player, body);

    const trigger = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
    trigger.position.set(0, 1, 2);
    this.group.add(trigger);
    
    this.player.addInteractable(trigger, 'пойти по тропинке', function() {
      if (self.stage !== 'crash') return;
      self.stage = 'path';
      trigger.userData.marker.visible = false;
      Game.showDialog('Ты видишь тропинку сквозь деревья и идёшь по ней.', function() {
        self.player.teleport(0, 1.7, -5, Math.PI);
        Game.showHint('Иди по тропинке к избушке.');
        const hutDoor = self.group.getObjectByName('hutDoor');
        if (hutDoor) hutDoor.userData.marker.visible = true;
      });
    });
  },

  buildPath: function() {
    const THREE = Game.THREE;
    const matPath = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
    for (let z = 2; z > -28; z -= 2) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), matPath);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(0, 0.02, z);
      tile.receiveShadow = true;
      this.group.add(tile);
    }
  },

  buildHut: function() {
    const THREE = Game.THREE;
    const self = this;
    const hut = new THREE.Group();
    hut.position.set(0, 0, -32);

    const matLog = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.95 });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), matLog);
    walls.position.y = 2;
    walls.castShadow = walls.receiveShadow = true;
    hut.add(walls);
    Player.addBoxCollider(this.player, walls);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }));
    roof.position.y = 5.2;
    roof.rotation.y = Math.PI / 4;
    hut.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
    door.position.set(0, 1.1, 2.55);
    door.name = 'hutDoor';
    hut.add(door);

    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.9 }));
    win.position.set(1.8, 2, 2.56);
    hut.add(win);

    const lamp = new THREE.PointLight(0xffaa55, 0.8, 10, 2);
    lamp.position.set(0, 2.8, 3);
    lamp.name = 'hutLamp';
    hut.add(lamp);

    this.group.add(hut);

    this.player.addInteractable(door, 'постучать в дверь', function() {
      if (self.stage === 'end') return;
      if (self.stage !== 'path' && self.stage !== 'hut') return;
      self.stage = 'hut';
      door.userData.marker.visible = false;
      self.startEnding();
    });
    door.userData.marker.visible = false;
  },

  startEnding: function() {
    this.stage = 'end';
    Game.showHint(null);
    const lines = [
      'Ты стучишь в дверь... Тишина.',
      'Слышны медленные шаги за дверью.',
      'Дверь медленно открывается...',
    ];
    let i = 0;
    const self = this;
    const next = function() {
      if (i >= lines.length) {
        self.fadeToBlack(function() {
          Game.showDialog('КОНЕЦ ГЛАВЫ 1 — «НАЧАЛО»', function() {
            Game.running = false;
            document.getElementById('game').classList.add('hidden');
            document.getElementById('menu').classList.remove('hidden');
            Game.currentLevel = null;
            Game.player = null;
          });
        });
      } else {
        Game.showDialog(lines[i++], next);
      }
    };
    next();
  },

  fadeToBlack: function(cb) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;transition:opacity 2s;z-index:999;';
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.style.opacity = '1'; });
    setTimeout(function() {
      cb();
      setTimeout(function() { overlay.remove(); }, 500);
    }, 2200);
  }
};

// Регистрируем уровень при загрузке скрипта
Game.registerLevel('level3_forest', window.Level3Forest);
