<style scoped>
dialog:not([open]){
    display: none;
}
</style>

<template>
    <dialog class="dialog dialog-xl h-100" ref="dialog">
        <div class="dialog-header">
            <h2 class="dialog-title">Save Movement {{ title }}</h2>
            <button type="button" class="btn-close" command="close" aria-label="Close" @click="close"></button>
        </div>
        <div class="dialog-body">
            <div class="row h-100">
                <div class="col-12 lg:col-8">
                    <textarea class="form-control h-100" readonly v-model="movementData"></textarea>
                </div>

                <div class="col-12 lg:col-4">
                    <div class="d-grid gap-5">
                        <button class="btn-solid btn-styled theme-primary btn-lg" @click="copyMovement" :disabled="copied">{{ copied ? 'Copied!' : 'Copy to Clipboard' }}</button>
                        <button class="btn-solid btn-styled theme-success btn-lg" @click="downloadMovement">Download</button>
                    </div>
                </div>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const dialog = ref<HTMLDialogElement>();
const movementData = ref("");
const title = ref("");
const copied = ref(false);

let timer: number | null = null;

function open(data: string, newTitle: string){
    copied.value = false;
    title.value = newTitle;
    movementData.value = data;
    dialog.value?.showModal();
}

function close(){
    dialog.value?.close();

    if(timer){
        clearTimeout(timer);
        timer = null;
    }
}

async function copyMovement(){
    await navigator.clipboard.writeText(movementData.value);
    copied.value = true;

    timer = setTimeout(() => {
        copied.value = false;
        timer = null;
    }, 3000);
}

function downloadMovement(){
    const blob = new Blob([movementData.value], {type: 'text/json'});
    const link = document.createElement("a");

    link.download = `${title.value}.mvt`;
    link.href = URL.createObjectURL(blob);
    
    link.click();
    link.remove();
}

defineExpose({
    open,
    close
})
</script>