import { bindActionSounds, playPdfSuccess } from './action-sounds'
type FranciscoCue = 'press' | 'release' | 'toggle' | 'success' | 'chime' | 'tick' | 'page' | 'scan'
/** Clicks have one delegated owner; PDF completion has its own exact preset. */
export function play(cue:FranciscoCue='tick'){if(cue==='scan')playPdfSuccess()}
export const bind=bindActionSounds
