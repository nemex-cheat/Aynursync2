/* Aynur Sync - Watch Room App v5.1 */

var db = null;
var roomRef = null;
var messagesRef = null;
var presenceRef = null;
var myPresence = null;
var roomId = '';
var userName = '';
var player = null;
var currentVideoId = '';
var videoSource = 'youtube';
var typingTimeout = null;
var MAX_CHAT_MESSAGES = 5;
var SESSION_KEY = 'aynursync_session';

document.addEventListener('DOMContentLoaded', function() {
    initRoom();
});

function getSessionName() {
    try {
        var session = localStorage.getItem(SESSION_KEY);
        if (session) {
            var data = JSON.parse(session);
            if (data && data.name && data.name.length >= 2) return data.name;
        }
    } catch(e) {}
    return null;
}

function saveSessionName(name) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ name: name, time: Date.now() })); } catch(e) {}
}

function initRoom() {
    var params = new URLSearchParams(window.location.search);
    roomId = params.get('room');

    if (!roomId) {
        roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        var url = new URL(window.location);
        url.searchParams.set('room', roomId);
        window.history.replaceState({}, '', url);
    }

    document.getElementById('roomCode').textContent = 'ROOM: ' + roomId;

    var savedName = getSessionName();
    if (savedName) {
        userName = savedName;
        document.getElementById('userBadge').textContent = userName;
        document.getElementById('nicknameModal').classList.add('hidden');
        initFirebase();
    } else {
        document.getElementById('nicknameModal').classList.remove('hidden');
        document.getElementById('nicknameInput').focus();
    }
}

function setNickname() {
    var input = document.getElementById('nicknameInput');
    var name = input.value.trim();
    if (!name || name.length < 2) {
        showToast('Hata', 'En az 2 karakter gir!');
        return;
    }
    userName = name;
    saveSessionName(name);
    document.getElementById('userBadge').textContent = userName;
    document.getElementById('nicknameModal').classList.add('hidden');
    initFirebase();
}

function initFirebase() {
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
        if (!firebase.apps.length) firebase.initializeApp(config);

        db = firebase.database();
        var basePath = 'cinesync/rooms/' + roomId;
        roomRef = db.ref(basePath);
        messagesRef = db.ref(basePath + '/messages');
        presenceRef = db.ref(basePath + '/presence');

        myPresence = presenceRef.push();
        myPresence.set({ name: userName, joined: firebase.database.ServerValue.TIMESTAMP });
        myPresence.onDisconnect().remove();

        // Video sync - currentVideo
        roomRef.child('currentVideo').on('value', function(snap) {
            var data = snap.val();
            if (!data) return;
            if (data.sender === userName) return;
            if (data.videoId) loadYouTubeVideo(data.videoId, false);
            else if (data.url) loadDirectVideo(data.url, false);
        });

        roomRef.child('currentVideo').once('value').then(function(snap) {
            var data = snap.val();
            if (data) {
                if (data.videoId) loadYouTubeVideo(data.videoId, false);
                else if (data.url) loadDirectVideo(data.url, false);
            }
        });

        roomRef.child('video').on('value', function(snap) {
            var data = snap.val();
            if (!data || data.sender === userName) return;
            if (data.timestamp && (Date.now() - data.timestamp) > 5000) return;
            if (data.action === 'play' && data.videoId) loadYouTubeVideo(data.videoId, false);
            else if (data.action === 'play' && data.url) loadDirectVideo(data.url, false);
            else if (data.action === 'reset') resetVideoLocal();
        });

        messagesRef.limitToLast(50).on('child_added', function(snap) {
            var msg = snap.val();
            if (msg && msg.user !== userName) {
                displayMessage(msg);
                trimChatMessages();
            }
        });

        presenceRef.on('value', function(snap) {
            var users = snap.val() || {};
            document.getElementById('userCount').textContent = Object.keys(users).length + ' kişi';
        });

        roomRef.child('typing').on('value', function(snap) {
            var data = snap.val();
            var status = document.getElementById('typingStatus');
            var indicator = document.getElementById('typingIndicator');
            if (data && data.user !== userName) {
                status.textContent = data.user + ' yazıyor...';
                indicator.classList.add('show');
            } else {
                status.textContent = '';
                indicator.classList.remove('show');
            }
        });

        roomRef.child('cheats').limitToLast(1).on('child_added', function(snap) {
            var cheat = snap.val();
            if (cheat && cheat.user !== userName) executeCheat(cheat.type, cheat.user);
        });

        addSystemMessage(userName + ' odaya katıldı!');
        sendSystemMessage(userName + ' odaya katıldı!');
        showToast('Bağlandı!', roomId + ' odasına katıldın.');

    } catch (err) {
        showToast('Hata', 'Firebase bağlantı hatası!');
    }
}

function onYouTubeIframeAPIReady() {}

function loadYouTubeVideo(videoId, shouldBroadcast) {
    currentVideoId = videoId;
    document.getElementById('videoOverlay').classList.add('hidden');
    document.getElementById('newVideoBtn').classList.add('show');

    if (player) {
        player.loadVideoById(videoId);
    } else {
        player = new YT.Player('player', {
            height: '100%', width: '100%', videoId: videoId,
            playerVars: { autoplay: 1, playsinline: 1, rel: 0 }
        });
    }

    if (shouldBroadcast) {
        roomRef.child('currentVideo').set({ videoId: videoId, sender: userName, timestamp: firebase.database.ServerValue.TIMESTAMP });
        roomRef.child('video').set({ action: 'play', videoId: videoId, sender: userName, timestamp: firebase.database.ServerValue.TIMESTAMP });
        showToast('▶️ Oynatılıyor', 'Video başlatıldı!');
    }
}

function setVideoSource(source) {
    videoSource = source;
    var tabs = document.querySelectorAll('.source-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    var activeTab = document.querySelector('[data-source="' + source + '"]');
    if (activeTab) activeTab.classList.add('active');
    document.getElementById('videoUrl').placeholder = source === 'youtube' ? 'YouTube URL...' : 'Direct video URL...';
}

function loadVideo() {
    var url = document.getElementById('videoUrl').value.trim();
    if (!url) return;
    if (videoSource === 'youtube') {
        var videoId = extractYouTubeId(url);
        if (videoId) loadYouTubeVideo(videoId, true);
        else showToast('Hata', 'Geçersiz YouTube URL!');
    } else {
        loadDirectVideo(url, true);
    }
}

function loadSample(id) { loadYouTubeVideo(id, true); }

function extractYouTubeId(url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadDirectVideo(url, shouldBroadcast) {
    document.getElementById('videoOverlay').classList.add('hidden');
    document.getElementById('newVideoBtn').classList.add('show');
    document.getElementById('player').innerHTML = '<video controls autoplay playsinline style="width:100%;height:100%;"><source src="' + url + '" type="video/mp4"></video>';
    if (shouldBroadcast) {
        roomRef.child('currentVideo').set({ url: url, sender: userName, timestamp: firebase.database.ServerValue.TIMESTAMP });
        roomRef.child('video').set({ action: 'play', url: url, sender: userName, timestamp: firebase.database.ServerValue.TIMESTAMP });
    }
}

function resetVideo() {
    resetVideoLocal();
    roomRef.child('video').set({ action: 'reset', sender: userName, timestamp: firebase.database.ServerValue.TIMESTAMP });
    roomRef.child('currentVideo').remove();
    showToast('🆕 Yeni Film', 'Yeni film seçmek için hazır!');
}

function resetVideoLocal() {
    currentVideoId = '';
    if (player) { try { player.destroy(); } catch(e) {} player = null; }
    document.getElementById('player').innerHTML = '';
    document.getElementById('videoOverlay').classList.remove('hidden');
    document.getElementById('newVideoBtn').classList.remove('show');
    document.getElementById('videoUrl').value = '';
}

// ===== CHAT =====
function sendMessage() {
    var input = document.getElementById('chatInput');
    var text = input.value.trim();
    if (!text) return;
    messagesRef.push({ user: userName, text: text, timestamp: firebase.database.ServerValue.TIMESTAMP, type: 'chat' });
    addMessage(userName, text, true);
    trimChatMessages();
    input.value = '';
}

function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

function handleTyping() {
    roomRef.child('typing').set({ user: userName, timestamp: Date.now() });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(function() { roomRef.child('typing').remove(); }, 2000);
}

function trimChatMessages() {
    var container = document.getElementById('chatMessages');
    var messages = container.querySelectorAll('.message');
    while (messages.length > MAX_CHAT_MESSAGES) {
        if (messages[0]) messages[0].remove();
        messages = container.querySelectorAll('.message');
    }
}

function addMessage(user, text, isOwn) {
    var container = document.getElementById('chatMessages');
    var div = document.createElement('div');
    div.className = 'message ' + (isOwn ? 'own' : '');
    var colors = ['#e50914', '#ff6b6b', '#f39c12', '#9b59b6', '#3498db'];
    var color = colors[user.length % colors.length];
    var time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = '<div class="message-header"><div class="message-avatar" style="background:' + color + '20;color:' + color + ';">' + user[0].toUpperCase() + '</div><span class="message-name" style="color:' + (isOwn ? '#ff6b6b' : color) + ';">' + escapeHtml(user) + '</span><span class="message-time">' + time + '</span></div><div class="message-body">' + escapeHtml(text) + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function displayMessage(msg) {
    if (msg.type === 'system') addSystemMessage(msg.text);
    else addMessage(msg.user, msg.text, false);
}

function addSystemMessage(text) {
    var container = document.getElementById('chatMessages');
    var div = document.createElement('div');
    div.className = 'message system';
    div.innerHTML = '<div class="message-body">' + escapeHtml(text) + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function sendSystemMessage(text) {
    messagesRef.push({ user: 'Sistem', text: text, timestamp: firebase.database.ServerValue.TIMESTAMP, type: 'system' });
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== CHEATS =====
function toggleCheatMenu() { document.getElementById('cheatMenu').classList.toggle('show'); }

function sendCheat(type) {
    document.getElementById('cheatMenu').classList.remove('show');
    roomRef.child('cheats').push({ type: type, user: userName, timestamp: firebase.database.ServerValue.TIMESTAMP });
    executeCheat(type, userName);
}

function quickSurprise() { sendCheat('heart'); }

function executeCheat(type, fromUser) {
    switch(type) {
        case 'heart': createHeartRain(); showToast('❤️', fromUser + ' kalp yağmuru gönderdi!'); break;
        case 'message': var msgs = ['Seninle izlemek çok güzel! 🥰', 'Bu film harika! 🎬', 'Seni seviyorum! ❤️']; showCheatPopup('💌', 'Sürpriz', msgs[Math.floor(Math.random() * msgs.length)]); break;
        case 'hint': showToast('💡', fromUser + ' film ipucu gönderdi!'); break;
        case 'reaction': createEmojiExplosion(); showToast('😍', fromUser + ' emoji patlaması!'); break;
        case 'love': showCheatPopup('🔥', 'Aşk Modu', 'Romantik anlar başlasın! ❤️'); break;
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

function closeCheatPopup() { document.getElementById('cheatPopup').classList.remove('show'); }

// ===== UTILS =====
function copyRoomCode() {
    navigator.clipboard.writeText(roomId).then(function() { showToast('Kopyalandı!', 'Oda kodu: ' + roomId); }).catch(function() { fallbackCopy(roomId); });
}

function shareRoom() {
    var url = window.location.href;
    navigator.clipboard.writeText(url).then(function() { showToast('Davet Linki!', 'Link kopyalandı!'); }).catch(function() { fallbackCopy(url); });
}

function fallbackCopy(text) {
    var el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    showToast('Kopyalandı!', text);
}

function goHome() {
    if (myPresence) myPresence.remove();
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
    var input = document.getElementById('chatInput');
    input.value += emojis[Math.floor(Math.random() * emojis.length)];
    input.focus();
}

window.addEventListener('beforeunload', function() { if (myPresence) myPresence.remove(); });

document.addEventListener('click', function(e) {
    if (!e.target.closest('.room-actions')) {
        var menu = document.getElementById('cheatMenu');
        if (menu) menu.classList.remove('show');
    }
});

document.getElementById('nicknameInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') setNickname();
});
