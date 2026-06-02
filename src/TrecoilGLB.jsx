import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { crystalProps, fresnelFragment } from './CrystalOBJ'

// 정점 변형용 uniform 선언 (본체/림 셰이더 공통)
const DISP_UNIFORMS = /* glsl */ `
  uniform float uTime;
  uniform float uFlowAmp;    // 흐르는 맥동 세기
  uniform float uFlowFreq;   // 파동 밀도
  uniform float uFlowSpeed;  // 흐르는 속도
  uniform vec3  uHover;      // 호버 지점(로컬)
  uniform float uHoverActive;// 0~1 호버 활성도
  uniform float uHoverRadius;// 부푸는 반경
  uniform float uHoverAmp;   // 부푸는 세기
`

// 법선 방향 변위: (1) Y축을 따라 흐르는 부피 맥동 + (2) 호버 부위 돌출
const DISP_BODY = /* glsl */ `
  float _flow = sin(position.y * uFlowFreq - uTime * uFlowSpeed);
  float _swell = uFlowAmp * (0.5 + 0.5 * _flow);
  float _hd = distance(position, uHover);
  float _hb = smoothstep(uHoverRadius, 0.0, _hd) * uHoverActive * uHoverAmp;
  transformed += objectNormal * (_swell + _hb);
`

// 림 글로우 정점 셰이더 — 본체와 '똑같은' 변위를 적용해 윤곽이 함께 부풀게
const rimVertex = /* glsl */ `
  ${DISP_UNIFORMS}
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 p = position;
    float _flow = sin(position.y * uFlowFreq - uTime * uFlowSpeed);
    float _swell = uFlowAmp * (0.5 + 0.5 * _flow);
    float _hd = distance(position, uHover);
    float _hb = smoothstep(uHoverRadius, 0.0, _hd) * uHoverActive * uHoverAmp;
    p += normal * (_swell + _hb);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

// 섹션 3 의 히어로 오브젝트: trecoil.glb.
// 섹션 1 크리스탈과 같은 투과/굴절 유리 재질 + Fresnel 림.
// 추가로: 한 방향으로 흐르는 부피 맥동 + 마우스 호버 부위 부풀기.
export default function TrecoilGLB({ pointer, url = '/models/trecoil.glb', scale = 3.2 }) {
  const group = useRef()
  const spin = useRef()
  const meshRef = useRef()
  const bodyMatRef = useRef()
  const hoverTarget = useRef(0)
  const drag = useRef({ active: false, lastX: 0, lastY: 0 }) // 드래그 상태
  const targetRot = useRef({ x: -0.629, y: 0.557 }) // 시작 각도 (드래그로 여기서부터 누적)
  const { scene } = useGLTF(url)
  const ndc = useMemo(() => new THREE.Vector2(), [])

  // 마우스 드래그로 오브젝트 회전 (window 기준 → 오버레이/레이어 영향 없음)
  useEffect(() => {
    const onDown = (e) => {
      drag.current.active = true
      drag.current.lastX = e.clientX
      drag.current.lastY = e.clientY
    }
    const onMove = (e) => {
      if (!drag.current.active) return
      const dx = e.clientX - drag.current.lastX
      const dy = e.clientY - drag.current.lastY
      drag.current.lastX = e.clientX
      drag.current.lastY = e.clientY
      targetRot.current.y += dx * 0.006 // 좌우 드래그 → yaw
      targetRot.current.x += dy * 0.006 // 상하 드래그 → pitch
      targetRot.current.x = THREE.MathUtils.clamp(targetRot.current.x, -1.2, 1.2) // 뒤집힘 방지
    }
    const onUp = () => {
      drag.current.active = false
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  // 모델의 모든 메시를 월드 변환을 구워 넣어 합치고, 센터링 + 단위 크기로 정규화.
  const geometry = useMemo(() => {
    const root = scene.clone(true)
    root.updateWorldMatrix(true, true)
    const geos = []
    root.traverse((c) => {
      if (!c.isMesh || !c.geometry) return
      let g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()
      g.applyMatrix4(c.matrixWorld)
      for (const key of Object.keys(g.attributes)) {
        if (key !== 'position' && key !== 'normal') g.deleteAttribute(key)
      }
      if (!g.attributes.normal) g.computeVertexNormals()
      geos.push(g)
    })
    if (!geos.length) return null
    let merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false) || geos[0]

    merged.computeBoundingBox()
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    merged.boundingBox.getSize(size)
    merged.boundingBox.getCenter(center)
    merged.translate(-center.x, -center.y, -center.z)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    merged.scale(1 / maxDim, 1 / maxDim, 1 / maxDim)
    return merged
  }, [scene])

  const { size } = useThree()
  const rScale = scale * THREE.MathUtils.clamp(size.width / 1440, 0.6, 1.1)

  // 본체(투과 재질)와 림이 공유하는 uniform (한 곳에서만 갱신)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlowAmp: { value: 0.035 }, // 맥동 세기 (로컬 단위, 오브젝트 ≈ 1) — 덜 꿀렁이게 낮춤
      uFlowFreq: { value: 6 }, // Y축 파동 밀도 — 낮춰서 마루 하나만 흐르게(여러 줄기 방지)
      uFlowSpeed: { value: 1.1 }, // 흐르는 속도 — 조금 낮춤
      uHover: { value: new THREE.Vector3(999, 999, 999) },
      uHoverActive: { value: 0 },
      uHoverRadius: { value: 0.28 },
      uHoverAmp: { value: 0.04 }, // 호버 돌출 세기 — 다시 절반으로 낮춤
      // Fresnel 림용
      uColor: { value: new THREE.Color('#bfe6ff') },
      uPower: { value: 2.6 },
      uIntensity: { value: 1.8 },
    }),
    [],
  )

  // 투과 재질 셰이더에 변위 주입 (drei 의 onBeforeCompile 을 보존하며 체이닝)
  useEffect(() => {
    const m = bodyMatRef.current
    if (!m) return
    const prev = m.onBeforeCompile
    m.onBeforeCompile = (shader, renderer) => {
      if (prev) prev.call(m, shader, renderer)
      shader.uniforms.uTime = uniforms.uTime
      shader.uniforms.uFlowAmp = uniforms.uFlowAmp
      shader.uniforms.uFlowFreq = uniforms.uFlowFreq
      shader.uniforms.uFlowSpeed = uniforms.uFlowSpeed
      shader.uniforms.uHover = uniforms.uHover
      shader.uniforms.uHoverActive = uniforms.uHoverActive
      shader.uniforms.uHoverRadius = uniforms.uHoverRadius
      shader.uniforms.uHoverAmp = uniforms.uHoverAmp
      shader.vertexShader =
        DISP_UNIFORMS +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n' + DISP_BODY,
        )
    }
    m.needsUpdate = true
  }, [uniforms])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t

    group.current.position.y = Math.sin(t * 0.5) * 0.12 // 위아래 부유 (유지)

    // 드래그로 누적된 목표 회전으로 부드럽게 수렴 (자동 회전 없음)
    spin.current.rotation.y = THREE.MathUtils.damp(spin.current.rotation.y, targetRot.current.y, 6, delta)
    spin.current.rotation.x = THREE.MathUtils.damp(spin.current.rotation.x, targetRot.current.x, 6, delta)

    // 호버 레이캐스트 → 호버 지점을 지오메트리 로컬 좌표로 변환
    ndc.set(pointer.current.x, pointer.current.y)
    const hit =
      pointer.current.moved && meshRef.current
        ? (state.raycaster.setFromCamera(ndc, state.camera),
          state.raycaster.intersectObject(meshRef.current))
        : []
    if (hit.length) {
      const p = meshRef.current.worldToLocal(hit[0].point.clone())
      // 처음 닿을 땐 그 지점에 바로 놓고, 이후엔 미끄러지듯 따라오게(trailing)
      if (uniforms.uHoverActive.value < 0.02) uniforms.uHover.value.copy(p)
      else uniforms.uHover.value.lerp(p, 0.3)
      hoverTarget.current = 1
    } else {
      hoverTarget.current = 0
    }
    // 비대칭: 솟을 땐 즉각적으로(반응 ↑↑), 가라앉을 땐 부드럽게(자연스러움 유지)
    const rate = hoverTarget.current > uniforms.uHoverActive.value ? 0.45 : 0.06
    uniforms.uHoverActive.value += (hoverTarget.current - uniforms.uHoverActive.value) * rate
  })

  if (!geometry) return null

  return (
    <group ref={group} scale={rScale} rotation={[0, 0, -0.5]}>
      <group ref={spin} rotation={[-0.629, 0.557, 0]}>
        {/* 본체 — 섹션 1 과 동일한 투과/굴절 유리 재질 + 변위 주입 */}
        <mesh ref={meshRef} geometry={geometry}>
          <MeshTransmissionMaterial ref={bodyMatRef} thickness={0.7} flatShading {...crystalProps} />
        </mesh>

        {/* Fresnel 림 글로우 — 본체와 동일한 변위로 함께 부풂 */}
        <mesh geometry={geometry} scale={1.015}>
          <shaderMaterial
            vertexShader={rimVertex}
            fragmentShader={fresnelFragment}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
      <pointLight color="#cfeaff" intensity={3} distance={8} position={[0, 0, 0]} />
    </group>
  )
}

useGLTF.preload('/models/trecoil.glb')
