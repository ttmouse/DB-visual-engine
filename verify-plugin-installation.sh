#!/bin/bash

echo "=== Model Rotator 插件安装验证 ==="
echo ""

# 检查插件目录
PLUGIN_DIR="$HOME/.config/alma/plugins/model-rotator"
echo "1. 检查插件目录: $PLUGIN_DIR"
if [ -d "$PLUGIN_DIR" ]; then
    echo "   ✅ 插件目录存在"
else
    echo "   ❌ 插件目录不存在"
    exit 1
fi

echo ""
echo "2. 检查必需文件:"
REQUIRED_FILES=("manifest.json" "main.ts" "main.js")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$PLUGIN_DIR/$file" ]; then
        echo "   ✅ $file 存在"
    else
        echo "   ❌ $file 不存在"
    fi
done

echo ""
echo "3. 检查 manifest.json 配置:"
if grep -q '"main": "main.ts"' "$PLUGIN_DIR/manifest.json"; then
    echo "   ✅ main 字段正确配置为 main.ts"
else
    echo "   ❌ main 字段配置错误"
    grep '"main"' "$PLUGIN_DIR/manifest.json"
fi

echo ""
echo "4. 检查文件权限:"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$PLUGIN_DIR/$file" ]; then
        perms=$(stat -f "%Sp" "$PLUGIN_DIR/$file")
        echo "   $file: $perms"
    fi
done

echo ""
echo "5. 检查插件类型:"
if grep -q '"type": "provider"' "$PLUGIN_DIR/manifest.json"; then
    echo "   ✅ 插件类型正确设置为 provider"
else
    echo "   ❌ 插件类型设置错误"
fi

echo ""
echo "6. 与其他插件对比:"
echo "   已安装的插件:"
ls -1 "$HOME/.config/alma/plugins/" | while read plugin; do
    if [ -f "$HOME/.config/alma/plugins/$plugin/manifest.json" ]; then
        main_file=$(grep '"main"' "$HOME/.config/alma/plugins/$plugin/manifest.json" | head -1 | cut -d'"' -f4)
        echo "   - $plugin: main = $main_file"
    fi
done

echo ""
echo "=== 验证完成 ==="
echo ""
echo "下一步操作:"
echo "1. 重启 Alma 应用"
echo "2. 打开 Alma 设置 > 插件"
echo "3. 检查 'Model Rotator' 插件是否显示"
echo "4. 如果插件未显示，检查 Alma 开发者控制台错误日志"