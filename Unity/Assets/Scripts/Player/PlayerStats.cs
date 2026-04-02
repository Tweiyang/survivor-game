using UnityEngine;

namespace SurvivorGame.Player
{
    /// <summary>
    /// PlayerStats — 玩家运行时属性（等级/经验/技能加成汇总）
    /// Web equivalent: ExperienceSystem + SkillComponent.getStatModifier()
    /// </summary>
    public class PlayerStats : MonoBehaviour
    {
        [Header("Level")]
        [SerializeField] private int _level = 1;
        [SerializeField] private int _currentExp = 0;
        [SerializeField] private int _killCount = 0;

        [Header("Formulas")]
        [SerializeField] private int _baseExpToLevel = 100;
        [SerializeField] private float _expScaling = 1.2f;

        public int Level => _level;
        public int CurrentExp => _currentExp;
        public int ExpToNextLevel => Mathf.RoundToInt(_baseExpToLevel * Mathf.Pow(_expScaling, _level - 1));
        public float ExpRatio => ExpToNextLevel > 0 ? (float)_currentExp / ExpToNextLevel : 0f;
        public int KillCount => _killCount;

        public void AddExp(int amount)
        {
            _currentExp += amount;
            while (_currentExp >= ExpToNextLevel)
            {
                _currentExp -= ExpToNextLevel;
                _level++;
                OnLevelUp();
            }
        }

        public void AddKill()
        {
            _killCount++;
        }

        private void OnLevelUp()
        {
            Debug.Log($"[PlayerStats] Level Up! Now Lv.{_level}");
            // 技能三选一弹窗由 LevelManager / UI 响应此事件
            Core.EventBus.Emit(new Core.PlayerLevelUpEvent
            {
                NewLevel = _level,
                SkillOptions = null // 由 SkillManager 填充
            });
        }

        /// <summary>
        /// 网络模式下由服务端设置等级
        /// </summary>
        public void SetFromServer(int level, int exp)
        {
            _level = level;
            _currentExp = exp;
        }
    }
}
