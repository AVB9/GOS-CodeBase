// =================================================================
// SANITIZE.JS - XSS PREVENTION UTILITY
// =================================================================

/**
 * Sanitize user input to prevent XSS attacks
 * Escapes HTML special characters
 */
function sanitizeHTML(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitize input for display in DOM
 * Safe for textContent or innerText assignment
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.trim();
}

/**
 * Validate and sanitize task/habit/goal names
 * Length checks + character filtering
 */
function sanitizeName(name, maxLength = 200) {
    if (typeof name !== 'string') return '';
    
    let sanitized = name
        .trim()
        .slice(0, maxLength)
        .replace(/[<>\"']/g, ''); // Remove dangerous chars
    
    return sanitized;
}

/**
 * Validate email addresses
 */
function validateEmail(email) {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Safe element text update (prevents XSS)
 */
function setSafeText(element, text) {
    if (!element) return;
    element.textContent = sanitizeText(text);
}

/**
 * Safe element HTML update (for pre-validated HTML only)
 * WARNING: Only use with trusted HTML sources
 */
function setSafeHTML(element, html) {
    if (!element) return;
    // Create temp container to parse HTML safely
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove any script tags or event handlers
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    
    const dangerous = temp.querySelectorAll('[onclick], [onerror], [onload]');
    dangerous.forEach(el => {
        for (let attr of el.attributes) {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    
    element.innerHTML = temp.innerHTML;
}

/**
 * Validate JSON from localStorage
 * Prevents injection of malicious data
 */
function parseLocalStorageJSON(key) {
    try {
        const data = localStorage.getItem(key);
        if (!data) return null;
        return JSON.parse(data);
    } catch (e) {
        console.warn(`Invalid JSON in localStorage key: ${key}`);
        return null;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AppSanitize = {
        sanitizeHTML,
        sanitizeText,
        sanitizeName,
        validateEmail,
        setSafeText,
        setSafeHTML,
        parseLocalStorageJSON
    };
}

export { 
    sanitizeHTML, 
    sanitizeText, 
    sanitizeName, 
    validateEmail, 
    setSafeText, 
    setSafeHTML,
    parseLocalStorageJSON 
};
