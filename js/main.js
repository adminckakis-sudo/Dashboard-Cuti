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
// 2. FETCH & PARSER DATA SPREADSHEET (BERSIH & HARIAN)
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
        let processedNipps = new Set(); // Set untuk mencegah pegawai terbaca dobel

        barisData.forEach(baris => {
            const kolom = baris.split(',').map(k => k.trim());
            
            if (kolom.length >= 4) {
                const nama = kolom[1] || '';
                const potensiNipp = kolom[2];
                const jabatan = kolom[3] ? kolom[3].toUpperCase() : '';
                const keteranganAsli = kolom[kolom.length - 1] && kolom[kolom.length - 1] !== '-' ? kolom[kolom.length - 1] : '';

                // Validasi NIPP angka dan pastikan belum pernah diproses (cegah dobel)
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

                    // Cek Presensi Harian (Sesuai tanggal hari ini saja untuk semua kategori)
                    const indeksKolomHariIni = 3 + tanggalHariIni;
                    if (kolom[indeksKolomHariIni]) {
                        const statusHariIni = kolom[indeksKolomHariIni].toUpperCase();
                        const dataPegawai = { nama, nipp: potensiNipp, jabatan, keterangan: keteranganAsli };

                        if (statusHariIni === 'CT') listCutiHariIni.push(dataPegawai);
                        if (statusHariIni === 'CSK') listSakitHariIni.push(dataPegawai);
                        if (statusHariIni === 'ITMB' || statusHariIni === 'SPKA' || statusHariIni === 'CP') listItmbHariIni.push(dataPegawai);
                        if (statusHariIni === 'TMS') listTmsHarian.push(dataPegawai);
                        if (statusHariIni === 'M') listMangkirHarian.push(dataPegawai);
                    }

                    cacheDataPegawai.push({ nama, nipp: potensiNipp, jabatan, keterangan: keteranganAsli });
                }
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

        // Hubungkan ke Modal Pop-up Masing-masing Widget
        setupModalTrigger('tabel-cuti', 'Daftar Pegawai Cuti Tahunan Hari Ini', listCutiHariIni);
        setupModalTrigger('tabel-sakit', 'Daftar Pegawai Sakit Hari Ini', listSakitHariIni);
        setupModalTrigger('tabel-itmb', 'Daftar Pegawai Cuti Penting  Hari Ini', listItmbHariIni);
        setupModalTrigger('tabel-tms', 'Daftar Pegawai Tidak Memenuhi Syarat (TMS) Hari Ini', listTmsHarian);
        setupModalTrigger('tabel-mangkir', 'Daftar Pegawai Mangkir Hari Ini', listMangkirHarian);

        console.log(`Data bulan ${namaBulanStr} berhasil dimuat dengan bersih.`);

        // Hubungkan ke Modal Pop-up Masing-masing Widget (Termasuk Total ASP)
        setupModalTrigger('tabel-crew', 'Data ASP UPT Crew KA Kisaran', cacheDataPegawai);
        setupModalTrigger('tabel-cuti', 'Daftar Pegawai Cuti Tahunan Hari Ini', listCutiHariIni);
        setupModalTrigger('tabel-sakit', 'Daftar Pegawai Sakit Hari Ini', listSakitHariIni);
        setupModalTrigger('tabel-itmb', 'Daftar Pegawai Cuti Penting  Hari Ini', listItmbHariIni);
        setupModalTrigger('tabel-tms', 'Daftar Pegawai Tidak Memenuhi Syarat (TMS) Hari Ini', listTmsHarian);
        setupModalTrigger('tabel-mangkir', 'Daftar Pegawai Mangkir Hari Ini', listMangkirHarian);

    } catch (error) {
        console.error("Gagal menarik data dari Google Spreadsheet:", error);
    }
}

// ==========================================
// 3. LOGIKA INTERAKSI MODAL POP-UP
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
                            <td>${pegawai.keterangan}</td>
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
