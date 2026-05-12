import { useState } from 'react'
import useSocket from './hooks/useSocket.js'
import Lobby from './components/Lobby.jsx'
import PokerTable from './components/PokerTable.jsx'

export default function App() {
  const [room, setRoom] = useState(null)
  const { emit, setCallbacks } = useSocket()

  if (!room) {
    return <Lobby emit={emit} onJoin={(data) => setRoom(data)} />
  }

  return (
    <PokerTable
      room={room}
      emit={emit}
      setCallbacks={setCallbacks}
      onLeave={() => setRoom(null)}
    />
  )
}
