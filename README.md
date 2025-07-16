# Pharos Production System

一个功能完整的 Pharos 测试网自动化生产系统，支持多种功能的自动化执行。

## 🚀 功能特点

### 核心功能
- **多池流动性添加** - 智能添加 Uniswap V3 流动性，支持随机选择3-5个池
- **智能代币交换** - 自动 PHRS 包装和代币交换，确保余额充足
- **每日签到** - 自动执行每日签到任务
- **领水功能** - 自动领取测试网代币
- **域名注册** - 自动注册 .phrs 域名
- **NFT 铸造** - 自动铸造测试 NFT
- **原始转账** - 执行随机 PHRS 转账刷交易
- **增强版 Swap** - 在多个合约中执行交换操作

### 系统特点
- **多钱包支持** - 支持批量处理多个钱包
- **代理支持** - 支持使用代理池进行网络请求
- **循环执行** - 支持持续循环运行
- **智能重试** - 包含完善的错误处理和重试机制
- **配置预设** - 提供多种预设配置模式
- **实时监控** - 详细的日志输出和状态监控

## 📦 安装

```bash
# 克隆仓库
git clone https://github.com/xiaotanttt/pharos
cd pharos_production_system

# 安装依赖
npm install
```

## ⚙️ 配置

### 1. 配置钱包
复制并编辑钱包配置文件：
```bash
cp pk.txt.example pk.txt
# 编辑 pk.txt，每行一个私钥
```

### 2. 配置代理（可选）
```bash
cp proxies.txt.example proxies.txt
# 编辑 proxies.txt，每行一个代理地址
```

### 3. 选择运行模式
编辑 `production_config.js` 文件，修改预设模式：

```javascript
let CURRENT_CONFIG = {
    preset: 'FULL_AUTO', // 可选: FULL_AUTO, TRADING_ONLY, LIQUIDITY_INTENSIVE等
    // ...
};
```

## 🎯 可用的配置预设

| 预设名称 | 描述 | 适用场景 |
|---------|------|---------|
| `FULL_AUTO` | 全功能自动化 | 长期运行，所有功能 |
| `TRADING_ONLY` | 交易专用模式 | 专注交易功能 |
| `LIQUIDITY_INTENSIVE` | 流动性密集模式 | 高频流动性添加 |
| `DOMAIN_ONLY` | 域名专用模式 | 仅域名注册 |
| `TURBO_FULL` | 高性能全功能 | 大量钱包并发 |
| `TEST_MODE` | 测试模式 | 功能测试 |

## 🚀 运行

### 直接运行
```bash
node production_main.js
```

### 使用启动脚本
```bash
chmod +x start.sh
./start.sh
```

### 自动重启模式
```bash
node auto_restart.js
```

## 📊 多池流动性系统

### 智能池子选择
- 每次随机选择 3-5 个可用的流动性池
- 支持 9 个不同的交易对和费率组合
- 智能余额分配，确保多个池子都能获得资源

### 支持的交易对
- **USDC/WPHRS** - 3个不同费率的池子
- **USDT/WPHRS** - 3个不同费率的池子  
- **USDC/USDT** - 3个不同费率的池子

### 智能交换系统
- **PHRS 包装** - 优先使用原生 PHRS 包装成 WPHRS
- **代币交换** - 在包装失败时自动执行代币交换
- **余额优化** - 智能计算最优交换数量

## 🔧 配置管理

### 使用配置助手
```bash
node config_helper.js
```

### 使用配置管理器
```bash
node config_manager.js
```

## 📝 日志说明

系统会输出详细的日志信息：
- `[✓]` - 成功操作
- `[✗]` - 失败操作  
- `[!]` - 警告信息
- `[🔄]` - 循环状态
- `[👛]` - 钱包处理状态

## 🛠️ 文件结构

```
pharos_production_system/
├── production_main.js          # 主程序入口
├── production_config.js        # 配置文件
├── production_executor.js      # 功能执行器
├── liquidity_module.js        # 流动性模块
├── config_helper.js           # 配置助手
├── config_manager.js          # 配置管理器
├── auto_restart.js            # 自动重启脚本
├── start.sh                   # 启动脚本
├── package.json               # 项目依赖
├── pk.txt.example             # 钱包配置示例
├── proxies.txt.example        # 代理配置示例
└── README.md                  # 项目说明
```

## 🛠️ 故障排除

### 常见问题

#### 1. 私钥文件错误
```
错误: 没有找到有效的私钥
解决: 确保 pk.txt 文件存在，私钥格式为 0x...
```

#### 2. 网络连接问题
```
错误: 网络请求失败
解决: 检查网络连接，考虑使用代理
```

#### 3. 余额不足
```
错误: 余额不足无法执行交易
解决: 确保钱包有足够的PHRS作为gas费
```

#### 4. 功能执行失败
```
错误: 特定功能执行失败
解决: 查看详细错误日志，检查合约地址和参数
```

### 调试模式
修改日志级别获取更详细信息：
```javascript
// 在文件开头添加
console.log = (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
};
```

## 🔄 更新日志

### v2.0.0 (当前版本)
- ✅ 整合所有功能模块
- ✅ 支持6种配置预设
- ✅ 智能循环和单次执行
- ✅ 完整的错误处理和重试机制
- ✅ 详细的统计和监控
- ✅ 灵活的配置管理系统

### 计划功能
- 🔄 Web界面管理
- 🔄 更多交易策略
- 🔄 自动余额管理
- 🔄 多链支持

## 📞 支持与反馈

如遇到问题或有改进建议，请：
1. 检查本文档的故障排除部分
2. 查看系统日志获取详细错误信息
3. 确保使用最新版本的系统

## ⚠️ 免责声明

本工具仅供学习和测试使用，请：
- 仅在测试网络使用
- 遵守相关服务条款
- 自行承担使用风险
- 不要用于生产环境

---

**祝您使用愉快！** 🎉
