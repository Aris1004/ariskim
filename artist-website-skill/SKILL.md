---
name: artist-website
description: "아티스트/퍼포머 포트폴리오 웹사이트를 고급스러운 싱글파일 HTML로 제작하는 스킬. 금색+블랙 테마, 극장식 인트로 애니메이션, 골든 프레임 카드 레이아웃, 반응형 디자인(폴더블 포함)을 포함한다. 'artist website', '포트폴리오 홈페이지', '아티스트 홈페이지', '공연 웹사이트', '뮤지션 사이트', 'luxury website', 'gold theme website', '극장식 인트로', 'cinematic intro' 등의 키워드가 나오면 이 스킬을 사용할 것. 웹사이트 제작, 홈페이지 만들기 등 일반적인 웹 제작 요청에서도 고급스러운 아티스트/퍼포머 느낌이 감지되면 적극 활용."
---

# Artist Portfolio Website — Luxury Single-File HTML

이 스킬은 공연 아티스트, 뮤지션, 무용가, 미디어아티스트 등을 위한 **프리미엄 포트폴리오 웹사이트**를 싱글파일 HTML로 제작하는 방법을 다룬다.

핵심 미학: **금색(Gold) × 블랙(Black)** — 구스타프 클림트의 황금빛 회화에서 영감을 받은, 어둠 속에서 빛나는 고급스러운 분위기.

---

## 1. 설계 철학

이 웹사이트는 단순한 정보 전달이 아니라 **극장에 입장하는 경험**을 만든다. 방문자가 URL을 열면 어둠 속에서 금빛 불꽃이 터지고, 아티스트의 이름이 서서히 나타나고, 사진이 극적으로 등장하고, 최종적으로 두 개의 골든 프레임 카드가 보인다. 이 모든 과정이 15초 안에 자연스럽게 이어진다.

**왜 이런 접근을 하는가?** 아티스트는 자신의 첫인상이 곧 브랜드다. 일반적인 웹사이트처럼 바로 콘텐츠를 보여주면 기억에 남지 않는다. 극장의 막이 오르는 순간처럼 설계하면, 방문자는 이 사이트(그리고 아티스트)를 잊지 못한다.

---

## 2. 아키텍처

### 싱글파일 구조

모든 HTML, CSS, JS를 **하나의 .html 파일**에 넣는다. 외부 의존성은 Google Fonts CDN 하나뿐이다.

이유: 배포가 간단하고(Netlify, Vercel에 드래그&드롭), 로딩이 빠르고, 유지보수가 쉽다. 이미지만 별도 `images/` 폴더에 둔다.

```
site/
├── index.html          ← 인트로 + 포털 (두 개의 카드로 하위 페이지 연결)
├── story.html          ← 아티스트 스토리/바이오
├── booking.html        ← 공연/예약 포트폴리오
└── images/
    ├── hero_*.jpg      ← 히어로 배경 이미지들
    ├── perf_*.jpg      ← 공연 사진들
    ├── tl_*.jpg        ← 타임라인(연보) 이미지들
    └── ...
```

### 페이지별 역할

- **index.html**: 극장식 인트로 → 포털 (STORY / ARISHOW 두 카드)
- **story.html**: 긴 스크롤 스토리텔링 — 히어로 → 인용문 → 기원 → 타임라인 → 갤러리 → 비디오아트 → 탱고
- **booking.html**: 공연 프로그램 포트폴리오 — 히어로 → 프로그램 카드 → 예약 문의

---

## 3. 색상 팔레트와 CSS 변수

```css
:root {
  --gold: #C9A84C;           /* 메인 골드 — 테두리, 악센트, 타이틀 장식 */
  --light-gold: #D4B85A;     /* 밝은 골드 — 그라디언트 하이라이트 */
  --dark-gold: #8B7332;      /* 어두운 골드 — 미묘한 배경 장식 */
  --bg: #0A0908;             /* 배경 — 순수 블랙보다 약간 따뜻한 톤 */
  --text: #F2EDE4;           /* 텍스트 — 순백보다 약간 따뜻한 크림색 */
  --gold-subtle: rgba(201,168,76,0.3);  /* 투명 골드 — 오버레이, 그림자 */
}
```

**왜 순수 검정(#000)이 아닌 #0A0908인가?** 순수 검정은 차갑고 디지털 느낌이다. 약간의 따뜻한 톤을 섞으면 금색과 자연스럽게 어울리고, 고급스러운 느낌이 더해진다.

**왜 순백(#FFF)이 아닌 #F2EDE4인가?** 같은 이유다. 크림색은 금색 테마와 조화롭고, 오래된 양피지 같은 느낌을 준다.

---

## 4. 타이포그래피

```css
/* 영문 제목 — 고전적이고 권위 있는 세리프 */
font-family: 'Cinzel', serif;

/* 한국어 본문 — 우아하고 가벼운 세리프 */
font-family: 'Noto Serif KR', serif;
```

Google Fonts 임포트:
```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Noto+Serif+KR:wght@200;300;400;700&display=swap" rel="stylesheet">
```

### 폰트 사용 규칙

| 용도 | 폰트 | 굵기 | 자간 | 크기 |
|------|------|------|------|------|
| 영문 대제목 (ARIS KIM 등) | Cinzel | 900 | 0.1-0.12em | clamp(28px, 5vw, 72px) |
| 영문 소제목 (DISCOVER 등) | Cinzel | 400 | 0.5em | clamp(8px, 1vw, 11px) |
| 영문 CTA 버튼 | Cinzel | 400 | 0.3em | clamp(10px, 1vw, 13px) |
| 한국어 제목 | Noto Serif KR | 700 | 0.08em | clamp(24px, 3vw, 42px) |
| 한국어 부제 | Noto Serif KR | 200-300 | 0.25-0.6em | clamp(10px, 1.2vw, 15px) |
| 한국어 본문 | Noto Serif KR | 300 | normal | 16px |

---

## 5. index.html — 극장식 인트로 + 포털

인덱스 페이지는 네 단계(레이어)로 구성된다. 모두 `position:fixed; inset:0`으로 화면 전체를 덮고, z-index로 순서를 관리한다.

### 레이어 순서 (z-index)

1. **Golden Spark Overlay** (z:99999) — 금빛 연기 폭발
2. **Phase 1: The Void** (z:300) — 아티스트 이름 등장
3. **Phase 2: The Revelation** (z:200) — 사진 커튼 열림
4. **Phase 3: The Portal** (z:100) — 골든 프레임 카드 두 개

### 5-1. Golden Spark Overlay (금빛 연기 폭발)

화면 중앙에서 금색 연기가 폭발하며 퍼지는 효과. 단순한 원형 확대가 아니라 **안개 같은 유기적인 연기**가 핵심이다.

```html
<div class="golden-spark-overlay" id="sparkOverlay">
  <div class="spark-glow"></div>      <!-- 중앙 금빛 섬광 -->
  <div class="smoke smoke-1"></div>   <!-- 연기 구름 4개 -->
  <div class="smoke smoke-2"></div>
  <div class="smoke smoke-3"></div>
  <div class="smoke smoke-4"></div>
  <div class="ember em1"></div>       <!-- 불티(스파크) 6개 -->
  <div class="ember em2"></div>
  <div class="ember em3"></div>
  <div class="ember em4"></div>
  <div class="ember em5"></div>
  <div class="ember em6"></div>
</div>
```

**연기 구름 핵심 패턴:**
```css
.smoke {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(232,204,122,0.9) 0%,       /* 중심 — 밝은 금 */
    rgba(201,168,76,0.5) 40%,        /* 중간 — 반투명 금 */
    transparent 70%);                 /* 가장자리 — 소멸 */
  filter: blur(40px);                /* 정적 블러 — 안개 효과 */
  opacity: 0;
  will-change: transform, opacity;   /* GPU 가속 */
}
```

**성능 최적화 핵심:** `filter:blur()`를 애니메이션하지 않는다. 블러 값을 0에서 40px로 변화시키면 매 프레임마다 재계산이 필요해 심한 버퍼링이 생긴다. 대신 블러를 40px로 고정하고, `transform:scale()`과 `opacity`만 애니메이션한다. 이 두 속성은 GPU 컴포지팅으로 처리되어 매우 가볍다.

연기 구름은 4개면 충분하다. 각각 다른 방향(좌상/우상/좌하/우하)으로 퍼지면서 scale(0.3)에서 scale(6)까지 커진다. `will-change: transform, opacity`로 GPU 레이어를 미리 할당한다.

**불티(Ember)** — 작은 금색 점 6개가 중심에서 사방으로 튀어나간다:
```css
.ember {
  position: absolute;
  border-radius: 50%;
  background: #E8CC7A;
  box-shadow: 0 0 4px #C9A84C, 0 0 8px rgba(201,168,76,0.5);
  width: 2-3px; height: 2-3px;
}
```

**배경 투과:** 오버레이 뒤에 아티스트의 사진이 은은하게 보이면 더 깊이감이 생긴다:
```css
.golden-spark-overlay {
  background: url('images/main_photo.jpg') center/cover no-repeat;
}
.golden-spark-overlay::before {
  content: '';
  position: absolute; inset: 0;
  background: rgba(10,9,8,0.85);   /* 85% 어둡게 */
}
```

### 5-2. Phase 1: The Void (이름 등장)

어두운 화면에서 아티스트의 이름이 서서히 나타난다.

```
      한국어 부제 (200 weight, 금색 반투명)
    ─────── 금색 라인 (0에서 300px로 확장) ───────
          ARIS KIM (Cinzel 900, 큰 사이즈)
            아 리 스 김 (작은 한국어)
```

각 요소는 `animation-delay`로 순차 등장: 부제 0.8s → 라인 1.2s → 영문 1.6s → 한국어 2.2s

### 5-3. Phase 2: The Revelation (사진 등장)

어둠이 좌우로 갈라지며 사진이 드러나는 커튼 효과:

```css
#void-left, #void-right {
  position: absolute; top: 0; width: 50%; height: 100%;
  background: var(--bg);
  transition: transform 1.8s cubic-bezier(0.77, 0, 0.18, 1);
}
#phase2.show #void-left  { transform: translateX(-100%); }
#phase2.show #void-right { transform: translateX(100%); }
```

사진 위에 Ken Burns 효과(느린 줌)를 적용하고, 하단에 아티스트 키워드(SAXOPHONE · MEDIA ART · TANGO)를 표시한다.

### 5-4. Phase 3: The Portal (골든 프레임 카드)

최종적으로 두 개의 카드가 나란히 표시된다. 각 카드는 하위 페이지로 링크된다.

```css
.card {
  position: relative;
  flex: 1;
  max-width: 520px;
  height: clamp(400px, 75vh, 800px);
  border: 1.5px solid rgba(201,168,76,0.55);   /* 금색 테두리 */
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.6s ease, box-shadow 0.6s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 40px rgba(201,168,76,0.15),
              0 0 80px rgba(201,168,76,0.08);
}
```

**카드 구조:**
```html
<a class="card" href="story.html">
  <div class="card-img"></div>          <!-- 배경 이미지 -->
  <div class="card-overlay"></div>      <!-- 그라디언트 오버레이 -->
  <div class="card-content">
    <span class="card-discover">D I S C O V E R</span>
    <h1 class="card-title">STORY</h1>
    <p class="card-kr">삶의 음악</p>
    <div class="card-cta">여정</div>    <!-- 한글 CTA 버튼 -->
  </div>
</a>
```

**골든 코너 장식:** `::before`와 `::after`로 카드 하단 좌우에 L자형 금색 장식을 넣는다.

### 5-5. 타이밍 시퀀스

```javascript
// Golden Spark: 0s ~ 4s
setTimeout(() => sparkOverlay.classList.add('fade'), 2600);
setTimeout(() => sparkOverlay.classList.add('done'), 4000);

// Phase 1 fade-out: 9s (충분히 이름을 보여준 후)
setTimeout(() => phase1.classList.add('fade-out'), 9000);

// Phase 2 show: 9.5s (사진 커튼 열림)
setTimeout(() => phase2.classList.add('show'), 9500);

// Phase 2 fade-out: 14s (사진 4.5초 유지)
setTimeout(() => phase2.classList.add('fade-out'), 14000);

// Phase 3 show: 14.5s (카드 등장)
setTimeout(() => phase3.classList.add('show'), 14500);
```

**skip 파라미터:** 재방문자를 위해 `?skip=1` URL 파라미터로 인트로를 건너뛰고 바로 Phase 3을 보여주는 기능을 넣는다.

---

## 6. story.html — 스크롤 스토리텔링

긴 스크롤 페이지. 섹션별로 스크롤 시 fade-in 애니메이션이 적용된다.

### 핵심 섹션

1. **Hero**: 전체화면 배경 사진 + Ken Burns 줌 + 그라디언트 오버레이 + 중앙 타이틀
2. **Thesis (명제)**: 큰 한국어 인용문 + 금색 디바이더
3. **Genesis (기원)**: 좌우 2단 — 왼쪽 사진(parallax) + 오른쪽 텍스트
4. **Timeline (연보)**: 중앙 금색 세로선 + 좌우 교대 배치 + 연도별 사진
5. **Gallery (갤러리)**: 가로 스크롤 갤러리 + 필터 버튼
6. **Video Art**: 그리드 카드 레이아웃
7. **Tango**: 전체화면 배경 + 수상 이력

### 네비게이션

```css
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: transparent;
  transition: background-color 0.3s ease;
}
nav.scrolled {
  background-color: rgba(10,9,8,0.95);
  border-bottom: 1px solid rgba(201,168,76,0.15);
}
```

스크롤하면 투명에서 불투명으로 전환. `backdrop-filter: blur(16px)`로 배경 흐림 효과.

### 스크롤 애니메이션

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
```

---

## 7. booking.html — 공연 포트폴리오

### 핵심 섹션

1. **Hero**: 대형 타이틀 + 사진 배경
2. **Klimt Media Art Hero**: 클림트 미디어아트 특별 섹션
3. **Program Cards**: 공연 프로그램 카드 그리드
4. **Contact/Booking**: 문의 양식 또는 연락처

### 프로그레스 바

```css
#prog {
  position: fixed; top: 0; left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--gold), var(--light-gold));
  width: 0%;
  z-index: 2001;
  transition: width 0.15s linear;
  box-shadow: 0 0 12px rgba(201,168,76,0.4);
}
```

스크롤 진행률에 따라 상단에 금색 프로그레스 바가 채워진다.

### 골든 프레임 장식

```css
.golden-frame {
  border: 2px double rgba(201,168,76,0.2);
  position: relative;
  padding: 2px;
}
.golden-frame::before, .golden-frame::after {
  content: '';
  position: absolute;
  width: 12px; height: 12px;
  border: 1px solid var(--gold);
}
.golden-frame::before { top: -6px; left: -6px; }
.golden-frame::after  { bottom: -6px; right: -6px; }
```

### 장식 디바이더

```css
.ornament-divider {
  width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  position: relative;
}
.ornament-divider::before, .ornament-divider::after {
  content: '✦';
  position: absolute; top: -6px;
  font-size: 10px;
  color: var(--gold); opacity: 0.4;
}
```

---

## 8. 골든 플로팅 파티클

모든 페이지에 금색 먼지 입자가 떠다니며 고급스러운 분위기를 더한다:

```html
<div class="golden-dust dust-1"></div>
<div class="golden-dust dust-2"></div>
<!-- ... 5~6개 -->
```

```css
.golden-dust {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, rgba(201,168,76,0.6), transparent);
  opacity: 0;
}
@keyframes floatDust {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  25%  { transform: translateY(-20px) translateX(10px); opacity: 0.7; }
  50%  { transform: translateY(-8px) translateX(-8px); opacity: 0.5; }
  75%  { transform: translateY(-25px) translateX(5px); opacity: 0.8; }
}
```

각 입자의 위치, 크기(2~5px), 애니메이션 duration(7~12s), delay를 다르게 설정해서 자연스럽게 만든다.

---

## 9. 반응형 디자인

### 핵심 브레이크포인트

```css
/* 데스크탑: 기본 스타일 */

/* 태블릿 */
@media (min-width:769px) and (max-width:1024px) { ... }

/* 작은 태블릿 / 큰 폰 가로 */
@media (min-width:481px) and (max-width:768px) { ... }

/* 폰 */
@media (max-width:480px) { ... }

/* Galaxy Z Fold5 펼침 & 정사각형 비율 태블릿 */
@media (min-width:481px) and (max-width:900px)
       and (min-aspect-ratio:3/4) and (max-aspect-ratio:5/4) { ... }
```

### 폴더블 기기 대응

Galaxy Z Fold5 같은 정사각형에 가까운 화면에서는 가로 배치가 어색하다. `aspect-ratio` 미디어 쿼리로 감지해서 세로 배치(column)로 전환한다:

```css
@media (min-width:481px) and (max-width:900px)
       and (min-aspect-ratio:3/4) and (max-aspect-ratio:5/4) {
  html, body { overflow-y: auto !important; }
  #phase3 {
    position: relative !important;
    flex-direction: column !important;
    min-height: 100vh;
  }
  .card { flex: none; max-width: none; height: clamp(320px,42vh,480px); }
}
```

### 모바일 핵심

- `overflow:hidden`인 body를 모바일에서는 `overflow-y:auto`로 전환 (index.html Phase 3)
- 카드 높이를 vh 단위로 조절: `clamp(300px, 45vh, 500px)`
- 네비게이션은 햄버거 메뉴로 전환
- 큰 타이틀은 `clamp()` 함수로 자동 크기 조절

---

## 10. 이미지 처리 패턴

### 히어로 이미지

```css
.hero-bg {
  position: absolute; inset: 0;
  background: url('images/photo.jpg') center/cover no-repeat;
  filter: brightness(0.6);                      /* 어둡게 */
  animation: kenBurns 12s ease-in-out infinite alternate;  /* 느린 줌 */
}
@keyframes kenBurns {
  0%   { transform: scale(1); }
  100% { transform: scale(1.08); }
}
```

항상 그라디언트 오버레이를 위에 씌운다:
```css
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom,
    rgba(10,9,8,0.4) 0%,
    rgba(10,9,8,0.1) 40%,
    rgba(10,9,8,0.6) 100%);
}
```

### 이미지 네이밍 컨벤션

- `hero_*.jpg` — 히어로/메인 배경용 (큰 사이즈)
- `perf_*.jpg` — 공연 사진
- `tl_YYYY_name.jpg` — 타임라인용 (연도_설명)
- `as_name.jpg` — ARISHOW/프로그램용

---

## 11. 성능 최적화 체크리스트

1. **blur 애니메이션 금지** — `filter:blur()`를 키프레임에 넣지 않는다. 정적 블러만 사용.
2. **will-change 선언** — 애니메이션되는 요소에 `will-change: transform, opacity` 적용.
3. **파티클 수 제한** — 연기 4개, 불티 6개, 먼지 5-6개 이내.
4. **이미지 최적화** — JPG는 80% 품질, 히어로 이미지는 1920px 이하.
5. **font-display: swap** — Google Fonts URL에 `&display=swap` 포함.
6. **preconnect** — Google Fonts에 preconnect 링크 추가.

---

## 12. OG (Open Graph) 메타 태그

```html
<meta property="og:type" content="website">
<meta property="og:title" content="ARIS KIM | 아리스김">
<meta property="og:description" content="뉴욕 카네기홀 · 예술의전당 최초 1호 아티스트">
<meta property="og:image" content="https://yourdomain.com/og_image.png">
```

---

## 13. 작업 순서 가이드

새 아티스트 웹사이트를 만들 때 이 순서를 따른다:

1. **아티스트 정보 수집**: 이름(영/한), 대표 키워드 3개, 대표 사진 2-3장, 주요 이력
2. **index.html 제작**: 인트로 → Phase 1/2/3 순서로 구축
3. **story.html 제작**: 히어로 → 인용문 → 연보 → 갤러리 순서로 구축
4. **booking.html 제작**: 히어로 → 프로그램 카드 → 예약 문의
5. **이미지 배치**: images/ 폴더에 네이밍 규칙에 맞게 저장
6. **반응형 테스트**: 데스크탑 → 태블릿 → 모바일 → 폴더블 순서
7. **성능 테스트**: 인트로 애니메이션 버퍼링 확인
8. **배포**: Netlify/Vercel에 폴더 통째로 업로드
