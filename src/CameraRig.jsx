import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3)

// 카메라 무빙:
//  - 입장 연출(entrance): play 가 켜지면, 먼 곳 + 살짝 회전 상태에서 시작해
//    서서히 다가오며 회전이 풀려 제자리로 들어옴 (한 번 재생)
//  - progress(0~1): 스크롤 진행도 → 회전 + 확대 (되돌리면 역재생)
//  - pointer: 마우스 패럴럭스
export default function CameraRig({
  pointer,
  progress,
  play = false,
  strength = 0.6,
  zoomFrom = 8,
  zoomTo = 8,
  orbitFrom = 0,
  orbitTo = 0,
  yLift = 0,
  entranceZoom = 0, // 입장 시 추가로 더 멀어지는 거리
  entranceOrbit = 0, // 입장 시 추가 회전(라디안)
  entranceDuration = 2.6, // 입장 시간(초)
}) {
  const start = useRef(null)

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const p = progress ? progress.current : 0

    // 입장 연출 계수 (1=시작 시점의 먼 위치, 0=제자리)
    let f = 1
    if (play) {
      if (start.current === null) start.current = t
      const e = Math.min(1, (t - start.current) / entranceDuration)
      f = 1 - easeOutCubic(e)
    } else {
      start.current = null
    }

    const zoom = THREE.MathUtils.lerp(zoomFrom, zoomTo, p) + f * entranceZoom
    const orbit = THREE.MathUtils.lerp(orbitFrom, orbitTo, p) + f * entranceOrbit

    const px = pointer.current.x * strength
    const py = pointer.current.y * strength * 0.7

    // 스크롤 기반 공전 위치 (원점 기준)
    const baseX = Math.sin(orbit) * zoom
    const baseZ = Math.cos(orbit) * zoom
    const baseY = p * yLift

    // 카메라만 마우스 따라 이동, 시점은 원점 고정 → 공전식 패럴럭스
    const tx = baseX + px
    const ty = baseY + py
    const tz = baseZ

    const cam = state.camera
    // 낮은 lambda → 더 천천히 부드럽게 따라감
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 1.8, delta)
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 1.8, delta)
    cam.position.z = THREE.MathUtils.damp(cam.position.z, tz, 1.8, delta)
    cam.lookAt(0, 0, 0) // 시점 고정
  })
  return null
}
