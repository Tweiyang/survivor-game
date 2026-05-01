/**
 * BGMController — 背景音乐控制器
 * Unity equivalent: AudioSource (loop=true) + AudioMixer Snapshot 过渡
 *
 * 使用简单音序器模式：按 BPM 和音符序列循环生成合成音符。
 */

// 音符名 → 频率映射表
const NOTE_FREQ = {
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
    'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00,
    'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
    'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
    'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
    'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
    'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.26,
    'A1': 55.00, 'A#1': 58.27, 'B1': 61.74, 'G1': 49.00
};

export class BGMController {
    /**
     * @param {AudioContext} ctx
     * @param {GainNode} bgmGain - BGM 增益节点
     */
    constructor(ctx, bgmGain) {
        /** @type {AudioContext} */
        this._ctx = ctx;

        /** @type {GainNode} */
        this._bgmGain = bgmGain;

        /** @type {string|null} */
        this.currentBgmId = null;

        /** @type {object|null} */
        this._currentDef = null;

        /** @type {number|null} */
        this._intervalId = null;

        /** @type {number} 当前音符索引（各轨道独立） */
        this._trackPositions = [];

        /** @type {boolean} */
        this.isPlaying = false;

        /** @type {boolean} */
        this._isPaused = false;

        /** @type {GainNode|null} 当前播放的增益节点（用于淡入淡出） */
        this._playGain = null;
    }

    /**
     * 播放 BGM
     * @param {string} bgmId
     * @param {object} def - BGM 定义 { bpm, tracks: [{ wave, gain, notes }] }
     */
    play(bgmId, def) {
        // 如果已在播放同一首，忽略
        if (this.currentBgmId === bgmId && this.isPlaying) return;

        this.stop(0); // 立即停止旧的

        this.currentBgmId = bgmId;
        this._currentDef = def;
        this._trackPositions = (def.tracks || []).map(() => 0);
        this.isPlaying = true;
        this._isPaused = false;

        // 创建独立增益用于淡入淡出
        this._playGain = this._ctx.createGain();
        this._playGain.gain.value = 1.0;
        this._playGain.connect(this._bgmGain);

        // 计算每拍间隔（毫秒）
        const bpm = def.bpm || 120;
        const beatInterval = (60 / bpm) * 1000;

        this._intervalId = setInterval(() => {
            if (this._isPaused) return;
            this._playNextBeat();
        }, beatInterval);

        // 立即播放第一拍
        this._playNextBeat();
    }

    /**
     * 停止 BGM
     * @param {number} [fadeOut=0.5] 淡出时长（秒）
     */
    stop(fadeOut = 0.5) {
        if (!this.isPlaying && !this._intervalId) return;

        if (fadeOut > 0 && this._playGain) {
            const now = this._ctx.currentTime;
            this._playGain.gain.setValueAtTime(this._playGain.gain.value, now);
            this._playGain.gain.linearRampToValueAtTime(0, now + fadeOut);

            // 延迟清理
            const intervalId = this._intervalId;
            setTimeout(() => {
                if (this._intervalId === intervalId) {
                    this._cleanup();
                }
            }, fadeOut * 1000 + 100);
        } else {
            this._cleanup();
        }
    }

    /**
     * 交叉淡入淡出切换 BGM
     * @param {string} newBgmId
     * @param {object} newDef
     * @param {number} [duration=1.0]
     */
    crossfade(newBgmId, newDef, duration = 1.0) {
        // 淡出旧的
        if (this.isPlaying) {
            this.stop(duration);
        }

        // 延迟一点开始新的（让淡出开始）
        setTimeout(() => {
            this.play(newBgmId, newDef);
            // 淡入新的
            if (this._playGain) {
                const now = this._ctx.currentTime;
                this._playGain.gain.setValueAtTime(0, now);
                this._playGain.gain.linearRampToValueAtTime(1.0, now + duration);
            }
        }, 50);
    }

    /** 暂停 BGM */
    pause() {
        this._isPaused = true;
    }

    /** 恢复 BGM */
    resume() {
        this._isPaused = false;
    }

    /**
     * 播放下一拍的所有音轨音符
     * @private
     */
    _playNextBeat() {
        if (!this._currentDef || !this._currentDef.tracks) return;

        const tracks = this._currentDef.tracks;

        for (let t = 0; t < tracks.length; t++) {
            const track = tracks[t];
            const notes = track.notes || [];
            if (notes.length === 0) continue;

            const pos = this._trackPositions[t] % notes.length;
            const noteName = notes[pos];
            this._trackPositions[t] = pos + 1;

            // '_' 表示休止符
            if (noteName === '_' || !noteName) continue;

            const freq = NOTE_FREQ[noteName];
            if (!freq) continue;

            this._playNote(freq, track.wave || 'triangle', track.gain || 0.1);
        }
    }

    /**
     * 播放单个音符
     * @private
     */
    _playNote(freq, wave, gain) {
        const ctx = this._ctx;
        const now = ctx.currentTime;
        const bpm = this._currentDef.bpm || 120;
        const noteDuration = (60 / bpm) * 0.8; // 音符占拍时值的 80%

        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.value = freq;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
        gainNode.gain.setValueAtTime(gain, now + noteDuration * 0.7);
        gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);

        osc.connect(gainNode);
        gainNode.connect(this._playGain || this._bgmGain);

        osc.start(now);
        osc.stop(now + noteDuration + 0.01);
    }

    /**
     * 清理播放资源
     * @private
     */
    _cleanup() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this.isPlaying = false;
        this._isPaused = false;
        this.currentBgmId = null;
        this._currentDef = null;
        this._trackPositions = [];

        if (this._playGain) {
            try { this._playGain.disconnect(); } catch (e) { /* ignore */ }
            this._playGain = null;
        }
    }
}
