import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import RadialBlur from './RadialBlur'
import RadialCA from './RadialCA'

// 시네마틱 후처리 스택.
// ※ DepthOfField 는 이 환경에서 EffectComposer 전체를 무력화시켜 제외함.
//   → 주변부 흐림은 커스텀 RadialBlur 로 대체.
export default function Effects({ bloom = 0.7 }) {
  return (
    <EffectComposer disableNormalPass>
      {/* 성능 테스트로 임시 비활성화 */}
      <Bloom mipmapBlur intensity={bloom * 2} luminanceThreshold={0.1} luminanceSmoothing={0.5} />

      {/* 가장자리로 갈수록 강해지는 블러 (DOF 대용) — 성능 테스트로 임시 비활성화 */}
      {/* <RadialBlur blur={100} radius={0.4} /> */}

      {/* 가벼운 radial 색수차 (가장자리로 갈수록 번짐) */}
      <RadialCA strength={0.01} falloff={2.0} />

      <HueSaturation hue={0.0} saturation={0.1} />
      <BrightnessContrast brightness={-0.03} contrast={0.14} />

      <Vignette offset={0.28} darkness={0.78} eskil={false} />

      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.15} />
    </EffectComposer>
  )
}
