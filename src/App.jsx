import { Suspense, useCallback, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import Experience from './components/Experience.jsx'
import LetterOverlay from './components/LetterOverlay.jsx'
import Lightbox from './components/Lightbox.jsx'
import Loader from './components/Loader.jsx'
import Music from './components/Music.jsx'
import { FOV } from './components/layout.js'
import { message } from './message.js'

export default function App() {
  const [ready, setReady] = useState(false)
  const [envelopeOpen, setEnvelopeOpen] = useState(false) // drives the 3D envelope animation
  const [letterVisible, setLetterVisible] = useState(false) // the readable letter on top
  const [photoIndex, setPhotoIndex] = useState(null)

  const openEnvelope = useCallback(() => setEnvelopeOpen(true), [])
  const showLetter = useCallback(() => setLetterVisible(true), [])
  const closeLetter = useCallback(() => {
    setLetterVisible(false)
    setEnvelopeOpen(false)
  }, [])

  return (
    <>
      <Canvas
        style={{ position: 'fixed', inset: 0 }}
        dpr={[1, 2]}
        camera={{ position: [0, 0.35, 7], fov: FOV, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping // keeps the pinks pink
          gl.toneMappingExposure = 1.05
        }}
      >
        <Suspense fallback={null}>
          <Experience
            envelopeOpen={envelopeOpen}
            onEnvelopeClick={openEnvelope}
            onEnvelopeOpened={showLetter}
            onPhotoClick={setPhotoIndex}
            onReady={() => setReady(true)}
          />
        </Suspense>
      </Canvas>

      <header className={`title${ready ? ' is-ready' : ''}`}>
        <h1>{message.title}</h1>
        <p className="hint">{message.hint}</p>
      </header>

      <LetterOverlay open={letterVisible} onClose={closeLetter} />
      <Lightbox index={photoIndex} onChange={setPhotoIndex} />
      <Music />
      <Loader ready={ready} />
    </>
  )
}
