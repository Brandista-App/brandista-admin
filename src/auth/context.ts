import { createContext, useContext, useSyncExternalStore } from 'react'
import type { SessionStore } from './session'

export const SessionContext = createContext<SessionStore | null>(null)
export function useAuth() {
  const store = useContext(SessionContext)
  if (!store) throw new Error('Session provider is missing.')
  const session = useSyncExternalStore(store.subscribe, store.snapshot)
  return { store, session }
}
