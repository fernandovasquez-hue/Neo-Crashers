'use strict';
const R = 2, CONE = .85, MAP_W = 30, MAP_H = 30;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rand = (a, b) => a + Math.random() * (b - a);
const keys = new Set(), pressed = new Set(), released = new Set(), mouse = { x: 0, y: 0 };

addEventListener('keydown', e => {
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { keys.delete(e.code); released.add(e.code); });
addEventListener('mousemove', e => { if (document.pointerLockElement) { mouse.x = e.movementX; mouse.y = e.movementY; } });
addEventListener('mousedown', e => {
  if (!game || !game.playing || e.target.id === 'pb') return;
  if (!document.pointerLockElement) A.lock();
  const c = e.button === 2 ? 'KeyK' : 'KeyJ';
  if (!keys.has(c)) pressed.add(c);
  keys.add(c);
});
addEventListener('mouseup', e => { const c = e.button === 2 ? 'KeyK' : 'KeyJ'; keys.delete(c); released.add(c); });
addEventListener('contextmenu', e => e.preventDefault());
const dn = (...k) => k.some(c => keys.has(c)), pr = k => pressed.has(k), $ = id => document.getElementById(id);

/* ---------- Escena y Renderizador ---------- */
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050212); scene.fog = new THREE.Fog(0x050212, 16, 55);
const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .1, 100); scene.add(cam);
const ren = new THREE.WebGLRenderer({ antialias: true }); ren.setSize(innerWidth, innerHeight); document.body.insertBefore(ren.domElement, document.body.firstChild);
addEventListener('resize', () => { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
scene.add(new THREE.AmbientLight(0x9999dd, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, .9); sun.position.set(5, 18, 8); scene.add(sun);

/* ---------- Sistema de Mapa por Salas Tipo DOOM (Paredes y Pasillos) ---------- */
const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * MAP_W + 4, 2 * MAP_H + 4), new THREE.MeshStandardMaterial({ color: 0x0a0618, roughness: 0.6 })); floorMesh.rotation.x = -Math.PI / 2; scene.add(floorMesh);
const grid = new THREE.GridHelper(2 * MAP_W + 4, 2 * MAP_W + 4, 0x00f0ff, 0x2a0a4a); grid.position.y = .01; scene.add(grid);

const WALLS = [
  // Límites Exteriores
  { x: 0, z: -MAP_H, w: 2 * MAP_W, d: 2 }, { x: 0, z: MAP_H, w: 2 * MAP_W, d: 2 },
  { x: -MAP_W, z: 0, w: 2, d: 2 * MAP_H }, { x: MAP_W, z: 0, w: 2, d: 2 * MAP_H },
  // Esquinas y Estructuras DOOM Interiores
  { x: -14, z: -10, w: 12, d: 2 }, { x: 14, z: -10, w: 12, d: 2 },
  { x: -10, z: 10, w: 2, d: 14 }, { x: 10, z: 10, w: 2, d: 14 },
  { x: 0, z: 16, w: 14, d: 2 }
];

const wallMat = new THREE.MeshStandardMaterial({ color: 0x160c33, roughness: 0.4, metalness: 0.8 });
WALLS.forEach(w => {
  const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, 5, w.d), wallMat);
  wallMesh.position.set(w.x, 2.5, w.z); scene.add(wallMesh);
});

function checkWallCollisions(x, z, r) {
  let nx = x, nz = z;
  for (let w of WALLS) {
    let minX = w.x - w.w / 2 - r, maxX = w.x + w.w / 2 + r;
    let minZ = w.z - w.d / 2 - r, maxZ = w.z + w.d / 2 + r;
    if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
      let dx1 = nx - minX, dx2 = maxX - nx, dz1 = nz - minZ, dz2 = maxZ - nz;
      let minD = Math.min(dx1, dx2, dz1, dz2);
      if (minD === dx1) nx = minX;
      else if (minD === dx2) nx = maxX;
      else if (minD === dz1) nz = minZ;
      else if (minD === dz2) nz = maxZ;
    }
  }
  return { x: nx, z: nz };
}

/* ---------- Geometrías Detalladas y Suaves ---------- */
const mMat = (c, em = 0, m = 0.6, r = 0.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: em, metalness: m, roughness: r });
const geoB = new THREE.BoxGeometry(1, 1, 1), geoS = new THREE.SphereGeometry(1, 24, 24), geoC = new THREE.CylinderGeometry(1, 1, 1, 16), geoCone = new THREE.ConeGeometry(1, 1, 16);
const addP = (grp, geo, mat, scl, pos, rot = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.scale.set(...scl); m.position.set(...pos); m.rotation.set(...rot); grp.add(m); return m; };

/* Robot Vintage Retro */
function M_VintageRobot(c) {
  const g = new THREE.Group(), matBody = mMat(0x4a7a96, 0.1), matOrange = mMat(0xd95a2b), matYellow = mMat(0xffb700, 0.5);
  addP(g, geoB, matBody, [.7, .8, .5], [0, .4, 0]);
  addP(g, geoB, mMat(0xffffff, 0.2), [.5, .45, .05], [0, .45, .26]);
  addP(g, geoC, matYellow, [.1, .05, .1], [-.12, .52, .29], [Math.PI / 2, 0, 0]);
  addP(g, geoC, matOrange, [.1, .05, .1], [.12, .52, .29], [Math.PI / 2, 0, 0]);
  addP(g, geoB, matBody, [.5, .4, .4], [0, 1.05, 0]);
  addP(g, geoS, mMat(0xffffff), [.09, .09, .09], [-.13, 1.1, .21]);
  addP(g, geoS, mMat(0xffffff), [.09, .09, .09], [.13, 1.1, .21]);
  const armRGroup = new THREE.Group(); armRGroup.position.set(.42, .5, 0);
  addP(armRGroup, geoC, matBody, [.14, .6, .14], [0, -.1, 0]); g.add(armRGroup); g.armRGroup = armRGroup;
  addP(g, geoC, matBody, [.14, .6, .14], [-.42, .4, 0]);
  addP(g, geoB, matOrange, [.24, .2, .4], [-.18, -.38, .05]);
  addP(g, geoB, matOrange, [.24, .2, .4], [.18, -.38, .05]);
  return g;
}

/* Jugador RoboCop con Armas Animadas */
function M_RoboCopPlayer() {
  const g = new THREE.Group(), chrome = mMat(0xc0c5d0, 0.2, 0.9, 0.1), darkAb = mMat(0x1a1a24), visor = mMat(0x00f0ff, 1);
  addP(g, geoB, chrome, [.65, .5, .42], [0, .6, 0]);
  addP(g, geoC, darkAb, [.5, .35, .35], [0, .22, 0]);
  addP(g, geoS, chrome, [.26, .26, .26], [0, 1.08, 0]);
  addP(g, geoB, visor, [.46, .08, .15], [0, 1.12, .18]);
  addP(g, geoC, chrome, [.18, .65, .18], [-.45, .45, 0]);
  const armRGroup = new THREE.Group(); armRGroup.position.set(.45, .45, 0);
  addP(armRGroup, geoC, chrome, [.18, .65, .18], [0, -.1, 0]);
  const gun = addP(armRGroup, geoB, mMat(0x222233, 0.8), [.12, .18, .6], [0, -.3, .35]);
  addP(gun, geoC, mMat(0x00f0ff, 1), [.08, .3, .08], [0, .05, .3], [Math.PI / 2, 0, 0]);
  g.add(armRGroup); g.armRGroup = armRGroup;
  addP(g, geoC, chrome, [.22, .75, .22], [-.2, -.38, 0]);
  addP(g, geoC, chrome, [.22, .75, .22], [.2, -.38, 0]);
  return g;
}

/* Jugador Samurái */
function M_SamuraiPlayer() {
  const g = new THREE.Group(), redArm = mMat(0xb81424, 0.2), gold = mMat(0xffd700, 0.5), darkGroup = mMat(0x222222);
  addP(g, geoB, redArm, [.65, .6, .45], [0, .45, 0]);
  addP(g, geoS, darkGroup, [.25, .25, .25], [0, 1.05, 0]);
  addP(g, geoCone, gold, [.1, .7, .1], [-.2, 1.45, .18], [.2, 0, -.4]);
  addP(g, geoCone, gold, [.1, .7, .1], [.2, 1.45, .18], [.2, 0, .4]);
  const armRGroup = new THREE.Group(); armRGroup.position.set(.5, .4, 0);
  addP(armRGroup, geoC, gold, [.04, 1.3, .04], [0, -.1, .4], [Math.PI / 2, 0, 0]);
  g.add(armRGroup); g.armRGroup = armRGroup;
  addP(g, geoC, redArm, [.22, .7, .22], [-.2, -.35, 0]); addP(g, geoC, redArm, [.22, .7, .22], [.2, -.35, 0]);
  return g;
}

/* Jugador Bombardero */
function M_BomberPlayer() {
  const g = new THREE.Group(), matBody = mMat(0xffe600, 0.2), darkMetal = mMat(0x222222);
  addP(g, geoB, matBody, [.65, .6, .45], [0, .45, 0]);
  addP(g, geoS, darkMetal, [.35, .35, .35], [0, 1.05, 0]);
  const armRGroup = new THREE.Group(); armRGroup.position.set(.45, .45, 0);
  addP(armRGroup, geoC, darkMetal, [.18, .65, .18], [0, -.1, 0]);
  addP(armRGroup, geoS, mMat(0x111111), [.35, .35, .35], [0, -.25, .35]);
  g.add(armRGroup); g.armRGroup = armRGroup;
  addP(g, geoC, darkMetal, [.22, .7, .22], [-.2, -.35, 0]); addP(g, geoC, darkMetal, [.22, .7, .22], [.2, -.35, 0]);
  return g;
}

/* Jugador Humano-Pulpo */
function M_DocOckPlayer() {
  const g = new THREE.Group(), coat = mMat(0x2e402a), skin = mMat(0xd4a373), silver = mMat(0xa0a5b0, 0.3, 0.9, 0.1);
  addP(g, geoB, coat, [.65, .9, .45], [0, .45, 0]);
  addP(g, geoS, skin, [.22, .22, .22], [0, 1.08, 0]);
  const tentPositions = [[-.9, 0.6, -.2, -.8, -.6], [.9, 0.6, -.2, .8, -.6], [-1.0, 0.2, -.2, -1.0, .4], [1.0, 0.2, -.2, 1.0, .4]];
  tentPositions.forEach(([x, y, z, rx, ry]) => {
    const tGroup = new THREE.Group(); tGroup.position.set(x, y, z);
    for (let i = 0; i < 5; i++) addP(tGroup, geoC, silver, [.06, .25, .06], [i * rx * .08, i * .15, -i * .1], [i * .1, ry, 0]);
    g.add(tGroup);
  });
  const armRGroup = new THREE.Group(); armRGroup.position.set(.5, .4, 0);
  addP(armRGroup, geoC, coat, [.16, .6, .16], [0, -.1, 0]); g.add(armRGroup); g.armRGroup = armRGroup;
  addP(g, geoC, mMat(0x1a1a1a), [.2, .7, .2], [-.2, -.4, 0]); addP(g, geoC, mMat(0x1a1a1a), [.2, .7, .2], [.2, -.4, 0]);
  return g;
}

/* Jefes */
function M_MechaDragon() {
  const g = new THREE.Group();
  const red = mMat(0xd01122, 0.4), gold = mMat(0xcca000, 0.6);
  const steel = mMat(0x22222a), glow = mMat(0x00f0ff, 1);

  // Torso
  addP(g, geoB, red, [1.6, 1.4, 2.2], [0, 1.0, 0]);
  // Cuello
  addP(g, geoC, steel, [0.4, 1.0, 0.4], [0, 1.8, 1.0], [0.4, 0, 0]);
  // Cabeza y mandíbula
  addP(g, geoB, red, [0.8, 0.6, 1.2], [0, 2.3, 1.5], [0.2, 0, 0]);
  addP(g, geoB, gold, [0.7, 0.2, 1.0], [0, 1.9, 1.6], [0.2, 0, 0]);
  // Ojos brillantes (Visor)
  addP(g, geoB, glow, [0.85, 0.15, 0.3], [0, 2.35, 1.8], [0.2, 0, 0]);

  // Alas mecánicas
  addP(g, geoB, steel, [4.0, 0.1, 1.8], [2.2, 1.5, -0.2], [0, 0.3, 0.2]);
  addP(g, geoB, steel, [4.0, 0.1, 1.8], [-2.2, 1.5, -0.2], [0, -0.3, -0.2]);

  // Cola segmentada
  for (let i = 0; i < 4; i++) {
    let s = 0.8 - (i * 0.15);
    addP(g, geoB, red, [s, s, s * 1.2], [0, 0.7 - (i * 0.1), -1.4 - (i * 0.8)]);
  }

  return g;
}

function M_SpikeBall() {
  const g = new THREE.Group();
  const core = mMat(0xff2bd6, 0.9); // Núcleo de energía puro
  const shell = mMat(0x222233, 0.5); // Coraza oscura

  // Núcleo central
  addP(g, geoS, core, [2.0, 2.0, 2.0], [0, 0, 0]);

  // Placas de armadura cruzadas para darle forma de bola dentada/mecánica
  addP(g, geoB, shell, [3.8, 1.4, 1.4], [0, 0, 0]);
  addP(g, geoB, shell, [1.4, 3.8, 1.4], [0, 0, 0]);
  addP(g, geoB, shell, [1.4, 1.4, 3.8], [0, 0, 0]);

  return g;
}

function M_Toro() {
  const g = new THREE.Group(), mat = mMat(0x555566);
  addP(g, geoB, mat, [1.3, .9, 2.0], [0, .4, 0]); addP(g, geoS, mat, [.5, .5, .5], [0, 1.0, 1.2]);
  addP(g, geoCone, mMat(0xff0055, 1), [.1, .8, .1], [-.45, 1.4, 1.3], [-0.5, 0, -0.4]);
  addP(g, geoCone, mMat(0xff0055, 1), [.1, .8, .1], [.45, 1.4, 1.3], [-0.5, 0, 0.4]);
  [-.5, .5].forEach(x => [-.7, .7].forEach(z => addP(g, geoC, mat, [.2, .7, .2], [x, -.4, z])));
  return g;
}
function M_Bobomb() {
  const g = new THREE.Group();
  addP(g, geoS, mMat(0x151520), [1.3, 1.3, 1.3], [0, .6, 0]);
  addP(g, geoC, mMat(0x888888), [.3, .4, .3], [0, 1.9, 0]); addP(g, geoCone, mMat(0xff8a00, 1), [.1, .5, .1], [0, 2.3, 0]);
  addP(g, geoB, mMat(0xffe600), [.4, .25, .6], [-.6, -.5, .4]); addP(g, geoB, mMat(0xffe600), [.4, .25, .6], [.6, -.5, .4]);
  return g;
}
function M_Skeleton(colossal = false) {
  const g = new THREE.Group();
  const bone = mMat(0xe0e0e0), dark = mMat(0x111111);
  const s = colossal ? 3.5 : 1;

  // Cráneo y Mandíbula
  addP(g, geoS, bone, [0.4 * s, 0.4 * s, 0.4 * s], [0, 1.5 * s, 0]);
  addP(g, geoB, dark, [0.2 * s, 0.1 * s, 0.1 * s], [0, 1.55 * s, 0.35 * s]); // Cuencas
  addP(g, geoB, bone, [0.25 * s, 0.15 * s, 0.25 * s], [0, 1.25 * s, 0.15 * s]); // Mandíbula

  // Columna Vertebral
  addP(g, geoC, bone, [0.12 * s, 1.0 * s, 0.12 * s], [0, 0.6 * s, -0.1 * s]);

  // Omóplatos / Clavículas
  addP(g, geoB, bone, [0.9 * s, 0.15 * s, 0.2 * s], [0, 1.0 * s, -0.1 * s]);

  // Costillas (Caja torácica)
  for (let i = 0; i < 4; i++) {
    let width = 0.7 * s - (i * 0.1 * s);
    addP(g, geoB, bone, [width, 0.08 * s, 0.35 * s], [0, 0.85 * s - (i * 0.15 * s), 0.05 * s]);
  }

  // Pelvis
  addP(g, geoB, bone, [0.55 * s, 0.2 * s, 0.3 * s], [0, 0.1 * s, -0.05 * s]);

  // Brazos
  addP(g, geoC, bone, [0.08 * s, 0.6 * s, 0.08 * s], [-0.5 * s, 0.7 * s, 0], [0, 0, -0.2]);
  addP(g, geoC, bone, [0.08 * s, 0.6 * s, 0.08 * s], [0.5 * s, 0.7 * s, 0], [0, 0, 0.2]);

  // Piernas
  addP(g, geoC, bone, [0.12 * s, 0.7 * s, 0.12 * s], [-0.2 * s, -0.3 * s, 0]);
  addP(g, geoC, bone, [0.12 * s, 0.7 * s, 0.12 * s], [0.2 * s, -0.3 * s, 0]);

  return g;
}

const inRange = (a, b, r = R) => { const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); return d <= r + b.w / 2 && (d < .6 || (dx * a.fx + dz * a.fz) / d > CONE); };

/* ---------- Entidad Base ---------- */
class Ent {
  constructor(x, z, w, h, hp, c) { Object.assign(this, { x, z, y: 0, w, h, hp, maxHp: hp, c, fx: 0, fz: 1, vx: 0, vz: 0, fl: 0, dead: false }); this.m = new THREE.Group(); scene.add(this.m); }
  hurt(d, px = 0, pz = 0) {
    this.hp -= d; this.fl = .15; // Hit Flash 0.15s
    this.vx += px; this.vz += pz; if (this.hp <= 0) this.dead = true;
  }
  sync(dt) {
    const col = checkWallCollisions(this.x + this.vx * dt, this.z + this.vz * dt, this.w / 2);
    this.x = col.x; this.z = col.z;
    const k = Math.pow(.02, dt); this.vx *= k; this.vz *= k; this.fl = Math.max(0, this.fl - dt);
    this.m.position.set(this.x, this.y + this.h / 2, this.z);

    // Parpadeo Rojo al Recibir Daño
    if (this.m.children[0]) {
      this.m.children[0].children.forEach(ch => {
        if (ch.material) {
          if (this.fl > 0) ch.material.emissive.setHex(0xff0000);
          else ch.material.emissive.setHex(ch.material.color.getHex());
          ch.material.emissiveIntensity = this.fl > 0 ? 0.9 : 0.1;
        }
      });
    }
  }
  kill() { scene.remove(this.m); }
  vul() { return true; }
}

/* ---------- Jugador ---------- */
const CLASSES = {
  robot: { n: 'ROBOT (ROBOCOP)', c: 0x00f0ff, hp: 90, sp: 7, dmg: 9, r: 2, d: 'Pistola de plasma animada. K: dash direccional.' },
  samurai: { n: 'CYBORG SAMURÁI', c: 0xff2bd6, hp: 110, sp: 6, dmg: 12, r: 3, d: 'Katanas con corte en arco. K: invulnerabilidad.' },
  bomber: { n: 'BOMBARDERO', c: 0xffe600, hp: 85, sp: 6, dmg: 14, r: 2.5, d: 'Lanza explosivos. K: Autodestrucción (-50% HP).' },
  octo: { n: 'HUMANO-PULPO (OCK)', c: 0x4dff88, hp: 130, sp: 5.5, dmg: 11, r: 3.5, d: 'Estocada de tentáculos. L: agarra/lanza.' },
};

class Player extends Ent {
  constructor(k) {
    const c = CLASSES[k]; super(0, 6, .8, 1.6, c.hp, c.c);
    Object.assign(this, { k, sp: c.sp, dmg: c.dmg, reach: c.r, lvl: 1, xp: 0, inv: 0, cd1: 0, cd2: 0, ac: 0, ch: 0, spin: 0, sc: 0, air: 0, cb: 0, yaw: 0, pitch: 0, fx: 0, fz: -1 });

    if (k === 'robot') this.mesh = M_RoboCopPlayer();
    else if (k === 'samurai') this.mesh = M_SamuraiPlayer();
    else if (k === 'octo') this.mesh = M_DocOckPlayer();
    else if (k === 'bomber') this.mesh = M_BomberPlayer();
    else this.mesh = M_VintageRobot(c.c);

    this.m.add(this.mesh);
    this.blades = [0, 1, 2].map(() => addP(scene, geoB, mMat(0xff2bd6, 1), [1.1, .08, .08], [0, 0, 0]));
    this.blades.forEach(b => b.visible = false);
    this.aim = new THREE.Mesh(new THREE.RingGeometry(.4, .55, 24), new THREE.MeshBasicMaterial({ color: 0xffe600, side: 2 }));
    this.aim.rotation.x = -Math.PI / 2; this.aim.visible = false; scene.add(this.aim);
  }
  get need() { return Math.floor(80 * Math.pow(this.lvl, 1.35)); }
  gainXP(a, g) { this.xp += a; while (this.xp >= this.need) { this.xp -= this.need; this.lvl++; this.maxHp += 15; this.dmg += 2; if (!g.enemies.some(e => e.isBoss)) this.hp = this.maxHp; } }

  hurt(d, attacker = null) {
    if (this.inv > 0 || this.dead) return;
    this.hp -= d; this.inv = .7;
    if (this.hp <= 0) this.dead = true;

    // Indicador de Daño Fuera de Pantalla
    if (attacker) {
      const dx = attacker.x - this.x, dz = attacker.z - this.z;
      const enemyAngle = Math.atan2(dx, dz);
      let relAngle = enemyAngle - this.yaw;
      relAngle = (relAngle + Math.PI) % (2 * Math.PI) - Math.PI;
      const deg = relAngle * (180 / Math.PI);
      const ind = $('dmg-ind'); ind.style.display = 'flex';
      ind.style.transform = `rotate(${deg}deg)`;
      setTimeout(() => { ind.style.display = 'none'; }, 400);
    }
  }

  update(g, dt) {
    this.cd1 -= dt; this.cd2 -= dt; this.ac -= dt; this.inv -= dt;
    this.yaw -= mouse.x * .003; this.pitch = clamp(this.pitch - mouse.y * .003, -1.2, 1.2);
    mouse.x = 0; mouse.y = 0;
    this.yaw -= ((dn('ArrowRight') ? 1 : 0) - (dn('ArrowLeft') ? 1 : 0)) * 2 * dt;
    this.pitch = clamp(this.pitch + ((dn('ArrowUp') ? 1 : 0) - (dn('ArrowDown') ? 1 : 0)) * 1.5 * dt, -1.2, 1.2);

    this.fx = -Math.sin(this.yaw); this.fz = -Math.cos(this.yaw);
    this.mesh.rotation.y = this.yaw;

    // Animación de Ataque de Armas en Primera Persona
    if (this.mesh.armRGroup) {
      if (this.ac > 0) {
        const attackProgress = 1 - (this.ac / 0.35);
        if (this.k === 'samurai') {
          this.mesh.armRGroup.rotation.y = Math.sin(attackProgress * Math.PI) * 1.5;
          this.mesh.armRGroup.rotation.x = -Math.sin(attackProgress * Math.PI) * 0.8;
        } else if (this.k === 'robot') {
          this.mesh.armRGroup.position.z = -Math.sin(attackProgress * Math.PI) * 0.3; // Retroceso de arma
        } else if (this.k === 'octo') {
          this.mesh.armRGroup.position.z = Math.sin(attackProgress * Math.PI) * 0.5; // Estocada
        }
      } else {
        this.mesh.armRGroup.rotation.set(0, 0, 0);
        this.mesh.armRGroup.position.set(0.45, 0.45, 0);
      }
    }

    const f = (dn('KeyW') ? 1 : 0) - (dn('KeyS') ? 1 : 0), s = (dn('KeyD') ? 1 : 0) - (dn('KeyA') ? 1 : 0);
    if (this.air <= 0 && (f || s)) {
      const l = Math.hypot(f, s);
      this.vx = (this.fx * f + Math.cos(this.yaw) * s) / l * this.sp;
      this.vz = (this.fz * f - Math.sin(this.yaw) * s) / l * this.sp;
    }

    const k = this.k, dmg = this.dmg; this.aim.visible = false;

    if (k === 'bomber') {
      const dist = 2 + this.ch / 1.2 * 8;
      if (dn('KeyJ')) { this.ch = Math.min(1.2, this.ch + dt); this.aim.visible = true; this.aim.position.set(clamp(this.x + this.fx * dist, -MAP_W, MAP_W), .05, clamp(this.z + this.fz * dist, -MAP_H, MAP_H)); }
      else if (this.ch > 0 && released.has('KeyJ')) { g.bombs.push(new Bomb(this.x + this.fx * dist, this.z + this.fz * dist, .8, 2.5, dmg * 1.5, 'p')); this.ch = 0; this.ac = .35; }

      if (pr('KeyK') && this.cd1 <= 0 && this.hp > 10) {
        g.ring(this.x, this.z, 12, 0xff0000);
        g.enemies.forEach(e => Math.hypot(e.x - this.x, e.z - this.z) < 12 && g.hit(e, dmg * 10, 25, this.x, this.z));
        this.hurt(this.maxHp * 0.5); this.cd1 = 15;
      }
    } else if (pr('KeyJ') && this.ac <= 0) {
      this.ac = .35;
      if (k === 'robot') {
        const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
        g.shots.push(new Shot(cam.position.x + dir.x * .5, cam.position.y + dir.y * .5, cam.position.z + dir.z * .5, dir.x, dir.y, dir.z, dmg));
      } else {
        const m = (this.cb = (this.cb + 1) % 3) === 2 ? 1.5 : 1;
        g.strike(this, dmg * m, this.reach);
        g.ring(this.x + this.fx * (this.reach * .6), this.z + this.fz * (this.reach * .6), .8, this.c);
      }
    }

    if (pr('KeyK') && this.cd1 <= 0 && this.air <= 0 && k !== 'bomber') {
      if (k === 'robot') {
        let dx = this.fx, dz = this.fz;
        if (f || s) { const l = Math.hypot(f, s); dx = (this.fx * f + Math.cos(this.yaw) * s) / l; dz = (this.fz * f - Math.sin(this.yaw) * s) / l; }
        this.vx = dx * 20; this.vz = dz * 20;
        this.inv = .3; this.cd1 = 1.2;
      }
      if (k === 'samurai') { this.spin = 3; this.sc = 0; this.cd1 = 8; }
      if (k === 'octo') { this.air = .8; this.cd1 = 10; }
    }

    if (k === 'octo' && pr('KeyL') && this.cd2 <= 0) {
      const t = g.enemies.filter(e => !e.isBoss && inRange(this, e, this.reach)).sort((a, b) => Math.hypot(a.x - this.x, a.z - this.z) - Math.hypot(b.x - this.x, b.z - this.z))[0];
      if (t) { t.th = .7; t.tx = this.fx; t.tz = this.fz; t.y = 1; this.cd2 = 4; }
    }
    if (this.spin > 0) {
      this.spin -= dt; this.inv = Math.max(this.inv, .1); this.sc -= dt;
      if (this.sc <= 0) { this.sc = .2; g.enemies.forEach(e => Math.hypot(e.x - this.x, e.z - this.z) < this.reach + .5 && g.hit(e, dmg * .8, 3, this.x, this.z)); }
    }
    this.blades.forEach((b, i) => { b.visible = this.spin > 0; const a = g.time * 10 + i * 2.094; b.position.set(this.x + Math.cos(a) * R, 1.2, this.z + Math.sin(a) * R); b.rotation.y = -a; });
    if (this.air > 0) {
      this.air -= dt; this.y = Math.sin((1 - this.air / .8) * Math.PI) * 2.5;
      if (this.air <= 0) { this.y = 0; g.enemies.forEach(e => Math.hypot(e.x - this.x, e.z - this.z) < 5 && g.hit(e, dmg * 2, 14, this.x, this.z)); g.ring(this.x, this.z, 5, this.c); }
    }

    this.sync(dt);
    cam.position.set(this.x, this.y + 1.8, this.z);
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
  kill() { super.kill(); this.blades.forEach(b => scene.remove(b)); scene.remove(this.aim); }
}

/* ---------- Proyectiles y Bombas ---------- */
class Shot {
  constructor(x, y, z, dx, dy, dz, dmg) {
    Object.assign(this, { x, y, z, dx, dy, dz, dmg, done: false });
    this.m = new THREE.Mesh(geoS, mMat(0x00f0ff, 1));
    this.m.scale.setScalar(.22); scene.add(this.m);
  }
  update(g, dt) {
    this.x += this.dx * 18 * dt; this.y += this.dy * 18 * dt; this.z += this.dz * 18 * dt;
    this.m.position.set(this.x, this.y, this.z);

    for (const e of g.enemies) {
      if (Math.hypot(e.x - this.x, e.z - this.z) < e.w / 2 + .4 && Math.abs((e.y + e.h / 2) - this.y) < e.h / 2 + .4) {
        g.hit(e, this.dmg, 4, this.x - this.dx, this.z - this.dz);
        this.done = true; break;
      }
    }
    if (Math.abs(this.x) > MAP_W || Math.abs(this.z) > MAP_H || this.y < -1 || this.y > 15) this.done = true;
    if (this.done) scene.remove(this.m);
  }
}

class Bomb {
  constructor(x, z, fuse, r, dmg, team) {
    Object.assign(this, { x: clamp(x, -MAP_W, MAP_W), z: clamp(z, -MAP_H, MAP_H), t: 0, fuse, r, dmg, team, done: false, boom: false });
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
        if (this.team === 'p') g.enemies.forEach(e => hit(e) && g.hit(e, this.dmg, 8, this.x, this.z)); else if (hit(g.p) && g.p.y < .5) g.p.hurt(this.dmg, this);
      }
    } else if (this.t >= this.fuse + .25) { this.done = true; scene.remove(this.ring, this.disc); }
  }
}

class TelegraphLine {
  constructor(x, z, dx, dz, len, w, color = 0xff0000) {
    Object.assign(this, { x, z, dx, dz, len, w, color });
    this.m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color, side: 2, transparent: true, opacity: 0.6 }));
    this.m.rotation.x = -Math.PI / 2;
    this.setDir(x, z, dx, dz);
    scene.add(this.m);
  }
  setDir(x, z, dx, dz) {
    this.x = x; this.z = z; this.dx = dx; this.dz = dz;
    this.m.rotation.z = -Math.atan2(dx, dz);
    this.m.position.set(x + dx * (this.len / 2), 0.04, z + dz * (this.len / 2));
  }
  remove() { scene.remove(this.m); }
}

/* ---------- Enemigos ---------- */
const ET = {
  grunt: { w: .8, h: 1.6, hm: 1, sp: 2.2, dm: 8, xm: 1, c: 0xff3b5c },
  fast: { w: .7, h: 1.4, hm: .7, sp: 4, dm: 6, xm: 1.5, c: 0xffe600 },
  tank: { w: 1.2, h: 2.2, hm: 2.5, sp: 1.5, dm: 14, xm: 2.5, c: 0x9d4dff },
};

class Enemy extends Ent {
  constructor(x, z, lv, type = 'grunt') {
    const t = ET[type]; super(x, z, t.w, t.h, Math.floor((40 + lv * 10) * t.hm), t.c);
    this.mesh = M_VintageRobot(t.c);
    if (type === 'tank') this.mesh.scale.set(1.4, 1.4, 1.4);
    this.m.add(this.mesh);
    Object.assign(this, { sp: t.sp, dm: t.dm + Math.floor(lv / 3), xm: t.xm, at: 0, cd: rand(.5, 1.5), th: 0, isBoss: false });
  }

  update(g, dt) {
    const p = g.p;
    if (this.th > 0) {
      this.th -= dt; this.x += this.tx * 14 * dt; this.z += this.tz * 14 * dt;
      g.enemies.forEach(o => { if (o !== this && !o.h1 && Math.hypot(o.x - this.x, o.z - this.z) < 1.1) { o.h1 = this.h1 = true; g.hit(o, p.dmg * 1.5, 5, this.x, this.z); g.hit(this, p.dmg, 0, this.x, this.z); } });
      if (this.th <= 0) { this.y = 0; g.enemies.forEach(o => o.h1 = false); } this.sync(dt); return;
    }
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1; this.fx = dx / d; this.fz = dz / d;
    this.mesh.rotation.y = Math.atan2(this.fx, this.fz);

    if (this.at > 0) {
      this.at -= dt;
      if (this.mesh.armRGroup) this.mesh.armRGroup.rotation.x = -Math.PI * (1 - this.at / 0.45);
      if (this.at <= 0) {
        if (this.mesh.armRGroup) this.mesh.armRGroup.rotation.x = 0;
        if (inRange(this, p)) p.hurt(this.dm, this);
        this.cd = rand(1, 2);
      }
    }
    else {
      if (this.mesh.armRGroup) this.mesh.armRGroup.rotation.x = 0;
      if (d > R * .8) { this.vx = this.fx * this.sp; this.vz = this.fz * this.sp; }
      this.cd -= dt; if (this.cd <= 0 && inRange(this, p)) this.at = .45;
    }
    this.sync(dt);
  }
}

class Boss extends Enemy {
  constructor(x, z, lv, kind) {
    super(x, z, lv, 'tank'); this.m.clear();
    this.kind = kind; this.isBoss = true; this.xm = 6; this.hp = this.maxHp = this.hp * 3; this.dm += 6;
    this.bTimer = 0; this.bState = 'idle'; this.telegraph = null;

    if (kind === 'miniboss' || kind === 'charger') { this.mesh = M_Toro(); this.w = 2; }
    else if (kind === 'bomber') { this.mesh = M_Bobomb(); this.w = 2; }
    else if (kind === 'laser') { this.mesh = M_VintageRobot(0x222222); this.mesh.scale.set(2.8, 2.8, 2.8); this.w = 2.5; }
    else if (kind === 'summoner') { this.mesh = M_Skeleton(); this.sumCd = 4; }

    this.m.add(this.mesh);
  }

  update(g, dt) {
    const p = g.p;
    this.bTimer -= dt;

    if (this.kind === 'miniboss' || this.kind === 'charger') {
      if (this.bState === 'idle' && this.bTimer <= 0) {
        this.bState = 'prep'; this.bTimer = 1.0;
        const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
        this.chargeDx = dx / d; this.chargeDz = dz / d;
        this.telegraph = new TelegraphLine(this.x, this.z, this.chargeDx, this.chargeDz, 18, 1.5, 0xff0000);
      }
      else if (this.bState === 'prep') {
        const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
        this.chargeDx = dx / d; this.chargeDz = dz / d;
        if (this.telegraph) this.telegraph.setDir(this.x, this.z, this.chargeDx, this.chargeDz);

        if (this.bTimer <= 0) {
          this.bState = 'dash'; this.bTimer = .6;
          if (this.telegraph) { this.telegraph.remove(); this.telegraph = null; }
        }
      }
      else if (this.bState === 'dash') {
        this.vx = this.chargeDx * 22; this.vz = this.chargeDz * 22;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 1.6) p.hurt(this.dm * 1.5, this);
        if (this.bTimer <= 0) { this.bState = 'idle'; this.bTimer = 3.0; }
        this.sync(dt); return;
      }
    }

    if (this.kind === 'bomber') {
      if (this.bTimer <= 0) {
        this.bTimer = 3.5;
        for (let i = 0; i < 4; i++) g.bombs.push(new Bomb(p.x + rand(-5, 5), p.z + rand(-5, 5), 1.2, 2.5, 18, 'e'));
      }
    }

    if (this.kind === 'laser') {
      if (this.bState === 'idle' && this.bTimer <= 0) {
        this.bState = 'prep'; this.bTimer = 1.5;
        const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
        this.laserDx = dx / d; this.laserDz = dz / d;
        this.telegraph = new TelegraphLine(this.x, this.z, this.laserDx, this.laserDz, 22, 2.5, 0x00f0ff);
      }
      else if (this.bState === 'prep') {
        const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
        this.laserDx = dx / d; this.laserDz = dz / d;
        if (this.telegraph) this.telegraph.setDir(this.x, this.z, this.laserDx, this.laserDz);

        if (this.bTimer <= 0) {
          this.bState = 'firing'; this.bTimer = 1.0;
          if (this.telegraph) { this.telegraph.remove(); this.telegraph = null; }
        }
      }
      else if (this.bState === 'firing') {
        g.ring(this.x + this.laserDx * 10, this.z + this.laserDz * 10, 3, 0x00f0ff);
        const px = p.x - this.x, pz = p.z - this.z;
        const proj = px * this.laserDx + pz * this.laserDz;
        const perp = Math.abs(px * (-this.laserDz) + pz * this.laserDx);
        if (proj > 0 && proj < 22 && perp < 1.5) p.hurt(this.dm * dt * 2.5, this);
        if (this.bTimer <= 0) { this.bState = 'idle'; this.bTimer = 4.0; }
        this.sync(dt); return;
      }
    }

    if (this.kind === 'summoner') {
      this.sumCd -= dt;
      const grunts = g.enemies.filter(e => !e.isBoss);
      if (this.sumCd <= 0 && grunts.length < 4) {
        for (let i = 0; i < 2; i++) g.enemies.push(new Enemy(this.x + rand(-2, 2), this.z + rand(-2, 2), g.lv, 'grunt'));
        this.sumCd = 5;
      }
    }

    super.update(g, dt);
  }

  kill() {
    if (this.telegraph) this.telegraph.remove();
    super.kill();
  }
}

class FinalBoss extends Boss {
  constructor(x, z) {
    super(x, z, 20, 'final'); this.hp = this.maxHp = 2500; this.ph = 0;
    this.m.clear(); this.mesh = M_MechaDragon(); this.m.add(this.mesh);
    this.sub = 'fly'; this.en = 100; this.bc = 1; this.tm = 0; this.isFinal = true;
  }
  get name() { return ['FASE 1 - Dragón Mecánico', 'FASE 2 - Gigante de Piel Rosa', 'FASE 3 - Pelota Rebotante', 'FASE 4 - Esqueleto Colosal'][this.ph]; }

  change(ph) {
    this.ph = ph; this.m.clear();
    if (ph === 1) { this.mesh = M_FleshGiant(); this.w = 2.5; this.h = 3.0; }
    if (ph === 2) { this.mesh = M_FleshGiant(); this.mesh.scale.set(0.6, 0.6, 0.6); this.sp = 4.5; }
    if (ph === 3) {
      this.mesh = M_Skeleton(true);
      this.w = 5.0; this.h = 8.0;
      this.sp = 3.5; this.dm = 35;
    }
    this.m.add(this.mesh);
  }

  update(g, dt) {
    const r = this.hp / this.maxHp, t = r < .25 ? 3 : r < .5 ? 2 : r < .75 ? 1 : 0;
    if (t > this.ph) this.change(t);

    if (this.ph === 0) {
      if (this.sub === 'fly') {
        this.y += (4 - this.y) * Math.min(1, dt * 4); this.x += (Math.sin(g.time) * 10 - this.x) * dt * 2; this.en -= dt * 10; this.bc -= dt;
        if (this.bc <= 0) { this.bc = 1.1; g.bombs.push(new Bomb(g.p.x + rand(-2, 2), g.p.z + rand(-2, 2), 1, 2, 20, 'e')); }
        if (this.en <= 0) { this.sub = 'tired'; this.tm = 5; }
      } else { this.y = Math.max(0, this.y - 4 * dt); this.tm -= dt; if (this.tm <= 0) { this.sub = 'fly'; this.en = 100; } }
    } else if (this.ph === 2) {
      this.y = Math.abs(Math.sin(g.time * 6)) * 3.5;
    }

    if (this.ph > 0) {
      const dx = g.p.x - this.x, dz = g.p.z - this.z, d = Math.hypot(dx, dz) || 1;
      this.fx = dx / d; this.fz = dz / d; this.mesh.rotation.y = Math.atan2(this.fx, this.fz);
      if (d > R) { this.vx = this.fx * this.sp; this.vz = this.fz * this.sp; }
      if (inRange(this, g.p) && Math.random() < 0.05) g.p.hurt(this.dm, this);
    }
    this.sync(dt);
  }
}

/* ---------- Gestor del Juego ---------- */
const SPECIAL = { 3: 'miniboss', 5: 'charger', 10: 'bomber', 14: 'laser', 19: 'summoner', 20: 'final' };
class Game {
  constructor() { Object.assign(this, { st: 'menu', paused: false, p: null, enemies: [], bombs: [], shots: [], fx: [], time: 0, mt: 0, lv: 0, ct: 0, bt: 0, bm: '' }); }
  get playing() { return !this.paused && (this.st === 'play' || this.st === 'clear'); }
  hit(e, d, pm, ox, oz) { if (!e.vul()) return false; const dx = e.x - ox, dz = e.z - oz, l = Math.hypot(dx, dz) || 1; e.hurt(d, dx / l * pm, dz / l * pm); this.p.gainXP(Math.ceil(d * e.xm), this); return true; }
  strike(p, d, reach = R) { this.enemies.forEach(e => inRange(p, e, reach) && this.hit(e, d, 6, p.x, p.z)); }
  ring(x, z, r, c) { const m = new THREE.Mesh(new THREE.RingGeometry(r - .15, r, 40), new THREE.MeshBasicMaterial({ color: c, side: 2, transparent: true })); m.rotation.x = -Math.PI / 2; m.position.set(x, .05, z); scene.add(m); this.fx.push({ m, t: .4 }); }
  clearAll() { [...this.enemies, this.p].forEach(e => e && e.kill()); this.bombs.forEach(b => scene.remove(b.ring, b.disc)); this.shots.forEach(s => scene.remove(s.m)); this.fx.forEach(f => scene.remove(f.m)); this.enemies = []; this.bombs = []; this.shots = []; this.fx = []; this.p = null; }
  begin(k) { this.clearAll(); this.p = new Player(k); this.paused = false; this.level(1); }

  level(n) {
    this.lv = n; this.st = 'play'; this.bombs.forEach(b => scene.remove(b.ring, b.disc)); this.bombs = []; const kind = SPECIAL[n];
    this.enemies.forEach(e => e.kill()); this.enemies = [];

    if (kind === 'final') this.enemies.push(new FinalBoss(0, -12));
    else if (kind) this.enemies.push(new Boss(0, -12, n, kind));

    if (kind !== 'final') {
      for (let i = 0, c = 2 + Math.floor(n / 2), ts = Object.keys(ET); i < c; i++) {
        const a = rand(0, 6.28);
        this.enemies.push(new Enemy(Math.cos(a) * (MAP_W * .6), Math.sin(a) * (MAP_H * .6), n, ts[Math.min(2, Math.floor(rand(0, 1 + n / 7)))]));
      }
    }
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

    /* ATAJOS TEST */
    if (pr('KeyN')) this.level(Math.min(20, this.lv + 1));
    if (pr('KeyB')) this.level(Math.max(1, this.lv - 1));
    if (pr('KeyU')) { for (let i = 0; i < 5; i++) p.gainXP(p.need, this); }
    if (pr('Digit1')) this.level(3);
    if (pr('Digit2')) this.level(5);
    if (pr('Digit3')) this.level(10);
    if (pr('Digit4')) this.level(14);
    if (pr('Digit5')) this.level(19);
    if (pr('Digit6')) this.level(20);

    if (this.st === 'play' && !this.enemies.length) { if (this.lv >= 20) { this.st = 'win'; A.end('VICTORIA'); } else { this.st = 'clear'; this.ct = 2; } }
    if (this.st === 'clear' && (this.ct -= dt) <= 0) this.level(this.lv + 1);
    if (p.dead) { this.st = 'over'; A.end('GAME OVER'); }
    this.ui();
  }

  ui() {
    const p = this.p, B = (v, m, c) => `<div class="bar"><i style="width:${100 * clamp(v / m, 0, 1)}%;background:${c}"></i></div>`, boss = this.enemies.find(e => e.isBoss), on = this.playing || this.paused;
    $('hud').innerHTML = p && on ? `${CLASSES[p.k].n}<br>LV ${p.lvl} · NIVEL ${this.lv}/20${B(p.hp, p.maxHp, '#00f0ff')}${B(p.xp, p.need, '#ffe600')}K: ${p.cd1 > 0 ? p.cd1.toFixed(1) + 's' : 'LISTO'}${p.k === 'octo' ? ' · L: ' + (p.cd2 > 0 ? p.cd2.toFixed(1) + 's' : 'LISTO') : ''}${p.k === 'bomber' ? B(p.ch, 1.2, '#ff8a00') : ''}${boss ? '<br>' + (boss.isFinal ? boss.name : 'JEFE') + B(boss.hp, boss.maxHp, boss.vul() ? '#4dff88' : '#ff3b5c') : ''}` : '';
    $('msg').textContent = this.playing ? (this.st === 'clear' ? 'NIVEL COMPLETADO' : this.bt > 0 ? this.bm : '') : '';
    $('xh').style.display = this.playing ? 'block' : 'none'; $('dmg').style.opacity = p && this.playing && p.inv > .5 ? .35 : 0;
    $('pb').style.display = on ? 'block' : 'none'; $('pb').textContent = this.paused ? '▶ CONTINUAR' : '⏸ PAUSA';
  }
}

/* ---------- Menús ---------- */
const hex = c => '#' + c.toString(16).padStart(6, '0');
const ICON = {
  robot: c => `<svg viewBox="0 0 100 100"><rect x="30" y="22" width="40" height="32" rx="6" fill="${c}"/><circle cx="41" cy="38" r="5"/><circle cx="59" cy="38" r="5"/><rect x="26" y="58" width="48" height="30" rx="4" fill="${c}"/></svg>`,
  samurai: c => `<svg viewBox="0 0 100 100"><circle cx="50" cy="30" r="14" fill="${c}"/><rect x="38" y="46" width="24" height="40" rx="4" fill="${c}"/><line x1="18" y1="70" x2="40" y2="20" stroke="#ddd" stroke-width="4"/></svg>`,
  bomber: c => `<svg viewBox="0 0 100 100"><circle cx="45" cy="60" r="26" fill="#333" stroke="${c}" stroke-width="4"/><path d="M60 22 q10 -14 20 -4" stroke="${c}" stroke-width="3" fill="none"/></svg>`,
  octo: c => `<svg viewBox="0 0 100 100"><circle cx="50" cy="32" r="14" fill="${c}"/><rect x="40" y="46" width="20" height="22" fill="${c}"/></svg>`,
};
const CTRL = [['Moverse', 'W A S D'], ['Mirar', 'Mouse FPS'], ['Atacar', 'Clic Izq o J'], ['Habilidad', 'K o Clic Der'], ['Agarrar (Pulpo)', 'L']];
const A = {
  sel: null, back: 'menu',
  show(h) { const o = $('ov'); o.innerHTML = h; o.style.display = 'flex'; }, hide() { $('ov').style.display = 'none'; },
  lock() { try { ren.domElement.requestPointerLock(); } catch (e) { } }, free() { try { document.exitPointerLock(); } catch (e) { } },
  menu() { game.clearAll(); game.paused = false; game.st = 'menu'; this.free(); this.show(`<h1>NEON CRASHERS 3D</h1><button class="btn" onclick="A.classes()">Jugar</button><button class="btn" onclick="A.controls('menu')">Controles</button>`); },
  classes() {
    game.st = 'menu';
    this.show(`<h1>ELIGE TU CLASE</h1><div class="cards">${Object.entries(CLASSES).map(([k, c]) => `<div class="card${this.sel === k ? ' on' : ''}">${ICON[k](hex(c.c))}<div style="color:${hex(c.c)}">${c.n}</div><p>${c.d}</p><button class="btn" style="min-width:0" onclick="A.pick('${k}')">${this.sel === k ? 'Elegida ✓' : 'Elegir'}</button></div>`).join('')}</div><button class="btn" ${this.sel ? '' : 'disabled'} onclick="A.start()">Empezar</button><button class="btn" onclick="A.menu()">Volver</button>`);
  },
  pick(k) { this.sel = k; this.classes(); },
  start() { if (!this.sel) return; game.begin(this.sel); this.hide(); this.lock(); },
  controls(from) { this.show(`<h1>CONTROLES</h1><div class="ctl">${CTRL.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('')}</div><button class="btn" onclick="A.${from === 'pause' ? 'pauseMenu' : 'menu'}()">Volver</button>`); },
  pauseMenu() { this.show(`<h1>PAUSA</h1><button class="btn" onclick="A.resume()">Continuar</button><button class="btn" onclick="A.controls('pause')">Controles</button><button class="btn" onclick="A.quit()">Salir</button>`); },
  pause() { if (!game.playing) return; game.paused = true; this.free(); this.pauseMenu(); },
  resume() { if (!game.paused) return; game.paused = false; this.hide(); this.lock(); },
  quit() { game.clearAll(); game.paused = false; this.classes(); },
  end(t) { game.paused = false; this.free(); this.show(`<h1>${t}</h1><button class="btn" onclick="A.menu()">Volver al menú</button>`); }
};

document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && game.playing) A.pause(); });
$('pb').onclick = () => { game.paused ? A.resume() : A.pause(); $('pb').blur(); };
const game = new Game(); A.menu();
let last = 0; (function loop(t) { const dt = Math.min(.05, (t - last) / 1e3 || 0); last = t; game.update(dt); ren.render(scene, cam); pressed.clear(); released.clear(); requestAnimationFrame(loop); })(0);