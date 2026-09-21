import { BLACK_KEYS, PITCHES, PITCH_INFO, type PianoKey } from '../pitch'
import { playTone } from '../audio'
import type { COPY } from '../copy'
import type { Language } from '../types'

export function Piano({ active, onPick, copy }: { active: PianoKey | null; onPick: (pitch: PianoKey) => void; copy: typeof COPY[Language] }) {
  return <div className="piano" aria-label={copy.keyboard}>
    {PITCHES.map((pitch) => <button key={pitch} className={`white-key ${active === pitch ? 'active' : ''}`} style={{ '--key-color': PITCH_INFO[pitch].color } as React.CSSProperties} onClick={() => { onPick(pitch); void playTone(pitch) }} aria-label={copy.playNote(pitch)}><span>{pitch}</span>{pitch === 'C4' && <small className="middle-c-marker">{copy.middleC}</small>}</button>)}
    {BLACK_KEYS.map((key, index) => <button key={key.id} className={`black-key ${active === key.id ? 'active' : ''}`} style={{ left: `${((index === 0 ? 1 : index === 1 ? 2 : index + 2) * 100) / 8}%` }} onClick={() => { onPick(key.id); void playTone(key.id) }} aria-label={copy.blackKey(key.label)}><span>{key.label}</span></button>)}
  </div>
}
