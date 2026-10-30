// Every word and photo on the page lives here, so it's easy to change.

const asset = (path) => `${import.meta.env.BASE_URL}${path}`

export const message = {
  title: 'Happy 18th Monthsary',
  hint: 'tap the letter 💌 · tap a tulip · drag to look around',
  envelope: 'open me',
  card: 'Happy 18th Monthsary',
  letter: {
    greeting: 'Happy 18th Monthsary,',
    // one string per paragraph — add as many as you like
    paragraphs: ['and I hope you get to feel my love, Antine.'],
    closing: '♥',
    photo: asset('photos/photo-06.jpg'), // set to null to leave the photo off the letter
  },
}

export const photos = [
  'photos/photo-01.png',
  'photos/photo-02.png',
  'photos/photo-03.png',
  'photos/photo-04.jpg',
  'photos/photo-05.jpg',
  'photos/photo-06.jpg',
  'photos/photo-07.jpg',
  'photos/photo-08.png',
].map(asset)

export const MUSIC_URL = asset(`music/${encodeURIComponent('beabadoobee - Glue Song (Official Music Video) - (320 Kbps).mp3')}`)

export const MODEL_URL = asset('models/bouquet.glb')
export const SCRIPT_FONT = asset('fonts/GreatVibes.woff')
