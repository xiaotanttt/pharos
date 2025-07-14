# Pharos 生产自动化系统 v2.0.0 🚀

完整的 Pharos 测试网自动化系统，整合所有功能模块，支持灵活配置和智能循环。

**作者**: 0xTAN  
**推特**: https://X.com/cgyJ9WZV29saahQ

## ✨ 功能特性

### 🔄 循环功能 (每轮执行)
- **每日签到** - 自动完成每日签到任务
- **原始随机转账** - 执行10次随机PHRS转账刷TX
- **增强版Swap** - 智能多合约Swap交易 (主要Swap功能)
- **PHRS包装** - 自动将PHRS包装为WPHRS
- **领水龙头** - 自动领取测试网代币

### 1️⃣ 单次功能 (执行一次)
- **域名注册** - 自动注册.phrs域名
- **NFT铸造** - 铸造测试NFT

## 🎯 配置预设

系统提供6种预设配置，满足不同使用需求：

| 预设名称 | 描述 | 适用场景 | 循环间隔 |
|---------|------|----------|----------|
| **FULL_AUTO** | 全功能自动化 | 长期运行，完整体验 | 30分钟 |
| **TRADING_ONLY** | 交易专用模式 | 专注交易，使用增强版Swap | 15分钟 |
| **DOMAIN_ONLY** | 域名专用模式 | 仅域名注册 | 单次运行 |
| **BASIC_ONLY** | 基础功能模式 | 轻量运行，低资源消耗 | 60分钟 |
| **TEST_MODE** | 测试模式 | 安全测试，验证功能 | 单次运行 |
| **ENHANCED_SWAP_TEST** | 增强Swap测试 | 测试增强版Swap功能 | 单次运行 |

## 🚀 快速开始

### 1. 安装依赖
```bash
cd pharos_production_system
npm install
```

### 2. 准备配置文件

#### 创建私钥文件 `pk.txt`
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
0x2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

#### 创建代理文件 `proxies.txt` (可选)
```
http://username:password@proxy1:port
http://username:password@proxy2:port
```

### 3. 配置系统
```bash
node config_manager.js
```
选择适合的配置预设，系统会自动应用相应设置。

### 4. 启动系统
```bash
node production_main.js
```

## 📊 系统架构

### 核心模块
- **production_config.js** - 配置管理，功能开关
- **production_executor.js** - 核心执行器，功能实现
- **production_main.js** - 主入口，循环控制
- **config_manager.js** - 配置管理器，预设切换

### 功能分类
```
循环功能 (🔄)
├── 基础功能
│   ├── 每日签到
│   ├── 领水龙头
│   └── 原始转账
├── 交易功能  
│   ├── 原始Swap
│   ├── 增强Swap
│   └── PHRS包装
└── 高级功能
    └── (预留扩展)

单次功能 (1️⃣)
├── 域名注册
├── NFT铸造
└── (预留扩展)
```

## ⚙️ 配置说明

### 功能开关
每个功能都可以独立开启/关闭：
```javascript
const FEATURE_CONFIG = {
    checkin: { enabled: true, cycleEnabled: true },
    originalTransfer: { enabled: true, cycleEnabled: true },
    domainMint: { enabled: false, cycleEnabled: false },
    // ...
};
```

### 运行参数
```javascript
const CURRENT_CONFIG = {
    preset: 'TRADING_ONLY',           // 当前预设
    loop: {
        enabled: true,                // 是否循环运行
        waitMinutes: 15,             // 循环间隔(分钟)
        maxCycles: 0                 // 最大循环次数(0=无限)
    },
    wallet: {
        processAll: false,           // 是否处理所有钱包
        maxWallets: 10,             // 最大处理钱包数
        delayBetweenWallets: 2000,  // 钱包间延迟(毫秒)
        delayBetweenFeatures: 1000  // 功能间延迟(毫秒)
    }
};
```

## 📈 使用建议

### 新手推荐流程
1. **测试阶段**: 使用 `TEST_MODE` 验证系统功能
2. **域名注册**: 使用 `DOMAIN_ONLY` 完成域名注册
3. **日常运行**: 使用 `TRADING_ONLY` 进行日常交易
4. **完整体验**: 使用 `FULL_AUTO` 体验所有功能

### 资源配置建议
- **轻量运行**: `BASIC_ONLY` - 适合低配置服务器
- **高频交易**: `TRADING_ONLY` - 适合专注交易刷量
- **完整功能**: `FULL_AUTO` - 适合高配置长期运行

### 安全建议
- 首次使用务必选择 `TEST_MODE` 测试
- 建议使用代理池分散请求
- 定期检查钱包余额，确保有足够gas费
- 监控系统日志，及时发现异常

## 🔧 高级用法

### 自定义配置
可以直接修改 `production_config.js` 中的功能开关：
```javascript
// 启用特定功能组合
FEATURE_CONFIG.checkin.enabled = true;
FEATURE_CONFIG.originalSwap.enabled = true;
FEATURE_CONFIG.domainMint.enabled = false;
```

### 命令行参数
```bash
node production_main.js --help    # 显示帮助信息
```

### 编程接口
```javascript
const { ProductionExecutor } = require('./production_executor');
const executor = new ProductionExecutor();

// 处理单个钱包
const result = await executor.processWallet(privateKey, proxy);
```

## 📊 监控与统计

系统提供详细的执行统计：
- 每轮执行统计
- 功能成功率统计  
- 钱包处理状态
- 单次功能完成状态

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
