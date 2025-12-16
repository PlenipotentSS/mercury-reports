"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // User authentication
  userLogin: (email) => electron.ipcRenderer.invoke("user:login", email),
  userSignup: (name, email) => electron.ipcRenderer.invoke("user:signup", name, email),
  userGetAll: () => electron.ipcRenderer.invoke("user:getAll"),
  // API Key management
  apiKeyCreate: (userId, apiKey, keyName) => electron.ipcRenderer.invoke("apiKey:create", userId, apiKey, keyName),
  apiKeyGetActive: (userId) => electron.ipcRenderer.invoke("apiKey:getActive", userId),
  apiKeyGetAll: (userId, activeOnly) => electron.ipcRenderer.invoke("apiKey:getAll", userId, activeOnly),
  apiKeyUpdate: (id, apiKey, keyName) => electron.ipcRenderer.invoke("apiKey:update", id, apiKey, keyName),
  apiKeyDeactivate: (id) => electron.ipcRenderer.invoke("apiKey:deactivate", id),
  // Company management
  companyCreate: (userId, name, apiKey) => electron.ipcRenderer.invoke("company:create", userId, name, apiKey),
  companyGetById: (id) => electron.ipcRenderer.invoke("company:getById", id),
  companyGetAll: (userId, activeOnly) => electron.ipcRenderer.invoke("company:getAll", userId, activeOnly),
  companyUpdate: (id, name, apiKey) => electron.ipcRenderer.invoke("company:update", id, name, apiKey),
  companyDeactivate: (id) => electron.ipcRenderer.invoke("company:deactivate", id),
  companyUpdateLastUsed: (id) => electron.ipcRenderer.invoke("company:updateLastUsed", id),
  // Mercury API
  mercuryFetchTransactions: (apiKey, queryString) => electron.ipcRenderer.invoke("mercury:fetchTransactions", apiKey, queryString),
  mercuryFetchAccounts: (apiKey) => electron.ipcRenderer.invoke("mercury:fetchAccounts", apiKey)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
