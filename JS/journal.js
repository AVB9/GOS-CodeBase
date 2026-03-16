document.addEventListener('DOMContentLoaded', () => {
    initJournalTab();
});

function initJournalTab() {
    const editor = document.getElementById('journalEditor');
    const prevBtn = document.getElementById('journalPrevDay');
    const nextBtn = document.getElementById('journalNextDay');
    const dateDisplay = document.getElementById('journalDateDisplay');

    if (!editor || !dateDisplay) return;

    let currentDate = new Date();
    let debounceTimer = null; 

    // DEFENSIVE CODING: NaN Date Prevention
    const getDateKey = (date) => {
        if (!(date instanceof Date) || isNaN(date)) date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `journal_${y}-${m}-${d}`;
    };

    const updateDateDisplay = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(currentDate);
        compareDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((compareDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) dateDisplay.textContent = "Today";
        else if (diffDays === -1) dateDisplay.textContent = "Yesterday";
        else if (diffDays === 1) dateDisplay.textContent = "Tomorrow";
        else dateDisplay.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const loadEntry = () => {
        const savedText = localStorage.getItem(getDateKey(currentDate)) || "";
        editor.value = savedText;
        updateDateDisplay();
    };

    const forceSaveCurrent = () => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
            try {
                localStorage.setItem(getDateKey(currentDate), editor.value);
            } catch (e) {
                console.error('Storage error: Could not save journal entry.', e);
            }
        }
    };

    editor.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try {
                localStorage.setItem(getDateKey(currentDate), editor.value);
            } catch (e) {
                console.error('Storage error: Could not save journal entry.', e);
            }
            debounceTimer = null;
        }, 400); 
    });

    editor.addEventListener('blur', forceSaveCurrent);

    const changeDate = (days) => {
        forceSaveCurrent(); 
        currentDate.setDate(currentDate.getDate() + days);
        loadEntry();
    };

    if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

    dateDisplay.addEventListener('click', () => {
        AppEvents.emit('REQUEST_DATE_PICKER', { tab: 'journal', dateStr: getDateKey(currentDate).replace('journal_', '') });
    });

    AppEvents.on('DATE_CHANGE', ({ tab, direction }) => {
        if (tab === 'journal') changeDate(direction);
    });

    AppEvents.on('JUMP_DATE', ({ tab, date }) => {
        if (tab === 'journal') {
            forceSaveCurrent(); 
            currentDate = new Date(date);
            loadEntry();
        }
    });

    // Boot
    loadEntry();
}