// Aynur Sync v4.0 - Raw Video Player Helper
// GitHub Raw ve direkt video linkleri için oynatıcı

class RawPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.currentUrl = '';
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    load(url) {
        if (!url) return false;

        this.currentUrl = url;
        this.retryCount = 0;

        // URL tipini belirle
        const type = this.detectType(url);

        if (type === 'youtube') {
            return this.loadYouTube(url);
        } else if (type === 'hls') {
            return this.loadHLS(url);
        } else {
            return this.loadDirect(url);
        }
    }

    detectType(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'youtube';
        } else if (url.includes('.m3u8')) {
            return 'hls';
        } else if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) {
            return 'direct';
        } else {
            return 'direct'; // Varsayılan
        }
    }

    loadDirect(url) {
        if (!this.video) return false;

        this.video.src = url;
        this.video.load();

        // Hata yönetimi
        this.video.onerror = () => {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => {
                    this.video.load();
                }, 1000);
            } else {
                this.showError('Video yüklenemedi. CORS politikası veya geçersiz link.');
            }
        };

        return true;
    }

    loadYouTube(url) {
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            this.showError('Geçersiz YouTube URL');
            return false;
        }

        // YouTube embed API kullan
        // Not: Gerçek uygulamada YouTube IFrame API kullanılmalı
        this.showError('YouTube videosu için embed modu gerekiyor');
        return false;
    }

    loadHLS(url) {
        // HLS.js kullanılabilir
        this.showError('HLS stream için HLS.js kütüphanesi gerekiyor');
        return false;
    }

    extractYouTubeId(url) {
        const regExp = /^.*(youtu.be/|v/|u/\w/|embed/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    showError(msg) {
        console.error('[RawPlayer]', msg);
        if (typeof showToast === 'function') {
            showToast(msg, 'error');
        }
    }

    // CORS proxy kullanma (gerekirse)
    proxify(url) {
        // Kendi proxy sunucunuz varsa buraya ekleyin
        // Örnek: return 'https://your-proxy.com/?url=' + encodeURIComponent(url);
        return url;
    }
}

// Global erişim
window.RawPlayer = RawPlayer;
