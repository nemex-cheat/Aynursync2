import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, get, onDisconnect, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================
// FIREBASE AYARLARI - app.js ile AYNI OLMALI
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyYOUR-API-KEY-HERE",
    authDomain: "cupix369-watch.firebaseapp.com",
    databaseURL: "https://cupix369-watch-default-rtdb.firebaseio.com",
    projectId: "cupix369-watch",
    storageBucket: "cupix369-watch.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================
// GROQ API
// ============================================
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.1-8b-instant";

// ============================================
// URL PARAMS & STATE
// ============================================
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room') || localStorage.getItem('cupix_room');
const userName = urlParams.get('user') || localStorage.getItem('cupix_user') || 'Misafir' + Math.floor(Math.random() * 1000);

let isHost = false;
let roomData = null;
let video = null;
let isSyncing = false;
let lastSyncTime = 0;
let myColor = '#8b5cf6';

// ============================================
// BAŞLATMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    video = document.getElementById('videoPlayer');

    if (!roomCode) {
        alert('Oda kodu bulunamadı! Ana sayfaya yönlendiriliyorsunuz.');
        window.location.href = 'index.html';
        return;
    }

    // Kaydet
    localStorage.setItem('cupix_user', userName);
    localStorage.setItem('cupix_room', roomCode);
    myColor = getAvatarColor(userName);

    // Oda verilerini yükle
    await loadRoomData();

    // Senkronizasyon
    setupVideoSync();

    // Sohbet
    setupChat();

    // Online durumu
    setupPresence();

    // UI güncelle
    updateUI();

    // Klavye kısayolları
    setupKeyboard();
});

// ============================================
// ODA VERİLERİ
// ============================================
async function loadRoomData() {
    try {
        const snapshot = await get(ref(db, 'rooms/' + roomCode));
        if (!snapshot.exists()) {
            alert('Oda bulunamadı!');
            window.location.href = 'index.html';
            return;
        }

        roomData = snapshot.val();
        isHost = roomData.host === userName;

        document.getElementById('roomTitle').textContent = roomData.name || 'Oda';
        document.getElementById('roomCode').textContent = 'Kod: ' + roomCode;

        // Film varsa yükle
        if (roomData.movie && roomData.movie.startsWith('http')) {
            loadVideo(roomData.movie, roomData.movieName);
        }
    } catch (error) {
        console.error('Oda yükleme hatası:', error);
    }
}

// ============================================
// VİDEO SENKRONİZASYONU (Kritik Özellik)
// ============================================
function setupVideoSync() {
    const roomRef = ref(db, 'rooms/' + roomCode);

    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists() || !video || isSyncing) return;

        const data = snapshot.val();

        // Oynatma/Durdurma senkronizasyonu
        if (data.isPlaying !== undefined) {
            const shouldPlay = data.isPlaying;
            const currentlyPlaying = !video.paused;

            if (shouldPlay !== currentlyPlaying) {
                isSyncing = true;
                if (shouldPlay) {
                    video.play().catch(e => console.log('Play error:', e));
                } else {
                    video.pause();
                }
                updatePlayButton(!shouldPlay);
                setTimeout(() => { isSyncing = false; }, 800);
            }
        }

        // Zaman senkronizasyonu (3sn'den fazla fark varsa)
        if (data.currentTime !== undefined && video.duration) {
            const diff = Math.abs(video.currentTime - data.currentTime);
            if (diff > 3) {
                isSyncing = true;
                video.currentTime = data.currentTime;
                setTimeout(() => { isSyncing = false; }, 800);
            }
        }

        // Film bilgisi güncelle
        if (data.movieName) {
            document.getElementById('movieTitle').textContent = data.movieName;
        }
        if (data.movie) {
            document.getElementById('movieInfo').textContent = data.movie.startsWith('http') ? 'Yükleniyor...' : data.movie;
        }

        // İzleyici sayısı
        const viewers = data.viewers || {};
        const count = Object.keys(viewers).length;
        document.getElementById('viewerCount').textContent = count + ' izleyici';
    });

    // Host eventleri (sadece host gönderir, diğerleri dinler)
    video.addEventListener('play', () => {
        if (isHost && !isSyncing) {
            update(ref(db, 'rooms/' + roomCode), { 
                isPlaying: true, 
                currentTime: video.currentTime 
            });
        }
        updatePlayButton(false);
    });

    video.addEventListener('pause', () => {
        if (isHost && !isSyncing) {
            update(ref(db, 'rooms/' + roomCode), { 
                isPlaying: false, 
                currentTime: video.currentTime 
            });
        }
        updatePlayButton(true);
    });

    video.addEventListener('timeupdate', () => {
        // Host her 2 saniyede bir zaman gönderir
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
        if (video.duration) {
            document.getElementById('movieInfo').textContent = 'Süre: ' + formatTime(video.duration);
        }
    });

    video.addEventListener('waiting', () => {
        document.getElementById('movieInfo').textContent = 'Yükleniyor...';
    });

    video.addEventListener('canplay', () => {
        document.getElementById('movieInfo').textContent = 'Süre: ' + formatTime(video.duration);
    });
}

// ============================================
// VİDEO KONTROLLERİ
// ============================================
window.togglePlay = function() {
    if (!video) return;
    if (video.paused) {
        video.play().catch(e => console.log('Play error:', e));
    } else {
        video.pause();
    }
};

window.toggleMute = function() {
    if (!video) return;
    video.muted = !video.muted;
    const icon = document.getElementById('volumeIcon');
    if (icon) {
        icon.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
};

window.setVolume = function(val) {
    if (!video) return;
    video.volume = val / 100;
    if (video.volume > 0 && video.muted) {
        video.muted = false;
        const icon = document.getElementById('volumeIcon');
        if (icon) icon.className = 'fas fa-volume-up';
    }
};

window.skip = function(seconds) {
    if (!video || !video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    if (isHost) {
        update(ref(db, 'rooms/' + roomCode), { currentTime: video.currentTime });
    }
};

window.seek = function(e) {
    if (!video || !video.duration) return;
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
    if (isHost) {
        update(ref(db, 'rooms/' + roomCode), { currentTime: video.currentTime });
    }
};

window.toggleFullscreen = function() {
    const container = document.getElementById('videoContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
};

function updateProgress() {
    if (!video || !video.duration) return;
    const percent = (video.currentTime / video.duration) * 100;
    const fill = document.getElementById('progressFill');
    const timeDisplay = document.getElementById('timeDisplay');
    if (fill) fill.style.width = percent + '%';
    if (timeDisplay) timeDisplay.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
}

function updatePlayButton(isPaused) {
    const centerPlay = document.getElementById('centerPlay');
    const playIcon = document.getElementById('playIcon');
    if (centerPlay) centerPlay.style.display = isPaused ? 'flex' : 'none';
    if (playIcon) playIcon.className = isPaused ? 'fas fa-play text-xl' : 'fas fa-pause text-xl';
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// ============================================
// SOHBET SİSTEMİ
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
    const color = msg.color || getAvatarColor(msg.user);
    const time = msg.time ? new Date(msg.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';

    const div = document.createElement('div');
    div.className = 'chat-message mb-3 ' + (isMe ? 'text-right' : '');

    if (msg.isReaction) {
        // Emoji tepkisi
        div.innerHTML = `
            <div class="inline-flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}">
                ${!isMe ? `<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${color}">${msg.user[0].toUpperCase()}</div>` : ''}
                <div class="bg-dark-700 rounded-full px-3 py-1">
                    <span class="text-2xl">${msg.text}</span>
                </div>
                ${isMe ? `<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${color}">${msg.user[0].toUpperCase()}</div>` : ''}
            </div>
            <div class="text-xs text-gray-600 mt-1 ${isMe ? 'text-right' : ''}">${time}</div>
        `;
    } else {
        // Normal mesaj
        div.innerHTML = isMe ? `
            <div class="inline-block bg-accent-500 rounded-xl px-4 py-2 max-w-[85%] text-left">
                <p class="text-sm">${escapeHtml(msg.text)}</p>
                <span class="text-xs opacity-70 mt-1 block">${time}</span>
            </div>
        ` : `
            <div class="inline-flex items-start gap-2 max-w-[85%]">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1" style="background:${color}">${msg.user[0].toUpperCase()}</div>
                <div class="bg-dark-700 rounded-xl px-4 py-2 text-left">
                    <p class="text-xs font-semibold mb-1" style="color:${color}">${escapeHtml(msg.user)}</p>
                    <p class="text-sm">${escapeHtml(msg.text)}</p>
                    <span class="text-xs text-gray-500 mt-1 block">${time}</span>
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
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
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

        // Yüzen emoji göster
        showFloatingReaction(emoji);
    } catch (error) {
        console.error('Tepki hatası:', error);
    }
};

function showFloatingReaction(emoji) {
    const div = document.createElement('div');
    div.className = 'fixed text-5xl pointer-events-none z-50 reaction';
    div.style.left = (20 + Math.random() * 60) + '%';
    div.style.top = '40%';
    div.textContent = emoji;
    document.body.appendChild(div);

    div.animate([
        { transform: 'translateY(0) scale(0.5)', opacity: 0 },
        { transform: 'translateY(0) scale(1.2)', opacity: 1, offset: 0.2 },
        { transform: 'translateY(-150px) scale(1)', opacity: 0.8, offset: 0.6 },
        { transform: 'translateY(-300px) scale(0.5)', opacity: 0 }
    ], { 
        duration: 2500, 
        easing: 'ease-out' 
    }).onfinish = () => div.remove();
}

// ============================================
// ONLINE DURUMU
// ============================================
function setupPresence() {
    const userRef = ref(db, 'rooms/' + roomCode + '/viewers/' + userName);

    set(userRef, {
        joinedAt: Date.now(),
        color: myColor,
        online: true,
        lastSeen: Date.now()
    });

    // Çıkışta sil
    onDisconnect(userRef).remove();

    // Periyodik güncelleme
    setInterval(() => {
        update(userRef, { lastSeen: Date.now(), online: true });
    }, 15000);
}

// ============================================
// FİLM YÜKLEME & ARAMA
// ============================================
window.showLoadMovie = function() {
    const modal = document.getElementById('loadMovieModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.getElementById('movieSearch')?.focus();
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.searchMovie = async function() {
    const searchInput = document.getElementById('movieSearch');
    const query = searchInput?.value?.trim();
    if (!query) return;

    const searchBtn = document.querySelector('#loadMovieModal button[onclick="searchMovie()"]');
    if (searchBtn) {
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchBtn.disabled = true;
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Sen bir film arama motorusun. Kullanıcı bir film ismi verdiğinde, 
                        o film için yaygın bilinen direkt video/stream linklerini veya GitHub raw link formatını öner.
                        Eğer kesin link bilmiyorsan, film hakkında kısa bilgi ver ve kullanıcıya 
                        "Direkt bir MP4/M3U8 linki girin" de. JSON formatında cevap verme, düz metin ver.
                        Film ismi: ${query}`
                    },
                    { role: "user", content: `"${query}" filmi için direkt video linki veya stream bilgisi ver. Varsa GitHub raw linki öner.` }
                ],
                temperature: 0.3,
                max_tokens: 512
            })
        });

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content || 'Film bulunamadı.';

        // Link varsa URL alanına koy
        const urlMatch = result.match(/https?://[^\s<>"']+/);
        if (urlMatch) {
            const urlInput = document.getElementById('movieUrl');
            if (urlInput) urlInput.value = urlMatch[0];
        }

        // Sonuçları göster
        const resultsDiv = document.getElementById('searchResults');
        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
            resultsDiv.innerHTML = `
                <div class="bg-dark-800 rounded-lg p-3 border border-accent-500/30">
                    <p class="text-sm text-accent-400 font-semibold mb-1"><i class="fas fa-robot mr-1"></i>AI Arama Sonucu:</p>
                    <p class="text-sm text-gray-300 leading-relaxed">${escapeHtml(result)}</p>
                    ${urlMatch ? '<p class="text-xs text-green-400 mt-2"><i class="fas fa-check mr-1"></i>Link URL alanına eklendi</p>' : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Film arama hatası:', error);
        const resultsDiv = document.getElementById('searchResults');
        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
            resultsDiv.innerHTML = `
                <div class="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                    <p class="text-sm text-red-400"><i class="fas fa-exclamation-triangle mr-1"></i>Arama hatası: ${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    if (searchBtn) {
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        searchBtn.disabled = false;
    }
};

window.loadMovie = async function() {
    const urlInput = document.getElementById('movieUrl');
    const nameInput = document.getElementById('movieSearch');

    const url = urlInput?.value?.trim();
    const name = nameInput?.value?.trim() || 'Film';

    if (!url) {
        alert('Lütfen bir video linki girin! (MP4, M3U8, GitHub Raw vb.)');
        return;
    }

    if (!url.startsWith('http')) {
        alert('Geçerli bir URL girin (http:// veya https:// ile başlamalı)');
        return;
    }

    try {
        await update(ref(db, 'rooms/' + roomCode), {
            movie: url,
            movieName: name,
            isPlaying: false,
            currentTime: 0
        });

        loadVideo(url, name);
        closeModal('loadMovieModal');

        // Bildirim gönder
        await push(ref(db, 'rooms/' + roomCode + '/messages'), {
            user: 'Sistem',
            text: `🎬 "${name}" filmi yüklendi!`,
            color: '#10b981',
            time: Date.now()
        });
    } catch (error) {
        alert('Film yüklenirken hata: ' + error.message);
    }
};

function loadVideo(url, name) {
    if (!video) return;

    video.src = url;
    video.load();

    document.getElementById('movieTitle').textContent = name || 'Film';
    document.getElementById('movieInfo').textContent = 'Yükleniyor...';

    const centerPlay = document.getElementById('centerPlay');
    if (centerPlay) centerPlay.style.display = 'flex';
}

window.syncNow = function() {
    if (!roomData || !video) return;

    isSyncing = true;

    if (roomData.currentTime !== undefined) {
        video.currentTime = roomData.currentTime;
    }

    if (roomData.isPlaying) {
        video.play().catch(() => {});
    } else {
        video.pause();
    }

    updatePlayButton(!roomData.isPlaying);

    setTimeout(() => { isSyncing = false; }, 1000);

    // Bildirim
    showToast('Senkronize edildi!');
};

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-accent-500 text-white px-6 py-3 rounded-xl z-50 shadow-lg';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// DAVET LİNKİ
// ============================================
window.copyInviteLink = function() {
    const baseUrl = window.location.origin + window.location.pathname.replace('watch.html', '');
    const link = baseUrl + 'watch.html?room=' + roomCode;

    const codeEl = document.getElementById('inviteCode');
    const linkEl = document.getElementById('inviteLink');

    if (codeEl) codeEl.textContent = roomCode;
    if (linkEl) linkEl.textContent = link;

    const modal = document.getElementById('inviteModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.copyToClipboard = function() {
    const linkEl = document.getElementById('inviteLink');
    if (!linkEl) return;

    const link = linkEl.textContent;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('Davet linki kopyalandı!');
            closeModal('inviteModal');
        }).catch(() => {
            fallbackCopy(link);
        });
    } else {
        fallbackCopy(link);
    }
};

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showToast('Davet linki kopyalandı!');
        closeModal('inviteModal');
    } catch (err) {
        alert('Kopyalama başarısız. Link: ' + text);
    }

    document.body.removeChild(textarea);
}

// ============================================
// KLAVYE KISAYOLLARI
// ============================================
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'arrowleft':
                e.preventDefault();
                skip(-5);
                break;
            case 'arrowright':
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
// YARDIMCI FONKSİYONLAR
// ============================================
function getAvatarColor(name) {
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateUI() {
    // Ek UI güncellemeleri
}
