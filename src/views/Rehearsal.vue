<template>
    <div class="container mb-5">
        <div>
            <label for="movement">Movement</label>
            <select class="form-control" @change="loadMovement">
                <option value="" disabled selected>-- Please Select --</option>
                <option v-for="movement in movements" :value="movement.id">{{ movement.id }} - {{ movement.title }}
                </option>
            </select>
        </div>

        <template v-if="canPlay">
            <div class="my-5">
                <button class="btn-solid btn-styled theme-success btn-lg w-100" @click="playSets()"
                    v-if="!isPlaying">Play</button>
                <button class="btn-solid btn-styled theme-danger btn-lg w-100" @click="engine.stop()"
                    v-else>Stop</button>
            </div>

            <div v-if="loadedMovement && !isPlaying" class="text-center">
                <p v-if="startSet == null || endSet == null">Choose the {{ nextSetToSelect }} set <span class="fst-italic">(or leave
                        blank for {{ nextSetToSelect == "start" ? "a full run" : "the rest" }})</span></p>
                <div class="row row-cols-2">
                    <div class="mb-5" v-for="(set, index) in loadedMovement.sets" :key="set.id">
                        <div class="card h-100" :class="{ 'bg-primary': index == startSet, 'bg-accent': index == endSet }"
                            @click="selectSet(index)">
                            <div class="card-body">
                                <h2 class="card-title mb-0">{{ set.id }}</h2>
                                <p class="fst-italic">
                                    {{ (index == loadedMovement.sets.length - 1 ? loadedMovement.estimatedBeats :
                                        loadedMovement.sets[index + 1]!.beat) - set.beat }} Counts
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
                <ul class="list-group mb-5">
                    <li class="list-group-item" v-for="set in selectedSets"
                        :class="{ 'active fs-lg': set.beat <= beat && set.beat + set.counts > beat, 'theme-secondary fs-sm': (set.beat + set.counts - 1) < beat }">
                        <p class="mb-0 d-flex justify-content-between">Set {{ set.id }} <span class="badge"
                                :class="{ 'theme-primary': set.beat > beat, 'theme-secondary': (set.beat + set.counts - 1) < beat, 'theme-inverse': set.beat <= beat && set.beat + set.counts > beat }">{{
                                set.counts }} Counts</span></p>
                        <p class="mb-0 fst-italic" v-if="set.note">{{ set.note }}</p>
                    </li>
                </ul>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { deserializeMovement, Movement } from '@/lib/Movement';
import { usePlayback } from '@/lib/usePlayback';
import { useWakeLock } from '@/lib/useWakeLock';
import { computed, onMounted, ref } from 'vue';

const movements = [{
    id: "P1",
    title: "In the Stone, Billie Jean"
}]

const { beat, canPlay, isPlaying, ...engine } = usePlayback();
const loadedMovement = ref<Movement | null>(null);

const nextSetToSelect = ref<"start" | "end">("start");
const startSet = ref<number | null>(null);
const endSet = ref<number | null>(null);

const selectedSets = computed(() => {
    if (!loadedMovement.value) {
        return [];
    }

    const start = startSet.value ?? 0;
    const end = endSet.value ?? loadedMovement.value.sets.length - 1;

    return loadedMovement.value.sets.slice(start, end).map((s, i) => ({
        ...s,
        counts: (start + i == loadedMovement.value!.sets.length - 1
            ? loadedMovement.value!.estimatedBeats
            : loadedMovement.value!.sets[start + i + 1]!.beat) - s.beat
    }));
});

const currentSet = computed(() => {
    if (selectedSets.value.length == 0) {
        return null;
    }

    for (let i = 1; i < selectedSets.value.length; i++) {
        if (selectedSets.value[i]!.beat > beat.value) {
            return selectedSets.value[i - 1];
        }
    }

    return selectedSets.value[selectedSets.value.length - 1]!
});

async function loadMovement(event: Event) {
    startSet.value = null;
    endSet.value = null;
    nextSetToSelect.value = "start";
    loadedMovement.value = null;

    const id = (event.target as HTMLSelectElement).value;

    const [json, audio] = await Promise.all([
        fetch(`/show/${id}/drill.mvt`).then(d => d.text()),
        fetch(`/show/${id}/audio.mp3`).then(a => a.arrayBuffer())
    ]);

    const loadResult = deserializeMovement(json, id);
    if (!loadResult.success) {
        alert(`Failed to load movement: ${loadResult.errors.join(",")}`);
        return;
    }

    loadedMovement.value = loadResult.result;

    await engine.loadAudio(audio);
}

function selectSet(index: number) {
    if (index == startSet.value) {
        startSet.value = null;
        endSet.value = null;
        nextSetToSelect.value = "start";
        return;
    }

    if (nextSetToSelect.value == "start" || startSet.value == null) {
        startSet.value = index;
        endSet.value = null;
        nextSetToSelect.value = "end";
        return;
    }

    const first = startSet.value;

    startSet.value = Math.min(first, index);
    endSet.value = Math.max(first, index);
    nextSetToSelect.value = "start";
}

async function playSets() {
    if (!loadedMovement.value || selectedSets.value.length == 0) {
        return;
    }

    const endSet = selectedSets.value[selectedSets.value.length - 1]!;

    await engine.play(loadedMovement.value, {
        fromBeat: selectedSets.value[0]!.beat,
        toBeat: endSet.beat + endSet.counts
    });
}

const { request } = useWakeLock();
onMounted(async () => await request());
</script>