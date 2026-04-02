using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SurvivorGame.Core;

namespace SurvivorGame.UI
{
    /// <summary>
    /// SkillSelectUI — 升级三选一弹窗
    /// Web equivalent: SkillSelectUI.js
    /// </summary>
    public class SkillSelectUI : MonoBehaviour
    {
        [SerializeField] private GameObject _panel;
        [SerializeField] private SkillOptionCard[] _cards;

        private string[] _currentOptions;
        private Skills.SkillManager _skillManager;

        private void OnEnable()
        {
            EventBus.On<PlayerLevelUpEvent>(OnLevelUp);
            _panel?.SetActive(false);
        }

        private void OnDisable()
        {
            EventBus.Off<PlayerLevelUpEvent>(OnLevelUp);
        }

        private void OnLevelUp(PlayerLevelUpEvent evt)
        {
            var player = GameObject.FindGameObjectWithTag("Player");
            _skillManager = player?.GetComponent<Skills.SkillManager>();
            if (_skillManager == null) return;

            _currentOptions = _skillManager.GetThreeOptions();
            ShowOptions();
        }

        private void ShowOptions()
        {
            _panel?.SetActive(true);
            Time.timeScale = 0f;

            for (int i = 0; i < _cards.Length; i++)
            {
                if (i < _currentOptions.Length)
                {
                    var data = _skillManager.FindData(_currentOptions[i]);
                    _cards[i].gameObject.SetActive(true);
                    _cards[i].Setup(data, _skillManager.GetLevel(_currentOptions[i]));
                    int idx = i;
                    _cards[i].Button.onClick.RemoveAllListeners();
                    _cards[i].Button.onClick.AddListener(() => OnSelect(idx));
                }
                else
                {
                    _cards[i].gameObject.SetActive(false);
                }
            }
        }

        private void OnSelect(int index)
        {
            if (index >= _currentOptions.Length) return;
            string skillId = _currentOptions[index];
            _skillManager?.AddSkill(skillId);
            EventBus.Emit(new SkillSelectedEvent { SkillId = skillId });

            _panel?.SetActive(false);
            Time.timeScale = 1f;
        }
    }

    [System.Serializable]
    public class SkillOptionCard
    {
        public GameObject gameObject;
        public TMP_Text NameText;
        public TMP_Text DescText;
        public TMP_Text LevelText;
        public Image IconImage;
        public Button Button;

        public void Setup(Skills.SkillData data, int currentLevel)
        {
            if (data == null) return;
            if (NameText != null) NameText.text = data.DisplayName;
            if (DescText != null) DescText.text = data.Description;
            if (LevelText != null) LevelText.text = currentLevel > 0 ? $"Lv.{currentLevel} -> Lv.{currentLevel + 1}" : "NEW!";
            if (IconImage != null && data.Icon != null) IconImage.sprite = data.Icon;
        }
    }
}
