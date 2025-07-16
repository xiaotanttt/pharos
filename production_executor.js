/**
 * 生产系统核心执行器
 * 整合所有功能：原始转账 + Enhanced Swap + 域名Mint + NFT + 基础功能
 * 
 * 作者: 0xTAN
 * 推特: https://X.com/cgyJ9WZV29saahQ
 */

const { ethers } = require('ethers');
const axios = require('axios');
const randomUseragent = require('random-useragent');
const { HttpsProxyAgent } = require('https-proxy-agent');

const { 
    FEATURE_CONFIG, 
    CURRENT_CONFIG, 
    NETWORK_CONFIG,
    getEnabledFeatures,
    getCyclableFeatures,
    getOnceOnlyFeatures,
    getFeatureConfig,
    printCurrentConfig
} = require('./production_config');

const { executeLiquidityAddition } = require('./liquidity_module.js');

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
    wallet: (msg) => console.log(`${colors.yellow}[👛] ${msg}${colors.reset}`),
    cycle: (msg) => console.log(`${colors.bold}${colors.cyan}[🔄] ${msg}${colors.reset}`),
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== ABI 定义 =====
const erc20ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
];

const wphrsABI = [
    ...erc20ABI,
    'function deposit() payable'
];

const nftABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_receiver", "type": "address" },
            { "internalType": "uint256", "name": "_quantity", "type": "uint256" },
            { "internalType": "address", "name": "_currency", "type": "address" },
            { "internalType": "uint256", "name": "_pricePerToken", "type": "uint256" },
            {
                "components": [
                    { "internalType": "bytes32[]", "name": "proof", "type": "bytes32[]" },
                    { "internalType": "uint256", "name": "quantityLimitPerWallet", "type": "uint256" },
                    { "internalType": "uint256", "name": "pricePerToken", "type": "uint256" },
                    { "internalType": "address", "name": "currency", "type": "address" }
                ],
                "internalType": "struct ITokenGatedDrop.AllowlistProof",
                "name": "_allowlistProof",
                "type": "tuple"
            },
            { "internalType": "bytes", "name": "_data", "type": "bytes" }
        ],
        "name": "claim",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

/**
 * 重试机制
 */
async function retry(fn, maxRetries = 3, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            logger.warn(`重试 ${i + 1}/${maxRetries}: ${error.message}`);
            await delay(delayMs);
        }
    }
}

/**
 * 生产系统执行器类
 */
class ProductionExecutor {
    constructor() {
        this.cycleCount = 0;
        this.totalWalletsProcessed = 0;
        this.onceOnlyCompleted = new Set(); // 记录已完成的单次功能
        this.executionStats = {
            totalCycles: 0,
            totalWallets: 0,
            featureStats: {}
        };
    }

    /**
     * 显示系统横幅
     */
    showBanner() {
        const banner = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ██╗  ██╗████████╗ █████╗ ███╗   ██╗    ██████╗ ██╗   ██╗         ║
║  ██╔═████╗╚██╗██╔╝╚══██╔══╝██╔══██╗████╗  ██║   ██╔═══██╗██║   ██║         ║
║  ██║██╔██║ ╚███╔╝    ██║   ███████║██╔██╗ ██║   ██║   ██║██║   ██║         ║
║  ████╔╝██║ ██╔██╗    ██║   ██╔══██║██║╚██╗██║   ██║▄▄ ██║██║   ██║         ║
║  ╚██████╔╝██╔╝ ██╗   ██║   ██║  ██║██║ ╚████║   ╚██████╔╝╚██████╔╝         ║
║   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══▀▀═╝  ╚═════╝          ║
║                                                                              ║
║                    Pharos 自动化系统 v2.0.0                                 ║
║                                                                              ║
║                    🧠 智能增强Swap策略 | 🔄 多钱包批量处理                   ║
║                    🌐 代理池支持       | 🛡️ 完善错误处理                     ║
║                                                                              ║
║                    作者: 0xTAN                                               ║
║                    推特: https://X.com/cgyJ9WZV29saahQ                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
        `;
        
        console.log(`${colors.cyan}${colors.bold}${banner}${colors.reset}`);
        printCurrentConfig();
    }

    /**
     * 执行领水功能 - 完整版本 (从原始main.js移植)
     */
    async executeFaucet(wallet, proxy = null) {
        try {
            logger.step(`开始领取水龙头 - ${wallet.address}`);
            
            const message = "pharos";
            const signature = await wallet.signMessage(message);
            const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
            
            const headers = {
                accept: "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.8",
                "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "sec-gpc": "1",
                Referer: "https://testnet.pharosnetwork.xyz/",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "User-Agent": randomUseragent.getRandom(),
            };

            // 登录获取JWT
            const loginResponse = await retry(async () => {
                const res = await axios.post(loginUrl, {}, {
                    headers,
                    httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined,
                });
                if (res.status === 403) throw new Error('403 Forbidden: Check API access or proxy');
                return res;
            });

            const jwt = loginResponse.data?.data?.jwt;
            if (!jwt) {
                logger.warn('水龙头登录失败');
                return { success: false, feature: 'faucet', error: '登录失败' };
            }

            // 检查领水状态
            const statusResponse = await retry(async () => {
                const res = await axios.get(`https://api.pharosnetwork.xyz/faucet/status?address=${wallet.address}`, {
                    headers: { ...headers, authorization: `Bearer ${jwt}` },
                    httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined,
                });
                if (res.status === 403) throw new Error('403 Forbidden: Check JWT or API restrictions');
                return res;
            });

            const available = statusResponse.data?.data?.is_able_to_faucet;
            if (!available) {
                const nextAvailable = new Date(statusResponse.data?.data?.avaliable_timestamp * 1000).toLocaleString('en-US', { timeZone: 'Asia/Makassar' });
                logger.warn(`今日水龙头已领取，下一可用时间：${nextAvailable}`);
                return { 
                    success: true, // 标记为成功，因为这不是错误
                    feature: 'faucet', 
                    message: 'already_claimed',
                    nextAvailable: nextAvailable
                };
            }

            // 执行领水
            const claimResponse = await retry(async () => {
                const res = await axios.post(`https://api.pharosnetwork.xyz/faucet/daily?address=${wallet.address}`, {}, {
                    headers: { ...headers, authorization: `Bearer ${jwt}` },
                    httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined,
                });
                if (res.status === 403) throw new Error('403 Forbidden: Check API access or rate limits');
                return res;
            });

            if (claimResponse.data?.code === 0) {
                logger.success('✅ 水龙头领取成功');
                return { 
                    success: true, 
                    feature: 'faucet',
                    message: 'claimed_successfully'
                };
            } else {
                logger.warn(`水龙头领取失败：${claimResponse.data?.msg || '未知错误'}`);
                return { 
                    success: false, 
                    feature: 'faucet', 
                    error: claimResponse.data?.msg || '未知错误' 
                };
            }
            
        } catch (error) {
            logger.error(`领取水龙头异常：${error.message}`);
            if (error.response) {
                logger.error(`响应详情：${JSON.stringify(error.response.data, null, 2)}`);
            }
            return { success: false, feature: 'faucet', error: error.message };
        }
    }

    /**
     * 执行签到功能
     */
    async executeCheckin(wallet, proxy = null) {
        try {
            logger.step(`开始每日签到 - ${wallet.address}`);
            
            const message = "pharos";
            const signature = await wallet.signMessage(message);
            const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
            
            const headers = {
                accept: "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.8",
                "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "sec-gpc": "1",
                Referer: "https://testnet.pharosnetwork.xyz/",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "User-Agent": randomUseragent.getRandom(),
            };

            const loginRes = await retry(async () => {
                const res = await axios.post(loginUrl, {}, {
                    headers,
                    httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined,
                });
                if (res.status === 403) throw new Error('403 Forbidden: Check API access or proxy');
                return res;
            });

            const jwt = loginRes.data?.data?.jwt;
            if (!jwt) {
                throw new Error('签到登录失败');
            }

            const signRes = await retry(async () => {
                const res = await axios.post(`https://api.pharosnetwork.xyz/sign/in?address=${wallet.address}`, {}, {
                    headers: { ...headers, authorization: `Bearer ${jwt}` },
                    httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined,
                });
                if (res.status === 403) throw new Error('403 Forbidden: Check JWT or API restrictions');
                return res;
            });

            if (signRes.data?.code === 0) {
                logger.success('✅ 签到成功');
                return { success: true, feature: 'checkin' };
            } else {
                throw new Error(`签到失败：${signRes.data?.msg || '未知错误'}`);
            }
            
        } catch (error) {
            logger.error(`签到功能失败: ${error.message}`);
            return { success: false, feature: 'checkin', error: error.message };
        }
    }

    /**
     * 执行原始转账功能 (来自main.js)
     */
    async executeOriginalTransfer(wallet, provider) {
        try {
            const config = getFeatureConfig('originalTransfer').config;
            logger.step(`开始执行原始PHRS随机转账 (${config.transferCount}次)`);
            
            let successCount = 0;
            
            for (let i = 0; i < config.transferCount; i++) {
                try {
                    const to = ethers.Wallet.createRandom().address;
                    const balance = await provider.getBalance(wallet.address);
                    const required = ethers.utils.parseEther(config.transferAmount.toString());
                    const requiredWithGas = required.add(ethers.utils.parseEther("0.001"));
                    
                    if (balance.lt(requiredWithGas)) {
                        logger.warn(`PHRS余额不足，终止转账任务`);
                        break;
                    }

                    const tx = await wallet.sendTransaction({
                        to,
                        value: required,
                        gasLimit: config.gasLimit,
                        gasPrice: config.gasPrice,
                    });
                    
                    logger.loading(`随机转账 ${i + 1}/${config.transferCount} 到 ${to.slice(0,10)}... | TX: ${tx.hash}`);
                    await tx.wait();
                    logger.success(`随机转账 ${i + 1}/${config.transferCount} 成功!`);
                    successCount++;
                    
                    await delay(1000 + Math.random() * 2000);
                } catch (error) {
                    logger.error(`转账 ${i + 1} 失败: ${error.message}`);
                }
            }
            
            logger.success(`✅ 原始转账完成: ${successCount}/${config.transferCount} 成功`);
            return { 
                success: successCount > 0, 
                feature: 'originalTransfer',
                details: { successCount, totalCount: config.transferCount }
            };
            
        } catch (error) {
            logger.error(`原始转账功能失败: ${error.message}`);
            return { success: false, feature: 'originalTransfer', error: error.message };
        }
    }

    /**
     * 执行PHRS包装功能
     */
    async executeWrapPHRS(wallet, provider) {
        try {
            const config = getFeatureConfig('wrapPHRS').config;
            logger.step("执行PHRS包装");
            
            const wphrsAddress = NETWORK_CONFIG.tokens.WPHRS.address;
            const wphrsContract = new ethers.Contract(wphrsAddress, wphrsABI, wallet);
            
            const currentBalance = await wphrsContract.balanceOf(wallet.address);
            const minBalance = ethers.utils.parseEther(config.minBalance.toString());
            
            if (currentBalance.lt(minBalance)) {
                const wrapAmount = ethers.utils.parseEther(config.wrapAmount.toString());
                const tx = await wphrsContract.deposit({ value: wrapAmount });
                await tx.wait();
                logger.success(`✅ 包装了 ${config.wrapAmount} PHRS`);
            } else {
                logger.info("WPHRS余额充足，跳过包装");
            }
            
            return { success: true, feature: 'wrapPHRS' };
            
        } catch (error) {
            logger.error(`PHRS包装失败: ${error.message}`);
            return { success: false, feature: 'wrapPHRS', error: error.message };
        }
    }

    /**
     * 执行增强版Swap功能 (主要Swap功能)
     */
    async executeEnhancedSwap(wallet, provider) {
        try {
            logger.step("执行增强版Swap (主要Swap功能)");
            
            // 获取配置
            const config = getFeatureConfig('enhancedSwap').config;
            const contracts = config.contracts;
            const swapsPerContract = config.swapsPerContract;
            
            // 交易对配置
            const TRADING_PAIRS = [
                { from: 'WPHRS', to: 'USDC', baseAmount: 0.001, weight: 3 },
                { from: 'WPHRS', to: 'USDT', baseAmount: 0.001, weight: 3 },
                { from: 'USDC', to: 'USDT', baseAmount: 0.1, weight: 2 },
                { from: 'USDT', to: 'USDC', baseAmount: 0.1, weight: 2 },
                { from: 'USDC', to: 'WPHRS', baseAmount: 0.1, weight: 2 },
                { from: 'USDT', to: 'WPHRS', baseAmount: 0.1, weight: 2 },
                { from: 'WPHRS', to: 'USDC', baseAmount: 0.0005, weight: 1 },
                { from: 'WPHRS', to: 'USDT', baseAmount: 0.0005, weight: 1 },
                { from: 'USDC', to: 'WPHRS', baseAmount: 0.05, weight: 1 },
                { from: 'USDT', to: 'WPHRS', baseAmount: 0.05, weight: 1 },
            ];

            const multicallABI = [
                {
                    "inputs": [
                        {"internalType": "uint256", "name": "deadline", "type": "uint256"},
                        {"internalType": "bytes[]", "name": "data", "type": "bytes[]"}
                    ],
                    "name": "multicall",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                }
            ];

            const tokens = NETWORK_CONFIG.tokens;
            
            logger.info(`🎯 对 ${contracts.length} 个合约各执行 ${swapsPerContract} 次swap`);
            
            // 检查余额
            const balance = await provider.getBalance(wallet.address);
            const balanceEth = ethers.utils.formatEther(balance);
            logger.info(`💰 PHRS余额: ${balanceEth}`);
            
            if (balance.lt(ethers.utils.parseEther("0.01"))) {
                throw new Error(`PHRS余额不足: ${balanceEth}`);
            }

            let totalSwaps = 0;
            let successfulSwaps = 0;
            let usedPairs = [];

            // 辅助函数：选择交易对
            const selectTradingPair = async () => {
                const availablePairs = [];
                
                for (const pair of TRADING_PAIRS) {
                    try {
                        const token = tokens[pair.from];
                        if (!token) continue;
                        
                        const tokenContract = new ethers.Contract(token.address, erc20ABI, provider);
                        const tokenBalance = await tokenContract.balanceOf(wallet.address);
                        const requiredAmount = ethers.utils.parseUnits(pair.baseAmount.toString(), token.decimals);
                        
                        if (tokenBalance.gte(requiredAmount)) {
                            availablePairs.push(pair);
                        }
                    } catch (error) {
                        // 忽略余额检查错误，继续下一个
                        continue;
                    }
                }

                if (availablePairs.length === 0) return null;

                // 避免连续使用相同交易对
                const recentPairKey = usedPairs.slice(-2).join(',');
                const diversePairs = availablePairs.filter(pair => {
                    const pairKey = `${pair.from}-${pair.to}`;
                    return !recentPairKey.includes(pairKey);
                });

                const finalPairs = diversePairs.length > 0 ? diversePairs : availablePairs;
                
                // 根据权重随机选择
                const totalWeight = finalPairs.reduce((sum, pair) => sum + pair.weight, 0);
                let random = Math.random() * totalWeight;
                
                for (const pair of finalPairs) {
                    random -= pair.weight;
                    if (random <= 0) {
                        return pair;
                    }
                }

                return finalPairs[0];
            };

            // 对每个合约执行swap
            for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
                const contractAddr = contracts[contractIndex];
                const contract = new ethers.Contract(contractAddr, multicallABI, wallet);
                
                logger.info(`\n🎯 处理合约 ${contractIndex + 1}: ${contractAddr.slice(0, 8)}...`);
                
                for (let swapIndex = 1; swapIndex <= swapsPerContract; swapIndex++) {
                    try {
                        // 选择交易对
                        const pair = await selectTradingPair();
                        if (!pair) {
                            logger.warn(`无可用交易对，跳过剩余swap`);
                            break;
                        }

                        logger.step(`[${contractIndex + 1}] ${pair.from} → ${pair.to} (${swapIndex}/${swapsPerContract})`);

                        // 随机化交易金额
                        const amountMultiplier = 0.7 + Math.random() * 0.6;
                        const token = tokens[pair.from];
                        const randomizedAmount = pair.baseAmount * amountMultiplier;
                        const amount = ethers.utils.parseUnits(randomizedAmount.toFixed(token.decimals), token.decimals);

                        logger.info(`💰 交易金额: ${randomizedAmount.toFixed(6)} ${pair.from}`);

                        // 检查并授权
                        const tokenContract = new ethers.Contract(token.address, erc20ABI, wallet);
                        const allowance = await tokenContract.allowance(wallet.address, contractAddr);
                        
                        if (allowance.lt(amount)) {
                            logger.loading("授权代币...");
                            const approveTx = await tokenContract.approve(contractAddr, ethers.constants.MaxUint256);
                            await approveTx.wait();
                            logger.success("✅ 授权成功");
                            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                        }

                        // 构造swap数据
                        const swapData = ethers.utils.defaultAbiCoder.encode(
                            ['address', 'address', 'uint24', 'address', 'uint256', 'uint256', 'uint256'],
                            [
                                tokens[pair.from].address,
                                tokens[pair.to].address,
                                500, // 手续费率
                                wallet.address,
                                amount,
                                0, // amountOutMin
                                0  // deadline
                            ]
                        );

                        const fullData = ethers.utils.concat(["0x04e45aaf", swapData]);

                        // 执行交易
                        logger.loading(`发送交易到合约 ${contractAddr.slice(0, 8)}...`);
                        const tx = await contract.multicall(
                            Math.floor(Date.now() / 1000) + 300,
                            [fullData],
                            {
                                gasLimit: Math.floor(Math.random() * 40000) + 480000,
                                gasPrice: 0
                            }
                        );

                        logger.loading(`等待确认: ${tx.hash}`);
                        const receipt = await tx.wait();

                        if (receipt.status === 1) {
                            logger.success(`✅ Swap成功: ${tx.hash.slice(0, 10)}...`);
                            successfulSwaps++;
                            
                            // 记录使用的交易对
                            usedPairs.push(`${pair.from}-${pair.to}`);
                            if (usedPairs.length > 10) {
                                usedPairs.shift();
                            }
                        } else {
                            logger.error(`❌ Swap失败，状态: ${receipt.status}`);
                        }

                        totalSwaps++;
                        
                        // 交易间延迟
                        const delay = Math.floor(Math.random() * 3000) + 2000;
                        await new Promise(resolve => setTimeout(resolve, delay));

                    } catch (error) {
                        logger.error(`Swap ${swapIndex} 失败: ${error.message}`);
                        totalSwaps++;
                    }
                }

                // 合约间延迟
                if (contractIndex < contracts.length - 1) {
                    logger.info("⏳ 合约间延迟...");
                    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000));
                }
            }

            // 输出总结
            logger.info(`\n📊 Swap执行总结:`);
            logger.info(`📤 总交易数: ${totalSwaps}`);
            logger.info(`✅ 成功: ${successfulSwaps}`);
            logger.info(`❌ 失败: ${totalSwaps - successfulSwaps}`);
            logger.info(`📈 成功率: ${totalSwaps > 0 ? ((successfulSwaps / totalSwaps) * 100).toFixed(1) : 0}%`);

            logger.success("✅ 增强版Swap执行完成");
            
            return { 
                success: true, 
                feature: 'enhancedSwap',
                totalSwaps: totalSwaps,
                successfulSwaps: successfulSwaps,
                successRate: totalSwaps > 0 ? ((successfulSwaps / totalSwaps) * 100).toFixed(1) : 0
            };
            
        } catch (error) {
            logger.error(`增强版Swap失败: ${error.message}`);
            return { success: false, feature: 'enhancedSwap', error: error.message };
        }
    }

    /**
     * 执行域名Mint功能
     */
    async executeDomainMint(wallet, provider) {
        try {
            logger.step("执行域名Mint");
            
            // 完整的域名合约ABI
            const DOMAIN_CONTRACT_ABI = [
                {
                    "inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}],
                    "name": "commit", 
                    "outputs": [], 
                    "stateMutability": "nonpayable", 
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "string", "name": "name", "type": "string"},
                        {"internalType": "uint256", "name": "duration", "type": "uint256"}
                    ],
                    "name": "rentPrice", 
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], 
                    "stateMutability": "view", 
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "string", "name": "name", "type": "string"},
                        {"internalType": "address", "name": "owner", "type": "address"},
                        {"internalType": "uint256", "name": "duration", "type": "uint256"},
                        {"internalType": "bytes32", "name": "secret", "type": "bytes32"},
                        {"internalType": "address", "name": "resolver", "type": "address"},
                        {"internalType": "bytes[]", "name": "data", "type": "bytes[]"},
                        {"internalType": "bool", "name": "reverseRecord", "type": "bool"},
                        {"internalType": "uint16", "name": "fuses", "type": "uint16"}
                    ],
                    "name": "register",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "string", "name": "name", "type": "string"},
                        {"internalType": "address", "name": "owner", "type": "address"},
                        {"internalType": "uint256", "name": "duration", "type": "uint256"},
                        {"internalType": "bytes32", "name": "secret", "type": "bytes32"},
                        {"internalType": "address", "name": "resolver", "type": "address"},
                        {"internalType": "bytes[]", "name": "data", "type": "bytes[]"},
                        {"internalType": "bool", "name": "reverseRecord", "type": "bool"},
                        {"internalType": "uint16", "name": "fuses", "type": "uint16"}
                    ],
                    "name": "makeCommitment",
                    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                    "stateMutability": "pure",
                    "type": "function"
                }
            ];
            
            // 域名注册配置
            const domainConfig = getFeatureConfig('domainMint').config;
            const contractAddress = domainConfig.contractAddress;
            const resolver = domainConfig.resolver;
            const duration = domainConfig.duration;
            
            // 生成随机域名
            const generateRandomDomainName = (length = 10) => {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < length; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };
            
            const domainName = generateRandomDomainName();
            const secret = ethers.utils.randomBytes(32);
            const secretHex = ethers.utils.hexlify(secret);
            const data = [];
            const reverseRecord = false;
            const fuses = 0;
            
            const contract = new ethers.Contract(contractAddress, DOMAIN_CONTRACT_ABI, wallet);
            
            logger.info(`🎯 注册域名: ${domainName}.phrs`);
            logger.info(`📍 钱包地址: ${wallet.address}`);
            
            // 检查余额
            const balance = await provider.getBalance(wallet.address);
            const balanceEth = ethers.utils.formatEther(balance);
            logger.info(`💰 钱包余额: ${balanceEth} PHRS`);
            
            if (balance.lt(ethers.utils.parseEther("0.01"))) {
                throw new Error(`余额不足: ${balanceEth} PHRS`);
            }
            
            // Step 1: 使用makeCommitment计算正确的commitment
            logger.step("计算commitment...");
            const commitment = await contract.makeCommitment(
                domainName, wallet.address, duration, secretHex, 
                resolver, data, reverseRecord, fuses
            );
            logger.info(`✅ Commitment: ${commitment}`);
            
            // Step 2: 发送commit交易
            logger.step("发送commit交易...");
            const commitTx = await contract.commit(commitment, {
                gasLimit: 100000,
                gasPrice: ethers.utils.parseUnits("1", "gwei")
            });
            logger.info(`📤 Commit交易: ${commitTx.hash}`);
            
            // 等待commit确认
            const commitReceipt = await provider.waitForTransaction(commitTx.hash, 1, 180000);
            if (commitReceipt.status !== 1) {
                throw new Error("Commit交易失败");
            }
            logger.success("✅ Commit交易确认成功");
            
            // Step 3: 等待最小commitment年龄
            logger.step("等待60秒...");
            await new Promise(resolve => setTimeout(resolve, 62000));
            
            // Step 4: 获取价格并注册
            logger.step("获取价格并注册...");
            const priceInfo = await contract.rentPrice(domainName, duration);
            const priceEth = ethers.utils.formatEther(priceInfo);
            logger.info(`💰 域名价格: ${priceEth} PHRS`);
            
            const registerTx = await contract.register(
                domainName, wallet.address, duration, secretHex,
                resolver, data, reverseRecord, fuses,
                {
                    value: priceInfo,
                    gasLimit: 500000,
                    gasPrice: ethers.utils.parseUnits("1", "gwei")
                }
            );
            logger.info(`📤 Register交易: ${registerTx.hash}`);
            
            // 等待register确认
            const registerReceipt = await provider.waitForTransaction(registerTx.hash, 1, 180000);
            
            if (registerReceipt.status === 1) {
                logger.success(`🎉 域名注册成功: ${domainName}.phrs`);
                logger.success(`📤 Commit交易: ${commitTx.hash}`);
                logger.success(`📤 Register交易: ${registerTx.hash}`);
                logger.success(`⛽ Gas使用: ${registerReceipt.gasUsed.toString()}`);
                logger.success(`💰 注册价格: ${priceEth} PHRS`);
                
                return { 
                    success: true, 
                    feature: 'domainMint',
                    domainName: domainName,
                    commitTxHash: commitTx.hash,
                    registerTxHash: registerTx.hash,
                    gasUsed: registerReceipt.gasUsed.toString(),
                    price: priceEth
                };
            } else {
                throw new Error("Register交易失败");
            }
            
        } catch (error) {
            logger.error(`域名Mint失败: ${error.message}`);
            return { success: false, feature: 'domainMint', error: error.message };
        }
    }

    /**
     * 执行NFT铸造功能
     */
    async executeNFTMint(wallet, provider) {
        try {
            const config = getFeatureConfig('nftMint').config;
            logger.step("执行NFT铸造");
            
            const nftContract = new ethers.Contract(config.contractAddress, nftABI, wallet);
            
            // 检查合约代码是否存在
            const code = await provider.getCode(config.contractAddress);
            if (code === '0x') {
                throw new Error(`NFT合约地址 ${config.contractAddress} 不存在或未部署`);
            }
            logger.info(`✅ NFT合约代码验证通过`);

            // 构建交易参数
            const receiver = wallet.address;
            const quantity = config.mintAmount || 1;
            const currency = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // 原生代币地址
            const pricePerToken = ethers.utils.parseEther("1"); // 1 PHRS 价格
            
            const allowlistProof = {
                proof: [],
                quantityLimitPerWallet: ethers.constants.MaxUint256,
                pricePerToken: 0,
                currency: '0x0000000000000000000000000000000000000000'
            };
            const data = '0x';
            
            const txValue = pricePerToken.mul(quantity);
            
            // 检查余额
            const balance = await provider.getBalance(wallet.address);
            const balanceEth = ethers.utils.formatEther(balance);
            const requiredEth = ethers.utils.formatEther(txValue);
            
            logger.info(`💰 钱包余额: ${balanceEth} PHRS`);
            logger.info(`🎯 NFT价格: ${requiredEth} PHRS`);
            
            if (balance.lt(txValue)) {
                throw new Error(`余额不足 (${balanceEth} PHRS)，需要 ${requiredEth} PHRS`);
            }

            // 模拟交易
            try {
                logger.step("正在模拟交易...");
                await nftContract.callStatic.claim(
                    receiver,
                    quantity,
                    currency,
                    pricePerToken,
                    allowlistProof,
                    data,
                    { value: txValue, gasLimit: 500000, gasPrice: 0 }
                );
                logger.success("✅ 交易模拟成功");
            } catch (simError) {
                logger.error(`交易模拟失败: ${simError.reason || simError.message}`);
                if (simError.data) {
                    try {
                        const decodedError = nftContract.interface.parseError(simError.data);
                        logger.error(`合约错误详情: ${decodedError.name}`);
                    } catch {}
                }
                throw new Error(`NFT铸造模拟失败: ${simError.reason || simError.message}`);
            }

            // 发送真实交易
            logger.loading("正在发送铸造交易...");
            const tx = await nftContract.claim(
                receiver,
                quantity,
                currency,
                pricePerToken,
                allowlistProof,
                data,
                {
                    value: txValue,
                    gasLimit: 500000,
                    gasPrice: 0,
                }
            );

            logger.loading(`等待确认: ${tx.hash}`);
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                logger.success(`🎉 NFT铸造成功!`);
                logger.success(`📤 交易哈希: ${tx.hash}`);
                logger.success(`⛽ Gas使用: ${receipt.gasUsed.toString()}`);
                logger.success(`💰 支付价格: ${requiredEth} PHRS`);
                
                return { 
                    success: true, 
                    feature: 'nftMint',
                    txHash: tx.hash,
                    gasUsed: receipt.gasUsed.toString(),
                    price: requiredEth,
                    quantity: quantity
                };
            } else {
                throw new Error(`NFT铸造失败，交易状态: ${receipt.status}`);
            }
            
        } catch (error) {
            logger.error(`NFT铸造失败: ${error.message}`);
            return { success: false, feature: 'nftMint', error: error.message };
        }
    }

    /**
     * 执行流动性添加功能
     */
    async executeLiquidityAdd(wallet, provider) {
        try {
            logger.step("执行多池流动性添加");
            
            // 获取配置
            const liquidityConfig = getFeatureConfig('liquidityAdd').config;
            const maxPools = liquidityConfig.maxPoolsPerCycle || 3;
            
            logger.info(`🎯 目标: 最多添加 ${maxPools} 个流动性池`);
            
            // 调用流动性模块（支持多池）
            const result = await executeLiquidityAddition(wallet, provider, maxPools);
            
            if (result.success) {
                logger.success(`🎉 多池流动性添加完成!`);
                logger.success(`📊 成功: ${result.successfulPools}/${result.totalPools} 个池`);
                
                if (result.successfulTxs && result.successfulTxs.length > 0) {
                    logger.success(`📤 成功的交易:`);
                    result.successfulTxs.forEach((hash, index) => {
                        logger.success(`   ${index + 1}. ${hash}`);
                    });
                }
                
                // 统计信息
                const successfulResults = result.results.filter(r => r.success);
                if (successfulResults.length > 0) {
                    logger.success(`💰 添加详情:`);
                    successfulResults.forEach((res, index) => {
                        logger.success(`   ${index + 1}. ${res.pool}: ${res.amount0} + ${res.amount1}`);
                    });
                }
                
                return {
                    success: true,
                    feature: 'liquidityAdd',
                    totalPools: result.totalPools,
                    successfulPools: result.successfulPools,
                    successfulTxs: result.successfulTxs,
                    results: result.results
                };
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            logger.error(`流动性添加失败: ${error.message}`);
            return { success: false, feature: 'liquidityAdd', error: error.message };
        }
    }

    /**
     * 处理单个钱包的所有功能
     */
    async processWallet(privateKey, proxy = null) {
        const provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        
        logger.wallet(`开始处理钱包: ${wallet.address}`);
        
        const walletResults = {
            address: wallet.address,
            results: [],
            totalFeatures: 0,
            successfulFeatures: 0,
            failedFeatures: 0
        };

        // 获取需要执行的功能 - 现在域名注册也是循环功能了
        const cyclableFeatures = getCyclableFeatures();
        const onceOnlyFeatures = getOnceOnlyFeatures().filter(f => 
            !this.onceOnlyCompleted.has(f)
        );
        
        const allFeatures = [...cyclableFeatures, ...onceOnlyFeatures];
        walletResults.totalFeatures = allFeatures.length;

        for (const featureName of allFeatures) {
            try {
                logger.info(`\n🎯 执行功能: ${getFeatureConfig(featureName).name}`);
                
                let result;
                
                switch (featureName) {
                    case 'faucet':
                        result = await this.executeFaucet(wallet, proxy);
                        break;
                    case 'checkin':
                        result = await this.executeCheckin(wallet, proxy);
                        break;
                    case 'originalTransfer':
                        result = await this.executeOriginalTransfer(wallet, provider);
                        break;
                    case 'wrapPHRS':
                        result = await this.executeWrapPHRS(wallet, provider);
                        break;
                    case 'enhancedSwap':
                        result = await this.executeEnhancedSwap(wallet, provider);
                        break;
                    case 'domainMint':
                        result = await this.executeDomainMint(wallet, provider);
                        break;
                    case 'nftMint':
                        result = await this.executeNFTMint(wallet, provider);
                        break;
                    case 'liquidityAdd':
                        result = await this.executeLiquidityAdd(wallet, provider);
                        break;
                    default:
                        logger.warn(`未知功能: ${featureName}`);
                        continue;
                }

                walletResults.results.push(result);
                
                if (result.success) {
                    walletResults.successfulFeatures++;
                    
                    // 只有真正的单次功能才标记为已完成 (现在主要是NFT)
                    if (!getFeatureConfig(featureName).cycleEnabled) {
                        this.onceOnlyCompleted.add(featureName);
                    }
                } else {
                    walletResults.failedFeatures++;
                }

                // 功能间延迟
                await delay(CURRENT_CONFIG.wallet.delayBetweenFeatures);

            } catch (error) {
                logger.error(`功能 ${featureName} 执行异常: ${error.message}`);
                walletResults.results.push({
                    success: false,
                    feature: featureName,
                    error: error.message
                });
                walletResults.failedFeatures++;
            }
        }

        // 输出钱包处理结果
        const successRate = walletResults.totalFeatures > 0 ? 
            ((walletResults.successfulFeatures / walletResults.totalFeatures) * 100).toFixed(1) : 0;
        
        logger.wallet(`钱包 ${wallet.address.slice(0, 8)}... 处理完成:`);
        logger.info(`  成功: ${walletResults.successfulFeatures}/${walletResults.totalFeatures} (${successRate}%)`);

        return walletResults;
    }
}

module.exports = { ProductionExecutor };
