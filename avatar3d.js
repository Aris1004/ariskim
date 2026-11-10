/* 3D 색소폰 연주자 - three.js, 모든 물체는 코드로 만든 도형(원통·구·캡슐·튜브), 툰 셰이딩 + 외곽선.
   팔은 2관절 역운동학(IK)으로 색소폰을 실제로 잡고, 손가락은 건반을 눌러요. */
import * as THREE from './vendor/three.module.js';

export function createSaxPlayer(canvas, opts = {}) {
  const guide = !!opts.guide, idle = !!opts.idle; let guideP = 0, pointK = 0, pointT = 0, pointDir = 1, pointMode = 'side', waveReq = 0, waveStart = -99, strikeStart = -99, strikeReq = 0, strikeDone = true, strikeCb = null, glassS = 0, gStart = -99, gDir = 0, gReq = 0;   /* glassS: 0 = 선글라스가 이마 위, 1 = 눈 위 */   /* idle: 따라다니는 안내용. 평소엔 편하게 서 있고, 필요할 때만 setPoint 로 가리킨다 */   /* guide: 색소폰을 내려놓고 손가락으로 아래를 가리키는 안내 자세 */
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
    suit: toon(0x1a1d33), satin: new THREE.MeshPhongMaterial({ color: 0x040406, specular: 0x14141c, shininess: 30 }), pants: toon(0x15172a), shirt: toon(0xf3eee6), skin: toon(0xd09b74, g4), shoe: new THREE.MeshPhongMaterial({ color: 0x0b0a0f, specular: 0xb0b0d0, shininess: 130 }),
    shade: toon(0x08070b), tie: new THREE.MeshPhongMaterial({ color: 0x0a0912, specular: 0xb8b8e0, shininess: 140 }), btn: new THREE.MeshPhongMaterial({ color: 0x2a2530, specular: 0xffe6a8, shininess: 160 }), gold: toon(0xd9a626, g4), key: toon(0xf4de93, g4), pad: toon(0xefe6cc), dark: toon(0x0a090d)
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
  const skirt = mk(new THREE.LatheGeometry([[0.001, -0.125], [0.14, -0.125], [0.156, -0.095], [0.161, -0.04], [0.157, 0.04], [0.142, 0.15], [0.124, 0.23], [0.001, 0.23]].map((p) => new THREE.Vector2(p[0], p[1])), 40), M.suit, pelvis); skirt.scale.z = 0.8;   /* 재킷 아랫단: 둥글게 떨어지는 곡선 */

  function makeLeg(side) {
    const hip = new THREE.Group(); hip.position.set(side * 0.1, -0.05, 0); pelvis.add(hip);
    mk(new THREE.CylinderGeometry(0.094, 0.07, 0.46, 18), M.pants, hip).position.y = -0.23;
    { const st = mk(new THREE.BoxGeometry(0.006, 0.45, 0.02), M.satin, hip, 0.001); st.position.set(side * 0.0845, -0.23, 0); }   /* 바지 옆 새틴 줄 */
    const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
    mk(new THREE.SphereGeometry(0.07, 14, 10), M.pants, knee, 0.006);
    mk(new THREE.CylinderGeometry(0.066, 0.05, 0.38, 18), M.pants, knee).position.y = -0.19;
    { const st = mk(new THREE.BoxGeometry(0.006, 0.37, 0.018), M.satin, knee, 0.001); st.position.set(side * 0.0595, -0.19, 0); }
    const ankle = new THREE.Group(); ankle.position.y = -0.38; knee.add(ankle);
    const foot = mk(new THREE.BoxGeometry(0.098, 0.062, 0.25), M.shoe, ankle, 0.006); foot.position.set(0, -0.031, 0.05);
    const toe = mk(new THREE.SphereGeometry(0.052, 14, 10), M.shoe, ankle, 0.006); toe.position.set(0, -0.034, 0.165); toe.scale.set(0.95, 0.62, 1.1);
    return { hip, knee, ankle };
  }
  const legL = makeLeg(+1), legR = makeLeg(-1);

  const chest = new THREE.Group(); chest.position.y = 0.2; pelvis.add(chest);
  const waistPts = [[0.001, -0.2], [0.14, -0.19], [0.146, -0.1], [0.104, -0.02], [0.082, 0.04], [0.108, 0.1], [0.147, 0.19], [0.16, 0.28], [0.138, 0.363], [0.09, 0.405], [0.001, 0.42]].map((p) => new THREE.Vector2(p[0], p[1]));
  const torso = mk(new THREE.LatheGeometry(waistPts, 32), M.suit, chest); torso.scale.set(1.36, 1, 0.8);
  [+1, -1].forEach((s) => { const c = mk(new THREE.BoxGeometry(0.05, 0.034, 0.012), M.shirt, chest, 0.003); c.position.set(s * 0.036, 0.382, 0.082); c.rotation.set(-0.35, 0, -s * 0.5); });
  [[+1], [-1]].forEach(([s]) => { const sp = mk(new THREE.SphereGeometry(0.066, 16, 12), M.suit, chest, 0.006); sp.position.set(s * 0.215, 0.285, 0); sp.scale.set(1, 0.85, 1); });
  const shirt = mk(new THREE.BoxGeometry(0.085, 0.24, 0.012), M.shirt, chest, 0.003); shirt.position.set(0, 0.2, 0.132);
  { /* 왼쪽 가슴(화면 오른쪽) 주머니: 입구 + 손수건이 세 봉우리로 접혀 나옴 */
    const welt = mk(new THREE.BoxGeometry(0.064, 0.007, 0.012), M.satin, chest, 0.0015); welt.position.set(0.148, 0.222, 0.087); welt.rotation.y = 0.62; welt.rotation.z = 0.04;
    const hk = new THREE.Shape(); hk.moveTo(-0.028, 0); hk.lineTo(-0.024, 0.026); hk.lineTo(-0.012, 0.014); hk.lineTo(0, 0.034); hk.lineTo(0.012, 0.014); hk.lineTo(0.024, 0.026); hk.lineTo(0.028, 0); hk.closePath();
    const pc = mk(new THREE.ExtrudeGeometry(hk, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 }), M.shirt, chest, 0.002); pc.position.set(0.148, 0.224, 0.086); pc.rotation.y = 0.62; pc.rotation.z = 0.04;
    [0.13, 0.19, 0.25].forEach((y) => { const stud = mk(new THREE.SphereGeometry(0.0085, 12, 10), M.gold, chest, 0.0015); stud.position.set(0, y, 0.142); });   /* 셔츠 금 스터드 */
  }
  [+1, -1].forEach((s) => { /* 피크 라펠: 안쪽 선에서 바깥으로 뾰족하게 솟은 번쩍이는 새틴 옷깃 */
    const sh = new THREE.Shape(); [[0.044, 0.065], [0.044, 0.36], [0.056, 0.388], [0.15, 0.345], [0.112, 0.292], [0.126, 0.18], [0.108, 0.058]].forEach((p, i) => { i ? sh.lineTo(s * p[0], p[1]) : sh.moveTo(s * p[0], p[1]); }); sh.closePath();
    const lp = mk(new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 1 }), M.satin, chest, 0.003); lp.position.z = 0.128;
  });
  /* 더블 재킷: 4버튼(2열 x 2단) */
  [+1, -1].forEach((s) => [0.22, 0.1].forEach((y) => { const b = mk(new THREE.SphereGeometry(0.0145, 14, 10), M.btn, chest, 0.0025); b.position.set(s * 0.082, y, 0.145); b.scale.set(1, 1, 0.55); }));
  const tieC = mk(new THREE.SphereGeometry(0.024, 16, 12), M.tie, chest, 0.003); tieC.position.set(0, 0.338, 0.132); tieC.scale.set(1, 1.1, 0.8);
  [+1, -1].forEach((s) => { const w = mk(new THREE.ConeGeometry(0.047, 0.092, 18), M.tie, chest, 0.003); w.position.set(s * 0.054, 0.338, 0.132); w.rotation.z = s * Math.PI / 2; w.scale.set(1, 1, 0.55); });

  const neck = new THREE.Group(); neck.position.y = 0.4; chest.add(neck);
  mk(new THREE.CylinderGeometry(0.037, 0.05, 0.17, 22), M.skin, neck, 0).position.y = 0.06;   /* 목: 턱 아래에서 옷깃까지 이어지는 진짜 목 */
  [+1, -1].forEach((s) => { /* 목 옆 근육(흉쇄유돌근): 귀 뒤에서 쇄골 가운데로 비스듬히 */
    const m = mk(new THREE.CapsuleGeometry(0.0105, 0.07, 4, 10), M.skin, neck, 0); m.position.set(s * 0.021, 0.06, 0.024); m.rotation.z = -s * 0.2; m.rotation.x = -0.22;
  });
  const adam = mk(new THREE.SphereGeometry(0.011, 10, 8), M.skin, neck, 0.002); adam.position.set(0, 0.04, 0.037); adam.scale.set(0.9, 1.2, 0.8);   /* 목울대 */
  [+1, -1].forEach((s) => { /* 승모근: 목 아래에서 어깨로 비스듬히 흘러내리는 선 (재킷 속) */
    const a = new THREE.Vector3(s * 0.052, 0.405, -0.01), b = new THREE.Vector3(s * 0.172, 0.335, 0), d = b.clone().sub(a), t = mk(new THREE.CapsuleGeometry(0.036, Math.max(d.length() - 0.072, 0.01), 4, 10), M.suit, chest, 0.005);
    t.position.copy(a).addScaledVector(d, 0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  });
  const head = new THREE.Group(); head.position.y = 0.18; head.scale.setScalar(0.9); neck.add(head);
  /* ---------- 얼굴: Blender 에서 사진 좌표로 조각한 실제 3D 메쉬(models/head.json) + 사진 속 얼굴 피부·이목구비를 정면에서 투영 ---------- */
  const headGeo = (function () {   /* 메쉬를 불러오기 전 임시 모양 */
    const g = new THREE.SphereGeometry(1, 48, 36), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 0.097, p.getY(i) * 0.15, p.getZ(i) * 0.115);
    g.computeVertexNormals(); return g;
  })();
  fetch('models/head.json').then((r) => r.json()).then((d) => {
    headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.p), 3));
    headGeo.setIndex(d.i); headGeo.computeVertexNormals(); headGeo.computeBoundingSphere();
  }).catch(() => {});
  const skullMat = M.skin.clone(); skullMat.emissive = new THREE.Color(0x6e4630);   /* 옆면이 어두워 배경에 묻히지 않게 살색을 스스로 밝힌다 */
  const skull = mk(headGeo, skullMat, head, 0);
  const faceTexInit = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);  faceTexInit.needsUpdate = true;
  const faceMap = { value: faceTexInit };
  const blinkU = { a: { value: 0 }, b: { value: 0 } };   /* 0 = 뜬 눈, 1 = 감은 눈 (a = 화면 왼쪽 눈, b = 오른쪽 눈) */
  /* 사진 투영 재질: 정면에서 본 사진을 머리 좌표(x,y)로 입힌다. toHead = 이 메쉬 -> 머리 좌표 변환, fade = 옆·뒤로 갈수록 투명 */
  function makeFaceMat(toHead, fade) {
    return new THREE.ShaderMaterial({
      transparent: fade, depthWrite: !fade, polygonOffset: fade, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      uniforms: { map: faceMap, toHead: { value: toHead }, fade: { value: fade ? 1 : 0 }, blinkA: blinkU.a, blinkB: blinkU.b },
      vertexShader: 'uniform mat4 toHead; uniform float fade; varying vec2 vUv; varying float vNz; void main(){ float S=0.001338; vec4 hp=toHead*vec4(position,1.0); float px=475.0+hp.x/S; float yy=hp.y>0.02 ? 0.02+(hp.y-0.02)/0.76 : hp.y; float py=188.0-yy/S; vUv=vec2((px-360.0)/220.0, 1.0-(py-60.0)/260.0); vNz = fade>0.5 ? normalize((toHead*vec4(normal,0.0)).xyz).z : 1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform sampler2D map; uniform float blinkA; uniform float blinkB; varying vec2 vUv; varying float vNz;',
        'vec3 eyeBlink(vec2 uv, vec3 orig, float b, vec2 c, float hw){',
        '  if (b < 0.004) return orig;',
        '  vec2 pix = vec2(uv.x * 880.0, (1.0 - uv.y) * 1040.0);',
        '  vec2 d = (pix - c) / vec2(hw, 38.0);',
        '  float m = (1.0 - smoothstep(0.72, 1.0, length(d))) * smoothstep(c.y - 25.0, c.y - 17.0, pix.y); if (m <= 0.0) return orig;',
        '  float yT = c.y - 19.0, yB = c.y + 17.0;',
        '  float yL = mix(yT, yB - 4.0, b) + b * 5.0 * (1.0 - clamp(d.x * d.x, 0.0, 1.0));',
        '  vec3 col;',
        '  if (pix.y < yL) { vec3 ch = texture2D(map, vec2(uv.x, 1.0 - (yB + 34.0) / 1040.0)).rgb, cr = texture2D(map, vec2(uv.x, 1.0 - (yT - 6.0) / 1040.0)).rgb; col = mix(ch, cr, 0.3 + 0.4 * smoothstep(yT, yL, pix.y) * 0.0) * (1.0 - 0.06 * smoothstep(yT, yL, pix.y)); }',
        '  else { float yy = yT + (pix.y - yL) / max(yB - yL, 1.0) * (yB - yT); col = texture2D(map, vec2(uv.x, 1.0 - yy / 1040.0)).rgb; }',
        '  float ln = 1.0 - smoothstep(0.0, 3.2, abs(pix.y - yL)); col = mix(col, vec3(0.07, 0.045, 0.04), ln * smoothstep(0.15, 0.6, b) * 0.9);',
        '  return mix(orig, col, m * smoothstep(0.0, 0.1, b));',
        '}',
        'void main(){ vec4 c = texture2D(map, vUv); vec3 rgb = c.rgb;',
        '  rgb = eyeBlink(vUv, rgb, blinkA, vec2(330.0, 532.0), 78.0);',
        '  rgb = eyeBlink(vUv, rgb, blinkB, vec2(580.0, 530.0), 72.0);',
        '  gl_FragColor = vec4(rgb, smoothstep(-0.2, 0.12, vNz));',
        '#include <colorspace_fragment>',
        '}'].join('\n')
    });
  }
  new THREE.TextureLoader().load('images/char_face.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; faceMap.value = t; });
  const faceOv = new THREE.Mesh(headGeo, makeFaceMat(new THREE.Matrix4(), true)); faceOv.scale.setScalar(1.004); faceOv.renderOrder = 2; head.add(faceOv);
  /* SMP 두피문신: 머리카락은 없지만 헤어라인 안쪽을 짧은 머리털 그림자(점)로 촘촘히 채움 */
  (function addSMP() {
    const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const sm = (a, b, v) => { const t = Math.min(Math.max((v - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
    const limit = (phi) => { /* 머리카락(민머리 질감) 경계: 앞은 이마 위, 옆·뒤로 갈수록 귀 밑 목덜미 위까지 내려옴 */
      let d = Math.abs(phi - Math.PI / 2); if (d > Math.PI) d = 2 * Math.PI - d;
      return 1.08 + (2.12 - 1.08) * sm(0.3, 1.7, d) + 0.07 * Math.exp(-Math.pow((d - 0.72) / 0.22, 2)); };
    for (let x = 0; x < W; x += 2) { /* 경계선 없이 서서히 사라지는 그라데이션 */
      const yl = limit(((x + 1) / W) * Math.PI * 2) / Math.PI * H, g = cx.createLinearGradient(0, 0, 0, yl);
      g.addColorStop(0, 'rgba(122,112,116,0.62)'); g.addColorStop(0.7, 'rgba(122,112,116,0.5)'); g.addColorStop(1, 'rgba(122,112,116,0)');
      cx.fillStyle = g; cx.fillRect(x, 0, 2, yl);
    }
    const dot = (th, phi, a, r) => { const sx = (phi / (Math.PI * 2)) * W, sy = th / Math.PI * H, k = 1 / Math.max(Math.sin(th), 0.22);
      cx.fillStyle = 'rgba(26,18,17,' + a.toFixed(2) + ')'; cx.beginPath(); cx.ellipse(sx, sy, r * k, r, 0, 0, 6.2832); cx.fill(); };
    const cMin = Math.cos(2.16);
    for (let i = 0; i < 52000; i++) {
      const phi = rnd() * 6.2832, th = Math.acos(cMin + rnd() * (1 - cMin)), l = limit(phi);
      if (th >= l || Math.sin(th) * Math.sin(phi) >= 0.5) continue;
      if (rnd() > 1 - sm(l - 0.5, l, th)) continue;                 /* 경계 근처일수록 점이 성겨져 자연스럽게 사라짐 */
      dot(th, phi, 0.24 + rnd() * 0.28, 1.7 + rnd() * 0.9);
    }
    const tex = new THREE.CanvasTexture(cv); if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const smpG = new THREE.SphereGeometry(1, 56, 40); { const p = smpG.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) * 0.1518; if (y > 0.02) y = 0.02 + (y - 0.02) * 0.76; p.setY(i, y / 0.1518); } smpG.computeVertexNormals(); }
    const smp = new THREE.Mesh(smpG, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    smp.scale.set(0.0985, 0.1518, 0.1165); smp.renderOrder = 1; head.add(smp);
  })();
  /* 귀: Blender 에서 만든 실제 귀 메쉬(models/ear.json): 귓바퀴 테두리 + 안쪽 오목 + 귓불. 왼쪽은 좌우 반전 */
  const earGeo = new THREE.SphereGeometry(0.02, 12, 8);
  fetch('models/ear.json').then((r) => r.json()).then((d) => {
    /* 귀를 속이 찬 덩어리로: 뒷면(바닥)을 머리 속 깊이(-0.011)까지 내려 닫고 옆벽을 세운다. 그래서 어느 방향에서 봐도 구멍·쪼가리 없이 머리에 박혀 붙어 있다 */
    const n = d.p.length / 3, P = new Float32Array(d.p.length * 2), I = d.i.slice(), NR = 30, NA = 72;
    P.set(d.p); for (let i = 0; i < n; i++) { P[3 * (n + i)] = -0.011; P[3 * (n + i) + 1] = d.p[3 * i + 1] * 0.5; P[3 * (n + i) + 2] = d.p[3 * i + 2] * 0.5; }   /* 바닥을 작게 줄여 옆벽이 머리 쪽으로 비스듬히 잦아들게(귀마개처럼 각진 덩어리 방지) */
    for (let k = 0; k < d.i.length; k += 3) I.push(n + d.i[k], n + d.i[k + 2], n + d.i[k + 1]);
    for (let ia = 0; ia < NA; ia++) { const a = 1 + (NR - 1) * NA + ia, b = 1 + (NR - 1) * NA + ((ia + 1) % NA); I.push(a, b, b + n, a, b + n, a + n); }
    { /* 삐쭉한 돌기 제거: 이웃 점 평균으로 부드럽게(라플라시안 스무딩). 귀의 큰 모양(테두리·귓구멍·귓불)은 남기고 뾰족한 잔 요철만 눌러 준다 */
      const nb = Array.from({ length: n }, () => new Set()); for (let k = 0; k < d.i.length; k += 3) { const a = d.i[k], b = d.i[k + 1], c = d.i[k + 2]; nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b); }
      for (let it = 0; it < 5; it++) { const Q = P.slice(0, 3 * n); for (let i = 1; i < n; i++) { let sx = 0, sy = 0, sz = 0; nb[i].forEach((j) => { sx += P[3 * j]; sy += P[3 * j + 1]; sz += P[3 * j + 2]; }); const m = nb[i].size; Q[3 * i] = P[3 * i] * 0.35 + (sx / m) * 0.65; Q[3 * i + 1] = P[3 * i + 1] * 0.5 + (sy / m) * 0.5; Q[3 * i + 2] = P[3 * i + 2] * 0.5 + (sz / m) * 0.5; } P.set(Q, 0); }
    }
    earGeo.setAttribute('position', new THREE.BufferAttribute(P, 3)); earGeo.deleteAttribute('uv');
    earGeo.setIndex(I); earGeo.computeVertexNormals(); earGeo.computeBoundingSphere();
  }).catch(() => {});
  const earMat = toon(0xc88e67, g4); earMat.side = THREE.DoubleSide; earMat.emissive = new THREE.Color(0x6e4630);   /* 머리 옆면과 같은 밝기로 이어지게 */
  [+1, -1].forEach((s) => {
    const ear = mk(earGeo, earMat, head, 0); ear.position.set(s * 0.099, -0.026, -0.004); ear.scale.set(s * 0.63, 0.63, 0.63); ear.rotation.z = -s * 0.1; ear.rotation.y = -s * 0.25;   /* 귀 뒤쪽이 바깥으로 벌어짐 */
    { /* 귓볼: 귀 아래 끝에 붙는 도톰하고 둥근 살 (귀 좌표계 자식이라 귀와 함께 움직인다) */
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.014, 18, 14), earMat); lobe.scale.set(0.95, 1.3, 0.85); lobe.position.set(0.011, -0.047, 0.001); ear.add(lobe);
    }
  });
  const lensGs = [], drops = [];
  const glasses = new THREE.Group(); head.add(glasses);     /* 선글라스 전체 (내렸다 올릴 수 있게 한 묶음) */
  let flowK = 0, winkFocus = 0; /* 윙크하는 눈을 화면 가운데로 끌어오는 정도 (0~1) */ /* 커튼이 열리면 땀방울이 주르륵 흐르는 세기 (0~1) */
  const sstep = (a, b, v) => { const t = Math.min(Math.max((v - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  /* ---------- 눈 · 눈꺼풀 · 눈썹 (선글라스를 내리면 보임) ---------- */
  const eyes = [];
  const white = toon(0xfbf7ef), irisM = toon(0x2a1a12), blackM = toon(0x050407), browM = toon(0x241a15);
  [+1, -1].forEach((s) => {
    const ex = s * 0.040, ey = -0.007, ez = 0.102;
    const eg = new THREE.Group(); eg.position.set(ex, ey, ez); eg.rotation.y = s * 0.35; head.add(eg);
    const ball = mk(new THREE.SphereGeometry(0.0145, 18, 14), white, eg, 0.0025); ball.scale.set(1.3, 0.75, 0.6);
    const iris = mk(new THREE.SphereGeometry(0.0076, 14, 10), irisM, eg, 0.0015); iris.position.set(0, 0, 0.0075); iris.scale.set(1, 1, 0.5);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 10, 8), blackM); pup.position.set(0, 0, 0.0092); pup.scale.set(1, 1, 0.4); eg.add(pup);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); sp.position.set(-0.0026, 0.0028, 0.0105); eg.add(sp);
    const lidG = new THREE.Group(); lidG.position.set(0, 0.0138, 0.0012); eg.add(lidG);
    const lid = mk(new THREE.SphereGeometry(0.0165, 18, 12), new THREE.MeshBasicMaterial({ color: s < 0 ? 0x94603f : 0xc08a62 }), lidG, 0.0022); lid.scale.set(1.2, 0.1, 0.72); lid.position.y = -0.0165 * 0.1; lid.visible = false;
    ball.visible = iris.visible = pup.visible = sp.visible = false;
    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0024, 0.003), blackM); lash.position.set(0, -0.033, 0.0105); lash.visible = false; lidG.add(lash);
    const brow = mk(new THREE.BoxGeometry(0.04, 0.0085, 0.008), browM, head, 0.002); brow.position.set(ex + s * 0.003, 0.055, 0.1); brow.rotation.z = s * 0.07; brow.rotation.y = s * 0.3; brow.visible = false;
    eyes.push({ s, lid, lash, brow, browY: 0.055, lidG });
  });
  const sparkle = new THREE.Group(); sparkle.position.set(-0.078, 0.03, 0.118); sparkle.scale.setScalar(0.0001); head.add(sparkle);
  (function () {
    const star = new THREE.Shape(); star.moveTo(0, 1); star.quadraticCurveTo(0.1, 0.1, 1, 0); star.quadraticCurveTo(0.1, -0.1, 0, -1); star.quadraticCurveTo(-0.1, -0.1, -1, 0); star.quadraticCurveTo(-0.1, 0.1, 0, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1b8, side: THREE.DoubleSide });
    const big = new THREE.Mesh(new THREE.ShapeGeometry(star), mat); big.scale.setScalar(0.017); sparkle.add(big);
    const small = new THREE.Mesh(new THREE.ShapeGeometry(star), mat); small.scale.setScalar(0.011); small.position.set(0.026, -0.016, 0); sparkle.add(small);
  })();
  /* 항공(에비에이터) 선글라스: 눈물방울 렌즈 + 가는 은색 금속 테 + 쌍 코다리 + 얇은 다리 */
  (function addAviators() {
    const lensMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'varying vec2 vP;',
        'void main(){',
        '  float t = smoothstep(0.036, -0.044, vP.y);                         /* 위 0 -> 아래 1 */',
        '  vec3 col = mix(vec3(0.012, 0.012, 0.016), vec3(0.115, 0.125, 0.15), t * t);',
        '  float d = vP.x * 0.75 - vP.y * 1.0 - 0.012;                        /* 햇빛이 스치는 대각선 */',
        '  float glare = exp(-pow(d / 0.016, 2.0)) * 0.16 + exp(-pow((d - 0.034) / 0.007, 2.0)) * 0.07;',
        '  col += vec3(0.55, 0.6, 0.7) * glare * (0.35 + 0.65 * (1.0 - t));',
        '  gl_FragColor = vec4(col, 0.93);',
        '}'].join('\n')
    });   /* 레이밴 편광 렌즈: 거의 검정, 햇빛 그라데이션 */
    const metal = new THREE.MeshToonMaterial({ color: 0x45484d, gradientMap: g4 });  /* 건메탈 가는 테 */
    const sheenMat = new THREE.MeshBasicMaterial({ color: 0x9aa0aa, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
    const shape = new THREE.Shape();
    /* 레이밴 에비에이터 사진(렌즈 가로 172px, 세로 148px)에서 잰 실제 윤곽 50점. 1px = 0.000535 */
    const RB = [[0.05616, 0.03958], [0.07221, 0.03637], [0.07916, 0.03316], [0.08344, 0.02995], [0.08558, 0.02674], [0.08772, 0.02353], [0.08933, 0.02033], [0.0904, 0.01712], [0.09093, 0.01391], [0.09093, 0.0107], [0.09147, 0.00749], [0.09093, 0.00428], [0.09093, 0.00107], [0.0904, -0.00214], [0.08986, -0.00535], [0.08986, -0.00856], [0.08879, -0.01177], [0.08826, -0.01498], [0.08665, -0.01819], [0.08505, -0.0214], [0.08291, -0.0246], [0.08023, -0.02781], [0.07702, -0.03102], [0.07221, -0.03423], [0.06579, -0.03744], [0.04226, -0.03744], [0.0353, -0.03423], [0.03102, -0.03102], [0.02621, -0.02781], [0.023, -0.0246], [0.01979, -0.0214], [0.01658, -0.01819], [0.01391, -0.01498], [0.01123, -0.01177], [0.00909, -0.00856], [0.00695, -0.00535], [0.00535, -0.00214], [0.00374, 0.00107], [0.00267, 0.00428], [0.0016, 0.00749], [0.00053, 0.0107], [0.0, 0.01391], [0.00053, 0.01712], [0.00107, 0.02033], [0.00214, 0.02353], [0.00428, 0.02674], [0.00695, 0.02995], [0.01177, 0.03316], [0.02086, 0.03637], [0.03744, 0.03958]];
    RB.forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])));
    shape.closePath();
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
      const g = new THREE.Group(); g.position.set(s * 0.009, 0.033, 0.124); g.rotation.y = s * 0.3; g.rotation.z = -s * 0.07; g.scale.set(s * 0.86, 0.86, 1); glasses.add(g);
      g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false }), lensMat));
      const rim = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 64, 0.0017, 6, true), metal); g.add(rim);
      const sheen = new THREE.Mesh(new THREE.ShapeGeometry(sheenShape), sheenMat); sheen.position.z = 0.0042; g.add(sheen);
      g.children[0].renderOrder = 4; sheen.renderOrder = 5;
      /* 다리: 렌즈 바깥 위쪽에서 귀까지 */
      const tp = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.086, 0.036, 0.09), new THREE.Vector3(s * 0.099, 0.034, 0.05), new THREE.Vector3(s * 0.105, 0.029, 0.01), new THREE.Vector3(s * 0.106, 0.019, -0.025), new THREE.Vector3(s * 0.101, 0.004, -0.045)]);
      glasses.add(new THREE.Mesh(new THREE.TubeGeometry(tp, 12, 0.0014, 6, false), metal));
      lensGs.push(g); addDrops(g);
    });
    /* 쌍 코다리: 위쪽 가로대 + 아래쪽 코받침 */
    const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.0158, 0.0453, 0.1225), new THREE.Vector3(-0.0105, 0.0455, 0.1245), new THREE.Vector3(0, 0.0468, 0.1275), new THREE.Vector3(0.0105, 0.0455, 0.1245), new THREE.Vector3(0.0158, 0.0453, 0.1225)]);
    glasses.add(new THREE.Mesh(new THREE.TubeGeometry(brow, 12, 0.0016, 6, false), metal));   /* 레이밴 위쪽 가로대(브로우 바) */
    const nb = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.0135, 0.0275, 0.1250), new THREE.Vector3(-0.0098, 0.0325, 0.1270), new THREE.Vector3(0, 0.038, 0.1310), new THREE.Vector3(0.0098, 0.0325, 0.1270), new THREE.Vector3(0.0135, 0.0275, 0.1250)]);
    glasses.add(new THREE.Mesh(new THREE.TubeGeometry(nb, 12, 0.0015, 6, false), metal));
  })();
  /* 진짜 3D 에셋: 레이밴 스타일 에비에이터 (Kimppo, Sketchfab, CC BY 4.0 — models/aviator/license.txt). 직접 그린 윤곽 대신 실제 모델을 읽어 온다 */
  (function loadRealAviator() {
    const procedural = glasses.children.slice();   /* 읽기 실패하면 직접 만든 안경을 그대로 둔다 */
    fetch('models/aviator/aviator.json').then((r) => r.json()).then((d) => {
      const root = new THREE.Group();            /* glTF(위 = z, 앞 = -y) -> 머리(위 = y, 앞 = +z): x축으로 -90도 */
      const lensMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vP; void main(){ vP = vec2(position.x, position.z); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: ['varying vec2 vP;', 'void main(){',
          '  float t = smoothstep(0.019, -0.028, vP.y);',
          '  vec3 col = mix(vec3(0.012, 0.012, 0.016), vec3(0.115, 0.125, 0.15), t * t);',
          '  float dd = vP.x * 0.75 - vP.y - 0.004;',
          '  float glare = exp(-pow(dd / 0.011, 2.0)) * 0.16 + exp(-pow((dd - 0.024) / 0.005, 2.0)) * 0.07;',
          '  col += vec3(0.55, 0.6, 0.7) * glare * (0.35 + 0.65 * (1.0 - t));',
          '  gl_FragColor = vec4(col, 0.93);', '}'].join('\n')
      });
      const frameM = new THREE.MeshToonMaterial({ color: 0x4a4d52, gradientMap: g4 }), tipM = new THREE.MeshToonMaterial({ color: 0x0a0a0c, gradientMap: g4 });
      const goldM = new THREE.MeshPhongMaterial({ color: 0x07070a, specular: 0x555566, shininess: 90 }), silverM = goldM;   /* 테·경첩 전부 광택 검정 */   /* 원본 모델의 금색 테·은색 경첩 */
      const mats = { frame_gold: goldM, frame_silver: silverM, tips: tipM, lens: lensMat };
      d.meshes.forEach((m) => {
        if (!mats[m.name]) return;                 /* 코받침(pads)은 쓰지 않는다 */
        const geo = new THREE.BufferGeometry(), P = new Float32Array(m.p.length), N = new Float32Array(m.n.length);
        for (let i = 0; i < P.length; i++) P[i] = m.p[i] / d.scale_p; for (let i = 0; i < N.length; i++) N[i] = m.n[i] / d.scale_n;
        geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setIndex(m.i);
        const mesh = new THREE.Mesh(geo, mats[m.name]); if (m.name === 'lens') mesh.renderOrder = 4; root.add(mesh);
      });
      { /* 오른쪽(머리 -x) 바깥 모서리 = 경첩: 프레임 정점 중 x가 가장 작은 곳들의 평균. 손이 여기를 집는다 */
        let mx = 9, pts = []; d.meshes.forEach((m) => { if (m.name !== 'frame_gold' && m.name !== 'frame_silver') return; for (let i = 0; i < m.p.length; i += 3) { const x = m.p[i] / d.scale_p; if (x < mx) mx = x; } });
        d.meshes.forEach((m) => { if (m.name !== 'frame_gold' && m.name !== 'frame_silver') return; for (let i = 0; i < m.p.length; i += 3) { const x = m.p[i] / d.scale_p, y = m.p[i + 1] / d.scale_p; if (x < mx + 0.0035 && y < -0.01) pts.push([x, y, m.p[i + 2] / d.scale_p]); } });
        const hg = new THREE.Object3D(); if (pts.length) hg.position.set(pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length, pts.reduce((a, p) => a + p[2], 0) / pts.length); root.add(hg); glasses.userData.hingeR = hg;
      }
      root.rotation.x = -Math.PI / 2; const holder = new THREE.Group(); holder.add(root);
      holder.scale.setScalar(1.3); holder.position.set(0, -0.011, 0.098);   /* 실제 크기 14cm -> 머리에 맞춤, 렌즈 앞면이 얼굴 앞에 오도록 */
      procedural.forEach((c) => { c.visible = false; }); drops.forEach((o) => { o.d.visible = false; });
      glasses.add(holder);
    }).catch(() => {});
  })();
  const cheeks = [+1, -1].map((s) => { const c = mk(new THREE.SphereGeometry(0.022, 12, 10), M.skin, head, 0.003); c.position.set(s * 0.06, -0.066, 0.07); return c; });

  /* ---------- 색소폰 ---------- */
  glasses.children.forEach((c) => { c.position.y -= 0.037; });   /* 사진 기준으로 눈 위치가 내려갔으므로 선글라스도 같이 */
  /* 입술 (안내 자세에서만 보임: 색소폰을 내려놓았을 때) */
  const lips = new THREE.Group(); lips.visible = false; head.add(lips);
  const lipM = toon(0xa8474f, g4);
  /* 미소: 입꼬리가 올라간 초승달 모양 입 + 하얀 이 */
  const smilePt = (k, dy, dz) => { const x = k * 0.025, u = k * k; return new THREE.Vector3(x, -0.05 - 0.017 * (1 - u) + dy, 0.108 - 7 * x * x + dz); };
  const smileCurve = (dy, dz) => new THREE.CatmullRomCurve3([-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map((k) => smilePt(k, dy, dz)));
  const mouthIn = mk(new THREE.TubeGeometry(smileCurve(-0.0035, -0.001), 24, 0.0052, 8, false), toon(0x2a0d12), lips, 0);
  const teeth = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 8), toon(0xfbf7ef), lips); teeth.position.set(0, -0.0585, 0.104); teeth.scale.set(1.05, 0.3, 0.4);
  const lipTube = mk(new THREE.TubeGeometry(smileCurve(-0.0075, 0.001), 24, 0.0042, 8, false), lipM, lips, 0.0015);
  [-1, 1].forEach((s) => { const d = mk(new THREE.SphereGeometry(0.0042, 8, 6), lipM, lips, 0); d.position.copy(smilePt(s, -0.0005, 0.001)); });
  const MOUTH_CHEST =new THREE.Vector3(0, 0.468, 0.125);  /* 입 위치 (가슴 기준) */
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
  const L1 = 0.275, L2 = 0.265;
  function limb(r1, r2) { const m = mk(new THREE.CylinderGeometry(r2, r1, 1, 14), M.suit, scene, 0.007); return m; }
  function joint(r, mat) { return mk(new THREE.SphereGeometry(r, 14, 10), mat || M.suit, scene, 0.006); }
  /* 손가락 설계: x = 엄지 쪽으로 얼마나 치우쳤나, y = 손바닥에서 손가락 밑동 위치, l1·l2 = 마디 길이 */
  const FING = [
    { x: 0.034, y: 0.030, l1: 0.046, l2: 0.038, r: 0.0108 },   /* 엄지 */
    { x: 0.024, y: 0.094, l1: 0.048, l2: 0.038, r: 0.0088 },   /* 검지 */
    { x: 0.008, y: 0.097, l1: 0.053, l2: 0.042, r: 0.0092 },   /* 중지 */
    { x: -0.009, y: 0.094, l1: 0.048, l2: 0.038, r: 0.0088 },  /* 약지 */
    { x: -0.025, y: 0.087, l1: 0.038, l2: 0.031, r: 0.0080 }   /* 새끼 */
  ];
  FING.forEach((f) => { f.x *= 1.2; f.y *= 1.2; f.l1 *= 1.2; f.l2 *= 1.2; f.r *= 1.12; });   /* 손을 얼굴 크기에 맞게 키움 */
  function makeArm(side) {
    const o = { side, up: limb(0.058, 0.05), lo: limb(0.05, 0.038), elbow: joint(0.052), cuff: mk(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), M.shirt, scene, 0.004),
      palm: mk(new THREE.SphereGeometry(0.036, 14, 10), M.skin, scene, 0.005), fingers: [] };
    o.palm.scale.set(0.9, 0.7, 1.15);
    { const br = mk(new THREE.TorusGeometry(0.0455, 0.0075, 8, 22), new THREE.MeshToonMaterial({ color: 0xd8502b, gradientMap: g4 }), o.cuff, 0.002); br.rotation.x = Math.PI / 2; br.position.y = 0.024; }
    for (let i = 0; i < 3; i++) { const f = mk(new THREE.CapsuleGeometry(0.0095, 0.03, 4, 8), M.skin, scene, 0.003); o.fingers.push(f); }
    { const cl = mk(new THREE.SphereGeometry(0.0095, 12, 8), M.gold, o.cuff, 0.0015); cl.position.set(0.047, 0, 0); }   /* 소맷부리 금 커프링크 */
    /* 진짜 손: 납작한 손바닥 + 엄지 포함 5개 손가락(각 2마디). 색소폰을 불 때는 위의 간단한 손을 쓰고, 안내 캐릭터는 이 손을 쓴다 */
    o.palmN = mk(new THREE.SphereGeometry(1, 18, 14), M.skin, scene, 0.004); o.palmN.visible = false;
    o.dig = FING.map((f) => { const mkSeg = (len, r) => mk(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.004), 4, 10), M.skin, scene, 0.0028); const d = { a: mkSeg(f.l1, f.r), b: mkSeg(f.l2, f.r * 0.92) }; d.a.visible = d.b.visible = false; return d; });
    return o;
  }
  const armL = makeArm(+1), armR = makeArm(-1);
  /* 손 모양: 마디별 굽힘(c1 밑마디, c2 윗마디, 라디안)과 벌림(sp, 엄지 쪽이 +) */
  const HAND = {
    open:  { c1: [0.2, 0.05, 0.03, 0.05, 0.09], c2: [0.15, 0.06, 0.04, 0.07, 0.11], sp: [0.8, 0.14, 0.0, -0.12, -0.26] },   /* 활짝 편 손(인사) */
    relax: { c1: [0.45, 0.5, 0.62, 0.72, 0.82], c2: [0.35, 0.6, 0.7, 0.78, 0.86], sp: [0.5, 0.05, 0, -0.04, -0.08] },       /* 편하게 쥔 손 */
    fist:  { c1: [0.9, 1.45, 1.5, 1.52, 1.48], c2: [1.0, 1.5, 1.55, 1.56, 1.5], sp: [0.15, 0, 0, 0, 0] },                  /* 주먹 */
    point: { c1: [0.8, 0.03, 1.45, 1.5, 1.46], c2: [0.9, 0.03, 1.55, 1.56, 1.5], sp: [0.25, 0, 0, 0, 0] },                 /* 검지만 편 손 */
    present: { c1: [0.25, 0.1, 0.08, 0.1, 0.14], c2: [0.15, 0.1, 0.08, 0.1, 0.12], sp: [0.6, 0.03, 0.0, -0.03, -0.07] },
    pinch: { c1: [0.6, 0.7, 1.3, 1.4, 1.4], c2: [0.5, 0.6, 1.4, 1.5, 1.5], sp: [0.45, 0.1, 0, 0, 0] }                         /* 안경 다리를 집는 손: 엄지와 검지를 맞댐 */     /* 안내하는 손: 손가락을 모아 곧게 편 손 */
  };
  const DOWN = new THREE.Vector3(0, -1, 0);
  /* wrist: 손목 위치, fd: 아래팔 방향, nrm: 손바닥이 향하는 방향, w: 손 모양 섞는 비율, droop: 손가락을 아래로 늘어뜨리는 정도, fl: 손가락 떨림 */
  function placeHand(arm, wrist, fd, nrm, w, droop, fl) {
    const c1 = [0, 0, 0, 0, 0], c2 = [0, 0, 0, 0, 0], sp = [0, 0, 0, 0, 0];
    for (const n in w) for (let i = 0; i < 5; i++) { c1[i] += HAND[n].c1[i] * w[n]; c2[i] += HAND[n].c2[i] * w[n]; sp[i] += HAND[n].sp[i] * w[n]; }
    if (fl) for (let i = 1; i < 5; i++) sp[i] += fl * (i % 2 ? 1 : -1);
    const Y = fd.clone().normalize(), Zp = nrm.clone().sub(Y.clone().multiplyScalar(nrm.dot(Y))).normalize(), Xr = Y.clone().cross(Zp), X = Xr.clone().multiplyScalar(-arm.side);
    arm.palmN.visible = true; arm.palm.visible = false; arm.fingers.forEach((f) => { f.visible = false; });
    arm.palmN.position.copy(wrist).addScaledVector(Y, 0.05); arm.palmN.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xr, Y, Zp)); arm.palmN.scale.set(0.052, 0.064, 0.02);
    const Yf = droop ? Y.clone().lerp(DOWN, droop).normalize() : Y, Zf = Zp.clone().sub(Yf.clone().multiplyScalar(Zp.dot(Yf))).normalize(), Xf = X.clone().sub(Yf.clone().multiplyScalar(X.dot(Yf))).normalize();
    FING.forEach((f, i) => {
      const P0 = wrist.clone().addScaledVector(Y, f.y).addScaledVector(X, f.x).addScaledVector(Zp, i === 0 ? 0.004 : 0);
      const dir0 = Yf.clone().multiplyScalar(Math.cos(sp[i])).addScaledVector(Xf, Math.sin(sp[i]));
      const d1 = dir0.clone().multiplyScalar(Math.cos(c1[i])).addScaledVector(Zf, Math.sin(c1[i])).normalize(), d2 = dir0.clone().multiplyScalar(Math.cos(c1[i] + c2[i])).addScaledVector(Zf, Math.sin(c1[i] + c2[i])).normalize();
      const P1 = P0.clone().addScaledVector(d1, f.l1), d = arm.dig[i];
      d.a.visible = d.b.visible = true;
      d.a.position.copy(P0).addScaledVector(d1, f.l1 / 2); d.a.quaternion.setFromUnitVectors(UP, d1);
      d.b.position.copy(P1).addScaledVector(d2, f.l2 / 2); d.b.quaternion.setFromUnitVectors(UP, d2);
    });
  }
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
    arm.palm.visible = true; arm.fingers.forEach((f) => { f.visible = true; }); arm.palmN.visible = false; arm.dig.forEach((d) => { d.a.visible = d.b.visible = false; });
    const sh = chest.localToWorld(new THREE.Vector3(arm.side * 0.215, 0.285, 0));
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
  /* 사람처럼 불규칙하게 깜빡: 약 3~5초마다 한 번, 가끔 연달아 두 번. 감는 건 빠르고 뜨는 건 조금 느리다 */
  function naturalBlink(time) {
    const P = 3.4, n = Math.floor(time / P), r = (k) => { const x = Math.sin((n + k) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const t0 = n * P + 0.5 + r(1) * 1.9, dbl = r(2) > 0.72;
    const one = (t) => { const u = time - t; return u < 0 ? 0 : u < 0.07 ? sstep(0, 0.07, u) : u < 0.24 ? 1 - sstep(0.07, 0.24, u) : 0; };
    return Math.max(one(t0), dbl ? one(t0 + 0.34) : 0);
  }
  function poseGuide(time) {
    const e = Math.min(Math.max(guideP, 0), 1), ease = 1 - Math.pow(1 - e, 3), over = 1 + 0.07 * Math.sin(e * Math.PI);
    rig.scale.setScalar((0.55 + 0.45 * ease) * over); rig.position.set(0, -0.5 * (1 - ease), 0); rig.rotation.y = -0.22 + 0.04 * Math.sin(time * 0.9);
    const beat = Math.abs(Math.sin(time * 5.0)), pt = Math.min(Math.max((guideP - 0.35) / 0.4, 0), 1), pe = idle ? 0 : pt * pt * (3 - 2 * pt), wp = idle ? e : pe;
    pelvis.position.y = 0.95 - 0.012 * beat * pe; pelvis.rotation.set(0, 0.05 * Math.sin(time * 0.8), 0.02 * Math.sin(time * 1.2));
    chest.rotation.set(0.08 + 0.05 * beat * pe, 0, 0); chest.scale.set(1, 1, 1);
    head.rotation.set(-0.02 + 0.08 * beat * pe, 0.2 + 0.05 * Math.sin(time * 0.6), 0.02);   /* 몸이 돌아 있어도 얼굴은 정면 */
    saxPivot.visible = false; cheeks.forEach((c) => { c.visible = false; }); lips.visible = false; { const gs = glassState(time), gu = 1 - gs.s; glasses.scale.setScalar(1); { /* 올림/내림 경로: 머리 곡면(타원체)을 따라 눈 높이 -> 이마로 호를 그리며 오른다. 각도마다 머리 표면 반지름을 계산해 안경이 머리 속으로 파고들지 않게 띄워 준다. 가운데 구간은 손으로 들어 올리는 만큼 살짝 더 띄운다 */
      const th = 0.8 * gu, a = 0.115, b = 0.15, Rs = 1 / Math.sqrt((Math.sin(th) / b) ** 2 + (Math.cos(th) / a) ** 2);
      const d = Rs - 0.114 + 0.004 - 0.019 * gu + 0.018 * Math.sin(Math.PI * gu);
      glasses.position.set(0, d * Math.sin(th), d * Math.cos(th)); glasses.rotation.set(-th, 0, 0); } head.rotation.x += 0.1 * gs.act; head.rotation.y -= 0.1 * gs.act; }   /* 선글라스: 이마 <-> 눈, 만지는 동안 고개를 살짝 기울임 */ /* 선글라스를 이마 위로 */
    { /* 3.6초마다 윙크 (손가락으로 가리키는 동안) */
      const ph = time % 3.6, wk = sstep(2.7, 2.82, ph) * (1 - sstep(3.15, 3.27, ph)) * wp, sp = sstep(2.75, 2.95, ph) * (1 - sstep(3.2, 3.4, ph)) * wp;
      { const nb = naturalBlink(time); blinkU.a.value = Math.max(wk, nb); blinkU.b.value = nb; }   /* 사진 속 진짜 눈이 닫혔다 열린다 */
      sparkle.scale.setScalar(Math.max(0.0001, sp * (1 + 0.18 * Math.sin(time * 30)))); sparkle.rotation.z = time * 3.5;
    }
    legL.knee.rotation.x = 0.06; legR.knee.rotation.x = 0.06; legL.hip.rotation.set(-0.02, 0, 0.06); legR.hip.rotation.set(-0.02, 0, -0.06); legL.ankle.rotation.x = 0; legR.ankle.rotation.x = 0;
    { const sk = idle ? strikeState(time) : null; if (sk && sk.st >= 0) { chest.rotation.y = -0.38 * sk.lean; head.rotation.y -= 0.25 * sk.lean; chest.rotation.x += 0.12 * sk.b * (1 - sk.c); } }   /* 내려칠 때 몸이 머리 쪽으로 기울어짐 */
    rig.updateMatrixWorld(true);
    if (idle) { idleArms(time); return; }
    guideArm(armR, true, pe, beat); guideArm(armL, false, pe, beat);
  }
  /* 편하게 서 있기 + 가끔 손 흔들기 + 필요할 때만 옆으로 가리키기 */
  function armTo(arm, rel, pole, hand) {
    const sh = chest.localToWorld(new THREE.Vector3(arm.side * 0.215, 0.285, 0));
    const target = sh.clone().add(rel.clone().applyQuaternion(rig.quaternion)), pl = pole.clone().applyQuaternion(rig.quaternion);
    const s = solve(sh, target, pl);
    place(arm.up, sh, s.elbow); place(arm.lo, s.elbow, s.wrist); arm.elbow.position.copy(s.elbow);
    const fd = s.wrist.clone().sub(s.elbow).normalize();
    arm.cuff.position.copy(s.wrist).addScaledVector(fd, -0.02); arm.cuff.quaternion.setFromUnitVectors(UP, fd);
    placeHand(arm, s.wrist, fd, hand.nrm.clone().applyQuaternion(rig.quaternion), hand.w, hand.droop || 0, hand.fl || 0);
  }
  function strikeState(time) {   /* 오른손 내려치기: 들어올림 -> 휘두름 -> 충격 -> 되돌림 */
    if (strikeReq) { strikeStart = time; strikeReq = 0; strikeDone = false; }
    const st = time - strikeStart; if (st < 0 || st > 2.2) return { st: -1, a: 0, b: 0, c: 0, lean: 0 };
    const a = sstep(0, 0.55, st), b = sstep(0.55, 0.66, st), c = sstep(0.98, 1.8, st); return { st, a, b, c, lean: b * (1 - c) };
  }
  /* 선글라스 연기 상태: 내리기(dir 1) / 올리기(dir -1). 손이 안경을 집고 -> 안경이 움직이고 -> 손을 뗀다 */
  let curG = { s: 0, act: 0, st: -1, dir: 0 };
  function glassState(time) {
    if (gReq) { gStart = time; gDir = gReq; gReq = 0; }
    const st = time - gStart;
    if (gDir !== 0 && st >= 0 && st < 2.8) { const m = sstep(0.55, 1.25, st); curG = { s: gDir > 0 ? m : 1 - m, st, dir: gDir, act: sstep(0, 0.4, st) * (1 - sstep(2.0, 2.6, st)) }; }
    else { if (gDir !== 0 && st >= 2.8) { glassS = gDir > 0 ? 1 : 0; gDir = 0; } curG = { s: glassS, st: -1, dir: 0, act: 0 }; }
    return curG;
  }
  const HO = { x: -0.085, y: 0.0, z: 0.01 };   /* 경첩에서 손목까지(머리 좌표): 머리 바깥 옆으로 떨어져서 손가락만 안경 경첩에 닿는다. 머리와의 최소 간격 4cm 이상으로 측정해 정함 */
  function idleArms(time) {
    if (waveReq) { waveStart = time; waveReq = 0; }
    const sk = strikeState(time);
    if (!strikeDone && sk.st >= 0.64) { strikeDone = true; strikeCb && strikeCb(); }
    pointK += (pointT - pointK) * 0.1;
    if (pointMode === 'down' && pointT > 0) { /* 첫 화면: 손을 흔들다가 아래를 가리킨다 */
      const beat = Math.abs(Math.sin(time * 5.0)); guideArm(armR, true, pointK, beat); guideArm(armL, false, pointK, beat); return;
    }
    const wc = time % 9, per = 0,   /* 9초마다 손 흔들던 것을 껐다: 인사는 처음 나왔을 때 한 번(그리고 요청받을 때)만 */ gw = sstep(waveStart, waveStart + 0.3, time) * (1 - sstep(waveStart + 1.9, waveStart + 2.3, time));
    const wv = Math.max(per, gw) * (1 - pointK) * (sk.st >= 0 || curG.st >= 0 ? 0 : 1);   /* 인사(요청 시)와 9초마다 짧게 손 흔들기 */
    const pArm = pointDir > 0 ? armL : armR, V = (x, y, z) => new THREE.Vector3(x, y, z);
    [armR, armL].forEach((arm) => {
      const sd = arm.side, sway = Math.sin(time * 1.3 + sd) * 0.012;
      let rel = V(sd * 0.07, -0.5, 0.03 + sway), pole = V(sd * 0.35, -0.1, -0.9), w = { relax: 1 }, nrm = V(-sd, 0, 0.15), fl = 0;   /* 쉴 때: 손바닥이 허벅지 쪽, 손가락은 편하게 */
      if (arm === armR && wv > 0.01) { /* 인사: 손바닥을 정면으로 향하고 손가락을 활짝 펴서 흔든다 */
        const up = V(sd * 0.2 + Math.sin(time * 11) * 0.05 * sd, 0.3, 0.12); rel.lerp(up, wv); pole.lerp(V(sd, 0.3, -0.3), wv);
        w = { relax: 1 - wv, open: wv }; nrm.lerp(V(0, 0, 1), wv); fl = wv * Math.sin(time * 16) * 0.07;
      }
      if (arm === pArm && pointK > 0.02) { rel.lerp(V(sd * 0.36, 0.04, 0.2), pointK); pole.lerp(V(sd * 0.3, -0.8, -0.2), pointK); w = { relax: 1 - pointK, present: pointK }; nrm.lerp(V(0, 0.55, 0.85), pointK); }
      if (arm === armR && sk.st >= 0) { /* 내려치기: 펴진 손 -> 주먹 */
        const wind = V(sd * 0.14, 0.44, -0.1), hit = V(sd * 0.52, -0.02, 0.2), rest = V(sd * 0.07, -0.5, 0.03);
        rel = rest.clone().lerp(wind, sk.a).lerp(hit, sk.b).lerp(rest, sk.c);
        pole = V(sd * 0.35, -0.1, -0.9).lerp(V(sd, 0.25, -0.3), sk.a * (1 - sk.b)).lerp(V(sd, -0.05, -0.1), sk.b * (1 - sk.c));
        w = { open: (1 - sk.a) * (1 - sk.c), fist: sk.a * (1 - sk.c), relax: sk.c }; nrm = V(0, 0, 1).lerp(V(-sd * 0.6, -0.6, 0.5), sk.a);
      }
      if (arm === armR && curG.st >= 0) { /* 오른손이 안경의 실제 위치(머리 좌표)로 올라가 다리를 집는다 */
        const shW = chest.localToWorld(new THREE.Vector3(sd * 0.215, 0.285, 0)); let P;
        if (glasses.userData.hingeR) { glasses.userData.hingeR.updateWorldMatrix(true, false); P = glasses.userData.hingeR.getWorldPosition(new THREE.Vector3()); const hl = head.worldToLocal(P.clone()).add(new THREE.Vector3(HO.x, HO.y, HO.z)); P = head.localToWorld(hl); }
        else { const gy = -0.006 + 0.084 * (1 - curG.s) + 0.004; P = head.localToWorld(new THREE.Vector3(-0.088, gy, 0.075)).add(new THREE.Vector3(-0.045, -0.085, 0.075)); }
        const relT = P.clone().sub(shW).applyQuaternion(rig.quaternion.clone().invert());
        const gwv = sstep(0, 0.5, curG.st) * (1 - sstep(1.65, 2.2, curG.st)), pin = sstep(0.38, 0.55, curG.st) * (1 - sstep(1.4, 1.65, curG.st));
        rel = rel.clone().lerp(relT, gwv); pole = pole.clone().lerp(V(sd, -0.35, -0.15), gwv);
        w = { relax: 1 - gwv, open: gwv * (1 - pin), pinch: gwv * pin }; nrm = nrm.clone().lerp(V(0.2, -0.9, 0.3), gwv);
        if (curG.dir > 0) { /* 쓴 뒤 멋있게 손가락을 튕기듯 펴 보임 */
          const q = sstep(1.7, 2.0, curG.st) * (1 - sstep(2.5, 2.8, curG.st));
          if (q > 0.01) { rel.lerp(V(sd * 0.22, 0.02, 0.2), q); w = { relax: 1 - q, present: q }; nrm = V(0, 0, 1); fl = q * Math.sin(time * 18) * 0.12; }
        }
      }
      armTo(arm, rel, pole, { w, nrm, fl });
    });
    head.rotation.y += pointDir * 0.28 * pointK;
  }
  function guideArm(arm, point, pe, beat) {
    const sh = chest.localToWorld(new THREE.Vector3(arm.side * 0.215, 0.285, 0)), V = (x, y, z) => new THREE.Vector3(x, y, z);
    let target, pole, w, nrm, droop = 0;
    if (point) {
      const raise = V(arm.side * 0.06, 0.3, 0.2), down = V(arm.side * 0.075, -0.2, 0.3);
      const rel = raise.lerp(down, pe); rel.y -= 0.07 * beat * pe; rel.z += 0.03 * beat * pe;
      target = sh.clone().add(rel.applyQuaternion(rig.quaternion)); pole = V(arm.side * 1, -0.45, -0.25).applyQuaternion(rig.quaternion);
      w = { open: 1 - pe, present: pe }; nrm = V(0, 0, 1).lerp(V(-arm.side * 0.3, -0.2, 0.9), pe); droop = pe;   /* 펴진 손으로 인사하다가 검지로 아래를 가리킴 */
    } else { target = pelvis.localToWorld(new THREE.Vector3(arm.side * 0.27, 0.12, 0.03)); pole = V(arm.side * 1, 0.1, -0.5).applyQuaternion(rig.quaternion); w = { relax: 0.45, fist: 0.55 }; nrm = V(-arm.side * 0.7, 0.1, -0.7); }
    const s = solve(sh, target, pole);
    place(arm.up, sh, s.elbow); place(arm.lo, s.elbow, s.wrist); arm.elbow.position.copy(s.elbow);
    const fd = s.wrist.clone().sub(s.elbow).normalize();
    arm.cuff.position.copy(s.wrist).addScaledVector(fd, -0.02); arm.cuff.quaternion.setFromUnitVectors(UP, fd);
    placeHand(arm, s.wrist, fd, nrm.normalize().applyQuaternion(rig.quaternion), w, droop, 0);
  }
  function pose(time) {
    if (guide) { poseGuide(time); return; }
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
      const eyeW = head.localToWorld(new V3(-0.040, -0.007, 0.102)), sh = eyeW.sub(tgt).multiplyScalar(winkFocus);
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
      blinkU.a.value = wink;
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
    if (guide) { drops.forEach((o) => { o.d.visible = false; }); sweat.forEach((o) => { o.g.visible = false; }); }   /* 안내 캐릭터에는 물방울을 달지 않는다 */
    sweat.forEach((o) => { const v = o.vy + flowK * (0.05 + o.fr * 0.16); if (v > 0) { o.b -= v * dt; if (o.b < 0.5) { o.b = flowK > 0.05 ? 1.22 : 1.2; o.a = (Math.random() - 0.5) * 1.7; } o.place(o); } });
    if (wipeT >= 0) applyWink(wipeT);
    if (introP !== null) { rig.updateMatrixWorld(true); introCamera(introP); }
    renderer.render(scene, camera);
    if (wipeT >= 0) { drawWipe(wipeT); renderer.autoClear = false; renderer.render(eraseScene, orthoCam); renderer.render(hiScene, orthoCam); renderer.autoClear = true; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { renderer, scene, camera, rig, setIntro: (p) => { if (introP === null) renderer.setClearColor(0x000000, 1); introP = p; }, setWipe: (t) => { wipeT = t; }, setGuide: (p) => { guideP = p; }, setPoint: (k, dir, mode) => { pointT = k; if (dir) pointDir = dir; if (mode) pointMode = mode; }, wave: () => { waveReq = 1; }, glasses: (d) => { gReq = d; }, glassesState: () => (gDir !== 0 ? (gDir > 0 ? 1 : 0) : glassS), strike: () => { strikeReq = 1; }, setStrikeHandler: (f) => { strikeCb = f; }, setTime: (v) => { forced = v; }, dispose: () => { cancelAnimationFrame(raf); renderer.dispose(); } };
}
