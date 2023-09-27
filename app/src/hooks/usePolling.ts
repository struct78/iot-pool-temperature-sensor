import { useState, useEffect, useRef, useCallback } from "react"

const DEFAULT_POLLING_INTERVAL = 5000

export function useInterval(callback: () => any, delay: number) {
  const savedCallback = useRef<() => any | undefined>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current()
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

export function usePolling(
  callback: (abortSignal: AbortSignal) => any,
  interval = DEFAULT_POLLING_INTERVAL,
) {
  const abortControllerRef = useRef(new AbortController())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    callback(abortControllerRef.current.signal)
    setLastUpdated(new Date())

    return () => {
      abortControllerRef.current.abort()
    }
  }, [])

  const intervalFn = useCallback(() => {
    if (document.hasFocus()) {
      callback(abortControllerRef.current.signal)
      setLastUpdated(new Date())
    }
  }, [])

  useInterval(intervalFn, interval)

  return lastUpdated
}