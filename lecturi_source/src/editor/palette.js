export const TEXT_COLOR = 'rgb(48, 56, 64)';
export const PALETTE = [
  { name: 'Texto · Yo-nezumi', hex: '#303840', rgb: TEXT_COLOR },
  { name: 'Aomidori', hex: '#008b8b', rgb: 'rgb(0, 139, 139)' },
  { name: 'Nakabeni', hex: '#c93756', rgb: 'rgb(201, 55, 86)' },
  { name: 'Rosa Lecturi', hex: '#eb155c', rgb: 'rgb(235, 21, 92)' },
  { name: 'Azul Lecturi', hex: '#4392ba', rgb: 'rgb(67, 146, 186)' },
];
export function allowedColor(color) {
  return PALETTE.find(entry => entry.rgb === color || entry.hex === color?.toLowerCase())?.rgb || TEXT_COLOR;
}
