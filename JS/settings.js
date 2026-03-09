document.addEventListener('DOMContentLoaded', () => {
    initSettingsTab();
});

function initSettingsTab() {
    setupProfileSettings();
    setupThemeSettings();
    setupDataManagement();
}

function setupProfileSettings() {
    const nameInput = document.getElementById('settingsNameInput');
    const saveBtn = document.getElementById('saveNameBtn');

    if (!nameInput || !saveBtn) return;

    // Load saved name
    const savedName = localStorage.getItem('userDisplayName') || 'giruuuu... :)';
    nameInput.value = savedName === 'giruuuu... :)' ? '' : savedName;

    saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
            localStorage.setItem('userDisplayName', newName);
        } else {
            localStorage.removeItem('userDisplayName'); // Defaults back to original
        }
        
        // Brief visual feedback
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        setTimeout(() => saveBtn.textContent = originalText, 1500);
    });
}

function setupThemeSettings() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Load saved theme preference
    const isOLED = localStorage.getItem('themeOLED') === 'true';
    themeToggle.checked = isOLED;
    applyTheme(isOLED);

    themeToggle.addEventListener('change', (e) => {
        const isDarkest = e.target.checked;
        localStorage.setItem('themeOLED', isDarkest);
        applyTheme(isDarkest);
    });
}

function applyTheme(isOLED) {
    if (isOLED) {
        document.documentElement.style.setProperty('--color-bg', '#000000');
        document.documentElement.style.setProperty('--color-surface', '#0a0a0a');
    } else {
        // Standard Dark
        document.documentElement.style.setProperty('--color-bg', '#0a0a0a');
        document.documentElement.style.setProperty('--color-surface', '#1a1a1a');
    }
}

function setupDataManagement() {
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importDataInput');
    const resetBtn = document.getElementById('factoryResetBtn');

    if (!exportBtn || !importBtn || !importInput || !resetBtn) return;

    // 1. Export JSON
    exportBtn.addEventListener('click', () => {
        try {
            const appData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                appData[key] = localStorage.getItem(key);
            }
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            
            // Format date for filename
            const dateStr = new Date().toISOString().split('T')[0];
            downloadAnchorNode.setAttribute("download", `app_backup_${dateStr}.json`);
            
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (err) {
            console.error("Backup failed:", err);
            alert("Failed to generate backup.");
        }
    });

    // 2. Import JSON
    importBtn.addEventListener('click', () => {
        importInput.click(); // Triggers the hidden file input
    });

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (confirm("This will overwrite your current data. Are you sure?")) {
                    // Clear current data and restore imported data
                    localStorage.clear();
                    Object.keys(importedData).forEach(key => {
                        localStorage.setItem(key, importedData[key]);
                    });
                    
                    alert("Data restored successfully. The app will now reload.");
                    window.location.reload();
                }
            } catch (err) {
                console.error("Restore failed:", err);
                alert("Invalid backup file format.");
            }
        };
        reader.readAsText(file);
    });

    // 3. Factory Reset
    resetBtn.addEventListener('click', () => {
        if (confirm("WARNING: This will permanently delete all tasks, journal entries, and settings. This cannot be undone. Are you absolutely sure?")) {
            localStorage.clear();
            window.location.reload();
        }
    });
}