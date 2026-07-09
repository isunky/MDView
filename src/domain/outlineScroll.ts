export type OutlineHeadingPosition = {
  id: string
  top: number
}

export function findActiveOutlineId(
  headings: OutlineHeadingPosition[],
  scrollTop: number,
  activationOffset: number,
): string | null {
  if (headings.length === 0) {
    return null
  }

  const activationTop = scrollTop + activationOffset
  let lower = 0
  let upper = headings.length - 1
  let activeIndex = 0

  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2)
    if (headings[middle].top <= activationTop) {
      activeIndex = middle
      lower = middle + 1
    } else {
      upper = middle - 1
    }
  }

  return headings[activeIndex].id
}
