export function debounce<A>(fn: (arg: A) => void, ms: number): ((arg: A) => void) & { cancel: () => void } {
  let t: ReturnType<typeof setTimeout> | undefined
  const wrapped = ((arg: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      t = undefined
      fn(arg)
    }, ms)
  }) as ((arg: A) => void) & { cancel: () => void }
  wrapped.cancel = () => {
    if (t) clearTimeout(t)
    t = undefined
  }
  return wrapped
}
