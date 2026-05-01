using UnityEngine;

namespace SurvivorGame.Player
{
    /// <summary>
    /// CharacterData — 角色配置 ScriptableObject
    /// Web equivalent: characters.json
    /// </summary>
    [CreateAssetMenu(fileName = "NewCharacter", menuName = "SurvivorGame/Character Data")]
    public class CharacterData : ScriptableObject
    {
        [Header("Identity")]
        public string CharacterId = "warrior";
        public string DisplayName = "战士";
        public Sprite Portrait;
        public Color CharacterColor = Color.blue;

        [Header("Base Stats")]
        public float MaxHp = 150f;
        public float Attack = 12f;
        public float Defense = 3f;
        public float MoveSpeed = 4f;
        public float AttackSpeed = 2f; // attacks per second
        public float AttackRange = 5f;
        public float ProjectileSpeed = 8f;
        public float CritRate = 0.05f;
        public float CritMultiplier = 1.5f;

        [Header("Appearance")]
        public Sprite CharacterSprite;
        public RuntimeAnimatorController Animator;
        public float SpriteScale = 1f;

        [Header("Initial Weapon")]
        public string InitialWeaponId = "pistol";

        [Header("Active Skill")]
        public string ActiveSkillId = "";
        public float ActiveSkillCooldown = 10f;
        public string ActiveSkillName = "";
        public string ActiveSkillIcon = "?";
    }
}
