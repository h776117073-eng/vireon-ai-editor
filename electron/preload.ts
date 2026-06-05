import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('vireon', {
  getVersion: async () => {
    return await ipcRenderer.invoke('app/get-version')
  },
  openFileDialog: async (opts?: any) => {
    return await ipcRenderer.invoke('dialog/open-file', opts)
  },
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args)
  },
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    const wrapped = (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
})
