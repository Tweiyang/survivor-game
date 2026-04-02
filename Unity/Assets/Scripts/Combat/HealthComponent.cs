using UnityEngine;
using SurvivorGame.Core;

namespace SurvivorGame.Combat
{
    /// <summary>
    /// HealthComponent — 生命值管理
    /// Web equivalent: HealthComponent.js
    /// </summary>
    public class HealthComponent : MonoBehaviour, IDamageable
    {
        [Header("Health")]
        [SerializeField] private float _maxHp = 100f;
        [SerializeField] private float _currentHp;

        [Header("Faction")]
        [SerializeField] private string _faction = "player"; // "player" or "enemy"

        [Header("Visual Feedback")]
        [SerializeField] private float _flashDuration = 0.1f;
        private SpriteRenderer _spriteRenderer;
        private Color _originalColor;
        private float _flashTimer;

        public float CurrentHp => _currentHp;
        public float MaxHp => _maxHp;
        public bool IsAlive => _currentHp > 0;
        public string Faction => _faction;

        public float HpRatio => _maxHp > 0 ? _currentHp / _maxHp : 0f;

        private void Awake()
        {
            _currentHp = _maxHp;
            _spriteRenderer = GetComponent<SpriteRenderer>();
            if (_spriteRenderer != null)
                _originalColor = _spriteRenderer.color;
        }

        public void Init(float maxHp, string faction)
        {
            _maxHp = maxHp;
            _currentHp = maxHp;
            _faction = faction;
        }

        public void SetMaxHp(float maxHp, bool healToFull = true)
        {
            _maxHp = maxHp;
            if (healToFull) _currentHp = maxHp;
            else _currentHp = Mathf.Min(_currentHp, maxHp);
        }

        public void Heal(float amount)
        {
            if (!IsAlive) return;
            _currentHp = Mathf.Min(_currentHp + amount, _maxHp);
        }

        public void HealToFull()
        {
            _currentHp = _maxHp;
        }

        public void TakeDamage(float damage, bool isCrit, GameObject source)
        {
            if (!IsAlive) return;

            _currentHp -= damage;
            _currentHp = Mathf.Max(0, _currentHp);

            // 受击闪烁
            StartFlash();

            // 发送伤害事件
            EventBus.Emit(new DamageEvent
            {
                Source = source,
                Target = gameObject,
                Damage = damage,
                IsCrit = isCrit,
                Killed = !IsAlive
            });

            if (!IsAlive)
            {
                OnDeath(source);
            }
        }

        /// <summary>
        /// 网络模式下服务端直接设置血量（不触发本地伤害逻辑）
        /// </summary>
        public void SetHpFromServer(float hp)
        {
            _currentHp = Mathf.Max(0, hp);
            if (!IsAlive) OnDeath(null);
        }

        private void OnDeath(GameObject killer)
        {
            // 获取经验值（如果有）
            var stats = GetComponent<EnemyStats>();
            int expValue = stats != null ? stats.ExpValue : 0;

            EventBus.Emit(new EntityDeathEvent
            {
                Entity = gameObject,
                Tag = gameObject.tag,
                ExpValue = expValue
            });
        }

        private void StartFlash()
        {
            if (_spriteRenderer == null) return;
            _spriteRenderer.color = Color.white;
            _flashTimer = _flashDuration;
        }

        private void Update()
        {
            if (_flashTimer > 0)
            {
                _flashTimer -= Time.deltaTime;
                if (_flashTimer <= 0 && _spriteRenderer != null)
                {
                    _spriteRenderer.color = _originalColor;
                }
            }
        }
    }
}
