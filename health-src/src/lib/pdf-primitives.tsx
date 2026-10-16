import React, { createContext, useContext } from 'react'
import * as PDF from '@react-pdf/renderer'

// Per-document state: a print export must never alter a simultaneous color export.
const PrintContext = createContext(false)
export const usePrintPdf = () => useContext(PrintContext)
export function Document({ monochrome = false, ...props }: React.ComponentProps<typeof PDF.Document> & { monochrome?: boolean }) {
  return <PrintContext.Provider value={monochrome}><PDF.Document {...props} /></PrintContext.Provider>
}

function blackOrPaper(value: unknown) {
  return typeof value === 'string' && /^(none|transparent|white|#fff|#ffffff)$/i.test(value) ? value : '#000000'
}

// Both SVG attributes and nested styles need conversion (including borders and
// superscript glyphs). Keep white cutouts; never convert colors into gray tones.
function printStyle(style: any): any {
  if (Array.isArray(style)) return style.map(printStyle)
  if (!style || typeof style !== 'object') return style
  return Object.fromEntries(Object.entries(style).map(([key, value]) => [key,
    key === 'color' ? '#000000' : /opacity/i.test(key) ? 1
      : /color$|^(fill|stroke)$/i.test(key) ? blackOrPaper(value) : value,
  ]))
}

function primitive<P extends { style?: any }>(Component: React.ComponentType<P>) {
  return function PrintPrimitive(props: P) {
    const monochrome = usePrintPdf()
    if (!monochrome) return <Component {...props} />
    const converted: Record<string, unknown> = { ...props, style: printStyle(props.style) }
    for (const key of ['fill', 'stroke', 'color']) {
      if (key in converted) converted[key] = key === 'color' ? '#000000' : blackOrPaper(converted[key])
    }
    for (const key of ['opacity', 'fillOpacity', 'strokeOpacity']) {
      if (key in converted) converted[key] = 1
    }
    return <Component {...converted as P} />
  }
}
export const Page = primitive(PDF.Page)
export const Text = primitive(PDF.Text)
export const View = primitive(PDF.View)
export const Svg = primitive(PDF.Svg)
export const Path = primitive(PDF.Path)
export const Line = primitive(PDF.Line)
export const Circle = primitive(PDF.Circle)
export const Rect = primitive(PDF.Rect)
