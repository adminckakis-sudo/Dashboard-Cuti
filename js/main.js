// ==========================================================================
// DASHBOARD REKAPITULASI UPT CREW KA KELAS C KISARAN
// Modul Logika Data & Interaktivitas Antarmuka
// ==========================================================================

// 1. JAM & TANGGAL REAL-TIME
function updateWaktu() {
    const sekarang = new Date();
    const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const namaBulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const hari = namaHari[sekarang.getDay()];
    const tanggal = sekarang.getDate();
    const bulan = namaBulan[sekarang.getMonth()];
    const tahun = sekarang.getFullYear();

    const jam = String(sekarang.getHours()).padStart(2, '0');
    const menit = String(sekarang.getMinutes()).padStart(2, '0');
    const detik = String(sekarang.getSeconds()).padStart(2, '0');

    const elHari = document.getElementById('hari-ini');
    const elTanggal = document.getElementById('tanggal-ini');
    const elJam = document.getElementById('jam-ini');

    if (elHari) elHari.textContent = `${hari}, `;
    if (elTanggal) elTanggal.textContent = `${tanggal} ${bulan} ${tahun}`;
    if (elJam) elJam.textContent = `${jam}:${menit}:${detik} WIB`;
}

updateWaktu();
setInterval(updateWaktu, 1000);


// 2. INTEGRASI DATA SPREADSHEET (HARIAN)
const SPREADSHEET_ID = '1YtPTLxgEEJCjfzk-7zo4wIbkfPfj0w4z';

const GID_BULAN = {
    0: "1242932146",
    1: "1807944811",
    2: "1971502885",
    3: "1073914471",
    4: "1624305738",
    5: "1818192292",
    6: "1781048451",
    7: "226813322",
    8: "354712743",
    9: "641851831",
    10: "1976865235",
    11: "492242964"
};

let cacheDataPegawai = [];

async function muatDataDashboard() {
    try {
        const bulanIndex = new Date().getMonth();
        const targetGid = GID_BULAN[bulanIndex] || "641851831";
        const tanggalHariIni = new Date().getDate();
        const namaBulanStr = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ][bulanIndex];

        // Set default dropdown bulan ke bulan sekarang
        const selectBulan = document.getElementById('select-pilih-bulan');
        if (selectBulan) {
            selectBulan.value = bulanIndex;
        }

        const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${targetGid}`;

        const response = await fetch(SHEET_CSV_URL);
        const dataText = await response.text();
        const barisData = dataText.split('\n');

        let totalAsp = 0;
        let madya = 0;
        let muda = 0;
        let pertama = 0;

        let listCutiHariIni = [];
        let listSakitHariIni = [];
        let listItmbHariIni = [];
        let listTmsHarian = [];
        let listMangkirHarian = [];

        cacheDataPegawai = [];
        let processedNipps = new Set();

        barisData.forEach(baris => {
            const kolom = baris.split(',').map(k => k.trim());

            if (kolom.length >= 4) {
                const nama = kolom[1] || '';
                const potensiNipp = kolom[2];
                const jabatan = kolom[3] ? kolom[3].toUpperCase() : '';
                const keteranganAsli = kolom[kolom.length - 1] && kolom[kolom.length - 1] !== '-' ? kolom[kolom.length - 1] : '';

                if (potensiNipp && !isNaN(potensiNipp) && potensiNipp.length >= 4 && !processedNipps.has(potensiNipp)) {
                    processedNipps.add(potensiNipp);

                    // Pengelompokan Tingkat Jabatan ASP
                    if (jabatan.includes('MADYA')) {
                        madya++;
                        totalAsp++;
                    } else if (jabatan.includes('MUDA')) {
                        muda++;
                        totalAsp++;
                    } else if (jabatan.includes('PERTAMA')) {
                        pertama++;
                        totalAsp++;
                    }

                    const dataPegawaiObj = {
                        nama,
                        nipp: potensiNipp,
                        jabatan,
                        keterangan: keteranganAsli,
                        rowData: kolom
                    };
                    cacheDataPegawai.push(dataPegawaiObj);

                    // Verifikasi Presensi Tanggal Hari Ini
                    const indeksKolomHariIni = 3 + tanggalHariIni;
                    if (kolom[indeksKolomHariIni]) {
                        const statusHariIni = kolom[indeksKolomHariIni].toUpperCase();

                        if (statusHariIni === 'CT') listCutiHariIni.push(dataPegawaiObj);
                        if (statusHariIni === 'CSK') listSakitHariIni.push(dataPegawaiObj);
                        if (statusHariIni === 'ITMB' || statusHariIni === 'SPKA' || statusHariIni === 'CP') listItmbHariIni.push(dataPegawaiObj);
                        if (statusHariIni === 'TMS') listTmsHarian.push(dataPegawaiObj);
                        if (statusHariIni === 'M') listMangkirHarian.push(dataPegawaiObj);
                    }
                }
            }
        });

        // Hitung Pegawai Hadir Hari Ini (tidak memiliki status berhalangan)
        let listHadir = [];
        cacheDataPegawai.forEach(pegawai => {
            const isBerhalangan = [
                ...listCutiHariIni,
                ...listSakitHariIni,
                ...listItmbHariIni,
                ...listTmsHarian,
                ...listMangkirHarian
            ].some(p => p.nipp === pegawai.nipp);

            if (!isBerhalangan) {
                listHadir.push(pegawai);
            }
        });

        // Injeksi Nilai ke Elemen Dashboard
        document.getElementById('val-asp').textContent = totalAsp;
        document.getElementById('val-madya').textContent = madya;
        document.getElementById('val-muda').textContent = muda;
        document.getElementById('val-pertama').textContent = pertama;

        document.getElementById('val-cuti').textContent = listCutiHariIni.length;
        document.getElementById('val-sakit').textContent = listSakitHariIni.length;
        document.getElementById('val-itmb').textContent = listItmbHariIni.length;
        document.getElementById('val-tms').textContent = listTmsHarian.length;
        document.getElementById('val-mangkir').textContent = listMangkirHarian.length;
        document.getElementById('val-hadir').textContent = listHadir.length;

        // Hubungkan Trigger Pop-up Modal untuk Seluruh Kartu
        setupModalTrigger('tabel-crew', 'Seluruh Personel ASP UPT Kisaran', cacheDataPegawai);
        setupModalTrigger('tabel-hadir', 'Daftar Pegawai Hadir Hari Ini', listHadir);
        setupModalTrigger('tabel-cuti', 'Daftar Pegawai Cuti Tahunan (CT) Hari Ini', listCutiHariIni);
        setupModalTrigger('tabel-sakit', 'Daftar Pegawai Sakit (CSK) Hari Ini', listSakitHariIni);
        setupModalTrigger('tabel-itmb', 'Daftar Pegawai Cuti Penting (ITMB/CP) Hari Ini', listItmbHariIni);
        setupModalTrigger('tabel-tms', 'Daftar Pegawai Tidak Memenuhi Syarat (TMS) Hari Ini', listTmsHarian);
        setupModalTrigger('tabel-mangkir', 'Daftar Pegawai Mangkir Hari Ini', listMangkirHarian);

        console.log(`Data operasional bulan ${namaBulanStr} berhasil sinkron.`);

    } catch (error) {
        console.error("Gagal sinkronisasi data dengan Google Spreadsheet:", error);
    }
}


// 3. REKAPITULASI LAPORAN PER BULAN
let cacheRekapBulanan = [];

document.getElementById('btn-tampilkan-bulan').addEventListener('click', async function() {
    const bulanDipilih = document.getElementById('select-pilih-bulan').value;
    const targetGid = GID_BULAN[bulanDipilih];
    const namaBulanStr = document.getElementById('select-pilih-bulan').selectedOptions[0].text;

    const containerHasil = document.getElementById('hasil-rekap-bulanan');
    const tbodyRekap = document.getElementById('tabel-rekap-bulanan-body');
    const labelCount = document.getElementById('label-jumlah-rekap');

    containerHasil.style.display = 'block';
    tbodyRekap.innerHTML = `<tr><td colspan="10" class="cell-center" style="padding: 24px; color: var(--text-muted);">Menghubungkan dan memuat rekapitulasi ${namaBulanStr}...</td></tr>`;

    try {
        const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${targetGid}`;
        const response = await fetch(SHEET_CSV_URL);
        const dataText = await response.text();
        const barisData = dataText.split('\n');

        cacheRekapBulanan = [];
        let processedNipps = new Set();

        let sumCuti = 0;
        let sumSakit = 0;
        let sumTms = 0;
        let sumMangkir = 0;
        let totalHariMasukSemua = 0;

        barisData.forEach(baris => {
            const kolom = baris.split(',').map(k => k.trim());
            if (kolom.length >= 4) {
                const nama = kolom[1] || '';
                const potensiNipp = kolom[2];
                const jabatan = kolom[3] ? kolom[3].toUpperCase() : '';

                if (potensiNipp && !isNaN(potensiNipp) && potensiNipp.length >= 4 && !processedNipps.has(potensiNipp)) {
                    processedNipps.add(potensiNipp);

                    let cutiPegawai = 0;
                    let sakitPegawai = 0;
                    let pentingPegawai = 0;
                    let tmsPegawai = 0;
                    let mangkirPegawai = 0;
                    let hadirPegawai = 0;

                    // Akumulasi tanggal 1 hingga 31
                    for (let i = 4; i <= 34; i++) {
                        if (kolom[i]) {
                            const val = kolom[i].toUpperCase();
                            if (val === 'CT') cutiPegawai++;
                            else if (val === 'CSK') sakitPegawai++;
                            else if (val === 'ITMB' || val === 'SPKA' || val === 'CP') pentingPegawai++;
                            else if (val === 'TMS') tmsPegawai++;
                            else if (val === 'M') mangkirPegawai++;
                            else if (val === 'H' || val === 'V' || val === 'OK') hadirPegawai++;
                        }
                    }

                    if (hadirPegawai === 0) {
                        hadirPegawai = Math.max(0, 30 - (cutiPegawai + sakitPegawai + pentingPegawai + tmsPegawai + mangkirPegawai));
                    }

                    sumCuti += cutiPegawai;
                    sumSakit += sakitPegawai;
                    sumTms += tmsPegawai;
                    sumMangkir += mangkirPegawai;
                    totalHariMasukSemua += hadirPegawai;

                    cacheRekapBulanan.push({
                        nama,
                        nipp: potensiNipp,
                        jabatan,
                        hadir: hadirPegawai,
                        cuti: cutiPegawai,
                        sakit: sakitPegawai,
                        penting: pentingPegawai,
                        tms: tmsPegawai,
                        mangkir: mangkirPegawai
                    });
                }
            }
        });

        // Update Kartu Ringkasan Bulanan
        const totalPegawai = cacheRekapBulanan.length;
        document.getElementById('sum-total-pegawai').textContent = totalPegawai;
        document.getElementById('sum-total-cuti').textContent = sumCuti;
        document.getElementById('sum-total-sakit').textContent = sumSakit;

        const elSumTms = document.getElementById('sum-total-tms');
        if (elSumTms) elSumTms.textContent = sumTms;

        const elSumMangkir = document.getElementById('sum-total-mangkir');
        if (elSumMangkir) elSumMangkir.textContent = sumMangkir;

        const rataRataHadir = totalPegawai > 0 ? ((totalHariMasukSemua / (totalPegawai * 25)) * 100).toFixed(1) : 0;
        document.getElementById('sum-rata-hadir').textContent = `${rataRataHadir > 100 ? 100 : rataRataHadir}%`;

        if (labelCount) {
            labelCount.textContent = `Menampilkan ${totalPegawai} personel periode ${namaBulanStr}`;
        }

        renderTabelRekapBulanan(cacheRekapBulanan);

    } catch (error) {
        console.error("Gagal memuat rekap bulanan:", error);
        tbodyRekap.innerHTML = `<tr><td colspan="10" class="cell-center" style="padding: 24px; color: var(--status-mangkir);">Gagal memuat berkas rekapitulasi bulan ${namaBulanStr}. Silakan periksa jaringan Anda.</td></tr>`;
    }
});

function renderTabelRekapBulanan(dataList) {
    const tbodyRekap = document.getElementById('tabel-rekap-bulanan-body');
    tbodyRekap.innerHTML = '';

    if (dataList.length === 0) {
        tbodyRekap.innerHTML = `<tr><td colspan="10" class="cell-center" style="padding: 24px; color: var(--text-muted);">Tidak ada personel yang cocok dengan pencarian.</td></tr>`;
        return;
    }

    dataList.forEach((pegawai, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="cell-center">${index + 1}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${pegawai.nama}</td>
            <td class="cell-center" style="font-variant-numeric: tabular-nums;">${pegawai.nipp}</td>
            <td>${pegawai.jabatan}</td>
            <td class="cell-center val-nonzero-hadir">${pegawai.hadir}</td>
            <td class="cell-center">${pegawai.cuti}</td>
            <td class="cell-center">${pegawai.sakit}</td>
            <td class="cell-center">${pegawai.penting}</td>
            <td class="cell-center ${pegawai.tms > 0 ? 'val-nonzero-tms' : ''}">${pegawai.tms}</td>
            <td class="cell-center ${pegawai.mangkir > 0 ? 'val-nonzero-mangkir' : ''}">${pegawai.mangkir}</td>
        `;
        tbodyRekap.appendChild(row);
    });
}

// Saring Pencarian pada Tabel Bulanan
document.getElementById('input-cari-bulan').addEventListener('input', function(e) {
    const keyword = e.target.value.toLowerCase().trim();
    const filtered = cacheRekapBulanan.filter(p =>
        p.nama.toLowerCase().includes(keyword) || p.nipp.toLowerCase().includes(keyword)
    );
    renderTabelRekapBulanan(filtered);

    const labelCount = document.getElementById('label-jumlah-rekap');
    if (labelCount) {
        labelCount.textContent = `Menampilkan ${filtered.length} dari ${cacheRekapBulanan.length} personel`;
    }
});

// Ekspor ke CSV / Spreadsheet
document.getElementById('btn-ekspor-excel').addEventListener('click', function() {
    if (cacheRekapBulanan.length === 0) {
        alert("Belum ada data rekapitulasi yang dimuat untuk diunduh. Silakan klik 'Tampilkan Data' terlebih dahulu.");
        return;
    }

    const selectBulan = document.getElementById('select-pilih-bulan');
    const namaBulanStr = selectBulan.selectedOptions[0].text;

    let csvContent = "data:text/csv;charset=utf-8,No,Nama Pegawai,NIPP,Jabatan,Hadir,Cuti (CT),Sakit (CSK),Cuti Penting,TMS,Mangkir\r\n";

    cacheRekapBulanan.forEach((p, index) => {
        let row = [
            index + 1,
            `"${p.nama}"`,
            `"${p.nipp}"`,
            `"${p.jabatan}"`,
            p.hadir,
            p.cuti,
            p.sakit,
            p.penting,
            p.tms,
            p.mangkir
        ];
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekapitulasi_Presensi_UPT_Kisaran_${namaBulanStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});


// 4. INTERAKSI MODAL POP-UP DETAIL
let currentModalData = [];

function renderModalRows(dataList) {
    const modalTableBody = document.getElementById('modal-table-body');
    const modalCountInfo = document.getElementById('modal-count-info');
    modalTableBody.innerHTML = '';

    if (dataList.length === 0) {
        modalTableBody.innerHTML = `<tr><td colspan="5" class="cell-center" style="padding: 24px; color: var(--text-muted);">Tidak ada personel yang sesuai dalam kategori ini.</td></tr>`;
        if (modalCountInfo) modalCountInfo.textContent = '0 personel ditemukan';
        return;
    }

    dataList.forEach((pegawai, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="cell-center">${index + 1}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${pegawai.nama}</td>
            <td class="cell-center" style="font-variant-numeric: tabular-nums;">${pegawai.nipp}</td>
            <td>${pegawai.jabatan}</td>
            <td>${pegawai.keterangan || '-'}</td>
        `;
        modalTableBody.appendChild(tr);
    });

    if (modalCountInfo) {
        modalCountInfo.textContent = `Menampilkan ${dataList.length} personel`;
    }
}

function setupModalTrigger(selectorId, judulModal, dataList) {
    const card = document.querySelector(`a[href="#${selectorId}"]`);
    const modal = document.getElementById('modal-detail');
    const modalTitle = document.getElementById('modal-title');
    const searchInput = document.getElementById('modal-search-input');

    if (card) {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            currentModalData = dataList || [];
            modalTitle.textContent = judulModal;

            if (searchInput) {
                searchInput.value = '';
            }

            // ==========================================
            // RESET KEPALA TABEL KE FORMAT PEGAWAI STANDAR
            // ==========================================
            const modalTableHead = document.querySelector('.modal-data-table thead');
            if (modalTableHead) {
                modalTableHead.innerHTML = `
                    <tr>
                        <th scope="col" class="cell-center">No</th>
                        <th scope="col">Nama</th>
                        <th scope="col" class="cell-center">NIPP</th>
                        <th scope="col">Jabatan</th>
                        <th scope="col">Keterangan</th>
                    </tr>
                `;
            }

            // Pastikan kotak pencarian internal modal kembali muncul
            const modalSearchWrapper = document.querySelector('.modal-search-wrapper');
            if (modalSearchWrapper) {
                modalSearchWrapper.style.display = 'block';
            }

            renderModalRows(currentModalData);
            modal.style.display = 'flex';

            // Berikan fokus pada kolom pencarian saat modal terbuka
            setTimeout(() => {
                if (searchInput) searchInput.focus();
            }, 100);
        });
    }
}

// Handler Penutup Modal & Aksesibilitas Keyboard (Escape)
function closeModal() {
    const modal = document.getElementById('modal-detail');
    if (modal) modal.style.display = 'none';
}

const closeBtn = document.getElementById('modal-close');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

const closeActionBtn = document.getElementById('modal-close-action');
if (closeActionBtn) closeActionBtn.addEventListener('click', closeModal);

window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal-detail');
    if (event.target === modal) {
        closeModal();
    }
});

window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Saring data secara langsung di dalam Modal
const modalSearchInput = document.getElementById('modal-search-input');
if (modalSearchInput) {
    modalSearchInput.addEventListener('input', function(e) {
        const q = e.target.value.toLowerCase().trim();
        const filtered = currentModalData.filter(p =>
            p.nama.toLowerCase().includes(q) ||
            p.nipp.toLowerCase().includes(q) ||
            p.jabatan.toLowerCase().includes(q)
        );
        renderModalRows(filtered);
    });
}

// ==========================================================================
// 5. FITUR PENCARIAN GLOBAL & REKAM JEJAK 1 TAHUN PENUH
// ==========================================================================

async function ambilDataSeluruhTahun(targetNipp) {
    let rekamJejakTahun = {
        nama: '',
        nipp: targetNipp,
        jabatan: '',
        bulanData: []
    };

    const namaBulanList = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    for (let bulanIdx = 0; bulanIdx < 12; bulanIdx++) {
        const gid = GID_BULAN[bulanIdx];
        if (!gid) continue;

        try {
            const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
            const res = await fetch(url);
            const text = await res.text();
            const rows = text.split('\n');

            for (let baris of rows) {
                const kolom = baris.split(',').map(k => k.trim());
                if (kolom.length >= 4) {
                    const nipp = kolom[2];
                    if (nipp === targetNipp) {
                        if (!rekamJejakTahun.nama) {
                            rekamJejakTahun.nama = kolom[1] || '';
                            rekamJejakTahun.jabatan = kolom[3] ? kolom[3].toUpperCase() : '';
                        }

                        let cuti = 0, sakit = 0, penting = 0, tms = 0, mangkir = 0;

                        for (let i = 4; i <= 34; i++) {
                            if (kolom[i]) {
                                const val = kolom[i].toUpperCase();
                                if (val === 'CT') cuti++;
                                else if (val === 'CSK') sakit++;
                                else if (val === 'ITMB' || val === 'SPKA' || val === 'CP') penting++;
                                else if (val === 'TMS') tms++;
                                else if (val === 'M') mangkir++;
                            }
                        }

                        rekamJejakTahun.bulanData.push({
                            bulan: namaBulanList[bulanIdx],
                            cuti, sakit, penting, tms, mangkir
                        });
                        break;
                    }
                }
            }
        } catch (err) {
            console.error(`Gagal memuat data bulan ${namaBulanList[bulanIdx]}:`, err);
        }
    }

    return rekamJejakTahun;
}

// Handler Input Pencarian Global di Navigasi
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');

if (globalSearchInput && globalSearchResults) {
    globalSearchInput.addEventListener('input', function(e) {
        const keyword = e.target.value.toLowerCase().trim();
        
        if (keyword.length < 2) {
            globalSearchResults.style.display = 'none';
            globalSearchResults.innerHTML = '';
            return;
        }

        const matches = cacheDataPegawai.filter(p => 
            p.nama.toLowerCase().includes(keyword) || p.nipp.toLowerCase().includes(keyword)
        );

        if (matches.length === 0) {
            globalSearchResults.style.display = 'block';
            globalSearchResults.innerHTML = `<div class="search-dropdown-item"><span class="item-meta">Pegawai tidak ditemukan</span></div>`;
            return;
        }

        globalSearchResults.style.display = 'block';
        globalSearchResults.innerHTML = matches.map(p => `
            <div class="search-dropdown-item" data-nipp="${p.nipp}">
                <span class="item-name">${p.nama}</span>
                <span class="item-meta">NIPP: ${p.nipp} | ${p.jabatan || 'ASP'}</span>
            </div>
        `).join('');
    });

    globalSearchResults.addEventListener('click', async function(e) {
        const item = e.target.closest('.search-dropdown-item');
        if (!item) return;

        const nipp = item.getAttribute('data-nipp');
        if (!nipp) return;

        globalSearchInput.value = '';
        globalSearchResults.style.display = 'none';

        const modal = document.getElementById('modal-detail');
        const modalTitle = document.getElementById('modal-title');
        const modalTableBody = document.getElementById('modal-table-body');
        const modalCountInfo = document.getElementById('modal-count-info');
        const modalSearchWrapper = document.querySelector('.modal-search-wrapper');

        modalTitle.textContent = `Rekam Jejak Kehadiran 1 Tahun`;
        if (modalSearchWrapper) modalSearchWrapper.style.display = 'none'; 
        modalTableBody.innerHTML = `<tr><td colspan="6" class="cell-center" style="padding: 24px; color: var(--text-muted);">Memuat rekam jejak 1 tahun penuh...</td></tr>`;
        modal.style.display = 'flex';

        const dataTahun = await ambilDataSeluruhTahun(nipp);

        modalTitle.textContent = `Rekam Jejak: ${dataTahun.nama} (${dataTahun.nipp})`;
        
        if (dataTahun.bulanData.length === 0) {
            modalTableBody.innerHTML = `<tr><td colspan="6" class="cell-center" style="padding: 24px; color: var(--text-muted);">Tidak ada data catatan ditemukan untuk NIPP ini.</td></tr>`;
            if (modalCountInfo) modalCountInfo.textContent = '0 bulan tercatat';
            return;
        }

        // Render struktur header modal dengan kolom TMS dan Mangkir terpisah (tanpa kolom Hadir)
        const modalTableHead = document.querySelector('.modal-data-table thead');
        modalTableHead.innerHTML = `
            <tr>
                <th scope="col" class="cell-center">Bulan</th>
                <th scope="col" class="cell-center">Cuti (CT)</th>
                <th scope="col" class="cell-center">Sakit (CSK)</th>
                <th scope="col" class="cell-center">Cuti Penting</th>
                <th scope="col" class="cell-center col-tms">TMS</th>
                <th scope="col" class="cell-center col-mangkir">Mangkir</th>
            </tr>
        `;

        modalTableBody.innerHTML = dataTahun.bulanData.map(b => `
            <tr>
                <td style="font-weight: 600; color: var(--text-primary);">${b.bulan}</td>
                <td class="cell-center">${b.cuti}</td>
                <td class="cell-center">${b.sakit}</td>
                <td class="cell-center">${b.penting}</td>
                <td class="cell-center ${b.tms > 0 ? 'val-nonzero-tms' : ''}">${b.tms}</td>
                <td class="cell-center ${b.mangkir > 0 ? 'val-nonzero-mangkir' : ''}">${b.mangkir}</td>
            </tr>
        `).join('');

        if (modalCountInfo) {
            modalCountInfo.textContent = `Menampilkan akumulasi catatan ${dataTahun.bulanData.length} bulan`;
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.global-search-container')) {
            globalSearchResults.style.display = 'none';
        }
    });
}
// Inisialisasi saat DOM siap
window.addEventListener('DOMContentLoaded', muatDataDashboard);
