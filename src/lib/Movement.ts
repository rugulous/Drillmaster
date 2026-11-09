import type { Result } from "./Result";
import { isUnique } from "./utils";

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
}

export class Movement {
    title?: string;
    estimatedBeats: number = 0;
    audio: AudioConfig = {};
    meter: MeterConfig[] = [];
    tempo: TempoConfig[] = [];
    sets: SetConfig[] = [];

    static fromSerialized(data: SerializedMovement, title?: string): Movement{
        const movement = new Movement();
        movement.title = title;
        movement.estimatedBeats = data.audio.estimatedBeats;
        movement.audio = {
            leadInBeats: data.audio.leadInBeats,
            offsetMs: data.audio.offsetMs
        };
        movement.meter = data.meter.toSorted((a, b) => a.fromBar - b.fromBar);
        movement.tempo = data.tempo.toSorted((a, b) => a.beat - b.beat);
        movement.sets = data.sets.toSorted((a, b) => a.beat - b.beat);

        return movement;
    }

    addSet(set: SetConfig){
        let targetIndex = this.sets.length;
        
        for(let i = 0; i < this.sets.length; i++){
            if(this.sets[i]!.beat > set.beat){
                targetIndex = i;
                break;
            }
        }

        this.sets.splice(targetIndex, 0, set);
    }

    removeSet(setId: string){
        console.log(this.sets.length);
        this.sets = this.sets.filter(s => s.id != setId);
        console.log(this.sets.length);
    }
}

type SerializedMovement = {
  schemaVersion: 1;
  audio: {
    offsetMs: number;
    leadInBeats: number;
    estimatedBeats: number;
  };
  meter: MeterConfig[];
  tempo: TempoConfig[];
  sets: SetConfig[];
};

const requiredSchemaKeys = ["audio", "meter", "tempo", "sets"];

function isSerializedMovement(obj: any): obj is SerializedMovement{
    const keys = Object.keys(obj);
    if(requiredSchemaKeys.some(k => !keys.includes(k))){
        return false;
    }

    return true;
}

function validateMovement(audio: AudioConfig, estimatedBeats: number | undefined, meter: MeterConfig[], tempo: TempoConfig[], sets: SetConfig[]): string[] {
    const errors = [];
    
    //audio validation
    if(audio.offsetMs != undefined && audio.offsetMs < 0){
        errors.push("The audio offset cannot be less than zero");
    }

    if(audio.leadInBeats != undefined && estimatedBeats != undefined && audio.leadInBeats >= estimatedBeats){
        errors.push("The lead in cannot be longer than the entire piece");
    }

    //meter validation
    if(meter.length == 0 || meter[0]!.fromBar > 1){
        errors.push("No time signature is defined for the first bar of the piece");
    }

    if(!isUnique(meter.map(m => m.fromBar))){
        errors.push("There are multiple meter changes for the same bar");
    }

    if(meter.some(m => m.beatsPerBar === 0)){
        errors.push("There is at least 1 meter change with 0 beats in the bar");
    }

    //tempo validation
    if(tempo.length == 0 || tempo[0]!.beat > 0){
        errors.push("No tempo is defined for the first beat of the piece")
    }

    if(!isUnique(tempo.map(t => t.beat))){
        errors.push("There are multiple tempo changes for the same beat");
    }

    if(tempo.some(t => t.bpm === 0)){
        errors.push("There is at least 1 tempo change with 0 bpm");
    }

    //set validation
    if(!isUnique(sets.map(s => s.beat))){
        errors.push("There are multiple sets for the same beat");
    }

    if(!isUnique(sets.map(s => s.id))){
        errors.push("There are multiple sets with the same ID");
    }

    return errors;
}

export function serializeMovement(movement: Movement) : Result<string>{
    const meter = movement.meter.toSorted((a, b) => a.fromBar - b.fromBar);
    const tempo = movement.tempo.toSorted((a, b) => a.beat - b.beat);
    const sets = movement.sets.toSorted((a, b) => a.beat - b.beat);

    const errors = validateMovement(movement.audio, movement.estimatedBeats, meter, tempo, sets);

    if(errors.length > 0){
        return {
            success: false,
            errors
        }
    }

    return {
      success: true,
      result: JSON.stringify({
        schemaVersion: 1,
        audio: {
          offsetMs: movement.audio.offsetMs,
          leadInBeats: movement.audio.leadInBeats,
          estimatedBeats: movement.estimatedBeats,
        },
        meter: meter,
        tempo: tempo,
        sets: sets,
      } as SerializedMovement, null, 2),
    }; 
}

export function deserializeMovement(json: string, title?: string): Result<Movement>{
    let data: unknown;

    try{
        data = JSON.parse(json)
    } catch {
        return {
            success: false,
            errors: ["Unparseable file"]
        }
    }

    //test we have all the keys we need
    if(!isSerializedMovement(data)){
        return {
            success: false,
            errors: ["Not a valid movement file, or an unsupported version"]
        }
    }

    const movement = Movement.fromSerialized(data, title);
    const errors = validateMovement(movement.audio, movement.estimatedBeats, movement.meter, movement.tempo, movement.sets);

    if(errors.length > 0){
        return {
            success: false,
            errors
        }
    }

    return {
        success: true,
        result: movement
    }
}