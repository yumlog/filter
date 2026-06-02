import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // three 가 여러 번 번들되는 것 방지 ("Multiple instances of Three.js" 에러 해결)
    dedupe: ['three', '@react-three/fiber'],
  },
})
