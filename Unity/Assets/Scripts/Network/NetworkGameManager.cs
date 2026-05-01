using System;
using System.Threading.Tasks;
using UnityEngine;
using SurvivorGame.Core;

namespace SurvivorGame.Network
{
    /// <summary>
    /// NetworkGameManager — Colyseus 客户端连接管理（单例）
    /// Web equivalent: NetworkManager.js
    /// 
    /// 依赖: colyseus-unity SDK (com.colyseus.sdk)
    /// 安装: Unity Package Manager → Add package from git URL:
    ///   https://github.com/colyseus/colyseus-unity3d.git#upm
    /// 
    /// 重要: 复用现有 Node.js Colyseus 服务端，不需要重写服务端!
    /// </summary>
    public class NetworkGameManager : MonoBehaviour
    {
        public static NetworkGameManager Instance { get; private set; }

        [Header("Server Config")]
        [SerializeField] private string _serverUrl = "ws://localhost:2567";
        [SerializeField] private string _productionUrl = "wss://your-service.onrender.com";
        [SerializeField] private float _connectTimeout = 5f;

        // Colyseus client/room references (require SDK import)
        // private Colyseus.ColyseusClient _client;
        // private Colyseus.ColyseusRoom<BattleState> _room;

        public bool IsConnected { get; private set; }
        public string SessionId { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public string ResolveServerUrl()
        {
#if UNITY_EDITOR
            return _serverUrl; // 本地开发
#else
            return _productionUrl; // 生产环境
#endif
        }

        /// <summary>
        /// 连接到 Colyseus 服务器
        /// 实际实现需要 colyseus-unity SDK
        /// </summary>
        public async Task<bool> Connect()
        {
            string url = ResolveServerUrl();
            Debug.Log($"[Network] Connecting to {url}...");

            try
            {
                // TODO: 安装 colyseus-unity SDK 后取消注释
                // _client = new Colyseus.ColyseusClient(url);
                
                // 模拟连接
                await Task.Delay(100);
                IsConnected = true;
                EventBus.Emit(new NetworkConnectedEvent());
                Debug.Log("[Network] Connected!");
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Connection failed: {e.Message}");
                IsConnected = false;
                return false;
            }
        }

        /// <summary>
        /// 创建或加入战斗房间
        /// </summary>
        public async Task<bool> JoinOrCreateRoom(string characterId)
        {
            if (!IsConnected)
            {
                bool ok = await Connect();
                if (!ok) return false;
            }

            try
            {
                Debug.Log($"[Network] Joining room with character: {characterId}");
                
                // TODO: colyseus-unity SDK 实际调用
                // _room = await _client.JoinOrCreate<BattleState>("battle", new {
                //     characterId = characterId
                // });
                // SessionId = _room.SessionId;
                // BindRoomEvents();
                
                SessionId = Guid.NewGuid().ToString().Substring(0, 8);
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Network] Join room failed: {e.Message}");
                return false;
            }
        }

        /// <summary>
        /// 发送输入到服务端
        /// </summary>
        public void SendInput(float dx, float dy, float dt, int seq)
        {
            if (!IsConnected) return;
            // _room?.Send("input", new { seq, dx, dy, dt });
        }

        /// <summary>
        /// 发送准备就绪
        /// </summary>
        public void SendReady()
        {
            if (!IsConnected) return;
            // _room?.Send("ready", new {});
        }

        /// <summary>
        /// 发送技能选择
        /// </summary>
        public void SendSkillChoice(string skillId)
        {
            if (!IsConnected) return;
            // _room?.Send("skillChoice", new { skillId });
        }

        /// <summary>
        /// 离开房间
        /// </summary>
        public async void LeaveRoom()
        {
            // if (_room != null) await _room.Leave();
            // _room = null;
            IsConnected = false;
            SessionId = null;
            EventBus.Emit(new NetworkDisconnectedEvent());
        }

        public void Disconnect()
        {
            LeaveRoom();
            // _client = null;
        }

        /*
        // 安装 SDK 后启用:
        private void BindRoomEvents()
        {
            // 状态同步
            _room.State.players.OnAdd((key, player) => {
                EventBus.Emit(new PlayerJoinedEvent { SessionId = key, CharacterId = player.characterId });
            });
            _room.State.players.OnRemove((key, player) => {
                EventBus.Emit(new PlayerLeftEvent { SessionId = key });
            });
            
            // 自定义消息
            _room.OnMessage<DamageEventMsg>("damageEvent", msg => {
                // 播放伤害特效/飘字
            });
            _room.OnMessage<LevelUpMsg>("levelUp", msg => {
                // 处理升级
            });
        }
        */

        private void OnDestroy()
        {
            Disconnect();
        }
    }
}
