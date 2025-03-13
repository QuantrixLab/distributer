// 使用统一接口和批量收入分配功能的示例代码

const { ethers } = require("ethers");

// 假设我们已经有了合约实例
async function demonstrateOperatorManagement(contract, owner, operator) {
  console.log("=== 操作者管理 ===");
  
  // 检查初始操作者（默认为合约部署者/所有者）
  const initialOperator = await contract.operator();
  console.log(`初始操作者地址: ${initialOperator}`);
  console.log(`所有者地址: ${await contract.owner()}`);
  
  // 设置新的操作者
  console.log(`\n设置新的操作者地址: ${operator.address}`);
  const tx = await contract.setOperator(operator.address);
  await tx.wait();
  
  // 验证操作者已更新
  const newOperator = await contract.operator();
  console.log(`新的操作者地址: ${newOperator}`);
  console.log(`操作者地址已${newOperator === operator.address ? '成功' : '未能'}更新`);
  
  // 尝试使用操作者地址添加收入
  console.log("\n使用操作者地址添加收入");
  const amount = ethers.parseUnits("100", 18);
  
  // 使用操作者地址调用合约
  const operatorContract = contract.connect(operator);
  await operatorContract.addProxyIncome(amount);
  console.log(`操作者成功添加了 ${ethers.formatUnits(amount, 18)} USDT 的代理收入`);
  
  // 所有者仍然可以添加收入
  console.log("\n使用所有者地址添加收入");
  await contract.addProxyIncome(amount);
  console.log(`所有者成功添加了 ${ethers.formatUnits(amount, 18)} USDT 的代理收入`);
  
  console.log("\n操作者管理演示完成！");
}

async function demonstrateUnifiedInterface(contract) {
  console.log("=== 使用统一接口添加收入 ===");
  
  // 收入类型枚举
  const IncomeType = {
    PROXY: 0,
    STANDARD: 1,
    EXTRA: 2,
    NATURAL: 3,
    BASE: 4
  };
  
  // 使用统一接口添加代理收入
  const proxyAmount = ethers.parseUnits("100", 18); // 100 USDT
  console.log(`添加代理收入: ${ethers.formatUnits(proxyAmount, 18)} USDT`);
  await contract.addIncome(IncomeType.PROXY, proxyAmount);
  
  // 使用统一接口添加标准收入
  const standardAmount = ethers.parseUnits("200", 18); // 200 USDT
  console.log(`添加标准收入: ${ethers.formatUnits(standardAmount, 18)} USDT`);
  await contract.addIncome(IncomeType.STANDARD, standardAmount);
  
  // 使用统一接口添加额外收入
  const extraAmount = ethers.parseUnits("300", 18); // 300 USDT
  console.log(`添加额外收入: ${ethers.formatUnits(extraAmount, 18)} USDT`);
  await contract.addIncome(IncomeType.EXTRA, extraAmount);
  
  console.log("所有收入已成功添加！");
}

async function demonstrateBatchIncomeAddition(contract) {
  console.log("\n=== 使用批量收入分配功能 ===");
  
  // 准备各种收入金额
  const proxyAmount = ethers.parseUnits("100", 18); // 100 USDT
  const standardAmount = ethers.parseUnits("200", 18); // 200 USDT
  const extraAmount = ethers.parseUnits("300", 18); // 300 USDT
  const naturalAmount = ethers.parseUnits("400", 18); // 400 USDT
  const baseAmount = ethers.parseUnits("500", 18); // 500 USDT
  
  console.log("批量添加以下收入:");
  console.log(`- 代理收入: ${ethers.formatUnits(proxyAmount, 18)} USDT`);
  console.log(`- 标准收入: ${ethers.formatUnits(standardAmount, 18)} USDT`);
  console.log(`- 额外收入: ${ethers.formatUnits(extraAmount, 18)} USDT`);
  console.log(`- 自然收入: ${ethers.formatUnits(naturalAmount, 18)} USDT`);
  console.log(`- 基础收入: ${ethers.formatUnits(baseAmount, 18)} USDT`);
  
  // 调用批量收入分配函数
  const result = await contract.addMultipleIncomes(
    proxyAmount,
    standardAmount,
    extraAmount,
    naturalAmount,
    baseAmount
  );
  
  // 注意：在实际使用中，我们无法直接访问返回的结构体字段
  // 这里仅作为示例，实际使用时应通过事件或其他方式验证结果
  console.log("批量收入添加成功！");
  
  // 示例：如何处理部分金额为零的情况
  console.log("\n=== 部分金额为零的批量收入分配 ===");
  
  // 只添加代理收入和基础收入
  const partialResult = await contract.addMultipleIncomes(
    proxyAmount,  // 代理收入: 100 USDT
    0,            // 标准收入: 0 USDT (不处理)
    0,            // 额外收入: 0 USDT (不处理)
    0,            // 自然收入: 0 USDT (不处理)
    baseAmount    // 基础收入: 500 USDT
  );
  
  console.log("部分收入添加成功！");
  console.log("- 只处理了代理收入和基础收入");
  console.log("- 其他收入类型因金额为0而被跳过");
}

// 主函数
async function main() {
  // 在实际使用中，这里应该连接到真实的合约
  // 这里仅作为示例
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const owner = await provider.getSigner(0); // 第一个账户作为所有者
  const operator = await provider.getSigner(1); // 第二个账户作为操作者
  
  // 假设合约已经部署，这里使用合约地址和ABI创建合约实例
  const contractAddress = "0x..."; // 替换为实际合约地址
  const contractABI = [/* 合约ABI */]; // 替换为实际合约ABI
  const contract = new ethers.Contract(contractAddress, contractABI, owner);
  
  // 演示操作者管理
  await demonstrateOperatorManagement(contract, owner, operator);
  
  // 演示统一接口
  await demonstrateUnifiedInterface(contract);
  
  // 演示批量收入分配
  await demonstrateBatchIncomeAddition(contract);
}

// 运行示例
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("执行示例时出错:", error);
    process.exit(1);
  }); 