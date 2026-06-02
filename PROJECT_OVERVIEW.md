# Hashgraph-style 3D Scroll Experience — 기술 문서

hashgraphvc.com 스타일의 인터랙티브 3D 스크롤 사이트.
크리스탈 + 물속 분위기 + 파티클을 WebGL로 구현하고, 스크롤·마우스 인터랙션과 시네마틱 후처리를 입힌 데모.

---

## 1. 기술 스택

| 분류 | 기술 | 역할 |
|------|------|------|
| 빌드/런타임 | **Vite 5**, **React 18** | 번들러 + UI |
| 3D 엔진 | **three.js 0.169** | WebGL 렌더링 |
| React 3D | **@react-three/fiber 8** (R3F) | three.js를 React 컴포넌트로 |
| 3D 헬퍼 | **@react-three/drei 9** | Environment, MeshTransmissionMaterial 등 |
| 후처리 | **@react-three/postprocessing 2.19** / **postprocessing 6.39** | Bloom·색수차·비네트 등 |
| 스크롤 | **lenis** | 관성 있는 부드러운 스크롤 |
| 폰트 | Space Grotesk (Google Fonts) | 테크 그로테스크 타이포 |
| 모델 | OBJ (`public/models/crystal.obj`) | 크리스탈 형태 |

> ⚠️ `vite.config.js`에 **`resolve.dedupe: ['three', '@react-three/fiber']`** 필수.
> 없으면 프로덕션 빌드에서 three.js가 중복 번들되어 "Hooks can only be used within Canvas" 에러로 씬이 안 뜸.

---

## 2. 전체 구조 (레이어링)

화면은 **3개의 독립 캔버스 + DOM 오버레이**가 z축으로 쌓인 구조 (`App.jsx`, `styles.css`):

```
z-index 50  Intro 로더 (진입 후 페이드아웃)
z-index 10  헤더 (로고 / SOUND 토글)
z-index  6  RippleOverlay  (마우스 물결, mix-blend-mode)  ← 전체 화면 공통
z-index  2  .front  = 섹션1 캔버스 (SceneOne) + 텍스트   ← 대각선 clip
z-index  1  .back   = 섹션2 캔버스 (SceneTwo) + 텍스트
            body 배경 #0e2c54
```

- **섹션 전환**: 위 레이어(섹션1)에 `clip-path`로 **대각선 컷 라인**을 주고, 스크롤에 따라 라인을 위로 올려 섹션1을 지워가며 섹션2를 드러냄. 내용은 고정, 컷 라인만 이동.
- **스크롤**: `lenis` + 자체 easing(`current += (target-current)*0.09`)으로 진행도(`progress` 0~1)를 만들어 clip·카메라에 전달. 되돌리면 그대로 역재생.

---

## 3. 섹션 1 (THE NEXT WAVE) — `SceneOne.jsx`

물속에 떠 있는 빛나는 크리스탈 + 떠다니는 돌 파편.

### 크리스탈 — `CrystalOBJ.jsx`
- **OBJ 로드** (`OBJLoader`) → non-indexed 변환 + 자동 센터링
- **MeshTransmissionMaterial** (투과/굴절 유리): `transmission`, `ior`, `chromaticAberration`, `iridescence`, `clearcoat` 등으로 맑고 반짝이는 얼음 질감
- **Fresnel rim glow**: 본체를 살짝 키운 셸에 가장자리 발광 셰이더(additive) → 배경과 무관하게 윤곽이 빛남
- **호버 시 파편화(shatter)**: 표면을 면 단위로 압출(두께 있는 조각)한 `shardGeo`를 별도로 깔고, 마우스를 레이캐스트해 그 지점 근처 면들만 법선 방향으로 튀어나오게 함. 파편도 본체와 같은 투과 재질. 평소엔 `discard`로 안 보임.
- **반응형 크기**: 화면 너비에 비례한 스케일(`clamp(width/1440, 0.6, 1.1)`)
- 자동 회전 + 자동 기울임(sin/cos), 마우스 회전은 제거됨

### 배경/분위기
- **`RippleSurface.jsx`** — 물 수면 평면. **caustics 셰이더**(TDM 계열)로 물빛 그물망이 일렁임. 카메라 거리(depth)에 따라 페이드아웃해 가장자리 압축 방지.
- **`LightShafts.jsx`** — 위에서 내려오는 god ray(빛줄기) 셰이더, additive.
- **`DebrisField.jsx`** — 떠다니는 어두운 돌 파편. 여러 도형(사면체·팔면체·십이면체)을 **노이즈로 변위**시켜 거친 바위 표면, 비균일 스케일로 제각각 모양. **InstancedMesh**로 성능 확보. delta 상한으로 프레임 끊김 시 점프 방지.
- **`DustField.jsx`** — 공중에 천천히 떠다니는 미세 먼지 입자.
- **Environment** (drei) + Lightformer 4~7개로 런타임 환경맵 → 크리스탈 반사/glint.

---

## 4. 섹션 2 (CAPITAL WITH CONVICTION) — `SceneTwo.jsx`

파티클로 형성된 오브젝트 + 돌 파편.

### 파티클 — `ParticleObject.jsx`
- 정이십면체 표면 근처에 입자 분포 → **shaderMaterial** points
- **호버 시 흩어짐**: 보이지 않는 프록시 구에 레이캐스트해 호버 지점을 구하고, 그 근처 입자만 **사방으로 파앗 흩어졌다 복귀**. 호버 지점은 trailing(lerp)으로 미끄러지듯 따라옴.
- 자동 회전 + 자동 기울임, 반응형 크기

추가로 `DebrisField`, `DustField` 동일 적용. (단 caustics·god ray는 섹션1 전용)

---

## 5. 카메라 — `CameraRig.jsx`

- **입장 연출**: 인트로 종료 시(`play`) 먼 곳 + 회전 상태에서 시작해 `easeOutCubic`으로 2.6초간 다가오며 제자리로.
- **스크롤 연동**: 진행도(`progress`)에 따라 살짝 **회전(orbit) + 확대(zoom)**. 되돌리면 역재생.
- **마우스 패럴럭스**: 카메라만 마우스 따라 이동(시점은 원점 고정), 낮은 lambda로 부드럽게.

---

## 6. 후처리 — `Effects.jsx`

`EffectComposer`로 두 섹션 캔버스에 각각 적용 (텍스트는 DOM이라 영향 없음).

| 효과 | 설명 | 비고 |
|------|------|------|
| **Bloom** | 발광 (mipmap 기반이라 가벼움) | 섹션별 세기 다름(섹션2는 파티클이 밝아 낮춤) |
| **RadialCA** (`RadialCA.jsx`) | **커스텀** 가장자리 색수차 — 중앙은 깨끗, 가장자리로 갈수록 RGB 분리. delta 방식으로 초록끼 방지. **매우 가벼움** | 내장 `ChromaticAberration` + `radialModulation`은 무거워서 직접 구현 |
| HueSaturation / BrightnessContrast | 채도·대비 그레이딩 | |
| **Vignette** | 가장자리 어둡게 | |
| **Noise** | 필름 그레인 | |

> ⚠️ **DepthOfField는 제외** — 이 버전 조합에서 EffectComposer 전체를 무력화시킴.
> 주변부 흐림이 필요하면 `RadialBlur.jsx`(커스텀 가장자리 블러)가 있지만, convolution(49탭)이라 무거워 현재 비활성화.

### 성능 메모
- 무거운 순서: **투과 재질 2개**(본체+파편) > convolution 후처리(RadialBlur) > 풀해상도 다중샘플 패스.
- 가벼운 것: Bloom(mipmap), RadialCA(샘플 2개·병합 가능), 그레이딩/비네트/그레인.
- 캔버스 2개가 항상 렌더되는 구조라 단일 섹션에서도 비용 ×2 (개선 여지).
- dev 서버는 원래 무거움 → **`npm run build` + `npm run preview`(프로덕션)** 로 실성능 측정 권장.

---

## 7. 마우스 물결 오버레이 — `RippleOverlay.jsx`

- **전체 화면 최상단**의 투명 캔버스(풀스크린 quad 셰이더). 모든 섹션 위에서 동작.
- 마우스 이동 시 그 지점에서 **불규칙한 물결**이 퍼졌다 사라짐 (저주파 노이즈로 비대칭 윤곽, attack/decay 엔벨로프).
- `pointer-events: none`으로 클릭/스크롤/3D 호버 다 통과.
- `styles.css`의 `.ripple-overlay`에 **`mix-blend-mode`**(screen/overlay 등)로 아래 콘텐츠와 빛처럼 블렌딩.
- 3D 오브젝트 호버(크리스탈·파티클)는 오버레이가 위에 있어도 동작하도록 **window 전역 마우스 좌표(NDC)** 로 레이캐스트.

---

## 8. 텍스트 · 인트로 · 사운드

- **`RevealText.jsx`** — 줄 단위 mask 슬라이드업. 섹션을 드나들 때마다 재생(히스테리시스).
- **`Intro.jsx`** — 진입 시 브랜드 + 로딩 % → 페이드아웃. 완료 시 섹션1 reveal + 카메라 입장 트리거.
- **`sound.js`** — Web Audio로 **호버 효과음 합성**(섹션별 음색) + SOUND ON 시 **배경 앰비언트 드론**. (실제 .webm 파일로 교체 가능, 주석 참고)

---

## 9. 파일 맵

```
src/
├─ main.jsx            진입점 (StrictMode 제거 — 후처리 호환)
├─ App.jsx             레이아웃 · 스크롤/clip 전환 · Lenis · reveal · 인트로 게이팅
├─ SceneOne.jsx        섹션1 씬 구성
├─ SceneTwo.jsx        섹션2 씬 구성
├─ CrystalOBJ.jsx      OBJ 크리스탈 · 투과재질 · 호버 파편화 · Fresnel
├─ RippleSurface.jsx   물 수면 caustics
├─ LightShafts.jsx     god ray 빛줄기
├─ DebrisField.jsx     떠다니는 돌 파편 (instanced, 노이즈 변위)
├─ DustField.jsx       미세 먼지
├─ ParticleObject.jsx  섹션2 파티클 · 호버 흩어짐
├─ CameraRig.jsx       입장 연출 · 스크롤 줌/회전 · 패럴럭스
├─ Effects.jsx         후처리 스택
├─ RadialCA.jsx        커스텀 가장자리 색수차
├─ RadialBlur.jsx      커스텀 가장자리 블러 (현재 비활성)
├─ RippleOverlay.jsx   전역 마우스 물결 오버레이
├─ RevealText.jsx      텍스트 등장 모션
├─ Intro.jsx           로딩 인트로
├─ sound.js            효과음/앰비언트 (Web Audio)
└─ styles.css          전체 CSS (레이어·오버레이·타이포·모션)
public/models/crystal.obj   크리스탈 모델
vite.config.js              three dedupe 설정
```

---

## 10. 실행

```bash
npm install
npm run dev        # 개발 서버 (localhost:5173)
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기 (localhost:4173, 실성능 측정용)
```
