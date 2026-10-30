// Shared camera numbers so the scene can lay itself out for phones and desktops alike.

export const FOV = 40
export const TITLE_ZONE = 0.17 // top share of the screen kept clear for the title

// How far back the camera sits for a given screen shape (width / height).
export function cameraDistance(aspect) {
  if (aspect < 0.6) return 9.2
  if (aspect < 0.9) return 8.2
  if (aspect < 1.3) return 7.4
  return 6.8
}

// Visible width/height of the plane at depth `z` when the camera is `distance` away.
export function visibleSize(aspect, distance, z) {
  const height = 2 * Math.tan((FOV * Math.PI) / 360) * (distance - z)
  return { width: height * aspect, height }
}
