const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnhancedDistributerContract - Operator", function () {
  let enhancedDistributer;
  let mockUSDT;
  let owner;
  let operator;
  let nonOperator;
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
    [owner, operator, nonOperator, tokenPool] = await ethers.getSigners();

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
  });

  describe("Operator Management", function () {
    it("Should set owner as default operator", async function () {
      expect(await enhancedDistributer.operator()).to.equal(owner.address);
    });

    it("Should allow owner to set a new operator", async function () {
      await expect(enhancedDistributer.setOperator(operator.address))
        .to.emit(enhancedDistributer, "OperatorUpdated")
        .withArgs(owner.address, operator.address);
      
      expect(await enhancedDistributer.operator()).to.equal(operator.address);
    });

    it("Should not allow non-owner to set operator", async function () {
      await expect(
        enhancedDistributer.connect(nonOperator).setOperator(nonOperator.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow setting zero address as operator", async function () {
      await expect(
        enhancedDistributer.setOperator(ethers.ZeroAddress)
      ).to.be.revertedWith("Operator address cannot be zero");
    });

    it("Should not allow setting same address as operator", async function () {
      await expect(
        enhancedDistributer.setOperator(owner.address)
      ).to.be.revertedWith("New operator must be different from current");
    });
  });

  describe("Income Addition Access Control", function () {
    beforeEach(async function () {
      // Set operator
      await enhancedDistributer.setOperator(operator.address);
      
      // Set role addresses for testing income addition
      await enhancedDistributer.setProxyAddress(nonOperator.address);
    });

    it("Should allow operator to add income", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Operator should be able to add income
      await expect(
        enhancedDistributer.connect(operator).addIncome(IncomeType.PROXY, amount)
      ).to.not.be.reverted;
    });

    it("Should allow owner to add income", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Owner should still be able to add income
      await expect(
        enhancedDistributer.addIncome(IncomeType.PROXY, amount)
      ).to.not.be.reverted;
    });

    it("Should not allow non-operator to add income", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Non-operator should not be able to add income
      await expect(
        enhancedDistributer.connect(nonOperator).addIncome(IncomeType.PROXY, amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
    });

    it("Should allow operator to use batch income addition", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Operator should be able to add multiple incomes
      await expect(
        enhancedDistributer.connect(operator).addMultipleIncomes(amount, 0, 0, 0, 0)
      ).to.not.be.reverted;
    });

    it("Should not allow non-operator to use batch income addition", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Non-operator should not be able to add multiple incomes
      await expect(
        enhancedDistributer.connect(nonOperator).addMultipleIncomes(amount, 0, 0, 0, 0)
      ).to.be.revertedWith("Only operator or owner can call this function");
    });

    it("Should allow operator to use traditional income functions", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Operator should be able to use traditional income functions
      await expect(enhancedDistributer.connect(operator).addProxyIncome(amount)).to.not.be.reverted;
      await expect(enhancedDistributer.connect(operator).addStandardIncome(amount)).to.not.be.reverted;
      await expect(enhancedDistributer.connect(operator).addExtraIncome(amount)).to.not.be.reverted;
      await expect(enhancedDistributer.connect(operator).addNaturalIncome(amount)).to.not.be.reverted;
      await expect(enhancedDistributer.connect(operator).addBaseIncome(amount)).to.not.be.reverted;
    });

    it("Should not allow non-operator to use traditional income functions", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Non-operator should not be able to use traditional income functions
      await expect(
        enhancedDistributer.connect(nonOperator).addProxyIncome(amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
      
      await expect(
        enhancedDistributer.connect(nonOperator).addStandardIncome(amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
      
      await expect(
        enhancedDistributer.connect(nonOperator).addExtraIncome(amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
      
      await expect(
        enhancedDistributer.connect(nonOperator).addNaturalIncome(amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
      
      await expect(
        enhancedDistributer.connect(nonOperator).addBaseIncome(amount)
      ).to.be.revertedWith("Only operator or owner can call this function");
    });
  });
}); 