import { useEffect } from 'react'
import { startTheme, themeControl, themeControlCss } from '../lib/theme-runtime.mjs'

export default function ThemeControl() {
  useEffect(() => { startTheme() }, [])
  return <><style>{themeControlCss}</style><div className="theme-control-host" dangerouslySetInnerHTML={{ __html: themeControl }} /></>
}
