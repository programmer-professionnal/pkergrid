import Card from './Card.jsx'

export default function PlayerSeat({ player, isCurrent, isDealer, position }) {
  const positionClass = `seat-pos-${position}`
  const currentClass = isCurrent ? 'seat-current' : ''
  const foldedClass = player.folded ? 'seat-folded' : ''

  return (
    <div className={`seat ${positionClass} ${currentClass} ${foldedClass}`}>
      {isDealer && <div className="seat-dealer">D</div>}
      <div className="seat-name">{player.name}</div>
      <div className="seat-chips">{player.chips} fichas</div>
      <div className="seat-cards">
        {player.cards.map((card, i) => (
          <Card key={i} card={card} hidden={false} small />
        ))}
        {player.cards.length === 0 && (
          <div className="seat-cards-placeholder">—</div>
        )}
      </div>
      {player.bet > 0 && (
        <div className="seat-bet">${player.bet}</div>
      )}
      {player.folded && <div className="seat-status">FOLD</div>}
      {player.allIn && <div className="seat-status allin">ALL IN</div>}
      {isCurrent && <div className="seat-indicator">▼</div>}
    </div>
  )
}
