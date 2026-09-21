import type { ReactNode } from 'react'

/**
 * The app's one icon set: 24×24 geometry, a single 1.75 stroke weight and
 * currentColor, so an icon never introduces a second visual voice. Icons are
 * decorative here — every control that uses one keeps its own accessible name —
 * so the SVG is hidden from assistive technology instead of being labelled.
 */
export type IconName = 'note' | 'sparkle' | 'bug' | 'mic' | 'flame' | 'arrow'

const SHAPES: Record<IconName, ReactNode> = {
  // A beamed quaver: the app's own mark, shared by the brand and song mode.
  note: <><path d="M10 17.5V6.1l9-1.9v11.4" /><ellipse cx="7.1" cy="17.6" rx="2.9" ry="2.2" /><ellipse cx="16.1" cy="15.7" rx="2.9" ry="2.2" /></>,
  sparkle: <path d="M12 3.4 13.9 9l5.6 2-5.6 2-1.9 5.6-1.9-5.6-5.6-2 5.6-2z" />,
  // Debug mode: a bug with six legs and two antennae.
  bug: <><ellipse cx="12" cy="13.8" rx="4.2" ry="5.2" /><path d="M9.4 9.6 7.2 7.2M14.6 9.6l2.2-2.4M7.8 13H4.6M16.2 13h3.2M8.5 17.2 6.4 19.4M15.5 17.2l2.1 2.2" /></>,
  mic: <><rect x="9.2" y="3" width="5.6" height="10.6" rx="2.8" /><path d="M6 11.4a6 6 0 0 0 12 0M12 17.4V21M9 21h6" /></>,
  flame: <path d="M12 3.3c3 3.2 5.5 5.5 5.5 8.9a5.5 5.5 0 0 1-11 0c0-1.6.6-2.8 1.6-4.1.5 1.2 1.3 1.9 2.2 2.1-.6-2.6-.2-5 1.7-6.9z" />,
  arrow: <><path d="M4.5 12h13" /><path d="m12.5 7 5 5-5 5" /></>,
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{SHAPES[name]}</svg>
}
