document.addEventListener('DOMContentLoaded', () => {
    initHomeTab();
});

function initHomeTab() {
    setupGreeting();
    setupGoalModal();
    setupStandbyMode(); // ARCHITECTURE FIX: Consolidated boot sequence
}

function setupGreeting() {
    const greetingEl = document.getElementById('dynamicGreeting');
    const iconEl = document.getElementById('timeIcon');
    
    if (!greetingEl || !iconEl) return; 

    const savedName = localStorage.getItem('userDisplayName') || 'jiruuuu';
    const greetings = [
        `How are you ${savedName}... :)`,         
        `Kashi ahes ${savedName}... :)`,          
        `Kemon acho ${savedName}... :)`,          
        `Kem cho ${savedName}... :)`,
        `Kese ho ${savedName}... :)`,
        `Kya haal hai bodmos... :)`,
        `Padhle bodmos... :)`,              
    ];

    const randomIdx = Math.floor(Math.random() * greetings.length);
    greetingEl.textContent = greetings[randomIdx];

    const currentHour = new Date().getHours();
    const isDay = currentHour >= 6 && currentHour < 18; 

    if (isDay) {
        iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    } else {
        iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    }
}

function setupGoalModal() {
    const openBtn = document.getElementById('openGoalModalBtn');
    const closeBtn = document.getElementById('closeGoalModalBtn');
    const saveBtn = document.getElementById('saveGoalBtn');
    const modal = document.getElementById('goalModalOverlay');
    
    const goalInput = document.getElementById('goalInput');
    const goalDateInput = document.getElementById('goalDateInput');
    const goalDisplay = document.getElementById('goalDisplayText');
    const daysRemainingEl = document.getElementById('daysRemaining');

    if (!openBtn || !modal) return;

    const updateGoalUI = (name, targetDateStr) => {
        if (!name || !targetDateStr) {
            daysRemainingEl.textContent = '---';
            goalDisplay.textContent = 'Set your goal...';
            return;
        }

        try {
            // BUG FIX: Parsing "YYYY-MM-DD" directly assumes UTC, causing timezone offset bugs.
            // Splitting and using local date parameters fixes the off-by-one-day issue perfectly.
            const [y, m, d] = targetDateStr.split('-');
            const targetDate = new Date(y, m - 1, d);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            const diffTime = targetDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            daysRemainingEl.textContent = diffDays >= 0 ? diffDays : 0;
            
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            const formattedDate = targetDate.toLocaleDateString('en-US', options);
            
            goalDisplay.textContent = `${name}, ${formattedDate}`;
        } catch (err) {
            console.error('Date calculation error:', err);
        }
    };

    const savedGoalName = localStorage.getItem('userUltimateGoalName');
    const savedGoalDate = localStorage.getItem('userUltimateGoalDate');
    updateGoalUI(savedGoalName, savedGoalDate);

    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        goalInput.value = localStorage.getItem('userUltimateGoalName') || '';
        goalDateInput.value = localStorage.getItem('userUltimateGoalDate') || '';
        goalInput.focus();
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    saveBtn.addEventListener('click', () => {
        const newName = goalInput.value.trim();
        const newDate = goalDateInput.value;

        if (newName && newDate) {
            // These will now trigger the dynamic wiretap in db.js perfectly
            localStorage.setItem('userUltimateGoalName', newName);
            localStorage.setItem('userUltimateGoalDate', newDate);
            updateGoalUI(newName, newDate);
            modal.style.display = 'none';
        } else {
            alert('Please enter both a goal name and a target date.');
        }
    });
}

function setupStandbyMode() {
    const focusWidget = document.getElementById('focusModeWidget');
    const standbyOverlay = document.getElementById('standbyOverlay');
    const exitBtn = document.getElementById('exitStandbyBtn');
    const timeEl = document.getElementById('standbyTime');
    const dateEl = document.getElementById('standbyDate');
    
    let standbyInterval;
    let wakeLock = null;

    const updateStandbyClock = () => {
        const now = new Date();
        let h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        h = h % 12 || 12; // 12-hour format
        timeEl.textContent = `${h}:${m}`;
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // WAKELOCK FIX: OS kills WakeLock when app is minimized. We must re-request it when they return.
    const handleVisibilityChange = async () => {
        if (wakeLock !== null && document.visibilityState === 'visible' && !standbyOverlay.classList.contains('standby-hidden')) {
            try { wakeLock = await navigator.wakeLock.request('screen'); } 
            catch (e) { console.log('WakeLock request failed upon return.'); }
        }
    };

    if (focusWidget) {
        focusWidget.addEventListener('click', async () => {
            standbyOverlay.classList.remove('standby-hidden');
            updateStandbyClock();
            standbyInterval = setInterval(updateStandbyClock, 1000);
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            try {
                const elem = document.documentElement;
                if (elem.requestFullscreen) await elem.requestFullscreen();
                
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }
                
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch(e) { 
                console.log('Advanced hardware APIs skipped/unsupported by browser:', e); 
            }
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', async () => {
            standbyOverlay.classList.add('standby-hidden');
            clearInterval(standbyInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            try {
                if (wakeLock !== null) {
                    await wakeLock.release();
                    wakeLock = null;
                }
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
                if (document.exitFullscreen) await document.exitFullscreen();
            } catch(e) {}
        });
    }
}