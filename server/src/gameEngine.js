import { createDeck, shuffle, deal } from './deck.js'
import { determineWinner, evaluateHand, getCombinations } from './handEvaluator.js'

export const DEFAULT_CONFIG = {
  startingChips: 1000,
  smallBlind: 10,
  bigBlind: 20,
  blindInterval: 5,
  blindLevels: [
    { small: 10, big: 20 },
    { small: 15, big: 30 },
    { small: 25, big: 50 },
    { small: 50, big: 100 },
    { small: 100, big: 200 },
  ],
}

const MIN_PLAYERS = 2
const MAX_HAND_HISTORY = 20

export function canStartGame(room) {
  const alive = room.players.filter(p => p.chips > 0 && !p.spectator && !p.disconnected)
  return alive.length >= MIN_PLAYERS
}

export function startGame(room) {
  const config = room.config || DEFAULT_CONFIG
  const players = room.players.filter(p => p.chips > 0 && !p.spectator && !p.disconnected)
  if (players.length < MIN_PLAYERS) return false

  const blinds = getBlinds(config, room.game?.handCount || 0)

  const nextDealer = room.game
    ? (room.game.dealerIndex + 1) % players.length
    : 0

  const game = {
    deck: [],
    communityCards: [],
    pot: 0,
    pots: [],
    showdownScheduled: false,
    currentPlayerIndex: 0,
    dealerIndex: nextDealer,
    phase: 'preflop',
    minRaise: blinds.big,
    currentBet: 0,
    lastRaiseIndex: -1,
    actionCount: 0,
    players,
    eliminated: [],
    handHistory: room.game?.handHistory || [],
    handCount: (room.game?.handCount || 0) + 1,
    playerStats: room.game?.playerStats || {},
    actionsThisHand: [],
    blindLevel: room.game?.blindLevel || 0,
  }

  const smallBlindIndex = (game.dealerIndex + 1) % players.length
  const bigBlindIndex = (game.dealerIndex + 2) % players.length

  players.forEach(p => p.reset())

  postBlind(players[smallBlindIndex], blinds.small)
  postBlind(players[bigBlindIndex], blinds.big)

  game.currentBet = blinds.big
  game.currentPlayerIndex = (bigBlindIndex + 1) % players.length
  game.minRaise = blinds.big
  game.lastRaiseIndex = bigBlindIndex

  game.deck = shuffle(createDeck())
  for (const p of players) {
    p.cards = deal(game.deck, 2)
    if (!game.playerStats[p.id]) {
      game.playerStats[p.id] = {
        handsPlayed: 0, folds: 0, raises: 0, calls: 0,
        checks: 0, allIns: 0, totalBet: 0, handsWon: 0, moneyWon: 0,
      }
    }
    game.playerStats[p.id].handsPlayed++
  }

  room.phase = 'playing'
  room.game = game
  return true
}

function postBlind(player, amount) {
  const actual = Math.min(amount, player.chips)
  player.chips -= actual
  player.bet = actual
  player.totalBet += actual
  if (player.chips <= 0) player.allIn = true
}

function getBlinds(config, handCount) {
  const level = Math.min(
    Math.floor(handCount / config.blindInterval),
    config.blindLevels.length - 1,
  )
  return config.blindLevels[level]
}

export function getNextActivePlayer(players, currentIndex) {
  const count = players.length
  for (let i = 1; i <= count; i++) {
    const idx = (currentIndex + i) % count
    const p = players[idx]
    if (!p.folded && !p.allIn && p.chips > 0) return idx
  }
  return -1
}

export function hasBettingEnded(game) {
  const { players, currentBet } = game
  const active = players.filter(p => !p.folded && !p.allIn)
  if (active.length === 0) return true
  if (active.length === 1) return true
  return active.every(p => p.bet === currentBet)
}

export function calculatePots(players) {
  const active = players.filter(p => !p.folded && p.totalBet > 0)
  if (active.length === 0) return [{ amount: 0, eligible: [] }]

  const totalPot = players.reduce((sum, p) => sum + p.totalBet, 0)
  const allInLevels = [...new Set(active.filter(p => p.allIn).map(p => p.totalBet))].sort((a, b) => a - b)
  const maxBet = Math.max(...active.map(p => p.totalBet))
  const levels = [...new Set([...allInLevels, maxBet])].sort((a, b) => a - b)

  if (levels.length <= 1) {
    return [{ amount: totalPot, eligible: active.map(p => p.id) }]
  }

  const pots = []
  let prev = 0

  for (const level of levels) {
    const diff = level - prev
    if (diff <= 0) continue

    const contributors = players.filter(p => p.totalBet >= level)
    const amount = diff * contributors.length
    const eligible = active.filter(p => p.totalBet >= level).map(p => p.id)

    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligible })
    }
    prev = level
  }

  return pots
}

function generateHandId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function processAction(room, playerId, action, amount = 0) {
  const game = room.game
  if (!game) return { error: 'No hay partida activa' }

  const player = game.players.find(p => p.id === playerId)
  if (!player) return { error: 'Jugador no encontrado' }

  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.id !== playerId) return { error: 'No es tu turno' }
  if (player.folded || player.allIn) return { error: 'Ya no puedes jugar esta mano' }

  switch (action) {
    case 'fold':
      player.folded = true
      if (game.playerStats[player.id]) game.playerStats[player.id].folds++
      break

    case 'check':
      if (player.bet < game.currentBet) return { error: 'No puedes verificar, debes igualar o subir' }
      if (game.playerStats[player.id]) game.playerStats[player.id].checks++
      break

    case 'call':
      if (player.bet >= game.currentBet) return { error: 'Ya has igualado' }
      const callAmount = Math.min(game.currentBet - player.bet, player.chips)
      player.chips -= callAmount
      player.bet += callAmount
      player.totalBet += callAmount
      if (game.playerStats[player.id]) {
        game.playerStats[player.id].calls++
        game.playerStats[player.id].totalBet += callAmount
      }
      if (player.chips === 0) player.allIn = true
      break

    case 'raise': {
      if (amount > player.chips + player.bet) {
        return processAction(room, playerId, 'all_in', amount)
      }
      const totalBet = amount
      const raiseAmount = totalBet - player.bet
      if (raiseAmount <= 0) return { error: 'La subida debe ser mayor a 0' }
      if (raiseAmount >= player.chips) {
        return processAction(room, playerId, 'all_in', amount)
      }
      if (totalBet < game.currentBet + game.minRaise) {
        return { error: `Subida mínima: ${game.currentBet + game.minRaise}` }
      }
      player.chips -= raiseAmount
      player.bet = totalBet
      player.totalBet += raiseAmount
      game.currentBet = totalBet
      game.minRaise = raiseAmount
      game.lastRaiseIndex = game.currentPlayerIndex
      if (game.playerStats[player.id]) {
        game.playerStats[player.id].raises++
        game.playerStats[player.id].totalBet += raiseAmount
      }
      if (player.chips === 0) player.allIn = true
      break
    }

    case 'all_in': {
      const chipsBefore = player.chips
      player.bet += chipsBefore
      player.totalBet += chipsBefore
      player.chips = 0
      player.allIn = true
      if (game.playerStats[player.id]) {
        game.playerStats[player.id].allIns++
        game.playerStats[player.id].totalBet += chipsBefore
      }
      if (player.bet > game.currentBet) {
        game.currentBet = player.bet
        game.minRaise = Math.max(chipsBefore, game.minRaise)
        game.lastRaiseIndex = game.currentPlayerIndex
      }
      break
    }

    default:
      return { error: 'Acción inválida' }
  }

  game.actionsThisHand.push({
    playerId: player.id,
    playerName: player.name,
    action,
    amount: player.bet,
    timestamp: Date.now(),
  })

  game.actionCount++

  const allInExceptOne = game.players.filter(p => !p.folded).filter(p => !p.allIn).length <= 1
  const oneLeft = game.players.filter(p => !p.folded).length === 1

  if (oneLeft || allInExceptOne) {
    advancePhase(room)
    return { action: 'action_processed' }
  }

  const nextIdx = getNextActivePlayer(game.players, game.currentPlayerIndex)
  if (nextIdx === -1) {
    advancePhase(room)
    return { action: 'action_processed' }
  }

  game.currentPlayerIndex = nextIdx

  if (hasBettingEnded(game)) {
    if (nextIdx === game.lastRaiseIndex || nextIdx === -1) {
      advancePhase(room)
    }
  }

  return { action: 'action_processed' }
}

function advancePhase(room) {
  const game = room.game
  const activePlayers = game.players.filter(p => !p.folded)

  if (activePlayers.length === 1) {
    endHand(room, activePlayers)
    return
  }

  collectBets(room)

  switch (game.phase) {
    case 'preflop':
      game.communityCards.push(...deal(game.deck, 3))
      game.phase = 'flop'
      break
    case 'flop':
      game.communityCards.push(...deal(game.deck, 1))
      game.phase = 'turn'
      break
    case 'turn':
      game.communityCards.push(...deal(game.deck, 1))
      game.phase = 'river'
      break
    case 'river':
      endHand(room)
      return
  }

  startNewBettingRound(room)
}

function collectBets(room) {
  const game = room.game
  let roundTotal = 0
  for (const p of game.players) {
    roundTotal += p.bet
    p.bet = 0
  }
  game.pot += roundTotal
}

function startNewBettingRound(room) {
  const game = room.game
  game.currentBet = 0
  game.minRaise = (room.config || DEFAULT_CONFIG).bigBlind
  game.actionCount = 0

  const activePlayers = game.players.filter(p => !p.folded && !p.allIn)
  if (activePlayers.length <= 1) {
    advancePhase(room)
    return
  }

  const allInPlayers = game.players.filter(p => p.allIn && !p.folded)
  if (allInPlayers.length > 0 && activePlayers.length === 0) {
    advancePhase(room)
    return
  }

  const firstActive = game.players.findIndex(p => !p.folded && !p.allIn && p.chips > 0)
  if (firstActive === -1) {
    advancePhase(room)
    return
  }

  game.lastRaiseIndex = firstActive
  game.currentPlayerIndex = firstActive
}

function endHand(room, forcedWinner = null) {
  const game = room.game
  collectBets(room)

  const pots = calculatePots(game.players)
  game.pots = pots

  const potDistributions = []
  for (const pot of pots) {
    if (pot.amount <= 0 || pot.eligible.length === 0) continue

    let result
    if (forcedWinner) {
      const eligibleWinners = forcedWinner.filter(w => pot.eligible.includes(w.id))
      if (eligibleWinners.length === 0) continue
      result = {
        winners: eligibleWinners,
        handName: 'Ganador por abandono',
      }
    } else {
      result = determineWinner(game.players, game.communityCards, pot.eligible)
    }

    if (!result.winners || result.winners.length === 0) continue

    const winnerShare = Math.floor(pot.amount / result.winners.length)
    for (const w of result.winners) {
      w.chips += winnerShare
      if (game.playerStats[w.id]) {
        game.playerStats[w.id].handsWon++
        game.playerStats[w.id].moneyWon += winnerShare
      }
    }
    const remainder = pot.amount - winnerShare * result.winners.length
    if (remainder > 0) result.winners[0].chips += remainder

    potDistributions.push({
      amount: pot.amount,
      eligibleCount: pot.eligible.length,
      winners: result.winners.map(w => ({ id: w.id, name: w.name })),
      handName: result.handName,
    })
  }

  const allWinners = potDistributions.flatMap(pd => pd.winners)
  const uniqueWinners = [...new Map(allWinners.map(w => [w.id, w])).values()]

  const handRecord = {
    id: generateHandId(),
    handNumber: game.handCount,
    communityCards: [...game.communityCards],
    potDistributions,
    winners: uniqueWinners,
    players: game.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, folded: p.folded, totalBet: p.totalBet,
    })),
    timestamp: Date.now(),
  }
  game.handHistory.push(handRecord)
  if (game.handHistory.length > MAX_HAND_HISTORY) {
    game.handHistory = game.handHistory.slice(-MAX_HAND_HISTORY)
  }

  const totalPot = pots.reduce((s, p) => s + p.amount, 0)
  const allHandsData = game.players.map(p => {
    if (p.folded) return { playerId: p.id, hand: { name: 'Se retiró' }, cards: [] }
    const r = determineWinner(game.players, game.communityCards, [p.id])
    if (r.winners && r.winners.length > 0 && r.winners.some(w => w.id === p.id)) {
      return { playerId: p.id, hand: { name: r.handName }, cards: p.cards.map(c => ({ ...c })) }
    }
    return { playerId: p.id, hand: { name: '—' }, cards: p.cards.map(c => ({ ...c })) }
  })

  room.phase = 'showdown'
  room.lastHand = {
    winners: uniqueWinners,
    potDistributions,
    communityCards: [...game.communityCards],
    pot: totalPot,
    allHands: allHandsData,
  }

  game.actionsThisHand = []

  const alivePlayers = game.players.filter(p => p.chips > 0)
  if (alivePlayers.length < MIN_PLAYERS) {
    game.eliminated = game.players.filter(p => p.chips <= 0).map(p => p.id)
    room.phase = 'game_over'
    for (const p of game.players) {
      if (game.playerStats[p.id]) {
        const rank = alivePlayers.findIndex(a => a.id === p.id)
        game.playerStats[p.id].finalRank = rank >= 0 ? rank + 1 : alivePlayers.length + 1
      }
    }
  }
}

export function startNewHand(room) {
  if (room.phase === 'game_over') return false
  const alivePlayers = room.players.filter(p => p.chips > 0 && !p.spectator && !p.disconnected)
  if (alivePlayers.length < MIN_PLAYERS) return false
  room.game = null
  room.lastHand = null
  return startGame(room)
}

export function autoFoldPlayer(room, playerId) {
  const game = room.game
  if (!game) return

  const player = game.players.find(p => p.id === playerId)
  if (!player || player.folded || player.allIn) return

  player.folded = true
  if (game.playerStats[player.id]) game.playerStats[player.id].folds++

  const allInExceptOne = game.players.filter(p => !p.folded).filter(p => !p.allIn).length <= 1
  const oneLeft = game.players.filter(p => !p.folded).length === 1

  if (oneLeft || allInExceptOne) {
    advancePhase(room)
    return
  }

  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.id === playerId || currentPlayer.folded || currentPlayer.allIn) {
    const nextIdx = getNextActivePlayer(game.players, game.currentPlayerIndex)
    if (nextIdx === -1) {
      advancePhase(room)
      return
    }
    game.currentPlayerIndex = nextIdx
  }
}

export function getHandStrength(hand, communityCards) {
  if (!hand || hand.length === 0) return null
  const all = [...hand, ...communityCards]
  if (all.length < 5) return null

  const combos = getCombinations(all, 5)
  let bestScore = -1
  for (const combo of combos) {
    const result = evaluateHand(combo)
    if (result.score > bestScore) bestScore = result.score
  }

  const maxScore = 9000000
  const pct = Math.round((bestScore / maxScore) * 100)
  let label
  if (pct >= 95) label = 'Muy fuerte'
  else if (pct >= 80) label = 'Fuerte'
  else if (pct >= 60) label = 'Media'
  else if (pct >= 40) label = 'Débil'
  else label = 'Muy débil'

  return { pct, label }
}

export function formatCards(cards) {
  return cards.map(c => `${c.rank}${c.suitSymbol || c.suit}`).join(' ')
}

export function getPublicGameState(room, playerId) {
  const config = room.config || DEFAULT_CONFIG

  if (!room.game) {
    const players = room.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, folded: false,
      bet: 0, allIn: false, cards: [], isHost: p.id === room.hostId,
      eliminated: p.chips <= 0, spectator: !!p.spectator,
    }))
    return {
      phase: room.phase, players, communityCards: [],
      pot: 0, currentPlayerIndex: -1, minRaise: 0, currentBet: 0,
      dealerIndex: -1, lastHand: room.lastHand,
      smallBlind: config.smallBlind, bigBlind: config.bigBlind,
      pots: [], handStrength: null, config,
      isHost: room.hostId === playerId,
      handHistory: [], playerStats: {}, handCount: 0, blindLevel: 0,
    }
  }

  const game = room.game
  const isShowdown = room.phase === 'showdown'

  if (room.phase === 'game_over') {
    const players = room.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, folded: false,
      bet: 0, allIn: false, cards: [], isHost: p.id === room.hostId,
      eliminated: p.chips <= 0, spectator: !!p.spectator,
    }))
    return {
      phase: 'game_over', players,
      communityCards: game.communityCards,
      pot: game.pot, currentPlayerIndex: -1, minRaise: 0, currentBet: 0,
      dealerIndex: -1, myCards: [], lastHand: room.lastHand,
      smallBlind: config.smallBlind, bigBlind: config.bigBlind,
      pots: game.pots || [], handStrength: null,
      handHistory: game.handHistory || [],
      playerStats: game.playerStats || {}, config,
      isHost: room.hostId === playerId,
      handCount: game.handCount || 0, blindLevel: game.blindLevel || 0,
    }
  }

  const players = game.players.map(p => ({
    id: p.id, name: p.name, chips: p.chips,
    folded: p.folded, bet: p.bet, allIn: p.allIn,
    cards: (p.id === playerId || (isShowdown && !p.folded)) ? p.cards.map(c => ({ ...c })) : [],
    isHost: p.id === room.hostId,
    totalBet: p.totalBet,
    eliminated: p.chips <= 0,
    spectator: !!p.spectator,
  }))

  const myIndex = game.players.findIndex(p => p.id === playerId)
  const myCards = myIndex !== -1 ? game.players[myIndex].cards.map(c => ({ ...c })) : []
  const myPlayer = myIndex !== -1 ? game.players[myIndex] : null

  let handStrength = null
  if (myPlayer && !myPlayer.folded && game.communityCards.length > 0) {
    handStrength = getHandStrength(myPlayer.cards, game.communityCards)
  }

  const currentPlayerId = game.players[game.currentPlayerIndex]?.id || null

  return {
    phase: room.phase, players,
    communityCards: game.communityCards.map(c => ({ ...c })),
    pot: game.pot, pots: game.pots || [],
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayerId,
    minRaise: game.minRaise, currentBet: game.currentBet,
    dealerIndex: game.dealerIndex,
    myCards, handStrength,
    lastHand: room.lastHand,
    smallBlind: config.smallBlind, bigBlind: config.bigBlind,
    handHistory: game.handHistory || [],
    playerStats: game.playerStats || {},
    handCount: game.handCount || 0,
    blindLevel: game.blindLevel || 0,
    config, isHost: room.hostId === playerId,
  }
}
