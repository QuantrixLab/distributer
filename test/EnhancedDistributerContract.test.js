const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnhancedDistributerContract", function () {
  let enhancedDistributer;
  let mockUSDT;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let addr5;
  let addr6;
  let addr7;
  let tokenPool;
  let attacker;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, tokenPool, attacker] = await ethers.getSigners();

    // Deploy MockERC20 for USDT
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDT = await MockERC20.deploy("USDT", "USDT", ethers.parseUnits("1000000", 18));
    
    // Deploy EnhancedDistributerContract
    const EnhancedDistributerContract = await ethers.getContractFactory("EnhancedDistributerContract");
    enhancedDistributer = await EnhancedDistributerContract.deploy(await mockUSDT.getAddress(), tokenPool.address);
    
    // Transfer USDT to tokenPool
    await mockUSDT.transfer(tokenPool.address, ethers.parseUnits("100000", 18));
    
    // Approve distributerContract to spend tokenPool's USDT
    await mockUSDT.connect(tokenPool).approve(await enhancedDistributer.getAddress(), ethers.parseUnits("100000", 18));

    // Set role addresses
    await enhancedDistributer.setProxyAddress(addr1.address);
    await enhancedDistributer.setARoleAddress(addr2.address);
    await enhancedDistributer.setBRoleAddress(addr3.address);
    await enhancedDistributer.setCRoleAddress(addr4.address);
    await enhancedDistributer.setPartnerAddress(addr5.address);
    await enhancedDistributer.setBaseFeeAddress(addr6.address);
    await enhancedDistributer.setReservedAddress(addr7.address);
  });

  describe("Ownership Management", function () {
    it("Should set the right owner", async function () {
      expect(await enhancedDistributer.owner()).to.equal(owner.address);
    });

    it("Should allow ownership transfer with two-step process", async function () {
      // Initiate ownership transfer
      await enhancedDistributer.transferOwnership(addr1.address);
      expect(await enhancedDistributer.pendingOwner()).to.equal(addr1.address);
      
      // Complete ownership transfer
      await enhancedDistributer.connect(addr1).acceptOwnership();
      expect(await enhancedDistributer.owner()).to.equal(addr1.address);
      expect(await enhancedDistributer.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("Should prevent non-pending owner from accepting ownership", async function () {
      await enhancedDistributer.transferOwnership(addr1.address);
      await expect(
        enhancedDistributer.connect(addr2).acceptOwnership()
      ).to.be.revertedWith("Only pending owner can accept ownership");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause and unpause the contract", async function () {
      // Pause the contract
      await enhancedDistributer.pause();
      expect(await enhancedDistributer.paused()).to.equal(true);
      
      // Try to add income while paused
      await expect(
        enhancedDistributer.addProxyIncome(ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Contract is paused");
      
      // Unpause the contract
      await enhancedDistributer.unpause();
      expect(await enhancedDistributer.paused()).to.equal(false);
      
      // Should work after unpausing
      await enhancedDistributer.addProxyIncome(ethers.parseUnits("100", 18));
    });
  });

  describe("Zero Address Validation", function () {
    it("Should prevent setting zero addresses for critical parameters", async function () {
      await expect(
        enhancedDistributer.setUSDTAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("USDT address cannot be zero");
      
      await expect(
        enhancedDistributer.setTokenPool(ethers.ZeroAddress)
      ).to.be.revertedWith("Token pool address cannot be zero");
    });
  });

  describe("Income Distribution", function () {
    it("Should correctly distribute standard income and verify totals", async function () {
      const amount = ethers.parseUnits("100", 18);
      await enhancedDistributer.addStandardIncome(amount);
      
      // Check balances - should be direct transfers, not balances
      const aAmount = amount * 30n / 100n;
      const bAmount = amount * 30n / 100n;
      const cAmount = amount - aAmount - bAmount;
      
      // Verify USDT balances
      expect(await mockUSDT.balanceOf(addr2.address)).to.equal(aAmount);
      expect(await mockUSDT.balanceOf(addr3.address)).to.equal(bAmount);
      expect(await mockUSDT.balanceOf(addr4.address)).to.equal(cAmount);
      
      // Verify total adds up
      const totalDistributed = BigInt(await mockUSDT.balanceOf(addr2.address)) +
        BigInt(await mockUSDT.balanceOf(addr3.address)) +
        BigInt(await mockUSDT.balanceOf(addr4.address));
      
      expect(totalDistributed).to.equal(amount);
    });

    it("Should correctly distribute extra income and verify totals", async function () {
      const amount = ethers.parseUnits("100", 18);
      await enhancedDistributer.addExtraIncome(amount);
      
      const partnerAmount = amount * 70n / 100n;
      const reservedAmount = amount - partnerAmount;
      
      // Verify USDT balances
      expect(await mockUSDT.balanceOf(addr5.address)).to.equal(partnerAmount);
      expect(await mockUSDT.balanceOf(addr7.address)).to.equal(reservedAmount);
      
      // Verify total adds up
      const totalDistributed = BigInt(await mockUSDT.balanceOf(addr5.address)) +
        BigInt(await mockUSDT.balanceOf(addr7.address));
      
      expect(totalDistributed).to.equal(amount);
    });
  });

  describe("Emergency Recovery", function () {
    it("Should allow owner to recover tokens sent by mistake", async function () {
      // Send some tokens directly to the contract
      await mockUSDT.transfer(await enhancedDistributer.getAddress(), ethers.parseUnits("1000", 18));
      
      const initialOwnerBalance = await mockUSDT.balanceOf(owner.address);
      
      // Recover the tokens
      await enhancedDistributer.recoverERC20(await mockUSDT.getAddress(), ethers.parseUnits("1000", 18));
      
      // Check owner balance increased
      const finalOwnerBalance = await mockUSDT.balanceOf(owner.address);
      expect(BigInt(finalOwnerBalance) - BigInt(initialOwnerBalance)).to.equal(ethers.parseUnits("1000", 18));
    });
  });

  describe("Access Control", function () {
    it("Should prevent non-owners from calling restricted functions", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Non-owner should not be able to call restricted functions
      await expect(
        enhancedDistributer.connect(addr1).addProxyIncome(amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
      
      await expect(
        enhancedDistributer.connect(addr1).pause()
      ).to.be.revertedWith("Only owner can call this function");
      
      await expect(
        enhancedDistributer.connect(addr1).setProxyAddress(addr2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Input Validation", function () {
    it("Should validate amount is greater than zero", async function () {
      await expect(
        enhancedDistributer.addProxyIncome(0)
      ).to.be.revertedWith("Amount must be greater than 0");
      
      await expect(
        enhancedDistributer.connect(addr1).withdrawBalance(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Rounding Error Prevention", function () {
    it("Should prevent rounding errors in standard income distribution", async function () {
      // Use an amount that would cause rounding errors with direct percentage calculation
      const amount = ethers.parseUnits("100", 18) + 1n;
      await enhancedDistributer.addStandardIncome(amount);
      
      const aAmount = amount * 30n / 100n;
      const bAmount = amount * 30n / 100n;
      const cAmount = amount - aAmount - bAmount; // This ensures no rounding error
      
      // Verify total adds up exactly to the original amount
      const totalDistributed = BigInt(await mockUSDT.balanceOf(addr2.address)) +
        BigInt(await mockUSDT.balanceOf(addr3.address)) +
        BigInt(await mockUSDT.balanceOf(addr4.address));
      
      expect(totalDistributed).to.equal(amount);
    });

    it("Should prevent rounding errors in extra income distribution", async function () {
      // Use an amount that would cause rounding errors with direct percentage calculation
      const amount = ethers.parseUnits("100", 18) + 1n;
      await enhancedDistributer.addExtraIncome(amount);
      
      const partnerAmount = amount * 70n / 100n;
      const reservedAmount = amount - partnerAmount; // This ensures no rounding error
      
      // Verify total adds up exactly to the original amount
      const totalDistributed = BigInt(await mockUSDT.balanceOf(addr5.address)) +
        BigInt(await mockUSDT.balanceOf(addr7.address));
      
      expect(totalDistributed).to.equal(amount);
    });
  });
});