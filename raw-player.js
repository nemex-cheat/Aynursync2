/* Aynur Sync Raw Player v4.1 - Video Sync Fix */

var RAW_VIDEO_SLOTS = [
    { id: 1, name: 'Film 1', url: '', thumb: '🎬' },
    { id: 2, name: 'Film 2', url: '', thumb: '🎥' },
    { id: 3, name: 'Film 3', url: '', thumb: '📽️' },
    { id: 4, name: 'Film 4', url: '', thumb: '🎞️' },
    { id: 5, name: 'Film 5', url: '', thumb: '🍿' },
    { id: 6, name: 'Film 6', url: '', thumb: '🎬' },
    { id: 7, name: 'Film 7', url: '', thumb: '🎥' },
    { id: 8, name: 'Film 8', url: '', thumb: '📽️' },
    { id: 9, name: 'Film 9', url: '', thumb: '🎞️' },
    { id: 10, name: 'Film 10', url: '', thumb: '🍿' }
];

var rawDb = null;
var rawRoomRef = null;
var rawMessagesRef = null;
var rawPresenceRef = null;
var rawMyPresence = null;
var rawRoomId = '';
var rawUser = '';
var currentRawVideo = null;
var RAW_MAX_MESSAGES = 5;
var RAW_SESSION_KEY = 'aynursync_raw_session';

document.addEventListener('DOMContentLoaded', function() {
    initRawRoom();
});

function getRawSessionName() {
    try {
        var session = localStorage.getItem(RAW_SESSION_KEY);
        if (session) {
            var data = JSON.parse(session);
            if (data && data.name && data.name.length >= 2) return data.name;
        }
    } catch(e) {}
    return null;
}

function saveRawSessionName(name) {
    try { localStorage.setItem(RAW_SESSION_KEY, JSON.stringify({ name: name, time: Date.now() })); } catch(e) {}
}

function initRawRoom() {
    var params = new URLSearchParams(window.location.search);
    rawRoomId = params.get('room');

    if (!rawRoomId) {
        rawRoomId = 'RAW-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        var url = new URL(window.location);
        url.searchParams.set('room', rawRoomId);
        window.history.replaceState({}, '', url);
    }

    document.getElementById('rawRoomCode').textContent = 'RAW: ' + rawRoomId;

    var savedName = getRawSessionName();
    if (savedName) {
        rawUser = savedName;
        document.getElementById('rawUserBadge').textContent = rawUser;
        document.getElementById('rawNicknameModal').classList.add('hidden');
        initRawFirebase();
        renderRawGrid();
    } else {
        document.getElementById('rawNicknameModal').classList.remove('hidden');
        document.getElementById('rawNicknameInput').focus();
    }
}

function setRawNickname() {
    var input = document.getElementById('rawNicknameInput');
    var name = input.value.trim();
    if (!name || name.length < 2) {
        showToast('Hata', 'En az 2 karakter gir!');
        return;
    }
    rawUser = name;
    saveRawSessionName(name);
    document.getElementById('rawUserBadge').textContent = rawUser;
    document.getElementById('rawNicknameModal').classList.add('hidden');
    initRawFirebase();
    renderRawGrid();
}

function initRawFirebase() {
    try {
        var config = window.CS_CFG;
        if (!config || !config.apiKey) {
            config = {
                apiKey: "AIzaSyDiFa6RjkuqdEbz8L9YsrBD1Be5shgAjUg",
                authDomain: "plane-gr.firebaseapp.com",
                databaseURL: "https://plane-gr-default-rtdb.firebaseio.com",
                projectId: "plane-gr",
                storageBucket: "plane-gr.firebasestorage.app",
                messagingSenderId: "764208760476",
                appId: "1:764208760476:web:19f6aa746f6270ad568f59"
            };
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }

        rawDb = firebase.database();
        var basePath = 'cinesync/rawrooms/' + rawRoomId;
        rawRoomRef = rawDb.ref(basePath);
        rawMessagesRef = rawDb.ref(basePath + '/messages');
        rawPresenceRef = rawDb.ref(basePath + '/presence');

        rawMyPresence = rawPresenceRef.push();
        rawMyPresence.set({
            name: rawUser,
            joined: firebase.database.ServerValue.TIMESTAMP
        });
        rawMyPresence.onDisconnect().remove();

        // Listen messages
        rawMessagesRef.limitToLast(50).on('child_added', function(snap) {
            var msg = snap.val();
            if (msg && msg.user !== rawUser) {
                displayRawMessage(msg);
                trimRawChatMessages();
            }
        });

        // ===== VIDEO SYNC FIX =====
        rawRoomRef.child('video').on('value', function(snap) {
            var data = snap.val();
            if (!data) return;
            if (data.sender === rawUser) return;
            var now = Date.now();
            if (data.timestamp && (now - data.timestamp) > 5000) return;
            if (data.action === 'play' && data.url) {
                playRawVideo(data.url, false);
            }
        });

        rawRoomRef.child('currentVideo').on('value', function(snap) {
            var data = snap.val();
            if (!data) return;
            if (data.sender === rawUser) return;
            if (data.url && data.url !== currentRawVideo) {
                playRawVideo(data.url, false);
            }
        });

        rawPresenceRef.on('value', function(snap) {
            var users = snap.val() || {};
            var count = Object.keys(users).length;
            document.getElementById('rawUserCount').textContent = count + ' kisi';

            if (count === 0) {
                setTimeout(function() {
                    rawPresenceRef.once('value').then(function(s) {
                        if (!s.exists() || Object.keys(s.val() || {}).length === 0) {
                            rawRoomRef.remove();
                        }
                    });
                }, 5000);
            }
        });

        rawRoomRef.child('cheats').limitToLast(1).on('child_added', function(snap) {
            var cheat = snap.val();
            if (cheat && cheat.user !== rawUser) {
                executeRawCheat(cheat.type, cheat.user);
            }
        });

        addRawSystemMessage(rawUser + ' odaya katildi!');
        sendRawSystemMessage(rawUser + ' odaya katildi!');
        showToast('Baglandi!', rawRoomId + ' odasina katildin.');

    } catch (err) {
        console.error('Raw Firebase hatasi:', err);
        showToast('Hata', 'Firebase baglanti hatasi!');
    }
}

function renderRawGrid() {
    var grid = document.getElementById('rawGrid');
    grid.innerHTML = RAW_VIDEO_SLOTS.map(function(slot) {
        return '<div class="raw-card" onclick="selectRawVideo(' + slot.id + ')">' +
            '<div class="raw-card-thumb">' + slot.thumb + '</div>' +
            '<div class="raw-card-info"><h4>' + slot.name + '</h4><p>' + (slot.url ? '✅ Hazir' : '🔗 URL ekle') + '</p></div>' +
            '</div>';
    }).join('');
}

function selectRawVideo(id) {
    var slot = RAW_VIDEO_SLOTS.find(function(s) { return s.id === id; });
    if (!slot) return;

    if (slot.url) {
        playRawVideo(slot.url, true); // true = kullanici secti, broadcast et
    } else {
        var url = prompt(slot.name + ' icin GitHub Raw URL gir:

Ornek: https://raw.githubusercontent.com/kullanici/repo/main/video.mp4', '');
        if (url && url.includes('raw.githubusercontent.com')) {
            slot.url = url;
            renderRawGrid();
            playRawVideo(url, true);
        } else if (url) {
            showToast('Hata', 'Sadece GitHub raw URL!');
        }
    }
}

function playRawVideo(url, shouldBroadcast) {
    currentRawVideo = url;
    document.getElementById('rawVideoOverlay').classList.add('hidden');

    var container = document.getElementById('rawPlayer');
    container.innerHTML = '<video controls autoplay playsinline style="width:100%;height:100%;"><source src="' + url + '" type="video/mp4"></video>';

    if (shouldBroadcast) {
        rawRoomRef.child('currentVideo').set({
            url: url,
            sender: rawUser,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        rawRoomRef.child('video').set({
            action: 'play',
            url: url,
            sender: rawUser,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        showToast('▶️ Oynatiliyor', 'Video baslatildi!');
    }
}

// ===== CHAT =====
function sendRawMessage() {
    var input = document.getElementById('rawChatInput');
    var text = input.value.trim();
    if (!text) return;

    rawMessagesRef.push({
        user: rawUser,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'chat'
    });

    addRawMessage(rawUser, text, true);
    trimRawChatMessages();
    input.value = '';
}

function handleRawKeyPress(e) {
    if (e.key === 'Enter') sendRawMessage();
}

function addRawMessage(user, text, isOwn) {
    var container = document.getElementById('rawChatMessages');
    var div = document.createElement('div');
    div.className = 'message ' + (isOwn ? 'own' : '');

    var colors = ['#e50914', '#ff6b6b', '#f39c12', '#9b59b6', '#3498db'];
    var color = colors[user.length % colors.length];
    var time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = '<div class="message-header"><div class="message-avatar" style="background:' + color + '20;color:' + color + ';">' + user[0].toUpperCase() + '</div><span class="message-name" style="color:' + (isOwn ? '#ff6b6b' : color) + ';">' + escapeHtml(user) + '</span><span class="message-time">' + time + '</span></div><div class="message-body">' + escapeHtml(text) + '</div>';

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function displayRawMessage(msg) {
    if (msg.type === 'system') {
        addRawSystemMessage(msg.text);
    } else {
        addRawMessage(msg.user, msg.text, false);
    }
}

function addRawSystemMessage(text) {
    var container = document.getElementById('rawChatMessages');
    var div = document.createElement('div');
    div.className = 'message system';
    div.innerHTML = '<div class="message-body">' + escapeHtml(text) + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function trimRawChatMessages() {
    var container = document.getElementById('rawChatMessages');
    var messages = container.querySelectorAll('.message');
    while (messages.length > RAW_MAX_MESSAGES) {
        if (messages[0]) messages[0].remove();
        messages = container.querySelectorAll('.message');
    }
}

function sendRawSystemMessage(text) {
    rawMessagesRef.push({
        user: 'Sistem',
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'system'
    });
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== CHEAT =====
function sendRawCheat(type) {
    document.getElementById('rawCheatMenu').classList.remove('show');

    rawRoomRef.child('cheats').push({
        type: type,
        user: rawUser,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    executeRawCheat(type, rawUser);
}

function executeRawCheat(type, fromUser) {
    switch(type) {
        case 'heart':
            createHeartRain();
            showToast('❤️', fromUser + ' kalp yagmuru gonderdi!');
            break;
        case 'message':
            var msgs = ['Seninle izlemek cok guzel! 🥰', 'Bu film harika! 🎬', 'Seni seviyorum! ❤️'];
            showCheatPopup('💌', 'Surpriz', msgs[Math.floor(Math.random() * msgs.length)]);
            break;
        case 'reaction':
            createEmojiExplosion();
            showToast('😍', fromUser + ' emoji patlamasi!');
            break;
    }
}

function createHeartRain() {
    var effect = document.getElementById('cheatEffect');
    effect.classList.add('active');
    var hearts = ['❤️', '💖', '💕', '💗', '💝'];
    for (var i = 0; i < 10; i++) {
        (function(idx) {
            setTimeout(function() {
                var heart = document.createElement('div');
                heart.className = 'heart-rain';
                heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
                heart.style.left = Math.random() * 100 + '%';
                heart.style.animationDuration = (Math.random() * 1 + 0.8) + 's';
                heart.style.fontSize = (Math.random() * 10 + 10) + 'px';
                effect.appendChild(heart);
                setTimeout(function() { heart.remove(); }, 1800);
            }, idx * 60);
        })(i);
    }
    setTimeout(function() { effect.classList.remove('active'); }, 1800);
}

function createEmojiExplosion() {
    var emojis = ['😍', '🥰', '😘', '💖', '✨', '🌟', '💫', '🎉'];
    for (var i = 0; i < 5; i++) {
        (function(idx) {
            setTimeout(function() {
                var el = document.createElement('div');
                el.className = 'reaction-float';
                el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                el.style.left = (Math.random() * 80 + 10) + '%';
                el.style.bottom = '10%';
                document.body.appendChild(el);
                setTimeout(function() { el.remove(); }, 1200);
            }, idx * 60);
        })(i);
    }
}

function showCheatPopup(emoji, title, message) {
    document.getElementById('cheatEmoji').textContent = emoji;
    document.getElementById('cheatTitle').textContent = title;
    document.getElementById('cheatMessage').textContent = message;
    document.getElementById('cheatPopup').classList.add('show');
    setTimeout(function() { document.getElementById('cheatPopup').classList.remove('show'); }, 1800);
}

function closeCheatPopup() {
    document.getElementById('cheatPopup').classList.remove('show');
}

// ===== UTILS =====
function copyRawRoomCode() {
    var code = rawRoomId;
    navigator.clipboard.writeText(code).then(function() {
        showToast('Kopyalandi!', 'Oda kodu: ' + code);
    }).catch(function() {
        var el = document.createElement('textarea');
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('Kopyalandi!', 'Oda kodu: ' + code);
    });
}

function shareRawRoom() {
    var url = window.location.href;
    navigator.clipboard.writeText(url).then(function() {
        showToast('Davet Linki!', 'Link kopyalandi!');
    }).catch(function() {
        var el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('Davet Linki!', 'Link kopyalandi!');
    });
}

function goHome() {
    if (rawMyPresence) rawMyPresence.remove();
    window.location.href = 'index.html';
}

function showToast(title, msg) {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMsg').textContent = msg;
    var toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2000);
}

function toggleEmoji() {
    var emojis = ['❤️', '😂', '🔥', '👏', '😍', '🥰', '✨', '🎉'];
    var emoji = emojis[Math.floor(Math.random() * emojis.length)];
    var input = document.getElementById('rawChatInput');
    input.value += emoji;
    input.focus();
}

window.addEventListener('beforeunload', function() {
    if (rawMyPresence) rawMyPresence.remove();
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.room-actions')) {
        var menu = document.getElementById('rawCheatMenu');
        if (menu) menu.classList.remove('show');
    }
});

document.getElementById('rawNicknameInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') setRawNickname();
});
