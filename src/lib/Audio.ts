import type { Movement } from "./Movement";
import { timeToBeat } from "./utils";

export class PlaybackEngine {
  private context: AudioContext;
  private audioFile?: AudioBuffer;
  private bus?: GainNode;
  private activeNodes: AudioScheduledSourceNode[] = [];
  private trackStart: number | null = null;
  private movement?: Movement;

  constructor() {
    this.context = new AudioContext();
    this.context.suspend();
  }

  async setTrack(buffer: ArrayBuffer) {
    this.stop();
    this.audioFile = await this.context.decodeAudioData(buffer);
  }

  clearAudio(){
    this.audioFile = undefined;
  }

  canPlay(){
    return !!this.audioFile;
  }

  async play(movement: Movement) {
    this.stop();

    if (!this.audioFile) {
      throw new Error("Missing audio file.");
    }

    this.movement = movement;

    const bus = this.context.createGain();
    bus.connect(this.context.destination);
    this.bus = bus;

    const beatsPerBar = movement.meter[0]?.beatsPerBar ?? 4;
    const bpm = movement.tempo[0]?.bpm ?? 120;

    const startAt = this.context.currentTime + 0.05;
    this.trackStart = this.queueCountIn(bus, startAt, beatsPerBar, 60 / bpm);
    this.queueTrack(this.trackStart, movement.audio.offsetMs ?? 0, movement.audio.leadInBeats ?? 0, bpm);

    await this.context.resume();
  }

  stop() {
    for (const node of this.activeNodes) {
      node.onended = null;

      try {
        node.stop();
      } catch {
        //already stopped
      }

      node.disconnect();
    }

    this.activeNodes = [];
    this.bus?.disconnect();
    this.bus = undefined;
    this.trackStart = null;
  }

  getCurrentBeat(){
    if(this.trackStart === null || !this.movement || this.context.state != 'running'){
        return null;
    }

    if(this.context.currentTime < this.trackStart){
        return -1;
    }

    return timeToBeat(this.movement!.tempo, 0, this.context.currentTime - this.trackStart, 1);
  }

  private queueCountIn(
    out: AudioNode,
    startAt: number,
    clicksPerBar: number,
    interval: number,
  ) {
    const totalCounts = clicksPerBar * 2; //2 bar count in;

    for (let i = 0; i < totalCounts; i++) {
      const time = startAt + i * interval;
      const osc = this.context.createOscillator();
      const env = this.context.createGain();

      osc.frequency.value = i % clicksPerBar === 0 ? 1600 : 1000; // accent the first click

      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(0.8, time + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

      osc.connect(env).connect(out);
      osc.start(time);
      osc.stop(time + 0.06);

      this.track(osc);
    }

    return startAt + totalCounts * interval;
  }

  private queueTrack(startAt: number, trackOffsetMs: number, leadInBeats: number, bpm: number){
    const offset = leadInBeats * (60 / bpm);
    const source = this.context.createBufferSource();

    source.buffer = this.audioFile!;
    source.connect(this.bus!);
    source.start(Math.max(startAt - offset - (trackOffsetMs / 1000.0), 0));

    this.track(source);
  }

  private track(node: AudioScheduledSourceNode) {
    this.activeNodes.push(node);
    node.onended = () => {
      this.activeNodes = this.activeNodes.filter((n) => n !== node);

      if(this.activeNodes.length == 0){
        this.stop();
      }
    };
  }
}
