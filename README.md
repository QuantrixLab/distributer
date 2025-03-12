# 分配器合约 (Distributer Contract)

一个兼容 TRON (TRC) 的智能合约，用于根据特定分配规则向不同角色分配 USDT。

## 概述

分配器合约旨在管理系统内不同角色之间的 USDT 代币分配。它允许设置不同角色的地址，并根据预定义的分配规则分配资金。

## 功能特点

- 设置 7 个不同的角色地址：b_proxy, b_a_role, b_b_role, b_c_role, b_partner, b_base_fee, b_reserved
- 跟踪每个角色的 USDT 余额
- 允许角色提取其 USDT 余额
- 五个不同的收入分配函数，具有特定的分配规则：
  1. 代理收入：100% 分配给 b_proxy
  2. 标准收入：30% 分配给 b_a_role，30% 分配给 b_b_role，40% 分配给 b_c_role
  3. 额外收入：70% 分配给 b_partner，30% 分配给 b_reserved
  4. 自然收入：100% 分配给 b_reserved
  5. 基础收入：100% 分配给 b_base_fee
- 智能地址处理：
  - 有效地址直接接收资金转账
  - 无效地址（零地址）的资金保留在 reserved 池中
- 所有资金仅从代币池中转移

## 合约结构

- `DistributerContract.sol`：实现分配逻辑的主合约
- `MockERC20.sol`：用于测试目的的简单 ERC20 代币实现

## 设置和安装

### 前提条件

- Node.js v22 或更高版本
- npm 或 yarn

### 安装

1. 克隆仓库：
   ```
   git clone <仓库地址>
   cd distributer
   ```

2. 安装依赖：
   ```
   npm install
   ```

3. 编译合约：
   ```
   npx hardhat compile
   ```

### 测试

运行测试套件：
```
npx hardhat test
```

### 部署

1. 在 `hardhat.config.js` 中配置您的部署网络
2. 设置环境变量（如需要）
3. 运行部署脚本：
   ```
   npx hardhat run scripts/deploy.js --network <网络名称>
   ```

## 使用方法

部署后，合约所有者需要：

1. 使用适当的设置函数设置角色地址
   - 有效地址将直接接收资金
   - 无效地址（零地址）的资金将保留在 reserved 池中
2. 确保代币池有足够的 USDT 并已批准合约花费它

用户随后可以调用收入分配函数，这些函数将：
1. 从代币池转移 USDT 到合约
2. 根据分配规则分配资金：
   - 对于有效地址：直接转账给接收者
   - 对于无效地址：保留在 reserved 池中

角色可以使用 `withdrawBalance` 函数提取其余额。

## 合约函数

### 角色地址管理

- `setProxyAddress(address)`：设置 b_proxy 地址
- `setARoleAddress(address)`：设置 b_a_role 地址
- `setBRoleAddress(address)`：设置 b_b_role 地址
- `setCRoleAddress(address)`：设置 b_c_role 地址
- `setPartnerAddress(address)`：设置 b_partner 地址
- `setBaseFeeAddress(address)`：设置 b_base_fee 地址
- `setReservedAddress(address)`：设置 b_reserved 地址

### 代币管理

- `setUSDTAddress(address)`：设置 USDT 代币地址
- `setTokenPool(address)`：设置代币池地址

### 收入分配

- `addProxyIncome(uint256)`：为代理角色添加收入
- `addStandardIncome(uint256)`：添加分配给 a_role、b_role 和 c_role 的收入
- `addExtraIncome(uint256)`：添加分配给 partner 和 reserved 的收入
- `addNaturalIncome(uint256)`：为 reserved 角色添加收入
- `addBaseIncome(uint256)`：为 base_fee 角色添加收入

### 余额管理

- `withdrawBalance(uint256)`：从调用者的余额中提取指定数量的 USDT
- `getBalance(address)`：查看特定地址的 USDT 余额

### 辅助函数

- `isValidAddress(address)`：内部函数，检查地址是否有效（非零地址）
- `distributeOrRetain(address, uint256, string)`：内部函数，将资金分配给有效地址或在无效地址的情况下保留在池中
- `transferFromPool(uint256)`：内部函数，将 USDT 从代币池转移到合约

## 许可证

本项目采用 MIT 许可证。