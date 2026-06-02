import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// 섹션1 배경 수면 — 잔잔히 일렁이는 caustic 만 담당.
// (마우스 hover 물결은 RippleOverlay 가 최상단에서 따로 처리)
const PLANE_W = 90
const PLANE_H = 55

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z; // 카메라로부터의 거리
    gl_Position = projectionMatrix * mv;
  }
`

// 물 표면을 통과한 빛의 그물망(caustics)이 일렁이는 효과
// (TDM/Dave Hoskins 계열의 고전 caustic 근사)
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;
  varying float vDepth;

  #define TAU 6.28318530718
  #define ITER 5

  void main() {
    float time = uTime * 0.06 + 23.0; // 아주 천천히 출렁
    vec2 uv = vUv * vec2(uAspect, 1.0) * 2.0; // 밀도 더 낮춤

    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = vec2(p);
    float c = 1.0;
    float inten = 0.005;

    for (int n = 0; n < ITER; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    c /= float(ITER);
    c = 1.17 - pow(c, 1.4);
    float v = pow(abs(c), 2.2); // 지수 더 ↓ → 선이 거의 안 보이고 부드러운 빛무리

    // 먼 쪽(압축돼 짜글거리는 부분)은 caustic 페이드아웃
    float depthFade = 1.0 - smoothstep(14.0, 30.0, vDepth);

    vec3 base = vec3(0.035, 0.09, 0.2);      // 어두운 물 베이스
    vec3 caustic = vec3(0.4, 0.65, 0.95) * v; // 푸른 물빛
    gl_FragColor = vec4(base + caustic * 0.5 * depthFade, 1.0); // 은은하게
  }
`

export default function RippleSurface() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: PLANE_W / PLANE_H },
    }),
    [],
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} toneMapped={false} />
    </mesh>
  )
}
