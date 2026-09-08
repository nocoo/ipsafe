<p align="center">
  <img src="assets/brand/icon-rounded.png" width="128" height="128" alt="IPSafe logo" />
</p>
<h1 align="center">IPSafe</h1>
<p align="center">执行命令前，先检查指定的 HTTP 响应是否符合预期。</p>
<p align="center">
  <a href="docs/README.en.md">English</a>
</p>

## 这是什么

IPSafe 是一个 Node.js 命令行工具。它先请求配置的地址，检查 HTTP 状态和可选的响应内容；检查通过后才启动命令，失败则以非零状态退出。

它适合给依赖网络的脚本增加一个执行前条件。默认检查 `https://www.google.com` 是否返回 2xx；也可以改为自己的健康检查地址。检查只反映当次请求的结果，命令运行期间不会持续监控网络，也不会自动验证出口 IP、地区或代理状态。

## 功能

- **HTTP 条件**：检查 2xx 状态，配置请求方法、请求头、超时和重试。
- **内容匹配**：使用不区分大小写的文本包含或正则表达式匹配响应。
- **命令执行**：检查通过后启动程序，实时显示输出，可配置命令超时。
- **项目与全局配置**：按优先级选择配置文件，也可创建用户级默认配置。
- **JavaScript API**：提供 `IpSafe`、`checkNetworkSafe` 和 `executeIfSafe`，方便脚本集成。

## 使用

需要 Node.js。安装 npm 发布的 CLI：

```bash
npm install -g ipsafe
ipsafe "node --version"
ipsafe "npm install"
```

源代码运行方式见开发章节。检查失败或子命令失败时，CLI 返回退出码 1。

### 配置

```bash
ipsafe --init
ipsafe --config
ipsafe --config-path
ipsafe --help
```

`--init` 创建用户级配置，已有文件时不会直接覆盖。`--config` 显示配置与查找路径，`--config-path` 显示用户级配置路径。

配置查找顺序：

| 优先级 | 位置 |
| --- | --- |
| 1 | 当前工作目录的 `ipsafe.config.json` |
| 2 | macOS / Linux：`$XDG_CONFIG_HOME/ipsafe/config.json`，未设置时为 `~/.config/ipsafe/config.json` |
| 2 | Windows：`%APPDATA%/ipsafe/config.json`，未设置时使用用户目录下的 `AppData/Roaming` |
| 3 | `~/.ipsafe.json` |
| 4 | 内置默认值 |

使用第一个可读取且能解析的文件，并与内置默认值合并；项目和全局配置不会逐层叠加。无效文件会产生警告，随后尝试下一个位置。

以下配置示例需要将 `testUrl` 换成自己的健康检查地址：

```json
{
  "testUrl": "https://example.com/health",
  "timeout": 3000,
  "retries": 1,
  "method": "GET",
  "checkContent": true,
  "searchText": "ok",
  "searchType": "contains",
  "headers": {},
  "commandTimeout": 0
}
```

| 字段 | 含义 |
| --- | --- |
| `timeout` | 请求超时，单位毫秒 |
| `retries` | 首次请求失败后的重试次数，重试间隔为 1 秒 |
| `checkContent` / `searchText` | 启用响应内容检查并指定文本或模式 |
| `searchType` | `contains` 或 `regex` |
| `headers` / `userAgent` | 自定义检查请求头与 User-Agent |
| `commandTimeout` | 命令超时，单位毫秒；0 表示不限制 |

HTTP 重定向不会自动跟随，3xx 响应会判为失败。若想依据 IP 或地区检查，需要选择相应接口并自己配置内容匹配规则。

### 命令与脚本集成

命令会被解析为程序和参数后直接启动。需要管道或重定向时，应显式调用 shell，例如 macOS / Linux：

```bash
ipsafe 'sh -c "printf hello | wc -c"'
```

`vim`、`less`、`top` 等识别出的交互程序直接继承终端。复杂引号与 shell 语法应交由显式启动的 shell 处理。

在 JavaScript 中，`new IpSafe(configPath).run(args)` 会按配置检查并执行。`checkNetworkSafe(configPath)` 只返回检查是否通过；`executeIfSafe(command, configPath)` 返回带 `success` 的结果，但当前实现未将配置中的 `commandTimeout` 传给命令执行器，需要该超时行为时使用 `IpSafe.run`。

仓库也提供独立检查脚本，输出 `SAFE` 或 `UNSAFE` 及对应退出状态：

```bash
node integrations/claude-code.js ./ipsafe.config.json
```

它可以由其他工具调用，需要自行接入工具的执行流程。

## 开发

开发测试建议使用 Node.js 24 和 Bun：

```bash
git clone https://github.com/nocoo/ipsafe.git
cd ipsafe
bun install --frozen-lockfile
node bin/ipsafe.js --help
```

当前源码使用 CommonJS 和 Node.js 内置 HTTP、HTTPS、文件系统及子进程模块，没有运行时第三方依赖。

## 测试

```bash
bun run test
bun run test:coverage
```

测试覆盖配置、HTTP 判定与重试、内容匹配、命令解析和 CLI 分支，使用模拟的网络、文件系统和子进程。仓库没有独立的浏览器或公网集成测试入口；终端交互需在目标操作系统检查。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| JavaScript / Node.js | CLI 与 CommonJS API |
| node:http / node:https | 执行前的 HTTP 检查 |
| node:child_process | 命令启动、输出与信号 |
| JSON / node:fs | 项目和用户配置 |
| Vitest | 单元与 CLI 模拟测试 |

## 文档

- [默认配置示例](ipsafe.config.json)
- [核心检查与执行代码](lib/ipsafe.js)
- [独立集成检查脚本](integrations/claude-code.js)
- [品牌资源使用](docs/01-logo-usage.md)

## 许可证

[MIT](LICENSE)
