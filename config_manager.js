/**
 * 配置管理器 - 用于切换不同的配置预设
 */

const { 
    CONFIG_PRESETS, 
    applyConfigPreset, 
    printCurrentConfig,
    CURRENT_CONFIG 
} = require('./production_config');

const colors = {
    reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m',
    yellow: '\x1b[33m', red: '\x1b[31m', white: '\x1b[37m', bold: '\x1b[1m',
};

function showBanner() {
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
║                    Pharos 配置管理器 v2.0.0                                 ║
║                                                                              ║
║                    🧠 智能增强Swap策略 | ⚙️ 灵活配置管理                     ║
║                    🎯 快速切换运行模式 | 🛡️ 完善错误处理                     ║
║                                                                              ║
║                    作者: 0xTAN                                               ║
║                    推特: https://X.com/cgyJ9WZV29saahQ                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `;
    
    console.log(`${colors.cyan}${colors.bold}${banner}${colors.reset}`);
}

function listPresets() {
    console.log("📋 可用的配置预设:\n");
    
    Object.entries(CONFIG_PRESETS).forEach(([key, preset], index) => {
        const current = CURRENT_CONFIG.preset === key ? `${colors.green}👉 [当前]` : "   ";
        console.log(`${current} ${colors.bold}${index + 1}. ${key}${colors.reset}`);
        console.log(`     ${colors.cyan}名称:${colors.reset} ${preset.name}`);
        console.log(`     ${colors.cyan}描述:${colors.reset} ${preset.description}`);
        
        // 显示启用的功能
        const enabledFeatures = Object.entries(preset.features)
            .filter(([_, enabled]) => enabled)
            .map(([feature, _]) => feature);
        console.log(`     ${colors.cyan}功能:${colors.reset} ${enabledFeatures.join(', ')}`);
        
        // 显示循环设置
        const loopInfo = preset.loop.enabled ? 
            `每${preset.loop.waitMinutes}分钟循环` : '单次运行';
        console.log(`     ${colors.cyan}模式:${colors.reset} ${loopInfo}`);
        console.log();
    });
}

function selectPreset() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('\n请选择配置预设 (输入数字或名称): ', (answer) => {
            rl.close();
            
            const presetKeys = Object.keys(CONFIG_PRESETS);
            let selectedPreset = null;
            
            // 检查是否是数字选择
            const num = parseInt(answer);
            if (!isNaN(num) && num >= 1 && num <= presetKeys.length) {
                selectedPreset = presetKeys[num - 1];
            } else {
                // 检查是否是名称选择
                selectedPreset = presetKeys.find(key => 
                    key.toLowerCase() === answer.toLowerCase()
                );
            }
            
            if (selectedPreset) {
                try {
                    applyConfigPreset(selectedPreset);
                    console.log(`\n${colors.green}✅ 配置预设已成功应用！${colors.reset}`);
                    resolve(selectedPreset);
                } catch (error) {
                    console.log(`\n${colors.red}❌ 应用配置失败: ${error.message}${colors.reset}`);
                    resolve(null);
                }
            } else {
                console.log(`\n${colors.red}❌ 无效的选择: ${answer}${colors.reset}`);
                resolve(null);
            }
        });
    });
}

async function main() {
    showBanner();
    
    // 显示当前配置
    console.log(`${colors.yellow}📊 当前配置状态:${colors.reset}`);
    printCurrentConfig();
    console.log();
    
    // 列出所有预设
    listPresets();
    
    // 选择新预设
    const selected = await selectPreset();
    
    if (selected) {
        console.log(`\n${colors.green}🚀 配置完成！现在可以运行以下命令启动系统:${colors.reset}`);
        console.log(`${colors.cyan}   node production_main.js${colors.reset}`);
        console.log();
        console.log(`${colors.yellow}💡 提示: 确保已准备好以下文件:${colors.reset}`);
        console.log(`   - pk.txt (私钥文件)`);
        console.log(`   - proxies.txt (代理文件，可选)`);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    showBanner,
    listPresets,
    selectPreset
};
