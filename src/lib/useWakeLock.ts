import { onMounted, onUnmounted, ref } from "vue";

export function useWakeLock(){
    const isActive = ref(false);
    let sentinel: WakeLockSentinel | null = null;

    async function request(){
        if(!('wakeLock' in navigator)){
            return false;
        }

        try{
            sentinel = await navigator.wakeLock.request('screen');
            isActive.value = true;

            sentinel.addEventListener('release', () => {
                isActive.value = false;
                sentinel = null;
            })

            return true;
        } catch (err) {
            console.error('Failed to acquire wake lock:', err);
            return false;
        }
    }

    async function release(){
        if(sentinel){
            await sentinel.release();
            sentinel = null;
            isActive.value = false;
        }
    }

    async function handleVisibilityChange(){
        if(document.visibilityState === 'visible' && !sentinel){
            await request();
        }
    }

    onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange));
    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        release()
    });

    return {
        isActive,
        request,
        release
    }
}