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

    // Helper: Dynamic Storage Key
    const getDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `journal_${y}-${m}-${d}`;
    };

    // Helper: Display Date
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

    // Load entry for the current date
    const loadEntry = () => {
        const savedText = localStorage.getItem(getDateKey(currentDate)) || "";
        editor.value = savedText;
        updateDateDisplay();
    };

    // Auto-save entry when typing
    editor.addEventListener('input', () => {
        localStorage.setItem(getDateKey(currentDate), editor.value);
    });

    // Date Navigation
    const changeDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        loadEntry();
    };

    // --- CORE DATE LOGIC EXPOSED TO GLOBAL WINDOW ---
    // This allows app.js to trigger these when you swipe or use the Date Modal!
    window.journalNextDay = () => changeDate(1);
    window.journalPrevDay = () => changeDate(-1);
    
    window.journalSetDate = (dateObj) => { 
        currentDate = new Date(dateObj); 
        loadEntry(); 
    };
    
    window.journalGetDateStr = () => {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Button Click Listeners
    if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

    // Boot
    loadEntry();
}