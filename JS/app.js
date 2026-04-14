// =================================================================
// 1. GLOBAL EVENT BUS & INIT
// =================================================================
window.AppEvents = {
    emit: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })),
    on: (name, callback) => window.addEventListener(name, (e) => callback(e.detail)),
    off: (name, callback) => window.removeEventListener(name, callback) 
};

// Global Switch for Fix 3 (Gesture Lock)
window.isEditingTask = false;

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
    initTouchPaws(); // Activates the global paw effect
});

// --- MICRO-INTERACTION: TOUCH PAW EFFECT ---
function initTouchPaws() {
    const pawToggle = document.getElementById('touchPawToggle');
    let isPawEnabled = true;

    try {
        const stored = localStorage.getItem('appTouchPawEnabled');
        if (stored !== null) isPawEnabled = JSON.parse(stored);
    } catch (e) {
        console.warn("LocalStorage restricted for paw setting.");
    }

    if (pawToggle) {
        pawToggle.checked = isPawEnabled;
        pawToggle.addEventListener('change', (e) => {
            isPawEnabled = e.target.checked;
            try { localStorage.setItem('appTouchPawEnabled', isPawEnabled); } catch (err) {}
        });
    }

    document.addEventListener('pointerdown', (e) => {
        if (!isPawEnabled) return;

        // The interactive element block has been removed. Paws will spawn everywhere.

        const paw = document.createElement('div');
        paw.className = 'touch-paw-effect';
        
        paw.style.left = `${e.clientX}px`;
        paw.style.top = `${e.clientY}px`;
        
        const randomRot = Math.floor(Math.random() * 50) - 25;
        
        paw.innerHTML = `
            <svg viewBox="350 400 160 120" style="width: 100%; height: 100%; overflow: visible; transform: rotate(${randomRot}deg);">
                <use href="#icon-cat-paw" width="596" height="548" fill="var(--color-primary)"></use>
            </svg>
        `;
        
        document.body.appendChild(paw);
        
        setTimeout(() => paw.remove(), 700);
    });
}

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

    if (bottomNav) {
        let navStartX = 0;
        bottomNav.addEventListener('touchstart', (e) => { 
            navStartX = e.touches[0].clientX; 
        }, { passive: true });

        bottomNav.addEventListener('touchend', (e) => {
            const navEndX = e.changedTouches[0].clientX;
            const diffX = navStartX - navEndX;
            
            if (Math.abs(diffX) > 40) {
                const activeBtn = document.querySelector('.bottom-pill-btn.active');
                if (!activeBtn) return;
                
                const currentTarget = activeBtn.getAttribute('data-target');
                let currentIndex = tabOrder.indexOf(currentTarget);
                
                if (diffX > 0) {
                    currentIndex = (currentIndex + 1) % tabOrder.length;
                } else {
                    currentIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
                }
                
                const nextBtn = document.querySelector(`.bottom-pill-btn[data-target="${tabOrder[currentIndex]}"]`);
                if (nextBtn) {
                    if (navigator.vibrate) navigator.vibrate(40); 
                    nextBtn.click();
                }
            }
        }, { passive: true });
    }
}

// =================================================================
// 4. SMART UI (SCROLL HIDING)
// =================================================================
window.isAutoScrolling = false; 
window.isKeyboardOpen = false;

function initSmartUI() {
    const bottomNav = document.getElementById('bottomNav');
    const floatingTodoInput = document.getElementById('floatingTodoInput');
    const journalEditor = document.getElementById('journalEditor');
    const editDoneBtn = document.getElementById('mobileEditDoneBtn'); // <-- NEW BUTTON
    const baseWindowHeight = window.innerHeight;
    
    if (!bottomNav) return;

    let isScrolling = false;
    let lastScrollY = window.scrollY;

    const isKeyboardInput = (el) => {
        if (!el) return false;
        if (el.tagName === 'TEXTAREA') return true;
        if (el.tagName === 'INPUT') {
            const typingTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];
            return typingTypes.includes(el.type);
        }
        return false;
    };
    
    // --- NEW: Handle clicks on the "Done" button ---
    if (editDoneBtn) {
        const executeSave = (e) => {
            e.preventDefault(); // Prevents the browser from dropping focus before we want to
            const activeEl = document.activeElement;
            if (activeEl && activeEl.classList.contains('todo-edit-input')) {
                activeEl.blur(); // This safely triggers your save logic in todo.js!
            }
        };
        // mousedown and touchstart react faster than 'click'
        editDoneBtn.addEventListener('mousedown', executeSave);
        editDoneBtn.addEventListener('touchstart', executeSave, { passive: false });
    }

    window.addEventListener('scroll', () => {
        if (window.isAutoScrolling) {
            lastScrollY = window.scrollY;
            return;
        }

        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                const isFocused = document.activeElement && (document.activeElement.id === 'newTaskInput' || document.activeElement.classList.contains('todo-edit-input'));
                
                if (currentScrollY > lastScrollY && currentScrollY > 40) {
                    bottomNav.classList.add('nav-hidden');
                    if (floatingTodoInput && !isFocused) floatingTodoInput.classList.add('float-lowered');
                } else if (currentScrollY < lastScrollY) {
                    if (!window.isKeyboardOpen) {
                        bottomNav.classList.remove('nav-hidden');
                        if (floatingTodoInput && !isFocused) floatingTodoInput.classList.remove('float-lowered');
                    }
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
            if (window.isAutoScrolling) return;

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

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            window.isKeyboardOpen = (baseWindowHeight - window.visualViewport.height) > 100;
            
            if (window.isKeyboardOpen) {
                bottomNav.classList.add('nav-hidden'); 
            } else {
                const isFocused = document.activeElement && (document.activeElement.id === 'newTaskInput' || document.activeElement.classList.contains('todo-edit-input'));
                if (isFocused) {
                    document.activeElement.blur(); 
                    const tray = document.getElementById('todoSubjectTray');
                    if (tray) tray.classList.remove('active');
                }

                if (floatingTodoInput) {
                    floatingTodoInput.classList.remove('keyboard-active');
                    floatingTodoInput.classList.remove('edit-mode-hidden');
                }
                if (editDoneBtn) editDoneBtn.classList.remove('active'); // Hide Done Button

                if (window.scrollY <= 40) {
                    bottomNav.classList.remove('nav-hidden'); 
                    if (floatingTodoInput) floatingTodoInput.classList.remove('float-lowered');
                } else {
                    bottomNav.classList.add('nav-hidden'); 
                    if (floatingTodoInput) floatingTodoInput.classList.add('float-lowered');
                }
            }
        });
    }

    document.addEventListener('focusin', (e) => {
        if (isKeyboardInput(e.target) && e.target.id !== 'journalEditor') {
            window.isKeyboardOpen = true;
            bottomNav.classList.add('nav-hidden');
            
            if (e.target.id === 'newTaskInput') {
                // New Task Mode
                if (floatingTodoInput) {
                    floatingTodoInput.classList.add('keyboard-active');
                    floatingTodoInput.classList.remove('float-lowered');
                    floatingTodoInput.classList.remove('edit-mode-hidden');
                }
                if (editDoneBtn) editDoneBtn.classList.remove('active'); 
            } else if (e.target.classList.contains('todo-edit-input')) {
                // Edit Mode! Hide Float, Show Done Button
                if (floatingTodoInput) floatingTodoInput.classList.add('edit-mode-hidden');
                if (editDoneBtn) editDoneBtn.classList.add('active'); 
            }
        }
    });

    document.addEventListener('focusout', (e) => {
        setTimeout(() => {
            if (!isKeyboardInput(document.activeElement)) {
                window.isKeyboardOpen = false;
                
                if (floatingTodoInput) {
                    floatingTodoInput.classList.remove('keyboard-active');
                    floatingTodoInput.classList.remove('edit-mode-hidden');
                }
                if (editDoneBtn) editDoneBtn.classList.remove('active'); // Hide Done Button

                if (window.scrollY <= 40) {
                    bottomNav.classList.remove('nav-hidden');
                    if (floatingTodoInput) floatingTodoInput.classList.remove('float-lowered');
                } else {
                    bottomNav.classList.add('nav-hidden');
                    if (floatingTodoInput) floatingTodoInput.classList.add('float-lowered');
                }
            }
        }, 100); 
    });
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
            if (window.isEditingTask) return;
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            if (window.isEditingTask) return;
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

    
// --- COMPACT DATE PICKER LOGIC ---
    const datePicker = document.getElementById('datePicker');
    const headerBtn = document.getElementById('cdpMonthYearBtn');
    const prevBtn = document.getElementById('cdpPrevBtn');
    const nextBtn = document.getElementById('cdpNextBtn');
    const footer = document.getElementById('cdpFooter');
    const doneBtn = document.getElementById('cdpDoneBtn');

    const viewCalendar = document.getElementById('cdpViewCalendar');
    const viewDrill = document.getElementById('cdpViewDrill');
    const gridDays = document.getElementById('cdpGridDays');
    const gridDrill = document.getElementById('cdpGridDrill');

    let activeTabForPicker = null; 
    let selectedDate = new Date(); 
    let viewDate = new Date();     
    
    let drillState = 'calendar'; // 'calendar', 'months', 'years'
    let interactionMode = 'select'; // 'select' (closes on click) or 'jump' (stays open)
    let isPickerOpening = false; // Prevents instant-close bug

    const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const renderDays = () => {
        gridDays.innerHTML = '';
        headerBtn.innerHTML = `${fullMonths[viewDate.getMonth()]} ${viewDate.getFullYear()} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><path d="m9 18 6-6-6-6"/></svg>`;
        headerBtn.classList.remove('drill-open');

        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < firstDay; i++) {
            gridDays.innerHTML += `<div class="cdp-day-cell empty"></div>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const cell = document.createElement('div');
            cell.className = 'cdp-day-cell';
            cell.textContent = i;

            if (i === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear()) cell.classList.add('today');
            if (i === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear()) cell.classList.add('selected');

            cell.addEventListener('click', () => {
                selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
                renderDays(); 
                
                // ALWAYS emit the date change
                window.AppEvents.emit('JUMP_DATE', { tab: activeTabForPicker, date: new Date(selectedDate) });
                
                // If in "select" mode, close immediately. If "jump", stay open.
                if (interactionMode === 'select') closeDatePicker();
            });
            gridDays.appendChild(cell);
        }
    };

    const renderDrillDown = (type) => {
        gridDrill.innerHTML = '';
        headerBtn.classList.add('drill-open');
        
        if (type === 'months') {
            headerBtn.innerHTML = `${viewDate.getFullYear()} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><path d="m9 18 6-6-6-6"/></svg>`;
            fullMonths.forEach((month, index) => {
                const cell = document.createElement('div');
                cell.className = 'cdp-drill-cell';
                cell.textContent = month.substring(0, 3);
                if (index === viewDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear()) cell.classList.add('selected');
                
                cell.addEventListener('click', () => {
                    viewDate.setMonth(index);
                    switchDrillState('calendar');
                });
                gridDrill.appendChild(cell);
            });
        } else if (type === 'years') {
            const currentYear = viewDate.getFullYear();
            const startYear = currentYear - 4; 
            const endYear = startYear + 11;
            headerBtn.innerHTML = `${startYear} - ${endYear} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><path d="m9 18 6-6-6-6"/></svg>`;

            for (let y = startYear; y <= endYear; y++) {
                const cell = document.createElement('div');
                cell.className = 'cdp-drill-cell';
                cell.textContent = y;
                if (y === selectedDate.getFullYear()) cell.classList.add('selected');
                
                cell.addEventListener('click', () => {
                    viewDate.setFullYear(y);
                    switchDrillState('months');
                });
                gridDrill.appendChild(cell);
            }
        }
    };

    const switchDrillState = (state) => {
        drillState = state;
        viewCalendar.classList.remove('active');
        viewDrill.classList.remove('active');

        if (state === 'calendar') { viewCalendar.classList.add('active'); renderDays(); }
        else if (state === 'months') { viewDrill.classList.add('active'); renderDrillDown('months'); }
        else if (state === 'years') { viewDrill.classList.add('active'); renderDrillDown('years'); }
    };

    headerBtn.addEventListener('click', () => {
        if (drillState === 'calendar') switchDrillState('months');
        else if (drillState === 'months') switchDrillState('years');
        else switchDrillState('calendar'); 
    });

    // --- NAVIGATION & SWIPE LOGIC ---
    const cdpGoPrev = () => {
        if (drillState === 'calendar') { viewDate.setMonth(viewDate.getMonth() - 1); renderDays(); }
        else if (drillState === 'months') { viewDate.setFullYear(viewDate.getFullYear() - 1); renderDrillDown('months'); }
        else if (drillState === 'years') { viewDate.setFullYear(viewDate.getFullYear() - 12); renderDrillDown('years'); }
    };

    const cdpGoNext = () => {
        if (drillState === 'calendar') { viewDate.setMonth(viewDate.getMonth() + 1); renderDays(); }
        else if (drillState === 'months') { viewDate.setFullYear(viewDate.getFullYear() + 1); renderDrillDown('months'); }
        else if (drillState === 'years') { viewDate.setFullYear(viewDate.getFullYear() + 12); renderDrillDown('years'); }
    };

    prevBtn?.addEventListener('click', cdpGoPrev);
    nextBtn?.addEventListener('click', cdpGoNext);

    let cdpStartX = 0;
    let cdpStartY = 0;

    datePicker.addEventListener('touchstart', (e) => {
        cdpStartX = e.touches[0].clientX;
        cdpStartY = e.touches[0].clientY;
    }, { passive: true });

    datePicker.addEventListener('touchend', (e) => {
        const diffX = cdpStartX - e.changedTouches[0].clientX;
        const diffY = Math.abs(cdpStartY - e.changedTouches[0].clientY);

        // Check if the swipe was horizontal enough to trigger
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > diffY) {
            if (diffX > 0) cdpGoNext(); // Swipe Left -> Go Next Month
            else cdpGoPrev();           // Swipe Right -> Go Prev Month
        }
    }, { passive: true });


    // --- TRIGGER & DISMISS LOGIC ---
    const closeDatePicker = () => { 
        datePicker.style.display = 'none'; 
    };

    window.AppEvents.on('REQUEST_DATE_PICKER', ({ tab, dateStr, mode = 'select', targetId }) => {
        activeTabForPicker = tab;
        interactionMode = mode;
        isPickerOpening = true;
        
        if (dateStr) {
            const [y, m, d] = dateStr.split('-');
            selectedDate = new Date(y, m - 1, d);
        } else {
            selectedDate = new Date();
        }
        viewDate = new Date(selectedDate);
        
        footer.style.display = (interactionMode === 'jump') ? 'flex' : 'none';
        
        switchDrillState('calendar'); 
        datePicker.style.display = 'block';

        // --- DYNAMIC POSITIONING ---
        if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const pickerWidth = 320; 
                const pickerHeight = 360; 
                
                // 1. VERTICAL: Strictly drop it BELOW the entire clicked element
                let topPos = rect.bottom + 12; 
                
                // If it bleeds off the bottom of the screen, flip it ABOVE the element instead
                if (topPos + pickerHeight > window.innerHeight) {
                    topPos = rect.top - pickerHeight - 12;
                }

                // 2. HORIZONTAL: Perfectly center it relative to the clicked element
                let leftPos = rect.left + (rect.width / 2) - (pickerWidth / 2);
                
                // 3. BOUNDARY DETECTION: Keep it on screen
                if (leftPos + pickerWidth > window.innerWidth - 15) leftPos = window.innerWidth - pickerWidth - 15;
                if (leftPos < 15) leftPos = 15;
                
                datePicker.style.top = `${topPos}px`;
                datePicker.style.left = `${leftPos}px`;
                datePicker.style.transform = `none`; 
            }
        } else {
            datePicker.style.top = `50%`;
            datePicker.style.left = `50%`;
            datePicker.style.transform = `translate(-50%, -50%)`;
        }
        
        setTimeout(() => isPickerOpening = false, 50);
    });

    doneBtn?.addEventListener('click', closeDatePicker);

    // Global click listener to close if user taps outside the floating widget
    document.addEventListener('pointerdown', (e) => {
        if (!isPickerOpening && datePicker.style.display === 'block' && !datePicker.contains(e.target)) {
            closeDatePicker();
        }
    });
}

// =================================================================
// 6. GLOBAL MODAL "CLICK OUTSIDE TO CLOSE" LOGIC
// =================================================================
function initGlobalModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    if (overlay.style.display === 'flex' || overlay.style.display === 'block') {
                        document.body.classList.add('modal-open');
                    } else {
                        const anyOpen = Array.from(document.querySelectorAll('.modal-overlay')).some(o => o.style.display === 'flex' || o.style.display === 'block');
                        if (!anyOpen) document.body.classList.remove('modal-open');
                    }
                }
            });
        });
        observer.observe(overlay, { attributes: true });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const closeBtn = overlay.querySelector('.btn-secondary, .btn-ghost, .close-x');
                if (closeBtn) closeBtn.click();
                else {
                    overlay.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
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
        document.body.classList.remove('modal-open');
        history.pushState({ page: 'pwa-root' }, '');
    } else {
        history.back();
    }
});