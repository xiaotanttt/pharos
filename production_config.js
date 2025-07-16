/**
 * Pharos 生产系统完整配置文件
 * 整合所有功能：Enhanced Swap + 原始转账 + 域名Mint + NFT + 基础功能
 * 
 * 作者: 0xTAN
 * 推特: https://X.com/cgyJ9WZV29saahQ
 */

// ===== 功能开关配置 =====
const FEATURE_CONFIG = {
    // 基础功能
    faucet: {
        enabled: true,
        name: "领水龙头",
        description: "自动领取测试网代币",
        cycleEnabled: true
    },
    
    checkin: {
        enabled: true,
        name: "每日签到",
        description: "执行每日签到任务",
        cycleEnabled: true
    },
    
    // 原始转账功能 (来自main.js)
    originalTransfer: {
        enabled: true,
        name: "原始随机转账",
        description: "执行10次随机PHRS转账刷TX",
        cycleEnabled: true,
        config: {
            transferCount: 10,
            transferAmount: 0.000001, // PHRS
            gasLimit: 21000,
            gasPrice: 0
        }
    },
    
    // 增强Swap功能 (主要Swap功能)
    enhancedSwap: {
        enabled: true,
        name: "增强版Swap",
        description: "两个合约各执行10次swap (主要Swap功能)",
        cycleEnabled: true,
        config: {
            contracts: [
                '0x3541423f25a1ca5c98fdbcf478405d3f0aad1164',
                '0x1a4de519154ae51200b0ad7c90f7fac75547888a'
            ],
            swapsPerContract: 10
        }
    },
    
    // PHRS包装功能 (可选，不是必要的)
    wrapPHRS: {
        enabled: false,  // 默认关闭，不是必要功能
        name: "PHRS包装",
        description: "将PHRS包装为WPHRS (可选功能)",
        cycleEnabled: true,
        config: {
            wrapAmount: 0.02,
            minBalance: 0.01
        }
    },
    
    // 域名注册功能 (改为循环执行)
    domainMint: {
        enabled: true,   // 默认启用
        name: "域名Mint",
        description: "自动注册.phrs域名 (可多次执行)",
        cycleEnabled: true,  // 改为循环功能
        config: {
            contractAddress: '0x51be1ef20a1fd5179419738fc71d95a8b6f8a175',
            resolver: '0x9a43dcA1C3BB268546b98eb2AB1401bFc5b58505',
            duration: 31536000
        }
    },
    
    // NFT铸造功能 (单次执行)
    nftMint: {
        enabled: false,
        name: "NFT铸造",
        description: "铸造测试NFT",
        cycleEnabled: false, // 保持单次执行
        config: {
            contractAddress: '0x7fb63bfd3ef701544bf805e88cb9d2efaa3c01a9',
            mintAmount: 1
        }
    },
    
    // 流动性添加功能 (循环执行) - 现在包含智能交换功能
    liquidityAdd: {
        enabled: true,  // 默认启用，因为现在有智能交换功能
        name: "添加流动性",
        description: "向Uniswap V3添加流动性 (含智能WPHRS交换)",
        cycleEnabled: true, // 循环功能
        config: {
            positionManager: '0xf8a1d4ff0f9b9af7ce58e1fc1833688f3bfd6115',
            maxPoolsPerCycle: 5, // 每个周期最多添加几个流动性池 (随机选择5个以内)
            slippageTolerance: 10, // 滑点容忍度 (%)
            enableMultiPool: true, // 启用多池同时添加
            poolDelayMs: 3000, // 池之间的延迟时间 (毫秒)
            enableIntelligentSwap: true // 启用智能交换功能
        }
    }
};

// ===== 配置预设模式 =====
const CONFIG_PRESETS = {
    FULL_AUTO: {
        name: "全功能自动化",
        description: "所有功能，持续循环，适合长期运行",
        features: {
            faucet: true,
            checkin: true,
            originalTransfer: true,
            enhancedSwap: true,
            wrapPHRS: false,      // PHRS包装设为可选
            domainMint: true,     // 域名注册加入循环
            nftMint: true,
            liquidityAdd: true    // 添加流动性功能
        },
        loop: { enabled: true, waitMinutes: 30, maxCycles: 0 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    TRADING_ONLY: {
        name: "交易专用模式", 
        description: "专注交易功能 (签到+转账+增强Swap+域名)",
        features: {
            faucet: false,
            checkin: true,
            originalTransfer: true,
            enhancedSwap: true,
            wrapPHRS: false,      // 移除PHRS包装
            domainMint: true,     // 加入域名注册
            nftMint: false,
            liquidityAdd: true    // 加入流动性添加
        },
        loop: { enabled: true, waitMinutes: 15, maxCycles: 0 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    DOMAIN_ONLY: {
        name: "域名专用模式",
        description: "仅域名注册，循环执行",
        features: {
            faucet: false,
            checkin: false,
            originalTransfer: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: true,
            nftMint: false
        },
        loop: { enabled: true, waitMinutes: 20, maxCycles: 0 },  // 改为循环模式
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    NFT_ONLY: {
        name: "NFT专用模式",
        description: "仅NFT铸造，单次执行",
        features: {
            faucet: false,
            checkin: false,
            originalTransfer: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: false,
            nftMint: true
        },
        loop: { enabled: false, waitMinutes: 0, maxCycles: 1 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    BASIC_ONLY: {
        name: "基础功能模式",
        description: "签到+转账+域名，轻量运行",
        features: {
            faucet: true,
            checkin: true,
            originalTransfer: true,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: true,     // 加入域名注册
            nftMint: false
        },
        loop: { enabled: true, waitMinutes: 60, maxCycles: 0 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    TEST_MODE: {
        name: "测试模式",
        description: "少量功能，单次运行，适合测试",
        features: {
            faucet: false,
            checkin: true,
            originalTransfer: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: false,    // 测试模式不包含域名
            nftMint: false
        },
        loop: { enabled: false, waitMinutes: 0, maxCycles: 1 },
        wallet: { processAll: false, maxWallets: 1 }
    },
    
    ENHANCED_SWAP_TEST: {
        name: "增强Swap测试",
        description: "测试增强版Swap功能 (主要Swap功能)",
        features: {
            faucet: false,
            checkin: false,
            originalTransfer: false,
            enhancedSwap: true,
            wrapPHRS: true,       // Swap测试时可能需要包装
            domainMint: false,
            nftMint: false,
            liquidityAdd: false
        },
        loop: { enabled: false, waitMinutes: 0, maxCycles: 10 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    LIQUIDITY_TEST: {
        name: "流动性测试",
        description: "测试Uniswap V3流动性添加功能",
        features: {
            faucet: false,
            checkin: false,
            originalTransfer: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: false,
            nftMint: false,
            liquidityAdd: true
        },
        loop: { enabled: false, waitMinutes: 0, maxCycles: 3 },
        wallet: { processAll: false, maxWallets: 1 }
    },
    
    LIQUIDITY_INTENSIVE: {
        name: "流动性密集模式",
        description: "高频流动性添加，产生大量交易记录",
        features: {
            faucet: false,
            checkin: true,
            originalTransfer: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: false,
            nftMint: false,
            liquidityAdd: true
        },
        loop: { enabled: true, waitMinutes: 10, maxCycles: 0 }, // 每10分钟执行一次
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    TURBO_FULL: {
        name: "TURBO全功能模式",
        description: "高性能并发处理，所有功能，适合大量钱包",
        features: {
            faucet: true,
            checkin: true,
            originalTransfer: true,
            enhancedSwap: true,
            wrapPHRS: false,
            domainMint: true,
            nftMint: false, // TURBO模式暂时禁用NFT（避免并发冲突）
            liquidityAdd: true
        },
        loop: { enabled: true, waitMinutes: 15, maxCycles: 0 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    TURBO_SPEED: {
        name: "TURBO极速模式", 
        description: "极高并发，最快处理速度，适合100+钱包",
        features: {
            faucet: false,
            checkin: true,
            originalTransfer: true,
            enhancedSwap: true,
            wrapPHRS: false,
            domainMint: false, // 极速模式减少功能
            nftMint: false,
            liquidityAdd: true
        },
        loop: { enabled: true, waitMinutes: 5, maxCycles: 0 }, // 更频繁
        wallet: { processAll: true, maxWallets: 0 }
    }
};

// ===== 当前运行配置 =====
let CURRENT_CONFIG = {
    preset: 'FULL_AUTO',
    loop: {
        enabled: true,
        waitMinutes: 15,
        maxCycles: 0
    },
    wallet: {
        processAll: true,
        maxWallets: 0,
        delayBetweenWallets: 2000,
        delayBetweenFeatures: 1000
    },
    proxy: {
        enabled: true,
        randomSelection: true
    },
    errorHandling: {
        continueOnError: true,
        maxRetries: 3,
        retryDelay: 2000
    }
};

// 配置初始化函数
function initializeConfig() {
    // 只在首次加载时初始化，避免重复初始化
    if (!global.configInitialized) {
        if (CURRENT_CONFIG.preset && CONFIG_PRESETS[CURRENT_CONFIG.preset]) {
            const preset = CONFIG_PRESETS[CURRENT_CONFIG.preset];
            
            // 应用功能配置
            Object.keys(FEATURE_CONFIG).forEach(featureName => {
                FEATURE_CONFIG[featureName].enabled = preset.features[featureName] || false;
            });
            
            // 应用其他配置
            CURRENT_CONFIG.loop = { ...CURRENT_CONFIG.loop, ...preset.loop };
            CURRENT_CONFIG.wallet = { ...CURRENT_CONFIG.wallet, ...preset.wallet };
            
            console.log(`\x1b[32m[+] ✅ 配置初始化完成: ${preset.name}\x1b[0m`);
        }
        global.configInitialized = true;
    }
}

// ===== 网络配置 =====
const NETWORK_CONFIG = {
    name: 'Pharos Testnet',
    chainId: 688688,
    rpcUrl: 'https://testnet.dplabs-internal.com',
    nativeCurrency: 'PHRS',
    tokens: {
        USDC: { address: '0x72df0bcd7276f2dfbac900d1ce63c272c4bccced', decimals: 6 },
        USDT: { address: '0xd4071393f8716661958f766df660033b3d35fd29', decimals: 6 },
        WPHRS: { address: '0x76aaada469d23216be5f7c596fa25f282ff9b364', decimals: 18 },
    }
};

// ===== 配置优化工具 =====
function createCustomConfig(options = {}) {
    const defaultOptions = {
        features: {},
        loop: { enabled: true, waitMinutes: 15, maxCycles: 0 },
        wallet: { processAll: true, maxWallets: 0 },
        name: "自定义配置",
        description: "用户自定义的配置模式"
    };
    
    const config = { ...defaultOptions, ...options };
    
    // 应用功能设置
    Object.keys(FEATURE_CONFIG).forEach(featureName => {
        FEATURE_CONFIG[featureName].enabled = config.features[featureName] || false;
    });
    
    // 应用其他配置
    CURRENT_CONFIG.loop = { ...CURRENT_CONFIG.loop, ...config.loop };
    CURRENT_CONFIG.wallet = { ...CURRENT_CONFIG.wallet, ...config.wallet };
    CURRENT_CONFIG.preset = 'CUSTOM';
    
    console.log(`\x1b[32m[+] ✅ 已应用自定义配置: ${config.name}\x1b[0m`);
    console.log(`\x1b[32m[✓] 📝 ${config.description}\x1b[0m`);
    
    return config;
}

function setWalletLimit(maxWallets = 0) {
    CURRENT_CONFIG.wallet.maxWallets = maxWallets;
    CURRENT_CONFIG.wallet.processAll = maxWallets === 0;
    
    console.log(`\x1b[32m[+] ✅ 钱包限制已设置为: ${maxWallets === 0 ? '无限制' : maxWallets + '个'}\x1b[0m`);
}

function enableAllFeatures() {
    Object.keys(FEATURE_CONFIG).forEach(featureName => {
        FEATURE_CONFIG[featureName].enabled = true;
    });
    console.log(`\x1b[32m[+] ✅ 已启用所有功能\x1b[0m`);
}

function disableAllFeatures() {
    Object.keys(FEATURE_CONFIG).forEach(featureName => {
        FEATURE_CONFIG[featureName].enabled = false;
    });
    console.log(`\x1b[32m[+] ✅ 已禁用所有功能\x1b[0m`);
}

// ===== 工具函数 =====
function applyConfigPreset(presetName) {
    if (!CONFIG_PRESETS[presetName]) {
        throw new Error(`未知的配置预设: ${presetName}`);
    }
    
    const preset = CONFIG_PRESETS[presetName];
    
    Object.keys(FEATURE_CONFIG).forEach(featureName => {
        FEATURE_CONFIG[featureName].enabled = preset.features[featureName] || false;
    });
    
    CURRENT_CONFIG.loop = { ...CURRENT_CONFIG.loop, ...preset.loop };
    CURRENT_CONFIG.wallet = { ...CURRENT_CONFIG.wallet, ...preset.wallet };
    CURRENT_CONFIG.preset = presetName;
    
    // 将配置写回文件以持久化
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'production_config.js');
    let content = fs.readFileSync(configPath, 'utf8');
    
    // 更新 preset 设置
    content = content.replace(
        /preset: '[^']*'/,
        `preset: '${presetName}'`
    );
    
    fs.writeFileSync(configPath, content);
    
    console.log(`\x1b[32m[+] ✅ 已应用配置预设: ${preset.name}\x1b[0m`);
    console.log(`\x1b[32m[✓] 📝 ${preset.description}\x1b[0m`);
    console.log(`\x1b[32m[✓] 💡 现在可以运行 node production_main.js 启动系统\x1b[0m`);
}

function getEnabledFeatures() {
    return Object.keys(FEATURE_CONFIG).filter(key => FEATURE_CONFIG[key].enabled);
}

function getCyclableFeatures() {
    return Object.keys(FEATURE_CONFIG).filter(key => 
        FEATURE_CONFIG[key].enabled && FEATURE_CONFIG[key].cycleEnabled
    );
}

function getOnceOnlyFeatures() {
    return Object.keys(FEATURE_CONFIG).filter(key => 
        FEATURE_CONFIG[key].enabled && !FEATURE_CONFIG[key].cycleEnabled
    );
}

function getFeatureConfig(featureName) {
    return FEATURE_CONFIG[featureName];
}

function printCurrentConfig() {
    const preset = CONFIG_PRESETS[CURRENT_CONFIG.preset];
    
    console.log("🎯 当前系统配置:");
    console.log(`配置预设: ${preset.name}`);
    console.log(`描述: ${preset.description}`);
    console.log(`启用功能: ${getEnabledFeatures().length} 个`);
    
    console.log("\n📋 功能状态:");
    Object.entries(FEATURE_CONFIG).forEach(([key, config]) => {
        const status = config.enabled ? "✅" : "❌";
        const cycle = config.cycleEnabled ? "🔄" : "1️⃣";
        console.log(`  ${status} ${cycle} ${config.name}: ${config.description}`);
    });
    
    console.log(`\n⏱️ 循环设置: ${CURRENT_CONFIG.loop.enabled ? `每${CURRENT_CONFIG.loop.waitMinutes}分钟` : '单次运行'}`);
    console.log(`👛 钱包处理: ${CURRENT_CONFIG.wallet.processAll ? '所有钱包' : `前${CURRENT_CONFIG.wallet.maxWallets}个钱包`}`);
}

// 立即初始化配置
initializeConfig();

module.exports = {
    FEATURE_CONFIG,
    CONFIG_PRESETS,
    CURRENT_CONFIG,
    NETWORK_CONFIG,
    applyConfigPreset,
    createCustomConfig,
    setWalletLimit,
    enableAllFeatures,
    disableAllFeatures,
    getEnabledFeatures,
    getCyclableFeatures,
    getOnceOnlyFeatures,
    getFeatureConfig,
    printCurrentConfig,
    initializeConfig
};
