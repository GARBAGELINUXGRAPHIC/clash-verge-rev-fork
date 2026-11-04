// vendor/apptify/src/components/slider.ts
import { defineComponent, h, useId } from "vue";
var fieldProps = {
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  disabled: Boolean,
  loading: Boolean,
  required: Boolean,
  motion: { type: String, default: "inherit" }
};
function fieldId(vm) {
  return String(vm.$attrs.id || vm.inputId);
}
function controlAttrs(vm, hasLabel = !!vm.label) {
  return {
    ...vm.$attrs,
    id: fieldId(vm),
    disabled: vm.disabled || vm.loading,
    required: vm.required,
    "aria-label": vm.$attrs["aria-label"] || vm.label || void 0,
    "aria-labelledby": vm.$attrs["aria-labelledby"] || (!vm.$attrs["aria-label"] && hasLabel ? `${fieldId(vm)}-label` : void 0),
    "aria-invalid": vm.error ? true : void 0,
    "aria-busy": vm.loading || void 0,
    "aria-describedby": [vm.$attrs["aria-describedby"], vm.error || vm.hint ? `${fieldId(vm)}-message` : ""].filter(Boolean).join(" ") || void 0
  };
}
function field(vm, control, classes = "", error = vm.error) {
  return h("div", {
    class: ["apple-field", classes, { "is-disabled": vm.disabled, "has-error": !!error }],
    "data-apple-motion": vm.motion
  }, [
    vm.label ? h("span", { class: "apple-field__label", id: `${fieldId(vm)}-label` }, [vm.label, vm.required ? h("span", { "aria-hidden": true, class: "apple-field__required" }, " *") : null]) : null,
    control,
    error || vm.hint ? h("p", { id: `${fieldId(vm)}-message`, class: ["apple-field__message", { "is-error": !!error }], role: error ? "alert" : void 0 }, error || vm.hint) : null
  ]);
}
function numericValue(event) {
  return Number(event.target.value);
}
var AppleSlider = defineComponent({
  name: "AppleSlider",
  inheritAttrs: false,
  props: { ...fieldProps, modelValue: { type: Number, default: 0 }, min: { type: Number, default: 0 }, max: { type: Number, default: 100 }, step: { type: Number, default: 1 }, showValue: { type: Boolean, default: true }, formatValue: { type: Function, default: (value) => String(value) } },
  emits: ["update:modelValue", "change"],
  data() {
    return { inputId: useId() };
  },
  render() {
    const percentage = this.max <= this.min ? 0 : Math.max(0, Math.min(100, (this.modelValue - this.min) / (this.max - this.min) * 100));
    return field(this, h("div", { class: "apple-slider-row" }, [h("input", { ...controlAttrs(this), type: "range", class: ["apple-slider", this.$attrs.class], min: this.min, max: this.max, step: this.step, value: this.modelValue, "aria-valuetext": this.formatValue(this.modelValue), style: { "--apple-slider-progress": `${percentage}%` }, onInput: (event) => this.$emit("update:modelValue", numericValue(event)), onChange: (event) => this.$emit("change", numericValue(event)) }), this.showValue ? h("output", { for: fieldId(this), class: "apple-slider__value" }, this.formatValue(this.modelValue)) : null]));
  }
});
export {
  AppleSlider
};
