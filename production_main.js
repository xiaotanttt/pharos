/**
 * Pharos 生产系统主入口文件
 * 整合所有功能的完整自动化系统
 */

require('dotenv').config();
const fs = require('fs');
const { ProductionExecutor } = require('./production_executor');

// 全局错误处理 - 防止程序意外退出
process.on('uncaughtException', (error) => {
    console.error(`\n💥 未捕获异常: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error(`⚠️ 程序将在3秒后退出，等待自动重启...\n`);
    setTimeout(() => process.exit(1), 3000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`\n💥 未处理的Promise拒绝: ${reason}`);
    console.error(`Promise: ${promise}`);
    console.error(`⚠️ 程序将在3秒后退出，等待自动重启...\n`);
    setTimeout(() => process.exit(1), 3000);
});

// 优雅关闭处理
process.on('SIGINT', () => {
    console.log(`\n📡 收到 SIGINT 信号，开始优雅关闭...`);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(`\n📡 收到 SIGTERM 信号，开始优雅关闭...`);
    process.exit(0);
});
const { 
    CURRENT_CONFIG, 
    getEnabledFeatures,
    getCyclableFeatures,
    getOnceOnlyFeatures,
    printCurrentConfig 
} = require('./production_config');

const colors = {
    reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m',
    yellow: '\x1b[33m', red: '\x1b[31m', white: '\x1b[37m', bold: '\x1b[1m',
};

const logger = {
    info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
    cycle: (msg) => console.log(`${colors.bold}${colors.cyan}[🔄] ${msg}${colors.reset}`),
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 读取私钥文件
 */
function loadPrivateKeys() {
    try {
        const pkFile = 'pk.txt';
        if (!fs.existsSync(pkFile)) {
            logger.error(`私钥文件 ${pkFile} 不存在`);
            logger.info(`请创建 ${pkFile} 文件并添加私钥，每行一个`);
            process.exit(1);
        }
        
        const privateKeys = fs.readFileSync(pkFile, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
        
        if (privateKeys.length === 0) {
            logger.error('没有找到有效的私钥');
            logger.info('私钥格式应为: 0x...');
            process.exit(1);
        }
        
        logger.info(`加载了 ${privateKeys.length} 个私钥`);
        return privateKeys;
        
    } catch (error) {
        logger.error(`读取私钥文件失败: ${error.message}`);
        process.exit(1);
    }
}

/**
 * 读取代理列表
 */
function loadProxies() {
    try {
        const proxyFile = 'proxies.txt';
        if (!fs.existsSync(proxyFile)) {
            logger.warn(`代理文件 ${proxyFile} 不存在，将使用直连模式`);
            return [];
        }
        
        const proxies = fs.readFileSync(proxyFile, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        logger.info(`加载了 ${proxies.length} 个代理`);
        return proxies;
        
    } catch (error) {
        logger.warn(`读取代理文件失败: ${error.message}，使用直连模式`);
        return [];
    }
}

/**
 * 获取随机代理
 */
function getRandomProxy(proxyList) {
    if (!proxyList || proxyList.length === 0) return null;
    return proxyList[Math.floor(Math.random() * proxyList.length)];
}

/**
 * 等待倒计时
 */
async function waitCountdown(minutes = 30) {
    if (!CURRENT_CONFIG.loop.enabled) {
        logger.info("单次运行模式，不执行等待");
        return;
    }
    
    const totalSeconds = minutes * 60;
    logger.cycle(`开始等待 ${minutes} 分钟...`);

    for (let s = totalSeconds; s >= 0; s--) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        process.stdout.write(`\r${colors.cyan}剩余时间：${m}分 ${sec}秒${colors.reset} `);
        await delay(1000);
    }
    
    console.log('\n');
}

/**
 * 显示周期统计
 */
function showCycleStats(cycleResults, cycleNumber) {
    logger.cycle(`第 ${cycleNumber} 轮执行完成统计:`);
    
    const totalWallets = cycleResults.length;
    const successfulWallets = cycleResults.filter(r => r.successfulFeatures > 0).length;
    const totalFeatures = cycleResults.reduce((sum, r) => sum + r.totalFeatures, 0);
    const successfulFeatures = cycleResults.reduce((sum, r) => sum + r.successfulFeatures, 0);
    
    logger.info(`📊 本轮统计:`);
    logger.info(`  钱包处理: ${successfulWallets}/${totalWallets} 成功`);
    logger.info(`  功能执行: ${successfulFeatures}/${totalFeatures} 成功`);
    logger.info(`  总成功率: ${totalFeatures > 0 ? ((successfulFeatures / totalFeatures) * 100).toFixed(1) : 0}%`);
    
    // 按功能统计
    const featureStats = {};
    cycleResults.forEach(walletResult => {
        walletResult.results.forEach(result => {
            if (!featureStats[result.feature]) {
                featureStats[result.feature] = { success: 0, total: 0 };
            }
            featureStats[result.feature].total++;
            if (result.success) {
                featureStats[result.feature].success++;
            }
        });
    });
    
    logger.info(`📋 功能执行统计:`);
    Object.entries(featureStats).forEach(([feature, stats]) => {
        const rate = ((stats.success / stats.total) * 100).toFixed(1);
        logger.info(`  ${feature}: ${stats.success}/${stats.total} (${rate}%)`);
    });
}

/**
 * 显示系统状态
 */
function showSystemStatus(executor) {
    const cyclableFeatures = getCyclableFeatures();
    const onceOnlyFeatures = getOnceOnlyFeatures();
    const completedOnceOnly = Array.from(executor.onceOnlyCompleted);
    
    logger.info(`\n📊 系统状态:`);
    logger.info(`🔄 循环功能: ${cyclableFeatures.length} 个 - ${cyclableFeatures.join(', ')}`);
    logger.info(`1️⃣ 单次功能: ${onceOnlyFeatures.length} 个 - ${onceOnlyFeatures.join(', ')}`);
    logger.info(`✅ 已完成单次功能: ${completedOnceOnly.length} 个 - ${completedOnceOnly.join(', ')}`);
    
    const remainingOnceOnly = onceOnlyFeatures.filter(f => !completedOnceOnly.includes(f));
    if (remainingOnceOnly.length > 0) {
        logger.info(`⏳ 待执行单次功能: ${remainingOnceOnly.join(', ')}`);
    } else if (onceOnlyFeatures.length > 0) {
        logger.success(`🎉 所有单次功能已完成！`);
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        const executor = new ProductionExecutor();
        
        // 显示横幅和配置
        executor.showBanner();
        
        // 检查配置
        const enabledFeatures = getEnabledFeatures();
        if (enabledFeatures.length === 0) {
            logger.error("没有启用任何功能！");
            logger.info("请运行 'node config_manager.js' 配置系统");
            process.exit(1);
        }
        
        // 加载配置
        const privateKeys = loadPrivateKeys();
        const proxies = loadProxies();
        
        // 确定要处理的钱包数量
        const walletsToProcess = CURRENT_CONFIG.wallet.processAll ? 
            privateKeys : 
            privateKeys.slice(0, CURRENT_CONFIG.wallet.maxWallets || privateKeys.length);
        
        logger.info(`\n🚀 系统启动完成`);
        logger.info(`📋 启用功能: ${enabledFeatures.length} 个`);
        logger.info(`👛 处理钱包: ${walletsToProcess.length} 个`);
        logger.info(`🌐 代理模式: ${proxies.length > 0 ? `随机代理池 (${proxies.length}个)` : '直连模式'}`);
        logger.info(`🔄 运行模式: ${CURRENT_CONFIG.loop.enabled ? '循环模式' : '单次模式'}`);
        
        let cycleNumber = 0;
        
        // 主循环
        while (true) {
            cycleNumber++;
            logger.cycle(`\n开始第 ${cycleNumber} 轮执行`);
            logger.cycle("="*60);
            
            // 显示系统状态
            showSystemStatus(executor);
            
            const cycleResults = [];
            
            // 处理每个钱包
            for (let i = 0; i < walletsToProcess.length; i++) {
                const privateKey = walletsToProcess[i];
                const proxy = CURRENT_CONFIG.proxy.enabled ? getRandomProxy(proxies) : null;
                
                logger.info(`\n👛 处理钱包 ${i + 1}/${walletsToProcess.length}`);
                
                try {
                    const walletResult = await executor.processWallet(privateKey, proxy);
                    cycleResults.push(walletResult);
                    
                } catch (error) {
                    logger.error(`钱包处理失败: ${error.message}`);
                    cycleResults.push({
                        address: 'unknown',
                        results: [],
                        totalFeatures: 0,
                        successfulFeatures: 0,
                        failedFeatures: 1,
                        error: error.message
                    });
                }
                
                // 钱包间延迟
                if (i < walletsToProcess.length - 1) {
                    await delay(CURRENT_CONFIG.wallet.delayBetweenWallets);
                }
            }
            
            // 显示本轮统计
            showCycleStats(cycleResults, cycleNumber);
            
            // 检查是否继续循环
            if (!CURRENT_CONFIG.loop.enabled) {
                logger.success("单次运行完成，程序退出");
                break;
            }
            
            if (CURRENT_CONFIG.loop.maxCycles > 0 && cycleNumber >= CURRENT_CONFIG.loop.maxCycles) {
                logger.success(`达到最大循环次数 ${CURRENT_CONFIG.loop.maxCycles}，程序退出`);
                break;
            }
            
            // 检查是否所有单次功能都已完成且没有循环功能
            const cyclableFeatures = getCyclableFeatures();
            const onceOnlyFeatures = getOnceOnlyFeatures();
            const allOnceOnlyCompleted = onceOnlyFeatures.every(f => executor.onceOnlyCompleted.has(f));
            
            if (cyclableFeatures.length === 0 && allOnceOnlyCompleted) {
                logger.success("所有功能已完成，程序退出");
                break;
            }
            
            // 等待下一轮
            await waitCountdown(CURRENT_CONFIG.loop.waitMinutes);
        }
        
        logger.success("🎉 系统运行完成！");
        
    } catch (error) {
        logger.error(`系统运行失败: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

/**
 * 显示使用帮助
 */
function showHelp() {
    console.log(`
${colors.cyan}${colors.bold}Pharos 生产系统使用指南${colors.reset}

${colors.yellow}📋 准备工作:${colors.reset}
  1. 创建 pk.txt 文件，每行一个私钥 (0x...)
  2. 创建 proxies.txt 文件 (可选)，每行一个代理
  3. 运行配置管理器选择运行模式

${colors.yellow}🚀 启动命令:${colors.reset}
  node production_main.js          # 启动系统
  node config_manager.js           # 配置管理器
  node production_main.js --help   # 显示帮助

${colors.yellow}⚙️ 配置预设:${colors.reset}
  FULL_AUTO      - 全功能自动化 (推荐长期运行)
  TRADING_ONLY   - 交易专用模式 (高频交易)
  DOMAIN_ONLY    - 域名专用模式 (单次注册)
  BASIC_ONLY     - 基础功能模式 (轻量运行)
  TEST_MODE      - 测试模式 (安全测试)

${colors.yellow}📊 功能说明:${colors.reset}
  🔄 循环功能: 每轮都会执行
  1️⃣ 单次功能: 只执行一次，完成后不再执行

${colors.yellow}💡 使用建议:${colors.reset}
  - 首次使用建议选择 TEST_MODE 测试
  - 长期运行推荐 TRADING_ONLY 或 FULL_AUTO
  - 只需要域名注册选择 DOMAIN_ONLY
    `);
}

// 优雅退出处理
process.on('SIGINT', () => {
    logger.warn('\n收到退出信号，正在安全退出...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.warn('\n收到终止信号，正在安全退出...');
    process.exit(0);
});

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// 启动系统
if (require.main === module) {
    main().catch(error => {
        logger.error(`系统启动失败: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { main };
