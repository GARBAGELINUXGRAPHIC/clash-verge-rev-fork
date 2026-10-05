import {
  defineComponent,
  h,
  Transition,
  useId,
  withDirectives,
  type PropType,
} from 'vue'
import { AppleSelection } from '../core/motion'
import { AppleAutoSize } from './motion'
import type { AppleItem, AppleValue } from './content'

type Motion = 'inherit' | 'auto' | 'full' | 'reduced' | 'none'
const motionProps = {
  motion: { type: String as PropType<Motion>, default: 'inherit' },
}
const itemProps = {
  items: { type: Array as PropType<AppleItem[]>, default: () => [] },
}
const valueProp = {
  type: [String, Number] as PropType<AppleValue>,
  default: undefined,
}
const uidSetup = () => ({ uid: useId() })
const tabsProps = {
  ...motionProps,
  ...itemProps,
  modelValue: valueProp,
  label: { type: String, default: '内容分类' },
  disabled: Boolean,
}

export const AppleTabs = defineComponent({
  name: 'AppleTabs',
  setup: uidSetup,
  props: {
    ...tabsProps,
    variant: {
      type: String as PropType<'underline' | 'bar'>,
      default: 'underline',
    },
  },
  emits: ['update:modelValue', 'change'],
  data: () => ({
    localValue: undefined as AppleValue | undefined,
    backward: false,
    panelPoses: new Map<string, string>(),
  }),
  computed: {
    activeValue(): AppleValue | undefined {
      const value = this.modelValue ?? this.localValue
      return (
        this.items.find((item) => item.value === value && !item.disabled)
          ?.value ?? this.items.find((item) => !item.disabled)?.value
      )
    },
    activeItem(): AppleItem | undefined {
      return this.items.find((item) => item.value === this.activeValue)
    },
  },
  watch: {
    activeValue(
      value: AppleValue | undefined,
      previous: AppleValue | undefined,
    ) {
      // Vue replaces a still-leaving keyed panel on reversal. Preserve its rendered pose.
      this.panelPoses.clear()
      for (const panel of (
        this.$el as HTMLElement
      ).querySelectorAll<HTMLElement>('.apple-tabs__panel')) {
        this.panelPoses.set(panel.id, getComputedStyle(panel).transform)
      }
      this.backward =
        this.items.findIndex((item) => item.value === value) <
        this.items.findIndex((item) => item.value === previous)
    },
  },
  methods: {
    select(item: AppleItem) {
      if (this.disabled || item.disabled) return
      this.localValue = item.value
      this.$emit('update:modelValue', item.value)
      this.$emit('change', item.value)
    },
    keydown(event: KeyboardEvent, index: number) {
      const enabled = this.items
        .map((item, i) => (!item.disabled ? i : -1))
        .filter((i) => i >= 0)
      if (!enabled.length || this.disabled) return
      const current = enabled.indexOf(index)
      let next: number | undefined
      if (event.key === 'ArrowRight')
        next = enabled[(current + 1) % enabled.length]
      if (event.key === 'ArrowLeft')
        next = enabled[(current - 1 + enabled.length) % enabled.length]
      if (event.key === 'Home') next = enabled[0]
      if (event.key === 'End') next = enabled[enabled.length - 1]
      if (next === undefined) return
      event.preventDefault()
      this.select(this.items[next]!)
      const buttons = (
        this.$refs.tablist as HTMLElement
      ).querySelectorAll<HTMLButtonElement>('[role="tab"]')
      buttons[next]?.focus()
    },
  },
  render() {
    return h(
      'div',
      {
        class: [
          'apple-tabs',
          `apple-tabs--${this.variant}`,
          { 'is-backward': this.backward },
        ],
        'data-motion': this.motion,
      },
      [
        withDirectives(
          h(
            'div',
            {
              class: 'apple-tabs__list',
              role: 'tablist',
              'aria-label': this.label,
              ref: 'tablist',
            },
            this.items.map((item, index) =>
              h(
                'button',
                {
                  type: 'button',
                  id: `${this.uid}-tab-${index}`,
                  role: 'tab',
                  class: [
                    'apple-tabs__tab',
                    { 'is-active': item.value === this.activeValue },
                  ],
                  'aria-selected': item.value === this.activeValue,
                  'data-apple-selected': item.value === this.activeValue,
                  'aria-controls': `${this.uid}-panel-${index}`,
                  disabled: this.disabled || item.disabled,
                  tabindex: item.value === this.activeValue ? 0 : -1,
                  onClick: () => this.select(item),
                  onKeydown: (event: KeyboardEvent) =>
                    this.keydown(event, index),
                },
                item.label,
              ),
            ),
          ),
          [[AppleSelection]],
        ),
        h(
          AppleAutoSize,
          { class: 'apple-tabs__viewport', motion: this.motion },
          {
            default: () =>
              h(
                Transition,
                {
                  name: 'apple-tab-panel',
                  onBeforeEnter: (element: Element) => {
                    const el = element as HTMLElement
                    const pose = this.panelPoses.get(element.id)
                    el.style.setProperty(
                      '--apple-tab-enter-transform',
                      pose && pose !== 'none'
                        ? pose
                        : `translateX(${this.backward ? -100 : 100}%)`,
                    )
                  },
                  onAfterEnter: (element: Element) => {
                    ;(element as HTMLElement).style.removeProperty(
                      '--apple-tab-enter-transform',
                    )
                  },
                  onBeforeLeave: (element: Element) => {
                    const el = element as HTMLElement
                    el.style.setProperty(
                      '--apple-tab-leave-from',
                      this.panelPoses.get(element.id) ||
                        getComputedStyle(el).transform,
                    )
                    el.style.setProperty(
                      '--apple-tab-leave-to',
                      `translateX(${this.backward ? 100 : -100}%)`,
                    )
                    element.setAttribute('inert', '')
                    element.setAttribute('aria-hidden', 'true')
                  },
                  onLeaveCancelled: (element: Element) => {
                    element.removeAttribute('inert')
                    element.removeAttribute('aria-hidden')
                  },
                },
                {
                  default: () =>
                    h(
                      'div',
                      {
                        key: this.activeValue,
                        id: `${this.uid}-panel-${this.items.findIndex((item) => item.value === this.activeValue)}`,
                        class: 'apple-tabs__panel',
                        role: 'tabpanel',
                        tabindex: 0,
                        'aria-labelledby': this.activeItem
                          ? `${this.uid}-tab-${this.items.findIndex((item) => item.value === this.activeValue)}`
                          : undefined,
                        'aria-label': !this.activeItem ? this.label : undefined,
                      },
                      this.$slots[`panel-${this.activeValue}`]?.({
                        item: this.activeItem,
                      }) ??
                        this.$slots.default?.({
                          item: this.activeItem,
                          value: this.activeValue,
                        }) ??
                        this.activeItem?.content,
                    ),
                },
              ),
          },
        ),
      ],
    )
  },
})

export const AppleTabBar = defineComponent({
  name: 'AppleTabBar',
  props: tabsProps,
  emits: ['update:modelValue', 'change'],
  render() {
    return h(
      AppleTabs,
      {
        ...this.$props,
        variant: 'bar',
        'onUpdate:modelValue': (value: AppleValue) =>
          this.$emit('update:modelValue', value),
        onChange: (value: AppleValue) => this.$emit('change', value),
      },
      this.$slots,
    )
  },
})
