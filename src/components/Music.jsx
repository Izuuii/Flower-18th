import { useEffect, useRef, useState } from 'react'
import { MUSIC_URL } from '../message.js'

const VOLUME = 0.6

// Smoothly change the volume (iOS ignores volume, so there it just plays/pauses).
function fadeTo(el, target, done) {
  cancelAnimationFrame(el.fadeFrame)
  const from = el.volume
  const start = performance.now()
  const step = (now) => {
    const k = Math.min(1, (now - start) / 1200)
    el.volume = from + (target - from) * k
    if (k < 1) el.fadeFrame = requestAnimationFrame(step)
    else done?.()
  }
  el.fadeFrame = requestAnimationFrame(step)
}

// Background song with a mute button. Browsers only allow sound after the first
// tap or key press, so the song fades in on the first interaction with the page.
export default function Music() {
  const audio = useRef(null)
  const [on, setOn] = useState(true) // what the listener wants
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = new Audio(MUSIC_URL)
    el.loop = true
    el.volume = 0
    el.preload = 'auto'
    audio.current = el
    return () => {
      cancelAnimationFrame(el.fadeFrame)
      el.pause()
    }
  }, [])

  const play = () => {
    const el = audio.current
    el.play()
      .then(() => {
        setPlaying(true)
        fadeTo(el, VOLUME)
      })
      .catch(() => {}) // still blocked; the next tap will try again
  }

  const stop = () => {
    const el = audio.current
    setPlaying(false)
    fadeTo(el, 0, () => el.pause())
  }

  // first tap anywhere starts the song (the button handles its own taps)
  useEffect(() => {
    if (!on || playing) return
    const start = (e) => {
      if (e.target.closest?.('.music-toggle')) return
      play()
    }
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [on, playing])

  // pause while the tab is hidden, pick up again when it's back
  useEffect(() => {
    const onVisibility = () => {
      const el = audio.current
      if (document.hidden) el.pause()
      else if (on && playing) el.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [on, playing])

  const toggle = () => {
    if (on && playing) {
      setOn(false)
      stop()
    } else {
      setOn(true)
      play()
    }
  }

  const sounding = on && playing
  return (
    <button
      className={`music-toggle${sounding ? ' is-playing' : ''}`}
      onClick={toggle}
      aria-label={sounding ? 'Mute music' : 'Play music'}
      title={sounding ? 'Mute music' : 'Play music'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
        {sounding ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
            <path d="M17.8 6.8a7.5 7.5 0 0 1 0 10.4" />
          </g>
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
          </g>
        )}
      </svg>
    </button>
  )
}
