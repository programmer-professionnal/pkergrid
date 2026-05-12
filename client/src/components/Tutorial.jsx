const HANDS = [
  { rank: 1, name: 'Escalera Real', desc: 'A♠ K♠ Q♠ J♠ 10♠ — la mejor mano, muy rara' },
  { rank: 2, name: 'Escalera de Color', desc: '5 cartas seguidas del mismo palo' },
  { rank: 3, name: 'Póker', desc: '4 cartas iguales (ej: 4 reinas)' },
  { rank: 4, name: 'Full House', desc: '3 de una + 2 de otra (ej: 3 reyes + 2 sietes)' },
  { rank: 5, name: 'Color', desc: '5 cartas del mismo palo (no seguidas)' },
  { rank: 6, name: 'Escalera', desc: '5 cartas seguidas (distinto palo)' },
  { rank: 7, name: 'Trío', desc: '3 cartas iguales' },
  { rank: 8, name: 'Doble Par', desc: '2 pares distintos' },
  { rank: 9, name: 'Par', desc: '2 cartas iguales' },
  { rank: 10, name: 'Carta Alta', desc: 'si nadie tiene nada, gana la carta más alta' },
]

export default function Tutorial({ onClose }) {
  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
        <button className="tutorial-close" onClick={onClose}>✕</button>

        <h2>🃏 Pkergrid — Cómo jugar</h2>

        {/* ===== 1. EL OBJETIVO ===== */}
        <section>
          <h3>🎯 El objetivo</h3>
          <p>
            Gana todas las fichas de tus rivales. Cada mano se reparten cartas y todos apuestan.
            El que tenga la mejor combinación de <strong>5 cartas</strong> gana todo lo apostado (<strong>el bote</strong>).
          </p>
        </section>

        {/* ===== 2. LA PANTALLA ===== */}
        <section>
          <h3>🖥️ La pantalla de juego</h3>
          <ul>
            <li><strong>Tus cartas</strong> — las 2 cartas que solo tú ves (abajo, en tu asiento).</li>
            <li><strong>Cartas comunitarias</strong> — en el centro, las comparten todos. Salen en 3 fases: Flop (3), Turn (1), River (1).</li>
            <li><strong>Tus fichas</strong> — tu dinero. Apuestas con ellas.</li>
            <li><strong>Bote</strong> — total de fichas apostadas en esta mano.</li>
            <li><strong>D, SB, BB</strong> — quién reparte (D) y quién paga las ciegas (SB=pequeña, BB=grande).</li>
          </ul>
        </section>

        {/* ===== 3. TUS BOTONES ===== */}
        <section>
          <h3>🔘 Tus botones (cuando es tu turno)</h3>
          <div className="tutorial-controls">
            <div className="tutorial-action">
              <span className="tutorial-badge" style={{background:'#c0392b'}}>1</span>
              <div><strong>Retirarse</strong> — te sales de esta mano. Pierdes lo apostado pero sigues jugando la siguiente.</div>
            </div>
            <div className="tutorial-action">
              <span className="tutorial-badge" style={{background:'#27ae60'}}>2</span>
              <div><strong>Verificar</strong> — pasas sin apostar (solo si nadie ha subido antes).</div>
            </div>
            <div className="tutorial-action">
              <span className="tutorial-badge" style={{background:'#2980b9'}}>2</span>
              <div><strong>Igualar</strong> — igualas la apuesta de otro para seguir en la mano.</div>
            </div>
            <div className="tutorial-action">
              <span className="tutorial-badge" style={{background:'#e67e22'}}>3</span>
              <div><strong>Subir</strong> — aumentas la apuesta. Los demás deben igualar o retirarse.</div>
            </div>
            <div className="tutorial-action">
              <span className="tutorial-badge" style={{background:'#c0392b'}}>4</span>
              <div><strong>All-in</strong> — apuestas TODAS tus fichas de golpe.</div>
            </div>
          </div>
        </section>

        {/* ===== 4. CÓMO SE JUEGA UNA MANO ===== */}
        <section>
          <h3>📋 Paso a paso</h3>
          <ol>
            <li>A cada uno le dan <strong>2 cartas</strong> (solo tú ves las tuyas).</li>
            <li><strong>Apuestas Pre-Flop</strong> — miras tus cartas y decides si juegas o te retiras.</li>
            <li>Se destapan <strong>3 cartas comunitarias</strong> en el centro (Flop). Otra ronda de apuestas.</li>
            <li>Se destapa <strong>1 carta más</strong> (Turn). Otra ronda.</li>
            <li>Se destapa <strong>la última carta</strong> (River). Última ronda.</li>
            <li><strong>Showdown</strong> — todos muestran sus cartas. Gana la mejor combinación de 5.</li>
          </ol>
        </section>

        {/* ===== 5. RANKINGS ===== */}
        <section>
          <h3>🏆 Manos ganadoras (de mejor a peor)</h3>
          <p className="tutorial-hint">
            Combina tus 2 cartas + las 5 comunitarias para formar la mejor mano de 5 cartas.
          </p>
          <div className="tutorial-hands">
            {HANDS.map(h => (
              <div key={h.name} className="tutorial-hand-row">
                <span className="tutorial-hand-rank">#{h.rank}</span>
                <span className="tutorial-hand-name">{h.name}</span>
                <span className="tutorial-hand-desc">{h.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 6. TIPS ===== */}
        <section>
          <h3>💡 Consejos</h3>
          <ul>
            <li><strong>No juegues todas las manos</strong> — si tus 2 cartas son malas (ej: 2 y 7), retírate.</li>
            <li><strong>Buenas manos para jugar</strong> — pares altos (AA, KK, QQ), AK, AQ.</li>
            <li>Tienes <strong>30 segundos</strong> para decidir, o te retiras automáticamente.</li>
            <li>Las <strong>ciegas suben cada 5 manos</strong> para que el juego no se alargue.</li>
            <li>Comparte el <strong>código de sala</strong> (arriba a la izquierda) para que se unan tus amigos.</li>
          </ul>
        </section>

        <button className="tutorial-start-btn" onClick={onClose}>¡Entendido! Empezar a jugar</button>
      </div>
    </div>
  )
}
