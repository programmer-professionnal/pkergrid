import { useState, useEffect } from 'react'
import useSocket from './hooks/useSocket.js'
import Lobby from './components/Lobby.jsx'
import PokerTable from './components/PokerTable.jsx'

export default function App() {
  const [room, setRoom] = useState(() => {
    const saved = sessionStorage.getItem('pkergrid_session')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return null
  })
  const { emit, setCallbacks, connected } = useSocket()

  useEffect(() => {
    if (room) {
      sessionStorage.setItem('pkergrid_session', JSON.stringify(room))
    } else {
      sessionStorage.removeItem('pkergrid_session')
    }
  }, [room])

  function handleJoin(data) {
    setRoom(data)
  }

  function handleLeave() {
    setRoom(null)
  }

  if (!room) {
    return <Lobby emit={emit} connected={connected} onJoin={handleJoin} />
  }

  return (
    <PokerTable
      room={room}
      emit={emit}
      setCallbacks={setCallbacks}
      connected={connected}
      onLeave={handleLeave}
    />
  )
}
