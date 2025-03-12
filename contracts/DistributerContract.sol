// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract DistributerContract {
    address public owner;
    address public usdtTokenAddress;
    address public tokenPool;
    
    // Role addresses
    address public b_proxy;
    address public b_a_role;
    address public b_b_role;
    address public b_c_role;
    address public b_partner;
    address public b_base_fee;
    address public b_reserved;
    
    // Balance tracking for each role
    mapping(address => uint256) public balances;
    
    // Events
    event RoleAddressUpdated(string role, address oldAddress, address newAddress);
    event USDTAddressUpdated(address oldAddress, address newAddress);
    event TokenPoolUpdated(address oldPool, address newPool);
    event ProxyIncomeAdded(uint256 amount);
    event StandardIncomeAdded(uint256 totalAmount, uint256 aAmount, uint256 bAmount, uint256 cAmount);
    event ExtraIncomeAdded(uint256 totalAmount, uint256 partnerAmount, uint256 reservedAmount);
    event NaturalIncomeAdded(uint256 amount);
    event BaseIncomeAdded(uint256 amount);
    event BalanceWithdrawn(address role, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);
    event RetainedInPool(string role, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor(address _usdtTokenAddress, address _tokenPool) {
        owner = msg.sender;
        usdtTokenAddress = _usdtTokenAddress;
        tokenPool = _tokenPool;
    }
    
    // Check if address is valid (not zero address)
    function isValidAddress(address _address) internal pure returns (bool) {
        return _address != address(0);
    }
    
    // Distribute funds to an address or retain in pool if invalid
    function distributeOrRetain(address recipient, uint256 amount, string memory role) internal {
        if (isValidAddress(recipient)) {
            // Transfer directly to the recipient
            IERC20 usdt = IERC20(usdtTokenAddress);
            require(usdt.transfer(recipient, amount), "Direct transfer failed");
            emit DirectTransfer(recipient, amount);
        } else {
            // Retain in the pool (add to balances)
            balances[b_reserved] += amount;
            emit RetainedInPool(role, amount);
        }
    }
    
    // Set role addresses
    function setProxyAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_proxy", b_proxy, _address);
        b_proxy = _address;
    }
    
    function setARoleAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_a_role", b_a_role, _address);
        b_a_role = _address;
    }
    
    function setBRoleAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_b_role", b_b_role, _address);
        b_b_role = _address;
    }
    
    function setCRoleAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_c_role", b_c_role, _address);
        b_c_role = _address;
    }
    
    function setPartnerAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_partner", b_partner, _address);
        b_partner = _address;
    }
    
    function setBaseFeeAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_base_fee", b_base_fee, _address);
        b_base_fee = _address;
    }
    
    function setReservedAddress(address _address) external onlyOwner {
        emit RoleAddressUpdated("b_reserved", b_reserved, _address);
        b_reserved = _address;
    }
    
    function setUSDTAddress(address _address) external onlyOwner {
        emit USDTAddressUpdated(usdtTokenAddress, _address);
        usdtTokenAddress = _address;
    }
    
    function setTokenPool(address _address) external onlyOwner {
        emit TokenPoolUpdated(tokenPool, _address);
        tokenPool = _address;
    }
    
    // Check if token pool has enough balance
    function checkPoolBalance(uint256 amount) internal view returns (bool) {
        IERC20 usdt = IERC20(usdtTokenAddress);
        return usdt.balanceOf(tokenPool) >= amount;
    }
    
    // Transfer USDT from pool to contract
    function transferFromPool(uint256 amount) internal {
        require(amount > 0, "Amount must be greater than 0");
        require(checkPoolBalance(amount), "Insufficient balance in token pool");
        IERC20 usdt = IERC20(usdtTokenAddress);
        require(usdt.transferFrom(tokenPool, address(this), amount), "Transfer from pool failed");
    }
    
    // 4.1 Add proxy income
    function addProxyIncome(uint256 amount) external {
        transferFromPool(amount);
        
        distributeOrRetain(b_proxy, amount, "b_proxy");
        
        emit ProxyIncomeAdded(amount);
    }
    
    // 4.2 Add standard income
    function addStandardIncome(uint256 amount) external {
        transferFromPool(amount);
        
        uint256 aAmount = (amount * 30) / 100;
        uint256 bAmount = (amount * 30) / 100;
        uint256 cAmount = (amount * 40) / 100;
        
        distributeOrRetain(b_a_role, aAmount, "b_a_role");
        distributeOrRetain(b_b_role, bAmount, "b_b_role");
        distributeOrRetain(b_c_role, cAmount, "b_c_role");
        
        emit StandardIncomeAdded(amount, aAmount, bAmount, cAmount);
    }
    
    // 4.3 Add extra income
    function addExtraIncome(uint256 amount) external {
        transferFromPool(amount);
        
        uint256 partnerAmount = (amount * 70) / 100;
        uint256 reservedAmount = (amount * 30) / 100;
        
        distributeOrRetain(b_partner, partnerAmount, "b_partner");
        distributeOrRetain(b_reserved, reservedAmount, "b_reserved");
        
        emit ExtraIncomeAdded(amount, partnerAmount, reservedAmount);
    }
    
    // 4.4 Add natural income
    function addNaturalIncome(uint256 amount) external {
        transferFromPool(amount);
        
        distributeOrRetain(b_reserved, amount, "b_reserved");
        
        emit NaturalIncomeAdded(amount);
    }
    
    // 4.5 Add base income
    function addBaseIncome(uint256 amount) external {
        transferFromPool(amount);
        
        distributeOrRetain(b_base_fee, amount, "b_base_fee");
        
        emit BaseIncomeAdded(amount);
    }
    
    // Withdraw USDT based on balance
    function withdrawBalance(uint256 amount) external {
        address role = msg.sender;
        require(balances[role] >= amount, "Insufficient balance");
        
        balances[role] -= amount;
        
        IERC20 usdt = IERC20(usdtTokenAddress);
        require(usdt.transfer(role, amount), "Transfer failed");
        
        emit BalanceWithdrawn(role, amount);
    }
    
    // View function to check balance
    function getBalance(address role) external view returns (uint256) {
        return balances[role];
    }
} 