/**
 * AudioManager — 音频系统核心
 * Unity equivalent: AudioManager + AudioSource 管理器
 *
 * 提供统一的音频播放 API，内部通过 WebAudioBackend 实现合成音效。
 * 迁移 Unity 时只需替换 Backend 实现。
 */

const VOLUME_STORAGE_KEY = 'game_audio_volumes';

// ============================================================
// WebAudioBackend — Web Audio API 合成音效后端
// Unity equivalent: 此层在 Unity 中被原生 AudioClip 替代
// ============================================================

class WebAudioBackend {
    constructor() {
        /** @type {AudioContext|null} */
        this._ctx = null;

        /** @type {GainNode|null} */
        this.masterGain = null;
        /** @type {GainNode|null} */
        this.sfxGain = null;
        /** @type {GainNode|null} */
        this.bgmGain = null;

        /** @type {Array<{osc: OscillatorNode, gain: GainNode, startTime: number}>} */
        this._activeSounds = [];
        this.maxConcurrent = 8;
    }

    /**
     * 懒初始化 AudioContext 和 GainNode 链路
     * masterGain → destination
     *   ├── sfxGain → masterGain
     *   └── bgmGain → masterGain
     */
    _ensureContext() {
        if (this._ctx) return this._ctx;

        this._ctx = new (window.AudioContext || window.webkitAudioContext)();

        // 三级 GainNode 链路
        this.masterGain = this._ctx.createGain();
        this.masterGain.connect(this._ctx.destination);

        this.sfxGain = this._ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        this.bgmGain = this._ctx.createGain();
        this.bgmGain.connect(this.masterGain);

        return this._ctx;
    }

    /** @returns {AudioContext} */
    get context() {
        return this._ensureContext();
    }

    /**
     * 恢复被浏览器暂停的 AudioContext
     */
    async resume() {
        if (this._ctx && this._ctx.state === 'suspended') {
            await this._ctx.resume();
        }
    }

    /**
     * 合成播放一个音效
     * @param {object} def - 音效定义 { wave, freq, duration, gain, filter? }
     */
    playSynth(def) {
        const ctx = this._ensureContext();

        // 限制最大并发数
        this._cleanupFinished();
        if (this._activeSounds.length >= this.maxConcurrent) {
            const oldest = this._activeSounds.shift();
            try { oldest.osc.stop(); } catch (e) { /* already stopped */ }
        }

        const now = ctx.currentTime;
        const duration = def.duration || 0.15;

        // OscillatorNode
        const osc = ctx.createOscillator();
        osc.type = def.wave || 'square';

        // 频率曲线
        const freqArr = def.freq || [440, 440];
        osc.frequency.setValueAtTime(freqArr[0], now);
        if (freqArr.length > 1 && freqArr[0] !== freqArr[1]) {
            osc.frequency.linearRampToValueAtTime(freqArr[1], now + duration);
        }

        // GainNode（音量包络: attack → sustain → release）
        const gainNode = ctx.createGain();
        const peakGain = def.gain || 0.3;
        const attack = Math.min(0.01, duration * 0.1);
        const release = Math.min(0.05, duration * 0.3);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(peakGain, now + attack);
        gainNode.gain.setValueAtTime(peakGain, now + duration - release);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        // 可选滤波器
        let lastNode = osc;
        if (def.filter) {
            const filter = ctx.createBiquadFilter();
            filter.type = def.filter.type || 'lowpass';
            filter.frequency.value = def.filter.frequency || 2000;
            filter.Q.value = def.filter.Q || 1;
            osc.connect(filter);
            filter.connect(gainNode);
            lastNode = filter;
        } else {
            osc.connect(gainNode);
        }

        gainNode.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + duration + 0.01);

        this._activeSounds.push({ osc, gain: gainNode, startTime: now, duration });

        // 自动清理
        osc.onended = () => {
            this._activeSounds = this._activeSounds.filter(s => s.osc !== osc);
        };
    }

    /**
     * 清理已结束的音效
     * @private
     */
    _cleanupFinished() {
        if (!this._ctx) return;
        const now = this._ctx.currentTime;
        this._activeSounds = this._activeSounds.filter(
            s => now < s.startTime + (s.duration || 1) + 0.05
        );
    }

    /**
     * 设置音量
     * @param {'master'|'sfx'|'bgm'} channel
     * @param {number} value 0~1
     */
    setVolume(channel, value) {
        this._ensureContext();
        const v = Math.max(0, Math.min(1, value));
        switch (channel) {
            case 'master': this.masterGain.gain.value = v; break;
            case 'sfx': this.sfxGain.gain.value = v; break;
            case 'bgm': this.bgmGain.gain.value = v; break;
        }
    }

    getVolume(channel) {
        if (!this.masterGain) return 1;
        switch (channel) {
            case 'master': return this.masterGain.gain.value;
            case 'sfx': return this.sfxGain.gain.value;
            case 'bgm': return this.bgmGain.gain.value;
            default: return 1;
        }
    }
}

// ============================================================
// AudioManager — 对外 API 单例
// Unity equivalent: AudioManager singleton
// ============================================================

export class AudioManager {
    /** @type {AudioManager|null} */
    static _instance = null;

    /**
     * 获取单例
     * @returns {AudioManager}
     */
    static getInstance() {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    constructor() {
        /** @type {WebAudioBackend} */
        this._backend = new WebAudioBackend();

        /** @type {Map<string, object>} SoundBank: soundId → definition */
        this._soundBank = new Map();

        /** @type {Map<string, object>} BGM 定义 */
        this._bgmBank = new Map();

        /** @type {import('./BGMController.js').BGMController|null} */
        this.bgmController = null;

        /** @type {boolean} */
        this._initialized = false;

        // 恢复音量设置
        this._restoreVolumes();
    }

    /**
     * 初始化音频系统，加载 sounds.json
     * @param {string} [basePath='assets/data']
     */
    async init(basePath = 'assets/data') {
        if (this._initialized) return;

        try {
            const res = await fetch(`${basePath}/sounds.json?t=${Date.now()}`);
            const data = await res.json();

            // 注册 SFX
            if (data.sfx) {
                for (const [id, def] of Object.entries(data.sfx)) {
                    this._soundBank.set(id, def);
                }
            }

            // 注册 BGM
            if (data.bgm) {
                for (const [id, def] of Object.entries(data.bgm)) {
                    this._bgmBank.set(id, def);
                }
            }

            console.log(`[AudioManager] Loaded ${this._soundBank.size} SFX, ${this._bgmBank.size} BGM`);
            this._initialized = true;
        } catch (e) {
            console.warn('[AudioManager] Failed to load sounds.json:', e);
        }
    }

    /**
     * 恢复被浏览器暂停的 AudioContext（需在用户交互后调用）
     */
    async resume() {
        await this._backend.resume();
        // 延迟初始化 BGMController（首次用户手势触发）
        if (this._deferredBGMInit) {
            this._deferredBGMInit();
            this._deferredBGMInit = null;
        }
    }

    /**
     * 播放一次性音效
     * @param {string} soundId - 音效 ID（对应 sounds.json 中的 key）
     * @param {object} [options] - 可选参数覆盖
     */
    playSFX(soundId, options = {}) {
        // 延迟初始化 BGMController（首次用户手势触发）
        if (this._deferredBGMInit) {
            this._deferredBGMInit();
            this._deferredBGMInit = null;
        }
        const def = this._soundBank.get(soundId);
        if (!def) {
            console.warn(`[AudioManager] Unknown sound: ${soundId}`);
            return;
        }

        // 合并覆盖参数
        const finalDef = { ...def, ...options };
        this._backend.playSynth(finalDef);
    }

    /**
     * 播放背景音乐
     * @param {string} bgmId
     */
    playBGM(bgmId) {
        if (!this.bgmController) {
            console.warn('[AudioManager] BGMController not set');
            return;
        }
        const def = this._bgmBank.get(bgmId);
        if (!def) {
            console.warn(`[AudioManager] Unknown BGM: ${bgmId}`);
            return;
        }
        this.bgmController.play(bgmId, def);
    }

    /**
     * 停止背景音乐
     * @param {number} [fadeOut=0.5] 淡出时长（秒）
     */
    stopBGM(fadeOut = 0.5) {
        if (this.bgmController) {
            this.bgmController.stop(fadeOut);
        }
    }

    /**
     * 交叉淡入淡出切换 BGM
     * @param {string} bgmId
     * @param {number} [duration=1.0]
     */
    crossfadeBGM(bgmId, duration = 1.0) {
        if (!this.bgmController) return;
        const def = this._bgmBank.get(bgmId);
        if (!def) {
            console.warn(`[AudioManager] Unknown BGM: ${bgmId}`);
            return;
        }
        this.bgmController.crossfade(bgmId, def, duration);
    }

    // ---- 音量控制 ----

    setMasterVolume(v) {
        this._backend.setVolume('master', v);
        this._saveVolumes();
    }

    setSFXVolume(v) {
        this._backend.setVolume('sfx', v);
        this._saveVolumes();
    }

    setBGMVolume(v) {
        this._backend.setVolume('bgm', v);
        this._saveVolumes();
    }

    getMasterVolume() { return this._backend.getVolume('master'); }
    getSFXVolume() { return this._backend.getVolume('sfx'); }
    getBGMVolume() { return this._backend.getVolume('bgm'); }

    /** @returns {WebAudioBackend} */
    get backend() { return this._backend; }

    // ---- 音量持久化 ----

    /** @private */
    _saveVolumes() {
        try {
            const data = {
                master: this.getMasterVolume(),
                sfx: this.getSFXVolume(),
                bgm: this.getBGMVolume()
            };
            localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* ignore */ }
    }

    /** @private */
    _restoreVolumes() {
        try {
            const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // 延迟设置，等 context 初始化后
                this._pendingVolumes = data;
            }
        } catch (e) { /* ignore */ }
    }

    /**
     * 应用待恢复的音量（在 context 初始化后调用）
     */
    applyPendingVolumes() {
        if (this._pendingVolumes) {
            if (this._pendingVolumes.master !== undefined) this.setMasterVolume(this._pendingVolumes.master);
            if (this._pendingVolumes.sfx !== undefined) this.setSFXVolume(this._pendingVolumes.sfx);
            if (this._pendingVolumes.bgm !== undefined) this.setBGMVolume(this._pendingVolumes.bgm);
            this._pendingVolumes = null;
        }
    }
}
