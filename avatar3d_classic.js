/* 3D 색소폰 연주자 - three.js, 모든 물체는 코드로 만든 도형(원통·구·캡슐·튜브), 툰 셰이딩 + 외곽선.
   팔은 2관절 역운동학(IK)으로 색소폰을 실제로 잡고, 손가락은 건반을 눌러요. */
import * as THREE from './vendor/three.module.js';

export function createSaxPlayer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov || 26, 1, 0.01, 50);
  const camY = opts.camY !== undefined ? opts.camY : 1.0, camZ = opts.camZ || 4.3, lookY = opts.lookY !== undefined ? opts.lookY : 0.93;
  camera.position.set(0, camY, camZ);
  camera.lookAt(0, lookY, 0);

  /* ---------- 툰 재질: 계단식 명암 ---------- */
  function ramp(steps, lo) {
    const d = new Uint8Array(steps * 4);
    for (let i = 0; i < steps; i++) { const v = Math.round(255 * (lo + (1 - lo) * i / (steps - 1))); d.set([v, v, v, 255], i * 4); }
    const t = new THREE.DataTexture(d, steps, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
  }
  const g3 = ramp(3, 0.32), g4 = ramp(4, 0.28);
  const toon = (color, g) => new THREE.MeshToonMaterial({ color, gradientMap: g || g3 });
  const M = {
    suit: toon(0x1a1d33), pants: toon(0x15172a), shirt: toon(0xf3eee6), skin: toon(0xd8a583, g4), shoe: toon(0x0c0b10),
    shade: toon(0x08070b), tie: toon(0x0b0a10), gold: toon(0xd9a626, g4), key: toon(0xf4de93, g4), pad: toon(0xefe6cc), dark: toon(0x0a090d)
  };
  function outline(mesh, th) {
    const m = new THREE.MeshBasicMaterial({ color: 0x050407, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ' + th.toFixed(4) + ';'); };
    const o = new THREE.Mesh(mesh.geometry, m); mesh.add(o); return o;
  }
  function mk(geo, mat, parent, th) {
    const m = new THREE.Mesh(geo, mat); if (th !== 0) outline(m, th === undefined ? 0.008 : th);
    if (parent) parent.add(m); return m;
  }

  /* ---------- 조명 (무대 느낌) ---------- */
  scene.add(new THREE.HemisphereLight(0x9a88c0, 0x2a1626, 1.15));
  const key = new THREE.DirectionalLight(0xffd7a0, 2.7); key.position.set(2.6, 3.6, 3.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7a96ff, 2.1); rim.position.set(-3, 2.6, -2.4); scene.add(rim);
  const warm = new THREE.DirectionalLight(0xff7a4a, 0.9); warm.position.set(-2, 0.4, 2.2); scene.add(warm);

  /* ---------- 몸 ---------- */
  const rig = new THREE.Group(); scene.add(rig);
  const pelvis = new THREE.Group(); pelvis.position.y = 0.95; rig.add(pelvis);
  mk(new THREE.SphereGeometry(0.16, 22, 16), M.pants, pelvis).scale.set(1.12, 0.78, 0.82);
  const skirt = mk(new THREE.CylinderGeometry(0.165, 0.205, 0.34, 24), M.suit, pelvis); skirt.position.y = 0.06; skirt.scale.z = 0.8;

  function makeLeg(side) {
    const hip = new THREE.Group(); hip.position.set(side * 0.092, -0.05, 0); pelvis.add(hip);
    mk(new THREE.CylinderGeometry(0.078, 0.058, 0.46, 16), M.pants, hip).position.y = -0.23;
    const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
    mk(new THREE.SphereGeometry(0.058, 14, 10), M.pants, knee, 0.006);
    mk(new THREE.CylinderGeometry(0.056, 0.042, 0.38, 16), M.pants, knee).position.y = -0.19;
    const ankle = new THREE.Group(); ankle.position.y = -0.38; knee.add(ankle);
    const foot = mk(new THREE.BoxGeometry(0.098, 0.062, 0.25), M.shoe, ankle, 0.006); foot.position.set(0, -0.031, 0.05);
    const toe = mk(new THREE.SphereGeometry(0.052, 14, 10), M.shoe, ankle, 0.006); toe.position.set(0, -0.034, 0.165); toe.scale.set(0.95, 0.62, 1.1);
    return { hip, knee, ankle };
  }
  const legL = makeLeg(+1), legR = makeLeg(-1);

  const chest = new THREE.Group(); chest.position.y = 0.2; pelvis.add(chest);
  const torso = mk(new THREE.CapsuleGeometry(0.15, 0.3, 6, 18), M.suit, chest); torso.position.y = 0.1; torso.scale.set(1.36, 1, 0.8);
  const collar = mk(new THREE.TorusGeometry(0.075, 0.017, 8, 20), M.suit, chest, 0.004); collar.position.set(0, 0.405, 0.012); collar.rotation.x = Math.PI / 2 - 0.2; collar.scale.set(1.15, 1, 1);
  [[+1], [-1]].forEach(([s]) => { const sp = mk(new THREE.SphereGeometry(0.062, 16, 12), M.suit, chest, 0.006); sp.position.set(s * 0.19, 0.285, 0); sp.scale.set(1, 0.85, 1); });
  const shirt = mk(new THREE.BoxGeometry(0.085, 0.3, 0.012), M.shirt, chest, 0.003); shirt.position.set(0, 0.17, 0.119);
  [+1, -1].forEach((s) => { const lp = mk(new THREE.BoxGeometry(0.05, 0.3, 0.012), M.suit, chest, 0.003); lp.position.set(s * 0.065, 0.16, 0.124); lp.rotation.z = -s * 0.2; });
  const tieC = mk(new THREE.SphereGeometry(0.014, 10, 8), M.tie, chest, 0.003); tieC.position.set(0, 0.325, 0.126);
  [+1, -1].forEach((s) => { const w = mk(new THREE.ConeGeometry(0.022, 0.05, 10), M.tie, chest, 0.003); w.position.set(s * 0.034, 0.325, 0.126); w.rotation.z = s * Math.PI / 2; });

  const neck = new THREE.Group(); neck.position.y = 0.4; chest.add(neck);
  mk(new THREE.CylinderGeometry(0.046, 0.054, 0.12, 14), M.skin, neck, 0.005).position.y = 0.04;
  const head = new THREE.Group(); head.position.y = 0.13; neck.add(head);
  const skull = mk(new THREE.SphereGeometry(0.118, 28, 22), M.skin, head, 0.006); skull.scale.set(0.9, 1.1, 0.98);
  [+1, -1].forEach((s) => {
    const ear = mk(new THREE.SphereGeometry(0.022, 10, 8), M.skin, head, 0.004); ear.position.set(s * 0.097, -0.005, 0); ear.scale.set(0.5, 1, 0.8);
  });
  const lensGs = [], drops = [];
  const glasses = new THREE.Group(); head.add(glasses);     /* 선글라스 전체 (내렸다 올릴 수 있게 한 묶음) */
  let flowK = 0, winkFocus = 0; /* 윙크하는 눈을 화면 가운데로 끌어오는 정도 (0~1) */ /* 커튼이 열리면 땀방울이 주르륵 흐르는 세기 (0~1) */
  const sstep = (a, b, v) => { const t = Math.min(Math.max((v - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  /* ---------- 눈 · 눈꺼풀 · 눈썹 (선글라스를 내리면 보임) ---------- */
  const eyes = [];
  const white = toon(0xfbf7ef), irisM = toon(0x2a1a12), blackM = toon(0x050407), browM = toon(0x241a15);
  [+1, -1].forEach((s) => {
    const ex = s * 0.05, ey = 0.03, ez = 0.097;
    const eg = new THREE.Group(); eg.position.set(ex, ey, ez); eg.rotation.y = s * 0.35; head.add(eg);
    const ball = mk(new THREE.SphereGeometry(0.0145, 18, 14), white, eg, 0.0025); ball.scale.set(1.25, 0.95, 0.6);
    const iris = mk(new THREE.SphereGeometry(0.0076, 14, 10), irisM, eg, 0.0015); iris.position.set(0, 0, 0.0075); iris.scale.set(1, 1, 0.5);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 10, 8), blackM); pup.position.set(0, 0, 0.0092); pup.scale.set(1, 1, 0.4); eg.add(pup);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); sp.position.set(-0.0026, 0.0028, 0.0105); eg.add(sp);
    const lidG = new THREE.Group(); lidG.position.set(0, 0.0138, 0.0012); eg.add(lidG);
    const lid = mk(new THREE.SphereGeometry(0.0165, 18, 12), M.skin, lidG, 0.0022); lid.scale.set(1.32, 0.1, 0.72); lid.position.y = -0.0165 * 0.1;
    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0024, 0.003), blackM); lash.position.set(0, -0.033, 0.0105); lash.visible = false; lidG.add(lash);
    const brow = mk(new THREE.BoxGeometry(0.034, 0.0045, 0.006), browM, head, 0.002); brow.position.set(ex, 0.064, 0.099); brow.rotation.z = -s * 0.12; brow.rotation.y = s * 0.3;
    eyes.push({ s, lid, lash, brow, browY: 0.064, lidG });
  });
  const sparkle = new THREE.Group(); sparkle.position.set(-0.07, 0.078, 0.122); sparkle.scale.setScalar(0.0001); head.add(sparkle);
  (function () {
    const star = new THREE.Shape(); star.moveTo(0, 1); star.quadraticCurveTo(0.1, 0.1, 1, 0); star.quadraticCurveTo(0.1, -0.1, 0, -1); star.quadraticCurveTo(-0.1, -0.1, -1, 0); star.quadraticCurveTo(-0.1, 0.1, 0, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1b8, side: THREE.DoubleSide });
    const big = new THREE.Mesh(new THREE.ShapeGeometry(star), mat); big.scale.setScalar(0.017); sparkle.add(big);
    const small = new THREE.Mesh(new THREE.ShapeGeometry(star), mat); small.scale.setScalar(0.011); small.position.set(0.026, -0.016, 0); sparkle.add(small);
  })();
  /* 항공(에비에이터) 선글라스: 눈물방울 렌즈 + 가는 은색 금속 테 + 쌍 코다리 + 얇은 다리 */
  (function addAviators() {
    const lensMat = new THREE.MeshToonMaterial({ color: 0x0b0b0e, gradientMap: g3, side: THREE.DoubleSide });
    const metal = new THREE.MeshToonMaterial({ color: 0x0b0b0f, gradientMap: g4 });  /* 검정 테 */
    const sheenMat = new THREE.MeshBasicMaterial({ color: 0x4b5060, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const shape = new THREE.Shape();
    shape.moveTo(-0.031, 0.024);
    shape.bezierCurveTo(-0.006, 0.041, 0.036, 0.039, 0.047, 0.012);
    shape.bezierCurveTo(0.055, -0.012, 0.034, -0.04, 0.008, -0.052);
    shape.bezierCurveTo(-0.014, -0.058, -0.034, -0.034, -0.033, -0.004);
    shape.bezierCurveTo(-0.032, 0.008, -0.032, 0.017, -0.031, 0.024);
    const outline = shape.getPoints(48);
    const frameCurve = new THREE.CatmullRomCurve3(outline.map((p) => new THREE.Vector3(p.x, p.y, 0.002)), true);
    const sheenShape = new THREE.Shape(); outline.forEach((p, i) => { const q = [p.x * 0.78 + 0.004, p.y * 0.34 + 0.014]; i ? sheenShape.lineTo(q[0], q[1]) : sheenShape.moveTo(q[0], q[1]); });
    function addDrops(g) { /* 렌즈에 맺힌 물방울: 일부는 천천히 흘러내림 */
      const inside = (x, y) => { let c = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const a = outline[i], b = outline[j]; if (((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x)) c = !c; } return c; };
      const dropMat = new THREE.MeshToonMaterial({ color: 0xb4d0ea, gradientMap: g3, transparent: true, opacity: 0.78 });
      const hl = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let k = 0; k < 22; k++) {
        let x, y, tries = 0; do { x = -0.033 + Math.random() * 0.088; y = -0.056 + Math.random() * 0.098; tries++; } while (!inside(x, y) && tries < 80);
        const r = 0.0012 + Math.random() * Math.random() * 0.0046;
        const d = new THREE.Group(); d.position.set(x, y, 0.0043);
        const body = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), dropMat); body.scale.set(1, 1.18, 0.55); d.add(body);
        const h = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 6, 5), hl); h.position.set(-r * 0.3, r * 0.38, r * 0.4); d.add(h);
        g.add(d); drops.push({ d, vy: k % 4 === 0 ? 0.0035 + Math.random() * 0.006 : 0, inside });
      }
    }
    [+1, -1].forEach((s) => {
      const g = new THREE.Group(); g.position.set(s * 0.05, 0.02, 0.1085); g.rotation.y = s * 0.3; g.rotation.z = -s * 0.07; g.scale.x = s; glasses.add(g);
      g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false }), lensMat));
      const rim = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 64, 0.0028, 6, true), metal); g.add(rim);
      const sheen = new THREE.Mesh(new THREE.ShapeGeometry(sheenShape), sheenMat); sheen.position.z = 0.0042; g.add(sheen);
      /* 다리: 렌즈 바깥 위쪽에서 귀까지 */
      const tp = new THREE.CatmullRomCurve3([new THREE.Vector3(s * (0.05 + 0.044), 0.032, 0.108), new THREE.Vector3(s * 0.1, 0.022, 0.07), new THREE.Vector3(s * 0.108, 0.012, 0.0)]);
      glasses.add(new THREE.Mesh(new THREE.TubeGeometry(tp, 12, 0.0021, 6, false), metal));
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), metal); pad.position.set(s * 0.013, -0.014, 0.108); glasses.add(pad);
      lensGs.push(g); addDrops(g);
    });
    /* 쌍 코다리: 위쪽 가로대 + 아래쪽 코받침 */
    const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.021, 0.043, 0.1155), new THREE.Vector3(0, 0.05, 0.121), new THREE.Vector3(0.021, 0.043, 0.1155)]);
    glasses.add(new THREE.Mesh(new THREE.TubeGeometry(brow, 12, 0.0021, 6, false), metal));
    const nb = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.019, 0.024, 0.118), new THREE.Vector3(0, 0.032, 0.123), new THREE.Vector3(0.019, 0.024, 0.118)]);
    glasses.add(new THREE.Mesh(new THREE.TubeGeometry(nb, 12, 0.0019, 6, false), metal));
  })();
  const nose = mk(new THREE.SphereGeometry(0.014, 10, 8), M.skin, head, 0.003); nose.position.set(0, -0.018, 0.106); nose.scale.set(0.8, 1.1, 1.1);
  const cheeks = [+1, -1].map((s) => { const c = mk(new THREE.SphereGeometry(0.022, 12, 10), M.skin, head, 0.003); c.position.set(s * 0.06, -0.066, 0.07); return c; });

  /* ---------- 색소폰 ---------- */
  const MOUTH_CHEST = new THREE.Vector3(0, 0.468, 0.125);  /* 입 위치 (가슴 기준) */
  const saxPivot = new THREE.Group(); saxPivot.position.copy(MOUTH_CHEST); chest.add(saxPivot);
  const rest = new THREE.Vector3(0, 1.618, 0.125);         /* 곡선을 정의한 기준(세계 좌표) */
  const pts = [[0, 1.618, .125], [-.006, 1.57, .195], [-.02, 1.49, .255], [-.05, 1.34, .285], [-.085, 1.1, .3], [-.115, .86, .31], [-.135, .68, .33], [-.15, .6, .38], [-.16, .615, .45], [-.17, .695, .5]]
    .map((v) => new THREE.Vector3(v[0], v[1], v[2]).sub(rest));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const samp = curve.getSpacedPoints(120);
  function tubeBetween(a, b, ra, rb, mat) {
    const seg = samp.slice(a, b + 1); const c = new THREE.CatmullRomCurve3(seg);
    const g = new THREE.TubeGeometry(c, Math.max(8, (b - a)), 1, 16, false);
    /* 반지름을 서서히 바꾸려고 정점을 다시 계산 */
    const pos = g.attributes.position, n = g.attributes.normal; const rings = Math.max(8, (b - a)) + 1, per = 17;
    for (let i = 0; i < rings; i++) { const r = ra + (rb - ra) * (i / (rings - 1)); const cp = c.getPointAt(i / (rings - 1));
      for (let j = 0; j < per; j++) { const k = i * per + j; pos.setXYZ(k, cp.x + n.getX(k) * r, cp.y + n.getY(k) * r, cp.z + n.getZ(k) * r); } }
    pos.needsUpdate = true; g.computeVertexNormals();
    const m = mk(g, mat, saxPivot, 0.0035); return m;
  }
  tubeBetween(6, 32, 0.0105, 0.0125, M.gold);   /* 목관 */
  tubeBetween(30, 88, 0.0125, 0.030, M.gold);   /* 몸통 (점점 굵어짐) */
  tubeBetween(86, 120, 0.030, 0.034, M.gold);   /* 아래 굽이 */
  const tan0 = curve.getTangentAt(0), mp = mk(new THREE.CylinderGeometry(0.012, 0.0155, 0.085, 14), M.dark, saxPivot, 0.003);
  mp.position.copy(pts[0]).add(tan0.clone().multiplyScalar(0.0)); mp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan0.clone().negate());
  const endP = curve.getPointAt(1), endT = curve.getTangentAt(1);
  const bellPts = [[0.034, 0], [0.038, 0.02], [0.05, 0.05], [0.07, 0.085], [0.093, 0.115], [0.098, 0.124], [0.088, 0.122], [0.066, 0.092], [0.046, 0.056], [0.034, 0.02]].map((p) => new THREE.Vector2(p[0], p[1]));
  const bellMat = M.gold.clone(); bellMat.side = THREE.DoubleSide;
  const bell = mk(new THREE.LatheGeometry(bellPts, 28), bellMat, saxPivot, 0.004);
  bell.position.copy(endP); bell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endT);
  const bellIn = mk(new THREE.CircleGeometry(0.086, 24), M.dark, bell, 0); bellIn.rotation.x = -Math.PI / 2; bellIn.position.y = 0.118;

  /* 건반과 손가락이 누르는 진주패드 */
  const keyMeshes = [], padMeshes = [];
  [0.3, 0.34, 0.38, 0.43, 0.47, 0.52, 0.57, 0.62, 0.66, 0.7, 0.74].forEach((t, i) => {
    const p = curve.getPointAt(t); const k = mk(new THREE.CylinderGeometry(0.0085, 0.0085, 0.007, 12), M.key, saxPivot, 0.002);
    k.rotation.x = Math.PI / 2; k.position.set(p.x, p.y, p.z + 0.0295); keyMeshes.push(k);
    if (i % 2 === 0) { const rod = mk(new THREE.BoxGeometry(0.005, 0.03, 0.004), M.key, saxPivot, 0.0015); rod.position.set(p.x + 0.012, p.y - 0.012, p.z + 0.03); }
  });
  [0.36, 0.41, 0.46, 0.585, 0.635, 0.685].forEach((t) => {
    const p = curve.getPointAt(t); const pad = mk(new THREE.SphereGeometry(0.0095, 12, 10), M.pad, saxPivot, 0.0025);
    pad.position.set(p.x, p.y, p.z + 0.0335); padMeshes.push(pad);
  });
  const hook = mk(new THREE.TorusGeometry(0.012, 0.003, 8, 14), M.dark, saxPivot, 0.0015); hook.position.copy(curve.getPointAt(0.3)).add(new THREE.Vector3(0, 0, 0.0)); hook.rotation.y = Math.PI / 2;
  const strapGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([curve.getPointAt(0.3).clone(), new THREE.Vector3(0.02, 0.07, -0.01).add(new THREE.Vector3(0, 0, 0)), new THREE.Vector3(0.05, 0.095, -0.07), new THREE.Vector3(0, 0.1, -0.13)]), 24, 0.0042, 6, false);
  mk(strapGeo, M.dark, saxPivot, 0);

  /* ---------- 팔 (2관절 IK) + 손 ---------- */
  const L1 = 0.31, L2 = 0.30;
  function limb(r1, r2) { const m = mk(new THREE.CylinderGeometry(r2, r1, 1, 14), M.suit, scene, 0.007); return m; }
  function joint(r, mat) { return mk(new THREE.SphereGeometry(r, 14, 10), mat || M.suit, scene, 0.006); }
  function makeArm(side) {
    const o = { side, up: limb(0.05, 0.043), lo: limb(0.043, 0.034), elbow: joint(0.045), cuff: mk(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 14), M.shirt, scene, 0.004),
      palm: mk(new THREE.SphereGeometry(0.036, 14, 10), M.skin, scene, 0.005), fingers: [] };
    o.palm.scale.set(0.9, 0.7, 1.15);
    for (let i = 0; i < 3; i++) { const f = mk(new THREE.CapsuleGeometry(0.0095, 0.03, 4, 8), M.skin, scene, 0.003); o.fingers.push(f); }
    return o;
  }
  const armL = makeArm(+1), armR = makeArm(-1);
  const UP = new THREE.Vector3(0, 1, 0);
  function place(m, a, b) { const d = b.clone().sub(a), len = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(UP, d.normalize()); }
  function solve(sh, target, pole) {
    const d = target.clone().sub(sh); let dist = Math.min(d.length(), L1 + L2 - 1e-3); const dir = d.normalize();
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
    const pv = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    return { elbow: sh.clone().addScaledVector(dir, a).addScaledVector(pv, h), wrist: sh.clone().addScaledVector(dir, dist) };
  }
  const tmpV = new THREE.Vector3();
  const grip = { L: { t: 0.425, side: +1, keys: [0.36, 0.41, 0.46] }, R: { t: 0.635, side: -1, keys: [0.585, 0.635, 0.685] } };
  const phase = [0.0, 1.7, 3.1, 4.4, 5.9, 2.4], freq = [2.3, 3.1, 1.9, 2.7, 3.4, 2.1];
  function updateArm(arm, g, pad0, time) {
    const sh = chest.localToWorld(new THREE.Vector3(arm.side * 0.19, 0.285, 0));
    const tp = curve.getPointAt(g.t).clone(); tp.x += g.side * 0.043; tp.z += 0.012;
    const target = saxPivot.localToWorld(tp);
    const pole = new THREE.Vector3(arm.side * 0.9, -0.55, -0.55).applyQuaternion(rig.quaternion);
    const s = solve(sh, target, pole);
    place(arm.up, sh, s.elbow); place(arm.lo, s.elbow, s.wrist); arm.elbow.position.copy(s.elbow);
    const fd = s.wrist.clone().sub(s.elbow).normalize();
    arm.cuff.position.copy(s.wrist).addScaledVector(fd, -0.02); arm.cuff.quaternion.setFromUnitVectors(UP, fd);
    arm.palm.position.copy(s.wrist).addScaledVector(fd, 0.03); arm.palm.quaternion.setFromUnitVectors(UP, fd);
    /* 손가락: 진주패드 위에 얹혀 눌렀다 뗐다 */
    arm.fingers.forEach((f, i) => {
      const pad = padMeshes[pad0 + i]; const wp = pad.getWorldPosition(new THREE.Vector3());
      const press = Math.pow(Math.max(0, Math.sin(time * freq[pad0 + i] * 2 + phase[pad0 + i])), 3);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.quaternion);
      f.position.copy(wp).addScaledVector(fwd, 0.014 - press * 0.006);
      f.quaternion.setFromUnitVectors(UP, saxPivot.localToWorld(new THREE.Vector3(0, 1, 0)).sub(saxPivot.localToWorld(new THREE.Vector3(0, 0, 0))).normalize());
      const kp = [2, 3, 4, 7, 8, 9][pad0 + i]; keyMeshes[kp].position.z = curve.getPointAt([0.38, 0.43, 0.47, 0.62, 0.66, 0.7][pad0 + i]).z + 0.0295 - press * 0.0035;
    });
  }

  /* ---------- 바닥 그림자 ---------- */
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d');
  const gr = sx.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  /* ---------- 움직임 ---------- */
  const pointer = { x: 0 };
  let introP = null; /* 인트로 줌인 진행도 (0~1), 사용하지 않으면 null */
  function pose(time) {
    const bp = time * Math.PI * 2 * 2.0;            /* 박자 (초당 2번) */
    const breath = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 0.32);
    const phrase = Math.sin(time * 0.62);
    rig.rotation.y = 0.22 * Math.sin(time * 0.37) - (introP === null ? pointer.x * 0.35 : 0);                       /* 객석 쪽으로 천천히 돌아봄 */
    rig.position.x = 0.04 * Math.sin(time * 0.41);
    pelvis.position.y = 0.95 - 0.014 * (0.5 + 0.5 * Math.sin(bp * 0.5)) - 0.012 * breath;   /* 무릎 살짝 굽힘 */
    pelvis.rotation.z = 0.035 * Math.sin(time * 1.05);
    pelvis.rotation.y = 0.05 * Math.sin(time * 0.8);
    chest.rotation.z = -0.03 * Math.sin(time * 1.05) + 0.015 * phrase;
    chest.rotation.x = 0.07 + 0.035 * phrase + 0.012 * Math.sin(bp * 0.5);
    chest.scale.set(1 + 0.008 * breath, 1 + 0.012 * breath, 1 + 0.008 * breath);
    head.rotation.x = -0.04 + 0.045 * Math.sin(bp * 0.5 + 0.6);
    head.rotation.y = 0.12 * Math.sin(time * 0.52 + 0.8);
    head.rotation.z = 0.05 * Math.sin(time * 1.05 + 0.3);
    saxPivot.rotation.x = -0.05 + 0.05 * phrase;
    saxPivot.rotation.z = 0.05 * Math.sin(time * 0.93 + 1.2);
    saxPivot.rotation.y = 0.03 * Math.sin(time * 0.7);
    const puff = 1 + 0.16 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 0.32 + 2.2));
    cheeks.forEach((c) => c.scale.setScalar(puff));
    const tap = Math.pow(Math.max(0, Math.sin(bp * 0.5)), 2);
    legR.ankle.rotation.x = -0.34 * tap; legR.knee.rotation.x = 0.08 * tap + 0.06; legR.hip.rotation.x = -0.05 * tap - 0.03;
    legL.knee.rotation.x = 0.09; legL.hip.rotation.x = -0.05;
    legL.hip.rotation.z = 0.07; legR.hip.rotation.z = -0.07;
    rig.updateMatrixWorld(true);
    updateArm(armL, grip.L, 0, time);
    updateArm(armR, grip.R, 3, time);
  }

  function resize() {
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 640;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  window.addEventListener('pointermove', (e) => { pointer.x = (e.clientX / window.innerWidth - 0.5) * 2; }, { passive: true });
  /* ---------- 이마에 맺힌 땀방울 (3D) ---------- */
  const sweat = [];
  (function addSweat() {
    const rx = 0.118 * 0.9, ry = 0.118 * 1.1, rz = 0.118 * 0.98;
    const sMat = new THREE.MeshToonMaterial({ color: 0xf6d2b8, gradientMap: g3, transparent: true, opacity: 0.92 });
    const hl = new THREE.MeshBasicMaterial({ color: 0xffffff });
    function place(o) {
      const sa = Math.sin(o.a), ca = Math.cos(o.a), sb = Math.sin(o.b), cb = Math.cos(o.b);
      const n = new THREE.Vector3(sa * cb / (rx * rx), sb / (ry * ry), ca * cb / (rz * rz)).normalize();
      o.g.position.set(rx * sa * cb, ry * sb, rz * ca * cb).addScaledVector(n, 0.0012);
      o.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    }
    for (let k = 0; k < 26; k++) {
      const r = 0.0022 + Math.random() * Math.random() * 0.0062;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), sMat); body.scale.set(1, 1.22, 0.55); g.add(body);
      const h = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 8, 6), hl); h.position.set(-r * 0.3, r * 0.4, r * 0.3); g.add(h);
      head.add(g);
      const o = { g, a: (Math.random() - 0.5) * 1.7, b: 0.62 + Math.random() * 0.62, vy: k % 3 === 0 ? 0.01 + Math.random() * 0.02 : 0, fr: Math.random(), place };
      place(o); sweat.push(o);
    }
  })();

  /* ---------- 땀이 흘러내리며 화면을 닦아 다음 장면을 드러냄 ---------- */
  const MW = 640, MH = 360;
  const maskC = document.createElement('canvas'); maskC.width = MW; maskC.height = MH; const mctx = maskC.getContext('2d');
  const hiC = document.createElement('canvas'); hiC.width = MW; hiC.height = MH; const hctx = hiC.getContext('2d');
  const maskTex = new THREE.CanvasTexture(maskC), hiTex = new THREE.CanvasTexture(hiC);
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), eraseScene = new THREE.Scene(), hiScene = new THREE.Scene(), quadGeo = new THREE.PlaneGeometry(2, 2);
  const eraseMat = new THREE.MeshBasicMaterial({ map: maskTex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  eraseScene.add(new THREE.Mesh(quadGeo, eraseMat));
  hiScene.add(new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial({ map: hiTex, transparent: true, depthTest: false, depthWrite: false })));
  const NDRIP = 12, drips = [];
  for (let i = 0; i < NDRIP; i++) drips.push({ x: (i + 0.5 + (Math.random() - 0.5) * 0.7) / NDRIP * MW, delay: Math.random() * 520, dur: 760 + Math.random() * 640, wob: Math.random() * 6.28 });
  let wipeT = -1;
  function drawWipe(t) {
    mctx.clearRect(0, 0, MW, MH); hctx.clearRect(0, 0, MW, MH);
    const grow = Math.min(Math.max((t - 250) / 1500, 0), 1), fade = 1 - Math.min(Math.max((t - 900) / 900, 0), 1);
    drips.forEach((d) => {
      const k = Math.min(Math.max((t - d.delay) / d.dur, 0), 1); if (k <= 0) return;
      const y = -30 + k * k * (MH + 90), w = 15 + grow * grow * 118;
      mctx.strokeStyle = '#fff'; mctx.fillStyle = '#fff'; mctx.lineCap = 'round'; mctx.lineJoin = 'round'; mctx.lineWidth = w;
      mctx.beginPath(); mctx.moveTo(d.x, -40);
      let xe = d.x; for (let st = 1; st <= 14; st++) { const yy = -40 + (y + 40) * st / 14; xe = d.x + Math.sin(d.wob + yy * 0.035) * 3.5; mctx.lineTo(xe, yy); }
      mctx.stroke();
      mctx.beginPath(); mctx.ellipse(xe, y, w * 0.62, w * 0.86, 0, 0, 6.283); mctx.fill();
      if (fade > 0.02) { /* 물줄기의 반짝이는 가장자리와 방울 머리 */
        hctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * fade).toFixed(2) + ')'; hctx.lineWidth = 2; hctx.beginPath(); hctx.moveTo(d.x - w * 0.42, -40);
        for (let st = 1; st <= 14; st++) { const yy = -40 + (y + 40) * st / 14; hctx.lineTo(d.x + Math.sin(d.wob + yy * 0.035) * 3.5 - w * 0.42, yy); } hctx.stroke();
        hctx.fillStyle = 'rgba(255,255,255,' + (0.95 * fade).toFixed(2) + ')'; hctx.beginPath(); hctx.ellipse(xe - w * 0.2, y + w * 0.05, w * 0.13, w * 0.24, -0.5, 0, 6.283); hctx.fill();
      }
    });
    /* 커튼이 가운데서 살짝 열려 선글라스가 보이는 틈 (윙크가 끝나면 닫힘) */
    const o = sstep(1800, 2250, t) * (1 - sstep(3450, 3900, t));
    if (o > 0.001) {
      const half = o * 0.3 * MW, edge = (y, sg) => MW / 2 + sg * (half * (0.7 + 0.3 * y / MH) + Math.sin(y * 0.045 + t * 0.003) * 4 * o);
      mctx.globalCompositeOperation = 'destination-out'; mctx.fillStyle = '#000'; mctx.beginPath(); mctx.moveTo(edge(-10, -1), -10);
      for (let y = 0; y <= MH + 10; y += 12) mctx.lineTo(edge(y, -1), y);
      for (let y = MH + 10; y >= -10; y -= 12) mctx.lineTo(edge(y, 1), y);
      mctx.closePath(); mctx.fill(); mctx.globalCompositeOperation = 'source-over';
      hctx.strokeStyle = 'rgba(255,255,255,' + (0.42 * o).toFixed(2) + ')'; hctx.lineWidth = 2.5;
      [-1, 1].forEach((sg) => { hctx.beginPath(); for (let y = -10; y <= MH + 10; y += 12) { const x = edge(y, sg) + sg * 3; y === -10 ? hctx.moveTo(x, y) : hctx.lineTo(x, y); } hctx.stroke(); });
    }
    maskTex.needsUpdate = true; hiTex.needsUpdate = true;
  }
  const V3 = THREE.Vector3;
  function introCamera(p) { /* 전신 -> 상반신 -> 얼굴 -> 대머리 이마와 선글라스 윗부분 */
    const H = new V3(); head.getWorldPosition(H);
    const hq = head.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new V3(0, 0, 1).applyQuaternion(hq), up = new V3(0, 1, 0).applyQuaternion(hq);
    const tgt = H.clone().addScaledVector(up, 0.012).addScaledVector(fwd, 0.095);
    const P = [new V3(0, 1.08, 4.8), new V3(0, 1.48, 2.6), new V3(0, 1.66, 1.2), tgt.clone().addScaledVector(fwd, 0.72), tgt.clone().addScaledVector(fwd, 0.46)];
    const L = [new V3(0, 0.95, 0), new V3(0, 1.44, 0), new V3(0, 1.66, 0), tgt.clone(), tgt.clone()];
    const u = p * p * (3 - 2 * p);
    const pos = new THREE.CatmullRomCurve3(P, false, 'centripetal').getPoint(u), look = new THREE.CatmullRomCurve3(L, false, 'centripetal').getPoint(u);
    if (winkFocus > 0.0005) { /* 윙크하는 쪽 눈(화면 왼쪽)이 화면 정중앙에 오도록 카메라를 옆으로 옮기고 조금 다가감 */
      const eyeW = head.localToWorld(new V3(-0.05, 0.03, 0.097)), sh = eyeW.sub(tgt).multiplyScalar(winkFocus);
      pos.add(sh).addScaledVector(fwd, -0.07 * winkFocus); look.add(sh);
    }
    camera.position.copy(pos); camera.lookAt(look);
  }
  function applyWink(t) { /* t: 닦임이 시작된 뒤 지난 시간(ms) */
    flowK = sstep(1850, 2300, t) * (1 - sstep(3500, 3800, t));
    winkFocus = sstep(2000, 2650, t) * (1 - sstep(3450, 3900, t));   /* 윙크 직전에 눈이 가운데로 와서, 윙크가 끝나면 원래대로 */
    const d = sstep(2000, 2450, t);                                  /* 선글라스를 코끝으로 슬쩍 내림 */
    glasses.position.set(0, -0.046 * d, 0.008 * d); glasses.rotation.x = 0.2 * d;
    const wink = sstep(2650, 2780, t) * (1 - sstep(3050, 3200, t));   /* 한쪽 눈 윙크 */
    eyes.forEach((e) => {
      const k = 0.1 + (e.s < 0 ? 0.95 * wink : 0);
      e.lid.scale.y = k; e.lid.position.y = -0.0165 * k; e.lash.visible = k > 0.55; e.lash.position.y = -0.0165 * 2 * k;
      e.brow.position.y = e.browY + (e.s < 0 ? -0.006 * wink : 0.0065 * d) + 0.003 * d;
    });
    const sp = sstep(2700, 2950, t) * (1 - sstep(3150, 3400, t));
    sparkle.scale.setScalar(Math.max(0.0001, sp * (1 + 0.18 * Math.sin(t * 0.03)))); sparkle.rotation.z = t * 0.0035;
  }
  let raf = 0, t0 = performance.now(), forced = null, lastNow = 0;
  function frame(now) {
    const time = forced !== null ? forced : (now - t0) / 1000;
    const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0.016; lastNow = now;
    pose(time);
    drops.forEach((o) => { const v = o.vy + flowK * 0.014 * (0.4 + (o.d.id % 7) / 7); if (v > 0) { o.d.position.y -= v * dt; if (o.d.position.y < -0.058) { o.d.position.y = 0.04; do { o.d.position.x = -0.033 + Math.random() * 0.088; } while (!o.inside(o.d.position.x, 0.03)); } } });
    sweat.forEach((o) => { const v = o.vy + flowK * (0.05 + o.fr * 0.16); if (v > 0) { o.b -= v * dt; if (o.b < 0.5) { o.b = flowK > 0.05 ? 1.22 : 1.2; o.a = (Math.random() - 0.5) * 1.7; } o.place(o); } });
    if (wipeT >= 0) applyWink(wipeT);
    if (introP !== null) { rig.updateMatrixWorld(true); introCamera(introP); }
    renderer.render(scene, camera);
    if (wipeT >= 0) { drawWipe(wipeT); renderer.autoClear = false; renderer.render(eraseScene, orthoCam); renderer.render(hiScene, orthoCam); renderer.autoClear = true; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { renderer, scene, camera, rig, setIntro: (p) => { if (introP === null) renderer.setClearColor(0x000000, 1); introP = p; }, setWipe: (t) => { wipeT = t; }, setTime: (v) => { forced = v; }, dispose: () => { cancelAnimationFrame(raf); renderer.dispose(); } };
}
