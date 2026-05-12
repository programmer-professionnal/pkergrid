export default function ActionButtons({ gameState, playerId, onAction, timer }) {
  if (!gameState) return null

  const me = gameState.players.find(p => p.id === playerId)
  if (!me) return null

  const isMyTurn = gameState.currentPlayerId === playerId
  if (!isMyTurn) return null

  const canCheck = me.bet >= gameState.currentBet
  const callAmount = Math.min(gameState.currentBet - me.bet, me.chips)
  const canRaise = me.chips > gameState.currentBet - me.bet
  const isAllInMove = me.chips <= gameState.currentBet - me.bet

  return (
    <div className="actions">
      <div className="actions-timer">
        <div className="timer-ring" style={{ '--pct': timer ? `${(timer / 30) * 100}%` : '100%' }}>
          <span>{timer || '—'}</span>
        </div>
      </div>

      <div className="actions-buttons">
        <button className="action-btn action-fold" onClick={() => onAction('fold')}>
          Retirarse
        </button>

        {canCheck ? (
          <button className="action-btn action-check" onClick={() => onAction('check')}>
            Verificar
          </button>
        ) : (
          <button className="action-btn action-call" onClick={() => onAction('call')}>
            Igualar {callAmount > 0 ? `$${callAmount}` : ''}
          </button>
        )}

        {!isAllInMove && (
          <button
            className="action-btn action-raise"
            onClick={() => {
              const minRaiseTotal = gameState.currentBet + gameState.minRaise
              const maxTotal = me.chips + me.bet
              if (minRaiseTotal >= maxTotal) {
                onAction('raise', maxTotal)
              } else {
                onAction('raise', Math.min(minRaiseTotal, maxTotal))
              }
            }}
            disabled={!canRaise}
          >
            Subir
          </button>
        )}

        <button
          className="action-btn action-allin"
          onClick={() => onAction('all_in')}
        >
          All-in ${me.chips}
        </button>
      </div>
    </div>
  )
}
