import { DEFAULT_BPM, type MeterConfig, type TempoConfig } from "./Movement";

export function locate(meter: MeterConfig[], beat: number) {
  let start = 0; 

  for (let i = 0; i < meter.length; i++) {
    const run = meter[i]!;
    const next = meter[i + 1];
    const runBeats = next ? (next.fromBar - run.fromBar) * run.beatsPerBar : Infinity;

    if (beat < start + runBeats) {
      const bars = Math.floor((beat - start) / run.beatsPerBar + 1e-9);
      return {
        bar: run.fromBar + bars,
        beatInBar: beat - start - bars * run.beatsPerBar + 1,
      };
    }

    start += runBeats;
  }

  return null;
}

export function barToBeat(meter: MeterConfig[], bar: number, beatInBar: number): number | null {
  let start = 0;
  
  for (let i = 0; i < meter.length; i++) {
    const run = meter[i]!;
    const next = meter[i + 1];

    if (!next || bar < next.fromBar) {
      if (bar < run.fromBar || beatInBar < 1 || beatInBar >= run.beatsPerBar + 1) {
        return null;
      }

      return start + (bar - run.fromBar) * run.beatsPerBar + (beatInBar - 1);
    }

    start += (next.fromBar - run.fromBar) * run.beatsPerBar;
  }

  return null;
}

export function timeToBeat(tempo: TempoConfig[], fromBeat: number, seconds: number, scale = 1): number {
  let beat = fromBeat;
  let remaining = seconds;

  for (let i = 0; i < tempo.length; i++) {
    const { bpm } = tempo[i]!;
    const segEnd = tempo[i + 1]?.beat ?? Infinity;

    if (segEnd <= beat){
        continue;
    }

    const segSeconds = ((segEnd - beat) * 60) / (bpm * scale);
    if (remaining <= segSeconds){
        return beat + (remaining * bpm * scale) / 60;
    } 

    remaining -= segSeconds;
    beat = segEnd;
  }

  return beat;
}

export function beatToSeconds(tempo: TempoConfig[], beat: number): number {
  if (beat < 0) {
    return (beat * 60) / tempo[0]!.bpm;
  }

  let seconds = 0;

  for (let i = 0; i < tempo.length && tempo[i]!.beat < beat; i++) {
    const to = Math.min(tempo[i + 1]?.beat ?? Infinity, beat);
    seconds += ((to - tempo[i]!.beat) * 60) / tempo[i]!.bpm;
  }

  return seconds;
}

export function isUnique<T>(arr: T[]): boolean{
    const seen = new Set<T>();

    for(let item of arr){
        if(seen.has(item)){
            return false;
        }

        seen.add(item);
    }

    return true;
}

export function getFileName(file: File){
    const parts = file.name.split(".");
    parts.pop();
    return parts.join(".");
}

export function bpmAt(tempo: TempoConfig[], beat: number){
    const match = tempo.findLast(t => t.beat <= beat);
    
    if(match){
        return match.bpm;
    }

    return tempo[0]?.bpm ?? DEFAULT_BPM;
}

export function meterAt(meter: MeterConfig[], beat: number){
    let currBeat = 0;

    for(let i = 0; i < meter.length; i++){
        const startBar = meter[i]!.fromBar;
        const endBar = meter[i + 1]?.fromBar ?? Infinity;
        const totalBeats = (endBar - startBar) * meter[i]!.beatsPerBar;
        
        if(currBeat + totalBeats > beat){
            return meter[i];
        }

        currBeat += totalBeats;
    }

    return meter[meter.length - 1];
}