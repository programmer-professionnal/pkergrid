export default function ActionButtons({ gameState, playerId, onAction }) {
  if (!gameState) return null

  const me = gameState.players.find(p => p.id === playerId)
  if (!me) return null

  const isMyTurn = gameState.currentPlayerId === playerId
  if (!isMyTurn) return null

  const canCheck = me.bet >= gameState.currentBet
  const callAmount = Math.min(gameState.currentBet - me.bet, me.chips)
  const canRaise = me.chips > gameState.currentBet - me.bet

  return (
    <div className="actions">
      <button className="action-btn action-fold" onClick={() => onAction('fold')}>
        Fold
      </button>

      {canCheck ? (
        <button className="action-btn action-check" onClick={() => onAction('check')}>
          Check
        </button>
      ) : (
        <button
          className="action-btn action-call"
          onClick={() => onAction('call')}
        >
          Call {callAmount > 0 ? `$${callAmount}` : ''}
        </button>
      )}

      <button
        className="action-btn action-raise"
        onClick={() => {
          const raiseTotal = Math.max(gameState.currentBet + gameState.minRaise, me.chips)
          onAction('raise', Math.min(raiseTotal, me.chips + me.bet))
        }}
        disabled={!canRaise}
      >
        All-in ${me.chips}
      </button>
    </div>
  )
}
