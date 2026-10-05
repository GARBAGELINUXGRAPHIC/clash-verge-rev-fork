import { popupTransition } from '../core/popup-motion'
import { isTouchDevice } from '../core/device'
import { defineComponent, h, useId, type PropType, type VNodeChild } from 'vue'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from 'lucide-vue-next'
import {
  addDays,
  addMonths,
  format as formatDate,
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { motionDuration, ripple } from '../core/motion'
import {
  appleKey,
  motionProps,
  resolveMotion,
  type AppleContext,
} from '../core/context'
import { AppleAutoSize } from './motion'
import { AppleTabBar } from './tabs'

type Part = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
type Parts = Record<Part, string>
type Segment = { part: Part; separator: string; width: number }
const labels: Record<Part, string> = {
  year: '年',
  month: '月',
  day: '日',
  hour: '时',
  minute: '分',
  second: '秒',
}
const emptyParts = (): Parts => ({
  year: '',
  month: '',
  day: '',
  hour: '',
  minute: '',
  second: '',
})
const presets: Record<string, string> = {
  year: 'YYYY',
  month: 'YYYY/MM',
  day: 'YYYY/MM/DD',
  date: 'YYYY/MM/DD',
  hour: 'YYYY/MM/DD HH',
  minute: 'YYYY/MM/DD HH:mm',
  second: 'YYYY/MM/DD HH:mm:ss',
  hm: 'HH:mm',
  hms: 'HH:mm:ss',
  ym: 'YYYY/MM',
  ymd: 'YYYY/MM/DD',
  ymdhm: 'YYYY/MM/DD HH:mm',
  ymdhms: 'YYYY/MM/DD HH:mm:ss',
}

// Lowercase m is a month before the hour segment and a minute after it.
function segmentsFor(pattern: string): Segment[] {
  const segments: Segment[] = []
  const matches = [...pattern.matchAll(/y+|M+|d+|h+|m+|s+/gi)]
  let time = false
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index]!,
      token = match[0]!,
      char = token[0]!.toLowerCase()
    if (char === 'h') time = true
    const part: Part =
      char === 'y'
        ? 'year'
        : char === 'd'
          ? 'day'
          : char === 'h'
            ? 'hour'
            : char === 's'
              ? 'second'
              : time
                ? 'minute'
                : 'month'
    if (segments.some((segment) => segment.part === part)) continue
    const next = matches[index + 1]
    const separator = pattern.slice(
      match.index! + token.length,
      next ? next.index! : pattern.length,
    )
    segments.push({ part, width: part === 'year' ? 4 : 2, separator })
  }
  return segments.length ? segments : segmentsFor('YYYY/MM/DD')
}
function dateParts(date: Date): Parts {
  return {
    year: String(date.getFullYear()).padStart(4, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    hour: String(date.getHours()).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0'),
    second: String(date.getSeconds()).padStart(2, '0'),
  }
}
function dateFrom(parts: Parts, fallback: Date): Date {
  const date = new Date(fallback)
  date.setDate(1)
  date.setFullYear(
    Number(parts.year || fallback.getFullYear()),
    Number(parts.month || fallback.getMonth() + 1) - 1,
    Number(parts.day || 1),
  )
  date.setHours(
    Number(parts.hour || 0),
    Number(parts.minute || 0),
    Number(parts.second || 0),
    0,
  )
  return date
}
function readParts(value: string, segments: Segment[]): Parts {
  const result = emptyParts(),
    numbers = value.match(/\d+/g) || []
  segments.forEach((segment, index) => {
    result[segment.part] = numbers[index] || ''
  })
  return result
}
function canonical(parts: Parts, segments: Segment[]): string {
  const present = (part: Part) =>
    segments.some((segment) => segment.part === part)
  const date = (['year', 'month', 'day'] as Part[])
    .filter(present)
    .map((part) => parts[part].padStart(part === 'year' ? 4 : 2, '0'))
    .join('-')
  const time = (['hour', 'minute', 'second'] as Part[])
    .filter(present)
    .map((part) => parts[part].padStart(2, '0'))
    .join(':')
  return date && time ? `${date}T${time}` : date || time
}
function hoverTrail(event: PointerEvent, selected: boolean) {
  const element = event.currentTarget as HTMLElement
  element.getAnimations?.().forEach((animation) => animation.cancel())
  if (
    isTouchDevice.value ||
    event.pointerType === 'touch' ||
    selected ||
    element.closest('[data-apple-motion="none"]') ||
    element.closest('[data-apple-motion="reduced"]') ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
    return
  const color = 'rgb(128 128 128 / 8%)'
  element.animate?.(
    [{ backgroundColor: color }, { backgroundColor: 'transparent' }],
    { duration: 240, easing: 'ease-out' },
  )
}

interface CalendarPage {
  key: string
  x: number
  content: VNodeChild[]
}
interface CalendarSlide {
  pages: CalendarPage[]
  animation?: Animation
  pending: boolean
  previous: string
}
const calendarSlides = new WeakMap<object, CalendarSlide>()

// All visible pages share one translation. Freezing their painted positions
// before a new destination keeps even a days/months/years reversal gap-free.
const CalendarPages = defineComponent({
  name: 'AppleCalendarPages',
  inject: { apple: { from: appleKey, default: null } },
  props: {
    ...motionProps,
    pageKey: { type: String, required: true },
    direction: { type: Number, default: 1 },
  },
  data: () => ({ revision: 0 }),
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
  created() {
    calendarSlides.set(this, {
      pages: [],
      pending: false,
      previous: this.pageKey,
    })
  },
  watch: {
    pageKey(_value: string, previous: string) {
      const state = calendarSlides.get(this)!,
        viewport = this.$el as HTMLElement,
        left = viewport.getBoundingClientRect().left
      const elements = [
        ...viewport.querySelectorAll<HTMLElement>('.apple-calendar__page'),
      ]
      for (const page of state.pages) {
        const el = elements.find((el) => el.dataset.calendarPage === page.key)
        if (el) page.x = el.getBoundingClientRect().left - left
      }
      state.animation?.cancel()
      state.animation = undefined
      ;(this.$refs.pages as HTMLElement).style.transform = ''
      for (const page of state.pages) {
        const el = elements.find((el) => el.dataset.calendarPage === page.key)
        if (el) el.style.transform = `translateX(${page.x}px)`
      }
      state.previous = previous
      state.pending = true
    },
    motionMode(mode: string) {
      if (mode !== 'full') this.finish()
    },
  },
  updated() {
    const state = calendarSlides.get(this)!
    if (!state.pending) return
    state.pending = false
    const active = state.pages.find((page) => page.key === this.pageKey)!,
      track = this.$refs.pages as HTMLElement
    const width = (this.$el as HTMLElement).clientWidth || 1,
      baseDuration = motionDuration(track),
      duration =
        baseDuration *
        Math.min(baseDuration <= 80 ? 1 : 1.6, Math.abs(active.x) / width)
    if (!duration || !track.animate) {
      this.finish()
      return
    }
    track.style.willChange = 'transform'
    const animation = track.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-active.x}px)` },
      ],
      { duration, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'both' },
    )
    state.animation = animation
    animation.onfinish = () => {
      if (state.animation === animation) this.finish()
    }
  },
  beforeUnmount() {
    const state = calendarSlides.get(this)
    if (state) {
      state.animation?.cancel()
      state.animation = undefined
    }
    calendarSlides.delete(this)
  },
  methods: {
    finish() {
      const state = calendarSlides.get(this)!,
        active = state.pages.find((page) => page.key === this.pageKey)
      state.animation?.cancel()
      state.animation = undefined
      state.pending = false
      const track = this.$refs.pages as HTMLElement | undefined
      if (track) {
        track.style.transform = ''
        track.style.willChange = ''
      }
      if (active) active.x = 0
      state.pages = active ? [active] : []
      this.revision++
    },
  },
  render() {
    void this.revision
    const state = calendarSlides.get(this)!
    let active = state.pages.find((page) => page.key === this.pageKey)
    if (!active) {
      active = {
        key: this.pageKey,
        x: state.pages.length
          ? (state.pages.find((page) => page.key === state.previous)?.x ?? 0) +
            this.direction * (this.$el as HTMLElement).clientWidth
          : 0,
        content: [],
      }
      state.pages.push(active)
    }
    active.content = this.$slots.default?.() ?? []
    return h(
      AppleAutoSize,
      { class: 'apple-calendar__viewport', motion: this.motion },
      {
        default: () =>
          h(
            'div',
            { ref: 'pages', class: 'apple-calendar__pages' },
            state.pages.map((page) =>
              h(
                'div',
                {
                  key: page.key,
                  class: [
                    'apple-calendar__page',
                    { 'is-leaving': page !== active },
                  ],
                  'data-calendar-page': page.key,
                  inert: page !== active || undefined,
                  'aria-hidden': page !== active || undefined,
                  style: { transform: `translateX(${page.x}px)` },
                },
                page.content,
              ),
            ),
          ),
      },
    )
  },
})

const timeRowHeight = 40,
  timeWheelLength = 1000,
  timeWheelMiddle = 450
const repeatedTimeIndex = (
  value: number,
  count: number,
  around = timeWheelMiddle,
) =>
  value +
  count *
    Math.max(
      0,
      Math.min(
        Math.floor((timeWheelLength - 1 - value) / count),
        Math.round((around - value) / count),
      ),
    )
interface TimeWheelState {
  frame: number
  timer?: ReturnType<typeof setTimeout>
  moving: boolean
  interacting: boolean
  target?: number
  committed?: number
}
const timeWheelStates = new WeakMap<object, TimeWheelState>()

// Keep a long cyclic track while mounting only the rows near the viewport.
// Scroll position is the source of selection, including during a clicked move.
const TimeWheel = defineComponent({
  name: 'AppleDateTimeWheel',
  props: {
    modelValue: Number,
    fallback: { type: Number, required: true },
    count: { type: Number, required: true },
    label: { type: String, required: true },
    disabledValues: { type: Array as PropType<boolean[]>, default: () => [] },
    active: Boolean,
    revision: Number,
  },
  emits: ['update:modelValue', 'change', 'escape'],
  data() {
    const index = repeatedTimeIndex(
      this.modelValue ?? this.fallback,
      this.count,
    )
    return {
      uid: useId(),
      centerIndex: index,
      windowIndex: index,
      scrollPosition: index,
    }
  },
  computed: {
    rows(): number[] {
      const first = Math.max(0, this.windowIndex - 8),
        last = Math.min(timeWheelLength - 1, this.windowIndex + 8)
      return Array.from(
        { length: last - first + 1 },
        (_, index) => first + index,
      )
    },
  },
  watch: {
    modelValue(value: number | undefined) {
      const next = value ?? this.fallback
      if (value === undefined || next !== this.centerIndex % this.count)
        this.goTo(
          repeatedTimeIndex(next, this.count, this.centerIndex),
          false,
          false,
        )
      if (!timeWheelStates.get(this)!.interacting)
        timeWheelStates.get(this)!.committed = value
    },
    active(value: boolean) {
      if (!value) {
        this.interrupt()
        timeWheelStates.get(this)!.interacting = false
      }
    },
    revision() {
      this.goTo(
        repeatedTimeIndex(
          this.modelValue ?? this.fallback,
          this.count,
          this.centerIndex,
        ),
        false,
        false,
      )
    },
  },
  created() {
    timeWheelStates.set(this, {
      frame: 0,
      moving: false,
      interacting: false,
      committed: this.modelValue,
    })
  },
  mounted() {
    ;(this.$refs.viewport as HTMLElement).scrollTop =
      this.centerIndex * timeRowHeight
  },
  beforeUnmount() {
    this.interrupt()
    timeWheelStates.delete(this)
  },
  methods: {
    rowPose(index: number) {
      // Project a cylinder around the viewport's center using the fractional
      // native scroll position, so depth follows the finger rather than snapping.
      const distance = index - this.scrollPosition,
        angle = Math.max(-90, Math.min(90, distance * 22)),
        radians = (angle * Math.PI) / 180
      const z = 110 * (Math.cos(radians) - 1),
        y = (110 * Math.sin(radians) * 600) / (600 - z)
      return {
        top: `${index * timeRowHeight}px`,
        transform: `translateY(${y - distance * timeRowHeight}px) perspective(600px) translateZ(${z}px) rotateX(${-angle}deg)`,
        opacity:
          Math.max(0, Math.cos(radians)) *
          0.72 ** Math.abs(distance) *
          (this.enabled(index) ? 1 : 0.35),
        visibility:
          Math.abs(distance) > 4 ? ('hidden' as const) : ('visible' as const),
      }
    },
    interrupt() {
      const state = timeWheelStates.get(this)!
      cancelAnimationFrame(state.frame)
      clearTimeout(state.timer)
      state.frame = 0
      state.moving = false
      state.target = undefined
    },
    beginGesture() {
      this.interrupt()
      timeWheelStates.get(this)!.interacting = true
    },
    enabled(index: number): boolean {
      return (
        index >= 0 &&
        index < timeWheelLength &&
        !this.disabledValues[index % this.count]
      )
    },
    nearestEnabled(index: number, direction = 0): number | undefined {
      if (this.enabled(index)) return index
      for (let distance = 1; distance <= this.count; distance++)
        for (const sign of direction < 0 ? [-1, 1] : [1, -1])
          if (this.enabled(index + distance * sign))
            return index + distance * sign
    },
    readScroll() {
      const viewport = this.$refs.viewport as HTMLElement
      if (!this.active || viewport.closest('[inert]')) return
      this.scrollPosition = viewport.scrollTop / timeRowHeight
      const index = Math.max(
        0,
        Math.min(
          timeWheelLength - 1,
          Math.round(viewport.scrollTop / timeRowHeight),
        ),
      )
      if (Math.abs(index - this.windowIndex) > 3) this.windowIndex = index
      if (index !== this.centerIndex) {
        this.centerIndex = index
        if (this.enabled(index) && timeWheelStates.get(this)!.interacting)
          this.$emit('update:modelValue', index % this.count)
      }
    },
    scroll() {
      this.readScroll()
      const state = timeWheelStates.get(this)!
      clearTimeout(state.timer)
      if (!state.moving && state.interacting && this.active)
        state.timer = setTimeout(() => this.settle(), 140)
    },
    finish() {
      const state = timeWheelStates.get(this)!,
        value = this.centerIndex % this.count
      if (!this.active || !state.interacting || !this.enabled(this.centerIndex))
        return
      if (this.modelValue === undefined) this.$emit('update:modelValue', value)
      if (state.committed !== value) {
        state.committed = value
        this.$emit('change', value)
      }
      state.interacting = false
      // Shift by whole cycles near either edge; visible row positions stay identical.
      if (this.centerIndex < 120 || this.centerIndex > timeWheelLength - 120) {
        const index = repeatedTimeIndex(value, this.count),
          offset = index - this.centerIndex
        this.centerIndex = index
        this.windowIndex += offset
        this.scrollPosition += offset
        ;(this.$refs.viewport as HTMLElement).scrollTop +=
          offset * timeRowHeight
      }
    },
    settle() {
      if (!this.active || !timeWheelStates.get(this)!.interacting) return
      const index = this.nearestEnabled(this.centerIndex)
      if (index !== undefined) this.goTo(index, true)
    },
    goTo(index: number, smooth = true, select = true) {
      const viewport = this.$refs.viewport as HTMLElement | undefined
      if (!viewport) return
      if (select) {
        const enabled = this.nearestEnabled(index, index - this.centerIndex)
        if (enabled === undefined) return
        index = enabled
      }
      this.interrupt()
      const state = timeWheelStates.get(this)!,
        start = viewport.scrollTop,
        end = index * timeRowHeight
      state.interacting = select
      const duration = smooth ? motionDuration(viewport) : 0
      const write = (position: number) => {
        viewport.scrollTop = position
        if (select) this.readScroll()
      }
      if (!duration || Math.abs(start - end) < 0.5) {
        write(end)
        this.centerIndex = index
        this.windowIndex = index
        this.scrollPosition = index
        if (select) this.finish()
        return
      }
      state.moving = true
      state.target = index
      const started = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration)
        write(start + (end - start) * (1 - (1 - progress) ** 3))
        if (progress < 1) state.frame = requestAnimationFrame(tick)
        else {
          state.frame = 0
          state.moving = false
          state.target = undefined
          this.finish()
        }
      }
      state.frame = requestAnimationFrame(tick)
    },
    keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.$emit('escape')
        return
      }
      const state = timeWheelStates.get(this)!,
        index = state.target ?? this.centerIndex
      const offsets: Record<string, number> = {
        ArrowUp: -1,
        ArrowDown: 1,
        PageUp: -5,
        PageDown: 5,
      }
      let target =
        event.key in offsets
          ? index + offsets[event.key]!
          : event.key === 'Home'
            ? index - (index % this.count)
            : event.key === 'End'
              ? index - (index % this.count) + this.count - 1
              : undefined
      if (event.key === 'Enter' || event.key === ' ') target = index
      if (target === undefined) return
      event.preventDefault()
      this.goTo(Math.max(0, Math.min(timeWheelLength - 1, target)))
    },
  },
  render() {
    return h('div', { class: 'apple-calendar__time-wheel' }, [
      h(
        'div',
        {
          ref: 'viewport',
          class: 'apple-calendar__time-values',
          role: 'listbox',
          tabindex: 0,
          'aria-label': this.label,
          'aria-activedescendant': `${this.uid}-time-${this.centerIndex}`,
          'data-center-index': this.centerIndex,
          'data-center-value': this.centerIndex % this.count,
          onScroll: this.scroll,
          onWheel: this.beginGesture,
          onPointerdown: this.beginGesture,
          onKeydown: this.keydown,
        },
        [
          h(
            'div',
            {
              class: 'apple-calendar__time-track',
              style: { height: `${timeWheelLength * timeRowHeight}px` },
            },
            this.rows.map((index) => {
              const value = index % this.count,
                selected = index === this.centerIndex,
                disabled = !this.enabled(index)
              return ripple(
                h(
                  'div',
                  {
                    key: index,
                    id: `${this.uid}-time-${index}`,
                    class: [
                      'apple-calendar__time-option',
                      { 'is-selected': selected, 'is-disabled': disabled },
                    ],
                    role: 'option',
                    'aria-selected': selected,
                    'aria-disabled': disabled || undefined,
                    'aria-posinset': value + 1,
                    'aria-setsize': this.count,
                    'data-time-index': index,
                    'data-time-value': value,
                    style: this.rowPose(index),
                    onClick: () => {
                      if (disabled || !this.active) return
                      ;(this.$refs.viewport as HTMLElement).focus({
                        preventScroll: true,
                      })
                      this.goTo(index)
                    },
                  },
                  String(value).padStart(2, '0'),
                ),
                !disabled,
              )
            }),
          ),
        ],
      ),
    ])
  },
})

export const AppleDatePicker = defineComponent({
  name: 'AppleDatePicker',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: '' },
    hint: { type: String, default: '' },
    error: { type: String, default: '' },
    disabled: Boolean,
    loading: Boolean,
    required: Boolean,
    min: String,
    max: String,
    format: String,
    granularity: String,
    type: {
      type: String as PropType<'date' | 'month' | 'datetime-local' | 'time'>,
      default: 'date',
    },
    motion: {
      type: String as PropType<
        'inherit' | 'auto' | 'full' | 'reduced' | 'none'
      >,
      default: 'inherit',
    },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      inputId: useId(),
      now: new Date(),
      clockNow: new Date(),
      timeRevision: 0,
      draft: emptyParts(),
      opened: false,
      tab: 'date',
      view: 'days',
      cursor: startOfMonth(new Date()),
      focusedDate: '',
      direction: 1,
      lastEmitted: null as string | null,
      outside: null as ((event: PointerEvent) => void) | null,
    }
  },
  computed: {
    pattern(): string {
      return (
        this.format ||
        presets[this.granularity || ''] ||
        (this.type === 'month'
          ? 'YYYY/MM'
          : this.type === 'datetime-local'
            ? 'YYYY/MM/DD HH:mm'
            : this.type === 'time'
              ? 'HH:mm'
              : 'YYYY/MM/DD')
      )
    },
    segments(): Segment[] {
      return segmentsFor(this.pattern)
    },
    hasDate(): boolean {
      return this.segments.some((segment) =>
        ['year', 'month', 'day'].includes(segment.part),
      )
    },
    hasTime(): boolean {
      return this.segments.some((segment) =>
        ['hour', 'minute', 'second'].includes(segment.part),
      )
    },
    placeholderParts(): Parts {
      return dateParts(this.now)
    },
    selectedDate(): string {
      return this.draft.year && this.draft.month && this.draft.day
        ? `${this.draft.year.padStart(4, '0')}-${this.draft.month.padStart(2, '0')}-${this.draft.day.padStart(2, '0')}`
        : ''
    },
    calendarDate(): string {
      return (
        this.selectedDate ||
        (!['year', 'month', 'day'].some((part) => this.draft[part as Part]) &&
        !this.dateDisabled(this.clockNow)
          ? formatDate(this.clockNow, 'yyyy-MM-dd')
          : '')
      )
    },
    nowDisabled(): boolean {
      const value = canonical(dateParts(this.clockNow), this.segments)
      return Boolean(
        (this.min && value < this.normalizeBound(this.min)) ||
          (this.max && value > this.normalizeBound(this.max)),
      )
    },
    dates(): Date[] {
      const start = startOfWeek(startOfMonth(this.cursor), { weekStartsOn: 0 })
      return Array.from({ length: 42 }, (_, index) => addDays(start, index))
    },
    years(): number[] {
      const start = Math.max(1, Math.floor(this.cursor.getFullYear() / 12) * 12)
      return Array.from({ length: 12 }, (_, index) => start + index).filter(
        (year) => year <= 9999,
      )
    },
    id(): string {
      return String(this.$attrs.id || this.inputId)
    },
    validity(): string {
      if (!this.segments.some((segment) => this.draft[segment.part]))
        return this.required ? '请选择日期或时间' : ''
      if (this.segments.some((segment) => !this.draft[segment.part]))
        return '请填写完整的日期或时间'
      for (const { part } of this.segments) {
        const value = Number(this.draft[part])
        if (value < this.lower(part) || value > this.upper(part))
          return `请输入有效的${labels[part]}`
      }
      const value = canonical(this.draft, this.segments)
      if (this.min && value < this.normalizeBound(this.min))
        return `不能早于 ${this.min}`
      if (this.max && value > this.normalizeBound(this.max))
        return `不能晚于 ${this.max}`
      return ''
    },
  },
  watch: {
    modelValue(value: string) {
      if (value !== this.lastEmitted) this.sync()
      this.lastEmitted = null
      this.$nextTick(this.syncValidity)
    },
    pattern() {
      this.sync()
    },
    required() {
      this.$nextTick(this.syncValidity)
    },
    min() {
      this.$nextTick(this.syncValidity)
    },
    max() {
      this.$nextTick(this.syncValidity)
    },
    disabled(value: boolean) {
      if (value) this.opened = false
    },
    loading(value: boolean) {
      if (value) this.opened = false
    },
  },
  created() {
    this.sync()
  },
  mounted() {
    this.syncValidity()
    this.outside = (event: PointerEvent) => {
      if (!(this.$el as HTMLElement).contains(event.target as Node))
        this.close()
    }
    document.addEventListener('pointerdown', this.outside)
  },
  beforeUnmount() {
    if (this.outside) document.removeEventListener('pointerdown', this.outside)
  },
  methods: {
    lower(part: Part): number {
      return ['year', 'month', 'day'].includes(part) ? 1 : 0
    },
    upper(part: Part): number {
      return part === 'year'
        ? 9999
        : part === 'month'
          ? 12
          : part === 'day'
            ? getDaysInMonth(dateFrom({ ...this.draft, day: '1' }, this.now))
            : part === 'hour'
              ? 23
              : 59
    },
    normalizeBound(value: string): string {
      return canonical(readParts(value, this.segments), this.segments)
    },
    sync() {
      this.draft = readParts(this.modelValue, this.segments)
      this.timeRevision++
      const date = dateFrom(this.draft, this.now)
      this.cursor = startOfMonth(date)
      this.tab = this.hasDate ? 'date' : 'time'
      this.view = this.segments.some((segment) => segment.part === 'day')
        ? 'days'
        : this.segments.some((segment) => segment.part === 'month')
          ? 'months'
          : 'years'
      this.$nextTick(this.syncValidity)
    },
    syncValidity() {
      ;(
        this.$refs[`input-${this.segments[0]?.part}`] as
          | HTMLInputElement
          | undefined
      )?.setCustomValidity(this.validity)
    },
    focus(part?: Part) {
      const target = part || this.segments[0]?.part
      if (target)
        (this.$refs[`input-${target}`] as HTMLInputElement | undefined)?.focus()
    },
    emitValue(commit = false) {
      const value = this.validity
        ? ''
        : this.segments.every((segment) => !this.draft[segment.part])
          ? ''
          : canonical(this.draft, this.segments)
      this.lastEmitted = value
      this.$emit('update:modelValue', value)
      if (commit && !this.validity) this.$emit('change', value)
      this.$nextTick(this.syncValidity)
    },
    input(part: Part, event: Event) {
      const input = event.target as HTMLInputElement,
        width = part === 'year' ? 4 : 2
      let value = input.value.replace(/\D/g, '').slice(0, width)
      if (value && Number(value) > this.upper(part))
        value = String(this.upper(part))
      this.draft[part] = value
      input.value = value
      this.emitValue()
    },
    commitPart(part: Part) {
      if (this.draft[part])
        this.draft[part] = String(
          Math.max(
            this.lower(part),
            Math.min(this.upper(part), Number(this.draft[part])),
          ),
        ).padStart(part === 'year' ? 4 : 2, '0')
      if ((part === 'month' || part === 'year') && this.draft.day)
        this.draft.day = String(
          Math.min(this.upper('day'), Number(this.draft.day)),
        ).padStart(2, '0')
      this.emitValue(true)
    },
    inputKey(part: Part, event: KeyboardEvent) {
      if (event.key === 'Escape') {
        this.close()
        return
      }
      if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault()
        this.open()
        return
      }
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      this.draft[part] = String(
        Math.max(
          this.lower(part),
          Math.min(
            this.upper(part),
            Number(this.draft[part] || this.placeholderParts[part]) +
              (event.key === 'ArrowUp' ? 1 : -1),
          ),
        ),
      )
      this.commitPart(part)
    },
    open() {
      if (this.disabled || this.loading) return
      this.clockNow = new Date()
      this.opened = true
      this.cursor = startOfMonth(dateFrom(this.draft, this.clockNow))
      this.focusedDate = this.calendarDate
    },
    close() {
      this.opened = false
    },
    fillDefaults() {
      for (const { part } of this.segments)
        if (!this.draft[part]) this.draft[part] = this.placeholderParts[part]
    },
    timeDraft(): Parts {
      const parts = dateParts(this.clockNow)
      for (const { part } of this.segments)
        if (this.draft[part]) parts[part] = this.draft[part]
      return parts
    },
    clampTime(parts: Parts): Parts {
      const value = canonical(parts, this.segments)
      const bound =
        this.min && value < this.normalizeBound(this.min)
          ? this.min
          : this.max && value > this.normalizeBound(this.max)
            ? this.max
            : undefined
      return bound ? { ...parts, ...readParts(bound, this.segments) } : parts
    },
    timeDisabled(part: Part, value: number): boolean {
      const first = this.timeDraft(),
        last = { ...first },
        order: Part[] = ['hour', 'minute', 'second']
      first[part] = last[part] = String(value).padStart(2, '0')
      for (const lower of order.slice(order.indexOf(part) + 1)) {
        first[lower] = '00'
        last[lower] = '59'
      }
      return Boolean(
        (this.min &&
          canonical(last, this.segments) < this.normalizeBound(this.min)) ||
          (this.max &&
            canonical(first, this.segments) > this.normalizeBound(this.max)),
      )
    },
    chooseTime(part: Part, value: number, commit = false) {
      if (
        !this.opened ||
        this.disabled ||
        this.loading ||
        (this.hasDate && this.tab !== 'time') ||
        this.timeDisabled(part, value)
      )
        return
      this.draft = this.clampTime({
        ...this.timeDraft(),
        [part]: String(value).padStart(2, '0'),
      })
      this.emitValue(commit)
    },
    chooseNow() {
      if (this.disabled || this.loading) return
      this.clockNow = new Date()
      if (this.nowDisabled) return
      this.draft = dateParts(this.clockNow)
      this.timeRevision++
      this.cursor = startOfMonth(this.clockNow)
      this.focusedDate = formatDate(this.clockNow, 'yyyy-MM-dd')
      this.emitValue(true)
    },
    clear() {
      this.draft = emptyParts()
      this.timeRevision++
      this.emitValue(true)
    },
    dateDisabled(date: Date): boolean {
      if (date.getFullYear() < 1 || date.getFullYear() > 9999) return true
      const dateOnly = formatDate(date, 'yyyy-MM-dd')
      const bound = (value: string) =>
        value.replaceAll('/', '-').split(/[T ]/)[0]!
      return Boolean(
        (this.min &&
          dateOnly.slice(0, bound(this.min).length) < bound(this.min)) ||
          (this.max &&
            dateOnly.slice(0, bound(this.max).length) > bound(this.max)),
      )
    },
    chooseDate(date: Date) {
      if (this.dateDisabled(date)) return
      this.fillDefaults()
      const parts = dateParts(date)
      this.draft.year = parts.year
      this.draft.month = parts.month
      this.draft.day = parts.day
      if (this.hasTime) this.draft = this.clampTime(this.draft)
      this.cursor = startOfMonth(date)
      this.focusedDate = formatDate(date, 'yyyy-MM-dd')
      this.emitValue(true)
      if (this.hasTime) this.tab = 'time'
      else {
        this.close()
        this.focus()
      }
    },
    chooseMonth(month: number) {
      this.direction = 1
      const date = new Date(this.cursor)
      date.setMonth(month, 1)
      this.cursor = date
      if (this.segments.some((segment) => segment.part === 'day'))
        this.view = 'days'
      else this.chooseDate(date)
    },
    chooseYear(year: number) {
      this.direction = 1
      const date = new Date(this.cursor)
      date.setFullYear(year, date.getMonth(), 1)
      this.cursor = date
      if (this.segments.some((segment) => segment.part === 'month'))
        this.view = 'months'
      else this.chooseDate(date)
    },
    move(direction: number) {
      this.direction = direction
      const amount =
        this.view === 'days'
          ? direction
          : this.view === 'months'
            ? direction * 12
            : direction * 144
      const next = addMonths(this.cursor, amount)
      if (next.getFullYear() >= 1 && next.getFullYear() <= 9999)
        this.cursor = next
    },
    calendarKey(date: Date, event: KeyboardEvent) {
      const offsets: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -date.getDay(),
        End: 6 - date.getDay(),
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
        this.focus()
        return
      }
      if (
        !(event.key in offsets) &&
        !['PageUp', 'PageDown'].includes(event.key)
      )
        return
      event.preventDefault()
      const next =
        event.key === 'PageUp' || event.key === 'PageDown'
          ? addMonths(
              date,
              (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1),
            )
          : addDays(date, offsets[event.key]!)
      if (next.getFullYear() < 1 || next.getFullYear() > 9999) return
      this.direction = next > date ? 1 : -1
      this.cursor = startOfMonth(next)
      this.focusedDate = formatDate(next, 'yyyy-MM-dd')
      this.$nextTick(() =>
        (this.$el as HTMLElement)
          .querySelector<HTMLButtonElement>(
            `.apple-calendar__page:not([inert]) [data-date="${this.focusedDate}"]`,
          )
          ?.focus({ preventScroll: true }),
      )
    },
    renderCalendar() {
      const year = this.cursor.getFullYear(),
        month = this.cursor.getMonth()
      const grid =
        this.view === 'days'
          ? h(
              'div',
              {
                class: 'apple-calendar__days',
                role: 'grid',
                'aria-label': `${year}年${month + 1}月`,
              },
              [
                h(
                  'div',
                  { class: 'apple-calendar__weekdays', role: 'row' },
                  ['日', '一', '二', '三', '四', '五', '六'].map((day) =>
                    h('span', { role: 'columnheader' }, day),
                  ),
                ),
                ...Array.from({ length: 6 }, (_, week) =>
                  h(
                    'div',
                    { class: 'apple-calendar__week', role: 'row' },
                    this.dates.slice(week * 7, week * 7 + 7).map((date) => {
                      const key = formatDate(date, 'yyyy-MM-dd'),
                        selected = key === this.calendarDate,
                        disabled = this.dateDisabled(date)
                      return h(
                        'span',
                        { role: 'gridcell', 'aria-selected': selected },
                        ripple(
                          h(
                            'button',
                            {
                              key,
                              ref: `day-${key}`,
                              type: 'button',
                              disabled,
                              tabindex: key === this.focusedDate ? 0 : -1,
                              'data-date': key,
                              'aria-label': formatDate(date, 'yyyy年M月d日'),
                              'aria-current':
                                key === formatDate(this.clockNow, 'yyyy-MM-dd')
                                  ? 'date'
                                  : undefined,
                              class: [
                                'apple-calendar__day',
                                {
                                  'is-selected': selected,
                                  'is-other-month': date.getMonth() !== month,
                                },
                              ],
                              onClick: () => this.chooseDate(date),
                              onPointerleave: (event: PointerEvent) =>
                                hoverTrail(event, selected),
                              onKeydown: (event: KeyboardEvent) =>
                                this.calendarKey(date, event),
                            },
                            date.getDate().toString(),
                          ),
                          !disabled,
                        ),
                      )
                    }),
                  ),
                ),
              ],
            )
          : h(
              'div',
              {
                class: 'apple-calendar__choices',
                role: 'group',
                'aria-label': this.view === 'months' ? '选择月份' : '选择年份',
              },
              (this.view === 'months'
                ? Array.from({ length: 12 }, (_, index) => index)
                : this.years
              ).map((value) => {
                const selected =
                  this.view === 'months'
                    ? year === Number(this.draft.year) &&
                      value + 1 === Number(this.draft.month)
                    : value === Number(this.draft.year)
                return ripple(
                  h(
                    'button',
                    {
                      type: 'button',
                      class: [
                        'apple-calendar__choice',
                        { 'is-selected': selected },
                      ],
                      'aria-pressed': selected,
                      onPointerleave: (event: PointerEvent) =>
                        hoverTrail(event, selected),
                      onClick: () =>
                        this.view === 'months'
                          ? this.chooseMonth(value)
                          : this.chooseYear(value),
                    },
                    this.view === 'months' ? `${value + 1}月` : String(value),
                  ),
                )
              }),
            )
      return h('div', { class: 'apple-calendar' }, [
        h('div', { class: 'apple-calendar__header' }, [
          ripple(
            h(
              'button',
              {
                type: 'button',
                class: 'apple-field__icon',
                'aria-label': this.view === 'days' ? '上个月' : '上一页',
                onClick: () => this.move(-1),
              },
              h(ChevronLeft, { size: 18 }),
            ),
          ),
          ripple(
            h(
              'button',
              {
                type: 'button',
                class: 'apple-calendar__heading',
                onClick: () => {
                  this.direction = this.view === 'years' ? 1 : -1
                  this.view =
                    this.view === 'days'
                      ? 'months'
                      : this.view === 'months'
                        ? 'years'
                        : 'days'
                },
              },
              this.view === 'days'
                ? `${year}年${month + 1}月`
                : this.view === 'months'
                  ? `${year}年`
                  : `${this.years[0]} – ${this.years.at(-1)}`,
            ),
          ),
          ripple(
            h(
              'button',
              {
                type: 'button',
                class: 'apple-field__icon',
                'aria-label': this.view === 'days' ? '下个月' : '下一页',
                onClick: () => this.move(1),
              },
              h(ChevronRight, { size: 18 }),
            ),
          ),
        ]),
        h(
          CalendarPages,
          {
            pageKey: `${this.view}-${year}-${month}`,
            direction: this.direction,
            motion: this.motion,
          },
          { default: () => grid },
        ),
      ])
    },
    renderTime() {
      const segments = this.segments.filter((segment) =>
        ['hour', 'minute', 'second'].includes(segment.part),
      )
      return h('div', { class: 'apple-calendar__time' }, [
        h(
          'div',
          { class: 'apple-calendar__time-labels', 'aria-hidden': true },
          segments.map(({ part }) => h('span', {}, labels[part])),
        ),
        h(
          'div',
          { class: 'apple-calendar__time-wheels' },
          segments.map(({ part }) =>
            h(
              'div',
              { class: 'apple-calendar__time-column', 'data-time-part': part },
              [
                h(TimeWheel, {
                  label: labels[part],
                  modelValue:
                    this.draft[part] === ''
                      ? undefined
                      : Number(this.draft[part]),
                  fallback: Number(dateParts(this.clockNow)[part]),
                  count: this.upper(part) + 1,
                  active: this.opened && (!this.hasDate || this.tab === 'time'),
                  revision: this.timeRevision,
                  disabledValues: Array.from(
                    { length: this.upper(part) + 1 },
                    (_, value) => this.timeDisabled(part, value),
                  ),
                  'onUpdate:modelValue': (value: number) =>
                    this.chooseTime(part, value),
                  onChange: (value: number) =>
                    this.chooseTime(part, value, true),
                  onEscape: () => {
                    this.close()
                    this.focus(part)
                  },
                }),
              ],
            ),
          ),
        ),
      ])
    },
  },
  render() {
    const message = this.error || this.hint,
      inactive = this.disabled || this.loading
    const panel =
      this.opened && !inactive
        ? h(
            'div',
            {
              class: 'apple-date-menu',
              role: 'dialog',
              'aria-label': this.label || '选择日期与时间',
              id: `${this.id}-calendar`,
            },
            [
              this.hasDate && this.hasTime
                ? h(
                    AppleTabBar,
                    {
                      class: 'apple-calendar__tabs',
                      label: '日期与时间',
                      motion: this.motion,
                      modelValue: this.tab,
                      items: [
                        { value: 'date', label: '日期' },
                        { value: 'time', label: '时间' },
                      ],
                      'onUpdate:modelValue': (value: string | number) => {
                        this.tab = String(value)
                      },
                    },
                    {
                      'panel-date': () => this.renderCalendar(),
                      'panel-time': () => this.renderTime(),
                    },
                  )
                : this.hasDate
                  ? this.renderCalendar()
                  : this.renderTime(),
              h('div', { class: 'apple-calendar__footer' }, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'apple-calendar__text',
                    onClick: this.clear,
                  },
                  '清除',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'apple-calendar__text',
                    disabled: this.nowDisabled,
                    onClick: this.chooseNow,
                  },
                  '现在',
                ),
                ripple(
                  h(
                    'button',
                    {
                      type: 'button',
                      class: 'apple-calendar__done',
                      onClick: () => {
                        this.close()
                        this.focus()
                      },
                    },
                    '完成',
                  ),
                ),
              ]),
            ],
          )
        : null
    return h(
      'div',
      {
        class: [
          'apple-field',
          'apple-date-field',
          this.$attrs.class,
          { 'has-error': !!this.error, 'is-disabled': inactive },
        ],
        'data-apple-motion': this.motion,
        'data-apple-popup-open': this.opened ? true : undefined,
        onFocusout: (event: FocusEvent) => {
          if (
            event.relatedTarget &&
            !(event.currentTarget as HTMLElement).contains(
              event.relatedTarget as Node,
            )
          )
            this.close()
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === 'Escape') this.close()
        },
      },
      [
        this.label
          ? h('span', { class: 'apple-field__label', id: `${this.id}-label` }, [
              this.label,
              this.required
                ? h(
                    'span',
                    { 'aria-hidden': true, class: 'apple-field__required' },
                    ' *',
                  )
                : null,
            ])
          : null,
        h('div', { class: 'apple-date-anchor' }, [
          h(
            'div',
            {
              class: 'apple-date-input apple-input-wrap',
              role: 'group',
              'aria-label':
                this.$attrs['aria-label'] || this.label || '日期与时间',
              'aria-labelledby':
                this.$attrs['aria-labelledby'] ||
                (!this.$attrs['aria-label'] && this.label
                  ? `${this.id}-label`
                  : undefined),
            },
            [
              h(
                'div',
                { class: 'apple-date-segments' },
                this.segments.flatMap(({ part, separator, width }, index) => [
                  h('input', {
                    ...this.$attrs,
                    class: 'apple-date-segment',
                    id: index === 0 ? this.id : `${this.id}-${part}`,
                    ref: `input-${part}`,
                    name: undefined,
                    type: 'text',
                    inputmode: 'numeric',
                    autocomplete: 'off',
                    maxlength: width,
                    size: width,
                    value: this.draft[part],
                    placeholder: this.placeholderParts[part],
                    disabled: inactive,
                    required: this.required,
                    'data-part': part,
                    'aria-label': `${this.label || this.$attrs['aria-label'] || ''}${labels[part]}`,
                    'aria-invalid': this.error ? true : undefined,
                    'aria-describedby': message
                      ? `${this.id}-message`
                      : undefined,
                    onFocus: (event: FocusEvent) =>
                      (event.target as HTMLInputElement).select(),
                    onInput: (event: Event) => this.input(part, event),
                    onBlur: () => this.commitPart(part),
                    onKeydown: (event: KeyboardEvent) =>
                      this.inputKey(part, event),
                  }),
                  separator
                    ? h(
                        'span',
                        { class: 'apple-date-separator', 'aria-hidden': true },
                        separator,
                      )
                    : null,
                ]),
              ),
              ripple(
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'apple-field__icon',
                    disabled: inactive,
                    'aria-label': this.hasDate ? '打开日历' : '选择时间',
                    'aria-expanded': this.opened,
                    'aria-controls': `${this.id}-calendar`,
                    onClick: () => (this.opened ? this.close() : this.open()),
                  },
                  h(this.hasDate ? CalendarDays : Clock3, { size: 19 }),
                ),
              ),
            ],
          ),
          popupTransition(panel, 'apple-date-pop'),
        ]),
        this.$attrs.name
          ? h('input', {
              type: 'hidden',
              name: this.$attrs.name,
              value: this.modelValue,
              disabled: inactive,
            })
          : null,
        message
          ? h(
              'p',
              {
                id: `${this.id}-message`,
                class: ['apple-field__message', { 'is-error': !!this.error }],
                role: this.error ? 'alert' : undefined,
              },
              message,
            )
          : null,
      ],
    )
  },
})
