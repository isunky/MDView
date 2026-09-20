import { describe, expect, it } from 'vitest'
import {
  mapEditorScrollToPreview,
  mapPreviewScrollToEditor,
  normalizeSplitScrollAnchors,
} from './splitScroll'

const editor = { scrollTop: 0, scrollHeight: 1_200, clientHeight: 200 }
const preview = { scrollTop: 0, scrollHeight: 2_000, clientHeight: 400 }
const anchors = [
  { sourceLine: 10, previewTop: 240 },
  { sourceLine: 30, previewTop: 900 },
]

describe('splitScroll', () => {
  it('maps wrapped source lines by measured height in both directions', () => {
    const tops = Array.from({ length: 40 }, (_, index) => index * 20 + (index >= 9 ? 160 : 0))
    expect(mapEditorScrollToPreview({ ...editor, scrollTop: tops[9] }, preview, 40, 20, 0, anchors, tops)).toBeCloseTo(240)
    expect(mapPreviewScrollToEditor({ ...preview, scrollTop: 240 }, editor, 40, 20, 0, anchors, tops)).toBeCloseTo(tops[9])
    const midway = tops[9] + 10
    const mapped = mapEditorScrollToPreview({ ...editor, scrollTop: midway }, preview, 40, 20, 0, anchors, tops)
    expect(mapPreviewScrollToEditor({ ...preview, scrollTop: mapped }, editor, 40, 20, 0, anchors, tops)).toBeCloseTo(midway)
  })

  it('adds stable endpoints around semantic anchors', () => {
    expect(normalizeSplitScrollAnchors(anchors, 40, 1_600)).toEqual([
      { sourceLine: 1, previewTop: 0 },
      { sourceLine: 10, previewTop: 240 },
      { sourceLine: 30, previewTop: 900 },
      { sourceLine: 40, previewTop: 1_600 },
    ])
  })

  it('maps editor scroll through nearby anchors and preserves boundaries', () => {
    expect(mapEditorScrollToPreview({ ...editor, scrollTop: 0 }, preview, 40, 20, 0, anchors)).toBe(0)
    expect(mapEditorScrollToPreview({ ...editor, scrollTop: 1_000 }, preview, 40, 20, 0, anchors)).toBe(1_600)
    expect(mapEditorScrollToPreview({ ...editor, scrollTop: 168 }, preview, 40, 20, 0, anchors)).toBeCloseTo(273)
  })

  it('maps preview scroll back to the matching editor source line', () => {
    expect(mapPreviewScrollToEditor({ ...preview, scrollTop: 0 }, editor, 40, 20, 0, anchors)).toBe(0)
    expect(mapPreviewScrollToEditor({ ...preview, scrollTop: 1_600 }, editor, 40, 20, 0, anchors)).toBe(1_000)
    expect(mapPreviewScrollToEditor({ ...preview, scrollTop: 900 }, editor, 40, 20, 0, anchors)).toBeCloseTo(548)
  })
})
