import { useEffect } from 'react'
import { message } from '../message.js'

// The readable letter that appears once the envelope has opened.
export default function LetterOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const { greeting, paragraphs, closing, photo } = message.letter

  return (
    <div className={`letter-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden={!open}>
      <article className="letter" role="dialog" aria-modal="true" aria-label="Love letter" onClick={(e) => e.stopPropagation()}>
        <button className="letter-close" onClick={onClose} aria-label="Close the letter">
          ×
        </button>
        <p className="letter-greeting">{greeting}</p>
        {paragraphs.map((text, i) => (
          <p className="letter-line" key={i} style={{ animationDelay: `${0.9 + i * 0.6}s` }}>
            {text}
          </p>
        ))}
        <p className="letter-closing" style={{ animationDelay: `${1.4 + paragraphs.length * 0.6}s` }}>
          {closing}
        </p>
        {photo && (
          <figure className="letter-photo">
            <img src={photo} alt="" />
          </figure>
        )}
      </article>
    </div>
  )
}
