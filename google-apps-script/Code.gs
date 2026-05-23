/**
 * LedgerBridge — Google Sheets / Apps Script version ($0 hosting)
 * Extensions → Apps Script → paste this file → Deploy as web app (optional)
 */

var QBO_HEADERS = ['Date', 'Description', 'Amount'];

/**
 * Menu: LedgerBridge → Convert selected Stripe CSV paste
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('LedgerBridge')
    .addItem('Convert Stripe sheet to QBO format', 'convertActiveSheet')
    .addItem('Import CSV from Drive', 'importCsvFromDrive')
    .addToUi();
}

function convertActiveSheet() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert('Need at least a header row and one data row.');
    return;
  }

  var result = convertRows_(data);
  var outName = 'QBO Import ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var out = SpreadsheetApp.getActive().getSheetByName(outName);
  if (!out) {
    out = SpreadsheetApp.getActive().insertSheet(outName);
  } else {
    out.clear();
  }

  var rows = [QBO_HEADERS].concat(result.rows);
  out.getRange(1, 1, rows.length, 3).setValues(rows);
  SpreadsheetApp.getUi().alert('Done: ' + result.rows.length + ' QBO lines written to "' + outName + '".');
}

function convertRows_(data) {
  var headers = data[0].map(function (h) {
    return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
  });
  var out = [];

  for (var r = 1; r < data.length; r++) {
    var rec = {};
    for (var c = 0; c < headers.length; c++) {
      rec[headers[c]] = data[r][c];
    }
    var line = mapRecord_(rec);
    if (line) {
      if (line.feeRow) {
        out.push(line.main);
        out.push(line.feeRow);
      } else {
        out.push(line.main);
      }
    }
  }
  return { rows: out };
}

function mapRecord_(rec) {
  var dateRaw = pick_(rec, ['created', 'createdutc', 'date', 'availableon']);
  var desc = pick_(rec, ['description', 'reportingcategory', 'type']) || 'Stripe transaction';
  var gross = parseAmount_(pick_(rec, ['gross', 'amount', 'total']));
  var fee = parseAmount_(pick_(rec, ['fee', 'fees']));
  var net = parseAmount_(rec, ['net', 'netamount']);

  var d = parseDate_(dateRaw);
  if (!d) return null;

  var dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MM/dd/yyyy');
  var effectiveGross = gross !== 0 ? gross : net + fee;
  var effectiveNet = net !== 0 ? net : gross - fee;

  if (Math.abs(fee) > 0.001) {
    return {
      main: [dateStr, 'Stripe: ' + desc, effectiveGross !== 0 ? effectiveGross : effectiveNet + fee],
      feeRow: [dateStr, 'Stripe fee: ' + desc, -Math.abs(fee)]
    };
  }

  var amt = effectiveNet !== 0 ? effectiveNet : effectiveGross;
  if (amt === 0) return null;
  return { main: [dateStr, 'Stripe: ' + desc, amt] };
}

function pick_(rec, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (rec[keys[i]] !== undefined && rec[keys[i]] !== '') return rec[keys[i]];
  }
  return '';
}

function parseAmount_(raw) {
  if (!raw) return 0;
  var s = String(raw).replace(/[$,\s]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate_(raw) {
  if (!raw) return null;
  if (Object.prototype.toString.call(raw) === '[object Date]') return raw;
  var d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function importCsvFromDrive() {
  var html = HtmlService.createHtmlOutput(
    '<p>Upload Stripe CSV to Google Drive, open in Sheets, then run LedgerBridge → Convert.</p>'
  );
  SpreadsheetApp.getUi().showModalDialog(html, 'LedgerBridge');
}
