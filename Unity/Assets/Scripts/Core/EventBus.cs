using System;
using System.Collections.Generic;

namespace SurvivorGame.Core
{
    /// <summary>
    /// EventBus — 全局事件总线（静态）
    /// Web equivalent: EventSystem.js
    /// </summary>
    public static class EventBus
    {
        private static readonly Dictionary<Type, List<Delegate>> _listeners = new();

        public static void On<T>(Action<T> handler) where T : struct
        {
            var type = typeof(T);
            if (!_listeners.ContainsKey(type))
                _listeners[type] = new List<Delegate>();
            _listeners[type].Add(handler);
        }

        public static void Off<T>(Action<T> handler) where T : struct
        {
            var type = typeof(T);
            if (_listeners.ContainsKey(type))
                _listeners[type].Remove(handler);
        }

        public static void Emit<T>(T evt) where T : struct
        {
            var type = typeof(T);
            if (!_listeners.ContainsKey(type)) return;
            // 复制列表防止遍历中修改
            var copy = new List<Delegate>(_listeners[type]);
            foreach (var d in copy)
                ((Action<T>)d)?.Invoke(evt);
        }

        public static void Clear()
        {
            _listeners.Clear();
        }
    }
}
