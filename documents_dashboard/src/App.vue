<template>
    <div :class="`  h-full `">
        <Notification
            :title="toast.title"
            :message="toast.message"
            :status="toast.status"
            v-model="toast.show"
            :timeout="toast.timeout"
            :testId="toast.testId"
        />
        <RouterView />
        <PwaInstallBanner />
        <Dialog
            v-model="dialogStore.isOpen"
            :title="''"
            :content="dialogStore.content"
            :bind-properties="dialogStore.bindProperties"
        />
    </div>
</template>

<script setup lang="ts">
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import Dialog from '@/components/Dialog.vue'
import Notification from '@/components/Notification.vue'
import PwaInstallBanner from '@/components/pwa/PwaInstallBanner.vue'

const toast = useToast()
const dialogStore = useDialog()




</script>
<style>
@font-face {
    font-family: 'Nunito';
    src: url('@/assets/fonts/Nunito-VariableFont_wght.ttf') format('truetype');
    font-weight: 200 1000;
    font-style: normal;
    font-display: swap;
}
@font-face {
    font-family: 'HelveticaNeue';
    src: url('@/assets/fonts/HelveticaNeueBlack.otf') format('opentype');
    font-display: swap;
}
@font-face {
    font-family: 'best-font';
    src: url('@/assets/fonts/Line-Awesome.ttf') format('truetype');
    font-display: swap;
}
@font-face {
    font-family: 'best-font2';
    src: url('@/assets/fonts/Material-Icons.ttf') format('truetype');
    font-display: swap;
}
/* Custom scrollbar styles */
* {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}
</style>
