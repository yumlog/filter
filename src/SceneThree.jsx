import { Suspense } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import TrecoilGLB from './TrecoilGLB'
import LightShafts from './LightShafts'
import DustField from './DustField'
import DebrisField from './DebrisField'
import CameraRig from './CameraRig'
import Effects from './Effects'

// 섹션 3 (맨 아래 레이어): trecoil.glb 히어로 오브젝트 + 돌 파편/먼지.
export default function SceneThree({ pointer, progress, filter = true }) {
  return (
    <>
      <color attach="background" args={['#1a4e8f']} />
      <fog attach="fog" args={['#1a4e8f', 9, 30]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} color="#dcefff" />
      <directionalLight position={[-5, -2, -4]} intensity={0.4} color="#3a7bd5" />

      {/* 모델 표면 반사용 환경맵 (섹션 1 과 동일하게 Lightformer 로 구성) */}
      <Environment resolution={256}>
        <Lightformer intensity={4} color="#cfeaff" position={[0, 3, 4]} scale={[6, 6, 1]} />
        <Lightformer intensity={3} color="#ffffff" position={[4, 1, -2]} scale={[3, 3, 1]} />
        <Lightformer intensity={2} color="#1a3a7a" position={[0, -4, 2]} scale={[8, 4, 1]} />
      </Environment>

      {/* 섹션이 드러날수록(progress 0→1) 카메라가 멀리서 제자리로 들어옴 */}
      <CameraRig
        pointer={pointer}
        progress={progress}
        strength={0.3}
        zoomFrom={5}
        zoomTo={8}
        orbitFrom={0.5}
        orbitTo={0}
        yLift={0.3}
      />

      {/* 위에서 내려오는 god ray 빛줄기 (섹션1 과 동일) */}
      <LightShafts />

      <DebrisField count={48} />
      <DustField count={220} />

      <Suspense fallback={null}>
        <TrecoilGLB pointer={pointer} scale={3.4} />
      </Suspense>

      {filter && <Effects bloom={0.6} />}
    </>
  )
}
