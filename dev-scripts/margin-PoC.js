class Token {
    constructor(name) {
        this.name = name
        this._balanceOf = {}
        this.totalIssuance = 0
    }

    transfer(from, to, amount) {
        console.log(`${from} => ${to}: (${amount} ${this.name})`)
        this._addBalance(from, -amount)
        this._addBalance(to, amount)
    }

    _addBalance(acc, amount) {
        const addr = acc.name || acc.address || acc
        const oldBal = this._balanceOf[addr] || 0
        const newBal = oldBal + amount
        if (newBal < 0) {
            throw new Error('bad balances')
        }
        this._balanceOf[addr] = newBal
        this.totalIssuance += amount
    }

    mint(acc, amount) {
        if (amount < 0) {
            this.burn(acc, -amount)
            return
        }
        console.log(`${acc}: + (${amount} ${this.name})`)
        this._addBalance(acc, amount)
    }

    burn(acc, amount) {
        if (amount < 0) {
            this.mint(acc, -amount)
            return
        }
        console.log(`${acc}: - (${amount} ${this.name})`)
        this._addBalance(acc, -amount)
    }

    balanceOf(acc) {
        return this._balanceOf[acc.name || acc.address || acc]
    }

    toString() {
        return this.name
    }
}

class USDToken extends Token {
    constructor() {
        super('USD')
    }
}

class EURToken extends Token {
    constructor() {
        super('EUR')
    }
}

class RealUSD extends Token {
    constructor() {
        super('realUSD')
    }
}

class RealEUR extends Token {
    constructor() {
        super('realEUR')
    }
}

class PriceFeed {
    constructor() {
        this.price = {}
    }

    _key(base, quote) {
        if (base.name > quote.name) {
            return [`${base.name}${quote.name}`, false]
        }
        return [`${quote.name}${base.name}`, true]
    }

    setPrice(base, quote, price) {
        console.log(`Set Price: ${base.name} ${quote.name} - ${price}`)
        const [key, inverse] = this._key(base, quote)
        this.price[key] = inverse ? 1 / price : price
    }

    getPrice(base, quote) {
        const [key, inverse] = this._key(base, quote)
        const price = this.price[key]
        if (!price) {
            throw new Error('no price')
        }
        return inverse ? 1 / price : price
    }
}

class RealExchange extends PriceFeed {
    exchange(base, quote, account, baseAmount) {
        const price = this.getPrice(base, quote)
        console.group(`${account}: Exchange ${base.name} for ${quote.name} @ ${price}`)
        const quoteAmount = baseAmount / price
        base.burn(account, baseAmount)
        quote.mint(account, quoteAmount)
        console.groupEnd()
    }
}

class LiquidityPool {
    constructor(addr, base, quote, realBase, realQuote, exchange) {
        this.address = addr
        this.base = base
        this.quote = quote
        this.realBase = realBase
        this.realQuote = realQuote
        this.exchange = exchange
    }

    onOpenPosition(leverage, baseAmount) {
        const realAmount = baseAmount * leverage
        this.exchange.exchange(this.realBase, this.realQuote, this.address, realAmount)
    }

    onClosePosition(leverage, baseAmount) {
        const realAmount = baseAmount * leverage
        this.exchange.exchange(this.realBase, this.realQuote, this.address, -realAmount)
    }

    toString() {
        return this.address
    }
}

const BASE_COLLATERAL_RATIO = 0.1
const INITIAL_TOKEN_PRICE = 1

class LongToken extends Token {
    constructor(leverage, base, quote, oracle, liquidityPool) {
        super(`L${leverage}${base}${quote}`)
        this.leverage = leverage
        this.base = base
        this.quote = quote
        this.oracle = oracle
        this.liquidityPool = liquidityPool

        this.initialTokenPrice = 1000
        this.collaterals = 0
        this.debits = 0
        this.holdings = 0
        
        this.positions = []
    }

    get defaultCollateralRatio() {
        return BASE_COLLATERAL_RATIO * this.leverage
    }

    get price() {
        return this.oracle.getPrice(this.base, this.quote)
    }

    get netHoldings() {
        return this.collaterals + this.holdings * this.price - this.debits
    }

    get tokenPrice() {
        if (this.holdings === 0) {
            // no position
            return INITIAL_TOKEN_PRICE
        }
        if (this.netHoldings <= 0) {
            throw new Error('bankrupt')
        }
        return this.netHoldings / this.totalIssuance
    }
    
    openPosition(acc, baseAmount) {
        console.group(`${acc}: Open Position ${this.leverage}x${this.quote.name} + (${baseAmount} ${this.base.name})`)
        const additionalCollateral = baseAmount * this.defaultCollateralRatio
        this.base.transfer(acc, this, baseAmount)
        this.base.transfer(this.liquidityPool, this, additionalCollateral)

        const tokenAmount = baseAmount / this.tokenPrice

        this.collaterals += baseAmount
        const debits = this.leverage * baseAmount
        this.debits += debits
        this.holdings += debits / this.price
        
        this.mint(acc, tokenAmount)
        this.liquidityPool.onOpenPosition(this.leverage, baseAmount)
        console.groupEnd()

        this.positions.push({
            from: acc,
            collaterals: baseAmount,
            debits,
            holdings: debits / this.price,
            openPrice: this.price
        })
    }

    closePosition(acc, tokenAmount) {
        console.group(`${acc}: Close Position ${this.name} ${this.leverage}x${this.quote.name} - (${tokenAmount} ${this.quote.name})`)
        const withdrawAmount = tokenAmount * this.tokenPrice
        this.base.transfer(this, acc, withdrawAmount)

        const percent = tokenAmount / this.totalIssuance
        this.collaterals *= 1 - percent
        this.debits *= 1 - percent
        this.holdings *= 1 - percent
        
        // TODO: calculate how much refund to liquidity pool

        this.burn(acc, tokenAmount)
        this.liquidityPool.onClosePosition(this.leverage, withdrawAmount)
        console.groupEnd()
    }
}

function main() {
    const usd = new USDToken()
    const eur = new EURToken()
    const realUSD = new RealUSD()
    const realEUR = new RealEUR()

    const alice = 'alice'
    const bob = 'bob'
    const liquidityProvider = 'LP'

    usd.mint(alice, 200)
    usd.mint(bob, 200)
    usd.mint(liquidityProvider, 10000)
    eur.mint(liquidityProvider, 10000)
    realUSD.mint(liquidityProvider, 10000)
    realEUR.mint(liquidityProvider, 10000)

    const basePrice = 1.2

    const exchange = new RealExchange()
    exchange.setPrice(usd, eur, basePrice)
    exchange.setPrice(realUSD, realEUR, basePrice)
    const oracle = exchange

    const liquidityPool = new LiquidityPool(liquidityProvider, usd, eur, realUSD, realEUR, exchange)

    const l10usdeur = new LongToken(10, usd, eur, oracle, liquidityPool)

    function printTable(data) {
        console.table(data.map(data => {
            const ret = {}
            for (const key of Object.keys(data)) {
                let val = data[key]
                if (typeof val === 'number') {
                    if (Math.round(val) !== val) {
                        val = val.toFixed(4)
                    }
                }
                ret[key] = val
            }
            return ret
        }))
    }

    function printBalances(msg) {
        console.log()
        if (msg) {
            console.log(msg)
        }
        const accounts = [alice, bob, l10usdeur, liquidityPool]
        const price = exchange.getPrice(usd, eur)
        const balances = accounts.map(a => {
            const fn = (usd = 0, eur = 0, l10usdeur = 0, realUSD = 0, realEUR = 0, l10usdeurPrice) => ({
                name: a.toString(),
                usd,
                eur,
                l10usdeur,
                realUSD,
                realEUR,
                'onchain total (USD)': usd + eur * price + l10usdeur * l10usdeurPrice,
                'offchain total (USD)': realUSD + realEUR * price,
            })
            return fn(
                usd.balanceOf(a),
                eur.balanceOf(a),
                l10usdeur.balanceOf(a),
                realUSD.balanceOf(a),
                realEUR.balanceOf(a),
                l10usdeur.tokenPrice
            )
        })
        printTable(balances)
        console.log(`${l10usdeur} @ ${l10usdeur.tokenPrice}`)
        printTable(l10usdeur.positions.map(p => ({
            ...p,
            total: p.holdings * price - p.debits + p.collaterals
        })))
        console.log()
    }

    function increasePrice(price) {
        console.group(`${price > 0 ? 'Increase' : 'Decrease'} price by ${price * 100}%`)
        const oldPrice = exchange.getPrice(usd, eur)
        const newPrice = oldPrice * (1 + price)
        // const newPrice = oldPrice + price * basePrice
        exchange.setPrice(usd, eur, newPrice)
        exchange.setPrice(realUSD, realEUR, newPrice)
        console.groupEnd()
    }

    printBalances('Inital Balances')

    function run(fn) {
        const iter = fn()
        while(!iter.next().done) {
            printBalances()
        }
    }

    function *fn1() {
        yield l10usdeur.openPosition(alice, 100)
        yield increasePrice(0.01)
        yield increasePrice(0.01)
    }

    function *fn2() {
        yield l10usdeur.openPosition(alice, 100)
        yield increasePrice(0.01)
        yield l10usdeur.openPosition(bob, 100)
        yield increasePrice(0.01)
    }

    function *fn3() {
        yield l10usdeur.openPosition(alice, 100)
        yield increasePrice(0.01)
        yield l10usdeur.openPosition(bob, 100)
        yield increasePrice(-0.01)
        yield l10usdeur.openPosition(bob, 100)
        yield increasePrice(-0.01)
        yield l10usdeur.openPosition(alice, 100)
        yield increasePrice(-0.01)
        yield increasePrice(0.01)
    }

    run(fn2)

    return [fn1, fn2, fn3]
}

main()