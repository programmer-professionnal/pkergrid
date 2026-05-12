import Card from './Card.jsx'

export default function PlayerSeat({ player, isCurrent, isDealer, isSmallBlind, isBigBlind, isMe }) {
  return (
    <div className={`seat ${isCurrent ? 'seat-current' : ''} ${player.folded ? 'seat-folded' : ''}`}>
      {isDealer && <div className="seat-dealer">D</div>}
      {isSmallBlind && <div className="seat-blind sb">SB</div>}
      {isBigBlind && <div className="seat-blind bb">BB</div>}
      <div className="seat-name">
        {player.name}
        {isMe && <span className="seat-you"> (tú)</span>}
      </div>
      <div className="seat-chips">
        <span className="chip-icon">●</span> {player.chips}
      </div>
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
      {player.folded && <div className="seat-status folded">RETIRADO</div>}
      {player.allIn && <div className="seat-status allin">ALL IN</div>}
      {isCurrent && <div className="seat-indicator">▼</div>}
    </div>
  )
}
