import { useState, useEffect, useCallback, useRef } from 'react'
import Card from './Card.jsx'
import PlayerSeat from './PlayerSeat.jsx'
import ActionButtons from './ActionButtons.jsx'
import BetSlider from './BetSlider.jsx'
import Chat from './Chat.jsx'

const TURN_TIMER = 30
const BLIND_LEVELS = [
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 100, big: 200 },
]

export default function PokerTable({ room, emit, setCallbacks, onLeave }) {
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

  const onGameState = useCallback((state) => {
    setGameState(state)
    if (state.players) setPlayers(state.players)

    if (state.currentPlayerId === playerId && state.phase !== 'showdown' && state.phase !== 'waiting') {
      setTimer(TURN_TIMER)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            emit('player_action', { action: 'fold' }, () => {})
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
    if (gameState?.phase === 'preflop') {
      handCountRef.current++
      if (handCountRef.current > 1 && handCountRef.current % 5 === 0) {
        setBlindLevel(prev => Math.min(prev + 1, BLIND_LEVELS.length - 1))
      }
    }
  }, [gameState?.phase])

  const roomPhase = gameState?.phase || 'waiting'
  const blinds = BLIND_LEVELS[blindLevel]

  function handleStart() {
    emit('start_game', {}, (response) => {
      if (!response.success) alert(response.error)
    })
  }

  function handleAction(action, amount) {
    if (action === 'raise' && !amount) {
      setShowSlider(true)
      return
    }
    emit('player_action', { action, amount }, (response) => {
      if (!response.success) alert(response.error)
    })
  }

  function handleSliderConfirm(amount) {
    setShowSlider(false)
    emit('player_action', { action: 'raise', amount }, () => {})
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  function handleSendMessage(text) {
    emit('send_message', { message: text }, () => {})
  }

  function handleNewGame() {
    emit('start_game', {}, (response) => {
      if (!response.success) alert(response.error)
    })
  }

  const me = gameState
    ? gameState.players.find(p => p.id === playerId)
    : players.find(p => p.id === playerId)

  const visiblePlayers = gameState?.players || []
  const communityCards = gameState?.communityCards || []
  const isHost = players.find(p => p.id === playerId)?.isHost
  const currentPlayerId = gameState?.currentPlayerId

  const phaseNames = {
    waiting: 'Esperando jugadores...',
    preflop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
    game_over: 'Juego terminado',
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
            {visiblePlayers.length} jugador{visiblePlayers.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="topbar-center">
          <span className="topbar-title">♠ Pkergrid ♥</span>
        </div>
        <div className="topbar-right">
          {roomPhase === 'waiting' && isHost && (
            <button className="btn btn-primary btn-sm" onClick={handleStart}>
              Iniciar Partida
            </button>
          )}
          {roomPhase === 'game_over' && isHost && (
            <button className="btn btn-primary btn-sm" onClick={handleNewGame}>
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
          {gameState && gameState.phase !== 'waiting' && (
            <>
              <span className="table-pot">Bote: ${gameState.pot}</span>
              <span className="table-blinds">SB ${blinds.small} / BB ${blinds.big}</span>
            </>
          )}
          {currentPlayerId && currentPlayerId !== playerId && roomPhase !== 'waiting' && roomPhase !== 'showdown' && roomPhase !== 'game_over' && (
            <span className="table-waiting-turn">
              Esperando a {visiblePlayers.find(p => p.id === currentPlayerId)?.name || 'otro jugador'}...
            </span>
          )}
        </div>

        <div className="table-players">
          {visiblePlayers.map((p, i) => {
            const game = gameState
            const dealerIdx = game?.dealerIndex ?? -1
            const activePlayers = gameState?.players || []
            const sbIdx = dealerIdx >= 0 ? (dealerIdx + 1) % activePlayers.length : -1
            const bbIdx = dealerIdx >= 0 ? (dealerIdx + 2) % activePlayers.length : -1
            const playerIdx = activePlayers.findIndex(ap => ap.id === p.id)

            return (
              <PlayerSeat
                key={p.id}
                player={p}
                isCurrent={game?.currentPlayerId === p.id}
                isDealer={playerIdx === dealerIdx && dealerIdx >= 0}
                isSmallBlind={playerIdx === sbIdx && sbIdx >= 0}
                isBigBlind={playerIdx === bbIdx && bbIdx >= 0}
                isMe={p.id === playerId}
              />
            )
          })}
        </div>

        <div className="table-community">
          {communityCards.length === 0 && roomPhase === 'waiting' && (
            <div className="table-waiting">
              <div className="waiting-title">Esperando jugadores...</div>
              <div className="waiting-sub">Comparte el código de sala con tus amigos</div>
              {isHost && <div className="waiting-hint">Presiona "Iniciar Partida" cuando estén listos</div>}
            </div>
          )}
          {communityCards.map((card, i) => (
            <Card key={i} card={card} highlight={i === communityCards.length - 1 && roomPhase !== 'showdown'} />
          ))}
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
                  <div key={p.id} className="result-final-row">
                    <span>{i + 1}º {p.name}</span>
                    <span className="result-final-chips">${p.chips}</span>
                  </div>
                ))}
              </div>
            )}
            {isHost && <div className="waiting-hint">Presiona "Nueva Partida" para jugar otra vez</div>}
          </div>
        )}

        {me && !me.folded && !me.allIn && roomPhase !== 'waiting' && roomPhase !== 'showdown' && roomPhase !== 'game_over' && (
          <ActionButtons
            gameState={gameState}
            playerId={playerId}
            onAction={handleAction}
            timer={timer}
          />
        )}

        {showSlider && (
          <BetSlider
            min={gameState.currentBet + gameState.minRaise}
            max={me.chips + me.bet}
            chips={me.chips}
            onConfirm={handleSliderConfirm}
            onCancel={() => setShowSlider(false)}
          />
        )}
      </div>

      <Chat
        messages={chatMessages}
        onSend={handleSendMessage}
        playerName={name}
      />
    </div>
  )
}
