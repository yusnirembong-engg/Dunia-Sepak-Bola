// ============================================
// KONFIGURASI WORDPRESS (ganti nanti)
// ============================================
let USE_WORDPRESS = false;  // Set true setelah WordPress siap

// Ganti dengan domain WordPress Anda nanti
const WP_RSS_URL = 'https://domain-anda.infinityfreeapp.com/feed/';
const WP_API_URL = 'https://domain-anda.infinityfreeapp.com/wp-json/wp/v2/posts';

// ============================================
// FUNGSI AMBIL BERITA DARI WORDPRESS
// ============================================
async function fetchBeritaDariWordPress() {
    if (!USE_WORDPRESS) return null;
    
    try {
        console.log('🔄 Mencoba koneksi ke WordPress...');
        
        // Coba REST API dulu (lebih modern)
        const response = await fetch(`${WP_API_URL}?_embed&per_page=10&orderby=date&order=desc`);
        
        if (!response.ok) throw new Error('REST API gagal');
        
        const posts = await response.json();
        
        // Konversi format WordPress ke format newsData
        const convertedNews = posts.map((post, index) => {
            // Ambil gambar featured
            let imageUrl = 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=500&h=300&fit=crop';
            if (post._embedded && post._embedded['wp:featuredmedia']) {
                imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
            }
            
            // Ambil kategori
            let category = 'Berita';
            if (post._embedded && post._embedded['wp:term'] && post._embedded['wp:term'][0]) {
                category = post._embedded['wp:term'][0][0].name;
            }
            
            // Format tanggal
            const date = new Date(post.date);
            const formattedDate = date.toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            
            return {
                id: post.id,
                title: stripHtml(post.title.rendered),
                date: formattedDate,
                catName: category,
                excerpt: stripHtml(post.excerpt.rendered).substring(0, 150),
                image: imageUrl,
                link: post.link
            };
        });
        
        console.log(`✅ Berhasil ambil ${convertedNews.length} berita dari WordPress`);
        return convertedNews;
        
    } catch (error) {
        console.error('❌ Gagal ambil dari WordPress:', error);
        return null;
    }
}

// Helper hilangkan HTML
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// ============================================
// MAIN FUNCTION - PRIORITAS WORDPRESS DULU
// ============================================
async function loadAllNews() {
    let finalNews = [];
    
    // Coba ambil dari WordPress dulu
    if (USE_WORDPRESS) {
        const wpNews = await fetchBeritaDariWordPress();
        if (wpNews && wpNews.length > 0) {
            finalNews = wpNews;
            console.log('📰 Menggunakan data dari WordPress');
        } else {
            console.log('⚠️ WordPress gagal, fallback ke data statis');
            finalNews = [...newsData];
        }
    } else {
        console.log('📰 Menggunakan data statis (emergency mode)');
        finalNews = [...newsData];
    }
    
    return finalNews;
}

// ============================================
// UPDATE FUNGSI RENDER YANG ADA
// ============================================
let currentNewsData = [];

async function renderNewsGridWithWP() {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;
    
    // Tampilkan loading
    newsGrid.innerHTML = '<div class="loading-news"><i class="fas fa-spinner fa-spin"></i> Memuat berita terbaru...</div>';
    
    // Ambil data (prioritas WordPress)
    currentNewsData = await loadAllNews();
    
    const displayed = currentNewsData.slice(0, visibleCount);
    
    if (displayed.length === 0) {
        newsGrid.innerHTML = '<div class="no-news"><i class="fas fa-newspaper"></i> Belum ada berita.</div>';
    } else {
        newsGrid.innerHTML = displayed.map(news => `
            <div class="news-card">
                <img src="${news.image}" alt="${news.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=500&h=300&fit=crop'">
                <div class="news-content">
                    <span class="news-tag">${news.catName}</span>
                    <div class="news-date"><i class="far fa-calendar-alt"></i> ${news.date}</div>
                    <h3>${news.title}</h3>
                    <p>${news.excerpt.substring(0, 100)}...</p>
                    <a href="${news.link}" target="_blank" class="read-more">Baca Selengkapnya <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `).join('');
    }
    
    const totalSpan = document.getElementById('totalNews');
    if (totalSpan) totalSpan.innerText = currentNewsData.length;
    
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) {
        loadBtn.style.display = visibleCount >= currentNewsData.length ? 'none' : 'inline-flex';
    }
}

async function renderNewsPreviewWithWP() {
    const newsPreview = document.getElementById('newsPreview');
    if (!newsPreview) return;
    
    const previewNews = currentNewsData.slice(0, 3);
    
    if (previewNews.length === 0) {
        newsPreview.innerHTML = '<div class="no-news">Belum ada berita.</div>';
    } else {
        newsPreview.innerHTML = previewNews.map(news => `
            <div class="news-card">
                <img src="${news.image}" alt="${news.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=500&h=300&fit=crop'">
                <div class="news-content">
                    <span class="news-tag">${news.catName}</span>
                    <div class="news-date"><i class="far fa-calendar-alt"></i> ${news.date}</div>
                    <h3>${news.title}</h3>
                    <p>${news.excerpt.substring(0, 80)}...</p>
                    <a href="${news.link}" target="_blank" class="read-more">Baca Selengkapnya <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `).join('');
    }
}

// Update fungsi setupLoadMore
function setupLoadMoreWithWP() {
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) {
        const newLoadBtn = loadBtn.cloneNode(true);
        loadBtn.parentNode.replaceChild(newLoadBtn, loadBtn);
        
        newLoadBtn.addEventListener('click', () => {
            visibleCount += 6;
            const displayed = currentNewsData.slice(0, visibleCount);
            const newsGrid = document.getElementById('newsGrid');
            if (newsGrid) {
                newsGrid.innerHTML = displayed.map(news => `...`).join(''); // Gunakan template yang sama
                renderNewsGridWithWP(); // Re-render
            }
        });
    }
}

// ============================================
// MODIFIKASI DOMContentLoaded
// ============================================
// Simpan event listener asli Anda, tambahkan ini:
document.addEventListener('DOMContentLoaded', async function() {
    
    // ... (kode existing Anda untuk mobile menu, countdown, dll tetap di sini)
    
    // ========== RENDER BERITA DENGAN WORDPRESS ==========
    await renderNewsGridWithWP();
    await renderNewsPreviewWithWP();
    setupLoadMoreWithWP();
    setupFilters();
    
    // ========== TAMBAHKAN INDIKATOR SUMBER BERITA ==========
    const newsHeader = document.querySelector('.section-header');
    if (newsHeader && USE_WORDPRESS) {
        const indicator = document.createElement('span');
        indicator.className = 'source-indicator';
        indicator.innerHTML = '🟢 Live from WordPress';
        indicator.style.cssText = 'font-size: 12px; background: #e8f5e9; padding: 4px 12px; border-radius: 20px; margin-left: 12px;';
        newsHeader.appendChild(indicator);
    }
    
    console.log('✅ Website siap dengan koneksi WordPress');
});
