"use client";

class AudioSynth {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private bgmOscillators: OscillatorNode[] = [];
    private bgmGain: GainNode | null = null;
    private isMuted: boolean = false;
    private loops: Record<string, NodeJS.Timeout> = {};

    constructor() {
        if (typeof window !== "undefined") {
            // Initialize on user interaction usually, but we prepare here
        }
    }

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.5; // Default volume
        }
        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    toggleMute(muted: boolean) {
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx!.currentTime, 0.1);
        }
    }

    stopBGM() {
        this.bgmOscillators.forEach((osc) => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) { }
        });
        this.bgmOscillators = [];
        if (this.bgmGain) {
            this.bgmGain.disconnect();
            this.bgmGain = null;
        }
        // Clear any scheduling intervals
        Object.values(this.loops).forEach(clearInterval);
        this.loops = {};
    }

    // --- Sounds ---

    playJoin() {
        if (this.isMuted) return;
        this.init();
        const t = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.type = "sine";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.start(t);
        osc.stop(t + 0.5);
    }

    playCountdown() {
        if (this.isMuted) return;
        this.init();
        const t = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.type = "square";
        osc.frequency.setValueAtTime(880, t);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    playReveal() {
        if (this.isMuted) return;
        this.init();
        const t = this.ctx!.currentTime;
        // Major chord arpeggio
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = "triangle";
            osc.frequency.value = freq;

            const start = t + i * 0.05;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 1.5);

            osc.start(start);
            osc.stop(start + 1.5);
        });
    }

    playWin() {
        if (this.isMuted) return;
        this.stopBGM();
        this.init();
        const t = this.ctx!.currentTime;

        // Victory Fanfare Melody (Simple)
        const notes = [
            { f: 523.25, d: 0.2, s: 0 }, // C5
            { f: 523.25, d: 0.2, s: 0.2 }, // C5
            { f: 523.25, d: 0.2, s: 0.4 }, // C5
            { f: 659.25, d: 0.6, s: 0.6 }, // E5
            { f: 783.99, d: 0.6, s: 1.2 }, // G5
            { f: 1046.50, d: 1.2, s: 1.8 } // C6
        ];

        notes.forEach(note => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = "sawtooth";
            osc.frequency.value = note.f;

            const start = t + note.s;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, start + note.d);

            osc.start(start);
            osc.stop(start + note.d);
        });
    }

    // --- Background Music (Loops) ---

    playLobbyBGM() {
        if (this.isMuted) return;
        this.stopBGM();
        this.init();

        // Simple funky bass loop
        const playBass = () => {
            const t = this.ctx!.currentTime;
            const notes = [220, 261.63, 293.66, 329.63]; // A3, C4, D4, E4
            const note = notes[Math.floor(Math.random() * notes.length)];

            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = "square";
            osc.frequency.value = note / 2; // Bass

            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

            osc.start(t);
            osc.stop(t + 0.4);
        };

        const playChord = () => {
            const t = this.ctx!.currentTime;
            [440, 554.37, 659.25].forEach((freq, i) => { // A Major
                const osc = this.ctx!.createOscillator();
                const gain = this.ctx!.createGain();
                osc.connect(gain);
                gain.connect(this.masterGain!);

                osc.type = "sine";
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0, t + 2);

                osc.start(t);
                osc.stop(t + 2);
            });
        }

        this.loops['lobbyBass'] = setInterval(playBass, 500); // 120 BPM quarter notes
        this.loops['lobbyChord'] = setInterval(playChord, 2000); // Every bar
    }

    playQuestionBGM() {
        if (this.isMuted) return;
        this.stopBGM();
        this.init();

        // Cyber Suspense Theme
        const bpm = 120;
        const beatTime = 60 / bpm; // 0.5s
        let step = 0;

        const playBeat = () => {
            if (this.ctx?.state === "suspended") this.ctx.resume();
            const t = this.ctx!.currentTime;

            // 1. Driving Bass (Kick-ish) - On every beat
            const bassOsc = this.ctx!.createOscillator();
            const bassGain = this.ctx!.createGain();
            const bassFilter = this.ctx!.createBiquadFilter();

            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(this.masterGain!);

            bassOsc.type = "sawtooth";
            bassOsc.frequency.setValueAtTime(60, t);
            bassOsc.frequency.exponentialRampToValueAtTime(30, t + 0.2);

            bassFilter.type = "lowpass";
            bassFilter.frequency.setValueAtTime(300, t);
            bassFilter.frequency.exponentialRampToValueAtTime(50, t + 0.2);

            bassGain.gain.setValueAtTime(0.3, t);
            bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            bassOsc.start(t);
            bassOsc.stop(t + 0.3);

            // 2. High Tension Ping - Randomly on off-beats
            if (Math.random() > 0.5) {
                const pingOsc = this.ctx!.createOscillator();
                const pingGain = this.ctx!.createGain();

                pingOsc.connect(pingGain);
                pingGain.connect(this.masterGain!);

                pingOsc.type = "sine";
                // Random high note from pentatonic scale (E5, G5, A5, B5, D6)
                const freq = [659.25, 783.99, 880.00, 987.77, 1174.66][Math.floor(Math.random() * 5)];
                pingOsc.frequency.setValueAtTime(freq, t);

                pingGain.gain.setValueAtTime(0, t);
                pingGain.gain.linearRampToValueAtTime(0.05, t + 0.05);
                pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

                pingOsc.start(t);
                pingOsc.stop(t + 0.5);
            }

            // 3. Shaker / Hi-hat (White Noise Burst) - Every half beat
            // We'll simulate noise with a high frequency random oscillator for simplicity
            const hatOsc = this.ctx!.createOscillator();
            const hatGain = this.ctx!.createGain();

            hatOsc.connect(hatGain);
            hatGain.connect(this.masterGain!);

            hatOsc.type = "square";
            // Randomize frequency slightly for noise-like texture
            hatOsc.frequency.setValueAtTime(8000 + Math.random() * 2000, t);

            hatGain.gain.setValueAtTime(0.02, t);
            hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            hatOsc.start(t + beatTime / 2); // Play on the "&" of the beat
            hatOsc.stop(t + beatTime / 2 + 0.05);

            step++;
        };

        this.loops['questionBeat'] = setInterval(playBeat, beatTime * 1000);
    }
}

export const audioSynth = new AudioSynth();
