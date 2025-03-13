const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnhancedDistributerContract - Multiple Incomes", function () {
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

  describe("Multiple Incomes - addMultipleIncomes", function () {
    it("Should correctly add all types of income at once", async function () {
      const proxyAmount = ethers.parseUnits("100", 18);
      const standardAmount = ethers.parseUnits("200", 18);
      const extraAmount = ethers.parseUnits("300", 18);
      const naturalAmount = ethers.parseUnits("400", 18);
      const baseAmount = ethers.parseUnits("500", 18);
      
      // Use the multiple incomes interface
      const tx = await enhancedDistributer.addMultipleIncomes(
        proxyAmount,
        standardAmount,
        extraAmount,
        naturalAmount,
        baseAmount
      );
      
      // We don't need to verify the return struct in the test
      // as it's not easily accessible in JavaScript
      // Instead, we'll verify the actual token balances
      
      // Verify USDT balances for each role
      
      // Proxy income
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(proxyAmount);
      
      // Standard income
      const aAmount = standardAmount * 30n / 100n;
      const bAmount = standardAmount * 30n / 100n;
      const cAmount = standardAmount - aAmount - bAmount;
      expect(await mockUSDT.balanceOf(addr2.address)).to.equal(aAmount);
      expect(await mockUSDT.balanceOf(addr3.address)).to.equal(bAmount);
      expect(await mockUSDT.balanceOf(addr4.address)).to.equal(cAmount);
      
      // Extra income
      const partnerAmount = extraAmount * 70n / 100n;
      const extraReservedAmount = extraAmount - partnerAmount;
      expect(await mockUSDT.balanceOf(addr5.address)).to.equal(partnerAmount);
      
      // Base income
      expect(await mockUSDT.balanceOf(addr6.address)).to.equal(baseAmount);
      
      // Reserved address gets from both natural income and extra income
      expect(await mockUSDT.balanceOf(addr7.address)).to.equal(naturalAmount + extraReservedAmount);
    });

    it("Should correctly add only non-zero amounts", async function () {
      const proxyAmount = ethers.parseUnits("100", 18);
      const standardAmount = ethers.parseUnits("0", 18);
      const extraAmount = ethers.parseUnits("300", 18);
      const naturalAmount = ethers.parseUnits("0", 18);
      const baseAmount = ethers.parseUnits("500", 18);
      
      // Use the multiple incomes interface with some zero amounts
      const tx = await enhancedDistributer.addMultipleIncomes(
        proxyAmount,
        standardAmount,
        extraAmount,
        naturalAmount,
        baseAmount
      );
      
      // We don't need to verify the return struct in the test
      // Instead, we'll verify the actual token balances
      
      // Verify USDT balances - only non-zero amounts should be processed
      
      // Proxy income
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(proxyAmount);
      
      // Standard income - should be zero
      expect(await mockUSDT.balanceOf(addr2.address)).to.equal(0);
      expect(await mockUSDT.balanceOf(addr3.address)).to.equal(0);
      expect(await mockUSDT.balanceOf(addr4.address)).to.equal(0);
      
      // Extra income
      const partnerAmount = extraAmount * 70n / 100n;
      const extraReservedAmount = extraAmount - partnerAmount;
      expect(await mockUSDT.balanceOf(addr5.address)).to.equal(partnerAmount);
      
      // Base income
      expect(await mockUSDT.balanceOf(addr6.address)).to.equal(baseAmount);
      
      // Reserved address gets only from extra income (natural is zero)
      expect(await mockUSDT.balanceOf(addr7.address)).to.equal(extraReservedAmount);
    });

    it("Should revert when all amounts are zero", async function () {
      // Should revert with "At least one amount must be greater than 0"
      await expect(
        enhancedDistributer.addMultipleIncomes(0, 0, 0, 0, 0)
      ).to.be.revertedWith("At least one amount must be greater than 0");
    });

    it("Should revert when called by non-owner", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Should revert with "Only operator or owner can call this function"
      await expect(
        enhancedDistributer.connect(addr1).addMultipleIncomes(amount, 0, 0, 0, 0)
      ).to.be.revertedWith("Only operator or owner can call this function");
    });

    it("Should revert when contract is paused", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      // Pause the contract
      await enhancedDistributer.pause();
      
      // Should revert with "Contract is paused"
      await expect(
        enhancedDistributer.addMultipleIncomes(amount, 0, 0, 0, 0)
      ).to.be.revertedWith("Contract is paused");
    });

    it("Should emit IncomeAdded events for each non-zero amount", async function () {
      const proxyAmount = ethers.parseUnits("100", 18);
      const standardAmount = ethers.parseUnits("0", 18);
      const extraAmount = ethers.parseUnits("300", 18);
      const naturalAmount = ethers.parseUnits("0", 18);
      const baseAmount = ethers.parseUnits("500", 18);
      
      // Check that events are emitted only for non-zero amounts
      const tx = await enhancedDistributer.addMultipleIncomes(
        proxyAmount,
        standardAmount,
        extraAmount,
        naturalAmount,
        baseAmount
      );
      
      const receipt = await tx.wait();
      
      // Filter events by name
      const incomeAddedEvents = receipt.logs
        .filter(log => {
          try {
            const parsedLog = enhancedDistributer.interface.parseLog(log);
            return parsedLog && parsedLog.name === "IncomeAdded";
          } catch (e) {
            return false;
          }
        })
        .map(log => enhancedDistributer.interface.parseLog(log));
      
      // Should have 3 IncomeAdded events (for proxy, extra, and base)
      expect(incomeAddedEvents.length).to.equal(3);
      
      // Verify event arguments
      expect(incomeAddedEvents[0].args[0]).to.equal(IncomeType.PROXY);
      expect(incomeAddedEvents[0].args[1]).to.equal(proxyAmount);
      
      expect(incomeAddedEvents[1].args[0]).to.equal(IncomeType.EXTRA);
      expect(incomeAddedEvents[1].args[1]).to.equal(extraAmount);
      
      expect(incomeAddedEvents[2].args[0]).to.equal(IncomeType.BASE);
      expect(incomeAddedEvents[2].args[1]).to.equal(baseAmount);
    });
  });
}); 