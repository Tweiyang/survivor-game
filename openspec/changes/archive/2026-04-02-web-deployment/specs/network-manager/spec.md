## MODIFIED Requirements

### Requirement: 服务器连接管理
`NetworkManager` SHALL 支持环境自适应的服务器地址解析。连接方法 SHALL 支持可选的 `serverUrl` 参数覆盖默认地址。`connect()` SHALL 包含5秒超时保护，超时后 reject Promise 并抛出 `ConnectionTimeout` 错误。

<!-- Unity 映射：NetworkManager.Connect(uri) + ScriptableObject 配置 -->

#### Scenario: 自动选择本地服务器
- **WHEN** `connect()` 在 `localhost` 域名下被调用且未指定 `serverUrl`
- **THEN** 自动连接 `ws://localhost:2567`

#### Scenario: 自动选择生产服务器
- **WHEN** `connect()` 在非本地域名下被调用且未指定 `serverUrl`
- **THEN** 自动连接 `<meta name="game-server">` 指定地址或默认生产地址（`wss://`）

#### Scenario: 连接超时
- **WHEN** 服务器5秒内无响应
- **THEN** Promise 被 reject，错误类型为 `ConnectionTimeout`

#### Scenario: 显式指定服务器地址
- **WHEN** `connect('wss://custom-server.com')` 被调用
- **THEN** 使用指定地址，忽略自动检测逻辑
