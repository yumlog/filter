import { Uniform } from 'three'
import { Effect, EffectAttribute } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

// 화면 중앙은 선명, 가장자리로 갈수록 강해지는 블러 (DOF 대용)
const fragmentShader = /* glsl */ `
  uniform float blur;    // 가장자리에서의 최대 블러 반경(px)
  uniform float radius;  // 이 거리부터 블러 시작 (0~1, 중심=0)

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float d = distance(uv, vec2(0.5));
    float amt = smoothstep(radius, 0.95, d) * blur; // 가장자리로 갈수록 ↑
    if (amt < 0.01) {
      outputColor = inputColor;
      return;
    }
    vec2 step = (amt / 3.0) / resolution; // 커널 한 칸의 uv 크기
    vec4 sum = vec4(0.0);
    float total = 0.0;
    for (int i = -3; i <= 3; i++) {
      for (int j = -3; j <= 3; j++) {
        float w = 1.0 - (abs(float(i)) + abs(float(j))) / 8.0; // 중심 가중
        sum += texture2D(inputBuffer, uv + vec2(float(i), float(j)) * step) * w;
        total += w;
      }
    }
    outputColor = sum / total;
  }
`

class RadialBlurEffect extends Effect {
  constructor({ blur = 5.0, radius = 0.45 } = {}) {
    super('RadialBlurEffect', fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION, // 이웃 픽셀 샘플링(블러)
      uniforms: new Map([
        ['blur', new Uniform(blur)],
        ['radius', new Uniform(radius)],
      ]),
    })
  }
}

export default wrapEffect(RadialBlurEffect)
