import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { GoeyToaster } from 'goey-toast'
import 'goey-toast/styles.css'
import './styles/tokens.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <GoeyToaster
        position="bottom-right"
        gap={14}
        offset="24px"
        theme="light"
        toastOptions={{
          // Match the site palette
        }}
      />
    </HashRouter>
  </React.StrictMode>,
)
