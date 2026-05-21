/**
 * Aynur Sync v4.0 - Anticrack Protection Module
 * API Key yönetimi ve güvenlik katmanı
 * Bu dosya obfuscate edilmiştir - düzenlenmesi yasaktır
 */

(function() {
    'use strict';

    // ============================================
    // KORUNMUŞ API KEYLER (Base64 + XOR)
    // ============================================
    const _k1 = "Z3NrX0RLYkZpVk1ldEpBQlBvSzBOWHNHV0d5YjNGWXVRa2xkNDZFR0VHbkhORVZ5SW9nVFB3TA==";
    const _k2 = "QUl6YVN5REUtS0VZLVJFUExBQ0UtV0lUSC1SRUFM";

    function _d(s) {
        try {
            let r = atob(s);
            let x = 0x42;
            let o = '';
            for (let i = 0; i < r.length; i++) {
                o += String.fromCharCode(r.charCodeAt(i) ^ x);
            }
            return o;
        } catch(e) { return ''; }
    }

    // ============================================
    // FIREBASE CONFIG (Şifrelenmiş)
    // ============================================
    const _fc = {
        _a: "QUl6YVN5QkItMTIzNDU2Nzg5MA==",
        _d: "YXludXJzeW5jLWFwcC5maXJlYmFzZWFwcC5jb20=",
        _u: "aHR0cHM6Ly9heW51cnN5bmMtYXBwLWRlZmF1bHQtcnRkYi5maXJlYmFzZWlvLmNvbQ==",
        _p: "YXludXJzeW5jLWFwcA==",
        _s: "YXludXJzeW5jLWFwcC5hcHBzcG90LmNvbQ==",
        _m: "MTIzNDU2Nzg5MA==",
        _i: "MToxMjM0NTY3ODkwOndlYjphYmNkZWY="
    };

    // ============================================
    // ANTICRACK API
    // ============================================
    window.ANTICRACK = {
        version: "4.0.0",

        getGroqKey: function() {
            // Runtime'da çöz
            const key = _d(_k1);
            // Basit integrity check
            if (key.length < 50 || !key.startsWith('gsk_')) {
                console.warn('[ANTICRACK] Invalid key format');
                return null;
            }
            return key;
        },

        getFirebaseConfig: function() {
            try {
                return {
                    apiKey: atob(_fc._a),
                    authDomain: atob(_fc._d),
                    databaseURL: atob(_fc._u),
                    projectId: atob(_fc._p),
                    storageBucket: atob(_fc._s),
                    messagingSenderId: atob(_fc._m),
                    appId: atob(_fc._i)
                };
            } catch(e) {
                console.warn('[ANTICRACK] Config decode error');
                return null;
            }
        },

        // Debug koruması
        protect: function() {
            const _orig = console.log;
            const _keys = ['apiKey', 'groq', 'gsk_', 'firebase'];

            console.log = function(...args) {
                const s = args.join(' ');
                for (let k of _keys) {
                    if (s.includes(k)) return;
                }
                _orig.apply(console, args);
            };

            // DevTools detection (basit)
            setInterval(() => {
                const start = performance.now();
                debugger;
                const end = performance.now();
                if (end - start > 100) {
                    document.body.innerHTML = '<div style="padding:50px;text-align:center;"><h1>Güvenlik İhlali Tespit Edildi</h1></div>';
                }
            }, 3000);
        },

        // Request validation
        validateRequest: function(url) {
            const allowed = [
                'firebaseio.com',
                'googleapis.com',
                'groq.com',
                'gstatic.com',
                'cdn.tailwindcss.com',
                'cdnjs.cloudflare.com',
                'fonts.googleapis.com',
                'fonts.gstatic.com'
            ];
            return allowed.some(domain => url.includes(domain));
        }
    };

    // ============================================
    // GROQ AI HELPER (Film arama & öneri)
    // ============================================
    window.AYNUR_AI = {
        model: "llama-3.1-8b-instant",

        searchMovie: async function(query) {
            const key = window.ANTICRACK.getGroqKey();
            if (!key) return { error: 'API key not available' };

            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content: "Sen bir film uzmanısın. Kullanıcı film ismi verdiğinde, o film için direkt video/stream linki veya GitHub raw linki öner. Kesin link bilmiyorsan film hakkında bilgi ver. Kısa ve öz Türkçe cevap ver."
                            },
                            { role: "user", content: '"' + query + '" filmi için direkt video linki veya stream bilgisi ver. Varsa GitHub raw linki öner.' }
                        ],
                        temperature: 0.3,
                        max_tokens: 512
                    })
                });

                if (!response.ok) throw new Error('API Error: ' + response.status);
                const data = await response.json();
                return { success: true, result: data.choices?.[0]?.message?.content || 'Sonuç bulunamadı' };
            } catch (e) {
                return { error: e.message };
            }
        },

        recommend: async function(genre) {
            const key = window.ANTICRACK.getGroqKey();
            if (!key) return { error: 'API key not available' };

            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content: "Sen bir film öneri uzmanısın. Kullanıcıya 3-5 film öner ve neden önerdiğini kısaca açıkla. Film isimlerini kalın yap. Emoji kullan. Türkçe cevap ver."
                            },
                            { role: "user", content: genre + ' türünde film önerisi ver' }
                        ],
                        temperature: 0.7,
                        max_tokens: 1024
                    })
                });

                if (!response.ok) throw new Error('API Error: ' + response.status);
                const data = await response.json();
                return { success: true, result: data.choices?.[0]?.message?.content || 'Öneri bulunamadı' };
            } catch (e) {
                return { error: e.message };
            }
        }
    };

    // Koruma aktif et
    window.ANTICRACK.protect();

    console.log('[Aynur Sync v4.0] Anticrack module loaded');
})();
