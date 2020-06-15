module.exports = callback => {
  async function getFaucetDai() {
    const FaucetInterface = artifacts.require('FaucetInterface');
    const FaucetInterfaceContract = await FaucetInterface.at(
      '0xbf7a7169562078c96f0ec1a8afd6ae50f12e5a99',
    );

    await FaucetInterfaceContract.allocateTo(
      '0x15ae150d7dC03d3B635EE90b85219dBFe071ED35',
      '100000000000000000000000000',
    );
  }

  getFaucetDai()
    .then(() => {
      console.log('Successfully finished!');
      callback();
    })
    .catch(error => console.log({ error }));
};
