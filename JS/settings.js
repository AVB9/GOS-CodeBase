document.addEventListener('DOMContentLoaded', () => {
    initSettingsTab();
});

function initSettingsTab() {
    // Unifying all settings boot sequences into one clean pipeline
    setupProfileSettings();
    setupThemeSettings();
    setupDataManagement();
    setupSubjectManager();
    setupAesthetics();
}

function setupProfileSettings() {
    const nameInput = document.getElementById('settingsNameInput');
    const saveBtn = document.getElementById('saveNameBtn');

    if (!nameInput || !saveBtn) return;

    const savedName = localStorage.getItem('userDisplayName') || 'jiruuuu... :)';
    nameInput.value = savedName === 'jiruuuu... :)' ? '' : savedName;

    saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
            localStorage.setItem('userDisplayName', newName);
        } else {
            localStorage.removeItem('userDisplayName'); 
        }
        
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        setTimeout(() => saveBtn.textContent = originalText, 1500);
    });
}

function setupThemeSettings() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

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
            
            const dateStr = new Date().toISOString().split('T')[0];
            downloadAnchorNode.setAttribute("download", `billus_diary_backup_${dateStr}.json`);
            
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (err) {
            console.error("Backup failed:", err);
            alert("Failed to generate backup.");
        }
    });

    // 2. Import JSON
    importBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (confirm("This will overwrite your current data. Are you sure?")) {
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
    };

    // THE PRODUCTION FIX: Event Delegation. 
    // One smart listener on the parent instead of looping through all buttons.
    subList.addEventListener('click', (e) => {
        if (e.target.classList.contains('subject-delete-btn')) {
            const id = e.target.getAttribute('data-id');
            const newSubs = getSubjects().filter(s => s.id !== id);
            saveSubjects(newSubs);
            renderSubjects();
        }
    });

    if (colorInput && colorWrapper) {
        colorInput.addEventListener('input', (e) => {
            colorWrapper.style.backgroundColor = e.target.value;
        });
    }

    manageBtn.addEventListener('click', () => { renderSubjects(); modal.style.display = 'flex'; });
    
    // THE PRODUCTION FIX: Emitting the clean event instead of hacky window functions
    const closeModalHandler = () => { 
        modal.style.display = 'none'; 
        if (window.AppEvents) AppEvents.emit('SUBJECTS_UPDATED');
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
            
            nameInput.value = '';
            colorInput.value = '#ff3b3b'; 
            if (colorWrapper) colorWrapper.style.backgroundColor = '#ff3b3b'; 
            
            renderSubjects();
        }
    });
}

function setupAesthetics() {
    // --- 1. MATCHY-MATCHY ACCENT COLOR ---
    const themeInput = document.getElementById('themeColorPicker');
    
    const savedThemeColor = localStorage.getItem('appAccentColor') || '#ff3b3b';
    document.documentElement.style.setProperty('--color-primary', savedThemeColor);
    if(themeInput) themeInput.value = savedThemeColor;

    if (themeInput) {
        themeInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--color-primary', newColor);
            localStorage.setItem('appAccentColor', newColor);
        });
    }

    // --- 2. MAIN TEXT COLOR ---
    const textInput = document.getElementById('textColorPicker');
    
    const savedTextColor = localStorage.getItem('appTextColor') || '#ffffff';
    document.documentElement.style.setProperty('--color-text', savedTextColor);
    if(textInput) textInput.value = savedTextColor;

    if (textInput) {
        textInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--color-text', newColor);
            localStorage.setItem('appTextColor', newColor);
        });
    }

    // --- 3. BLURRED FADED BACKGROUND UPLOAD ---
    const bgContainer = document.getElementById('dynamicBackground');
    const uploader = document.getElementById('bgUploader');
    const clearBtn = document.getElementById('clearBgBtn');

    const savedBg = localStorage.getItem('appCustomBg');
    if (savedBg && bgContainer) bgContainer.style.backgroundImage = `url(${savedBg})`;

    if (uploader) {
        uploader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600; 
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

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