// =================================================================
// 1. GLOBAL EVENT BUS (The New Communication Engine)
// =================================================================
window.AppEvents = {
    emit: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })),
    on: (name, callback) => window.addEventListener(name, (e) => callback(e.detail))
};

// Register Service Worker for PWA Installation
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registered!'))
        .catch(err => console.log('Service worker registration failed:', err));
}

document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initNavigation();
    initSmartUI();
    initDateGesturesAndModals();
});

// =================================================================
// 2. PREMIUM PRELOADER LOGIC
// =================================================================
function initPreloader() {
    const preloader = document.getElementById('appPreloader');
    const preloaderIcon = document.getElementById('preloaderIcon');
    const preloaderGreeting = document.getElementById('preloaderGreeting');
    const homeIcon = document.getElementById('timeIcon');
    const homeGreeting = document.getElementById('dynamicGreeting');
    const appContainer = document.getElementById('app-container');

    const hour = new Date().getHours();
    let greetingText = hour < 12 ? 'Good Morning' : (hour < 18 ? 'Good Afternoon' : 'Good Evening');
    
    const svgIcon = hour < 18 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    const userName = localStorage.getItem('userDisplayName') || 'jiruuuu... :)';
    const fullText = `${greetingText}, ${userName}`;

    if (preloaderIcon) preloaderIcon.innerHTML = svgIcon;
    if (preloaderGreeting) preloaderGreeting.textContent = fullText;
    
    if (homeIcon) homeIcon.innerHTML = svgIcon.replace('stroke-width="1.5"', 'stroke-width="2.5"');
    if (homeGreeting) homeGreeting.textContent = fullText;

    setTimeout(() => {
        if (preloader) preloader.classList.add('hidden'); 
        if (appContainer) appContainer.classList.remove('app-hidden'); 
    }, 2000); 
}

// =================================================================
// 3. NAVIGATION LOGIC
// =================================================================
function initNavigation() {
    const navButtons = document.querySelectorAll('.bottom-pill-btn');
    const tabs = document.querySelectorAll('.app-tab');
    const floatingTodoInput = document.getElementById('floatingTodoInput');

    if (!navButtons.length || !tabs.length) return;

    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const targetId = event.currentTarget.getAttribute('data-target');
            if (!targetId) return;

            navButtons.forEach(btn => btn.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));

            event.currentTarget.classList.add('active');
            const targetTab = document.getElementById(targetId);
            if (targetTab) targetTab.classList.add('active');

            if (floatingTodoInput) {
                targetId === 'tab-todo' ? floatingTodoInput.classList.add('active') : floatingTodoInput.classList.remove('active');
            }

            // Tell the rest of the app that the tab changed!
            AppEvents.emit('TAB_CHANGED', { tab: targetId });
        });
    });
}

// =================================================================
// 4. SMART UI (SCROLL HIDING)
// =================================================================
function initSmartUI() {
    const bottomNav = document.getElementById('bottomNav');
    const floatingTodoInput = document.getElementById('floatingTodoInput');
    const journalEditor = document.getElementById('journalEditor');
    
    if (!bottomNav) return;

    let lastScrollY = 0;
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 40) {
            bottomNav.classList.add('nav-hidden');
            if (floatingTodoInput?.classList.contains('active')) floatingTodoInput.classList.add('keyboard-active');
        } else if (currentScrollY < lastScrollY) {
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) floatingTodoInput.classList.remove('keyboard-active');
        }
        lastScrollY = currentScrollY;
    }, { passive: true });

    if (journalEditor) {
        let lastJournalScrollY = 0;
        journalEditor.addEventListener('scroll', () => {
            const currentScrollY = journalEditor.scrollTop;
            if (currentScrollY > lastJournalScrollY && currentScrollY > 20) {
                bottomNav.classList.add('nav-hidden');
            } else if (currentScrollY < lastJournalScrollY) {
                bottomNav.classList.remove('nav-hidden');
            }
            lastJournalScrollY = currentScrollY;
        }, { passive: true });
    }

    const baseWindowHeight = window.innerHeight;
    document.addEventListener('focusin', (e) => {
        if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.id !== 'journalEditor') {
            bottomNav.classList.add('nav-hidden');
            if (floatingTodoInput && e.target.id === 'newTaskInput') floatingTodoInput.classList.add('keyboard-active');
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) floatingTodoInput.classList.remove('keyboard-active');
        }
    });

    const handleKeyboardClose = (currentHeight) => {
        if (currentHeight >= baseWindowHeight - 100) {
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) floatingTodoInput.classList.remove('keyboard-active');
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                document.activeElement.blur();
            }
        }
    };

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => handleKeyboardClose(window.visualViewport.height));
    } else {
        window.addEventListener('resize', () => handleKeyboardClose(window.innerHeight));
    }
}

// =================================================================
// 5. EVENT-DRIVEN GESTURES & MODALS
// =================================================================
function initDateGesturesAndModals() {
    const globalSwipeToggle = document.getElementById('globalSwipeToggle');
    let isGlobalSwipeEnabled = JSON.parse(localStorage.getItem('globalSwipeEnabled'));
    if (isGlobalSwipeEnabled === null) isGlobalSwipeEnabled = true; 
    
    if (globalSwipeToggle) {
        globalSwipeToggle.checked = isGlobalSwipeEnabled;
        globalSwipeToggle.addEventListener('change', (e) => {
            isGlobalSwipeEnabled = e.target.checked;
            localStorage.setItem('globalSwipeEnabled', isGlobalSwipeEnabled);
        });
    }

    const attachSwipe = (element, tabName, checkAllowed = null) => {
        if (!element) return;
        let startX = 0, startY = 0;

        element.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            if (checkAllowed && !checkAllowed()) return;
            const diffX = e.changedTouches[0].screenX - startX;
            const diffY = e.changedTouches[0].screenY - startY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                // Emit signal instead of directly calling functions
                if (diffX < 0) AppEvents.emit('DATE_CHANGE', { tab: tabName, direction: 1 });  
                else if (diffX > 0) AppEvents.emit('DATE_CHANGE', { tab: tabName, direction: -1 });           
            }
        }, { passive: true });
    };

    attachSwipe(document.getElementById('tab-todo'), 'todo', () => isGlobalSwipeEnabled);
    attachSwipe(document.getElementById('tab-journal'), 'journal', () => isGlobalSwipeEnabled);
    attachSwipe(document.getElementById('todoDateNav'), 'todo');
    attachSwipe(document.getElementById('journalDateNav'), 'journal');

    const dateModal = document.getElementById('datePickerModalOverlay');
    const dateInput = document.getElementById('globalDatePickerInput');
    const closeBtn = document.getElementById('closeDatePickerBtn');
    const confirmBtn = document.getElementById('confirmDatePickerBtn');
    let activeTabForPicker = null; 

    // Listen for requests to open the date picker
    AppEvents.on('REQUEST_DATE_PICKER', ({ tab, dateStr }) => {
        activeTabForPicker = tab;
        dateInput.value = dateStr; 
        dateModal.style.display = 'flex';
    });

    const closeDateModal = () => { dateModal.style.display = 'none'; };
    closeBtn.addEventListener('click', closeDateModal);
    
    confirmBtn.addEventListener('click', () => {
        if (!dateInput.value) return;
        const [y, m, d] = dateInput.value.split('-');
        const targetDateObj = new Date(y, m - 1, d);
        
        // Broadcast the specific date jump
        AppEvents.emit('JUMP_DATE', { tab: activeTabForPicker, date: targetDateObj });
        closeDateModal();
    });
}

// =================================================================
// 6. GLOBAL MODAL "CLICK OUTSIDE TO CLOSE" LOGIC
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            // If the user clicked the dark background itself, NOT the modal box inside it
            if (e.target === overlay) {
                // Find the Cancel/Close button for this specific modal and click it programmatically
                const closeBtn = overlay.querySelector('.btn-secondary') || overlay.querySelector('.btn-ghost');
                
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    // Fallback just in case
                    overlay.style.display = 'none';
                }
            }
        });
    });
});