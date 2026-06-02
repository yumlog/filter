import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 사방에 떠다니는 어두운 거친 돌 파편.
// 도형을 노이즈로 변위시켜 울퉁불퉁한 바위 표면을 만들고, 비균일 스케일로 제각각 모양.

// 리렌더마다 새 배열이 생기면 useMemo가 위치를 재생성(=점프)하므로 상수로 고정
const DEFAULT_SPREAD = [20, 13, 9]

// 부드러운 다중 옥타브 노이즈 (바위 덩어리감)
function fbm(x, y, z) {
  let n = 0
  let amp = 0.5
  let f = 1.0
  for (let o = 0; o < 3; o++) {
    n +=
      amp *
      (Math.sin(x * f * 1.3 + y * f * 0.7) *
        Math.cos(y * f * 1.1 + z * f * 0.9) *
        Math.sin(z * f * 1.5 + x * f * 0.5))
    f *= 2.1
    amp *= 0.5
  }
  return n
}

// 도형 정점을 법선 방향으로 노이즈만큼 밀어 거친 바위 표면 생성
function makeRock(geo, amount) {
  geo.computeVertexNormals()
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nor, i)
    const d = fbm(v.x * 4.5, v.y * 4.5, v.z * 4.5) // 고주파 → 둥글지 않고 거칠게
    v.addScaledVector(n, d * amount)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  // 면 단위 음영(faceted)으로 거칠게
  const flat = geo.toNonIndexed()
  flat.computeVertexNormals()
  geo.dispose()
  return flat
}

function Chunk({ count, spread, geometry }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const items = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const s = 0.07 + Math.random() * 0.28
        return {
          pos: new THREE.Vector3(
            (Math.random() - 0.5) * spread[0],
            (Math.random() - 0.5) * spread[1],
            (Math.random() - 0.5) * spread[2] - 0.5,
          ),
          rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
          ),
          scale: new THREE.Vector3(
            s * (0.5 + Math.random()),
            s * (0.5 + Math.random()),
            s * (0.5 + Math.random()),
          ),
          drift: 0.04 + Math.random() * 0.1,
        }
      }),
    [count, spread],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033) // 프레임 끊김 시 점프 방지
    items.forEach((it, i) => {
      it.rot.x += it.rotSpeed.x * dt
      it.rot.y += it.rotSpeed.y * dt
      it.rot.z += it.rotSpeed.z * dt
      it.pos.y += it.drift * dt * 0.3
      if (it.pos.y > spread[1] / 2) it.pos.y = -spread[1] / 2
      dummy.position.copy(it.pos)
      dummy.rotation.copy(it.rot)
      dummy.scale.copy(it.scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]}>
      <meshStandardMaterial
        color="#0b1626"
        metalness={0.05}
        roughness={1} // 최대한 거칠게 → 매트한 돌
        emissive="#0c243f"
        emissiveIntensity={0.1}
        flatShading
      />
    </instancedMesh>
  )
}

export default function DebrisField({ count = 48, spread = DEFAULT_SPREAD }) {
  const per = Math.ceil(count / 3)

  // 세 가지 도형을 노이즈로 변위 → 울퉁불퉁한 바위 (한 번만 생성)
  const geos = useMemo(
    () => [
      // detail 낮게 → 각진 형태 유지 (분할할수록 구처럼 둥글어짐)
      makeRock(new THREE.TetrahedronGeometry(1, 1), 0.28),
      makeRock(new THREE.OctahedronGeometry(1, 1), 0.24),
      makeRock(new THREE.DodecahedronGeometry(1, 0), 0.2),
    ],
    [],
  )

  return (
    <>
      <Chunk count={per} spread={spread} geometry={geos[0]} />
      <Chunk count={per} spread={spread} geometry={geos[1]} />
      <Chunk count={per} spread={spread} geometry={geos[2]} />
    </>
  )
}
