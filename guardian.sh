#!/bin/bash
# AI 社区 Guardian - 每 30 分钟检测一次
# 1. 检测 Tunnel 地址变化
# 2. 检测新帖 FAQ 自动回复
# 3. 检测新人欢迎

cd /home/lwt/ai-community

LOG="/tmp/guardian.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

check_port() {
  ss -tlnp | grep -q ":$1 "
}

start_all() {
  if ! check_port 3210; then
    log "Express API 挂了，重启中..."
    systemctl --user restart ai-community.service
    sleep 2
  fi
  
  if ! check_port 3211; then
    log "Proxy 挂了，重启中..."
    systemctl --user restart ai-community-proxy.service
    sleep 2
  fi
  
  if ! check_port 3000; then
    log "Next.js 挂了，重启中..."
    systemctl --user restart ai-community-frontend.service
    sleep 3
  fi
  
  if ! pgrep -f "cloudflared tunnel" > /dev/null; then
    log "Cloudflare Tunnel 挂了，重启中..."
    systemctl --user restart ai-community-tunnel.service
    sleep 5
    TUNNEL_URL=$(grep -o "https://[a-z-]*\.trycloudflare\.com" /tmp/tunnel.log 2>/dev/null | tail -1)
    if [ -n "$TUNNEL_URL" ]; then
      cd /home/lwt/hermes-discovery
      echo "{\"url\":\"$TUNNEL_URL\"}" > discovery.json
      git add -A && git commit -m "auto: tunnel $(date +%H:%M)" && \
        GIT_SSH_COMMAND="ssh -i /home/lwt/.ssh/id_ed25519_org" git push origin main 2>/dev/null
      cd /home/lwt/ai-community
      log "Tunnel 地址更新: $TUNNEL_URL"
    fi
  fi
}

run_tasks() {
  log "执行定时任务..."
  
  # 验证 Tunnel 地址是否匹配（即使 Tunnel 正常运行）
  verify_tunnel_url
  
  # 前沿请求采集（每 3 天一次）
  if [ $((RANDOM % 72)) -eq 0 ]; then
    log "采集前沿文献请求..."
    node /home/lwt/ai-community/scripts/frontier-request.js 2>/dev/null || log "frontier-request 执行失败"
  fi
  
  # 数据库备份
  if [ -f "scripts/backup.sh" ]; then
    bash scripts/backup.sh 2>/dev/null || log "备份执行失败"
  fi
  
  # FAQ 自动回复
  if [ -f "scripts/auto-reply.js" ]; then
    node scripts/auto-reply.js 2>/dev/null || log "auto-reply 执行失败"
  fi
  
  # 新人欢迎（检测是否有 member_id > 上次已知的最大值）
  # 略——可通过 SQLite 查询比对
}

verify_tunnel_url() {
  # 获取当前 Tunnel 实际地址
  CURRENT_URL=$(journalctl --user -u ai-community-tunnel.service --since "5 minutes ago" 2>/dev/null | grep -o "https://[a-z-]*\\.trycloudflare\\.com" | head -1)
  
  if [ -z "$CURRENT_URL" ]; then
    log "⚠️ 无法获取当前 Tunnel 地址，跳过验证"
    return
  fi
  
  # 读取已存储的地址
  if [ -f "/home/lwt/hermes-discovery/discovery.json" ]; then
    STORED_URL=$(cat /home/lwt/hermes-discovery/discovery.json | grep -o "https://[a-z-]*\\.trycloudflare\\.com" | head -1)
  else
    STORED_URL=""
  fi
  
  # 比对并更新
  if [ "$CURRENT_URL" != "$STORED_URL" ]; then
    log "⚠️ Tunnel 地址不匹配：当前=$CURRENT_URL, 存储=$STORED_URL"
    cd /home/lwt/hermes-discovery
    echo "{\"url\":\"$CURRENT_URL\"}" > discovery.json
    git add -A && git commit -m "auto: tunnel sync $(date +%H:%M)" && \
      GIT_SSH_COMMAND="ssh -i /home/lwt/.ssh/id_ed25519_org" git push origin main 2>&1 | tee -a "$LOG"
    cd /home/lwt/ai-community
    log "✅ Tunnel 地址已同步：$CURRENT_URL"
  else
    log "✅ Tunnel 地址一致：$CURRENT_URL"
  fi
}

# 主循环：每 30 分钟检测一次
while true; do
  start_all
  run_tasks
  sleep 1800  # 30 分钟
done
