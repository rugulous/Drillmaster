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
    beat: number;
    parent?: string;
}

export class Movement {
    #sets: Map<string, SetConfig> = new Map();

    title?: string;
    audio: AudioConfig = {};
    meter: MeterConfig[] = [];
    tempoMap: TempoConfig[] = [];
    sets: string[] = [];
}