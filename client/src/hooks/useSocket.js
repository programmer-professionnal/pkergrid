import { useEffect, useRef, useState, useCallback } from 'react'
import { SERVER_URL } from '../config.js'
import { io } from 'socket.io-client'

export default function useSocket() {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const callbacksRef = useRef({})
  const reconnectAttempted = useRef(false)

  const setCallbacks = useCallback((cbs) => {
    callbacksRef.current = cbs
  }, [])

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)

      const saved = sessionStorage.getItem('pkergrid_session')
      if (saved && !reconnectAttempted.current) {
        reconnectAttempted.current = true
        try {
          const { playerId, roomCode } = JSON.parse(saved)
          if (playerId && roomCode) {
            socket.emit('reconnect_player', { playerId, roomCode }, (response) => {
              if (response && response.success) {
                callbacksRef.current.onReconnected?.(response)
              } else {
                sessionStorage.removeItem('pkergrid_session')
              }
            })
          }
        } catch {}
      }
    })

    socket.on('disconnect', () => setConnected(false))

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

    socket.on('config_updated', (data) => {
      callbacksRef.current.onConfigUpdated?.(data)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data, callback)
    }
  }, [])

  return { emit, setCallbacks, connected }
}
