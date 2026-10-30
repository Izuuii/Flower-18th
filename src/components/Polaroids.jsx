import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, RoundedBox, useCursor, useTexture } from '@react-three/drei'
import Heart from './Heart.jsx'
import { TITLE_ZONE, cameraDistance, visibleSize } from './layout.js'
import { photos } from '../message.js'

const FRAME = [0.64, 0.78]
const PHOTO = [0.56, 0.58]
const DEPTH = -1.2 // behind the bouquet
const ANGLES = [50, 17, -17, -50].map((d) => (d * Math.PI) / 180) // top to bottom along each arc

// Crop like CSS `object-fit: cover`, keeping a little more of the top where faces usually are.
function coverCrop(texture, aspect) {
  const { width, height } = texture.image
  const imageAspect = width / height
  if (imageAspect > aspect) {
    texture.repeat.set(aspect / imageAspect, 1)
    texture.offset.set((1 - texture.repeat.x) / 2, 0)
  } else {
    texture.repeat.set(1, imageAspect / aspect)
    texture.offset.set(0, (1 - texture.repeat.y) * 0.6)
  }
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
}

// Polaroids in two arcs, "( bouquet )", sized to the screen. Tap one to see it big.
export default function Polaroids({ onSelect }) {
  const textures = useTexture(photos)
  const aspect = useThree((s) => s.size.width / s.size.height)

  useLayoutEffect(() => {
    textures.forEach((t) => coverCrop(t, PHOTO[0] / PHOTO[1]))
  }, [textures])

  const layout = useMemo(() => {
    const { width, height } = visibleSize(aspect, cameraDistance(aspect), DEPTH)
    const scale = width < 5 ? 0.75 : 1
    const top = height / 2 - height * TITLE_ZONE
    const bottom = -height / 2 + height * 0.04
    return {
      cy: (top + bottom) / 2,
      rx: Math.min(width / 2 - (FRAME[0] / 2) * scale - 0.1, 3.3),
      ry: ((top - bottom) / 2 - (FRAME[1] / 2) * scale) / Math.sin(ANGLES[0]),
      scale,
    }
  }, [aspect])

  const half = Math.ceil(textures.length / 2)
  return textures.map((texture, i) => (
    <Polaroid
      key={photos[i]}
      texture={texture}
      index={i}
      side={i < half ? -1 : 1}
      angle={ANGLES[(i % half) % ANGLES.length]}
      layout={layout}
      onSelect={onSelect}
    />
  ))
}

function Polaroid({ texture, index, side, angle, layout, onSelect }) {
  const ref = useRef()
  const lift = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const tilt = (index % 2 ? 1 : -1) * (0.04 + ((index * 37) % 10) / 100)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const a = angle + Math.sin(t * 0.25 + index * 1.3) * 0.04
    lift.current = THREE.MathUtils.damp(lift.current, hovered ? 1 : 0, 8, dt)
    ref.current.position.set(
      side * Math.cos(a) * layout.rx,
      layout.cy + Math.sin(a) * layout.ry + Math.sin(t * 0.9 + index) * 0.04,
      DEPTH + lift.current * 0.8,
    )
    ref.current.scale.setScalar(layout.scale * (1 + lift.current * 0.18))
  })

  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta <= 6) onSelect(index)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Billboard>
        <group rotation-z={tilt}>
          <RoundedBox args={[FRAME[0], FRAME[1], 0.02]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color="#fffdfa" roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, FRAME[1] / 2 - 0.04 - PHOTO[1] / 2, 0.011]}>
            <planeGeometry args={PHOTO} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
          {/* a strip of washi tape and a doodled heart */}
          <mesh position={[0.04, FRAME[1] / 2 + 0.005, 0.013]} rotation-z={-0.08 - tilt}>
            <planeGeometry args={[0.22, 0.075]} />
            <meshBasicMaterial color="#ff9fc1" transparent opacity={0.75} toneMapped={false} />
          </mesh>
          <Heart position={[0, -FRAME[1] / 2 + 0.08, 0.012]} scale={0.04} color="#f06292" />
        </group>
      </Billboard>
    </group>
  )
}
