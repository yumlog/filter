import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'

// 본체 크리스탈은 원본 그대로(절대 안 깨짐).
// 호버한 부위에만 '두께 있는 파편'이 돋아나 튀어나오며,
// 파편도 본체와 같은 투과/굴절 재질(MeshTransmissionMaterial)을 써서 유리 질감을 가짐.

export const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
export const fresnelFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f);
  }
`

// 공통 크리스탈(투과) 재질 파라미터
export const crystalProps = {
  samples: 16,
  resolution: 1024,
  transmission: 1,
  ior: 1.45,
  roughness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.03,
  chromaticAberration: 0.12,
  anisotropy: 0.2,
  distortion: 0.4,
  distortionScale: 0.5,
  temporalDistortion: 0.15,
  iridescence: 0.8,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 500],
  color: '#ffffff',
  attenuationColor: '#cfeeff',
  attenuationDistance: 8,
  emissiveIntensity: 0,
}

export default function CrystalOBJ({ pointer, url = '/models/crystal.obj', scale = 2.3 }) {
  const group = useRef()
  const spin = useRef()
  const meshRef = useRef()
  const shardMatRef = useRef()
  const activeTarget = useRef(0)
  const obj = useLoader(OBJLoader, url)

  // 화면 너비에 비례한 반응형 스케일 (텍스트의 vw 처럼)
  const { size } = useThree()
  const rScale = scale * THREE.MathUtils.clamp(size.width / 1440, 0.6, 1.1)

  // 오버레이 캔버스가 위에 있어도 동작하도록 window 전역 마우스 NDC 사용
  const ndc = useMemo(() => new THREE.Vector2(), [])

  // 원본 메쉬 (본체용)
  const baseGeo = useMemo(() => {
    let g = null
    obj.traverse((c) => {
      if (c.isMesh && !g) g = c.geometry
    })
    if (!g) return null
    g = g.clone()
    g.center()
    if (!g.attributes.normal) g.computeVertexNormals()
    return g
  }, [obj])

  // 파편용 — 각 면을 안쪽으로 압출해 '두께 있는 조각'으로 + 면별 속성
  const shardGeo = useMemo(() => {
    if (!baseGeo) return null
    const tri = baseGeo.index ? baseGeo.toNonIndexed() : baseGeo.clone()
    const pos = tri.attributes.position
    const triCount = pos.count / 3
    const thickness = 0.07

    const positions = []
    const centroids = []
    const fnormals = []
    const rands = []
    const A = new THREE.Vector3()
    const B = new THREE.Vector3()
    const C = new THREE.Vector3()
    const N = new THREE.Vector3()
    const ab = new THREE.Vector3()
    const cb = new THREE.Vector3()
    let cx = 0
    let cy = 0
    let cz = 0
    let rr = 0
    const put = (v) => {
      positions.push(v.x, v.y, v.z)
      centroids.push(cx, cy, cz)
      fnormals.push(N.x, N.y, N.z)
      rands.push(rr)
    }
    const face = (v0, v1, v2) => {
      put(v0)
      put(v1)
      put(v2)
    }

    for (let i = 0; i < triCount; i++) {
      A.fromBufferAttribute(pos, i * 3)
      B.fromBufferAttribute(pos, i * 3 + 1)
      C.fromBufferAttribute(pos, i * 3 + 2)
      cx = (A.x + B.x + C.x) / 3
      cy = (A.y + B.y + C.y) / 3
      cz = (A.z + B.z + C.z) / 3
      cb.subVectors(C, B)
      ab.subVectors(A, B)
      N.copy(cb).cross(ab).normalize()
      if (N.x * cx + N.y * cy + N.z * cz < 0) N.negate()
      rr = Math.random()

      const off = N.clone().multiplyScalar(thickness)
      const A1 = A.clone()
      const B1 = B.clone()
      const C1 = C.clone()
      const A0 = A.clone().sub(off)
      const B0 = B.clone().sub(off)
      const C0 = C.clone().sub(off)

      face(A1, B1, C1)
      face(C0, B0, A0)
      face(A1, B1, B0)
      face(A1, B0, A0)
      face(B1, C1, C0)
      face(B1, C0, B0)
      face(C1, A1, A0)
      face(C1, A0, C0)
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('aCentroid', new THREE.Float32BufferAttribute(centroids, 3))
    g.setAttribute('aFaceNormal', new THREE.Float32BufferAttribute(fnormals, 3))
    g.setAttribute('aRand', new THREE.Float32BufferAttribute(rands, 1))
    g.computeVertexNormals()
    return g
  }, [baseGeo])

  const hover = useMemo(
    () => ({
      uHover: { value: new THREE.Vector3(999, 999, 999) },
      uActive: { value: 0 },
      uRadius: { value: 0.5 },
      uTime: { value: 0 },
    }),
    [],
  )

  const fresnelUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#bfe6ff') },
      uPower: { value: 2.6 },
      uIntensity: { value: 1.8 },
    }),
    [],
  )

  // 파편 재질(투과)의 셰이더에 변위 + '호버 부위만 보이게' discard 주입
  useEffect(() => {
    const m = shardMatRef.current
    if (!m) return
    const prev = m.onBeforeCompile
    m.onBeforeCompile = (shader, renderer) => {
      if (prev) prev.call(m, shader, renderer)
      shader.uniforms.uHover = hover.uHover
      shader.uniforms.uActive = hover.uActive
      shader.uniforms.uRadius = hover.uRadius
      shader.uniforms.uTime = hover.uTime
      shader.vertexShader =
        `
        attribute vec3 aCentroid;
        attribute vec3 aFaceNormal;
        attribute float aRand;
        uniform vec3 uHover;
        uniform float uActive;
        uniform float uRadius;
        uniform float uTime;
        varying float vInf;
        ` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float _d = distance(aCentroid, uHover);
           float _inf = smoothstep(uRadius, 0.0, _d) * uActive;
           vInf = _inf;
           transformed += aFaceNormal * _inf * (0.16 + aRand * 0.26)
                        + aFaceNormal * _inf * 0.04 * sin(uTime * 3.0 + aRand * 12.0);`,
        )
      shader.fragmentShader =
        `varying float vInf;
        ` +
        shader.fragmentShader.replace(
          'void main() {',
          `void main() {
           if (vInf < 0.01) discard;`, // 호버 부위 파편만 렌더
        )
    }
    m.needsUpdate = true
  }, [hover])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    group.current.position.y = Math.sin(t * 0.5) * 0.12
    spin.current.rotation.y += delta * 0.12

    // 마우스와 무관하게 자동으로 부드럽게 기울며 회전
    group.current.rotation.x = Math.sin(t * 0.3) * 0.12
    group.current.rotation.z = Math.cos(t * 0.23) * 0.08

    // 마우스를 한 번이라도 움직이기 전엔 비활성 (초기 (0,0)=중앙 오인 방지)
    ndc.set(pointer.current.x, pointer.current.y)
    const hit =
      pointer.current.moved && meshRef.current
        ? (state.raycaster.setFromCamera(ndc, state.camera),
          state.raycaster.intersectObject(meshRef.current))
        : []
    if (hit.length) {
      hover.uHover.value.copy(spin.current.worldToLocal(hit[0].point.clone()))
      activeTarget.current = 1
    } else {
      activeTarget.current = 0
    }
    hover.uActive.value += (activeTarget.current - hover.uActive.value) * 0.12
    hover.uTime.value = t
  })

  if (!baseGeo) return null

  return (
    <group ref={group} scale={rScale}>
      <group ref={spin}>
        {/* 본체 — 원본 그대로, 절대 안 깨짐 */}
        <mesh ref={meshRef} geometry={baseGeo}>
          <MeshTransmissionMaterial thickness={0.7} flatShading {...crystalProps} />
        </mesh>

        {/* Fresnel rim glow */}
        <mesh geometry={baseGeo} scale={1.015}>
          <shaderMaterial
            vertexShader={fresnelVertex}
            fragmentShader={fresnelFragment}
            uniforms={fresnelUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* 호버 파편 — 본체와 같은 유리 질감(투과). 평소엔 discard 로 안 보임 */}
        {shardGeo && (
          <mesh geometry={shardGeo}>
            <MeshTransmissionMaterial
              ref={shardMatRef}
              thickness={0.4}
              side={THREE.DoubleSide}
              {...crystalProps}
            />
          </mesh>
        )}
      </group>

      <pointLight color="#cfeaff" intensity={3} distance={7} position={[0, 0, 0]} />
    </group>
  )
}
