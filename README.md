# Cupix369 - Senkron Film Platformu

## Özellikler
- ✅ Senkron film izleme (herkes aynı saniyede)
- ✅ Oda sistemi (şifreli/şifresiz)
- ✅ Davet linki ve oda kodu ile giriş
- ✅ AI Film Öneri (Groq API - Llama 3.1 8B)
- ✅ Canlı sohbet ve emoji tepkileri
- ✅ Film arama (isim yazınca AI bulur)
- ✅ GitHub Raw ve direkt link desteği
- ✅ Misafir modu YOK (e-posta istemez)
- ✅ Responsive tasarım

## Kurulum

### 1. Firebase Ayarları
1. [Firebase Console](https://console.firebase.google.com) gidin
2. Yeni proje oluşturun
3. Realtime Database oluşturun (test modunda başlatın)
4. Proje ayarlarından config bilgilerini alın
5. `app.js` ve `watch.js` içindeki `firebaseConfig` kısmını kendi bilgilerinizle değiştirin

### 2. Dosyalar
- `index.html` - Ana sayfa (oda kurma, AI, odalar)
- `watch.html` - Sinema modu (film izleme, sohbet)
- `app.js` - Ana uygulama kodu
- `watch.js` - Sinema modu kodu

### 3. Kullanım
1. `index.html` açın
2. "Oda Kur" ile yeni oda oluşturun
3. "Davet" butonu ile arkadaşlarınızı davet edin
4. Film yükleyin ve izlemeye başlayın
5. AI Film Öneri ile yeni filmler keşfedin

## AI Film Öneri
Groq API (Llama 3.1 8B Instant) kullanılarak:
- Film önerileri
- Film hakkında bilgi
- Tür analizi
- Popüler filmler

## Klavye Kısayolları (Watch Modu)
- `Space` - Oynat/Durdur
- `←` - 5sn geri
- `→` - 5sn ileri
- `F` - Tam ekran
- `M` - Sessiz

## Notlar
- API key güvenliği için production'da backend proxy kullanın
- Firebase rules güvenlik için düzenleyin
- Film linkleri CORS destekli olmalı

---
© 2026 Cupix369 - Tüm Hakları Saklıdır
