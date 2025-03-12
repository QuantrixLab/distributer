const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DistributerContract", function () {
  let distributerContract;
  let usdt;
  let owner, tokenPool;
  let proxy, aRole, bRole, cRole, partner, baseFee, reserved, user;
  const initialSupply = ethers.parseUnits("1000000", 18);
  const testAmount = ethers.parseUnits("1000", 18);
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [owner, tokenPool, proxy, aRole, bRole, cRole, partner, baseFee, reserved, user] = await ethers.getSigners();

    // Deploy MockERC20 (USDT)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20.deploy("USDT Token", "USDT", initialSupply);
    await usdt.waitForDeployment();

    // Transfer some USDT to the tokenPool for testing
    await usdt.transfer(tokenPool.address, ethers.parseUnits("500000", 18));

    // Deploy DistributerContract
    const DistributerContract = await ethers.getContractFactory("DistributerContract");
    distributerContract = await DistributerContract.deploy(await usdt.getAddress(), tokenPool.address);
    await distributerContract.waitForDeployment();

    // Set role addresses
    await distributerContract.setProxyAddress(proxy.address);
    await distributerContract.setARoleAddress(aRole.address);
    await distributerContract.setBRoleAddress(bRole.address);
    await distributerContract.setCRoleAddress(cRole.address);
    await distributerContract.setPartnerAddress(partner.address);
    await distributerContract.setBaseFeeAddress(baseFee.address);
    await distributerContract.setReservedAddress(reserved.address);

    // Approve the contract to spend USDT from tokenPool
    await usdt.connect(tokenPool).approve(await distributerContract.getAddress(), ethers.parseUnits("500000", 18));
  });

  describe("Role address setting", function () {
    it("Should set role addresses correctly", async function () {
      expect(await distributerContract.b_proxy()).to.equal(proxy.address);
      expect(await distributerContract.b_a_role()).to.equal(aRole.address);
      expect(await distributerContract.b_b_role()).to.equal(bRole.address);
      expect(await distributerContract.b_c_role()).to.equal(cRole.address);
      expect(await distributerContract.b_partner()).to.equal(partner.address);
      expect(await distributerContract.b_base_fee()).to.equal(baseFee.address);
      expect(await distributerContract.b_reserved()).to.equal(reserved.address);
    });

    it("Should only allow owner to set addresses", async function () {
      await expect(
        distributerContract.connect(user).setProxyAddress(user.address)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Income distribution with valid addresses", function () {
    it("Should add proxy income correctly and transfer directly", async function () {
      const initialBalance = await usdt.balanceOf(proxy.address);
      await distributerContract.connect(user).addProxyIncome(testAmount);
      
      // Check that the funds were transferred directly to the proxy
      expect(await usdt.balanceOf(proxy.address)).to.equal(initialBalance + testAmount);
      // Balance in contract should be 0
      expect(await distributerContract.getBalance(proxy.address)).to.equal(0);
    });

    it("Should add standard income correctly and transfer directly", async function () {
      const initialABalance = await usdt.balanceOf(aRole.address);
      const initialBBalance = await usdt.balanceOf(bRole.address);
      const initialCBalance = await usdt.balanceOf(cRole.address);
      
      await distributerContract.connect(user).addStandardIncome(testAmount);
      
      const aAmount = testAmount * 30n / 100n;
      const bAmount = testAmount * 30n / 100n;
      const cAmount = testAmount * 40n / 100n;
      
      // Check that the funds were transferred directly
      expect(await usdt.balanceOf(aRole.address)).to.equal(initialABalance + aAmount);
      expect(await usdt.balanceOf(bRole.address)).to.equal(initialBBalance + bAmount);
      expect(await usdt.balanceOf(cRole.address)).to.equal(initialCBalance + cAmount);
      
      // Balances in contract should be 0
      expect(await distributerContract.getBalance(aRole.address)).to.equal(0);
      expect(await distributerContract.getBalance(bRole.address)).to.equal(0);
      expect(await distributerContract.getBalance(cRole.address)).to.equal(0);
    });
  });

  describe("Income distribution with invalid addresses", function () {
    it("Should retain proxy income in pool if proxy address is invalid", async function () {
      // Set proxy address to zero address
      await distributerContract.setProxyAddress(ZERO_ADDRESS);
      
      await distributerContract.connect(user).addProxyIncome(testAmount);
      
      // Check that the funds were retained in the reserved balance
      expect(await distributerContract.getBalance(reserved.address)).to.equal(testAmount);
    });

    it("Should retain standard income in pool if role addresses are invalid", async function () {
      // Set role addresses to zero address
      await distributerContract.setARoleAddress(ZERO_ADDRESS);
      await distributerContract.setBRoleAddress(ZERO_ADDRESS);
      await distributerContract.setCRoleAddress(ZERO_ADDRESS);
      
      await distributerContract.connect(user).addStandardIncome(testAmount);
      
      // All funds should be retained in the reserved balance
      expect(await distributerContract.getBalance(reserved.address)).to.equal(testAmount);
    });

    it("Should handle mixed valid and invalid addresses correctly", async function () {
      // Set some addresses to zero
      await distributerContract.setARoleAddress(ZERO_ADDRESS);
      await distributerContract.setBRoleAddress(ZERO_ADDRESS);
      
      const initialCBalance = await usdt.balanceOf(cRole.address);
      
      await distributerContract.connect(user).addStandardIncome(testAmount);
      
      const aAmount = testAmount * 30n / 100n;
      const bAmount = testAmount * 30n / 100n;
      const cAmount = testAmount * 40n / 100n;
      
      // A and B portions should be retained in reserved
      expect(await distributerContract.getBalance(reserved.address)).to.equal(aAmount + bAmount);
      
      // C portion should be transferred directly
      expect(await usdt.balanceOf(cRole.address)).to.equal(initialCBalance + cAmount);
      expect(await distributerContract.getBalance(cRole.address)).to.equal(0);
    });
  });

  describe("Balance withdrawal", function () {
    it("Should allow roles to withdraw their balance", async function () {
      // Set proxy address to zero to force retention in pool
      await distributerContract.setProxyAddress(ZERO_ADDRESS);
      
      // Add income to proxy (will be retained in reserved)
      await distributerContract.connect(user).addProxyIncome(testAmount);
      
      // Check initial balance
      const initialBalance = await usdt.balanceOf(reserved.address);
      
      // Withdraw half of the balance
      const withdrawAmount = testAmount / 2n;
      await distributerContract.connect(reserved).withdrawBalance(withdrawAmount);
      
      // Check balances after withdrawal
      expect(await distributerContract.getBalance(reserved.address)).to.equal(testAmount - withdrawAmount);
      expect(await usdt.balanceOf(reserved.address)).to.equal(initialBalance + withdrawAmount);
    });

    it("Should revert if trying to withdraw more than balance", async function () {
      // Set proxy address to zero to force retention in pool
      await distributerContract.setProxyAddress(ZERO_ADDRESS);
      
      // Add income to proxy (will be retained in reserved)
      await distributerContract.connect(user).addProxyIncome(testAmount);
      
      // Try to withdraw more than balance
      await expect(
        distributerContract.connect(reserved).withdrawBalance(testAmount + 1n)
      ).to.be.revertedWith("Insufficient balance");
    });
  });
}); 