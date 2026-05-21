// Firebase v10 Compat Mode - Daha stabil tarayıcı desteği
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, onChildAdded, update, remove, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================
// FIREBASE AYARLARI - BUNU KENDİ FIREBASE'İN İLE DEĞİŞTİR
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

// Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================
// GROQ API - SENİN API KEY'İN
// ============================================
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.1-8b-instant";

// State
let currentUser = localStorage.getItem('cupix_user') || null;
let rooms = [];
let aiChatHistory = [];

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getAvatarColor(name) {
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// NAVIGASYON
// ============================================
window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
        if (sectionId === 'rooms') loadAllRooms();
    }
};

// ============================================
// MODALLAR
// ============================================
window.showCreateRoom = function() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.showJoinRoom = function() {
    const modal = document.getElementById('joinModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.togglePassword = function() {
    const isPrivate = document.getElementById('isPrivate')?.checked || false;
    const field = document.getElementById('passwordField');
    if (field) {
        field.classList.toggle('hidden', !isPrivate);
    }
};

// ============================================
// ODA OLUŞTURMA
// ============================================
window.createRoom = async function() {
    const nameInput = document.getElementById('roomName');
    const hostInput = document.getElementById('hostName');
    const movieInput = document.getElementById('roomMovie');
    const isPrivateInput = document.getElementById('isPrivate');
    const passwordInput = document.getElementById('roomPassword');

    const name = nameInput?.value?.trim();
    const hostName = hostInput?.value?.trim();
    const movie = movieInput?.value?.trim() || '';
    const isPrivate = isPrivateInput?.checked || false;
    const password = isPrivate ? (passwordInput?.value || '') : '';

    if (!name || !hostName) {
        alert('Oda adı ve kullanıcı adı zorunlu!');
        return;
    }

    const code = generateCode();
    const roomData = {
        name: name,
        code: code,
        host: hostName,
        movie: movie,
        movieName: movie ? movie.split('/').pop().replace(/\.[^/.]+$/, '') : '',
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
    };

    try {
        await set(ref(db, 'rooms/' + code), roomData);

        localStorage.setItem('cupix_user', hostName);
        localStorage.setItem('cupix_room', code);

        window.location.href = `watch.html?room=${code}&user=${encodeURIComponent(hostName)}`;
    } catch (error) {
        console.error('Oda oluşturma hatası:', error);
        alert('Oda oluşturulurken hata: ' + error.message);
    }
};

// ============================================
// ODAYA KATILMA
// ============================================
window.joinRoom = async function() {
    const nameInput = document.getElementById('joinName');
    const codeInput = document.getElementById('joinCode');
    const passwordInput = document.getElementById('joinPassword');

    let userName = nameInput?.value?.trim();
    let code = codeInput?.value?.trim()?.toUpperCase();

    // Davet linkinden kod çıkarma
    if (code && code.includes('?room=')) {
        try {
            const url = new URL(code);
            code = url.searchParams.get('room') || code;
        } catch (e) {
            // URL değilse regex ile dene
            const match = code.match(/[?&]room=([A-Z0-9]+)/i);
            if (match) code = match[1].toUpperCase();
        }
    }

    if (!userName || !code) {
        alert('Kullanıcı adı ve oda kodu zorunlu!');
        return;
    }

    try {
        const snapshot = await get(ref(db, 'rooms/' + code));
        if (!snapshot.exists()) {
            alert('Oda bulunamadı! Kodu kontrol et.');
            return;
        }

        const room = snapshot.val();

        // Şifre kontrolü
        if (room.isPrivate) {
            const password = passwordInput?.value || '';
            if (password !== room.password) {
                alert('Şifre yanlış!');
                return;
            }
        }

        // Kullanıcıyı odaya ekle
        await update(ref(db, 'rooms/' + code + '/viewers/' + userName), {
            joinedAt: Date.now(),
            color: getAvatarColor(userName),
            online: true
        });

        localStorage.setItem('cupix_user', userName);
        localStorage.setItem('cupix_room', code);

        window.location.href = `watch.html?room=${code}&user=${encodeURIComponent(userName)}`;
    } catch (error) {
        console.error('Katılma hatası:', error);
        alert('Odaya katılırken hata: ' + error.message);
    }
};

// ============================================
// HIZLI KATILIM
// ============================================
window.quickJoin = async function() {
    const codeInput = document.getElementById('quickCode');
    const code = codeInput?.value?.trim()?.toUpperCase();

    if (!code) {
        alert('Oda kodu gir!');
        return;
    }

    const userName = prompt('Kullanıcı adın:')?.trim() || 'Misafir' + Math.floor(Math.random() * 1000);

    try {
        const snapshot = await get(ref(db, 'rooms/' + code));
        if (!snapshot.exists()) {
            alert('Oda bulunamadı!');
            return;
        }

        const room = snapshot.val();
        if (room.isPrivate) {
            const password = prompt('Oda şifresi:');
            if (password !== room.password) {
                alert('Şifre yanlış!');
                return;
            }
        }

        await update(ref(db, 'rooms/' + code + '/viewers/' + userName), {
            joinedAt: Date.now(),
            color: getAvatarColor(userName),
            online: true
        });

        localStorage.setItem('cupix_user', userName);
        localStorage.setItem('cupix_room', code);
        window.location.href = `watch.html?room=${code}&user=${encodeURIComponent(userName)}`;
    } catch (error) {
        alert('Hata: ' + error.message);
    }
};

// ============================================
// ODA LİSTESİ
// ============================================
function loadRooms() {
    const roomsRef = ref(db, 'rooms');
    onValue(roomsRef, (snapshot) => {
        rooms = [];
        const data = snapshot.val();
        if (data) {
            Object.entries(data).forEach(([code, room]) => {
                if (room.isActive !== false) {
                    rooms.push({ code, ...room });
                }
            });
            // Son oluşturulanlar önce
            rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        displayRooms(rooms.slice(0, 6));
    });
}

function displayRooms(roomList) {
    const container = document.getElementById('roomsList');
    if (!container) return;

    if (roomList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-film text-6xl text-dark-600 mb-4"></i>
                <p class="text-gray-500 text-lg">Aktif oda yok. İlk sen kur! 🎬</p>
            </div>
        `;
        return;
    }

    container.innerHTML = roomList.map(room => {
        const viewerCount = room.viewers ? Object.keys(room.viewers).length : 0;
        const isPlaying = room.isPlaying ? 
            '<span class="text-green-400 text-xs flex items-center gap-1"><span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Şu an izleniyor</span>' : 
            '<span class="text-gray-500 text-xs">○ Bekliyor</span>';
        const lockIcon = room.isPrivate ? '<i class="fas fa-lock text-yellow-500 ml-2" title="Şifreli Oda"></i>' : '';

        const viewerAvatars = Object.entries(room.viewers || {}).slice(0, 5).map(([name, data]) => `
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" 
                 style="background:${data.color || getAvatarColor(name)}" title="${escapeHtml(name)}">
                ${name[0].toUpperCase()}
            </div>
        `).join('');

        return `
            <div class="room-card glass rounded-2xl p-5 cursor-pointer hover:border-accent-400 transition-all" 
                 onclick="joinRoomByCode('${room.code}')">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <h3 class="font-bold text-lg">${escapeHtml(room.name)}</h3>
                        ${lockIcon}
                    </div>
                    <span class="text-xs bg-dark-700 px-2 py-1 rounded font-mono">${room.code}</span>
                </div>
                <p class="text-gray-400 text-sm mb-3">
                    ${room.movieName || room.movie ? '🎬 ' + escapeHtml((room.movieName || room.movie).substring(0, 35)) + '...' : 'Film seçilmedi'}
                </p>
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-users text-accent-400 text-sm"></i>
                        <span class="text-sm">${viewerCount} izleyici</span>
                    </div>
                    ${isPlaying}
                </div>
                <div class="flex gap-1 mt-2">
                    ${viewerAvatars}
                    ${viewerCount > 5 ? `<div class="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs">+${viewerCount - 5}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.joinRoomByCode = async function(code) {
    const userName = prompt('Kullanıcı adın:')?.trim() || 'Misafir' + Math.floor(Math.random() * 1000);

    try {
        const snapshot = await get(ref(db, 'rooms/' + code));
        if (!snapshot.exists()) {
            alert('Oda bulunamadı!');
            return;
        }

        const room = snapshot.val();
        if (room.isPrivate) {
            const password = prompt('Oda şifresi:');
            if (password !== room.password) {
                alert('Şifre yanlış!');
                return;
            }
        }

        await update(ref(db, 'rooms/' + code + '/viewers/' + userName), {
            joinedAt: Date.now(),
            color: getAvatarColor(userName),
            online: true
        });

        localStorage.setItem('cupix_user', userName);
        localStorage.setItem('cupix_room', code);
        window.location.href = `watch.html?room=${code}&user=${encodeURIComponent(userName)}`;
    } catch (error) {
        alert('Hata: ' + error.message);
    }
};

function loadAllRooms() {
    const container = document.getElementById('allRoomsList');
    if (!container) return;

    if (rooms.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Henüz oda yok</div>';
        return;
    }

    container.innerHTML = rooms.map(room => {
        const viewerCount = room.viewers ? Object.keys(room.viewers).length : 0;
        return `
            <div class="room-card glass rounded-2xl p-5 cursor-pointer" onclick="joinRoomByCode('${room.code}')">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="font-bold text-lg">${escapeHtml(room.name)}${room.isPrivate ? '<i class="fas fa-lock text-yellow-500 ml-2"></i>' : ''}</h3>
                    <span class="text-xs bg-dark-700 px-2 py-1 rounded font-mono">${room.code}</span>
                </div>
                <p class="text-gray-400 text-sm mb-2">${room.movieName || room.movie ? '🎬 ' + escapeHtml((room.movieName || room.movie).substring(0, 30)) : 'Film seçilmedi'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-sm"><i class="fas fa-users text-accent-400 mr-1"></i>${viewerCount} izleyici</span>
                    ${room.isPlaying ? '<span class="text-green-400 text-xs">● İzleniyor</span>' : '<span class="text-gray-500 text-xs">○ Bekliyor</span>'}
                </div>
            </div>
        `;
    }).join('');
}

window.filterRooms = function(type) {
    let filtered = rooms;
    if (type === 'public') filtered = rooms.filter(r => !r.isPrivate);
    if (type === 'private') filtered = rooms.filter(r => r.isPrivate);
    if (type === 'active') filtered = rooms.filter(r => r.isPlaying);

    const container = document.getElementById('allRoomsList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Bu kategoride oda yok</div>';
        return;
    }

    container.innerHTML = filtered.map(room => {
        const viewerCount = room.viewers ? Object.keys(room.viewers).length : 0;
        return `
            <div class="room-card glass rounded-2xl p-5 cursor-pointer" onclick="joinRoomByCode('${room.code}')">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="font-bold text-lg">${escapeHtml(room.name)}${room.isPrivate ? '<i class="fas fa-lock text-yellow-500 ml-2"></i>' : ''}</h3>
                    <span class="text-xs bg-dark-700 px-2 py-1 rounded font-mono">${room.code}</span>
                </div>
                <p class="text-gray-400 text-sm mb-2">${room.movieName || room.movie ? '🎬 ' + escapeHtml((room.movieName || room.movie).substring(0, 30)) : 'Film seçilmedi'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-sm"><i class="fas fa-users text-accent-400 mr-1"></i>${viewerCount} izleyici</span>
                    ${room.isPlaying ? '<span class="text-green-400 text-xs">● İzleniyor</span>' : '<span class="text-gray-500 text-xs">○ Bekliyor</span>'}
                </div>
            </div>
        `;
    }).join('');
};

window.refreshRooms = function() {
    loadRooms();
};

// ============================================
// AI FILM ÖNERİ (GROQ API)
// ============================================
window.setAIQuery = function(query) {
    const input = document.getElementById('aiQuery');
    if (input) {
        input.value = query;
        askAI();
    }
};

window.askAI = async function() {
    const input = document.getElementById('aiQuery');
    const query = input?.value?.trim();
    if (!query) return;

    const chat = document.getElementById('aiChat');
    const btn = document.getElementById('aiBtn');

    if (!chat || !btn) return;

    // Kullanıcı mesajı ekle
    chat.innerHTML += `
        <div class="flex items-start gap-3 mb-4 justify-end chat-message">
            <div class="bg-accent-500 rounded-xl p-4 max-w-[80%]">
                <p class="text-sm">${escapeHtml(query)}</p>
            </div>
            <div class="w-10 h-10 bg-dark-600 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user text-white"></i>
            </div>
        </div>
    `;

    input.value = '';
    btn.innerHTML = '<div class="flex gap-1"><div class="w-2 h-2 bg-white rounded-full animate-bounce"></div><div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay:0.1s"></div><div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay:0.2s"></div></div>';
    btn.disabled = true;
    chat.scrollTop = chat.scrollHeight;

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
                        content: `Sen bir film uzmanısın. Kullanıcılara film önerileri yap, film hakkında detaylı bilgi ver, tür analizi yap. 
                        Türkçe cevap ver. Film isimlerini **kalın** yap. Kısa ve öz ol ama bilgilendirici ol. 
                        Emoji kullan. Eğer kullanıcı film ismi sorduysa, o film hakkında yönetmen, oyuncular, konusu, puanı gibi bilgiler ver.
                        Film önerisi istediyse, 3-5 film öner ve neden önerdiğini kısaca açıkla.`
                    },
                    { role: "user", content: query }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            throw new Error('API Hatası: ' + response.status);
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || 'Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar dene.';

        // Markdown benzeri formatlamayı HTML'e çevir
        let formattedResponse = escapeHtml(aiResponse)
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-400">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-dark-800 px-1 rounded">$1</code>')
            .replace(/\n/g, '<br>');

        chat.innerHTML += `
            <div class="flex items-start gap-3 mb-4 chat-message">
                <div class="w-10 h-10 bg-gradient-to-br from-accent-400 to-neon-pink rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white"></i>
                </div>
                <div class="bg-dark-700 rounded-xl p-4 max-w-[80%]">
                    <div class="text-sm leading-relaxed">${formattedResponse}</div>
                </div>
            </div>
        `;

        // Chat geçmişine ekle
        aiChatHistory.push({ user: query, ai: aiResponse });
    } catch (error) {
        console.error('AI Hatası:', error);
        chat.innerHTML += `
            <div class="flex items-start gap-3 mb-4 chat-message">
                <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-exclamation text-white"></i>
                </div>
                <div class="bg-red-500/20 border border-red-500/50 rounded-xl p-4 max-w-[80%]">
                    <p class="text-sm">Hata oluştu: ${escapeHtml(error.message)}. Lütfen tekrar dene.</p>
                </div>
            </div>
        `;
    }

    btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    btn.disabled = false;
    chat.scrollTop = chat.scrollHeight;
};

// ============================================
// BAŞLATMA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadRooms();

    const savedUser = localStorage.getItem('cupix_user');
    if (savedUser) {
        const badge = document.getElementById('userBadge');
        const username = document.getElementById('username');
        if (badge && username) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
            username.textContent = savedUser;
        }
    }

    // Enter tuşu desteği
    document.getElementById('aiQuery')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') askAI();
    });
});
