import { defineStore } from 'pinia'
import { ref, h, toRef, shallowRef  } from 'vue'
import type { Component } from 'vue'
export const useDialog = defineStore('dialogComponent', () => {
    const isOpen = ref(false)   
    const content = shallowRef<Component>(h('div'))
    const bindProperties = ref({})
    const onChangeDialog = (v: boolean) => {
        isOpen.value = v
    }
    const openDialog = ( content2: Component, bindProperties2: any) => {
        isOpen.value = true
        content.value = content2
        bindProperties.value = bindProperties2
    }
    const closeDialog = () => {
        isOpen.value = false
    }
    return { isOpen: toRef(isOpen), content, bindProperties, onChangeDialog, openDialog, closeDialog }
})
