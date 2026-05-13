import { useState, useEffect, useCallback, useRef } from 'react'
import Card from './Card.jsx'
import PlayerSeat from './PlayerSeat.jsx'
import ActionButtons from './ActionButtons.jsx'
import BetSlider from './BetSlider.jsx'
import Chat from './Chat.jsx'
import Tutorial from './Tutorial.jsx'
import HandHistory from './HandHistory.jsx'
import RoomConfig from './RoomConfig.jsx'
import * as Sound from './sound.js'

const TURN_TIMER = 30

export default function PokerTable({ room, emit, setCallbacks, connected, onLeave }) {
  const { playerId, roomCode, name } = room
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState(room.players)
  const [showSlider, setShowSlider] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [timer, setTimer] = useState(null)
  const timerRef = useRef(null)
  const prevPhaseRef = useRef(null)
  const prevPotsRef = useRef(null)
  const prevCommunityRef = useRef(null)
  const [lastAction, setLastAction] = useState(null)
  const [showTutorial, setShowTutorial] = useState(!sessionStorage.getItem('pkergrid_tutorial_done'))
  const [showConfig, setShowConfig] = useState(false)
  const [isSpectator, setIsSpectator] = useState(false)
  const [lastActionText, setLastActionText] = useState(null)
  const [animatedCards, setAnimatedCards] = useState(false)
  const [confirmFold, setConfirmFold] = useState(false)

  const onGameState = useCallback((state) => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = state.phase
    prevPotsRef.current = gameState?.pots
    prevCommunityRef.current = gameState?.communityCards

    setGameState(state)
    if (state.players) setPlayers(state.players)

    if (state.currentPlayerId === playerId && state.phase !== 'showdown' && state.phase !== 'waiting' && state.phase !== 'game_over') {
      setTimer(TURN_TIMER)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            emit('player_action', { action: 'fold' }, (r) => {
              if (r && r.error) setLastAction({ type: 'error', text: r.error })
            })
            Sound.playFold()
            return 0
          }
          if (prev <= 6 && prev > 1) Sound.playTimerWarning()
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimer(null)
    }

    if (prev === 'waiting' && state.phase === 'preflop') {
      Sound.playCardDeal()
      setAnimatedCards(true)
      setTimeout(() => setAnimatedCards(false), 500)
    }

    if (state.communityCards && prevCommunityRef.current) {
      if (state.communityCards.length > prevCommunityRef.current.length) {
        Sound.playCommunityCard()
        setAnimatedCards(true)
        setTimeout(() => setAnimatedCards(false), 500)
      }
    }

    if (state.phase === 'showdown' && prev !== 'showdown') {
      Sound.playShowdown()
    }

    if (state.lastHand && state.phase === 'showdown') {
      if (state.lastHand.winners && state.lastHand.winners.some(w => w.id === playerId)) {
        Sound.playWin()
      }
    }

  }, [playerId, emit, gameState])

  const onRoomUpdate = useCallback((data) => {
    if (data.players) setPlayers(data.players)
  }, [])

  const onChatMessage = useCallback((data) => {
    setChatMessages(prev => [...prev, data])
  }, [])

  const onConfigUpdated = useCallback(({ config }) => {
    setLastAction({ type: 'info', text: 'Configuración actualizada' })
  }, [])

  const onPlayerDisconnected = useCallback(() => {}, [])

  const onReconnected = useCallback((data) => {
    if (data.players) setPlayers(data.players)
    setLastAction({ type: 'info', text: 'Reconectado a la sala' })
  }, [])

  useEffect(() => {
    setCallbacks({ onGameState, onRoomUpdate, onChatMessage, onPlayerDisconnected, onConfigUpdated, onReconnected })
  }, [setCallbacks, onGameState, onRoomUpdate, onChatMessage, onPlayerDisconnected, onConfigUpdated, onReconnected])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const roomPhase = gameState?.phase || 'waiting'
  const me = gameState
    ? gameState.players.find(p => p.id === playerId)
    : players.find(p => p.id === playerId)

  const visiblePlayers = gameState?.players || []
  const communityCards = gameState?.communityCards || []
  const currentPlayerId = gameState?.currentPlayerId
  const isHost = gameState?.isHost ?? players.find(p => p.id === playerId)?.isHost

  const phaseNames = {
    waiting: 'Esperando jugadores...',
    preflop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
    game_over: 'Juego terminado',
  }

  const facingBet = me && gameState ? Math.max(0, gameState.currentBet - me.bet) : 0
  const canCheckFn = (p, g) => p && g ? p.bet >= g.currentBet : false

  function getPhaseTip(phase, callAmount, canCheckVal) {
    if (callAmount > 0) return `Igualar cuesta $${callAmount}. Si tus cartas son malas, es mejor retirarse.`
    if (phase === 'preflop' && !canCheckVal) return `Tienes que igualar o retirarte. Si tus cartas son bajas (2-7, 3-8), retírate.`
    if (canCheckVal) return `Puedes verificar gratis. No apuestes si no tienes una mano fuerte.`
    return `Evalúa las cartas comunitarias. ¿Crees que tienes la mejor mano?`
  }

  function handleAction(action, amount) {
    if (action === 'raise' && !amount) {
      setShowSlider(true)
      return
    }
    if (action === 'fold') {
      setConfirmFold(true)
      return
    }
    performAction(action, amount)
  }

  function performAction(action, amount) {
    setConfirmFold(false)
    setLastAction(null)
    setLastActionText(null)

    switch (action) {
      case 'fold': Sound.playFold(); break
      case 'check': Sound.playCheck(); break
      case 'call': Sound.playChip(); break
      case 'raise': Sound.playRaise(); break
      case 'all_in': Sound.playAllIn(); break
    }

    emit('player_action', { action, amount }, (response) => {
      if (response && !response.success) {
        setLastAction({ type: 'error', text: response.error })
      }
    })
  }

  function handleStart() {
    emit('start_game', {}, (response) => {
      if (response && !response.success) alert(response.error)
    })
  }

  function handleAddBot() {
    emit('add_bot', {}, (response) => {
      if (response && response.success) {
        setLastAction({ type: 'info', text: 'Bot añadido' })
      } else {
        setLastAction({ type: 'error', text: response?.error || 'Error' })
      }
    })
  }

  function handleRemoveBots() {
    emit('remove_bots', {}, (response) => {
      if (response && response.success) {
        setLastAction({ type: 'info', text: 'Bots eliminados' })
      }
    })
  }

  function handleLeaveRoom() {
    emit('leave_room', {}, () => {})
    onLeave()
  }

  function handleSliderConfirm(amount) {
    setShowSlider(false)
    handleAction('raise', amount)
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  function handleSendMessage(text) {
    emit('send_message', { message: text }, () => {})
  }

  function handleSaveConfig(config) {
    emit('update_config', { config }, (response) => {
      if (response && response.success) {
        setShowConfig(false)
        setLastAction({ type: 'info', text: 'Configuración guardada' })
      } else {
        setLastAction({ type: 'error', text: response?.error || 'Error al guardar' })
      }
    })
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(`¡Juguemos al Póker! Unete a mi sala: ${roomCode}\nhttps://pkergrid.onrender.com`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function handleShareTelegram() {
    const text = encodeURIComponent(`¡Juguemos al Póker! Unete a mi sala: ${roomCode}`)
    window.open(`https://t.me/share/url?url=https://pkergrid.onrender.com&text=${text}`, '_blank')
  }

  if (timer !== null && timer <= 5) {
    document.documentElement.style.setProperty('--timer-urgent', '#e74c3c')
  } else {
    document.documentElement.style.setProperty('--timer-urgent', '#2ecc71')
  }

  const isMyTurn = gameState?.currentPlayerId === playerId && roomPhase !== 'showdown' && roomPhase !== 'waiting' && roomPhase !== 'game_over'

  return (
    <div className="table-container">

      <div className="table-topbar">
        <div className="topbar-left">
          <span className="topbar-code" onClick={handleCopyCode}>
            Sala: {roomCode}
          </span>
          {copyFeedback && <span className="copy-feedback">¡Copiado!</span>}
          <span className="topbar-players-count">
            {players.filter(p => !p.spectator && (p.chips > 0 || !gameState)).length}/{players.filter(p => !p.spectator).length}
          </span>
          <span className={`topbar-conn ${connected ? 'conn-on' : 'conn-off'}`}>
            <span className="conn-dot-sm" />
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="topbar-center">
          <span className="topbar-title">♠ Pkergrid ♥</span>
        </div>
        <div className="topbar-right">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowTutorial(true)}>
            ? Cómo Jugar
          </button>
          {(roomPhase === 'waiting' || roomPhase === 'game_over') && isHost && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(true)}>
              ⚙ Config
            </button>
          )}
          {roomPhase === 'waiting' && isHost && (
            <button className="btn btn-primary btn-sm" onClick={handleStart}>
              Iniciar Partida
            </button>
          )}
          {roomPhase === 'game_over' && isHost && (
            <button className="btn btn-primary btn-sm" onClick={handleStart}>
              Nueva Partida
            </button>
          )}
          {(roomPhase === 'waiting' || roomPhase === 'game_over') && (
            <button className="btn btn-secondary btn-sm" onClick={handleShareWhatsApp} title="Compartir por WhatsApp">
              📱 Compartir
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleLeaveRoom}>
            Salir
          </button>
        </div>
      </div>

      <div className="table-felt">
        <div className="table-phase">
          <span>{phaseNames[roomPhase] || roomPhase}</span>
          {gameState && gameState.phase !== 'waiting' && gameState.phase !== 'game_over' && (
            <>
              <span className="table-pot">
                Bote: ${gameState.pot}
                {gameState.pots && gameState.pots.length > 1 && (
                  <span className="table-pots-detail">
                    ({gameState.pots.map((p, i) => (
                      <span key={i} className="table-pot-item">
                        {i > 0 && ' + '}P{i + 1}: ${p.amount}
                      </span>
                    ))})
                  </span>
                )}
              </span>
              <span className="table-blinds">
                SB ${gameState.smallBlind || 10} / BB ${gameState.bigBlind || 20}
                {gameState.handCount > 0 && <span className="table-hand-count"> (#{gameState.handCount})</span>}
              </span>
              {facingBet > 0 && me && !me.folded && !me.allIn && roomPhase !== 'showdown' && (
                <span className="table-to-call">Para igualar: ${facingBet}</span>
              )}
            </>
          )}
          {gameState?.handStrength && roomPhase !== 'showdown' && !me?.folded && !me?.allIn && (
            <span className={`table-hand-str str-${gameState.handStrength.label.toLowerCase().replace(/\s/g, '_')}`}>
              🃏 {gameState.handStrength.label} ({gameState.handStrength.pct}%)
            </span>
          )}
        </div>

        {currentPlayerId && currentPlayerId !== playerId && roomPhase !== 'waiting' && roomPhase !== 'showdown' && roomPhase !== 'game_over' && (
          <div className="table-waiting-turn">
            Esperando a {visiblePlayers.find(p => p.id === currentPlayerId)?.name || 'otro jugador'}...
          </div>
        )}

        <div className="table-players">
          {visiblePlayers.filter(p => !p.spectator).map((p, i) => {
            const game = gameState
            const dealerIdx = game?.dealerIndex ?? -1
            const activePlayers = gameState?.players?.filter(ap => !ap.spectator) || []
            const playerIdx = activePlayers.findIndex(ap => ap.id === p.id)
            const sbIdx = dealerIdx >= 0 ? (dealerIdx + 1) % activePlayers.length : -1
            const bbIdx = dealerIdx >= 0 ? (dealerIdx + 2) % activePlayers.length : -1

            const lastHand = gameState?.lastHand
            const handInfo = lastHand?.allHands?.find(h => h.playerId === p.id)

            return (
              <PlayerSeat
                key={p.id}
                player={p}
                isCurrent={game?.currentPlayerId === p.id}
                isDealer={playerIdx === dealerIdx && dealerIdx >= 0}
                isSmallBlind={playerIdx === sbIdx && sbIdx >= 0}
                isBigBlind={playerIdx === bbIdx && bbIdx >= 0}
                isMe={p.id === playerId}
                myCards={p.id === playerId ? gameState?.myCards : null}
                showCards={roomPhase === 'showdown' && !p.folded}
                handName={roomPhase === 'showdown' ? handInfo?.hand?.name : null}
                stats={gameState?.playerStats?.[p.id]}
                animated={animatedCards}
                isSpectator={!!p.spectator}
              />
            )
          })}
        </div>

        <div className="table-community">
          {communityCards.length === 0 && roomPhase === 'waiting' && (
            <div className="table-waiting">
              <div className="waiting-title">Esperando jugadores...</div>
              <div className="waiting-sub">Comparte el código <strong>{roomCode}</strong> con tus amigos</div>
              {players.filter(p => !p.spectator).length > 0 && (
                <div className="table-positions-preview">
                  <span className="positions-label">Jugadores:</span>
                  {players.filter(p => !p.spectator).map((p, idx) => (
                    <span key={p.id} className="position-chip">
                      {idx === 0 ? '👑' : ''} {p.name} {p.chips > 0 ? `($${p.chips})` : ''}
                    </span>
                  ))}
                </div>
              )}
              <button className="btn btn-secondary btn-sm" onClick={handleCopyCode}>
                {copyFeedback ? '✓ Copiado' : 'Copiar código'}
              </button>
              <div className="waiting-players-list">
                {players.filter(p => !p.spectator).map(p => (
                  <div key={p.id} className="waiting-player-item">
                    <span className="waiting-player-icon">{p.isHost ? '👑' : '🃏'}</span>
                    <span>{p.name}</span>
                    <span className="waiting-player-chips">${p.chips}</span>
                    {p.isHost && <span className="waiting-player-host">Anfitrión</span>}
                  </div>
                ))}
              </div>
              {isHost && (
                <div className="waiting-bot-buttons">
                  <button className="btn btn-secondary btn-sm" onClick={handleAddBot}>
                    + Añadir Bot
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleRemoveBots}>
                    - Quitar Bots
                  </button>
                </div>
              )}
              {isHost
                ? <div className="waiting-hint">Presiona "Iniciar Partida" cuando estén listos</div>
                : <div className="waiting-hint">Esperando a que el anfitrión inicie...</div>
              }
            </div>
          )}
          <div className={`community-cards ${animatedCards ? 'community-animated' : ''}`}>
            {communityCards.map((card, i) => (
              <Card
                key={i}
                card={card}
                highlight={i === communityCards.length - 1 && roomPhase !== 'showdown'}
                animationDelay={i * 100}
              />
            ))}
          </div>
          {communityCards.length === 0 && roomPhase !== 'waiting' && roomPhase !== 'game_over' && (
            <div className="table-waiting-placeholder">Esperando cartas...</div>
          )}
        </div>

        {gameState?.pots && gameState.pots.length > 1 && roomPhase !== 'waiting' && roomPhase !== 'game_over' && (
          <div className="table-sidepots">
            {gameState.pots.map((pot, i) => (
              <div key={i} className="sidepot-item">
                {i === 0 ? 'Bote principal' : `Bote lateral ${i}`}: ${pot.amount}
              </div>
            ))}
          </div>
        )}

        {roomPhase === 'showdown' && gameState?.lastHand && (
          <div className="table-result">
            <span className="result-winner">
              🏆 {gameState.lastHand.winners.map(w => w.name).join(', ')} ganó ${gameState.lastHand.pot}
            </span>
            <span className="result-hand">
              {gameState.lastHand.potDistributions && gameState.lastHand.potDistributions.length > 1
                ? gameState.lastHand.potDistributions.map((pd, i) => (
                    <span key={i}>
                      {i > 0 && ' | '}{pd.winners.map(w => w.name).join(', ')}: {pd.handName} (${pd.amount})
                    </span>
                  ))
                : (gameState.lastHand.handName || gameState.lastHand.potDistributions?.[0]?.handName)
              }
              {gameState.lastHand.winners.length > 1 && ' (empate)'}
            </span>
          </div>
        )}

        {roomPhase === 'game_over' && (
          <div className="table-result">
            <span className="result-winner">🏆 ¡Partida terminada!</span>
            {gameState?.players && (
              <div className="result-final-stacks">
                {[...gameState.players].sort((a, b) => b.chips - a.chips).map((p, i) => (
                  <div key={p.id} className={`result-final-row ${p.id === playerId ? 'result-final-me' : ''}`}>
                    <span>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}
                    </span>
                    <span className="result-final-chips">${p.chips}</span>
                    {gameState.playerStats?.[p.id] && (
                      <span className="result-final-stats">
                        Manos: {gameState.playerStats[p.id].handsPlayed} |
                        Ganadas: {gameState.playerStats[p.id].handsWon} |
                        All-ins: {gameState.playerStats[p.id].allIns}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isHost && <div className="waiting-hint">Presiona "Nueva Partida" para jugar otra vez</div>}
          </div>
        )}

        {lastAction && lastAction.type === 'error' && (
          <div className="table-toast error-toast">{lastAction.text}</div>
        )}
        {lastAction && lastAction.type === 'info' && (
          <div className="table-toast info-toast">{lastAction.text}</div>
        )}

        {roomPhase === 'showdown' && (
          <div className="table-next-hand-hint">Nueva mano en breve...</div>
        )}

        {isMyTurn && me && (
          <>
            {!me.folded && !me.allIn && (
              <div className="table-tip">
                💡 {getPhaseTip(roomPhase, facingBet, canCheckFn(me, gameState))}
              </div>
            )}
            <ActionButtons
              gameState={gameState}
              playerId={playerId}
              onAction={handleAction}
              onShowSlider={() => setShowSlider(true)}
              timer={timer}
              confirmFold={confirmFold}
              onConfirmFold={() => performAction('fold')}
              onCancelFold={() => setConfirmFold(false)}
            />
          </>
        )}

        {showSlider && me && (
          <BetSlider
            min={Math.min(gameState.currentBet + gameState.minRaise, me.chips + me.bet)}
            max={me.chips + me.bet}
            chips={me.chips}
            onConfirm={handleSliderConfirm}
            onCancel={() => setShowSlider(false)}
          />
        )}

        {confirmFold && (
          <div className="modal-overlay" onClick={() => setConfirmFold(false)}>
            <div className="modal-content fold-confirm" onClick={e => e.stopPropagation()}>
              <h3>¿Retirarse?</h3>
              <p>Si te retiras, pierdes lo apostado en esta mano.</p>
              <div className="config-actions">
                <button className="action-btn action-fold" onClick={() => performAction('fold')}>Sí, retirarme</button>
                <button className="action-btn action-check" onClick={() => setConfirmFold(false)}>No, seguir</button>
              </div>
            </div>
          </div>
        )}

        {lastActionText && (
          <div className="table-action-text">{lastActionText}</div>
        )}
      </div>

      <HandHistory
        handHistory={gameState?.handHistory}
        playerId={playerId}
      />

      {showTutorial && <Tutorial onClose={() => { setShowTutorial(false); sessionStorage.setItem('pkergrid_tutorial_done', '1') }} />}

      {showConfig && gameState?.config && (
        <RoomConfig
          config={gameState.config}
          onSave={handleSaveConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      {roomPhase === 'waiting' && (
        <div className="table-share-buttons">
          <button className="btn btn-secondary btn-sm" onClick={handleShareWhatsApp}>WhatsApp</button>
          <button className="btn btn-secondary btn-sm" onClick={handleShareTelegram}>Telegram</button>
        </div>
      )}

      <Chat
        messages={chatMessages}
        onSend={handleSendMessage}
        playerName={name}
      />
    </div>
  )
}
