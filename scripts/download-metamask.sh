#!/bin/bash
VERSION="${1:-12.8.1}"
TARGET_DIR="extensions/metamask"
URL="https://github.com/MetaMask/metamask-extension/releases/download/v${VERSION}/metamask-chrome-${VERSION}.zip"

echo "📦 正在下载 MetaMask v${VERSION}..."
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

curl -L --fail -o /tmp/metamask.zip "$URL"
if [ $? -ne 0 ]; then
  echo "❌ 下载失败，请检查版本号或网络连接"
  echo "   可用版本查看: https://github.com/MetaMask/metamask-extension/releases"
  exit 1
fi

unzip -o /tmp/metamask.zip -d "$TARGET_DIR"
rm /tmp/metamask.zip

if [ -f "$TARGET_DIR/manifest.json" ]; then
  echo "✅ MetaMask v${VERSION} 已安装到 ${TARGET_DIR}/"
else
  echo "❌ 安装异常，未找到 manifest.json"
  exit 1
fi
