// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // Deploy MockERC20 (USDT)
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("USDT Token", "USDT", hre.ethers.parseUnits("1000000", 18));
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log(`MockERC20 (USDT) deployed to: ${usdtAddress}`);

  // Deploy the DistributerContract
  const DistributerContract = await hre.ethers.getContractFactory("DistributerContract");
  
  // For simplicity, we'll use the deployer as the tokenPool in this example
  const [deployer] = await hre.ethers.getSigners();
  const tokenPool = deployer.address;
  
  const distributerContract = await DistributerContract.deploy(usdtAddress, tokenPool);
  await distributerContract.waitForDeployment();
  const distributerAddress = await distributerContract.getAddress();
  console.log(`DistributerContract deployed to: ${distributerAddress}`);

  // Approve the DistributerContract to spend USDT from the tokenPool (deployer)
  const approvalAmount = hre.ethers.parseUnits("1000000", 18);
  await usdt.approve(distributerAddress, approvalAmount);
  console.log(`Approved DistributerContract to spend ${hre.ethers.formatUnits(approvalAmount, 18)} USDT from tokenPool`);

  // Set up role addresses (using test accounts for demonstration)
  const accounts = await hre.ethers.getSigners();
  
  // Make sure we have enough accounts
  if (accounts.length < 8) {
    console.error("Not enough accounts for testing. Need at least 8 accounts.");
    return;
  }

  // Define zero address for invalid addresses
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Set role addresses - mix of valid and invalid addresses for demonstration
  await distributerContract.setProxyAddress(accounts[1].address); // Valid
  await distributerContract.setARoleAddress(accounts[2].address); // Valid
  await distributerContract.setBRoleAddress(ZERO_ADDRESS); // Invalid - will retain in pool
  await distributerContract.setCRoleAddress(accounts[4].address); // Valid
  await distributerContract.setPartnerAddress(accounts[5].address); // Valid
  await distributerContract.setBaseFeeAddress(ZERO_ADDRESS); // Invalid - will retain in pool
  await distributerContract.setReservedAddress(accounts[7].address); // Valid - where invalid funds will be retained
  
  console.log("Role addresses set successfully:");
  console.log(`b_proxy: ${accounts[1].address} (Valid)`);
  console.log(`b_a_role: ${accounts[2].address} (Valid)`);
  console.log(`b_b_role: ${ZERO_ADDRESS} (Invalid - funds will be retained in reserved)`);
  console.log(`b_c_role: ${accounts[4].address} (Valid)`);
  console.log(`b_partner: ${accounts[5].address} (Valid)`);
  console.log(`b_base_fee: ${ZERO_ADDRESS} (Invalid - funds will be retained in reserved)`);
  console.log(`b_reserved: ${accounts[7].address} (Valid - where invalid funds will be retained)`);
  
  console.log("\nWith this setup:");
  console.log("- Valid addresses will receive funds directly");
  console.log("- Invalid addresses (zero address) will have their funds retained in the reserved pool");
  console.log("- All funds will be transferred from the token pool only");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 