import { useState } from 'react'

const DEFAULT_LEVELS = [
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 100, big: 200 },
]

export default function RoomConfig({ config, onSave, onClose }) {
  const [startingChips, setStartingChips] = useState(config.startingChips || 1000)
  const [smallBlind, setSmallBlind] = useState(config.smallBlind || 10)
  const [bigBlind, setBigBlind] = useState(config.bigBlind || 20)
  const [blindInterval, setBlindInterval] = useState(config.blindInterval || 5)
  const [levels, setLevels] = useState(config.blindLevels || DEFAULT_LEVELS)

  function handleSave() {
    onSave({
      startingChips: Math.max(100, Math.min(100000, startingChips)),
      smallBlind: Math.max(5, Math.min(1000, smallBlind)),
      bigBlind: Math.max(10, Math.min(2000, bigBlind)),
      blindInterval: Math.max(1, Math.min(50, blindInterval)),
      blindLevels: levels,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content config-modal" onClick={e => e.stopPropagation()}>
        <h3>Configuración de sala</h3>

        <div className="config-field">
          <label>Fichas iniciales</label>
          <input type="number" value={startingChips} onChange={e => setStartingChips(Number(e.target.value))} min={100} max={100000} />
        </div>

        <div className="config-row">
          <div className="config-field">
            <label>Small Blind</label>
            <input type="number" value={smallBlind} onChange={e => setSmallBlind(Number(e.target.value))} min={5} max={1000} />
          </div>
          <div className="config-field">
            <label>Big Blind</label>
            <input type="number" value={bigBlind} onChange={e => setBigBlind(Number(e.target.value))} min={10} max={2000} />
          </div>
        </div>

        <div className="config-field">
          <label>Manos entre subidas de ciegas</label>
          <input type="number" value={blindInterval} onChange={e => setBlindInterval(Number(e.target.value))} min={1} max={50} />
        </div>

        <div className="config-actions">
          <button className="action-btn action-raise" onClick={handleSave}>Guardar</button>
          <button className="action-btn action-fold" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
