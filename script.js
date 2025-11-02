// Data global untuk menyimpan data film yang dimuat
let filmData = [];
let allGenres = [];
let barChartInstance; 
let isDrilldown = false; // Status apakah chart sedang dalam mode drill-down

// =======================================================
// 1. FUNGSI UTAMA: MENGAMBIL DATA DAN INISIALISASI
// =======================================================

async function loadData() {
    try {
        // --- 1. Tampilkan Loading State ---
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('content-area').style.display = 'none';

        // Ambil data dari file JSON
        const response = await fetch('imdb_movies_processed.json');
        
        if (!response.ok) {
            throw new Error(`Gagal memuat file: Status ${response.status}`);
        }
        
        const rawData = await response.json();
        
        // Memastikan rating, year, dan duration adalah tipe data numerik
        filmData = rawData.map(d => ({
            ...d,
            rating: parseFloat(d.rating),
            year: parseInt(d.year),
            duration: parseInt(d.duration)
        }));

        // Mendapatkan semua genre unik
        allGenres = [...new Set(filmData.map(d => d.genre))].sort();

        // --- 2. Isi Metadata ---
        document.getElementById('data-count').textContent = filmData.length.toLocaleString();

        // --- 3. Sembunyikan Loading State dan Tampilkan Konten Utama ---
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('content-area').style.display = 'block';
        
        // Inisialisasi semua elemen dan chart
        setupFilter();
        initializeCharts();

    } catch (error) {
        console.error("Gagal memuat data:", error);
        
        // Jika gagal, pastikan loading disembunyikan dan tampilkan pesan error
        document.getElementById('loading-state').style.display = 'none';
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h1>❌ Gagal Memuat Data</h1>
                <p>Silakan cek kembali file 'imdb_movies_processed.json' dan pastikan Anda menggunakan Live Server.</p>
                <p>Detail Error di Console: ${error.message}</p>
            </div>
        `;
    }
}


// =======================================================
// 2. INTERAKTIVITAS: FILTER TAHUN & DRILL-DOWN (Bar Chart)
// =======================================================

function setupFilter() {
    const filterSelect = document.getElementById('yearFilter');
    
    if (!filterSelect) return; 

    // Mendapatkan rentang tahun unik (misal > 1950)
    const uniqueYears = [...new Set(filmData.map(d => d.year))]
        .filter(year => year >= 1950) 
        .sort((a, b) => b - a);
    
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `Mulai Tahun ${year}`;
        filterSelect.appendChild(option);
    });

    filterSelect.value = 2000;
    filterSelect.addEventListener('change', updateBarChart);
}


// Fungsi yang dipanggil saat Bar Chart diklik (untuk Drill-down)
function handleBarClick(event, elements) {
    if (elements.length > 0 && !isDrilldown) {
        const firstElement = elements[0];
        const genre = barChartInstance.data.labels[firstElement.index];
        
        isDrilldown = true;

        // 1. Ambil 10 film teratas dari genre yang diklik
        const drilldownData = filmData
            .filter(d => d.genre === genre && d.rating > 0 && d.title)
            .sort((a, b) => b.rating - a.rating) 
            .slice(0, 10); 

        // 2. Siapkan data baru untuk drill-down
        const filmLabels = drilldownData.map(d => `${d.title} (${d.year})`);
        const filmRatings = drilldownData.map(d => d.rating);

        // 3. Update Bar Chart
        barChartInstance.data.labels = filmLabels;
        barChartInstance.data.datasets[0].data = filmRatings;
        barChartInstance.data.datasets[0].label = 'Rating Film';
        barChartInstance.options.plugins.title.text = `★ 10 Film Teratas Genre: ${genre}`;
        barChartInstance.options.scales.y.title.text = 'Rating IMDb (1-10)';
        barChartInstance.options.scales.x.title.text = 'Judul Film';
        barChartInstance.options.onClick = null; // Nonaktifkan klik saat di drill-down
        
        // 4. Tambahkan tombol 'Kembali'
        const chartContainer = document.getElementById('barChart').closest('.chart-container');
        let backButton = document.querySelector('.back-button');
        
        if (!backButton) {
            backButton = document.createElement('button');
            backButton.id = 'backButton';
            backButton.textContent = '← Kembali ke Rating Rata-rata Genre';
            backButton.className = 'back-button'; 
            backButton.addEventListener('click', resetBarChart);
            // Tambahkan tombol sebelum chart-wrapper
            chartContainer.insertBefore(backButton, chartContainer.querySelector('.chart-wrapper'));
        }
        backButton.style.display = 'block';
        
        barChartInstance.update();
    }
}

// Fungsi untuk kembali dari mode drill-down
function resetBarChart() {
    isDrilldown = false;
    const backButton = document.querySelector('.back-button'); 
    if (backButton) backButton.style.display = 'none';

    // Set ulang onClick handler dan panggil updateBarChart untuk mode normal
    barChartInstance.options.onClick = handleBarClick; 
    updateBarChart();
}


// =======================================================
// 3. VISUALISASI 1: GRAFIK BATANG (Rating per Genre)
// =======================================================

function updateBarChart() {
    const filterElement = document.getElementById('yearFilter');
    const selectedYear = filterElement ? parseInt(filterElement.value) : 1900;
    
    // Sembunyikan tombol kembali jika ada dan kita tidak dalam mode drill-down
    const backButton = document.querySelector('.back-button');
    if (backButton && !isDrilldown) {
        backButton.style.display = 'none';
    }

    const filteredData = filmData.filter(d => d.year >= selectedYear);

    const genreStats = {};
    const MIN_FILMS = 50; 

    filteredData.forEach(d => {
        if (!isNaN(d.rating) && d.genre) {
            genreStats[d.genre] = genreStats[d.genre] || { totalRating: 0, count: 0 };
            genreStats[d.genre].totalRating += d.rating;
            genreStats[d.genre].count += 1;
        }
    });

    const dataForChart = allGenres.map(genre => {
        const stats = genreStats[genre];
        if (stats && stats.count >= MIN_FILMS) {
            return {
                label: genre,
                rating: stats.totalRating / stats.count
            };
        }
        return null;
    }).filter(d => d !== null);

    dataForChart.sort((a, b) => b.rating - a.rating);

    const labels = dataForChart.map(d => d.label);
    const ratings = dataForChart.map(d => d.rating.toFixed(2));

    // Update atau buat chart baru
    if (barChartInstance) {
        barChartInstance.data.labels = labels;
        barChartInstance.data.datasets[0].data = ratings;
        barChartInstance.data.datasets[0].label = 'Rating Rata-rata';
        barChartInstance.options.plugins.title.text = `Rating Rata-rata per Genre (Mulai Tahun ${selectedYear})`;
        barChartInstance.options.scales.y.title.text = 'Rating Rata-rata (1-10)';
        barChartInstance.options.scales.x.title.text = 'Genre';
        barChartInstance.options.onClick = handleBarClick; 
        barChartInstance.update();
    } else {
        const ctx = document.getElementById('barChart').getContext('2d');
        if (!ctx) return;
        
        barChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rating Rata-rata',
                    data: ratings,
                    backgroundColor: '#1a237e', // Deep Indigo (Warna Konsisten)
                    borderColor: '#1a237e',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: handleBarClick, // Event handler untuk Drill-down
                plugins: {
                    title: {
                        display: true,
                        text: `Rating Rata-rata per Genre (Mulai Tahun ${selectedYear})`
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        max: 10,
                        title: { display: true, text: 'Rating Rata-rata (1-10)' }
                    },
                    x: {
                        title: { display: true, text: 'Genre' }
                    }
                }
            }
        });
    }
}

// =======================================================
// 4. VISUALISASI 2: DIAGRAM SEBAR (Rating vs. Durasi)
// =======================================================

function createScatterChart() {
    // Ambil maksimal 5000 data untuk menjaga performa scatter plot
    const scatterData = filmData
        .filter(d => d.duration > 30 && d.rating > 0 && d.director && d.description)
        .slice(0, 5000)
        .map(d => ({
            x: d.duration,
            y: d.rating,
            title: d.title,
            director: d.director,
            description: d.description
        }));

    const ctx = document.getElementById('scatterChart').getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Rating Film',
                data: scatterData,
                backgroundColor: 'rgba(255, 111, 0, 0.6)', // Orange Aksen
                borderColor: 'rgba(255, 111, 0, 1)',
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Distribusi Rating Film Berdasarkan Durasi (Menit)' },
                legend: { display: false },
                // Custom Tooltip untuk fitur Hover Detail
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].raw.title;
                        },
                        label: function(context) {
                            const item = context.raw;
                            return [
                                `Sutradara: ${item.director}`,
                                `Durasi: ${item.x} menit, Rating: ${item.y}`
                            ];
                        },
                        afterBody: function(context) {
                            const item = context[0].raw;
                            const desc = item.description.length > 150 ? 
                                item.description.substring(0, 150) + '...' : 
                                item.description;
                            return `Sinopsis: ${desc}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: { display: true, text: 'Durasi Film (Menit)' }
                },
                y: {
                    beginAtZero: false,
                    max: 10,
                    title: { display: true, text: 'Rating IMDb (1-10)' }
                }
            }
        }
    });
}

// =======================================================
// 5. VISUALISASI 3: GRAFIK GARIS (Tren Rilis Film)
// =======================================================

function createLineChart() {
    const years = [...new Set(filmData.map(d => d.year))].sort((a, b) => a - b);
    const chartYears = years.filter(y => y >= 1950 && y <= 2020); 

    const genreCountsByYear = {};
    const topGenres = ['Drama', 'Comedy', 'Action', 'Thriller', 'Horror', 'Romance']; 

    filmData.forEach(d => {
        if (chartYears.includes(d.year) && topGenres.includes(d.genre)) {
            if (!genreCountsByYear[d.genre]) {
                genreCountsByYear[d.genre] = {};
            }
            genreCountsByYear[d.genre][d.year] = (genreCountsByYear[d.genre][d.year] || 0) + 1;
        }
    });

    const datasets = topGenres.map((genre, index) => {
        // Warna Garis yang Profesional dan Konsisten
        const colors = ['#1a237e', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#795548'];
        const color = colors[index % colors.length];

        return {
            label: genre,
            data: chartYears.map(year => genreCountsByYear[genre][year] || 0),
            borderColor: color,
            backgroundColor: color,
            fill: false,
            tension: 0.1
        };
    });

    const ctx = document.getElementById('lineChart').getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartYears,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Tren Jumlah Film Dirilis per Tahun (1950 - 2020)' },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    },
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tahun Rilis' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Jumlah Film' }
                }
            }
        }
    });
}


// =======================================================
// 6. FUNGSI INISIALISASI UTAMA
// =======================================================

function initializeCharts() {
    updateBarChart(); 
    createScatterChart(); 
    createLineChart(); 
}

// Menunggu hingga DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadData(); 
});