<template>
    <div class="container-fluid h-100">
        <div class="row h-100">
            <div class="col-4 border-end h-100">
                <h2>Movement Details</h2>
                <button class="btn btn-primary btn-lg" @click="input?.click()">Import MusicXML</button>
                <input ref="input" type="file" hidden accept=".musicxml,.xml,.mxl" @change="onPick">

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
                    <div class="mb-5" v-for="(set, index) in movement.sets" :key="set.id">
                        <div class="card h-100">
                            <div class="card-body">
                                <h4 class="card-title">Set {{ set.id }}</h4>
                                <p class="fst-italic text-secondary">{{ set.note ?? '\u00A0' }}</p>

                                <div>
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Beat</th>
                                                <th>Counts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr class="align-middle">
                                                <td>
                                                    <div class="d-flex align-items-center gap-2">
                                                        <input type="number" class="form-control" v-model="set.beat" step="1" required/>
                                                        <span class="text-nowrap">(bar 1)</span>
                                                    </div>
                                                </td>
                                                <td>{{ getSetCounts(index) }}</td>
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
    </div>
</template>

<script setup lang="ts">
import { Movement, type SetConfig } from '@/lib/Movement';
import { parseMusicXml } from '@/lib/MusicXML';
import { reactive, ref } from 'vue';

const input = ref<HTMLInputElement>()
const movement = reactive<Movement>(new Movement());

async function onPick(e: Event) {
    const el = e.target as HTMLInputElement;

    if (el.files?.length) {
        const content = await parseMusicXml(el.files[0]!);
        console.log(JSON.stringify(content));

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

    el.value = "";
}

function getSetCounts(index: number) {
    let endBeat = (index == movement.sets.length - 1)
        ? movement.estimatedBeats
        : movement.sets[index + 1]!.beat;

    return endBeat - movement.sets[index]!.beat
}
</script>