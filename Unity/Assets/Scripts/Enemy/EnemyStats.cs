using UnityEngine;

namespace SurvivorGame.Enemy
{
    /// <summary>
    /// MonsterData — 怪物配置 ScriptableObject
    /// Web equivalent: monsters.json
    /// </summary>
    [CreateAssetMenu(fileName = "NewMonster", menuName = "SurvivorGame/Monster Data")]
    public class MonsterData : ScriptableObject
    {
        public string MonsterId = "slime";
        public string DisplayName = "Slime";
        public Sprite MonsterSprite;
        public Color MonsterColor = Color.green;
        public float Size = 0.6f;

        [Header("Stats")]
        public float MaxHp = 30f;
        public float Attack = 5f;
        public float Defense = 0f;
        public float MoveSpeed = 2f;
        public float DetectionRange = 6f;
        public float AttackRange = 1f;
        public float AttackCooldown = 1f;
        public int ExpValue = 15;

        [Header("Boss")]
        public bool IsBossTemplate = false;
        public float BossSizeMultiplier = 1.8f;
    }

    /// <summary>
    /// EnemyStats — 怪物运行时属性
    /// Web equivalent: CombatComponent + _expValue on MonsterFactory entity
    /// </summary>
    public class EnemyStats : MonoBehaviour
    {
        [SerializeField] private float _attack = 5f;
        [SerializeField] private float _defense = 0f;
        [SerializeField] private float _moveSpeed = 2f;
        [SerializeField] private float _detectionRange = 6f;
        [SerializeField] private float _attackRange = 1f;
        [SerializeField] private float _attackCooldown = 1f;
        [SerializeField] private int _expValue = 15;

        public float Attack => _attack;
        public float Defense => _defense;
        public float MoveSpeed => _moveSpeed;
        public float DetectionRange => _detectionRange;
        public float AttackRange => _attackRange;
        public float AttackCooldown => _attackCooldown;
        public int ExpValue => _expValue;

        public void Init(MonsterData data, float difficultyMultiplier = 1f)
        {
            _attack = data.Attack;
            _defense = data.Defense;
            _moveSpeed = data.MoveSpeed;
            _detectionRange = data.DetectionRange;
            _attackRange = data.AttackRange;
            _attackCooldown = data.AttackCooldown;
            _expValue = data.ExpValue;

            // 多人难度缩放只影响 HP（在 HealthComponent 设置）
        }
    }
}
