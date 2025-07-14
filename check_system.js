/**
 * 系统状态检查脚本
 * 检查系统配置和运行环境
 */

const fs = require('fs');
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

function checkFile(filename, required = true) {
    const exists = fs.existsSync(filename);
    const status = exists ? `${colors.green}✅` : (required ? `${colors.red}❌` : `${colors.yellow}⚠️`);
    const message = exists ? '存在' : (required ? '缺失 (必需)' : '缺失 (可选)');
    
    console.log(`${status} ${filename}: ${message}${colors.reset}`);
    
    if (exists) {
        try {
            const content = fs.readFileSync(filename, 'utf8');
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            console.log(`   📊 包含 ${lines.length} 行数据`);
        } catch (error) {
            console.log(`   ${colors.red}⚠️ 读取文件失败: ${error.message}${colors.reset}`);
        }
    }
    
    return exists;
}

function checkNodeModules() {
    const exists = fs.existsSync('node_modules');
    const status = exists ? `${colors.green}✅` : `${colors.red}❌`;
    const message = exists ? '已安装' : '未安装';
    
    console.log(`${status} node_modules: ${message}${colors.reset}`);
    
    if (!exists) {
        console.log(`   ${colors.yellow}💡 运行 'npm install' 安装依赖${colors.reset}`);
    }
    
    return exists;
}

function checkConfiguration() {
    console.log(`\n${colors.cyan}${colors.bold}📊 当前配置状态:${colors.reset}`);
    printCurrentConfig();
    
    const enabledFeatures = getEnabledFeatures();
    const cyclableFeatures = getCyclableFeatures();
    const onceOnlyFeatures = getOnceOnlyFeatures();
    
    console.log(`\n${colors.cyan}📋 功能统计:${colors.reset}`);
    console.log(`总启用功能: ${enabledFeatures.length} 个`);
    console.log(`循环功能: ${cyclableFeatures.length} 个`);
    console.log(`单次功能: ${onceOnlyFeatures.length} 个`);
    
    if (enabledFeatures.length === 0) {
        console.log(`${colors.red}⚠️ 警告: 没有启用任何功能！${colors.reset}`);
        console.log(`${colors.yellow}💡 运行 'node config_manager.js' 配置系统${colors.reset}`);
        return false;
    }
    
    return true;
}

function showSystemRequirements() {
    console.log(`\n${colors.cyan}${colors.bold}📋 系统要求检查:${colors.reset}`);
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    console.log(`${colors.green}✅ Node.js: ${nodeVersion}${colors.reset}`);
    
    // 检查内存使用
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    console.log(`${colors.green}✅ 内存使用: ${memMB} MB${colors.reset}`);
    
    // 检查平台
    console.log(`${colors.green}✅ 运行平台: ${process.platform} ${process.arch}${colors.reset}`);
}

function showRecommendations() {
    console.log(`\n${colors.cyan}${colors.bold}💡 使用建议:${colors.reset}`);
    
    const enabledFeatures = getEnabledFeatures();
    
    if (enabledFeatures.length === 0) {
        console.log(`${colors.yellow}1. 运行配置管理器选择运行模式: node config_manager.js${colors.reset}`);
    }
    
    if (!fs.existsSync('pk.txt')) {
        console.log(`${colors.yellow}2. 创建私钥文件: cp pk.txt.example pk.txt 然后编辑${colors.reset}`);
    }
    
    if (!fs.existsSync('proxies.txt')) {
        console.log(`${colors.yellow}3. 创建代理文件 (可选): cp proxies.txt.example proxies.txt 然后编辑${colors.reset}`);
    }
    
    console.log(`${colors.green}4. 启动系统: node production_main.js${colors.reset}`);
    console.log(`${colors.green}5. 或使用快速启动: ./start.sh${colors.reset}`);
}

function main() {
    console.log(`${colors.cyan}${colors.bold}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ██╗  ██╗████████╗ █████╗ ███╗   ██╗    ██████╗ ██╗   ██╗         ║
║  ██╔═████╗╚██╗██╔╝╚══██╔══╝██╔══██╗████╗  ██║   ██╔═══██╗██║   ██║         ║
║  ██║██╔██║ ╚███╔╝    ██║   ███████║██╔██╗ ██║   ██║   ██║██║   ██║         ║
║  ████╔╝██║ ██╔██╗    ██║   ██╔══██║██║╚██╗██║   ██║▄▄ ██║██║   ██║         ║
║  ╚██████╔╝██╔╝ ██╗   ██║   ██║  ██║██║ ╚████║   ╚██████╔╝╚██████╔╝         ║
║   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══▀▀═╝  ╚═════╝          ║
║                                                                              ║
║                    系统状态检查工具 v2.0.0                                  ║
║                                                                              ║
║                    🧠 智能增强Swap策略 | 🔍 系统状态检查                     ║
║                    🌐 环境检测支持     | 🛡️ 完善错误处理                     ║
║                                                                              ║
║                    作者: 0xTAN                                               ║
║                    推特: https://X.com/cgyJ9WZV29saahQ                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    console.log(`\n${colors.cyan}${colors.bold}📁 文件检查:${colors.reset}`);
    const pkExists = checkFile('pk.txt', true);
    const proxyExists = checkFile('proxies.txt', false);
    const nodeModulesExists = checkNodeModules();
    
    console.log(`\n${colors.cyan}${colors.bold}📦 示例文件:${colors.reset}`);
    checkFile('pk.txt.example', false);
    checkFile('proxies.txt.example', false);
    
    const configValid = checkConfiguration();
    
    showSystemRequirements();
    
    console.log(`\n${colors.cyan}${colors.bold}📊 系统就绪状态:${colors.reset}`);
    
    const allReady = pkExists && nodeModulesExists && configValid;
    
    if (allReady) {
        console.log(`${colors.green}${colors.bold}🎉 系统已就绪，可以启动！${colors.reset}`);
        console.log(`${colors.green}运行命令: node production_main.js${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ 系统未就绪，请完成以下步骤:${colors.reset}`);
        
        if (!nodeModulesExists) {
            console.log(`${colors.yellow}  - 安装依赖: npm install${colors.reset}`);
        }
        if (!pkExists) {
            console.log(`${colors.yellow}  - 创建私钥文件: cp pk.txt.example pk.txt 并编辑${colors.reset}`);
        }
        if (!configValid) {
            console.log(`${colors.yellow}  - 配置系统: node config_manager.js${colors.reset}`);
        }
    }
    
    showRecommendations();
}

if (require.main === module) {
    main();
}

module.exports = { main };
