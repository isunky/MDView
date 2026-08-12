import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import type { SelectionRange } from '../domain/editorCommands'
import { getTextareaSelection } from './useEditorHistory'

type UseEditorImageInputOptions = {
  supportsImageImport: boolean
  onImportImages?: (files: File[], selection: SelectionRange) => Promise<void> | void
  onFallbackImage: () => void
}

export function useEditorImageInput({
  supportsImageImport,
  onImportImages,
  onFallbackImage,
}: UseEditorImageInputOptions) {
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const pendingSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 })
  const [isDragActive, setIsDragActive] = useState(false)

  function openPicker(textarea: HTMLTextAreaElement | null) {
    if (!supportsImageImport || !onImportImages || !textarea) {
      onFallbackImage()
      return
    }
    pendingSelectionRef.current = getTextareaSelection(textarea)
    imageInputRef.current?.click()
  }

  function handleInputChange(input: HTMLInputElement) {
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length > 0 && onImportImages) {
      void onImportImages(files, pendingSelectionRef.current)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = getImageFiles(event.clipboardData.files)
    if (images.length === 0 || !onImportImages) {
      return
    }
    event.preventDefault()
    void onImportImages(images, getTextareaSelection(event.currentTarget))
  }

  function handleDragEnter(event: DragEvent<HTMLTextAreaElement>) {
    if (supportsImageImport && hasDraggedImages(event.dataTransfer)) {
      event.preventDefault()
      setIsDragActive(true)
    }
  }

  function handleDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (supportsImageImport && hasDraggedImages(event.dataTransfer)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setIsDragActive(true)
    }
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    setIsDragActive(false)
    const images = getImageFiles(event.dataTransfer.files)
    if (images.length === 0 || !onImportImages) {
      return
    }
    event.preventDefault()
    void onImportImages(images, getTextareaSelection(event.currentTarget))
  }

  return {
    imageInputRef,
    isDragActive,
    clearDragState: () => setIsDragActive(false),
    handleDragEnter,
    handleDragOver,
    handleDrop,
    handleInputChange,
    handlePaste,
    openPicker,
  }
}

function getImageFiles(files: FileList): File[] {
  return Array.from(files).filter((file) =>
    file.type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name),
  )
}

function hasDraggedImages(dataTransfer: DataTransfer): boolean {
  return getImageFiles(dataTransfer.files).length > 0
    || Array.from(dataTransfer.items).some((item) =>
      item.kind === 'file' && item.type.startsWith('image/'),
    )
}
