import { useEffect, useRef } from 'react'
import { photos } from '../message.js'

// Full-size view of a polaroid, with arrows, keyboard and swipe to flip through.
export default function Lightbox({ index, onChange }) {
  const open = index !== null
  const touchX = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onChange(null)
      if (e.key === 'ArrowLeft') onChange((index - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') onChange((index + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, onChange])

  if (!open) return null

  const go = (step) => (e) => {
    e.stopPropagation()
    onChange((index + step + photos.length) % photos.length)
  }

  return (
    <div
      className="lightbox"
      onClick={() => onChange(null)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0)
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)(e)
      }}
    >
      <figure className="lightbox-frame" key={index} onClick={(e) => e.stopPropagation()}>
        <img src={photos[index]} alt={`Photo ${index + 1} of ${photos.length}`} />
        <figcaption>
          {index + 1} / {photos.length}
        </figcaption>
      </figure>
      <button className="lightbox-nav prev" onClick={go(-1)} aria-label="Previous photo">
        ‹
      </button>
      <button className="lightbox-nav next" onClick={go(1)} aria-label="Next photo">
        ›
      </button>
      <button className="lightbox-close" onClick={() => onChange(null)} aria-label="Close photo">
        ×
      </button>
    </div>
  )
}
