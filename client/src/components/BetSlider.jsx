import { useState } from 'react'

export default function BetSlider({ min, max, chips, onConfirm, onCancel }) {
  const [value, setValue] = useState(min)

  const presets = []
  const quarter = Math.floor(max / 4)
  if (quarter > min) presets.push(quarter)
  const half = Math.floor(max / 2)
  if (half > min && half !== quarter) presets.push(half)
  const threeQuarters = Math.floor((max * 3) / 4)
  if (threeQuarters > min && threeQuarters !== half) presets.push(threeQuarters)

  return (
    <div className="bet-slider-overlay">
      <div className="bet-slider-modal">
        <h3>Subir apuesta</h3>
        <p className="bet-slider-info">
          Tus fichas: <strong>${chips}</strong> | Apuesta total: <strong>${value}</strong>
        </p>
        <div className="bet-slider-presets">
          {presets.map(p => (
            <button key={p} className="bet-preset-btn" onClick={() => setValue(p)}>
              ${p}
            </button>
          ))}
          <button className="bet-preset-btn" onClick={() => setValue(max)}>
            All-in ${max}
          </button>
        </div>
        <input
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
