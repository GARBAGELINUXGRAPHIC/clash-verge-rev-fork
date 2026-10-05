import { defineComponent, h, Transition, type PropType } from 'vue'
import {
  appleKey,
  motionProps,
  resolveMotion,
  type AppleContext,
} from '../core/context'
import { motionDuration } from '../core/motion'

const sizes = new WeakMap<
  object,
  {
    observer?: ResizeObserver
    animation?: Animation
    width: number
    height: number
    reset: () => void
  }
>()
// Layout dimensions exclude an ancestor's entrance transform. A scaled dialog
// must not make its content look smaller and start a second height animation.
const layoutSize = (element: HTMLElement) => ({
  width: element.offsetWidth,
  height: element.offsetHeight,
})

export const AppleAutoSize = defineComponent({
  name: 'AppleAutoSize',
  inject: { apple: { from: appleKey, default: null } },
  props: {
    ...motionProps,
    axis: { type: String as PropType<'height' | 'both'>, default: 'height' },
  },
  computed: {
    motionMode() {
      const context = this.apple as AppleContext | null
      return resolveMotion(
        this.motion,
        context?.motion.value.mode,
        context?.motion.value.reduced,
      )
    },
  },
  watch: {
    motionMode(mode) {
      if (mode !== 'full') {
        const state = sizes.get(this)
        state?.animation?.cancel()
        if (state) {
          state.animation = undefined
          state.reset()
        }
      }
    },
  },
  mounted() {
    const outer = this.$el as HTMLElement
    const inner = this.$refs.inner as HTMLElement
    const initial = layoutSize(inner)
    const state: {
      observer?: ResizeObserver
      animation?: Animation
      width: number
      height: number
      reset: () => void
    } = {
      width: initial.width,
      height: initial.height,
      reset: () => {
        outer.style.overflow = ''
        inner.style.width = ''
      },
    }
    sizes.set(this, state)
    if (typeof ResizeObserver === 'undefined') return
    state.observer = new ResizeObserver(() => {
      const next = layoutSize(inner)
      if (
        Math.abs(next.height - state.height) < 0.5 &&
        (this.axis !== 'both' || Math.abs(next.width - state.width) < 0.5)
      )
        return
      const current = state.animation ? layoutSize(outer) : state
      const from = {
        height: `${current.height}px`,
        ...(this.axis === 'both' ? { width: `${current.width}px` } : {}),
      }
      const to = {
        height: `${next.height}px`,
        ...(this.axis === 'both' ? { width: `${next.width}px` } : {}),
      }
      state.animation?.cancel()
      state.animation = undefined
      state.reset()
      state.width = next.width
      state.height = next.height
      const duration = motionDuration(outer)
      if (duration && outer.animate) {
        outer.style.overflow = 'clip'
        if (this.axis === 'both') inner.style.width = `${next.width}px`
        state.animation = outer.animate([from, to], {
          duration,
          easing: 'cubic-bezier(.2,.65,.3,1)',
        })
        state.animation.onfinish = () => {
          state.reset()
          state.animation = undefined
        }
      }
    })
    state.observer.observe(inner)
  },
  beforeUnmount() {
    const state = sizes.get(this)
    state?.observer?.disconnect()
    state?.animation?.cancel()
    sizes.delete(this)
  },
  render() {
    return h(
      'div',
      { class: 'apple-auto-size', 'data-apple-motion': this.motionMode },
      [
        h(
          'div',
          { ref: 'inner', class: 'apple-auto-size__inner' },
          this.$slots.default?.(),
        ),
      ],
    )
  },
})

export const AppleTransition = defineComponent({
  name: 'AppleTransition',
  inheritAttrs: false,
  inject: { apple: { from: appleKey, default: null } },
  props: {
    ...motionProps,
    name: {
      type: String as PropType<'page' | 'slide-x' | 'slide-y' | 'fade'>,
      default: 'slide-y',
    },
    mode: {
      type: String as PropType<'out-in' | 'in-out' | 'default'>,
      default: 'out-in',
    },
    appear: { type: Boolean, default: true },
  },
  render() {
    const context = this.apple as AppleContext | null
    const mode = resolveMotion(
      this.motion,
      context?.motion.value.mode,
      context?.motion.value.reduced,
    )
    return h(
      Transition,
      {
        ...this.$attrs,
        name: mode === 'full' ? `apple-${this.name}` : 'apple-fade',
        mode: this.mode === 'default' ? undefined : this.mode,
        appear: this.appear,
        css: mode !== 'none',
      },
      this.$slots,
    )
  },
})

export const motionComponents = { AppleAutoSize, AppleTransition }
