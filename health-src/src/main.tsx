import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { GoeyToaster } from 'goey-toast'
import 'goey-toast/styles.css'
import '@fontsource-variable/albert-sans'
import './styles/tokens.css'
import App from './App'
import { loadDynamicData } from './lib/dynamicData'
import { bind as bindSounds } from './lib/sounds'

bindSounds()

// Kick off dynamic JSON loading in the background.
// The UI renders immediately from build-time data; if dynamic files exist
// in mylabs/data/, the dashboard re-renders once they're merged.
loadDynamicData().then(({ added, files }) => {
  if (added > 0) {
    console.log(`[dynamicData] loaded ${added} results from ${files.join(', ')}`)
  }
}).catch(() => {})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <GoeyToaster
        position="bottom-right"
        gap={14}
        offset="24px"
        theme="light"
        toastOptions={{}}
      />
    </HashRouter>
  </React.StrictMode>,
)
