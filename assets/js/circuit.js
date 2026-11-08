// A crushing circuit in one 3D world: jaw crusher (primary), conveyor, cone crusher (secondary), conveyor,
// horizontal shaft impact crusher (tertiary), conveyor, stockpile. Every stone is simulated: it is wedged and
// broken by the jaw, squeezed by the gyrating mantle, flung by the blow bars against the impact plates, and
// carried on to the next machine. The page scroll moves the camera along the rock's path.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const host = document.querySelector('[data-circuit]');
if (host) run(host);

function run(host) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = host.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { host.classList.add('nogl'); return; }
  host.classList.add('gl');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 140);

  // ---------- light: warm work light, amber bounce, cool rim, a glow in each chamber
  scene.add(new THREE.HemisphereLight(0xfff1e0, 0xc8a585, 1.15));
  const key = new THREE.DirectionalLight(0xffc27a, 3.1); key.position.set(9, 18, 13); key.target.position.set(4, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -20, right: 20, top: 13, bottom: -13, near: 2, far: 50 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.8); rim.position.set(-6, 5, -10); scene.add(rim);

  // ---------- materials
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const paint = M({ color: 0x4a4540, metalness: 0.35, roughness: 0.55 });
  const paintOr = M({ color: 0xb4561c, metalness: 0.3, roughness: 0.6 });
  const steel = M({ color: 0xc9c0b4, metalness: 0.95, roughness: 0.3, emissive: 0x2a1204, emissiveIntensity: 0.55 });
  const dark = M({ color: 0x24211e, metalness: 0.6, roughness: 0.6 });
  const rubber = M({ color: 0x2b2826, metalness: 0.05, roughness: 0.92 });
  const concrete = M({ color: 0xd8cdbf, metalness: 0, roughness: 0.95 });
  const cut = M({ color: 0x8c8379, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide });
  const rockMat = M({ color: 0xa89a8a, metalness: 0.05, roughness: 0.92, flatShading: true });

  const mesh = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  // a slab between two points in the x/y plane, depth along z
  const slab = (a, b, t, d, mat, z = 0) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); const m = box(L, t, d, mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z); m.rotation.z = Math.atan2(dy, dx); return m; };
  const plateFrom = (pts, depth, mat) => { const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); return mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat); };

  const FLOOR = -2.8;
  const floor = mesh(new THREE.PlaneGeometry(120, 60), new THREE.ShadowMaterial({ color: 0x7a4a20, opacity: 0.17 }), false);
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; scene.add(floor);
  const column = (x, z, top, w = 0.42) => scene.add(box(w, top - FLOOR, w, concrete, x, (top + FLOOR) / 2, z));

  // ---------- rock: one jagged stone shape, one instanced pool for the whole circuit
  const stone = new THREE.IcosahedronGeometry(1, 0);
  { const p = stone.attributes.position, h = (x, y, z) => { const v = Math.sin(x * 12.99 + y * 78.23 + z * 37.71) * 43758.5; return v - Math.floor(v); };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + 0.32 * h(+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)); p.setXYZ(i, x * k, y * k * 0.82, z * k); } stone.computeVertexNormals(); }
  const N = 1700, rocks = new THREE.InstancedMesh(stone, rockMat, N); rocks.castShadow = true; rocks.receiveShadow = true;
  rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(rocks);
  { const c = new THREE.Color(); for (let i = 0; i < N; i++) rocks.setColorAt(i, c.setHSL(0.06 + Math.random() * 0.05, 0.12 + Math.random() * 0.14, 0.26 + Math.random() * 0.2)); }
  const R = Array.from({ length: N }, () => ({ st: 0 }));
  let cursor = 0;
  const get = () => { for (let k = 0; k < N; k++) { const r = R[cursor]; cursor = (cursor + 1) % N; if (!r.st) return r; } return null; };
  const fresh = (r, st, x, y, z, s) => Object.assign(r, { st, x, y, z, s, vx: 0, vy: 0, vz: 0, rx: Math.random() * 6, ry: Math.random() * 6, spin: (Math.random() - .5) * 4, cd: 0, u: 0, phi: 0, rad: 0, dphi: 0 });
  const split = (r, k, spread = 1) => { r.s *= k; const f = get(); if (f) { fresh(f, r.st, r.x + (Math.random() - .5) * r.s * spread, r.y, r.z + (Math.random() - .5) * r.s * 2 * spread, r.s); Object.assign(f, { vx: r.vx * .8 + (Math.random() - .5), vy: r.vy, phi: r.phi + (Math.random() - .5) * .2, rad: r.rad, u: r.u, cd: r.cd }); } };

  // dust and chips: amber points
  const DN = 700, dGeo = new THREE.BufferGeometry(), dPos = new Float32Array(DN * 3), dV = new Float32Array(DN * 3), dL = new Float32Array(DN);
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xffb070, size: 0.03, transparent: true, opacity: 0.85, depthWrite: false })));
  let di = 0;
  const puff = (x, y, z, n = 5, sp = 1) => { for (let k = 0; k < n; k++) { const j = di++ % DN; dPos.set([x, y, z], j * 3); dV.set([(Math.random() - .5) * sp, Math.random() * .5 * sp, (Math.random() - .5) * sp], j * 3); dL[j] = .5 + Math.random() * .4; } };

  // ---------- conveyors
  function conveyor(A, B, W = 0.9) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const g = new THREE.Group(); g.position.set(A[0], A[1], 0); g.rotation.z = a; scene.add(g);
    g.add(box(L, 0.04, W, rubber, L / 2, 0, 0));
    for (const z of [-W / 2 - 0.06, W / 2 + 0.06]) g.add(box(L, 0.14, 0.05, paint, L / 2, -0.06, z));
    for (let u = 0.3; u < L; u += 0.55) { const c = mesh(new THREE.CylinderGeometry(0.05, 0.05, W, 12), dark, false); c.rotation.x = Math.PI / 2; c.position.set(u, -0.07, 0); g.add(c); }
    for (const u of [0, L]) { const c = mesh(new THREE.CylinderGeometry(0.15, 0.15, W + 0.04, 24), paintOr); c.rotation.x = Math.PI / 2; c.position.set(u, -0.13, 0); g.add(c); }
    for (let u = 1.2; u < L - 0.4; u += 2.4) { const x = A[0] + Math.cos(a) * u, y = A[1] + Math.sin(a) * u - 0.14; if (y - FLOOR < 0.3) continue; for (const z of [-W / 2 - .06, W / 2 + .06]) scene.add(box(0.07, y - FLOOR, 0.07, paint, x, (y + FLOOR) / 2, z)); }
    return { A, dir: [dx / L, dy / L], L, W, V: 1.7 };
  }
  const onBelt = (b, r, dt) => { r.u += b.V * dt; r.x = b.A[0] + b.dir[0] * r.u; r.y = b.A[1] + b.dir[1] * r.u + 0.04 + r.s * 0.8; r.spin *= .9; return r.u >= b.L; };
  const launch = (b, r, st) => { r.st = st; r.vx = b.dir[0] * b.V; r.vy = b.dir[1] * b.V + 0.4; };

  // =====================================================================  JAW CRUSHER (primary)
  const JX = -11, JY = -0.8, J = new THREE.Group(); J.position.set(JX, JY, 0); scene.add(J);
  const xF = -0.55, JH = 2.3, K = 0.40, G0 = 0.24, PV = [xF + G0 + K * 2.55 + 0.28, 2.55], STROKE = 0.05;
  const xS0 = y => xF + G0 + K * y;
  let jc = 0;
  const jawGap = y => (xS0(y) - xF) - STROKE * jc * (PV[1] - y);
  function jawPlate(h, w, face) {   // a manganese jaw plate with vertical teeth, teeth facing +face on x
    const g = new THREE.Group(); g.add(box(0.14, h, w, steel));
    for (let i = 0; i < 7; i++) { const t = box(0.075, h * 0.98, 0.075, steel, face * 0.07, 0, -w / 2 + w * (i + .5) / 7); t.rotation.y = Math.PI / 4; g.add(t); }
    return g;
  }
  { // fixed jaw plate, teeth tips on x = xF
    const fp = jawPlate(2.4, 1.25, 1); fp.position.set(xF - 0.123, 1.15, 0); J.add(fp);
    // frame: front end wall, back side plate (front one cut away), rear block, bearing housing, cheek plates
    J.add(box(0.5, 3.3, 1.62, paint, xF - 0.44, 1.15, -0.06));
    J.add(box(0.55, 1.05, 1.62, paint, 1.38, 0.1, -0.06));
    const side = plateFrom([[xF - 0.69, -0.45], [1.66, -0.45], [1.66, 0.65], [PV[0] + 0.7, PV[1] - 0.45], [PV[0] + 0.7, PV[1] + 0.45], [PV[0] - 0.6, PV[1] + 0.5], [xF - 0.69, 2.8]], 0.12, paint);
    side.position.z = -0.87; J.add(side);
    const cheek = plateFrom([[xF, 0.02], [xS0(0) + 0.06, 0.02], [xS0(JH), JH], [xF, JH]], 0.05, steel); cheek.position.z = -0.75; J.add(cheek);
    const brg = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 32), paintOr); brg.rotation.x = Math.PI / 2; brg.position.set(PV[0], PV[1], -0.98); J.add(brg);
    // vibrating grizzly feeder bringing rock in from the left
    const fd = new THREE.Group(); fd.position.set(xF - 1.25, 2.86, 0); fd.rotation.z = -0.13; J.add(fd);
    fd.add(box(2.5, 0.08, 1.3, paint)); fd.add(box(2.5, 0.42, 0.06, paint, 0, 0.2, -0.68)); for (let i = 0; i < 5; i++) fd.add(box(2.3, 0.04, 0.05, steel, 0.05, 0.06, -0.5 + i * .25));
    for (const [x, z] of [[xF - 0.5, 0.95], [xF - 0.5, -0.95], [1.4, 0.95], [1.4, -0.95]]) column(JX + x, z, JY - 0.45);
  }
  const swing = new THREE.Group(); swing.position.set(PV[0], PV[1], 0); J.add(swing);
  { const na = Math.hypot(1, K), n = [1 / na, -K / na], al = -Math.atan(K);
    const at = (y, off) => [xS0(y) + n[0] * off - PV[0], y + n[1] * off - PV[1]];
    const sp = jawPlate(2.4, 1.25, -1); const c = at(1.2, 0.123); sp.position.set(c[0], c[1], 0); sp.rotation.z = al; swing.add(sp);
    const pit = box(0.42, 2.85, 1.2, paint); const d = at(1.3, 0.123 + 0.07 + 0.21); pit.position.set(d[0], d[1], 0); pit.rotation.z = al; swing.add(pit);
    const hub = mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.25, 32), paint); hub.rotation.x = Math.PI / 2; swing.add(hub);
    const toe = at(-0.05, 0.4); J.add(slab([toe[0] + PV[0], toe[1] + PV[1]], [1.12, 0.05], 0.07, 1.1, dark));
  }
  const shaftJ = mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.7, 24), dark); shaftJ.rotation.x = Math.PI / 2; shaftJ.position.set(PV[0], PV[1], -0.2); J.add(shaftJ);
  const fly = new THREE.Group(); fly.position.set(PV[0], PV[1], -1.2); J.add(fly);
  { const w = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.14, 56), dark); w.rotation.x = Math.PI / 2; fly.add(w);
    for (let i = 0; i < 3; i++) { const s = box(0.1, 1.55, 0.04, paintOr, 0, 0, 0.09); s.rotation.z = i * Math.PI / 3; fly.add(s); } }
  const glowJ = new THREE.PointLight(0xff8a2a, 6, 5, 2); glowJ.position.set(JX + 0.1, JY + 0.9, 1.4); scene.add(glowJ);

  // =====================================================================  CONE CRUSHER (secondary)
  const CX = 0, CY = -0.4, C = new THREE.Group(); C.position.set(CX, CY, 0); scene.add(C);
  const PHI0 = Math.PI * 0.5, PHIL = Math.PI * 1.5;
  function revolve(profile, mat, seg = 96) {
    const g = new THREE.Group(), pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const l = mesh(new THREE.LatheGeometry(pts, seg, PHI0, PHIL), mat.clone()); l.material.side = THREE.DoubleSide; g.add(l);
    const shape = new THREE.Shape(pts);
    for (const a of [PHI0, PHI0 + PHIL]) { const c = mesh(new THREE.ShapeGeometry(shape), cut, false); c.rotation.y = a - Math.PI / 2; g.add(c); }
    return g;
  }
  const concaveIn = y => 0.62 + (1.62 - y) * 0.42, mantleOut = y => 0.12 + (1.62 - y) * 0.78;
  const prof = (f, y0, y1, t, n = 14) => { const a = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; a.push([f(y), y]); } for (let i = n; i >= 0; i--) { const y = y0 + (y1 - y0) * i / n; a.push([f(y) + t, y]); } return a; };
  C.add(revolve([[0.32, -1.15], [1.55, -1.15], [1.6, -1.0], [1.6, 0.18], [1.82, 0.18], [1.82, 0.32], [1.36, 0.32], [1.36, -0.95], [0.32, -0.95]], paint));
  C.add(revolve([[1.36, 0.32], [1.9, 0.32], [1.9, 0.62], [1.36, 0.62]], paintOr));
  C.add(revolve([[1.36, 0.62], [1.62, 0.62], [1.34, 1.62], [1.08, 1.74], [1.02, 1.62], [concaveIn(1.6) + 0.14, 1.6], [concaveIn(0.62) + 0.14, 0.62]], paint));
  C.add(revolve(prof(concaveIn, 0.36, 1.6, 0.14), steel));
  C.add(revolve([[1.02, 1.74], [1.55, 2.45], [1.6, 2.45], [1.07, 1.74]], paint, 72));
  const head = new THREE.Group(); head.position.y = -0.9; C.add(head);
  const onHead = o => { o.position.y += 0.9; head.add(o); return o; };
  onHead(revolve([[0.001, 0.3], ...Array.from({ length: 15 }, (_, i) => { const y = 0.3 + 1.28 * i / 14; return [Math.max(0.001, mantleOut(y) - 0.12), y]; }), [0.001, 1.58]], paint));
  onHead(revolve(prof(mantleOut, 0.3, 1.58, -0.12).map(([r, y]) => [Math.max(0.001, r), y]), steel));
  { const s = mesh(new THREE.CylinderGeometry(0.15, 0.17, 2.9, 32), dark); s.position.y = 0.2; onHead(s);
    const p = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 40), steel); p.position.y = 1.66; onHead(p); }
  const cs = mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.3, 32), paint); cs.rotation.x = Math.PI / 2; cs.position.set(0, -0.7, -2.0); C.add(cs);
  const pulleyC = new THREE.Group(); pulleyC.position.set(0, -0.7, -2.7); C.add(pulleyC);
  { const w = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.16, 48), dark); w.rotation.x = Math.PI / 2; pulleyC.add(w); const s = box(0.1, 1.05, 0.04, paintOr, 0, 0, -0.1); pulleyC.add(s); }
  for (const [x, z] of [[-1.15, 1.15], [1.15, 1.15], [-1.15, -1.15], [1.15, -1.15]]) column(CX + x, z, CY - 1.15, 0.46);
  const glowC = new THREE.PointLight(0xff8a2a, 8, 6, 2); glowC.position.set(CX + 0.6, CY + 0.4, 1.8); scene.add(glowC);
  const TILT = 0.022, OMEGA = 2 * Math.PI * 1.2; let psi = 0;
  const coneGap = (y, phi) => concaveIn(y) - mantleOut(y) - Math.sin(TILT) * (y + 0.9) * Math.cos(phi - psi);

  // =====================================================================  IMPACT CRUSHER (tertiary, horizontal shaft)
  const IX = 11, IY = -1.0, I = new THREE.Group(); I.position.set(IX, IY, 0); scene.add(I);
  const RC = [0, 1.0], RR = 0.82, AP = 1.22;
  const rotor = new THREE.Group(); rotor.position.set(RC[0], RC[1], 0); I.add(rotor);
  { const b = mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.3, 48), dark); b.rotation.x = Math.PI / 2; rotor.add(b);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, bar = box(0.24, 0.13, 1.26, steel, Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0); bar.rotation.z = a; rotor.add(bar); }
    const sh = mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 20), dark); sh.rotation.x = Math.PI / 2; sh.position.z = -0.6; rotor.add(sh); }
  const pulleyI = new THREE.Group(); pulleyI.position.set(RC[0], RC[1], -1.85); I.add(pulleyI);
  { const w = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 48), dark); w.rotation.x = Math.PI / 2; pulleyI.add(w); pulleyI.add(box(0.1, 0.95, 0.04, paintOr, 0, 0, -0.1)); }
  { const hull = [[-1.3, -0.2], [1.5, -0.2], [1.6, 1.3], [1.25, 2.12], [0.4, 2.5], [-0.65, 2.42], [-1.3, 1.85]];
    const back = plateFrom(hull, 0.12, paint); back.position.z = -0.84; I.add(back);
    for (let i = 1; i < hull.length; i++) if (i > 1) I.add(slab(hull[i - 1], hull[i], 0.12, 1.56, i % 2 ? paint : paintOr, -0.06));
    I.add(slab(hull[0], [-1.3, 1.3], 0.12, 1.56, paint, -0.06));
    const brg = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 28), paintOr); brg.rotation.x = Math.PI / 2; brg.position.set(RC[0], RC[1], -1.0); I.add(brg);
    // two impact plates (aprons) above and beside the rotor
    const arcSlab = (a0, a1) => I.add(slab([RC[0] + Math.cos(a0) * (AP + .07), RC[1] + Math.sin(a0) * (AP + .07)], [RC[0] + Math.cos(a1) * (AP + .07), RC[1] + Math.sin(a1) * (AP + .07)], 0.14, 1.3, steel));
    arcSlab(1.85, 1.0); arcSlab(0.95, 0.35); arcSlab(0.3, -0.25);
    // feed chute
    I.add(slab([-2.25, 2.12], [-0.92, 1.52], 0.07, 1.2, steel)); I.add(slab([-2.25, 2.3], [-0.92, 1.7], 0.36, 0.05, paint, -0.62));
    for (const [x, z] of [[-1.1, 0.95], [1.3, 0.95], [-1.1, -0.95], [1.3, -0.95]]) column(IX + x, z, IY - 0.2, 0.42);
  }
  const glowI = new THREE.PointLight(0xff8a2a, 6, 5, 2); glowI.position.set(IX + 0.5, IY + 1.3, 1.5); scene.add(glowI);

  // stockpile of finished product
  const PX = 19.2, PH = 2.5, PRAD = 2.8;
  { const g = new THREE.ConeGeometry(PRAD, PH, 64, 8, true), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < PH / 2 - 0.01 && y > -PH / 2 + 0.01) { p.setX(i, p.getX(i) * (1 + (Math.random() - .5) * .06)); p.setZ(i, p.getZ(i) * (1 + (Math.random() - .5) * .06)); } }
    g.computeVertexNormals(); const m = mesh(g, M({ color: 0x9a8b7b, roughness: 0.97, flatShading: true }), false); m.position.set(PX, FLOOR + PH / 2, 0); scene.add(m); }
  const pileTop = FLOOR + PH;

  // conveyors linking the machines
  const B1 = conveyor([JX - 1.1, -2.05], [CX - 1.0, CY + 2.62]);
  const B2 = conveyor([CX - 0.8, -2.25], [IX - 2.3, IY + 2.4]);
  const B3 = conveyor([IX - 0.9, -2.2], [PX - 1.2, pileTop + 0.75]);
  // feed for the jaw: a stockpile of run of mine rock
  { const g = new THREE.ConeGeometry(2.2, 1.5, 40, 4, true); const m = mesh(g, M({ color: 0x8f8172, roughness: 0.97, flatShading: true }), false); m.position.set(JX - 4.4, FLOOR + 0.75, -0.4); scene.add(m); }

  // ---------- simulation
  const ST = { JAW: 1, B1: 2, F1: 3, CONE: 4, B2: 5, F2: 6, CHUTE: 7, IMP: 8, B3: 9, F3: 10 };
  let t = 0, feedAcc = 0;
  function simulate(dt) {
    t += dt;
    // machines
    jc = 0.5 - 0.5 * Math.cos(2 * Math.PI * 2.4 * t);
    swing.rotation.z = -STROKE * jc; swing.position.y = PV[1] + 0.012 * Math.sin(2 * Math.PI * 2.4 * t);
    fly.rotation.z -= dt * 2 * Math.PI * 2.4;
    psi = OMEGA * t; head.rotation.set(TILT * Math.sin(psi), 0, -TILT * Math.cos(psi)); head.rotateY(dt * 0.15);
    pulleyC.rotation.z += dt * 9;
    rotor.rotation.z -= dt * 2 * Math.PI * 2.2; pulleyI.rotation.z = rotor.rotation.z;
    // feed the jaw from the grizzly
    feedAcc += dt * 4.2;
    while (feedAcc > 1) { feedAcc--; const r = get(); if (r) fresh(r, ST.JAW, JX + xF + 0.1 + Math.random() * 0.25, JY + 3.0, (Math.random() - .5) * 1.0, 0.2 + Math.random() * 0.13).vx = 0.7; }
    // choke feed: the cone and the impactor are kept full, as they would be on a running plant
    if (Math.random() < dt * 7) { const r = get(); if (r) { const ph = Math.random() * 6.283; fresh(r, ST.CONE, CX + Math.cos(ph) * .3, CY + 2.3, Math.sin(ph) * .3, 0.07 + Math.random() * 0.05); Object.assign(r, { phi: ph, rad: .3, dphi: (Math.random() - .5) * 4 }); } }
    if (Math.random() < dt * 6) { const r = get(); if (r) fresh(r, ST.CHUTE, IX - 2.2, IY + 2.2, (Math.random() - .5) * .9, 0.05 + Math.random() * 0.04); }
    for (let i = 0; i < N; i++) {
      const r = R[i]; if (!r.st) continue;
      r.rx += r.spin * dt; r.ry += r.spin * dt * .7;
      switch (r.st) {
        case ST.JAW: {
          const ly = r.y - JY;
          const inCh = ly < JH && ly > 0;
          const g = jawGap(Math.max(0, Math.min(JH, ly)));
          if (inCh && 2 * r.s >= g) { r.vy = 0; r.spin *= .5; if (g < 2 * r.s * 0.84) { split(r, 0.76); puff(r.x, r.y, r.z + 0.3, 6); } }
          else { r.vy = Math.max(r.vy - 9.8 * dt, -5); r.y += r.vy * dt; }
          if (ly < JH + 0.3) { const mid = JX + xF + g / 2; r.x += (mid - r.x) * Math.min(1, dt * 8); r.z = Math.max(-0.62 + r.s, Math.min(0.62 - r.s, r.z)); }
          else r.x += r.vx * dt;
          if (r.y < B1.A[1] + 0.05 + r.s) { r.st = ST.B1; r.u = Math.max(0, (r.x - B1.A[0]) / B1.dir[0]); r.z *= 0.6; }
          break; }
        case ST.B1: if (onBelt(B1, r, dt)) launch(B1, r, ST.F1); break;
        case ST.F1: r.vy -= 9.8 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
          if (r.y < CY + 2.3) { r.st = ST.CONE; r.phi = Math.atan2(r.z, r.x - CX); r.rad = Math.hypot(r.x - CX, r.z); r.dphi = (Math.random() - .5) * 6; r.vy = Math.max(r.vy, -2); }
          break;
        case ST.CONE: {
          const ly = r.y - CY, inCh = ly < 1.6 && ly > 0.36;
          let target;
          if (inCh) {
            const g = coneGap(ly, r.phi);
            if (2 * r.s > g) { r.vy = 0; if (g < 2 * r.s * 0.9) { const px = CX + Math.cos(r.phi) * concaveIn(ly), pz = Math.sin(r.phi) * concaveIn(ly); if (Math.random() < .45) split(r, 0.7); else r.s *= 0.64; puff(px, r.y, pz, 4); } }
            else { r.vy = Math.min(r.vy + 6 * dt, 1.6); r.y -= r.vy * dt; }
            target = (concaveIn(ly) + mantleOut(ly)) / 2;
          } else {
            r.vy = Math.min(Math.abs(r.vy) + 9.8 * dt, 4); r.y -= r.vy * dt;
            target = ly >= 1.6 ? 0.25 + (2.3 - Math.min(2.3, ly)) * 0.9 : concaveIn(0.36) - 0.15;
            if (ly > 1.6) r.phi += r.dphi * dt;          // the feed plate spreads rock round the chamber
          }
          r.rad += (target - r.rad) * Math.min(1, dt * 7);
          r.x = CX + Math.cos(r.phi) * r.rad; r.z = Math.sin(r.phi) * r.rad;
          if (ly < -1.05) { r.st = ST.B2; r.u = 0.2 + Math.random() * 0.5; r.z = (Math.random() - .5) * 0.55; r.y = B2.A[1]; }
          break; }
        case ST.B2: if (onBelt(B2, r, dt)) launch(B2, r, ST.F2); break;
        case ST.F2: r.vy -= 9.8 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
          if (r.y < IY + 2.18 + r.s) { r.st = ST.CHUTE; r.u = Math.max(0, (r.x - (IX - 2.25)) / 1.33 * 1.45); r.z = Math.max(-.5, Math.min(.5, r.z)); }
          break;
        case ST.CHUTE: { r.u += dt * 2.6; const k = Math.min(1, r.u / 1.45); r.x = IX - 2.25 + 1.33 * k; r.y = IY + 2.12 - 0.6 * k + 0.05 + r.s;
          if (k >= 1) { r.st = ST.IMP; r.vx = 2.2; r.vy = -1.0; }
          break; }
        case ST.IMP: {
          r.vy -= 9.8 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.cd -= dt;
          let lx = r.x - IX - RC[0], ly = r.y - IY - RC[1]; const d = Math.hypot(lx, ly) || 1e-3, th = Math.atan2(ly, lx);
          if (d < RR + r.s && ly > -0.55 && r.cd <= 0) {          // struck by a blow bar
            const sp = 7 + Math.random() * 2; r.vx = Math.sin(th) * sp + lx / d; r.vy = -Math.cos(th) * sp + ly / d;
            r.x = IX + RC[0] + lx / d * (RR + r.s); r.y = IY + RC[1] + ly / d * (RR + r.s); r.cd = 0.12; r.spin = (Math.random() - .5) * 20;
            split(r, 0.74, 2); puff(r.x, r.y, r.z + 0.3, 3, 2);
          } else if (d > AP - r.s && th > -0.25 && th < 1.85) {   // hits an impact plate
            const nx = lx / d, ny = ly / d, dot = r.vx * nx + r.vy * ny;
            if (dot > 0) { r.vx = (r.vx - 2 * dot * nx) * 0.35; r.vy = (r.vy - 2 * dot * ny) * 0.35; split(r, 0.7, 2); puff(r.x, r.y, r.z + 0.3, 4, 1.5); }
            r.x = IX + RC[0] + nx * (AP - r.s); r.y = IY + RC[1] + ny * (AP - r.s);
          } else if (d < RR + r.s) { r.x = IX + RC[0] + lx / d * (RR + r.s); r.y = IY + RC[1] + ly / d * (RR + r.s); }
          const wl = r.y - IY < 1.3 ? IX - 1.2 : IX - 2.4;
          if (r.x < wl) { r.x = wl; r.vx = Math.abs(r.vx) * .3; }
          if (r.x > IX + 1.42) { r.x = IX + 1.42; r.vx = -Math.abs(r.vx) * .3; }
          if (r.y > IY + 2.32) { r.y = IY + 2.32; r.vy = -Math.abs(r.vy) * .3; }
          r.z = Math.max(-0.6, Math.min(0.6, r.z + r.vz * dt));
          if (r.y < IY - 0.15) { r.st = ST.B3; r.u = Math.max(0.1, (r.x - B3.A[0]) / B3.dir[0]); r.z *= .7; }
          break; }
        case ST.B3: if (onBelt(B3, r, dt)) launch(B3, r, ST.F3); break;
        case ST.F3: r.vy -= 9.8 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
          if (r.y < pileTop - Math.abs(r.x - PX) / PRAD * PH) r.st = 0;
          break;
      }
      if (r.s < 0.014) r.s = 0.014;
    }
    for (let j = 0; j < DN; j++) { if (dL[j] <= 0) { dPos[j * 3 + 1] = -99; continue; } dL[j] -= dt; dV[j * 3 + 1] -= 1.6 * dt; for (let k = 0; k < 3; k++) dPos[j * 3 + k] += dV[j * 3 + k] * dt; }
    const b = Math.sin(t * 3.1) * .1 + Math.sin(t * 7.3) * .05;
    glowJ.intensity = 6 * (1 + b); glowC.intensity = 8 * (1 + b); glowI.intensity = 6 * (1 - b);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function writeRocks() {
    for (let i = 0; i < N; i++) { const r = R[i]; if (!r.st) { rocks.setMatrixAt(i, zero); continue; } v3.set(r.x, r.y, r.z); q.setFromEuler(e3.set(r.rx, r.ry, 0)); sc.setScalar(r.s); rocks.setMatrixAt(i, m4.compose(v3, q, sc)); }
    rocks.instanceMatrix.needsUpdate = true; dGeo.attributes.position.needsUpdate = true;
  }

  // ---------- camera: keyframes along the rock's path, chosen by scroll
  const keys = [
    { p: [20, 6.5, 24], l: [1.5, 0.9, 0] },              // the whole circuit
    { p: [JX + 3.0, JY + 3.0, 8.6], l: [JX + 0.2, JY + 1.0, 0] },   // jaw
    { p: [CX + 5.0, CY + 3.2, 6.4], l: [CX + 0.1, CY + 0.7, 0] },          // cone
    { p: [IX + 2.2, IY + 2.4, 8.0], l: [IX + 0.1, IY + 1.0, 0] },    // impact
    { p: [-6, 7.5, 29], l: [7, 0.6, 0] },                  // pull back to the stockpile
  ];
  const stops = [0, 0.2, 0.47, 0.74, 1], HOLD = 0.045;
  const curP = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.p)), false, 'centripetal');
  const curL = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.l)), false, 'centripetal');
  const ease = x => x * x * (3 - 2 * x);
  function pathU(p) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i] + (i ? HOLD : 0), b = stops[i + 1] - (i + 1 < stops.length - 1 ? HOLD : 0);
      if (p <= stops[i + 1] + (i + 1 < stops.length - 1 ? HOLD : 0)) return (i + ease(Math.max(0, Math.min(1, (p - a) / (b - a))))) / (stops.length - 1);
    }
    return 1;
  }
  const cp = new THREE.Vector3(), cl = new THREE.Vector3(), tp = new THREE.Vector3(), tl = new THREE.Vector3();
  let wide = 1, first = true;
  function place(u, dt) {
    curP.getPoint(u, tp); curL.getPoint(u, tl);
    tp.sub(tl).multiplyScalar(wide).add(tl); tp.x += Math.sin(t * 0.21) * 0.25; tp.y += Math.sin(t * 0.17) * 0.12;
    if (first) { cp.copy(tp); cl.copy(tl); first = false; }
    const k = 1 - Math.exp(-dt * 3.4); cp.lerp(tp, k); cl.lerp(tl, k);
    camera.position.copy(cp); camera.lookAt(cl);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    wide = camera.aspect < 0.8 ? 1.9 : camera.aspect < 1.3 ? 1.35 : 1;
    if (camera.aspect > 1.3) camera.setViewOffset(w, h, -w * 0.13, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // callouts: a dot on the part, a leader line, and a label that links to the product
  const svg = host.querySelector('.leaders');
  const T = { // world anchor, label offset in px, scroll window
    'jaw-plates':  { w: [JX + xF + 0.02, JY + 1.55, 0.6], o: [-30, -170], at: [0.15, 0.29] },
    'side-plates': { w: [JX + xF + 0.32, JY + 1.95, -0.7], o: [230, 150], at: [0.15, 0.29] },
    'concaves':    { w: [CX + 0.97, CY + 1.05, 0.02], o: [190, -150], at: [0.41, 0.55] },
    'mantles':     { w: [CX + 0.03, CY + 1.0, 0.55], o: [-60, 190], at: [0.41, 0.55] },
    'blow-bars':   { w: [IX + 0.5, IY + 1.5, 0.66], o: [-40, 200], at: [0.68, 0.82] },
    'body-liners': { w: [IX + Math.cos(0.7) * 1.3, IY + 1 + Math.sin(0.7) * 1.3, 0.66], o: [180, -130], at: [0.68, 0.82] },
  };
  const tags = [...host.querySelectorAll('[data-tag]')].map(el => {
    const c = T[el.dataset.tag], dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'), ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    dot.setAttribute('r', 5); ln.setAttribute('pathLength', 1); svg.append(ln, dot);
    return { el, dot, ln, ...c, v: new THREE.Vector3(...c.w) };
  });
  const pv = new THREE.Vector3();
  function callouts(p) {
    const w = canvas.clientWidth, h = canvas.clientHeight, s = Math.min(1, w / 1100);
    for (const g of tags) {
      const on = p >= g.at[0] && p < g.at[1];
      pv.copy(g.v).project(camera);
      const x = (pv.x + 1) / 2 * w, y = (1 - pv.y) / 2 * h;
      const lx = Math.max(70, Math.min(w - 70, x + g.o[0] * s)), ly = Math.max(70, Math.min(h - 140, y + g.o[1] * s));
      g.dot.setAttribute('cx', x); g.dot.setAttribute('cy', y);
      g.ln.setAttribute('x1', x); g.ln.setAttribute('y1', y); g.ln.setAttribute('x2', lx); g.ln.setAttribute('y2', ly);
      g.el.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -50%)`;
      g.el.classList.toggle('on', on); g.dot.classList.toggle('on', on); g.ln.classList.toggle('on', on);
    }
  }
  const caps = [...host.querySelectorAll('[data-at]')].map(el => { const [a, b] = el.dataset.at.split(',').map(Number); return { el, a, b }; });
  const bar = host.querySelector('.rail i');
  const progress = () => { const b = host.getBoundingClientRect(), span = b.height - innerHeight; return span > 0 ? Math.max(0, Math.min(1, -b.top / span)) : 0; };
  let lastOn = '';
  function captions(p) {
    let s = ''; for (const c of caps) { const on = p >= c.a && p < c.b; s += on ? 1 : 0; c.el.classList.toggle('on', on); }
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (s !== lastOn) lastOn = s;
  }

  resize(); addEventListener('resize', resize);
  for (let i = 0; i < 900; i++) simulate(1 / 30);          // start with the circuit already running
  if (reduce) {
    const show = () => { resize(); place(0, 1); writeRocks(); renderer.render(scene, camera); };
    captions(0); show(); addEventListener('resize', show);
    return;
  }
  let on = false, last = 0;
  const loop = now => {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    const real = Math.min(0.5, (now - (loop.prev || now)) / 1000); loop.prev = now;
    simulate(dt); const p = progress(); place(pathU(p), real); captions(p); callouts(p); writeRocks(); renderer.render(scene, camera);
    if (on) requestAnimationFrame(loop);
  };
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !on) { on = true; last = loop.prev = performance.now(); requestAnimationFrame(loop); } on = v; }, { rootMargin: '200px' }).observe(host);
}
