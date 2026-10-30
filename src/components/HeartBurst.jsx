import { useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { heartShape } from './Heart.jsx'

const MAX = 90

// Little 3D hearts that pop out of a tapped tulip. Call ref.current.burst(point).
export default function HeartBurst({ ref }) {
  const mesh = useRef()
  const next = useRef(0)

  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 3,
      curveSegments: 16,
    })
    g.center()
    return g
  }, [])
  const particles = useMemo(
    () => Array.from({ length: MAX }, () => ({ life: 0, size: 0, spin: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3() })),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useImperativeHandle(ref, () => ({
    burst(point, count = 12) {
      for (let i = 0; i < count; i++) {
        const p = particles[next.current++ % MAX]
        p.pos.copy(point)
        p.vel.set((Math.random() - 0.5) * 1.8, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 1.8)
        p.life = 1
        p.size = 0.08 + Math.random() * 0.08
        p.spin = (Math.random() - 0.5) * 5
      }
    },
  }), [particles])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.life = Math.max(0, p.life - dt * 0.6)
        p.vel.multiplyScalar(1 - dt * 1.8)
        p.vel.y += dt * 0.6 // hearts float upwards
        p.pos.addScaledVector(p.vel, dt)
      }
      const s = p.life > 0 ? p.size * Math.min(1, (1 - p.life) * 8) * Math.sqrt(p.life) : 0
      dummy.position.copy(p.pos)
      dummy.rotation.set(0, p.spin * (1 - p.life), Math.sin((1 - p.life) * 6) * 0.25)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, MAX]} frustumCulled={false}>
      <meshStandardMaterial color="#ff4d8d" emissive="#ff2d75" emissiveIntensity={0.35} roughness={0.35} />
    </instancedMesh>
  )
}
