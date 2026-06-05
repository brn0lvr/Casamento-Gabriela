const CONFIRMATIONS_SHEET_NAME = "Confirmacoes";
const GIFTS_SHEET_NAME = "Presentes";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  if (payload.kind === "gift") {
    const result = claimGift_(payload);
    return createJsonOutput_(result);
  }

  const sheet = getConfirmationsSheet_();
  const headers = getConfirmationHeaders_();
  ensureHeaders_(sheet, headers);

  const rows = sheet.getDataRange().getValues();
  const familyIdIndex = headers.indexOf("familyId");
  const existingRow = rows.findIndex((row, index) =>
    index > 0 && row[familyIdIndex] === payload.familyId
  );
  const values = headers.map((header) => formatValue_(payload[header]));

  if (existingRow > 0) {
    sheet.getRange(existingRow + 1, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return createJsonOutput_({ ok: true });
}

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.action === "gifts") {
    return createJsonOutput_({
      ok: true,
      gifts: getPurchasedGifts_()
    }, params.callback);
  }

  if (params.action === "claimGift") {
    return createJsonOutput_(claimGift_(params), params.callback);
  }

  return createJsonOutput_({ ok: true }, params.callback);
}

function getConfirmationsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(CONFIRMATIONS_SHEET_NAME) || spreadsheet.insertSheet(CONFIRMATIONS_SHEET_NAME);
}

function getGiftsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(GIFTS_SHEET_NAME) || spreadsheet.insertSheet(GIFTS_SHEET_NAME);
}

function getConfirmationHeaders_() {
  return [
    "familyId",
    "familyName",
    "confirmedMembers",
    "absentMembers",
    "totalConfirmed",
    "phone",
    "notes",
    "confirmedAt",
    "updatedAt"
  ];
}

function getGiftHeaders_() {
  return [
    "giftId",
    "giftName",
    "giftPrice",
    "guestName",
    "guestPhone",
    "giftMessage",
    "giftLink",
    "purchasedAt"
  ];
}

function ensureHeaders_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function getPurchasedGifts_() {
  const sheet = getGiftsSheet_();
  const headers = getGiftHeaders_();
  ensureHeaders_(sheet, headers);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }

  return values.slice(1)
    .filter((row) => row[0])
    .map((row) => headers.reduce((gift, header, index) => {
      gift[header] = row[index] || "";
      return gift;
    }, {}));
}

function claimGift_(payload) {
  const giftId = String(payload.giftId || "").trim();
  if (!giftId) {
    return { ok: false, claimed: false, message: "giftId ausente" };
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);

  try {
    const sheet = getGiftsSheet_();
    const headers = getGiftHeaders_();
    ensureHeaders_(sheet, headers);

    const rows = sheet.getDataRange().getValues();
    const giftIdIndex = headers.indexOf("giftId");
    const existingRow = rows.findIndex((row, index) =>
      index > 0 && row[giftIdIndex] === giftId
    );

    if (existingRow > 0) {
      return { ok: true, claimed: false, message: "Presente indisponível" };
    }

    const record = {
      giftId,
      giftName: payload.giftName,
      giftPrice: payload.giftPrice,
      guestName: payload.guestName,
      guestPhone: payload.guestPhone,
      giftMessage: payload.giftMessage,
      giftLink: payload.giftLink,
      purchasedAt: payload.purchasedAt || new Date().toISOString()
    };

    sheet.appendRow(headers.map((header) => formatValue_(record[header])));
    return { ok: true, claimed: true, giftId };
  } finally {
    lock.releaseLock();
  }
}

function createJsonOutput_(data, callback) {
  const json = JSON.stringify(data);
  const safeCallback = String(callback || "");

  if (/^[\w.$]+$/.test(safeCallback)) {
    return ContentService
      .createTextOutput(`${safeCallback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function formatValue_(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}
