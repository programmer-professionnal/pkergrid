const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

const HAND_NAMES = {
  9: 'Escalera Real', 8: 'Escalera de Color', 7: 'Póker', 6: 'Full House',
  5: 'Color', 4: 'Escalera', 3: 'Trío', 2: 'Doble Pareja', 1: 'Pareja', 0: 'Carta Alta',
}

function byRankDesc(a, b) {
  if (a.rank === 'A' && b.rank === '2') return -1
  if (a.rank === '2' && b.rank === 'A') return 1
  return RANK_VALUES[b.rank] - RANK_VALUES[a.rank]
}

function groupByRank(cards) {
  const groups = {}
  for (const c of cards) {
    if (!groups[c.rank]) groups[c.rank] = []
    groups[c.rank].push(c)
  }
  return groups
}

function isFlush(cards) {
  return cards.every(c => c.suit === cards[0].suit)
}

function getStrait(cards) {
  const sorted = [...cards].sort(byRankDesc)
  const unique = []
  const seen = new Set()
  for (const c of sorted) {
    if (!seen.has(c.rank)) {
      unique.push(c)
      seen.add(c.rank)
    }
  }
  if (unique.length < 5) return null
  for (let i = 0; i <= unique.length - 5; i++) {
    const straight = [unique[i]]
    for (let j = i + 1; j < unique.length && straight.length < 5; j++) {
      const last = straight[straight.length - 1]
      const diff = RANK_VALUES[last.rank] - RANK_VALUES[unique[j].rank]
      if (diff === 1) straight.push(unique[j])
      else if (diff > 1) break
    }
    if (straight.length === 5) return straight
  }
  const hasAce = cards.some(c => c.rank === 'A')
  const hasTwo = cards.some(c => c.rank === '2')
  const hasThree = cards.some(c => c.rank === '3')
  const hasFour = cards.some(c => c.rank === '4')
  const hasFive = cards.some(c => c.rank === '5')
  if (hasAce && hasTwo && hasThree && hasFour && hasFive) {
    const ace = cards.find(c => c.rank === 'A')
    const two = cards.find(c => c.rank === '2')
    const three = cards.find(c => c.rank === '3')
    const four = cards.find(c => c.rank === '4')
    const five = cards.find(c => c.rank === '5')
    return [ace, five, four, three, two]
  }
  return null
}

function getBestHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards]
  const combos = getCombinations(all, 5)
  let best = null
  let bestScore = -1
  for (const combo of combos) {
    const result = evaluateHand(combo)
    if (result.score > bestScore) {
      bestScore = result.score
      best = result
    }
  }
  return best
}

export function getCombinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length === 0) return []
  const [first, ...rest] = arr
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = getCombinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

export function evaluateHand(cards) {
  const sorted = [...cards].sort(byRankDesc)
  const groups = groupByRank(cards)
  const groupSizes = Object.values(groups).map(g => g.length).sort((a, b) => b - a)
  const flush = isFlush(cards)
  const straight = getStrait(cards)

  const isRoyalFlush = flush && straight &&
    straight.some(c => c.rank === 'A') &&
    straight.some(c => c.rank === 'K') &&
    straight.some(c => c.rank === 'Q') &&
    straight.some(c => c.rank === 'J') &&
    straight.some(c => c.rank === '10')

  if (isRoyalFlush) return { rank: 9, name: HAND_NAMES[9], score: 9000000, cards }
  if (flush && straight) {
    const highCard = RANK_VALUES[straight[0].rank]
    return { rank: 8, name: HAND_NAMES[8], score: 8000000 + highCard * 100, cards: straight }
  }
  if (groupSizes[0] === 4) {
    const quadRank = Object.entries(groups).find(([, g]) => g.length === 4)[0]
    const kicker = sorted.find(c => c.rank !== quadRank)
    return { rank: 7, name: HAND_NAMES[7], score: 7000000 + RANK_VALUES[quadRank] * 100 + (kicker ? RANK_VALUES[kicker.rank] : 0), cards: [...groups[quadRank], kicker].filter(Boolean) }
  }
  if (groupSizes[0] === 3 && groupSizes[1] === 2) {
    const trips = Object.entries(groups).find(([, g]) => g.length === 3)[0]
    const pair = Object.entries(groups).find(([, g]) => g.length === 2)[0]
    return { rank: 6, name: HAND_NAMES[6], score: 6000000 + RANK_VALUES[trips] * 100 + RANK_VALUES[pair] * 10, cards }
  }
  if (flush) {
    const sortedCards = [...cards].sort(byRankDesc)
    let score = 5000000
    for (let i = 0; i < 5; i++) {
      score += RANK_VALUES[sortedCards[i].rank] * Math.pow(15, 4 - i)
    }
    return { rank: 5, name: HAND_NAMES[5], score, cards: sortedCards }
  }
  if (straight) {
    const highCard = RANK_VALUES[straight[0].rank]
    return { rank: 4, name: HAND_NAMES[4], score: 4000000 + highCard * 100, cards: straight }
  }
  if (groupSizes[0] === 3) {
    const trips = Object.entries(groups).find(([, g]) => g.length === 3)[0]
    const kickers = sorted.filter(c => c.rank !== trips).slice(0, 2)
    let score = 3000000 + RANK_VALUES[trips] * 100
    for (let i = 0; i < kickers.length; i++) {
      score += RANK_VALUES[kickers[i].rank] * Math.pow(15, 1 - i)
    }
    return { rank: 3, name: HAND_NAMES[3], score, cards: [...groups[trips], ...kickers] }
  }
  if (groupSizes[0] === 2 && groupSizes[1] === 2) {
    const pairs = Object.entries(groups)
      .filter(([, g]) => g.length === 2)
      .map(([r]) => r)
      .sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a])
    const kicker = sorted.find(c => c.rank !== pairs[0] && c.rank !== pairs[1])
    const score = 2000000 + RANK_VALUES[pairs[0]] * 100 + RANK_VALUES[pairs[1]] * 10 + (kicker ? RANK_VALUES[kicker.rank] : 0)
    return { rank: 2, name: HAND_NAMES[2], score, cards: [...groups[pairs[0]], ...groups[pairs[1]], kicker].filter(Boolean) }
  }
  if (groupSizes[0] === 2) {
    const pairRank = Object.entries(groups).find(([, g]) => g.length === 2)[0]
    const kickers = sorted.filter(c => c.rank !== pairRank).slice(0, 3)
    let score = 1000000 + RANK_VALUES[pairRank] * 100
    for (let i = 0; i < kickers.length; i++) {
      score += RANK_VALUES[kickers[i].rank] * Math.pow(15, 2 - i)
    }
    return { rank: 1, name: HAND_NAMES[1], score, cards: [...groups[pairRank], ...kickers] }
  }
  const top5 = sorted.slice(0, 5)
  let score = 0
  for (let i = 0; i < 5; i++) {
    score += RANK_VALUES[top5[i].rank] * Math.pow(15, 4 - i)
  }
  return { rank: 0, name: HAND_NAMES[0], score, cards: top5 }
}

export function determineWinner(players, communityCards, eligibleIds = null) {
  const activePlayers = eligibleIds
    ? players.filter(p => eligibleIds.includes(p.id) && !p.folded)
    : players.filter(p => !p.folded)

  if (activePlayers.length === 0) {
    return { winners: [], handName: '—', handCards: [], allHands: [] }
  }

  if (activePlayers.length === 1) {
    return {
      winners: [activePlayers[0]],
      handName: 'Último jugador en pie',
      handCards: activePlayers[0].cards,
      allHands: players.map(p => ({
        playerId: p.id,
        hand: { name: p.folded ? 'Se retiró' : 'Ganador por abandono' },
      })),
    }
  }

  const results = activePlayers.map(p => ({
    playerId: p.id,
    hand: getBestHand(p.cards, communityCards),
  }))

  results.sort((a, b) => b.hand.score - a.hand.score)
  const bestScore = results[0].hand.score
  const winners = activePlayers.filter(p =>
    results.find(r => r.playerId === p.id)?.hand.score === bestScore
  )

  return {
    winners,
    handName: results[0].hand.name,
    handCards: results[0].hand.cards,
    allHands: players.map(p => {
      if (p.folded) return { playerId: p.id, hand: { name: 'Se retiró' } }
      const r = results.find(r => r.playerId === p.id)
      return { playerId: p.id, hand: r ? r.hand : { name: '—' } }
    }),
  }
}
