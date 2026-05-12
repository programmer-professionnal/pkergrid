import { useState, useEffect, useCallback, useRef } from 'react'
import Card from './Card.jsx'
import PlayerSeat from './PlayerSeat.jsx'
import ActionButtons from './ActionButtons.jsx'
import BetSlider from './BetSlider.jsx'
import Chat from './Chat.jsx'
import Tutorial from './Tutorial.jsx'

const TURN_TIMER = 30
const BLIND_LEVELS = [
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 100, big: 200 },
]

export default function PokerTable({ room, emit, setCallbacks, connected, onLeave }) {
  const { playerId, roomCode, name } = room
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState(room.players)
  const [showSlider, setShowSlider] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [timer, setTimer] = useState(null)
  const [blindLevel, setBlindLevel] = useState(0)
  const timerRef = useRef(null)
  const handCountRef = useRef(0)
  const prevPhaseRef = useRef(null)
  const [lastAction, setLastAction] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)

  const onGameState = useCallback((state) => {
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
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimer(null)
    }
  }, [playerId, emit])

  const onRoomUpdate = useCallback((data) => {
    if (data.players) setPlayers(data.players)
  }, [])

  const onChatMessage = useCallback((data) => {
    setChatMessages(prev => [...prev, data])
  }, [])

  const onPlayerDisconnected = useCallback(() => {}, [])

  useEffect(() => {
    setCallbacks({ onGameState, onRoomUpdate, onChatMessage, onPlayerDisconnected })
  }, [setCallbacks, onGameState, onRoomUpdate, onChatMessage, onPlayerDisconnected])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = gameState?.phase

    if (gameState?.phase === 'preflop') {
      if (prev === 'game_over' || prev === 'waiting' || prev === null) {
        handCountRef.current = 0
        setBlindLevel(0)
      }
      handCountRef.current++
      if (handCountRef.current > 1 && handCountRef.current % 5 === 0) {
        setBlindLevel(prev => Math.min(prev + 1, BLIND_LEVELS.length - 1))
      }
    }
  }, [gameState?.phase])

  const roomPhase = gameState?.phase || 'waiting'
  const blinds = BLIND_LEVELS[blindLevel]

  function handleAction(action, amount) {
    if (action === 'raise' && !amount) {
      setShowSlider(true)
      return
    }
    setLastAction(null)
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

  const me = gameState
    ? gameState.players.find(p => p.id === playerId)
    : players.find(p => p.id === playerId)

  const visiblePlayers = gameState?.players || []
  const communityCards = gameState?.communityCards || []
  const currentPlayerId = gameState?.currentPlayerId
  const isHost = players.find(p => p.id === playerId)?.isHost

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
  const canCheck = (p, g) => p && g ? p.bet >= g.currentBet : false

  function getPhaseTip(phase, callAmount, canCheckVal) {
    if (callAmount > 0) return `Igualar cuesta $${callAmount}. Si tus cartas son malas, es mejor retirarse.`
    if (phase === 'preflop' && !canCheckVal) return `Tienes que igualar o retirarte. Si tus cartas son bajas (2-7, 3-8), retírate.`
    if (canCheckVal) return `Puedes verificar gratis. No apuestes si no tienes una mano fuerte.`
    if (phase === 'preflop') return `Mira tus cartas. Manos fuertes: pares altos (AA, KK), As+Rey, As+Reina.`
    return `Evalúa las cartas comunitarias. ¿Crees que tienes la mejor mano?`
  }

  if (timer !== null && timer <= 5) {
    document.documentElement.style.setProperty('--timer-urgent', '#e74c3c')
  } else {
    document.documentElement.style.setProperty('--timer-urgent', '#2ecc71')
  }

  return (
    <div className="table-container">
      <div className="table-topbar">
        <div className="topbar-left">
          <span className="topbar-code" onClick={handleCopyCode}>
            Sala: {roomCode}
          </span>
          {copyFeedback && <span className="copy-feedback">¡Copiado!</span>}
          <span className="topbar-players-count">
            {players.filter(p => p.chips > 0 || !gameState).length}/{players.length}
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
          <button className="btn btn-secondary btn-sm" onClick={onLeave}>
            Salir
          </button>
        </div>
      </div>

      <div className="table-felt">
        <div className="table-phase">
          <span>{phaseNames[roomPhase] || roomPhase}</span>
          {gameState && gameState.phase !== 'waiting' && gameState.phase !== 'game_over' && (
            <>
              <span className="table-pot">Bote: ${gameState.pot}</span>
              <span className="table-blinds">SB ${blinds.small} / BB ${blinds.big}</span>
              {facingBet > 0 && me && !me.folded && !me.allIn && roomPhase !== 'showdown' && (
                <span className="table-to-call">Para igualar: ${facingBet}</span>
              )}
            </>
          )}
        </div>

        {currentPlayerId && currentPlayerId !== playerId && roomPhase !== 'waiting' && roomPhase !== 'showdown' && roomPhase !== 'game_over' && (
          <div className="table-waiting-turn">
            Esperando a {visiblePlayers.find(p => p.id === currentPlayerId)?.name || 'otro jugador'}...
          </div>
        )}

        <div className="table-players">
          {visiblePlayers.map((p, i) => {
            const game = gameState
            const dealerIdx = game?.dealerIndex ?? -1
            const activePlayers = gameState?.players || []
            const sbIdx = dealerIdx >= 0 ? (dealerIdx + 1) % activePlayers.length : -1
            const bbIdx = dealerIdx >= 0 ? (dealerIdx + 2) % activePlayers.length : -1
            const playerIdx = activePlayers.findIndex(ap => ap.id === p.id)

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
              />
            )
          })}
        </div>

        <div className="table-community">
          {communityCards.length === 0 && roomPhase === 'waiting' && (
            <div className="table-waiting">
              <div className="waiting-title">Esperando jugadores...</div>
              <div className="waiting-sub">Comparte el código <strong>{roomCode}</strong> con tus amigos</div>
              <div className="waiting-players-list">
                {players.map(p => (
                  <div key={p.id} className="waiting-player-item">
                    <span className="waiting-player-icon">{p.isHost ? '👑' : '🃏'}</span>
                    <span>{p.name}</span>
                    {p.isHost && <span className="waiting-player-host">Anfitrión</span>}
                  </div>
                ))}
              </div>
              {isHost
                ? <div className="waiting-hint">Presiona "Iniciar Partida" cuando estén listos</div>
                : <div className="waiting-hint">Esperando a que el anfitrión inicie...</div>
              }
            </div>
          )}
          {communityCards.map((card, i) => (
            <Card key={i} card={card} highlight={i === communityCards.length - 1 && roomPhase !== 'showdown'} />
          ))}
          {communityCards.length === 0 && roomPhase !== 'waiting' && roomPhase !== 'game_over' && (
            <div className="table-waiting-placeholder">Esperando cartas...</div>
          )}
        </div>

        {roomPhase === 'showdown' && gameState?.lastHand && (
          <div className="table-result">
            <span className="result-winner">
              🏆 {gameState.lastHand.winners.map(w => w.name).join(', ')} ganó ${gameState.lastHand.pot}
            </span>
            <span className="result-hand">
              {gameState.lastHand.handName}
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

        {roomPhase === 'showdown' && (
          <div className="table-next-hand-hint">Nueva mano en breve...</div>
        )}

        {me && !me.folded && !me.allIn && roomPhase !== 'waiting' && roomPhase !== 'showdown' && roomPhase !== 'game_over' && (
          <>
            <div className="table-tip">
              💡 {getPhaseTip(roomPhase, facingBet, canCheck(me, gameState))}
            </div>
            <ActionButtons
              gameState={gameState}
              playerId={playerId}
              onAction={handleAction}
              onShowSlider={() => setShowSlider(true)}
              timer={timer}
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
      </div>

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

      <Chat
        messages={chatMessages}
        onSend={handleSendMessage}
        playerName={name}
      />
    </div>
  )
}
