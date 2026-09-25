---
name: game-verify
description: 对本平台格斗游戏执行固定质量门禁，包括打包 sim、跑确定性测试、tsc、vite build，并在用户要求时提交 git。用户说按流程验证、跑全套检查、验证并提交时使用。
---

# 游戏验证流程

对本项目（Phaser 3 + TypeScript + Vite，固定 60Hz 确定性模拟）执行质量门禁。严格按顺序执行，任一步骤失败即停止并报告失败输出，不得跳过门禁继续后续步骤或宣称成功。

## 环境约定（每次 Shell 调用都必须遵守）

- Shell 工具必须设置 `dangerouslyDisableSandbox: true`（C 盘无空间，沙箱内路径与临时目录不可用）。
- 真实代码路径在 D 盘：`D:\devtools\projects\youxikaifa\client`；C 盘工作区的 client/server 是指向它的 junction，编辑两者等价，但 Shell 一律用 D 盘路径。
- 每条命令先加环境前缀，且使用 PowerShell 语法（PowerShell 不支持 bash heredoc）：

```powershell
$env:Path = "D:\devtools\node;$env:Path"; $env:TEMP='D:\devtools\tmp'; $env:TMP='D:\devtools\tmp'; $env:npm_config_cache='D:\devtools\npm-cache'
```

## 验证步骤

在 `D:\devtools\projects\youxikaifa\client` 下依次执行：

1. **打包并跑确定性测试**

```powershell
Set-Location 'D:\devtools\projects\youxikaifa\client'; node node_modules\esbuild\bin\esbuild src/game/sim.ts --bundle --format=esm --outfile=D:/devtools/tmp/sim.bundle.mjs; node D:\devtools\tmp\skill-test.mjs
```

   - 测试文件在 `D:\devtools\tmp\skill-test.mjs`。若本次改动改变了 sim 行为，先同步更新测试断言再跑。
   - 通过标准：末行 `ALL TESTS PASSED`，0 failed。失败时根据 FAIL 行定位，区分测试帧数写错与 sim 真 bug。

2. **类型检查**：`node node_modules\typescript\bin\tsc --noEmit`，必须零输出零错误（严格模式，未使用导入也会报错 TS6133）。

3. **生产构建**：`node node_modules\vite\bin\vite.js build`，必须出现 `built in` 且无错误。

## 提交（仅当用户明确要求）

- 仓库根：`D:\devtools\projects\youxikaifa`；git 可执行文件：`D:\devtools\PortableGit\cmd\git.exe`。
- 提交前先 `git status` 与 `git diff --stat` 确认范围；优先精确 `git add <文件>`，不要随意 `git add -A`（初始提交等全量场景除外）。
- 多行提交信息用 PowerShell here-string，例如 `-m $body`，其中 `$body = @' ... '@`；不要用 `<<'EOF'`。
- 不 amend、不 force push、不跳过 hooks；只在用户明确要求时创建提交。
- 提交后用 `git log --oneline -1` 和 `git status --short` 确认。

## 汇报

用中文简洁汇报四项门禁结果（测试数、tsc、build、commit hash）；不要创建文档文件，不要提交用户未要求的内容。
