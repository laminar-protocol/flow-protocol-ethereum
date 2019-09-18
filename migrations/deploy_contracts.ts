module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
    const TestToken = artifacts.require("TestToken");
    const TestCToken = artifacts.require("TestCToken");
    const MoneyMarket = artifacts.require("MoneyMarket");
    const FlowProtocol = artifacts.require("FlowProtocol");
    const FlowToken = artifacts.require("FlowToken");
    const LiquidityPool = artifacts.require("LiquidityPool");
    const SimplePriceOracle = artifacts.require("SimplePriceOracle");
    const IERC20 = artifacts.require("IERC20");

    return async (deployer: Truffle.Deployer) => {
        const accounts = await web3.eth.getAccounts()
        const mainAccount = accounts[0];
      
        await deployer.deploy(TestToken);
        const baseToken = await TestToken.deployed();

        await deployer.deploy(TestCToken, baseToken.address);
        const cToken = await TestCToken.deployed();

        await deployer.deploy(MoneyMarket, cToken.address, web3.utils.toWei('0.5'), "Test iToken", "iTEST");
        const moneyMarket = await MoneyMarket.deployed();
        const iToken = await IERC20.at(await moneyMarket.iToken());
      
        await deployer.deploy(SimplePriceOracle, [mainAccount]);
        const oracle = await SimplePriceOracle.deployed();
      
        await deployer.deploy(FlowProtocol, oracle.address, moneyMarket.address);
        const protocol = await FlowProtocol.deployed();

        await deployer.deploy(FlowToken, "EU Dollar", "EUR", moneyMarket.address);
        const fEUR = await FlowToken.deployed();

        await protocol.addFlowToken(fEUR.address);
      
        await deployer.deploy(LiquidityPool, protocol.address, moneyMarket.address, web3.utils.toWei('0.01'), [fEUR.address]);
        const pool = await LiquidityPool.deployed();
      
        await baseToken.approve(moneyMarket.address, web3.utils.toWei('1000000'));

        await moneyMarket.mint(web3.utils.toWei('1000'));

        await iToken.transfer(pool.address, web3.utils.toWei('1000'));
      
        await oracle.setPrice(fEUR.address, web3.utils.toWei('1.2'));
    };
}
