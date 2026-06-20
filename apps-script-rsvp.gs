const CONFIRMATIONS_SHEET_NAME = "Confirmacoes";
const GIFTS_SHEET_NAME = "Presentes";

function doPost(e) {
  const payload = parseRequestPayload_(e);
  if (payload.kind === "gift" || payload.action === "claimGift") {
    const result = claimGift_(payload);
    return createJsonOutput_(result);
  }

  const confirmation = normalizeConfirmationPayload_(payload);
  const sheet = getConfirmationsSheet_();
  const headers = ensureHeaders_(sheet, getConfirmationHeaders_());

  const rows = sheet.getDataRange().getValues();
  const familyIdIndex = headers.indexOf("familyId");
  const existingRow = rows.findIndex((row, index) =>
    index > 0 && row[familyIdIndex] === confirmation.familyId
  );
  const values = headers.map((header) => formatValue_(confirmation[header]));

  if (existingRow > 0) {
    sheet.getRange(existingRow + 1, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return createJsonOutput_({ ok: true });
}

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.action === "setup") {
    return createJsonOutput_(setupSheets_(), params.callback);
  }

  if (params.action === "gifts") {
    return createJsonOutput_({
      ok: true,
      gifts: getPurchasedGifts_()
    }, params.callback);
  }

  if (params.action === "claimGift") {
    return createJsonOutput_(claimGift_(params), params.callback);
  }

  if (params.action === "claimGiftRedirect") {
    const result = claimGift_(params);
    return createRedirectOutput_(params.redirectUrl || params.giftLink, result);
  }

  return createJsonOutput_({ ok: true }, params.callback);
}

function parseRequestPayload_(e) {
  const contents = (e && e.postData && e.postData.contents) || "";

  if (contents) {
    try {
      return JSON.parse(contents);
    } catch (error) {
      // Formularios HTML chegam como parametros em e.parameter.
    }
  }

  return (e && e.parameter) || {};
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
    "alcoholCount",
    "dietaryRestriction",
    "notes",
    "confirmedAt",
    "updatedAt"
  ];
}

function normalizeConfirmationPayload_(payload) {
  const confirmation = Object.assign({}, payload);

  confirmation.alcoholCount = firstFilledValue_(
    payload.alcoholCount,
    payload.alcohol,
    payload.alcool,
    payload.bebida,
    payload.bebidaAlcoolica,
    payload.beverageCount
  );
  confirmation.dietaryRestriction = firstFilledValue_(
    payload.dietaryRestriction,
    payload.restricaoAlimentar,
    payload.restricao,
    payload.restriction,
    payload.foodRestriction
  );

  return confirmation;
}

function firstFilledValue_() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = arguments[index];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
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
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map((header) => String(header || "").trim());
  const hasAnyHeader = currentHeaders.some((header) => header);

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return headers.slice();
  }

  const mergedHeaders = currentHeaders.slice();

  headers.forEach((header) => {
    if (!mergedHeaders.includes(header)) {
      mergedHeaders.push(header);
    }
  });

  if (mergedHeaders.length !== currentHeaders.length) {
    sheet.getRange(1, 1, 1, mergedHeaders.length).setValues([mergedHeaders]);
    sheet.setFrozenRows(1);
  }

  return mergedHeaders;
}

function setupSheets_() {
  const confirmationsHeaders = ensureHeaders_(getConfirmationsSheet_(), getConfirmationHeaders_());
  const giftsHeaders = ensureHeaders_(getGiftsSheet_(), getGiftHeaders_());

  return {
    ok: true,
    confirmationsSheet: CONFIRMATIONS_SHEET_NAME,
    confirmationsHeaders,
    giftsSheet: GIFTS_SHEET_NAME,
    giftsHeaders
  };
}

function getPurchasedGifts_() {
  const sheet = getGiftsSheet_();
  const headers = ensureHeaders_(sheet, getGiftHeaders_());

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
    const headers = ensureHeaders_(sheet, getGiftHeaders_());

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

function createRedirectOutput_(url, result) {
  const safeUrl = String(url || "");
  const html = `
<!doctype html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${escapeHtml_(safeUrl)}">
  </head>
  <body>
    <script>
      window.top.location.href = ${JSON.stringify(safeUrl)};
    </script>
    <p>Redirecionando para o pagamento...</p>
  </body>
</html>`;

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(result && result.ok ? "Presente registrado" : "Redirecionando");
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValue_(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}
