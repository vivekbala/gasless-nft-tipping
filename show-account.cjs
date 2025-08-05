async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer address:', deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });