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

/**
 * @title EnhancedDistributerContract
 * @dev Contract for distributing USDT based on predefined rules
 * @notice This contract has been enhanced with security features
 */
contract EnhancedDistributerContract {
    address public owner;
    address public pendingOwner;
    address public usdtTokenAddress;
    address public tokenPool;
    
    // 操作者地址，只有这个地址才能执行收入添加操作
    address public operator;
    
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
    
    // Reentrancy guard
    bool private _locked;
    
    // Pause mechanism
    bool public paused;
    
    // Income type enum for unified interface
    enum IncomeType {
        PROXY,      // Proxy income (100% to b_proxy)
        STANDARD,   // Standard income (30% to b_a_role, 30% to b_b_role, 40% to b_c_role)
        EXTRA,      // Extra income (70% to b_partner, 30% to b_reserved)
        NATURAL,    // Natural income (100% to b_reserved)
        BASE        // Base income (100% to b_base_fee)
    }
    
    // Struct to return distribution details
    struct DistributionResult {
        uint256 totalAmount;
        uint256 proxyAmount;
        uint256 standardAmount;
        uint256 extraAmount;
        uint256 naturalAmount;
        uint256 baseAmount;
        bool proxyProcessed;
        bool standardProcessed;
        bool extraProcessed;
        bool naturalProcessed;
        bool baseProcessed;
    }
    
    // Events
    event RoleAddressUpdated(string indexed role, address oldAddress, address newAddress);
    event USDTAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event TokenPoolUpdated(address indexed oldPool, address indexed newPool);
    event ProxyIncomeAdded(uint256 amount);
    event StandardIncomeAdded(uint256 totalAmount, uint256 aAmount, uint256 bAmount, uint256 cAmount);
    event ExtraIncomeAdded(uint256 totalAmount, uint256 partnerAmount, uint256 reservedAmount);
    event NaturalIncomeAdded(uint256 amount);
    event BaseIncomeAdded(uint256 amount);
    event BalanceWithdrawn(address indexed role, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);
    event RetainedInPool(string indexed role, uint256 amount);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferCompleted(address indexed previousOwner, address indexed newOwner);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event IncomeAdded(IncomeType indexed incomeType, uint256 amount);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Only operator or owner can call this function");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    
    constructor(address _usdtTokenAddress, address _tokenPool) {
        require(_usdtTokenAddress != address(0), "USDT address cannot be zero");
        require(_tokenPool != address(0), "Token pool address cannot be zero");
        
        owner = msg.sender;
        operator = msg.sender; // 初始化操作者为合约部署者
        usdtTokenAddress = _usdtTokenAddress;
        tokenPool = _tokenPool;
        _locked = false;
        paused = false;
    }
    
    /**
     * @dev Sets the operator address
     * @param _operator The new operator address
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Operator address cannot be zero");
        require(_operator != operator, "New operator must be different from current");
        
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }
    
    /**
     * @dev Pauses the contract
     */
    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(msg.sender);
    }
    
    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }
    
    /**
     * @dev Initiates ownership transfer to a new address
     * @param newOwner The address to transfer ownership to
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, pendingOwner);
    }
    
    /**
     * @dev Completes the ownership transfer process
     * @notice Only the pending owner can call this function
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Only pending owner can accept ownership");
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferCompleted(oldOwner, owner);
    }
    
    // Check if address is valid (not zero address)
    function isValidAddress(address _address) internal pure returns (bool) {
        return _address != address(0);
    }
    
    // Distribute funds to an address or retain in pool if invalid
    function distributeOrRetain(address recipient, uint256 amount, string memory role) internal {
        require(amount > 0, "Amount must be greater than 0");
        
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
        require(_address != b_proxy, "New address must be different from current");
        emit RoleAddressUpdated("b_proxy", b_proxy, _address);
        b_proxy = _address;
    }
    
    function setARoleAddress(address _address) external onlyOwner {
        require(_address != b_a_role, "New address must be different from current");
        emit RoleAddressUpdated("b_a_role", b_a_role, _address);
        b_a_role = _address;
    }
    
    function setBRoleAddress(address _address) external onlyOwner {
        require(_address != b_b_role, "New address must be different from current");
        emit RoleAddressUpdated("b_b_role", b_b_role, _address);
        b_b_role = _address;
    }
    
    function setCRoleAddress(address _address) external onlyOwner {
        require(_address != b_c_role, "New address must be different from current");
        emit RoleAddressUpdated("b_c_role", b_c_role, _address);
        b_c_role = _address;
    }
    
    function setPartnerAddress(address _address) external onlyOwner {
        require(_address != b_partner, "New address must be different from current");
        emit RoleAddressUpdated("b_partner", b_partner, _address);
        b_partner = _address;
    }
    
    function setBaseFeeAddress(address _address) external onlyOwner {
        require(_address != b_base_fee, "New address must be different from current");
        emit RoleAddressUpdated("b_base_fee", b_base_fee, _address);
        b_base_fee = _address;
    }
    
    function setReservedAddress(address _address) external onlyOwner {
        require(_address != b_reserved, "New address must be different from current");
        emit RoleAddressUpdated("b_reserved", b_reserved, _address);
        b_reserved = _address;
    }
    
    function setUSDTAddress(address _address) external onlyOwner {
        require(_address != address(0), "USDT address cannot be zero");
        require(_address != usdtTokenAddress, "New address must be different from current");
        emit USDTAddressUpdated(usdtTokenAddress, _address);
        usdtTokenAddress = _address;
    }
    
    function setTokenPool(address _address) external onlyOwner {
        require(_address != address(0), "Token pool address cannot be zero");
        require(_address != tokenPool, "New address must be different from current");
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
    
    /**
     * @dev Unified interface for adding income
     * @param incomeType The type of income to add (PROXY, STANDARD, EXTRA, NATURAL, BASE)
     * @param amount The amount of income to add
     */
    function addIncome(IncomeType incomeType, uint256 amount) external whenNotPaused onlyOperator {
        require(amount > 0, "Amount must be greater than 0");
        
        if (incomeType == IncomeType.PROXY) {
            _addProxyIncome(amount);
        } else if (incomeType == IncomeType.STANDARD) {
            _addStandardIncome(amount);
        } else if (incomeType == IncomeType.EXTRA) {
            _addExtraIncome(amount);
        } else if (incomeType == IncomeType.NATURAL) {
            _addNaturalIncome(amount);
        } else if (incomeType == IncomeType.BASE) {
            _addBaseIncome(amount);
        } else {
            revert("Invalid income type");
        }
        
        emit IncomeAdded(incomeType, amount);
    }
    
    /**
     * @dev Batch interface for adding multiple types of income at once
     * @param proxyAmount Amount for proxy income
     * @param standardAmount Amount for standard income
     * @param extraAmount Amount for extra income
     * @param naturalAmount Amount for natural income
     * @param baseAmount Amount for base income
     * @return result Struct containing details about the distribution
     */
    function addMultipleIncomes(
        uint256 proxyAmount,
        uint256 standardAmount,
        uint256 extraAmount,
        uint256 naturalAmount,
        uint256 baseAmount
    ) external whenNotPaused onlyOperator returns (DistributionResult memory result) {
        // Check if at least one amount is greater than zero
        require(
            proxyAmount > 0 || standardAmount > 0 || extraAmount > 0 || 
            naturalAmount > 0 || baseAmount > 0,
            "At least one amount must be greater than 0"
        );
        
        // Initialize result struct
        result.totalAmount = 0;
        result.proxyAmount = proxyAmount;
        result.standardAmount = standardAmount;
        result.extraAmount = extraAmount;
        result.naturalAmount = naturalAmount;
        result.baseAmount = baseAmount;
        
        // Add proxy income if amount > 0
        if (proxyAmount > 0) {
            _addProxyIncome(proxyAmount);
            emit IncomeAdded(IncomeType.PROXY, proxyAmount);
            result.totalAmount += proxyAmount;
            result.proxyProcessed = true;
        }
        
        // Add standard income if amount > 0
        if (standardAmount > 0) {
            _addStandardIncome(standardAmount);
            emit IncomeAdded(IncomeType.STANDARD, standardAmount);
            result.totalAmount += standardAmount;
            result.standardProcessed = true;
        }
        
        // Add extra income if amount > 0
        if (extraAmount > 0) {
            _addExtraIncome(extraAmount);
            emit IncomeAdded(IncomeType.EXTRA, extraAmount);
            result.totalAmount += extraAmount;
            result.extraProcessed = true;
        }
        
        // Add natural income if amount > 0
        if (naturalAmount > 0) {
            _addNaturalIncome(naturalAmount);
            emit IncomeAdded(IncomeType.NATURAL, naturalAmount);
            result.totalAmount += naturalAmount;
            result.naturalProcessed = true;
        }
        
        // Add base income if amount > 0
        if (baseAmount > 0) {
            _addBaseIncome(baseAmount);
            emit IncomeAdded(IncomeType.BASE, baseAmount);
            result.totalAmount += baseAmount;
            result.baseProcessed = true;
        }
        
        return result;
    }
    
    // 4.1 Add proxy income (internal version)
    function _addProxyIncome(uint256 amount) internal {
        transferFromPool(amount);
        
        distributeOrRetain(b_proxy, amount, "b_proxy");
        
        emit ProxyIncomeAdded(amount);
    }
    
    // 4.1 Add proxy income (external version for backward compatibility)
    function addProxyIncome(uint256 amount) external whenNotPaused onlyOperator {
        _addProxyIncome(amount);
    }
    
    // 4.2 Add standard income (internal version)
    function _addStandardIncome(uint256 amount) internal {
        transferFromPool(amount);
        
        uint256 aAmount = (amount * 30) / 100;
        uint256 bAmount = (amount * 30) / 100;
        uint256 cAmount = amount - aAmount - bAmount; // Prevent rounding errors
        
        // Verify distribution adds up to total amount
        require(aAmount + bAmount + cAmount == amount, "Distribution error: amounts don't add up");
        
        distributeOrRetain(b_a_role, aAmount, "b_a_role");
        distributeOrRetain(b_b_role, bAmount, "b_b_role");
        distributeOrRetain(b_c_role, cAmount, "b_c_role");
        
        emit StandardIncomeAdded(amount, aAmount, bAmount, cAmount);
    }
    
    // 4.2 Add standard income (external version for backward compatibility)
    function addStandardIncome(uint256 amount) external whenNotPaused onlyOperator {
        _addStandardIncome(amount);
    }
    
    // 4.3 Add extra income (internal version)
    function _addExtraIncome(uint256 amount) internal {
        transferFromPool(amount);
        
        uint256 partnerAmount = (amount * 70) / 100;
        uint256 reservedAmount = amount - partnerAmount; // Prevent rounding errors
        
        // Verify distribution adds up to total amount
        require(partnerAmount + reservedAmount == amount, "Distribution error: amounts don't add up");
        
        distributeOrRetain(b_partner, partnerAmount, "b_partner");
        distributeOrRetain(b_reserved, reservedAmount, "b_reserved");
        
        emit ExtraIncomeAdded(amount, partnerAmount, reservedAmount);
    }
    
    // 4.3 Add extra income (external version for backward compatibility)
    function addExtraIncome(uint256 amount) external whenNotPaused onlyOperator {
        _addExtraIncome(amount);
    }
    
    // 4.4 Add natural income (internal version)
    function _addNaturalIncome(uint256 amount) internal {
        transferFromPool(amount);
        
        distributeOrRetain(b_reserved, amount, "b_reserved");
        
        emit NaturalIncomeAdded(amount);
    }
    
    // 4.4 Add natural income (external version for backward compatibility)
    function addNaturalIncome(uint256 amount) external whenNotPaused onlyOperator {
        _addNaturalIncome(amount);
    }
    
    // 4.5 Add base income (internal version)
    function _addBaseIncome(uint256 amount) internal {
        transferFromPool(amount);
        
        distributeOrRetain(b_base_fee, amount, "b_base_fee");
        
        emit BaseIncomeAdded(amount);
    }
    
    // 4.5 Add base income (external version for backward compatibility)
    function addBaseIncome(uint256 amount) external whenNotPaused onlyOperator {
        _addBaseIncome(amount);
    }
    
    // Withdraw USDT based on balance
    function withdrawBalance(uint256 amount) external whenNotPaused nonReentrant {
        address role = msg.sender;
        require(amount > 0, "Amount must be greater than 0");
        require(balances[role] >= amount, "Insufficient balance");
        
        // Update state before external call to prevent reentrancy
        balances[role] -= amount;
        
        IERC20 usdt = IERC20(usdtTokenAddress);
        require(usdt.transfer(role, amount), "Transfer failed");
        
        emit BalanceWithdrawn(role, amount);
    }
    
    // View function to check balance
    function getBalance(address role) external view returns (uint256) {
        return balances[role];
    }
    
    // Emergency function to recover tokens sent to this contract by mistake
    function recoverERC20(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "Token address cannot be zero");
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(owner, amount), "Token recovery failed");
    }
} 