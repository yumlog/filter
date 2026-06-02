import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 위에서 비스듬히 내려오는 god ray(빛줄기). 셰이더로 부드러운 빛 기둥 몇 개를
// 그리고 천천히 흔들어 줍니다. AdditiveBlending + Bloom 으로 빛나는 광선이 됩니다.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float beams = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float cx = 0.3 + 0.22 * fi + sin(uTime * 0.12 + fi) * 0.04;
      float w = 0.05 + 0.02 * fi;
      beams += exp(-pow((vUv.x - cx) / w, 2.0));
    }
    float topFade = smoothstep(0.0, 1.0, vUv.y); // 위가 밝고 아래로 사라짐
    float a = beams * topFade * 0.22;
    gl_FragColor = vec4(vec3(0.55, 0.78, 1.0) * a, a);
  }
`

export default function LightShafts() {
  const matRef = useRef()
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh position={[0, 1.5, -2]} rotation={[0, 0, 0.18]}>
      <planeGeometry args={[20, 14]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
