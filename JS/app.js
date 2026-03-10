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
    let lastScrollY = 0;

    if (!bottomNav) return;

    // A. Scroll Logic (Hides when scrolling down, reveals when scrolling up)
    // A. Scroll Logic (Hides when scrolling down, reveals when scrolling up)
    window.addEventListener('scroll', () => {
        // Use window.scrollY because the body is now doing the scrolling
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

    // B. Keyboard & Viewport Logic (With Legacy Fallback)
    const baseWindowHeight = window.innerHeight;

    // Standard Desktop Focus/Blur
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
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

    // Mobile Keyboard Dismissal Detection
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

    // Modern API (2017-2019+)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            handleKeyboardClose(window.visualViewport.height);
        });
    } 
    // Legacy Fallback (Older than 2017/2019)
    else {
        window.addEventListener('resize', () => {
            handleKeyboardClose(window.innerHeight);
        });
    }
}

// --- GLOBAL MODAL BEHAVIOR ---
// Click outside any modal overlay to close it
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
        // Force a planner refresh just in case it was the subject modal
        if (e.target.id === 'subjectModalOverlay' && typeof window.forcePlannerRefresh === 'function') {
            window.forcePlannerRefresh();
        }
    }
});

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