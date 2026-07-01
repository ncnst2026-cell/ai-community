#!/bin/bash
# scripts/backup.sh - 数据库备份脚本
# 功能: 本地保留7个备份，git只保留最新1个
# 用法: bash scripts/backup.sh

cd /home/lwt/ai-community

BACKUP_DIR="data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB="data/community.db"
BACKUP_FILE="$BACKUP_DIR/community.db.$TIMESTAMP.bak"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB" ]; then
  echo "错误: 数据库文件不存在"
  exit 1
fi

# 1. 创建备份
cp "$DB" "$BACKUP_FILE"
echo "备份完成: $BACKUP_FILE"

# 2. 校验完整性
if command -v sqlite3 &> /dev/null; then
  RESULT=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>/dev/null)
  if [ "$RESULT" != "ok" ]; then
    echo "错误: 备份数据库完整性检查失败: $RESULT"
    rm "$BACKUP_FILE"
    exit 1
  fi
  echo "完整性检查通过: ok"
fi

# 3. 清理 git 中旧的备份文件（只保留最新 1 个在 git 中）
git ls-files -- "$BACKUP_DIR/" | sort | head -n -1 | xargs -r git rm --cached 2>/dev/null

# 4. 将最新备份加入 git
git add "$BACKUP_FILE"
git commit -m "backup: database $TIMESTAMP" 2>/dev/null || echo "无变更，跳过 commit"

# 5. 清理本地旧备份（保留最近 7 个）
OLD_COUNT=$(ls "$BACKUP_DIR"/community.db.*.bak 2>/dev/null | wc -l)
if [ "$OLD_COUNT" -gt 7 ]; then
  ls -t "$BACKUP_DIR"/community.db.*.bak | tail -n +8 | xargs -r rm
  echo "已清理本地旧备份，保留最近 7 个"
fi

# 6. 推送到两个远端仓库
git push origin main 2>/dev/null && echo "已推送到 origin" || echo "origin 推送失败"
git push database main 2>/dev/null && echo "已推送到 database" || echo "database 推送失败"

# 7. 输出当前备份列表
echo ""
echo "当前本地备份（最新 7 个）:"
ls -lh "$BACKUP_DIR"/community.db.*.bak 2>/dev/null | awk '{print "  "$5"  "$9}'
