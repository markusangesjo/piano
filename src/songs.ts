import type { SongPitch } from './pitch'
import type { Language } from './types'

const TWINKLE_SEQUENCE = ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'] as const
const SPAIN_SEQUENCE = ['G4', 'G4', 'A4', 'G4', 'F4', 'E4', 'E4', 'D4', 'C4', 'D4', 'C4'] as const
const FUR_ELISE_SEQUENCE = ['E4', 'D#4', 'E4', 'D#4', 'E4', 'B3', 'D4', 'C4', 'A3'] as const

export type SongId = 'twinkle' | 'spain' | 'fur-elise'
export type SongDefinition = { id: SongId; sequence: readonly SongPitch[]; title: Record<Language, string> }
export const SONGS: readonly SongDefinition[] = [
  { id: 'twinkle', sequence: TWINKLE_SEQUENCE, title: { sv: 'Blinka lilla stjärna', en: 'Twinkle Twinkle Little Star' } },
  { id: 'spain', sequence: SPAIN_SEQUENCE, title: { sv: 'Spanien är ett land där man dansar tango', en: 'Spain Is a Country Where You Dance Tango' } },
  { id: 'fur-elise', sequence: FUR_ELISE_SEQUENCE, title: { sv: 'Für Elise (första delen)', en: 'Für Elise (first part)' } },
]
