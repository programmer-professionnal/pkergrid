import { useState, useRef, useEffect } from 'react'

export default function Chat({ messages, onSend, playerName }) {
  const [text, setText] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="chat">
      <div className="chat-header">Chat</div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.playerName === playerName ? 'chat-msg-self' : ''}`}>
            <span className="chat-msg-name">{msg.playerName}:</span>
            <span className="chat-msg-text">{msg.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  )
}
