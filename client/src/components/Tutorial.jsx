import { useState } from 'react'

const STEPS = [
  {
    title: '👋 Bienvenido a Pkergrid',
    body: (
      <div>
        <p>Pkergrid es <strong>póker Texas Hold'em</strong> para jugar con amigos.</p>
        <p style={{marginTop:12}}>El objetivo es simple: <strong>ganar todas las fichas</strong> de tus oponentes.</p>
        <p style={{marginTop:12}}>Cada mano se reparten cartas, todos apuestan, y el que tiene la mejor combinación gana todo lo apostado (<strong>el bote</strong>).</p>
        <div className="tutorial-emojis">
          <span>🃏</span><span>💰</span><span>🏆</span>
        </div>
      </div>
    ),
  },
  {
    title: '🖥️ Tu pantalla de juego',
    body: (
      <div>
        <p>Esto es lo que ves en la mesa:</p>
        <ul className="tutorial-list">
          <li><strong>Tus cartas</strong> — las 2 cartas que solo TÚ ves (en tu asiento). Son tuarma secreta.</li>
          <li><strong>Tus fichas</strong> — tu dinero. Con esto apuestas.</li>
          <li><strong>Cartas comunitarias</strong> — salen boca arriba en el centro. TODOS las usan.</li>
          <li><strong>Bote</strong> — el dinero total apostado en esta mano.</li>
          <li><strong>D</strong> = quien reparte. <strong>SB</strong> = ciega pequeña. <strong>BB</strong> = ciega grande.</li>
        </ul>
        <div className="tutorial-highlight-box">
          💡 Las ciegas (SB y BB) son apuestas obligatorias para que siempre haya dinero en juego.
        </div>
      </div>
    ),
  },
  {
    title: '📋 Cómo avanza una mano',
    body: (
      <div>
        <p>Una mano tiene <strong>5 fases</strong>. En cada fase hay una ronda de apuestas:</p>
        <ol className="tutorial-list">
          <li><strong>Pre-Flop</strong> — Recibes tus 2 cartas. Decides si juegas o te retiras.</li>
          <li><strong>Flop</strong> — Se destapan 3 cartas en el centro. Nueva ronda.</li>
          <li><strong>Turn</strong> — Se destapa 1 carta más. Otra ronda.</li>
          <li><strong>River</strong> — Se destapa la última carta. Ronda final.</li>
          <li><strong>Showdown</strong> — Todos muestran sus cartas. El mejor gana.</li>
        </ol>
        <div className="tutorial-highlight-box">
          💡 Combina tus 2 cartas + las 5 comunitarias para formar la mejor mano de 5 cartas.
        </div>
      </div>
    ),
  },
  {
    title: '🔘 Tus botones (cuando es tu turno)',
    body: (
      <div>
        <p>Cuando te toque jugar, verás estos botones. También puedes usar las teclas <kbd>1</kbd> a <kbd>4</kbd>:</p>

        <div className="tutorial-actions-grid">
          <div className="tutorial-act-box" style={{borderLeftColor:'#c0392b'}}>
            <span className="tutorial-act-key">1</span>
            <div><strong>Retirarse</strong> — te sales de esta mano. <span className="tut-green">No pierdes nada más.</span></div>
          </div>

          <div className="tutorial-act-box" style={{borderLeftColor:'#27ae60'}}>
            <span className="tutorial-act-key">2</span>
            <div>
              <strong>Verificar</strong> — pasas sin apostar (solo si nadie subió antes).
            </div>
          </div>

          <div className="tutorial-act-box" style={{borderLeftColor:'#2980b9'}}>
            <span className="tutorial-act-key">2</span>
            <div>
              <strong>Igualar</strong> — pagas lo mismo que el otro para seguir jugando.
            </div>
          </div>

          <div className="tutorial-act-box" style={{borderLeftColor:'#e67e22'}}>
            <span className="tutorial-act-key">3</span>
            <div>
              <strong>Subir</strong> — aumentas la apuesta. Los demás deben pagar más o retirarse.
            </div>
          </div>

          <div className="tutorial-act-box" style={{borderLeftColor:'#c0392b'}}>
            <span className="tutorial-act-key">4</span>
            <div>
              <strong>All-in</strong> — apuestas TODAS tus fichas de golpe. ¡Riesgo total!
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '🏆 ¿Quién gana?',
    body: (
      <div>
        <p>Gana quien tenga la <strong>mejor combinación de 5 cartas</strong> usando sus 2 cartas + las 5 comunitarias.</p>
        <p style={{marginTop:8}}>De mejor a peor:</p>
        <div className="tutorial-hands-grid">
          <div className="tutorial-hand-item"><span className="tut-rank">1</span> Escalera Real <span className="tut-desc">A♠ K♠ Q♠ J♠ 10♠</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">2</span> Escalera de Color <span className="tut-desc">mismo palo y seguidas</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">3</span> Póker <span className="tut-desc">4 cartas iguales</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">4</span> Full House <span className="tut-desc">3+2 cartas iguales</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">5</span> Color <span className="tut-desc">5 del mismo palo</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">6</span> Escalera <span className="tut-desc">5 seguidas</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">7</span> Trío <span className="tut-desc">3 cartas iguales</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">8</span> Doble Par <span className="tut-desc">2 pares</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">9</span> Par <span className="tut-desc">2 cartas iguales</span></div>
          <div className="tutorial-hand-item"><span className="tut-rank">10</span> Carta Alta <span className="tut-desc">la más alta gana</span></div>
        </div>
      </div>
    ),
  },
  {
    title: '🎯 Tips para empezar',
    body: (
      <div>
        <p>Consejos simples para tus primeras partidas:</p>

        <div className="tutorial-tips-list">
          <div className="tutorial-tip-item">
            <span className="tut-tip-icon">✅</span>
            <div><strong>Juega solo manos buenas:</strong> Pareja de Ases (AA), Pareja de Reyes (KK), As+Rey (AK).</div>
          </div>
          <div className="tutorial-tip-item">
            <span className="tut-tip-icon">❌</span>
            <div><strong>Retírate si tus cartas son malas:</strong> 2-7, 3-8, 2-9. No vale la pena.</div>
          </div>
          <div className="tutorial-tip-item">
            <span className="tut-tip-icon">⏱️</span>
            <div><strong>Tienes 30 segundos</strong> para decidir. Si no haces nada, te retiras automáticamente.</div>
          </div>
          <div className="tutorial-tip-item">
            <span className="tut-tip-icon">🔌</span>
            <div><strong>Si te desconectas</strong>, tu mano se retira automáticamente para no retrasar el juego.</div>
          </div>
          <div className="tutorial-tip-item">
            <span className="tut-tip-icon">📋</span>
            <div><strong>Comparte el código</strong> de sala (arriba a la izquierda) para invitar amigos.</div>
          </div>
          <div className="tutorial-tip-item">
            <span className="tut-tip-icon">🎮</span>
            <div><strong>Atajos de teclado:</strong> <kbd>1</kbd> Retirarse · <kbd>2</kbd> Verificar/Igualar · <kbd>3</kbd> Subir · <kbd>4</kbd> All-in</div>
          </div>
        </div>

        <div className="tutorial-highlight-box">
          🎉 ¡Ya sabes lo básico! Recuerda: la práctica hace al maestro. ¡Diviértete!
        </div>
      </div>
    ),
  },
]

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const total = STEPS.length
  const current = STEPS[step]

  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
        <button className="tutorial-close" onClick={onClose}>✕</button>

        <div className="tutorial-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`tutorial-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        <h2 className="tutorial-step-title">{current.title}</h2>

        <div className="tutorial-step-body">
          {current.body}
        </div>

        <div className="tutorial-nav">
          {step > 0 ? (
            <button className="tutorial-nav-btn" onClick={() => setStep(step - 1)}>
              ← Anterior
            </button>
          ) : <div />}

          <span className="tutorial-step-counter">{step + 1} / {total}</span>

          {step < total - 1 ? (
            <button className="tutorial-nav-btn primary" onClick={() => setStep(step + 1)}>
              Siguiente →
            </button>
          ) : (
            <button className="tutorial-nav-btn primary" onClick={onClose}>
              ✓ ¡Entendido!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
