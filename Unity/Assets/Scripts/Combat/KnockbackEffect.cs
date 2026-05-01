using UnityEngine;

namespace SurvivorGame.Combat
{
    /// <summary>
    /// KnockbackEffect — 击退效果组件（可选挂载）
    /// </summary>
    public class KnockbackEffect : MonoBehaviour
    {
        private Rigidbody2D _rb;
        private float _drag = 8f;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
        }

        public void Apply(Vector2 direction, float force)
        {
            if (_rb == null) return;
            _rb.AddForce(direction.normalized * force, ForceMode2D.Impulse);
        }
    }
}
