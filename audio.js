/* 아리스김 홈페이지 사운드 — 전부 WebAudio 코드로 합성 (소리 파일 0개)
   window.ArisAudio.cue(이름) 으로 장면에 맞춰 효과음/연주를 재생하고, ArisAudio.render()로 전체를 WAV로 뽑을 수 있어요. */
(function () {
  'use strict';
  var KEY = 'ak_sound';                       /* 소리 켜기 선택은 저장해서 다음 방문에도 유지 */
  var BPM = 108, BEAT = 60 / BPM;
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  /* ---------- 엔진: 어떤 AudioContext(실시간/오프라인)에도 같은 코드로 소리를 만든다 ---------- */
  function Engine(ctx) {
    var E = this;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;
    var master = ctx.createGain(); master.gain.value = 0.72; comp.connect(master); master.connect(ctx.destination);
    var dry = ctx.createGain(); dry.connect(comp);
    var wet = ctx.createGain(); wet.gain.value = 0.34;
    var conv = ctx.createConvolver(); conv.buffer = impulse(2.4, 2.6); wet.connect(conv); conv.connect(comp);
    function send(node, amt) { node.connect(dry); var g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(wet); }
    function impulse(sec, decay) { var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
    var nbuf = (function () { var n = ctx.sampleRate * 4, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; })();
    function noise(t, dur) { var s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true; s.start(t, Math.random() * 2); s.stop(t + dur + 0.05); return s; }
    function env(g, t, a, peak, hold, rel) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
    function tone(type, f, t, dur, vol, o) {
      o = o || {}; var os = ctx.createOscillator(); os.type = type; os.frequency.setValueAtTime(f, t);
      if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(o.f2, 1), t + (o.glide || dur));
      var g = ctx.createGain(); env(g, t, o.a || 0.004, vol, Math.max(dur - (o.a || 0.004) - (o.r || 0.08), 0.001), o.r || 0.08);
      var out = g; if (o.lp) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; os.connect(lp); lp.connect(g); } else os.connect(g);
      os.start(t); os.stop(t + dur + 0.12); (o.dryOnly ? g.connect(dry) : send(g, o.rev === undefined ? 0.2 : o.rev)); return os;
    }
    function nz(t, dur, vol, type, f0, f1, q, rev) {
      var s = noise(t, dur), f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var g = ctx.createGain(); env(g, t, Math.min(0.02, dur * 0.3), vol, Math.max(dur * 0.35, 0.001), dur * 0.5); s.connect(f); f.connect(g); send(g, rev === undefined ? 0.15 : rev);
    }

    /* ----- 색소폰: 톱니파 3개 + 포먼트 + 비브라토 + 숨소리 ----- */
    function sax(midi, t, dur, vel, o) {
      o = o || {}; var f = mtof(midi), mix = ctx.createGain(), peak = (vel || 0.5) * 0.5;
      var oscs = [[ 'sawtooth', 0, 1 ], [ 'sawtooth', 7, 0.7 ], [ 'square', -1200, 0.28 ]].map(function (c) {
        var os = ctx.createOscillator(); os.type = c[0]; os.detune.value = c[1]; var g = ctx.createGain(); g.gain.value = c[2];
        os.frequency.setValueAtTime(f * Math.pow(2, (o.scoop === undefined ? -60 : o.scoop) / 1200), t); os.frequency.exponentialRampToValueAtTime(f, t + 0.07);
        os.connect(g); g.connect(mix); os.start(t); os.stop(t + dur + 0.2); return os;
      });
      var lfo = ctx.createOscillator(); lfo.frequency.value = o.vib || 5.3; var lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.depth === undefined ? 14 : o.depth, t + Math.min(0.28, dur * 0.7));
      lfo.connect(lg); oscs.forEach(function (os) { lg.connect(os.detune); }); lfo.start(t); lfo.stop(t + dur + 0.2);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2; lp.frequency.setValueAtTime(f * 2.2, t); lp.frequency.exponentialRampToValueAtTime(Math.min(f * 7, 7000), t + 0.09); lp.frequency.exponentialRampToValueAtTime(f * 3.6, t + dur);
      var fm1 = ctx.createBiquadFilter(); fm1.type = 'peaking'; fm1.frequency.value = 880; fm1.gain.value = 6; fm1.Q.value = 1.4;
      var fm2 = ctx.createBiquadFilter(); fm2.type = 'peaking'; fm2.frequency.value = 2300; fm2.gain.value = 5; fm2.Q.value = 1.8;
      var g = ctx.createGain(); env(g, t, 0.035, peak, Math.max(dur - 0.035 - 0.1, 0.001), 0.1);
      mix.connect(lp); lp.connect(fm1); fm1.connect(fm2); fm2.connect(g); send(g, o.rev === undefined ? 0.3 : o.rev);
      var b = noise(t, dur), bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 3200; bf.Q.value = 0.8; var bg = ctx.createGain(); env(bg, t, 0.03, peak * 0.12, Math.max(dur - 0.15, 0.001), 0.1); b.connect(bf); bf.connect(bg); send(bg, 0.2);
    }
    function phrase(notes, t0, vel, o) { notes.forEach(function (n) { sax(n[0], t0 + n[1] * BEAT, Math.max(n[2] * BEAT - 0.02, 0.06), vel, n[3] || o); }); }
    /* ---- 무겁고 신비로운 영화 톤: 느린 단선율, 저음 드론, 심장박동, 긴 잔향 ---- */
    var HOOK_S = [[69, 0, 1.7, { depth: 10, scoop: -30 }], [72, 1.9, 0.9, { depth: 12 }], [71, 2.9, 0.4], [69, 3.35, 0.4], [64, 3.95, 2.2, { depth: 18, scoop: -90 }]];
    var HOOK = [[69, 0, 2.2, { depth: 12, scoop: -35 }], [72, 2.4, 1, { depth: 14 }], [71, 3.5, 0.5], [69, 4, 0.5], [64, 4.6, 2.6, { depth: 20, scoop: -90 }], [70, 7.6, 0.45, { scoop: -140 }], [69, 8.1, 3, { depth: 24 }]];
    var HOOK2 = [[69, 0, 1.6, { depth: 12 }], [72, 1.8, 1.2, { depth: 14 }], [76, 3.2, 2.6, { depth: 26, vib: 5.6 }], [74, 6, 0.8], [72, 6.9, 0.8], [71, 7.8, 0.6], [69, 8.5, 4, { depth: 28 }]];
    function drone(t, dur, v) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.8; var g = ctx.createGain(); env(g, t, Math.min(2.5, dur * 0.4), v, Math.max(dur - 4, 0.01), Math.min(2.5, dur * 0.4));
      [33, 40, 45].forEach(function (m, i) { var o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'sawtooth'; o.frequency.value = mtof(m) * (1 + i * 0.0012); var og = ctx.createGain(); og.gain.value = i === 0 ? 1 : 0.35; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.2); });
      lp.connect(g); send(g, 0.35); }
    function thump(t, v) { tone('sine', 78, t, 0.3, v, { f2: 38, glide: 0.24, a: 0.004, r: 0.16, rev: 0.05, dryOnly: true }); tone('sine', 62, t + 0.34, 0.26, v * 0.6, { f2: 34, glide: 0.2, a: 0.004, r: 0.14, rev: 0.05, dryOnly: true }); }
    function heart(t, beats, v) { for (var i = 0; i < beats; i++) thump(t + i * 1.0, v * (1 - i * 0.04)); }
    function drip(t, v) { tone('sine', rnd(520, 880), t, 0.28, v, { f2: rnd(300, 420), glide: 0.2, a: 0.002, r: 0.2, rev: 0.85, lp: 1500 }); }
    function air(t, dur, v, up) { nz(t, dur, v, 'bandpass', up ? 160 : 1900, up ? 1900 : 160, 0.8, 0.5); }
    function shimmer(t, f, v) { [1, 1.5, 2.01, 3.02].forEach(function (m, i) { tone('sine', f * m, t, 3.2, v / (i + 1.4), { a: 0.18, r: 2.4, rev: 0.9 }); }); }
    function boom(t, v) { tone('sine', 110, t, 1.4, v, { f2: 24, glide: 1.1, a: 0.003, r: 0.7, rev: 0.25, dryOnly: true }); tone('sawtooth', 62, t, 0.9, v * 0.3, { f2: 28, glide: 0.8, lp: 200, a: 0.003, r: 0.5, rev: 0.15 }); nz(t, 1.6, v * 0.5, 'lowpass', 2200, 70, 0.7, 0.4); }
    function glass(t, v) { for (var i = 0; i < 22; i++) { var tt = t + Math.pow(Math.random(), 1.7) * 0.6; nz(tt, rnd(0.02, 0.08), v * rnd(0.3, 1), 'bandpass', rnd(3000, 9000), null, 7, 0.5); } }
    function tear(t, dur, v) { var n = Math.floor(dur / 0.05); for (var i = 0; i < n; i++) { if (Math.random() < 0.65) nz(t + i * 0.05, rnd(0.02, 0.05), v * rnd(0.4, 1), 'bandpass', rnd(300, 5200), null, 3, 0.05); } }
    function rumble(t, dur, v) { var s = noise(t, dur), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120; f.Q.value = 1.2; var g = ctx.createGain(); env(g, t, 0.6, v, dur - 1.6, 1.0); var lfo = ctx.createOscillator(); lfo.frequency.value = 6.5; var lg = ctx.createGain(); lg.gain.value = v * 0.45; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + dur + 0.1); s.connect(f); f.connect(g); g.connect(dry); tone('sine', 34, t, dur, v * 0.9, { a: 0.5, r: 0.9, rev: 0, dryOnly: true }); }
    function fire(t, v) { nz(t, 1.2, v, 'bandpass', 160, 2400, 0.8, 0.4); nz(t + 0.05, 1.0, v * 0.5, 'highpass', 1200, 4500, 0.6, 0.3); for (var i = 0; i < 12; i++) nz(t + rnd(0, 1.2), rnd(0.01, 0.03), v * rnd(0.3, 0.9), 'bandpass', rnd(1500, 6000), null, 4, 0.1); }
    function crash(t, v) { nz(t, 2.6, v, 'highpass', 4800, 3200, 0.5, 0.55); nz(t, 2.0, v * 0.55, 'bandpass', 8000, 6000, 1.2, 0.5); }
    function chord(t, dur, v, notes) { notes.forEach(function (m) { tone('sawtooth', mtof(m), t, dur, v, { lp: 1800, a: 0.5, r: 1.4, rev: 0.6 }); tone('sawtooth', mtof(m) * 1.003, t, dur, v * 0.7, { lp: 1600, a: 0.5, r: 1.4, rev: 0.6 }); }); }
    function gong(t, v) { [1, 1.59, 2.14, 2.65, 3.36, 4.2].forEach(function (m, i) { tone('sine', 98 * m, t, 5.5 / (i * 0.5 + 1), v / (i * 0.7 + 1), { a: 0.004, r: 3.2 / (i * 0.5 + 1), rev: 0.6 }); }); nz(t, 0.25, v * 0.35, 'bandpass', 900, 400, 1.2, 0.5); }
    function rain(t, dur, v) { var s = noise(t, dur), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4600; f.Q.value = 0.35; var g = ctx.createGain(); env(g, t, 1.2, v, Math.max(dur - 2.4, 0.01), 1.2); s.connect(f); f.connect(g); send(g, 0.1); }
    function bed(t, dur) { /* 처음부터 끝까지 이어지는 밤비 + 낮은 패드: 소리가 끊기는 구간이 없게 */
      rain(t, dur, 0.07); drone(t, dur, 0.1); }

    /* ----- 장면 신호(cue) ----- */
    E.cue = function (name, t) {
      t = (t === undefined ? ctx.currentTime : t) + 0.03;
      switch (name) {
        case 'bell':       /* 빈 머리를 종처럼 침: 묵직한 타격 + 청동 종의 울림 + 높은 금속 배음 */
          boom(t, 0.62); gong(t + 0.01, 0.6);
          [[196, 1], [394, 0.7], [587, 0.5], [1046, 0.34], [1760, 0.2]].forEach(function (p, i) { tone('sine', p[0], t, 4.2 / (i * 0.6 + 1), 0.17 * p[1], { a: 0.002, r: 2.8 / (i * 0.5 + 1), rev: 0.55 }); });
          nz(t, 0.09, 0.42, 'bandpass', 3200, 1800, 1.1, 0.3); break;
        case 'bed': bed(t, 60); break;
        case 'a_title': tone('sine', 52, t, 3, 0.1, { f2: 69, glide: 2, a: 0.8, r: 0.8, rev: 0.3, dryOnly: true }); tone('sawtooth', 110, t + 0.2, 2.2, 0.05, { f2: 440, glide: 2.0, lp: 1600, a: 1.2, r: 0.7, rev: 0.45 }); break;
        case 'a_wink': shimmer(t, 1175, 0.035); break;
        case 'a_shatter': boom(t, 0.42); glass(t, 0.09); break;
        case 'a_fin': boom(t, 0.36); gong(t + 0.05, 0.18); break;
        case 'title':      /* 첫 화면 ARIS KIM: 저음이 차오르고, 글자가 올라올 때마다 낮은 울림, 마지막에 묵직한 충격 */
          thump(t + 0.3, 0.3); tone('sine', 52, t, 3.2, 0.24, { f2: 69, glide: 2.4, a: 0.6, r: 0.9, rev: 0.3, dryOnly: true }); nz(t + 0.2, 2.3, 0.1, 'bandpass', 180, 3200, 1.0, 0.5);
          [57, 60, 62, 64, 67, 69, 72].forEach(function (m, i) { var tt = t + 0.95 + i * 0.11; thump(tt, 0.1 + i * 0.012); tone('sine', mtof(m), tt, 1.6, 0.05, { a: 0.03, r: 1.2, rev: 0.9, lp: 1400 }); });
          /* 중간 음역(노트북 스피커에서도 들리는 층): 차오르는 톱니파 라이저 + 글자마다 목관 같은 '톡' + 마지막 금속 울림 */
          tone('sawtooth', 110, t + 0.2, 2.2, 0.09, { f2: 440, glide: 2.0, lp: 1800, a: 1.2, r: 0.7, rev: 0.45 }); tone('sawtooth', 165, t + 0.2, 2.2, 0.05, { f2: 660, glide: 2.0, lp: 1600, a: 1.2, r: 0.7, rev: 0.45 });
          [57, 60, 62, 64, 67, 69, 72].forEach(function (m, i) { var tt = t + 0.95 + i * 0.11; nz(tt, 0.1, 0.14, 'bandpass', 520 + i * 90, 260, 3.2, 0.3); tone('triangle', mtof(m + 12), tt, 0.5, 0.08, { a: 0.006, r: 0.4, rev: 0.75, lp: 2600 }); });
          ping(t + 2.1, 0.12); boom(t + 2.1, 0.5); shimmer(t + 2.1, 440, 0.07); nz(t + 2.05, 0.9, 0.12, 'bandpass', 700, 2600, 0.8, 0.5); break;
        case 'intro':      /* 3D 연주자 등장: 느린 심장박동 + 쓸쓸한 단선율 */
          heart(t, 6, 0.3); phrase(HOOK_S, t + 0.4, 0.5); shimmer(t + 0.2, 220, 0.03); break;
        case 'curtain':    /* 땀 줄기가 커튼처럼 닫힘: 먼 물방울 + 어두운 바람 */
          [0, 0.36, 0.62, 0.95, 1.3].forEach(function (d) { drip(t + d, 0.07); }); air(t, 1.7, 0.1, false); tone('sine', 82, t, 1.8, 0.1, { f2: 49, glide: 1.6, a: 0.3, r: 0.6, rev: 0.4 }); break;
        case 'slit':       /* 커튼이 살짝 열림 */
          air(t, 0.9, 0.12, true); tone('sine', 110, t, 1.5, 0.09, { a: 0.35, r: 0.8, rev: 0.7 }); [0.2, 0.34, 0.46, 0.62, 0.74, 0.9].forEach(function (d) { drip(t + d, 0.045); }); break;
        case 'glasses':    /* 선글라스를 슬쩍 내림: 조용한 마찰음 */
          nz(t, 0.4, 0.1, 'bandpass', 1900, 900, 3.2, 0.3); tone('triangle', 1500, t + 0.38, 0.03, 0.04, { a: 0.001, r: 0.03, rev: 0.4 }); break;
        case 'wink':       /* 윙크: 거꾸로 차오르는 숨 + 유리 같은 잔향 한 번 */
          nz(t, 0.55, 0.12, 'highpass', 500, 6500, 0.7, 0.4); shimmer(t + 0.5, 1175, 0.06); sax(57, t + 0.35, 1.7, 0.28, { depth: 8, scoop: -60, rev: 0.75 }); break;
        case 'closing':    /* 닫힘: 낮은 울림 */
          air(t, 0.9, 0.12, false); thump(t + 0.5, 0.35); break;
        case 'on1':        /* 카네기홀: 엄숙한 롱톤 */
          chord(t, 4.6, 0.03, [45, 52, 57, 64]); sax(64, t + 0.3, 3.4, 0.34, { depth: 15, rev: 0.75 }); shimmer(t + 0.4, 659, 0.03); break;
        case 'shatter':    /* 폭발: 묵직한 충격 + 유리 파편 + 디지털 찢김 */
          boom(t, 0.9); glass(t, 0.22); tear(t, 0.8, 0.13); air(t, 1.1, 0.22, true); crash(t + 0.05, 0.12); break;
        case 'on2':        /* 지진 + 불기둥 4개 */
          rumble(t - 0.2, 5, 0.6);
          [0.2, 0.52, 0.84, 1.16].forEach(function (d, n) { thump(t + d, 0.55); boom(t + d, 0.3 + n * 0.04); fire(t + d, 0.2); });
          chord(t + 1.3, 4, 0.045, [33, 40, 45, 52]); phrase([[76, 0, 3.3, { scoop: -600, depth: 38, vib: 5.8 }]], t + 1.5, 0.55); break;
        case 'out':        /* 불타며 위로 흩어짐: 라이저 */
          nz(t, 1.9, 0.26, 'bandpass', 260, 6000, 1.1, 0.4); tone('sawtooth', 90, t, 1.9, 0.09, { f2: 640, lp: 3200, a: 0.8, r: 0.25, rev: 0.5 }); fire(t, 0.12); break;
        case 'fin':        /* 정점: 금박 타이틀 */
          boom(t, 0.7); crash(t, 0.2); chord(t, 4.6, 0.06, [45, 52, 57, 64, 69]); gong(t + 0.05, 0.3); phrase(HOOK2, t + 0.9, 0.55); heart(t + 0.4, 4, 0.3); break;
        case 'spark':
          shimmer(t, rnd(880, 1500), 0.04); break;
      }
    };
    /* ----- 2번: 긴장 (낮은 드론 + 불협 화음이 차오름 + 먼 금속 울림 + 약한 심장박동) ----- */
    function dnote(m, t, dur, v) { var a = Math.min(2, dur * 0.4), r = Math.min(2.5, dur * 0.4); tone('sine', mtof(m), t, dur, v, { a: a, r: r, rev: 0.3 }); tone('sawtooth', mtof(m), t, dur, v * 0.35, { lp: 380, a: a, r: r, rev: 0.4 }); }
    function pad(t, dur, v, notes) { notes.forEach(function (m) { tone('sawtooth', mtof(m), t, dur, v, { lp: 900, a: dur * 0.4, r: dur * 0.4, rev: 0.7 }); tone('sawtooth', mtof(m) * 1.004, t, dur, v * 0.6, { lp: 800, a: dur * 0.4, r: dur * 0.4, rev: 0.7 }); }); }
    function ping(t, v) { var f = rnd(300, 520); [1, 2.76, 5.4].forEach(function (m, i) { tone('sine', f * m, t, 3 / (i + 1), v / (i + 1.3), { a: 0.003, r: 2 / (i + 1), rev: 0.9, lp: 5000 }); }); }
    var CH2 = [[50, 51, 57], [50, 53, 57], [46, 50, 53], [48, 51, 55]];
    E.bar2 = function (t, n) {
      var L = 8; dnote(26, t, L + 1, 0.12); pad(t, L + 1.5, 0.022, CH2[n % 4]);
      [0, 2, 4, 6].forEach(function (d) { thump(t + d, 0.13); });
      ping(t + rnd(1, 6), 0.06); if (n % 2 === 0) nz(t + 2, 5, 0.09, 'bandpass', 150, 2600, 0.9, 0.6);
      if (n % 4 === 3) { boom(t + L - 1.2, 0.26); tone('sine', 2093, t + L - 1, 3, 0.014, { a: 1.2, r: 1.6, rev: 0.9 }); }
    };
    /* ----- 3번: 의식 (깊은 북 + 신비로운 단선율 + 차오르는 아르페지오) ----- */
    function tom(t, v) { tone('sine', 110, t, 0.6, v, { f2: 52, glide: 0.35, a: 0.003, r: 0.35, rev: 0.35 }); nz(t, 0.12, v * 0.35, 'lowpass', 900, 200, 0.8, 0.3); }
    var PH = [[[62, 0.3, 2.6], [63, 3.2, 1.3], [66, 4.6, 3]], [[69, 0.3, 2.2], [67, 2.8, 1.4], [66, 4.4, 3.2]], [[62, 0.3, 1.6], [66, 2.2, 1.6], [67, 4, 1.2], [69, 5.4, 2.4]], [[63, 0.3, 2.8], [62, 3.4, 4]]];
    E.bar3 = function (t, n) {
      var L = 8; dnote(26, t, L + 1, 0.1); dnote(33, t, L + 1, 0.06);
      [0, 2, 3.5, 4, 6, 7].forEach(function (d, i) { tom(t + d, i === 0 ? 0.3 : 0.2); });
      PH[n % 4].forEach(function (p) { sax(p[0], t + p[1], p[2], 0.3, { depth: 16, rev: 0.85, scoop: -70 }); });
      if (n % 2 === 1) pad(t + 2.5, 6, 0.03, [57, 62, 65]);          /* 짧게 끊는 음 대신, 천천히 차오르는 낮은 현 울림 */
      pad(t, L + 1.5, 0.018, [50, 57, 62]); shimmer(t + rnd(1, 5), 587, 0.03);
    };
    /* ----- 일렉기타: 왜곡 + 파워코드. 아바타가 스트럼하는 순간마다 소리가 난다 ----- */
    var DRIVE = (function () { var n = 1024, c = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1; c[i] = Math.tanh(8.5 * x); } return c; })();
    function gtr(t, notes, dur, v, mute) {
      var mix = ctx.createGain();
      notes.forEach(function (m, i) { [-3, 3].forEach(function (dt) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt; var g = ctx.createGain(); g.gain.value = i === 0 ? 1 : 0.55; o.connect(g); g.connect(mix); o.start(t); o.stop(t + dur + 0.1); }); });
      var pre = ctx.createGain(); pre.gain.value = 0.85; var ws = ctx.createWaveShaper(); ws.curve = DRIVE; ws.oversample = '2x';
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9; lp.frequency.setValueAtTime(mute ? 1300 : 4200, t); lp.frequency.exponentialRampToValueAtTime(mute ? 520 : 1800, t + dur);
      var pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1000; pk.gain.value = 8; pk.Q.value = 0.8;
      var g2 = ctx.createGain(); var rel = mute ? 0.05 : 0.35; env(g2, t, 0.004, v, Math.max(dur - 0.004 - rel, 0.001), rel);
      nz(t, 0.035, v * 0.5, 'bandpass', 2600, 1400, 1.4, 0.05);                                  /* 피킹 어택 */
      mix.connect(pre); pre.connect(ws); ws.connect(lp); lp.connect(pk); pk.connect(g2); send(g2, mute ? 0.08 : 0.25);
    }
    var RIFF = [45, 45, 45, 45, 48, 45, 45, 45, 43, 43, 45, 45, 50, 48, 45, 45];   /* A 마이너, 16분음표 묵직한 리프 */
    E.guitar = function (i, t) {
      t = (t === undefined ? ctx.currentTime : t) + 0.02; var k = i % 16, m = RIFF[k], accent = (k % 4 === 0);
      if (k % 8 === 0) { gtr(t, [m, m + 7, m + 12, m + 19], 0.7, 0.36, false); tone('sine', mtof(m - 12), t, 0.55, 0.26, { a: 0.004, r: 0.3, rev: 0.1, dryOnly: true }); }
      else gtr(t, [m, m + 7, m + 12], accent ? 0.2 : 0.13, accent ? 0.3 : 0.23, true);
    };
    E.dryMaster = master;
    E.fadeIn = function (t, sec) { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(0.0001, t); master.gain.linearRampToValueAtTime(0.72, t + sec); };
    E.duck = function (t, sec, lvl) { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t); master.gain.linearRampToValueAtTime(lvl, t + sec); };
    E.fade = function (t, sec) { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0.0001, t + sec); };
  }

  /* ---------- 실시간 재생: 버튼 한 번에 1번 → 2번 → 3번 → 꺼짐, 고른 번호는 저장(영속) ---------- */
  var ctx = null, engines = {}, track = 0, running = false, pending = [], timer = null, nextBar = 0, barN = 0, playing = 0, bed1 = false, scrollOff = false;
  function savedTrack() { try { var v = localStorage.getItem(KEY); if (v === null || v === 'on') return 1; if (v === 'off') return 0; var n = parseInt(v, 10); return (n >= 1 && n <= 3) ? n : 1; } catch (e) { return 1; } }
  function saveTrack(n) { try { localStorage.setItem(KEY, n ? String(n) : 'off'); } catch (e) { /* 저장 불가 환경은 무시 */ } }
  function ensure() { if (ctx) return true; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ctx = new AC(); return true; }
  function eng(k) { return engines[k] || (engines[k] = new Engine(ctx)); }
  function stopPlaying() {
    if (timer) { clearInterval(timer); timer = null; }
    if (playing && engines[playing]) { var e = engines[playing], n = ctx.currentTime; e.fade(n, 1.2); }
    playing = 0;
  }
  function startTrack(k) {
    if (playing === k) return; stopPlaying();
    var e = eng(k); e.fadeIn(ctx.currentTime, 1.4); playing = k;
    if (k === 1) { if (!bed1) { bed1 = true; e.cue('bed'); } pending.splice(0).forEach(function (c) { e.cue(c); }); }
    else { barN = 0; nextBar = ctx.currentTime + 0.15; var fn = k === 2 ? 'bar2' : 'bar3'; var tick = function () { while (nextBar < ctx.currentTime + 2.6) { e[fn](nextBar, barN++); nextBar += 8; } }; tick(); timer = setInterval(tick, 400); }
  }
  function apply() { if (!ctx) return; if (track === 0) { stopPlaying(); return; } startTrack(track); }
  var btn = null;
  function paint() {
    if (!btn) return; var waiting = track > 0 && !running;
    btn.setAttribute('aria-pressed', (track > 0 && running) ? 'true' : 'false'); btn.classList.toggle('on', track > 0 && running); btn.classList.toggle('need', waiting);
    btn.querySelector('span').textContent = track === 0 ? 'SOUND OFF' : ('MUSIC ' + track + (waiting ? ' · 눌러서 켜기' : ''));
  }
  function resumeThenApply() { if (!ensure()) return; ctx.resume().then(function () { running = ctx.state === 'running'; paint(); if (running) apply(); }); }
  var API = {
    cue: function (name) {
      if (track === 0 || scrollOff) return;
      if (!running) { if (track === 1 && name !== 'spark') { pending.push(name); if (pending.length > 2) pending.shift(); } return; }
      try {
        if (track === 1) { var e1 = eng(1); if (playing !== 1) startTrack(1); e1.cue(name); if (name === 'fin') { var c1 = ctx; setTimeout(function () { if (playing === 1) e1.fade(c1.currentTime, 5); }, 7000); } }
        else { var m = { title: 'a_title', wink: 'a_wink', shatter: 'a_shatter', fin: 'a_fin' }[name]; var e = eng(track); if (m) e.cue(m); if (name === 'fin') { var c = ctx, tk = track; setTimeout(function () { if (playing === tk) e.duck(c.currentTime, 4, 0.3); }, 7000); } }
      } catch (err) { /* 소리 오류가 화면을 멈추지 않게 */ }
    },
    /* 효과음 하나만 따로: 배경음이 스크롤로 사라진 뒤에도 들린다. 소리를 껐으면(SOUND OFF) 나지 않는다 */
    bell: function () { if (track === 0 || !running) return; try { eng(9).cue('bell'); } catch (err) { /* 무시 */ } },
    /* 한 번 누를 때마다 1 → 2 → 3 → 꺼짐 */
    toggle: function () {
      if (scrollOff && track > 0 && running) { scrollOff = false; playing = 0; apply(); paint(); return; }   /* 스크롤로 사라진 음악은 같은 번호로 다시 켠다 */
      scrollOff = false;                                               /* 버튼은 언제든 직접 고른 선택이라 다시 켠다 */
      if (track > 0 && !running) { resumeThenApply(); return; }        /* 저장된 번호가 있는데 브라우저가 막고 있던 경우: 번호는 그대로 켜기만 */
      track = (track + 1) % 4; saveTrack(track); paint();
      if (track === 0) { apply(); return; }
      resumeThenApply();
    },
    /* 스크롤을 내리면 음악이 서서히 사라진다. 고른 번호는 저장된 채 그대로이고, 버튼을 누르면 다시 켜진다 */
    scrollFade: function () {
      if (scrollOff) return; scrollOff = true;
      if (!running || !playing || !engines[playing]) return;
      var p = playing; engines[p].fade(ctx.currentTime, 2.2); if (timer) { clearInterval(timer); timer = null; }
      setTimeout(function () { if (scrollOff && playing === p) playing = 0; }, 2500);
    },
    state: function () { var g = {}; Object.keys(engines).forEach(function (k) { g[k] = +engines[k].dryMaster.gain.value.toFixed(3); }); return { track: track, playing: playing, scrollOff: scrollOff, running: running, gain: g }; },
    /* 왼쪽 아바타가 기타를 칠 때마다 호출: 지금 재생 중이고 볼륨이 충분할 때만 소리가 난다 */
    guitar: function (i) { if (track === 0 || scrollOff || !running) return; try { var e = engines[playing]; if (e && e.dryMaster.gain.value > 0.08) e.guitar(i); } catch (err) { /* 무시 */ } },
    isOn: function () { return track > 0 && running; },
    /* 입장 화면이 필요한가: 저장된 번호가 켜짐이고, 브라우저가 아직 소리를 막고 있을 때 (?gate=1 을 붙이면 강제로 보여줌: 시험용) */
    needGate: function () { if (/[?&]gate=1/.test(location.search)) return savedTrack() > 0; var tk = track || savedTrack(); if (tk === 0) return false; try { if (ensure() && ctx.state === 'running') return false; } catch (e) { return false; } return true; },
    enter: function () { return new Promise(function (res) { if (!ensure()) { res(); return; } ctx.resume().then(function () { running = ctx.state === 'running'; paint(); if (running) apply(); res(); }, function () { res(); }); }); },
    track: function () { return track; },
    setTrack: function (n) { scrollOff = false; track = n; saveTrack(n); paint(); if (n === 0) apply(); else resumeThenApply(); },
    /* 전체를 WAV로 뽑기 (1번은 장면 시각표대로, 2·3번은 배경음 반복) */
    render: function (seconds, k) {
      var SR = 44100, oc = new OfflineAudioContext(2, Math.floor(SR * (seconds || 30)), SR), e = new Engine(oc);
      if (k === 'gtr') { for (var gi = 0; gi < 32; gi++) e.guitar(gi, gi * 0.238); return oc.startRendering(); }   /* 기타만 따로 시험 */
      if (k === 2 || k === 3) { var fn = k === 2 ? 'bar2' : 'bar3'; for (var n = 0, t = 0.1; t < (seconds || 30); n++, t += 8) e[fn](t, n); e.cue('a_title', 0.2); e.cue('a_wink', 7.5); e.cue('a_shatter', 10.2); e.cue('a_fin', 22.1); e.duck(29, 4, 0.3); return oc.startRendering(); }
      [['bed', 0], ['title', 0.1], ['intro', 2.6], ['curtain', 4.9], ['slit', 6.75], ['glasses', 6.95], ['wink', 7.55], ['closing', 8.4], ['on1', 8.7], ['shatter', 10.2], ['on2', 14.1], ['out', 19.8], ['fin', 22.1]].forEach(function (c) { e.cue(c[0], c[1]); });
      e.fade(22.1 + 7, 5);
      return oc.startRendering();
    },
    wav: function (buf) {
      var n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2)), p = 0;
      function ws(s) { for (var i = 0; i < s.length; i++) out.setUint8(p++, s.charCodeAt(i)); }
      ws('RIFF'); out.setUint32(p, 36 + n * ch * 2, true); p += 4; ws('WAVEfmt '); out.setUint32(p, 16, true); p += 4; out.setUint16(p, 1, true); p += 2; out.setUint16(p, ch, true); p += 2; out.setUint32(p, buf.sampleRate, true); p += 4; out.setUint32(p, buf.sampleRate * ch * 2, true); p += 4; out.setUint16(p, ch * 2, true); p += 2; out.setUint16(p, 16, true); p += 2; ws('data'); out.setUint32(p, n * ch * 2, true); p += 4;
      var d = []; for (var c = 0; c < ch; c++) d.push(buf.getChannelData(c));
      for (var i = 0; i < n; i++) for (var c2 = 0; c2 < ch; c2++) { var v = Math.max(-1, Math.min(1, d[c2][i])); out.setInt16(p, v < 0 ? v * 0x8000 : v * 0x7fff, true); p += 2; }
      return new Blob([out], { type: 'audio/wav' });
    }
  };
  window.ArisAudio = API;

  /* ---------- 소리 버튼 ---------- */
  function build() {
    track = savedTrack();                                              /* 저장된 번호를 불러옴 (처음 방문이면 1번) */
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'snd'; btn.setAttribute('aria-label', '음악 바꾸기: 1번, 2번, 3번, 끄기 순서로 바뀝니다'); btn.innerHTML = '<i aria-hidden="true"></i><span></span>';
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });  /* 버튼 누름이 '첫 화면 터치'로 이중 처리되지 않게 */
    btn.addEventListener('click', function (e) { e.stopPropagation(); API.toggle(); });
    document.body.appendChild(btn); paint();
    /* 화면을 처음 누르거나 키를 누르면(브라우저가 허락하는 순간) 저장된 번호의 음악을 자동으로 켠다 */
    var first = function () { window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); if (track > 0 && !running && !scrollOff) resumeThenApply(); };
    scrollOff = window.scrollY > 40;
    window.addEventListener('scroll', function () { if (window.scrollY > 40) API.scrollFade(); }, { passive: true });
    window.addEventListener('pointerdown', first, { passive: true }); window.addEventListener('keydown', first);
    if (track > 0) { try { if (ensure() && ctx.state === 'running') { running = true; paint(); if (!scrollOff) apply(); } } catch (e) { /* 허용 전이면 무시 */ } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
