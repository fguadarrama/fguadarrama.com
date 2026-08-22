import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/albert-sans'
import ParameterDetailPrototype from './parameter-detail/ParameterDetailPrototype'
import './parameter-detail/parameter-detail.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ParameterDetailPrototype />
  </React.StrictMode>,
)
