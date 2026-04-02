using UnityEngine;
using UnityEngine.InputSystem;
using SurvivorGame.Combat;
using SurvivorGame.Core;

namespace SurvivorGame.Player
{
    /// <summary>
    /// PlayerController — 玩家移动 + 自动射击
    /// Web equivalent: PlayerController + AutoAttackComponent
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(HealthComponent))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float _moveSpeed = 4f;

        [Header("Auto Attack")]
        [SerializeField] private float _attackRange = 6f;
        [SerializeField] private float _attackCooldown = 0.3f;
        [SerializeField] private float _projectileSpeed = 8f;
        [SerializeField] private float _attackPower = 12f;
        [SerializeField] private float _critRate = 0.05f;
        [SerializeField] private float _critMultiplier = 1.5f;

        [Header("Projectile")]
        [SerializeField] private GameObject _projectilePrefab;

        private Rigidbody2D _rb;
        private Vector2 _moveInput;
        private float _attackTimer;
        private ObjectPool _projectilePool;
        private bool _networkMode;

        // 技能加成接口
        public float MoveSpeedModifier { get; set; } = 1f;
        public float AttackSpeedModifier { get; set; } = 1f;
        public float AttackPowerModifier { get; set; } = 1f;

        public float FinalMoveSpeed => _moveSpeed * MoveSpeedModifier;
        public float FinalAttackPower => _attackPower * AttackPowerModifier;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _rb.gravityScale = 0;
            _rb.freezeRotation = true;
        }

        private void Start()
        {
            // 初始化投射物池
            if (_projectilePrefab != null)
            {
                var poolGo = new GameObject("PlayerProjectilePool");
                _projectilePool = poolGo.AddComponent<ObjectPool>();
                _projectilePool.Init(_projectilePrefab, 30);
            }

            _networkMode = GameManager.Instance != null && GameManager.Instance.IsOnlineMode;
        }

        public void InitFromData(CharacterData data)
        {
            _moveSpeed = data.MoveSpeed;
            _attackRange = data.AttackRange;
            _attackCooldown = data.AttackSpeed > 0 ? 1f / data.AttackSpeed : 0.3f;
            _projectileSpeed = data.ProjectileSpeed;
            _attackPower = data.Attack;
            _critRate = data.CritRate;
            _critMultiplier = data.CritMultiplier;
        }

        private void Update()
        {
            // [Network] 联网模式移动由 PredictionSystem 接管
            if (_networkMode) return;

            HandleAutoAttack();
        }

        private void FixedUpdate()
        {
            if (_networkMode) return;

            // 移动
            _rb.linearVelocity = _moveInput * FinalMoveSpeed;
        }

        // Input System 回调
        public void OnMove(InputValue value)
        {
            _moveInput = value.Get<Vector2>();
        }

        public void OnPause(InputValue value)
        {
            GameManager.Instance?.TogglePause();
        }

        // 主动技能按键
        public void OnActiveSkill(InputValue value)
        {
            var activeSkill = GetComponent<ActiveSkillHolder>();
            activeSkill?.TryActivate();
        }

        private void HandleAutoAttack()
        {
            _attackTimer -= Time.deltaTime;
            if (_attackTimer > 0) return;

            // 找最近敌人
            var target = FindNearestEnemy();
            if (target == null) return;

            // 开火
            float finalCooldown = _attackCooldown / AttackSpeedModifier;
            _attackTimer = finalCooldown;

            FireProjectile(target.transform.position);
        }

        private void FireProjectile(Vector3 targetPos)
        {
            Vector2 dir = ((Vector2)targetPos - (Vector2)transform.position).normalized;

            GameObject projGo;
            if (_projectilePool != null)
                projGo = _projectilePool.Get(transform.position, Quaternion.identity);
            else
            {
                projGo = Instantiate(_projectilePrefab, transform.position, Quaternion.identity);
            }

            var proj = projGo.GetComponent<Projectile>();
            proj?.Init(
                gameObject, dir, _projectileSpeed,
                FinalAttackPower, 1f, _critRate, _critMultiplier,
                "player", _projectilePool
            );

            // 旋转投射物朝向
            float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
            projGo.transform.rotation = Quaternion.Euler(0, 0, angle);

            EventBus.Emit(new SfxRequestEvent
            {
                SoundId = "shoot",
                Position = transform.position
            });
        }

        private GameObject FindNearestEnemy()
        {
            float minDist = _attackRange;
            GameObject nearest = null;

            var enemies = GameObject.FindGameObjectsWithTag("Enemy");
            foreach (var enemy in enemies)
            {
                var hp = enemy.GetComponent<HealthComponent>();
                if (hp == null || !hp.IsAlive) continue;

                float dist = Vector2.Distance(transform.position, enemy.transform.position);
                if (dist < minDist)
                {
                    minDist = dist;
                    nearest = enemy;
                }
            }

            // 也检查 Boss
            var bosses = GameObject.FindGameObjectsWithTag("Boss");
            foreach (var boss in bosses)
            {
                var hp = boss.GetComponent<HealthComponent>();
                if (hp == null || !hp.IsAlive) continue;

                float dist = Vector2.Distance(transform.position, boss.transform.position);
                if (dist < minDist)
                {
                    minDist = dist;
                    nearest = boss;
                }
            }

            return nearest;
        }

        private void OnDestroy()
        {
            if (_projectilePool != null)
                Destroy(_projectilePool.gameObject);
        }
    }
}
