/**
 * Chrome Extension untuk Autentikasi dan Manajemen Layanan
 * 
 * Extension ini mengintegrasikan autentikasi untuk berbagai platform
 * dengan fitur:
 * - Validasi status langganan
 * - Manajemen cookie cross-domain
 * - Autentikasi berbasis JWT
 * - Penampilan UI dinamis berdasarkan status pengguna
 */

// Data manifest dari extension
var manifestData = chrome.runtime.getManifest();

// Event listener untuk DOM Content Loaded
document.addEventListener("DOMContentLoaded", function () {
    // Menambahkan class loading untuk menunjukkan proses sedang berlangsung
    $(`.service-category`).addClass('loading');

    // Endpoint API yang akan diakses
    const apiEndpoint = 'auth.service';

    // Request untuk memeriksa kredensial
    const requestData = {
        url: manifestData.homepage_url,
        name: 'token'
    };

    // Melakukan request ke API untuk validasi token
    chrome.cookies.get(requestData, function (cookie) {
        if (cookie) {
            // Jika cookie ditemukan, load tools berdasarkan token
            loadTools(cookie, apiEndpoint);
            checkSubscriptionStatus();
        } else {
            // Jika cookie tidak ditemukan, tampilkan pesan error
            $(`.subscription-button`).addClass('loading');
            $('.tool-box').removeClass('loading');
            return;
        }
    });

    // Event handler untuk pencarian tools
    $('.search-input').on('keyup', function () {
        const searchText = $(this).val().toLowerCase();
        $('.tool-id').each(function () {
            const toolName = $(this).attr('data-tool-id').toLowerCase();
            if (toolName.includes(searchText)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
});

// Event listener untuk logout
document.querySelector("#logout-button").addEventListener("click", () => {
    // Membuat request untuk logout dengan menghapus cookies
    const cookieRequest = {
        firstPartyDomain: true,
        storeId: null
    };

    chrome.cookies.getAll(cookieRequest, cookies => {
        if (cookies.length > 0) {
            // Iterasi setiap cookie dan hapus
            cookies.forEach(cookieItem => {
                // Membuat data untuk item yang akan dihapus
                const cookieData = {
                    url: "https://" + (cookieItem.secure ? "s" : "") + "://" + cookieItem.domain + cookieItem.path,
                    name: cookieItem.name
                };

                // Hapus cookie dari Chrome storage
                chrome.cookies.remove(cookieData);
            });
        } else {
            // Tampilkan pesan error jika tidak ada cookie
            showAlert("Tidak ditemukan sesi login", "warning");
        }
    });
});

/**
 * Memeriksa status langganan user
 * Request ke server untuk validasi langganan aktif
 */
async function checkSubscriptionStatus() {
    try {
        // Request ke API untuk status langganan
        const response = await fetch(manifestData.homepage_url + "/api/app/subscription/check", {
            method: "GET",
            credentials: "include"
        });

        const responseData = await response.json();

        if (responseData.status) {
            // Element-element UI untuk ditampilkan berdasarkan status
            const subscriptionElement = document.getElementById("subscription-alert");
            const messageElement = document.getElementById("subscription-message");
            const buyButton = document.getElementById("subscription-buy");
            const closeButton = document.getElementById("subscription-close");

            // Validasi element UI
            if ((!subscriptionElement || !messageElement) || !buyButton || !closeButton) return;

            // Update pesan subscription
            messageElement.textContent = responseData.status;
            subscriptionElement.classList.remove("d-none");

            // Event handler untuk tombol beli
            const buyButtonClone = buyButton.cloneNode(true);
            buyButton.parentNode.replaceChild(buyButtonClone, buyButton);

            buyButtonClone.addEventListener("click", function () {
                window.open("https://tool.domain/buy", "_blank");
            });

            // Event handler untuk tombol close
            const closeButtonClone = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(closeButtonClone, closeButton);

            closeButtonClone.addEventListener("click", function () {
                subscriptionElement.style.display = "none";
            });

            // Timer untuk menyembunyikan notifikasi
            setTimeout(() => {
                subscriptionElement.style.display = "none";
            }, 8000);
        }

        // Handle status response code
        if (response.status === 426) {
            // Tampilkan pesan upgrade required
            removeCookies();
            $('.subscription-button').removeClass('loading');
            $('.tool-box').addClass('loading');
            $('#logged-in').removeClass('loading');
            return;
        }

        if (response.status === 403) {
            // Tampilkan pesan akses ditolak
            removeCookies();
            $('.subscription-button').removeClass('loading');
            $('.tool-box').addClass('loading');
            $('#logged-in').removeClass('loading');
            return;
        }

        if (response.status === 440) {
            // Tampilkan pesan sesi habis
            removeCookies();
            $('.subscription-button').removeClass('loading');
            $('.tool-box').addClass('loading');
            $('#logged-in').removeClass('loading');
            return;
        }

        if (response.status === 401) {
            // Tampilkan pesan tidak terotentikasi
            removeCookies();
            $('.subscription-button').removeClass('loading');
            $('.tool-box').addClass('loading');
            $('#logged-in').removeClass('loading');
            return;
        }

    } catch (error) {
        // Log error dan tampilkan pesan error
        console.log("Error checking subscription status:", error);
    }
}

/**
 * Encoding base64url untuk JWT
 * @param {Object} data - Data yang akan dienkode
 * @returns {String} - Encoded string dalam format base64url
 */
function base64UrlEncode(data) {
    const jsonString = JSON.stringify(data);
    const base64String = btoa(jsonString);
    return base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Membuat signature HMAC untuk JWT
 * @param {String} input - Data yang akan ditandatangani
 * @param {String} key - Secret key untuk signing
 * @returns {String} - Signature dalam format base64url
 */
async function createHMACSignature(input, key) {
    const encoder = new TextEncoder;
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(input);

    try {
        // Menggunakan Web Crypto API untuk signing
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
        const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

        // Format signature ke base64url
        return base64Signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    } catch (error) {
        console.log("Error creating HMAC signature:", error);
        throw new Error("Failed to create HMAC signature.");
    }
}

/**
 * Membuat token JWT
 * @param {Object} payload - Payload untuk JWT
 * @param {String} key - Secret key untuk signing
 * @returns {String} - Token JWT lengkap
 */
async function createJWT(payload, key) {
    // Header JWT standar
    const header = {
        alg: "HS256",
        typ: "JWT"
    };

    // Encode header dan payload
    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const dataToSign = encodedHeader + "." + encodedPayload;

    // Buat signature
    const signature = await createHMACSignature(dataToSign, key);

    // Return full JWT
    return encodedHeader + "." + encodedPayload + "." + signature;
}

/**
 * Generate unique ID untuk request
 * @returns {String} - Unique ID
 */
function generateUniqueId() {
    return crypto.randomUUID();
}

/**
 * Load tools dari API berdasarkan cookie
 * @param {Object} cookie - Cookie untuk autentikasi
 * @param {String} apiKey - API key untuk autentikasi
 */
async function loadTools(cookie, apiKey) {
    try {
        // Buat JWT untuk autentikasi API
        const jwtToken = await createJWT({
            sub: cookie,
            iat: Math.floor(Date.now() / 1000),
            jti: generateUniqueId()
        }, apiKey);

        // Request ke API untuk mendapatkan tools
        const response = await fetch(manifestData.homepage_url + "/api/app/app", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                version: manifestData.version,
                token: jwtToken
            })
        });

        const responseData = await response.json();

        // Handle error response codes
        if (!response.ok) {
            $('.tool-box').removeClass('loading');
            const errorMessage = responseData.message || "Failed to load tools";
            showAlert(errorMessage, "error");
            return;
        }

        // Handle specific error codes
        if (response.status === 404) {
            showAlert("Service not found", "error");
        }

        // Jika hanya ada 1 varian, langsung buka
        if (responseData.tools.length === 1) {
            openVariant(responseData.tools[0].id, cookie, apiKey);
            return;
        }

        // Render tools yang tersedia
        const toolsContainer = $('#variants-list');
        toolsContainer.empty();

        // Map tools ke HTML
        const toolsHtml = responseData.tools.map(tool =>
            `<div class="col-2 my-1">
        <div class="card variant-card" role="button" aria-label="card variant">
          <div class="card-body text-center" data-variant-id="${tool.id}">
            <img class="logo" src="${tool.logo}" alt="${tool.name}">
            <div class="card-max-height:100%; margin:0; text-max-width:100%">
              ${tool.premium_access === true ? '<div class="subscription-required"><span>Perlu berlangganan!</span></div>' : ''}
              <div class="variant-category" data-category="${tool.category}">${tool.name}</div>
            </div>
          </div>
        </div>
      </div>`
        ).join("");

        // Render tools ke container
        toolsContainer.append(toolsHtml);

        // Update UI status
        $('.tool-box').removeClass('loading');
        $('#logged-in').removeClass('loading');
        $('.subscription-button').addClass('loading');

        // Handle jika ada pesan pada response
        if (responseData.message != null) {
            showAlertService(responseData.message, "warning");
        }

        // Add event listeners untuk tool cards
        $('.variant-card').find(".card-body").on('click', function () {
            const variantId = $(this).attr('data-variant-id');
            openVariant(variantId, cookie, apiKey);
        });

        // Add event listeners untuk service category
        $('.service-category').find(".cat-button").on('click', function () {
            const categoryId = $(this).attr('data-tool-id');
            $('.service-category').find(".cat-button").addClass('btn-other');
            $(this).removeClass('btn-other');

            if (categoryId === 'all') {
                $('.variants-list').show();
            } else {
                $('.variants-list').hide();
                $(`.variant-category[data-category="${categoryId}"]`).show();
            }
        });

    } catch (error) {
        console.log("Error loading tools:", error);
        $('.tool-box').removeClass('loading');
    }
}

/**
 * Buka varian tool tertentu
 * @param {String} variantId - ID varian tool
 * @param {Object} cookie - Cookie untuk autentikasi
 * @param {String} apiKey - API key untuk autentikasi
 */
async function openVariant(variantId, cookie, apiKey) {
    // Buat JWT untuk autentikasi
    const jwtToken = await createJWT({
        sub: cookie,
        iat: Math.floor(Date.now() / 1000),
        jti: generateUniqueId()
    }, apiKey);

    // Request ke API untuk mendapatkan detail varian
    fetch(manifestData.homepage_url + "/api/app/variant/" + variantId, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            version: manifestData.version,
            token: jwtToken
        })
    })
        .then(response => response.json())
        .then(data => {
            // Process cookies jika ada
            const toolData = data.tool;

            if (toolData.cookies != null && toolData.cookies !== undefined) {
                const cookiesArray = JSON.parse(toolData.cookies);

                cookiesArray.forEach(cookieItem => {
                    // Set cookie untuk website target
                    const cookieData = {
                        url: toolData.url,
                        name: cookieItem.name
                    };

                    // Add cookie ke Chrome
                    chrome.cookies.set(cookieData);

                    // Setup cookie detail untuk storage
                    chrome.cookies.set({
                        url: toolData.url,
                        name: cookieItem.name,
                        value: cookieItem.value,
                        domain: cookieItem.domain,
                        httpOnly: cookieItem.httpOnly,
                        path: cookieItem.path,
                        sameSite: cookieItem.sameSite === null ? null :
                            cookieItem.sameSite ? cookieItem.sameSite.toLowerCase() : "lax",
                        secure: cookieItem.secure,
                        storeId: cookieItem.storeId,
                        expirationDate: cookieItem.expirationDate
                    });
                });
            }

            // Redirect ke URL tool
            let targetUrl = toolData.url;
            if (targetUrl.endsWith('?tool=')) {
                targetUrl += variantId;
            }

            // Buka URL di tab Chrome
            const tabOptions = {
                url: targetUrl
            };
            chrome.tabs.create(tabOptions);
        })
        .catch(error => {
            console.log("Error opening variant:", error);
        });
}

/**
 * Tampilkan alert ke user
 * @param {String} message - Pesan yang ditampilkan
 * @param {String} type - Tipe alert (success, error, warning, info)
 */
function showAlert(message, type = "warning") {
    const alertContainer = document.getElementById("alert-container");
    const alertElement = document.createElement("div");

    alertElement.className = `alert-message-${type}`;
    alertElement.innerHTML = `
    <div class="floating-alert alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;

    alertContainer.appendChild(alertElement);

    // Auto-dismiss setelah 3 detik
    setTimeout(() => {
        alertElement.remove();
    }, 3000);

    // Add event listener untuk tombol close
    alertElement.querySelector(".btn-close").addEventListener("click", () => {
        alertElement.remove();
    });
}

/**
 * Tampilkan alert khusus service
 * @param {String} message - Pesan yang ditampilkan
 * @param {String} type - Tipe alert (success, error, warning, info)
 */
function showAlertService(message, type = "warning") {
    removeAlertService();

    const alertContainer = document.getElementById("alert-container");
    const alertElement = document.createElement("div");

    alertElement.className = `alert-not-logged-in-${type}`;
    alertElement.id = "service-alert";
    alertElement.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <strong>Perhatian!</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;

    alertContainer.appendChild(alertElement);

    // Add event listener untuk tombol close
    alertElement.querySelector(".btn-close").addEventListener("click", () => {
        alertElement.remove();
    });
}

/**
 * Hapus alert service yang sedang ditampilkan
 */
function removeAlertService() {
    const alertElement = document.querySelector("#service-alert");
    if (alertElement) {
        alertElement.remove();
    }
}

/**
 * Extract nama domain dari URL
 * @param {String} hostname - Nama host/domain
 * @returns {String} - Nama domain yang sudah diformat
 */
const getSiteName = hostname => {
    const parts = hostname.split(".");
    const domain = parts.length > 2 ? parts[1] : parts[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
};

/**
 * Hapus semua cookies dari domain tertentu
 * Digunakan untuk logout dari semua layanan
 */
function removeCookies() {
    // List domain yang akan dihapus cookienya
    const domainList = [
        "github.com",
        "gitlab.com",
        "bitbucket.org",
        "cloudflare.com",
        "vercel.com",
        "netlify.com",
        "heroku.com",
        "digitalocean.com",
        "aws.amazon.com",
        "azure.microsoft.com",
        "cloud.google.com",
        "npmjs.com",
        "packagist.org",
        "pypi.org",
        "rubygems.org",
        "hub.docker.com",
        "kubernetes.io",
        "jenkins.io",
        "travis-ci.org",
        "circleci.com",
        "sentry.io",
        "newrelic.com",
        "datadog.com",
        "loggly.com",
        "splunk.com",
        "elastic.co",
        "mongodb.com",
        "redis.io",
        "postgresql.org",
        "mysql.com",
        "mariadb.org",
        "stripe.com",
        "paypal.com",
        "braintree.com",
        "twilio.com",
        "sendgrid.com",
        "mailchimp.com",
        "slack.com",
        "discord.com",
        "trello.com",
        "asana.com",
        "jira.atlassian.com",
        "notion.so",
        "airtable.com",
        "zapier.com",
        "ifttt.com",
        "algolia.com",
        "cloudinary.com",
        "auth0.com",
        "firebase.google.com",
        "amplitude.com",
        "mixpanel.com",
        "segment.com",
        "optimizely.com",
        "launchdarkly.com",
        "sentry.io",
        "bugsnag.com",
        "rollbar.com",
        "logrocket.com",
        "intercom.io"
    ];

    // Hapus cookies untuk setiap domain
    domainList.forEach(domain => {
        const domainData = {
            domain: domain
        };

        chrome.cookies.getAll(domainData, cookies => {
            if (cookies.length === 0) return;

            cookies.forEach(cookie => {
                // Format cookie untuk dihapus
                const cookieData = {
                    url: cookie.url,
                    name: cookie.name
                };

                // Hapus cookie
                chrome.cookies.remove(cookieData);
            });
        });
    });
}

// Inspeksi cookie saat ekstensi dimuat
chrome.cookies.getAll({}, cookies => {
    if (cookies.length > 0) {
        const firstCookie = cookies[0];
        const cookieUrl = new URL(firstCookie.url);
        const hostname = cookieUrl.hostname;
        const siteName = getSiteName(hostname);

        // Tampilkan notifikasi domain
        const domainElement = document.createElement("div");
        domainElement.textContent = `Hey you welcome to new system ${siteName}`;
    }
});