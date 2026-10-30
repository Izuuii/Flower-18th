import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles } from '@react-three/drei'
import Bouquet from './Bouquet.jsx'
import FallingPetals from './FallingPetals.jsx'
import HeartBurst from './HeartBurst.jsx'
import Polaroids from './Polaroids.jsx'
import { cameraDistance } from './layout.js'

export default function Experience({ envelopeOpen, onEnvelopeClick, onEnvelopeOpened, onPhotoClick, onReady }) {
  const hearts = useRef()
  const portrait = useThree((s) => s.size.width / s.size.height < 0.9)

  // runs once everything inside <Suspense> (model, photos, fonts) has loaded
  useEffect(() => {
    onReady?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ResponsiveCamera />

      <ambientLight intensity={0.7} color="#fff0f5" />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff6f2" />
      <directionalLight position={[0, 1, 6]} intensity={0.9} color="#fff4f7" />
      <directionalLight position={[-4, 2, -3]} intensity={1.3} color="#ff9fc4" />
      {/* soft studio reflections, generated locally so the page works offline */}
      <Environment resolution={256} frames={1} environmentIntensity={1.2}>
        <Lightformer form="rect" intensity={2.5} color="#ffffff" position={[0, 5, 2]} scale={[8, 3, 1]} />
        <Lightformer form="circle" intensity={1.6} color="#ffd6e6" position={[-5, 1, 3]} scale={4} />
        <Lightformer form="rect" intensity={1.2} color="#ffb3cf" position={[5, 0, -2]} scale={[4, 4, 1]} />
      </Environment>

      <Bouquet
        portrait={portrait}
        envelopeOpen={envelopeOpen}
        onEnvelopeClick={onEnvelopeClick}
        onEnvelopeOpened={onEnvelopeOpened}
        onTulipClick={(point) => hearts.current?.burst(point)}
      />
      <Polaroids onSelect={onPhotoClick} />
      <FallingPetals />
      <HeartBurst ref={hearts} />
      <Sparkles count={60} scale={[7, 5, 4]} size={3} speed={0.35} opacity={0.8} color="#ff8fb8" />
      <ContactShadows position={[0, -1.75, 0]} opacity={0.35} scale={6} blur={2.6} far={3} color="#c2185b" />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={4}
        maxDistance={12}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.62}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
      />
    </>
  )
}

// Pulls the camera back on narrow screens so the whole bouquet fits.
function ResponsiveCamera() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  const distance = useThree((s) => cameraDistance(s.size.width / s.size.height))

  useEffect(() => {
    camera.position.setLength(distance)
    camera.updateProjectionMatrix()
    controls?.update()
  }, [camera, controls, distance])

  return null
}
