// ==========================================
// 1. JAM & TANGGAL REAL-TIME
// ==========================================
function updateWaktu() {
    const sekarang = new Date();
    const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
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

    if (elHari) elHari.textContent = hari + ', ';
    if (elTanggal) elTanggal.textContent = `${tanggal} ${bulan} ${tahun}`;
    if (elJam) elJam.textContent = `${jam}:${menit}:${detik} WIB`;
}

updateWaktu();
setInterval(updateWaktu, 1000);


// ==========================================
// 2. FETCH & PARSER DATA SPREADSHEET (HARIAN)
// ==========================================
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
        const namaBulanStr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][bulanIndex];

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

                    // Hitung Jabatan ASP
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

                    const dataPegawaiObj = { nama, nipp: potensiNipp, jabatan, keterangan: keteranganAsli, rowData: kolom };
                    cacheDataPegawai.push(dataPegawaiObj);

                    // Cek Presensi Harian (Hari Ini) secara terpisah antara TMS dan Mangkir
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

        // Hitung Total Hadir Hari Ini (tidak termasuk yang berhalangan)
        let listHadir = [];
        cacheDataPegawai.forEach(pegawai => {
            const isBerhalangan = [...listCutiHariIni, ...listSakitHariIni, ...listItmbHariIni, ...listTmsHarian, ...listMangkirHarian]
                                  .some(p => p.nipp === pegawai.nipp);
            if (!isBerhalangan) {
                listHadir.push(pegawai);
            }
        });

        // Update Nilai pada Kartu Widget Dashboard
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

        // Hubungkan ke Modal Pop-up Masing-masing Widget
        setupModalTrigger('tabel-crew', 'Data ASP UPT Crew KA Kisaran', cacheDataPegawai);
        setupModalTrigger('tabel-cuti', 'Daftar Pegawai Cuti Tahunan Hari Ini', listCutiHariIni);
        setupModalTrigger('tabel-sakit', 'Daftar Pegawai Sakit Hari Ini', listSakitHariIni);
        setupModalTrigger('tabel-itmb', 'Daftar Pegawai Cuti Penting Hari Ini', listItmbHariIni);
        setupModalTrigger('tabel-tms', 'Daftar Pegawai Tidak Memenuhi Syarat (TMS) Hari Ini', listTmsHarian);
        setupModalTrigger('tabel-mangkir', 'Daftar Pegawai Mangkir Hari Ini', listMangkirHarian);
        setupModalTrigger('tabel-hadir', 'Daftar Pegawai ASP Hadir Hari Ini', listHadir);

        console.log(`Data bulan ${namaBulanStr} berhasil dimuat.`);

    } catch (error) {
        console.error("Gagal menarik data dari Google Spreadsheet:", error);
    }
}


// ==========================================
// 3. LOGIKA REKAPITULASI LAPORAN PER BULAN
// ==========================================
let cacheRekapBulanan = [];

document.getElementById('btn-tampilkan-bulan').addEventListener('click', async function() {
    const bulanDipilih = document.getElementById('select-pilih-bulan').value;
    const targetGid = GID_BULAN[bulanDipilih];
    const namaBulanStr = document.getElementById('select-pilih-bulan').selectedOptions[0].text;
    
    const containerHasil = document.getElementById('hasil-rekap-bulanan');
    const tbodyRekap = document.getElementById('tabel-rekap-bulanan-body');

    containerHasil.style.display = 'block';
    tbodyRekap.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Memuat data rekapitulasi ${namaBulanStr}...</td></tr>`;

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

                    // Hitung akumulasi dari kolom tanggal 1 sampai 31 secara terpisah
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
                        nama, nipp: potensiNipp, jabatan,
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

        // Update Card Summary Bulanan (TMS dan Mangkir dipisah)
        const totalPegawai = cacheRekapBulanan.length;
        document.getElementById('sum-total-pegawai').textContent = totalPegawai;
        document.getElementById('sum-total-cuti').textContent = sumCuti;
        document.getElementById('sum-total-sakit').textContent = sumSakit;
        // Menampilkan akumulasi TMS dan Mangkir secara mandiri
        const elSumTmsMangkir = document.getElementById('sum-total-tms-mangkir');
        if (elSumTmsMangkir) {
            elSumTmsMangkir.textContent = `TMS: ${sumTms} | M: ${sumMangkir}`;
        }

        const rataRataHadir = totalPegawai > 0 ? ((totalHariMasukSemua / (totalPegawai * 25)) * 100).toFixed(1) : 0;
        document.getElementById('sum-rata-hadir').textContent = (rataRataHadir > 100 ? 100 : rataRataHadir) + '%';

        renderTabelRekapBulanan(cacheRekapBulanan);

    } catch (error) {
        console.error("Gagal memuat rekap bulanan:", error);
        tbodyRekap.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red; padding: 20px;">Gagal memuat data rekapitulasi bulan ${namaBulanStr}.</td></tr>`;
    }
});

function renderTabelRekapBulanan(dataList) {
    const tbodyRekap = document.getElementById('tabel-rekap-bulanan-body');
    tbodyRekap.innerHTML = '';

    if (dataList.length === 0) {
        tbodyRekap.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">Tidak ada data ditemukan.</td></tr>`;
        return;
    }

    dataList.forEach((pegawai, index) => {
        tbodyRekap.innerHTML += `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${pegawai.nama}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${pegawai.nipp}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${pegawai.jabatan}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: 700; color: #28a745;">${pegawai.hadir}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${pegawai.cuti}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${pegawai.sakit}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${pegawai.penting}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #e67e22; font-weight: 700;">${pegawai.tms}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #dc3545; font-weight: 700;">${pegawai.mangkir}</td>
            </tr>
        `;
    });
}

// Fitur Pencarian di Tabel Rekap Bulanan
document.getElementById('input-cari-bulan').addEventListener('input', function(e) {
    const keyword = e.target.value.toLowerCase();
    const filtered = cacheRekapBulanan.filter(p => 
        p.nama.toLowerCase().includes(keyword) || p.nipp.toLowerCase().includes(keyword)
    );
    renderTabelRekapBulanan(filtered);
});

// Fitur Ekspor ke CSV / Excel (Kolom TMS dan Mangkir Dipisah)
document.getElementById('btn-ekspor-excel').addEventListener('click', function() {
    if (cacheRekapBulanan.length === 0) {
        alert("Belum ada data rekapitulasi untuk diunduh.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,No,Nama Pegawai,NIPP,Jabatan,Hadir,Cuti (CT),Sakit (CSK),Cuti Penting,TMS,Mangkir\r\n";
    
    cacheRekapBulanan.forEach((p, index) => {
        let row = [index + 1, `"${p.nama}"`, p.nipp, `"${p.jabatan}"`, p.hadir, p.cuti, p.sakit, p.penting, p.tms, p.mangkir];
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Rekapitulasi_Bulanan_UPT_Crew_KA_Kisaran.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});


// ==========================================
// 4. LOGIKA INTERAKSI MODAL POP-UP HARIAN
// ==========================================
function setupModalTrigger(selectorId, judulModal, dataList) {
    const card = document.querySelector(`a[href="#${selectorId}"]`);
    const modal = document.getElementById('modal-detail');
    const modalTitle = document.getElementById('modal-title');
    const modalTableBody = document.getElementById('modal-table-body');
    const closeBtn = document.getElementById('modal-close');

    if (card) {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            modalTitle.textContent = judulModal;
            
            modalTableBody.innerHTML = '';
            if (dataList.length === 0) {
                modalTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #777;">Tidak ada data untuk kategori ini.</td></tr>`;
            } else {
                dataList.forEach((pegawai, index) => {
                    modalTableBody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${pegawai.nama}</td>
                            <td>${pegawai.nipp}</td>
                            <td>${pegawai.jabatan}</td>
                            <td>${pegawai.keterangan || '-'}</td>
                        </tr>
                    `;
                });
            }

            modal.style.display = 'flex';
        });
    }

    if (closeBtn) {
        closeBtn.onclick = function() { modal.style.display = 'none'; };
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

window.addEventListener('DOMContentLoaded', muatDataDashboard);
