import React from 'react'
import ReactDOM from 'react-dom/client'
import { GooeyToaster } from 'goey-toast'
import 'goey-toast/styles.css'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <GooeyToaster
      position="bottom-right"
      preset="bouncy"
      closeButton="top-right"
      showProgress
      showTimestamp={false}
      swipeToDismiss
      offset="24px"
    />
  </React.StrictMode>,
)
