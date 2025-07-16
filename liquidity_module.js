/**
 * Uniswap V3 流动性添加模块
 * 支持多种交易对的流动性添加操作
 */

const { ethers } = require('ethers');

// Uniswap V3 合约配置
const UNISWAP_V3_CONFIG = {
    // Uniswap V3 Positions NFT合约 (NonFungiblePositionManager)
    positionManager: '0xf8a1d4ff0f9b9af7ce58e1fc1833688f3bfd6115',
    
    // 支持的代币
    tokens: {
        USDC: { 
            address: '0x72df0bcd7276f2dfbac900d1ce63c272c4bccced', 
            decimals: 6,
            symbol: 'USDC'
        },
        USDT: { 
            address: '0xd4071393f8716661958f766df660033b3d35fd29', 
            decimals: 6,
            symbol: 'USDT'
        },
        WPHRS: { 
            address: '0x76aaada469d23216be5f7c596fa25f282ff9b364', 
            decimals: 18,
            symbol: 'WPHRS'
        },
    },
    
    // 流动性池配置 - 支持所有9个活跃池
    liquidityPools: [
        // USDC/WPHRS 交易对 (3个池) - 降低基础金额要求
        {
            token0: 'USDC',
            token1: 'WPHRS',
            fee: 500, // 0.05%
            baseAmount0: 8, // 基础金额 USDC (从50降到8)
            baseAmount1: 0.005, // 基础金额 WPHRS (从0.03降到0.005)
            tickSpacing: 10,
            weight: 3
        },
        {
            token0: 'USDC',
            token1: 'WPHRS',
            fee: 3000, // 0.3%
            baseAmount0: 6, // 基础金额 USDC (从30降到6)
            baseAmount1: 0.004, // 基础金额 WPHRS (从0.02降到0.004)
            tickSpacing: 60,
            weight: 2
        },
        {
            token0: 'USDC',
            token1: 'WPHRS',
            fee: 10000, // 1%
            baseAmount0: 4, // 基础金额 USDC (从20降到4)
            baseAmount1: 0.003, // 基础金额 WPHRS (从0.01降到0.003)
            tickSpacing: 200,
            weight: 1
        },
        // USDT/WPHRS 交易对 (3个池) - 降低基础金额要求
        {
            token0: 'USDT',
            token1: 'WPHRS', 
            fee: 500, // 0.05%
            baseAmount0: 8, // 基础金额 USDT (从50降到8)
            baseAmount1: 0.005, // 基础金额 WPHRS (从0.03降到0.005)
            tickSpacing: 10,
            weight: 3
        },
        {
            token0: 'USDT',
            token1: 'WPHRS',
            fee: 3000, // 0.3%
            baseAmount0: 6, // 基础金额 USDT (从30降到6)
            baseAmount1: 0.004, // 基础金额 WPHRS (从0.02降到0.004)
            tickSpacing: 60,
            weight: 2
        },
        {
            token0: 'USDT',
            token1: 'WPHRS',
            fee: 10000, // 1%
            baseAmount0: 4, // 基础金额 USDT (从20降到4)
            baseAmount1: 0.003, // 基础金额 WPHRS (从0.01降到0.003)
            tickSpacing: 200,
            weight: 1
        },
        // USDC/USDT 交易对 (3个池) - 降低基础金额要求
        {
            token0: 'USDC',
            token1: 'USDT',
            fee: 500, // 0.05%
            baseAmount0: 5, // 基础金额 USDC (从30降到5)
            baseAmount1: 5, // 基础金额 USDT (从30降到5)
            tickSpacing: 10,
            weight: 2
        },
        {
            token0: 'USDC',
            token1: 'USDT',
            fee: 3000, // 0.3%
            baseAmount0: 4, // 基础金额 USDC (从20降到4)
            baseAmount1: 4, // 基础金额 USDT (从20降到4)
            tickSpacing: 60,
            weight: 1
        },
        {
            token0: 'USDC',
            token1: 'USDT',
            fee: 10000, // 1%
            baseAmount0: 3, // 基础金额 USDC (从15降到3)
            baseAmount1: 3, // 基础金额 USDT (从15降到3)
            tickSpacing: 200,
            weight: 1
        }
    ]
};

// Uniswap V3 Position Manager ABI
const POSITION_MANAGER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "token0", "type": "address"},
                    {"internalType": "address", "name": "token1", "type": "address"},
                    {"internalType": "uint24", "name": "fee", "type": "uint24"},
                    {"internalType": "int24", "name": "tickLower", "type": "int24"},
                    {"internalType": "int24", "name": "tickUpper", "type": "int24"},
                    {"internalType": "uint256", "name": "amount0Desired", "type": "uint256"},
                    {"internalType": "uint256", "name": "amount1Desired", "type": "uint256"},
                    {"internalType": "uint256", "name": "amount0Min", "type": "uint256"},
                    {"internalType": "uint256", "name": "amount1Min", "type": "uint256"},
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "deadline", "type": "uint256"}
                ],
                "internalType": "struct INonfungiblePositionManager.MintParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "mint",
        "outputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "uint128", "name": "liquidity", "type": "uint128"},
            {"internalType": "uint256", "name": "amount0", "type": "uint256"},
            {"internalType": "uint256", "name": "amount1", "type": "uint256"}
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// ERC20 ABI (用于授权)
const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
];

/**
 * 流动性添加执行器
 */
class LiquidityProvider {
    constructor(wallet, provider) {
        this.wallet = wallet;
        this.provider = provider;
        this.positionManager = new ethers.Contract(
            UNISWAP_V3_CONFIG.positionManager, 
            POSITION_MANAGER_ABI, 
            wallet
        );
    }

    /**
     * PHRS包装功能 - 将原生PHRS包装成WPHRS
     */
    async wrapPHRSToWPHRS(requiredAmount) {
        try {
            console.log(`🔄 启动PHRS包装功能: 需要 ${ethers.utils.formatEther(requiredAmount)} WPHRS`);
            
            // 检查原生PHRS余额
            const phrsBalance = await this.provider.getBalance(this.wallet.address);
            console.log(`💰 原生PHRS余额: ${ethers.utils.formatEther(phrsBalance)}`);
            
            // 计算需要包装的数量 (增加20%缓冲)
            const wrapAmount = requiredAmount.mul(120).div(100);
            
            // 预留gas费用
            const gasReserve = ethers.utils.parseEther("0.01"); // 预留0.01 PHRS作为gas
            const totalNeeded = wrapAmount.add(gasReserve);
            
            if (phrsBalance.lt(totalNeeded)) {
                console.log(`❌ 原生PHRS余额不足: 需要 ${ethers.utils.formatEther(totalNeeded)}, 可用 ${ethers.utils.formatEther(phrsBalance)}`);
                return false;
            }
            
            console.log(`📦 计划包装: ${ethers.utils.formatEther(wrapAmount)} PHRS -> WPHRS`);
            
            // WPHRS合约ABI (包含deposit函数)
            const wphrsABI = [
                'function deposit() payable',
                'function balanceOf(address) view returns (uint256)'
            ];
            
            const wphrsContract = new ethers.Contract(
                UNISWAP_V3_CONFIG.tokens.WPHRS.address, 
                wphrsABI, 
                this.wallet
            );
            
            // 检查包装前WPHRS余额
            const beforeBalance = await wphrsContract.balanceOf(this.wallet.address);
            console.log(`📊 包装前WPHRS余额: ${ethers.utils.formatEther(beforeBalance)}`);
            
            // 执行包装交易
            console.log(`📤 发送包装交易...`);
            const wrapTx = await wphrsContract.deposit({
                value: wrapAmount,
                gasLimit: 100000,
                gasPrice: 0
            });
            
            console.log(`⏳ 等待包装确认: ${wrapTx.hash}`);
            const receipt = await wrapTx.wait();
            
            if (receipt.status === 1) {
                // 检查包装后余额
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒确保状态更新
                const afterBalance = await wphrsContract.balanceOf(this.wallet.address);
                const gained = afterBalance.sub(beforeBalance);
                
                console.log(`✅ PHRS包装成功!`);
                console.log(`📊 包装后WPHRS余额: ${ethers.utils.formatEther(afterBalance)}`);
                console.log(`🎯 获得WPHRS: ${ethers.utils.formatEther(gained)}`);
                console.log(`📤 交易哈希: ${wrapTx.hash}`);
                
                return afterBalance.gte(requiredAmount);
            } else {
                console.log(`❌ PHRS包装失败，状态: ${receipt.status}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ PHRS包装过程出错: ${error.message}`);
            return false;
        }
    }

    /**
     * 全面智能代币交换 - 支持任何代币不足时的自动交换 (优先使用PHRS包装)
     */
    async performUniversalIntelligentSwap(balances, requiredBalances) {
        try {
            console.log(`🔄 启动全面智能交换系统...`);
            
            const swapPlans = [];
            
            // 检查每种代币的需求和当前余额
            for (const [tokenSymbol, requiredAmount] of Object.entries(requiredBalances)) {
                const currentBalance = balances[tokenSymbol]?.balance || ethers.BigNumber.from(0);
                const deficit = requiredAmount.sub(currentBalance);
                
                if (deficit.gt(0)) {
                    const tokenConfig = UNISWAP_V3_CONFIG.tokens[tokenSymbol];
                    console.log(`⚠️ ${tokenSymbol} 不足，缺少: ${ethers.utils.formatUnits(deficit, tokenConfig.decimals)} ${tokenSymbol}`);
                    
                    // 特殊处理WPHRS：优先尝试用原生PHRS包装
                    if (tokenSymbol === 'WPHRS') {
                        console.log(`🎯 检测到WPHRS不足，优先尝试PHRS包装...`);
                        const wrapSuccess = await this.wrapPHRSToWPHRS(requiredAmount);
                        
                        if (wrapSuccess) {
                            console.log(`✅ PHRS包装成功，WPHRS问题已解决`);
                            continue; // 跳过为WPHRS制定交换计划
                        } else {
                            console.log(`⚠️ PHRS包装失败，将尝试其他方式获取WPHRS`);
                        }
                    }
                    
                    // 为不足的代币制定交换计划
                    const swapPlan = this.createSwapPlan(tokenSymbol, deficit, balances);
                    if (swapPlan) {
                        swapPlans.push(swapPlan);
                    }
                } else {
                    const tokenConfig = UNISWAP_V3_CONFIG.tokens[tokenSymbol];
                    console.log(`✅ ${tokenSymbol} 余额充足: ${ethers.utils.formatUnits(currentBalance, tokenConfig.decimals)}`);
                }
            }
            
            if (swapPlans.length === 0) {
                console.log(`✅ 所有代币余额充足，无需交换`);
                return true;
            }
            
            console.log(`📋 制定了 ${swapPlans.length} 个交换计划`);
            
            // 执行所有交换计划
            let successCount = 0;
            for (let i = 0; i < swapPlans.length; i++) {
                const plan = swapPlans[i];
                console.log(`\n🔄 执行交换计划 ${i + 1}/${swapPlans.length}: ${plan.fromToken} -> ${plan.toToken}`);
                
                const success = await this.executeTokenSwap(plan.fromToken, plan.toToken, plan.amount);
                if (success) {
                    successCount++;
                    console.log(`✅ 交换计划 ${i + 1} 成功完成`);
                    
                    // 交换间延迟
                    if (i < swapPlans.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } else {
                    console.log(`❌ 交换计划 ${i + 1} 失败`);
                }
            }
            
            console.log(`\n📊 交换总结: ${successCount}/${swapPlans.length} 个计划成功`);
            
            // 重新检查余额
            if (successCount > 0) {
                console.log(`🔄 重新检查代币余额...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                const newBalances = await this.checkTokenBalances();
                
                for (const [symbol, balance] of Object.entries(newBalances)) {
                    console.log(`   ${symbol}: ${balance.formatted} (充足: ${balance.sufficient ? '✅' : '❌'})`);
                }
                
                return true;
            }
            
            return successCount > 0;
            
        } catch (error) {
            console.log(`❌ 全面智能交换过程出错: ${error.message}`);
            return false;
        }
    }

    /**
     * 创建代币交换计划
     */
    createSwapPlan(targetToken, deficitAmount, currentBalances) {
        try {
            // 定义交换路径优先级
            const swapRoutes = {
                'WPHRS': ['USDC', 'USDT'], // WPHRS不足时，优先用USDC，其次USDT
                'USDC': ['USDT', 'WPHRS'], // USDC不足时，优先用USDT，其次WPHRS
                'USDT': ['USDC', 'WPHRS']  // USDT不足时，优先用USDC，其次WPHRS
            };
            
            const possibleSources = swapRoutes[targetToken] || [];
            const targetTokenConfig = UNISWAP_V3_CONFIG.tokens[targetToken];
            
            // 寻找最合适的源代币
            for (const sourceToken of possibleSources) {
                const sourceBalance = currentBalances[sourceToken]?.balance;
                if (!sourceBalance) continue;
                
                const sourceTokenConfig = UNISWAP_V3_CONFIG.tokens[sourceToken];
                const minSourceBalance = ethers.utils.parseUnits("1", sourceTokenConfig.decimals);
                
                // 检查源代币余额是否足够
                if (sourceBalance.gt(minSourceBalance)) {
                    // 计算需要的源代币数量
                    const swapAmount = this.calculateSwapAmount(sourceToken, targetToken, deficitAmount, sourceBalance);
                    
                    if (swapAmount && swapAmount.gt(0)) {
                        console.log(`💡 计划: ${ethers.utils.formatUnits(swapAmount, sourceTokenConfig.decimals)} ${sourceToken} -> ${targetToken}`);
                        
                        return {
                            fromToken: sourceToken,
                            toToken: targetToken,
                            amount: swapAmount,
                            targetDeficit: deficitAmount
                        };
                    }
                }
            }
            
            console.log(`⚠️ 无法为 ${targetToken} 创建交换计划，没有合适的源代币`);
            return null;
            
        } catch (error) {
            console.log(`❌ 创建 ${targetToken} 交换计划失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 计算交换所需的源代币数量
     */
    calculateSwapAmount(fromToken, toToken, targetDeficit, sourceBalance) {
        try {
            const fromConfig = UNISWAP_V3_CONFIG.tokens[fromToken];
            const toConfig = UNISWAP_V3_CONFIG.tokens[toToken];
            
            // 更实际的汇率估算 (基于实际市场情况调整)
            const exchangeRates = {
                'WPHRS_to_USDC': 50,    // 1 WPHRS ≈ 50 USDC (更保守的估算)
                'WPHRS_to_USDT': 50,    // 1 WPHRS ≈ 50 USDT
                'USDC_to_WPHRS': 0.02,  // 1 USDC ≈ 0.02 WPHRS (增加20倍)
                'USDT_to_WPHRS': 0.02,  // 1 USDT ≈ 0.02 WPHRS
                'USDC_to_USDT': 1,      // 1 USDC ≈ 1 USDT
                'USDT_to_USDC': 1       // 1 USDT ≈ 1 USDC
            };
            
            const rateKey = `${fromToken}_to_${toToken}`;
            const rate = exchangeRates[rateKey] || 1;
            
            // 计算需要的源代币数量 (增加50%缓冲以确保足够)
            const targetDeficitFormatted = parseFloat(ethers.utils.formatUnits(targetDeficit, toConfig.decimals));
            const requiredSourceAmount = targetDeficitFormatted * rate * 1.5; // 50%缓冲确保成功
            
            console.log(`📊 交换计算详情:`);
            console.log(`   缺少 ${targetDeficitFormatted.toFixed(8)} ${toToken}`);
            console.log(`   汇率: 1 ${fromToken} = ${rate} ${toToken}`);
            console.log(`   需要 ${requiredSourceAmount.toFixed(8)} ${fromToken} (含50%缓冲)`);
            
            const sourceAmountBN = ethers.utils.parseUnits(
                requiredSourceAmount.toFixed(fromConfig.decimals),
                fromConfig.decimals
            );
            
            // 设置最小交换金额
            const minSwapAmount = ethers.utils.parseUnits("1", fromConfig.decimals); // 最少1个源代币
            
            // 确保不超过可用余额的50%，但至少是最小金额
            const maxUsableAmount = sourceBalance.mul(50).div(100); // 改为50%避免过于保守
            let finalAmount;
            
            if (sourceAmountBN.lt(minSwapAmount)) {
                finalAmount = minSwapAmount;
                console.log(`   ⬆️ 调整到最小交换量: ${ethers.utils.formatUnits(finalAmount, fromConfig.decimals)} ${fromToken}`);
            } else if (sourceAmountBN.gt(maxUsableAmount)) {
                finalAmount = maxUsableAmount;
                console.log(`   ⬇️ 调整到最大可用量: ${ethers.utils.formatUnits(finalAmount, fromConfig.decimals)} ${fromToken}`);
            } else {
                finalAmount = sourceAmountBN;
                console.log(`   ✅ 使用计算量: ${ethers.utils.formatUnits(finalAmount, fromConfig.decimals)} ${fromToken}`);
            }
            
            // 确保最终金额不会超过余额
            if (finalAmount.gt(sourceBalance)) {
                finalAmount = sourceBalance.mul(90).div(100); // 使用90%的余额
                console.log(`   🔄 最终调整: ${ethers.utils.formatUnits(finalAmount, fromConfig.decimals)} ${fromToken}`);
            }
            
            return finalAmount;
            
        } catch (error) {
            console.log(`❌ 计算交换数量失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 执行代币交换 (使用现有的swap合约)
     */
    async executeTokenSwap(fromToken, toToken, amount) {
        try {
            console.log(`🔄 执行交换: ${fromToken} -> ${toToken}`);
            
            // 使用系统中已有的swap合约
            const swapContracts = [
                '0x3541423f25a1ca5c98fdbcf478405d3f0aad1164',
                '0x1a4de519154ae51200b0ad7c90f7fac75547888a'
            ];
            
            const contractAddr = swapContracts[0]; // 使用第一个合约
            
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
            
            const contract = new ethers.Contract(contractAddr, multicallABI, this.wallet);
            const tokens = UNISWAP_V3_CONFIG.tokens;
            
            // 检查并授权源代币
            const sourceTokenContract = new ethers.Contract(tokens[fromToken].address, ERC20_ABI, this.wallet);
            const allowance = await sourceTokenContract.allowance(this.wallet.address, contractAddr);
            
            if (allowance.lt(amount)) {
                console.log(`🔓 授权 ${fromToken} 代币...`);
                const approveTx = await sourceTokenContract.approve(contractAddr, ethers.constants.MaxUint256);
                await approveTx.wait();
                console.log(`✅ ${fromToken} 授权完成`);
            }
            
            // 构造swap数据
            const swapData = ethers.utils.defaultAbiCoder.encode(
                ['address', 'address', 'uint24', 'address', 'uint256', 'uint256', 'uint256'],
                [
                    tokens[fromToken].address,
                    tokens[toToken].address,
                    500, // 0.05% 手续费
                    this.wallet.address,
                    amount,
                    0, // amountOutMin (设为0允许滑点)
                    0  // deadline (在multicall中设置)
                ]
            );
            
            const fullData = ethers.utils.concat(["0x04e45aaf", swapData]);
            
            // 执行交换交易
            console.log(`📤 发送交换交易...`);
            const tx = await contract.multicall(
                Math.floor(Date.now() / 1000) + 600, // 10分钟deadline
                [fullData],
                {
                    gasLimit: 500000,
                    gasPrice: 0
                }
            );
            
            console.log(`⏳ 等待交换确认: ${tx.hash}`);
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`✅ 代币交换成功: ${tx.hash.slice(0, 10)}...`);
                return true;
            } else {
                console.log(`❌ 代币交换失败，状态: ${receipt.status}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ 代币交换执行失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 检查代币余额
     */
    async checkTokenBalances() {
        const balances = {};
        
        for (const [symbol, token] of Object.entries(UNISWAP_V3_CONFIG.tokens)) {
            const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
            const balance = await contract.balanceOf(this.wallet.address);
            
            balances[symbol] = {
                balance: balance,
                formatted: ethers.utils.formatUnits(balance, token.decimals),
                sufficient: balance.gt(ethers.utils.parseUnits("0.001", token.decimals))
            };
        }

        return balances;
    }

    /**
     * 选择可用的流动性池（随机选择）
     */
    async selectAvailablePools(balances, maxPools = 5) {
        const availablePools = [];
        
        for (const pool of UNISWAP_V3_CONFIG.liquidityPools) {
            const token0 = UNISWAP_V3_CONFIG.tokens[pool.token0];
            const token1 = UNISWAP_V3_CONFIG.tokens[pool.token1];
            
            const required0 = ethers.utils.parseUnits(pool.baseAmount0.toString(), token0.decimals);
            const required1 = ethers.utils.parseUnits(pool.baseAmount1.toString(), token1.decimals);
            
            const balance0 = balances[pool.token0];
            const balance1 = balances[pool.token1];
            
            if (balance0 && balance1 && 
                balance0.balance.gte(required0) && 
                balance1.balance.gte(required1)) {
                availablePools.push({
                    ...pool,
                    availableAmount0: balance0.balance,
                    availableAmount1: balance1.balance
                });
            }
        }

        if (availablePools.length === 0) return [];

        // 🎲 随机选择池子，而不是固定顺序
        console.log(`🎯 发现 ${availablePools.length} 个可用池，将随机选择最多 ${maxPools} 个`);
        
        // 随机打乱池子顺序
        const shuffledPools = [...availablePools].sort(() => Math.random() - 0.5);
        
        // 随机选择执行的池子数量（3到5个之间，确保有足够的交互）
        const minPools = 3; // 最少3个池
        const targetPools = Math.min(maxPools, shuffledPools.length); // 实际可选的最大数量
        const randomPoolCount = Math.min(
            Math.max(minPools, Math.floor(Math.random() * (targetPools - minPools + 1)) + minPools), 
            shuffledPools.length
        );
        
        const selectedPools = shuffledPools.slice(0, randomPoolCount);
        
        console.log(`🎲 随机选择了 ${selectedPools.length} 个池:`);
        selectedPools.forEach((pool, index) => {
            console.log(`   ${index + 1}. ${pool.token0}/${pool.token1} (fee: ${pool.fee}, weight: ${pool.weight})`);
        });
        
        return selectedPools;
    }

    /**
     * 计算智能余额分配 - 优化多池分配逻辑
     */
    calculateBalanceAllocation(pools, balances) {
        const allocations = [];
        const usedBalances = {};
        
        console.log(`\n📊 开始计算 ${pools.length} 个池的余额分配...`);
        
        // 初始化已使用余额追踪
        for (const symbol of Object.keys(UNISWAP_V3_CONFIG.tokens)) {
            usedBalances[symbol] = ethers.BigNumber.from(0);
        }

        // 按权重排序，优先分配权重高的池子
        const sortedPools = [...pools].sort((a, b) => b.weight - a.weight);
        
        for (let i = 0; i < sortedPools.length; i++) {
            const pool = sortedPools[i];
            const token0 = UNISWAP_V3_CONFIG.tokens[pool.token0];
            const token1 = UNISWAP_V3_CONFIG.tokens[pool.token1];
            
            console.log(`\n🔍 分析池 ${i + 1}/${sortedPools.length}: ${pool.token0}/${pool.token1} (权重: ${pool.weight})`);
            
            // 计算可用余额（减去已分配的）
            const availableBalance0 = balances[pool.token0].balance.sub(usedBalances[pool.token0] || 0);
            const availableBalance1 = balances[pool.token1].balance.sub(usedBalances[pool.token1] || 0);
            
            console.log(`   💰 可用 ${pool.token0}: ${ethers.utils.formatUnits(availableBalance0, token0.decimals)}`);
            console.log(`   💰 可用 ${pool.token1}: ${ethers.utils.formatUnits(availableBalance1, token1.decimals)}`);
            
            // 设置基础分配金额 - 使用更智能的策略
            let finalAmount0, finalAmount1;
            
            // 计算基础金额
            const baseAmount0 = ethers.utils.parseUnits(pool.baseAmount0.toString(), token0.decimals);
            const baseAmount1 = ethers.utils.parseUnits(pool.baseAmount1.toString(), token1.decimals);
            
            // 🎯 智能分配策略：根据剩余池子数量动态调整
            const remainingPools = sortedPools.length - i; // 包括当前池
            const totalPools = sortedPools.length;
            
            // 计算动态分配比例（确保多个池都能分配到资源）
            let allocationRatio;
            if (remainingPools === 1) {
                // 最后一个池子，可以使用更多资源
                allocationRatio = 0.8; // 80%
            } else if (remainingPools <= 3) {
                // 前几个池子，适中分配
                allocationRatio = 0.4 + (0.2 / remainingPools); // 40-60%
            } else {
                // 还有很多池子，保守分配
                allocationRatio = 0.3; // 30%
            }
            
            console.log(`   📊 剩余池子: ${remainingPools}, 分配比例: ${Math.round(allocationRatio * 100)}%`);
            
            // 权重调整：高权重池子可以获得更多资源
            const weightMultiplier = pool.weight >= 3 ? 1.3 : (pool.weight >= 2 ? 1.1 : 1.0);
            
            // 计算最终分配金额
            finalAmount0 = baseAmount0.mul(Math.floor(weightMultiplier * 100)).div(100);
            finalAmount1 = baseAmount1.mul(Math.floor(weightMultiplier * 100)).div(100);
            
            console.log(`   ⚖️ 权重倍数: ${weightMultiplier}x, 基础金额: ${ethers.utils.formatUnits(finalAmount0, token0.decimals)} ${pool.token0}`);
            
            // 限制在动态分配比例内
            const maxAmount0 = availableBalance0.mul(Math.floor(allocationRatio * 100)).div(100);
            const maxAmount1 = availableBalance1.mul(Math.floor(allocationRatio * 100)).div(100);
            
            if (finalAmount0.gt(maxAmount0)) {
                finalAmount0 = maxAmount0;
                console.log(`   ⬇️ ${pool.token0} 调整到分配限制: ${ethers.utils.formatUnits(finalAmount0, token0.decimals)}`);
            }
            
            if (finalAmount1.gt(maxAmount1)) {
                finalAmount1 = maxAmount1;
                console.log(`   ⬇️ ${pool.token1} 调整到分配限制: ${ethers.utils.formatUnits(finalAmount1, token1.decimals)}`);
            }
            
            // 检查是否有足够余额
            if (availableBalance0.gte(finalAmount0) && availableBalance1.gte(finalAmount1)) {
                allocations.push({
                    pool,
                    amount0: finalAmount0,
                    amount1: finalAmount1
                });
                
                // 更新已使用余额
                usedBalances[pool.token0] = (usedBalances[pool.token0] || ethers.BigNumber.from(0)).add(finalAmount0);
                usedBalances[pool.token1] = (usedBalances[pool.token1] || ethers.BigNumber.from(0)).add(finalAmount1);
                
                console.log(`   ✅ 池分配成功: ${ethers.utils.formatUnits(finalAmount0, token0.decimals)} ${pool.token0} + ${ethers.utils.formatUnits(finalAmount1, token1.decimals)} ${pool.token1}`);
            } else {
                console.log(`   ❌ 余额不足，跳过此池`);
                console.log(`      需要: ${ethers.utils.formatUnits(finalAmount0, token0.decimals)} ${pool.token0}, ${ethers.utils.formatUnits(finalAmount1, token1.decimals)} ${pool.token1}`);
                console.log(`      可用: ${ethers.utils.formatUnits(availableBalance0, token0.decimals)} ${pool.token0}, ${ethers.utils.formatUnits(availableBalance1, token1.decimals)} ${pool.token1}`);
            }
        }

        console.log(`\n📋 余额分配完成: 成功分配 ${allocations.length}/${pools.length} 个池`);
        return allocations;
    }

    /**
     * 计算价格范围的tick值 - 使用Full Range
     */
    calculateTicks(pool, currentPrice = null) {
        const tickSpacing = pool.tickSpacing || 10;
        
        // 使用Full Range tick值 - 这是Uniswap V3的最大范围
        // 对于fee=500 (0.05%)，tickSpacing=10
        let tickLower, tickUpper;
        
        if (pool.fee === 500) {
            // 0.05% fee tier - Full Range (tickSpacing=10)
            tickLower = -887270;
            tickUpper = 887270;
        } else if (pool.fee === 100) {
            // 0.01% fee tier - Full Range (tickSpacing=1)  
            tickLower = -887270;
            tickUpper = 887270;
        } else if (pool.fee === 3000) {
            // 0.3% fee tier - Full Range (tickSpacing=60)
            tickLower = -887220; // 确保是60的倍数
            tickUpper = 887220;
        } else if (pool.fee === 10000) {
            // 1% fee tier - Full Range (tickSpacing=200)
            tickLower = -887200; // 确保是200的倍数
            tickUpper = 887200;
        } else {
            // 默认Full Range
            tickLower = -887270;
            tickUpper = 887270;
        }

        // 确保tick值是tickSpacing的倍数
        tickLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
        tickUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

        console.log(`📊 使用Full Range: tickLower=${tickLower}, tickUpper=${tickUpper} (fee=${pool.fee}, spacing=${tickSpacing})`);

        return { tickLower, tickUpper };
    }

    /**
     * 授权代币
     */
    async approveTokens(token0Address, token1Address, amount0, amount1) {
        const approvals = [];
        
        // 授权 token0
        const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, this.wallet);
        const allowance0 = await token0Contract.allowance(this.wallet.address, UNISWAP_V3_CONFIG.positionManager);
        
        if (allowance0.lt(amount0)) {
            console.log(`[授权] 授权 token0: ${token0Address}`);
            const approveTx0 = await token0Contract.approve(
                UNISWAP_V3_CONFIG.positionManager, 
                ethers.constants.MaxUint256
            );
            await approveTx0.wait();
            approvals.push(approveTx0.hash);
            console.log(`[授权] Token0 授权成功: ${approveTx0.hash}`);
        }

        // 授权 token1
        const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, this.wallet);
        const allowance1 = await token1Contract.allowance(this.wallet.address, UNISWAP_V3_CONFIG.positionManager);
        
        if (allowance1.lt(amount1)) {
            console.log(`[授权] 授权 token1: ${token1Address}`);
            const approveTx1 = await token1Contract.approve(
                UNISWAP_V3_CONFIG.positionManager, 
                ethers.constants.MaxUint256
            );
            await approveTx1.wait();
            approvals.push(approveTx1.hash);
            console.log(`[授权] Token1 授权成功: ${approveTx1.hash}`);
        }

        return approvals;
    }

    /**
     * 添加流动性
     */
    async addLiquidity(pool) {
        try {
            console.log(`🏊 开始添加流动性: ${pool.token0}/${pool.token1}`);
            
            const token0 = UNISWAP_V3_CONFIG.tokens[pool.token0];
            const token1 = UNISWAP_V3_CONFIG.tokens[pool.token1];
            
            // 随机化金额 (80%-120%)
            const multiplier0 = 0.8 + Math.random() * 0.4;
            const multiplier1 = 0.8 + Math.random() * 0.4;
            
            const amount0Desired = ethers.utils.parseUnits(
                (pool.baseAmount0 * multiplier0).toFixed(token0.decimals), 
                token0.decimals
            );
            const amount1Desired = ethers.utils.parseUnits(
                (pool.baseAmount1 * multiplier1).toFixed(token1.decimals), 
                token1.decimals
            );

            console.log(`💰 预期添加: ${ethers.utils.formatUnits(amount0Desired, token0.decimals)} ${pool.token0}`);
            console.log(`💰 预期添加: ${ethers.utils.formatUnits(amount1Desired, token1.decimals)} ${pool.token1}`);

            // 计算tick范围
            const { tickLower, tickUpper } = this.calculateTicks(pool);
            console.log(`📊 价格范围: tickLower=${tickLower}, tickUpper=${tickUpper}`);

            // 授权代币
            const approvalTxs = await this.approveTokens(
                token0.address, 
                token1.address, 
                amount0Desired, 
                amount1Desired
            );

            // 确保token地址顺序正确 - token0地址应该小于token1地址
            let finalToken0 = token0.address.toLowerCase() < token1.address.toLowerCase() ? token0.address : token1.address;
            let finalToken1 = token0.address.toLowerCase() < token1.address.toLowerCase() ? token1.address : token0.address;
            let finalAmount0Desired = token0.address.toLowerCase() < token1.address.toLowerCase() ? amount0Desired : amount1Desired;
            let finalAmount1Desired = token0.address.toLowerCase() < token1.address.toLowerCase() ? amount1Desired : amount0Desired;
            
            // 构建mint参数
            const mintParams = {
                token0: finalToken0,
                token1: finalToken1,
                fee: pool.fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: finalAmount0Desired,
                amount1Desired: finalAmount1Desired,
                amount0Min: 0, // 设为0，让Uniswap在Full Range下自动处理比例
                amount1Min: 0, // 设为0，让Uniswap在Full Range下自动处理比例
                recipient: this.wallet.address,
                deadline: Math.floor(Date.now() / 1000) + 600 // 10分钟deadline
            };

            console.log(`🔄 发送流动性添加交易...`);
            
            // 发送mint交易
            const mintTx = await this.positionManager.mint(mintParams, {
                gasLimit: 800000,
                gasPrice: 0  // 使用0 gas price，与网络一致
            });

            console.log(`⏳ 等待交易确认: ${mintTx.hash}`);
            
            // 使用重试机制等待交易确认
            let receipt;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    receipt = await Promise.race([
                        mintTx.wait(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
                        )
                    ]);
                    break; // 成功则跳出循环
                } catch (error) {
                    attempts++;
                    if (error.message.includes('timeout') || error.code === 'TIMEOUT') {
                        console.log(`⚠️ 交易确认超时，重试 ${attempts}/${maxAttempts}...`);
                        if (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒后重试
                            continue;
                        }
                    }
                    throw error; // 非timeout错误或达到最大重试次数则抛出
                }
            }

            if (receipt.status === 1) {
                // 解析事件获取详细信息
                console.log(`🎉 流动性添加成功!`);
                console.log(`📤 交易哈希: ${mintTx.hash}`);
                console.log(`⛽ Gas使用: ${receipt.gasUsed.toString()}`);
                
                return {
                    success: true,
                    txHash: mintTx.hash,
                    gasUsed: receipt.gasUsed.toString(),
                    approvalTxs: approvalTxs,
                    pool: `${pool.token0}/${pool.token1}`,
                    fee: pool.fee,
                    amount0: ethers.utils.formatUnits(amount0Desired, token0.decimals),
                    amount1: ethers.utils.formatUnits(amount1Desired, token1.decimals)
                };
            } else {
                throw new Error(`交易失败，状态: ${receipt.status}`);
            }

        } catch (error) {
            console.log(`❌ 流动性添加失败: ${error.message}`);
            return {
                success: false,
                error: error.message,
                pool: `${pool.token0}/${pool.token1}`
            };
        }
    }

    /**
     * 执行完整的流动性添加流程（支持多个交易对）
     */
    async executeLiquidityAddition(maxPools = null) {
        try {
            console.log(`🚀 开始多池流动性添加操作`);
            console.log(`👛 钱包地址: ${this.wallet.address}`);

            // 检查余额
            console.log(`💰 检查代币余额...`);
            const balances = await this.checkTokenBalances();
            
            for (const [symbol, balance] of Object.entries(balances)) {
                console.log(`   ${symbol}: ${balance.formatted} (充足: ${balance.sufficient ? '✅' : '❌'})`);
            }

            // 获取配置中的最大池数量
            const configMaxPools = maxPools || 3; // 默认最多3个池
            
            // 选择所有可用的流动性池
            let availablePools = await this.selectAvailablePools(balances, configMaxPools);
            
            // 如果没有可用池，尝试全面智能交换
            if (availablePools.length === 0) {
                console.log(`⚠️ 没有可用的流动性池，启动全面智能交换系统...`);
                
                // 计算所有代币的最小需求量（降低要求，确保更多池子可用）
                const minRequiredBalances = {
                    'WPHRS': ethers.utils.parseEther("0.02"),      // 降低到0.02 WPHRS
                    'USDC': ethers.utils.parseUnits("15", 6),      // 保证足够的USDC用于多个池
                    'USDT': ethers.utils.parseUnits("15", 6)       // 保证足够的USDT用于多个池
                };
                
                const swapSuccess = await this.performUniversalIntelligentSwap(balances, minRequiredBalances);
                
                if (swapSuccess) {
                    console.log(`🔄 全面智能交换完成，重新检查可用池...`);
                    
                    // 重新检查余额和可用池
                    const newBalances = await this.checkTokenBalances();
                    for (const [symbol, balance] of Object.entries(newBalances)) {
                        console.log(`   ${symbol}: ${balance.formatted} (充足: ${balance.sufficient ? '✅' : '❌'})`);
                    }
                    
                    availablePools = await this.selectAvailablePools(newBalances, configMaxPools);
                    
                    if (availablePools.length === 0) {
                        throw new Error('全面智能交换后仍没有可用的流动性池');
                    } else {
                        console.log(`🎉 全面智能交换成功！现在有 ${availablePools.length} 个可用池`);
                        // 更新balances为新的余额
                        Object.assign(balances, newBalances);
                    }
                } else {
                    throw new Error('没有可用的流动性池，且全面智能交换失败');
                }
            }

            console.log(`🎯 发现可用流动性池: ${availablePools.length} 个`);

            // 计算余额分配
            const allocations = this.calculateBalanceAllocation(availablePools, balances);
            if (allocations.length === 0) {
                throw new Error('余额分配失败，无法为任何池分配足够的代币');
            }

            console.log(`📊 计划添加 ${allocations.length} 个流动性池:`);
            allocations.forEach((alloc, index) => {
                const token0 = UNISWAP_V3_CONFIG.tokens[alloc.pool.token0];
                const token1 = UNISWAP_V3_CONFIG.tokens[alloc.pool.token1];
                console.log(`   ${index + 1}. ${alloc.pool.token0}/${alloc.pool.token1}: ${ethers.utils.formatUnits(alloc.amount0, token0.decimals)} ${alloc.pool.token0} + ${ethers.utils.formatUnits(alloc.amount1, token1.decimals)} ${alloc.pool.token1}`);
            });

            // 执行所有流动性添加
            const results = [];
            let successCount = 0;
            
            for (let i = 0; i < allocations.length; i++) {
                const allocation = allocations[i];
                console.log(`\n🏊 添加第 ${i + 1}/${allocations.length} 个流动性池: ${allocation.pool.token0}/${allocation.pool.token1}`);
                
                try {
                    const result = await this.addLiquidityWithAllocation(allocation);
                    results.push(result);
                    
                    if (result.success) {
                        successCount++;
                        console.log(`✅ 第 ${i + 1} 个池添加成功`);
                    } else {
                        console.log(`❌ 第 ${i + 1} 个池添加失败: ${result.error}`);
                    }
                    
                    // 在池之间添加延迟
                    if (i < allocations.length - 1) {
                        const delay = 3000 + Math.random() * 2000; // 3-5秒随机延迟
                        console.log(`⏳ 等待 ${Math.round(delay/1000)} 秒后处理下一个池...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                } catch (error) {
                    console.log(`❌ 第 ${i + 1} 个池处理异常: ${error.message}`);
                    results.push({
                        success: false,
                        error: error.message,
                        pool: `${allocation.pool.token0}/${allocation.pool.token1}`
                    });
                }
            }

            // 汇总结果
            console.log(`\n🎉 多池流动性添加完成!`);
            console.log(`📊 总体统计: ${successCount}/${allocations.length} 个池成功`);
            
            const successfulTxs = results.filter(r => r.success).map(r => r.txHash);
            if (successfulTxs.length > 0) {
                console.log(`📤 成功的交易哈希:`);
                successfulTxs.forEach((hash, index) => {
                    console.log(`   ${index + 1}. ${hash}`);
                });
            }
            
            return {
                success: successCount > 0,
                totalPools: allocations.length,
                successfulPools: successCount,
                results: results,
                successfulTxs: successfulTxs
            };

        } catch (error) {
            console.log(`❌ 多池流动性添加操作失败: ${error.message}`);
            return {
                success: false,
                error: error.message,
                totalPools: 0,
                successfulPools: 0
            };
        }
    }

    /**
     * 使用预分配金额添加流动性
     */
    async addLiquidityWithAllocation(allocation) {
        const { pool, amount0, amount1 } = allocation;
        
        try {
            const token0 = UNISWAP_V3_CONFIG.tokens[pool.token0];
            const token1 = UNISWAP_V3_CONFIG.tokens[pool.token1];
            
            console.log(`💰 分配金额: ${ethers.utils.formatUnits(amount0, token0.decimals)} ${pool.token0}`);
            console.log(`💰 分配金额: ${ethers.utils.formatUnits(amount1, token1.decimals)} ${pool.token1}`);

            // 计算tick范围
            const { tickLower, tickUpper } = this.calculateTicks(pool);
            console.log(`📊 价格范围: tickLower=${tickLower}, tickUpper=${tickUpper}`);

            // 授权代币
            const approvalTxs = await this.approveTokens(
                token0.address, 
                token1.address, 
                amount0, 
                amount1
            );

            // 确保token地址顺序正确 (token0 < token1)
            let finalToken0 = token0.address.toLowerCase() < token1.address.toLowerCase() ? token0.address : token1.address;
            let finalToken1 = token0.address.toLowerCase() < token1.address.toLowerCase() ? token1.address : token0.address;
            let finalAmount0Desired = token0.address.toLowerCase() < token1.address.toLowerCase() ? amount0 : amount1;
            let finalAmount1Desired = token0.address.toLowerCase() < token1.address.toLowerCase() ? amount1 : amount0;
            
            // 构建mint参数
            const mintParams = {
                token0: finalToken0,
                token1: finalToken1,
                fee: pool.fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: finalAmount0Desired,
                amount1Desired: finalAmount1Desired,
                amount0Min: 0, // 设为0，让Uniswap在Full Range下自动处理比例
                amount1Min: 0, // 设为0，让Uniswap在Full Range下自动处理比例
                recipient: this.wallet.address,
                deadline: Math.floor(Date.now() / 1000) + 600 // 10分钟deadline
            };

            console.log(`🔄 发送流动性添加交易...`);
            
            // 发送mint交易
            const mintTx = await this.positionManager.mint(mintParams, {
                gasLimit: 800000,
                gasPrice: 0  // 使用0 gas price，与网络一致
            });

            console.log(`⏳ 等待交易确认: ${mintTx.hash}`);
            
            // 使用重试机制等待交易确认
            let receipt;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    receipt = await Promise.race([
                        mintTx.wait(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
                        )
                    ]);
                    break; // 成功则跳出循环
                } catch (error) {
                    attempts++;
                    if (error.message.includes('timeout') || error.code === 'TIMEOUT') {
                        console.log(`⚠️ 交易确认超时，重试 ${attempts}/${maxAttempts}...`);
                        if (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒后重试
                            continue;
                        }
                    }
                    throw error; // 非timeout错误或达到最大重试次数则抛出
                }
            }

            if (receipt.status === 1) {
                console.log(`🎉 流动性添加成功!`);
                console.log(`📤 交易哈希: ${mintTx.hash}`);
                console.log(`⛽ Gas使用: ${receipt.gasUsed.toString()}`);
                
                return {
                    success: true,
                    txHash: mintTx.hash,
                    gasUsed: receipt.gasUsed.toString(),
                    approvalTxs: approvalTxs,
                    pool: `${pool.token0}/${pool.token1}`,
                    fee: pool.fee,
                    amount0: ethers.utils.formatUnits(amount0, token0.decimals),
                    amount1: ethers.utils.formatUnits(amount1, token1.decimals)
                };
            } else {
                throw new Error(`交易失败，状态: ${receipt.status}`);
            }

        } catch (error) {
            console.log(`❌ 流动性添加失败: ${error.message}`);
            return {
                success: false,
                error: error.message,
                pool: `${pool.token0}/${pool.token1}`
            };
        }
    }
}

/**
 * 便捷函数：执行流动性添加
 */
async function executeLiquidityAddition(wallet, provider, maxPools = 3) {
    const liquidityProvider = new LiquidityProvider(wallet, provider);
    return await liquidityProvider.executeLiquidityAddition(maxPools);
}

module.exports = {
    LiquidityProvider,
    executeLiquidityAddition,
    UNISWAP_V3_CONFIG,
    POSITION_MANAGER_ABI
};