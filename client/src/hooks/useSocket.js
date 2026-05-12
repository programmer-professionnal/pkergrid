import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'
import { SERVER_URL } from '../config.js'

export default function useSocket() {
  const socketRef = useRef(null)
  const callbacksRef = useRef({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('connect_error', () => {
      setConnected(false)
    })

    socket.on('game_state', (state) => {
      callbacksRef.current.onGameState?.(state)
    })

    socket.on('room_update', (data) => {
      callbacksRef.current.onRoomUpdate?.(data)
    })

    socket.on('chat_message', (data) => {
      callbacksRef.current.onChatMessage?.(data)
    })

    socket.on('player_disconnected', (data) => {
      callbacksRef.current.onPlayerDisconnected?.(data)
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

  const setCallbacks = useCallback((callbacks) => {
    callbacksRef.current = callbacks
  }, [])

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data, callback)
    }
  }, [])

  return { emit, setCallbacks, connected }
}
