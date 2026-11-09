import { X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { detectShortcutPlatform } from '../../platform/keyboardShortcuts'
import { SHORTCUT_IDS, useShortcutSettings } from '../../platform/shortcutSettings'
import type { AppLanguage } from '../../i18n'

const text = {
  zh: { title: '快捷键', close: '关闭快捷键', enable: '全部开启', disable: '全部关闭', note: '关闭后仍可使用菜单和按钮。Tab、Esc 等基本界面导航始终可用。', groups: '文件与查找|编辑|查找与替换|图片预览|公式', names: '新建|打开|保存|另存为|查找|撤销|重做|粗体|斜体|插入链接|有序列表|无序列表|上移行|下移行|向上复制行|向下复制行|删除行|缩进|反向缩进|表格下一单元格|表格上一单元格|列表续行|下一个匹配|上一个匹配|替换当前项|上一张图片或图表|下一张图片或图表|放大图片|缩小图片|重置图片|确认公式' },
  'zh-TW': { title: '快捷鍵', close: '關閉快捷鍵', enable: '全部開啟', disable: '全部關閉', note: '關閉後仍可使用選單和按鈕。Tab、Esc 等基本介面導覽始終可用。', groups: '檔案與搜尋|編輯|搜尋與取代|圖片預覽|公式', names: '新增|開啟|儲存|另存新檔|搜尋|復原|重做|粗體|斜體|插入連結|有序列表|無序列表|上移行|下移行|向上複製行|向下複製行|刪除行|縮排|反向縮排|表格下一儲存格|表格上一儲存格|延續列表|下一個結果|上一個結果|取代目前項目|上一張圖片或圖表|下一張圖片或圖表|放大圖片|縮小圖片|重設圖片|確認公式' },
  en: { title: 'Keyboard shortcuts', close: 'Close keyboard shortcuts', enable: 'Enable all', disable: 'Disable all', note: 'Menus and buttons remain available. Basic navigation such as Tab and Esc is always available.', groups: 'File and search|Editing|Find and replace|Image preview|Math', names: 'New|Open|Save|Save as|Find|Undo|Redo|Bold|Italic|Insert link|Numbered list|Bulleted list|Move line up|Move line down|Copy line up|Copy line down|Delete line|Indent|Outdent|Next table cell|Previous table cell|Continue list|Next match|Previous match|Replace current|Previous image or diagram|Next image or diagram|Zoom in image|Zoom out image|Reset image|Confirm formula' },
  ja: { title: 'キーボードショートカット', close: 'ショートカットを閉じる', enable: 'すべて有効', disable: 'すべて無効', note: '無効にしてもメニューやボタンは使えます。Tab や Esc などの基本操作は常に有効です。', groups: 'ファイルと検索|編集|検索と置換|画像プレビュー|数式', names: '新規作成|開く|保存|名前を付けて保存|検索|元に戻す|やり直す|太字|斜体|リンクを挿入|番号付きリスト|箇条書き|行を上へ移動|行を下へ移動|行を上へ複製|行を下へ複製|行を削除|インデント|インデント解除|次の表セル|前の表セル|リストを続ける|次の検索結果|前の検索結果|現在の項目を置換|前の画像や図|次の画像や図|画像を拡大|画像を縮小|画像をリセット|数式を確定' },
  ko: { title: '키보드 단축키', close: '단축키 닫기', enable: '모두 켜기', disable: '모두 끄기', note: '꺼도 메뉴와 버튼은 사용할 수 있습니다. Tab, Esc 등 기본 탐색은 항상 사용할 수 있습니다.', groups: '파일과 검색|편집|찾기와 바꾸기|이미지 미리보기|수식', names: '새로 만들기|열기|저장|다른 이름으로 저장|찾기|실행 취소|다시 실행|굵게|기울임꼴|링크 삽입|번호 목록|글머리 기호 목록|줄 위로 이동|줄 아래로 이동|줄 위로 복사|줄 아래로 복사|줄 삭제|들여쓰기|내어쓰기|다음 표 셀|이전 표 셀|목록 계속|다음 검색 결과|이전 검색 결과|현재 항목 바꾸기|이전 이미지 또는 다이어그램|다음 이미지 또는 다이어그램|이미지 확대|이미지 축소|이미지 초기화|수식 확인' },
  es: { title: 'Atajos de teclado', close: 'Cerrar atajos', enable: 'Activar todos', disable: 'Desactivar todos', note: 'Los menús y botones siguen disponibles. La navegación básica con Tab y Esc siempre está activa.', groups: 'Archivo y búsqueda|Edición|Buscar y reemplazar|Vista de imagen|Fórmulas', names: 'Nuevo|Abrir|Guardar|Guardar como|Buscar|Deshacer|Rehacer|Negrita|Cursiva|Insertar enlace|Lista numerada|Lista con viñetas|Subir línea|Bajar línea|Copiar línea arriba|Copiar línea abajo|Eliminar línea|Aplicar sangría|Quitar sangría|Siguiente celda|Celda anterior|Continuar lista|Siguiente resultado|Resultado anterior|Reemplazar actual|Imagen o diagrama anterior|Imagen o diagrama siguiente|Ampliar imagen|Reducir imagen|Restablecer imagen|Confirmar fórmula' },
} satisfies Record<AppLanguage, { title: string; close: string; enable: string; disable: string; note: string; groups: string; names: string }>

const navigation = {
  zh: ['基础导航（始终开启）', 'Tab / Shift+Tab：切换焦点；方向键、Home / End：在菜单或分隔线上导航；Enter / 空格：操作控件；Esc：关闭弹窗。'],
  'zh-TW': ['基本導覽（始終開啟）', 'Tab / Shift+Tab：切換焦點；方向鍵、Home / End：導覽選單或分隔線；Enter / 空白鍵：操作控制項；Esc：關閉視窗。'],
  en: ['Basic navigation (always on)', 'Tab / Shift+Tab: move focus; arrows and Home / End: navigate menus or separators; Enter / Space: activate controls; Esc: close dialogs.'],
  ja: ['基本操作（常に有効）', 'Tab / Shift+Tab：フォーカス移動、矢印キー・Home / End：メニューや仕切りを操作、Enter / Space：決定、Esc：ダイアログを閉じる。'],
  ko: ['기본 탐색 (항상 켜짐)', 'Tab / Shift+Tab: 포커스 이동, 방향키·Home / End: 메뉴나 구분선 탐색, Enter / Space: 실행, Esc: 대화상자 닫기.'],
  es: ['Navegación básica (siempre activa)', 'Tab / Shift+Tab: cambiar foco; flechas y Home / End: navegar por menús o separadores; Enter / Espacio: activar; Esc: cerrar diálogos.'],
} satisfies Record<AppLanguage, [string, string]>

export default function ShortcutsDialog({ language, onClose }: { language: AppLanguage; onClose: () => void }) {
  const ref = useDialogFocus(true, onClose)
  const { disabled, setEnabled, setAll } = useShortcutSettings()
  const labels = text[language]
  const names = labels.names.split('|')
  const groups = labels.groups.split('|')
  const mac = detectShortcutPlatform() === 'macos'
  const mod = mac ? '⌘' : 'Ctrl'
  const alt = mac ? 'Option' : 'Alt'
  const keys = [`${mod}+N`, `${mod}+O`, `${mod}+S`, `${mod}+Shift+S`, `${mod}+F`, `${mod}+Z`, mac ? '⌘+Shift+Z' : 'Ctrl+Y / Ctrl+Shift+Z', `${mod}+B`, `${mod}+I`, `${mod}+K`, `${mod}+Shift+7`, `${mod}+Shift+8`, `${alt}+↑`, `${alt}+↓`, `${alt}+Shift+↑`, `${alt}+Shift+↓`, `${mod}+Shift+K`, 'Tab', 'Shift+Tab', 'Tab', 'Shift+Tab', 'Enter', 'Enter', 'Shift+Enter', 'Enter', '←', '→', '+ / =', '−', '0', `${mod}+Enter`]
  const boundaries = [0, 5, 22, 25, 30, 31]

  return <div ref={ref} className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <button type="button" className="about-close" onClick={onClose} aria-label={labels.close}><X aria-hidden="true" /></button>
      <header className="shortcuts-header"><h2 id="shortcuts-title">{labels.title}</h2><p>{labels.note}</p>
        <div className="shortcuts-actions"><button type="button" onClick={() => setAll(true)} disabled={disabled.size === 0}>{labels.enable}</button><button type="button" onClick={() => setAll(false)} disabled={disabled.size === SHORTCUT_IDS.length}>{labels.disable}</button></div>
      </header>
      <div className="shortcuts-list">{groups.map((group, groupIndex) => <section key={group}><h3>{group}</h3>
        {SHORTCUT_IDS.slice(boundaries[groupIndex], boundaries[groupIndex + 1]).map((id, index) => {
          const position = boundaries[groupIndex] + index
          return <label className="shortcuts-row" key={id}><span>{names[position]}</span><kbd>{keys[position]}</kbd><input type="checkbox" checked={!disabled.has(id)} onChange={(event) => setEnabled(id, event.currentTarget.checked)} aria-label={names[position]} /></label>
        })}
      </section>)}<section className="shortcuts-navigation"><h3>{navigation[language][0]}</h3><p>{navigation[language][1]}</p></section></div>
    </section>
  </div>
}
