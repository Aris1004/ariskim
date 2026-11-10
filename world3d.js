/* 진짜 3D 에셋 모음 (three.js): 색소폰 · 연보 터널 · 링 갤러리 · 메달 · 봉투와 티켓 · 안내 캐릭터
   하나의 WebGL 렌더러를 공유하고, 화면에 보이는 장면만 그려서 가볍게 돌린다. */
import * as THREE from './vendor/three.module.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }

if (renderer) {
  document.documentElement.classList.add('w3d');
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  /* ---------- 환경 반사(금속이 반짝이도록 소프트박스 몇 장으로 만든 가상 스튜디오) ---------- */
  const env = (function () {
    const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene(); s.background = new THREE.Color(0x0b0907);
    const box = (w, h, pos, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); s.add(m); };
    box(7, 3, [0, 5, 3], 7, 0xfff0d0); box(3, 7, [-5, 1, 3], 4.5, 0xffd9a0); box(3, 7, [5, 1, -3], 3.2, 0x9ab4ff); box(9, 2, [0, -3, 4], 0.9, 0xffe6bd); box(4, 4, [0, 1, -6], 2.4, 0xffc878);
    const t = pm.fromScene(s, 0.035).texture; pm.dispose(); return t;
  })();

  /* ---------- 공통: 장면 등록, 보일 때만 그리기 ---------- */
  const ptr = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => { ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const items = [];
  const io = new IntersectionObserver((es) => es.forEach((e) => { const it = e.target.__it; it.visible = e.isIntersecting; if (it.visible && !it.ready) { it.ready = true; it.init && it.init(); } }), { rootMargin: '120px' });
  function reg(canvas, o) { const it = Object.assign({ canvas, ctx: canvas.getContext('2d'), visible: false, ready: false }, o); canvas.__it = it; items.push(it); io.observe(canvas); return it; }
  /* 자동 화질: 프레임 속도를 스스로 재고, 느리면 해상도를 낮춰 가볍게 한다. ?fps=1 을 붙이면 화면에 속도가 뜬다 */
  let dprCap = 2, fpsN = 0, fpsT = 0, lowRun = 0;
  const fpsBadge = /[?&]fps/.test(location.search) ? (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:8px;top:84px;z-index:200;padding:6px 10px;font:12px/1.4 monospace;color:#e8cc7a;background:rgba(0,0,0,.75);border:1px solid #c9a84c;pointer-events:none;white-space:pre'; document.body.appendChild(d); return d; })() : null;
  let glName = ''; try { const g = renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); glName = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'GPU'; } catch (e) { glName = '?'; }
  function qualityTick(now, anyVisible) {
    fpsN++; if (now - fpsT < 1000) return; const fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now;
    if (anyVisible) { if (fps < 28) { lowRun++; if (lowRun >= 2 && dprCap > 0.7) { dprCap = Math.max(0.7, +(dprCap - 0.3).toFixed(2)); lowRun = 0; } } else lowRun = 0; }
    if (fpsBadge) fpsBadge.textContent = 'FPS ' + Math.round(fps) + '\n해상도 상한 x' + dprCap + '\n' + glName;
  }
  function fit(it) {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap), w = Math.max(2, Math.round(it.canvas.clientWidth * dpr)), h = Math.max(2, Math.round(it.canvas.clientHeight * dpr));
    if (it.canvas.width !== w || it.canvas.height !== h) { it.canvas.width = w; it.canvas.height = h; it.camera.aspect = w / h; it.camera.updateProjectionMatrix(); it.onresize && it.onresize(w, h); }
    return [w, h];
  }
  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (document.hidden) return;
    qualityTick(now, items.some((x) => x.visible && x.ready));
    for (const it of items) {
      if (!it.visible || !it.ready || !it.scene) continue;
      const [w, h] = fit(it); it.update(now / 1000, dt);
      renderer.setSize(w, h, false); renderer.render(it.scene, it.camera);
      it.ctx.clearRect(0, 0, w, h); it.ctx.drawImage(renderer.domElement, 0, 0, w, h);
    }
  }
  requestAnimationFrame(loop);

  const texLoader = new THREE.TextureLoader();
  function loadTex(src, cb) { return texLoader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cb && cb(t); }); }
  const lightbox = (src, alt) => { const lb = $('#lb'), im = $('#lbimg'); if (!lb || !im) return; im.src = src; im.alt = alt || ''; lb.showModal ? lb.showModal() : lb.setAttribute('open', ''); };
  const progressOf = (el) => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (r.height + innerHeight)); };

  /* =====================================================================
     1) 알토 색소폰 (금빛 황동 · 진주 키 · 마우스피스)
     ===================================================================== */
  function taperedTube(curve, seg, rad, rf) {
    const fr = curve.computeFrenetFrames(seg, false), pos = [], nor = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rf(t);
      for (let j = 0; j <= rad; j++) { const a = j / rad * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z; pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz); nor.push(nx, ny, nz); }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
  }
  function buildSax() {
    const gold = new THREE.MeshStandardMaterial({ color: 0xdb9f2a, metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.25 });
    const goldDark = new THREE.MeshStandardMaterial({ color: 0xa96f1a, metalness: 1, roughness: 0.34, envMap: env, envMapIntensity: 1.1 });
    const goldBright = new THREE.MeshStandardMaterial({ color: 0xf0c25a, metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.4 });
    const pearl = new THREE.MeshStandardMaterial({ color: 0xf4eedf, metalness: 0.05, roughness: 0.18, envMap: env, envMapIntensity: 1.0 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0d, metalness: 0.35, roughness: 0.28, envMap: env, envMapIntensity: 0.9 });
    const padM = new THREE.MeshStandardMaterial({ color: 0x6b4a22, roughness: 0.75, metalness: 0 });
    const pts = [[-0.38, 1.30], [-0.28, 1.38], [-0.14, 1.37], [-0.04, 1.28], [0, 1.15], [0, 0.8], [0, 0.4], [0.01, 0.2], [0.07, 0.06], [0.2, 0.02], [0.31, 0.1], [0.36, 0.26], [0.37, 0.5], [0.4, 0.68], [0.45, 0.78]].map((p) => new THREE.Vector3(p[0], p[1], 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const rs = [[0, 0.013], [0.14, 0.027], [0.22, 0.041], [0.6, 0.056], [0.72, 0.067], [0.82, 0.092], [0.92, 0.135], [1, 0.2]];
    const rf = (t) => { for (let i = 1; i < rs.length; i++) if (t <= rs[i][0]) { const k = (t - rs[i - 1][0]) / (rs[i][0] - rs[i - 1][0]); return lerp(rs[i - 1][1], rs[i][1], k * k * (3 - 2 * k)); } return rs[rs.length - 1][1]; };
    const g = new THREE.Group(), Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0);
    g.add(new THREE.Mesh(taperedTube(curve, 260, 44, rf), gold));
    const at = (t, off) => { const P = curve.getPointAt(t); return new THREE.Vector3(P.x, P.y, rf(t) + off); };
    /* 벨 입구: 테두리 + 안쪽 + 장식 띠 */
    const P1 = curve.getPointAt(1), T1 = curve.getTangentAt(1);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 16, 72), goldBright); rim.position.copy(P1); rim.quaternion.setFromUnitVectors(Z, T1); g.add(rim);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.192, 56), new THREE.MeshStandardMaterial({ color: 0x1a0f05, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide })); mouth.position.copy(P1).addScaledVector(T1, -0.03); mouth.quaternion.setFromUnitVectors(Z, T1); g.add(mouth);
    [0.93, 0.97].forEach((t) => { const P = curve.getPointAt(t), T = curve.getTangentAt(t), band = new THREE.Mesh(new THREE.TorusGeometry(rf(t) + 0.003, 0.0055, 10, 64), goldBright); band.position.copy(P); band.quaternion.setFromUnitVectors(Z, T); g.add(band); });
    [0.2, 0.46, 0.66].forEach((t) => { const P = curve.getPointAt(t), T = curve.getTangentAt(t), band = new THREE.Mesh(new THREE.TorusGeometry(rf(t) + 0.002, 0.005, 10, 48), goldBright); band.position.copy(P); band.quaternion.setFromUnitVectors(Z, T); g.add(band); });
    /* 키 하나: 키컵(테두리) + 진주 단추 + 받침 기둥 */
    const key = (pos, r, withPearl = true) => {
      const k = new THREE.Group(); k.position.copy(pos);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 32), goldDark); cup.rotation.x = Math.PI / 2; k.add(cup);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0035, 8, 32), goldBright); lip.position.z = 0.006; k.add(lip);
      if (withPearl) { const p = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.56, 0.012, 24), pearl); p.rotation.x = Math.PI / 2; p.position.z = 0.012; k.add(p); }
      g.add(k); return k;
    };
    /* 왼손 3개(위), 오른손 3개(아래) + 옆 키 */
    [1.02, 0.91, 0.8].forEach((y, i) => key(new THREE.Vector3(i % 2 ? 0.006 : -0.006, y, 0.064), 0.024));
    [0.64, 0.53, 0.42].forEach((y, i) => key(new THREE.Vector3(i % 2 ? -0.006 : 0.006, y, 0.065), 0.026));
    [[0.03, 1.1], [-0.03, 0.72], [0.034, 0.3]].forEach(([x, y]) => key(new THREE.Vector3(x, y, 0.062), 0.014, false));
    /* 활대 막대와 고정 기둥 */
    const rodMat = goldBright;
    const rodCurve = new THREE.CatmullRomCurve3([0.15, 0.22, 0.3, 0.38, 0.46, 0.54, 0.6, 0.66, 0.7].map((t) => { const p = at(t, 0.018); p.x += 0.036; return p; }));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(rodCurve, 90, 0.0046, 10, false), rodMat));
    const rod2 = new THREE.CatmullRomCurve3([0.16, 0.26, 0.36, 0.46, 0.56].map((t) => { const p = at(t, 0.022); p.x -= 0.034; return p; }));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(rod2, 70, 0.0042, 10, false), rodMat));
    [0.18, 0.28, 0.38, 0.48, 0.58].forEach((t) => { const b = at(t, 0.0), p = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0075, 0.036, 12), goldDark); p.rotation.x = Math.PI / 2; p.position.set(b.x + 0.036, b.y, b.z + 0.0); g.add(p); });
    /* 아래쪽 활과 벨의 키(저음키)와 가드 */
    [0.67, 0.72, 0.77].forEach((t, i) => { const p = at(t, 0.012); p.x += 0.0; key(p, 0.03 - i * 0.002, i !== 1); });
    const brace = new THREE.CatmullRomCurve3([0.54, 0.62, 0.7, 0.78, 0.84].map((t) => { const p = at(t, 0.03); p.x += 0.0; return p; }));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(brace, 60, 0.0042, 10, false), rodMat));
    /* 벨과 몸통을 잇는 지지대(브레이스) */
    const b0 = curve.getPointAt(0.46), b1 = curve.getPointAt(0.86), bz = new THREE.CatmullRomCurve3([new THREE.Vector3(b0.x - 0.0, b0.y, -rf(0.46) - 0.004), new THREE.Vector3((b0.x + b1.x) / 2 + 0.02, (b0.y + b1.y) / 2, -0.07), new THREE.Vector3(b1.x - 0.02, b1.y, -rf(0.86) - 0.004)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(bz, 40, 0.0075, 10, false), goldDark));
    /* 뒤쪽: 엄지 걸이, 스트랩 고리, 엄지 받침 */
    const sr = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0065, 12, 28), goldBright); sr.position.set(0, 0.88, -0.062); sr.rotation.y = Math.PI / 2; g.add(sr);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0075, 12, 28, Math.PI * 1.25), goldDark); hook.position.set(0, 0.74, -0.064); hook.rotation.y = Math.PI / 2; g.add(hook);
    const rest = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.018, 20), padM); rest.rotation.x = Math.PI / 2; rest.position.set(0, 0.97, -0.066); g.add(rest);
    /* 목(넥): 옥타브 키, 코르크, 마우스피스, 리가추어와 나사 */
    const ok = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.012, 16), pearl); ok.position.copy(at(0.1, 0.012)); ok.rotation.x = Math.PI / 2; g.add(ok);
    const okc = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 18), goldDark); okc.position.copy(at(0.1, 0.004)); okc.rotation.x = Math.PI / 2; g.add(okc);
    const P0 = curve.getPointAt(0), T0 = curve.getTangentAt(0);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.045, 18), padM); cork.position.copy(P0).addScaledVector(T0, -0.018); cork.quaternion.setFromUnitVectors(Y, T0); g.add(cork);
    const mp = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.022, 0.13, 28), black); mp.position.copy(P0).addScaledVector(T0, -0.07); mp.quaternion.setFromUnitVectors(Y, T0.clone().negate()); g.add(mp);
    const lig = new THREE.Mesh(new THREE.CylinderGeometry(0.0235, 0.0235, 0.03, 28, 1, true), goldBright); lig.position.copy(P0).addScaledVector(T0, -0.055); lig.quaternion.setFromUnitVectors(Y, T0); g.add(lig);
    [-1, 1].forEach((sx) => { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.014, 10), goldDark); sc.position.copy(P0).addScaledVector(T0, -0.055); sc.position.z += 0.0; const side = new THREE.Vector3().crossVectors(T0, Z).normalize().multiplyScalar(0.026 * sx); sc.position.add(side); sc.quaternion.setFromUnitVectors(Y, side.clone().normalize()); g.add(sc); });
    /* 정중앙 정렬 */
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()); g.position.set(-c.x, -c.y, -c.z);
    const pivot = new THREE.Group(); pivot.add(g); return pivot;
  }
  function initSax() {
    const cv = $('#sax3dCv'); if (!cv) return;
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const sax = buildSax(); scene.add(sax);
    const halo = (function () { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,196,96,.55)'); gr.addColorStop(0.45, 'rgba(210,140,50,.18)'); gr.addColorStop(1, 'rgba(120,70,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(0, 0, -0.9); return m; })();
    scene.add(halo);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.04, 64), new THREE.MeshStandardMaterial({ color: 0x0c0906, metalness: 0.7, roughness: 0.5, envMap: env, envMapIntensity: 0.28 })); stand.position.y = -0.84; scene.add(stand);
    const standRing = new THREE.Mesh(new THREE.TorusGeometry(0.575, 0.006, 8, 96), new THREE.MeshBasicMaterial({ color: 0xe8cc7a })); standRing.rotation.x = Math.PI / 2; standRing.position.y = -0.82; scene.add(standRing);
    const key = new THREE.DirectionalLight(0xffe2b0, 2.2); key.position.set(2.5, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb0ff, 1.4); rim.position.set(-3, 1.5, -2.5); scene.add(rim);
    const sec = $('#sax3d'); let drag = false, lx = 0, spin = 0, vel = 0;
    cv.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const d = e.clientX - lx; lx = e.clientX; spin += d * 0.012; vel = d * 0.012; });
    const up = () => { drag = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    reg(cv, { scene, camera, update(t, dt) {
      const p = progressOf(sec); if (!drag) { spin += vel; vel *= 0.94; }
      sax.rotation.y = -0.5 + p * 7.0 + spin + ptr.x * 0.35; sax.rotation.x = ptr.y * 0.12 + Math.sin(t * 0.7) * 0.03; sax.position.y = 0.06 + Math.sin(t * 0.9) * 0.025;
      camera.aspect = cv.width / cv.height; const d = camera.aspect < 0.85 ? 5.2 : 3.5; camera.position.set(0, 0.2, d); camera.lookAt(0, -0.02, 0);
    } });
  }

  /* =====================================================================
     2) 연보 터널: 스크롤하면 카메라가 사진 액자들 사이를 날아간다
     ===================================================================== */
  function yearTex(txt) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const g = c.getContext('2d');
    g.font = '700 300px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const gr = g.createLinearGradient(0, 60, 0, 340); gr.addColorStop(0, '#f4dc92'); gr.addColorStop(0.5, '#c9a84c'); gr.addColorStop(1, '#6e5217');
    let size = 300; while (g.measureText(txt).width > 960 && size > 120) { size -= 20; g.font = '700 ' + size + 'px "Cormorant Garamond", serif'; }
    g.fillStyle = gr; g.globalAlpha = 0.9; g.fillText(txt, 512, 200); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function cardTex(year, ko, en) {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 900; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 1600, 900); bg.addColorStop(0, '#1a140b'); bg.addColorStop(1, '#0a0806'); g.fillStyle = bg; g.fillRect(0, 0, 1600, 900);
    g.strokeStyle = 'rgba(201,168,76,.75)'; g.lineWidth = 4; g.strokeRect(44, 44, 1512, 812); g.lineWidth = 1.5; g.strokeRect(66, 66, 1468, 768);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 560px "Cormorant Garamond", serif'; g.fillStyle = 'rgba(201,168,76,.07)'; g.fillText(year.slice(0, 4), 800, 470);
    g.fillStyle = '#e8cc7a'; g.font = '600 34px Archivo, sans-serif'; g.fillText(year.split('').join(' '), 800, 190);
    g.fillStyle = '#f2ede4'; g.font = '500 92px "Noto Serif KR", serif';
    const words = ko.split(' '), lines = ['']; words.forEach((w) => { const l = lines[lines.length - 1]; if (g.measureText(l + ' ' + w).width > 1260 && l) lines.push(w); else lines[lines.length - 1] = (l ? l + ' ' : '') + w; });
    const y0 = 450 - (lines.length - 1) * 62; lines.forEach((l, i) => g.fillText(l, 800, y0 + i * 124));
    g.fillStyle = '#a39d92'; g.font = 'italic 500 44px "Cormorant Garamond", serif'; g.fillText(en, 800, 700);
    g.fillStyle = '#c9a84c'; g.font = '30px serif'; g.fillText('✦', 800, 780);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function initTimeline() {
    const sec = $('#timeline'), cv = $('#tl3d'); if (!sec || !cv) return;
    const data = $$('#tlData li').map((li) => ({ y: li.dataset.y, ko: li.dataset.ko, en: li.dataset.en, img: li.dataset.img }));
    const N = data.length, SP = 8.2;
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x070605, 0.05); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    const H = 2.5, frames = [];
    data.forEach((d, i) => {
      const side = i % 2 ? 1 : -1, g = new THREE.Group(); g.position.set(side * 2.15, ((i % 3) - 1) * 0.28, -i * SP); g.rotation.y = -side * 0.3;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 })); frame.position.z = -0.02; g.add(frame);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x1a1612 })); g.add(pic);
      const setA = (a) => { const w = clamp(a, 0.62, 2.2) * H; pic.scale.set(w, H, 1); frame.scale.set(w + 0.16, H + 0.16, 1); };
      setA(1.6); if (d.img === 'card') { document.fonts.ready.then(() => { const t = cardTex(d.y, d.ko, d.en); pic.material.dispose(); pic.material = new THREE.MeshBasicMaterial({ map: t }); setA(1.78); }); } else loadTex(d.img, (t) => { pic.material.dispose(); pic.material = new THREE.MeshBasicMaterial({ map: t }); setA(t.image.width / t.image.height); });
      scene.add(g);
      const yr = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.03), new THREE.MeshBasicMaterial({ map: yearTex(d.y), transparent: true, depthWrite: false }));
      yr.position.set(-side * 2.7, 0.15, -i * SP - 0.8); yr.rotation.y = side * 0.16; scene.add(yr);
      frames.push({ g, yr });
    });
    /* 황금 먼지 */
    const dc = document.createElement('canvas'); dc.width = dc.height = 64; { const x = dc.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,150,1)'); gr.addColorStop(1, 'rgba(255,230,150,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    const pn = 520, pp = new Float32Array(pn * 3); for (let i = 0; i < pn; i++) { pp[i * 3] = (Math.random() - 0.5) * 12; pp[i * 3 + 1] = (Math.random() - 0.5) * 6; pp[i * 3 + 2] = 8 - Math.random() * (N * SP + 10); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.12, map: new THREE.CanvasTexture(dc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd98a, opacity: 0.8 })); scene.add(dust);
    /* 바닥(윤이 나는 어두운 판)과 금빛 레일, 중앙 점선: 터널의 깊이감 */
    const len = N * SP + 24, floor = new THREE.Mesh(new THREE.PlaneGeometry(9, len), new THREE.MeshStandardMaterial({ color: 0x0b0906, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.5 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -1.6, 8 - len / 2); scene.add(floor);
    [-1.05, 1.05].forEach((x) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, len), new THREE.MeshBasicMaterial({ color: 0xc9a84c })); rail.position.set(x, -1.58, 8 - len / 2); scene.add(rail); });
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.7), new THREE.MeshBasicMaterial({ color: 0xe8cc7a }), Math.floor(len / 1.6)); { const m = new THREE.Matrix4(); for (let i = 0; i < dash.count; i++) { m.setPosition(0, -1.59, 7 - i * 1.6); dash.setMatrixAt(i, m); } } scene.add(dash);
    /* 카메라와 함께 나는 작은 3D 색소폰 */
    const mini = buildSax(); mini.scale.setScalar(0.3); mini.position.set(1.15, -0.82, -2.9); camera.add(mini); scene.add(camera);
    const endBtn = $('#tlEnd');
    const ky = $('#tlYear'), kk = $('#tlKo'), ke = $('#tlEn'), kb = $('#tlBar'), kn = $('#tlNo'), box = $('#tlTxt'); let cur = -1;
    const key = new THREE.DirectionalLight(0xffe0b0, 1.5); key.position.set(2, 3, 5); scene.add(key); scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    reg(cv, { scene, camera, init() {}, onresize(w, h) { camera.fov = w / h < 0.9 ? 62 : 46; camera.updateProjectionMatrix(); },
      update(t, dt) {
        const r = sec.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight)), f = p * (N - 1), narrow = camera.aspect < 0.9;
        const z = 4.6 - f * SP; camera.position.set(Math.sin(f * 1.05) * 0.55, 0.12 + Math.sin(f * 0.7) * 0.18, z); camera.lookAt(Math.sin(f * 1.05 + 0.6) * 0.5, 0, z - 6); camera.rotation.z += Math.sin(f * 1.05 + 1.1) * 0.035;
        frames.forEach((o, i) => { o.g.rotation.y = -(i % 2 ? 1 : -1) * (narrow ? 0.22 : 0.3); o.g.position.x = (i % 2 ? 1 : -1) * (narrow ? 1.25 : 2.15); o.yr.position.x = -(i % 2 ? 1 : -1) * (narrow ? 1.2 : 2.7); o.yr.position.y = narrow ? 1.9 : 0.15; });
        dust.position.y = Math.sin(t * 0.25) * 0.15; dust.rotation.z = t * 0.01;
        frames.forEach((o, i) => { o.g.position.y = ((i % 3) - 1) * 0.28 + Math.sin(t * 0.6 + i * 1.7) * 0.08; });
        mini.rotation.y = t * 0.7; mini.rotation.z = Math.sin(t * 0.9) * 0.08; mini.position.y = -0.82 + Math.sin(t * 1.1) * 0.04;
        endBtn && endBtn.classList.toggle('on', p > 0.955);
        const idx = clamp(Math.round(f), 0, N - 1);
        if (idx !== cur) { cur = idx; box.classList.remove('in'); setTimeout(() => { ky.textContent = data[idx].y; kk.textContent = data[idx].ko; ke.textContent = data[idx].en; kn.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0'); box.classList.add('in'); }, 140); }
        kb.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      } });
  }

  /* =====================================================================
     3) 링 갤러리: 사진이 둘러선 3D 원통. 드래그로 돌리고, 누르면 크게 보인다
     ===================================================================== */
  function initRing() {
    const cv = $('#ring3d'); if (!cv) return;
    const figs = $$('.beyond .grid figure'); if (!figs.length) return;
    const N = figs.length, R = (1.9 + 0.55) * N / (Math.PI * 2), H = 1.2, BW = 0.085;
    const scene = new THREE.Scene(); scene.environment = env; scene.fog = new THREE.Fog(0x090807, R + 3, R + 12);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const ring = new THREE.Group(); scene.add(ring);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xd9a52e, metalness: 1, roughness: 0.26, envMapIntensity: 1.4 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xc89a30, metalness: 1, roughness: 0.36, envMapIntensity: 1.1 });
    /* 진짜 3D 액자: 사각 테두리를 두께 있게 압출하고 모서리를 둥글게 깎는다 */
    const frameGeo = (w, h) => {
      const ow = w / 2 + BW, oh = h / 2 + BW, sh = new THREE.Shape(); sh.moveTo(-ow, -oh); sh.lineTo(ow, -oh); sh.lineTo(ow, oh); sh.lineTo(-ow, oh); sh.closePath();
      const hole = new THREE.Path(); hole.moveTo(-w / 2, -h / 2); hole.lineTo(-w / 2, h / 2); hole.lineTo(w / 2, h / 2); hole.lineTo(w / 2, -h / 2); hole.closePath(); sh.holes.push(hole);
      return new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.022, bevelSegments: 3, curveSegments: 1 });
    };
    const plaqueTex = (txt) => { const c = document.createElement('canvas'); c.width = 512; c.height = 80; const g = c.getContext('2d'); g.font = '600 40px "Noto Serif KR", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2606'; let t = txt; while (g.measureText(t).width > 470 && t.length > 4) t = t.slice(0, -1); g.fillText(t === txt ? t : t + '…', 256, 42); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
    const planes = [], cap = $('#ringCap');
    figs.forEach((f, i) => {
      const b = $('button', f), im = $('img', f), th = i / N * Math.PI * 2, label = $('figcaption', f).textContent;
      const grp = new THREE.Group(); grp.position.set(Math.sin(th) * R, 0, Math.cos(th) * R); grp.rotation.y = th;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x1a1612 })); grp.add(pic);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, metalness: 0.6, roughness: 0.05, envMapIntensity: 2.4, depthWrite: false })); glass.position.z = 0.03; grp.add(glass);
      let frame = null;
      const setA = (a) => { const w = clamp(a, 0.7, 2.0) * H; pic.scale.set(w, H, 1); glass.scale.set(w, H, 1); if (frame) { grp.remove(frame); frame.geometry.dispose(); } frame = new THREE.Mesh(frameGeo(w, H), frameMat); frame.position.z = -0.045; grp.add(frame); };
      const py = -(H / 2 + BW + 0.2), plate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.04), plateMat); plate.position.set(0, py, 0); grp.add(plate);
      const txt = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.15), new THREE.MeshBasicMaterial({ map: plaqueTex(label), transparent: true })); txt.position.set(0, py, 0.022); grp.add(txt);
      setA(1.5); const o = { grp, pic, i, src: b.dataset.lb, alt: im.alt, cap: label, hov: 0 }; planes.push(o); ring.add(grp);
      o.load = () => loadTex(b.dataset.lb, (t) => { pic.material.dispose(); pic.material = new THREE.MeshBasicMaterial({ map: t }); setA(t.image.width / t.image.height); });
    });
    /* 금테 두른 회전 무대 */
    const deckY = -(H / 2 + BW + 0.2 + 0.2);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.68, 0.12, 160), new THREE.MeshStandardMaterial({ color: 0x0d0a07, metalness: 0.8, roughness: 0.42, envMapIntensity: 0.6 })); deck.position.y = deckY - 0.06; scene.add(deck);
    const rim1 = new THREE.Mesh(new THREE.TorusGeometry(R + 0.64, 0.028, 12, 200), frameMat); rim1.rotation.x = Math.PI / 2; rim1.position.y = deckY; scene.add(rim1);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(R - 0.5, 0.012, 8, 200), frameMat); rim2.rotation.x = Math.PI / 2; rim2.position.y = deckY + 0.005; scene.add(rim2);
    const key = new THREE.DirectionalLight(0xffe6b8, 2.2); key.position.set(2, 4, 7); scene.add(key); const rimL = new THREE.DirectionalLight(0x9ab4ff, 0.9); rimL.position.set(-4, 2, -3); scene.add(rimL); scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    let rot = 0, vel = 0, drag = false, lx = 0, moved = 0, hover = null, auto = 0.1; const ray = new THREE.Raycaster(), nd = new THREE.Vector2(5, 5);
    cv.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; moved = 0; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); nd.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); if (drag) { const d = e.clientX - lx; lx = e.clientX; moved += Math.abs(d); rot += d * 0.0055; vel = d * 0.0055; } });
    cv.addEventListener('pointerleave', () => { nd.set(5, 5); });
    const end = () => { if (drag && moved < 6 && hover) lightbox(hover.src, hover.alt); drag = false; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { drag = false; });
    reg(cv, { scene, camera, init() { planes.forEach((o) => o.load()); }, onresize(w, h) { camera.fov = w / h < 0.9 ? 54 : 30; camera.updateProjectionMatrix(); },
      update(t, dt) {
        if (!drag) { rot += vel; vel *= 0.93; if (Math.abs(vel) < 0.0005 && !hover && !reduce) rot += auto * dt; }
        ring.rotation.y = rot; camera.position.set(0, 0.42, R + (camera.aspect < 0.9 ? 3.6 : 5.4)); camera.lookAt(0, -0.1, R * 0.92);
        ray.setFromCamera(nd, camera); const hit = ray.intersectObjects(planes.map((o) => o.pic), false)[0]; const ho = hit ? planes.find((o) => o.pic === hit.object) : null;
        if (ho !== hover) { hover = ho; cv.style.cursor = hover ? 'pointer' : 'grab'; if (cap) cap.textContent = hover ? hover.cap : '드래그해서 돌려 보세요 · 사진을 누르면 크게 보입니다'; }
        planes.forEach((o) => { o.hov = lerp(o.hov, o === hover ? 1 : 0, 0.15); o.grp.scale.setScalar(1 + o.hov * 0.12); o.grp.position.setLength(R + o.hov * 0.28); o.grp.position.y = Math.sin(t * 0.7 + o.i * 1.1) * 0.025; });
      } });
  }

  /* =====================================================================
     4) 메달: 수상 6개가 도는 3D 금메달 캐러셀
     ===================================================================== */
  function medalTex(b, title) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(220, 170, 30, 256, 256, 270); gr.addColorStop(0, '#fbe6a0'); gr.addColorStop(0.55, '#d8a63c'); gr.addColorStop(1, '#8e6119'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(80,48,8,.55)'; g.lineWidth = 7; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(256, 256, 214, 0, 7); g.stroke();
    g.fillStyle = '#5a3a08'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 30px Archivo, sans-serif'; g.fillText('A R I S   K I M', 256, 118);
    let fs = 170; g.font = '700 ' + fs + 'px "Cormorant Garamond", serif'; while (g.measureText(b).width > 330 && fs > 80) { fs -= 10; g.font = '700 ' + fs + 'px "Cormorant Garamond", serif'; }
    g.fillStyle = 'rgba(255,245,200,.55)'; g.fillText(b, 258, 262); g.fillStyle = '#5a3a08'; g.fillText(b, 256, 258);
    g.font = '500 31px "Noto Serif KR", serif'; const words = title.split(' '), lines = ['']; words.forEach((w) => { const l = lines[lines.length - 1]; if (g.measureText(l + ' ' + w).width > 330 && l) lines.push(w); else lines[lines.length - 1] = (l ? l + ' ' : '') + w; });
    lines.slice(0, 2).forEach((l, i) => g.fillText(l, 256, 372 + i * 38)); g.font = '28px serif'; g.fillText('✦  ✦  ✦', 256, 452);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  /* 새김(엠보싱): 같은 글자를 흑백 높이 지도로 그려 빛이 비칠 때 실제로 파인 듯 보이게 한다 */
  function medalBump(b, title) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 214, 0, 7); g.stroke();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 30px Archivo, sans-serif'; g.fillText('A R I S   K I M', 256, 118);
    let fs = 170; g.font = '700 ' + fs + 'px "Cormorant Garamond", serif'; while (g.measureText(b).width > 330 && fs > 80) { fs -= 10; g.font = '700 ' + fs + 'px "Cormorant Garamond", serif'; } g.fillText(b, 256, 258);
    g.font = '500 31px "Noto Serif KR", serif'; const words = title.split(' '), lines = ['']; words.forEach((w) => { const l = lines[lines.length - 1]; if (g.measureText(l + ' ' + w).width > 330 && l) lines.push(w); else lines[lines.length - 1] = (l ? l + ' ' : '') + w; });
    lines.slice(0, 2).forEach((l, i) => g.fillText(l, 256, 372 + i * 38)); g.font = '28px serif'; g.fillText('✦  ✦  ✦', 256, 452);
    return new THREE.CanvasTexture(c);
  }
  function initMedals() {
    const cv = $('#medal3d'); if (!cv) return;
    const rows = $$('.alist li').map((li) => ({ b: $('b', li).textContent, t: $('span', li).textContent, d: $('em', li).textContent })); if (!rows.length) return;
    const N = rows.length, R = 3.0;
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    const ring = new THREE.Group(); scene.add(ring);
    const gold = new THREE.MeshStandardMaterial({ color: 0xdfa93a, metalness: 1, roughness: 0.24, envMapIntensity: 1.5 });
    const goldDark = new THREE.MeshStandardMaterial({ color: 0xa86f1c, metalness: 1, roughness: 0.36, envMapIntensity: 1.2 });
    const rib = new THREE.MeshStandardMaterial({ color: 0x8a1d22, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
    /* 진짜 3D 동전: 테두리가 솟고 가운데가 살짝 들어간 회전체 단면을 돌려서 만든다 */
    const prof = [[0.001, 0.06], [0.64, 0.055], [0.67, 0.085], [0.86, 0.085], [0.915, 0.112], [0.95, 0.085], [0.96, 0], [0.95, -0.085], [0.915, -0.112], [0.86, -0.085], [0.67, -0.085], [0.64, -0.055], [0.001, -0.06]].map((p) => new THREE.Vector2(p[0], p[1]));
    const coinGeo = new THREE.LatheGeometry(prof, 112);
    const ribbonGeo = () => { const g = new THREE.PlaneGeometry(0.3, 1.5, 4, 30), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.04 * Math.sin(p.getY(i) * 5.2 + p.getX(i) * 4)); g.computeVertexNormals(); return g; };   /* 천 주름 */
    const medals = [];
    rows.forEach((r, i) => {
      const th = i / N * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.sin(th) * R, 0, Math.cos(th) * R); g.rotation.y = th;
      const tex = medalTex(r.b, r.t), bump = medalBump(r.b, r.t);
      const faceMat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: 3.2, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 });
      const coin = new THREE.Mesh(coinGeo, gold); coin.rotation.x = Math.PI / 2; g.add(coin);
      const front = new THREE.Mesh(new THREE.CircleGeometry(0.645, 96), faceMat); front.position.z = 0.058; g.add(front);
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.645, 96), faceMat); back.position.z = -0.058; back.rotation.y = Math.PI; g.add(back);
      const cr = new THREE.Group(); g.add(cr);
      const rl = new THREE.Mesh(ribbonGeo(), rib), rr = new THREE.Mesh(ribbonGeo(), rib); rl.position.set(-0.11, 1.62, 0); rl.rotation.z = 0.15; rr.position.set(0.11, 1.62, 0); rr.rotation.z = -0.15; cr.add(rl, rr);
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.024, 14, 32), gold); loop.position.set(0, 1.05, 0); cr.add(loop);
      const link = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.12, 20), goldDark); link.position.set(0, 0.98, 0); cr.add(link);
      medals.push({ g, r, cr }); ring.add(g);
    });
    /* 받침대: 어두운 금속 원판 + 금 테두리 */
    const baseY = -1.35;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.05, R + 1.15, 0.14, 160), new THREE.MeshStandardMaterial({ color: 0x0d0a07, metalness: 0.85, roughness: 0.38, envMapIntensity: 0.7 })); base.position.y = baseY; scene.add(base);
    const baseRim = new THREE.Mesh(new THREE.TorusGeometry(R + 1.1, 0.03, 12, 200), gold); baseRim.rotation.x = Math.PI / 2; baseRim.position.y = baseY + 0.07; scene.add(baseRim);
    const key = new THREE.DirectionalLight(0xffe6b8, 2.2); key.position.set(2, 4, 6); scene.add(key); const sideL = new THREE.DirectionalLight(0xffc878, 1.1); sideL.position.set(-4, 1, 3); scene.add(sideL); scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    let rot = 0, target = 0, drag = false, lx = 0, hoverTimer = 0, active = -1;
    const cap = $('#medalCap'), setCap = (i) => { if (!cap) return; cap.classList.remove('in'); setTimeout(() => { cap.querySelector('b').textContent = rows[i].b; cap.querySelector('strong').textContent = rows[i].t; cap.querySelector('em').textContent = rows[i].d; cap.classList.add('in'); }, 120); };
    cv.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const d = e.clientX - lx; lx = e.clientX; target -= d * 0.006; });
    const stop = () => { drag = false; target = Math.round(target / (Math.PI * 2 / N)) * (Math.PI * 2 / N); }; cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);
    cv.addEventListener('pointerenter', () => { hoverTimer = 1; }); cv.addEventListener('pointerleave', () => { hoverTimer = 0; });
    let clock = 0;
    reg(cv, { scene, camera, update(t, dt) {
      if (!drag && !hoverTimer && !reduce) { clock += dt; if (clock > 3.4) { clock = 0; target += Math.PI * 2 / N; } }
      rot = lerp(rot, target, 1 - Math.pow(0.001, dt)); ring.rotation.y = -rot;
      const idx = ((Math.round(rot / (Math.PI * 2 / N)) % N) + N) % N; if (idx !== active) { active = idx; setCap(idx); }
      camera.position.set(ptr.x * 0.5, 0.45 - ptr.y * 0.2, R + 6.6 + (camera.aspect < 0.9 ? 3 : 0)); camera.lookAt(0, -0.1, R * 0.9);
      medals.forEach((m, i) => { m.g.position.y = Math.sin(t * 1.1 + i * 1.3) * 0.05; m.cr.rotation.z = Math.sin(t * 1.3 + i) * 0.04; m.g.rotation.x = Math.sin(t * 0.9 + i) * 0.03; });
    } });
  }

  /* =====================================================================
     5) 공연 의뢰: 봉투가 열리고 금빛 티켓이 올라온다
     ===================================================================== */
  function ticketTex() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 560; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 1200, 560); gr.addColorStop(0, '#f6dc8e'); gr.addColorStop(0.5, '#d9aa40'); gr.addColorStop(1, '#a8741f'); g.fillStyle = gr; g.fillRect(0, 0, 1200, 560);
    g.strokeStyle = 'rgba(70,42,6,.7)'; g.lineWidth = 6; g.strokeRect(26, 26, 1148, 508); g.lineWidth = 2; g.strokeRect(44, 44, 1112, 472);
    g.fillStyle = '#4a2f06'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 38px Archivo, sans-serif'; g.fillText('A D M I T   O N E', 560, 110);
    g.font = '700 150px "Cormorant Garamond", serif'; g.fillText('ARIS KIM', 560, 235);
    g.font = '500 44px "Noto Serif KR", serif'; g.fillText('LIVE · 색소폰 · 미디어아트 · 탱고', 560, 355);
    g.font = '400 32px "Noto Serif KR", serif'; g.fillText('비어 있어서, 울렸습니다.', 560, 430);
    g.font = '500 28px Archivo, sans-serif'; g.fillText('ARISHOW@NAVER.COM   ·   010-4251-1212', 560, 490);
    g.setLineDash([10, 12]); g.beginPath(); g.moveTo(930, 40); g.lineTo(930, 520); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.repeat.set(1 / 2.3, 1 / 1.07); t.offset.set(0.5, 0.5);   /* 압출한 티켓 면의 좌표(-1.15~1.15, -0.535~0.535)에 맞춤 */
    return t;
  }
  function liningTex() {   /* 봉투 안감: 어두운 붉은 바탕에 금빛 마름모 무늬 */
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#2b1209'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(214,170,70,.55)'; g.lineWidth = 2; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 256, 256); g.moveTo(i * 64 + 256, 0); g.lineTo(i * 64, 256); g.stroke(); }
    g.fillStyle = 'rgba(214,170,70,.7)'; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { g.beginPath(); g.arc(x * 64 + 32, y * 64 + 32, 4, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function sealTex(bump) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    if (bump) { g.fillStyle = '#707070'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke(); g.fillStyle = '#fff'; }
    else { const gr = g.createRadialGradient(100, 90, 10, 128, 128, 140); gr.addColorStop(0, '#f6dc8e'); gr.addColorStop(0.6, '#d19a2c'); gr.addColorStop(1, '#8a5c14'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(90,56,8,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke(); g.fillStyle = '#5a3a08'; }
    g.font = '700 150px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', 128, 138);
    const t = new THREE.CanvasTexture(c); if (!bump) t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function initEnvelope() {
    const cv = $('#env3d'); if (!cv) return;
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    const W = 2.6, Hh = 1.6, root = new THREE.Group(); scene.add(root);
    const dark = new THREE.MeshStandardMaterial({ color: 0x15110c, metalness: 0.5, roughness: 0.42, envMapIntensity: 0.9 });
    const goldM = new THREE.MeshStandardMaterial({ color: 0xd8a63a, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 });
    const ex = (shape, depth, bev) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
    const rect = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2, h / 2); sh.closePath(); return sh; };
    /* 바닥 그림자 */
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; { const x = sc.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -1.22, 0); scene.add(shadow);
    /* 봉투 몸통(두께 있는 뒷판) + 안감 + 앞주머니(V자 열림) */
    const back = new THREE.Mesh(ex(rect(W, Hh), 0.03, 0.01), dark); back.position.z = -0.03; root.add(back);
    const lin = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, Hh - 0.08), new THREE.MeshStandardMaterial({ map: liningTex(), roughness: 0.7, metalness: 0.2 })); lin.position.z = 0.012; root.add(lin);
    const pocket = new THREE.Shape(); pocket.moveTo(-W / 2, -Hh / 2); pocket.lineTo(W / 2, -Hh / 2); pocket.lineTo(W / 2, Hh / 2); pocket.lineTo(0, 0.02); pocket.lineTo(-W / 2, Hh / 2); pocket.closePath();
    const front = new THREE.Mesh(ex(pocket, 0.012, 0.008), dark); front.position.z = 0.044; root.add(front);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ShapeGeometry(pocket)), new THREE.LineBasicMaterial({ color: 0xd8a63a })); edge.position.z = 0.066; root.add(edge);
    /* 티켓: 천공선 홈이 있는 금속 종이, 살짝 휘어 있다 */
    const ts = new THREE.Shape(); ts.moveTo(-1.15, -0.535); ts.lineTo(0.745, -0.535); ts.absarc(0.8, -0.535, 0.055, Math.PI, 0, true); ts.lineTo(1.15, -0.535); ts.lineTo(1.15, 0.535); ts.lineTo(0.855, 0.535); ts.absarc(0.8, 0.535, 0.055, 0, Math.PI, true); ts.lineTo(-1.15, 0.535); ts.closePath();
    const tg = new THREE.ExtrudeGeometry(ts, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 1, curveSegments: 10 });
    { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.05 * Math.cos(p.getX(i) * 1.3)); tg.computeVertexNormals(); }
    const ticket = new THREE.Mesh(tg, [new THREE.MeshStandardMaterial({ map: ticketTex(), metalness: 0.55, roughness: 0.4, envMapIntensity: 0.9 }), new THREE.MeshStandardMaterial({ color: 0xb9852a, metalness: 1, roughness: 0.4 })]); ticket.position.set(0, -0.1, 0.026); root.add(ticket);
    /* 덮개: 두께 있는 삼각형 + 안쪽 안감 + 금 봉인 */
    const hingeG = new THREE.Group(); hingeG.position.set(0, Hh / 2, 0.06); root.add(hingeG);
    const flapS = new THREE.Shape(); flapS.moveTo(-W / 2, 0); flapS.lineTo(W / 2, 0); flapS.lineTo(0, -Hh / 2 - 0.02); flapS.closePath();
    const flap = new THREE.Mesh(ex(flapS, 0.008, 0.006), dark); hingeG.add(flap);
    const flapIn = new THREE.Mesh(new THREE.ShapeGeometry(flapS), new THREE.MeshStandardMaterial({ map: liningTex(), roughness: 0.7, metalness: 0.2, side: THREE.BackSide })); flapIn.position.z = -0.004; hingeG.add(flapIn);
    const flapEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ShapeGeometry(flapS)), new THREE.LineBasicMaterial({ color: 0xd8a63a })); flapEdge.position.z = 0.016; hingeG.add(flapEdge);
    const seal = new THREE.Group(); seal.position.set(0, -Hh / 2 + 0.2, 0.03); hingeG.add(seal);
    const sealBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.05, 40), goldM); sealBody.rotation.x = Math.PI / 2; seal.add(sealBody);
    const sealFace = new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), new THREE.MeshStandardMaterial({ map: sealTex(false), bumpMap: sealTex(true), bumpScale: 3, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 })); sealFace.position.z = 0.0265; seal.add(sealFace);
    /* 열릴 때 피어오르는 금빛 입자 */
    const dc = document.createElement('canvas'); dc.width = dc.height = 64; { const x = dc.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,232,160,1)'); gr.addColorStop(1, 'rgba(255,232,160,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    const SN = 70, sp = new Float32Array(SN * 3), sph = new Float32Array(SN * 2); for (let i = 0; i < SN; i++) { sph[i * 2] = Math.random(); sph[i * 2 + 1] = (Math.random() - 0.5) * 2; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.09, map: new THREE.CanvasTexture(dc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd98a, opacity: 0 })); root.add(sparks);
    const key = new THREE.DirectionalLight(0xffe4b4, 2.0); key.position.set(2, 3, 5); scene.add(key); const fillL = new THREE.DirectionalLight(0xffc070, 0.8); fillL.position.set(-3, 0, 3); scene.add(fillL); scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    let o = 0;
    reg(cv, { scene, camera, update(t, dt) {
      const r = cv.getBoundingClientRect(), vis = clamp((innerHeight * 0.92 - r.top) / (innerHeight * 0.45)); o = lerp(o, vis, 1 - Math.pow(0.004, dt));
      const k1 = sstep(0.0, 0.5, o), k2 = sstep(0.4, 1.0, o);
      hingeG.rotation.x = -k1 * Math.PI * 0.94; ticket.position.y = -0.1 + k2 * 1.15; ticket.position.z = 0.026 + k2 * 0.02; ticket.rotation.z = Math.sin(t * 0.9) * 0.02 * k2;
      for (let i = 0; i < SN; i++) { const ph = (t * 0.35 + sph[i * 2]) % 1; sp[i * 3] = sph[i * 2 + 1] * 1.1 * (0.4 + ph); sp[i * 3 + 1] = 0.1 + ph * 1.8; sp[i * 3 + 2] = 0.1 + Math.sin(ph * 6 + i) * 0.15; } sg.attributes.position.needsUpdate = true; sparks.material.opacity = k2 * 0.9;
      root.rotation.y = ptr.x * 0.35 + Math.sin(t * 0.5) * 0.06; root.rotation.x = -0.18 + ptr.y * 0.15; root.position.y = -0.35 + Math.sin(t * 0.8) * 0.04;
      camera.position.set(0, 0.2, camera.aspect < 0.9 ? 6.6 : 4.9); camera.lookAt(0, 0.3, 0);
    } });
  }

  /* =====================================================================
     7) 머리가 비었다: 투명한 유리 머리 -> 금빛이 흘러들어 채우고 -> 입에서 소리가 나고 -> 별처럼 흩어진다
     ===================================================================== */
  function initEmpty() {
    const sec = $('#empty'), cv = $('#empty3d'); if (!sec || !cv) return;
    const steps = $$('#emData li').map((li) => ({ t: li.dataset.t, b: li.dataset.b })), N = steps.length;
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const headGeo = new THREE.SphereGeometry(1, 24, 18); { const p = headGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 0.097, p.getY(i) * 0.15, p.getZ(i) * 0.115); headGeo.computeVertexNormals(); }
    fetch('models/head.json').then((r) => r.json()).then((d) => { headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.p), 3)); headGeo.setIndex(d.i); headGeo.computeVertexNormals(); headGeo.computeBoundingSphere(); }).catch(() => {});
    const dc = document.createElement('canvas'); dc.width = dc.height = 64; { const x = dc.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,232,160,1)'); gr.addColorStop(1, 'rgba(255,232,160,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    const dustTex = new THREE.CanvasTexture(dc), H = new THREE.Group(), S = 6.4; H.scale.setScalar(S); scene.add(H);
    const glass = new THREE.Mesh(headGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uColor: { value: new THREE.Color(0xe8c26a) }, uAlpha: { value: 1 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.3); gl_FragColor=vec4(uColor*(0.12+f*1.5), uAlpha*(0.05+f*0.9));\n#include <colorspace_fragment>\n}' })); H.add(glass);
    const skin = new THREE.Points(headGeo, new THREE.PointsMaterial({ size: 0.0042, map: dustTex, color: 0xe8cc7a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); H.add(skin);
    /* 머리를 맞으면 번쩍 뜨이는 놀란 눈: 눈 흰자가 크게 빛나고, 눈동자는 점처럼 작아지고, 눈썹이 치켜올라간다 */
    const eyes = [];
    [-1, 1].forEach((sd) => {
      const g = new THREE.Group(); g.position.set(sd * 0.04, -0.006, 0.107); g.rotation.y = sd * 0.28; g.visible = false; H.add(g);
      const white = new THREE.Mesh(new THREE.CircleGeometry(0.024, 40), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); white.renderOrder = 3; g.add(white);
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.0285, 40), new THREE.MeshBasicMaterial({ color: 0xe8b84a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); rim.renderOrder = 3; g.add(rim);
      const pu = new THREE.Mesh(new THREE.CircleGeometry(0.01, 24), new THREE.MeshBasicMaterial({ color: 0x1a1006, transparent: true, depthWrite: false })); pu.position.z = 0.001; pu.renderOrder = 4; g.add(pu);
      const brow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0034, 8, 32, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: 0xf2d48a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); brow.rotation.z = Math.PI * 0.1; brow.position.y = 0.06; brow.renderOrder = 3; g.add(brow);
      eyes.push({ g, pu, brow, ph: Math.random(), x0: sd * 0.04 });
    });
    /* 채워지는 금빛 입자: 사방에서 흘러들어 머리 안쪽에 모인다 */
    const FN = 1700, st = new Float32Array(FN * 3), tg = new Float32Array(FN * 3), cur = new Float32Array(FN * 3), ph = new Float32Array(FN);
    for (let i = 0; i < FN; i++) {
      let x, y, z; do { x = (Math.random() * 2 - 1); y = (Math.random() * 2 - 1); z = (Math.random() * 2 - 1); } while (x * x + y * y + z * z > 1);
      tg[i * 3] = x * 0.085; tg[i * 3 + 1] = y * 0.135; tg[i * 3 + 2] = z * 0.1;
      const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), r = 0.4 + Math.random() * 0.6;
      st[i * 3] = Math.sin(b) * Math.cos(a) * r; st[i * 3 + 1] = Math.cos(b) * r * 0.8; st[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r; ph[i] = Math.random() * 6.28;
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(cur, 3));
    const fill = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.0125, map: dustTex, color: 0xffd682, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); H.add(fill);
    /* 입에서 나오는 음표와 소리 파동 */
    const mouth = new THREE.Vector3(0, -0.094, 0.108), notes = [];
    ['♪', '♫', '♩', '♬'].forEach((ch, k) => { for (let j = 0; j < 3; j++) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.font = '96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4dc92'; g.shadowColor = '#e8a93a'; g.shadowBlur = 18; g.fillText(ch, 64, 70);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending })); sp.scale.setScalar(0.11);
      notes.push({ sp, ph: (k * 3 + j) / 12, dx: (Math.random() - 0.5) * 0.5, dy: 0.1 + Math.random() * 0.5, sw: Math.random() * 6 }); H.add(sp); } });
    const rings = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0xe8cc7a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.copy(mouth).add(new THREE.Vector3(0, 0, 0.02)); rings.push({ m, ph: i / 4 }); H.add(m); }
    const SN = 2600, sp0 = new Float32Array(SN * 3), sdir = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), r = 0.6 + Math.random() * 1.0; sdir[i * 3] = Math.sin(b) * Math.cos(a); sdir[i * 3 + 1] = Math.cos(b); sdir[i * 3 + 2] = Math.sin(b) * Math.sin(a); sp0[i * 3] = sdir[i * 3] * r * 0.4; sp0[i * 3 + 1] = sdir[i * 3 + 1] * r * 0.5; sp0[i * 3 + 2] = sdir[i * 3 + 2] * r * 0.4; }
    const sg = new THREE.BufferGeometry(), spos = new Float32Array(SN * 3); sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.075, map: dustTex, color: 0xffe3a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(stars);
    const key = new THREE.DirectionalLight(0xffe4b0, 1.6); key.position.set(2, 3, 4); scene.add(key);
    /* ---- 종 때리기: 캐릭터가 머리를 치면 머리가 울리고, 충격파(주파수)가 화면 끝까지 퍼진다 ---- */
    const shocks = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: 0xf2d48a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); shocks.push(m); }
    const stick = $('#empty .tl-stick'); let hitT = -9, struck = false, yawS = 0, pitchS = 0;
    const headRect = () => { const cr = cv.getBoundingClientRect(), hw = 0.097 * S, hh = 0.15 * S, cy = H.position.y, P = (x, y) => { const v = new THREE.Vector3(x, y, 0).project(camera); return { x: cr.left + (v.x * 0.5 + 0.5) * cr.width, y: cr.top + (-v.y * 0.5 + 0.5) * cr.height }; }; const r = P(hw, cy), l = P(-hw, cy), t = P(0, cy + hh), b = P(0, cy - hh); return { l: l.x, r: r.x, t: t.y, b: b.y }; };
    const impactFx = () => {
      hitT = performance.now() / 1000; if (window.ArisAudio && ArisAudio.bell) ArisAudio.bell();
      if (stick && stick.animate && !reduce) stick.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-9px,6px)' }, { transform: 'translate(8px,-7px)' }, { transform: 'translate(-5px,4px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(0,0)' }], { duration: 700, easing: 'ease-out' });
    };
    const requestStrike = () => { const g = window.__akGuide; if (g && g.strikeHead && g.strikeHead(headRect, impactFx)) return; setTimeout(impactFx, 900); };
    const kn = $('#emNo'), kt = $('#emTitle'), kb = $('#emBody'), bar = $('#emBar'), box = $('#emTxt'); let cur0 = -1;
    reg(cv, { scene, camera, onresize(w, h) { camera.fov = w / h < 0.9 ? 46 : 32; camera.updateProjectionMatrix(); },
      update(t, dt) {
        const r = sec.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight)), narrow = camera.aspect < 0.9;
        const k2 = sstep(0.2, 0.52, p), k3 = sstep(0.5, 0.62, p) * (1 - sstep(0.9, 1, p)), k4 = sstep(0.72, 1, p);
        { /* 머리가 마우스를 따라 좌우로 똑같이 돈다(정면이 기준). 스크롤하면 서서히 고개를 돌려 이야기가 이어진다 */
          const ty = clamp(ptr.x, -1, 1) * 0.75 + (p - 0.5) * 0.5 + Math.sin(t * 0.3) * 0.03, tx = clamp(ptr.y, -1, 1) * 0.28;
          yawS += (ty - yawS) * Math.min(1, dt * 7); pitchS += (tx - pitchS) * Math.min(1, dt * 7); H.rotation.y = yawS; H.rotation.x = pitchS; } H.position.y = (narrow ? 0.35 : 0.05) + Math.sin(t * 0.8) * 0.02;
        camera.position.set(0, 0.0, (narrow ? 6.6 : 4.7) + k4 * 3.4); camera.lookAt(0, narrow ? 0.25 : 0.02, 0);
        if (p > 0.035 && p < 0.4 && !struck) { struck = true; requestStrike(); } if (p < 0.01 || r.bottom < innerHeight * 0.5) { struck = false; hitT = -9; }
        const ht = t - hitT, ring = ht >= 0 && ht < 3;
        glass.material.uniforms.uAlpha.value = (1 - k4 * 0.8) + (ring ? 2.4 * Math.exp(-ht * 3.2) : 0); skin.material.opacity = 0.4 * (1 - k4 * 0.7) + (ring ? 0.5 * Math.exp(-ht * 3) : 0);
        H.scale.setScalar(S * (1 + (ring ? 0.06 * Math.exp(-ht * 4.5) * Math.sin(ht * 40) : 0)));
        { const eT = hitT > 0 ? t - hitT : -1;   /* 맞은 뒤의 시간 */
          eyes.forEach((eo) => {
            if (eT < 0) { eo.g.visible = false; return; } eo.g.visible = true;
            const open = eT < 0.1 ? sstep(0, 0.1, eT) * 1.7 : 1.12 + 0.55 * Math.exp(-(eT - 0.1) * 5.5) * Math.cos((eT - 0.1) * 20), calm = sstep(2.2, 5.5, eT);
            const sc = lerp(open, 0.95, calm), bk = (eT > 5.5 && ((t * 0.27 + eo.ph) % 1) < 0.03) ? 0.12 : 1;   /* 차분해지면 가끔 깜빡임 */
            eo.g.scale.set(sc, sc * bk, 1); eo.g.position.x = eo.x0 + (eT < 1.6 ? Math.sin(eT * 60) * 0.0009 * Math.exp(-eT * 2) : 0);
            eo.pu.scale.setScalar(lerp(0.55, 1, calm)); eo.brow.position.y = lerp(0.066, 0.046, calm);
          }); }
        shocks.forEach((m, i) => { const s = clamp((ht - i * 0.17) / 2.0); m.visible = ring && ht > i * 0.17 && s < 1; if (m.visible) { m.position.set(0, H.position.y, 0); m.scale.setScalar(0.5 + s * 13); m.material.opacity = (1 - s) * (1 - s) * 0.85; } });
        /* 입자: 바깥에서 안쪽으로 모였다가(k2), 마지막에 사방으로 흩어진다(k4) */
        const fp = fg.attributes.position.array;
        for (let i = 0; i < FN; i++) {
          const e = clamp(k2 * 1.4 - (ph[i] / 6.28) * 0.4) , e2 = e * e * (3 - 2 * e), sw = Math.sin(t * 0.8 + ph[i]) * 0.012 * (1 - e2 * 0.6), o = k4 * (0.6 + (ph[i] / 6.28));
          for (let a = 0; a < 3; a++) { const idx = i * 3 + a; fp[idx] = lerp(st[idx], tg[idx], e2) + sw * (a === 1 ? 1 : 0.6) + (st[idx] * 0.5 + tg[idx]) * o * 7.5; }
        }
        fg.attributes.position.needsUpdate = true; fill.material.opacity = sstep(0.12, 0.3, p) * (1 - k4 * 0.25); fill.material.size = 0.0125 * (1 + k4 * 1.6);
        { const k = k4 * k4 * (3 - 2 * k4), grow = 0.35 + k * 11; for (let i = 0; i < SN * 3; i++) spos[i] = sp0[i] + sdir[i] * grow * (0.35 + (i % 7) / 7); sg.attributes.position.needsUpdate = true; stars.material.opacity = sstep(0.74, 0.92, p); stars.rotation.y = t * 0.03; stars.rotation.z = t * 0.012; }
        /* 음표와 소리 파동 */
        notes.forEach((n) => { const s = ((t * 0.28 + n.ph) % 1), x = mouth.x + n.dx * s * 0.6 + Math.sin(s * 5 + n.sw) * 0.02, y = mouth.y + n.dy * s * 0.4 + 0.02, z = mouth.z + s * 0.9; n.sp.position.set(x, y, z); n.sp.material.opacity = Math.sin(s * Math.PI) * k3; n.sp.scale.setScalar(0.05 + s * 0.05); });
        rings.forEach((rg) => { const s = ((t * 0.4 + rg.ph) % 1); rg.m.scale.setScalar(0.03 + s * 0.2); rg.m.position.z = mouth.z + 0.02 + s * 0.12; rg.m.material.opacity = (1 - s) * 0.55 * k3; });
        const idx = clamp(Math.floor(p * N), 0, N - 1);
        if (idx !== cur0) { cur0 = idx; box.classList.remove('in'); setTimeout(() => { kt.textContent = steps[idx].t; kb.innerHTML = steps[idx].b; kn.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0'); box.classList.add('in'); }, 140); }
        bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      } });
  }

  /* =====================================================================
     6) 안내 캐릭터: 사진 얼굴 연주자가 구역마다 한마디씩 건넨다
     ===================================================================== */
  function initGuide() {
    if (localStorage.getItem('ak_guide') === 'off') return;
    /* [구역, 한마디]  구역은 #id 또는 CSS 선택자 */
    const msgs = [
      ['#showcase', '2024년 김해, 한여름밤의 음악회. 클림트 그림이 흐르던 밤이었어요.'],
      ['#acts', '그날의 다섯 장면이에요. 조명이 하나씩 켜집니다.'],
      ['#sax3d', '이게 제 전 재산, 알토 색소폰이에요. 속이 비어 있어야 소리가 나는 악기죠. 저도 그랬어요.'],
      ['#info', '공연 문의는 여기로! 30명 리셉션부터 1,000명 이상까지 가능해요.'],
      ['#performances', '마음에 드는 무대를 고르세요. 공연은 전부 맞춤 제작입니다.'],
      ['#empty', '이 머리, 비어 있죠? 스크롤해 보세요. 비어 있다는 게 얼마나 대단한 건지 보여 드릴게요.'],
      ['#story', '여기서부터는 제 이야기예요.'],
      ['.discover .wrap > article:nth-of-type(1)', '스님 영상이에요. "참 재능은 많은데 머리가 비었어." 저는 칭찬으로 들었어요.'],
      ['.discover .wrap > article:nth-of-type(2)', 'ARIsHOW는 저를 복제한 공연이에요. 나를 사랑해야 남도 사랑할 수 있다는 질문을 던져요.'],
      ['.discover .wrap > article:nth-of-type(3)', '2016년 아시아 탱고 챔피언! 친친탱고와 함께예요.'],
      ['.discover .wrap > article:nth-of-type(4)', '2022년 뉴욕 카네기홀. 예술의전당 최초 1호 아티스트가 된 뒤에 선 무대예요.'],
      ['#timeline', '1997년 거리에서 시작해 2024년 AR까지. 스크롤로 제 인생을 통과해 보세요.'],
      ['#profile', '학력, 수상, 방송 출연까지. 이력서는 이쪽입니다.'],
      ['#vision', '황금빛 키스부터 아트 인텔리전스까지, 제가 상상하는 무대들이에요.'],
      ['#gallery', '드래그로 돌려 보세요. 사진을 누르면 크게 보여요.'],
      ['#awards', '트로피 대신 메달로 모셨어요. 카네기홀부터 여섯 개.'],
      ['.ensemble', '친친탱고 멤버들이에요. 탱고는 혼자서는 못 춰요.'],
      ['#faq', '궁금한 건 여기 다 있어요.'],
      ['#contact', '봉투 안에 티켓이 들어 있네요. 이제 연락만 주세요!']
    ].filter((m) => $(m[0]));
    const TL = { '1997': '1997년, 전북대 거리공연으로 시작했어요.', '1999': '호원대 기계과에 입학했어요. 예술과는 먼 길이었죠.', '2002': '자퇴하고 해병대에 갔어요.', '2007': '한국예술종합학교에 들어갑니다.', '2008': '비디오 아트 콘서트! 아바타와 듀엣을 했어요.', '2012': '한예종을 자퇴했어요. 야생의 영혼이 풀려난 해예요.', '2016': '아시아 탱고 챔피언이 됐어요!', '2016–2017': '한국콘텐츠진흥원 크리에이터 연구원도 수료했어요.', '2020': '과학기술 × 미디어아트, 다빈치프로젝트를 수료했어요.', '2024': '리얼타임엔진 AI 미디어 과정, 증강현실 콘텐츠까지 왔어요.' };
    const EM = { '비었다': '스님이 그러셨어요. 머리가 비었다고요.', '비어서, 담는다': '노자가 그랬대요. 그릇은 비어 있기에 쓸모가 있다고요.', '비어서, 소리가 난다': '색소폰도 속이 비어야 소리가 나죠.', '비어서, 끝이 없다': '비어 있으니 끝이 없어요. 이게 제 이야기예요.' };
    const w = document.createElement('div'); w.className = 'gw'; w.setAttribute('aria-live', 'polite');
    w.innerHTML = '<button class="gw-dot" id="gwDot" type="button" aria-label="안내 말풍선 열기">&hellip;</button><button class="gw-x" id="gwX" aria-label="안내 캐릭터 끄기" type="button">&times;</button><canvas id="gwGL" aria-hidden="true"></canvas>';
    document.body.appendChild(w);
    /* 말풍선은 캐릭터 안이 아니라 화면에 고정된 별도 요소: 어떤 순간에도 화면 안에 있도록 위치를 직접 계산한다 */
    const bub = document.createElement('div'); bub.className = 'gw-bub'; bub.id = 'gwBub'; bub.innerHTML = '<p id="gwTxt"></p>'; document.body.appendChild(bub);
    const txtEl = $('#gwTxt'), gone = () => { w.remove(); bub.remove(); };
    let gp = null, started = false, curId = '', typing = 0, cur = -1, showTimer = 0, forced = false, greeted = false, greetUntil = 0, pendingWave = false, lock = 0, lockPos = { x: 0, y: 0 };

    /* ---- 가리면 안 되는 것들(글자는 한 줄 단위로, 그림은 가중치를 낮게) ---- */
    const TEXT = 'h1,h2,h3,h4,p,li,blockquote,summary,label,figcaption,.tl-txt,.btn-outline,.nav-cta,.medal-cap,.ring-cap,.tl-end,input,textarea,select,.car-btn,dt,dd,cite';
    function protectedRects() {
      const out = [], vw = document.documentElement.clientWidth, vh = innerHeight;
      const push = (r, wt) => { if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return; out.push({ l: Math.max(r.left, 0), t: Math.max(r.top, 0), r: Math.min(r.right, vw), b: Math.min(r.bottom, vh), w: wt }); };
      const shown = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.2; };
      $$(TEXT).forEach((el) => {
        if (el.closest('.gw, .gw-bub, header, .snd, dialog, .sr, noscript')) return;
        const rr = el.getBoundingClientRect(); if (rr.bottom < 0 || rr.top > vh) return; if (!shown(el)) return;
        if (el.matches('input,textarea,select,button,.btn-outline,.nav-cta,.tl-end,.car-btn')) { push(rr, 1); return; }
        const rg = document.createRange(); rg.selectNodeContents(el); Array.from(rg.getClientRects()).forEach((r) => push(r, 1));
      });
      $$('img,video').forEach((el) => { if (el.closest('.gw, .gw-bub, header, .sr, dialog')) return; const rr = el.getBoundingClientRect(); if (rr.bottom < 0 || rr.top > vh || rr.width < 60) return; if (shown(el)) push(rr, 0.3); });
      $$('canvas').forEach((el) => { if (el.closest('.gw')) return; const rr = el.getBoundingClientRect(); if (rr.bottom < 0 || rr.top > vh) return; push(rr, 0.04); });
      return out;
    }
    const overlap = (R, rects, pad = 4) => { let a = 0; for (const q of rects) { const iw = Math.min(R.r + pad, q.r) - Math.max(R.l - pad, q.l), ih = Math.min(R.b + pad, q.b) - Math.max(R.t - pad, q.t); if (iw > 0 && ih > 0) a += iw * ih * q.w; } return a; };
    const clip = (R, vw, vh) => ({ l: Math.max(R.l, 0), t: Math.max(R.t, 0), r: Math.min(R.r, vw), b: Math.min(R.b, vh) });

    function layout(force) {
      if (!w.classList.contains('on')) return;
      const W = w.offsetWidth, Hh = w.offsetHeight, vw = document.documentElement.clientWidth, vh = innerHeight - 1, m = Math.max(8, vw * 0.012), lift = vw < 700 ? 66 : 74;
      /* 캐릭터는 어떤 경우에도 화면 안에 온전히 서 있다 */
      const top0 = 84, ymax = Math.max(vh - Hh - top0, 0), midY = Math.min(Math.max(vh * 0.28, 0), ymax), upY = ymax;
      const cands = [
        { x: m, y: 0, pen: 0 }, { x: vw - W - m, y: lift, pen: 0.4 }, { x: m, y: midY, pen: 0.8 }, { x: vw - W - m, y: Math.max(midY, lift), pen: 0.9 },
        { x: m, y: upY, pen: 1.2 }, { x: vw - W - m, y: upY, pen: 1.3 }, { x: vw / 2 - W / 2, y: 0, pen: 2.2 }, { x: vw / 2 - W / 2, y: upY, pen: 2.6 }
      ];
      const rects = protectedRects(), area = W * Hh;
      let best = 0, bs = 1e18;
      cands.forEach((c, i) => { const R = clip({ l: c.x, r: c.x + W, b: vh - c.y, t: vh - c.y - Hh }, vw, vh), sc = overlap(R, rects) + c.pen * area * 0.012 + (i === cur ? -area * 0.02 : 0); if (sc < bs) { bs = sc; best = i; } });
      if (!force && cur >= 0 && best !== cur) { const c = cands[cur], R = clip({ l: c.x, r: c.x + W, b: vh - c.y, t: vh - c.y - Hh }, vw, vh); if (overlap(R, rects) < area * 0.015) best = cur; }
      cur = best; const locked = Date.now() < lock, c = locked ? lockPos : cands[best]; if (!locked) { w.style.left = c.x + 'px'; w.style.bottom = c.y + 'px'; }
      /* ---- 말풍선: 화면 좌표로 직접 배치하고, 항상 화면 안(여백 8px)으로 가둔다 ---- */
      const bw = bub.offsetWidth, bh = bub.offsetHeight, wl = c.x, wt = vh - c.y - Hh, mg = 8;
      const inside = (p) => ({ x: Math.min(Math.max(p.x, mg), Math.max(vw - bw - mg, mg)), y: Math.min(Math.max(p.y, 78), Math.max(vh - bh - mg, 78)) });
      const bc = [
        { x: wl + W * 0.3, y: wt - bh - 4 }, { x: wl + W - bw - W * 0.1, y: wt - bh - 4 },
        { x: wl + W + 8, y: wt + Hh * 0.05 }, { x: wl - bw - 8, y: wt + Hh * 0.05 }
      ].map(inside);
      let bi = 0, bsc = 1e18; bc.forEach((p, i) => { const R = { l: p.x, t: p.y, r: p.x + bw, b: p.y + bh }, sw = overlap(R, rects, 2) + overlap(R, [{ l: wl, t: wt, r: wl + W, b: wt + Hh, w: 0.5 }], 0); if (sw < bsc) { bsc = sw; bi = i; } });
      w.classList.toggle('min', bsc > bw * bh * 0.1 && !forced);
      bub.style.left = bc[bi].x + 'px'; bub.style.top = bc[bi].y + 'px';
    }

    const POINT = ['#info', '#performances', '#profile', '#gallery', '#awards', '#contact'];   /* 이 구역에서만, 말할 때 잠깐 옆을 가리킨다 */
    const say = (txt, id) => {
      if (gp && gp.setPoint) { const r = w.getBoundingClientRect(), dir = (r.left + r.width / 2) < innerWidth / 2 ? 1 : -1; if (POINT.includes(id)) { gp.setPoint(1, dir, 'side'); setTimeout(() => gp && gp.setPoint(0), 3200); } else gp.setPoint(0, 0, 'side'); }
      clearInterval(typing); let n = 0; sayUntil = Date.now() + txt.length * 28 + 2500;
      /* 말풍선 크기를 전체 문장 기준으로 먼저 정해 고정한다: 위치도 그 크기로 계산되므로 타이핑 중에 프레임 밖으로 나가지 않는다 */
      bub.style.width = ''; bub.style.height = ''; txtEl.textContent = txt; layout(true); bub.style.width = bub.offsetWidth + 'px'; bub.style.height = bub.offsetHeight + 'px'; txtEl.textContent = '';
      w.classList.add('talk'); forced = false;
      typing = setInterval(() => { n++; txtEl.textContent = txt.slice(0, n); if (n === 3 || n === txt.length) layout(); if (n >= txt.length) { clearInterval(typing); clearTimeout(showTimer); showTimer = setTimeout(() => { w.classList.remove('talk'); forced = false; }, 12000); } }, 28);
    };
    const start = () => { if (started) return; started = true; import('./avatar3d.js').then((m) => { try { gp = m.createSaxPlayer($('#gwGL'), { fov: 35, camY: 1.14, camZ: 3.9, lookY: 1.138, guide: true, idle: true }); gp.setGuide(1); if (pendingWave) { pendingWave = false; gp.wave(); } } catch (e) { gone(); } }).catch(gone); };
    $('#gwX').addEventListener('click', () => { localStorage.setItem('ak_guide', 'off'); w.classList.remove('on'); setTimeout(() => { gp && gp.dispose(); gone(); }, 500); });
    $('#gwDot').addEventListener('click', () => { forced = true; w.classList.remove('min'); w.classList.add('talk'); layout(true); clearTimeout(showTimer); showTimer = setTimeout(() => { w.classList.remove('talk'); forced = false; layout(); }, 9000); });
    /* 머리 오른쪽에 서서 오른손으로 내려친다. 오른손이 머리 쪽으로 향하도록 머리 오른쪽(화면 기준)에 선다 */
    function strikeHead(getRect, onImpact) {
      if (!gp || !gp.strike || !w.classList.contains('on')) return false;
      const run = () => {
        const hr = getRect(), Wd = w.offsetWidth, Hh = w.offsetHeight, vw = document.documentElement.clientWidth, vh = innerHeight - 1, mg = 8;
        let x = hr.r + 6; if (x + Wd > vw - mg) x = vw - Wd - mg;
        const fistY = hr.t + (hr.b - hr.t) * 0.22, top = fistY - Hh * 0.3; let y = vh - (top + Hh); y = Math.min(Math.max(y, 0), Math.max(vh - Hh - 84, 0));
        lock = Date.now() + 8000; lockPos = { x, y }; cur = -1; w.style.left = x + 'px'; w.style.bottom = y + 'px';
        say('이 머리, 한번 쳐 볼게요. 비어 있으면 어떻게 되는지 들어 보세요!', 'strike');
        gp.setStrikeHandler(() => { onImpact && onImpact(); setTimeout(() => say('울리죠? 이 울림이 세상을 흔들어요.', 'strike2'), 1000); });
        setTimeout(() => gp.strike(), 2400);
      };
      if (Date.now() < greetUntil) setTimeout(run, greetUntil - Date.now() + 100); else run();
      return true;
    }
    window.__akGuide = { strikeHead };
    /* 가끔 랜덤으로: 선글라스를 멋있게 쓰거나, 손으로 잡아 이마 위로 올리며 한마디 한다 */
    const GL_DOWN = ['짠! 이제 좀 멋있죠?', '선글라스는 이렇게 써야 제맛이죠.', '무대 조명이 눈부셔서요. 잠깐 쓸게요.', '어때요, 이 각도?'];
    const GL_UP = ['덥네요. 이마에 걸쳐 둘게요.', '눈 맞추고 얘기해야죠.', '이러면 얼굴이 잘 보이죠?', '잠깐 올릴게요. 이야기가 길어질 것 같아서요.'];
    let glNext = Date.now() + 16000 + Math.random() * 14000, sayUntil = 0;
    setInterval(() => {
      if (!gp || !gp.glasses || !w.classList.contains('on') || document.hidden) return;
      const now = Date.now(); if (now < glNext || now < greetUntil || now < lock || now < sayUntil) return;
      const isOn = gp.glassesState() === 1, line = (isOn ? GL_UP : GL_DOWN)[Math.floor(Math.random() * 4)];
      say(line, 'glasses'); gp.glasses(isOn ? -1 : 1); glNext = now + 22000 + Math.random() * 24000;
    }, 2500);
    const pinned = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.15 && r.bottom > innerHeight * 0.85; };
    const pick = () => {
      const past = scrollY > innerHeight * 1.05; const was = w.classList.contains('on'); w.classList.toggle('on', past); if (!past) return; start();
      if (!was) layout(true);
      if (!greeted) { /* 처음 나오면 인사부터 */
        greeted = true; greetUntil = Date.now() + 5200; if (gp) gp.wave(); else pendingWave = true;
        say('안녕하세요, 아리스 김입니다! 제가 구석구석 안내해 드릴게요.', 'hello'); setTimeout(pick, 5400); return;
      }
      if (Date.now() < greetUntil || Date.now() < lock) return;
      let id = '', txt = '';
      const tl = $('#timeline'), em = $('#empty');
      if (tl && pinned(tl) && TL[$('#tlYear').textContent]) { id = 'tl:' + $('#tlYear').textContent; txt = TL[$('#tlYear').textContent]; }
      else if (em && pinned(em) && EM[$('#emTitle').textContent]) { id = 'em:' + $('#emTitle').textContent; txt = EM[$('#emTitle').textContent]; }
      else { let best = null, bd = 1e9; msgs.forEach((m) => { const r = $(m[0]).getBoundingClientRect(); if (r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.3) { const d = Math.abs(r.top + r.height / 2 - innerHeight * 0.5); if (d < bd) { bd = d; best = m; } } }); if (best) { id = best[0]; txt = best[1]; } }
      if (id && id !== curId) { curId = id; say(txt, id); }
    };
    let idle = 0; addEventListener('scroll', () => { pick(); clearTimeout(idle); idle = setTimeout(() => layout(), 260); }, { passive: true });
    addEventListener('resize', () => { clearTimeout(idle); idle = setTimeout(() => layout(true), 200); });
    pick();
  }

  /* ---------- 시작 ---------- */
  const boot = () => { try { initSax(); } catch (e) { console.warn(e); } try { initEmpty(); } catch (e) { console.warn(e); } try { initTimeline(); } catch (e) { console.warn(e); } try { initRing(); } catch (e) { console.warn(e); } try { initMedals(); } catch (e) { console.warn(e); } try { initEnvelope(); } catch (e) { console.warn(e); } try { initGuide(); } catch (e) { console.warn(e); } };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
}
