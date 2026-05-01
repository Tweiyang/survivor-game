## Purpose
定义 Boss 门机制，包括通行阻挡、击杀解锁、HUD 状态显示和关卡通关 UI。

## Requirements

### Requirement: Boss gate blocks passage until kill count met
系统 SHALL 在 Boss 房间入口设置可动态开关的门（Unity: Tilemap.SetTile 动态修改）。
Boss 门初始 SHALL 为墙壁瓦片（不可通行）。
当 `LevelManager.isBossGateOpen()` 返回 true 时，门的瓦片 SHALL 变更为可行走地面瓦片。
门开启时 SHALL 在门位置渲染视觉提示（发光边框或颜色变化）。

#### Scenario: Gate closed initially
- **WHEN** 关卡加载完成
- **THEN** Boss 门位置为墙壁，玩家无法通过

#### Scenario: Gate opens after kills
- **WHEN** 击杀数达到 killsToOpenBoss
- **THEN** 门瓦片变为地面，玩家可以走过去进入 Boss 房间

### Requirement: HUD displays boss gate status
HUD SHALL 显示 Boss 门状态信息：
- 门关闭时：显示 "Boss 门: 击杀 N/M" 进度条
- 门开启时：显示 "Boss 门已开启！" 闪烁提示
HUD SHALL 显示当前关卡名称。

#### Scenario: Kill progress display
- **WHEN** 已击杀 5/8
- **THEN** HUD 显示 "Boss 门: 5/8" 和进度条

#### Scenario: Gate open notification
- **WHEN** Boss 门刚开启
- **THEN** HUD 显示闪烁的 "Boss 门已开启！" 持续 3 秒

### Requirement: Level complete UI
系统 SHALL 在 Boss 被击败后显示通关 UI 覆盖层。
通关 UI SHALL 显示：
- "关卡完成！" 标题 + 关卡名称
- 击杀数、存活时间等统计
- "下一关" 按钮（有下一关时）/ "返回选角" 按钮

#### Scenario: Level complete with next level
- **WHEN** 击败 Boss 且有下一关
- **THEN** 显示通关 UI + "下一关" 按钮

#### Scenario: All levels complete
- **WHEN** 击败最后一关 Boss
- **THEN** 显示 "全部通关！" + "返回选角" 按钮
