import { useEffect } from 'react'

export default function ActionButtons({ gameState, playerId, onAction, timer, onShowSlider, confirmFold, onConfirmFold, onCancelFold }) {
  if (!gameState) return null

  const me = gameState.players.find(p => p.id === playerId)
  if (!me) return null

  const isMyTurn = gameState.currentPlayerId === playerId
  if (!isMyTurn) return null

  const canCheck = me.bet >= gameState.currentBet
  const callAmount = Math.min(gameState.currentBet - me.bet, me.chips)
  const canRaise = me.chips > gameState.currentBet - me.bet

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT') return
      switch (e.key) {
        case '1':
          if (confirmFold) {
            onConfirmFold()
          } else {
            onAction('fold')
          }
          break
        case '2': canCheck ? onAction('check') : onAction('call'); break
        case '3':
          if (canRaise) {
            const minRaiseTotal = gameState.currentBet + gameState.minRaise
            const maxTotal = me.chips + me.bet
            if (minRaiseTotal >= maxTotal) {
              onAction('all_in')
            } else {
              onShowSlider()
            }
          }
          break
        case '4': onAction('all_in'); break
        case 'Escape':
          if (confirmFold) onCancelFold()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [canCheck, canRaise, me.chips, me.bet, gameState, onAction, onShowSlider, confirmFold, onConfirmFold, onCancelFold])

  return (
    <div className="actions">
      <div className="actions-timer">
        <div
          className="timer-ring"
          style={{ '--pct': timer ? `${(timer / 30) * 100}%` : '100%' }}
        >
          <span>{timer != null ? timer : '—'}</span>
        </div>
      </div>

      <div className="actions-buttons">
        <button className="action-btn action-fold" onClick={() => onAction('fold')}>
          <span className="action-key">1</span> Retirarse
        </button>

        {canCheck ? (
          <button className="action-btn action-check" onClick={() => onAction('check')}>
            <span className="action-key">2</span> Verificar
          </button>
        ) : (
          <button className="action-btn action-call" onClick={() => onAction('call')}>
            <span className="action-key">2</span> Igualar {callAmount > 0 ? `$${callAmount}` : ''}
          </button>
        )}

        {canRaise && (
          <button className="action-btn action-raise" onClick={onShowSlider}>
            <span className="action-key">3</span> Subir
          </button>
        )}

        <button className="action-btn action-allin" onClick={() => onAction('all_in')}>
          <span className="action-key">4</span> All-in ${me.chips}
        </button>
      </div>
    </div>
  )
}
