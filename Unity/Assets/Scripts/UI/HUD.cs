using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SurvivorGame.Core;
using SurvivorGame.Combat;

namespace SurvivorGame.UI
{
    /// <summary>
    /// HUD — 战斗中信息界面
    /// Web equivalent: HUD.js
    /// </summary>
    public class HUD : MonoBehaviour
    {
        [Header("HP")]
        [SerializeField] private Slider _hpBar;
        [SerializeField] private TMP_Text _hpText;

        [Header("EXP")]
        [SerializeField] private Slider _expBar;
        [SerializeField] private TMP_Text _levelText;

        [Header("Kill Progress")]
        [SerializeField] private TMP_Text _killText;
        [SerializeField] private TMP_Text _bossGateText;

        [Header("Active Skill")]
        [SerializeField] private Image _skillCooldownFill;
        [SerializeField] private TMP_Text _skillNameText;

        private GameObject _player;

        private void Update()
        {
            if (_player == null)
                _player = GameObject.FindGameObjectWithTag("Player");
            if (_player == null) return;

            // HP
            var hp = _player.GetComponent<HealthComponent>();
            if (hp != null && _hpBar != null)
            {
                _hpBar.value = hp.HpRatio;
                if (_hpText != null) _hpText.text = $"{(int)hp.CurrentHp}/{(int)hp.MaxHp}";
            }

            // EXP / Level
            var stats = _player.GetComponent<Player.PlayerStats>();
            if (stats != null)
            {
                if (_expBar != null) _expBar.value = stats.ExpRatio;
                if (_levelText != null) _levelText.text = $"Lv.{stats.Level}";
                if (_killText != null) _killText.text = $"Kills: {stats.KillCount}";
            }

            // Active Skill Cooldown
            var skill = _player.GetComponent<Skills.ActiveSkillHolder>();
            if (skill != null)
            {
                if (_skillCooldownFill != null) _skillCooldownFill.fillAmount = skill.CooldownRatio;
                if (_skillNameText != null) _skillNameText.text = skill.SkillName;
            }
        }

        public void SetBossGateStatus(bool open, int kills, int required)
        {
            if (_bossGateText != null)
                _bossGateText.text = open ? "BOSS GATE OPEN!" : $"Kills: {kills}/{required}";
        }
    }
}
