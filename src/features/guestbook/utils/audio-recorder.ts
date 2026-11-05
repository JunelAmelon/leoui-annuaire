/**
 * Utilitaire Web Audio API & MediaRecorder pour l'enregistrement vocal
 * Compatible iOS Safari, Chrome Android et navigateurs de bureau.
 */

export interface RecordingResult {
  blob: Blob;
  base64: string;
  durationSec: number;
  waveform: number[];
  mimeType: string;
  sizeBytes: number;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private timerIntervalId: any = null;

  private startTime = 0;
  private elapsedSeconds = 0;
  private maxDurationSeconds: number;
  private collectedWaveform: number[] = [];

  private onTickCallback?: (seconds: number, instantLevel: number) => void;
  private onMaxReachedCallback?: () => void;

  constructor(maxDurationSeconds = 120) {
    this.maxDurationSeconds = maxDurationSeconds;
  }

  /**
   * Vérifie la disponibilité du micro dans le navigateur
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder === 'function'
    );
  }

  /**
   * Démarre la capture micro et l'enregistrement
   */
  async start(
    onTick?: (seconds: number, instantLevel: number) => void,
    onMaxReached?: () => void
  ): Promise<void> {
    this.onTickCallback = onTick;
    this.onMaxReachedCallback = onMaxReached;
    this.audioChunks = [];
    this.collectedWaveform = [];
    this.elapsedSeconds = 0;

    // 1. Accès au micro
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 2. Détection du type MIME le plus adapté au navigateur
    const mimeType = this.getSupportedMimeType();

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: mimeType || undefined,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // 3. Analyseur audio pour forme d'onde en temps réel
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
      }
    } catch (e) {
      console.warn('AudioContext analyser non disponible:', e);
    }

    this.mediaRecorder.start(250); // morceaux de 250ms
    this.startTime = Date.now();

    // 4. Boucle de chronomètre et d'échantillonnage de la forme d'onde
    this.timerIntervalId = setInterval(() => {
      this.elapsedSeconds = (Date.now() - this.startTime) / 1000;

      let level = 0.1;
      if (this.analyser) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        // Moyenne d'amplitude normalisée entre 0.05 et 1.0
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / (dataArray.length || 1);
        level = Math.max(0.08, Math.min(1.0, avg / 128));
      }

      // Collecter pour la forme d'onde finale
      if (this.collectedWaveform.length < 100) {
        this.collectedWaveform.push(Number(level.toFixed(2)));
      }

      if (this.onTickCallback) {
        this.onTickCallback(Math.floor(this.elapsedSeconds), level);
      }

      if (this.elapsedSeconds >= this.maxDurationSeconds) {
        if (this.onMaxReachedCallback) {
          this.onMaxReachedCallback();
        }
        this.stop();
      }
    }, 200);
  }

  /**
   * Arrête l'enregistrement et retourne les données audio + forme d'onde
   */
  async stop(): Promise<RecordingResult> {
    this.cleanupTimer();

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Aucun enregistrement actif'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const finalMime = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: finalMime });
          const base64 = await this.blobToBase64(blob);

          // Normalisation finale de la forme d'onde sur 50 barres représentatives
          const sampledWaveform = this.sampleWaveform(this.collectedWaveform, 50);

          this.releaseResources();

          resolve({
            blob,
            base64,
            durationSec: Math.max(1, Math.round(this.elapsedSeconds)),
            waveform: sampledWaveform,
            mimeType: finalMime,
            sizeBytes: blob.size,
          });
        } catch (err) {
          this.releaseResources();
          reject(err);
        }
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  /**
   * Annule et nettoie sans sauvegarder
   */
  cancel(): void {
    this.cleanupTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.releaseResources();
  }

  private cleanupTimer(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private releaseResources(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.mediaRecorder = null;
    this.analyser = null;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // On conserve la dataURL complète avec son préfixe base64
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Ré-échantillonne un tableau de nombres vers une longueur cible N
   */
  private sampleWaveform(source: number[], targetLength: number): number[] {
    if (source.length === 0) {
      return Array(targetLength).fill(0.2);
    }
    if (source.length <= targetLength) {
      const padded = [...source];
      while (padded.length < targetLength) {
        padded.push(0.1);
      }
      return padded;
    }

    const step = source.length / targetLength;
    const sampled: number[] = [];
    for (let i = 0; i < targetLength; i++) {
      const idx = Math.floor(i * step);
      sampled.push(source[idx] || 0.1);
    }
    return sampled;
  }
}
