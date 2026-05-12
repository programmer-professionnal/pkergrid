const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
}

const SUIT_COLORS = {
  h: 'red',
  d: 'red',
  c: 'black',
  s: 'black',
}

export default function Card({ card, hidden, small, highlight }) {
  if (!card) return null

  if (hidden) {
    return (
      <div className={`card card-back ${small ? 'card-small' : ''}`}>
        <div className="card-back-pattern" />
      </div>
    )
  }

  const symbol = SUIT_SYMBOLS[card.suit]
  const color = SUIT_COLORS[card.suit]

  return (
    <div
      className={`card card-face ${small ? 'card-small' : ''} ${highlight ? 'card-highlight' : ''}`}
      style={{ color }}
    >
      <div className="card-corner card-corner-top">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{symbol}</span>
      </div>
      <div className="card-center">
        <span className="card-center-suit">{symbol}</span>
      </div>
      <div className="card-corner card-corner-bottom">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{symbol}</span>
      </div>
    </div>
  )
}
