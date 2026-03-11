document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. PREMIUM PRELOADER LOGIC ---
    const preloader = document.getElementById('appPreloader');
    const preloaderIcon = document.getElementById('preloaderIcon');
    const preloaderGreeting = document.getElementById('preloaderGreeting');
    
    const homeIcon = document.getElementById('timeIcon');
    const homeGreeting = document.getElementById('dynamicGreeting');
    const appContainer = document.getElementById('app-container');

    const hour = new Date().getHours();
    let greetingText = '';
    let svgIcon = '';

    // Sleeker icons (stroke-width 1.5)
    if (hour < 12) {
        greetingText = 'Good Morning';
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`; 
    } else if (hour < 18) {
        greetingText = 'Good Afternoon';
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`; 
    } else {
        greetingText = 'Good Evening';
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }

    const userName = localStorage.getItem('userName') || 'jiruuuu... :)';
    const fullText = `${greetingText}, ${userName}`;

    if (preloaderIcon) preloaderIcon.innerHTML = svgIcon;
    if (preloaderGreeting) preloaderGreeting.textContent = fullText;
    
    // Slightly thicker icon for the actual home screen so it pops against the cards
    if (homeIcon) homeIcon.innerHTML = svgIcon.replace('stroke-width="1.5"', 'stroke-width="2.5"');
    if (homeGreeting) homeGreeting.textContent = fullText;

    // The Cinematic Transition
    setTimeout(() => {
        if (preloader) preloader.classList.add('hidden'); 
        if (appContainer) appContainer.classList.remove('app-hidden'); 
    }, 2000); // 2 seconds feels tight and responsive

    // --- 2. INITIALIZE THE REST OF THE APP ---
    initNavigation();
    
    if (typeof initDateGesturesAndModals === 'function') {
        initDateGesturesAndModals();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

function initNavigation() {
    const navButtons = document.querySelectorAll('.bottom-pill-btn');
    const tabs = document.querySelectorAll('.app-tab');
    const floatingTodoInput = document.getElementById('floatingTodoInput');

    if (!navButtons.length || !tabs.length) return;

    // 1. Tab Routing Logic
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            try {
                const targetId = event.currentTarget.getAttribute('data-target');
                if (!targetId) return;

                navButtons.forEach(btn => btn.classList.remove('active'));
                tabs.forEach(tab => tab.classList.remove('active'));

                event.currentTarget.classList.add('active');
                
                const targetTab = document.getElementById(targetId);
                if (targetTab) targetTab.classList.add('active');

                // Toggle Floating Input Box only on Todo tab
                if (floatingTodoInput) {
                    if (targetId === 'tab-todo') {
                        floatingTodoInput.classList.add('active');
                    } else {
                        floatingTodoInput.classList.remove('active');
                    }
                }
            } catch (error) {
                console.error('Navigation error:', error);
            }
        });
    });

    // 2. Initialize Smart Auto-Hiding UI
    initSmartUI();
}

function initSmartUI() {
    const bottomNav = document.getElementById('bottomNav');
    const floatingTodoInput = document.getElementById('floatingTodoInput');
    const journalEditor = document.getElementById('journalEditor'); // Grab the journal
    
    if (!bottomNav) return;

    // --- A. MAIN WINDOW SCROLL LOGIC ---
    let lastScrollY = 0;
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > lastScrollY && currentScrollY > 40) {
            // Scrolling Down -> Hide Nav
            bottomNav.classList.add('nav-hidden');
            if (floatingTodoInput && floatingTodoInput.classList.contains('active')) {
                floatingTodoInput.classList.add('keyboard-active');
            }
        } else if (currentScrollY < lastScrollY) {
            // Scrolling Up -> Show Nav
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) {
                floatingTodoInput.classList.remove('keyboard-active');
            }
        }
        lastScrollY = currentScrollY;
    }, { passive: true });

    // --- B. JOURNAL INTERNAL SCROLL LOGIC ---
    // The textarea handles its own scrolling, so it needs its own listener!
    if (journalEditor) {
        let lastJournalScrollY = 0;
        journalEditor.addEventListener('scroll', () => {
            const currentScrollY = journalEditor.scrollTop;
            
            if (currentScrollY > lastJournalScrollY && currentScrollY > 20) {
                // Scrolling down inside the text box
                bottomNav.classList.add('nav-hidden');
            } else if (currentScrollY < lastJournalScrollY) {
                // Scrolling up inside the text box
                bottomNav.classList.remove('nav-hidden');
            }
            lastJournalScrollY = currentScrollY;
        }, { passive: true });
    }

    // --- C. KEYBOARD & VIEWPORT LOGIC ---
    const baseWindowHeight = window.innerHeight;

    document.addEventListener('focusin', (e) => {
        // Hide nav when typing, UNLESS it's the Journal Editor (we want the scroll to control that)
        if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.id !== 'journalEditor') {
            bottomNav.classList.add('nav-hidden');
            if (floatingTodoInput && e.target.id === 'newTaskInput') {
                floatingTodoInput.classList.add('keyboard-active');
            }
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) {
                floatingTodoInput.classList.remove('keyboard-active');
            }
        }
    });

    const handleKeyboardClose = (currentHeight) => {
        if (currentHeight >= baseWindowHeight - 100) {
            bottomNav.classList.remove('nav-hidden');
            if (floatingTodoInput) {
                floatingTodoInput.classList.remove('keyboard-active');
            }
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                document.activeElement.blur();
            }
        }
    };

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            handleKeyboardClose(window.visualViewport.height);
        });
    } else {
        window.addEventListener('resize', () => {
            handleKeyboardClose(window.innerHeight);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDateGesturesAndModals();
});

function initDateGesturesAndModals() {
    // --- 1. SETTINGS: GLOBAL SWIPE TOGGLE ---
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

    // --- 2. REUSABLE SWIPE DETECTOR ---
    const attachSwipe = (element, onSwipeLeft, onSwipeRight, checkAllowed = null) => {
        if (!element) return;
        let startX = 0, startY = 0;

        element.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            if (checkAllowed && !checkAllowed()) return;

            const endX = e.changedTouches[0].screenX;
            const endY = e.changedTouches[0].screenY;
            const diffX = endX - startX;
            const diffY = endY - startY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX < 0 && onSwipeLeft) onSwipeLeft();  
                else if (diffX > 0 && onSwipeRight) onSwipeRight();           
            }
        }, { passive: true });
    };

    // --- 3. ATTACH SWIPES (Calling real functions!) ---
    // Safely call window functions (in case Todo/Journal aren't fully loaded yet)
    const triggerTodoNext = () => { if(window.todoNextDay) window.todoNextDay(); };
    const triggerTodoPrev = () => { if(window.todoPrevDay) window.todoPrevDay(); };
    
    // (Prepare these for when you build the Journal tab logic)
    const triggerJournalNext = () => { if(window.journalNextDay) window.journalNextDay(); };
    const triggerJournalPrev = () => { if(window.journalPrevDay) window.journalPrevDay(); };

    // Attach to Tabs
    const todoTab = document.getElementById('tab-todo');
    attachSwipe(todoTab, triggerTodoNext, triggerTodoPrev, () => isGlobalSwipeEnabled);

    const journalTab = document.getElementById('tab-journal');
    attachSwipe(journalTab, triggerJournalNext, triggerJournalPrev, () => isGlobalSwipeEnabled);

    // Attach to Date Pills (Ignore toggle, always swipeable)
    const todoPill = document.getElementById('todoDateNav');
    attachSwipe(todoPill, triggerTodoNext, triggerTodoPrev);

    const journalPill = document.getElementById('journalDateNav');
    attachSwipe(journalPill, triggerJournalNext, triggerJournalPrev);


    // --- 4. GLOBAL DATE PICKER MODAL ---
    const dateModal = document.getElementById('datePickerModalOverlay');
    const dateInput = document.getElementById('globalDatePickerInput');
    const closeBtn = document.getElementById('closeDatePickerBtn');
    const confirmBtn = document.getElementById('confirmDatePickerBtn');
    
    let activeTabForPicker = null; 

    const openDatePicker = (tabName, currentDateStr) => {
        activeTabForPicker = tabName;
        dateInput.value = currentDateStr; 
        dateModal.style.display = 'flex';
    };

    // Todo Display Click -> Opens Modal
    const todoDisplay = document.getElementById('todoDateDisplay');
    if (todoDisplay) {
        todoDisplay.addEventListener('click', () => {
            if(window.todoGetDateStr) openDatePicker('todo', window.todoGetDateStr());
        });
    }

    // Journal Display Click -> Opens Modal
    const journalDisplay = document.getElementById('journalDateDisplay');
    if (journalDisplay) {
        journalDisplay.addEventListener('click', () => {
            if(window.journalGetDateStr) openDatePicker('journal', window.journalGetDateStr());
        });
    }

    const closeDateModal = () => { dateModal.style.display = 'none'; };
    closeBtn.addEventListener('click', closeDateModal);
    
    confirmBtn.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        if (!selectedDate) return;

        // Parse YYYY-MM-DD safely into local timezone
        const [y, m, d] = selectedDate.split('-');
        const targetDateObj = new Date(y, m - 1, d);

        if (activeTabForPicker === 'todo' && window.todoSetDate) {
            window.todoSetDate(targetDateObj);
        } else if (activeTabForPicker === 'journal' && window.journalSetDate) {
            window.journalSetDate(targetDateObj);
        }
        
        closeDateModal();
    });
}