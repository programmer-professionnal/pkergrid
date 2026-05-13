import { useState } from 'react'

export default function HandHistory({ handHistory, playerId }) {
  const [open, setOpen] = useState(false)

  if (!handHistory || handHistory.length === 0) return null

  const recent = handHistory.slice(-10).reverse()

  return (
    <div className={`hand-history ${open ? 'hand-history-open' : ''}`}>
      <div className="hand-history-header" onClick={() => setOpen(!open)}>
        <span>Historial ({handHistory.length})</span>
        <span>{open ? '▼' : '▲'}</span>
      </div>
      {open && (
        <div className="hand-history-list">
          {recent.map((hand) => (
            <div key={hand.id} className="hand-history-item">
              <div className="hand-history-num">Mano #{hand.handNumber}</div>
              <div className="hand-history-pots">
                {hand.potDistributions && hand.potDistributions.map((pd, i) => (
                  <div key={i} className="hand-history-pot">
                    <span className="hh-pot-amount">${pd.amount}</span>
                    <span className="hh-pot-winners">
                      {pd.winners.map(w => w.name).join(', ')}
                    </span>
                    <span className="hh-pot-hand">{pd.handName}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
