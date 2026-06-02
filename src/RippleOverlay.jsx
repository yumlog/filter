import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 전체 화면 최상단에 깔리는 투명 물결 오버레이.
// 마우스를 움직이면 그 자리에서 밝은 동심원 파동이 퍼짐 (가산 블렌딩 → 투명+밝게).
// 어느 섹션 위에서나 동작 (window 마우스 기준, screen-space).
const NUM = 16

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // 카메라 무시, 전체 화면 quad
  }
`

const fragmentShader = /* glsl */ `
  #define NUM ${NUM}
  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uPos[NUM];
  uniform float uBirth[NUM];
  varying vec2 vUv;

  void main() {
    float wave = 0.0;
    for (int i = 0; i < NUM; i++) {
      float life = 1.5; // 짧게 → 흔적이 빨리 사라짐
      float age = uTime - uBirth[i];
      if (age < 0.0 || age > life) continue;

      vec2 diff = vUv - uPos[i];
      diff.x *= uAspect;
      float d = length(diff);
      float ang = atan(diff.y, diff.x);
      float seed = uBirth[i] * 7.0;

      // 낮은 주파수(1·2·3)만 seed로 섞어 비대칭 불규칙한 윤곽 (높은 항=꽃잎 제거)
      float wob = sin(ang * 1.0 + seed * 1.7) * 0.013
                + sin(ang * 2.0 + seed * 2.9) * 0.008
                + sin(ang * 3.0 + seed * 4.3) * 0.004;
      float dd = d + wob;

      float speed = 0.085 + fract(sin(seed) * 43.0) * 0.04;
      float radius = age * speed;

      float ring = sin((dd - radius) * 40.0);
      float band = smoothstep(0.13, 0.0, abs(dd - radius)); // 더 부드럽게 (필터 느낌)
      float n = age / life;
      float attack = smoothstep(0.0, 0.22, n); // 시작에 스르륵 생겨남 (툭 튀어나옴 방지)
      float decay = pow(1.0 - n, 1.8);         // 끝으로 갈수록 빠르게 사라짐
      wave += ring * band * attack * decay;
    }
    float a = clamp(max(wave, 0.0), 0.0, 1.0) * 0.12; // 세기 ↑
    vec3 glow = vec3(0.92, 0.94, 0.96); // 파란끼 뺀 거의 흰색
    gl_FragColor = vec4(glow, a);
  }
`

function RipplePlane() {
  const last = useRef({ x: 0.5, y: 0.5 })
  const mouse = useRef({ x: 0.5, y: 0.5 })

  const ripples = useMemo(
    () => ({
      pos: Array.from({ length: NUM }, () => new THREE.Vector2(0.5, 0.5)),
      birth: new Float32Array(NUM).fill(-100),
      idx: 0,
    }),
    [],
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uPos: { value: ripples.pos },
      uBirth: { value: ripples.birth },
    }),
    [ripples],
  )

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = e.clientX / window.innerWidth
      mouse.current.y = 1 - e.clientY / window.innerHeight
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t
    uniforms.uAspect.value = state.size.width / state.size.height

    const mx = mouse.current.x
    const my = mouse.current.y
    const moved = Math.hypot(mx - last.current.x, my - last.current.y)
    if (moved > 0.03) {
      const i = ripples.idx % NUM
      ripples.pos[i].set(mx, my)
      ripples.birth[i] = t
      ripples.idx++
      last.current.x = mx
      last.current.y = my
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function RippleOverlay() {
  return (
    <div className="ripple-overlay">
      <Canvas
        orthographic
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        // R3F가 캔버스 래퍼에 인라인 pointer-events:auto를 강제하므로,
        // 여기서 none으로 덮어써야 아래 버튼/콘텐츠로 클릭이 통과됨.
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <RipplePlane />
      </Canvas>
    </div>
  )
}
