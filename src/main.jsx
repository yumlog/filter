import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// 주의: StrictMode 는 개발 모드에서 컴포넌트를 이중 마운트해
// @react-three/postprocessing 의 EffectComposer 효과가 dispose 되어
// 새로고침 시 후처리(색수차 등)가 사라지는 문제가 있어 제거함.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
