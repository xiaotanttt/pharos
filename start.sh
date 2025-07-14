#!/bin/bash

# Pharos 生产系统快速启动脚本

echo "🚀 Pharos 生产自动化系统启动脚本"
echo "=================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查私钥文件
if [ ! -f "pk.txt" ]; then
    echo "⚠️  私钥文件 pk.txt 不存在"
    echo "📝 请创建 pk.txt 文件并添加私钥，参考 pk.txt.example"
    echo "💡 或者运行: cp pk.txt.example pk.txt 然后编辑"
    exit 1
fi

# 检查配置
echo "⚙️  检查系统配置..."

# 提供选择菜单
echo ""
echo "请选择操作:"
echo "1. 配置系统 (推荐首次使用)"
echo "2. 直接启动系统"
echo "3. 查看帮助"
echo ""

read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo "🎯 启动配置管理器..."
        node config_manager.js
        echo ""
        echo "✅ 配置完成！现在启动系统..."
        node production_main.js
        ;;
    2)
        echo "🚀 直接启动系统..."
        node production_main.js
        ;;
    3)
        echo "📖 显示帮助信息..."
        node production_main.js --help
        ;;
    *)
        echo "❌ 无效选择，退出"
        exit 1
        ;;
esac
