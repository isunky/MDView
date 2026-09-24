import { useEffect, useRef, useState } from 'react'
import { getDocumentStatistics, type DocumentStatistics } from '../domain/documentStatistics'

const STATISTICS_DEBOUNCE_MS = 250
const EMPTY_STATISTICS: DocumentStatistics = { characterCount: 0, wordCount: 0, readingMinutes: 0 }

type StatisticsResponse = {
  requestId: number
  statistics: DocumentStatistics
}

type StatisticsRequest = {
  requestId: number
  content: string
}

export function useDocumentStatistics(content: string): DocumentStatistics {
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS)
  const workerRef = useRef<Worker | null>(null)
  const fallbackTimerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)
  const latestContentRef = useRef(content)

  useEffect(() => {
    if (typeof Worker === 'undefined') return

    let worker: Worker
    try {
      worker = new Worker(new URL('../workers/documentStatistics.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      return
    }

    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<StatisticsResponse>) => {
      if (event.data.requestId === requestIdRef.current) {
        setStatistics(event.data.statistics)
      }
    }
    worker.onerror = () => {
      if (workerRef.current !== worker) return
      workerRef.current = null
      worker.terminate()
      const requestId = requestIdRef.current
      const currentContent = latestContentRef.current
      fallbackTimerRef.current = window.setTimeout(() => {
        fallbackTimerRef.current = null
        if (requestId === requestIdRef.current) {
          setStatistics(getDocumentStatistics(currentContent))
        }
      }, STATISTICS_DEBOUNCE_MS)
    }

    return () => {
      if (workerRef.current === worker) workerRef.current = null
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    latestContentRef.current = content
    const requestId = ++requestIdRef.current
    const timeout = window.setTimeout(() => {
      const request: StatisticsRequest = { requestId, content }
      if (workerRef.current) {
        workerRef.current.postMessage(request)
      } else {
        setStatistics(getDocumentStatistics(content))
      }
    }, STATISTICS_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
      if (requestIdRef.current === requestId) requestIdRef.current += 1
    }
  }, [content])

  return statistics
}
