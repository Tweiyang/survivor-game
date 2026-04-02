using UnityEngine;
using SurvivorGame.Combat;
using SurvivorGame.Core;

namespace SurvivorGame.Skills
{
    /// <summary>
    /// WeaponSkill — 自动武器
    /// Web equivalent: WeaponSkill.js + ProjectileFire.js
    /// </summary>
    public class WeaponSkill : MonoBehaviour
    {
        private SkillData _data;
        private SkillManager _manager;
        private float _timer;
        private ObjectPool _projPool;

        public void Init(SkillData data, SkillManager manager)
        {
            _data = data;
            _manager = manager;
            if (data.ProjectilePrefab != null)
            {
                var poolGo = new GameObject($"Pool_{data.SkillId}");
                poolGo.transform.SetParent(transform);
                _projPool = poolGo.AddComponent<ObjectPool>();
                _projPool.Init(data.ProjectilePrefab, 20);
            }
        }

        private void Update()
        {
            if (_data == null) return;
            int level = _manager.GetLevel(_data.SkillId);
            if (level <= 0) return;

            int idx = Mathf.Clamp(level - 1, 0, _data.CooldownPerLevel.Length - 1);
            float cd = _data.CooldownPerLevel[idx];

            _timer -= Time.deltaTime;
            if (_timer > 0) return;
            _timer = cd;

            Fire(level);
        }

        private void Fire(int level)
        {
            var player = transform.root;
            var ctrl = player.GetComponent<Player.PlayerController>();
            float atkPower = ctrl != null ? ctrl.FinalAttackPower : 10f;

            int idx = Mathf.Clamp(level - 1, 0, _data.DamageMultiplierPerLevel.Length - 1);
            float mult = _data.DamageMultiplierPerLevel[idx];

            int projIdx = Mathf.Clamp(level - 1, 0, _data.ProjectileCountPerLevel.Length - 1);
            int count = _data.ProjectileCountPerLevel[projIdx];

            // 找最近敌人
            var target = FindNearestEnemy(player.position, 8f);
            if (target == null) return;

            Vector2 baseDir = ((Vector2)target.position - (Vector2)player.position).normalized;

            for (int i = 0; i < count; i++)
            {
                float spread = count > 1 ? (i - (count - 1) * 0.5f) * 15f : 0f;
                float rad = spread * Mathf.Deg2Rad;
                Vector2 dir = RotateVector(baseDir, rad);

                GameObject go;
                if (_projPool != null)
                    go = _projPool.Get(player.position, Quaternion.identity);
                else if (_data.ProjectilePrefab != null)
                    go = Instantiate(_data.ProjectilePrefab, player.position, Quaternion.identity);
                else return;

                var proj = go.GetComponent<Projectile>();
                proj?.Init(player.gameObject, dir, _data.ProjectileSpeed,
                    atkPower, mult, 0.05f, 1.5f, "player", _projPool);

                float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
                go.transform.rotation = Quaternion.Euler(0, 0, angle);
            }

            EventBus.Emit(new SfxRequestEvent { SoundId = "shoot", Position = player.position });
        }

        private Transform FindNearestEnemy(Vector3 from, float range)
        {
            float minD = range;
            Transform best = null;
            foreach (var tag in new[] { "Enemy", "Boss" })
            {
                var list = GameObject.FindGameObjectsWithTag(tag);
                foreach (var e in list)
                {
                    var hp = e.GetComponent<HealthComponent>();
                    if (hp == null || !hp.IsAlive) continue;
                    float d = Vector2.Distance(from, e.transform.position);
                    if (d < minD) { minD = d; best = e.transform; }
                }
            }
            return best;
        }

        private Vector2 RotateVector(Vector2 v, float rad)
        {
            float cos = Mathf.Cos(rad), sin = Mathf.Sin(rad);
            return new Vector2(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
        }
    }
}
