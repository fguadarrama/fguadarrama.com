import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Dashboard from './pages/Dashboard'
import ParameterDetail from './pages/ParameterDetail'
import Browse from './pages/Browse'
import ReportBuilder from './pages/ReportBuilder'
import { data } from './lib/data'

function Header() {
  return (
    <header className="site-header hidden-print">
      <div className="container">
        <div className="site-header__inner">
          <div className="brand">
            <span className="brand__mark">Laboratorios</span>
            <span className="brand__sub">Francisco · {data.counts.results} resultados</span>
          </div>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Dashboard
            </NavLink>
            <NavLink to="/browse" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Explorar
            </NavLink>
            <NavLink to="/report" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              Reporte
            </NavLink>
          </nav>
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
      <main className="container" style={{ paddingBlock: '32px 64px', flex: 1 }}>
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
              <Route path="/browse" element={<Browse />} />
              <Route path="/parameter/:cid" element={<ParameterDetail />} />
              <Route path="/report" element={<ReportBuilder />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="container hidden-print" style={{ padding: '24px 0 40px', color: 'var(--ink-50)', fontSize: 13 }}>
        <div className="row row--spread">
          <span>Datos actualizados: {new Date(data.generatedAt).toLocaleDateString('es-MX')}</span>
          <span style={{ fontStyle: 'italic' }}>Solo referencia personal — no sustituye valoración médica.</span>
        </div>
      </footer>
    </div>
  )
}
