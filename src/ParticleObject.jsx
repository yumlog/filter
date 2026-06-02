import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// 2번 섹션: 점(파티클) 클라우드.
// 마우스를 대면 그 부위 근처 입자들만 바깥으로 튀어나가며 밝아짐.
// (파티클은 면이 없어 직접 레이캐스트 불가 → 보이지 않는 프록시 구에 레이캐스트)

const vertexShader = /* glsl */ `
  attribute vec3 aRand;
  uniform vec3 uHover;
  uniform float uActive;
  uniform float uRadius;
  uniform float uTime;
  uniform float uSize;
  varying float vInf;
  void main() {
    vec3 p = position;
    float d = distance(position, uHover);
    float inf = smoothstep(uRadius, 0.0, d) * uActive;
    vInf = inf;

    // 사방으로 터지듯 흩어짐 (방향을 랜덤 위주로)
    vec3 dir = normalize(normalize(position) * 0.35 + aRand);
    p += dir * inf * (0.9 + aRand.x * 0.9);
    p += aRand * inf * 0.15 * sin(uTime * 5.0 + aRand.z * 10.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (35.0 / -mv.z); // 거리 보정한 작은 점
    gl_Position = projectionMatrix * mv;
  }
`
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vInf;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c)); // 둥근 점
    gl_FragColor = vec4(uColor, a * 0.9);       // 밝기 변화 없음
  }
`

export default function ParticleObject({ pointer, count = 1800 }) {
  const group = useRef()
  const proxy = useRef()
  const activeTarget = useRef(0)

  // 화면 너비에 비례한 반응형 스케일
  const { size } = useThree()
  const rScale = THREE.MathUtils.clamp(size.width / 1440, 0.6, 1.1)

  // 오버레이 캔버스가 위에 있어도 동작하도록 window 전역 마우스 NDC 사용
  const ndc = useMemo(() => new THREE.Vector2(), [])

  // 정이십면체 표면 근처에 입자 분포 + 입자별 랜덤값
  const { positions, rands } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2, 6)
    const src = geo.attributes.position.array
    const vertexCount = src.length / 3
    const positions = new Float32Array(count * 3)
    const rands = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const v = Math.floor(Math.random() * vertexCount) * 3
      const spread = 0.25
      positions[i * 3 + 0] = src[v + 0] + (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = src[v + 1] + (Math.random() - 0.5) * spread
      positions[i * 3 + 2] = src[v + 2] + (Math.random() - 0.5) * spread
      rands[i * 3 + 0] = Math.random() * 2 - 1
      rands[i * 3 + 1] = Math.random() * 2 - 1
      rands[i * 3 + 2] = Math.random() * 2 - 1
    }
    geo.dispose()
    return { positions, rands }
  }, [count])

  const uniforms = useMemo(
    () => ({
      uHover: { value: new THREE.Vector3(0, 0, 0) },
      uActive: { value: 0 },
      uRadius: { value: 1.3 },
      uTime: { value: 0 },
      uSize: { value: 0.9 },
      uColor: { value: new THREE.Color('#bfe0ff') },
    }),
    [],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    group.current.rotation.y += delta * 0.1
    group.current.position.y = Math.sin(t * 0.5) * 0.2

    // 마우스와 무관하게 자동으로 부드럽게 기울며 회전
    group.current.rotation.x = Math.sin(t * 0.25) * 0.12

    // 마우스를 프록시 구에 레이캐스트 → 호버 지점을 로컬좌표로
    ndc.set(pointer.current.x, pointer.current.y)
    const hit =
      pointer.current.moved && proxy.current
        ? (state.raycaster.setFromCamera(ndc, state.camera),
          state.raycaster.intersectObject(proxy.current))
        : []
    if (hit.length) {
      const target = group.current.worldToLocal(hit[0].point.clone())
      if (uniforms.uActive.value < 0.05) {
        uniforms.uHover.value.copy(target) // 막 닿을 땐 스냅
      } else {
        uniforms.uHover.value.lerp(target, 0.16) // 이후엔 미끄러지듯 따라감
      }
      activeTarget.current = 1
    } else {
      activeTarget.current = 0
    }
    // 더 천천히 튀었다 돌아오도록 easing 완화
    uniforms.uActive.value += (activeTarget.current - uniforms.uActive.value) * 0.07
    uniforms.uTime.value = t
  })

  return (
    <group ref={group} scale={rScale}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[rands, 3]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* 레이캐스트용 보이지 않는 프록시 (파티클 형태와 동일한 구) */}
      <mesh ref={proxy} visible={false}>
        <icosahedronGeometry args={[2.15, 3]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}
