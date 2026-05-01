using UnityEngine;
using SurvivorGame.Core;
using SurvivorGame.Enemy;
using SurvivorGame.Combat;

namespace SurvivorGame.Level
{
    /// <summary>
    /// LevelManager — 关卡管理器
    /// Web equivalent: LevelManager.js
    /// </summary>
    public class LevelManager : MonoBehaviour
    {
        [Header("Level Config")]
        [SerializeField] private LevelData[] _levels;
        [SerializeField] private EnemySpawner _spawner;

        [Header("Boss Gate")]
        [SerializeField] private int _killsToOpenBoss = 5;
        [SerializeField] private GameObject _bossGate;

        private int _currentLevelIndex;
        private int _totalKills;
        private bool _bossGateOpen;
        private bool _bossSpawned;

        public int TotalKills => _totalKills;
        public bool BossGateOpen => _bossGateOpen;
        public int KillsToOpenBoss => _killsToOpenBoss;

        private void OnEnable()
        {
            EventBus.On<EntityDeathEvent>(OnEntityDeath);
        }

        private void OnDisable()
        {
            EventBus.Off<EntityDeathEvent>(OnEntityDeath);
        }

        public void StartLevel(int index)
        {
            _currentLevelIndex = index;
            _totalKills = 0;
            _bossGateOpen = false;
            _bossSpawned = false;

            if (_levels != null && index < _levels.Length)
            {
                var data = _levels[index];
                _killsToOpenBoss = data.KillsToOpenBoss;
                SpawnLevelMonsters(data);
            }

            // 关闭 Boss 门
            if (_bossGate != null) _bossGate.SetActive(true);
        }

        private void SpawnLevelMonsters(LevelData data)
        {
            foreach (var spawn in data.Spawns)
            {
                if (spawn.IsBoss) continue; // Boss 延迟生成
                _spawner.SpawnMonster(spawn.MonsterId, spawn.Position, false);
            }
        }

        private void OnEntityDeath(EntityDeathEvent evt)
        {
            if (evt.Tag == "Enemy" || evt.Tag == "Boss")
            {
                _totalKills++;

                // Boss 门判定
                if (!_bossGateOpen && _totalKills >= _killsToOpenBoss)
                {
                    OpenBossGate();
                }

                // Boss 击杀 = 通关
                if (evt.Tag == "Boss")
                {
                    EventBus.Emit(new LevelCompleteEvent { LevelIndex = _currentLevelIndex });
                }

                // 生成经验球
                SpawnExpOrb(evt.Entity, evt.ExpValue);
            }

            if (evt.Tag == "Player")
            {
                EventBus.Emit(new GameOverEvent { Victory = false });
            }
        }

        private void OpenBossGate()
        {
            _bossGateOpen = true;
            if (_bossGate != null) _bossGate.SetActive(false);

            EventBus.Emit(new BossGateOpenEvent { LevelIndex = _currentLevelIndex });

            // 延迟生成 Boss
            if (_levels != null && _currentLevelIndex < _levels.Length)
            {
                var data = _levels[_currentLevelIndex];
                foreach (var spawn in data.Spawns)
                {
                    if (spawn.IsBoss && !_bossSpawned)
                    {
                        _spawner.SpawnMonster(spawn.MonsterId, spawn.Position, true);
                        _bossSpawned = true;
                    }
                }
            }
        }

        private void SpawnExpOrb(GameObject source, int expValue)
        {
            if (source == null || expValue <= 0) return;
            // 创建经验球（简单实现：直接给最近玩家加经验）
            var player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                var stats = player.GetComponent<Player.PlayerStats>();
                stats?.AddExp(expValue);
                stats?.AddKill();
            }
        }
    }

    [System.Serializable]
    public class SpawnPoint
    {
        public string MonsterId;
        public Vector2 Position;
        public bool IsBoss;
    }
}
