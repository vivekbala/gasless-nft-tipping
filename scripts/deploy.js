const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Gasless NFT Tipping Platform...");

  // Deploy MinimalForwarder first
  const MinimalForwarder = await ethers.getContractFactory("MinimalForwarder");
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.waitForDeployment();
  console.log("MinimalForwarder deployed to:", await forwarder.getAddress());

  // Deploy GaslessNFTTipping contract
  const GaslessNFTTipping = await ethers.getContractFactory("GaslessNFTTipping");
  const tippingContract = await GaslessNFTTipping.deploy(await forwarder.getAddress());
  await tippingContract.waitForDeployment();
  console.log("GaslessNFTTipping deployed to:", await tippingContract.getAddress());

  console.log("Deployment complete!");
  console.log("MinimalForwarder:", await forwarder.getAddress());
  console.log("GaslessNFTTipping:", await tippingContract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
