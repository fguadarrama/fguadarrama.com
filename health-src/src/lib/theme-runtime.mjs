// Shared by the encrypted login and app. Only a display preference is stored.
export function startTheme() {
  window.__healthThemeDispose?.()
  const key = 'health-display-theme'
  const valid = value => ['auto', 'light', 'dark'].includes(value)
  let mode = window.__healthThemeMode || 'auto'
  try { const saved = localStorage.getItem(key); if (valid(saved)) mode = saved } catch {}
  function apply() {
    const hour = new Date().getHours()
    const theme = mode === 'auto' ? (hour < 7 || hour >= 19 ? 'dark' : 'light') : mode
    const root = document.documentElement
    const changed = root.dataset.theme !== theme
    root.dataset.theme = theme
    root.dataset.themeMode = mode
    root.style.colorScheme = theme
    window.__healthThemeMode = mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1C1E1E' : '#f6f7fc')
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon?.href.startsWith('data:image/svg+xml,')) {
      favicon.dataset.lightIcon ||= favicon.href
      const light = favicon.dataset.lightIcon
      const svg = decodeURIComponent(light.slice(light.indexOf(',') + 1))
      const dark = svg.replace(/<style>[\s\S]*?<\/style>/g, '')
        .replace(/#3A2EB4/gi, '#54bbee').replace(/#ff0059/gi, '#ff1866')
        .replace(/rgb\(246,247,252\)/g, '#1c1e1e')
      const icon = theme === 'dark' ? `data:image/svg+xml,${encodeURIComponent(dark)}` : light
      favicon.href = icon
      document.querySelectorAll('.gate__logo, .brand__icon').forEach(img => { img.src = icon })
    }
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode)))
    document.querySelectorAll('[data-theme-summary]').forEach(button => {
      const label = `Tema: ${mode === 'auto' ? 'automático' : mode === 'dark' ? 'oscuro' : 'claro'}. Cambiar tema`
      button.setAttribute('aria-label', label); button.setAttribute('title', label)
    })
    if (changed) window.dispatchEvent(new Event('health-theme-change'))
  }
  function click(event) {
    const button = event.target.closest?.('[data-theme-choice]')
    if (button && valid(button.dataset.themeChoice)) {
      mode = button.dataset.themeChoice
      try { localStorage.setItem(key, mode) } catch {}
      apply()
      const menu = button.closest('details'); if (menu) { menu.open = false; menu.querySelector('summary')?.focus() }
    } else if (!event.target.closest?.('.theme-control')) {
      document.querySelectorAll('.theme-control[open]').forEach(menu => { menu.open = false })
    }
  }
  function keydown(event) {
    if (event.key === 'Escape') document.querySelectorAll('.theme-control[open]').forEach(menu => { menu.open = false; menu.querySelector('summary')?.focus() })
  }
  function storage(event) { if (event.key === key) { mode = valid(event.newValue) ? event.newValue : 'auto'; apply() } }
  const timer = setInterval(apply, 30000)
  document.addEventListener('click', click)
  document.addEventListener('keydown', keydown)
  document.addEventListener('visibilitychange', apply)
  window.addEventListener('focus', apply)
  window.addEventListener('storage', storage)
  document.addEventListener('DOMContentLoaded', apply, { once: true })
  window.__healthThemeDispose = () => {
    clearInterval(timer)
    document.removeEventListener('click', click); document.removeEventListener('keydown', keydown)
    document.removeEventListener('visibilitychange', apply); document.removeEventListener('DOMContentLoaded', apply)
    window.removeEventListener('focus', apply); window.removeEventListener('storage', storage)
  }
  apply()
}

export const themeControl = `<details class="theme-control"><summary data-theme-summary aria-label="Cambiar tema" title="Cambiar tema"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/></svg></summary><div class="theme-menu" role="group" aria-label="Tema de apariencia"><button type="button" data-theme-choice="auto" aria-pressed="false">Automático <small>19:00–07:00 oscuro</small></button><button type="button" data-theme-choice="light" aria-pressed="false">Claro</button><button type="button" data-theme-choice="dark" aria-pressed="false">Oscuro</button></div></details>`

export const themeControlCss = `
.theme-control{position:relative;flex:0 0 auto;color:var(--theme-blue,#3A2EB4)}
.theme-control summary{list-style:none;width:44px;height:44px;display:grid;place-items:center;cursor:pointer;border-radius:50%;touch-action:manipulation}
.theme-control summary::-webkit-details-marker{display:none}
.theme-control summary:focus-visible,.theme-menu button:focus-visible{outline:2px solid var(--theme-blue,#3A2EB4);outline-offset:2px}
.theme-control summary:active{transform:scale(.97)}
.theme-menu{position:absolute;right:0;top:calc(100% + 8px);width:225px;z-index:100;padding:6px;border:1px solid var(--border,#3A2EB4);border-radius:12px;background:var(--surface,#f6f7fc)}
.theme-menu button{display:block;width:100%;min-height:44px;margin:0;padding:10px 12px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--ink,#3A2EB4);font:inherit;font-size:14px;text-align:left;cursor:pointer}
.theme-menu button[aria-pressed="true"]{border-color:var(--theme-blue,#3A2EB4)}
.theme-menu small{display:block;font-size:12px;color:inherit}
@media print{.theme-control{display:none!important}}
`
