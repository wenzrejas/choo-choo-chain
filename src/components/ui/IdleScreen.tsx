import { useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { useGameStore } from '../../store/gameStore'
import { sfxClick } from '../../audio/sfx'
import { AudioEngine } from '../../audio/AudioEngine'

// ─── Sub-modals ───────────────────────────────────────────────────────────────

// function HowToPlayModal({ onClose }: { onClose: () => void }): JSX.Element {
//   return (
//     <div style={styles.overlay}>
//       <div style={styles.modal}>
//         <h2 style={styles.modalTitle}>HOW TO PLAY</h2>
//         <ul style={styles.list}>
//           <li>🚂 Your train moves forward automatically</li>
//           <li>🖱️ Move the mouse to steer</li>
//           <li>🟤 Collect <b>Copper</b> wagons — 1 pt</li>
//           <li>⬜ Collect <b>Silver</b> wagons — 3 pts</li>
//           <li>🟡 Collect <b>Gold</b> wagons — 7 pts</li>
//           <li>🌲 Avoid trees, bushes &amp; boulders</li>
//           <li>☠️ Don&apos;t hit your own tail!</li>
//           <li>⚡ Collect <b>Energy</b>, then hold mouse to boost speed</li>
//           <li>🕐 Collect <b>Clock</b> to add bonus time</li>
//           <li>🛡️ Collect <b>Shield</b> to destroy obstacles on contact</li>
//         </ul>
//         <button style={styles.secondaryBtn} onClick={() => { sfxClick(); onClose() }}>BACK</button>
//       </div>
//     </div>
//   )
// }

function CreditsModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>CREDITS</h2>
        <p style={{ color: '#ccc', marginBottom: 8 }}>Game Design &amp; Development</p>
        <p style={{ color: '#fff', fontSize: 20, marginBottom: 24 }}>WENZ</p>
        <p style={{ color: '#888', fontSize: 13 }}>Built with React + React-Three-Fiber + Rapier</p>
        <button style={styles.secondaryBtn} onClick={() => { sfxClick(); onClose() }}>BACK</button>
      </div>
    </div>
  )
}

// ─── Idle screen ──────────────────────────────────────────────────────────────

type ModalView = 'howto' | 'credits' | null

export default function IdleScreen(): JSX.Element {
  const startGame = useGameStore((s) => s.startGame)
  const [modal, setModal] = useState<ModalView>(null)

  return (
    <div style={styles.root}>
      <div style={styles.content}>
        <div style={styles.logo}>WENZ</div>
        <div style={styles.subtitle}>TRAIN RUSH</div>
        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn}   onClick={() => { AudioEngine.resume(); sfxClick(); startGame() }}>START</button>
        </div>
      </div>

      {/* {modal === 'howto'   && <HowToPlayModal onClose={() => setModal(null)} />} */}
      {/* {modal === 'credits' && <CreditsModal   onClose={() => setModal(null)} />} */}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #0d1a0d 0%, #050a05 100%)',
    fontFamily: '"Courier New", monospace',
    userSelect: 'none',
  } satisfies CSSProperties,

  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  } satisfies CSSProperties,

  logo: {
    fontSize: 96, fontWeight: 900, letterSpacing: 24, color: '#fff',
  } satisfies CSSProperties,

  subtitle: {
    fontSize: 22, letterSpacing: 12, color: '#4a9', marginBottom: 32,
  } satisfies CSSProperties,

  buttonGroup: {
    display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
  } satisfies CSSProperties,

  primaryBtn: {
    width: 220, padding: '14px 0', fontSize: 18, letterSpacing: 8, cursor: 'pointer',
    background: '#00cc55', color: '#000', border: 'none',
    fontFamily: 'inherit', fontWeight: 700,
  } satisfies CSSProperties,

  secondaryBtn: {
    width: 220, padding: '12px 0', fontSize: 14, letterSpacing: 6, cursor: 'pointer',
    background: 'transparent', color: '#4a9', border: '1px solid #4a9',
    fontFamily: 'inherit', fontWeight: 700,
  } satisfies CSSProperties,

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  } satisfies CSSProperties,

  modal: {
    background: '#0d180d', border: '1px solid #4a9', padding: '40px 48px',
    maxWidth: 480, width: '90%', color: '#fff',
    fontFamily: '"Courier New", monospace',
  } satisfies CSSProperties,

  modalTitle: {
    fontSize: 24, letterSpacing: 8, marginBottom: 24, color: '#4a9',
  } satisfies CSSProperties,

  list: {
    listStyle: 'none', padding: 0, margin: '0 0 28px 0',
    display: 'flex', flexDirection: 'column', gap: 10,
    color: '#ccc', fontSize: 14, lineHeight: 1.6,
  } satisfies CSSProperties,
}
