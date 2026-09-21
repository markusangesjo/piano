import { PITCH_INFO, type SongPitch } from '../pitch'
import type { COPY } from '../copy'
import type { Language } from '../types'

export function Staff({ pitch, copy, upcoming = [] }: { pitch: SongPitch; copy: typeof COPY[Language]; upcoming?: readonly SongPitch[] }) {
  const notes = [pitch, ...upcoming]
  const startX = 150
  const spacing = 60
  return <div className="staff-wrap" aria-label={copy.staff(pitch)}>
    <svg className="staff" viewBox="0 0 500 200" role="img">
      <title>{copy.titleStaff(pitch)}</title>
      <text x="26" y="116" className="clef">𝄞</text>
      {[50, 70, 90, 110, 130].map((y) => <line key={y} x1="92" y1={y} x2="472" y2={y} className="staff-line" />)}
      {notes.map((n, index) => {
        const info = PITCH_INFO[n]
        const cx = startX + index * spacing
        const isCurrent = index === 0
        return <g key={`${n}-${index}`} className={isCurrent ? 'note-group current' : 'note-group upcoming'} opacity={isCurrent ? 1 : Math.max(0.35, 0.75 - index * 0.15)}>
          {(n === 'C4' || n === 'A3') && <line x1={cx - 23} y1={info.y} x2={cx + 23} y2={info.y} className="ledger-line" />}
          {n === 'D#4' && <text x={cx - 39} y={info.y + 6} className="accidental">♯</text>}
          <ellipse cx={cx} cy={info.y} rx={isCurrent ? 17 : 12} ry={isCurrent ? 12 : 9} fill={info.color} className="note-head" />
          {isCurrent && <line x1={cx + 16} y1={info.y} x2={cx + 16} y2={info.y - 51} className="stem" />}
          {isCurrent && <circle cx={cx - 6} cy={info.y - 4} r="3" fill="white" opacity=".75" />}
        </g>
      })}
    </svg>
  </div>
}
