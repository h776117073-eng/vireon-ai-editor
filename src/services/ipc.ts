export async function getAppVersion(): Promise<string> {
  // Window API exposed via preload
  // @ts-ignore
  return await window.vireon.getVersion()
}

export async function openFileDialog(opts?: any) {
  // @ts-ignore
  return await window.vireon.openFileDialog(opts)
}

export function send(channel: string, ...args: any[]) {
  // @ts-ignore
  window.vireon.send(channel, ...args)
}

export function on(channel: string, cb: (...args: any[]) => void) {
  // @ts-ignore
  return window.vireon.on(channel, (_event: any, ...args: any[]) => cb(...args))
}
