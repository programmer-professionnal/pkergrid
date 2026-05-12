import { useState } from 'react'

const HANDS = [
  { name: 'Escalera Real', example: 'A♠ K♠ Q♠ J♠ 10♠', desc: 'As, Rey, Reina, Jota, 10 del mismo palo' },
  { name: 'Escalera de Color', example: '9♥ 8♥ 7♥ 6♥ 5♥', desc: '5 cartas consecutivas del mismo palo' },
  { name: 'Póker', example: 'J♦ J♣ J♥ J♠ 4♣', desc: '4 cartas del mismo valor' },
  { name: 'Full House', example: 'K♠ K♣ K♥ 7♦ 7♣', desc: '3 de un valor + 2 de otro' },
  { name: 'Color', example: 'A♣ 10♣ 7♣ 4♣ 2♣', desc: '5 cartas del mismo palo' },
  { name: 'Escalera', example: '9♣ 8♦ 7♠ 6♥ 5♣', desc: '5 cartas consecutivas' },
  { name: 'Trío', example: 'Q♠ Q♦ Q♣ 8♥ 2♣', desc: '3 cartas del mismo valor' },
  { name: 'Doble Par', example: 'A♠ A♦ 10♣ 10♥ 5♠', desc: '2 pares distintos' },
  { name: 'Par', example: '7♠ 7♦ K♣ 5♥ 3♠', desc: '2 cartas del mismo valor' },
  { name: 'Carta Alta', example: 'A♣ K♦ 10♠ 6♥ 2♣', desc: 'Ninguna combinación, gana la más alta' },
]

export default function Tutorial({ onClose }) {
  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
        <button className="tutorial-close" onClick={onClose}>✕</button>

        <h2>♠ Cómo jugar Pkergrid ♥</h2>

        <section>
          <h3>Objetivo</h3>
          <p>Gana todas las fichas de tus oponentes. En cada mano, el mejor ranking de póker de 5 cartas gana el bote.</p>
        </section>

        <section>
          <h3>⌨️ Controles</h3>
          <div className="tutorial-controls">
            <div><kbd>1</kbd> Retirarse (Fold)</div>
            <div><kbd>2</kbd> Verificar / Igualar</div>
            <div><kbd>3</kbd> Subir (abre slider)</div>
            <div><kbd>4</kbd> All-in</div>
            <div><kbd>Enter</kbd> Confirmar subida</div>
            <div><kbd>Esc</kbd> Cancelar subida</div>
          </div>
        </section>

        <section>
          <h3>📋 Cómo se juega una mano</h3>
          <ol>
            <li>Cada jugador recibe <strong>2 cartas privadas</strong>.</li>
            <li>Ronda de apuestas <strong>Pre-Flop</strong>.</li>
            <li>Se reparten <strong>3 cartas comunitarias</strong> (Flop) → otra ronda.</li>
            <li>Se reparte <strong>1 carta</strong> (Turn) → otra ronda.</li>
            <li>Se reparte <strong>1 carta</strong> (River) → ronda final.</li>
            <li>Showdown: quien tenga la mejor mano de 5 cartas gana.</li>
          </ol>
        </section>

        <section>
          <h3>🏆 Rankings de manos</h3>
          <div className="tutorial-hands">
            {HANDS.map(h => (
              <div key={h.name} className="tutorial-hand-row">
                <span className="tutorial-hand-name">{h.name}</span>
                <span className="tutorial-hand-desc">{h.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>💡 Tips</h3>
          <ul>
            <li>Las ciegas suben cada 5 manos para acelerar el juego.</li>
            <li>Tienes 30 segundos para actuar o te retiras automáticamente.</li>
            <li>Comparte el código de sala con tus amigos para que se unan.</li>
            <li>Si te desconectas, tu mano se retira automáticamente.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
