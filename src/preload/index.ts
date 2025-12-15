import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // User authentication
  userLogin: (email: string) => ipcRenderer.invoke('user:login', email),
  userSignup: (name: string, email: string) => ipcRenderer.invoke('user:signup', name, email),
  userGetAll: () => ipcRenderer.invoke('user:getAll'),

  // API Key management
  apiKeyCreate: (userId: number, apiKey: string, keyName?: string) =>
    ipcRenderer.invoke('apiKey:create', userId, apiKey, keyName),
  apiKeyGetActive: (userId: number) => ipcRenderer.invoke('apiKey:getActive', userId),
  apiKeyGetAll: (userId: number, activeOnly?: boolean) =>
    ipcRenderer.invoke('apiKey:getAll', userId, activeOnly),
  apiKeyUpdate: (id: number, apiKey: string, keyName?: string) =>
    ipcRenderer.invoke('apiKey:update', id, apiKey, keyName),
  apiKeyDeactivate: (id: number) => ipcRenderer.invoke('apiKey:deactivate', id),

  // Mercury API
  mercuryFetchTransactions: (apiKey: string, queryString?: string) =>
    ipcRenderer.invoke('mercury:fetchTransactions', apiKey, queryString)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
