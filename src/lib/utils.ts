import type { MeterConfig } from "./Movement";

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