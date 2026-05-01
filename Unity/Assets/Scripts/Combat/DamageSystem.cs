using UnityEngine;
using SurvivorGame.Core;

namespace SurvivorGame.Combat
{
    /// <summary>
    /// DamageSystem — 伤害计算（静态工具类）
    /// Web equivalent: CombatSystem.js 的伤害公式部分
    /// </summary>
    public static class DamageSystem
    {
        // 公式参数（对应 formulas.json）
        public static float DefenseRatio = 0.5f;
        public static float BaseCritMultiplier = 1.5f;
        public static float LevelScaling = 1.1f;

        /// <summary>
        /// 计算最终伤害
        /// </summary>
        public static (float damage, bool isCrit) CalculateDamage(
            float attackPower,
            float skillMultiplier,
            float critRate,
            float critMultiplier,
            float targetDefense)
        {
            float baseDamage = attackPower * skillMultiplier;

            bool isCrit = Random.value < critRate;
            float finalDamage = isCrit
                ? baseDamage * (critMultiplier > 0 ? critMultiplier : BaseCritMultiplier)
                : baseDamage;

            float actualDamage = Mathf.Max(1f, finalDamage - targetDefense * DefenseRatio);
            return (actualDamage, isCrit);
        }

        /// <summary>
        /// 应用伤害到目标
        /// [Network] 联网模式下此方法不应在客户端调用
        /// </summary>
        public static void ApplyDamage(GameObject source, GameObject target,
            float attackPower, float skillMultiplier = 1f,
            float critRate = 0f, float critMultiplier = 1.5f)
        {
            // 联网模式由服务端计算，客户端不本地结算
            if (GameManager.Instance != null && GameManager.Instance.IsOnlineMode)
                return;

            var damageable = target.GetComponent<IDamageable>();
            if (damageable == null || !damageable.IsAlive) return;

            // 获取目标防御
            var targetStats = target.GetComponent<EnemyStats>();
            float defense = targetStats != null ? targetStats.Defense : 0f;

            var (damage, isCrit) = CalculateDamage(
                attackPower, skillMultiplier, critRate, critMultiplier, defense);

            damageable.TakeDamage(damage, isCrit, source);

            // 击退
            ApplyKnockback(source, target, 2f);

            // 音效
            EventBus.Emit(new SfxRequestEvent { SoundId = "hit", Position = target.transform.position });
        }

        /// <summary>
        /// 击退效果
        /// </summary>
        public static void ApplyKnockback(GameObject source, GameObject target, float force)
        {
            if (source == null || target == null) return;
            Vector2 dir = (target.transform.position - source.transform.position).normalized;
            var rb = target.GetComponent<Rigidbody2D>();
            if (rb != null)
            {
                rb.AddForce(dir * force, ForceMode2D.Impulse);
            }
        }
    }
}
