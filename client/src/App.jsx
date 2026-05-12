import { useState } from 'react'
import Lobby from './components/Lobby.jsx'
import PokerTable from './components/PokerTable.jsx'

export default function App() {
  const [room, setRoom] = useState(null)

  if (!room) {
    return <Lobby onJoin={(data) => setRoom(data)} />
  }

  return (
    <PokerTable
      room={room}
      onLeave={() => setRoom(null)}
    />
  )
}
