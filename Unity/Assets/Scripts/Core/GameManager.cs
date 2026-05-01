using UnityEngine;

namespace SurvivorGame.Core
{
    /// <summary>
    /// GameManager — 全局游戏管理器（单例）
    /// 管理游戏状态、暂停、场景流转
    /// Web equivalent: main.js + GameLoop.js
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game State")]
        [SerializeField] private bool _isPaused;
        [SerializeField] private int _currentLevel = 1;

        public bool IsPaused => _isPaused;
        public int CurrentLevel => _currentLevel;

        // 选角传递
        public string SelectedCharacterId { get; set; } = "warrior";
        public bool IsOnlineMode { get; set; } = false;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void PauseGame()
        {
            _isPaused = true;
            Time.timeScale = 0f;
            EventBus.Emit(new GamePausedEvent());
        }

        public void ResumeGame()
        {
            _isPaused = false;
            Time.timeScale = 1f;
            EventBus.Emit(new GameResumedEvent());
        }

        public void TogglePause()
        {
            if (_isPaused) ResumeGame();
            else PauseGame();
        }

        public void SetLevel(int level)
        {
            _currentLevel = level;
        }

        public void LoadBattleScene()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene("Battle");
        }

        public void LoadCharacterSelectScene()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene("CharacterSelect");
        }

        public void LoadLobbyScene()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene("Lobby");
        }

        public void LoadMainMenuScene()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene("MainMenu");
        }
    }
}
