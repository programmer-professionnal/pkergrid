import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { SERVER_URL } from '../config.js'

export default function useSocket({ onGameState, onRoomUpdate, onChatMessage, onPlayerDisconnected }) {
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('Conectado al servidor')
    })

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor')
    })

    socket.on('connect_error', (err) => {
      console.log('Error de conexión:', err.message)
    })

    socket.on('game_state', (state) => {
      if (onGameState) onGameState(state)
    })

    socket.on('room_update', (data) => {
      if (onRoomUpdate) onRoomUpdate(data)
    })

    socket.on('chat_message', (data) => {
      if (onChatMessage) onChatMessage(data)
    })

    socket.on('player_disconnected', (data) => {
      if (onPlayerDisconnected) onPlayerDisconnected(data)
    })

    socket.on('ping_server', () => {
      socket.emit('pong_server')
    })

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('client_ping')
      }
    }, 60000)

    socketRef.current = socket

    return () => {
      clearInterval(pingInterval)
      socket.disconnect()
    }
  }, [])

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data, callback)
    }
  }, [])

  return { emit, socket: socketRef.current }
}
