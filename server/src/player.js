export class Player {
  constructor(id, name) {
    this.id = id
    this.name = name
    this.chips = 1000
    this.cards = []
    this.bet = 0
    this.folded = false
    this.allIn = false
    this.totalBet = 0
  }

  reset() {
    this.cards = []
    this.bet = 0
    this.folded = false
    this.allIn = false
    this.totalBet = 0
  }

  resetHand() {
    this.cards = []
    this.bet = 0
    this.folded = false
    this.allIn = false
  }
}
