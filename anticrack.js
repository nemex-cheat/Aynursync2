/**
 * AYNUR SYNC ULTIMATE - anticrack.js
 * Ultra Mega Security Layer
 * Protects against: DevTools, source viewing, debugging, copying
 */

(function() {
    'use strict';

    const PROTECTION = {
        enabled: true,
        debugAttempts: 0,
        maxDebugAttempts: 3,
        lastCheck: 0,
        checkInterval: 500
    };

    // ==================== DEVTOOLS DETECTION ====================
    function detectDevTools() {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;

        // Check if DevTools is open
        if (widthDiff > threshold || heightDiff > threshold) {
            return true;
        }

        // Check via console
        const start = performance.now();
        console.clear();
        const end = performance.now();

        // If console.clear is slow, DevTools might be open
        if (end - start > 100) {
            return true;
        }

        return false;
    }

    // ==================== ANTI-DEBUGGER ====================
    function antiDebugger() {
        const checker = setInterval(() => {
            const before = new Date().getTime();
            debugger;
            const after = new Date().getTime();

            if (after - before > 100) {
                PROTECTION.debugAttempts++;
                handleThreat('debugger');

                if (PROTECTION.debugAttempts >= PROTECTION.maxDebugAttempts) {
                    clearInterval(checker);
                    extremeProtection();
                }
            }
        }, 100);
    }

    // ==================== CONSOLE PROTECTION ====================
    function protectConsole() {
        const methods = ['log', 'warn', 'error', 'info', 'debug', 'table', 'trace'];

        methods.forEach(method => {
            const original = console[method];
            console[method] = function(...args) {
                if (detectDevTools()) {
                    handleThreat('console');
                    return;
                }
                // Only allow our own logs
                if (args[0] && typeof args[0] === 'string' && args[0].includes('AYNUR')) {
                    return original.apply(console, args);
                }
            };
        });

        // Override clear
        console.clear = function() {
            handleThreat('clear');
        };
    }

    // ==================== SOURCE PROTECTION ====================
    function protectSource() {
        // Disable right click on protected elements
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.protected, .glass, .auth-container, .sync-card')) {
                e.preventDefault();
                handleThreat('rightclick');
                return false;
            }
        });

        // Disable text selection on sensitive areas
        document.addEventListener('selectstart', (e) => {
            if (e.target.closest('.protected, .auth-container')) {
                e.preventDefault();
                return false;
            }
        });

        // Disable drag
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });
    }

    // ==================== KEYBOARD PROTECTION ====================
    function protectKeyboard() {
        const blockedKeys = [
            { key: 'F12', ctrl: false, shift: false },
            { key: 'i', ctrl: true, shift: true },  // Ctrl+Shift+I
            { key: 'j', ctrl: true, shift: true },  // Ctrl+Shift+J
            { key: 'c', ctrl: true, shift: true },  // Ctrl+Shift+C
            { key: 'u', ctrl: true, shift: false }, // Ctrl+U (view source)
            { key: 's', ctrl: true, shift: false }, // Ctrl+S (save)
            { key: 'p', ctrl: true, shift: false }, // Ctrl+P (print)
        ];

        document.addEventListener('keydown', (e) => {
            for (const blocked of blockedKeys) {
                if (e.key === blocked.key && 
                    e.ctrlKey === blocked.ctrl && 
                    e.shiftKey === blocked.shift) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleThreat('keyboard');
                    return false;
                }
            }

            // Block F keys (F1-F12) except F5
            if (e.key.startsWith('F') && e.key !== 'F5') {
                e.preventDefault();
                return false;
            }
        }, true);
    }

    // ==================== IFRAME PROTECTION ====================
    function protectIframe() {
        // Prevent framing
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    }

    // ==================== PERFORMANCE MONITORING ====================
    function monitorPerformance() {
        // Detect if user is stepping through code
        let lastTime = performance.now();

        setInterval(() => {
            const currentTime = performance.now();
            const diff = currentTime - lastTime;

            // If interval is way off, debugger might be active
            if (diff > PROTECTION.checkInterval * 3) {
                handleThreat('performance');
            }

            lastTime = currentTime;
        }, PROTECTION.checkInterval);
    }

    // ==================== THREAT HANDLER ====================
    function handleThreat(source) {
        if (!PROTECTION.enabled) return;

        PROTECTION.debugAttempts++;

        // Log threat (if our own console is available)
        if (typeof console !== 'undefined') {
            console.log('%c 🔒 Güvenlik Uyarısı ', 'background: #ff006e; color: white; font-size: 14px; padding: 5px 10px; border-radius: 4px;');
        }

        // Clear sensitive data from memory
        try {
            if (window.aynurApp && window.aynurApp.currentUser) {
                // Don't expose user data
                const safeUser = { username: window.aynurApp.currentUser.username };
                Object.defineProperty(window.aynurApp, 'currentUser', {
                    get: () => safeUser,
                    configurable: false
                });
            }
        } catch(e) {}

        if (PROTECTION.debugAttempts >= PROTECTION.maxDebugAttempts) {
            extremeProtection();
        }
    }

    // ==================== EXTREME PROTECTION ====================
    function extremeProtection() {
        // Freeze the page
        document.body.style.pointerEvents = 'none';
        document.body.style.filter = 'blur(10px)';

        // Clear all intervals and timeouts
        const highest = setTimeout(() => {}, 0);
        for (let i = 0; i < highest; i++) {
            clearTimeout(i);
            clearInterval(i);
        }

        // Override critical functions
        window.alert = () => {};
        window.confirm = () => false;
        window.prompt = () => null;

        // Show protection message
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #000;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 20px;
        `;
        overlay.innerHTML = `
            <div style="font-size: 48px;">🔒</div>
            <h1 style="color: #ff006e; font-size: 24px; font-weight: 900;">Güvenlik İhlali Tespit Edildi</h1>
            <p style="color: #666; font-size: 14px;">Sayfa güvenlik nedeniyle donduruldu.</p>
        `;
        document.body.appendChild(overlay);

        // Stop all execution
        while(true) {
            debugger;
        }
    }

    // ==================== CODE OBFUSCATION HELPERS ====================
    function obfuscateGlobals() {
        // Rename sensitive globals
        const originalDefineProperty = Object.defineProperty;
        Object.defineProperty = function(obj, prop, desc) {
            if (prop === 'currentUser' || prop === 'password' || prop === 'token') {
                // Log attempt to access sensitive props
                handleThreat('property_access');
            }
            return originalDefineProperty.call(this, obj, prop, desc);
        };
    }

    // ==================== INIT ====================
    function init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Apply protections
        protectConsole();
        protectSource();
        protectKeyboard();
        protectIframe();
        antiDebugger();
        monitorPerformance();
        obfuscateGlobals();

        // Periodic DevTools check
        setInterval(() => {
            if (detectDevTools()) {
                handleThreat('devtools');
            }
        }, 2000);

        console.log('%c 🔒 Ultra Mega Koruma Aktif ', 'background: #06ffa5; color: #000; font-size: 14px; padding: 5px 10px; border-radius: 4px; font-weight: 700;');
    }

    // Start protection
    init();

    // Expose minimal API
    window.AynurSecurity = {
        getStatus: () => ({
            enabled: PROTECTION.enabled,
            attempts: PROTECTION.debugAttempts,
            isSecure: PROTECTION.debugAttempts < PROTECTION.maxDebugAttempts
        })
    };
})();
