(function () {
  const FREE_LIMIT = 5;
  const STORAGE_KEY = "ledgerbridge_usage";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const splitFees = document.getElementById("split-fees");
  const useNet = document.getElementById("use-net");
  const dateFormat = document.getElementById("date-format");
  const preview = document.getElementById("preview");
  const previewTable = document.querySelector("#preview-table tbody");
  const rowCount = document.getElementById("row-count");
  const warningsEl = document.getElementById("warnings");
  const errorEl = document.getElementById("error");
  const downloadBtn = document.getElementById("download-btn");
  const waitlistForm = document.getElementById("waitlist-form");
  const waitlistMsg = document.getElementById("waitlist-msg");

  /** @type {string | null} */
  let lastCsvOut = null;

  function getUsage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: monthKey(), count: 0 };
    try {
      return JSON.parse(raw);
    } catch {
      return { month: monthKey(), count: 0 };
    }
  }

  function monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  }

  function bumpUsage() {
    const u = getUsage();
    const current = u.month === monthKey() ? u.count : 0;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ month: monthKey(), count: current + 1 })
    );
    return current + 1;
  }

  function canConvert() {
    const u = getUsage();
    if (u.month !== monthKey()) return true;
    return u.count < FREE_LIMIT;
  }

  function showError(msg) {
    errorEl.hidden = false;
    errorEl.textContent = msg;
    preview.hidden = true;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function getOptions() {
    return {
      splitFees: splitFees.checked && !useNet.checked,
      useNetOnly: useNet.checked,
      dateFormat: /** @type {"mdy"|"ymd"} */ (dateFormat.value),
    };
  }

  function renderPreview(result) {
    previewTable.innerHTML = "";
    const show = result.rows.slice(0, 50);
    for (const row of show) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.description)}</td><td class="amount">${escapeHtml(row.amount)}</td>`;
      previewTable.appendChild(tr);
    }
    rowCount.textContent = `(${result.rows.length} QBO lines from ${result.sourceCount} Stripe rows)`;
    warningsEl.textContent = result.warnings.join(" ");
    preview.hidden = false;
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function processFile(file) {
    clearError();
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showError("Please upload a .csv file from Stripe.");
      return;
    }

    if (!canConvert()) {
      showError(
        `Free limit: ${FREE_LIMIT} conversions per month. Join the waitlist for Pro (unlimited).`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      try {
        const text = /** @type {string} */ (reader.result);
        const result = window.LedgerBridgeConverter.convertStripeToQbo(
          text,
          getOptions()
        );
        lastCsvOut = window.LedgerBridgeConverter.toCsv(result.rows);
        renderPreview(result);
        bumpUsage();
      } catch (e) {
        showError(e instanceof Error ? e.message : "Conversion failed.");
        lastCsvOut = null;
      }
    };
    reader.onerror = function () {
      showError("Could not read file.");
    };
    reader.readAsText(file);
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) processFile(f);
  });

  ["dragenter", "dragover"].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f) processFile(f);
  });

  useNet.addEventListener("change", () => {
    if (useNet.checked) splitFees.checked = false;
  });
  splitFees.addEventListener("change", () => {
    if (splitFees.checked) useNet.checked = false;
  });

  downloadBtn.addEventListener("click", () => {
    if (!lastCsvOut) return;
    const blob = new Blob([lastCsvOut], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `qbo-import-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  waitlistForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = new FormData(waitlistForm).get("email");
    const list = JSON.parse(localStorage.getItem("ledgerbridge_waitlist") || "[]");
    if (email && !list.includes(email)) list.push(email);
    localStorage.setItem("ledgerbridge_waitlist", JSON.stringify(list));
    waitlistMsg.hidden = false;
    waitlistMsg.textContent = "Thanks — you're on the list.";
    waitlistForm.reset();
  });
})();
