const { ethers } = require('hardhat');

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);
  const balance = await provider.getBalance('0x2940eb6Eb2FE815496EEA4942eFad774A93ec2eB');
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 