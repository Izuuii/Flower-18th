import { useProgress } from '@react-three/drei'

export default function Loader({ ready }) {
  const { progress } = useProgress()
  return (
    <div className={`loader${ready ? ' is-done' : ''}`} aria-hidden={ready}>
      <div className="loader-heart">♥</div>
      <p>{Math.round(progress)}%</p>
    </div>
  )
}
