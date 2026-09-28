// The visual reference is the user's wide-gamut Pika swatch, not the old
// sRGB rendering of #eb155c. Use these P3 channels on capable displays, with
// a vivid sRGB approximation for PDF export and standard-gamut displays.
export const WATERMELON_P3 = 'color(display-p3 0.9215686275 0.0823529412 0.3607843137)'
export const WATERMELON_SRGB = '#ff0059'
export const LEAN_ACCENT = '#5e33fe'
export const webColor = (color: string) => color.toLowerCase() === '#eb155c' ? 'var(--watermelon, #ff0059)' : color
export const pdfColor = (color: string) => color.toLowerCase() === '#eb155c' ? WATERMELON_SRGB : color

// Exact user accents for section markers. Light hues have a separate readable
// title/icon shade: color identity must not come at the expense of legibility.
export const LAB_ACCENTS: Record<string, string> = {
  'Hematología': '#3e3bd7', 'Química': '#ff5f17', 'Lípidos': '#8631b5',
  'Hepática': '#479a6d', 'Electrolitos': '#ffd449', 'Endocrinología': '#005fec',
  'Serología': '#eb155c', 'Orina': '#008797', 'LCR': '#b56400', 'Infecciosos': '#5e33fe',
}
export const LAB_TITLE_COLORS: Record<string, string> = {
  ...LAB_ACCENTS,
  'Química': '#b53c00', 'Hepática': '#237646', 'Electrolitos': '#806200',
  'Serología': '#c6004d', 'Orina': '#00717d', 'LCR': '#995000',
}
