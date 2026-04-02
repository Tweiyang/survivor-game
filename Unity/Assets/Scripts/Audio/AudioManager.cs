using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Audio;
using SurvivorGame.Core;

namespace SurvivorGame.Audio
{
    /// <summary>
    /// AudioManager — 音频管理（单例）
    /// Web equivalent: AudioManager.js + BGMController.js
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("Mixer")]
        [SerializeField] private AudioMixerGroup _sfxGroup;
        [SerializeField] private AudioMixerGroup _bgmGroup;

        [Header("BGM")]
        [SerializeField] private AudioSource _bgmSource;
        [SerializeField] private AudioClip _battleBGM;
        [SerializeField] private AudioClip _menuBGM;

        [Header("SFX Library")]
        [SerializeField] private SfxEntry[] _sfxLibrary;

        private Dictionary<string, AudioClip> _sfxMap = new();
        private List<AudioSource> _sfxPool = new();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            foreach (var entry in _sfxLibrary)
                if (!string.IsNullOrEmpty(entry.Id) && entry.Clip != null)
                    _sfxMap[entry.Id] = entry.Clip;

            // 预创建 SFX 音源池
            for (int i = 0; i < 8; i++)
            {
                var src = gameObject.AddComponent<AudioSource>();
                src.playOnAwake = false;
                if (_sfxGroup != null) src.outputAudioMixerGroup = _sfxGroup;
                _sfxPool.Add(src);
            }

            if (_bgmSource == null)
            {
                _bgmSource = gameObject.AddComponent<AudioSource>();
                _bgmSource.loop = true;
                if (_bgmGroup != null) _bgmSource.outputAudioMixerGroup = _bgmGroup;
            }
        }

        private void OnEnable()
        {
            EventBus.On<SfxRequestEvent>(OnSfxRequest);
        }

        private void OnDisable()
        {
            EventBus.Off<SfxRequestEvent>(OnSfxRequest);
        }

        public void PlaySFX(string id)
        {
            if (!_sfxMap.ContainsKey(id)) return;
            var src = GetAvailableSource();
            if (src != null)
            {
                src.clip = _sfxMap[id];
                src.Play();
            }
        }

        public void PlayBGM(string id)
        {
            AudioClip clip = id switch
            {
                "battle" => _battleBGM,
                "menu" => _menuBGM,
                _ => null
            };
            if (clip == null) return;
            if (_bgmSource.clip == clip && _bgmSource.isPlaying) return;
            _bgmSource.clip = clip;
            _bgmSource.Play();
        }

        public void StopBGM() => _bgmSource.Stop();
        public void PauseBGM() => _bgmSource.Pause();
        public void ResumeBGM() => _bgmSource.UnPause();

        private AudioSource GetAvailableSource()
        {
            foreach (var s in _sfxPool)
                if (!s.isPlaying) return s;
            return _sfxPool.Count > 0 ? _sfxPool[0] : null;
        }

        private void OnSfxRequest(SfxRequestEvent evt)
        {
            PlaySFX(evt.SoundId);
        }
    }

    [System.Serializable]
    public class SfxEntry
    {
        public string Id;
        public AudioClip Clip;
    }
}
