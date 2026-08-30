/* =========================================================
   Finzy — Shared translation dictionary (Indonesian / English)
   Works on any page: mark elements with
     data-translate="key"          -> sets textContent
     data-translate-html="key"     -> sets innerHTML (allows <br>)
     data-translate-placeholder="key" -> sets placeholder
   Dynamic JS strings (toasts, PDF labels, badges) can call
   window.FinzyTranslate.t('key') directly.
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "finzy_language";

  const dict = {
    // ---------- Landing page ----------
    hero_title: {
      id: "Laporan keuangan,<br>jadi segampang ini!",
      en: "Financial reports,<br>made simple!",
    },
    hero_subtitle: {
      id: "Catat uang masuk-keluar kamu,<br>sisanya biar Finzy yang hitungin.",
      en: "Log your cash in and out,<br>Finzy handles the rest.",
    },
    btn_get_started: { id: "Yuk, Mulai", en: "Let's Get Started" },

    // ---------- Wizard shell ----------
    step1_label: { id: "Info Laporan", en: "Report Info" },
    step2_label: { id: "Transaksi", en: "Transactions" },
    step3_label: { id: "Ringkasan", en: "Summary" },
    reset_btn: { id: "Reset", en: "Reset" },

    // ---------- Step 1 ----------
    step1_title: { id: "Buat laporan baru", en: "Create a new report" },
    step1_subtitle: {
      id: "Isi dulu data dasar laporan keuangan kamu.",
      en: "First, fill in your report's basic details.",
    },
    label_judul: { id: "Judul Laporan", en: "Report Title" },
    placeholder_judul: {
      id: "Contoh: Laporan Kas Bulan Januari",
      en: "e.g. January Cash Report",
    },
    label_tanggal_laporan: { id: "Tanggal Laporan", en: "Report Date" },
    label_saldo_awal: { id: "Saldo Awal", en: "Opening Balance" },
    btn_next: { id: "Lanjut", en: "Next" },

    // ---------- Step 2 ----------
    step2_title: { id: "Catat transaksi", en: "Record transactions" },
    step2_subtitle: {
      id: "Tambahkan setiap uang masuk dan uang keluar.",
      en: "Add every cash in and cash out.",
    },
    label_tanggal: { id: "Tanggal", en: "Date" },
    label_untuk_apa: { id: "Untuk Apa", en: "For What" },
    placeholder_untuk_apa: { id: "Contoh: Bayar listrik", en: "e.g. Pay electricity bill" },
    label_jenis: { id: "Jenis", en: "Type" },
    option_masuk: { id: "Uang Masuk", en: "Cash In" },
    option_keluar: { id: "Uang Keluar", en: "Cash Out" },
    label_jumlah: { id: "Jumlah", en: "Amount" },
    btn_tambah_transaksi: { id: "Tambah Transaksi", en: "Add Transaction" },
    th_tanggal: { id: "Tanggal", en: "Date" },
    th_keterangan: { id: "Keterangan", en: "Description" },
    th_jenis: { id: "Jenis", en: "Type" },
    th_jumlah: { id: "Jumlah", en: "Amount" },
    th_uang_masuk: { id: "Uang Masuk", en: "Cash In" },
    th_uang_keluar: { id: "Uang Keluar", en: "Cash Out" },
    th_saldo: { id: "Saldo", en: "Balance" },
    empty_transaksi: {
      id: "Belum ada transaksi. Tambahkan transaksi pertama kamu di atas.",
      en: "No transactions yet. Add your first one above.",
    },
    btn_back: { id: "Kembali", en: "Back" },

    // ---------- Step 3 ----------
    step3_title: { id: "Ringkasan laporan", en: "Report summary" },
    step3_subtitle: {
      id: "Cek lagi datanya sebelum laporan dibuat.",
      en: "Double-check everything before generating the report.",
    },
    label_total_masuk: { id: "Total Uang Masuk", en: "Total Cash In" },
    label_total_keluar: { id: "Total Uang Keluar", en: "Total Cash Out" },
    label_saldo_akhir: { id: "Saldo Akhir", en: "Closing Balance" },
    btn_buat_laporan: { id: "Buat Laporan", en: "Generate Report" },
    row_saldo_awal: { id: "Saldo Awal", en: "Opening Balance" },

    // ---------- Alerts / toasts ----------
    reset_confirm_title: { id: "Reset semua data?", en: "Reset all data?" },
    reset_confirm_text: {
      id: "Judul, tanggal, saldo, dan semua transaksi yang sudah diisi akan hilang.",
      en: "Title, date, balance, and all recorded transactions will be cleared.",
    },
    reset_confirm_btn: { id: "Ya, reset", en: "Yes, reset" },
    reset_cancel_btn: { id: "Batal", en: "Cancel" },
    success_title: { id: "Laporan berhasil dibuat!", en: "Report generated successfully!" },
    toast_judul_kosong: { id: "Judul laporan belum diisi", en: "Report title is required" },
    toast_tanggal_kosong: { id: "Tanggal laporan belum diisi", en: "Report date is required" },
    toast_saldo_invalid: {
      id: "Saldo awal belum diisi dengan benar",
      en: "Opening balance isn't filled in correctly",
    },
    toast_transaksi_invalid: {
      id: "Lengkapi dulu tanggal, keterangan, dan jumlahnya",
      en: "Please fill in the date, description, and amount first",
    },
    toast_pdf_error: {
      id: "Gagal memuat modul PDF. Cek koneksi internet kamu.",
      en: "Failed to load the PDF module. Check your internet connection.",
    },

    // ---------- PDF ----------
    pdf_tanggal_laporan_prefix: { id: "Tanggal Laporan: ", en: "Report Date: " },
    pdf_default_title: { id: "Laporan Keuangan", en: "Financial Report" },
  };

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id";
  }

  function t(key) {
    const entry = dict[key];
    if (!entry) return key;
    return entry[getLang()] || entry.id;
  }

  function dateLocale() {
    return getLang() === "en" ? "en-GB" : "id-ID";
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-translate]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-translate"));
    });
    document.querySelectorAll("[data-translate-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-translate-html"));
    });
    document.querySelectorAll("[data-translate-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-translate-placeholder")));
    });

    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });

    // Let listening pages (report.js) know the language changed,
    // e.g. to re-render dynamically-built table rows.
    document.dispatchEvent(new CustomEvent("finzy:langchange", { detail: { lang } }));
  }

  function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang === "en" ? "en" : "id");
    applyLanguage(getLang());
  }

  function initLanguageSwitcher() {
    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => setLanguage(btn.getAttribute("data-lang")));
    });
    applyLanguage(getLang());
  }

  document.addEventListener("DOMContentLoaded", initLanguageSwitcher);

  window.FinzyTranslate = { t, getLang, setLanguage, dateLocale };
})();