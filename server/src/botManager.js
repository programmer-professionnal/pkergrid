import { evaluateHand, getCombinations } from './handEvaluator.js'

const BOT_NAMES = [
  'AI-Robot', 'AI-Neo', 'AI-Morpheus', 'AI-Trinity',
  'AI-Cypher', 'AI-Smith', 'AI-Orion', 'AI-Satoshi',
]

let botIdCounter = 1

export function createBotPlayer() {
  return {
    name: BOT_NAMES[botIdCounter % BOT_NAMES.length],
    id: `bot_${Date.now()}_${botIdCounter++}`,
    chips: 1000,
    cards: [],
    bet: 0,
    folded: false,
    allIn: false,
    totalBet: 0,
    spectator: false,
    disconnected: false,
    isBot: true,
    reset() {
      this.cards = []
      this.bet = 0
      this.folded = false
      this.allIn = false
      this.totalBet = 0
    },
    resetHand() {
      this.cards = []
      this.bet = 0
      this.folded = false
      this.allIn = false
    },
  }
}

function getHandStrengthScore(holeCards, communityCards) {
  if (holeCards.length === 0) return 0
  const all = [...holeCards, ...communityCards]
  if (all.length < 5) {
    const rank1 = getCardRank(holeCards[0])
    const rank2 = getCardRank(holeCards[1])
    const paired = holeCards[0].rank === holeCards[1].rank
    const suited = holeCards[0].suit === holeCards[1].suit
    const high = Math.max(rank1, rank2)
    if (paired) return high * 10 + 50
    if (suited && high >= 11) return high * 10 + 30
    if (high >= 12) return high * 10 + 20
    return (rank1 + rank2) * 2
  }
  const combos = getCombinations(all, 5)
  let bestScore = -1
  for (const combo of combos) {
    const result = evaluateHand(combo)
    if (result.score > bestScore) bestScore = result.score
  }
  return bestScore
}

function getCardRank(card) {
  const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 }
  return values[card.rank] || 0
}

export function decideBotAction(bot, game, communityCards, currentBet, minRaise) {
  if (bot.folded || bot.allIn) return null
  if (bot.chips <= 0) return { action: 'all_in', amount: 0 }

  const strength = getHandStrengthScore(bot.cards, communityCards)
  const toCall = Math.max(0, currentBet - bot.bet)
  const totalPot = game.pot + game.players.reduce((sum, p) => sum + p.bet, 0)
  const potOdds = toCall > 0 ? totalPot / toCall : 999
  const maxScore = 9000000
  const strengthPct = strength / maxScore

  if (bot.chips <= toCall) {
    if (strengthPct > 0.3) return { action: 'call', amount: 0 }
    return { action: 'fold', amount: 0 }
  }

  if (toCall === 0) {
    if (strengthPct > 0.4) {
      const raiseAmount = Math.min(
        Math.floor(bot.chips * (0.3 + strengthPct * 0.3)),
        bot.chips + bot.bet,
      )
      const total = bot.bet + raiseAmount
      if (total >= bot.chips + bot.bet) return { action: 'all_in', amount: 0 }
      if (raiseAmount >= minRaise || total >= minRaise + currentBet) {
        return { action: 'raise', amount: total }
      }
      return { action: 'check', amount: 0 }
    }
    return { action: 'check', amount: 0 }
  }

  if (strengthPct > 0.6 && potOdds > 1.5) {
    const raiseAmount = Math.min(
      Math.floor(bot.chips * (0.4 + strengthPct * 0.3)),
      bot.chips + bot.bet,
    )
    const total = bot.bet + raiseAmount
    if (total >= bot.chips + bot.bet) return { action: 'all_in', amount: 0 }
    if (raiseAmount >= minRaise || total >= minRaise + currentBet) {
      return { action: 'raise', amount: total }
    }
    return { action: 'call', amount: 0 }
  }

  if (strengthPct > 0.3 && potOdds > 2) return { action: 'call', amount: 0 }
  if (strengthPct > 0.2 && potOdds > 4) return { action: 'call', amount: 0 }
  if (strengthPct > 0.7) return { action: 'call', amount: 0 }

  if (communityCards.length === 0 && strengthPct > 0.1) {
    const r1 = getCardRank(bot.cards[0])
    const r2 = getCardRank(bot.cards[1])
    if (bot.cards[0].rank === bot.cards[1].rank) return { action: 'call', amount: 0 }
    if (r1 >= 11 && r2 >= 11) return { action: 'call', amount: 0 }
    if (r1 + r2 >= 20 && bot.cards[0].suit === bot.cards[1].suit) return { action: 'call', amount: 0 }
    if (potOdds > 5 && (r1 >= 10 || r2 >= 10)) return { action: 'call', amount: 0 }
  }

  return { action: 'fold', amount: 0 }
}
