// =============================================================
// Hover 효과음 모듈 (Web Audio API로 소리를 "합성"합니다)
//
// 지금은 오디오 파일이 없어서 코드로 소리를 만들어 재생해요.
// 나중에 진짜 .webm/.mp3 효과음으로 바꾸려면 맨 아래 주석을 보세요.
// =============================================================

let ctx = null
let muted = true // 브라우저 자동재생 정책 + SOUND ON/OFF 토글 때문에 기본은 음소거

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(value) {
  muted = value
  if (!muted) {
    ensureCtx() // 사용자가 SOUND ON 누른 순간 오디오 컨텍스트 활성화
    startAmbient()
  } else {
    stopAmbient()
  }
}

// ----- 은은한 배경 앰비언트 드론 (SOUND ON 일 때) -----
let ambient = null
function startAmbient() {
  if (ambient) return
  const c = ensureCtx()
  const gain = c.createGain()
  gain.gain.value = 0
  gain.gain.linearRampToValueAtTime(0.04, c.currentTime + 2) // 천천히 페이드인

  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 320

  // 살짝 디튠된 저음 두 개 → 깊고 넓은 공간감
  const o1 = c.createOscillator()
  const o2 = c.createOscillator()
  o1.type = 'sine'
  o2.type = 'sine'
  o1.frequency.value = 55
  o2.frequency.value = 55 * 1.01
  o1.connect(filter)
  o2.connect(filter)
  filter.connect(gain).connect(c.destination)
  o1.start()
  o2.start()
  ambient = { gain, o1, o2 }
}

function stopAmbient() {
  if (!ambient || !ctx) return
  const { gain, o1, o2 } = ambient
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
  setTimeout(() => {
    o1.stop()
    o2.stop()
  }, 700)
  ambient = null
}

export function isMuted() {
  return muted
}

// variant 별로 다른 음색 → 섹션마다 다른 hover 효과음
const PRESETS = {
  crystal: { freq: 680, type: 'sine', glide: 1.4 }, // 1번 섹션: 맑은 벨 느낌
  particle: { freq: 320, type: 'triangle', glide: 1.8 }, // 2번 섹션: 낮고 부드러운 느낌
}

export function playHover(variant = 'crystal') {
  if (muted) return
  const c = ensureCtx()
  const now = c.currentTime
  const p = PRESETS[variant] || PRESETS.crystal

  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = p.type
  osc.frequency.setValueAtTime(p.freq, now)
  osc.frequency.exponentialRampToValueAtTime(p.freq * p.glide, now + 0.08)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.26)
}

// =============================================================
// ▶ 나중에 진짜 효과음 파일로 교체하는 법:
//   1) public/sfx_UI_hover.webm 처럼 파일을 넣고
//   2) 위 playHover 내용을 아래처럼 바꾸면 끝:
//
//   const sounds = {
//     crystal: new Audio('/sfx_UI_hover.webm'),
//     particle: new Audio('/sfx_UI_hover_2.webm'),
//   }
//   export function playHover(variant = 'crystal') {
//     if (muted) return
//     const a = sounds[variant]
//     a.currentTime = 0
//     a.play()
//   }
// =============================================================
