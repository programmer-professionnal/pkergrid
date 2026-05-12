import { v4 as uuidv4 } from 'uuid'

const rooms = new Map()

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return rooms.has(code) ? generateCode() : code
}

export function createRoom() {
  const code = generateCode()
  const room = {
    code,
    id: uuidv4(),
    players: [],
    phase: 'waiting',
    game: null,
    hostId: null,
    chat: [],
  }
  rooms.set(code, room)
  return room
}

export function getRoom(code) {
  return rooms.get(code)
}

export function joinRoom(code, player) {
  const room = getRoom(code)
  if (!room) return { error: 'La sala no existe' }
  if (room.phase !== 'waiting') return { error: 'La partida ya comenzó' }
  if (room.players.length >= 9) return { error: 'Sala llena (máx 9 jugadores)' }
  if (room.players.find(p => p.id === player.id)) {
    return { error: 'Ya estás en la sala' }
  }

  room.players.push(player)
  return { room }
}

export function leaveRoom(code, playerId) {
  const room = getRoom(code)
  if (!room) return

  room.players = room.players.filter(p => p.id !== playerId)

  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id
  }

  if (room.players.length === 0) {
    rooms.delete(code)
  }
}

export function addChat(code, playerId, playerName, message) {
  const room = getRoom(code)
  if (!room) return
  room.chat.push({
    id: uuidv4(),
    playerId,
    playerName,
    message,
    timestamp: Date.now(),
  })
  if (room.chat.length > 100) {
    room.chat = room.chat.slice(-100)
  }
}

export function deleteRoom(code) {
  rooms.delete(code)
}

export function getRoomByPlayerId(playerId) {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === playerId)) return room
  }
  return null
}
