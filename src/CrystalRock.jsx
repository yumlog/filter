import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

// 1번 섹션 히어로: 빛이 투과·굴절되는 얼음 크리스탈
// - MeshTransmissionMaterial: 유리/얼음처럼 뒤가 비치고 굴절됨
// - 각진 면(flatShading) + 환경맵 반사 + 색수차 → 보석 같은 질감
// - 내부 emissive + pointLight + Bloom 으로 안에서 빛나는 느낌
export default function CrystalRock({ pointer }) {
  const group = useRef()
  const mesh = useRef()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    // 천천히 떠다님
    group.current.position.y = Math.sin(t * 0.5) * 0.12
    mesh.current.rotation.y += delta * 0.12

    // 마우스를 따라 살짝 기울어짐
    const targetX = pointer.current.y * 0.3
    const targetZ = -pointer.current.x * 0.15
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, delta)
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, targetZ, 3, delta)
  })

  return (
    <group ref={group}>
      {/* 세로로 길쭉한 크리스탈 shard 형태 */}
      <mesh ref={mesh} scale={[1.25, 1.7, 1.25]}>
        {/* detail 1 + flatShading → 각진 보석 면 */}
        <icosahedronGeometry args={[1, 1]} />
        <MeshTransmissionMaterial
          transmission={1} // 완전 투과 (유리)
          thickness={1.0} // 두께감 → 굴절 강도
          ior={1.45} // 굴절률 (유리/얼음 근처)
          roughness={0.02} // 더 매끈 → 선명한 반사
          clearcoat={1} // 반사 코팅 추가
          clearcoatRoughness={0.08}
          chromaticAberration={0.05} // 가장자리 무지갯빛
          anisotropy={0.2}
          distortion={0.25} // 표면 일렁임
          distortionScale={0.3}
          temporalDistortion={0.1}
          color="#eaf6ff"
          attenuationColor="#5a9be0" // 내부로 갈수록 도는 블루
          attenuationDistance={3.0} // 늘림 → 더 맑고 투명
          emissive="#1b4f9c"
          emissiveIntensity={0.2}
          flatShading
        />
      </mesh>

      {/* 돌 내부에서 새어나오는 빛 */}
      <pointLight color="#cfeaff" intensity={4} distance={7} position={[0, 0, 0]} />
    </group>
  )
}
