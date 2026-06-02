여기에 돌멩이 3D 모델 파일을 넣으세요.

권장 파일명: crystal.glb
경로: public/models/crystal.glb
→ 코드에서는 "/models/crystal.glb" 로 접근됩니다.

[적용 방법]
src/SceneOne.jsx 에서
  import CrystalRock from './CrystalRock'   (지금: 도형 placeholder)
를
  import CrystalGLB from './CrystalGLB'     (GLB 로더)
로 바꾸고,

  <CrystalRock pointer={pointer} />
를
  <CrystalGLB pointer={pointer} url="/models/crystal.glb" />
로 교체하면 끝입니다.

[팁]
- .glb (바이너리 glTF) 형식 권장. .gltf + 텍스처 묶음도 가능.
- 모델이 너무 크거나 작으면 CrystalGLB 의 scale 값으로 조절.
- 무료 모델: https://poly.pizza , https://sketchfab.com (CC 라이선스 확인)
- 용량 줄이려면 https://gltf.report 또는 gltf-transform 으로 draco 압축.
