<template>
    <button type="button" :class="class" @click="input?.click()">
        <slot></slot>
    </button>
    <input ref="input" type="file" hidden :accept="accept" @change="handlePick($event)">
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    accept?: string;
    class?: string;
    multiple?: boolean
}>();

const emit = defineEmits<{
    pick: [event: FileList]
}>();

const input = ref<HTMLInputElement>();

function handlePick(e: Event){
    const el = e.target as HTMLInputElement;

    if(el.files?.length){
        emit('pick', el.files);
    }

    el.value = "";
}
</script>