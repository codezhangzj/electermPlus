#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

TARGET="${TARGET:-}"
SKIP_INSTALL=0
SKIP_LINT=0
SKIP_BUILD=0
CLEAN_CACHE=0
DRY_RUN=0
PYTHON_BIN="${PYTHON:-}"

usage() {
  cat <<'EOF'
electerm-plus 一键本地打包

用法:
  ./一键打包.sh [选项]

选项:
  --target <mac|mac-arm|linux|win|dir>
      mac     打包 macOS 通用默认包
      mac-arm 打包 macOS arm64 包
      linux   打包 Linux tar.gz/deb/AppImage
      win     打包 Windows NSIS 安装包
      dir     只生成当前平台未压缩目录包，适合本地快速验包

  --skip-install  跳过 npm install
  --skip-lint     跳过 npm run lint
  --skip-build    跳过 npm run b，仅执行 electron-builder 打包
  --clean-cache   额外清理本项目构建缓存，不清理 electron-builder 下载缓存
  --dry-run       只演示选择和流程提示，不真正执行安装、检查、构建或打包
  --python <路径> 指定 node-gyp 使用的 Python，需 3.8 或更高版本
  -h, --help      显示帮助

示例:
  ./一键打包.sh
  ./一键打包.sh --target mac-arm
  ./一键打包.sh --target dir --skip-install
  ./一键打包.sh --dry-run
  ./一键打包.sh --python /opt/homebrew/bin/python3
EOF
}

log() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$1"
}

success() {
  printf '\n\033[1;32m%s\033[0m\n' "$1"
}

fail() {
  printf '\n\033[1;31m打包失败：%s\033[0m\n' "$1" >&2
  exit 1
}

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：%s\n' "$*"
  else
    "$@"
  fi
}

clean_package_output() {
  local paths=(
    "$ROOT_DIR/dist"
  )

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：清理旧打包输出目录 %s\n' "${paths[*]}"
    return 0
  fi

  log "清理旧打包输出目录，避免误看旧安装包"
  rm -rf "${paths[@]}"
}

clean_build_outputs() {
  local paths=(
    "$ROOT_DIR/work"
    "$ROOT_DIR/dist"
  )

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：清理旧构建产物 %s\n' "${paths[*]}"
    return 0
  fi

  log "清理旧构建产物，确保本次代码重新进入打包目录"
  rm -rf "${paths[@]}"
}

clean_project_cache() {
  local paths=(
    "$ROOT_DIR/.cache"
    "$ROOT_DIR/node_modules/.vite"
    "$ROOT_DIR/build/vite/node_modules/.vite"
  )

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：清理本项目构建缓存 %s\n' "${paths[*]}"
    return 0
  fi

  log "清理本项目构建缓存"
  rm -rf "${paths[@]}"
}

python_version_ok() {
  local py="$1"
  "$py" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 8) else 1)
PY
}

python_version_text() {
  "$1" - <<'PY' 2>/dev/null || true
import sys
print(".".join(map(str, sys.version_info[:3])))
PY
}

resolve_python() {
  local candidates=()
  local candidate=""

  if [[ -n "$PYTHON_BIN" ]]; then
    candidates+=("$PYTHON_BIN")
  fi

  candidates+=(
    "/opt/homebrew/bin/python3"
    "/usr/local/bin/python3"
    "python3.13"
    "python3.12"
    "python3.11"
    "python3.10"
    "python3.9"
    "python3.8"
    "python3"
  )

  for candidate in "${candidates[@]}"; do
    if command -v "$candidate" >/dev/null 2>&1; then
      local resolved
      resolved="$(command -v "$candidate")"
      if python_version_ok "$resolved"; then
        PYTHON_BIN="$resolved"
        return 0
      fi
    elif [[ -x "$candidate" ]]; then
      if python_version_ok "$candidate"; then
        PYTHON_BIN="$candidate"
        return 0
      fi
    fi
  done

  fail "node-gyp 需要 Python 3.8 或更高版本。请安装新版 Python，或使用 --python /path/to/python3 指定。"
}

patch_local_builder_config() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：修补 electron-builder.json 为本地打包配置\n'
    return 0
  fi

  node <<'NODE'
const fs = require('fs')
const path = require('path')

const file = path.resolve('electron-builder.json')
const config = JSON.parse(fs.readFileSync(file, 'utf8'))
const productName = process.env.ELECTERM_PLUS_PRODUCT_NAME || 'electermPlus'

config.productName = productName
config.appId = process.env.ELECTERM_PLUS_APP_ID || 'org.electerm.electermPlus'

function stripPublish (value) {
  if (!value || typeof value !== 'object') return
  delete value.publish
}

stripPublish(config)
stripPublish(config.mac)
stripPublish(config.win)
stripPublish(config.linux)
stripPublish(config.snap)

if (config.mac) {
  config.mac.notarize = false
  config.mac.bundleVersion = undefined
}

fs.writeFileSync(file, JSON.stringify(config, null, 2))
console.log(`已修补 electron-builder.json：产品名 ${productName}，移除 publish 配置并关闭 mac notarize`)
NODE
}

verify_macos_bundle() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：校验 macOS App 签名和启动 entitlement\n'
    return 0
  fi

  case "$TARGET" in
    mac|mac-arm|dir) ;;
    *) return 0 ;;
  esac

  local app_path=""
  if [[ "$TARGET" == "mac-arm" && -d "$ROOT_DIR/dist/mac-arm64/electermPlus.app" ]]; then
    app_path="$ROOT_DIR/dist/mac-arm64/electermPlus.app"
  elif [[ "$TARGET" == "mac" && -d "$ROOT_DIR/dist/mac/electermPlus.app" ]]; then
    app_path="$ROOT_DIR/dist/mac/electermPlus.app"
  else
    app_path="$(find "$ROOT_DIR/dist" -maxdepth 2 -type d -name 'electermPlus.app' -print -quit 2>/dev/null || true)"
  fi

  if [[ -z "$app_path" ]]; then
    printf '未找到 electermPlus.app，跳过 macOS App 校验。\n'
    return 0
  fi

  log "校验 macOS App 签名: $app_path"
  codesign --verify --deep --strict --verbose=2 "$app_path"

  if ! codesign -d --entitlements :- "$app_path" 2>/dev/null | grep -q 'com.apple.security.cs.disable-library-validation'; then
    fail "macOS App 缺少 disable-library-validation entitlement，安装后可能无法加载 Electron Framework"
  fi

  success "macOS App 签名校验通过，已包含 Electron 启动所需 entitlement。"
}

detect_default_target() {
  case "$(uname -s)" in
    Darwin)
      if [[ "$(uname -m)" == "arm64" ]]; then
        printf 'mac-arm'
      else
        printf 'mac'
      fi
      ;;
    Linux) printf 'linux' ;;
    MINGW*|MSYS*|CYGWIN*) printf 'win' ;;
    *) printf 'dir' ;;
  esac
}

target_label() {
  case "$1" in
    mac) printf 'macOS 通用默认包' ;;
    mac-arm) printf 'macOS Apple Silicon arm64 包' ;;
    linux) printf 'Linux tar.gz / deb / AppImage 包' ;;
    win) printf 'Windows NSIS 安装包' ;;
    dir) printf '当前平台未压缩目录包（快速验包）' ;;
    *) printf '%s' "$1" ;;
  esac
}

select_target() {
  local default_target="$1"
  local choice=""

  printf '\n\033[1;36m请选择本次打包目标：\033[0m\n'
  printf '  1) macOS 通用默认包\n'
  printf '  2) macOS Apple Silicon arm64 包\n'
  printf '  3) Linux tar.gz / deb / AppImage 包\n'
  printf '  4) Windows NSIS 安装包\n'
  printf '  5) 当前平台未压缩目录包（快速验包）\n'
  printf '\n检测到当前系统推荐选项：%s\n' "$(target_label "$default_target")"
  printf '直接回车将使用推荐选项。\n'
  printf '请输入序号 [1-5]：'

  read -r choice || choice=""
  case "$choice" in
    '') TARGET="$default_target" ;;
    1) TARGET="mac" ;;
    2) TARGET="mac-arm" ;;
    3) TARGET="linux" ;;
    4) TARGET="win" ;;
    5) TARGET="dir" ;;
    *) fail "无效选择：$choice" ;;
  esac
}

on_error() {
  local exit_code=$?
  printf '\n\033[1;31m一键打包未完成，退出码：%s。\033[0m\n' "$exit_code" >&2
  printf '请查看上方日志定位失败步骤；常见原因包括依赖未安装、签名权限、electron-builder 下载缓存或平台不匹配。\n' >&2
}

trap on_error ERR

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      [[ $# -ge 2 ]] || fail "--target 需要一个值"
      TARGET="$2"
      shift 2
      ;;
    --target=*)
      TARGET="${1#*=}"
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-lint)
      SKIP_LINT=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --clean-cache)
      CLEAN_CACHE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --python)
      [[ $# -ge 2 ]] || fail "--python 需要一个路径"
      PYTHON_BIN="$2"
      shift 2
      ;;
    --python=*)
      PYTHON_BIN="${1#*=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "未知参数 $1"
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  fail "未找到 node，请先安装 Node.js"
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "未找到 npm，请先安装 npm"
fi

if [[ -z "$TARGET" ]]; then
  select_target "$(detect_default_target)"
else
  case "$TARGET" in
    mac|mac-arm|linux|win|dir) ;;
    *) fail "不支持的 target: $TARGET" ;;
  esac
fi

log "当前目录: $ROOT_DIR"
log "打包目标: $(target_label "$TARGET")"
if [[ "$DRY_RUN" -eq 1 ]]; then
  log "当前为 dry-run 演示模式，不会真正执行打包命令"
fi

resolve_python
export PYTHON="$PYTHON_BIN"
export npm_config_python="$PYTHON_BIN"
log "node-gyp 使用 Python: $PYTHON_BIN ($(python_version_text "$PYTHON_BIN"))"

export npm_config_legacy_peer_deps=true
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-1}"
export CI="${CI:-}"
export CSC_IDENTITY_AUTO_DISCOVERY="${CSC_IDENTITY_AUTO_DISCOVERY:-false}"
export WORKFLOW_NAME="${WORKFLOW_NAME:-local}"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  log "安装依赖 npm install --legacy-peer-deps"
  run_cmd npm install --legacy-peer-deps
else
  log "跳过依赖安装"
fi

if [[ "$SKIP_LINT" -eq 0 ]]; then
  log "代码检查 npm run lint"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN 不执行：XDG_CACHE_HOME=%s npm run lint\n' "${XDG_CACHE_HOME:-$ROOT_DIR/.cache}"
  else
    XDG_CACHE_HOME="${XDG_CACHE_HOME:-$ROOT_DIR/.cache}" npm run lint
  fi
else
  log "跳过代码检查"
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  clean_build_outputs
  if [[ "$CLEAN_CACHE" -eq 1 ]]; then
    clean_project_cache
  fi
  log "构建并准备打包目录 npm run b"
  run_cmd npm run b
else
  log "跳过 npm run b"
  clean_package_output
  printf '\033[1;33m提醒：--skip-build 会复用已有 work/app，可能打包到旧代码。需要包含最新代码时请不要使用 --skip-build。\033[0m\n'
fi

log "准备 electron-builder 配置"
run_cmd npm run pb
patch_local_builder_config
if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ ! -f "$ROOT_DIR/electron-builder.json" ]]; then
    fail "未生成 electron-builder.json，无法正确定位 work/app 打包目录"
  fi
  if [[ ! -f "$ROOT_DIR/work/app/app.js" ]]; then
    fail "未找到 work/app/app.js，请先完整执行构建准备步骤"
  fi
fi

log "开始 electron-builder 打包"
case "$TARGET" in
  mac)
    run_cmd node build/bin/build-mac.js
    ;;
  mac-arm)
    run_cmd node build/bin/build-mac-arm.js
    ;;
  linux)
    run_cmd node build/bin/build-linux-deb-tar.js
    ;;
  win)
    run_cmd node build/bin/build-win-nsis.js
    ;;
  dir)
    run_cmd ./node_modules/.bin/electron-builder --dir
    ;;
esac

verify_macos_bundle

success "打包流程已完成。"
if [[ "$DRY_RUN" -eq 1 ]]; then
  success "dry-run 演示结束：本次没有真正清理、构建或生成安装包。"
  exit 0
fi

if [[ -d "$ROOT_DIR/dist" ]]; then
  printf '产物目录：%s\n' "$ROOT_DIR/dist"
  artifacts="$(find "$ROOT_DIR/dist" -maxdepth 2 -type f \
    \( -name '*.dmg' -o -name '*.zip' -o -name '*.AppImage' -o -name '*.deb' -o -name '*.rpm' -o -name '*.exe' -o -name '*.tar.gz' \) \
    -print)"
  if [[ -n "$artifacts" ]]; then
    printf '本次可用安装包/压缩包：\n%s\n' "$artifacts"
  else
    printf '没有在 dist 中发现常见安装包格式。如果选择的是 dir 目标，请查看 dist 下的未压缩应用目录。\n'
  fi
else
  printf '未发现 dist 目录，请检查上方 electron-builder 输出。\n'
fi

success "全部结束，可以到 dist 目录查看打包产物。"
