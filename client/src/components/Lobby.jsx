import { useState } from 'react'

export default function Lobby({ emit, connected, onJoin }) {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  function handleCreate() {
    if (!name.trim()) {
      setError('Escribe un nombre')
      return
    }
    setCreating(true)
    setError('')
    emit('create_room', { name: name.trim() }, (response) => {
      setCreating(false)
      if (response.success) {
        onJoin({
          playerId: response.playerId,
          roomCode: response.roomCode,
          players: response.players,
          name: name.trim(),
        })
      } else {
        setError(response.error || 'Error al crear la sala')
      }
    })
  }

  function handleJoin() {
    if (!name.trim()) {
      setError('Escribe un nombre')
      return
    }
    if (!roomCode.trim()) {
      setError('Escribe el código de la sala')
      return
    }
    setJoining(true)
    setError('')
    emit('join_room', { name: name.trim(), roomCode: roomCode.trim().toUpperCase() }, (response) => {
      setJoining(false)
      if (response.success) {
        onJoin({
          playerId: response.playerId,
          roomCode: response.roomCode,
          players: response.players,
          name: name.trim(),
        })
      } else {
        setError(response.error || 'Error al unirse')
      }
    })
  }

  return (
    <div className="lobby">
      <div className="lobby-connection">
        <span className={`conn-dot ${connected ? 'conn-on' : 'conn-off'}`} />
        {connected ? 'Conectado' : 'Desconectado...'}
      </div>
      <div className="lobby-card">
        <h1 className="lobby-title">♠ Pkergrid ♥</h1>
        <p className="lobby-subtitle">Texas Hold'em Online — Juega con amigos</p>

        <div className="lobby-input-group">
          <label>Tu nombre</label>
          <input
            type="text"
            placeholder="Ej: Neo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            onKeyDown={(e) => e.key === 'Enter' && (roomCode ? handleJoin() : handleCreate())}
          />
        </div>

        <div className="lobby-buttons">
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !connected}>
            {creating ? 'Creando...' : 'Crear Sala'}
          </button>
        </div>

        <div className="lobby-divider"><span>o</span></div>

        <div className="lobby-input-group">
          <label>Código de sala</label>
          <input
            type="text"
            placeholder="ABCD"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            style={{ textTransform: 'uppercase', letterSpacing: '0.5em', textAlign: 'center' }}
          />
        </div>

        <button className="btn btn-secondary" onClick={handleJoin} disabled={joining || !connected}>
          {joining ? 'Uniéndose...' : 'Unirse a Sala'}
        </button>

        {error && <p className="lobby-error">{error}</p>}
      </div>
    </div>
  )
}
