#!/usr/bin/env node

/**
 * Pharos 配置助手
 * 提供便捷的配置管理工具
 */

const config = require('./production_config.js');

// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
    console.log(`
🎯 Pharos 配置助手

用法: node config_helper.js <命令> [选项]

命令:
  list-presets        列出所有预设配置
  apply <preset>      应用预设配置
  show-current        显示当前配置状态
  set-wallet-limit <number>  设置钱包数量限制 (0=无限制)
  enable-all          启用所有功能
  disable-all         禁用所有功能
  
预设配置:
  FULL_AUTO          全功能自动化 (推荐)
  TRADING_ONLY       交易专用模式
  DOMAIN_ONLY        域名专用模式
  NFT_ONLY           NFT专用模式
  BASIC_ONLY         基础功能模式
  TEST_MODE          测试模式
  ENHANCED_SWAP_TEST 增强Swap测试
  LIQUIDITY_TEST     流动性测试
  LIQUIDITY_INTENSIVE 流动性密集模式
  TURBO_FULL         TURBO全功能模式
  TURBO_SPEED        TURBO极速模式

示例:
  node config_helper.js apply FULL_AUTO
  node config_helper.js FULL_AUTO          # 快捷方式
  node config_helper.js domain_only        # 大小写不敏感
  node config_helper.js set-wallet-limit 0
  node config_helper.js show-current
    `);
}

function listPresets() {
    console.log('\n📋 可用的配置预设:\n');
    Object.entries(config.CONFIG_PRESETS).forEach(([key, preset]) => {
        console.log(`🔧 ${key}:`);
        console.log(`   名称: ${preset.name}`);
        console.log(`   描述: ${preset.description}`);
        console.log(`   钱包限制: ${preset.wallet.maxWallets === 0 ? '无限制' : preset.wallet.maxWallets + '个'}`);
        console.log(`   循环模式: ${preset.loop.enabled ? '是' : '否'}`);
        console.log('');
    });
}

function applyPreset(presetName) {
    if (!presetName) {
        console.log('❌ 请指定预设名称');
        return;
    }
    
    const upperPreset = presetName.toUpperCase();
    if (!config.CONFIG_PRESETS[upperPreset]) {
        console.log(`❌ 未找到预设: ${presetName}`);
        console.log('可用预设:', Object.keys(config.CONFIG_PRESETS).join(', '));
        return;
    }
    
    try {
        config.applyConfigPreset(upperPreset);
        console.log('\n✅ 配置已成功应用！');
        console.log('💡 现在可以运行: node production_main.js');
    } catch (error) {
        console.log(`❌ 应用配置失败: ${error.message}`);
    }
}

function setWalletLimit(limit) {
    const num = parseInt(limit);
    if (isNaN(num) || num < 0) {
        console.log('❌ 请提供有效的数字 (0表示无限制)');
        return;
    }
    
    config.setWalletLimit(num);
}

function main() {
    switch (command) {
        case 'list-presets':
            listPresets();
            break;
        case 'apply':
            applyPreset(args[1]);
            break;
        case 'show-current':
            config.printCurrentConfig();
            break;
        case 'set-wallet-limit':
            setWalletLimit(args[1]);
            break;
        case 'enable-all':
            config.enableAllFeatures();
            break;
        case 'disable-all':
            config.disableAllFeatures();
            break;
        case 'help':
        case '-h':
        case '--help':
            showHelp();
            break;
        default:
            if (!command) {
                showHelp();
            } else {
                // 检查是否是预设名称的快捷命令
                const upperCommand = command.toUpperCase();
                if (config.CONFIG_PRESETS[upperCommand]) {
                    console.log(`💡 检测到预设名称，自动应用配置: ${upperCommand}`);
                    applyPreset(upperCommand);
                } else {
                    console.log(`❌ 未知命令: ${command}`);
                    console.log(`💡 提示: 如果想应用配置，请使用: node config_helper.js apply ${command}`);
                    console.log(`💡 或者直接使用: node config_helper.js ${command.toUpperCase()}`);
                    showHelp();
                }
            }
    }
}

main();