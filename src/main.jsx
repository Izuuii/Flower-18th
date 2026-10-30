import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/great-vibes'
import '@fontsource/dancing-script/500.css'
import '@fontsource/dancing-script/700.css'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
