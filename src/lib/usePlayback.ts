import { onScopeDispose, ref } from "vue";
import { PlaybackEngine } from "./Audio";

export function usePlayback(){
    const engine = new PlaybackEngine();

    const beat = ref(-1);
    const canPlay = ref(false);
    const isPlaying = ref(false);

    let raf = 0;

    async function loadAudio(...args: Parameters<PlaybackEngine['setTrack']>){
        await engine.setTrack(...args);
        canPlay.value = true;
    }

    async function play(...args: Parameters<PlaybackEngine['play']>){
        stop();
        isPlaying.value = true;
        await engine.play(...args);
        raf = requestAnimationFrame(frame);
    }

    function clearAudio(){
        stop();
        engine.clearAudio();
        canPlay.value = false;
    }

    function stop(){
        engine.stop();
        cancelAnimationFrame(raf);
        beat.value = -1;
        isPlaying.value = false;
    }

    function frame(){
        const currBeat = engine.getCurrentBeat();

        if(currBeat != null){
            beat.value = Math.floor(currBeat);
            raf = requestAnimationFrame(frame);
        } else {
            beat.value = -1;
            isPlaying.value = false;
        }
    }

    onScopeDispose(stop);

    return {
        beat,
        canPlay,
        isPlaying,
        loadAudio,
        clearAudio,
        play,
        stop
    }
}