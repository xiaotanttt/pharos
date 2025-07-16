/**
 * 自动重启包装器 - 实现无人值守运行
 * 当程序崩溃时自动重启，确保24/7不间断运行
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    scriptPath: 'production_main.js',
    maxRestarts: 10, // 最大重启次数（防止无限重启）
    restartDelay: 30000, // 重启延迟（毫秒）
    logFile: 'auto_restart.log',
    healthCheckInterval: 300000, // 5分钟健康检查
    maxLogSize: 10 * 1024 * 1024 // 10MB日志轮转
};

class AutoRestarter {
    constructor() {
        this.restartCount = 0;
        this.childProcess = null;
        this.isShuttingDown = false;
        this.lastStartTime = null;
        this.setupSignalHandlers();
        this.logMessage('🚀 Auto Restarter 启动', 'INFO');
    }

    logMessage(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\\n`;
        
        console.log(`${this.getColorCode(level)}${logEntry.trim()}\\x1b[0m`);
        
        // 写入日志文件
        try {
            // 检查日志文件大小，必要时轮转
            if (fs.existsSync(CONFIG.logFile)) {
                const stats = fs.statSync(CONFIG.logFile);
                if (stats.size > CONFIG.maxLogSize) {
                    fs.renameSync(CONFIG.logFile, `${CONFIG.logFile}.old`);
                }
            }
            
            fs.appendFileSync(CONFIG.logFile, logEntry);
        } catch (error) {
            console.error('写入日志失败:', error.message);
        }
    }

    getColorCode(level) {
        switch (level) {
            case 'ERROR': return '\\x1b[31m'; // 红色
            case 'WARN': return '\\x1b[33m';  // 黄色
            case 'SUCCESS': return '\\x1b[32m'; // 绿色
            case 'INFO': return '\\x1b[36m';  // 青色
            default: return '\\x1b[37m';      // 白色
        }
    }

    async startProcess() {
        if (this.isShuttingDown) return;

        this.lastStartTime = Date.now();
        this.logMessage(`🔄 启动程序 (第 ${this.restartCount + 1} 次)`, 'INFO');

        try {
            this.childProcess = spawn('node', [CONFIG.scriptPath], {
                cwd: process.cwd(),
                stdio: ['inherit', 'inherit', 'inherit'],
                env: { ...process.env }
            });

            // 监听进程事件
            this.childProcess.on('error', (error) => {
                this.logMessage(`❌ 进程启动失败: ${error.message}`, 'ERROR');
                this.handleProcessExit(1);
            });

            this.childProcess.on('exit', (code, signal) => {
                this.logMessage(`⚠️ 进程退出 (code: ${code}, signal: ${signal})`, 'WARN');
                this.handleProcessExit(code);
            });

            this.logMessage(`✅ 进程启动成功 (PID: ${this.childProcess.pid})`, 'SUCCESS');

        } catch (error) {
            this.logMessage(`❌ 启动进程异常: ${error.message}`, 'ERROR');
            this.handleProcessExit(1);
        }
    }

    async handleProcessExit(exitCode) {
        if (this.isShuttingDown) return;

        this.childProcess = null;
        const runTime = Date.now() - this.lastStartTime;
        
        this.logMessage(`📊 程序运行时间: ${Math.round(runTime / 1000)} 秒`, 'INFO');

        // 检查是否应该重启
        if (this.shouldRestart(exitCode, runTime)) {
            this.restartCount++;
            this.logMessage(`⏳ ${CONFIG.restartDelay / 1000} 秒后重启...`, 'INFO');
            
            setTimeout(() => {
                this.startProcess();
            }, CONFIG.restartDelay);
        } else {
            this.logMessage(`🛑 达到最大重启次数或其他条件，停止重启`, 'ERROR');
            process.exit(1);
        }
    }

    shouldRestart(exitCode, runTime) {
        // 检查重启次数
        if (this.restartCount >= CONFIG.maxRestarts) {
            this.logMessage(`🚫 已达到最大重启次数 (${CONFIG.maxRestarts})`, 'WARN');
            return false;
        }

        // 如果程序运行时间太短，可能是配置错误
        if (runTime < 30000) { // 少于30秒
            this.logMessage(`⚠️ 程序运行时间过短 (${runTime}ms)，可能存在配置问题`, 'WARN');
        }

        // 正常退出不重启
        if (exitCode === 0) {
            this.logMessage(`✅ 程序正常退出，不重启`, 'INFO');
            return false;
        }

        return true;
    }

    setupSignalHandlers() {
        // 优雅关闭
        ['SIGINT', 'SIGTERM'].forEach(signal => {
            process.on(signal, () => {
                this.logMessage(`📡 收到 ${signal} 信号，开始优雅关闭...`, 'INFO');
                this.shutdown();
            });
        });

        // 捕获未处理的异常
        process.on('uncaughtException', (error) => {
            this.logMessage(`💥 未捕获异常: ${error.message}`, 'ERROR');
            this.logMessage(`Stack: ${error.stack}`, 'ERROR');
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logMessage(`💥 未处理的Promise拒绝: ${reason}`, 'ERROR');
        });
    }

    async shutdown() {
        this.isShuttingDown = true;
        this.logMessage(`🔄 正在关闭 Auto Restarter...`, 'INFO');

        if (this.childProcess) {
            this.logMessage(`🛑 终止子进程 (PID: ${this.childProcess.pid})`, 'INFO');
            
            // 先尝试优雅关闭
            this.childProcess.kill('SIGTERM');
            
            // 5秒后强制杀死
            setTimeout(() => {
                if (this.childProcess && !this.childProcess.killed) {
                    this.logMessage(`💀 强制终止子进程`, 'WARN');
                    this.childProcess.kill('SIGKILL');
                }
            }, 5000);
        }

        setTimeout(() => {
            this.logMessage(`👋 Auto Restarter 已关闭`, 'INFO');
            process.exit(0);
        }, 6000);
    }

    // 健康检查（可选功能）
    startHealthCheck() {
        setInterval(() => {
            if (this.childProcess && this.childProcess.pid) {
                this.logMessage(`💓 健康检查: 程序运行正常 (PID: ${this.childProcess.pid})`, 'INFO');
            } else if (!this.isShuttingDown) {
                this.logMessage(`⚠️ 健康检查: 程序未运行`, 'WARN');
            }
        }, CONFIG.healthCheckInterval);
    }

    // 显示统计信息
    showStats() {
        const uptime = process.uptime();
        this.logMessage(`📊 Auto Restarter 统计:`, 'INFO');
        this.logMessage(`   运行时间: ${Math.round(uptime)} 秒`, 'INFO');
        this.logMessage(`   重启次数: ${this.restartCount}`, 'INFO');
        this.logMessage(`   当前状态: ${this.childProcess ? '运行中' : '未运行'}`, 'INFO');
    }
}

// 主函数
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                     🔄 Pharos Auto Restarter v1.0                          ║
║                                                                              ║
║                    🛡️ 无人值守自动重启系统                                  ║
║                    📊 智能错误处理与监控                                     ║
║                    💪 确保24/7不间断运行                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `);

    const restarter = new AutoRestarter();
    
    // 启动健康检查
    restarter.startHealthCheck();
    
    // 定期显示统计信息
    setInterval(() => {
        restarter.showStats();
    }, 600000); // 每10分钟

    // 启动主程序
    await restarter.startProcess();
}

// 检查脚本是否存在
if (!fs.existsSync(CONFIG.scriptPath)) {
    console.error(`❌ 脚本文件不存在: ${CONFIG.scriptPath}`);
    process.exit(1);
}

main().catch(error => {
    console.error(`❌ Auto Restarter 启动失败:`, error);
    process.exit(1);
});