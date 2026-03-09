document.addEventListener('DOMContentLoaded', () => {
    initHomeTab();
});

function initHomeTab() {
    setupGreeting();
    setupGoalModal();
}

function setupGreeting() {
    const greetingEl = document.getElementById('dynamicGreeting');
    const iconEl = document.getElementById('timeIcon');
    
    if (!greetingEl || !iconEl) return; 


    const savedName = localStorage.getItem('userDisplayName') || 'giruuuu... :)';
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
            const targetDate = new Date(targetDateStr);
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