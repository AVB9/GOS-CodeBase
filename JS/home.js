// =================================================================
// 1.0 [GLOBAL ASSETS & DATA]
// =================================================================
const HOME_ASSETS = {
    greetings: (name) => [
        `How are you ${name}... :)`,         
        `Kashi ahes ${name}... :)`,          
        `Kemon acho ${name}... :)`,          
        `Kem cho ${name}... :)`,
        `Kese ho ${name}... :)`,
        `Kya haal hai bodmos... :)`,
        `Padhle bodmos... :)`,              
    ],
    icons: {
        day: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
        night: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
    },
    getSubGreeting: (hour) => {
        if (hour >= 7 && hour < 12) return "gumiimornin";
        if (hour >= 12 && hour < 15) return "Good Afternoon";
        if (hour >= 15 && hour < 17) return "napi wapi";
        if (hour >= 17 && hour < 20) return "Good evening";
        if (hour >= 20 && hour < 23) return "sleepii time";
        if (hour >= 23 || hour < 5) return "gumiinini";
        return "waki waki"; // 5 AM to 7 AM
    }
};

// =================================================================
// 2.0 [INITIALIZATION]
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    initHomeTab();
});

function initHomeTab() {
    setupGreeting();
    setupGoalModal();
    setupStandbyMode();
}

// =================================================================
// 3.0 [UI COMPONENTS]
// =================================================================

// -----------------------------------------------------------------
// 3.1 [GREETING WIDGET]
// -----------------------------------------------------------------
function setupGreeting() {
    const greetingEl = document.getElementById('dynamicGreeting');
    const iconEl = document.getElementById('timeIcon');
    const subGreetingEl = document.querySelector('.greeting-text p');
    
    if (!greetingEl || !iconEl || !subGreetingEl) return; 

    const savedName = localStorage.getItem('userDisplayName') || 'jiruuuu';
    const messages = HOME_ASSETS.greetings(savedName);
    const currentHour = new Date().getHours();
    
    greetingEl.textContent = messages[Math.floor(Math.random() * messages.length)];
    iconEl.innerHTML = (currentHour >= 6 && currentHour < 18) ? HOME_ASSETS.icons.day : HOME_ASSETS.icons.night;

    subGreetingEl.textContent = HOME_ASSETS.getSubGreeting(currentHour);
    subGreetingEl.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
        subGreetingEl.style.opacity = '0';
        setTimeout(() => {
            subGreetingEl.textContent = "gummi luck";
            subGreetingEl.style.opacity = '1';
        }, 500); 
    }, 3500); 
}

// -----------------------------------------------------------------
// 3.2 [GOAL MODAL]
// -----------------------------------------------------------------
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
            localStorage.setItem('userUltimateGoalName', newName);
            localStorage.setItem('userUltimateGoalDate', newDate);
            updateGoalUI(newName, newDate);
            modal.style.display = 'none';
        } else {
            alert('Please enter both a goal name and a target date.');
        }
    });
}

// -----------------------------------------------------------------
// 3.3 [STANDBY MODE]
// -----------------------------------------------------------------
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