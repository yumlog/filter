// 줄 단위로 아래에서 위로 슬라이드되며 나타나는 텍스트.
// play 가 true 가 되는 순간 애니메이션이 재생됨 (mask reveal).
export default function RevealText({
  lines,
  play = false,
  className = '',
  delay = 0,
  lineDelay = 0.09,
  ...rest
}) {
  return (
    <div className={className} {...rest}>
      {lines.map((ln, i) => (
        <span className="reveal-line" key={i}>
          <span
            className={`reveal-inner ${play ? 'play' : ''}`}
            style={{ transitionDelay: `${delay + i * lineDelay}s` }}
          >
            {ln}
          </span>
        </span>
      ))}
    </div>
  )
}
