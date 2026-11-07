import type { MeterConfig, SetConfig, TempoConfig } from "./Movement";

type PartialSet = Omit<SetConfig, 'id'>

const REPEAT_MARKERS = ['dacapo', 'dalsegno', 'tocoda', 'fine'];
const UNIT_IN_CROTCHETS: Record<string, number> = {
    maxima: 32,
    long: 16,
    breve: 8,
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    '16th': 0.25,
    '32nd': 0.125,
    '64th': 0.0625
}

const DEFAULT_BPM = 120;

function kids(el: Element, name: string){
    return Array.from(el.children).filter(c => c.localName == name);
}

function firstText(el: Element, name: string): string | undefined {
    return kids(el, name)[0]?.textContent?.trim() || undefined;
}

function sumBeats(beats: string){
    const parts = beats.split('+');
    return parts.reduce((acc, part) => acc + (Number(part) || 0), 0)
}

async function readMusicXml(file: File): Promise<Document> {
    const text = await file.text();

    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const parseError = doc.querySelector('parsererror');

    if(parseError){
        throw new Error(`Not valid MusicXML: ${parseError.textContent}`);
    }

    return doc;
}

function parseTempo(direction: Element, currBeat: number): TempoConfig | null{
    const sounds = kids(direction, 'sound');
    for(const sound of sounds){
        const bpm = parseFloat(sound.getAttribute("tempo") ?? '');

        if(!isNaN(bpm)){
            return {
                beat: currBeat,
                bpm
            }
        }
    }

    //we didn't manage to find any sounds with tempo - is there a metronome marking instead?
    const metronomes = Array.from(direction.getElementsByTagName("metronome"));
    for(const metronome of metronomes){
        const units = kids(metronome, 'beat-unit');
        if(units.length !== 1){
            continue;
        }

        const unit = UNIT_IN_CROTCHETS[units[0]?.textContent?.trim() ?? ''];
        const perMinute = parseFloat(firstText(metronome, 'per-minute') ?? '');

        if(!unit || isNaN(perMinute) || perMinute < 0){
            continue;
        }

        const dots = kids(metronome, 'beat-unit-dot').length

        return {
            beat: currBeat,
            bpm: perMinute * unit * (2 - 2 ** -dots)
        }
    }

    return null
}

function getRehearsalMark(direction: Element, currBeat: number): PartialSet | null{
    const marks = Array.from(direction.getElementsByTagName("rehearsal"));
    for(const mark of marks){
        const text = mark.textContent?.trim();

        if(!text){
            continue
        }

        return {
            note: `Rehearsal Mark ${text}`,
            beat: currBeat
        }
    }

    return null;
}

export async function parseMusicXml(file: File){
    const document = await readMusicXml(file);
    const part = document.getElementsByTagName('part')[0];

    if(!part){
        throw new Error('No <part> element found');
    }

    const measures = kids(part, 'measure');
    let measureIndex = 0;

    const data: {meter: MeterConfig[], warnings: string[], tempoMap: TempoConfig[], suggestedSets: PartialSet[], beats: number} = {
        meter: [],
        warnings: [],
        tempoMap: [],
        suggestedSets: [],
        beats: 0
    };

    let currDivisions = 1;
    let sawRepeats = false;
    let currBeatsPerBar = -1;
    
    for(const measure of measures){
        measureIndex++;
        const parsedBarNumber = parseInt(measure.getAttribute('number') ?? '')
        const barNum = isNaN(parsedBarNumber) ? measureIndex : parsedBarNumber;
        
        let furthestSeen = 0;
        let cursor = 0;

        for(const el of Array.from(measure.children)){
            if(el.localName == "attributes"){
                const divisions = Number(firstText(el, "divisions"));
                if(!isNaN(divisions)){
                    currDivisions = divisions
                }


            } else if(el.localName == "direction"){
                const at = data.beats + (cursor / currDivisions);
                const tempo = parseTempo(el, at);

                if(tempo){
                    if(data.tempoMap.at(-1)?.bpm != tempo.bpm){
                        data.tempoMap.push(tempo)
                    }
                }

                const rehearsalMark = getRehearsalMark(el, at);
                if(rehearsalMark){
                    data.suggestedSets.push(rehearsalMark);
                }

            } else if(el.localName == "sound"){
                const bpm = parseInt(el.getAttribute("tempo") ?? '', 10);
                
                if(!isNaN(bpm)){
                    const at = data.beats + (cursor / currDivisions);
                    if(data.tempoMap.at(-1)?.bpm != bpm){
                        data.tempoMap.push({bpm, beat: at});
                    }
                }

                if(REPEAT_MARKERS.some(a => el.hasAttribute(a))){
                   sawRepeats = true;
                }

            } else if(el.localName == "note"){
                const isChord = kids(el, 'chord').length > 0;
                const isGrace = kids(el, 'grace').length > 0;

                if(!isChord && !isGrace){
                    cursor += Number(firstText(el, 'duration')) || 0
                }

            } else if(el.localName == "backup"){
                cursor -= Number(firstText(el, 'duration')) || 0
            } else if(el.localName == "forward"){
                cursor += Number(firstText(el, "duration")) || 0

            } else if(el.localName == "barline"){
                if(kids(el, 'repeat').length || kids(el, 'ending').length){
                    sawRepeats = true;
                }
            }

            furthestSeen = Math.max(furthestSeen, cursor);
        }

        const actual = furthestSeen / currDivisions
        data.beats += actual;

        if(actual != currBeatsPerBar){
            data.meter.push({ fromBar: barNum, beatsPerBar: actual});
            currBeatsPerBar = actual
        }
    }

    if(data.tempoMap.length == 0 || data.tempoMap[0]!.beat > 0){
        data.warnings.push(`No tempo at the start of the score; assuming ${DEFAULT_BPM} bpm`);
        data.tempoMap.unshift({ beat: 0, bpm: DEFAULT_BPM})
    }

    if(sawRepeats){
        data.warnings.push("Score contains repeats/jumps. Positions here won't automatically unravel the repeats, tread carefully");
    }

    if(data.suggestedSets.length == 0 || data.suggestedSets[0]!.beat > 0){
        data.suggestedSets.unshift({
            beat: 0,
        })
    }

    return data;
}