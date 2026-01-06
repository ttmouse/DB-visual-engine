/**
 * 音效管理服务
 * 使用 Web Audio API 生成简单音效，避免依赖外部文件
 */

class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // 从 localStorage 读取用户偏好
    const saved = localStorage.getItem('unimage_sound_enabled');
    this.enabled = saved !== 'false'; // 默认启用
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('unimage_sound_enabled', String(enabled));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // 停止所有音效
  stopAll() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().then(() => {
        // Resume immediately or later? The user wants "Stop". 
        // Suspending effectively stops sound.
        // We can just create a new context next time or resume it when needed.
        // For now, let's just close it or suspend.
        this.audioContext?.close();
        this.audioContext = null;
      });
    }
  }

  // 开始音效 - 轻快的上升音
  playStart() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // 步骤完成音效 - 简短的确认音
  playStepComplete() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // 全部完成音效 - 愉悦的和弦
  playComplete() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();

      // 播放和弦 (C-E-G)
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);

        oscillator.start(ctx.currentTime + i * 0.1);
        oscillator.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // 错误音效 - 低沉的警告音
  playError() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 200;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }
}

export const soundService = new SoundService();
