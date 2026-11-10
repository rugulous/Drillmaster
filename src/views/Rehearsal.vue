<template>
    <div class="container mb-5">
        <div>
            <label for="movement">Movement</label>
            <select class="form-control" @change="loadMovement">
                <option value="" disabled selected>-- Please Select --</option>
                <option v-for="movement in movements" :value="movement.id">{{ movement.id }} - {{ movement.title }}</option>
            </select>
        </div>

        <template v-if="canPlay">
           <div class="my-5">
                <button class="btn-solid btn-styled theme-success btn-lg w-100" @click="playSets()" v-if="!isPlaying">Play</button>
                <button class="btn-solid btn-styled theme-danger btn-lg w-100" @click="engine.stop()" v-else>Stop</button>
            </div>
            
            <div v-if="loadedMovement && !isPlaying" class="text-center">
                <p v-if="!startSet || !endSet">Choose the {{ nextSetToSelect }} set <span class="fst-italic">(or leave blank for {{ nextSetToSelect == "start" ? "a full run" : "the rest" }})</span></p>
                <div class="row row-cols-2">
                    <div class="mb-5" v-for="(set, index) in loadedMovement.sets" :key="set.id">
                        <div class="card h-100" :class="{'bg-primary': set.id == startSet, 'bg-accent': set.id == endSet}" @click="selectSet(index)">
                            <div class="card-body">
                                <h2 class="card-title mb-0">{{ set.id }}</h2>
                                <p class="fst-italic">
                                    {{ (index == loadedMovement.sets.length - 1 ? loadedMovement.estimatedBeats : loadedMovement.sets[index + 1]!.beat) - set.beat }} Counts
                                </p> 
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="isPlaying">
                <div class="card mb-5 text-center">
                    <div class="card-body">
                        <h2>Set {{ currentSet?.id ?? '-' }}</h2>

                        <template v-if="currentSet">
                            <p>{{ currentSet.note ?? '\u00A0' }}</p>

                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Beat</th>
                                        <th>Total Beats</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{{ Math.max((beat - currentSet.beat!), -1) + 1 }}</td>
                                        <td>{{ currentSet.counts }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </template>
                    </div>
                </div>

                <p>Chunk</p>
                <ul class="list-group">
                    <li class="list-group-item" v-for="set in selectedSets" :class="{'active fs-lg': set.beat <= beat && set.beat + set.counts > beat, 'theme-secondary': (set.beat + set.counts - 1) < beat}">
                        <p class="mb-0 d-flex justify-content-between">Set {{ set.id }} <span class="badge" :class="{'theme-primary': set.beat > beat, 'theme-secondary': (set.beat + set.counts - 1) < beat, 'theme-inverse': set.beat <= beat && set.beat + set.counts > beat}">{{ set.counts }} Counts</span></p>
                        <p class="mb-0 fst-italic" v-if="set.note">{{ set.note }}</p>
                    </li>
                </ul>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { Movement } from '@/lib/Movement';
import { usePlayback } from '@/lib/usePlayback';
import { computed, ref } from 'vue';

const movements = [{
    id: "P1",
    title: "In the Stone, Billie Jean"
}]

const {beat, canPlay, isPlaying, ...engine} = usePlayback();
const loadedMovement = ref<Movement | null>(null);

const nextSetToSelect = ref<"start" | "end">("start");
const startSet = ref<string | null>();
const endSet = ref<string | null>(null);

const selectedSets = computed(() => {
    if(!loadedMovement.value){
        return [];
    }

    const sets = [];
    let inRange = false;

    for(let i = 0; i < loadedMovement.value.sets.length; i++){
        const set = loadedMovement.value.sets[i]!;

        if(inRange && set.id == endSet.value){
            break;
        }

        if(set.id == startSet.value){
            inRange = true;
        }

        if(inRange || startSet.value == null || endSet.value == null){
            sets.push({
                ...set,
                counts: (i == loadedMovement.value.sets.length - 1
                                ? loadedMovement.value.estimatedBeats
                                : loadedMovement.value.sets[i + 1]!.beat) - set.beat
            });
        }
    }

    return sets;
});

const currentSet = computed(() => {
    if(selectedSets.value.length == 0){
        return null;
    }

    for(let i = 1; i < selectedSets.value.length; i++){
        if(selectedSets.value[i]!.beat > beat.value){
            return selectedSets.value[i - 1];
        }
    }

    return selectedSets.value[selectedSets.value.length - 1]!
});

async function loadMovement(event: Event){
    const id = (event.target as HTMLSelectElement).value;

    const [json, audio] = await Promise.all([
        fetch(`/show/${id}/drill.mvt`).then(d => d.json()),
        fetch(`/show/${id}/audio.mp3`).then(a => a.arrayBuffer())
    ]);

    loadedMovement.value = Movement.fromSerialized(json, id);

    await engine.loadAudio(audio);
}

function selectSet(index: number){
    const targetSet = loadedMovement.value?.sets[index];
    if(!targetSet){
        return;
    }    

    if(targetSet.id == startSet.value){
        startSet.value = null;
        nextSetToSelect.value = "start";
        return;
    }

    if(targetSet.id == endSet.value || (nextSetToSelect.value == "start" && endSet.value != null)){
        endSet.value = null;
    }

    if(nextSetToSelect.value == "start"){
        startSet.value = targetSet.id;
        nextSetToSelect.value = "end";
    } else {
        endSet.value = targetSet.id;
        nextSetToSelect.value = "start";
    }
}

async function playSets(){
    if(!loadedMovement.value){
        return;
    }

    console.log(selectedSets.value);
    const endSet = selectedSets.value[selectedSets.value.length - 1]!;

    await engine.play(loadedMovement.value, {
        fromBeat: selectedSets.value[0]!.beat,
        toBeat: endSet.beat + endSet.counts
    });
}
</script>