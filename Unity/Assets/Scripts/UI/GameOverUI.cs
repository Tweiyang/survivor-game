using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SurvivorGame.Core;

namespace SurvivorGame.UI
{
    /// <summary>
    /// GameOverUI — 死亡/通关界面
    /// Web equivalent: GameOverUI.js
    /// </summary>
    public class GameOverUI : MonoBehaviour
    {
        [SerializeField] private GameObject _panel;
        [SerializeField] private TMP_Text _titleText;
        [SerializeField] private TMP_Text _statsText;
        [SerializeField] private Button _retryButton;
        [SerializeField] private Button _menuButton;

        private void OnEnable()
        {
            EventBus.On<GameOverEvent>(OnGameOver);
            EventBus.On<LevelCompleteEvent>(OnLevelComplete);
            _retryButton?.onClick.AddListener(OnRetry);
            _menuButton?.onClick.AddListener(OnMenu);
            _panel?.SetActive(false);
        }

        private void OnDisable()
        {
            EventBus.Off<GameOverEvent>(OnGameOver);
            EventBus.Off<LevelCompleteEvent>(OnLevelComplete);
        }

        private void OnGameOver(GameOverEvent evt)
        {
            Show("GAME OVER", evt.Victory);
        }

        private void OnLevelComplete(LevelCompleteEvent evt)
        {
            Show($"LEVEL {evt.LevelIndex + 1} COMPLETE!", true);
        }

        private void Show(string title, bool victory)
        {
            _panel?.SetActive(true);
            if (_titleText != null)
            {
                _titleText.text = title;
                _titleText.color = victory ? Color.green : Color.red;
            }
            var player = GameObject.FindGameObjectWithTag("Player");
            var stats = player?.GetComponent<Player.PlayerStats>();
            if (_statsText != null && stats != null)
                _statsText.text = $"Level: {stats.Level}\nKills: {stats.KillCount}";
            Time.timeScale = 0f;
        }

        private void OnRetry()
        {
            Time.timeScale = 1f;
            GameManager.Instance?.LoadBattleScene();
        }

        private void OnMenu()
        {
            Time.timeScale = 1f;
            GameManager.Instance?.LoadCharacterSelectScene();
        }
    }
}
