<template>
    <form class="container-fluid h-100" ref="theForm">
        <div class="row h-100">
            <div class="col-4 border-end h-100">
                <h2>Movement Details</h2>
                
                <UploadButton class="btn-solid btn-styled theme-success btn-lg me-3" accept=".mvt,.json" @pick="loadMovement">Load Movement</UploadButton>
                <UploadButton class="btn-solid btn-styled theme-primary btn-lg me-3" accept=".musicxml,.xml,.mxl" @pick="importMusicXml">Import MusicXML</UploadButton>
                <UploadButton class="btn-solid btn-styled theme-accent btn-lg" accept="audio/*" @pick="loadAudio" v-if="!canPlay">Import Audio</UploadButton>
                <template v-else>
                    <button class="btn-solid btn-styled theme-accent btn-lg me-3" type="button" v-if="isPlaying" @click="engine.stop">Stop</button>
                    <button class="btn-solid btn-styled theme-accent btn-lg me-3" type="button" v-else @click="testAudio">Test Audio</button>
                    
                    <button class="btn-solid btn-styled theme-danger btn-lg" type="button" @click="engine.clearAudio">Remove Audio</button>
                </template>

                <div class="my-7">
                    <label for="title">Title</label>
                    <input id="title" class="form-control" v-model="movement.title" required/>
                </div>

                <fieldset class="mb-7">
                    <legend>Audio</legend>

                    <div class="mb-5">
                        <label for="offset">Start Offset (MS)</label>
                        <input id="offset" type="number" class="form-control" step="1"
                            v-model="movement.audio.offsetMs" />
                    </div>

                    <div class="mb-5">
                        <label for="leadIn">Lead In (beats)</label>
                        <input id="leadIn" type="number" class="form-control" step="1"
                            v-model="movement.audio.leadInBeats" />
                    </div>
                </fieldset>

                <fieldset class="mb-7">
                    <legend>Meter</legend>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Bar</th>
                                <th>Beats</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="meter in movement.meter">
                                <td>{{ meter.fromBar }}</td>
                                <td>{{ meter.beatsPerBar }}</td>
                            </tr>
                        </tbody>
                    </table>
                </fieldset>

                <fieldset class="mb-7">
                    <legend>Tempo</legend>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Beat</th>
                                <th>Tempo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="tempo in movement.tempo">
                                <td>{{ tempo.beat }}</td>
                                <td>{{ tempo.bpm }}</td>
                            </tr>
                        </tbody>
                    </table>
                </fieldset>

                <hr class="my-7"/>
                <button type="button" class="btn-solid btn-styled theme-success btn-lg" @click="exportMovement">Export Movement</button>
            </div>

            <div class="col-8 h-100 overflow-y-auto">
                <button type="button" class="btn-solid btn-styled btn-lg theme-success my-5 me-5" @click="addSet">Add Set</button>

                <div class="row row-cols-3 text-center">
                    <div class="mb-5" v-for="(row, index) in rows" :key="row.set.id">
                        <div class="card h-100" :class="{
                            'bg-primary': isPlaying && ((row.set.beat == beat || (row.set.beat < beat && row.set.beat + row.counts > beat)) || playbackSet == index), 
                            'bg-secondary': isPlaying && playbackSet == null && row.set.beat + row.counts <= beat
                            }"
                            @click="playSet(index)">
                            <div class="card-body">
                                <div class="d-flex">
                                    <h4 class="card-title w-100">Set <input class="form-control d-inline-block w-auto" v-model="row.set.id" /></h4>
                                   <button type="button" class="btn-solid btn-styled theme-danger" v-if="index != 0" @click="removeSet(row.set.id)">
                                    <svg
                                            xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                            fill="currentColor" viewBox="0 0 16 16">
                                            <path
                                                d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5" />
                                        </svg></button>
                                </div>

                                <p class="fst-italic text-secondary">{{ row.set.note ?? '\u00A0' }}</p>
                                <div>
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Bar</th>
                                                <th>Beat</th>
                                                <th>Counts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr class="align-middle">
                                                <td>
                                                    <input type="number" :disabled="index == 0" :value="row.bar" class="form-control" @change="updateSets(row, 'bar', $event)" />
                                                </td>
                                                <td>
                                                    <input type="number" :disabled="index == 0" :value="row.beatInBar" class="form-control" @change="updateSets(row, 'beatInBar', $event)" />
                                                </td>
                                                <td>{{ row.counts }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>

    <SaveMovementDialog ref="modal"></SaveMovementDialog>
</template>

<script setup lang="ts">
import SaveMovementDialog from '@/components/SaveMovementDialog.vue';
import UploadButton from '@/components/UploadButton.vue';
import { deserializeMovement, Movement, serializeMovement, type SetConfig } from '@/lib/Movement';
import { parseMusicXml } from '@/lib/MusicXML';
import { usePlayback } from '@/lib/usePlayback';
import { locate, barToBeat, getFileName } from '@/lib/utils';
import { computed, onUnmounted, reactive, ref, useTemplateRef } from 'vue';

type Row = {
    set: SetConfig;
    bar: number;
    beatInBar: number;
    counts: number;
}

const theForm = ref<HTMLFormElement>();
const movement = reactive<Movement>(new Movement());
const modal = useTemplateRef<InstanceType<typeof SaveMovementDialog>>('modal');
const playbackSet = ref<number | null>(null);

const {beat, canPlay, isPlaying, ...engine} = usePlayback();

async function importMusicXml(files: FileList) {
    if((movement.title ?? "").trim().length == 0){
        movement.title = getFileName(files[0]!);
    }

    const content = await parseMusicXml(files[0]!);

    movement.tempo = content.tempoMap;
    movement.meter = content.meter;
    movement.estimatedBeats = content.beats;

    if (movement.sets.length > 0) {
        if(!confirm("This movement already has sets - do you wish to replace these with suggested sets from the musicxml?")){
            return;
        }

        movement.sets = [];
    }
        const sets = content.suggestedSets.toSorted((a, b) => a.beat - b.beat);

        for (let i = 0; i < sets.length; i++) {
            movement.addSet({
                ...sets[i],
                id: (i + 1).toString()
            } as SetConfig)
        }
}

const sortedSets = computed(() => movement.sets.toSorted((a, b) => a.beat - b.beat));

const rows = computed<Row[]>(() => 
    sortedSets.value.map((set, i) => {
        const end = sortedSets.value[i + 1]?.beat ?? movement.estimatedBeats;
        const pos = locate(movement.meter, set.beat);

        return {
            set,
            bar: pos?.bar,
            beatInBar: pos ? Math.round(pos.beatInBar * 100) / 100 : undefined,
            counts: Math.round((end - set.beat) * 100) / 100
        } as Row;
    })
)

function updateSets(row: Row, field: 'bar' | 'beatInBar', e: Event){
    const input = e.target as HTMLInputElement;
    const value = input.valueAsNumber;
    const bar = field === 'bar' ? value : row.bar;
    const beatInBar = field === 'beatInBar' ? value : row.beatInBar;

    let beat = null;
    if(bar != null && beatInBar != null && !Number.isNaN(value)){
        beat = barToBeat(movement.meter, bar, beatInBar);
    }

    if(beat === null){
        input.value = String(row[field] ?? '')
        return;
    }

    row.set.beat = beat;
}

function addSet(){
    const beat = parseInt(prompt("On which beat do you wish to create this new set?") ?? '')

    if(!isNaN(beat)){
        movement.addSet({
            id: "?",
            beat
        })
    }
}

function removeSet(setId: string){
    movement.removeSet(setId);
}

function exportMovement(){
    if(!theForm.value?.reportValidity()){
        return;
    }

    const result = serializeMovement(movement);
    if(!result.success){
        console.error(result.errors);
    } else {
        modal.value?.open(result.result, movement.title ?? '');
    }
}

async function loadMovement(files: FileList){
    const title = getFileName(files[0]!)

    const content = await files[0]!.text();
    const result = deserializeMovement(content, title);

    if(!result.success){
        console.error(result.errors);
    } else {
        Object.assign(movement, result.result);
    }
}

async function loadAudio(files: FileList) {
    const audio = await files[0]!.bytes();
    await engine.loadAudio(audio.buffer);
}

async function playSet(index: number){
    if(!canPlay.value){
        return;
    }

    const set = movement.sets[index]!;
    const toBeat = index == movement.sets.length - 1
                    ? movement.estimatedBeats
                    : movement.sets[index + 1]!.beat
    
    playbackSet.value = index;
    await engine.play(movement, {fromBeat: set.beat, toBeat})
}

async function testAudio(){
    playbackSet.value = null;
    await engine.play(movement)
}

onUnmounted(() => {
    engine.stop(); 
});
</script>