import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 공중에 천천히 떠다니는 미세 먼지 입자 → 공간의 깊이/분위기
export default function DustField({
  count = 280,
  area = [16, 10, 8],
  size = 0.03,
  opacity = 0.45,
  color = '#bcdcff',
}) {
  const ref = useRef()

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * area[0]
      positions[i * 3 + 1] = (Math.random() - 0.5) * area[1]
      positions[i * 3 + 2] = (Math.random() - 0.5) * area[2]
      speeds[i] = 0.1 + Math.random() * 0.25
    }
    return { positions, speeds }
  }, [count, area])

  useFrame((state, delta) => {
    const arr = ref.current.geometry.attributes.position.array
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      // 천천히 위로 상승 + 좌우 미세 흔들림
      let y = arr[i * 3 + 1] + speeds[i] * delta * 0.4
      if (y > area[1] / 2) y = -area[1] / 2 // 위로 나가면 아래에서 재등장
      arr[i * 3 + 1] = y
      arr[i * 3 + 0] += Math.sin(t * 0.2 + i) * 0.0006
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
