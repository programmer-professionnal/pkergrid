import { useState, useEffect, useRef } from 'react'

export default function BetSlider({ min, max, chips, onConfirm, onCancel }) {
  const [value, setValue] = useState(min)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    function handleKey(e) {
      if (e.key === 'Enter') onConfirm(value)
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [value, onConfirm, onCancel])

  const raiseAmount = value - (value === max ? max : 0)
  const presets = []
  const quarter = Math.floor(max / 4)
  if (quarter > min && !presets.includes(quarter)) presets.push(quarter)
  const half = Math.floor(max / 2)
  if (half > min && !presets.includes(half)) presets.push(half)
  const threeQuarters = Math.floor((max * 3) / 4)
  if (threeQuarters > min && !presets.includes(threeQuarters)) presets.push(threeQuarters)
  if (!presets.includes(max)) presets.push(max)

  return (
    <div className="bet-slider-overlay">
      <div className="bet-slider-modal">
        <h3>Subir apuesta</h3>
        <p className="bet-slider-info">
          Tus fichas: <strong>${chips}</strong> | Apuesta total: <strong>${value}</strong>
          {value > min && <span className="bet-slider-extra"> (+${value - min} más)</span>}
        </p>
        <div className="bet-slider-presets">
          {presets.filter(p => p >= min && p <= max).map(p => (
            <button key={p} className={`bet-preset-btn ${value === p ? 'bet-preset-active' : ''}`} onClick={() => setValue(p)}>
              {p >= chips + (max - chips) ? 'All-in' : `$${p}`}
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="bet-slider-input"
        />
        <div className="bet-slider-value">${value}</div>
        <div className="bet-slider-buttons">
          <button className="action-btn action-raise" onClick={() => onConfirm(value)}>
            Confirmar
          </button>
          <button className="action-btn action-fold" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
