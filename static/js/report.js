/* =========================================================
   Finzy — Report Wizard logic
   ========================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  let currentStep = 1;
  const transaksi = []; // { tanggal, keterangan, jenis: 'masuk'|'keluar', jumlah }

  function T(key) {
    return window.FinzyTranslate ? window.FinzyTranslate.t(key) : key;
  }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function formatRupiah(num) {
    const n = Number(num) || 0;
    return "Rp " + n.toLocaleString("id-ID");
  }

  function formatTanggal(isoDate) {
    if (!isoDate) return "-";
    const d = new Date(isoDate + "T00:00:00");
    if (isNaN(d.getTime())) return isoDate;
    const locale = window.FinzyTranslate ? window.FinzyTranslate.dateLocale() : "id-ID";
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  }

  function todayIso() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  function toast(icon, title) {
    if (window.Swal) {
      Swal.fire({
        icon: icon,
        title: title,
        confirmButtonColor: "#1C1B3B",
      });
    } else {
      alert(title);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Currency input formatting (thousands separator, id-ID style) ---
  function attachCurrencyFormatting(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const digitsOnly = el.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      el.value = digitsOnly === "" ? "" : Number(digitsOnly).toLocaleString("id-ID");
    });
  }

  // Returns NaN if the field is empty/invalid, otherwise a plain number
  function parseCurrencyInput(id) {
    const el = document.getElementById(id);
    if (!el) return NaN;
    const digitsOnly = el.value.replace(/\D/g, "");
    return digitsOnly === "" ? NaN : Number(digitsOnly);
  }

  // ---------------------------------------------------------
  // Custom "Jenis" dropdown (Uang Masuk / Uang Keluar)
  // Fully custom so it always opens right below the trigger —
  // never as a full-screen native picker on mobile — and is
  // visibly interactive via the chevron + hover/focus states.
  // ---------------------------------------------------------
  function initJenisDropdown() {
    const wrap = document.getElementById("jenisSelect");
    const trigger = document.getElementById("jenisTrigger");
    const options = document.getElementById("jenisOptions");
    const hiddenInput = document.getElementById("txJenis");
    const valueLabel = document.getElementById("jenisValueLabel");
    if (!wrap || !trigger || !options || !hiddenInput) return;

    function close() {
      options.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      wrap.classList.remove("is-open");
    }
    function open() {
      options.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      wrap.classList.add("is-open");
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      options.hidden ? open() : close();
    });

    options.querySelectorAll(".custom-select-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const value = opt.dataset.value;
        hiddenInput.value = value;
        valueLabel.textContent = opt.textContent.trim();
        valueLabel.setAttribute("data-translate", opt.getAttribute("data-translate"));
        options.querySelectorAll(".custom-select-option").forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        close();
      });
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) close();
    });

    // Keep the trigger label in sync with the chosen option's
    // current-language text whenever the language is switched.
    document.addEventListener("finzy:langchange", () => {
      const selected = options.querySelector(".custom-select-option.is-selected");
      if (selected) valueLabel.textContent = selected.textContent.trim();
    });
  }

  function resetJenisDropdown() {
    const options = document.getElementById("jenisOptions");
    const hiddenInput = document.getElementById("txJenis");
    const valueLabel = document.getElementById("jenisValueLabel");
    if (!options || !hiddenInput || !valueLabel) return;
    hiddenInput.value = "masuk";
    options.querySelectorAll(".custom-select-option").forEach((o) => {
      o.classList.toggle("is-selected", o.dataset.value === "masuk");
    });
    valueLabel.textContent = T("option_masuk");
    valueLabel.setAttribute("data-translate", "option_masuk");
  }

  // ---------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------
  function goToStep(step) {
    if (step >= 2 && !validateStep1()) return;
    if (step === 3) renderSummary();

    document.querySelectorAll(".wizard-step").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.step) === step);
    });

    document.querySelectorAll(".step-dot").forEach((dot) => {
      const dotNum = Number(dot.dataset.dot);
      dot.classList.toggle("is-active", dotNum === step);
      dot.classList.toggle("is-done", dotNum < step);
    });

    currentStep = step;
    document.querySelector(".wizard-card").scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep1() {
    const judul = document.getElementById("judulLaporan").value.trim();
    const tanggal = document.getElementById("tanggalLaporan").value;
    const saldoAwal = parseCurrencyInput("saldoAwal");

    if (!judul) {
      toast("warning", T("toast_judul_kosong"));
      return false;
    }
    if (!tanggal) {
      toast("warning", T("toast_tanggal_kosong"));
      return false;
    }
    if (isNaN(saldoAwal) || saldoAwal < 0) {
      toast("warning", T("toast_saldo_invalid"));
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------
  // Transaksi (Step 2)
  // ---------------------------------------------------------
  function addTransaksi() {
    const tanggal = document.getElementById("txTanggal").value;
    const keterangan = document.getElementById("txKeterangan").value.trim();
    const jenis = document.getElementById("txJenis").value;
    const jumlah = parseCurrencyInput("txJumlah");

    if (!tanggal || !keterangan || isNaN(jumlah) || jumlah <= 0) {
      toast("warning", T("toast_transaksi_invalid"));
      return;
    }

    transaksi.push({ tanggal, keterangan, jenis, jumlah });
    renderTransaksiTable();

    // reset form
    document.getElementById("txTanggal").value = "";
    document.getElementById("txKeterangan").value = "";
    document.getElementById("txJumlah").value = "";
    resetJenisDropdown();
    document.getElementById("txKeterangan").focus();
  }

  function removeTransaksi(index) {
    transaksi.splice(index, 1);
    renderTransaksiTable();
  }

  function renderTransaksiTable() {
    const tbody = document.getElementById("transaksiTableBody");
    const cardList = document.getElementById("transaksiCardList");
    const empty = document.getElementById("emptyTransaksi");
    tbody.innerHTML = "";
    cardList.innerHTML = "";

    if (transaksi.length === 0) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    transaksi.forEach((tx, i) => {
      const jenisLabel = tx.jenis === "masuk" ? T("option_masuk") : T("option_keluar");
      const badgeClass = tx.jenis === "masuk" ? "tx-badge-masuk" : "tx-badge-keluar";
      const amountClass = tx.jenis === "masuk" ? "text-in" : "text-out";
      const sign = tx.jenis === "masuk" ? "+" : "−";

      // Desktop table row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatTanggal(tx.tanggal)}</td>
        <td>${escapeHtml(tx.keterangan)}</td>
        <td><span class="tx-badge ${badgeClass}">${jenisLabel}</span></td>
        <td class="text-end">${formatRupiah(tx.jumlah)}</td>
        <td><button type="button" class="tx-delete-btn" data-remove="${i}"><i class="fa fa-trash"></i></button></td>
      `;
      tbody.appendChild(tr);

      // Mobile card — everything visible at a glance, delete
      // button always in view (top-right of the card), no
      // horizontal scrolling and no cramped 2-line badges.
      const card = document.createElement("div");
      card.className = "tx-card";
      card.innerHTML = `
        <button type="button" class="tx-card-delete" data-remove="${i}" aria-label="Hapus">
          <i class="fa fa-trash"></i>
        </button>
        <div class="tx-card-top">
          <span class="tx-badge ${badgeClass}">${jenisLabel}</span>
          <span class="tx-card-date">${formatTanggal(tx.tanggal)}</span>
        </div>
        <div class="tx-card-keterangan">${escapeHtml(tx.keterangan)}</div>
        <div class="tx-card-amount ${amountClass}">${sign} ${formatRupiah(tx.jumlah)}</div>
      `;
      cardList.appendChild(card);
    });

    document.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => removeTransaksi(Number(btn.dataset.remove)));
    });
  }

  // ---------------------------------------------------------
  // Ledger helpers — shared by on-screen summary + PDF
  // Builds a running-balance list: Saldo Awal first (no date —
  // it's an opening position, not a dated event), then each
  // transaction sorted by date, each row carrying the balance
  // *after* that row is applied (like a simple buku kas).
  // ---------------------------------------------------------
  function buildLedger() {
    const saldoAwal = parseCurrencyInput("saldoAwal") || 0;
    const sorted = transaksi.slice().sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0));

    let saldo = saldoAwal;
    const rows = [
      { isSaldoAwal: true, tanggal: null, keterangan: T("row_saldo_awal"), masuk: null, keluar: null, saldo },
    ];

    let totalMasuk = 0;
    let totalKeluar = 0;

    sorted.forEach((tx) => {
      if (tx.jenis === "masuk") {
        saldo += tx.jumlah;
        totalMasuk += tx.jumlah;
        rows.push({ tanggal: tx.tanggal, keterangan: tx.keterangan, masuk: tx.jumlah, keluar: null, saldo });
      } else {
        saldo -= tx.jumlah;
        totalKeluar += tx.jumlah;
        rows.push({ tanggal: tx.tanggal, keterangan: tx.keterangan, masuk: null, keluar: tx.jumlah, saldo });
      }
    });

    return { rows, saldoAwal, totalMasuk, totalKeluar, saldoAkhir: saldo };
  }

  // ---------------------------------------------------------
  // Summary (Step 3)
  // ---------------------------------------------------------
  function renderSummary() {
    document.getElementById("sumJudul").textContent =
      document.getElementById("judulLaporan").value.trim() || "-";
    document.getElementById("sumTanggal").textContent =
      formatTanggal(document.getElementById("tanggalLaporan").value);

    const { rows, totalMasuk, totalKeluar, saldoAkhir } = buildLedger();

    document.getElementById("sumMasuk").textContent = formatRupiah(totalMasuk);
    document.getElementById("sumKeluar").textContent = formatRupiah(totalKeluar);
    document.getElementById("sumAkhir").textContent = formatRupiah(saldoAkhir);

    const tbody = document.getElementById("summaryTableBody");
    const cardList = document.getElementById("summaryCardList");
    tbody.innerHTML = "";
    cardList.innerHTML = "";

    rows.forEach((row) => {
      // Desktop table row
      const tr = document.createElement("tr");
      if (row.isSaldoAwal) tr.classList.add("row-saldo-awal");
      tr.innerHTML = `
        <td>${row.isSaldoAwal ? "—" : formatTanggal(row.tanggal)}</td>
        <td>${escapeHtml(row.keterangan)}</td>
        <td class="text-end">${row.masuk != null ? formatRupiah(row.masuk) : "—"}</td>
        <td class="text-end">${row.keluar != null ? formatRupiah(row.keluar) : "—"}</td>
        <td class="text-end">${formatRupiah(row.saldo)}</td>
      `;
      tbody.appendChild(tr);

      // Mobile card
      const card = document.createElement("div");
      if (row.isSaldoAwal) {
        card.className = "tx-card tx-card-saldo-awal";
        card.innerHTML = `
          <div class="tx-card-keterangan">${escapeHtml(row.keterangan)}</div>
          <div class="tx-card-amount">${formatRupiah(row.saldo)}</div>
        `;
      } else {
        const isMasuk = row.masuk != null;
        const amountClass = isMasuk ? "text-in" : "text-out";
        const sign = isMasuk ? "+" : "−";
        const amount = isMasuk ? row.masuk : row.keluar;
        card.className = "tx-card";
        card.innerHTML = `
          <div class="tx-card-top">
            <span class="tx-card-date">${formatTanggal(row.tanggal)}</span>
          </div>
          <div class="tx-card-keterangan">${escapeHtml(row.keterangan)}</div>
          <div class="tx-card-bottom">
            <span class="tx-card-amount ${amountClass}">${sign} ${formatRupiah(amount)}</span>
            <span class="tx-card-saldo">${T("th_saldo")}: ${formatRupiah(row.saldo)}</span>
          </div>
        `;
      }
      cardList.appendChild(card);
    });
  }

  // ---------------------------------------------------------
  // Reset
  // ---------------------------------------------------------
  function resetWizard() {
    document.getElementById("judulLaporan").value = "";
    document.getElementById("tanggalLaporan").value = todayIso();
    document.getElementById("saldoAwal").value = "";
    document.getElementById("txTanggal").value = "";
    document.getElementById("txKeterangan").value = "";
    document.getElementById("txJumlah").value = "";
    resetJenisDropdown();

    transaksi.length = 0;
    renderTransaksiTable();
    goToStep(1);
  }

  function confirmReset() {
    if (window.Swal) {
      Swal.fire({
        icon: "warning",
        title: T("reset_confirm_title"),
        text: T("reset_confirm_text"),
        showCancelButton: true,
        confirmButtonText: T("reset_confirm_btn"),
        cancelButtonText: T("reset_cancel_btn"),
        confirmButtonColor: "#d84545",
        cancelButtonColor: "#1C1B3B",
      }).then((result) => {
        if (result.isConfirmed) resetWizard();
      });
    } else if (confirm(T("reset_confirm_title"))) {
      resetWizard();
    }
  }

  // ---------------------------------------------------------
  // PDF generation
  // ---------------------------------------------------------
  function generatePdf() {
    if (!window.jspdf) {
      toast("error", T("toast_pdf_error"));
      return;
    }

    const judul = document.getElementById("judulLaporan").value.trim() || T("pdf_default_title");
    const tanggalLaporan = formatTanggal(document.getElementById("tanggalLaporan").value);
    const { rows, totalMasuk, totalKeluar, saldoAkhir } = buildLedger();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const navy = [28, 27, 59];
    const orange = [232, 130, 60];
    const green = [46, 139, 87];
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const rightEdge = pageWidth - marginX;
    let y = 0;

    // Column layout: fixed widths for every column except
    // "Keterangan", which takes whatever space is left. Both the
    // left and right edges get a small inner padding (cellPad) so
    // text never sits flush against the table border / page edge.
    const cellPad = 14;
    const innerLeft = marginX + cellPad;
    const innerRight = rightEdge - cellPad;
    const usableWidth = innerRight - innerLeft;

    const tanggalW = 130; // enough for "21 Agustus 2026" in bold without touching Keterangan
    const masukW = 85;
    const keluarW = 85;
    const saldoW = 100;
    const keteranganW = usableWidth - tanggalW - masukW - keluarW - saldoW;

    const col = {
      tanggal: innerLeft,
      keterangan: innerLeft + tanggalW,
    };
    col.masuk = col.keterangan + keteranganW + masukW; // right edge of Uang Masuk column
    col.keluar = col.masuk + keluarW;                  // right edge of Uang Keluar column
    col.saldo = col.keluar + saldoW;                   // == innerRight, by construction

    const maxKetWidth = keteranganW - 10;

    // Header band
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, pageWidth, 96, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(judul, marginX, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(T("pdf_tanggal_laporan_prefix") + tanggalLaporan, marginX, 70);
    doc.setFontSize(10);

    y = 130;

    function drawTableHeader() {
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(marginX, y, pageWidth - marginX * 2, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(T("th_tanggal"), col.tanggal, y + 17);
      doc.text(T("th_keterangan"), col.keterangan, y + 17);
      doc.text(T("th_uang_masuk"), col.masuk, y + 17, { align: "right" });
      doc.text(T("th_uang_keluar"), col.keluar, y + 17, { align: "right" });
      doc.text(T("th_saldo"), col.saldo, y + 17, { align: "right" });
      y += 26;
    }

    drawTableHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Ledger rows — plain white rows, no striping, saldo awal is
    // simply the first row of the same table (no date attached).
    rows.forEach((row) => {
      if (y + 26 > pageHeight - 130) {
        doc.addPage();
        y = 48;
        drawTableHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }

      // row separator line (keeps rows readable without a fill color)
      doc.setDrawColor(236, 231, 221);
      doc.line(marginX, y + 22, pageWidth - marginX, y + 22);

      doc.setFont("helvetica", row.isSaldoAwal ? "bold" : "normal");
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(row.isSaldoAwal ? "-" : formatTanggal(row.tanggal), col.tanggal, y + 16);

      let ket = row.keterangan;
      while (doc.getTextWidth(ket) > maxKetWidth && ket.length > 3) {
        ket = ket.slice(0, -1);
      }
      if (ket !== row.keterangan) ket = ket.slice(0, -1) + "…";
      doc.text(ket, col.keterangan, y + 16);

      doc.setTextColor(green[0], green[1], green[2]);
      doc.text(row.masuk != null ? formatRupiah(row.masuk) : "-", col.masuk, y + 16, { align: "right" });

      doc.setTextColor(orange[0], orange[1], orange[2]);
      doc.text(row.keluar != null ? formatRupiah(row.keluar) : "-", col.keluar, y + 16, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(formatRupiah(row.saldo), col.saldo, y + 16, { align: "right" });

      y += 24;
    });

    y += 20;
    if (y + 90 > pageHeight - 40) {
      doc.addPage();
      y = 48;
    }

    // Totals block
    doc.setDrawColor(217, 210, 196);
    doc.line(marginX, y, rightEdge, y);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text(T("label_total_masuk"), marginX, y);
    doc.text(formatRupiah(totalMasuk), rightEdge, y, { align: "right" });
    y += 20;

    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(T("label_total_keluar"), marginX, y);
    doc.text(formatRupiah(totalKeluar), rightEdge, y, { align: "right" });
    y += 26;

    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.line(marginX, y - 12, rightEdge, y - 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(T("label_saldo_akhir"), marginX, y + 6);
    doc.text(formatRupiah(saldoAkhir), rightEdge, y + 6, { align: "right" });

    const safeName = judul.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "laporan-keuangan";
    doc.save(safeName + ".pdf");

    // After a successful report, send the user back to the Finzy
    // landing page (not back to step 1 of the wizard).
    if (window.Swal) {
      Swal.fire({
        icon: "success",
        title: T("success_title"),
        confirmButtonColor: "#1C1B3B",
      }).then(() => {
        window.location.href = "/";
      });
    } else {
      alert(T("success_title"));
      window.location.href = "/";
    }
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => goToStep(Number(btn.dataset.goto)));
    });

    // Step-indicator numbers jump straight to that section
    document.querySelectorAll(".step-dot").forEach((dot) => {
      dot.addEventListener("click", () => goToStep(Number(dot.dataset.dot)));
    });

    document.getElementById("resetBtn").addEventListener("click", confirmReset);

    attachCurrencyFormatting("saldoAwal");
    attachCurrencyFormatting("txJumlah");
    initJenisDropdown();

    // Report date defaults to today but stays fully editable
    document.getElementById("tanggalLaporan").value = todayIso();

    document.getElementById("addTransaksiBtn").addEventListener("click", addTransaksi);
    document.getElementById("generatePdfBtn").addEventListener("click", generatePdf);

    renderTransaksiTable();
  });
})();