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
} from './roomManager.js'
import {
  canStartGame,
  startGame,
  processAction,
  startNewHand,
  getPublicGameState,
  autoFoldPlayer,
} from './gameEngine.js'

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

io.on('connection', (socket) => {
  let currentRoomCode = null
  let currentPlayerId = null

  socket.on('create_room', ({ name }, callback) => {
    const room = createRoom()
    const id = uuidv4()
    const player = new Player(id, name)
    player.isHost = true
    room.hostId = id
    room.players.push(player)

    currentRoomCode = room.code
    currentPlayerId = id

    socket.join(room.code)
    socket.data.playerId = id
    socket.data.roomCode = room.code

    callback({
      success: true,
      roomCode: room.code,
      playerId: id,
      players: room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId,
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

    socket.join(roomCode)
    socket.data.playerId = id
    socket.data.roomCode = roomCode

    callback({
      success: true,
      roomCode: result.room.code,
      playerId: id,
      players: result.room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === result.room.hostId,
      })),
    })

    socket.to(roomCode).emit('room_update', {
      players: result.room.players.map(p => ({
        id: p.id, name: p.name, chips: p.chips, isHost: p.id === result.room.hostId,
      })),
    })
  })

  socket.on('start_game', (_, callback) => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room) return
    if (room.hostId !== currentPlayerId) {
      callback({ success: false, error: 'Solo el anfitrión puede iniciar' })
      return
    }

    if (room.phase === 'game_over') {
      room.players.forEach(p => { p.chips = 1000 })
      room.game = null
      room.lastHand = null
      room.phase = 'waiting'
    }

    if (!canStartGame(room)) {
      callback({ success: false, error: 'Se necesitan al menos 2 jugadores' })
      return
    }

    startGame(room)

    room.players.forEach(p => {
      io.to(currentRoomCode).emit('game_state', getPublicGameState(room, p.id))
    })

    callback({ success: true })
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

    if (room.phase === 'showdown') {
      room.players.forEach(p => {
        io.to(currentRoomCode).emit('game_state', getPublicGameState(room, p.id))
      })

      if (room.phase !== 'game_over') {
        setTimeout(() => {
          if (room.phase === 'game_over') return
          const started = startNewHand(room)
          if (!started) {
            room.phase = 'game_over'
          }
          room.players.forEach(p => {
            io.to(currentRoomCode).emit('game_state', getPublicGameState(room, p.id))
          })
        }, 6000)
      }
    } else if (room.phase === 'game_over') {
      room.players.forEach(p => {
        io.to(currentRoomCode).emit('game_state', getPublicGameState(room, p.id))
      })
    } else {
      room.players.forEach(p => {
        io.to(currentRoomCode).emit('game_state', getPublicGameState(room, p.id))
      })
    }

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

  socket.on('disconnect', () => {
    if (currentRoomCode && currentPlayerId) {
      const room = getRoom(currentRoomCode)
      if (room) {
        if (room.game && room.phase === 'playing') {
          autoFoldPlayer(room, currentPlayerId)
          room.players.forEach(p => {
            io.to(currentRoomCode).emit('game_state', getPublicGameState(room, p.id))
          })
        }

        leaveRoom(currentRoomCode, currentPlayerId)

        if (room.players.length > 0) {
          socket.to(currentRoomCode).emit('room_update', {
            players: room.players.map(p => ({
              id: p.id, name: p.name, chips: p.chips, isHost: p.id === room.hostId,
            })),
          })
          socket.to(currentRoomCode).emit('player_disconnected', { playerId: currentPlayerId })
        }
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
