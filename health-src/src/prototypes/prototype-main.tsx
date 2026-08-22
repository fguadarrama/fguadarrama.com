import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/albert-sans'
import HealthOverviewPrototype from './HealthOverviewPrototype'
import './health-overview.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HealthOverviewPrototype />
  </React.StrictMode>,
)
