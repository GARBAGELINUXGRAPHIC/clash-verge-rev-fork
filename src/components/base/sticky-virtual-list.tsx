import { useVirtualizer } from '@tanstack/react-virtual'
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'

type ScrollToIndexOptions = {
  align?: 'auto' | 'center' | 'end' | 'start'
  behavior?: ScrollBehavior
}

const findGroupSectionIndex = (groupIndexes: number[], itemIndex: number) => {
  let low = 0
  let high = groupIndexes.length - 1
  let matchedIndex = -1

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)

    if (groupIndexes[middle] <= itemIndex) {
      matchedIndex = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  return matchedIndex
}

export interface StickyVirtualListHandle {
  getScrollElement: () => HTMLDivElement | null
  isItemScrolledPastStart: (index: number, tolerance?: number) => boolean
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  isScrolling: () => boolean
  waitForScrollEnd: () => Promise<void>
  transitionGroup: (index: number, open: boolean, update: () => void) => void
}

export interface StickyVirtualListProps<TItem> {
  initialOffset?: number
  items: TItem[]
  isGroupItem: (item: TItem, index: number) => boolean
  getItemKey: (item: TItem, index: number) => React.Key
  // 组项预估高度
  estimateGroupItemHeight: number
  // 非组项预估高度
  estimateItemHeight: number
  renderGroupItem: (item: TItem, index: number, stickyed: boolean) => ReactNode
  renderItem: (item: TItem, index: number) => ReactNode
  className?: string
  style?: React.CSSProperties
  overscan?: number
}

export const StickyVirtualList = forwardRef(function StickyVirtualListInner<
  TItem,
>(
  props: StickyVirtualListProps<TItem>,
  ref: React.ForwardedRef<StickyVirtualListHandle>,
) {
  const {
    initialOffset = 0,
    items,
    isGroupItem,
    getItemKey,
    estimateGroupItemHeight,
    estimateItemHeight,
    renderGroupItem,
    renderItem,
    className,
    style,
    overscan = 8,
  } = props
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pendingExpandRef = useRef<React.Key | null>(null)
  const animationsRef = useRef<Animation[]>([])
  const finishTransitionRef = useRef<(() => void) | null>(null)
  const cleanupTransitionRef = useRef<(() => void) | null>(null)
  const getEstimatedItemHeight = useCallback(
    (index: number) =>
      isGroupItem(items[index], index)
        ? estimateGroupItemHeight
        : estimateItemHeight,
    [estimateGroupItemHeight, estimateItemHeight, isGroupItem, items],
  )

  const groupIndexes = useMemo(
    () =>
      items.reduce<number[]>((indexes, item, index) => {
        if (isGroupItem(item, index)) indexes.push(index)
        return indexes
      }, []),
    [isGroupItem, items],
  )

  const groupSections = useMemo(
    () =>
      groupIndexes.map((groupIndex, index) => ({
        groupIndex,
        nextGroupIndex: groupIndexes[index + 1] ?? items.length,
      })),
    [groupIndexes, items.length],
  )

  const estimatedOffsets = useMemo(() => {
    const offsets = new Array<number>(items.length + 1)
    offsets[0] = 0

    for (let i = 0; i < items.length; i++) {
      offsets[i + 1] = offsets[i] + getEstimatedItemHeight(i)
    }

    return offsets
  }, [getEstimatedItemHeight, items.length])

  const rowVirtualizer = useVirtualizer({
    initialOffset,
    count: items.length,
    estimateSize: getEstimatedItemHeight,
    getItemKey: (index) => getItemKey(items[index], index),
    getScrollElement: () => scrollParentRef.current,
    overscan,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  const getVirtualOffset = useCallback(
    (index: number) => {
      return (
        rowVirtualizer.measurementsCache[index]?.start ??
        estimatedOffsets[index]
      )
    },
    [estimatedOffsets, rowVirtualizer],
  )

  const visibleGroupSections = useMemo(() => {
    if (!virtualItems.length || !groupSections.length) return []

    const firstVirtualIndex = virtualItems[0].index
    const lastVirtualIndex = virtualItems[virtualItems.length - 1].index
    const matchedFirstSectionIndex = findGroupSectionIndex(
      groupIndexes,
      firstVirtualIndex,
    )
    const lastSectionIndex = findGroupSectionIndex(
      groupIndexes,
      lastVirtualIndex,
    )

    if (lastSectionIndex < 0) return []

    const firstSectionIndex =
      matchedFirstSectionIndex >= 0 ? matchedFirstSectionIndex : 0

    return groupSections.slice(
      firstSectionIndex,
      Math.min(lastSectionIndex + 2, groupSections.length),
    )
  }, [groupIndexes, groupSections, virtualItems])

  const isGroupSticky = useCallback(
    (groupIndex: number, tolerance = 0) => {
      const scroller = scrollParentRef.current
      if (!scroller) return false

      return scroller.scrollTop > getVirtualOffset(groupIndex) + tolerance
    },
    [getVirtualOffset],
  )

  const animateGroup = useCallback(
    (key: React.Key, open: boolean, done?: () => void) => {
      const content = contentRef.current
      const body = Array.from(
        content?.querySelectorAll<HTMLElement>('[data-group-body]') ?? [],
      ).find((element) => element.dataset.groupBody === String(key))
      if (!content || !body || body.offsetHeight === 0) {
        done?.()
        return
      }

      const height = body.offsetHeight
      const start = body.offsetTop
      const end = start + height
      body.style.overflow = 'clip'
      const scroller = scrollParentRef.current
      // Avoid scroll clamping driving the virtualizer on every collapse frame.
      content.style.minHeight = `${(scroller?.scrollTop ?? 0) + (scroller?.clientHeight ?? 0)}px`
      const animations: Animation[] = []
      const options = {
        duration: 220,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'both' as const,
      }
      const animate = (element: HTMLElement, from: Keyframe, to: Keyframe) => {
        animations.push(
          element.animate(open ? [from, to] : [to, from], options),
        )
      }

      // Keep the cards at their final coordinates; only their shared viewport changes height.
      animate(body, { height: '0px' }, { height: `${height}px` })
      for (const element of content.querySelectorAll<HTMLElement>(
        '[data-group-body], [data-group-header]',
      )) {
        if (element !== body && element.offsetTop >= end - 1) {
          animate(
            element,
            { transform: `translateY(${-height}px)` },
            { transform: 'translateY(0px)' },
          )
        }
        if (element.dataset.groupHeader === String(key)) {
          animate(
            element,
            { height: `${element.offsetHeight - height}px` },
            { height: `${element.offsetHeight}px` },
          )
        }
      }
      const totalHeight = Number.parseFloat(content.style.height)
      animate(
        content,
        { height: `${totalHeight - height}px` },
        { height: `${totalHeight}px` },
      )
      animationsRef.current = animations
      const finish = () => {
        if (animationsRef.current !== animations) return
        finishTransitionRef.current = null
        const cleanup = () => {
          for (const animation of animations) animation.cancel()
          body.style.overflow = ''
          content.style.minHeight = ''
          animationsRef.current = []
        }
        if (done) {
          // Hold the collapsed frame until React has removed the rows.
          cleanupTransitionRef.current = cleanup
          done()
        } else {
          cleanup()
        }
      }
      finishTransitionRef.current = finish
      void Promise.all(animations.map((animation) => animation.finished)).then(
        finish,
        () => {},
      )
    },
    [],
  )

  useLayoutEffect(() => {
    cleanupTransitionRef.current?.()
    cleanupTransitionRef.current = null
    const key = pendingExpandRef.current
    if (key === null) return
    pendingExpandRef.current = null
    animateGroup(key, true)
  }, [animateGroup, items])

  useLayoutEffect(() => {
    const scroller = scrollParentRef.current
    const finish = () => finishTransitionRef.current?.()
    scroller?.addEventListener('wheel', finish, { passive: true })
    scroller?.addEventListener('touchstart', finish, { passive: true })
    window.addEventListener('resize', finish)
    return () => {
      scroller?.removeEventListener('wheel', finish)
      scroller?.removeEventListener('touchstart', finish)
      window.removeEventListener('resize', finish)
      animationsRef.current.forEach((animation) => animation.cancel())
      animationsRef.current = []
      finishTransitionRef.current = null
      cleanupTransitionRef.current = null
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      getScrollElement: () => scrollParentRef.current,
      transitionGroup: (index, open, update) => {
        if (animationsRef.current.length) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          update()
          return
        }
        const key = getItemKey(items[index], index)
        if (open) {
          pendingExpandRef.current = key
          update()
        } else {
          animateGroup(key, false, update)
        }
      },
      isItemScrolledPastStart: (index, tolerance = 0) => {
        return isGroupSticky(index, tolerance)
      },
      scrollToIndex: (index, options) => {
        rowVirtualizer.scrollToIndex(index, options)
      },
      isScrolling: () => rowVirtualizer.isScrolling,
      waitForScrollEnd: () => {
        return new Promise((resolve) => {
          let maxCheckCount = 5
          const interval = setInterval(() => {
            if (!rowVirtualizer.isScrolling || maxCheckCount < 0) {
              clearInterval(interval)
              resolve()
              return
            }

            maxCheckCount -= 1
          }, 100)
        })
      },
    }),
    [animateGroup, getItemKey, isGroupSticky, items, rowVirtualizer],
  )

  return (
    <div
      ref={scrollParentRef}
      className={className}
      style={{
        overflowY: 'auto',
        contain: 'strict',
        width: '100%',
        height: '100%',
        overflowAnchor: 'none',
        ...style,
      }}
    >
      <div
        ref={contentRef}
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            inset: 0,
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 10,
          }}
        >
          {visibleGroupSections.map(({ groupIndex, nextGroupIndex }) => {
            const group = items[groupIndex]
            const start = getVirtualOffset(groupIndex)
            const end =
              nextGroupIndex < items.length
                ? getVirtualOffset(nextGroupIndex)
                : rowVirtualizer.getTotalSize()
            const stickyed = isGroupSticky(groupIndex, 1)

            return (
              <div
                key={getItemKey(group, groupIndex)}
                data-group-header={String(getItemKey(group, groupIndex))}
                style={{
                  position: 'absolute',
                  top: start,
                  left: 0,
                  width: '100%',
                  height: Math.max(end - start, estimateGroupItemHeight),
                }}
              >
                <div
                  data-index={groupIndex}
                  style={{
                    pointerEvents: 'auto',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {renderGroupItem(group, groupIndex, stickyed)}
                </div>
              </div>
            )
          })}
        </div>

        {virtualItems
          .filter(
            (virtualRow) =>
              isGroupItem(items[virtualRow.index], virtualRow.index) ||
              groupSections.length === 0,
          )
          .map((virtualRow) => {
            const item = items[virtualRow.index]
            const isGroup = isGroupItem(item, virtualRow.index)

            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  left: 0,
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                  zIndex: 1,
                  ...(isGroup && { visibility: 'hidden' }),
                }}
              >
                {isGroup
                  ? renderGroupItem(item, virtualRow.index, false) // 渲染组，以便动态计算组高度
                  : renderItem(item, virtualRow.index)}
              </div>
            )
          })}

        {visibleGroupSections.map(({ groupIndex, nextGroupIndex }) => {
          const rows = virtualItems.filter(
            (row) => row.index > groupIndex && row.index < nextGroupIndex,
          )
          if (!rows.length) return null
          const start = getVirtualOffset(groupIndex + 1)
          const end =
            nextGroupIndex < items.length
              ? getVirtualOffset(nextGroupIndex)
              : rowVirtualizer.getTotalSize()
          const key = getItemKey(items[groupIndex], groupIndex)

          return (
            <div
              key={key}
              data-group-body={String(key)}
              style={{
                position: 'absolute',
                top: start,
                left: 0,
                width: '100%',
                height: end - start,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: end - start,
                  transform: 'translateZ(0)',
                }}
              >
                {rows.map((row) => (
                  <div
                    key={row.key}
                    ref={rowVirtualizer.measureElement}
                    data-index={row.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${row.start - start}px)`,
                    }}
                  >
                    {renderItem(items[row.index], row.index)}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div aria-hidden="true" style={{ height: 10 }} />
    </div>
  )
}) as <TItem>(
  props: StickyVirtualListProps<TItem> & {
    ref?: React.Ref<StickyVirtualListHandle>
  },
) => React.ReactElement
