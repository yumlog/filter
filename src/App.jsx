import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Lenis from 'lenis'
import SceneOne from './SceneOne'
import SceneTwo from './SceneTwo'
import RevealText from './RevealText'
import Intro from './Intro'
import RippleOverlay from './RippleOverlay'
import { playHover } from './sound'

export default function App() {
  const pointer = useRef({ x: 0, y: 0, moved: false }) // 마우스 위치 (-1~1)
  const frontRef = useRef(null) // 위 레이어(섹션1) DOM
  const [filterOn, setFilterOn] = useState(true) // 후처리(필터) ON/OFF, 기본 ON
  const [introDone, setIntroDone] = useState(false) // 인트로 로더 완료
  const [reveal1, setReveal1] = useState(false) // 섹션1 텍스트 reveal
  const [reveal2, setReveal2] = useState(false) // 섹션2 텍스트 reveal
  const introDoneRef = useRef(false)
  const reveal1Cur = useRef(false) // 현재 reveal1 상태 추적 (중복 setState 방지)
  const reveal2Cur = useRef(false)
  const progress = useRef(0) // 스크롤 진행도(0~1, eased) → 카메라 무빙에 사용
  const lenisRef = useRef(null) // 섹션 스냅(scrollTo)에 사용

  // Lenis: 관성 있는 부드러운 스크롤 (휠을 굴리면 쫀득하게 감속)
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true })
    lenisRef.current = lenis
    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  // 마우스 이동 → 3D 회전 + 물결에 사용
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
      pointer.current.moved = true // 실제로 움직였음을 표시
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // 스크롤 → 섹션1은 가만히 두고, 대각선 컷 라인만 아래→위로 이동.
  // 목표값(target)으로 부드럽게 수렴(easing)시켜 미끄러지는 느낌을 줌.
  useEffect(() => {
    const SLANT = 16 // 대각선 기울기(좌우 높이차, %)
    let target = 0 // 스크롤이 가리키는 목표 진행도
    let current = 0 // 실제 표시되는 진행도 (target 으로 천천히 따라감)
    let raf
    let lastUser = performance.now() // 마지막 사용자 입력 시각
    let snapping = false // 스냅 진행 중 플래그
    let dir = 0 // 스크롤 방향 (+1 아래, -1 위)
    let lastTarget = 0

    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      const t = max > 0 ? window.scrollY / max : 0
      if (t > lastTarget) dir = 1
      else if (t < lastTarget) dir = -1
      lastTarget = t
      target = t
    }
    // 사용자 입력 → 스냅 취소 + 타이머 리셋
    const onUser = () => {
      lastUser = performance.now()
      snapping = false
    }

    const loop = () => {
      current += (target - current) * 0.09 // 0에 가까울수록 더 미끄러지듯
      progress.current = current // 카메라 무빙용 진행도 공유

      // 스냅: 사용자가 입력을 멈췄는데 전환 중간(0.04~0.96)에 걸쳐 있으면
      // '스크롤 방향'으로 정착 — 아래로 가던 중이면 다음 섹션, 위로면 이전 섹션
      const now = performance.now()
      if (!snapping && now - lastUser > 160 && current > 0.04 && current < 0.96) {
        const max = document.body.scrollHeight - window.innerHeight
        let dest
        if (dir >= 0) dest = target > 0.12 ? max : 0 // 아래로: 조금만 내려도 다음 섹션
        else dest = target < 0.88 ? 0 : max // 위로: 조금만 올려도 이전 섹션
        snapping = true
        if (lenisRef.current) lenisRef.current.scrollTo(dest, { duration: 0.9 })
      }

      // 섹션을 드나들 때마다 텍스트 reveal 재생 (히스테리시스로 깜빡임 방지).
      // 리셋은 해당 섹션이 화면 밖일 때 일어나서 보이지 않음.
      if (introDoneRef.current) {
        // 섹션1 (위쪽)
        if (current < 0.45 && !reveal1Cur.current) {
          reveal1Cur.current = true
          setReveal1(true)
        } else if (current > 0.55 && reveal1Cur.current) {
          reveal1Cur.current = false
          setReveal1(false)
        }
        // 섹션2 (아래쪽)
        if (current > 0.55 && !reveal2Cur.current) {
          reveal2Cur.current = true
          setReveal2(true)
        } else if (current < 0.45 && reveal2Cur.current) {
          reveal2Cur.current = false
          setReveal2(false)
        }
      }

      const center = 115 - current * 130 // 115%(안 잘림) → -15%(완전히 잘림)
      const yL = center + SLANT / 2
      const yR = center - SLANT / 2
      if (frontRef.current) {
        frontRef.current.style.clipPath = `polygon(0% 0%, 100% 0%, 100% ${yR}%, 0% ${yL}%)`
        // 섹션2 영역에선 위 레이어가 클릭을 막지 않도록 포인터 이벤트 차단
        frontRef.current.style.pointerEvents = current > 0.5 ? 'none' : 'auto'
      }
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onUser, { passive: true })
    window.addEventListener('touchstart', onUser, { passive: true })
    window.addEventListener('touchmove', onUser, { passive: true })
    window.addEventListener('keydown', onUser)
    onScroll()
    loop()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onUser)
      window.removeEventListener('touchstart', onUser)
      window.removeEventListener('touchmove', onUser)
      window.removeEventListener('keydown', onUser)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* 인트로 로더 (완료되면 섹션1 텍스트 reveal 시작) */}
      {!introDone && (
        <Intro
          onDone={() => {
            setIntroDone(true)
            introDoneRef.current = true
            setReveal1(true) // 첫 진입 reveal
            reveal1Cur.current = true
          }}
        />
      )}

      {/* 상단 고정 바 */}
      <header className="topbar">
        <div className="logo">OPENFLOOR<br />VENTURES</div>
        <button className="sound-toggle" onClick={() => setFilterOn((v) => !v)}>
          FILTER {filterOn ? 'ON' : 'OFF'} <span className={filterOn ? 'wave on' : 'wave'}>〜</span>
        </button>
      </header>

      {/* 아래 레이어: 섹션 2 (스크롤하면 위 레이어가 걷히며 드러남) */}
      <div className="layer back">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
          <SceneTwo pointer={pointer} progress={progress} filter={filterOn} />
        </Canvas>
        <div className="overlay">
          <RevealText
            className="headline mid-left"
            lines={['CAPITAL', 'WITH', 'CONVICTION']}
            play={reveal2}
          />
          <p className={`body mid-left-text fade ${reveal2 ? 'play' : ''}`} style={{ transitionDelay: '0.35s' }}>
            Openfloor Ventures is an early-stage VC fund at the intersection of
            blockchain infrastructure and AI. We move with speed and clarity.
          </p>
          <button
            className={`cta mid-left-text fade ${reveal2 ? 'play' : ''}`}
            style={{ transitionDelay: '0.5s' }}
            onMouseEnter={() => playHover('particle')}
          >
            EXPLORE OUR PORTFOLIO
          </button>
          <div className="tag bottom-left">//01<br />MANIFESTO</div>
        </div>
      </div>

      {/* 위 레이어: 섹션 1 (대각선으로 잘려 위로 사라짐) */}
      <div className="layer front" ref={frontRef}>
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
          <SceneOne pointer={pointer} progress={progress} play={introDone} filter={filterOn} />
        </Canvas>
        <div className="overlay">
          <RevealText
            className="headline bottom-left"
            lines={['THE NEXT WAVE', 'OF VENTURE', 'CAPITAL']}
            play={reveal1}
            onMouseEnter={() => playHover('crystal')}
          />
          <div
            className={`hint bottom-right fade ${reveal1 ? 'play' : ''}`}
            style={{ transitionDelay: '0.6s' }}
            onMouseEnter={() => playHover('crystal')}
          >
            SCROLL DOWN TO<br />DISCOVER MORE
          </div>
        </div>
      </div>

      {/* 전체 화면 최상단 물결 오버레이 (모든 섹션에서 작동) */}
      <RippleOverlay />

      {/* 스크롤 길이를 만들어주는 투명 영역 */}
      <div className="scroll-spacer" />
    </>
  )
}
