'use strict';
/* NEON CRASHERS 3D — primera persona. x/z: suelo | y: altura. 1 unidad = radio de juego. */
const R = 2, CONE = .85, BX = 16, BZ = 10;                    // radio de ataque=2; CONE = cos(~32°): cono frontal de ~64°
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rand = (a, b) => a + Math.random() * (b - a);
const keys = new Set(), pressed = new Set(), released = new Set(), mouse = { x: 0, y: 0 };
addEventListener('keydown', e => { if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys.delete(e.code); released.add(e.code); });
addEventListener('mousemove', e => { if (document.pointerLockElement) { mouse.x += e.movementX; mouse.y += e.movementY; } });
addEventListener('mousedown', e => { if (!game.playing || e.target.id === 'pb') return; if (!document.pointerLockElement) A.lock(); const c = e.button === 2 ? 'KeyK' : 'KeyJ'; if (!keys.has(c)) pressed.add(c); keys.add(c); });
addEventListener('mouseup', e => { const c = e.button === 2 ? 'KeyK' : 'KeyJ'; keys.delete(c); released.add(c); });
addEventListener('contextmenu', e => e.preventDefault());
const dn = (...k) => k.some(c => keys.has(c)), pr = k => pressed.has(k), $ = id => document.getElementById(id);

/* ---------- Escena ---------- */
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0220); scene.fog = new THREE.Fog(0x0a0220, 14, 45);
const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .05, 100); scene.add(cam);   // cámara en escena para colgarle el arma
const ren = new THREE.WebGLRenderer({ antialias: true }); ren.setSize(innerWidth, innerHeight); document.body.insertBefore(ren.domElement, document.body.firstChild);
addEventListener('resize', () => { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
scene.add(new THREE.AmbientLight(0x8888cc, .9)); const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(5, 12, 8); scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * BX + 4, 2 * BZ + 4), new THREE.MeshStandardMaterial({ color: 0x0b0618 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const grid = new THREE.GridHelper(2 * BX + 4, 2 * BX + 4, 0x00f0ff, 0x2a0a4a); grid.scale.z = (2 * BZ + 4) / (2 * BX + 4); grid.position.y = .01; scene.add(grid);
const mat = (c, o = .5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: o });
const box = (w, h, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); scene.add(m); return m; };
/* Colisión melee: el objetivo debe estar a ≤ radio (2) y dentro del cono frontal de quien ataca (a.fx, a.fz) */
const inRange = (a, b, r = R) => { const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); return d <= r + b.w / 2 && (d < .6 || (dx * a.fx + dz * a.fz) / d > CONE); };

/* ---------- Entidad base ---------- */
class Ent {
  constructor(x, z, w, h, hp, c) { Object.assign(this, { x, z, y: 0, w, h, hp, maxHp: hp, c, fx: 0, fz: 1, vx: 0, vz: 0, fl: 0, dead: false }); this.m = box(w, h, w, c); }
  hurt(d, px = 0, pz = 0) { this.hp -= d; this.fl = .1; this.vx += px; this.vz += pz; if (this.hp <= 0) this.dead = true; }
  sync(dt, lx = BX, lz = BZ) {
    this.x = clamp(this.x + this.vx * dt, -lx, lx); this.z = clamp(this.z + this.vz * dt, -lz, lz);
    const k = Math.pow(.02, dt); this.vx *= k; this.vz *= k; this.fl = Math.max(0, this.fl - dt);
    this.m.position.set(this.x, this.y + this.h / 2, this.z); this.m.material.emissive.setHex(this.fl > 0 ? 0xffffff : this.c);
  }
  kill() { scene.remove(this.m); }
  vul() { return true; }
}

/* ---------- Clases jugables (cada ataque principal ya es su golpe básico) ---------- */
const CLASSES = {
  robot:   { n: 'ROBOT',          c: 0x00f0ff, hp: 90,  sp: 7,   dmg: 9,  d: 'Dispara plasma. K: mini dash (recarga corta si hay enemigos cerca).' },
  samurai: { n: 'CYBORG SAMURÁI', c: 0xff2bd6, hp: 110, sp: 6,   dmg: 12, d: 'Combo de 3 espadas. K: círculo de espadas, invulnerable y daña a los de dentro.' },
  bomber:  { n: 'BOMBARDERO',     c: 0xffe600, hp: 85,  sp: 6,   dmg: 14, d: 'Lanza explosivos con área de daño. Mantén el clic: más lejos llega.' },
  octo:    { n: 'HUMANO-PULPO',   c: 0x4dff88, hp: 130, sp: 5.5, dmg: 11, d: 'Golpea con 4 tentáculos. L: agarra y lanza enemigos. K: salto giratorio con onda.' },
};
/* Skin de clase en primera persona: modelo pegado a la cámara */
function makeVM(k, c) {
  const g = new THREE.Group(), M = (w, h, d, x, y, z, col = c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col })); m.position.set(x, y, z); g.add(m); return m; };
  if (k === 'robot') { M(.14, .14, .6, .32, -.3, -.5, 0x888899); M(.08, .08, .3, .32, -.3, -.95); M(.1, .1, .4, .36, -.45, -.25, 0x555566); }
  if (k === 'samurai') { [-.25, 0, .25].forEach((a, i) => { const m = M(.04, .04, .9, .35 + i * .05, -.25, -.7, 0xdddddd); m.rotation.y = -a * .8; }); M(.1, .1, .35, .36, -.4, -.3); }
  if (k === 'bomber') { const s = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0x333333 })); s.position.set(.3, -.28, -.5); g.add(s); M(.03, .1, .03, .3, -.12, -.5); M(.1, .1, .4, .38, -.45, -.3); }
  if (k === 'octo') [[-.45, -.3], [-.3, -.45], [.3, -.45], [.45, -.3]].forEach(([x, y]) => { const m = M(.07, .07, .9, x, y, -.6); m.rotation.y = -x * .5; });
  cam.add(g); return g;
}
class Player extends Ent {
  constructor(k) {
    const c = CLASSES[k]; super(0, 6, .8, 1.6, c.hp, c.c);
    Object.assign(this, { k, sp: c.sp, dmg: c.dmg, lvl: 1, xp: 0, inv: 0, cd1: 0, cd2: 0, ac: 0, ch: 0, spin: 0, sc: 0, air: 0, cb: 0, yaw: 0, pitch: 0, fx: 0, fz: -1 });
    this.m.visible = false; this.vm = makeVM(k, c.c);
    this.blades = [0, 1, 2].map(() => box(1.1, .08, .08, 0xff2bd6)); this.blades.forEach(b => b.visible = false);
    this.aim = new THREE.Mesh(new THREE.RingGeometry(.4, .55, 24), new THREE.MeshBasicMaterial({ color: 0xffe600, side: 2 })); this.aim.rotation.x = -Math.PI / 2; this.aim.visible = false; scene.add(this.aim);
  }
  get need() { return Math.floor(80 * Math.pow(this.lvl, 1.35)); }
  gainXP(a, g) {
    this.xp += a;
    while (this.xp >= this.need) { this.xp -= this.need; this.lvl++; this.maxHp += 15; this.dmg += 2; if (!g.enemies.some(e => e.isBoss)) this.hp = this.maxHp; }   // cura total salvo en jefes
  }
  hurt(d) { if (this.inv > 0 || this.dead) return; this.hp -= d; this.inv = .7; if (this.hp <= 0) this.dead = true; }
  update(g, dt) {
    this.cd1 -= dt; this.cd2 -= dt; this.ac -= dt; this.inv -= dt;
    this.yaw -= mouse.x * .0025 + ((dn('ArrowRight') ? 1 : 0) - (dn('ArrowLeft') ? 1 : 0)) * 2 * dt;       // mirar: mouse o flechas
    this.pitch = clamp(this.pitch - mouse.y * .0025 + ((dn('ArrowUp') ? 1 : 0) - (dn('ArrowDown') ? 1 : 0)) * 1.5 * dt, -1.2, 1.2); mouse.x = mouse.y = 0;
    this.fx = -Math.sin(this.yaw); this.fz = -Math.cos(this.yaw);
    const f = (dn('KeyW') ? 1 : 0) - (dn('KeyS') ? 1 : 0), s = (dn('KeyD') ? 1 : 0) - (dn('KeyA') ? 1 : 0);
    if (this.air <= 0 && (f || s)) { const l = Math.hypot(f, s); this.x += (this.fx * f + Math.cos(this.yaw) * s) / l * this.sp * dt; this.z += (this.fz * f - Math.sin(this.yaw) * s) / l * this.sp * dt; }
    this.x = clamp(this.x, -BX, BX); this.z = clamp(this.z, -BZ, BZ);
    const k = this.k, dmg = this.dmg; this.aim.visible = false;
    if (k === 'bomber') {                                      // mantener = más lejos
      const dist = 2 + this.ch / 1.2 * 8;
      if (dn('KeyJ')) { this.ch = Math.min(1.2, this.ch + dt); this.aim.visible = true; this.aim.position.set(clamp(this.x + this.fx * dist, -BX, BX), .05, clamp(this.z + this.fz * dist, -BZ, BZ)); }
      else if (this.ch > 0 && released.has('KeyJ')) { g.bombs.push(new Bomb(this.x + this.fx * dist, this.z + this.fz * dist, .8, 2.5, dmg * 1.5, 'p')); this.ch = 0; this.ac = .35; }
    } else if (pr('KeyJ') && this.ac <= 0) {
      this.ac = .35;
      if (k === 'robot') g.shots.push(new Shot(this.x + this.fx * .8, this.z + this.fz * .8, this.fx, this.fz, dmg));
      else { const m = (this.cb = (this.cb + 1) % 3) === 2 ? 1.5 : 1; g.strike(this, dmg * m); g.ring(this.x + this.fx * 1.2, this.z + this.fz * 1.2, .8, this.c); }
    }
    if (pr('KeyK') && this.cd1 <= 0 && this.air <= 0) {
      if (k === 'robot') { const near = g.enemies.some(e => Math.hypot(e.x - this.x, e.z - this.z) < R); this.x = clamp(this.x + this.fx * 3, -BX, BX); this.z = clamp(this.z + this.fz * 3, -BZ, BZ); this.inv = .25; this.cd1 = near ? .5 : 1.5; }
      if (k === 'samurai') { this.spin = 3; this.sc = 0; this.cd1 = 8; }
      if (k === 'octo') { this.air = .8; this.cd1 = 10; }
    }
    if (k === 'octo' && pr('KeyL') && this.cd2 <= 0) {         // agarrar y lanzar hacia donde miras
      const t = g.enemies.filter(e => !e.isBoss && inRange(this, e, 2.5)).sort((a, b) => Math.hypot(a.x - this.x, a.z - this.z) - Math.hypot(b.x - this.x, b.z - this.z))[0];
      if (t) { t.th = .7; t.tx = this.fx; t.tz = this.fz; t.y = 1; this.cd2 = 4; }
    }
    if (this.spin > 0) {                                       // espadas giratorias: invulnerable + daño en área
      this.spin -= dt; this.inv = Math.max(this.inv, .1); this.sc -= dt;
      if (this.sc <= 0) { this.sc = .2; g.enemies.forEach(e => Math.hypot(e.x - this.x, e.z - this.z) < R + .3 && g.hit(e, dmg * .8, 3, this.x, this.z)); }
    }
    this.blades.forEach((b, i) => { b.visible = this.spin > 0; const a = g.time * 10 + i * 2.094; b.position.set(this.x + Math.cos(a) * R, 1, this.z + Math.sin(a) * R); b.rotation.y = -a; });
    if (this.air > 0) {                                        // salto giratorio + onda expansiva
      this.air -= dt; this.y = Math.sin((1 - this.air / .8) * Math.PI) * 2.5;
      if (this.air <= 0) { this.y = 0; g.enemies.forEach(e => Math.hypot(e.x - this.x, e.z - this.z) < 5 && g.hit(e, dmg * 2, 14, this.x, this.z)); g.ring(this.x, this.z, 5, this.c); }
    }
    const sw = this.ac > 0 ? Math.sin((1 - this.ac / .35) * Math.PI) : 0;       // animación del arma en pantalla
    this.vm.position.set(0, -this.ch * .15, -sw * .35); this.vm.rotation.set(-sw * .7, 0, this.air > 0 ? g.time * 20 : 0);
    this.sync(dt);
  }
  kill() { super.kill(); this.blades.forEach(b => scene.remove(b)); cam.remove(this.vm); scene.remove(this.aim); }
}

/* ---------- Proyectil de plasma ---------- */
class Shot {
  constructor(x, z, dx, dz, dmg) { Object.assign(this, { x, z, dx, dz, dmg, done: false }); this.m = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 8), mat(0x00f0ff, 1)); scene.add(this.m); }
  update(g, dt) {
    this.x += this.dx * 16 * dt; this.z += this.dz * 16 * dt; this.m.position.set(this.x, 1.2, this.z);
    for (const e of g.enemies) if (Math.hypot(e.x - this.x, e.z - this.z) < e.w / 2 + .35) { g.hit(e, this.dmg, 4, this.x - this.dx, this.z - this.dz); this.done = true; break; }
    if (Math.abs(this.x) > BX + 3 || Math.abs(this.z) > BZ + 3) this.done = true; if (this.done) scene.remove(this.m);
  }
}

/* ---------- Bomba con aviso en el suelo (jugador 'p' o enemigo 'e') ---------- */
class Bomb {
  constructor(x, z, fuse, r, dmg, team) {
    Object.assign(this, { x: clamp(x, -BX, BX), z: clamp(z, -BZ, BZ), t: 0, fuse, r, dmg, team, done: false, boom: false });
    const c = team === 'p' ? 0xffe600 : 0xff3b5c, M = o => new THREE.MeshBasicMaterial({ color: c, side: 2, transparent: true, opacity: o });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(r - .12, r, 40), M(.8)); this.disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40), M(.35));
    [this.ring, this.disc].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.set(this.x, .03, this.z); scene.add(m); }); this.disc.scale.setScalar(.01);
  }
  update(g, dt) {
    this.t += dt;
    if (!this.boom) {
      this.disc.scale.setScalar(Math.max(.01, this.t / this.fuse));
      if (this.t >= this.fuse) {
        this.boom = true; this.disc.scale.setScalar(1); this.disc.material.opacity = 1;
        const hit = o => Math.hypot(o.x - this.x, o.z - this.z) < this.r;
        if (this.team === 'p') g.enemies.forEach(e => hit(e) && g.hit(e, this.dmg, 8, this.x, this.z)); else if (hit(g.p) && g.p.y < .5) g.p.hurt(this.dmg);
      }
    } else if (this.t >= this.fuse + .25) { this.done = true; scene.remove(this.ring, this.disc); }
  }
}

/* ---------- Enemigos (paso 2: se reemplazarán los cubos por robots con antenas, brazos y piernas) ---------- */
const ET = {
  grunt: { w: .8, h: 1.6, hm: 1,  sp: 2.2, dm: 8,  xm: 1,   c: 0xff3b5c },
  fast:  { w: .7, h: 1.4, hm: .7, sp: 4,   dm: 6,  xm: 1.5, c: 0xffe600 },
  tank:  { w: 1.2, h: 2.2, hm: 2.5, sp: 1.5, dm: 14, xm: 2.5, c: 0x9d4dff },
};
class Enemy extends Ent {
  constructor(x, z, lv, type = 'grunt') {
    const t = ET[type]; super(x, z, t.w, t.h, Math.floor((40 + lv * 10) * t.hm), t.c);
    Object.assign(this, { sp: t.sp, dm: t.dm + Math.floor(lv / 3), xm: t.xm, at: 0, cd: rand(.5, 1.5), th: 0, isBoss: false });
  }
  update(g, dt) {
    const p = g.p;
    if (this.th > 0) {                                         // lanzado por el Humano-pulpo: golpea a los demás
      this.th -= dt; this.x += this.tx * 14 * dt; this.z += this.tz * 14 * dt;
      g.enemies.forEach(o => { if (o !== this && !o.h1 && Math.hypot(o.x - this.x, o.z - this.z) < 1.1) { o.h1 = this.h1 = true; g.hit(o, p.dmg * 1.5, 5, this.x, this.z); g.hit(this, p.dmg, 0, this.x, this.z); } });
      if (this.th <= 0) { this.y = 0; g.enemies.forEach(o => o.h1 = false); } this.sync(dt); return;
    }
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1; this.fx = dx / d; this.fz = dz / d;
    if (this.at > 0) { this.at -= dt; if (this.at <= 0) { if (inRange(this, p)) p.hurt(this.dm); this.cd = rand(1, 2); } }
    else {
      if (d > R * .8) { this.x += this.fx * this.sp * dt; this.z += this.fz * this.sp * dt; }
      this.cd -= dt; if (this.cd <= 0 && inRange(this, p)) this.at = .45;                 // aviso de .45 s
    }
    this.m.scale.y = this.at > 0 ? 1.15 : 1; this.sync(dt);
  }
}
/* Jefes de nivel 3,5,10,14,19 (paso 3: aspectos y mecánicas). Por ahora IA melee base. */
class Boss extends Enemy {
  constructor(x, z, lv, kind) { super(x, z, lv, 'tank'); this.kind = kind; this.isBoss = true; this.xm = 6; this.hp = this.maxHp = this.hp * 3; this.dm += 6; this.m.scale.setScalar(2); this.w *= 2; this.h *= 2; }
  update(g, dt) {
    switch (this.kind) {
      case 'miniboss': break;      // N3: toro mecánico pequeño
      case 'charger': break;       // TODO N5: toro mecánico, embestida
      case 'bomber': break;        // TODO N10: bomba gigante (Bomb team 'e')
      case 'laser': break;         // TODO N14: robot gigante, rayos láser
      case 'summoner': break;      // TODO N19: nigromante, invoca robots rotos, 50% HP -> melee
    } super.update(g, dt);
  }
}
/* Jefe final (nivel 20): 4 fases según % de vida. Fase 1 funcional; 2-4 son TODO (paso 4). */
class FinalBoss extends Boss {
  constructor(x, z) { super(x, z, 20, 'final'); this.hp = this.maxHp = 2400; this.ph = 0; this.sub = 'fly'; this.en = 100; this.bc = 1; this.tm = 0; this.isFinal = true; }
  get name() { return ['FASE 1 - Dragón bombardero', 'FASE 2 - Masa con implante', 'FASE 3 - Esfera rebotante', 'FASE 4 - Esqueleto colosal'][this.ph]; }
  vul() { return this.ph === 0 ? this.sub === 'tired' && this.y < .1 : true; }
  update(g, dt) {
    const r = this.hp / this.maxHp, t = r < .25 ? 3 : r < .5 ? 2 : r < .75 ? 1 : 0; if (t > this.ph) this.ph = t;
    if (this.ph === 0) {
      if (this.sub === 'fly') {
        this.y += (4 - this.y) * Math.min(1, dt * 4); this.x += (Math.sin(g.time) * 10 - this.x) * dt * 2; this.en -= dt * 10; this.bc -= dt;
        if (this.bc <= 0) { this.bc = 1.1; g.bombs.push(new Bomb(g.p.x + rand(-2, 2), g.p.z + rand(-2, 2), 1, 2, 20, 'e')); }
        if (this.en <= 0) { this.sub = 'tired'; this.tm = 5; }
      } else { this.y = Math.max(0, this.y - 4 * dt); this.tm -= dt; if (this.tm <= 0) { this.sub = 'fly'; this.en = 100; } }
    } /* TODO fases 2 (brazos), 3 (pelota), 4 (esqueleto + interruptores + cuerdas) */
    this.sync(dt);
  }
}

/* ---------- Juego + gestor de niveles ---------- */
const SPECIAL = { 3: 'miniboss', 5: 'charger', 10: 'bomber', 14: 'laser', 19: 'summoner', 20: 'final' };
class Game {
  constructor() { Object.assign(this, { st: 'menu', paused: false, p: null, enemies: [], bombs: [], shots: [], fx: [], time: 0, mt: 0, lv: 0, ct: 0, bt: 0, bm: '' }); }
  get playing() { return !this.paused && (this.st === 'play' || this.st === 'clear'); }
  hit(e, d, pm, ox, oz) { if (!e.vul()) return false; const dx = e.x - ox, dz = e.z - oz, l = Math.hypot(dx, dz) || 1; e.hurt(d, dx / l * pm, dz / l * pm); this.p.gainXP(Math.ceil(d * e.xm), this); return true; }   // XP = daño × multiplicador
  strike(p, d) { this.enemies.forEach(e => inRange(p, e) && this.hit(e, d, 6, p.x, p.z)); }
  ring(x, z, r, c) { const m = new THREE.Mesh(new THREE.RingGeometry(r - .15, r, 40), new THREE.MeshBasicMaterial({ color: c, side: 2, transparent: true })); m.rotation.x = -Math.PI / 2; m.position.set(x, .05, z); scene.add(m); this.fx.push({ m, t: .4 }); }
  clearAll() { [...this.enemies, this.p].forEach(e => e && e.kill()); this.bombs.forEach(b => scene.remove(b.ring, b.disc)); this.shots.forEach(s => scene.remove(s.m)); this.fx.forEach(f => scene.remove(f.m)); this.enemies = []; this.bombs = []; this.shots = []; this.fx = []; this.p = null; }
  begin(k) { this.clearAll(); this.p = new Player(k); this.paused = false; this.level(1); }
  level(n) {
    this.lv = n; this.st = 'play'; this.bombs.forEach(b => scene.remove(b.ring, b.disc)); this.bombs = []; const kind = SPECIAL[n];
    if (kind === 'final') this.enemies.push(new FinalBoss(0, -8)); else if (kind) this.enemies.push(new Boss(0, -8, n, kind));
    if (kind !== 'final') for (let i = 0, c = 2 + Math.floor(n / 2), ts = Object.keys(ET); i < c; i++) { const a = rand(0, 6.28); this.enemies.push(new Enemy(Math.cos(a) * BX * .9, Math.sin(a) * BZ * .9, n, ts[Math.min(2, Math.floor(rand(0, 1 + n / 7)))])); }
    this.bm = `NIVEL ${n}${kind ? ' - ' + kind.toUpperCase() : ''}`; this.bt = 2;
  }
  update(dt) {
    if (pr('KeyP') || pr('Escape')) { if (this.playing) A.pause(); else if (this.paused) A.resume(); }
    if (!this.playing) { if (!this.p) { this.mt += dt * .2; cam.position.set(Math.sin(this.mt) * 14, 6, Math.cos(this.mt) * 14); cam.lookAt(0, 0, 0); } this.ui(); return; }
    this.time += dt; this.bt -= dt; const p = this.p;
    p.update(this, dt); this.enemies.forEach(e => e.update(this, dt)); this.bombs.forEach(b => b.update(this, dt)); this.shots.forEach(s => s.update(this, dt));
    this.fx.forEach(f => { f.t -= dt; f.m.scale.setScalar(1 + (.4 - f.t) * 2); f.m.material.opacity = Math.max(0, f.t / .4); if (f.t <= 0) scene.remove(f.m); }); this.fx = this.fx.filter(f => f.t > 0);
    this.enemies = this.enemies.filter(e => { if (e.dead) e.kill(); return !e.dead; });
    this.bombs = this.bombs.filter(b => !b.done); this.shots = this.shots.filter(s => !s.done);
    if (dn('ShiftLeft', 'ShiftRight') && pr('KeyL')) this.enemies.forEach(e => e.dead = true);      // debug: saltar nivel
    if (pr('KeyO')) { const f = this.enemies.find(e => e.isFinal); if (f) f.ph = Math.min(3, f.ph + 1); }   // debug: fase siguiente
    if (this.st === 'play' && !this.enemies.length) { if (this.lv >= 20) { this.st = 'win'; A.end('VICTORIA'); } else { this.st = 'clear'; this.ct = 2; } }
    if (this.st === 'clear' && (this.ct -= dt) <= 0) this.level(this.lv + 1);
    if (p.dead) { this.st = 'over'; A.end('GAME OVER'); }
    cam.position.set(p.x, 1.6 + p.y, p.z); cam.rotation.set(p.pitch, p.yaw, 0, 'YXZ'); this.ui();
  }
  ui() {
    const p = this.p, B = (v, m, c) => `<div class="bar"><i style="width:${100 * clamp(v / m, 0, 1)}%;background:${c}"></i></div>`, boss = this.enemies.find(e => e.isBoss), on = this.playing || this.paused;
    $('hud').innerHTML = p && on ? `${CLASSES[p.k].n}<br>LV ${p.lvl} · NIVEL ${this.lv}/20${B(p.hp, p.maxHp, '#00f0ff')}${B(p.xp, p.need, '#ffe600')}K: ${p.cd1 > 0 ? p.cd1.toFixed(1) + 's' : 'LISTO'}${p.k === 'octo' ? ' · L: ' + (p.cd2 > 0 ? p.cd2.toFixed(1) + 's' : 'LISTO') : ''}${p.k === 'bomber' ? B(p.ch, 1.2, '#ff8a00') : ''}${boss ? '<br>' + (boss.isFinal ? boss.name : 'JEFE') + B(boss.hp, boss.maxHp, boss.vul() ? '#4dff88' : '#ff3b5c') : ''}` : '';
    $('msg').textContent = this.playing ? (this.st === 'clear' ? 'NIVEL COMPLETADO' : this.bt > 0 ? this.bm : '') : '';
    $('xh').style.display = this.playing ? 'block' : 'none'; $('dmg').style.opacity = p && this.playing && p.inv > .5 ? .35 : 0;
    $('pb').style.display = on ? 'block' : 'none'; $('pb').textContent = this.paused ? '▶ CONTINUAR' : '⏸ PAUSA';
  }
}

/* ---------- Menús (DOM) ---------- */
const hex = c => '#' + c.toString(16).padStart(6, '0');
const ICON = {
  robot: c => `<svg viewBox="0 0 100 100"><rect x="30" y="22" width="40" height="32" rx="6" fill="${c}"/><rect x="48" y="8" width="4" height="14" fill="${c}"/><circle cx="41" cy="38" r="5"/><circle cx="59" cy="38" r="5"/><rect x="26" y="58" width="48" height="30" rx="4" fill="${c}"/><rect x="70" y="64" width="26" height="8" fill="#ccc"/></svg>`,
  samurai: c => `<svg viewBox="0 0 100 100"><circle cx="50" cy="30" r="14" fill="${c}"/><rect x="38" y="46" width="24" height="40" rx="4" fill="${c}"/><g stroke="#ddd" stroke-width="4"><line x1="18" y1="70" x2="40" y2="20"/><line x1="82" y1="70" x2="60" y2="20"/><line x1="50" y1="88" x2="50" y2="10"/></g></svg>`,
  bomber: c => `<svg viewBox="0 0 100 100"><circle cx="45" cy="60" r="26" fill="#333" stroke="${c}" stroke-width="4"/><rect x="52" y="22" width="8" height="14" fill="${c}"/><path d="M60 22 q10 -14 20 -4" stroke="${c}" stroke-width="3" fill="none"/><circle cx="82" cy="16" r="5" fill="#ff8a00"/></svg>`,
  octo: c => `<svg viewBox="0 0 100 100"><circle cx="50" cy="32" r="14" fill="${c}"/><rect x="40" y="46" width="20" height="22" fill="${c}"/><g stroke="${c}" stroke-width="5" fill="none"><path d="M40 52 q-26 4 -24 32"/><path d="M42 60 q-12 14 -2 28"/><path d="M60 52 q26 4 24 32"/><path d="M58 60 q12 14 2 28"/></g></svg>`,
};
const CTRL = [['Moverse', 'W A S D'], ['Mirar', 'Mouse (o flechas)'], ['Atacar', 'Clic izquierdo o J'], ['Habilidad', 'K o clic derecho'], ['Agarrar (Humano-pulpo)', 'L'], ['Pausa', 'P o Esc']];
const A = {
  sel: null, back: 'menu',
  show(h) { const o = $('ov'); o.innerHTML = h; o.style.display = 'flex'; }, hide() { $('ov').style.display = 'none'; },
  lock() { try { const r = ren.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} },
  free() { try { document.exitPointerLock(); } catch (e) {} },
  menu() { game.clearAll(); game.paused = false; game.st = 'menu'; this.free(); this.show(`<h1>NEON CRASHERS 3D</h1><button class="btn" onclick="A.classes()">Jugar</button><button class="btn" title="Próximamente">Multijugador</button><button class="btn" onclick="A.controls('menu')">Controles</button><button class="btn" onclick="A.exit()">Salir</button>`); },
  classes() {
    game.st = 'menu';
    this.show(`<h1>ELIGE TU CLASE</h1><div class="cards">${Object.entries(CLASSES).map(([k, c]) => `<div class="card${this.sel === k ? ' on' : ''}">${ICON[k](hex(c.c))}<div style="color:${hex(c.c)}">${c.n}</div><p>${c.d}</p><button class="btn" style="min-width:0" onclick="A.pick('${k}')">${this.sel === k ? 'Elegida ✓' : 'Elegir'}</button></div>`).join('')}</div><button class="btn" ${this.sel ? '' : 'disabled'} onclick="A.start()">Empezar</button><button class="btn" onclick="A.menu()">Volver</button>`);
  },
  pick(k) { this.sel = k; this.classes(); },
  start() { if (!this.sel) return; game.begin(this.sel); this.hide(); this.lock(); },
  controls(from) { this.back = from; this.show(`<h1>CONTROLES</h1><div class="ctl">${CTRL.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('')}</div><button class="btn" onclick="A.${from === 'pause' ? 'pauseMenu' : 'menu'}()">Volver</button>`); },
  pauseMenu() { this.show(`<h1>PAUSA</h1><button class="btn" onclick="A.resume()">Continuar</button><button class="btn" onclick="A.controls('pause')">Controles</button><button class="btn" onclick="A.restart()">Reiniciar (desde la oleada cero)</button><button class="btn" onclick="A.quit()">Salir y elegir otra clase</button>`); },
  pause() { if (!game.playing) return; game.paused = true; this.free(); this.pauseMenu(); },
  resume() { if (!game.paused) return; game.paused = false; this.hide(); this.lock(); },
  restart() { game.begin(game.p.k); this.hide(); this.lock(); },
  quit() { game.clearAll(); game.paused = false; this.classes(); },
  end(t) { game.paused = false; this.free(); this.show(`<h1>${t}</h1><button class="btn" onclick="A.menu()">Volver al menú</button>`); },
  exit() { try { window.close(); } catch (e) {} this.show(`<h1>¡GRACIAS POR JUGAR!</h1><p>Ya puedes cerrar esta pestaña.</p><button class="btn" onclick="A.menu()">Volver al menú</button>`); },
};
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && game.playing) A.pause(); });
$('pb').onclick = () => { game.paused ? A.resume() : A.pause(); $('pb').blur(); };
const game = new Game(); A.menu();
let last = 0; (function loop(t) { const dt = Math.min(.05, (t - last) / 1e3 || 0); last = t; game.update(dt); ren.render(scene, cam); pressed.clear(); released.clear(); requestAnimationFrame(loop); })(0);