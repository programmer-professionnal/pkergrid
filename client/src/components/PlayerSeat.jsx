import Card from './Card.jsx'

export default function PlayerSeat({ player, isCurrent, isDealer, isSmallBlind, isBigBlind, isMe, myCards, showCards, handName, stats, animated, isSpectator }) {
  const cardsToShow = isMe && myCards ? myCards : player.cards

  const vpip = stats && stats.handsPlayed > 0
    ? Math.round(((stats.raises + stats.calls + stats.allIns) / stats.handsPlayed) * 100)
    : null

  return (
    <div className={`seat ${isCurrent ? 'seat-current' : ''} ${player.folded ? 'seat-folded' : ''} ${player.eliminated ? 'seat-eliminated' : ''} ${animated ? 'seat-animated' : ''}`}>
      {isDealer && <div className="seat-dealer">D</div>}
      {isSmallBlind && <div className="seat-blind sb">SB</div>}
      {isBigBlind && <div className="seat-blind bb">BB</div>}
      <div className="seat-name">
        {player.name}
        {isMe && <span className="seat-you"> (tú)</span>}
        {isSpectator && <span className="seat-spectator"> [Espectador]</span>}
      </div>
      <div className="seat-chips">
        <span className="chip-icon">●</span> {player.chips}
      </div>
      {vpip !== null && !isSpectator && (
        <div className="seat-stats">VP: {vpip}%</div>
      )}
      <div className="seat-cards">
        {cardsToShow && cardsToShow.length > 0
          ? cardsToShow.map((card, i) => (
              <Card key={i} card={card} hidden={isMe ? false : !showCards} small />
            ))
          : <div className="seat-cards-placeholder">{isSpectator ? '—' : '—'}</div>
        }
      </div>
      {player.bet > 0 && (
        <div className="seat-bet">${player.bet}</div>
      )}
      {player.folded && !handName && <div className="seat-status folded">RETIRADO</div>}
      {player.allIn && !player.folded && <div className="seat-status allin">ALL IN</div>}
      {player.eliminated && !player.allIn && !player.folded && <div className="seat-status eliminated">ELIMINADO</div>}
      {handName && <div className="seat-hand">{handName}</div>}
      {isCurrent && <div className="seat-indicator">▼</div>}
    </div>
  )
}
