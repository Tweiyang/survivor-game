using UnityEngine;
using SurvivorGame.Combat;
using SurvivorGame.Core;

namespace SurvivorGame.Enemy
{
    /// <summary>
    /// EnemySpawner — 怪物生成器
    /// Web equivalent: ServerSpawner.ts + LevelManager 的本地生成逻辑
    /// </summary>
    public class EnemySpawner : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private MonsterData[] _monsterDatabase;
        [SerializeField] private GameObject _enemyPrefab;

        [Header("Spawn Settings")]
        [SerializeField] private float _spawnRadius = 8f;

        private ObjectPool _enemyPool;
        private float _difficultyMultiplier = 1f;

        public void SetDifficulty(float multiplier)
        {
            _difficultyMultiplier = multiplier;
        }

        private void Start()
        {
            if (_enemyPrefab != null)
            {
                var poolGo = new GameObject("EnemyPool");
                _enemyPool = poolGo.AddComponent<ObjectPool>();
                _enemyPool.Init(_enemyPrefab, 30);
            }
        }

        /// <summary>
        /// 在指定位置生成怪物
        /// </summary>
        public GameObject SpawnMonster(string monsterId, Vector2 position, bool isBoss = false)
        {
            var data = FindMonsterData(monsterId);
            if (data == null)
            {
                Debug.LogError($"[EnemySpawner] Unknown monster: {monsterId}");
                return null;
            }

            GameObject go;
            if (_enemyPool != null)
                go = _enemyPool.Get(position, Quaternion.identity);
            else
                go = Instantiate(_enemyPrefab, position, Quaternion.identity);

            // 设置 Tag
            go.tag = isBoss ? "Boss" : "Enemy";

            // 设置外观
            var sr = go.GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                sr.color = data.MonsterColor;
                float scale = data.Size * (isBoss ? data.BossSizeMultiplier : 1f);
                go.transform.localScale = Vector3.one * scale;
            }

            // 设置属性
            var stats = go.GetComponent<EnemyStats>();
            if (stats == null) stats = go.AddComponent<EnemyStats>();
            stats.Init(data, _difficultyMultiplier);

            // 设置血量
            var hp = go.GetComponent<HealthComponent>();
            if (hp == null) hp = go.AddComponent<HealthComponent>();
            float hpValue = data.MaxHp * _difficultyMultiplier * (isBoss ? 3f : 1f);
            hp.Init(hpValue, "enemy");

            // 设置 AI
            var ai = go.GetComponent<EnemyAI>();
            if (ai == null) ai = go.AddComponent<EnemyAI>();

            go.name = isBoss ? $"Boss_{data.DisplayName}" : data.DisplayName;

            return go;
        }

        /// <summary>
        /// 在玩家周围随机位置生成
        /// </summary>
        public GameObject SpawnNearPlayer(string monsterId, bool isBoss = false)
        {
            var player = GameObject.FindGameObjectWithTag("Player");
            if (player == null) return null;

            Vector2 offset = Random.insideUnitCircle.normalized * _spawnRadius;
            Vector2 pos = (Vector2)player.transform.position + offset;
            return SpawnMonster(monsterId, pos, isBoss);
        }

        /// <summary>
        /// 回收怪物到池
        /// </summary>
        public void DespawnMonster(GameObject monster)
        {
            if (_enemyPool != null)
                _enemyPool.Return(monster);
            else
                Destroy(monster);
        }

        private MonsterData FindMonsterData(string id)
        {
            if (_monsterDatabase == null) return null;
            foreach (var data in _monsterDatabase)
            {
                if (data.MonsterId == id) return data;
            }
            return null;
        }
    }
}
