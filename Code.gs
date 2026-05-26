// ===== CONFIG =====
const SPREADSHEET_ID = '1oHNh5k9i2xFDDSiw4BaefhfsFBd1gp2ZNUI6JNJZSBM';

const INITIAL_THEMES = [
  { name: 'パス', icon: '🎯', sortOrder: 1 },
  { name: 'シュート', icon: '⚽', sortOrder: 2 },
  { name: '守備', icon: '🛡️', sortOrder: 3 },
  { name: 'ポジショニング', icon: '📍', sortOrder: 4 },
  { name: 'ドリブル', icon: '💨', sortOrder: 5 },
  { name: 'トラップ', icon: '🦶', sortOrder: 6 },
  { name: 'メンタル', icon: '🧠', sortOrder: 7 },
  { name: 'スローイン', icon: '🙌', sortOrder: 8 },
  { name: '切り替え', icon: '🔄', sortOrder: 9 },
  { name: 'フィジカル', icon: '💪', sortOrder: 10 },
  { name: 'その他', icon: '📝', sortOrder: 99 },
];

// ===== HELPERS =====
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function sheetToArray(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== SHEET SETUP =====
function ensureSheets() {
  const entries = getOrCreateSheet('entries', ['id', 'date', 'title', 'type', 'note', 'createdAt']);
  const items = getOrCreateSheet('items', ['id', 'entryId', 'text', 'tag', 'theme', 'sortOrder']);
  const themes = getOrCreateSheet('themes', ['id', 'name', 'icon', 'sortOrder']);

  // 初期テーマ投入
  if (sheetToArray(themes).length === 0) {
    const rows = INITIAL_THEMES.map(t => [
      Date.now() + t.sortOrder, t.name, t.icon, t.sortOrder
    ]);
    themes.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  return { entries, items, themes };
}

// ===== API HANDLERS =====
function handleGetAll() {
  const { entries, items, themes } = ensureSheets();
  return {
    entries: sheetToArray(entries),
    items: sheetToArray(items),
    themes: sheetToArray(themes)
  };
}

function handleSaveEntry(params) {
  const sheet = getOrCreateSheet('entries', ['id', 'date', 'title', 'type', 'note', 'createdAt']);
  const id = params.id || String(Date.now());
  const row = [id, params.date || '', params.title || '', params.type || '', params.note || '', params.createdAt || new Date().toISOString()];
  const existingRow = findRowById(sheet, id);
  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { success: true, id };
}

function handleDeleteEntry(params) {
  const entrySheet = getOrCreateSheet('entries', ['id', 'date', 'title', 'type', 'note', 'createdAt']);
  const itemSheet = getOrCreateSheet('items', ['id', 'entryId', 'text', 'tag', 'theme', 'sortOrder']);

  // エントリー削除
  const entryRow = findRowById(entrySheet, params.id);
  if (entryRow > 0) entrySheet.deleteRow(entryRow);

  // 関連アイテム削除
  const itemData = itemSheet.getDataRange().getValues();
  for (let i = itemData.length - 1; i >= 1; i--) {
    if (String(itemData[i][1]) === String(params.id)) {
      itemSheet.deleteRow(i + 1);
    }
  }
  return { success: true };
}

function handleSaveItem(params) {
  const sheet = getOrCreateSheet('items', ['id', 'entryId', 'text', 'tag', 'theme', 'sortOrder']);
  const id = params.id || String(Date.now());
  const row = [id, params.entryId || '', params.text || '', params.tag || '', params.theme || '', params.sortOrder || 0];
  const existingRow = findRowById(sheet, id);
  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { success: true, id };
}

function handleDeleteItem(params) {
  const sheet = getOrCreateSheet('items', ['id', 'entryId', 'text', 'tag', 'theme', 'sortOrder']);
  const row = findRowById(sheet, params.id);
  if (row > 0) sheet.deleteRow(row);
  return { success: true };
}

function handleSaveTheme(params) {
  const sheet = getOrCreateSheet('themes', ['id', 'name', 'icon', 'sortOrder']);
  const id = params.id || String(Date.now());
  const row = [id, params.name || '', params.icon || '', params.sortOrder || 0];
  const existingRow = findRowById(sheet, id);
  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { success: true, id };
}

function handleBulkSaveEntry(params) {
  const entry = params.entry || {};
  const items = params.items || [];
  const entryResult = handleSaveEntry(entry);
  const itemResults = items.map(item => {
    item.entryId = entryResult.id;
    return handleSaveItem(item);
  });
  return { success: true, entryId: entryResult.id, itemCount: itemResults.length };
}

// ===== ENDPOINTS =====
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    let result;
    switch (action) {
      case 'getAll':        result = handleGetAll(); break;
      case 'saveEntry':     result = handleSaveEntry(params); break;
      case 'deleteEntry':   result = handleDeleteEntry(params); break;
      case 'saveItem':      result = handleSaveItem(params); break;
      case 'deleteItem':    result = handleDeleteItem(params); break;
      case 'saveTheme':     result = handleSaveTheme(params); break;
      case 'bulkSaveEntry': result = handleBulkSaveEntry(params); break;
      default:              result = { error: 'Unknown action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAll';
    if (action === 'getAll') {
      return jsonResponse(handleGetAll());
    }
    return jsonResponse({ error: 'GET only supports getAll' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
