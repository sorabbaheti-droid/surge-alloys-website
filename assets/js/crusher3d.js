// A cone crusher in 3D, cut away to show the chamber. The head gyrates on its eccentric; rock falls between the
// mantle and the concave, is squeezed and broken smaller, and drops out of the bottom. Warm work light, real PBR steel.
// Runs only while on screen; one still frame under reduced motion.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const host = document.querySelector('[data-crusher3d]');
if (host) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = host.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  // ---- light: a warm work light from above, amber bounce from below, cool rim
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x2a1a10, 0.6));
  const key = new THREE.DirectionalLight(0xffc27a, 3.2); key.position.set(-4, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4 }); scene.add(key);
  const glow = new THREE.PointLight(0xff8a2a, 14, 7, 2); glow.position.set(0.6, 0.4, 1.8); scene.add(glow);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.9); rim.position.set(5, 3, -6); scene.add(rim);

  // ---- materials
  const paint = new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 0.35, roughness: 0.55 });          // cast frame, painted
  const paintOr = new THREE.MeshStandardMaterial({ color: 0xb4561c, metalness: 0.3, roughness: 0.6 });          // Surge orange accents
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9c0b4, metalness: 0.95, roughness: 0.3, emissive: 0x2a1204, emissiveIntensity: 0.6 });          // manganese liners
  const dark = new THREE.MeshStandardMaterial({ color: 0x24211e, metalness: 0.6, roughness: 0.6 });
  const cut = new THREE.MeshStandardMaterial({ color: 0x8c8379, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide }); // machined section faces
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8e80, metalness: 0.05, roughness: 0.92, flatShading: true });

  // ---- a revolved part, cut away by a quarter, with section faces on the cut
  const PHI0 = Math.PI * 0.5, PHIL = Math.PI * 1.5;
  function revolve(profile, mat, seg = 96) {
    const g = new THREE.Group();
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(pts, seg, PHI0, PHIL), mat);
    lathe.material = mat.clone(); lathe.material.side = THREE.DoubleSide;
    lathe.castShadow = lathe.receiveShadow = true; g.add(lathe);
    const shape = new THREE.Shape(pts);
    for (const a of [PHI0, PHI0 + PHIL]) {
      const cap = new THREE.Mesh(new THREE.ShapeGeometry(shape), cut);
      cap.rotation.y = a - Math.PI / 2; cap.receiveShadow = true; g.add(cap);
    }
    return g;
  }
  // profiles as [radius, height] loops (metres, roughly a mid-size cone crusher)
  const concaveIn = y => 0.62 + (1.62 - y) * 0.42;     // concave inner surface: narrows to the top
  const mantleOut = y => 0.12 + (1.62 - y) * 0.78;     // mantle surface: flares faster, closing the gap at the bottom
  const prof = (f, y0, y1, t, n = 14) => { const a = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; a.push([f(y), y]); } for (let i = n; i >= 0; i--) { const y = y0 + (y1 - y0) * i / n; a.push([f(y) + t, y]); } return a; };

  const machine = new THREE.Group(); scene.add(machine);
  // main frame (bottom shell) with its flange
  machine.add(revolve([[0.32, -1.15], [1.55, -1.15], [1.6, -1.0], [1.6, 0.18], [1.82, 0.18], [1.82, 0.32], [1.36, 0.32], [1.36, -0.95], [0.32, -0.95]], paint));
  // adjustment ring and bowl (top shell)
  machine.add(revolve([[1.36, 0.32], [1.9, 0.32], [1.9, 0.62], [1.36, 0.62]], paintOr));
  machine.add(revolve([[1.36, 0.62], [1.62, 0.62], [1.34, 1.62], [1.08, 1.74], [1.02, 1.62], [concaveIn(1.6) + 0.14, 1.6], [concaveIn(0.62) + 0.14, 0.62]], paint));
  // concave: the manganese liner in the bowl
  machine.add(revolve(prof(concaveIn, 0.36, 1.6, 0.14), steel));
  // hopper on top
  machine.add(revolve([[1.02, 1.74], [1.55, 2.45], [1.6, 2.45], [1.07, 1.74]], paint, 72));

  // head assembly: mantle on the head, main shaft, feed plate. It gyrates about a pivot low in the frame.
  const head = new THREE.Group(); head.position.y = -0.9; machine.add(head);
  const onHead = o => { o.position.y += 0.9; head.add(o); return o; };
  onHead(revolve([[0.001, 0.3], ...Array.from({ length: 15 }, (_, i) => { const y = 0.3 + 1.28 * i / 14; return [Math.max(0.001, mantleOut(y) - 0.12), y]; }), [0.001, 1.58]], paint));
  onHead(revolve(prof(mantleOut, 0.3, 1.58, -0.12).map(([r, y]) => [Math.max(0.001, r), y]), steel));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 2.9, 32), dark); shaft.position.y = 0.2; shaft.castShadow = true; onHead(shaft);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 40), steel); plate.position.y = 1.66; onHead(plate);
  // countershaft housing and drive pulley on the side
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.3, 32), paint); cs.rotation.z = Math.PI / 2; cs.position.set(-2.1, -0.7, 0); machine.add(cs);
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 48), dark); pulley.rotation.z = Math.PI / 2; pulley.position.set(-2.82, -0.7, 0); machine.add(pulley);
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.12), paintOr); spoke.position.copy(pulley.position); spoke.position.x -= 0.1; machine.add(spoke);
  // floor
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.16; floor.receiveShadow = true; scene.add(floor);

  // ---- rock: one jagged stone, instanced
  const stone = new THREE.IcosahedronGeometry(1, 0);
  { const p = stone.attributes.position, h = (x, y, z) => { const v = Math.sin(x * 12.99 + y * 78.23 + z * 37.71) * 43758.5; return v - Math.floor(v); };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + 0.32 * h(+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)); p.setXYZ(i, x * k, y * k * 0.82, z * k); } stone.computeVertexNormals(); }
  const N = 220, rocks = new THREE.InstancedMesh(stone, rockMat, N); rocks.castShadow = true; machine.add(rocks);
  const tint = new THREE.Color(); for (let i = 0; i < N; i++) rocks.setColorAt(i, tint.setHSL(0.08 + Math.random() * 0.03, 0.12 + Math.random() * 0.1, 0.42 + Math.random() * 0.2));
  const R = Array.from({ length: N }, () => ({ live: false }));
  const dustN = 300, dustGeo = new THREE.BufferGeometry(), dustPos = new Float32Array(dustN * 3), dustV = new Float32Array(dustN * 3), dustL = new Float32Array(dustN);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffb070, size: 0.025, transparent: true, opacity: 0.8, depthWrite: false })); machine.add(dust);
  let di = 0;
  const puff = (x, y, z) => { for (let k = 0; k < 6; k++) { const j = di++ % dustN; dustPos.set([x, y, z], j * 3); dustV.set([(Math.random() - .5) * .8, Math.random() * .4, (Math.random() - .5) * .8], j * 3); dustL[j] = .7; } };

  // gyration: the head tilts by TILT and the tilt direction turns round the axis
  const TILT = 0.022, OMEGA = 2 * Math.PI * 1.2; let t = 0, psi = 0;
  const gapAt = (y, phi) => concaveIn(y) - mantleOut(y) - Math.sin(TILT) * (y + 0.9) * Math.cos(phi - psi);
  const spawn = r => { Object.assign(r, { live: true, phi: Math.random() * Math.PI * 2, y: 2.6 + Math.random() * .6, s: 0.07 + Math.random() * 0.06, vy: 0, rx: Math.random() * 6, ry: Math.random() * 6, spin: (Math.random() - .5) * 3 }); };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();

  function simulate(dt) {
    t += dt; psi = OMEGA * t;
    head.rotation.set(TILT * Math.sin(psi), 0, -TILT * Math.cos(psi));
    head.rotateY(dt * 0.15);                              // the head creeps round slowly, as on a real machine
    let spawned = 0;
    for (let i = 0; i < N; i++) {
      const r = R[i];
      if (!r.live) { if (spawned < 2 && Math.random() < dt * 9) { spawn(r); spawned++; } else { m4.makeScale(0, 0, 0); rocks.setMatrixAt(i, m4); continue; } }
      const inChamber = r.y < 1.6 && r.y > 0.36;
      if (inChamber) {
        const g = gapAt(r.y, r.phi);
        if (2 * r.s > g) {                                // caught between mantle and concave
          r.vy = 0;
          if (g < 2 * r.s * 0.9) { r.s *= 0.62; puff(Math.cos(r.phi) * concaveIn(r.y), r.y, Math.sin(r.phi) * concaveIn(r.y)); }
        } else { r.vy = Math.min(r.vy + 6 * dt, 1.6); r.y -= r.vy * dt; }
        r.rad = (concaveIn(r.y) + mantleOut(r.y)) / 2;
      } else {
        r.vy = Math.min(r.vy + 9.8 * dt, 4); r.y -= r.vy * dt;
        r.rad = r.y >= 1.6 ? Math.min(0.9, concaveIn(1.6) * 0.8) : concaveIn(0.36) - 0.15;
      }
      if (r.y < -1.05 || r.s < 0.012) { r.live = false; continue; }
      r.rx += r.spin * dt; r.ry += r.spin * dt * .7;
      v3.set(Math.cos(r.phi) * r.rad, r.y, Math.sin(r.phi) * r.rad);
      q.setFromEuler(e3.set(r.rx, r.ry, 0)); sc.setScalar(r.s);
      rocks.setMatrixAt(i, m4.compose(v3, q, sc));
    }
    rocks.instanceMatrix.needsUpdate = true;
    for (let j = 0; j < dustN; j++) { if (dustL[j] <= 0) { dustPos[j * 3 + 1] = -99; continue; } dustL[j] -= dt; dustV[j * 3 + 1] -= 1.5 * dt; for (let k = 0; k < 3; k++) dustPos[j * 3 + k] += dustV[j * 3 + k] * dt; }
    dustGeo.attributes.position.needsUpdate = true;
    pulley.rotation.x += dt * 9; spoke.rotation.x = pulley.rotation.x;
    glow.intensity = 12 + Math.sin(t * 3.1) * 1.5 + Math.sin(t * 7.3) * .8;   // the amber light breathes a little
  }

  // ---- camera: a slow orbit; scrolling past the section brings it closer to the chamber
  function place(p) {
    const ang = 0.72 + 0.22 * Math.sin(t * 0.12), dist = 12.5 - 2.4 * p, h = 3.2 - 0.9 * p;
    camera.position.set(Math.sin(ang) * dist, h, Math.cos(ang) * dist);
    camera.lookAt(0, 0.6, 0);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const progress = () => { const b = host.getBoundingClientRect(); return Math.max(0, Math.min(1, (innerHeight - b.top) / (innerHeight + b.height))); };

  resize(); addEventListener('resize', resize);
  for (let i = 0; i < 360; i++) simulate(1 / 60);         // start with rock already in the machine
  if (reduce) { place(.5); renderer.render(scene, camera); addEventListener('resize', () => { resize(); renderer.render(scene, camera); }); }
  else {
    let on = false, last = 0;
    const loop = now => { const dt = Math.min(.033, (now - last) / 1000 || .016); last = now; simulate(dt); place(progress()); renderer.render(scene, camera); if (on) requestAnimationFrame(loop); };
    new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !on) { on = true; last = performance.now(); requestAnimationFrame(loop); } on = v; }, { rootMargin: '120px' }).observe(host);
  }
}
