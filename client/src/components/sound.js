const AudioCtx = window.AudioContext || window.webkitAudioContext
let ctx = null

function getCtx() {
  if (!ctx) ctx = new AudioCtx()
  return ctx
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + duration)
  } catch {}
}

export function playCardDeal() {
  playTone(800, 0.08, 'sine', 0.1)
  setTimeout(() => playTone(1000, 0.06, 'sine', 0.08), 60)
}

export function playChip() {
  playTone(600, 0.1, 'triangle', 0.12)
}

export function playCheck() {
  playTone(700, 0.08, 'sine', 0.1)
}

export function playFold() {
  playTone(300, 0.15, 'sawtooth', 0.08)
}

export function playRaise() {
  playTone(500, 0.1, 'triangle', 0.12)
  setTimeout(() => playTone(700, 0.1, 'triangle', 0.1), 80)
}

export function playAllIn() {
  playTone(400, 0.15, 'sawtooth', 0.15)
  setTimeout(() => playTone(600, 0.15, 'triangle', 0.12), 100)
  setTimeout(() => playTone(800, 0.2, 'sine', 0.1), 200)
}

export function playWin() {
  playTone(523, 0.15, 'sine', 0.12)
  setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 100)
  setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 200)
}

export function playTimerWarning() {
  playTone(440, 0.1, 'square', 0.08)
}

export function playCommunityCard() {
  playTone(900, 0.1, 'sine', 0.1)
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.08), 50)
}

export function playShowdown() {
  playTone(400, 0.2, 'triangle', 0.1)
  setTimeout(() => playTone(600, 0.2, 'triangle', 0.1), 150)
  setTimeout(() => playTone(800, 0.3, 'sine', 0.12), 300)
}
