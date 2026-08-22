import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Dashboard from './pages/Dashboard'
import Browse from './pages/Browse'
import ReportBuilder from './pages/ReportBuilder'
import JsonBuilder from './pages/JsonBuilder'
import Timeline from './pages/Timeline'
import Weight from './pages/Weight'
import { data, shortDate3Letter } from './lib/data'
import { PATIENT, patientAge, patientDobShort } from './lib/patient'

function Header() {
  const age = patientAge()
  return (
    <header className="site-header hidden-print">
      <div className="container">
        <div className="site-header__inner">
          <div className="brand">
            <span className="brand__mark">Historial médico</span>
            <span className="brand__pipe">|</span>
            <span className="brand__initials">FGC</span>
          </div>
          <nav className="nav">
            <NavLink to="/" end data-cuelume-toggle="page" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Laboratorios
            </NavLink>
            <NavLink to="/timeline" data-cuelume-toggle="page" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Cronología
            </NavLink>
            <NavLink to="/browse" data-cuelume-toggle="page" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Explorar
            </NavLink>
            <NavLink to="/weight" data-cuelume-toggle="page" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Peso
            </NavLink>
            <NavLink to="/report" data-cuelume-toggle="page" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Reportes
            </NavLink>
            <NavLink to="/crear" data-cuelume-toggle="page" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Datos
            </NavLink>
          </nav>
        </div>
        <div className="patient-strip">
          <span className="patient-strip__name">{PATIENT.fullName}</span>
          <span className="patient-strip__sep">·</span>
          <span className="patient-strip__meta">{patientDobShort()}</span>
          <span className="patient-strip__sep">·</span>
          {age !== null && <span className="patient-strip__meta">{age} años</span>}
          <span className="patient-strip__sep">·</span>
          <span className="patient-strip__meta">CURP: {PATIENT.curp}</span>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <div className="shell">
      <Header />
      <main className="container" style={{ paddingBlock: '24px 64px', flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/weight" element={<Weight />} />
              <Route path="/report" element={<ReportBuilder />} />
              <Route path="/crear" element={<JsonBuilder />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="container hidden-print" style={{ padding: '24px 0 40px', color: 'var(--ink-50)', fontSize: 13 }}>
        <div className="row row--spread">
          <span>Datos actualizados: {shortDate3Letter(data.generatedAt)}</span>
        </div>
      </footer>
    </div>
  )
}
