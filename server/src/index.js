import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { Player } from './player.js'
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  addChat,
  getRoomByPlayerId,
} from './roomManager.js'
import {
  canStartGame,
  startGame,
  processAction,
  startNewHand,
  getPublicGameState,
  autoFoldPlayer,
  DEFAULT_CONFIG,
} from './gameEngine.js'
import { createBotPlayer, decideBotAction } from './botManager.js'

const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.get('/', (req, res) => res.send('Pkergrid server running'))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
})

const playerSockets = new Map()

const showdownTimers = new Map()

function broadcastGameState(roomCode) {
  const room = getRoom(roomCode)
  if (!room) return
  room.players.forEach(p => {
    io.to(roomCode).emit('game_state', getPublicGameState(room, p.id))
  })
  processBotTurns(room)

  if (room.phase === 'showdown' && !showdownTimers.has(roomCode)) {
    const timer = setTimeout(() => {
      showdownTimers.delete(roomCode)
      const r = getRoom(roomCode)
      if (!r || r.phase === 'game_over') return
      if (r.phase === 'showdown') {
        const started = startNewHand(r)
        if (!started) r.phase = 'game_over'
        broadcastGameState(roomCode)
      }
    }, 6000)
    showdownTimers.set(roomCode, timer)
  }
}

io.on('connection', (socket) => {
  let currentRoomCode = null
  let currentPlayerId = null

  socket.on('create_room', ({ name }, callback) => {
    const room = createRoom()
    const id = uuidv4()
    const player = new Player(id, name)
    player.isHost = true
    room.hostId = id
    room.config = { ...DEFAULT_CONFIG }
    room.players.push(player)

    currentRoomCode = room.code
    currentPlayerId = id
    playerSockets.set(id, socket.id)

    socket.join(room.code)
    socket.data.playerId = id
    socket.data.roomCode = room.code

    callback({
      success: true,
      roomCode: room.code,
      playerId: id,
      players: room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
      })),
    })
  })

  socket.on('join_room', ({ name, roomCode }, callback) => {
    const id = uuidv4()
    const player = new Player(id, name)
    const result = joinRoom(roomCode, player)

    if (result.error) {
      callback({ success: false, error: result.error })
      return
    }

    currentRoomCode = roomCode
    currentPlayerId = id
    playerSockets.set(id, socket.id)

    socket.join(roomCode)
    socket.data.playerId = id
    socket.data.roomCode = roomCode

    callback({
      success: true,
      roomCode: result.room.code,
      playerId: id,
      players: result.room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === result.room.hostId, spectator: !!p.spectator,
      })),
    })

    socket.to(roomCode).emit('room_update', {
      players: result.room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === result.room.hostId, spectator: !!p.spectator,
      })),
    })
  })

  socket.on('join_as_spectator', ({ roomCode }, callback) => {
    const room = getRoom(roomCode)
    if (!room) {
      callback({ success: false, error: 'La sala no existe' })
      return
    }

    const id = uuidv4()
    const player = new Player(id, 'Espectador')
    player.spectator = true
    room.players.push(player)

    currentRoomCode = roomCode
    currentPlayerId = id
    playerSockets.set(id, socket.id)

    socket.join(roomCode)
    socket.data.playerId = id
    socket.data.roomCode = roomCode

    callback({
      success: true,
      roomCode,
      playerId: id,
      isSpectator: true,
      players: room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
      })),
    })

    if (room.game) {
      io.to(roomCode).emit('game_state', getPublicGameState(room, id))
    }
  })

  socket.on('reconnect_player', ({ playerId, roomCode }, callback) => {
    const room = getRoom(roomCode)
    if (!room) {
      callback({ success: false, error: 'Sala no encontrada' })
      return
    }

    const player = room.players.find(p => p.id === playerId)
    if (!player) {
      callback({ success: false, error: 'Jugador no encontrado' })
      return
    }

    currentRoomCode = roomCode
    currentPlayerId = playerId
    playerSockets.set(playerId, socket.id)
    player.disconnected = false

    socket.join(roomCode)
    socket.data.playerId = playerId
    socket.data.roomCode = roomCode

    callback({
      success: true,
      roomCode,
      playerId,
      name: player.name,
      players: room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
      })),
    })

    if (room.game) {
      socket.emit('game_state', getPublicGameState(room, playerId))
    }
  })

  socket.on('add_bot', (_, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room || room.hostId !== currentPlayerId) {
      if (callback) callback({ success: false, error: 'Solo el anfitrión' })
      return
    }
    if (room.players.filter(p => !p.spectator).length >= 9) {
      if (callback) callback({ success: false, error: 'Sala llena' })
      return
    }

    const bot = createBotPlayer()
    bot.chips = (room.config || DEFAULT_CONFIG).startingChips
    room.players.push(bot)

    io.to(currentRoomCode).emit('room_update', {
      players: room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
      })),
    })
    if (callback) callback({ success: true, bot })
  })

  socket.on('remove_bots', (_, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room || room.hostId !== currentPlayerId) {
      if (callback) callback({ success: false, error: 'Solo el anfitrión' })
      return
    }

    if (room.phase !== 'waiting' && room.phase !== 'game_over') {
      if (callback) callback({ success: false, error: 'No durante la partida' })
      return
    }

    room.players = room.players.filter(p => !p.isBot)
    if (room.game) {
      room.game.players = room.game.players.filter(p => !p.isBot)
    }

    io.to(currentRoomCode).emit('room_update', {
      players: room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
      })),
    })
    if (callback) callback({ success: true })
  })

  function processBotTurns(room) {
    const game = room.game
    if (!game || room.phase !== 'playing') return

    const BOT_DELAY = 800

    function doBotTurn() {
      if (!game || room.phase !== 'playing') return
      const currentPlayer = game.players[game.currentPlayerIndex]
      if (!currentPlayer || !currentPlayer.isBot || currentPlayer.folded || currentPlayer.allIn) return

      const decision = decideBotAction(
        currentPlayer,
        game,
        game.communityCards,
        game.currentBet,
        game.minRaise,
      )
      if (!decision) return

      const result = processAction(room, currentPlayer.id, decision.action, decision.amount || 0)
      if (!result.error) {
        broadcastGameState(room.code)
      }
    }

    const currentPlayer = game.players[game.currentPlayerIndex]
    if (currentPlayer && currentPlayer.isBot && !currentPlayer.folded && !currentPlayer.allIn) {
      setTimeout(doBotTurn, BOT_DELAY)
    }
  }

  socket.on('start_game', (_, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room) return
    if (room.hostId !== currentPlayerId) {
      callback({ success: false, error: 'Solo el anfitrión puede iniciar' })
      return
    }

    if (room.phase === 'game_over') {
      const config = room.config || DEFAULT_CONFIG
      room.players.forEach(p => {
        if (!p.spectator) p.chips = config.startingChips
      })
      room.game = null
      room.lastHand = null
      room.phase = 'waiting'
    }

    if (!canStartGame(room)) {
      callback({ success: false, error: 'Se necesitan al menos 2 jugadores' })
      return
    }

    startGame(room)
    broadcastGameState(currentRoomCode)
    callback({ success: true })
  })

  socket.on('update_config', ({ config }, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room || room.hostId !== currentPlayerId) {
      callback({ success: false, error: 'Solo el anfitrión puede cambiar la configuración' })
      return
    }

    if (room.phase !== 'waiting' && room.phase !== 'game_over') {
      callback({ success: false, error: 'No se puede cambiar la configuración durante la partida' })
      return
    }

    room.config = {
      startingChips: config.startingChips || DEFAULT_CONFIG.startingChips,
      smallBlind: config.smallBlind || DEFAULT_CONFIG.smallBlind,
      bigBlind: config.bigBlind || DEFAULT_CONFIG.bigBlind,
      blindInterval: config.blindInterval || DEFAULT_CONFIG.blindInterval,
      blindLevels: config.blindLevels || DEFAULT_CONFIG.blindLevels,
    }

    io.to(currentRoomCode).emit('config_updated', { config: room.config })
    callback({ success: true, config: room.config })
  })

  socket.on('player_action', ({ action, amount }, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room || !room.game) return

    const result = processAction(room, currentPlayerId, action, amount)
    if (result.error) {
      callback({ success: false, error: result.error })
      return
    }

    broadcastGameState(currentRoomCode)

    callback({ success: true })
  })

  socket.on('send_message', ({ message }, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room) return
    const player = room.players.find(p => p.id === currentPlayerId)
    if (!player) return

    addChat(currentRoomCode, currentPlayerId, player.name, message)
    io.to(currentRoomCode).emit('chat_message', {
      playerName: player.name,
      message,
      timestamp: Date.now(),
    })
    if (callback) callback({ success: true })
  })

  socket.on('leave_room', (_, callback) => {
    if (currentRoomCode && currentPlayerId) {
      const room = getRoom(currentRoomCode)
      if (room) {
        leaveRoom(currentRoomCode, currentPlayerId)
        playerSockets.delete(currentPlayerId)
        socket.leave(currentRoomCode)

        if (room.players.length > 0) {
          io.to(currentRoomCode).emit('room_update', {
            players: room.players.map(p => ({
              id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
            })),
          })
        }
        if (callback) callback({ success: true })
      }
    }
  })

  socket.on('disconnect', () => {
    if (currentRoomCode && currentPlayerId) {
      const room = getRoom(currentRoomCode)
      if (room) {
        const player = room.players.find(p => p.id === currentPlayerId)
        if (player) {
          player.disconnected = true
          if (!player.spectator) {
            if (room.game && room.phase === 'playing') {
              autoFoldPlayer(room, currentPlayerId)
              broadcastGameState(currentRoomCode)
            }
          }
        }

        playerSockets.delete(currentPlayerId)

        socket.to(currentRoomCode).emit('room_update', {
          players: room.players.map(p => ({
            id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId, spectator: !!p.spectator,
          })),
        })
        socket.to(currentRoomCode).emit('player_disconnected', { playerId: currentPlayerId })
      }
    }
  })
})

setInterval(() => {
  io.emit('ping_server', { timestamp: Date.now() })
}, 300000)

httpServer.listen(PORT, () => {
  console.log(`Pkergrid server running on port ${PORT}`)
})
