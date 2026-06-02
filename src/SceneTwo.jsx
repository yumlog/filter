import ParticleObject from './ParticleObject'
import DustField from './DustField'
import DebrisField from './DebrisField'
import CameraRig from './CameraRig'
import Effects from './Effects'

// 섹션 2 (아래 레이어): 파티클 클라우드
export default function SceneTwo({ pointer, progress, filter = true }) {
  return (
    <>
      <color attach="background" args={['#0e2c54']} />
      <fog attach="fog" args={['#0e2c54', 8, 30]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[-5, 8, 5]} intensity={0.8} color="#dcefff" />

      {/* 전환되며 제자리로 들어오는 카메라 (회전 → 정면, 확대 → 기본) */}
      <CameraRig
        pointer={pointer}
        progress={progress}
        strength={0.3}
        zoomFrom={8}
        zoomTo={5}
        orbitFrom={0}
        orbitTo={0.5}
        yLift={0.3}
      />
      <ParticleObject pointer={pointer} />
      {/* 떠다니는 어두운 파편 → 배경 깊이/디테일 */}
      <DebrisField count={55} />
      <DustField count={200} />

      {/* 섹션2는 파티클이 밝아서 bloom 낮춤 (하얗게 blowout 방지) */}
      {filter && <Effects bloom={0.3} />}
    </>
  )
}
