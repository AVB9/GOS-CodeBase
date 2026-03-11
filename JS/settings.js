document.addEventListener('DOMContentLoaded', () => {
    initSettingsTab();
});

function initSettingsTab() {
    setupProfileSettings();
    setupThemeSettings();
    setupDataManagement();
    setupSubjectManager();
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

function setupSubjectManager() {
    const manageBtn = document.getElementById('manageSubjectsBtn');
    const modal = document.getElementById('subjectModalOverlay');
    const closeBtn = document.getElementById('closeSubjectModalBtn');
    const cancelBtn = document.getElementById('cancelSubjectModalBtn'); 
    const addBtn = document.getElementById('addSubjectBtn');
    const subList = document.getElementById('subjectList');

    // NEW: Get the color picker elements
    const colorInput = document.getElementById('newSubjectColor');
    const colorWrapper = document.getElementById('colorPickerWrapper');

    if (!manageBtn || !modal) return;

    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    const saveSubjects = (subs) => localStorage.setItem('plannerSubjects', JSON.stringify(subs));

    const renderSubjects = () => {
        subList.innerHTML = '';
        getSubjects().forEach(sub => {
            const div = document.createElement('div');
            div.className = 'subject-manager-item';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:15px; height:15px; border-radius:50%; background:${sub.color};"></div>
                    <span>${sub.name}</span>
                </div>
                ${sub.id === 'off' ? '' : `<button class="subject-delete-btn" data-id="${sub.id}">×</button>`}
            `;
            subList.appendChild(div);
        });

        document.querySelectorAll('.subject-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const newSubs = getSubjects().filter(s => s.id !== id);
                saveSubjects(newSubs);
                renderSubjects();
            });
        });
    };

    // NEW: Update the circular wrapper color in real-time as she picks a color!
    if (colorInput && colorWrapper) {
        colorInput.addEventListener('input', (e) => {
            colorWrapper.style.backgroundColor = e.target.value;
        });
    }

    manageBtn.addEventListener('click', () => { renderSubjects(); modal.style.display = 'flex'; });
    
    const closeModalHandler = () => { 
        modal.style.display = 'none'; 
        if (typeof window.forcePlannerRefresh === 'function') window.forcePlannerRefresh();
    };

    closeBtn.addEventListener('click', closeModalHandler);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModalHandler);

    addBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('newSubjectName');
        const name = nameInput.value.trim();
        if (name) {
            const subjects = getSubjects();
            subjects.push({ id: 'sub_' + Date.now(), name: name, color: colorInput.value });
            saveSubjects(subjects);
            
            // Reset the form
            nameInput.value = '';
            colorInput.value = '#ff3b3b'; 
            if (colorWrapper) colorWrapper.style.backgroundColor = '#ff3b3b'; // Reset the UI circle
            
            renderSubjects();
        }
    });
}

function initAesthetics() {
    // --- 1. MATCHY-MATCHY ACCENT COLOR ;)---
    const themeInput = document.getElementById('themeColorPicker');
    const themeWrapper = document.getElementById('themeColorWrapper');
    
    // Load saved color or default to red
    const savedThemeColor = localStorage.getItem('appAccentColor') || '#ff3b3b';
    
    // Inject it globally into CSS variables!
    document.documentElement.style.setProperty('--color-primary', savedThemeColor);
    if(themeWrapper) themeWrapper.style.backgroundColor = savedThemeColor;
    if(themeInput) themeInput.value = savedThemeColor;

    // Listen for live color changes
    if (themeInput) {
        themeInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            themeWrapper.style.backgroundColor = newColor;
            document.documentElement.style.setProperty('--color-primary', newColor);
            localStorage.setItem('appAccentColor', newColor);
        });
    }

    // --- 2. BLURRED FADED BACKGROUND UPLOAD ---
    const bgContainer = document.getElementById('dynamicBackground');
    const uploader = document.getElementById('bgUploader');
    const clearBtn = document.getElementById('clearBgBtn');

    // Load saved background
    const savedBg = localStorage.getItem('appCustomBg');
    if (savedBg && bgContainer) {
        bgContainer.style.backgroundImage = `url(${savedBg})`;
    }

    if (uploader) {
        uploader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // COMPRESSION ENGINE: Scales down massive 4K phone photos 
                    // so they don't crash the 5MB localStorage limit.
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600; // It's blurred anyway, so low-res is perfect!
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Compress to JPEG at 60% quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
                    
                    try {
                        localStorage.setItem('appCustomBg', dataUrl);
                        if (bgContainer) bgContainer.style.backgroundImage = `url(${dataUrl})`;
                    } catch (err) {
                        alert("Image is too large to save! Try a smaller picture.");
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            localStorage.removeItem('appCustomBg');
            if (bgContainer) bgContainer.style.backgroundImage = 'none';
            if (uploader) uploader.value = '';
        });
    }
}

// Ensure this runs on boot
document.addEventListener('DOMContentLoaded', () => {
    initAesthetics();
});

// --- 1.5 MAIN TEXT COLOR ---
    const textInput = document.getElementById('textColorPicker');
    const textWrapper = document.getElementById('textColorWrapper');
    
    // Load saved text color or default to white
    const savedTextColor = localStorage.getItem('appTextColor') || '#ffffff';
    
    // Inject it globally into CSS variables (targeting both standard and bright text variables)
    document.documentElement.style.setProperty('--color-text', savedTextColor);
    document.documentElement.style.setProperty('--color-text-bright', savedTextColor);
    document.documentElement.style.setProperty('--color-text-default', savedTextColor);
    
    if(textWrapper) textWrapper.style.backgroundColor = savedTextColor;
    if(textInput) textInput.value = savedTextColor;

    // Listen for live color changes
    if (textInput) {
        textInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            textWrapper.style.backgroundColor = newColor;
            
            // Apply to all primary text variables
            document.documentElement.style.setProperty('--color-text', newColor);
            document.documentElement.style.setProperty('--color-text-bright', newColor);
            document.documentElement.style.setProperty('--color-text-default', newColor);
            
            localStorage.setItem('appTextColor', newColor);
        });
    }