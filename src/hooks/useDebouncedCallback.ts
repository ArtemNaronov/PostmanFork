import { useCallback, useEffect, useMemo, useRef } from 'react'
import { debounce } from '../utils/debounce'

/** Debounce a single-argument async/sync function */
export function useDebouncedCallback<A>(
  fn: (arg: A) => void | Promise<void>,
  ms: number,
): (arg: A) => void {
  const ref = useRef(fn)
  ref.current = fn

  const debounced = useMemo(() => {
    const d = debounce((arg: A) => {
      void ref.current(arg)
    }, ms)
    return d
  }, [ms])

  useEffect(() => () => debounced.cancel(), [debounced])

  return useCallback(
    (arg: A) => {
      debounced(arg)
    },
    [debounced],
  )
}
