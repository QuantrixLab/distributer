// This script demonstrates how to interact with the DistributerContract
// It assumes the contract has already been deployed using deploy.js
const hre = require("hardhat");

async function main() {
  // Get the deployed contract addresses from the deployment
  // In a real scenario, you would store these addresses after deployment
  // For this example, we'll use hardcoded addresses from a local deployment
  const usdtAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const distributerAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contract instances
  const usdt = await hre.ethers.getContractAt("MockERC20", usdtAddress);
  const distributerContract = await hre.ethers.getContractAt("DistributerContract", distributerAddress);

  // Get signers
  const [deployer, proxy, aRole, bRole, cRole, partner, baseFee, reserved, user] = await hre.ethers.getSigners();

  console.log("Interacting with DistributerContract");
  console.log("------------------------------------");

  // Define zero address for invalid addresses
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Check current role addresses
  console.log("\nCurrent Role Addresses:");
  console.log(`Proxy: ${await distributerContract.b_proxy()}`);
  console.log(`A Role: ${await distributerContract.b_a_role()}`);
  console.log(`B Role: ${await distributerContract.b_b_role()}`);
  console.log(`C Role: ${await distributerContract.b_c_role()}`);
  console.log(`Partner: ${await distributerContract.b_partner()}`);
  console.log(`Base Fee: ${await distributerContract.b_base_fee()}`);
  console.log(`Reserved: ${await distributerContract.b_reserved()}`);

  // Set some addresses to valid and some to invalid for demonstration
  console.log("\nSetting some addresses to valid and some to invalid...");
  await distributerContract.setProxyAddress(proxy.address); // Valid
  await distributerContract.setARoleAddress(aRole.address); // Valid
  await distributerContract.setBRoleAddress(ZERO_ADDRESS); // Invalid
  await distributerContract.setCRoleAddress(cRole.address); // Valid
  await distributerContract.setPartnerAddress(partner.address); // Valid
  await distributerContract.setBaseFeeAddress(ZERO_ADDRESS); // Invalid
  await distributerContract.setReservedAddress(reserved.address); // Valid

  console.log("New Role Addresses:");
  console.log(`Proxy: ${await distributerContract.b_proxy()} (Valid)`);
  console.log(`A Role: ${await distributerContract.b_a_role()} (Valid)`);
  console.log(`B Role: ${await distributerContract.b_b_role()} (Invalid)`);
  console.log(`C Role: ${await distributerContract.b_c_role()} (Valid)`);
  console.log(`Partner: ${await distributerContract.b_partner()} (Valid)`);
  console.log(`Base Fee: ${await distributerContract.b_base_fee()} (Invalid)`);
  console.log(`Reserved: ${await distributerContract.b_reserved()} (Valid)`);

  // Check initial balances
  console.log("\nInitial USDT Balances:");
  console.log(`Proxy: ${hre.ethers.formatUnits(await usdt.balanceOf(proxy.address), 18)} USDT`);
  console.log(`A Role: ${hre.ethers.formatUnits(await usdt.balanceOf(aRole.address), 18)} USDT`);
  console.log(`C Role: ${hre.ethers.formatUnits(await usdt.balanceOf(cRole.address), 18)} USDT`);
  console.log(`Partner: ${hre.ethers.formatUnits(await usdt.balanceOf(partner.address), 18)} USDT`);
  console.log(`Reserved: ${hre.ethers.formatUnits(await usdt.balanceOf(reserved.address), 18)} USDT`);

  console.log("\nInitial Contract Balances:");
  console.log(`Proxy: ${hre.ethers.formatUnits(await distributerContract.getBalance(proxy.address), 18)} USDT`);
  console.log(`A Role: ${hre.ethers.formatUnits(await distributerContract.getBalance(aRole.address), 18)} USDT`);
  console.log(`B Role: ${hre.ethers.formatUnits(await distributerContract.getBalance(ZERO_ADDRESS), 18)} USDT`);
  console.log(`C Role: ${hre.ethers.formatUnits(await distributerContract.getBalance(cRole.address), 18)} USDT`);
  console.log(`Partner: ${hre.ethers.formatUnits(await distributerContract.getBalance(partner.address), 18)} USDT`);
  console.log(`Base Fee: ${hre.ethers.formatUnits(await distributerContract.getBalance(ZERO_ADDRESS), 18)} USDT`);
  console.log(`Reserved: ${hre.ethers.formatUnits(await distributerContract.getBalance(reserved.address), 18)} USDT`);

  // Make sure the token pool (deployer) has approved the contract to spend USDT
  const approvalAmount = hre.ethers.parseUnits("100000", 18);
  await usdt.approve(distributerAddress, approvalAmount);
  console.log(`\nApproved DistributerContract to spend ${hre.ethers.formatUnits(approvalAmount, 18)} USDT from token pool`);

  // Demonstrate each income function
  // 1. Add Proxy Income (Valid address - direct transfer)
  const proxyAmount = hre.ethers.parseUnits("1000", 18);
  await distributerContract.addProxyIncome(proxyAmount);
  console.log(`\nAdded ${hre.ethers.formatUnits(proxyAmount, 18)} USDT as proxy income`);
  console.log(`Proxy USDT balance: ${hre.ethers.formatUnits(await usdt.balanceOf(proxy.address), 18)} USDT (should increase)`);
  console.log(`Proxy contract balance: ${hre.ethers.formatUnits(await distributerContract.getBalance(proxy.address), 18)} USDT (should be 0)`);

  // 2. Add Standard Income (Mixed valid/invalid addresses)
  const standardAmount = hre.ethers.parseUnits("1000", 18);
  await distributerContract.addStandardIncome(standardAmount);
  console.log(`\nAdded ${hre.ethers.formatUnits(standardAmount, 18)} USDT as standard income`);
  
  const aAmount = standardAmount * 30n / 100n;
  const bAmount = standardAmount * 30n / 100n;
  const cAmount = standardAmount * 40n / 100n;
  
  console.log(`A Role USDT balance: ${hre.ethers.formatUnits(await usdt.balanceOf(aRole.address), 18)} USDT (should increase by ${hre.ethers.formatUnits(aAmount, 18)})`);
  console.log(`A Role contract balance: ${hre.ethers.formatUnits(await distributerContract.getBalance(aRole.address), 18)} USDT (should be 0)`);
  
  console.log(`B Role is invalid - funds should go to reserved`);
  console.log(`C Role USDT balance: ${hre.ethers.formatUnits(await usdt.balanceOf(cRole.address), 18)} USDT (should increase by ${hre.ethers.formatUnits(cAmount, 18)})`);
  console.log(`C Role contract balance: ${hre.ethers.formatUnits(await distributerContract.getBalance(cRole.address), 18)} USDT (should be 0)`);
  
  console.log(`Reserved contract balance: ${hre.ethers.formatUnits(await distributerContract.getBalance(reserved.address), 18)} USDT (should include B Role's ${hre.ethers.formatUnits(bAmount, 18)} USDT)`);

  // 3. Add Base Income (Invalid address - retain in pool)
  const baseAmount = hre.ethers.parseUnits("1000", 18);
  await distributerContract.addBaseIncome(baseAmount);
  console.log(`\nAdded ${hre.ethers.formatUnits(baseAmount, 18)} USDT as base income (to invalid address)`);
  console.log(`Base Fee is invalid - funds should go to reserved`);
  console.log(`Reserved contract balance: ${hre.ethers.formatUnits(await distributerContract.getBalance(reserved.address), 18)} USDT (should increase by ${hre.ethers.formatUnits(baseAmount, 18)})`);

  // Demonstrate withdrawal from reserved pool
  const reservedBalance = await distributerContract.getBalance(reserved.address);
  const withdrawAmount = reservedBalance / 2n;
  
  console.log(`\nReserved USDT balance before withdrawal: ${hre.ethers.formatUnits(await usdt.balanceOf(reserved.address), 18)} USDT`);
  await distributerContract.connect(reserved).withdrawBalance(withdrawAmount);
  console.log(`Reserved withdrew ${hre.ethers.formatUnits(withdrawAmount, 18)} USDT from pool`);
  console.log(`Reserved contract balance after withdrawal: ${hre.ethers.formatUnits(await distributerContract.getBalance(reserved.address), 18)} USDT`);
  console.log(`Reserved USDT balance after withdrawal: ${hre.ethers.formatUnits(await usdt.balanceOf(reserved.address), 18)} USDT`);

  // Final balances
  console.log("\nFinal USDT Balances:");
  console.log(`Proxy: ${hre.ethers.formatUnits(await usdt.balanceOf(proxy.address), 18)} USDT`);
  console.log(`A Role: ${hre.ethers.formatUnits(await usdt.balanceOf(aRole.address), 18)} USDT`);
  console.log(`C Role: ${hre.ethers.formatUnits(await usdt.balanceOf(cRole.address), 18)} USDT`);
  console.log(`Partner: ${hre.ethers.formatUnits(await usdt.balanceOf(partner.address), 18)} USDT`);
  console.log(`Reserved: ${hre.ethers.formatUnits(await usdt.balanceOf(reserved.address), 18)} USDT`);

  console.log("\nFinal Contract Balances:");
  console.log(`Proxy: ${hre.ethers.formatUnits(await distributerContract.getBalance(proxy.address), 18)} USDT`);
  console.log(`A Role: ${hre.ethers.formatUnits(await distributerContract.getBalance(aRole.address), 18)} USDT`);
  console.log(`Reserved: ${hre.ethers.formatUnits(await distributerContract.getBalance(reserved.address), 18)} USDT`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 