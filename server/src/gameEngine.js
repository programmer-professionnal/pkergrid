import { createDeck, shuffle, deal } from './deck.js'
import { determineWinner } from './handEvaluator.js'

export const SMALL_BLIND = 10
export const BIG_BLIND = 20
const MIN_PLAYERS = 2

export function canStartGame(room) {
  return room.players.length >= MIN_PLAYERS
}

export function startGame(room) {
  const players = room.players.filter(p => p.chips > 0)
  if (players.length < MIN_PLAYERS) return false

  const nextDealer = room.game
    ? (room.game.dealerIndex + 1) % players.length
    : 0

  const game = {
    deck: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentPlayerIndex: 0,
    dealerIndex: nextDealer,
    phase: 'preflop',
    minRaise: BIG_BLIND,
    currentBet: 0,
    lastRaiseIndex: -1,
    actionCount: 0,
    players,
  }

  const smallBlindIndex = (game.dealerIndex + 1) % players.length
  const bigBlindIndex = (game.dealerIndex + 2) % players.length

  players.forEach(p => p.reset())
  players[smallBlindIndex].chips -= SMALL_BLIND
  players[smallBlindIndex].bet = SMALL_BLIND
  players[smallBlindIndex].totalBet = SMALL_BLIND
  if (players[smallBlindIndex].chips <= 0) {
    players[smallBlindIndex].allIn = true
    players[smallBlindIndex].chips = 0
  }

  players[bigBlindIndex].chips -= BIG_BLIND
  players[bigBlindIndex].bet = BIG_BLIND
  players[bigBlindIndex].totalBet = BIG_BLIND
  if (players[bigBlindIndex].chips <= 0) {
    players[bigBlindIndex].allIn = true
    players[bigBlindIndex].chips = 0
  }

  game.pot = SMALL_BLIND + BIG_BLIND
  game.currentBet = BIG_BLIND
  game.currentPlayerIndex = (bigBlindIndex + 1) % players.length
  game.minRaise = BIG_BLIND
  game.lastRaiseIndex = bigBlindIndex

  game.deck = shuffle(createDeck())
  for (const p of players) {
    p.cards = deal(game.deck, 2)
  }

  room.phase = 'playing'
  room.game = game
  return true
}

export function getNextActivePlayer(players, currentIndex, excludeFolded = true) {
  const count = players.length
  for (let i = 1; i <= count; i++) {
    const idx = (currentIndex + i) % count
    const p = players[idx]
    if (!p.folded && !p.allIn && p.chips >= 0) return idx
  }
  return -1
}

export function hasBettingEnded(game) {
  const { players, currentBet } = game
  const active = players.filter(p => !p.folded && !p.allIn)
  if (active.length === 0) return true
  if (active.length === 1) return true

  const allCalls = active.every(p => p.bet === currentBet)
  return allCalls
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
      break

    case 'check':
      if (player.bet < game.currentBet) return { error: 'No puedes verificar, debes igualar o subir' }
      break

    case 'call':
      if (player.bet >= game.currentBet) return { error: 'Ya has igualado' }
      const callAmount = Math.min(game.currentBet - player.bet, player.chips)
      player.chips -= callAmount
      player.bet += callAmount
      player.totalBet += callAmount
      if (player.chips === 0) player.allIn = true
      break

    case 'raise':
      const totalBet = amount
      const raiseAmount = totalBet - player.bet
      if (raiseAmount <= 0) return { error: 'La subida debe ser mayor a 0' }
      if (totalBet < game.currentBet + game.minRaise) return { error: `Subida mínima: ${game.currentBet + game.minRaise}` }
      if (raiseAmount > player.chips) return { error: 'No tienes suficientes fichas' }
      player.chips -= raiseAmount
      player.bet = totalBet
      player.totalBet += raiseAmount
      game.currentBet = totalBet
      game.minRaise = raiseAmount
      game.lastRaiseIndex = game.currentPlayerIndex
      if (player.chips === 0) player.allIn = true
      break

    case 'all_in':
      const allInAmount = player.chips
      player.bet += allInAmount
      player.totalBet += allInAmount
      player.chips = 0
      player.allIn = true
      if (player.bet > game.currentBet) {
        game.currentBet = player.bet
        game.minRaise = allInAmount
        game.lastRaiseIndex = game.currentPlayerIndex
      }
      break

    default:
      return { error: 'Acción inválida' }
  }

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
  let pot = 0
  for (const p of game.players) {
    pot += p.bet
    p.bet = 0
  }
  game.pot = pot
}

function startNewBettingRound(room) {
  const game = room.game
  game.currentBet = 0
  game.minRaise = BIG_BLIND
  game.lastRaiseIndex = -1
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

  const firstActive = game.players.findIndex(p => !p.folded && !p.allIn)
  if (firstActive === -1) {
    advancePhase(room)
    return
  }

  game.currentPlayerIndex = firstActive
}

function endHand(room, forcedWinner = null) {
  const game = room.game
  collectBets(room)

  let result
  if (forcedWinner) {
    result = {
      winners: forcedWinner,
      handName: 'Ganador por abandono',
      handCards: forcedWinner[0].cards,
      allHands: game.players.map(p => ({
        playerId: p.id,
        hand: { name: p.folded || p.id !== forcedWinner[0].id ? 'Se retiró' : 'Ganador por abandono' },
      })),
    }
  } else {
    result = determineWinner(game.players, game.communityCards)
  }

  const winnerShare = Math.floor(game.pot / result.winners.length)
  for (const w of result.winners) {
    w.chips += winnerShare
  }
  const remainder = game.pot - winnerShare * result.winners.length
  if (result.winners.length > 0) {
    result.winners[0].chips += remainder
  }

  room.phase = 'showdown'
  room.lastHand = {
    winners: result.winners.map(w => ({ id: w.id, name: w.name })),
    handName: result.handName,
    pot: game.pot,
    communityCards: [...game.communityCards],
    allHands: result.allHands,
  }

  const alivePlayers = game.players.filter(p => p.chips > 0)
  if (alivePlayers.length < MIN_PLAYERS) {
    room.phase = 'game_over'
  }
}

export function startNewHand(room) {
  if (room.phase === 'game_over') return false

  const alivePlayers = room.players.filter(p => p.chips > 0)
  if (alivePlayers.length < MIN_PLAYERS) return false

  room.game = null
  room.lastHand = null
  return startGame(room)
}

export function getPublicGameState(room, playerId) {
  if (!room.game) {
    return {
      phase: room.phase,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        folded: false,
        bet: 0,
        allIn: false,
        cards: [],
        isHost: p.id === room.hostId,
      })),
      communityCards: [],
      pot: 0,
      currentPlayerIndex: -1,
      minRaise: 0,
      currentBet: 0,
      dealerIndex: -1,
      lastHand: room.lastHand,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
    }
  }

  const game = room.game
  const players = game.players.map(p => ({
    id: p.id,
    name: p.name,
    chips: p.chips,
    folded: p.folded,
    bet: p.bet,
    allIn: p.allIn,
    cards: p.id === playerId ? p.cards : [],
    isHost: p.id === room.hostId,
    totalBet: p.totalBet,
  }))

  const myIndex = game.players.findIndex(p => p.id === playerId)
  const myCards = myIndex !== -1 ? game.players[myIndex].cards : []

  return {
    phase: room.phase,
    players,
    communityCards: game.communityCards,
    pot: game.pot,
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayerId: game.players[game.currentPlayerIndex]?.id,
    minRaise: game.minRaise,
    currentBet: game.currentBet,
    dealerIndex: game.dealerIndex,
    myCards,
    lastHand: room.lastHand,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
  }
}
