# Unity 移植版 — 俯视角自动射击生存游戏

> 从 Web (JS + Canvas 2D) 原型移植到 Unity 2022 LTS (C#)

## 📁 项目结构

```
Unity/Assets/Scripts/
├── Core/
│   ├── GameManager.cs          # 全局管理器（单例，场景流转，暂停）
│   ├── EventBus.cs             # 全局事件总线（泛型，类型安全）
│   ├── GameEvents.cs           # 所有事件结构体定义
│   └── ObjectPool.cs           # 通用对象池
├── Combat/
│   ├── IDamageable.cs          # 可受击接口
│   ├── HealthComponent.cs      # 生命值管理
│   ├── DamageSystem.cs         # 伤害计算（静态工具）
│   ├── Projectile.cs           # 投射物
│   └── KnockbackEffect.cs     # 击退效果
├── Player/
│   ├── PlayerController.cs     # 移动 + 自动射击
│   ├── PlayerStats.cs          # 等级/经验/击杀数
│   └── CharacterData.cs        # 角色配置 ScriptableObject
├── Enemy/
│   ├── EnemyAI.cs              # 追踪型怪物AI
│   ├── EnemyStats.cs           # 怪物属性 + MonsterData SO
│   └── EnemySpawner.cs         # 怪物生成器
├── Skills/
│   ├── SkillData.cs            # 技能配置 ScriptableObject
│   ├── SkillManager.cs         # 技能管理（三选一/被动汇总）
│   ├── WeaponSkill.cs          # 自动武器
│   └── ActiveSkillHolder.cs    # 主动技能
├── Level/
│   ├── LevelManager.cs         # 关卡管理 + Boss 门
│   └── LevelData.cs            # 关卡配置 ScriptableObject
├── Audio/
│   └── AudioManager.cs         # 音频管理（单例）
├── UI/
│   ├── HUD.cs                  # 战斗HUD
│   ├── GameOverUI.cs           # 死亡/通关界面
│   └── SkillSelectUI.cs        # 升级三选一弹窗
├── Network/
│   └── NetworkGameManager.cs   # Colyseus 客户端（复用Node.js服务端）
└── Utils/
    └── Utilities.cs            # CameraFollow + DamagePopup + DifficultyScaler
```

## 🚀 快速开始

### 1. 在 Unity 中打开项目

1. 用 Unity Hub 打开或创建一个 **Unity 2022 LTS** 2D 项目
2. 将 `Unity/Assets/Scripts/` 文件夹复制到你的项目 `Assets/Scripts/`
3. 安装依赖包:
   - **TextMeshPro**: Package Manager → Unity Registry → TextMeshPro
   - **Input System**: Package Manager → Unity Registry → Input System
   - **Colyseus SDK** (联机): `https://github.com/colyseus/colyseus-unity3d.git#upm`

### 2. 创建 ScriptableObject 数据

在 Project 窗口右键 → Create → SurvivorGame:
- **Character Data**: 创建战士/法师/弓手三个 `.asset`
- **Monster Data**: 创建 slime/bat/boss 等
- **Skill Data**: 创建武器技能和被动技能
- **Level Data**: 配置关卡刷怪点

### 3. 搭建场景

1. **Battle 场景**: 添加 GameManager + LevelManager + EnemySpawner + HUD
2. **创建 Player Prefab**: 挂载 PlayerController + HealthComponent + SkillManager
3. **创建 Enemy Prefab**: 挂载 EnemyAI + HealthComponent + EnemyStats
4. **创建 Projectile Prefab**: 挂载 Projectile + SpriteRenderer + CircleCollider2D (Trigger)

### 4. 标签设置

在 Tags & Layers 中确保有:
- `Player`
- `Enemy`
- `Boss`

## 🌐 联网说明

**服务端完全复用现有的 Node.js Colyseus 后端！**

```
Unity 客户端 ──WebSocket──→ 现有 Colyseus Server (server/)
Web 客户端   ──WebSocket──→ 同一个服务端 (可同时连!)
```

安装 colyseus-unity SDK 后，取消 `NetworkGameManager.cs` 中的注释即可启用。

## 🔑 关键设计决策

| 决策 | 原因 |
|------|------|
| EventBus 用泛型 struct | 零 GC，类型安全 |
| 联网模式跳过本地伤害 | 服务端权威（PX Bug #2 教训） |
| 预绑定事件引用 | 防止匿名函数泄漏（PX Bug #1 教训） |
| ObjectPool | Unity 需要避免频繁 Instantiate/Destroy |
| ScriptableObject | 替代 JSON，编辑器可视化 |
