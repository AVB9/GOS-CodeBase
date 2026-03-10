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
    // Default to true if not set
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
            // Check the toggle status if it was provided!
            if (checkAllowed && !checkAllowed()) return;

            const endX = e.changedTouches[0].screenX;
            const endY = e.changedTouches[0].screenY;
            const diffX = endX - startX;
            const diffY = endY - startY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX < 0) onSwipeLeft();  
                else onSwipeRight();           
            }
        }, { passive: true });
    };

    // --- 3. ATTACH SWIPES TO TABS & PILLS ---
    
    // Todo Tab (Global) -> Checks the Toggle
    const todoTab = document.getElementById('tab-todo');
    attachSwipe(todoTab, nextTodoDay, prevTodoDay, () => isGlobalSwipeEnabled);

    // Journal Tab (Global) -> Now ALSO Checks the Toggle
    const journalTab = document.getElementById('tab-journal');
    attachSwipe(journalTab, nextJournalDay, prevJournalDay, () => isGlobalSwipeEnabled);

    // Date Pills -> ALWAYS work, regardless of global settings
    const todoPill = document.getElementById('todoDateNav');
    attachSwipe(todoPill, nextTodoDay, prevTodoDay);

    const journalPill = document.getElementById('journalDateNav');
    attachSwipe(journalPill, nextJournalDay, prevJournalDay);


    // --- 4. DATE PICKER MODAL LOGIC ---
    const dateModal = document.getElementById('datePickerModalOverlay');
    const dateInput = document.getElementById('globalDatePickerInput');
    const closeBtn = document.getElementById('closeDatePickerBtn');
    const confirmBtn = document.getElementById('confirmDatePickerBtn');
    
    let activeTabForPicker = null; // Tracks if we are picking for Todo or Journal

    const openDatePicker = (tabName, currentDateStr) => {
        activeTabForPicker = tabName;
        // Pre-fill the input with the current tab's date (format must be YYYY-MM-DD for native input)
        dateInput.value = currentDateStr; 
        dateModal.style.display = 'flex';
    };

    // Attach click listeners to the date displays
    const todoDisplay = document.getElementById('todoDateDisplay');
    if (todoDisplay) {
        todoDisplay.addEventListener('click', () => {
            // Pass the current Todo date to the modal
            openDatePicker('todo', /* GET YOUR CURRENT TODO DATE IN YYYY-MM-DD */ '2026-03-10');
        });
    }

    const journalDisplay = document.getElementById('journalDateDisplay');
    if (journalDisplay) {
        journalDisplay.addEventListener('click', () => {
             // Pass the current Journal date to the modal
            openDatePicker('journal', /* GET YOUR CURRENT JOURNAL DATE IN YYYY-MM-DD */ '2026-03-10');
        });
    }

    // Modal Action Buttons
    const closeDateModal = () => { dateModal.style.display = 'none'; };
    
    closeBtn.addEventListener('click', closeDateModal);
    
    confirmBtn.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        if (!selectedDate) return;

        if (activeTabForPicker === 'todo') {
            // UPDATE TODO LOGIC WITH selectedDate
            console.log("Jumping Todo to:", selectedDate);
        } else if (activeTabForPicker === 'journal') {
            // UPDATE JOURNAL LOGIC WITH selectedDate
            console.log("Jumping Journal to:", selectedDate);
        }
        closeDateModal();
    });
}