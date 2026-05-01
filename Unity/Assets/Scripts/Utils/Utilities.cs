using UnityEngine;

namespace SurvivorGame.Utils
{
    /// <summary>
    /// DifficultyScaler — 多人难度缩放
    /// Web equivalent: DifficultyScaler.ts
    /// </summary>
    public static class DifficultyScaler
    {
        /// <summary>
        /// multiplier = 1.0 + (playerCount - 1) * 0.5
        /// </summary>
        public static float GetMultiplier(int playerCount)
        {
            return 1f + (Mathf.Max(1, playerCount) - 1) * 0.5f;
        }
    }

    /// <summary>
    /// CameraFollow — 2D 相机跟随
    /// Web equivalent: CameraSystem.js
    /// </summary>
    public class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform _target;
        [SerializeField] private float _smoothSpeed = 5f;
        [SerializeField] private Vector3 _offset = new(0, 0, -10);

        private void LateUpdate()
        {
            if (_target == null)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null) _target = player.transform;
                else return;
            }

            Vector3 desired = _target.position + _offset;
            transform.position = Vector3.Lerp(transform.position, desired, _smoothSpeed * Time.deltaTime);
        }
    }

    /// <summary>
    /// DamagePopup — 伤害飘字
    /// Web equivalent: CombatSystem 的飘字逻辑
    /// </summary>
    public class DamagePopup : MonoBehaviour
    {
        [SerializeField] private TMPro.TMP_Text _text;
        [SerializeField] private float _floatSpeed = 1.5f;
        [SerializeField] private float _lifetime = 0.8f;
        private float _timer;

        public void Init(float damage, bool isCrit)
        {
            if (_text != null)
            {
                _text.text = ((int)damage).ToString();
                _text.color = isCrit ? Color.yellow : Color.white;
                _text.fontSize = isCrit ? 28 : 20;
            }
            _timer = _lifetime;
        }

        private void Update()
        {
            transform.position += Vector3.up * _floatSpeed * Time.deltaTime;
            _timer -= Time.deltaTime;
            if (_text != null)
                _text.alpha = Mathf.Clamp01(_timer / _lifetime);
            if (_timer <= 0) Destroy(gameObject);
        }
    }
}
