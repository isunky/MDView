import katexCss from 'katex/dist/katex.min.css?raw'
import ams from 'katex/dist/fonts/KaTeX_AMS-Regular.woff2?inline'
import calBold from 'katex/dist/fonts/KaTeX_Caligraphic-Bold.woff2?inline'
import calRegular from 'katex/dist/fonts/KaTeX_Caligraphic-Regular.woff2?inline'
import frakturBold from 'katex/dist/fonts/KaTeX_Fraktur-Bold.woff2?inline'
import frakturRegular from 'katex/dist/fonts/KaTeX_Fraktur-Regular.woff2?inline'
import mainBold from 'katex/dist/fonts/KaTeX_Main-Bold.woff2?inline'
import mainBoldItalic from 'katex/dist/fonts/KaTeX_Main-BoldItalic.woff2?inline'
import mainItalic from 'katex/dist/fonts/KaTeX_Main-Italic.woff2?inline'
import mainRegular from 'katex/dist/fonts/KaTeX_Main-Regular.woff2?inline'
import mathBoldItalic from 'katex/dist/fonts/KaTeX_Math-BoldItalic.woff2?inline'
import mathItalic from 'katex/dist/fonts/KaTeX_Math-Italic.woff2?inline'
import sansBold from 'katex/dist/fonts/KaTeX_SansSerif-Bold.woff2?inline'
import sansItalic from 'katex/dist/fonts/KaTeX_SansSerif-Italic.woff2?inline'
import sansRegular from 'katex/dist/fonts/KaTeX_SansSerif-Regular.woff2?inline'
import scriptRegular from 'katex/dist/fonts/KaTeX_Script-Regular.woff2?inline'
import size1 from 'katex/dist/fonts/KaTeX_Size1-Regular.woff2?inline'
import size2 from 'katex/dist/fonts/KaTeX_Size2-Regular.woff2?inline'
import size3 from 'katex/dist/fonts/KaTeX_Size3-Regular.woff2?inline'
import size4 from 'katex/dist/fonts/KaTeX_Size4-Regular.woff2?inline'
import typewriter from 'katex/dist/fonts/KaTeX_Typewriter-Regular.woff2?inline'

const fonts: Record<string, string> = {
  'KaTeX_AMS-Regular.woff2': ams,
  'KaTeX_Caligraphic-Bold.woff2': calBold,
  'KaTeX_Caligraphic-Regular.woff2': calRegular,
  'KaTeX_Fraktur-Bold.woff2': frakturBold,
  'KaTeX_Fraktur-Regular.woff2': frakturRegular,
  'KaTeX_Main-Bold.woff2': mainBold,
  'KaTeX_Main-BoldItalic.woff2': mainBoldItalic,
  'KaTeX_Main-Italic.woff2': mainItalic,
  'KaTeX_Main-Regular.woff2': mainRegular,
  'KaTeX_Math-BoldItalic.woff2': mathBoldItalic,
  'KaTeX_Math-Italic.woff2': mathItalic,
  'KaTeX_SansSerif-Bold.woff2': sansBold,
  'KaTeX_SansSerif-Italic.woff2': sansItalic,
  'KaTeX_SansSerif-Regular.woff2': sansRegular,
  'KaTeX_Script-Regular.woff2': scriptRegular,
  'KaTeX_Size1-Regular.woff2': size1,
  'KaTeX_Size2-Regular.woff2': size2,
  'KaTeX_Size3-Regular.woff2': size3,
  'KaTeX_Size4-Regular.woff2': size4,
  'KaTeX_Typewriter-Regular.woff2': typewriter,
}

export function getEmbeddedKatexStyles(): string {
  return katexCss
    .replace(/src:url\(fonts\/([^)]*\.woff2)\) format\("woff2"\),url\([^;]+;/g, (_match, name: string) => `src:url(${fonts[name]}) format("woff2");`)
    .replace(/url\(fonts\/[^)]+\)/g, 'url(data:font/woff2;base64,)')
}
