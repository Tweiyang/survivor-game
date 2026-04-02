## ADDED Requirements

### Requirement: SceneManager supports scene data passing
SceneManager SHALL 新增 `sceneData: object` 属性（Unity: 类似 DontDestroyOnLoad 单例或 ScriptableObject 数据容器）。
sceneData SHALL 在场景切换时保留，允许场景间传递数据。
sceneData SHALL 在 `loadScene()` 调用时 **不被** 清空（由场景自行读取和处理）。
SceneManager SHALL 提供 `clearSceneData()` 方法用于手动清空。

#### Scenario: Pass character selection to battle
- **WHEN** CharacterSelectScene 设置 `sceneManager.sceneData.characterId = 'ranger'` 后调用 `loadScene('battle')`
- **THEN** BattleScene.init() 中可通过 `sceneManager.sceneData.characterId` 读到 'ranger'

#### Scenario: Scene data persists across loads
- **WHEN** sceneData 被设置后经过多次 loadScene
- **THEN** sceneData 保持不变直到手动调用 clearSceneData()
