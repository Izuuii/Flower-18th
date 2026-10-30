import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const COLORS = ['#f48fb1', '#f06292', '#f8bbd0', '#ec407a', '#ffd1df']
const rand = (a, b) => a + Math.random() * (b - a)

// Pink petals drifting down through the scene.
export default function FallingPetals({ count = 45 }) {
  const mesh = useRef()

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.5)
    shape.bezierCurveTo(0.42, -0.3, 0.38, 0.32, 0, 0.5)
    shape.bezierCurveTo(-0.38, 0.32, -0.42, -0.3, 0, -0.5)
    const g = new THREE.ShapeGeometry(shape, 10)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getX(i) ** 2 * 0.7) // cup the petal
    g.computeVertexNormals()
    g.scale(0.11, 0.14, 0.11)
    return g
  }, [])

  const petals = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: rand(-5, 5),
        y: rand(-3.5, 4),
        z: rand(-3, 2.5),
        fall: rand(0.18, 0.4),
        sway: rand(0.4, 0.9),
        phase: rand(0, Math.PI * 2),
        spin: [rand(-1.2, 1.2), rand(-1.2, 1.2), rand(-1.2, 1.2)],
        size: rand(0.7, 1.3),
      })),
    [count],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    const color = new THREE.Color()
    petals.forEach((_, i) => mesh.current.setColorAt(i, color.set(COLORS[i % COLORS.length])))
    mesh.current.instanceColor.needsUpdate = true
  }, [petals])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.1) // don't jump after the tab was hidden
    petals.forEach((p, i) => {
      p.y -= p.fall * dt
      if (p.y < -3.5) {
        p.y = 4
        p.x = rand(-5, 5)
      }
      dummy.position.set(p.x + Math.sin(t * p.sway + p.phase) * 0.35, p.y, p.z)
      dummy.rotation.set(t * p.spin[0] + p.phase, t * p.spin[1], t * p.spin[2])
      dummy.scale.setScalar(p.size)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.55} />
    </instancedMesh>
  )
}
