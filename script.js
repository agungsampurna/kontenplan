const supabaseUrl = 'https://umsxusnnfudexfvcplhj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtc3h1c25uZnVkZXhmdmNwbGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjExMzksImV4cCI6MjA4NTc5NzEzOX0.xUo1dO725nN3JcAxf4v312rwNhQ9MNnMR8lFRewWyok';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;


// Data Storage
let contentData = {
    instagram: {},
    tiktok: {}
};
let currentPlatform = 'instagram';
let currentMonth = new Date().getMonth();
let platforms = ['instagram', 'tiktok'];

// Initialize from localStorage
function initData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        contentData = JSON.parse(saved);
    }
    const savedPlatforms = localStorage.getItem('platforms');
    if (savedPlatforms) {
        platforms = JSON.parse(savedPlatforms);
        renderPlatformTabs();
    }
}

// Save to localStorage
async function saveData() {
  if (!currentUser) return;

  // hapus data lama user ini
  await supabase
    .from('content_data')
    .delete()
    .eq('user_id', currentUser.id);

  // simpan ulang data terbaru
  for (const platform in contentData) {
    for (const month in contentData[platform]) {
      await supabase.from('content_data').insert({
        user_id: currentUser.id,
        platform: platform,
        month: Number(month),
        data: contentData[platform][month]
      });
    }
  }
}



// Login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    currentUser = data.user;

    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');

    await loadFromSupabase();
});


// Logout
function logout() {
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('loginForm').reset();
}

// Switch Platform
function switchPlatform(platform) {
    currentPlatform = platform;
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-platform="${platform}"]`).classList.add('active');
    loadContent();
    updateReminders();
}

// Add Platform
function showAddPlatformModal() {
    document.getElementById('addPlatformModal').classList.add('active');
}

function closeAddPlatformModal() {
    document.getElementById('addPlatformModal').classList.remove('active');
    document.getElementById('newPlatformName').value = '';
}

function addPlatform() {
    const platformName = document.getElementById('newPlatformName').value.trim().toLowerCase();
    if (platformName && !platforms.includes(platformName)) {
        platforms.push(platformName);
        contentData[platformName] = {};
        renderPlatformTabs();
        saveData();
        closeAddPlatformModal();
    }
}

function deletePlatform(platform) {
    if (confirm(`Hapus platform "${platform}"? Semua data konten di platform ini akan hilang.`)) {
        platforms = platforms.filter(p => p !== platform);
        delete contentData[platform];
        
        // Switch to Instagram if current platform is deleted
        if (currentPlatform === platform) {
            currentPlatform = 'instagram';
        }
        
        renderPlatformTabs();
        saveData();
        loadContent();
        updateReminders();
    }
}

function renderPlatformTabs() {
    const tabsContainer = document.getElementById('platformTabs');
    tabsContainer.innerHTML = '';
    platforms.forEach(platform => {
        const wrapper = document.createElement('div');
        wrapper.className = 'platform-tab-wrapper';
        
        const btn = document.createElement('button');
        btn.className = 'platform-tab' + (platform === currentPlatform ? ' active' : '');
        btn.setAttribute('data-platform', platform);
        btn.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
        btn.onclick = () => switchPlatform(platform);
        wrapper.appendChild(btn);
        
        // Add delete button only for custom platforms (not Instagram/TikTok)
        if (platform !== 'instagram' && platform !== 'tiktok') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-platform-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deletePlatform(platform);
            };
            wrapper.appendChild(deleteBtn);
        }
        
        tabsContainer.appendChild(wrapper);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'add-platform-btn';
    addBtn.textContent = '+ Tambah Platform';
    addBtn.onclick = showAddPlatformModal;
    tabsContainer.appendChild(addBtn);
}

// Change Month
function changeMonth() {
    currentMonth = parseInt(document.getElementById('monthSelect').value);
    loadContent();
    updatePerformance();
    updateReminders();
}

// Load Content
function loadContent() {
    const key = `${currentPlatform}_${currentMonth}`;
    const tbody = document.getElementById('contentTableBody');
    tbody.innerHTML = '';

    if (contentData[currentPlatform] && contentData[currentPlatform][currentMonth]) {
        contentData[currentPlatform][currentMonth].forEach((row, index) => {
            addContentRowWithData(row, index);
        });
    }
}

// Add Content Row
function addContentRow() {
    addContentRowWithData({}, -1);
}

function addContentRowWithData(data = {}, index) {
    const tbody = document.getElementById('contentTableBody');
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td><input type="text" value="${data.judul || ''}" onchange="saveContent()"></td>
        <td>
            <select onchange="saveContent()">
                <option value="">Pilih Goals</option>
                <option value="awareness" ${data.goals === 'awareness' ? 'selected' : ''}>Awareness</option>
                <option value="conversion" ${data.goals === 'conversion' ? 'selected' : ''}>Conversion</option>
                <option value="promosi" ${data.goals === 'promosi' ? 'selected' : ''}>Promosi</option>
                <option value="entertainment" ${data.goals === 'entertainment' ? 'selected' : ''}>Entertainment</option>
            </select>
        </td>
        <td><input type="url" value="${data.referensi || ''}" onchange="saveContent()" placeholder="https://..."></td>
        <td>
            <select onchange="saveContent()">
                <option value="">Pilih Format</option>
                <option value="foto" ${data.format === 'foto' ? 'selected' : ''}>Foto</option>
                <option value="video" ${data.format === 'video' ? 'selected' : ''}>Video</option>
            </select>
        </td>
        <td><input type="text" value="${data.produk || ''}" onchange="saveContent()"></td>
        <td>
            <select onchange="saveContent()">
                <option value="">Pilih Proses</option>
                <option value="belum_mulai" ${data.proses === 'belum_mulai' ? 'selected' : ''}>Belum Mulai</option>
                <option value="tahap_produksi" ${data.proses === 'tahap_produksi' ? 'selected' : ''}>Tahap Produksi</option>
                <option value="tahap_editing" ${data.proses === 'tahap_editing' ? 'selected' : ''}>Tahap Editing</option>
                <option value="tahap_revisi" ${data.proses === 'tahap_revisi' ? 'selected' : ''}>Tahap Revisi</option>
                <option value="tahap_upload" ${data.proses === 'tahap_upload' ? 'selected' : ''}>Tahap Upload</option>
                <option value="selesai" ${data.proses === 'selesai' ? 'selected' : ''}>Selesai</option>
            </select>
        </td>
        <td><input type="url" value="${data.linkUpload || ''}" onchange="fetchViews(this)" placeholder="https://..."></td>
        <td style="display: flex; gap: 5px; align-items: center;">
            <input type="number" value="${data.views || 0}" readonly style="background: #f0f0f0; flex: 1;" min="0">
            <button class="delete-btn" style="background: #667eea; padding: 8px 10px;" onclick="refreshViews(this)" title="Refresh views">🔄</button>
        </td>
        <td><button class="delete-btn" onclick="deleteRow(this)">Hapus</button></td>
    `;
    
    tbody.appendChild(tr);
}

// Delete Row
function deleteRow(btn) {
    if (confirm('Hapus konten ini?')) {
        btn.closest('tr').remove();
        saveContent();
    }
}

// Fetch Views from URL
async function fetchViews(input) {
    const url = input.value.trim();
    const row = input.closest('tr');
    const viewsInput = row.querySelector('input[type="number"]');
    
    if (!url) {
        saveContent();
        return;
    }

    // Show loading state
    viewsInput.value = '...';
    
    try {
        // Try to fetch the page and extract views
        // Note: Due to CORS restrictions, this will work only for same-origin or CORS-enabled sites
        // For Instagram/TikTok, we'll try to extract from the URL structure or use mock data
        
        if (url.includes('instagram.com')) {
            // For Instagram - simulation (real scraping blocked by CORS)
            // In production, you'd need a backend API to scrape this
            const mockViews = Math.floor(Math.random() * 100000) + 1000;
            viewsInput.value = mockViews;
            alert('Instagram views: ' + mockViews.toLocaleString() + '\n\nCatatan: Ini adalah data simulasi. Untuk data real-time, hubungkan dengan Instagram API atau masukkan manual.');
        } else if (url.includes('tiktok.com')) {
            // For TikTok - simulation (real scraping blocked by CORS)
            const mockViews = Math.floor(Math.random() * 500000) + 5000;
            viewsInput.value = mockViews;
            alert('TikTok views: ' + mockViews.toLocaleString() + '\n\nCatatan: Ini adalah data simulasi. Untuk data real-time, hubungkan dengan TikTok API atau masukkan manual.');
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // For YouTube - simulation (real scraping blocked by CORS)
            const mockViews = Math.floor(Math.random() * 1000000) + 10000;
            viewsInput.value = mockViews;
            alert('YouTube views: ' + mockViews.toLocaleString() + '\n\nCatatan: Ini adalah data simulasi. Untuk data real-time, hubungkan dengan YouTube API atau masukkan manual.');
        } else {
            // For other platforms, allow manual input
            viewsInput.value = 0;
            viewsInput.removeAttribute('readonly');
            viewsInput.style.background = 'white';
            alert('Platform tidak dikenali. Silakan masukkan jumlah views secara manual.');
        }
    } catch (error) {
        viewsInput.value = 0;
        viewsInput.removeAttribute('readonly');
        viewsInput.style.background = 'white';
        alert('Gagal mengambil data views. Silakan masukkan secara manual.');
    }
    
    saveContent();
}

// Refresh Views manually
function refreshViews(btn) {
    const row = btn.closest('tr');
    const linkInput = row.querySelectorAll('input')[6]; // Link upload input
    if (linkInput.value) {
        fetchViews(linkInput);
    } else {
        alert('Masukkan link upload terlebih dahulu!');
    }
}

// Save Content
function saveContent() {
    const tbody = document.getElementById('contentTableBody');
    const rows = tbody.querySelectorAll('tr');
    const data = [];

    rows.forEach(row => {
        const inputs = row.querySelectorAll('input, select');
        data.push({
            judul: inputs[0].value,
            goals: inputs[1].value,
            referensi: inputs[2].value,
            format: inputs[3].value,
            produk: inputs[4].value,
            proses: inputs[5].value,
            linkUpload: inputs[6].value,
            views: parseInt(inputs[7].value) || 0
        });
    });

    if (!contentData[currentPlatform]) {
        contentData[currentPlatform] = {};
    }
    contentData[currentPlatform][currentMonth] = data;
    saveData();
    updatePerformance();
    updateReminders();
}

// Update Performance
function updatePerformance() {
    let totalCompleted = 0;
    let totalTarget = 0;

    Object.keys(contentData).forEach(platform => {
        Object.keys(contentData[platform]).forEach(month => {
            const monthData = contentData[platform][month];
            // Count all items in table as target
            totalTarget += monthData.length;
            monthData.forEach(item => {
                if (item.proses === 'selesai') {
                    totalCompleted++;
                }
            });
        });
    });

    const percentage = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
    document.getElementById('performanceScore').textContent = percentage + '%';
    document.getElementById('performanceDetail').textContent = `(${totalCompleted} / ${totalTarget} video selesai)`;
}

// Update Reminders
function updateReminders() {
    const pendingDiv = document.getElementById('pendingReminders');
    const completedDiv = document.getElementById('completedReminders');
    
    pendingDiv.innerHTML = '';
    completedDiv.innerHTML = '';

    let hasPending = false;
    let hasCompleted = false;

    if (contentData[currentPlatform] && contentData[currentPlatform][currentMonth]) {
        contentData[currentPlatform][currentMonth].forEach(item => {
            if (item.proses === 'selesai' && item.linkUpload) {
                hasCompleted = true;
                const div = document.createElement('div');
                div.className = 'reminder-item success';
                div.innerHTML = `<strong>${item.judul || 'Tanpa Judul'}</strong> - ${item.views.toLocaleString()} views`;
                completedDiv.appendChild(div);
            } else if (item.proses && item.proses !== 'selesai') {
                hasPending = true;
                const statusText = {
                    'belum_mulai': 'Belum Mulai',
                    'tahap_produksi': 'Perlu Diproduksi',
                    'tahap_editing': 'Perlu Diedit',
                    'tahap_revisi': 'Perlu Direvisi',
                    'tahap_upload': 'Perlu Diupload'
                };
                const div = document.createElement('div');
                div.className = 'reminder-item warning';
                div.innerHTML = `<strong>${item.judul || 'Tanpa Judul'}</strong> - ${statusText[item.proses] || item.proses}`;
                pendingDiv.appendChild(div);
            }
        });
    }

    if (!hasPending) {
        pendingDiv.innerHTML = '<div class="reminder-item warning">Tidak ada konten yang perlu dikerjakan</div>';
    }
    if (!hasCompleted) {
        completedDiv.innerHTML = '<div class="reminder-item success">Belum ada konten yang di-upload</div>';
    }
}

// Set current month on load
document.getElementById('monthSelect').value = currentMonth;

async function loadFromSupabase() {
    const { data, error } = await supabase
        .from('content_data')
        .select('*')
        .eq('user_id', currentUser.id);

    if (error) {
        alert(error.message);
        return;
    }

    contentData = {};
    data.forEach(item => {
        if (!contentData[item.platform]) {
            contentData[item.platform] = {};
        }
        contentData[item.platform][item.month] = item.data;
    });

    renderPlatformTabs();
    loadContent();
    updatePerformance();
    updateReminders();
}

supabase
  .channel('realtime-content')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'content_data' },
    () => loadFromSupabase()
  )
  .subscribe();
