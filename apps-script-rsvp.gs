const SHEET_NAME = "Confirmacoes";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const sheet = getConfirmationsSheet_();
  const headers = getHeaders_();
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

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getConfirmationsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function getHeaders_() {
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

function ensureHeaders_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function formatValue_(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}
