import * as THREE from 'three'

// Unit-sized heart (about 1 x 1), point at the bottom.
export function heartShape() {
  const s = new THREE.Shape()
  s.moveTo(0, -0.5)
  s.bezierCurveTo(-0.12, -0.38, -0.5, -0.12, -0.5, 0.14)
  s.bezierCurveTo(-0.5, 0.4, -0.22, 0.55, 0, 0.3)
  s.bezierCurveTo(0.22, 0.55, 0.5, 0.4, 0.5, 0.14)
  s.bezierCurveTo(0.5, -0.12, 0.12, -0.38, 0, -0.5)
  return s
}

const flatHeart = new THREE.ShapeGeometry(heartShape(), 16)

// A flat little heart, handy for decorating cards and polaroids.
export default function Heart({ color = '#e91e63', ...props }) {
  return (
    <mesh geometry={flatHeart} {...props}>
      <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}
