using UnityEngine;
using SurvivorGame.Combat;

namespace SurvivorGame.Enemy
{
    /// <summary>
    /// EnemyAI — 追踪型怪物 AI
    /// Web equivalent: ChaseAI.js
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(EnemyStats))]
    public class EnemyAI : MonoBehaviour
    {
        private Rigidbody2D _rb;
        private EnemyStats _stats;
        private HealthComponent _health;
        private Transform _target;
        private float _attackTimer;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _rb.gravityScale = 0;
            _rb.freezeRotation = true;
            _stats = GetComponent<EnemyStats>();
            _health = GetComponent<HealthComponent>();
        }

        private void Update()
        {
            if (_health != null && !_health.IsAlive) return;

            // 联网模式怪物位置由服务端控制
            if (Core.GameManager.Instance != null && Core.GameManager.Instance.IsOnlineMode)
                return;

            FindTarget();
            if (_target == null)
            {
                _rb.linearVelocity = Vector2.zero;
                return;
            }

            float dist = Vector2.Distance(transform.position, _target.position);

            // 在攻击范围内则攻击
            if (dist <= _stats.AttackRange)
            {
                _rb.linearVelocity = Vector2.zero;
                TryAttack();
            }
            // 在检测范围内则追踪
            else if (dist <= _stats.DetectionRange)
            {
                Vector2 dir = ((Vector2)_target.position - (Vector2)transform.position).normalized;
                _rb.linearVelocity = dir * _stats.MoveSpeed;
            }
            else
            {
                _rb.linearVelocity = Vector2.zero;
            }
        }

        private void FindTarget()
        {
            // 找最近玩家
            var player = GameObject.FindGameObjectWithTag("Player");
            _target = player != null ? player.transform : null;
        }

        private void TryAttack()
        {
            _attackTimer -= Time.deltaTime;
            if (_attackTimer > 0) return;
            _attackTimer = _stats.AttackCooldown;

            if (_target == null) return;
            var targetHp = _target.GetComponent<HealthComponent>();
            if (targetHp == null || !targetHp.IsAlive) return;

            DamageSystem.ApplyDamage(
                gameObject, _target.gameObject,
                _stats.Attack, 1f, 0f, 1f);
        }

        /// <summary>
        /// 网络模式: 由服务端设置位置
        /// </summary>
        public void SetPositionFromServer(Vector2 pos)
        {
            transform.position = pos;
        }
    }
}
