import { useEffect, useState } from 'react'

export function useResource<T>(key: string, load: () => Promise<T>) {
  const [version, setVersion] = useState(0)
  const current = `${key}:${version}`
  const [state, setState] = useState<{ key: string; data?: T; error?: unknown }>({ key: '' })
  useEffect(() => {
    let active = true
    load().then(
      (data) => {
        if (active) setState({ key: current, data })
      },
      (error) => {
        if (active) setState({ key: current, error })
      },
    )
    return () => {
      active = false
    }
  }, [current, load])
  return {
    data: state.key === current ? state.data : undefined,
    error: state.key === current ? state.error : undefined,
    loading: state.key !== current,
    reload: () => setVersion((value) => value + 1),
  }
}
