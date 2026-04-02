using UnityEngine;
using SurvivorGame.Core;

namespace SurvivorGame.Combat
{
    /// <summary>
    /// Projectile — 投射物
    /// Web equivalent: ProjectileComponent.js
    /// </summary>
    public class Projectile : MonoBehaviour
    {
        [Header("Projectile Settings")]
        [SerializeField] private float _speed = 8f;
        [SerializeField] private float _lifetime = 3f;
        [SerializeField] private float _damage = 10f;
        [SerializeField] private float _skillMultiplier = 1f;
        [SerializeField] private float _critRate = 0f;
        [SerializeField] private float _critMultiplier = 1.5f;
        [SerializeField] private string _ownerFaction = "player";

        private Vector2 _direction;
        private float _timer;
        private GameObject _owner;
        private ObjectPool _pool;

        public void Init(GameObject owner, Vector2 direction, float speed,
            float damage, float skillMultiplier, float critRate,
            float critMultiplier, string faction, ObjectPool pool = null)
        {
            _owner = owner;
            _direction = direction.normalized;
            _speed = speed;
            _damage = damage;
            _skillMultiplier = skillMultiplier;
            _critRate = critRate;
            _critMultiplier = critMultiplier;
            _ownerFaction = faction;
            _pool = pool;
            _timer = _lifetime;
        }

        private void Update()
        {
            // 移动
            transform.Translate(_direction * _speed * Time.deltaTime);

            // 超时销毁
            _timer -= Time.deltaTime;
            if (_timer <= 0)
            {
                ReturnToPool();
            }
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            // 忽略同阵营
            var health = other.GetComponent<HealthComponent>();
            if (health == null || !health.IsAlive) return;
            if (health.Faction == _ownerFaction) return;

            // 联网模式不在本地造成伤害（服务端权威！）
            if (GameManager.Instance != null && GameManager.Instance.IsOnlineMode)
            {
                // 只做视觉效果
                ReturnToPool();
                return;
            }

            // 单人模式：本地计算伤害
            DamageSystem.ApplyDamage(
                _owner, other.gameObject,
                _damage, _skillMultiplier,
                _critRate, _critMultiplier);

            EventBus.Emit(new SfxRequestEvent
            {
                SoundId = "shoot",
                Position = transform.position
            });

            ReturnToPool();
        }

        private void ReturnToPool()
        {
            if (_pool != null)
                _pool.Return(gameObject);
            else
                Destroy(gameObject);
        }

        private void OnDisable()
        {
            _timer = _lifetime; // 重置，方便池化复用
        }
    }
}
