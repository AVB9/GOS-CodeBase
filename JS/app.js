// =================================================================
// 1. GLOBAL EVENT BUS & INIT
// =================================================================
window.AppEvents = {
    emit: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })),
    on: (name, callback) => window.addEventListener(name, (e) => callback(e.detail)),
    off: (name, callback) => window.removeEventListener(name, callback) 
};

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
    initGlobalModals(); 
});

// =================================================================
// 2. PREMIUM PRELOADER LOGIC
// =================================================================
const PRELOADER_ASSETS = {
    daySvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    nightSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
};

function initPreloader() {
    const preloader = document.getElementById('appPreloader');
    const preloaderIcon = document.getElementById('preloaderIcon');
    const preloaderGreeting = document.getElementById('preloaderGreeting');
    const homeIcon = document.getElementById('timeIcon');
    const homeGreeting = document.getElementById('dynamicGreeting');
    const appContainer = document.getElementById('app-container');

    const hour = new Date().getHours();
    let greetingText = hour < 12 ? 'Good Morning' : (hour < 18 ? 'Good Afternoon' : 'Good Evening');
    const svgIcon = hour < 18 ? PRELOADER_ASSETS.daySvg : PRELOADER_ASSETS.nightSvg;

    let userName = 'jiruuuu... :)';
    try {
        userName = localStorage.getItem('userDisplayName') || userName;
    } catch(e) {
        console.warn("LocalStorage restricted, using default name.");
    }

    const fullText = `${greetingText}, ${userName}`;

    if (preloaderIcon) preloaderIcon.innerHTML = svgIcon;
    if (preloaderGreeting) preloaderGreeting.textContent = fullText;
    
    if (homeIcon) homeIcon.innerHTML = svgIcon.replace('stroke-width="1.5"', 'stroke-width="2.5"');
    if (homeGreeting) homeGreeting.textContent = fullText;

    setTimeout(() => {
        if (preloader) preloader.classList.add('hidden'); 
        if (appContainer) appContainer.classList.remove('app-hidden'); 
    }, 800); 
}

// =================================================================
// 3. NAVIGATION LOGIC (With Swipe Gestures)
// =================================================================
function initNavigation() {
    const bottomNav = document.getElementById('bottomNav');
    const navButtons = document.querySelectorAll('.bottom-pill-btn');
    const tabs = document.querySelectorAll('.app-tab');
    const floatingTodoInput = document.getElementById('floatingTodoInput');

    if (!navButtons.length || !tabs.length) return;

    // Ordered array of tabs for left/right swipe math
    const tabOrder = ['tab-journal', 'tab-planner', 'tab-home', 'tab-todo', 'tab-settings'];

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

            AppEvents.emit('TAB_CHANGED', { tab: targetId });
        });
    });

    // --- FEATURE 5: NAV PILL SWIPING ---
    if (bottomNav) {
        let navStartX = 0;
        bottomNav.addEventListener('touchstart', (e) => { 
            navStartX = e.touches[0].clientX; 
        }, { passive: true });

        bottomNav.addEventListener('touchend', (e) => {
            const navEndX = e.changedTouches[0].clientX;
            const diffX = navStartX - navEndX;
            
            // If horizontal swipe distance is greater than 40px
            if (Math.abs(diffX) > 40) {
                const activeBtn = document.querySelector('.bottom-pill-btn.active');
                if (!activeBtn) return;
                
                const currentTarget = activeBtn.getAttribute('data-target');
                let currentIndex = tabOrder.indexOf(currentTarget);
                
                if (diffX > 0) {
                    // Swiped Left -> Go to Next Tab
                    currentIndex = (currentIndex + 1) % tabOrder.length;
                } else {
                    // Swiped Right -> Go to Previous Tab
                    currentIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
                }
                
                const nextBtn = document.querySelector(`.bottom-pill-btn[data-target="${tabOrder[currentIndex]}"]`);
                if (nextBtn) {
                    if (navigator.vibrate) navigator.vibrate(40); // Subtle haptic bump
                    nextBtn.click();
                }
            }
        }, { passive: true });
    }
}

// =================================================================
// 4. SMART UI (SCROLL HIDING)
// =================================================================
function initSmartUI() {
    const bottomNav = document.getElementById('bottomNav');
    const floatingTodoInput = document.getElementById('floatingTodoInput');
    const journalEditor = document.getElementById('journalEditor');
    
    if (!bottomNav) return;

    let isScrolling = false;
    let lastScrollY = 0;
    
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                if (currentScrollY > lastScrollY && currentScrollY > 40) {
                    bottomNav.classList.add('nav-hidden');
                    if (floatingTodoInput?.classList.contains('active')) floatingTodoInput.classList.add('keyboard-active');
                } else if (currentScrollY < lastScrollY) {
                    bottomNav.classList.remove('nav-hidden');
                    if (floatingTodoInput) floatingTodoInput.classList.remove('keyboard-active');
                }
                lastScrollY = currentScrollY;
                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

    if (journalEditor) {
        let isJournalScrolling = false;
        let lastJournalScrollY = 0;
        journalEditor.addEventListener('scroll', () => {
             if (!isJournalScrolling) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = journalEditor.scrollTop;
                    if (currentScrollY > lastJournalScrollY && currentScrollY > 20) {
                        bottomNav.classList.add('nav-hidden');
                    } else if (currentScrollY < lastJournalScrollY) {
                        bottomNav.classList.remove('nav-hidden');
                    }
                    lastJournalScrollY = currentScrollY;
                    isJournalScrolling = false;
                });
                isJournalScrolling = true;
            }
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
        setTimeout(() => {
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                bottomNav.classList.remove('nav-hidden');
                if (floatingTodoInput) floatingTodoInput.classList.remove('keyboard-active');
            }
        }, 10);
    });

    const handleKeyboardClose = (currentHeight) => {
        if (currentHeight >= baseWindowHeight - 150) {
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) floatingTodoInput.classList.remove('keyboard-active');
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
    let isGlobalSwipeEnabled = true; 
    
    try {
        const stored = localStorage.getItem('globalSwipeEnabled');
        if (stored !== null) isGlobalSwipeEnabled = JSON.parse(stored);
    } catch(e) {
        console.warn('LocalStorage restricted. Defaulting swipe gesture to true.');
    }
    
    if (globalSwipeToggle) {
        globalSwipeToggle.checked = isGlobalSwipeEnabled;
        globalSwipeToggle.addEventListener('change', (e) => {
            isGlobalSwipeEnabled = e.target.checked;
            try { localStorage.setItem('globalSwipeEnabled', isGlobalSwipeEnabled); } catch(err){}
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
        
        AppEvents.emit('JUMP_DATE', { tab: activeTabForPicker, date: targetDateObj });
        closeDateModal();
    });
}

// =================================================================
// 6. GLOBAL MODAL "CLICK OUTSIDE TO CLOSE" LOGIC
// =================================================================
function initGlobalModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const closeBtn = overlay.querySelector('.btn-secondary, .btn-ghost, .close-x');
                if (closeBtn) closeBtn.click();
                else overlay.style.display = 'none';
            }
        });
    });
}

// =================================================================
// PWA HARDWARE BACK-BUTTON INTERCEPTOR
// =================================================================
window.addEventListener('load', () => {
    history.pushState({ page: 'pwa-root' }, '');
});

window.addEventListener('popstate', (e) => {
    const overlays = document.querySelectorAll('.modal-overlay');
    const sheet = document.getElementById('agendaBottomSheet');
    let closedSomething = false;

    overlays.forEach(o => {
        if (window.getComputedStyle(o).display !== 'none') {
            o.style.display = 'none';
            closedSomething = true;
        }
    });

    if (sheet && sheet.classList.contains('active')) {
        sheet.classList.remove('active');
        sheet.style.transform = ''; 
        document.getElementById('dailySlider')?.classList.remove('hidden');
        if (window.AppEvents) AppEvents.emit('TAB_CHANGED', { tab: 'show-nav' });
        closedSomething = true;
    }

    if (closedSomething) {
        history.pushState({ page: 'pwa-root' }, '');
    } else {
        history.back();
    }
});