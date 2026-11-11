(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1. 인트로: 글꼴이 준비되면 ARIS KIM 글자가 한 글자씩 올라온다 */
  var started = false, gateDone = false, readyToGo = false;
  function go() { if (started) return; started = true; document.body.classList.add('go'); if (window.ArisAudio) window.ArisAudio.cue('title'); }
  function tryGo() { if (readyToGo && gateDone) requestAnimationFrame(go); }
  /* 입장 화면: 브라우저는 클릭 전에는 소리를 막기 때문에, 한 번 눌러야 첫 이름이 올라오는 순간부터 소리가 함께 나온다.
     이미 소리가 허용돼 있거나 소리를 꺼 둔 경우에는 이 화면이 나오지 않는다. */
  (function gate() {
    var A = window.ArisAudio;
    if (!A || !A.needGate()) { gateDone = true; return; }
    var g = document.createElement('div'); g.className = 'gate';
    g.innerHTML = '<div class="gate-in"><p class="gate-n">Aris Kim</p><button type="button" class="gate-go">ENTER<span>소리와 함께 입장</span></button><button type="button" class="gate-mute">소리 없이 입장</button></div>';
    document.body.appendChild(g);
    function done(withSound) {
      if (gateDone) return; gateDone = true; g.classList.add('out');
      var run = function () { setTimeout(function () { g.remove(); }, 800); tryGo(); };
      if (withSound) A.enter().then(run); else run();
    }
    $('.gate-go', g).addEventListener('click', function () { done(true); });
    $('.gate-mute', g).addEventListener('click', function () { done(false); });
    setTimeout(function () { $('.gate-go', g).focus({ preventScroll: true }); }, 50);
  })();
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('120px "Pirata One"'),
      new Promise(function (r) { setTimeout(r, 2500); })
    ]).then(function () { readyToGo = true; tryGo(); });
  } else { readyToGo = true; tryGo(); }
  setTimeout(function () { readyToGo = true; tryGo(); }, 3000);

  /* 2. 헤더: 항상 고정. 스크롤하면 어두운 바탕이 깔려 사진 위에서도 읽힌다 */
  var hdr = $('#hdr'), lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    hdr.classList.toggle('solid', y > 40);
    lastY = y;
  }, { passive: true });

  /* 3. 모바일 메뉴 */
  var nav = $('#nav'), mb = $('#menuBtn');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    hdr.classList.toggle('menu-open', open);
    mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    mb.classList.toggle('open', open); mb.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.documentElement.classList.toggle('lock', open);   /* 메뉴가 열려 있는 동안 뒤 화면이 스크롤되지 않게 */
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) setMenu(false); });
  mb.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* 4. 문단을 줄 단위로 쪼개 올라오게 하는 효과 (SplitText 방식, 라이브러리 없이) */
  var splitTargets = $$('p.rise');
  splitTargets.forEach(function (el) { el.dataset.orig = el.textContent.trim(); });
  $$('h3.rise').forEach(function (el) { el.classList.add('plain'); });

  function splitLines(el) {
    var text = el.dataset.orig;
    var wasIn = el.classList.contains('in');
    el.classList.remove('in');
    el.innerHTML = '';
    var words = text.split(/\s+/).map(function (w) {
      var s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = w + ' ';
      el.appendChild(s);
      return s;
    });
    var lines = [], top = null, cur = null;
    words.forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { cur = []; lines.push(cur); top = t; }
      cur.push(w.textContent);
    });
    el.innerHTML = '';
    lines.forEach(function (ws, i) {
      var ln = document.createElement('span'); ln.className = 'ln';
      var inner = document.createElement('span'); inner.style.setProperty('--l', i);
      inner.textContent = ws.join('').replace(/ /g, ' ').trimEnd();
      ln.appendChild(inner); el.appendChild(ln);
    });
    if (wasIn) { void el.offsetWidth; el.classList.add('in'); }
  }
  function splitAll() { splitTargets.forEach(splitLines); }
  var lastW = window.innerWidth, rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; splitAll(); } }, 250);
  });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { splitAll(); observe(); });

  /* 5. 화면에 들어오면 나타나게 */
  function observe() {
    var els = $$('[data-reveal], .reveal-img, .rise');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 6. 공연 카드 가로 이동 */
  var track = $('#track');
  $$('.car-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = $('.card', track);
      var step = card ? card.getBoundingClientRect().width + 28 : 320;
      track.scrollBy({ left: step * Number(b.dataset.dir), behavior: 'smooth' });
    });
  });

  /* 7. 사진 크게 보기 */
  var lb = $('#lb'), lbimg = $('#lbimg');
  $$('[data-lb]').forEach(function (b) {
    b.addEventListener('click', function () {
      lbimg.src = b.dataset.lb;
      lbimg.alt = $('img', b).alt;
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    });
  });
  $('#lbx').addEventListener('click', function () { lb.close ? lb.close() : lb.removeAttribute('open'); });
  lb.addEventListener('click', function (e) { if (e.target === lb && lb.close) lb.close(); });

  /* 8. 문의: 메일 앱이 열리고 내용이 채워진다 (서버 없이 동작) */
  $('#cform').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var body = '이름/단체: ' + f.name.value + '\n연락처: ' + f.phone.value + '\n공연 형식: ' + f.type.value +
      (f.when.value ? '\n희망 날짜·규모: ' + f.when.value : '') + (f.msg.value ? '\n\n' + f.msg.value : '');
    var url = 'mailto:ARISHOW@NAVER.COM?subject=' + encodeURIComponent('[공연 문의] ' + f.name.value) + '&body=' + encodeURIComponent(body);
    $('#cnote').textContent = '메일 앱을 여는 중입니다. 열리지 않으면 ARISHOW@NAVER.COM 으로 직접 보내주세요.';
    window.location.href = url;
  });

  /* 8-1. 카드의 '이 공연으로 문의' -> 폼의 공연 형식을 미리 골라 두고 폼으로 이동 */
  (function () {
    var form = $('#cform'); if (!form) return;
    $$('.card-cta').forEach(function (a) {
      a.addEventListener('click', function () {
        var t = a.dataset.type, m = a.dataset.msg;
        if (t) Array.prototype.some.call(form.type.options, function (o) { if (o.text === t) { form.type.value = o.value; return true; } return false; });
        if (m) { var more = $('.more', form); if (more) more.open = true; if (!form.msg.value) form.msg.value = m; }
        setTimeout(function () { try { form.name.focus({ preventScroll: true }); } catch (e) { form.name.focus(); } }, 900);
      });
    });
    var compose = function () { return '[공연 문의] ' + form.name.value + '\n연락처: ' + form.phone.value + '\n공연 형식: ' + form.type.value + (form.when.value ? '\n희망 날짜·규모: ' + form.when.value : '') + (form.msg.value ? '\n\n' + form.msg.value : ''); };
    var sms = $('#smsBtn'); if (sms) sms.addEventListener('click', function () { sms.href = 'sms:010-4251-1212' + (/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(compose()); });
    var cp = $('#copyBtn'); if (cp) cp.addEventListener('click', function () {
      var txt = compose(), done = function () { $('#cnote').textContent = '문의 내용을 복사했습니다. 문자나 카카오톡에 붙여 넣어 보내 주세요. (010-4251-1212)'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { window.prompt('아래 내용을 복사해 주세요', txt); });
      else window.prompt('아래 내용을 복사해 주세요', txt);
    });
  })();

  /* 9. 비 오는 창문: 유리창에 맺힌 빗방울 속에 창밖 풍경이 뒤집혀 비친다 (WebGL2) */
  (function rainWindow() {
    var hero = $('.hero'), cv = $('#rainGL');
    if (!hero || !cv) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var gl = cv.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) return; /* 지원하지 않으면 정지 사진이 그대로 보인다 */

    var VS = '#version 300 es\nout vec2 vUv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUv=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';
    var FS = '#version 300 es\nprecision highp float;\n' +
      'in vec2 vUv; out vec4 outColor;\n' +
      'uniform sampler2D uScene, uDrops, uTrail, uBlur, uSceneB, uSceneC, uSceneD, uSceneE;\n' +
      'uniform vec2 uDropSize, uRes, uShake;\n' +
      'uniform vec4 uPil;\n' +
      'uniform float uMixE, uZoomE, uShim, uPilA, uAvAmp;\n' +
      'uniform vec4 uAvA, uAvB;\n' +
      'uniform float uTime, uZoom, uZoomB, uZoomC, uZoomD, uFocus, uGlass, uMixB, uMixC, uMixD, uBloom, uSatC, uGlitch, uShock, uFlash;\n' +
      'const vec2 zc=vec2(0.5,0.47);\n' +
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' +
      'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}\n' +
      'float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}\n' +
      'float flameAt(vec2 uv,float cx,float h,float asp,float t){\n' +
      '  if(h<=0.001) return 0.0;\n' +
      '  float y=uv.y; float dx=(uv.x-cx)*asp;\n' +
      '  float turb=fbm(vec2(uv.x*7.0,y*4.0-t*4.5))-0.5;\n' +
      '  float w=0.085*(1.0-0.5*clamp(y/h,0.0,1.0))+0.012;\n' +
      '  float d=abs(dx+turb*0.12*(0.25+y));\n' +
      '  float f=smoothstep(w,0.0,d)*smoothstep(h,h-0.25,y);\n' +
      '  f*=0.55+0.9*fbm(vec2(uv.x*11.0,y*6.0-t*7.5));\n' +
      '  return clamp(f,0.0,1.5);\n' +
      '}\n' +
      'vec3 satC(vec3 c){float l=dot(c,vec3(0.299,0.587,0.114));return mix(vec3(l),c,uSatC);}\n' +
      'vec3 sceneAt(vec2 uv,vec2 off,float lod){\n' +
      '  vec3 col=textureLod(uScene,(uv-zc)/uZoom+zc-off,lod).rgb;\n' +
      '  if(uMixB>0.001) col=mix(col,textureLod(uSceneB,(uv-zc)/uZoomB+zc-off,lod).rgb,uMixB);\n' +
      '  if(uMixC>0.001) col=mix(col,satC(textureLod(uSceneC,(uv-zc)/uZoomC+zc-off,lod).rgb),uMixC);\n' +
      '  return col;\n' +
      '}\n' +
      'vec2 avWarp(vec2 p,float asp){\n' +
      '  float feet=uAvA.y, head=uAvA.z;\n' +
      '  float hh=clamp((p.y-feet)/(head-feet),0.0,1.0);\n' +
      '  vec2 q=(p-vec2(uAvA.x,(feet+head)*0.5))/vec2(uAvA.w,(head-feet)*0.6);\n' +
      '  float m=1.0-smoothstep(0.6,1.0,length(q));\n' +
      '  float t=uTime;\n' +
      '  vec2 d=vec2(0.0);\n' +
      '  d.x+=0.011*pow(hh,1.35)*sin(t*6.6);\n' +
      '  d.y-=0.007*hh*(0.5+0.5*sin(t*13.2));\n' +
      '  float hd=smoothstep(0.8,0.95,hh);\n' +
      '  d.x+=0.0045*hd*sin(t*13.2+1.0);\n' +
      '  d.y-=0.006*hd*sin(t*13.2);\n' +
      '  vec2 sv=(p-uAvB.xy)*vec2(asp,1.0);\n' +
      '  float gs=exp(-dot(sv,sv)/0.0016);\n' +
      '  d+=vec2(0.006*sin(t*26.4),0.017*sin(t*26.4+1.2))*gs;\n' +
      '  vec2 fv=(p-uAvB.zw)*vec2(asp,1.0);\n' +
      '  float gf=exp(-dot(fv,fv)/0.0025);\n' +
      '  d+=vec2(0.004*sin(t*6.6+2.0),0.007*sin(t*13.2))*gf;\n' +
      '  return d*m*uAvAmp;\n' +
      '}\n' +
      'void main(){\n' +
      '  vec2 uv=vUv+uShake;\n' +
      '  vec2 asp=vec2(uRes.x/uRes.y,1.0);\n' +
      '  vec2 dv=(uv-vec2(0.5))*asp; float dist=length(dv);\n' +
      '  float ring=exp(-pow((dist-uShock*1.5)*5.0,2.0))*(1.0-uShock)*step(0.0001,uShock);\n' +
      '  uv+=dv/(dist+1e-4)/asp*ring*0.05;\n' +
      '  float tt=floor(uTime*22.0);\n' +
      '  float band=floor(uv.y*46.0);\n' +
      '  uv.x+=(hash(vec2(band,tt))-0.5)*0.15*uGlitch*step(0.6,hash(vec2(band*1.37,tt)));\n' +
      '  vec4 d=texture(uDrops,uv);\n' +
      '  float trail=texture(uTrail,uv).r;\n' +
      '  vec2 pa=(uv-zc)/uZoom+zc;\n' +
      '  vec3 col=mix(texture(uBlur,pa).rgb,textureLod(uScene,pa,0.2).rgb,max(clamp(trail*1.4,0.0,1.0)*uGlass,uFocus));\n' +
      '  if(uMixB>0.001) col=mix(col,textureLod(uSceneB,(uv-zc)/uZoomB+zc,0.2).rgb,uMixB);\n' +
      '  if(uMixC>0.001){\n' +
      '    vec2 pc=(uv-zc)/uZoomC+zc; float cs=uGlitch*0.012;\n' +
      '    vec3 c;\n' +
      '    c.r=textureLod(uSceneC,pc+vec2(cs,0.0),0.2).r;\n' +
      '    c.g=textureLod(uSceneC,pc,0.2).g;\n' +
      '    c.b=textureLod(uSceneC,pc-vec2(cs,0.0),0.2).b;\n' +
      '    col=mix(col,satC(c),uMixC);\n' +
      '  }\n' +
      '  if(uMixD>0.001){\n' +
      '    vec2 pd=(uv-zc)/uZoomD+zc;\n' +
      '    vec3 dc=textureLod(uSceneD,pd,0.2).rgb;\n' +
      '    float rv=uMixD*1.45-uv.y+(fbm(vec2(uv.x*5.0,uv.y*2.5-uTime*1.3))-0.5)*0.42;\n' +
      '    float mD=smoothstep(0.0,0.12,rv);\n' +
      '    float edge=smoothstep(-0.02,0.03,rv)*(1.0-smoothstep(0.05,0.3,rv));\n' +
      '    col=mix(col,dc,mD);\n' +
      '    col+=mix(vec3(1.0,0.3,0.03),vec3(1.0,0.85,0.4),smoothstep(0.1,0.9,edge))*edge*1.3;\n' +
      '  }\n' +
      '  if(uMixE>0.001){\n' +
      '    vec2 pe=(uv-zc)/uZoomE+zc;\n' +
      '    pe-=avWarp(pe,asp.x);\n' +
      '    vec3 ec=textureLod(uSceneE,pe,0.2).rgb;\n' +
      '    float tb=uMixE*1.45-(1.0-uv.y)+(fbm(vec2(uv.x*6.0,uv.y*3.0+uTime*0.7))-0.5)*0.42;\n' +
      '    float mE=smoothstep(0.0,0.1,tb);\n' +
      '    float edgeE=smoothstep(-0.03,0.03,tb)*(1.0-smoothstep(0.04,0.22,tb));\n' +
      '    col*=1.0-0.75*smoothstep(-0.28,0.0,tb)*(1.0-mE);\n' +
      '    col=mix(col,ec,mE);\n' +
      '    col+=mix(vec3(1.0,0.28,0.03),vec3(1.0,0.9,0.5),smoothstep(0.1,0.9,edgeE))*edgeE*1.5;\n' +
      '    float band=exp(-pow((uv.x*0.75+uv.y*0.55-uShim)*6.5,2.0));\n' +
      '    float lum=dot(ec,vec3(0.3,0.5,0.2));\n' +
      '    col+=vec3(1.0,0.82,0.4)*band*lum*lum*mE*1.1;\n' +
      '  }\n' +
      '  if(uPilA>0.001){\n' +
      '    float fl=flameAt(uv,0.17,uPil.x,asp.x,uTime)+flameAt(uv,0.39,uPil.y,asp.x,uTime+3.1)+flameAt(uv,0.61,uPil.z,asp.x,uTime+6.7)+flameAt(uv,0.83,uPil.w,asp.x,uTime+9.4);\n' +
      '    fl=clamp(fl,0.0,1.5);\n' +
      '    vec3 fc=mix(vec3(0.85,0.1,0.0),vec3(1.0,0.62,0.08),smoothstep(0.2,0.8,fl));\n' +
      '    fc=mix(fc,vec3(1.0,0.97,0.78),smoothstep(0.9,1.4,fl));\n' +
      '    col=mix(col,fc,clamp(fl,0.0,1.0)*uPilA)+fc*fl*0.4*uPilA;\n' +
      '  }\n' +
      '  float lens=d.a*uGlass;\n' +
      '  if(lens>0.01){\n' +
      '    vec2 n=(d.rg-0.5)*2.0;\n' +
      '    float rpx=d.b*32.0;\n' +
      '    vec2 off=n*rpx/uDropSize;\n' +
      '    vec3 s;\n' +
      '    s.r=sceneAt(uv,off*8.94,0.15).r;\n' +
      '    s.g=sceneAt(uv,off*9.0,0.15).g;\n' +
      '    s.b=sceneAt(uv,off*9.06,0.15).b;\n' +
      '    float e=length(n);\n' +
      '    float rim=smoothstep(0.62,1.0,e);\n' +
      '    vec3 lc=s*(1.0-0.32*rim)*2.0;\n' +
      '    lc+=vec3(1.0,0.86,0.6)*smoothstep(0.5,1.0,e)*max(0.0,-n.y)*0.32;\n' +
      '    vec3 N=normalize(vec3(n,sqrt(max(0.0,1.0-dot(n,n)))));\n' +
      '    float sp=pow(max(dot(N,normalize(vec3(-0.35,0.55,0.75))),0.0),42.0);\n' +
      '    float sp2=pow(max(dot(N,normalize(vec3(0.5,-0.6,0.6))),0.0),18.0)*0.22;\n' +
      '    lc+=vec3(1.0,0.97,0.88)*(sp*0.95+sp2);\n' +
      '    col=mix(col,lc,lens);\n' +
      '  }\n' +
      '  col+=vec3(1.0,0.92,0.75)*uFlash*exp(-dist*2.4);\n' +
      '  vec2 q=(uv-0.5)*vec2(1.0,1.15);\n' +
      '  col*=mix(clamp(1.0-dot(q,q)*0.95,0.0,1.0),clamp(1.0-dot(q,q)*0.35,0.0,1.0),uMixC);\n' +
      '  col+=(hash(uv*uRes+uTime)-0.5)*(0.018+0.3*uGlitch);\n' +
      '  col*=1.0-0.07*uGlitch*step(0.5,fract(uv.y*uRes.y*0.5));\n' +
      '  outColor=vec4(col,1.0);\n' +
      '}';

    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var U = {};
    ['uScene', 'uDrops', 'uTrail', 'uBlur', 'uSceneB', 'uSceneC', 'uSceneD', 'uSceneE', 'uDropSize', 'uRes', 'uShake', 'uPil', 'uMixE', 'uZoomE', 'uShim', 'uPilA', 'uAvAmp', 'uAvA', 'uAvB', 'uTime', 'uZoom', 'uZoomB', 'uZoomC', 'uZoomD', 'uFocus', 'uGlass', 'uMixB', 'uMixC', 'uMixD', 'uSatC', 'uGlitch', 'uShock', 'uFlash'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uScene, 0); gl.uniform1i(U.uDrops, 1); gl.uniform1i(U.uTrail, 2); gl.uniform1i(U.uBlur, 3); gl.uniform1i(U.uSceneB, 4); gl.uniform1i(U.uSceneC, 5); gl.uniform1i(U.uSceneD, 6); gl.uniform1i(U.uSceneE, 7);

    function mkTex(mip) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }
    var sceneTex = mkTex(true), dropTex = mkTex(false), trailTex = mkTex(false), blurTex = mkTex(false), sceneBTex = mkTex(true), sceneCTex = mkTex(true), sceneDTex = mkTex(true), sceneETex = mkTex(true);
    function upload(tex, unit, canvas, mip) {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    }

    function rnd(a, b) { return a + Math.random() * (b - a); }
    var W = 0, H = 0, DW = 0, DH = 0, dpr = 1;
    var sceneC = document.createElement('canvas'), sctx = sceneC.getContext('2d');
    var blurC = document.createElement('canvas'), bctx = blurC.getContext('2d');
    var dropC = document.createElement('canvas'), dctx = dropC.getContext('2d');
    var trailC = document.createElement('canvas'), tctx = trailC.getContext('2d');
    var portrait = new Image(), portraitOk = false;
    portrait.onload = function () { portraitOk = true; if (W) buildScene(); };
    portrait.src = 'images/hero_portrait.webp';

    /* 두 번째 장면: 카네기홀 사진 / 세 번째 장면: 아리쇼 오케스트라 사진 */
    var imgB = new Image(), imgBOk = false, imgC = new Image(), imgCOk = false;
    imgB.onload = function () { imgBOk = true; if (W) buildPhotos(sceneC.width, sceneC.height); };
    imgC.onload = function () { imgCOk = true; if (W) buildPhotos(sceneC.width, sceneC.height); };
    var imgD = new Image(), imgDOk = false; /* 정점: ARIsHOW 커튼콜 사진 */
    imgD.onload = function () { imgDOk = true; if (W) buildPhotos(sceneC.width, sceneC.height); };
    imgB.src = 'images/hero_carnegie.webp'; imgC.src = 'images/hero_arishow.webp'; imgD.src = 'images/hero_finale.webp';
    var imgE = new Image(), imgEOk = false; /* 5번째: 금박 타이틀 사진 */
    imgE.onload = function () { imgEOk = true; if (W) buildPhotos(sceneC.width, sceneC.height); };
    imgE.src = 'images/hero_title.webp';
    var photoE = document.createElement('canvas'), pectx = photoE.getContext('2d');
    var photoD = document.createElement('canvas'), pdctx = photoD.getContext('2d');
    var photoB = document.createElement('canvas'), pbctx = photoB.getContext('2d');
    var photoC = document.createElement('canvas'), pcctx = photoC.getContext('2d');
    function coverDraw(ctx, img, SW, SH, fx, fy) {
      var k = Math.max(SW / img.naturalWidth, SH / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      ctx.drawImage(img, (SW - dw) * fx, (SH - dh) * fy, dw, dh);
    }
    function buildPhotos(SW, SH) {
      var mobile = W < 700;
      if (imgBOk) { /* 카네기홀 사진: 멀리서 본 것처럼 작게 놓고, 주변은 같은 사진을 어둡고 흐리게 깐다 */
        photoB.width = SW; photoB.height = SH;
        pbctx.fillStyle = '#050505'; pbctx.fillRect(0, 0, SW, SH);
        if ('filter' in pbctx) pbctx.filter = 'blur(' + (SW * 0.012).toFixed(1) + 'px) brightness(0.42)';
        coverDraw(pbctx, imgB, SW, SH, 0.5, 0.2); pbctx.filter = 'none';
        var iw = imgB.naturalWidth, ih = imgB.naturalHeight;
        var kk = Math.min(SW / iw, SH / ih) * (mobile ? 0.96 : 0.76), dw = iw * kk, dh = ih * kk;
        var oc = document.createElement('canvas'); oc.width = Math.round(dw); oc.height = Math.round(dh);
        var o = oc.getContext('2d'); o.drawImage(imgB, 0, 0, oc.width, oc.height);
        var mc = document.createElement('canvas'); mc.width = oc.width; mc.height = oc.height;
        var m = mc.getContext('2d'), f = Math.min(oc.width, oc.height) * 0.07; /* 가장자리를 부드럽게 */
        if ('filter' in m) m.filter = 'blur(' + (f * 0.6).toFixed(1) + 'px)';
        m.fillStyle = '#fff'; m.fillRect(f, f, oc.width - 2 * f, oc.height - 2 * f);
        o.globalCompositeOperation = 'destination-in'; o.drawImage(mc, 0, 0);
        pbctx.drawImage(oc, (SW - dw) / 2, (SH - dh) * 0.55);
        upload(sceneBTex, 4, photoB, true);
      }
      if (imgCOk) {
        photoC.width = SW; photoC.height = SH; coverDraw(pcctx, imgC, SW, SH, 0.5, mobile ? 0.7 : 0.72);
        upload(sceneCTex, 5, photoC, true);
      }
      if (imgDOk) { /* 사진 전체가 보이게 놓고, 옆은 같은 사진을 어둡고 흐리게 깐다 */
        photoD.width = SW; photoD.height = SH;
        pdctx.fillStyle = '#050505'; pdctx.fillRect(0, 0, SW, SH);
        if ('filter' in pdctx) pdctx.filter = 'blur(' + (SW * 0.012).toFixed(1) + 'px) brightness(0.5)';
        coverDraw(pdctx, imgD, SW, SH, 0.5, 0.5); pdctx.filter = 'none';
        var jw = imgD.naturalWidth, jh = imgD.naturalHeight, jk = Math.min(SW / jw, SH / jh), qw = jw * jk, qh = jh * jk;
        var oc2 = document.createElement('canvas'); oc2.width = Math.round(qw); oc2.height = Math.round(qh);
        var o2 = oc2.getContext('2d'); o2.drawImage(imgD, 0, 0, oc2.width, oc2.height);
        var mc2 = document.createElement('canvas'); mc2.width = oc2.width; mc2.height = oc2.height;
        var m2 = mc2.getContext('2d'), f2 = Math.min(oc2.width, oc2.height) * 0.05;
        if ('filter' in m2) m2.filter = 'blur(' + (f2 * 0.6).toFixed(1) + 'px)';
        m2.fillStyle = '#fff'; m2.fillRect(f2, f2, oc2.width - 2 * f2, oc2.height - 2 * f2);
        o2.globalCompositeOperation = 'destination-in'; o2.drawImage(mc2, 0, 0);
        pdctx.drawImage(oc2, (SW - qw) / 2, (SH - qh) / 2 - SH * 0.06); /* 위로 올림 */
        upload(sceneDTex, 6, photoD, true);
      }
      if (imgEOk) {
        photoE.width = SW; photoE.height = SH;
        pectx.fillStyle = '#050505'; pectx.fillRect(0, 0, SW, SH);
        if ('filter' in pectx) pectx.filter = 'blur(' + (SW * 0.012).toFixed(1) + 'px) brightness(0.5)';
        coverDraw(pectx, imgE, SW, SH, 0.5, 0.5); pectx.filter = 'none';
        var ew = imgE.naturalWidth, eh = imgE.naturalHeight, ek = Math.min(SW / ew, SH / eh), gw = ew * ek, gh = eh * ek;
        var oc3 = document.createElement('canvas'); oc3.width = Math.round(gw); oc3.height = Math.round(gh);
        var o3 = oc3.getContext('2d'); o3.drawImage(imgE, 0, 0, oc3.width, oc3.height);
        var mc3 = document.createElement('canvas'); mc3.width = oc3.width; mc3.height = oc3.height;
        var m3 = mc3.getContext('2d'), f3 = Math.min(oc3.width, oc3.height) * 0.04;
        if ('filter' in m3) m3.filter = 'blur(' + (f3 * 0.6).toFixed(1) + 'px)';
        m3.fillStyle = '#fff'; m3.fillRect(f3, f3, oc3.width - 2 * f3, oc3.height - 2 * f3);
        o3.globalCompositeOperation = 'destination-in'; o3.drawImage(mc3, 0, 0);
        pectx.drawImage(oc3, (SW - gw) / 2, (SH - gh) / 2);
        var tx = function (nx) { return ((SW - gw) / 2 + nx * gw) / SW; };
        var ty = function (ny) { return 1 - ((SH - gh) / 2 + ny * gh) / SH; };
        avA = [tx(0.265), ty(0.945), ty(0.145), 0.108 * gw / SW]; /* 아바타: 가운데 x, 발 v, 머리 v, 절반 너비 */
        avB = [tx(0.22), ty(0.47), tx(0.29), ty(0.36)];           /* 기타 치는 손, 넥 잡은 손 */
        upload(sceneETex, 7, photoE, true);
      }
    }

    /* 비 맞은 모습: 이마·머리, 양복, 색소폰 위에 맺힌 물방울 (원본 1333x2000 좌표 기준) */
    var WET_HEAD = { cx: 565, cy: 235, rx: 125, ry: 80 };
    var WET_JACKET = [
      [[250, 640], [450, 520], [520, 760], [540, 1100], [470, 1290], [240, 1240], [120, 1100], [150, 800]],
      [[740, 540], [900, 610], [1000, 880], [1040, 1000], [880, 1100], [800, 1010], [770, 780]]];
    var WET_SAX = [
      [[966, 543], [962, 599], [971, 667], [997, 715], [999, 804], [1006, 878], [969, 918], [877, 948], [686, 1044], [514, 1148],
        [392, 1212], [514, 1268], [659, 1225], [877, 1062], [1010, 944], [1054, 910], [1058, 867], [1046, 799], [1027, 741],
        [1015, 694], [1022, 641], [1018, 601], [972, 552]],
      [[232, 1300], [186, 1328], [176, 1390], [181, 1462], [232, 1518], [305, 1548], [377, 1520], [432, 1500], [440, 1440], [436, 1360], [430, 1300]]];
    function pip(poly, x, y) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }
    function wetDrop(c, x, y, r, streak) {
      if (streak) { /* 흘러내린 물줄기 */
        var len = r * rnd(7, 16), g = c.createLinearGradient(x, y, x, y + len);
        g.addColorStop(0, 'rgba(255,255,255,0.30)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x - r * 0.28, y, r * 0.56, len);
      }
      c.fillStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.ellipse(x + r * 0.2, y + r * 0.55, r * 0.95, r * 0.8, 0, 0, 6.2832); c.fill();
      var g2 = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
      g2.addColorStop(0, 'rgba(255,255,255,0.12)'); g2.addColorStop(0.75, 'rgba(255,255,255,0.06)'); g2.addColorStop(1, 'rgba(255,255,255,0.34)');
      c.fillStyle = g2; c.beginPath(); c.ellipse(x, y, r, r * 1.08, 0, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = Math.max(0.6, r * 0.12); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(x - r * 0.32, y - r * 0.38, r * 0.3, r * 0.18, -0.6, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(255,238,205,0.5)'; c.lineWidth = Math.max(0.6, r * 0.16);
      c.beginPath(); c.arc(x, y, r * 0.78, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
    }
    function paintWet(px, py, pw, ph) {
      var s = pw / 1333, sy = ph / 2000, k = W < 700 ? 0.7 : 1, n, x, y, r;
      function put(ox, oy, rOrig, streakP) { wetDrop(sctx, px + ox * s, py + oy * sy, rOrig * s, Math.random() < streakP); }
      for (n = 0; n < 26 * k; n++) { /* 머리·이마 */
        var a = rnd(0, 6.2832), rr = Math.sqrt(Math.random());
        put(WET_HEAD.cx + Math.cos(a) * WET_HEAD.rx * rr, WET_HEAD.cy + Math.sin(a) * WET_HEAD.ry * rr, rnd(6, 15), 0.25);
      }
      function sampleIn(polys, count, rmin, rmax, streakP) {
        var done = 0, guard = 0;
        while (done < count && guard++ < count * 40) {
          var poly = polys[Math.floor(Math.random() * polys.length)], minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
          poly.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
          x = rnd(minx, maxx); y = rnd(miny, maxy);
          if (pip(poly, x, y)) { put(x, y, rnd(rmin, rmax), streakP); done++; }
        }
      }
      sampleIn(WET_JACKET, Math.round(72 * k), 4, 11, 0.2); /* 양복 */
      sampleIn(WET_SAX, Math.round(36 * k), 3, 8, 0.1);      /* 색소폰 */
    }

    /* 창밖 풍경: 밤비 속 금빛 불빛(보케) + 서 있는 아리스김 */
    function buildScene() {
      var mobile = W < 700;
      var SW = Math.min(2048, Math.round(W * dpr)), SH = Math.round(SW * H / W);
      sceneC.width = SW; sceneC.height = SH;
      var g = sctx.createLinearGradient(0, 0, 0, SH);
      g.addColorStop(0, '#04060c'); g.addColorStop(0.55, '#0a0f1e'); g.addColorStop(1, '#1c1308');
      sctx.fillStyle = g; sctx.fillRect(0, 0, SW, SH);
      var gg = sctx.createRadialGradient(SW * 0.5, SH * 0.55, 0, SW * 0.5, SH * 0.55, SH * 0.75);
      gg.addColorStop(0, 'rgba(232,184,74,0.24)'); gg.addColorStop(1, 'rgba(232,184,74,0)');
      sctx.fillStyle = gg; sctx.fillRect(0, 0, SW, SH);
      sctx.globalCompositeOperation = 'lighter';
      var cols = ['255,196,92', '255,160,64', '232,184,74', '255,236,190', '255,200,110', '120,150,255'];
      var count = mobile ? 46 : 84;
      for (var i = 0; i < count; i++) {
        var r = rnd(SH * 0.02, SH * 0.09), x = rnd(0, SW), y = rnd(SH * 0.22, SH * 1.02);
        var c = cols[Math.floor(Math.random() * (Math.random() < 0.12 ? cols.length : cols.length - 1))], a = rnd(0.08, 0.42);
        var b = sctx.createRadialGradient(x, y, 0, x, y, r);
        b.addColorStop(0, 'rgba(' + c + ',' + a + ')'); b.addColorStop(0.72, 'rgba(' + c + ',' + (a * 0.8) + ')'); b.addColorStop(1, 'rgba(' + c + ',0)');
        sctx.fillStyle = b; sctx.beginPath(); sctx.arc(x, y, r, 0, 6.2832); sctx.fill();
      }
      sctx.globalCompositeOperation = 'source-over';
      if (portraitOk) { /* 배경이 투명한 누끼 사진: 인물만 밤 풍경 위에 놓인다 */
        var ph = SH * (mobile ? 0.8 : 0.88), pw = ph * portrait.naturalWidth / portrait.naturalHeight;
        var px = SW * 0.5 - pw / 2, py = SH * (mobile ? 0.2 : 0.18);
        sctx.drawImage(portrait, px, py, pw, ph);
      }
      sctx.fillStyle = 'rgba(18,34,80,0.14)'; sctx.fillRect(0, 0, SW, SH);
      upload(sceneTex, 0, sceneC, true);
      /* 부드러운 흐림(가우시안): 작은 그림을 늘려 흐리게 하면 네모 무늬가 생겨서 쓰지 않는다 */
      blurC.width = SW; blurC.height = SH;
      var rad = Math.max(1.5, SW * 0.0013);
      bctx.drawImage(sceneC, 0, 0);
      if ('filter' in bctx) {
        bctx.filter = 'blur(' + rad.toFixed(1) + 'px)'; bctx.drawImage(sceneC, 0, 0); bctx.filter = 'none';
      } else { /* 구형 브라우저: 두 번에 나눠 줄였다 키워서 부드럽게 */
        var tmp = document.createElement('canvas'), k = 3;
        tmp.width = Math.round(SW / k); tmp.height = Math.round(SH / k);
        var tc = tmp.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(sceneC, 0, 0, tmp.width, tmp.height);
        bctx.imageSmoothingQuality = 'high'; bctx.drawImage(tmp, 0, 0, SW, SH);
      }
      upload(blurTex, 3, blurC, false);
      buildPhotos(SW, SH);
    }

    /* 빗방울 모양: 가운데에서 가장자리로 갈수록 기울어지는 "렌즈" 지도 */
    var RADII = [2.6, 4.2, 6.5, 10, 14];
    function makeSprite(r) {
      var S = Math.ceil(r * 2 + 3), c = document.createElement('canvas'); c.width = c.height = S;
      var x = c.getContext('2d'), im = x.createImageData(S, S), d = im.data;
      for (var j = 0; j < S; j++) for (var i = 0; i < S; i++) {
        var dx = (i + 0.5 - S / 2) / r, dy = (j + 0.5 - S / 2) / r, dist = Math.sqrt(dx * dx + dy * dy), k = (j * S + i) * 4;
        if (dist <= 1.05) {
          var a = dist < 0.88 ? 1 : Math.max(0, (1.05 - dist) / 0.17);
          d[k] = Math.round(128 + dx * 127); d[k + 1] = Math.round(128 - dy * 127);
          d[k + 2] = Math.round(r / 32 * 255); d[k + 3] = Math.round(a * 255);
        }
      }
      x.putImageData(im, 0, 0); return c;
    }
    var sprites = RADII.map(makeSprite);

    var statics = [], sliders = [];
    function addStatic(x, y, b) { statics.push({ x: x, y: y, b: b }); if (statics.length > 80) statics.shift(); }
    function pickBucket() { var q = Math.random(); return q < 0.55 ? 0 : q < 0.82 ? 1 : q < 0.94 ? 2 : q < 0.985 ? 3 : 4; }
    function newSlider(x, y) {
      return { x: x, bx: x, y: y, b: Math.random() < 0.8 ? 2 : 3, vy: 0, state: 'stick', wait: rnd(0, 2.5), run: 0, vmax: 60, wob: rnd(0, 6.28), lx: x, ly: y, dist: 0 };
    }
    function populate() {
      statics.length = 0; sliders.length = 0;
      var n = Math.min(60, Math.round(DW * DH / 9000));
      for (var i = 0; i < n; i++) addStatic(rnd(0, DW), rnd(0, DH), pickBucket());
      var m = Math.max(4, Math.round(DW / 130));
      for (var k = 0; k < m; k++) sliders.push(newSlider(rnd(0, DW), rnd(0, DH * 0.9)));
      tctx.fillStyle = '#000'; tctx.fillRect(0, 0, DW, DH);
    }

    function resize() {
      W = hero.clientWidth; H = hero.clientHeight;
      if (!W || !H) return;   /* 화면이 아직 없거나 크기가 0이면 그리지 않는다 (그라데이션 오류 방지) */
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (W * H * dpr * dpr > 1.7e6) dpr = Math.sqrt(1.7e6 / (W * H));
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      DW = Math.max(60, Math.round(W / 2)); DH = Math.max(40, Math.round(H / 2));
      dropC.width = trailC.width = DW; dropC.height = trailC.height = DH;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.uDropSize, DW, DH); gl.uniform2f(U.uRes, cv.width, cv.height);
      populate(); buildScene();
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 300); });

    /* 손가락/마우스로 닦으면 맑아지고, 누르면 방울이 하나 더 맺혀 흘러내림 */
    var hr0 = null;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / 2, y = (e.clientY - r.top) / 2;
      tctx.fillStyle = 'rgba(255,255,255,0.32)'; tctx.beginPath(); tctx.arc(x, y, 15, 0, 6.2832); tctx.fill();
    }, { passive: true });
    hero.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('a,button')) return;
      var r = hero.getBoundingClientRect(); var s = newSlider((e.clientX - r.left) / 2, (e.clientY - r.top) / 2);
      s.b = 3; s.state = 'slide'; s.run = rnd(0.8, 1.6); s.vmax = rnd(55, 90); sliders.push(s); if (sliders.length > 40) sliders.shift();
    }, { passive: true });

    var last = 0, visible = true, running = false, t0 = performance.now(), fade = 0, focusT0 = 0;
    function step(dt) {
      for (var i = 0; i < sliders.length; i++) {
        var s = sliders[i];
        if (s.state === 'slide') {
          s.vy = Math.min(s.vy + 130 * dt, s.vmax); s.run -= dt;
          if (s.run <= 0) { s.state = 'stick'; s.wait = rnd(0.5, 3.4); }
        } else {
          s.vy *= Math.pow(0.02, dt);
          if (s.vy < 1.5) { s.vy = 0; s.wait -= dt; if (s.wait <= 0) { s.state = 'slide'; s.run = rnd(0.35, 1.7); s.vmax = rnd(30, 95); } }
        }
        s.lx = s.x; s.ly = s.y;
        s.y += s.vy * dt;
        if (s.vy > 0) s.x = s.bx + Math.sin(s.wob + s.y * 0.035) * 0.7; /* 거의 곧게 아래로만 (옆으로 가지 않음) */
        if (s.vy > 0) {
          tctx.strokeStyle = 'rgba(255,255,255,0.85)'; tctx.lineWidth = RADII[s.b] * 1.5; tctx.lineCap = 'round';
          tctx.beginPath(); tctx.moveTo(s.lx, s.ly); tctx.lineTo(s.x, s.y); tctx.stroke();
          s.dist += s.vy * dt;
          if (s.dist > rnd(30, 70)) { s.dist = 0; addStatic(s.x + rnd(-1.6, 1.6), s.y - RADII[s.b] - rnd(1, 5), 0); }
        }
        if (s.y > DH + 18) { sliders[i] = newSlider(rnd(0, DW), rnd(-16, -4)); }
      }
      if (Math.random() < 0.3 * dt) addStatic(rnd(0, DW), rnd(0, DH), pickBucket());
      tctx.fillStyle = 'rgba(0,0,0,' + (0.0025 * dt * 60) + ')'; tctx.fillRect(0, 0, DW, DH);
    }
    var splash = [], cleared = false;
    function paintDrops(glassA) {
      dctx.clearRect(0, 0, DW, DH);
      dctx.globalAlpha = glassA;
      for (var i = 0; i < statics.length; i++) { var d = statics[i], sp = sprites[d.b]; dctx.drawImage(sp, d.x - sp.width / 2, d.y - sp.height / 2); }
      for (var j = 0; j < sliders.length; j++) { var s = sliders[j], sp2 = sprites[s.b], hh = sp2.height * 1.2; dctx.drawImage(sp2, s.x - sp2.width / 2, s.y - hh / 2, sp2.width, hh); }
      for (var q = 0; q < splash.length; q++) { var p3 = splash[q], sp3 = sprites[p3.b]; dctx.globalAlpha = p3.a; dctx.drawImage(sp3, p3.x - sp3.width / 2, p3.y - sp3.height / 2); }
      dctx.globalAlpha = 1;
    }
    function stepSplash(dt) { /* 튀어 나간 물방울: 사방으로 날아가다 중력으로 떨어지며 사라짐 */
      for (var i = splash.length - 1; i >= 0; i--) {
        var p = splash[i]; p.age += dt;
        if (p.age >= p.life || p.y > DH + 40) { splash.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt;
        p.a = Math.min(1, (1 - p.age / p.life) * 1.6);
      }
    }
    function doBurst() {
      for (var i = 0; i < 170; i++) {
        var ang = rnd(0, 6.2832), v = rnd(140, 700);
        splash.push({ x: DW * 0.5 + rnd(-30, 30), y: DH * 0.5 + rnd(-20, 20), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - rnd(0, 120),
          b: 1 + Math.floor(Math.random() * 4), age: 0, life: rnd(0.9, 1.9), a: 1 });
      }
      setTimeout(function () { hero.classList.add('flip'); }, 250);
    }
    function cl(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
    function sst(lo, hi, v) { var t = cl((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); }
    /* 시간표 (ms, 초점이 맞기 시작한 때부터): 연주자 -> 카네기홀 사진 -> 폭발 + 아리쇼 사진 */
    var T_FOCUS = 2600, T_HOLD = 2500, T_B = 3200 + T_HOLD, D_B = 900, T_BURST = 6000 + T_HOLD;   /* T_HOLD: 첫 사진(연주자 초상)을 2.5초 더 보여 준다. 폭발을 1초 늦춰 「클래식에서」도 1초 더 머문다 */
    var burstT0 = 0, nextPulse = 0, pulseT0 = 0;
    var T_FIN = 3600; /* 폭발 뒤 3.6초에 지진과 불기둥 시작 */
    var shakeX = 0, shakeY = 0, lastStrum = -1;
    var avA = [0.23, 0.1, 0.8, 0.1], avB = [0.2, 0.5, 0.3, 0.6];
    var vEl = $('#verse'), vState = {};
    function vset(cls, on) { if (vEl && vState[cls] !== on) { vState[cls] = on; vEl.classList.toggle(cls, on); if (on && window.ArisAudio) window.ArisAudio.cue(cls); if (on && cls === 'fin') startGuide(); } }
    /* 기타 아바타가 나오고 약 3초 뒤: 3D 연주자가 튀어나와 손가락으로 아래를 가리키고, 홈페이지가 페이드 아웃되며 자동으로 아래로 스크롤된다.
       사용자가 직접 건드리면(휠, 터치, 키보드, 클릭) 즉시 멈춘다. 이미 스크롤했거나 '움직임 줄이기' 설정이면 하지 않는다. */
    var guideStarted = false;
    function startGuide() {
      if (guideStarted) return; guideStarted = true;
      if (window.scrollY > 40 || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      var cancelled = false, gp = null, gEl = $('#guide'), gCv = $('#guideGL');
      var evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
      function stop() { if (cancelled) return; cancelled = true; hero.classList.remove('leaving'); evs.forEach(function (n) { window.removeEventListener(n, stop); }); }
      evs.forEach(function (n) { window.addEventListener(n, stop, { passive: true }); });
      setTimeout(function () {
        if (cancelled) return;
        import('./avatar3d.js').then(function (m) {
          if (cancelled) return;
          try { gp = m.createSaxPlayer(gCv, { fov: 35, camY: 1.14, camZ: 3.9, lookY: 1.138, guide: true, idle: true }); } catch (e) { gp = null; return; }
          var hint = $('.guide-hint span'); if (hint) hint.textContent = '안녕하세요, 아리스 김입니다!';
          gp.setGuide(0); gEl.classList.add('on'); gp.wave();   /* 나오자마자 손을 흔들어 인사 */
          setTimeout(function () { if (cancelled || !gp) return; gp.setPoint(1, 1, 'down'); gEl.classList.add('pointing'); if (hint) hint.textContent = '아래로 드래그하세요'; }, 1800);   /* 인사 뒤 아래를 가리킴 */
          var t0 = performance.now(); (function pop() { var p = Math.min((performance.now() - t0) / 1500, 1); gp.setGuide(p); if (p < 1) requestAnimationFrame(pop); })();
        }).catch(function () {});
      }, 3000);
      setTimeout(function () {
        if (cancelled) return;
        var tgt = $('#prelude'); if (!tgt) return;
        hero.classList.add('leaving');
        var y0 = window.scrollY, y1 = tgt.getBoundingClientRect().top + y0, d = 2800, ta = performance.now();
        (function step() {
          if (cancelled) return;
          var p = Math.min((performance.now() - ta) / d, 1), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          window.scrollTo(0, y0 + (y1 - y0) * e);
          if (p < 1) { requestAnimationFrame(step); return; }
          evs.forEach(function (n) { window.removeEventListener(n, stop); }); hero.classList.remove('leaving');
          setTimeout(function () { if (gp) { gp.dispose(); gEl.classList.remove('on'); } }, 600);
        })();
      }, 3000 + 2700);
    }
    function frame(now) {
      if (!visible || document.hidden) { running = false; return; }
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
      var tsec = (now - t0) / 1000;
      var rel = focusT0 ? now - focusT0 : -1;
      var p = rel > 0 ? cl(rel / T_FOCUS, 0, 1) : 0, e = p * p * (3 - 2 * p);
      var mixB = rel > 0 ? sst(T_B, T_B + D_B, rel) : 0;
      var zoomB = 1.0 + 0.03 * cl((rel - T_B) / (T_BURST - T_B), 0, 1);
      if (!burstT0 && rel > T_BURST) { burstT0 = now; doBurst(); nextPulse = now + 7000; }
      var bt = burstT0 ? now - burstT0 : -1;
      var mixC = bt >= 0 ? cl(bt / 90, 0, 1) : 0;
      var glitch = 0, shock = 0, flash = 0, zoomC = 1, satC = 0, glassA = 1;
      if (bt >= 0) {
        glitch = Math.exp(-bt / 520) * (0.55 + 0.45 * Math.random());      /* 폭발 직후 크게 지지직 */
        shock = bt < 1300 ? bt / 1300 : 0;                                  /* 퍼져 나가는 충격파 */
        flash = Math.exp(-bt / 260);
        zoomC = 1 + 0.22 * (1 - Math.pow(1 - cl(bt / 4200, 0, 1), 3));     /* 가운데로 줌인 */
        satC = sst(150, 1900, bt);                                          /* 흑백에서 컬러로 */
        glassA = 1 - sst(150, 1300, bt);                                    /* 유리 위 물방울은 튀어 사라짐 */
        if (bt < T_FIN && now > nextPulse) { pulseT0 = now; nextPulse = now + rnd(6500, 10500); }
        if (bt < T_FIN && pulseT0 && now - pulseT0 < 330) glitch = Math.max(glitch, 0.55 * Math.exp(-(now - pulseT0) / 150) * (0.6 + 0.4 * Math.random())); /* 가끔 짧게 지지직 (이벤트 환기) */
      }
      var mixD = 0, zoomD = 1.1, flashD = 0, mixE = 0, zoomE = 1.1, shim = -1, pilA = 0, quake = 0, avAmp = 0;
      var pil0 = 0, pil1 = 0, pil2 = 0, pil3 = 0;
      if (bt >= T_FIN - 700) {
        var ft = bt - T_FIN; /* 지진(ft<0은 전조) -> 불기둥 4개 -> 불길이 올라가며 지옥 사진이 드러남 -> 위에서부터 타 내려가며 금박 타이틀 */
        quake = (sst(-700, 300, ft) * 0.5 + sst(300, 1500, ft) * 0.5) * (1 - sst(3800, 5600, ft));
        var rise = function (t0) { return sst(t0, t0 + 950, ft) * 1.3; };
        pil0 = rise(200); pil1 = rise(520); pil2 = rise(840); pil3 = rise(1160);
        pilA = (1 - sst(2600, 3800, ft)) * (ft > 150 ? 1 : 0);
        mixD = sst(900, 3100, ft);
        zoomD = 1 + 0.1 * (1 - cl(ft / 6500, 0, 1));
        flashD = 0.45 * Math.exp(-Math.abs(ft - 1200) / 260);
        mixE = sst(6200, 8700, ft);
        zoomE = 1 + 0.1 * (1 - cl((ft - 6200) / 5500, 0, 1));
        shim = cl((ft - 8900) / 2600, 0, 1) * 2.1 - 0.5;
        avAmp = sst(8300, 9800, ft) * (1 - 0.75 * sst(22500, 26000, ft)); /* 타이틀이 나타난 뒤 아바타가 움직이기 시작 */
      }
      if (avAmp > 0.55) { var strum = Math.floor((tsec * 26.4 + 1.2) / 6.2832); if (strum !== lastStrum) { lastStrum = strum; if (window.ArisAudio) window.ArisAudio.guitar(strum); } }   /* 아바타의 오른손이 한 번 내려칠 때마다 기타 소리 */
      var amp = quake * 0.0095;
      shakeX = (Math.random() - 0.5) * 2 * amp + Math.sin(now * 0.05) * amp * 0.4;
      shakeY = (Math.random() - 0.5) * 2 * amp * 1.3 + Math.sin(now * 0.037) * amp * 0.5;
      var hb = hero.querySelector('.hero-body');
      var qtr = quake > 0.01 ? 'translate(' + (shakeX * W * 0.9).toFixed(1) + 'px,' + (-shakeY * H * 0.9).toFixed(1) + 'px)' : '';
      if (hb) hb.style.transform = qtr;
      if (vEl) vEl.style.transform = qtr;
      var vt = bt >= 0 ? bt - T_FIN : -99999; /* 글자: 카네기홀에서 '클래식에서' -> 폭발에 깨짐 -> 불기둥과 함께 '이 시대의 클래식으로' -> 타이틀로 불타 사라짐 */
      vset('on1', rel > T_B + 300);
      vset('shatter', bt >= 0);
      vset('on2', vt > 300);
      vset('out', vt > 6000);
      vset('fin', vt > 8300);
      if (glassA > 0.002 || splash.length) {
        step(dt); stepSplash(dt); paintDrops(glassA);
        upload(dropTex, 1, dropC, false); upload(trailTex, 2, trailC, false); cleared = false;
      } else if (!cleared) { dctx.clearRect(0, 0, DW, DH); upload(dropTex, 1, dropC, false); cleared = true; }
      gl.uniform1f(U.uTime, tsec);
      gl.uniform1f(U.uFocus, e); gl.uniform1f(U.uGlass, 1);
      gl.uniform1f(U.uZoom, 1 + 0.26 * e + 0.008 * Math.sin(tsec * 0.5));
      gl.uniform1f(U.uMixB, mixB); gl.uniform1f(U.uZoomB, zoomB);
      gl.uniform1f(U.uMixC, mixC); gl.uniform1f(U.uZoomC, zoomC); gl.uniform1f(U.uSatC, satC);
      gl.uniform1f(U.uGlitch, glitch); gl.uniform1f(U.uShock, shock); gl.uniform1f(U.uFlash, Math.max(flash, flashD));
      gl.uniform1f(U.uMixD, mixD); gl.uniform1f(U.uZoomD, zoomD);
      gl.uniform1f(U.uMixE, mixE); gl.uniform1f(U.uZoomE, zoomE); gl.uniform1f(U.uShim, shim); gl.uniform1f(U.uPilA, pilA);
      gl.uniform4f(U.uPil, pil0, pil1, pil2, pil3);
      gl.uniform1f(U.uAvAmp, avAmp); gl.uniform4f(U.uAvA, avA[0], avA[1], avA[2], avA[3]); gl.uniform4f(U.uAvB, avB[0], avB[1], avB[2], avB[3]); gl.uniform2f(U.uShake, shakeX, shakeY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    function kick() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) { visible = ents[0].isIntersecting; if (visible) kick(); }, { threshold: 0.02 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

    resize(); hero.classList.add('gl'); kick();
    /* 인트로: 글자가 열리면 3D 연주자가 먼저 나타나 얼굴 -> 물방울 맺힌 선글라스로 줌인, 렌즈가 화면을 채우면 비 오는 창문 장면으로 이어진다 */
    var avCv = $('#avatarGL'), av = null;
    if (avCv) { import('./avatar3d_classic.js').then(function (m) { try { av = m.createSaxPlayer(avCv, { fov: 26 }); av.setIntro(0); } catch (e) { av = null; } }).catch(function () { av = null; }); }
    function startRain(delay) { setTimeout(function () { cv.classList.add('on'); focusT0 = performance.now() + 600; }, delay); }
    function runIntro() { /* 이마의 땀이 흘러내리며 화면을 닦아 비 오는 창문 장면을 드러낸다 */
      var ta = performance.now(), D = 2700, W0 = 2300, WD = 4200, wiped = false;
      var A = window.ArisAudio; if (A) { A.cue('intro'); [[W0, 'curtain'], [W0 + 1850, 'slit'], [W0 + 2050, 'glasses'], [W0 + 2650, 'wink'], [W0 + 3500, 'closing']].forEach(function (c) { setTimeout(function () { A.cue(c[1]); }, c[0]); }); }
      avCv.classList.add('on'); cv.classList.add('on'); /* 비 오는 장면은 불투명한 3D 화면 뒤에서 미리 준비 */
      (function step() {
        var el = performance.now() - ta, p = Math.min(el / D, 1);
        av.setIntro(p);
        if (el > W0) { if (!wiped) { wiped = true; focusT0 = performance.now() + 300; } av.setWipe(el - W0); }
        if (el < W0 + WD + 250) { requestAnimationFrame(step); return; }
        avCv.classList.remove('on'); avCv.style.display = 'none'; av.dispose();
      })();
    }
    var iv = setInterval(function () {
      if (document.body.classList.contains('go')) { clearInterval(iv); setTimeout(function () { if (av) runIntro(); else startRain(0); }, 2300); }
    }, 200);
  })();

  /* 10. 스크롤하면 커튼이 열리듯 사진이 펼쳐진다 (틈 -> 양옆으로 열림 + 멀리서 다가옴 + 초점이 맞음 + 금빛이 번짐) */
  (function showcase() {
    var sec = $('#showcase');
    if (!sec) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
    function ss(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    var ticking = false;
    function update() {
      ticking = false;
      var r = sec.getBoundingClientRect(), total = r.height - window.innerHeight;
      var p = reduce ? 1 : clamp(-r.top / Math.max(total, 1), 0, 1);
      var open = ss(0.0, 0.5, p), focus = ss(0.12, 0.72, p), dolly = ss(0.0, 0.95, p);
      var s = sec.style, mobile = window.innerWidth < 700;
      s.setProperty('--ix', ((1 - open) * 49.7).toFixed(2) + '%');
      s.setProperty('--iy', ((1 - ss(0.3, 0.7, p)) * (mobile ? 9 : 7)).toFixed(2) + '%');
      s.setProperty('--sc', (1.32 - 0.32 * dolly).toFixed(3));
      s.setProperty('--bl', (16 * (1 - focus)).toFixed(2) + 'px');
      s.setProperty('--br', (0.55 + 0.45 * focus).toFixed(3));
      s.setProperty('--gl', (ss(0.32, 0.62, p) * (1 - 0.45 * ss(0.78, 1, p))).toFixed(3));
      s.setProperty('--sl', clamp(1 - open * 1.7, 0, 1).toFixed(3));
      s.setProperty('--co', ss(0.62, 0.86, p).toFixed(3));
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* 11. 조명이 켜지는 5막 */
  $$('.acts').forEach(function (sec) {
    var items = $$('.act', sec), imgs = items.map(function (i) { return $('img', i); });
    var zms = items.map(function (i) { return parseFloat(i.dataset.zm) || 1.7; });
    var oys = items.map(function (i) { return i.dataset.oy ? i.dataset.oy.split(',').map(Number) : null; }); /* 위에서 아래로 내려오는 카메라 */
    var sats = items.map(function (i) { return i.dataset.sat !== undefined ? parseFloat(i.dataset.sat) : 1; }); /* 흑백에서 컬러로 */
    var no = $('.acts-no', sec), bar = $('.acts-bar i', sec);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
    function ss(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    var N = items.length, ticking = false, lastIdx = -1;
    function update() {
      ticking = false;
      var r = sec.getBoundingClientRect(), total = r.height - window.innerHeight;
      var t = clamp(-r.top / Math.max(total, 1), 0, 1) * N;
      items.forEach(function (el, k) {
        var fin = k === 0 ? 1 : ss(k - 0.18, k + 0.02, t);
        var fout = k === N - 1 ? 1 : 1 - ss(k + 0.82, k + 1.02, t);
        el.style.opacity = (fin * fout).toFixed(3);
        var z = ss(k - 0.1, k + 0.9, t), lit = ss(k - 0.05, k + 0.3, t);
        imgs[k].style.setProperty('--s', (1 + (zms[k] - 1) * (reduce ? 0 : z)).toFixed(3));
        imgs[k].style.setProperty('--b', (0.45 + 0.55 * lit).toFixed(3));
        imgs[k].style.setProperty('--sa', (sats[k] + (1 - sats[k]) * ss(k + 0.05, k + 0.62, t)).toFixed(3));
        if (oys[k]) imgs[k].style.setProperty('--oy', (oys[k][0] + (oys[k][1] - oys[k][0]) * (reduce ? 1 : z)).toFixed(1) + '%');
        el.style.setProperty('--rv', (135 - 85 * (reduce ? 0 : z)).toFixed(1) + '%');
      });
      var idx = clamp(Math.floor(t + 0.0001), 0, N - 1);
      if (no && idx !== lastIdx) { no.textContent = '0' + (idx + 1); lastIdx = idx; }
      if (bar) bar.style.setProperty('--pg', (clamp(t / N, 0, 1) * 100).toFixed(1) + '%');
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  });

  /* 12. 스님 영상: 화면에 들어오면 소리 없이 자동 재생, 벗어나면 멈춤. SOUND 버튼으로 소리를 켜면 선택이 저장된다 */
  (function monk() {
    var v = $('#monk'), b = $('#monkSnd'); if (!v || !b) return;
    var KEY = 'ak_monk', want = false, inView = false;
    try { want = localStorage.getItem(KEY) === 'on'; } catch (e) { /* 저장 불가 환경 */ }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { v.removeAttribute('loop'); v.controls = true; b.style.display = 'none'; return; }
    function paint() { b.textContent = v.muted ? 'SOUND OFF' : 'SOUND ON'; b.classList.toggle('on', !v.muted); b.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); v.loop = v.muted; }
    function play() { var p = v.play(); if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; paint(); v.play().catch(function () {}); } }); }
    function setSound(on, save) {
      v.muted = !on; paint();
      if (on && window.ArisAudio) window.ArisAudio.scrollFade();          /* 스님 목소리가 들리는 동안에는 배경 음악을 내린다 */
      if (save) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* 무시 */ } want = on; }
      if (inView) play();
    }
    b.addEventListener('click', function () { setSound(v.muted, true); if (!v.muted) { v.currentTime = 0; } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        inView = ents[0].isIntersecting;
        if (inView) { if (want && v.muted) { v.muted = false; paint(); } play(); } else { v.pause(); }
      }, { threshold: 0.5 }).observe(v);
    } else { play(); }
    paint();
  })();

  $('#yr').textContent = new Date().getFullYear();
})();
