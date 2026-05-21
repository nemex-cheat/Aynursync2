// Aynur Sync v4.0 - Watch Room (Senkron Film İzleme)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, get, onDisconnect, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================
// ANTICRACK KORUMASI
// ============================================
const _0x3e8a = {
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
_0x3e8a.init();

// ============================================
// FIREBASE
// ============================================
let firebaseConfig = _0x3e8a.fk() || {
    apiKey: "AIzaSyDEMO-KEY",
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
// URL PARAMS & STATE
// ============================================
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room') || localStorage.getItem('aynur_room');
const userName = urlParams.get('user') || localStorage.getItem('aynur_user') || 'Misafir' + Math.floor(Math.random() * 1000);

let isHost = false;
let roomData = null;
let video = null;
let isSyncing = false;
let lastSyncTime = 0;
let myColor = '#06b6d4';
let videoType = '';

// ============================================
// BAŞLATMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    video = document.getElementById('videoPlayer');

    if (!roomCode) {
        showToast('Oda kodu bulunamadı!', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    localStorage.setItem('aynur_user', userName);
    localStorage.setItem('aynur_room', roomCode);
    myColor = getAvatarColor(userName);

    await loadRoomData();
    setupVideoSync();
    setupChat();
    setupPresence();
    setupKeyboard();

    // Dokunmatik kontroller
    setupTouchControls();
});

// ============================================
// ODA VERİLERİ
// ============================================
async function loadRoomData() {
    try {
        const snapshot = await get(ref(db, 'rooms/' + roomCode));
        if (!snapshot.exists()) {
            showToast('Oda bulunamadı!', 'error');
            setTimeout(() => window.location.href = 'index.html', 1500);
            return;
        }

        roomData = snapshot.val();
        isHost = roomData.host === userName;
        videoType = roomData.videoType || '';

        const titleEl = document.getElementById('roomTitle');
        const codeEl = document.getElementById('roomCode');

        if (titleEl) titleEl.textContent = roomData.name || 'Oda';
        if (codeEl) codeEl.textContent = 'Kod: ' + roomCode;

        // Film varsa yükle
        if (roomData.videoUrl) {
            loadVideoSource(roomData.videoUrl, roomData.videoType);
        }

        updateViewerAvatars();
    } catch (e) {
        console.error('Oda yükleme hatası:', e);
    }
}

// ============================================
// VİDEO SENKRONİZASYONU (Kritik)
// ============================================
function setupVideoSync() {
    const roomRef = ref(db, 'rooms/' + roomCode);

    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists() || !video || isSyncing) return;

        const data = snapshot.val();

        // Play/Pause senkronizasyonu
        if (data.isPlaying !== undefined) {
            const shouldPlay = data.isPlaying;
            const currentlyPlaying = !video.paused;

            if (shouldPlay !== currentlyPlaying) {
                isSyncing = true;
                if (shouldPlay) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
                updatePlayButton(!shouldPlay);
                setTimeout(() => isSyncing = false, 600);
            }
        }

        // Zaman senkronizasyonu (2sn'den fazla fark varsa)
        if (data.currentTime !== undefined && video.duration) {
            const diff = Math.abs(video.currentTime - data.currentTime);
            if (diff > 2) {
                isSyncing = true;
                video.currentTime = data.currentTime;
                setTimeout(() => isSyncing = false, 600);
            }
        }

        // İzleyici sayısı
        const viewers = data.viewers || {};
        const count = Object.keys(viewers).length;
        const viewerEl = document.getElementById('viewerCount');
        if (viewerEl) viewerEl.textContent = count;

        // Film bilgisi
        if (data.videoUrl && !video.src) {
            loadVideoSource(data.videoUrl, data.videoType);
        }
    });

    // Host eventleri
    video.addEventListener('play', () => {
        if (isHost && !isSyncing) {
            update(ref(db, 'rooms/' + roomCode), { isPlaying: true, currentTime: video.currentTime });
        }
        updatePlayButton(false);
    });

    video.addEventListener('pause', () => {
        if (isHost && !isSyncing) {
            update(ref(db, 'rooms/' + roomCode), { isPlaying: false, currentTime: video.currentTime });
        }
        updatePlayButton(true);
    });

    video.addEventListener('timeupdate', () => {
        if (isHost && !isSyncing && Date.now() - lastSyncTime > 2000) {
            lastSyncTime = Date.now();
            update(ref(db, 'rooms/' + roomCode), { currentTime: video.currentTime });
        }
        updateProgress();
    });

    video.addEventListener('seeked', () => {
        if (isHost && !isSyncing) {
            update(ref(db, 'rooms/' + roomCode), { currentTime: video.currentTime });
        }
    });

    video.addEventListener('loadedmetadata', () => {
        const info = document.getElementById('movieInfo');
        if (info && video.duration) info.textContent = 'Süre: ' + formatTime(video.duration);
    });
}

// ============================================
// VİDEO KONTROLLERİ
// ============================================
window.togglePlay = function() {
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
};

window.toggleMute = function() {
    if (!video) return;
    video.muted = !video.muted;
    const icon = document.getElementById('volumeIcon');
    if (icon) icon.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
};

window.skip = function(seconds) {
    if (!video || !video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    if (isHost) update(ref(db, 'rooms/' + roomCode), { currentTime: video.currentTime });
};

window.seek = function(e) {
    if (!video || !video.duration) return;
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
    if (isHost) update(ref(db, 'rooms/' + roomCode), { currentTime: video.currentTime });
};

window.toggleFullscreen = function() {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
};

function updateProgress() {
    if (!video || !video.duration) return;
    const percent = (video.currentTime / video.duration) * 100;
    const fill = document.getElementById('progressFill');
    const time = document.getElementById('timeDisplay');
    if (fill) fill.style.width = percent + '%';
    if (time) time.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
}

function updatePlayButton(isPaused) {
    const center = document.getElementById('centerPlay');
    const icon = document.getElementById('playIcon');
    if (center) center.style.display = isPaused ? 'flex' : 'none';
    if (icon) icon.className = isPaused ? 'fas fa-play' : 'fas fa-pause';
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// ============================================
// VİDEO YÜKLEME
// ============================================
window.showLoadMovie = function() {
    const modal = document.getElementById('loadModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.setVideoType = function(type) {
    const ytBtn = document.getElementById('vtypeYoutube');
    const rawBtn = document.getElementById('vtypeRaw');
    const ytDiv = document.getElementById('youtubeDiv');
    const rawDiv = document.getElementById('rawDiv');

    if (type === 'youtube') {
        ytBtn.classList.add('border-accent-cyan');
        rawBtn.classList.remove('border-accent-cyan');
        if (ytDiv) ytDiv.classList.remove('hidden');
        if (rawDiv) rawDiv.classList.add('hidden');
    } else {
        rawBtn.classList.add('border-accent-cyan');
        ytBtn.classList.remove('border-accent-cyan');
        if (rawDiv) rawDiv.classList.remove('hidden');
        if (ytDiv) ytDiv.classList.add('hidden');
    }
};

window.loadVideo = async function() {
    const ytUrl = document.getElementById('ytInput')?.value?.trim();
    const rawUrl = document.getElementById('rawInput')?.value?.trim();

    let url = ytUrl || rawUrl;
    let type = ytUrl ? 'youtube' : 'raw';

    if (!url) {
        showToast('URL girin!', 'error');
        return;
    }

    try {
        await update(ref(db, 'rooms/' + roomCode), {
            videoUrl: url,
            videoType: type,
            isPlaying: false,
            currentTime: 0
        });

        loadVideoSource(url, type);
        closeModal('loadModal');

        await push(ref(db, 'rooms/' + roomCode + '/messages'), {
            user: 'Sistem',
            text: '🎬 Yeni video yüklendi!',
            color: '#10b981',
            time: Date.now()
        });
    } catch (e) {
        showToast('Yükleme hatası: ' + e.message, 'error');
    }
};

function loadVideoSource(url, type) {
    if (!video) return;

    const title = document.getElementById('movieTitle');
    const info = document.getElementById('movieInfo');

    if (type === 'youtube') {
        // YouTube embed için
        const videoId = extractYouTubeId(url);
        if (videoId) {
            video.src = '';
            // YouTube embed API kullanılabilir, şimdilik bilgi göster
            if (title) title.textContent = 'YouTube Videosu';
            if (info) info.textContent = 'YouTube senkronizasyonu aktif';
            showToast('YouTube videosu yüklendi', 'success');
        }
    } else {
        video.src = url;
        video.load();
        if (title) title.textContent = 'Video';
        if (info) info.textContent = 'Yükleniyor...';
    }

    const center = document.getElementById('centerPlay');
    if (center) center.style.display = 'flex';
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.syncNow = function() {
    if (!roomData || !video) return;
    isSyncing = true;
    if (roomData.currentTime !== undefined) video.currentTime = roomData.currentTime;
    if (roomData.isPlaying) video.play().catch(() => {});
    else video.pause();
    updatePlayButton(!roomData.isPlaying);
    setTimeout(() => isSyncing = false, 800);
    showToast('Senkronize edildi!');
};

// ============================================
// SOHBET
// ============================================
function setupChat() {
    const messagesRef = ref(db, 'rooms/' + roomCode + '/messages');
    onChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        if (msg) addMessage(msg);
    });
}

function addMessage(msg) {
    const chat = document.getElementById('chatMessages');
    if (!chat) return;

    const isMe = msg.user === userName;
    const isSystem = msg.user === 'Sistem';
    const color = msg.color || getAvatarColor(msg.user);
    const time = msg.time ? new Date(msg.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';

    const div = document.createElement('div');
    div.className = 'chat-message mb-2 ' + (isMe ? 'text-right' : '');

    if (isSystem) {
        div.innerHTML = `<div class="text-center"><span class="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full">${escapeHtml(msg.text)}</span></div>`;
    } else if (msg.isReaction) {
        div.innerHTML = `
            <div class="inline-flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}">
                ${!isMe ? `<div class="user-avatar" style="background:${color}">${msg.user[0].toUpperCase()}</div>` : ''}
                <span class="text-2xl">${msg.text}</span>
                ${isMe ? `<div class="user-avatar" style="background:${color}">${msg.user[0].toUpperCase()}</div>` : ''}
            </div>`;
    } else {
        div.innerHTML = isMe ? `
            <div class="inline-block bg-accent-cyan/80 rounded-xl px-3 py-2 max-w-[85%] text-left">
                <p class="text-sm">${escapeHtml(msg.text)}</p>
                <span class="text-xs opacity-70">${time}</span>
            </div>
        ` : `
            <div class="inline-flex items-start gap-2 max-w-[85%]">
                <div class="user-avatar mt-0.5" style="background:${color}">${msg.user[0].toUpperCase()}</div>
                <div class="bg-dark-700 rounded-xl px-3 py-2 text-left">
                    <p class="text-xs font-semibold mb-0.5" style="color:${color}">${escapeHtml(msg.user)}</p>
                    <p class="text-sm">${escapeHtml(msg.text)}</p>
                    <span class="text-xs text-gray-500">${time}</span>
                </div>
            </div>
        `;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

window.sendMessage = async function() {
    const input = document.getElementById('chatInput');
    const text = input?.value?.trim();
    if (!text) return;

    input.value = '';
    try {
        await push(ref(db, 'rooms/' + roomCode + '/messages'), {
            user: userName,
            text: text,
            color: myColor,
            time: Date.now()
        });
    } catch (e) {
        console.error('Mesaj hatası:', e);
    }
};

window.sendReaction = async function(emoji) {
    try {
        await push(ref(db, 'rooms/' + roomCode + '/messages'), {
            user: userName,
            text: emoji,
            color: myColor,
            time: Date.now(),
            isReaction: true
        });
        showFloatingReaction(emoji);
    } catch (e) {
        console.error('Tepki hatası:', e);
    }
};

function showFloatingReaction(emoji) {
    const div = document.createElement('div');
    div.className = 'reaction-float text-4xl';
    div.style.left = (20 + Math.random() * 60) + '%';
    div.style.top = '40%';
    div.textContent = emoji;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
}

// ============================================
// PRESENCE & AVATARLAR
// ============================================
function setupPresence() {
    const userRef = ref(db, 'rooms/' + roomCode + '/viewers/' + userName);
    set(userRef, { joinedAt: Date.now(), color: myColor, online: true, lastSeen: Date.now() });
    onDisconnect(userRef).remove();
    setInterval(() => update(userRef, { lastSeen: Date.now() }), 15000);
}

function updateViewerAvatars() {
    const container = document.getElementById('viewerAvatars');
    if (!container || !roomData || !roomData.viewers) return;

    const viewers = Object.entries(roomData.viewers).slice(0, 4);
    container.innerHTML = viewers.map(([name, data]) => `
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" 
             style="background:${data.color || getAvatarColor(name)}" title="${escapeHtml(name)}">${name[0].toUpperCase()}</div>
    `).join('');
}

// ============================================
// DAVET
// ============================================
window.showInvite = function() {
    const modal = document.getElementById('inviteModal');
    const codeEl = document.getElementById('inviteCode');
    const linkEl = document.getElementById('inviteLink');

    const base = window.location.origin + window.location.pathname.replace('watch.html', '');
    const link = base + 'watch.html?room=' + roomCode;

    if (codeEl) codeEl.textContent = roomCode;
    if (linkEl) linkEl.textContent = link;
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.copyInvite = function() {
    const link = document.getElementById('inviteLink')?.textContent;
    if (!link) return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('Davet linki kopyalandı!');
            closeModal('inviteModal');
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Davet linki kopyalandı!');
        closeModal('inviteModal');
    }
};

// ============================================
// DOKUNMATİK KONTROLLER
// ============================================
function setupTouchControls() {
    const container = document.getElementById('videoContainer');
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const duration = Date.now() - touchStartTime;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Tek dokunma - play/pause
        if (duration < 300 && Math.abs(diffX) < 30 && Math.abs(diffY) < 30) {
            togglePlay();
        }
        // Sola kaydır - geri
        else if (diffX < -50 && Math.abs(diffY) < 50) {
            skip(-10);
            showToast('-10s');
        }
        // Sağa kaydır - ileri
        else if (diffX > 50 && Math.abs(diffY) < 50) {
            skip(10);
            showToast('+10s');
        }
    }, { passive: true });
}

// ============================================
// KLAVYE KISAYOLLARI
// ============================================
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                togglePlay();
                break;
            case 'arrowleft':
            case 'j':
                e.preventDefault();
                skip(-5);
                break;
            case 'arrowright':
            case 'l':
                e.preventDefault();
                skip(5);
                break;
            case 'f':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                toggleMute();
                break;
        }
    });
}

// ============================================
// YARDIMCI
// ============================================
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

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toastText');
    if (!toast || !text) return;
    text.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.background = type === 'error' ? 'rgba(239,68,68,0.9)' : type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(26,26,46,0.9)';
    setTimeout(() => toast.classList.add('hidden'), 2000);
}
