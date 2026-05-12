import { useState, useCallback } from 'react'
import Card from './Card.jsx'
import PlayerSeat from './PlayerSeat.jsx'
import ActionButtons from './ActionButtons.jsx'
import BetSlider from './BetSlider.jsx'
import Chat from './Chat.jsx'

export default function PokerTable({ room, onLeave }) {
  const { playerId, roomCode, name, emit } = room
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState(room.players)
  const [showSlider, setShowSlider] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [chatMessages, setChatMessages] = useState([])

  const onGameState = useCallback((state) => {
    setGameState(state)
    if (state.players) setPlayers(state.players)
  }, [])

  const onRoomUpdate = useCallback((data) => {
    if (data.players) setPlayers(data.players)
  }, [])

  const onChatMessage = useCallback((data) => {
    setChatMessages(prev => [...prev, data])
  }, [])

  const onPlayerDisconnected = useCallback(() => {}, [])

  emit.onGameState = onGameState
  emit.onRoomUpdate = onRoomUpdate
  emit.onChatMessage = onChatMessage
  emit.onPlayerDisconnected = onPlayerDisconnected

  const roomPhase = gameState?.phase || 'waiting'

  function handleStart() {
    emit('start_game', {}, (response) => {
      if (!response.success) {
        alert(response.error)
      }
    })
  }

  function handleAction(action, amount) {
    if (action === 'raise' && !amount) {
      setShowSlider(true)
      return
    }
    emit('player_action', { action, amount }, (response) => {
      if (!response.success) {
        alert(response.error)
      }
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

  function handleLeave() {
    onLeave()
  }

  const me = gameState
    ? gameState.players.find(p => p.id === playerId)
    : players.find(p => p.id === playerId)

  const visiblePlayers = gameState?.players || []
  const communityCards = gameState?.communityCards || []
  const isHost = players.find(p => p.id === playerId)?.isHost
  const myCards = gameState?.myCards || []

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
          <button className="btn btn-secondary btn-sm" onClick={handleLeave}>
            Salir
          </button>
        </div>
      </div>

      <div className="table-felt">
        <div className="table-phase">
          {phaseNames[roomPhase] || roomPhase}
          {gameState && <span className="table-pot">Bote: ${gameState.pot}</span>}
        </div>

        <div className="table-players">
          {visiblePlayers.map((p, i) => (
            <PlayerSeat
              key={p.id}
              player={p}
              isCurrent={gameState?.currentPlayerId === p.id}
              isDealer={gameState?.dealerIndex === i}
              position={i}
            />
          ))}
        </div>

        <div className="table-community">
          {communityCards.length === 0 && roomPhase === 'waiting' && (
            <div className="table-waiting">Esperando que el anfitrión inicie la partida...</div>
          )}
          {communityCards.length > 0 && communityCards.map((card, i) => (
            <Card key={i} card={card} />
          ))}
          {communityCards.length === 0 && roomPhase !== 'waiting' && (
            <div className="table-waiting-placeholder">Esperando cartas comunitarias</div>
          )}
        </div>

        {roomPhase === 'showdown' && gameState?.lastHand && (
          <div className="table-result">
            <span className="result-winner">
              {gameState.lastHand.winners.map(w => w.name).join(', ')} ganó ${gameState.lastHand.pot}
            </span>
            <span className="result-hand">{gameState.lastHand.handName}</span>
          </div>
        )}

        {roomPhase === 'game_over' && (
          <div className="table-result">
            <span className="result-winner">¡Partida terminada!</span>
          </div>
        )}

        {me && !me.folded && !me.allIn && roomPhase !== 'waiting' && roomPhase !== 'showdown' && roomPhase !== 'game_over' && (
          <ActionButtons
            gameState={gameState}
            playerId={playerId}
            onAction={handleAction}
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
