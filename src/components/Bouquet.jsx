import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { Text, useCursor, useGLTF } from '@react-three/drei'
import Heart from './Heart.jsx'
import { MODEL_URL, SCRIPT_FONT, message } from '../message.js'

const SCALE = 4.8 // the model is built in metres; this makes the bouquet ~2.8 units tall
const BASE_Y = -1.53 // where the stem ends sit, leaving room for the title above
const OPEN_SECONDS = 1.8
const CARD_RISE = 0.085 // metres the card slides out of the envelope

// where the letter floats, for wide and tall (phone) screens
const LETTER_POSE = {
  wide: { position: [0.8, -1.0, 1.2], rotation: [-0.12, -0.3, 0.05] },
  tall: { position: [0.05, -1.8, 1.6], rotation: [-0.2, -0.08, 0.03] },
}

const ease = (from, to, x) => {
  const t = THREE.MathUtils.clamp((x - from) / (to - from), 0, 1)
  return t * t * (3 - 2 * t)
}

useGLTF.preload(MODEL_URL)

export default function Bouquet({ portrait, envelopeOpen, onEnvelopeClick, onEnvelopeOpened, onTulipClick }) {
  const { nodes } = useGLTF(MODEL_URL)
  const { BouquetRoot: bouquet, Letter: letter, EnvelopeBody: body, EnvelopeFlap: flap, LetterCard: card } = nodes
  const clock = useThree((s) => s.clock)

  const bouquetRef = useRef()
  const letterRef = useRef()
  const labelRef = useRef()
  const progress = useRef(0)
  const announced = useRef(false)
  const [hoveredTulip, setHoveredTulip] = useState(null)
  const [letterHovered, setLetterHovered] = useState(false)
  useCursor(Boolean(hoveredTulip) || letterHovered)

  const tulips = useMemo(
    () =>
      bouquet.children
        .filter((o) => /^Tulip_\d+$/.test(o.name))
        .map((obj) => ({ obj, rest: obj.quaternion.clone(), axis: new THREE.Vector3(1, 0, 0), tappedAt: -Infinity, grow: 0 })),
    [bouquet],
  )
  const rest = useMemo(() => ({ flapZ: flap.position.z, cardY: card.position.y }), [flap, card])
  const wobble = useMemo(() => new THREE.Quaternion(), [])

  // The GLB keeps Blender's preview pose for the letter; the page decides where it goes instead.
  useLayoutEffect(() => {
    letter.position.set(0, 0, 0)
    letter.rotation.set(0, 0, 0)
  }, [letter])

  const tulipOf = (object) => {
    while (object && object.parent !== bouquet) object = object.parent
    return tulips.find((t) => t.obj === object)
  }

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime

    bouquetRef.current.rotation.y = Math.sin(t * 0.3) * 0.35
    bouquetRef.current.position.y = Math.sin(t * 0.7) * 0.03

    // tulips grow a little under the pointer and wobble when tapped
    for (const tulip of tulips) {
      tulip.grow = THREE.MathUtils.damp(tulip.grow, hoveredTulip === tulip ? 1 : 0, 8, dt)
      const age = t - tulip.tappedAt
      const angle = age < 4 ? Math.sin(age * 13) * Math.exp(-age * 2) * 0.3 : 0
      tulip.obj.quaternion.copy(tulip.rest).multiply(wobble.setFromAxisAngle(tulip.axis, angle))
      tulip.obj.scale.setScalar(1 + tulip.grow * 0.12)
    }

    // envelope: the flap swings open, then the card slides up (and back when closing)
    progress.current = THREE.MathUtils.clamp(progress.current + ((envelopeOpen ? 1 : -1) * dt) / OPEN_SECONDS, 0, 1)
    const p = progress.current
    const flapT = ease(0, 0.5, p)
    flap.rotation.x = -flapT * Math.PI * 1.04 // a little past upright, so it leans back
    flap.position.z = flapT > 0.5 ? -rest.flapZ : rest.flapZ // once past horizontal, tuck it behind the card
    card.position.y = rest.cardY + ease(0.45, 1, p) * CARD_RISE
    if (labelRef.current) labelRef.current.visible = p < 0.02
    if (p === 1 && !announced.current) {
      announced.current = true
      onEnvelopeOpened?.()
    }
    if (p < 1) announced.current = false

    const pose = portrait ? LETTER_POSE.tall : LETTER_POSE.wide
    const g = letterRef.current
    g.position.set(pose.position[0], pose.position[1] + Math.sin(t * 1.3) * 0.04, pose.position[2])
    g.rotation.set(pose.rotation[0], pose.rotation[1] + Math.sin(t * 0.6) * 0.05, pose.rotation[2])
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, letterHovered && !envelopeOpen ? 1.08 : 1, 8, dt))
  })

  return (
    <>
      <group ref={bouquetRef}>
        <group position={[0, BASE_Y, 0]} scale={SCALE}>
          <primitive
            object={bouquet}
            onPointerMove={(e) => {
              e.stopPropagation()
              setHoveredTulip(tulipOf(e.object) ?? null)
            }}
            onPointerOut={() => setHoveredTulip(null)}
            onClick={(e) => {
              e.stopPropagation()
              const tulip = tulipOf(e.object)
              if (!tulip || e.delta > 6) return
              tulip.tappedAt = clock.elapsedTime
              tulip.axis.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
              onTulipClick?.(e.point.clone())
            }}
          />
        </group>
      </group>

      <group
        ref={letterRef}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta <= 6) onEnvelopeClick?.()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setLetterHovered(true)
        }}
        onPointerOut={() => setLetterHovered(false)}
      >
        <group scale={SCALE}>
          <primitive object={letter} />
        </group>
      </group>

      {/* writing on the card inside the envelope (card faces +Z, units are metres) */}
      {createPortal(
        <group position={[0, 0.012, 0.0009]}>
          <Text font={SCRIPT_FONT} fontSize={0.019} maxWidth={0.13} lineHeight={1} textAlign="center" anchorX="center" anchorY="middle" color="#c2185b">
            {message.card}
          </Text>
          <Heart position={[0, -0.028, 0]} scale={0.009} />
        </group>,
        card,
      )}
      {createPortal(
        <Text ref={labelRef} font={SCRIPT_FONT} fontSize={0.024} position={[0, -0.033, 0.0042]} anchorX="center" anchorY="middle" color="#9c1048">
          {message.envelope}
        </Text>,
        body,
      )}
    </>
  )
}
