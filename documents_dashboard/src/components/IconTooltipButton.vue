<template>
    <button v-bind="$attrs" type="button" :class="classes" :data-tooltip="text" :aria-label="text"
        :disabled="props.loading || props.disabled" @click="handleClick">
        <Spinner v-if="props.loading" />
        <template v-else>
            <i v-if="props.iconClass" :class="props.iconClass" aria-hidden="true"></i>
            <img v-else-if="props.iconSrc" :src="props.iconSrc" alt="" class="icon-tooltip-btn__img" />
        </template>
    </button>
</template>

<script setup lang="ts">
import Spinner from './Spinner.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialog } from '@/stores/dialog'
import { isLocaleRtl } from '@/util/util'

export type TooltipPlacement = 'left' | 'right' | 'top' | 'bottom'

const router = useRouter()
const { locale } = useI18n()

const flipPlacementForRtl = (placement: TooltipPlacement): TooltipPlacement => {
    if (!isLocaleRtl(locale.value)) return placement
    if (placement === 'left') return 'right'
    if (placement === 'right') return 'left'
    return placement
}

const props = withDefaults(
    defineProps<{
        text: string
        iconClass?: string
        iconSrc?: string
        customClass?: string
        buttonStyle:
        | 'primary'
        | 'secondary'
        | 'danger'
        | 'success'
        | 'warning'
        | 'info'
        | 'neutral'
        | 'void'
        loading?: boolean
        disabled?: boolean
        href?: string
        target?: string
        warnBefore?: string
        tooltipPlacement?: TooltipPlacement
    }>(),
    {
        tooltipPlacement: 'left'
    }
)

const emit = defineEmits(['click'])

const resolvedTooltipPlacement = computed(() => {
    void locale.value
    return flipPlacementForRtl(props.tooltipPlacement)
})

const classes = computed(() => {
    return [
        `icon-tooltip-btn ${props.customClass}`,
        `icon-tooltip-btn--${props.buttonStyle}`,
        `icon-tooltip-btn--placement-${resolvedTooltipPlacement.value}`,
        'flex items-center justify-center cursor-pointer shrink-0',
        'outline-node',
        props.buttonStyle === 'void' ? 'inline-flex' : '',
        props.buttonStyle === 'primary' ? 'bg-primary text-white' : '',
        props.buttonStyle === 'secondary' ? 'bg-white text-primary border border-primary/30' : '',
        props.buttonStyle === 'danger' ? 'bg-red-500 text-white' : '',
        props.buttonStyle === 'success' ? 'bg-green-500 text-white' : '',
        props.buttonStyle === 'warning' ? 'bg-yellow-500' : '',
        props.buttonStyle === 'info' ? 'bg-blue-500' : '',
        props.buttonStyle === 'neutral' ? 'bg-white text-black' : '',
        (props.loading || props.disabled) && 'opacity-50 cursor-not-allowed'
    ]
})

const handleClick = async () => {
    if (props.loading || props.disabled) return

    if (props.href) {
        if (props.target === '_blank') {
            window.open(props.href, '_blank')
        } else {
            router.push(props.href)
        }
        return
    }

    if (props.warnBefore) {
        useDialog().openDialog(ConfirmDialog, {
            message: props.warnBefore,
            onConfirm: async () => {
                await emit('click')
                useDialog().closeDialog()
            },
            onCancel: () => {
                useDialog().closeDialog()
            }
        })
    } else {
        await emit('click')
    }
}
</script>

<style scoped>
.icon-tooltip-btn {
    position: relative;
    overflow: visible;
    border: none;
    line-height: 1;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    --tooltip-arrow-size: 6px;
    --tooltip-arrow-gap: 0.125rem;
}

.icon-tooltip-btn__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 9999px;
}

.icon-tooltip-btn::before,
.icon-tooltip-btn::after {
    position: absolute;
    visibility: hidden;
    opacity: 0;
    transition:
        opacity 0.3s,
        visibility 0.3s,
        transform 0.2s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    z-index: 100;
    pointer-events: none;
}

.icon-tooltip-btn:hover::before,
.icon-tooltip-btn:hover::after,
.icon-tooltip-btn:focus-visible::before,
.icon-tooltip-btn:focus-visible::after {
    visibility: visible;
    opacity: 1;
}

.icon-tooltip-btn::before {
    content: attr(data-tooltip);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-weight: 500;
}

.icon-tooltip-btn::after {
    content: '';
    width: 0;
    height: 0;
    border: 6px solid transparent;
}

/* Right (default) — tooltip to the right, arrow points left toward button */
.icon-tooltip-btn--placement-right::before {
    left: calc(100% + var(--tooltip-arrow-size) + var(--tooltip-arrow-gap));
    top: 50%;
    transform: translateY(-50%) scale(0.9);
}

.icon-tooltip-btn--placement-right:hover::before,
.icon-tooltip-btn--placement-right:focus-visible::before {
    transform: translateY(-50%) scale(1);
}

.icon-tooltip-btn--placement-right::after {
    left: auto;
    right: calc(-1 * var(--tooltip-arrow-size));
    top: 50%;
    transform: translateY(-50%);
    border-width: 6px 6px 6px 0;
    border-style: solid;
    border-color: transparent;
}

/* Left — tooltip to the left, arrow points right toward button */
.icon-tooltip-btn--placement-left::before {
    right: calc(100% + var(--tooltip-arrow-size) + var(--tooltip-arrow-gap));
    top: 50%;
    transform: translateY(-50%) scale(0.9);
}

.icon-tooltip-btn--placement-left:hover::before,
.icon-tooltip-btn--placement-left:focus-visible::before {
    transform: translateY(-50%) scale(1);
}

.icon-tooltip-btn--placement-left::after {
    left: calc(-1 * var(--tooltip-arrow-size));
    top: 50%;
    transform: translateY(-50%);
}

/* Top — tooltip above, arrow points up toward tooltip */
.icon-tooltip-btn--placement-top::before {
    bottom: calc(100% + var(--tooltip-arrow-size) + var(--tooltip-arrow-gap));
    left: 50%;
    transform: translateX(-50%) scale(0.9);
}

.icon-tooltip-btn--placement-top:hover::before,
.icon-tooltip-btn--placement-top:focus-visible::before {
    transform: translateX(-50%) scale(1);
}

.icon-tooltip-btn--placement-top::after {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
}

/* Bottom — tooltip below, arrow points down toward tooltip */
.icon-tooltip-btn--placement-bottom::before {
    top: calc(100% + var(--tooltip-arrow-size) + var(--tooltip-arrow-gap));
    left: 50%;
    transform: translateX(-50%) scale(0.9);
}

.icon-tooltip-btn--placement-bottom:hover::before,
.icon-tooltip-btn--placement-bottom:focus-visible::before {
    transform: translateX(-50%) scale(1);
}

.icon-tooltip-btn--placement-bottom::after {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
}

.icon-tooltip-btn--primary::before {
    background-color: #1c369a;
    color: #fff;
}

.icon-tooltip-btn--primary.icon-tooltip-btn--placement-right::after {
    border-right-color: #1c369a;
}

.icon-tooltip-btn--primary.icon-tooltip-btn--placement-left::after {
    border-left-color: #1c369a;
}

.icon-tooltip-btn--primary.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #1c369a;
}

.icon-tooltip-btn--primary.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #1c369a;
}

.icon-tooltip-btn--secondary::before {
    background-color: #fff;
    color: #1c369a;
    border: 1px solid #d4d4d4;
}

.icon-tooltip-btn--secondary.icon-tooltip-btn--placement-right::after {
    border-right-color: #fff;
}

.icon-tooltip-btn--secondary.icon-tooltip-btn--placement-left::after {
    border-left-color: #fff;
}

.icon-tooltip-btn--secondary.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #fff;
}

.icon-tooltip-btn--secondary.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #fff;
}

.icon-tooltip-btn--danger::before {
    background-color: #ef4444;
    color: #fff;
}

.icon-tooltip-btn--danger.icon-tooltip-btn--placement-right::after {
    border-right-color: #ef4444;
}

.icon-tooltip-btn--danger.icon-tooltip-btn--placement-left::after {
    border-left-color: #ef4444;
}

.icon-tooltip-btn--danger.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #ef4444;
}

.icon-tooltip-btn--danger.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #ef4444;
}

.icon-tooltip-btn--success::before {
    background-color: #22c55e;
    color: #fff;
}

.icon-tooltip-btn--success.icon-tooltip-btn--placement-right::after {
    border-right-color: #22c55e;
}

.icon-tooltip-btn--success.icon-tooltip-btn--placement-left::after {
    border-left-color: #22c55e;
}

.icon-tooltip-btn--success.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #22c55e;
}

.icon-tooltip-btn--success.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #22c55e;
}

.icon-tooltip-btn--warning::before {
    background-color: #eab308;
    color: #000;
}

.icon-tooltip-btn--warning.icon-tooltip-btn--placement-right::after {
    border-right-color: #eab308;
}

.icon-tooltip-btn--warning.icon-tooltip-btn--placement-left::after {
    border-left-color: #eab308;
}

.icon-tooltip-btn--warning.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #eab308;
}

.icon-tooltip-btn--warning.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #eab308;
}

.icon-tooltip-btn--info::before {
    background-color: #3b82f6;
    color: #fff;
}

.icon-tooltip-btn--info.icon-tooltip-btn--placement-right::after {
    border-right-color: #3b82f6;
}

.icon-tooltip-btn--info.icon-tooltip-btn--placement-left::after {
    border-left-color: #3b82f6;
}

.icon-tooltip-btn--info.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #3b82f6;
}

.icon-tooltip-btn--info.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #3b82f6;
}

.icon-tooltip-btn--neutral::before {
    background-color: #fff;
    color: #000;
}

.icon-tooltip-btn--neutral.icon-tooltip-btn--placement-right::after {
    border-right-color: #fff;
}

.icon-tooltip-btn--neutral.icon-tooltip-btn--placement-left::after {
    border-left-color: #fff;
}

.icon-tooltip-btn--neutral.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #fff;
}

.icon-tooltip-btn--neutral.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #fff;
}

.icon-tooltip-btn--void::before {
    background-color: #525252;
    color: #fff;
}

.icon-tooltip-btn--void.icon-tooltip-btn--placement-right::after {
    border-right-color: #525252;
}

.icon-tooltip-btn--void.icon-tooltip-btn--placement-left::after {
    border-left-color: #525252;
}

.icon-tooltip-btn--void.icon-tooltip-btn--placement-top::after {
    border-bottom-color: #525252;
}

.icon-tooltip-btn--void.icon-tooltip-btn--placement-bottom::after {
    border-top-color: #525252;
}

.icon-tooltip-btn:disabled {
    cursor: not-allowed;
}
</style>
