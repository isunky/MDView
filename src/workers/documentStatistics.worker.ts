import { getDocumentStatistics, type DocumentStatistics } from '../domain/documentStatistics'

type StatisticsRequest = {
  requestId: number
  content: string
}

type StatisticsResponse = {
  requestId: number
  statistics: DocumentStatistics
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<StatisticsRequest>) => void) | null
  postMessage: (message: StatisticsResponse) => void
}

workerScope.onmessage = (event) => {
  const { requestId, content } = event.data
  workerScope.postMessage({ requestId, statistics: getDocumentStatistics(content) })
}
