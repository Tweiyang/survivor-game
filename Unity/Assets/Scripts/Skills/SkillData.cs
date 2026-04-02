using UnityEngine;

namespace SurvivorGame.Skills
{
    /// <summary>
    /// SkillData — 技能配置 ScriptableObject
    /// Web equivalent: skills.json
    /// </summary>
    [CreateAssetMenu(fileName = "NewSkill", menuName = "SurvivorGame/Skill Data")]
    public class SkillData : ScriptableObject
    {
        public string SkillId;
        public string DisplayName;
        public string Description;
        public Sprite Icon;
        public SkillType Type; // Weapon, Passive, Active
        public int MaxLevel = 5;
        public float SelectWeight = 1f;

        [Header("Weapon (Type=Weapon)")]
        public GameObject ProjectilePrefab;
        public float[] DamageMultiplierPerLevel = { 1f, 1.2f, 1.4f, 1.6f, 2f };
        public float[] CooldownPerLevel = { 0.5f, 0.45f, 0.4f, 0.35f, 0.3f };
        public int[] ProjectileCountPerLevel = { 1, 1, 2, 2, 3 };
        public float ProjectileSpeed = 8f;

        [Header("Passive (Type=Passive)")]
        public StatModifierType ModifierType;
        public float[] ModifierValuePerLevel = { 0.1f, 0.2f, 0.3f, 0.4f, 0.5f };
    }

    public enum SkillType { Weapon, Passive, Active }
    public enum StatModifierType { AttackPower, AttackSpeed, MoveSpeed, MaxHp, CritRate, CritDamage, Defense }
}
