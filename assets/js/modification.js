/**
 * Web Service Modification Script
 * 
 * This script detects various web services and modifies their DOM
 * to enable premium features or bypass restrictions.
 */

// Main execution function
(function() {
    try {
        // Get extension manifest data
        const manifestData = chrome.runtime.getManifest();
        
        // Get current domain and URL
        const currentDomain = window.location.hostname;
        const currentUrl = window.location.href;
        
        // Check which website we're on and call the appropriate modifier function
        if (currentDomain.includes('netflix.com')) {
            modifyNetflix();
        } 
        else if (currentDomain.includes('chat.openai.com')) {
            modifyChatGPT();
        } 
        else if (currentDomain.includes('bein.com')) {
            modifyBeIN();
        } 
        else if (currentDomain.includes('perplexity.ai')) {
            modifyPerplexity();
        } 
        else if (currentUrl.includes('turnitin.com/login/toolify/')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyTurnitin(toolifyValue);
        } 
        else if (currentUrl.includes('quillbot.com/login?returnUrl=%2Ftoolify%2F')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyQuillbot(toolifyValue);
        } 
        else if (currentUrl.includes('codeium.com/login?nextUrl=%2Ftoolify%2F')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyCodeium(toolifyValue);
        } 
        else if (currentUrl.includes('blush.design/login?returnUrl=%2Ftoolify')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyBlushDesign(toolifyValue);
        } 
        else if (currentUrl.includes('gamma.app/login?redirect=%2Ftoolify')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyGamma(toolifyValue);
        } 
        else if (currentUrl.includes('consensus.app/login?redirectUrl=%2Ftoolify')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyConsensus(toolifyValue);
        } 
        else if (currentUrl.includes('zerogpt.com/login?redirectUrl=%2Ftoolify')) {
            const toolifyValue = currentUrl.split('toolify/')[1];
            modifyZeroGPT(toolifyValue);
        }
    } catch (error) {
        console.error('Error in service modification script:', error);
    }
})();

/**
 * Modifies Netflix interface elements
 */
function modifyNetflix() {
    // Function to modify Netflix premium elements
    const applyNetflixChanges = () => {
        // Find and modify plan elements
        document.querySelectorAll('.profile-button').forEach(element => {
            if (element.nodeName === 'BUTTON') {
                element.value = 'Premium';
            }
            element.style.pointerEvents = 'auto';
            element.setAttribute('data-uia', 'premium-access');
        });
        
        // Modify other Netflix elements
        document.querySelectorAll('.label').forEach(element => {
            element.textContent = 'PREMIUM';
            element.setAttribute('data-uia', 'premium');
        });
    };
    
    // Apply changes immediately
    applyNetflixChanges();
    
    // Set up mutation observer to apply changes when DOM changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                applyNetflixChanges();
            }
        });
    });
    
    // Configure the observer
    const observerConfig = {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    };
    
    // Start observing
    observer.observe(document, observerConfig);
    
    // Add event listener for ready state changes
    if (document.readyState !== 'loading') {
        document.addEventListener('DOMContentLoaded', applyNetflixChanges);
    }
}

/**
 * Modifies ChatGPT interface elements
 */
function modifyChatGPT() {
    // Set up mutation observer to hide subscription elements
    const observer = new MutationObserver(() => {
        const subscriptionElement = document.querySelector('div[data-paid-feature-name="gpt-4"]');
        if (subscriptionElement) {
            subscriptionElement.style.display = 'none';
        }
    });
    
    const observerConfig = {
        childList: true,
        subtree: true
    };
    
    observer.observe(document.body, observerConfig);
}

/**
 * Modifies BeIN interface elements
 */
function modifyBeIN() {
    // Set up mutation observer to hide subscription elements
    const observer = new MutationObserver(() => {
        const subscriptionElement = document.querySelector('div.subscription-required-message');
        if (subscriptionElement) {
            subscriptionElement.style.display = 'none';
        }
    });
    
    const observerConfig = {
        childList: true,
        subtree: true
    };
    
    observer.observe(document.body, observerConfig);
}

/**
 * Modifies Perplexity interface elements
 */
function modifyPerplexity() {
    // Set up mutation observer to hide subscription elements
    const observer = new MutationObserver(() => {
        const subscriptionElement = document.querySelector('div.paywall-container');
        if (subscriptionElement) {
            subscriptionElement.style.display = 'none';
        }
    });
    
    const observerConfig = {
        childList: true,
        subtree: true
    };
    
    observer.observe(document.body, observerConfig);
}

/**
 * Modifies all pages to hide premium elements
 */
function modifyAll() {
    // Array of keywords to detect premium/subscription elements
    const premiumKeywords = [
        'premium',
        'subscription',
        'paywall',
        'upgrade',
        'subscribe'
    ];
    
    // Function to check and hide premium elements
    function checkAndHideElement(element) {
        const elementText = element.textContent.toString().toLowerCase();
        if (premiumKeywords.some(keyword => elementText.includes(keyword))) {
            element.style.display = 'none';
            console.log('Hidden premium element:', elementText);
        }
    }
    
    // Check existing elements
    const elements = document.querySelectorAll('div, span, button, a, p');
    elements.forEach(checkAndHideElement);
    
    // Set up mutation observer to check new elements
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    const newElements = node.querySelectorAll ? 
                        node.querySelectorAll('div, span, button, a, p') : [];
                    newElements.forEach(checkAndHideElement);
                }
            });
        });
    });
    
    const observerConfig = {
        childList: true,
        subtree: true
    };
    
    observer.observe(document.body, observerConfig);
}

/**
 * Fetches account data from the service API
 * @param {string} toolifyId - The ID for authentication
 * @returns {Promise<Object>} Account data
 */
async function fetchAccountData(toolifyId) {
    const response = await fetch(
        manifestData.serverApiUrl + '/api/v1/accounts/check/' + toolifyId,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                version: manifestData.version
            })
        }
    );
    
    return await response.json();
}

/**
 * Modifies Turnitin interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyTurnitin(toolifyId) {
    window.onload = async () => {
        try {
            // Fetch account data
            const accountData = await fetchAccountData(toolifyId);
            
            // Find and update account elements
            const nameElement = document.querySelector('#account-name');
            if (nameElement) {
                nameElement.textContent = accountData.account.email;
            }
            
            // Find and update subscription elements
            const subscriptionElement = document.querySelector('#account-subscription');
            if (subscriptionElement) {
                subscriptionElement.textContent = accountData.account.subscription_status;
            }
            
            // Find and click login button if present
            const loginButton = document.querySelector('#login-button');
            if (loginButton) {
                loginButton.click();
            }
        } catch (error) {
            console.error('Error modifying Turnitin:', error);
        }
    };
}

/**
 * Modifies Quillbot interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyQuillbot(toolifyId) {
    try {
        // Fetch account data
        const accountData = await fetchAccountData(toolifyId);
        
        // Set up mutation observer to update account elements
        const observer = new MutationObserver(() => {
            // Find and update email element
            const emailElement = document.querySelector('input[name="email"]');
            if (emailElement) {
                const event = new Event('input', { bubbles: true });
                emailElement.value = accountData.account.email;
                emailElement.dispatchEvent(event);
            }
            
            // Find and update password element
            const passwordElement = document.querySelector('input[name="password"]');
            if (passwordElement) {
                const event = new Event('input', { bubbles: true });
                passwordElement.value = accountData.account.subscription_status;
                passwordElement.dispatchEvent(event);
            }
            
            // Find login button and click it when both fields are filled
            const loginButton = document.querySelector('button[type="submit"]');
            if (loginButton && emailElement && passwordElement) {
                if (emailElement.value && passwordElement.value) {
                    setTimeout(() => {
                        if (emailElement.value && passwordElement.value) {
                            loginButton.click();
                            observer.disconnect();
                        }
                    }, 2000);
                }
            }
        });
        
        const observerConfig = {
            childList: true,
            subtree: true
        };
        
        observer.observe(document.body, observerConfig);
    } catch (error) {
        console.error('Error modifying Quillbot:', error);
    }
}

/**
 * Modifies Codeium interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyCodeium(toolifyId) {
    try {
        // Fetch account data
        const accountData = await fetchAccountData(toolifyId);
        
        // Set up mutation observer to update account elements
        const observer = new MutationObserver(() => {
            // Find and update email element
            const emailElement = document.querySelector('input[name="email"]');
            if (emailElement) {
                const event = new Event('input', { bubbles: true });
                emailElement.value = accountData.account.email;
                emailElement.dispatchEvent(event);
            }
            
            // Find and update password element
            const passwordElement = document.querySelector('input[name="password"]');
            if (passwordElement) {
                const event = new Event('input', { bubbles: true });
                passwordElement.value = accountData.account.subscription_status;
                passwordElement.dispatchEvent(event);
            }
            
            // Find login button and click it when both fields are filled
            const loginButton = document.querySelector('button[type="submit"]');
            if (loginButton && emailElement && passwordElement) {
                if (emailElement.value && passwordElement.value) {
                    loginButton.click();
                    observer.disconnect();
                }
            }
        });
        
        const observerConfig = {
            childList: true,
            subtree: true
        };
        
        observer.observe(document.body, observerConfig);
    } catch (error) {
        console.error('Error modifying Codeium:', error);
    }
}

/**
 * Modifies BlushDesign interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyBlushDesign(toolifyId) {
    try {
        // Fetch account data
        const accountData = await fetchAccountData(toolifyId);
        
        // Set up mutation observer to update account elements
        const observer = new MutationObserver(() => {
            // Find and update email element
            const emailElement = document.querySelector('input[type="email"]');
            if (emailElement) {
                const event = new Event('input', { bubbles: true });
                emailElement.value = accountData.account.email;
                emailElement.dispatchEvent(event);
            }
            
            // Find and update password element
            const passwordElement = document.querySelector('input[type="password"]');
            if (passwordElement) {
                const event = new Event('input', { bubbles: true });
                passwordElement.value = accountData.account.subscription_status;
                passwordElement.dispatchEvent(event);
            }
            
            // Find login button and click it when both fields are filled
            const loginButton = document.querySelector('button[type="submit"]');
            if (loginButton && emailElement && passwordElement) {
                if (emailElement.value && passwordElement.value) {
                    loginButton.click();
                    observer.disconnect();
                }
            }
        });
        
        const observerConfig = {
            childList: true,
            subtree: true
        };
        
        observer.observe(document.body, observerConfig);
    } catch (error) {
        console.error('Error modifying BlushDesign:', error);
    }
}

/**
 * Modifies Gamma interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyGamma(toolifyId) {
    try {
        // Fetch account data
        const accountData = await fetchAccountData(toolifyId);
        
        // Set up mutation observer to update account elements
        const observer = new MutationObserver(() => {
            // Find and update email element
            const emailElement = document.querySelector('input[type="email"]');
            if (emailElement) {
                const event = new Event('input', { bubbles: true });
                emailElement.value = accountData.account.email;
                emailElement.dispatchEvent(event);
            }
            
            // Find and update password element
            const passwordElement = document.querySelector('input[type="password"]');
            if (passwordElement) {
                const event = new Event('input', { bubbles: true });
                passwordElement.value = accountData.account.subscription_status;
                passwordElement.dispatchEvent(event);
            }
            
            // Find login button and click it when both fields are filled
            const loginButton = document.querySelector('button[type="submit"]');
            if (loginButton && emailElement && passwordElement) {
                if (emailElement.value && passwordElement.value) {
                    loginButton.click();
                    observer.disconnect();
                }
            }
        });
        
        const observerConfig = {
            childList: true,
            subtree: true
        };
        
        observer.observe(document.body, observerConfig);
    } catch (error) {
        console.error('Error modifying Gamma:', error);
    }
}

/**
 * Modifies Consensus interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyConsensus(toolifyId) {
    try {
        // Fetch account data
        const accountData = await fetchAccountData(toolifyId);
        
        // Set up mutation observer to update account elements
        const observer = new MutationObserver(() => {
            // Find and update email element
            const emailElement = document.querySelector('input[type="email"]');
            if (emailElement) {
                const event = new Event('input', { bubbles: true });
                emailElement.value = accountData.account.email;
                emailElement.dispatchEvent(event);
            }
            
            // Find and update password element
            const passwordElement = document.querySelector('input[type="password"]');
            if (passwordElement) {
                const event = new Event('input', { bubbles: true });
                passwordElement.value = accountData.account.subscription_status;
                passwordElement.dispatchEvent(event);
            }
            
            // Find login button and click it when both fields are filled
            const loginButton = document.querySelector('button[type="submit"]');
            if (loginButton && emailElement && passwordElement) {
                if (emailElement.value && passwordElement.value) {
                    loginButton.click();
                    observer.disconnect();
                }
            }
        });
        
        const observerConfig = {
            childList: true,
            subtree: true
        };
        
        observer.observe(document.body, observerConfig);
    } catch (error) {
        console.error('Error modifying Consensus:', error);
    }
}

/**
 * Modifies ZeroGPT interface with premium account data
 * @param {string} toolifyId - The ID for authentication
 */
async function modifyZeroGPT(toolifyId) {
    try {
        // Fetch account data
        const accountData = await fetchAccountData(toolifyId);
        
        // Set up mutation observer to update account elements
        const observer = new MutationObserver(() => {
            // Find and update email element
            const emailElement = document.querySelector('input[type="email"]');
            if (emailElement) {
                const event = new Event('input', { bubbles: true });
                emailElement.value = accountData.account.email;
                emailElement.dispatchEvent(event);
            }
            
            // Find and update password element
            const passwordElement = document.querySelector('input[type="password"]');
            if (passwordElement) {
                const event = new Event('input', { bubbles: true });
                passwordElement.value = accountData.account.subscription_status;
                passwordElement.dispatchEvent(event);
            }
            
            // The login elements are often in the second form on the page
            const loginButton = document.querySelectorAll('button[type="submit"]')[1];
            if (loginButton && emailElement && passwordElement) {
                if (emailElement.value && passwordElement.value) {
                    loginButton.click();
                    observer.disconnect();
                }
            }
        });
        
        const observerConfig = {
            childList: true,
            subtree: true
        };
        
        observer.observe(document.body, observerConfig);
    } catch (error) {
        console.error('Error modifying ZeroGPT:', error);
    }
}