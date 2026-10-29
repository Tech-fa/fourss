<template>
    <div class="space-y-2 text-start" :dir="fieldDir">
        <label class="block text-sm text-black/70  text-start" :for="name"
            >{{ label }} <span class="text-red-700" v-if="required">*</span></label
        >
        <div class="relative">
            <Field
                :validateOnChange="true"
                :validateOnInput="true"
                :validateOnBlur="!ignoreBlur"
                v-slot="{ meta, field }"
                :rules="rules"
                :type="type || 'text'"
                :name="name"
                :id="name"
                :value="value"
                :disabled="disabled"
            >
                <AppInput
                    :hide-icon="!showIcon"
                    :type="type || 'text'"
                    v-bind="field"
                    :disabled="disabled"
                    :id="name"
                    :placeholder="placeholder"
                    :error="!props.hideBorderError && !meta.valid && meta.touched"
                    :test-id="testID"
                    :min="min"
                    :max="max"
                />
            </Field>
            <ErrorMessage 
                :name="name" 
                class="absolute text-red-600 text-xs top-10 w-full start-0 text-start" 
                :test-id="`${name}-error`"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ErrorMessage, Field, type RuleExpression } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AppInput from './AppInput.vue'
import { isLocaleRtl } from '@/util/util'

const { locale } = useI18n()
const fieldDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const props = defineProps<{
    rules?: RuleExpression<any>
    name: string
    placeholder: string
    value?: any
    label: string
    required?: boolean
    type?: string
    disabled?: boolean
    ignoreBlur?: boolean
    hideBorderError?: boolean
    showIcon?: boolean
    testID?: string
    min?: string
    max?: string
}>()
</script>