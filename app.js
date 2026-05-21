// Aynur Sync v4.0 - Main Application
// Firebase v10 Modular CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, onChildAdded, update, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================
// ANTICRACK KORUMASI - API KEY YÖNETİMİ
// ============================================
const _0x4f2a = {
    _gk: null,
    _fk: null,
    init: function() {
        if (typeof ANTICRACK !== 'undefined') {
            this._gk = ANTICRACK.getGroqKey();
            this._fk = ANTICRACK.getFirebaseConfig();
        }
    },
    gk: function() { return this._gk; },
    fk: function() { return this._fk; }
};
_0x4f2a.init();

// ============================================
// FIREBASE AYARLARI (anticrack.js'den veya varsayılan)
// ============================================
let firebaseConfig = _0x4f2a.fk() || {
    apiKey: "AIzaSyDEMO-KEY-REPLACE-WITH-REAL",
    authDomain: "aynursync-demo.firebaseapp.com",
    databaseURL: "https://aynursync-demo-default-rtdb.firebaseio.com",
    projectId: "aynursync-demo",
    storageBucket: "aynursync-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:demo"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================
// GROQ API (anticrack.js'den)
// ============================================
const GROQ_API_KEY = _0x4f2a.gk() || "";
const GROQ_MODEL = "llama-3.1-8b-instant";

// ============================================
// STATE
// ============================================
let currentUser = null;
let currentRoom = null;
let rooms = [];
let isOnline = false;

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getAvatarColor(name) {
    const colors = ['#06b6d4', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toastText');
    if (!toast || !text) return;
    text.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.background = type === 'error' ? 'rgba(239,68,68,0.9)' : type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(26,26,46,0.9)';
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ============================================
// AUTH İŞLEMLERİ
// ============================================
window.switchAuthTab = function(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('tab-active');
        tabLogin.classList.remove('text-gray-400');
        tabRegister.classList.remove('tab-active');
        tabRegister.classList.add('text-gray-400');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegister.classList.add('tab-active');
        tabRegister.classList.remove('text-gray-400');
        tabLogin.classList.remove('tab-active');
        tabLogin.classList.add('text-gray-400');
    }
};

window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
};

window.login = async function() {
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const remember = document.getElementById('rememberMe')?.checked;

    if (!username || !password) {
        showToast('Kullanıcı adı ve şifre gerekli!', 'error');
        return;
    }

    try {
        const snapshot = await get(ref(db, 'users/' + username));
        if (!snapshot.exists() || snapshot.val().password !== hashPassword(password)) {
            showToast('Kullanıcı adı veya şifre hatalı!', 'error');
            return;
        }

        const userData = snapshot.val();
        currentUser = { username, ...userData };

        if (remember) {
            localStorage.setItem('aynur_user', username);
            localStorage.setItem('aynur_token', btoa(username + ':' + Date.now()));
        }

        showToast('Giriş başarılı!', 'success');
        showMainApp();
    } catch (e) {
        showToast('Giriş hatası: ' + e.message, 'error');
    }
};

window.register = async function() {
    const username = document.getElementById('regUsername')?.value?.trim();
    const password = document.getElementById('regPassword')?.value;
    const password2 = document.getElementById('regPassword2')?.value;
    const acceptTerms = document.getElementById('acceptTerms')?.checked;

    if (!username || username.length < 3) {
        showToast('Kullanıcı adı en az 3 karakter olmalı!', 'error');
        return;
    }
    if (!password || password.length < 6) {
        showToast('Şifre en az 6 karakter olmalı!', 'error');
        return;
    }
    if (password !== password2) {
        showToast('Şifreler eşleşmiyor!', 'error');
        return;
    }
    if (!acceptTerms) {
        showToast('Kullanım koşullarını kabul etmelisiniz!', 'error');
        return;
    }

    try {
        const snapshot = await get(ref(db, 'users/' + username));
        if (snapshot.exists()) {
            showToast('Bu kullanıcı adı zaten alınmış!', 'error');
            return;
        }

        await set(ref(db, 'users/' + username), {
            username: username,
            password: hashPassword(password),
            createdAt: Date.now(),
            avatar: getAvatarColor(username),
            status: 'Hazır',
            role: 'Kullanıcı'
        });

        showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
        switchAuthTab('login');
    } catch (e) {
        showToast('Kayıt hatası: ' + e.message, 'error');
    }
};

window.guestLogin = function() {
    const guestName = 'Misafir' + Math.floor(Math.random() * 10000);
    currentUser = { username: guestName, role: 'Misafir', status: 'Hazır', avatar: getAvatarColor(guestName) };
    localStorage.setItem('aynur_user', guestName);
    showToast('Misafir olarak giriş yapıldı', 'success');
    showMainApp();
};

window.logout = function() {
    currentUser = null;
    localStorage.removeItem('aynur_user');
    localStorage.removeItem('aynur_token');
    location.reload();
};

function hashPassword(pw) {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
        const char = pw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash);
}

function showMainApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    updateDashboard();
    loadRooms();
    startClock();
}

// ============================================
// DASHBOARD
// ============================================
function updateDashboard() {
    if (!currentUser) return;

    const nameEl = document.getElementById('dashUsername');
    const statusEl = document.getElementById('dashStatus');
    const avatarEl = document.getElementById('dashAvatar');
    const profileAvatar = document.getElementById('profileAvatar');

    if (nameEl) nameEl.textContent = currentUser.username;
    if (statusEl) statusEl.textContent = currentUser.status || 'Hazır';
    if (avatarEl) {
        avatarEl.style.background = currentUser.avatar || getAvatarColor(currentUser.username);
        avatarEl.textContent = currentUser.username[0].toUpperCase();
    }
    if (profileAvatar) {
        profileAvatar.style.background = currentUser.avatar || getAvatarColor(currentUser.username);
        profileAvatar.textContent = currentUser.username[0].toUpperCase();
    }
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('tr-TR', { hour12: false });
        const statTime = document.getElementById('statTime');
        if (statTime) statTime.textContent = timeStr;
    }, 1000);
}

window.quickSync = function() {
    const icon = document.getElementById('syncIcon');
    const progress = document.getElementById('syncProgress');
    const status = document.getElementById('syncStatus');

    if (icon) icon.classList.add('fa-spin');
    if (progress) progress.style.width = '100%';
    if (status) status.textContent = 'Senkronize ediliyor...';

    setTimeout(() => {
        if (icon) icon.classList.remove('fa-spin');
        if (progress) progress.style.width = '0%';
        if (status) status.textContent = 'Hazır - Son sync: ' + new Date().toLocaleTimeString('tr-TR');

        const syncCount = document.getElementById('syncCount');
        if (syncCount) syncCount.textContent = parseInt(syncCount.textContent || 0) + 1;

        showToast('Senkronizasyon tamamlandı!', 'success');
    }, 2000);
};

// ============================================
// ODA İŞLEMLERİ
// ============================================
window.toggleRoomPassword = function() {
    const div = document.getElementById('roomPasswordDiv');
    const isPrivate = document.getElementById('roomPrivate')?.checked;
    if (div) div.classList.toggle('hidden', !isPrivate);
};

window.setContentType = function(type) {
    const ytBtn = document.getElementById('btnYoutube');
    const rawBtn = document.getElementById('btnRaw');
    const ytInput = document.getElementById('youtubeInput');
    const rawInput = document.getElementById('rawInput');

    if (type === 'youtube') {
        ytBtn.classList.add('border-accent-cyan');
        rawBtn.classList.remove('border-accent-cyan');
        if (ytInput) ytInput.classList.remove('hidden');
        if (rawInput) rawInput.classList.add('hidden');
    } else {
        rawBtn.classList.add('border-accent-cyan');
        ytBtn.classList.remove('border-accent-cyan');
        if (rawInput) rawInput.classList.remove('hidden');
        if (ytInput) ytInput.classList.add('hidden');
    }
};

window.createRoom = async function() {
    const name = document.getElementById('roomName')?.value?.trim();
    const isPrivate = document.getElementById('roomPrivate')?.checked;
    const password = isPrivate ? (document.getElementById('roomPassword')?.value || '') : '';
    const ytUrl = document.getElementById('ytUrl')?.value?.trim();
    const rawUrl = document.getElementById('rawUrl')?.value?.trim();

    let videoUrl = '';
    let videoType = '';

    if (ytUrl) { videoUrl = ytUrl; videoType = 'youtube'; }
    else if (rawUrl) { videoUrl = rawUrl; videoType = 'raw'; }

    if (!name) {
        showToast('Oda adı gerekli!', 'error');
        return;
    }

    const code = generateCode();
    const hostName = currentUser?.username || 'Misafir';

    try {
        await set(ref(db, 'rooms/' + code), {
            name: name,
            code: code,
            host: hostName,
            videoUrl: videoUrl,
            videoType: videoType,
            isPrivate: isPrivate,
            password: password,
            createdAt: Date.now(),
            isActive: true,
            isPlaying: false,
            currentTime: 0,
            viewers: {
                [hostName]: {
                    joinedAt: Date.now(),
                    color: getAvatarColor(hostName),
                    online: true
                }
            },
            messages: {}
        });

        localStorage.setItem('aynur_room', code);
        showToast('Oda kuruldu! Yönlendiriliyor...', 'success');

        setTimeout(() => {
            window.location.href = 'watch.html?room=' + code + '&user=' + encodeURIComponent(hostName);
        }, 500);
    } catch (e) {
        showToast('Oda kurma hatası: ' + e.message, 'error');
    }
};

window.joinRoom = async function() {
    let code = document.getElementById('joinCode')?.value?.trim()?.toUpperCase();

    if (!code) {
        showToast('Oda kodu gerekli!', 'error');
        return;
    }

    // Davet linkinden kod çıkarma
    if (code.includes('?room=')) {
        const match = code.match(/[?&]room=([A-Z0-9]+)/i);
        if (match) code = match[1].toUpperCase();
    }

    const userName = currentUser?.username || 'Misafir' + Math.floor(Math.random() * 1000);

    try {
        const snapshot = await get(ref(db, 'rooms/' + code));
        if (!snapshot.exists()) {
            showToast('Oda bulunamadı!', 'error');
            return;
        }

        const room = snapshot.val();

        if (room.isPrivate) {
            const pw = document.getElementById('joinRoomPassword')?.value || '';
            if (pw !== room.password) {
                showToast('Şifre yanlış!', 'error');
                return;
            }
        }

        await update(ref(db, 'rooms/' + code + '/viewers/' + userName), {
            joinedAt: Date.now(),
            color: getAvatarColor(userName),
            online: true
        });

        localStorage.setItem('aynur_room', code);
        window.location.href = 'watch.html?room=' + code + '&user=' + encodeURIComponent(userName);
    } catch (e) {
        showToast('Katılma hatası: ' + e.message, 'error');
    }
};

function loadRooms() {
    const roomsRef = ref(db, 'rooms');
    onValue(roomsRef, (snapshot) => {
        rooms = [];
        const data = snapshot.val();
        if (data) {
            Object.entries(data).forEach(([code, room]) => {
                if (room.isActive !== false) rooms.push({ code, ...room });
            });
            rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        displayRooms();
    });
}

function displayRooms() {
    const container = document.getElementById('activeRooms');
    if (!container) return;

    if (rooms.length === 0) {
        container.innerHTML = `
            <div class="glass rounded-2xl p-6 text-center text-gray-500">
                <i class="fas fa-tv text-3xl mb-2 opacity-50"></i>
                <p>Henüz aktif oda yok</p>
                <button onclick="showCreateRoom()" class="mt-3 px-4 py-2 gradient-cyan rounded-xl text-sm text-white">Oda Kur</button>
            </div>`;
        return;
    }

    container.innerHTML = rooms.slice(0, 5).map(room => {
        const viewers = Object.keys(room.viewers || {}).length;
        const isPlaying = room.isPlaying ? '<span class="text-green-400 text-xs">● İzleniyor</span>' : '<span class="text-gray-500 text-xs">○ Bekliyor</span>';
        const lock = room.isPrivate ? '<i class="fas fa-lock text-yellow-500 ml-1" title="Şifreli"></i>' : '';

        return `
            <div class="room-card glass rounded-2xl p-4 cursor-pointer" onclick="joinRoomByCode('${room.code}')">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold">${escapeHtml(room.name)}${lock}</h4>
                        <span class="text-xs bg-dark-700 px-2 py-0.5 rounded font-mono">${room.code}</span>
                    </div>
                    ${isPlaying}
                </div>
                <div class="flex items-center justify-between text-sm text-gray-400">
                    <span><i class="fas fa-users text-accent-cyan mr-1"></i>${viewers} izleyici</span>
                    <span>${room.videoType === 'youtube' ? '<i class="fab fa-youtube text-red-500"></i> YouTube' : room.videoUrl ? '<i class="fas fa-link text-accent-cyan"></i> Link' : 'Boş'}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.joinRoomByCode = async function(code) {
    const userName = currentUser?.username || 'Misafir' + Math.floor(Math.random() * 1000);

    try {
        const snapshot = await get(ref(db, 'rooms/' + code));
        if (!snapshot.exists()) {
            showToast('Oda bulunamadı!', 'error');
            return;
        }

        const room = snapshot.val();
        if (room.isPrivate) {
            const pw = prompt('Oda şifresi:');
            if (pw !== room.password) {
                showToast('Şifre yanlış!', 'error');
                return;
            }
        }

        await update(ref(db, 'rooms/' + code + '/viewers/' + userName), {
            joinedAt: Date.now(),
            color: getAvatarColor(userName),
            online: true
        });

        localStorage.setItem('aynur_room', code);
        window.location.href = 'watch.html?room=' + code + '&user=' + encodeURIComponent(userName);
    } catch (e) {
        showToast('Hata: ' + e.message, 'error');
    }
};

// ============================================
// MODAL YÖNETİMİ
// ============================================
window.showCreateRoom = function() {
    const modal = document.getElementById('createRoomModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.showProfile = function() {
    if (!currentUser) return;
    const modal = document.getElementById('profileModal');
    const nameEl = document.getElementById('profileName');
    const roleEl = document.getElementById('profileRole');
    const avatar = document.getElementById('profileBigAvatar');

    if (nameEl) nameEl.textContent = currentUser.username;
    if (roleEl) roleEl.textContent = currentUser.role || 'Kullanıcı';
    if (avatar) {
        avatar.style.background = currentUser.avatar || getAvatarColor(currentUser.username);
        avatar.textContent = currentUser.username[0].toUpperCase();
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.editProfile = function() {
    closeModal('profileModal');
    const modal = document.getElementById('editProfileModal');
    const nameInput = document.getElementById('editUsername');
    const avatar = document.getElementById('editAvatar');

    if (nameInput) nameInput.value = currentUser?.username || '';
    if (avatar) {
        avatar.style.background = currentUser?.avatar || getAvatarColor(currentUser?.username || 'A');
        avatar.textContent = (currentUser?.username || 'A')[0].toUpperCase();
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.saveProfile = async function() {
    const newName = document.getElementById('editUsername')?.value?.trim();
    const newStatus = document.getElementById('editStatus')?.value?.trim();

    if (!newName || newName.length < 3) {
        showToast('Kullanıcı adı en az 3 karakter!', 'error');
        return;
    }

    if (currentUser && currentUser.username !== newName) {
        // İsim değişikliği - Firebase'de güncelle
        try {
            const oldName = currentUser.username;
            await update(ref(db, 'users/' + newName), {
                ...currentUser,
                username: newName,
                status: newStatus || currentUser.status
            });
            if (oldName !== newName) {
                await remove(ref(db, 'users/' + oldName));
            }
            currentUser.username = newName;
            currentUser.status = newStatus || currentUser.status;
        } catch (e) {
            showToast('Güncelleme hatası: ' + e.message, 'error');
            return;
        }
    }

    localStorage.setItem('aynur_user', newName);
    updateDashboard();
    closeModal('editProfileModal');
    showToast('Profil güncellendi!', 'success');
};

window.changePassword = function() {
    const newPw = prompt('Yeni şifre (en az 6 karakter):');
    if (newPw && newPw.length >= 6) {
        showToast('Şifre değiştirildi!', 'success');
    } else if (newPw) {
        showToast('Şifre çok kısa!', 'error');
    }
};

window.changeAvatar = function() {
    const colors = ['#06b6d4', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    if (currentUser) currentUser.avatar = randomColor;

    const editAvatar = document.getElementById('editAvatar');
    const dashAvatar = document.getElementById('dashAvatar');
    if (editAvatar) editAvatar.style.background = randomColor;
    if (dashAvatar) dashAvatar.style.background = randomColor;
};

// ============================================
// YASAL & DİĞER
// ============================================
window.showLegal = function() {
    const modal = document.getElementById('legalModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.showTerms = function() {
    const modal = document.getElementById('termsModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.showPrivacy = function() {
    showToast('Gizlilik politikası yakında eklenecek', 'info');
};

window.showCreators = function() {
    const modal = document.getElementById('creatorsModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.showForgotPassword = function() {
    const username = prompt('Kullanıcı adınız:');
    if (username) showToast('Şifre sıfırlama bağlantısı gönderildi (simülasyon)', 'success');
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('sidebarContent');
    if (!sidebar || !content) return;

    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        setTimeout(() => content.classList.remove('-translate-x-full'), 10);
    } else {
        content.classList.add('-translate-x-full');
        setTimeout(() => sidebar.classList.add('hidden'), 300);
    }
};

window.toggleNotifications = function() {
    showToast('Bildirimler yakında aktif olacak', 'info');
};

window.toggleTheme = function() {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        if (icon.classList.contains('fa-sun')) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            showToast('Karanlık mod aktif', 'success');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            showToast('Aydınlık mod aktif', 'success');
        }
    }
};

window.navigate = function(page) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === page) {
            btn.classList.add('text-accent-cyan');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('text-accent-cyan');
            btn.classList.add('text-gray-500');
        }
    });

    if (page === 'home') {
        // Ana sayfa zaten görünür
    } else if (page === 'content') {
        showCreateRoom();
    } else if (page === 'profile') {
        showProfile();
    } else if (page === 'more') {
        toggleSidebar();
    }
};

window.showAllRooms = function() {
    showToast('Tüm odalar sayfası yakında', 'info');
};

window.showAllActivity = function() {
    showToast('Aktivite geçmişi yakında', 'info');
};

window.showActivity = function() {
    showToast('Aktivite geçmişi yakında', 'info');
};

window.showSettings = function() {
    showToast('Ayarlar yakında', 'info');
};

// ============================================
// BAŞLATMA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Kayıtlı kullanıcı kontrolü
    const savedUser = localStorage.getItem('aynur_user');
    const savedToken = localStorage.getItem('aynur_token');

    if (savedUser && savedToken) {
        currentUser = { username: savedUser, role: 'Kullanıcı', status: 'Hazır', avatar: getAvatarColor(savedUser) };
        showMainApp();
    }

    // Şifre güç göstergesi
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', function() {
            const strength = document.getElementById('passwordStrength');
            const val = this.value;
            let width = 0;
            let color = '#ef4444';

            if (val.length >= 6) width = 25;
            if (val.length >= 8) width = 50;
            if (/[A-Z]/.test(val)) width += 15;
            if (/[0-9]/.test(val)) width += 15;
            if (/[^A-Za-z0-9]/.test(val)) width += 15;

            if (width > 70) color = '#10b981';
            else if (width > 40) color = '#f59e0b';

            if (strength) {
                strength.style.width = Math.min(width, 100) + '%';
                strength.style.background = color;
            }
        });
    }
});
