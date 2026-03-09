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