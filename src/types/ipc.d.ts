export {}

declare global {
  interface Window {
    vireon: {
      getVersion: () => Promise<string>
      send: (channel: string, ...args: any[]) => void
      on: (channel: string, listener: (...args: any[]) => void) => () => void
    }
  }
}
