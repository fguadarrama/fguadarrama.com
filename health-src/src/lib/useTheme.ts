import { useSyncExternalStore } from 'react'
const subscribe = (notify: () => void) => {
  window.addEventListener('health-theme-change', notify)
  return () => window.removeEventListener('health-theme-change', notify)
}
export function useTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || 'light')
}
