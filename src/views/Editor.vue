<template>
    <div class="container-fluid h-100">
        <div class="row h-100">
            <div class="col-4 border h-100">
                <h2>Movement Details</h2>

                <div class="my-7">
                    <label for="title">Title</label>
                    <input id="title" class="form-control" v-model="movement.title" />
                </div>

                <fieldset class="mb-7">
                    <legend>Audio</legend>

                    <div class="mb-5">
                        <label for="offset">Start Offset (MS)</label>
                        <input id="offset" type="number" class="form-control" step="1" v-model="movement.audio.offsetMs" />
                    </div>

                    <div class="mb-5">
                        <label for="leadIn">Lead In (beats)</label>
                        <input id="leadIn" type="number" class="form-control" step="1" v-model="movement.audio.leadInBeats" />
                    </div>
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

            <div class="col-8"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Movement } from '@/lib/Movement';
import { ref } from 'vue';

const movement = ref<Movement>(new Movement());
</script>