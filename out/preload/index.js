"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // User authentication
  userLogin: (email) => electron.ipcRenderer.invoke("user:login", email),
  userSignup: (name, email) => electron.ipcRenderer.invoke("user:signup", name, email),
  userGetAll: () => electron.ipcRenderer.invoke("user:getAll"),
  userUpdate: (id, name, email) => electron.ipcRenderer.invoke("user:update", id, name, email),
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
  mercuryFetchAccounts: (apiKey) => electron.ipcRenderer.invoke("mercury:fetchAccounts", apiKey),
  // Company Ledger Records
  companyLedgerSet: (companyId, key, value) => electron.ipcRenderer.invoke("companyLedger:set", companyId, key, value),
  companyLedgerGet: (companyId, key) => electron.ipcRenderer.invoke("companyLedger:get", companyId, key),
  companyLedgerGetAll: (companyId) => electron.ipcRenderer.invoke("companyLedger:getAll", companyId),
  companyLedgerDelete: (companyId, key) => electron.ipcRenderer.invoke("companyLedger:delete", companyId, key),
  // Ledger Presets
  ledgerPresetCreate: (key, label, description) => electron.ipcRenderer.invoke("ledgerPreset:create", key, label, description),
  ledgerPresetGetById: (id) => electron.ipcRenderer.invoke("ledgerPreset:getById", id),
  ledgerPresetGetByKey: (key) => electron.ipcRenderer.invoke("ledgerPreset:getByKey", key),
  ledgerPresetGetAll: () => electron.ipcRenderer.invoke("ledgerPreset:getAll"),
  ledgerPresetUpdate: (id, key, label, description) => electron.ipcRenderer.invoke("ledgerPreset:update", id, key, label, description),
  ledgerPresetDelete: (id) => electron.ipcRenderer.invoke("ledgerPreset:delete", id),
  // Mercury Accounts
  mercuryAccountSyncFromApi: (companyId, apiKey) => electron.ipcRenderer.invoke("mercuryAccount:syncFromApi", companyId, apiKey),
  mercuryAccountGetByCompanyId: (companyId) => electron.ipcRenderer.invoke("mercuryAccount:getByCompanyId", companyId),
  mercuryAccountSetLedgerMapping: (mercuryAccountId, ledgerPresetId) => electron.ipcRenderer.invoke("mercuryAccount:setLedgerMapping", mercuryAccountId, ledgerPresetId),
  mercuryAccountGetLedgerMappings: (mercuryAccountId) => electron.ipcRenderer.invoke("mercuryAccount:getLedgerMappings", mercuryAccountId),
  // CSV Mappings
  csvMappingGetByCompanyAndType: (companyId, exportType) => electron.ipcRenderer.invoke("csvMapping:getByCompanyAndType", companyId, exportType),
  csvMappingUpsert: (companyId, exportType, fieldName, template) => electron.ipcRenderer.invoke("csvMapping:upsert", companyId, exportType, fieldName, template),
  csvMappingDelete: (id) => electron.ipcRenderer.invoke("csvMapping:delete", id),
  // Window management
  windowOpenCompanyReports: (companyId, companyName) => electron.ipcRenderer.invoke("window:openCompanyReports", companyId, companyName)
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
