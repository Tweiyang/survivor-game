using UnityEngine;

namespace SurvivorGame.Combat
{
    /// <summary>
    /// IDamageable — 可受击接口
    /// Web equivalent: HealthComponent.takeDamage()
    /// </summary>
    public interface IDamageable
    {
        float CurrentHp { get; }
        float MaxHp { get; }
        bool IsAlive { get; }
        string Faction { get; } // "player" or "enemy"
        void TakeDamage(float damage, bool isCrit, GameObject source);
    }
}
