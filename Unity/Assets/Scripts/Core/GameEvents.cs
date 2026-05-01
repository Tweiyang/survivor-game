using UnityEngine;

namespace SurvivorGame.Core
{
    // ============================================================
    // 全局游戏事件定义
    // Web equivalent: EventSystem.emit('eventName', data)
    // ============================================================

    public struct GamePausedEvent { }
    public struct GameResumedEvent { }

    public struct EntityDeathEvent
    {
        public GameObject Entity;
        public string Tag; // "player", "enemy", "boss"
        public int ExpValue;
    }

    public struct DamageEvent
    {
        public GameObject Source;
        public GameObject Target;
        public float Damage;
        public bool IsCrit;
        public bool Killed;
    }

    public struct PlayerLevelUpEvent
    {
        public int NewLevel;
        public string[] SkillOptions; // 三选一技能ID
    }

    public struct SkillSelectedEvent
    {
        public string SkillId;
    }

    public struct BossGateOpenEvent
    {
        public int LevelIndex;
    }

    public struct LevelCompleteEvent
    {
        public int LevelIndex;
    }

    public struct GameOverEvent
    {
        public bool Victory;
    }

    public struct ExpOrbCollectedEvent
    {
        public int ExpValue;
        public GameObject Collector;
    }

    public struct SfxRequestEvent
    {
        public string SoundId;
        public Vector2 Position;
    }

    // 联网相关事件
    public struct PlayerJoinedEvent
    {
        public string SessionId;
        public string CharacterId;
    }

    public struct PlayerLeftEvent
    {
        public string SessionId;
    }

    public struct NetworkConnectedEvent { }
    public struct NetworkDisconnectedEvent { }
}
