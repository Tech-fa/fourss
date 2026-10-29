<template>
    <div class="space-y-2 text-start" :dir="fieldDir" :test-id="testID">
        <label class="block text-sm text-neutral-700 text-start" :for="name"
            >{{ label }} <span class="text-red-700" v-if="required">*</span></label
        >
        <div class="relative">
            <Field
                :validateOnChange="true"
                :validateOnInput="true"
                :validateOnBlur="!ignoreBlur"
                v-slot="{ meta, field }"
                :rules="rules"
                :name="name"
                :id="name"
                :value="value"
                :disabled="disabled"
            >
            <div class="mt-3">
                <AppTextarea
                    :hide-icon="!showIcon"
                    v-bind="field"
                    :disabled="disabled"
                    :id="name"
                    :placeholder="placeholder"
                    :error="!props.hideBorderError && !meta.valid && meta.touched"
                />
            </div>
            </Field>
            <ErrorMessage :name="name" class="absolute text-red-600 text-xs -top-4 w-full start-0 text-start" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ErrorMessage, Field, type RuleExpression } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AppTextarea from './AppTextarea.vue'
import { isLocaleRtl } from '@/util/util'

const { locale } = useI18n()
const fieldDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const props = defineProps<{
    rules?: RuleExpression<any>
    name: string
    placeholder: string
    value?: string
    label: string
    required?: boolean
    disabled?: boolean
    ignoreBlur?: boolean
    hideBorderError?: boolean
    showIcon?: boolean
    testID?: string
}>()
</script> 