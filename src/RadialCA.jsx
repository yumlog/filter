import { Uniform } from 'three'
import { Effect } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

// 가벼운 radial 색수차: 중앙은 0, 가장자리로 갈수록 RGB 분리 ↑
// 픽셀당 추가 샘플 2개(R, B)만 사용 + CONVOLUTION 아님 → 다른 효과와 병합되어 거의 공짜.
// '중심 대비 차이(delta)'만 누적색에 더해 채널 소스 불일치(초록끼) 방지.
const fragmentShader = /* glsl */ `
  uniform float strength;  // 가장자리에서의 분리 세기
  uniform float falloff;   // 가장자리 집중도 (클수록 중앙은 깨끗)

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 dir = uv - vec2(0.5);
    float amt = pow(length(dir) * 1.4142, falloff) * strength; // 0(중앙)~1(코너)
    vec2 o = dir * amt;
    vec4 c = texture2D(inputBuffer, uv);
    float dr = texture2D(inputBuffer, uv + o).r - c.r;
    float db = texture2D(inputBuffer, uv - o).b - c.b;
    outputColor = vec4(inputColor.r + dr, inputColor.g, inputColor.b + db, inputColor.a);
  }
`

class RadialCAEffect extends Effect {
  constructor({ strength = 0.02, falloff = 2.0 } = {}) {
    super('RadialCAEffect', fragmentShader, {
      uniforms: new Map([
        ['strength', new Uniform(strength)],
        ['falloff', new Uniform(falloff)],
      ]),
    })
  }
}

export default wrapEffect(RadialCAEffect)
