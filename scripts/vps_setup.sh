#!/bin/bash
# 香港VPS自动更新配置脚本
# 在服务器上运行此脚本，设置每天自动从GitHub拉取最新代码
# 用法: bash vps_setup.sh

set -e

REPO_DIR="/var/www/html"
REPO_URL="https://github.com/Rui1114/test-web.git"

echo "=== 政策化债追踪工作台 VPS自动更新配置 ==="

# 1. 检查目录是否是git仓库
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "初始化git仓库..."
  git clone "$REPO_URL" "$REPO_DIR"
else
  echo "检测到已有git仓库: $REPO_DIR"
fi

# 2. 创建自动拉取脚本
cat > /usr/local/bin/update-policy-web.sh << 'PULLSCRIPT'
#!/bin/bash
cd /var/www/html
git fetch origin main 2>&1
git reset --hard origin/main 2>&1
echo "$(TZ=Asia/Shanghai date '+%Y-%m-%d %H:%M') 更新完成" >> /var/log/policy-web-update.log
PULLSCRIPT

chmod +x /usr/local/bin/update-policy-web.sh

# 3. 配置cron定时任务（每天08:35北京时间 = 00:35 UTC 拉取）
CRON_JOB="35 0 * * * /usr/local/bin/update-policy-web.sh"
( crontab -l 2>/dev/null | grep -v "update-policy-web"; echo "$CRON_JOB" ) | crontab -

echo "✅ 定时拉取任务已配置: 每天08:35 北京时间 自动从GitHub拉取"
echo ""
echo "手动触发测试: /usr/local/bin/update-policy-web.sh"
echo "查看更新日志: tail -f /var/log/policy-web-update.log"
echo ""
echo "GitHub Actions推送后约5分钟内VPS自动同步"

# 4. 提示GitHub Secrets配置（可选SSH部署，更快）
echo ""
echo "=== 可选：配置GitHub Actions直接SSH部署（更快，推送即时同步）==="
echo "在 GitHub → Settings → Secrets → Actions 中添加："
echo "  VPS_HOST    = 服务器IP地址"
echo "  VPS_USER    = SSH用户名（通常 ubuntu 或 root）"
echo "  VPS_SSH_KEY = SSH私钥内容（cat ~/.ssh/id_rsa）"
