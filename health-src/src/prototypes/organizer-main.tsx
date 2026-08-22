import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/albert-sans'
import ParameterOrganizerPrototype from './ParameterOrganizerPrototype'
import './parameter-organizer.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ParameterOrganizerPrototype />
  </React.StrictMode>,
)
