import { useState } from 'react'

export default function BetSlider({ min, max, chips, onConfirm, onCancel }) {
  const [value, setValue] = useState(min)

  return (
    <div className="bet-slider-overlay">
      <div className="bet-slider-modal">
        <h3>Subir apuesta</h3>
        <p className="bet-slider-info">
          Tus fichas: ${chips} | Apuesta: ${value}
        </p>
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
          <button
            className="action-btn action-raise"
            onClick={() => onConfirm(value)}
          >
            Confirmar
          </button>
          <button
            className="action-btn action-fold"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
