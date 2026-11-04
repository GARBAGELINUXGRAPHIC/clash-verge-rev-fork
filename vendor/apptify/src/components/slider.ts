import { defineComponent, h, useId, type PropType, type Slots, type VNodeChild } from 'vue'

const fieldProps = {
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: Boolean,
  loading: Boolean,
  required: Boolean,
  motion: { type: String as PropType<'inherit' | 'auto' | 'full' | 'reduced' | 'none'>, default: 'inherit' },
}

interface FieldVm {
  label: string; hint: string; error: string; disabled: boolean; loading: boolean
  required: boolean; motion: string; inputId: string
  $attrs: Record<string, unknown>; $slots: Slots
}

function fieldId(vm: FieldVm): string { return String(vm.$attrs.id || vm.inputId) }

function controlAttrs(vm: FieldVm, hasLabel = !!vm.label) {
  return {
    ...vm.$attrs,
    id: fieldId(vm),
    disabled: vm.disabled || vm.loading,
    required: vm.required,
    'aria-label': vm.$attrs['aria-label'] || vm.label || undefined,
    'aria-labelledby': vm.$attrs['aria-labelledby'] || (!vm.$attrs['aria-label'] && hasLabel ? `${fieldId(vm)}-label` : undefined),
    'aria-invalid': vm.error ? true : undefined,
    'aria-busy': vm.loading || undefined,
    'aria-describedby': [vm.$attrs['aria-describedby'], (vm.error || vm.hint) ? `${fieldId(vm)}-message` : ''].filter(Boolean).join(' ') || undefined,
  }
}

function field(vm: FieldVm, control: VNodeChild, classes = '', error = vm.error): VNodeChild {
  return h('div', {
    class: ['apple-field', classes, { 'is-disabled': vm.disabled, 'has-error': !!error }],
    'data-apple-motion': vm.motion,
  }, [
    vm.label ? h('span', { class: 'apple-field__label', id: `${fieldId(vm)}-label` }, [vm.label, vm.required ? h('span', { 'aria-hidden': true, class: 'apple-field__required' }, ' *') : null]) : null,
    control,
    error || vm.hint ? h('p', { id: `${fieldId(vm)}-message`, class: ['apple-field__message', { 'is-error': !!error }], role: error ? 'alert' : undefined }, error || vm.hint) : null,
  ])
}

function numericValue(event: Event) { return Number((event.target as HTMLInputElement).value) }

export const AppleSlider = defineComponent({
  name: 'AppleSlider', inheritAttrs: false,
  props: { ...fieldProps, modelValue: { type: Number, default: 0 }, min: { type: Number, default: 0 }, max: { type: Number, default: 100 }, step: { type: Number, default: 1 }, showValue: { type: Boolean, default: true }, formatValue: { type: Function as PropType<(value: number) => string>, default: (value: number) => String(value) } },
  emits: ['update:modelValue', 'change'], data() { return { inputId: useId() } },
  render() {
    const percentage = this.max <= this.min ? 0 : Math.max(0, Math.min(100, (this.modelValue - this.min) / (this.max - this.min) * 100))
    return field(this, h('div', { class: 'apple-slider-row' }, [h('input', { ...controlAttrs(this), type: 'range', class: ['apple-slider', this.$attrs.class], min: this.min, max: this.max, step: this.step, value: this.modelValue, 'aria-valuetext': this.formatValue(this.modelValue), style: { '--apple-slider-progress': `${percentage}%` }, onInput: (event: Event) => this.$emit('update:modelValue', numericValue(event)), onChange: (event: Event) => this.$emit('change', numericValue(event)) }), this.showValue ? h('output', { for: fieldId(this), class: 'apple-slider__value' }, this.formatValue(this.modelValue)) : null]))
  },
})
