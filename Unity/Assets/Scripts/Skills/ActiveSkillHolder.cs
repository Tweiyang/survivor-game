using UnityEngine;

namespace SurvivorGame.Skills
{
    /// <summary>
    /// ActiveSkillHolder — 角色绑定主动技能
    /// Web equivalent: ActiveSkillComponent.js
    /// </summary>
    public class ActiveSkillHolder : MonoBehaviour
    {
        [SerializeField] private string _skillId;
        [SerializeField] private string _skillName;
        [SerializeField] private float _cooldown = 10f;

        private float _timer;
        public bool IsReady => _timer <= 0;
        public float CooldownRatio => _cooldown > 0 ? Mathf.Clamp01(_timer / _cooldown) : 0f;
        public string SkillName => _skillName;

        public void Init(string skillId, string name, float cooldown)
        {
            _skillId = skillId;
            _skillName = name;
            _cooldown = cooldown;
        }

        public void TryActivate()
        {
            if (!IsReady) return;
            _timer = _cooldown;
            Activate();
        }

        private void Activate()
        {
            Debug.Log($"[ActiveSkill] {_skillId} activated!");
            // 具体效果由子类或策略实现
            // 例: ShieldBash、NanoHeal、Overcharge
        }

        private void Update()
        {
            if (_timer > 0)
                _timer -= Time.deltaTime;
        }
    }
}
