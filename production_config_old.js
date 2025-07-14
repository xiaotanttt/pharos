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
        enabled: false,
        name: "领水龙头",
        description: "自动领取测试网代币",
        cycleEnabled: true // 是否在循环中执行
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
    
    // 原始Swap功能 (来自main.js)
    originalSwap: {
        enabled: true,
        name: "原始Swap交易",
        description: "执行15-20次随机Swap交易",
        cycleEnabled: true,
        config: {
            contractAddress: '0x1a4de519154ae51200b0ad7c90f7fac75547888a',
            minSwaps: 15,
            maxSwaps: 20,
            pairs: [
                { from: 'WPHRS', to: 'USDC', amount: 0.001 },
                { from: 'WPHRS', to: 'USDT', amount: 0.001 },
                { from: 'USDC', to: 'WPHRS', amount: 0.1 },
                { from: 'USDT', to: 'WPHRS', amount: 0.1 },
                { from: 'USDC', to: 'USDT', amount: 0.1 },
                { from: 'USDT', to: 'USDC', amount: 0.1 }
            ]
        }
    },
    
    // 增强Swap功能 (我们开发的多合约版本)
    enhancedSwap: {
        enabled: false,
        name: "增强版Swap",
        description: "两个合约各执行10次swap",
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
        cycleEnabled: false,
        config: {
            contractAddress: '0x7fb63bfd3ef701544bf805e88cb9d2efaa3c01a9',
            mintAmount: 1
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
            originalSwap: true,
            enhancedSwap: false,
            wrapPHRS: true,
            domainMint: true,
            nftMint: true
        },
        loop: { enabled: true, waitMinutes: 30, maxCycles: 0 },
        wallet: { processAll: false, maxWallets: 5 }
    },
    
    TRADING_ONLY: {
        name: "交易专用模式", 
        description: "专注交易功能，高频执行",
        features: {
            faucet: false,
            checkin: true,
            originalTransfer: true,
            originalSwap: true,
            enhancedSwap: false,
            wrapPHRS: true,
            domainMint: false,
            nftMint: false
        },
        loop: { enabled: true, waitMinutes: 15, maxCycles: 0 },
        wallet: { processAll: false, maxWallets: 10 }
    },
    
    DOMAIN_ONLY: {
        name: "域名专用模式",
        description: "仅域名注册，单次运行",
        features: {
            faucet: false,
            checkin: false,
            originalTransfer: false,
            originalSwap: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: true,
            nftMint: false
        },
        loop: { enabled: false, waitMinutes: 0, maxCycles: 1 },
        wallet: { processAll: true, maxWallets: 0 }
    },
    
    BASIC_ONLY: {
        name: "基础功能模式",
        description: "签到+转账，轻量运行",
        features: {
            faucet: true,
            checkin: true,
            originalTransfer: true,
            originalSwap: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: false,
            nftMint: false
        },
        loop: { enabled: true, waitMinutes: 60, maxCycles: 0 },
        wallet: { processAll: false, maxWallets: 3 }
    },
    
    TEST_MODE: {
        name: "测试模式",
        description: "少量功能，单次运行，适合测试",
        features: {
            faucet: false,
            checkin: true,
            originalTransfer: false,
            originalSwap: false,
            enhancedSwap: false,
            wrapPHRS: false,
            domainMint: false,
            nftMint: false
        },
        loop: { enabled: false, waitMinutes: 0, maxCycles: 1 },
        wallet: { processAll: false, maxWallets: 1 }
    }
};

// ===== 当前运行配置 =====
let CURRENT_CONFIG = {
    preset: 'TRADING_ONLY',
    loop: {
        enabled: true,
        waitMinutes: 15,
        maxCycles: 0
    },
    wallet: {
        processAll: false,
        maxWallets: 10,
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

module.exports = {
    FEATURE_CONFIG,
    CONFIG_PRESETS,
    CURRENT_CONFIG,
    NETWORK_CONFIG,
    applyConfigPreset,
    getEnabledFeatures,
    getCyclableFeatures,
    getOnceOnlyFeatures,
    getFeatureConfig,
    printCurrentConfig
};
