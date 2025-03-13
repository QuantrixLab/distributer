# 分配合约安全增强

本项目包含了一个TRON兼容的USDT分配智能合约，以及其安全增强版本。

## 安全增强概述

原始的`DistributerContract`合约已经被增强为`EnhancedDistributerContract`，添加了多项安全特性：

### 1. 重入攻击防护

- 添加了`nonReentrant`修饰符，防止在`withdrawBalance`函数中的重入攻击
- 确保在外部调用前更新状态变量，遵循检查-效果-交互模式

### 2. 访问控制增强

- 为所有收入添加函数添加了`onlyOwner`修饰符，确保只有合约所有者可以调用这些函数
- 实现了两步所有权转移过程，防止所有权意外转移到错误的地址
- 添加了操作者角色，只有操作者和所有者可以执行收入添加操作

### 3. 暂停机制

- 添加了合约暂停功能，允许在紧急情况下停止合约操作
- 所有关键函数都添加了`whenNotPaused`修饰符

### 4. 输入验证

- 为所有金额参数添加了非零检查
- 为地址设置函数添加了零地址检查
- 在分配计算中添加了验证，确保总和等于输入金额

### 5. 事件索引

- 为重要的事件参数添加了`indexed`关键字，提高了链下应用的过滤效率

### 6. 紧急恢复

- 添加了`recoverERC20`函数，允许恢复意外发送到合约的代币

### 7. 防止舍入误差

- 改进了百分比计算，使用减法而不是直接计算，防止因舍入误差导致的资金丢失

### 8. 统一接口和批量收入分配

- 添加了统一的收入添加接口，使用枚举类型区分不同收入类型
- 实现了批量收入分配功能，允许在一次交易中处理多种类型的收入
- 提供了详细的分配结果信息，包括每种收入类型的处理状态

### 9. 操作者角色

- 添加了操作者角色，只有操作者和所有者可以执行收入添加操作
- 操作者地址只能由合约所有者设置
- 提高了合约的灵活性和安全性，允许将日常操作委托给特定地址

## 测试

项目包含全面的测试套件，验证所有安全增强功能：

- 所有权管理测试
- 暂停功能测试
- 重入攻击防护测试（包括使用恶意合约的测试）
- 零地址验证测试
- 收入分配测试
- 紧急恢复测试
- 访问控制测试
- 输入验证测试
- 统一接口测试
- 批量收入分配测试
- 操作者角色测试

## 如何运行测试

```bash
# 安装依赖
npm install

# 运行测试
npx hardhat test
```

## 合约结构

- `contracts/DistributerContract.sol` - 原始合约
- `contracts/EnhancedDistributerContract.sol` - 安全增强版合约
- `contracts/AttackerContract.sol` - 用于测试重入攻击防护的恶意合约
- `contracts/MockERC20.sol` - 用于测试的ERC20代币模拟合约

## 安全建议

在部署到生产环境前，建议：

1. 进行专业的安全审计
2. 使用形式化验证工具进行额外检查
3. 进行全面的测试，包括边界条件测试
4. 考虑实现时间锁定机制，为关键参数更改添加延迟
5. 监控合约活动，设置异常检测机制

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
- 统一接口和批量收入分配功能，简化客户端使用
- 操作者角色，允许将日常操作委托给特定地址

## 合约结构

- `DistributerContract.sol`：实现分配逻辑的主合约
- `EnhancedDistributerContract.sol`：安全增强版合约，包含统一接口和批量收入分配功能
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
3. 可选：设置操作者地址，委托日常收入添加操作

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
- `setOperator(address)`：设置操作者地址，只有所有者可以调用

### 代币管理

- `setUSDTAddress(address)`：设置 USDT 代币地址
- `setTokenPool(address)`：设置代币池地址

### 收入分配

#### 传统接口
- `addProxyIncome(uint256)`：为代理角色添加收入
- `addStandardIncome(uint256)`：添加分配给 a_role、b_role 和 c_role 的收入
- `addExtraIncome(uint256)`：添加分配给 partner 和 reserved 的收入
- `addNaturalIncome(uint256)`：为 reserved 角色添加收入
- `addBaseIncome(uint256)`：为 base_fee 角色添加收入

#### 统一接口
- `addIncome(IncomeType, uint256)`：使用统一接口添加收入，根据收入类型调用相应的内部函数

#### 批量收入分配
- `addMultipleIncomes(uint256, uint256, uint256, uint256, uint256)`：在一次交易中处理多种类型的收入
  - 参数分别为：proxyAmount, standardAmount, extraAmount, naturalAmount, baseAmount
  - 如果某个金额为0，则跳过对应的收入类型
  - 返回一个包含详细分配信息的结构体

### 余额管理

- `withdrawBalance(uint256)`：从调用者的余额中提取指定数量的 USDT
- `getBalance(address)`：查看特定地址的 USDT 余额

### 辅助函数

- `isValidAddress(address)`：内部函数，检查地址是否有效（非零地址）
- `distributeOrRetain(address, uint256, string)`：内部函数，将资金分配给有效地址或在无效地址的情况下保留在池中
- `transferFromPool(uint256)`：内部函数，将 USDT 从代币池转移到合约

## 许可证

本项目采用 MIT 许可证。