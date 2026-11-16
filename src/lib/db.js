/** SA Invoice Pro IndexedDB layer — barrel re-exports (keeps existing import paths). */
export {
  STORES,
  getAll, get, put, add, remove,
  getSetting, setSetting,
  getCompanies, setActiveCompany, getCompany, saveCompany, deleteCompany,
  exportAll,
  openDB, tx,
} from './dbCore.js'

export {
  importAll, replaceAllAtomic, replaceAllStaged,
} from './dbImport.js'

export {
  saveAccountWorkspace, clearActiveWorkspace, restoreAccountWorkspace,
  recoverDeviceLicenseSettings,
  listTicketComments, addTicketComment,
  addManyAtomic, withTransaction,
} from './dbAccount.js'

export {
  downloadBackupStreaming,
} from './dbStreamExport.js'
