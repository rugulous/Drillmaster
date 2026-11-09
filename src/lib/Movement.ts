export type AudioConfig = {
    offsetMs?: number;
    leadInBeats?: number;
}

export type MeterConfig = {
    fromBar: number;
    beatsPerBar: number;
}

export type TempoConfig = {
    beat: number;
    bpm: number;
}

export type SetConfig = {
    id: string;
    note?: string;
    beat: number;
    parent?: string;
}

export class Movement {
    title?: string;
    estimatedBeats: number = 0;
    audio: AudioConfig = {};
    meter: MeterConfig[] = [];
    tempoMap: TempoConfig[] = [];
    sets: SetConfig[] = [];

    addSet(set: SetConfig){
        let targetIndex = this.sets.length;
        
        for(let i = 0; i < this.sets.length; i++){
            if(this.sets[i]!.beat > set.beat){
                targetIndex = i - 1;
                break;
            }
        }

        this.sets.splice(targetIndex, 0, set);
    }
}