using System.Collections.Generic;
using UnityEngine;

namespace SurvivorGame.Core
{
    /// <summary>
    /// ObjectPool — 通用对象池
    /// Web equivalent: 无（Web版没有池化，Unity需要）
    /// </summary>
    public class ObjectPool : MonoBehaviour
    {
        [SerializeField] private GameObject _prefab;
        [SerializeField] private int _initialSize = 20;
        [SerializeField] private Transform _poolParent;

        private readonly Queue<GameObject> _available = new();
        private readonly HashSet<GameObject> _active = new();

        public int ActiveCount => _active.Count;
        public int AvailableCount => _available.Count;

        private void Awake()
        {
            if (_poolParent == null)
            {
                var go = new GameObject($"Pool_{_prefab?.name}");
                _poolParent = go.transform;
                _poolParent.SetParent(transform);
            }
            WarmUp(_initialSize);
        }

        public void Init(GameObject prefab, int size)
        {
            _prefab = prefab;
            _initialSize = size;
            WarmUp(size);
        }

        public void WarmUp(int count)
        {
            for (int i = 0; i < count; i++)
            {
                var obj = CreateNew();
                obj.SetActive(false);
                _available.Enqueue(obj);
            }
        }

        public GameObject Get(Vector3 position, Quaternion rotation)
        {
            GameObject obj;
            if (_available.Count > 0)
            {
                obj = _available.Dequeue();
            }
            else
            {
                obj = CreateNew();
            }

            obj.transform.position = position;
            obj.transform.rotation = rotation;
            obj.SetActive(true);
            _active.Add(obj);
            return obj;
        }

        public void Return(GameObject obj)
        {
            if (obj == null) return;
            obj.SetActive(false);
            _active.Remove(obj);
            _available.Enqueue(obj);
        }

        public void ReturnAll()
        {
            var list = new List<GameObject>(_active);
            foreach (var obj in list)
                Return(obj);
        }

        private GameObject CreateNew()
        {
            var obj = Instantiate(_prefab, _poolParent);
            obj.name = $"{_prefab.name}_{_available.Count + _active.Count}";
            return obj;
        }
    }
}
