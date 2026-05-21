/**
 * AYNUR SYNC ULTIMATE v4.0 - app.js
 * Ultra Mega Premium Sync Application
 * Features: Auth, Profile, Content, Offline, Haptic, Gestures, PWA
 * Optimized for Redmi & all devices
 */

class AynurSync {
    constructor() {
        this.currentUser = null;
        this.isGuest = false;
        this.theme = localStorage.getItem('theme') || 'neon';
        this.particlesEnabled = localStorage.getItem('particles') !== 'false';
        this.animationsEnabled = localStorage.getItem('animations') !== 'false';
        this.soundEnabled = localStorage.getItem('sound') !== 'false';
        this.pushEnabled = localStorage.getItem('push') === 'true';

        this.particles = [];
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.isSyncing = false;
        this.audioContext = null;
        this.vibrationSupported = 'vibrate' in navigator;

        this.init();
    }

    init() {
        this.setupAudio();
        this.createParticles();
        this.setupEventListeners();
        this.applyTheme(this.theme);
        this.startClock();
        this.checkOrientation();
        this.checkOnlineStatus();
        this.loadUserData();
        this.setupGestures();

        // Splash screen
        this.handleSplash();

        console.log('%c 🔥 AYNUR SYNC ULTIMATE v4.0 ', 'background: linear-gradient(90deg, #ff006e, #8338ec); color: white; font-size: 24px; padding: 15px; border-radius: 8px; font-weight: 900;');
        console.log('%c Ultra Mega Edition - Loaded ', 'color: #06ffa5; font-size: 14px;');
    }

    // ==================== SPLASH SCREEN ====================
    handleSplash() {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app');

        if (!splash) return;

        setTimeout(() => {
            splash.classList.add('hidden');
            app.classList.remove('hidden');
            app.classList.add('visible');

            setTimeout(() => {
                splash.style.display = 'none';
                this.showScreen('auth-screen');
            }, 800);
        }, 2500);
    }

    // ==================== AUTH SYSTEM ====================
    setupAuth() {
        // Tab switching
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                document.querySelectorAll('.auth-form').forEach(form => {
                    form.classList.remove('active');
                });
                document.getElementById(target === 'login' ? 'login-form' : 'register-form').classList.add('active');

                this.haptic('light');
            });
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Guest login
        const guestBtn = document.getElementById('guest-login');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                this.handleGuestLogin();
            });
        }

        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) {
                    target.type = target.type === 'password' ? 'text' : 'password';
                    this.haptic('light');
                }
            });
        });

        // Password strength
        const regPassword = document.getElementById('reg-password');
        if (regPassword) {
            regPassword.addEventListener('input', () => this.checkPasswordStrength());
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('remember-me').checked;

        if (!username || !password) {
            this.showToast('Kullanıcı adı ve şifre gerekli!', 'error');
            this.haptic('heavy');
            return;
        }

        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === this.hashPassword(password));

        if (!user) {
            this.showToast('Kullanıcı adı veya şifre hatalı!', 'error');
            this.haptic('heavy');
            this.shakeElement(document.getElementById('login-form'));
            return;
        }

        this.currentUser = user;
        this.isGuest = false;

        if (remember) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        }

        this.showToast(`Hoş geldin, ${user.username}!`, 'success');
        this.haptic('success');
        this.playSound('login');
        this.enterApp();
    }

    handleRegister() {
        const username = document.getElementById('reg-username').value.trim().toLowerCase();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-password-confirm').value;
        const terms = document.getElementById('accept-terms').checked;

        // Validation
        if (!username || !email || !password) {
            this.showToast('Tüm alanları doldurun!', 'error');
            this.haptic('heavy');
            return;
        }

        if (username.length < 3) {
            this.showToast('Kullanıcı adı en az 3 karakter olmalı!', 'error');
            return;
        }

        if (!/^[a-z0-9_]+$/.test(username)) {
            this.showToast('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir!', 'error');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            this.showToast('Geçerli bir e-posta girin!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Şifre en az 6 karakter olmalı!', 'error');
            return;
        }

        if (password !== confirm) {
            this.showToast('Şifreler eşleşmiyor!', 'error');
            this.haptic('heavy');
            return;
        }

        if (!terms) {
            this.showToast('Kullanım koşullarını kabul etmelisiniz!', 'error');
            return;
        }

        const users = this.getUsers();

        // Check if username exists
        if (users.some(u => u.username === username)) {
            this.showToast('Bu kullanıcı adı zaten alınmış!', 'error');
            this.haptic('heavy');
            this.shakeElement(document.getElementById('reg-username'));
            return;
        }

        // Check if email exists
        if (users.some(u => u.email === email)) {
            this.showToast('Bu e-posta zaten kayıtlı!', 'error');
            return;
        }

        const newUser = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            username,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            syncCount: 0,
            fileCount: 0,
            bio: 'Aynur Sync Ultimate kullanıcısı',
            avatar: null
        };

        users.push(newUser);
        this.saveUsers(users);

        this.currentUser = newUser;
        this.isGuest = false;
        localStorage.setItem('currentUser', JSON.stringify(newUser));

        this.showToast('Kayıt başarılı! Hoş geldin!', 'success');
        this.haptic('success');
        this.playSound('success');
        this.enterApp();
    }

    handleGuestLogin() {
        this.isGuest = true;
        this.currentUser = {
            username: 'Misafir',
            email: '',
            syncCount: 0,
            fileCount: 0,
            bio: 'Misafir kullanıcı'
        };

        this.showToast('Misafir modunda devam ediyorsunuz', 'warning');
        this.haptic('light');
        this.enterApp();
    }

    handleLogout() {
        this.currentUser = null;
        this.isGuest = false;
        localStorage.removeItem('currentUser');

        this.showToast('Çıkış yapıldı', 'success');
        this.haptic('light');

        // Reset UI
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-home').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-tab="home"]').classList.add('active');

        this.showScreen('auth-screen');
    }

    enterApp() {
        this.showScreen('main-screen');
        this.updateProfileUI();
        this.loadActivities();
        this.loadContent();

        // Update welcome
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName && this.currentUser) {
            welcomeName.textContent = `Hoş Geldin, ${this.currentUser.username}!`;
        }
    }

    // ==================== USER DATA MANAGEMENT ====================
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem('aynur_users') || '[]');
        } catch {
            return [];
        }
    }

    saveUsers(users) {
        localStorage.setItem('aynur_users', JSON.stringify(users));
    }

    hashPassword(password) {
        // Simple hash for demo - in production use bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    }

    loadUserData() {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
            } catch {
                localStorage.removeItem('currentUser');
            }
        }
    }

    // ==================== UI UPDATES ====================
    updateProfileUI() {
        if (!this.currentUser) return;

        const nameEl = document.getElementById('profile-name');
        const userEl = document.getElementById('profile-username');
        const bioEl = document.getElementById('profile-bio');
        const syncsEl = document.getElementById('profile-syncs');
        const filesEl = document.getElementById('profile-files');
        const sinceEl = document.getElementById('profile-since');

        if (nameEl) nameEl.textContent = this.currentUser.username;
        if (userEl) userEl.textContent = '@' + this.currentUser.username.toLowerCase();
        if (bioEl) bioEl.textContent = this.currentUser.bio || 'Aynur Sync Ultimate kullanıcısı';
        if (syncsEl) syncsEl.textContent = this.currentUser.syncCount || 0;
        if (filesEl) filesEl.textContent = this.currentUser.fileCount || 0;

        if (sinceEl && this.currentUser.createdAt) {
            const date = new Date(this.currentUser.createdAt);
            sinceEl.textContent = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
        } else if (sinceEl) {
            sinceEl.textContent = 'Bugün';
        }
    }

    // ==================== ACTIVITIES ====================
    loadActivities() {
        const list = document.getElementById('activity-list');
        if (!list) return;

        // Remove skeletons
        list.innerHTML = '';

        const activities = [
            { icon: 'sync', title: 'Senkronizasyon tamamlandı', desc: '124 dosya güncellendi', time: '2 dk önce', color: 'var(--success)' },
            { icon: 'upload', title: 'Dosya yüklendi', desc: 'video_001.mp4', time: '15 dk önce', color: 'var(--accent)' },
            { icon: 'user', title: 'Profil güncellendi', desc: 'Avatar değiştirildi', time: '1 saat önce', color: 'var(--secondary)' },
            { icon: 'settings', title: 'Ayarlar değiştirildi', desc: 'Neon tema aktif', time: '3 saat önce', color: 'var(--warning)' }
        ];

        activities.forEach((act, i) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'activity-item glass';
                item.innerHTML = `
                    <div class="activity-icon" style="background: ${act.color}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${this.getIconSvg(act.icon)}
                        </svg>
                    </div>
                    <div class="activity-info">
                        <h4>${act.title}</h4>
                        <p>${act.desc}</p>
                    </div>
                    <span class="activity-time">${act.time}</span>
                `;
                item.style.animation = 'tabIn 0.3s ease';
                list.appendChild(item);
            }, i * 100);
        });
    }

    getIconSvg(name) {
        const icons = {
            sync: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>',
            upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
            user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>'
        };
        return icons[name] || icons.sync;
    }

    // ==================== CONTENT / WATCH ====================
    loadContent() {
        const grid = document.getElementById('content-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const contents = [
            { type: 'video', title: 'Tanıtım Videosu', duration: '2:34', color: '#ff006e' },
            { type: 'music', title: 'Sync Beat', duration: '3:45', color: '#8338ec' },
            { type: 'photo', title: 'Galeri', count: '24', color: '#3a86ff' },
            { type: 'video', title: 'Tutorial', duration: '5:12', color: '#06ffa5' },
            { type: 'music', title: 'Chill Mix', duration: '4:20', color: '#ffbe0b' },
            { type: 'photo', title: 'Screenshots', count: '12', color: '#fb5607' }
        ];

        contents.forEach((content, i) => {
            const item = document.createElement('div');
            item.className = 'content-item glass';
            item.style.background = `linear-gradient(135deg, ${content.color}22, ${content.color}44)`;
            item.innerHTML = `
                <div style="padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${content.color}; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 20px; height: 20px;">
                            ${content.type === 'video' ? '<polygon points="5 3 19 12 5 21 5 3"/>' : 
                              content.type === 'music' ? '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' :
                              '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'}
                        </svg>
                    </div>
                    <div class="content-overlay" style="position: relative; background: none; padding: 0;">
                        <h4>${content.title}</h4>
                        <p>${content.duration || content.count + ' öğe'}</p>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                this.haptic('medium');
                this.showToast(`${content.title} açılıyor...`, 'success');
            });
            grid.appendChild(item);
        });
    }

    // ==================== SYNC ====================
    startSync() {
        if (this.isSyncing) return;

        this.isSyncing = true;
        this.playSound('sync');
        this.haptic('sync');

        const btn = document.getElementById('sync-btn');
        const status = document.getElementById('sync-status');
        const progress = document.getElementById('sync-progress');
        const icon = document.getElementById('sync-icon');

        if (btn) {
            btn.classList.add('syncing');
            btn.disabled = true;
        }
        if (icon) icon.classList.add('syncing');
        if (status) status.textContent = 'Senkronizasyon başlatılıyor...';

        const stages = [
            { progress: 0, text: 'Bağlantı kontrol ediliyor...' },
            { progress: 15, text: 'Sunucuya bağlanılıyor...' },
            { progress: 30, text: 'Kimlik doğrulanıyor...' },
            { progress: 50, text: 'Veriler indiriliyor...' },
            { progress: 75, text: 'Dosyalar birleştiriliyor...' },
            { progress: 100, text: 'Tamamlandı!' }
        ];

        let currentStage = 0;

        const interval = setInterval(() => {
            if (currentStage >= stages.length) {
                clearInterval(interval);
                this.completeSync(btn, status, progress, icon);
                return;
            }

            const stage = stages[currentStage];
            if (progress) progress.style.width = stage.progress + '%';
            if (status) status.textContent = stage.text;

            // Update speed
            const speedEl = document.getElementById('speed');
            if (speedEl && stage.progress > 0 && stage.progress < 100) {
                speedEl.textContent = (Math.random() * 50 + 10).toFixed(1) + ' MB/s';
            }

            currentStage++;
        }, 600);
    }

    completeSync(btn, status, progress, icon) {
        if (btn) {
            btn.classList.remove('syncing');
            btn.classList.add('sync-complete');
            btn.disabled = false;
        }
        if (icon) icon.classList.remove('syncing');

        if (status) {
            const now = new Date().toLocaleTimeString('tr-TR');
            status.innerHTML = `Son sync: <span style="color: var(--success)">${now}</span>`;
        }

        if (progress) {
            progress.style.width = '100%';
            setTimeout(() => progress.style.width = '0%', 1000);
        }

        // Update user stats
        if (this.currentUser) {
            this.currentUser.syncCount = (this.currentUser.syncCount || 0) + 1;
            this.updateProfileUI();
            this.updateWelcomeStats();
        }

        // Update last sync
        const lastSync = document.getElementById('last-sync');
        if (lastSync) lastSync.textContent = new Date().toLocaleTimeString('tr-TR');

        // Reset speed
        const speedEl = document.getElementById('speed');
        if (speedEl) speedEl.textContent = '0 MB/s';

        this.showToast('Senkronizasyon tamamlandı!', 'success');
        this.haptic('success');
        this.playSound('success');
        this.triggerSuccessAnimation();

        setTimeout(() => {
            this.isSyncing = false;
            if (btn) btn.classList.remove('sync-complete');
            if (status) status.textContent = 'Hazır';
        }, 3000);
    }

    updateWelcomeStats() {
        const syncCount = document.getElementById('user-sync-count');
        const fileCount = document.getElementById('user-files');
        const filesCount = document.getElementById('files-count');

        if (syncCount) syncCount.textContent = this.currentUser?.syncCount || 0;
        if (fileCount) fileCount.textContent = this.currentUser?.fileCount || 0;
        if (filesCount) filesCount.textContent = this.currentUser?.fileCount || 0;
    }

    triggerSuccessAnimation() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        for (let i = 0; i < 30; i++) {
            const burst = document.createElement('div');
            burst.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'][Math.floor(Math.random() * 5)]};
                border-radius: 50%;
                left: ${centerX}px;
                top: ${centerY}px;
                pointer-events: none;
                z-index: 9999;
                box-shadow: 0 0 10px currentColor;
            `;

            document.body.appendChild(burst);

            const angle = (Math.PI * 2 * i) / 30;
            const velocity = 150 + Math.random() * 250;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            burst.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 500,
                easing: 'cubic-bezier(0, .9, .57, 1)'
            }).onfinish = () => burst.remove();
        }
    }

    // ==================== PARTICLES ====================
    getOptimalParticleCount() {
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;

        if (memory <= 3 || cores <= 4) return 20;
        if (memory <= 6 || cores <= 8) return 45;
        return 70;
    }

    createParticles() {
        if (!this.particlesEnabled) return;

        const container = document.getElementById('particle-container');
        if (!container) return;

        container.innerHTML = '';
        this.particles = [];

        const count = this.getOptimalParticleCount();
        const colors = ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b', '#fb5607'];

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const size = Math.random() * 3 + 1;
            const color = colors[Math.floor(Math.random() * colors.length)];

            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                opacity: ${Math.random() * 0.5 + 0.1};
                box-shadow: 0 0 ${size * 3}px ${color};
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
            `;

            container.appendChild(particle);

            this.particles.push({
                element: particle,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                size
            });
        }

        this.animateParticles();
    }

    animateParticles() {
        if (!this.particlesEnabled || document.hidden) {
            requestAnimationFrame(() => this.animateParticles());
            return;
        }

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;

            p.x = Math.max(0, Math.min(w, p.x));
            p.y = Math.max(0, Math.min(h, p.y));

            p.element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        });

        requestAnimationFrame(() => this.animateParticles());
    }

    // ==================== AUDIO & HAPTIC ====================
    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;

        const sounds = {
            sync: { freq: 800, duration: 0.3, type: 'sine' },
            success: { freq: 1200, duration: 0.5, type: 'sine' },
            login: { freq: 600, duration: 0.4, type: 'triangle' },
            error: { freq: 200, duration: 0.3, type: 'sawtooth' },
            click: { freq: 1000, duration: 0.05, type: 'sine' }
        };

        const sound = sounds[type] || sounds.click;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.freq, this.audioContext.currentTime);

        if (type === 'success') {
            oscillator.frequency.exponentialRampToValueAtTime(1600, this.audioContext.currentTime + 0.2);
        }

        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + sound.duration);
    }

    haptic(type) {
        if (!this.vibrationSupported) return;

        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30, 50, 30],
            success: [10, 30, 10],
            error: [50, 30, 50],
            sync: [20, 10, 20, 10, 20]
        };

        navigator.vibrate(patterns[type] || patterns.light);
    }

    // ==================== GESTURES ====================
    setupGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            const duration = Date.now() - touchStartTime;

            // Swipe detection
            if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY)) {
                const tabs = ['home', 'watch', 'profile'];
                const currentTab = document.querySelector('.tab-content.active');
                const currentId = currentTab ? currentTab.id.replace('tab-', '') : 'home';
                const currentIndex = tabs.indexOf(currentId);

                if (diffX > 0 && currentIndex < tabs.length - 1) {
                    // Swipe left - next tab
                    this.switchTab(tabs[currentIndex + 1]);
                } else if (diffX < 0 && currentIndex > 0) {
                    // Swipe right - prev tab
                    this.switchTab(tabs[currentIndex - 1]);
                }
            }

            // Pull to refresh (top of page)
            if (diffY < -100 && window.scrollY < 50 && duration < 500) {
                this.showToast('Yenileniyor...', 'success');
                this.haptic('light');
            }
        }, { passive: true });
    }

    // ==================== NAVIGATION ====================
    setupNavigation() {
        // Bottom nav
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Quick sync center button
        const quickSync = document.getElementById('quick-sync-nav');
        if (quickSync) {
            quickSync.addEventListener('click', () => {
                this.haptic('medium');
                this.startSync();
            });
        }

        // More button
        const moreBtn = document.getElementById('nav-more');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                this.openModal('devs-modal');
                this.haptic('light');
            });
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));

        const targetTab = document.getElementById(`tab-${tabName}`);
        const targetNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);

        if (targetTab) targetTab.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        this.haptic('light');
        this.playSound('click');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    }

    // ==================== MODALS ====================
    setupModals() {
        // Settings modal
        const settingsBtn = document.getElementById('menu-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openModal('settings-modal');
                this.haptic('light');
            });
        }

        // Close modals
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Theme selector
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.applyTheme(theme);
                this.haptic('light');
            });
        });

        // Toggles
        const particleToggle = document.getElementById('toggle-particles');
        if (particleToggle) {
            particleToggle.checked = this.particlesEnabled;
            particleToggle.addEventListener('change', () => {
                this.particlesEnabled = particleToggle.checked;
                localStorage.setItem('particles', this.particlesEnabled);
                if (this.particlesEnabled) {
                    this.createParticles();
                } else {
                    document.getElementById('particle-container').innerHTML = '';
                }
            });
        }

        const animToggle = document.getElementById('toggle-animations');
        if (animToggle) {
            animToggle.checked = this.animationsEnabled;
            animToggle.addEventListener('change', () => {
                this.animationsEnabled = animToggle.checked;
                localStorage.setItem('animations', this.animationsEnabled);
                document.body.style.setProperty('--transition', this.animationsEnabled ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none');
            });
        }

        const soundToggle = document.getElementById('toggle-sound');
        if (soundToggle) {
            soundToggle.checked = this.soundEnabled;
            soundToggle.addEventListener('change', () => {
                this.soundEnabled = soundToggle.checked;
                localStorage.setItem('sound', this.soundEnabled);
            });
        }

        const pushToggle = document.getElementById('toggle-push');
        if (pushToggle) {
            pushToggle.checked = this.pushEnabled;
            pushToggle.addEventListener('change', () => {
                this.pushEnabled = pushToggle.checked;
                localStorage.setItem('push', this.pushEnabled);
                if (this.pushEnabled) this.requestPushPermission();
            });
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    // ==================== THEME ====================
    applyTheme(themeName) {
        const themes = {
            neon: { primary: '#ff006e', secondary: '#8338ec', accent: '#3a86ff', bg: '#0a0a0f' },
            cyber: { primary: '#00ff41', secondary: '#008f11', accent: '#003b00', bg: '#000000' },
            sunset: { primary: '#ff6b35', secondary: '#f7931e', accent: '#ffd23f', bg: '#1a0a00' },
            ocean: { primary: '#00d9ff', secondary: '#0099cc', accent: '#0066ff', bg: '#001122' }
        };

        const theme = themes[themeName] || themes.neon;
        const root = document.documentElement;

        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--secondary', theme.secondary);
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--bg', theme.bg);

        document.body.setAttribute('data-theme', themeName);
        this.theme = themeName;
        localStorage.setItem('theme', themeName);

        // Update active theme button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeName);
        });
    }

    // ==================== TOAST ====================
    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#06ffa5" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ff4757" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ffbe0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        };

        toast.innerHTML = `${icons[type] || icons.success}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), duration + 300);
    }

    // ==================== UTILITIES ====================
    shakeElement(element) {
        element.style.animation = 'shake 0.5s ease';
        setTimeout(() => element.style.animation = '', 500);
    }

    startClock() {
        const clock = document.getElementById('clock');
        if (!clock) return;

        const update = () => {
            clock.textContent = new Date().toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };

        update();
        setInterval(update, 1000);
    }

    checkOrientation() {
        const wasLandscape = this.isLandscape;
        this.isLandscape = window.innerWidth > window.innerHeight;

        if (wasLandscape !== this.isLandscape) {
            document.body.classList.toggle('landscape', this.isLandscape);
        }
    }

    checkOnlineStatus() {
        const banner = document.getElementById('offline-banner');

        const update = () => {
            if (banner) {
                banner.classList.toggle('hidden', navigator.onLine);
            }

            const statusEl = document.getElementById('offline-status');
            if (statusEl) statusEl.textContent = navigator.onLine ? 'Aktif' : 'Çevrimdışı';
        };

        update();
        window.addEventListener('online', () => {
            update();
            this.showToast('Çevrimiçi oldunuz!', 'success');
        });
        window.addEventListener('offline', () => {
            update();
            this.showToast('Çevrimdışı mod aktif', 'warning');
        });
    }

    requestPushPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showToast('Bildirimler aktif!', 'success');
                }
            });
        }
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        window.addEventListener('resize', () => this.checkOrientation());

        // Auth
        this.setupAuth();

        // Navigation
        this.setupNavigation();

        // Modals
        this.setupModals();

        // Theme toggle
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const themes = ['neon', 'cyber', 'sunset', 'ocean'];
                const currentIndex = themes.indexOf(this.theme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                this.applyTheme(nextTheme);
                this.haptic('light');
            });
        }

        // Sync button
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.startSync());
        }

        // Menu button
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.openModal('settings-modal');
                this.haptic('light');
            });
        }

        // Visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.particles.forEach((p, i) => {
                    if (i > 10) p.element.style.display = 'none';
                });
            } else {
                this.particles.forEach(p => {
                    p.element.style.display = 'block';
                });
            }
        });

        // Install button
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                if (window.deferredPrompt) {
                    window.deferredPrompt.prompt();
                }
            });
        }
    }

    // ==================== PASSWORD STRENGTH ====================
    checkPasswordStrength() {
        const password = document.getElementById('reg-password').value;
        const fill = document.getElementById('strength-fill');
        const text = document.getElementById('strength-text');

        if (!fill || !text) return;

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        fill.className = 'strength-fill';

        if (strength <= 2) {
            fill.classList.add('weak');
            text.textContent = 'Zayıf';
            text.style.color = 'var(--error)';
        } else if (strength <= 3) {
            fill.classList.add('medium');
            text.textContent = 'Orta';
            text.style.color = 'var(--warning)';
        } else {
            fill.classList.add('strong');
            text.textContent = 'Güçlü';
            text.style.color = 'var(--success)';
        }
    }
}

// ==================== INITIALIZATION ====================
let app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new AynurSync();
        window.aynurApp = app;
    });
} else {
    app = new AynurSync();
    window.aynurApp = app;
}

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err);
    });
}

// Install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;

    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'flex';
});

// Shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(shakeStyle);
