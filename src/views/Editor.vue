<template>
    <form class="container-fluid h-100" ref="theForm">
        <div class="row h-100">
            <div class="col-4 border-end h-100">
                <h2>Movement Details</h2>
                
                <UploadButton class="btn btn-primary btn-lg" accept=".musicxml,.xml,.mxl" @pick="onPick">Import MusicXML</UploadButton>

                <div class="my-7">
                    <label for="title">Title</label>
                    <input id="title" class="form-control" v-model="movement.title" />
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
                            <tr v-for="tempo in movement.tempoMap">
                                <td>{{ tempo.beat }}</td>
                                <td>{{ tempo.bpm }}</td>
                            </tr>
                        </tbody>
                    </table>
                </fieldset>
            </div>

            <div class="col-8">
                <div class="row row-cols-3 text-center">
                    <div class="mb-5" v-for="(row, index) in rows" :key="row.set.id">
                        <div class="card h-100">
                            <div class="card-body">
                                <h4 class="card-title">Set <input class="form-control d-inline-block w-auto" v-model="row.set.id" /></h4>
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
</template>

<script setup lang="ts">
import UploadButton from '@/components/UploadButton.vue';
import { Movement, type SetConfig } from '@/lib/Movement';
import { parseMusicXml } from '@/lib/MusicXML';
import { locate, barToBeat } from '@/lib/utils';
import { computed, reactive, ref } from 'vue';

type Row = {
    set: SetConfig;
    bar: number;
    beatInBar: number;
    counts: number;
}

const theForm = ref<HTMLFormElement>();
const movement = reactive<Movement>(new Movement());

async function onPick(files: FileList) {

    const content = await parseMusicXml(files[0]!);

    movement.tempoMap = content.tempoMap;
    movement.meter = content.meter;
    movement.estimatedBeats = content.beats;

    if (movement.sets.length == 0) {
        const sets = content.suggestedSets.toSorted((a, b) => a.beat - b.beat);

        for (let i = 0; i < sets.length; i++) {
            movement.addSet({
                ...sets[i],
                id: (i + 1).toString()
            } as SetConfig)
        }
    } else {
        alert("Sets already present");
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
</script>