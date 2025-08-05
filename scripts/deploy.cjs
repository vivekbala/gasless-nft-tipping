const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Gasless NFT Tipping Platform...");

  // Deploy GaslessNFTTipping contract
  const GaslessNFTTipping = await ethers.getContractFactory("GaslessNFTTipping");
  const tippingContract = await GaslessNFTTipping.deploy();
  await tippingContract.deployed();
  console.log("GaslessNFTTipping deployed to:", tippingContract.address);

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
