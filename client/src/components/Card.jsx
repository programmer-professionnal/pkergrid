const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
}

const SUIT_COLORS = {
  h: '#e74c3c',
  d: '#e74c3c',
  c: '#1a1a1a',
  s: '#1a1a1a',
}

export default function Card({ card, hidden, small, highlight, animationDelay = 0 }) {
  if (!card) return null

  if (hidden) {
    return (
      <div
        className={`card card-back ${small ? 'card-small' : ''} card-anim-in`}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <div className="card-back-pattern" />
      </div>
    )
  }

  const symbol = SUIT_SYMBOLS[card.suit]
  const color = SUIT_COLORS[card.suit]
  const isTen = card.rank === '10'

  return (
    <div
      className={`card card-face ${small ? 'card-small' : ''} ${highlight ? 'card-highlight' : ''} card-anim-in`}
      style={{ color, animationDelay: `${animationDelay}ms` }}
    >
      <div className={`card-corner card-corner-top ${isTen ? 'card-corner-wide' : ''}`}>
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{symbol}</span>
      </div>
      <div className="card-center">
        <span className="card-center-suit">{symbol}</span>
      </div>
      <div className={`card-corner card-corner-bottom ${isTen ? 'card-corner-wide' : ''}`}>
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{symbol}</span>
      </div>
    </div>
  )
}
