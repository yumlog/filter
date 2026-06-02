import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

// 실제 GLB 모델 버전의 크리스탈.
// placeholder(CrystalRock)와 동일한 투과/굴절 재질 + 마우스 틸트 애니메이션을 적용하되,
// 형태만 불러온 GLB 지오메트리로 대체합니다.
//
// 사용: SceneOne.jsx 에서 CrystalRock 대신
//   <CrystalGLB pointer={pointer} url="/models/crystal.glb" />
export default function CrystalGLB({ pointer, url = '/models/crystal.glb', scale = 1.5 }) {
  const group = useRef()
  const mesh = useRef()
  const { nodes } = useGLTF(url)

  // GLB 안의 첫 번째 메시 지오메트리를 사용 (모델 구조에 맞게 바꿔도 됨)
  const geometry = useMemo(() => {
    let g = null
    Object.values(nodes).forEach((n) => {
      if (n.isMesh && !g) g = n.geometry
    })
    return g
  }, [nodes])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    group.current.position.y = Math.sin(t * 0.5) * 0.12
    mesh.current.rotation.y += delta * 0.12

    const targetX = pointer.current.y * 0.3
    const targetZ = -pointer.current.x * 0.15
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, delta)
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, targetZ, 3, delta)
  })

  return (
    <group ref={group} scale={scale}>
      <mesh ref={mesh} geometry={geometry}>
        <MeshTransmissionMaterial
          transmission={1}
          thickness={1.0}
          ior={1.45}
          roughness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.08}
          chromaticAberration={0.05}
          anisotropy={0.2}
          distortion={0.25}
          distortionScale={0.3}
          temporalDistortion={0.1}
          color="#eaf6ff"
          attenuationColor="#5a9be0"
          attenuationDistance={3.0}
          emissive="#1b4f9c"
          emissiveIntensity={0.2}
        />
      </mesh>
      <pointLight color="#cfeaff" intensity={4} distance={7} position={[0, 0, 0]} />
    </group>
  )
}

// 참고: 파일이 확실히 존재할 때만 preload 하세요 (없으면 에러).
// useGLTF.preload('/models/crystal.glb')
