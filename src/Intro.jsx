import { useEffect, useState } from 'react'

// 진입 시 짧게 로딩되며 브랜드를 보여준 뒤 페이드아웃되는 인트로.
// 완료되면 onDone() 호출 → 본편 텍스트 reveal 시작.
export default function Intro({ onDone }) {
  const [pct, setPct] = useState(0)
  const [hide, setHide] = useState(false)

  useEffect(() => {
    let p = 0
    const iv = setInterval(() => {
      p = Math.min(100, p + Math.random() * 16 + 4)
      setPct(Math.floor(p))
      if (p >= 100) {
        clearInterval(iv)
        setTimeout(() => {
          setHide(true) // 페이드아웃 시작
          setTimeout(onDone, 800) // 페이드 끝나면 언마운트 + reveal
        }, 300)
      }
    }, 130)
    return () => clearInterval(iv)
  }, [onDone])

  return (
    <div className={`intro ${hide ? 'hide' : ''}`}>
      <div className="intro-logo">OPENFLOOR VENTURES</div>
      <div className="intro-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="intro-pct">{pct}%</div>
    </div>
  )
}
