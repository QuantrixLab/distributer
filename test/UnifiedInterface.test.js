const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnhancedDistributerContract - Unified Interface", function () {
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

  // Income type enum values
  const IncomeType = {
    PROXY: 0,
    STANDARD: 1,
    EXTRA: 2,
    NATURAL: 3,
    BASE: 4
  };

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, tokenPool] = await ethers.getSigners();

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

  describe("Unified Interface - addIncome", function () {
    it("Should correctly add proxy income using unified interface", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Use the unified interface to add proxy income
      await enhancedDistributer.addIncome(IncomeType.PROXY, amount);
      
      // Verify USDT balance of proxy address
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should correctly add standard income using unified interface", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Use the unified interface to add standard income
      await enhancedDistributer.addIncome(IncomeType.STANDARD, amount);
      
      // Calculate expected distribution
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

    it("Should correctly add extra income using unified interface", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Use the unified interface to add extra income
      await enhancedDistributer.addIncome(IncomeType.EXTRA, amount);
      
      // Calculate expected distribution
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

    it("Should correctly add natural income using unified interface", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Use the unified interface to add natural income
      await enhancedDistributer.addIncome(IncomeType.NATURAL, amount);
      
      // Verify USDT balance of reserved address
      expect(await mockUSDT.balanceOf(addr7.address)).to.equal(amount);
    });

    it("Should correctly add base income using unified interface", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Use the unified interface to add base income
      await enhancedDistributer.addIncome(IncomeType.BASE, amount);
      
      // Verify USDT balance of base fee address
      expect(await mockUSDT.balanceOf(addr6.address)).to.equal(amount);
    });

    it("Should emit IncomeAdded event with correct parameters", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Check that the event is emitted with correct parameters
      await expect(enhancedDistributer.addIncome(IncomeType.PROXY, amount))
        .to.emit(enhancedDistributer, "IncomeAdded")
        .withArgs(IncomeType.PROXY, amount);
    });

    it("Should revert when trying to add income with invalid type", async function () {
      const amount = ethers.parseUnits("100", 18);
      const invalidType = 5; // There are only 5 types (0-4)
      
      // Should revert without a specific reason
      await expect(
        enhancedDistributer.addIncome(invalidType, amount)
      ).to.be.reverted;
    });

    it("Should revert when trying to add zero amount", async function () {
      // Should revert with "Amount must be greater than 0"
      await expect(
        enhancedDistributer.addIncome(IncomeType.PROXY, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert when called by non-owner", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Should revert with "Only operator or owner can call this function"
      await expect(
        enhancedDistributer.connect(addr1).addIncome(IncomeType.PROXY, amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
    });

    it("Should revert when contract is paused", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Pause the contract
      await enhancedDistributer.pause();
      
      // Should revert with "Contract is paused"
      await expect(
        enhancedDistributer.addIncome(IncomeType.PROXY, amount)
      ).to.be.revertedWith("Contract is paused");
    });
  });

  describe("Backward Compatibility", function () {
    it("Should still support old individual functions", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Use the old individual functions
      await enhancedDistributer.addProxyIncome(amount);
      await enhancedDistributer.addStandardIncome(amount);
      await enhancedDistributer.addExtraIncome(amount);
      await enhancedDistributer.addNaturalIncome(amount);
      await enhancedDistributer.addBaseIncome(amount);
      
      // Verify all functions worked correctly
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(amount); // Proxy
      
      const aAmount = amount * 30n / 100n;
      const bAmount = amount * 30n / 100n;
      const cAmount = amount - aAmount - bAmount;
      expect(await mockUSDT.balanceOf(addr2.address)).to.equal(aAmount); // A role
      expect(await mockUSDT.balanceOf(addr3.address)).to.equal(bAmount); // B role
      expect(await mockUSDT.balanceOf(addr4.address)).to.equal(cAmount); // C role
      
      const partnerAmount = amount * 70n / 100n;
      const reservedAmount = amount - partnerAmount;
      expect(await mockUSDT.balanceOf(addr5.address)).to.equal(partnerAmount); // Partner
      
      expect(await mockUSDT.balanceOf(addr6.address)).to.equal(amount); // Base fee
      
      // Reserved address gets from both natural income and extra income
      expect(await mockUSDT.balanceOf(addr7.address)).to.equal(amount + reservedAmount);
    });
  });
}); 