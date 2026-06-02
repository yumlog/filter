import { Suspense } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import RippleSurface from './RippleSurface'
import CrystalOBJ from './CrystalOBJ'
import LightShafts from './LightShafts'
import DustField from './DustField'
import DebrisField from './DebrisField'
import CameraRig from './CameraRig'
import Effects from './Effects'

// 섹션 1 (위 레이어): 물결 수면 + 크리스탈 돌
export default function SceneOne({ pointer, progress, play, filter = true }) {
  return (
    <>
      <color attach="background" args={['#0e2c54']} />
      <fog attach="fog" args={['#0e2c54', 9, 30]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#dcefff" />

      {/* HDRI 대신 Lightformer 로 환경맵 구성 → 크리스탈 표면에 사실적 반사 */}
      <Environment resolution={256}>
        <Lightformer intensity={5} color="#cfeaff" position={[0, 3, 4]} scale={[6, 6, 1]} />
        <Lightformer intensity={2.5} color="#3a7bd5" position={[-4, -1, 3]} scale={[5, 5, 1]} />
        <Lightformer intensity={4} color="#ffffff" position={[4, 1, -2]} scale={[3, 3, 1]} />
        <Lightformer intensity={2} color="#1a3a7a" position={[0, -4, 2]} scale={[8, 4, 1]} />
        {/* 작고 강한 점광 → 투명 표면에 또렷한 반짝임(glint) */}
        <Lightformer intensity={14} color="#ffffff" position={[2, 3, 3]} scale={[0.4, 0.4, 1]} />
        <Lightformer intensity={11} color="#dff1ff" position={[-3, 2, 2]} scale={[0.35, 0.35, 1]} />
        <Lightformer intensity={12} color="#ffffff" position={[3, -2, 3]} scale={[0.35, 0.35, 1]} />
        <Lightformer intensity={10} color="#bfe6ff" position={[-2, -2, 3]} scale={[0.3, 0.3, 1]} />
      </Environment>

      {/* 입장: 먼 곳 + 회전 상태에서 시작해 서서히 다가오며 제자리로.
          이후 스크롤하면 회전 + 확대로 전환에 이어짐 */}
      <CameraRig
        pointer={pointer}
        progress={progress}
        play={play}
        strength={0.4}
        entranceZoom={5}
        entranceOrbit={0.6}
        zoomFrom={8}
        zoomTo={5}
        orbitFrom={0}
        orbitTo={0.5}
        yLift={0.4}
      />
      <RippleSurface />
      <LightShafts />
      {/* 떠다니는 어두운 파편 → 배경 깊이/디테일 */}
      <DebrisField count={48} />
      <DustField count={280} />
      {/* 실제 OBJ 모델 + 동일한 크리스탈 투과/반사 재질.
          로딩 중엔 아무것도 안 보이게 Suspense fallback={null} */}
      <Suspense fallback={null}>
        <CrystalOBJ pointer={pointer} url="/models/crystal.obj" scale={2.3} />
      </Suspense>

      {filter && <Effects bloom={0.85} dof />}
    </>
  )
}
