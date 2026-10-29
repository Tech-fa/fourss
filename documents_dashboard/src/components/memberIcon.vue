<template>
    <div
        :class="[
            'flex items-center justify-center w-10 h-10 rounded-full ',
        ]"
        :style="{ backgroundColor: colors[member.index % colors.length] }"
    >
        <img
            v-if="member.image"
            :src="member.image"
            class="w-full h-full object-cover rounded-full"
        />
        <span v-else>{{ member.fname.charAt(0).toUpperCase() || '' }}{{ member.lname.charAt(0).toUpperCase() || '' }}</span>
    </div>
</template>

<script setup lang="ts">
const colors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FF33A1',
    '#A133FF',
]

defineProps<{
    member: {
        fname: string
        lname: string
        image: string,
        index: number
    }
}>()
</script>
