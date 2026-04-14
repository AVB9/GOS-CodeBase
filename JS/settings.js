// =================================================================
// 1.0 [UTILITIES & ALERT ENGINE]
// =================================================================
window.AppAlert = {
    show: ({ title, message, inputPlaceholder, buttons }) => {
        const overlay = document.getElementById('customAlertOverlay');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const inputEl = document.getElementById('alertInput');
        const btnContainer = document.getElementById('alertButtonContainer');
        
        if (!overlay || !titleEl || !msgEl || !btnContainer) {
            alert(title + "\n\n" + message);
            return;
        }

        titleEl.textContent = title || 'Alert';
        msgEl.textContent = message || '';
        btnContainer.innerHTML = '';

        if (inputPlaceholder !== undefined) {
            inputEl.style.display = 'block';
            inputEl.placeholder = inputPlaceholder;
            inputEl.value = '';
            setTimeout(() => inputEl.focus(), 100);
        } else {
            inputEl.style.display = 'none';
        }

        buttons.forEach(btn => {
            const buttonEl = document.createElement('button');
            buttonEl.className = btn.type === 'danger' ? 'btn-danger' : (btn.type === 'primary' ? 'btn-primary' : 'btn-ghost');
            buttonEl.textContent = btn.text;
            buttonEl.onclick = () => {
                if (btn.isSubmit) {
                    const val = inputEl.value.trim();
                    if (!val) return; 
                    if (btn.onClick) btn.onClick(val);
                } else if (btn.onClick) {
                    btn.onClick();
                }
                overlay.style.display = 'none';
            };
            btnContainer.appendChild(buttonEl);
        });

        overlay.style.display = 'flex';
    }
};

const SettingsUtils = {
    showFeedback: (element, msg, type = 'error') => {
        if (!element) return;
        element.textContent = msg;
        element.style.display = 'block';
        if (type === 'error') {
            element.style.backgroundColor = 'rgba(255, 59, 59, 0.1)';
            element.style.color = '#ff3b3b';
            element.style.border = '1px solid rgba(255, 59, 59, 0.3)';
        } else {
            element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            element.style.color = '#4caf50';
            element.style.border = '1px solid rgba(76, 175, 80, 0.3)';
        }
    },
    clearFeedback: (element) => { if (element) element.style.display = 'none'; }
};

// =================================================================
// 2.0 [INITIALIZATION]
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    initSettingsTab();
});

function initSettingsTab() {
    setupAppearanceController();
    setupSubjectManager();
    setupDataManagement();
    initAuthUI();
}

// =================================================================
// 3.0 [APPEARANCE CONTROLLER]
// =================================================================
function setupAppearanceController() {
    const nameInput = document.getElementById('settingsNameInput');
    const saveBtn = document.getElementById('saveNameBtn');

    if (nameInput && saveBtn) {
        const savedName = localStorage.getItem('userDisplayName') || 'jiruuuu... :)';
        nameInput.value = savedName === 'jiruuuu... :)' ? '' : savedName;

        saveBtn.addEventListener('click', () => {
            const newName = nameInput.value.trim();
            if (newName) localStorage.setItem('userDisplayName', newName);
            else localStorage.removeItem('userDisplayName'); 
            
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saved!';
            setTimeout(() => saveBtn.textContent = originalText, 1500);
        });
    }

    const applyOLEDTheme = (isOLED) => {
        document.documentElement.style.setProperty('--color-bg', isOLED ? '#000000' : '#0a0a0a');
        document.documentElement.style.setProperty('--color-surface', isOLED ? '#0a0a0a' : '#1a1a1a');
    };

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const isOLED = localStorage.getItem('themeOLED') === 'true';
        themeToggle.checked = isOLED;
        applyOLEDTheme(isOLED);

        themeToggle.addEventListener('change', (e) => {
            localStorage.setItem('themeOLED', e.target.checked);
            applyOLEDTheme(e.target.checked);
        });
    }

    const bindColorPicker = (pickerId, cssVar, storageKey, defaultColor) => {
        const input = document.getElementById(pickerId);
        const savedColor = localStorage.getItem(storageKey) || defaultColor;
        document.documentElement.style.setProperty(cssVar, savedColor);
        
        if (input) {
            input.value = savedColor;
            input.addEventListener('input', (e) => {
                document.documentElement.style.setProperty(cssVar, e.target.value);
                localStorage.setItem(storageKey, e.target.value);
            });
        }
    };

    bindColorPicker('themeColorPicker', '--color-primary', 'appAccentColor', '#ff3b3b');
    bindColorPicker('textColorPicker', '--color-text', 'appTextColor', '#ffffff');

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
                    const MAX_WIDTH = 800; 
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    try {
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
                        localStorage.setItem('appCustomBg', dataUrl);
                        if (bgContainer) bgContainer.style.backgroundImage = `url(${dataUrl})`;
                    } catch (err) {
                        window.AppAlert.show({ title: "Error", message: "Image is too large to save! Try a smaller picture.", buttons: [{ text: "OK", type: "primary" }] });
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

// =================================================================
// 4.0 [SUBJECT MANAGER]
// =================================================================
function setupSubjectManager() {
    // Subject Manager Elements
    const manageBtn = document.getElementById('manageSubjectsBtn');
    const modal = document.getElementById('subjectModalOverlay');
    const cancelBtn = document.getElementById('cancelSubjectModalBtn');
    const doneBtn = document.getElementById('closeSubjectModalBtn');
    const pillTray = document.getElementById('subjectGroupPillTray');
    const listContainer = document.getElementById('unifiedSubjectList');
    const nameInput = document.getElementById('newSubjectName');
    const colorInput = document.getElementById('newSubjectColor');
    const colorWrapper = document.getElementById('colorPickerWrapper');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const actionIcon = document.getElementById('sfiActionIcon');

    // Group Manager Elements
    const groupModal = document.getElementById('groupManagerModalOverlay');
    const groupList = document.getElementById('groupManagerList');
    const groupNameInput = document.getElementById('newGroupNameInput');
    const addGroupBtn = document.getElementById('addGroupBtn');
    const gfiActionIcon = document.getElementById('gfiActionIcon'); 
    const closeGroupBtn = document.getElementById('closeGroupManagerBtn');
    const cancelGroupBtn = document.getElementById('cancelGroupManagerBtn');

    if (!manageBtn || !modal || !pillTray || !listContainer) return;

    // --- UX UPGRADE: SMART TRANSITION BUTTONS ---
    // We inject a hidden span that will smoothly expand when typing
    if (doneBtn) doneBtn.innerHTML = '<span class="dynamic-add-text">Add & </span>Save';
    if (closeGroupBtn) closeGroupBtn.innerHTML = '<span class="dynamic-add-text">Add & </span>Save';

    // --- PURE 2-STATE TRAY LOGIC ---
    if (nameInput) {
        nameInput.addEventListener('focus', () => {
            const bottomNav = document.getElementById('bottomNav');
            if (bottomNav) bottomNav.style.display = 'none'; 
            if (pillTray) pillTray.classList.add('active');  
        });
        
        nameInput.addEventListener('blur', () => {
            const bottomNav = document.getElementById('bottomNav');
            if (bottomNav) bottomNav.style.display = 'flex'; 
            if (pillTray) pillTray.classList.remove('active'); 
        });

        // UX UPGRADE: Toggle "Add & Save" visibility smoothly
        nameInput.addEventListener('input', () => {
            const addText = doneBtn?.querySelector('.dynamic-add-text');
            if (addText) {
                if (nameInput.value.trim()) addText.classList.add('show');
                else addText.classList.remove('show');
            }
        });
    }

    if (groupNameInput) {
        // UX UPGRADE: Toggle "Add & Save" visibility smoothly
        groupNameInput.addEventListener('input', () => {
            const addText = closeGroupBtn?.querySelector('.dynamic-add-text');
            if (addText) {
                if (groupNameInput.value.trim()) addText.classList.add('show');
                else addText.classList.remove('show');
            }
        });
    }

    let activeGroupId = 'group_default'; 
    let editingSubjectId = null;
    let editingGroupId = null;
    let lastClickedGroupId = null;
    let lastClickTime = 0;
    let lastModifiedGroupId = null; 

    // --- TIME MACHINE SNAPSHOTS ---
    let subjectManagerSnapshot = null;
    let groupManagerSnapshot = null;

    const getNestedSubjects = () => {
        try {
            let appSubs = localStorage.getItem('appSubjects');
            if (!appSubs) {
                const legacy = JSON.parse(localStorage.getItem('plannerSubjects')) || [];
                const validLegacy = Array.isArray(legacy) ? legacy.filter(s => s.id !== 'off') : []; 
                const defaultStructure = [{ id: 'group_default', name: 'General', isDeletable: false, subjects: validLegacy }];
                localStorage.setItem('appSubjects', JSON.stringify(defaultStructure));
                return defaultStructure;
            }
            
            const groups = JSON.parse(appSubs);
            if (!Array.isArray(groups)) return [{ id: 'group_default', name: 'General', isDeletable: false, subjects: [] }];
            
            return groups.map(g => {
                g.subjects = Array.isArray(g.subjects) ? g.subjects : [];
                return g;
            });
        } catch (e) {
            return [{ id: 'group_default', name: 'General', isDeletable: false, subjects: [] }];
        }
    };

    const saveNestedSubjects = (groups) => {
        try {
            localStorage.setItem('appSubjects', JSON.stringify(groups));
            let flatList = [];
            groups.forEach(g => { flatList = flatList.concat(g.subjects); });
            flatList.unshift({ id: 'off', name: 'Day Off', color: '#555555' });
            localStorage.setItem('plannerSubjects', JSON.stringify(flatList));
        } catch (e) { console.error("Failed to save subjects.", e); }
    };

    // --- GROUP MANAGER MODAL LOGIC ---
    const resetGroupEditMode = () => {
        editingGroupId = null;
        groupNameInput.value = '';
        
        // UX Reset
        const addText = closeGroupBtn?.querySelector('.dynamic-add-text');
        if (addText) addText.classList.remove('show');
        
        if (gfiActionIcon) {
            gfiActionIcon.innerHTML = `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`;
            gfiActionIcon.style.color = 'var(--color-primary)';
        }
    };

    const renderGroupManager = () => {
        const groups = getNestedSubjects();
        groupList.innerHTML = '';

        groups.forEach(group => {
            if (group.id === 'group_default') return; 

            const pill = document.createElement('div');
            pill.style.cssText = `display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--rad-pill); border: 1px solid var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary); font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: transform 0.2s;`;
            
            pill.innerHTML = `<span style="user-select: none;">${group.name}</span>` + 
                             (group.isDeletable ? `<span class="delete-group-btn" style="color: var(--color-danger); margin-left: 4px; font-size: 1.2rem; line-height: 1; opacity: 0.8;">&times;</span>` : ``);

            if (group.isDeletable) {
                pill.querySelector('.delete-group-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (group.subjects.length > 0) {
                        window.AppAlert.show({ title: "Cannot Delete", message: "Move or delete all subjects inside this group before deleting it.", buttons: [{ text: "OK", type: "primary" }] });
                        return;
                    }
                    const currentGroups = getNestedSubjects().filter(g => g.id !== group.id);
                    saveNestedSubjects(currentGroups);
                    if (editingGroupId === group.id) resetGroupEditMode();
                    if (activeGroupId === group.id) activeGroupId = 'group_default';
                    renderGroupManager();
                });
            }

            pill.addEventListener('click', () => {
                editingGroupId = group.id;
                groupNameInput.value = group.name;
                
                // UX Edit Trigger
                const addText = closeGroupBtn?.querySelector('.dynamic-add-text');
                if (addText) addText.classList.add('show');
                
                if (gfiActionIcon) {
                    gfiActionIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
                    gfiActionIcon.style.color = 'var(--color-success)';
                }
                groupNameInput.focus();
            });

            groupList.appendChild(pill);
        });
    };

    const executeAddGroup = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const gName = groupNameInput.value.trim();
        if (!gName) { groupNameInput.focus(); return; }

        const groups = getNestedSubjects();

        if (editingGroupId) {
            const g = groups.find(g => g.id === editingGroupId);
            if (g) g.name = gName;
            lastModifiedGroupId = editingGroupId; 
            resetGroupEditMode();
        } else {
            const newId = 'group_' + Date.now();
            groups.push({ id: newId, name: gName, isDeletable: true, subjects: [] });
            lastModifiedGroupId = newId; 
            resetGroupEditMode();
        }

        saveNestedSubjects(groups);
        renderGroupManager();
        groupNameInput.focus(); 
    };

    if (gfiActionIcon) gfiActionIcon.style.pointerEvents = 'none';

    if (addGroupBtn) {
        addGroupBtn.onmousedown = (e) => e.preventDefault(); 
        addGroupBtn.onclick = executeAddGroup;
        addGroupBtn.ontouchend = (e) => { e.preventDefault(); executeAddGroup(); };
    }

    if (groupNameInput) {
        groupNameInput.onkeydown = (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault(); executeAddGroup();
            }
        };
    }

    // GROUP MANAGER DONE & CANCEL LOGIC
    if (closeGroupBtn) {
        closeGroupBtn.onclick = () => {
            // UX UPGRADE: If there's text waiting, add it before closing
            if (groupNameInput && groupNameInput.value.trim()) {
                executeAddGroup();
            }
            groupModal.style.display = 'none';
            if (lastModifiedGroupId) { activeGroupId = lastModifiedGroupId; lastModifiedGroupId = null; }
            renderManager();
            setTimeout(() => nameInput.focus(), 100);
            resetGroupEditMode(); // UX Reset
        };
    }

    if (cancelGroupBtn) {
        cancelGroupBtn.onclick = () => {
            const currentState = JSON.stringify(getNestedSubjects());
            if (groupManagerSnapshot && currentState !== groupManagerSnapshot) {
                window.AppAlert.show({
                    title: "Discard Group Changes?",
                    message: "Any groups added or modified just now will be lost.",
                    buttons: [
                        { text: "Keep Editing", type: "ghost" },
                        { text: "Discard", type: "danger", onClick: () => {
                            saveNestedSubjects(JSON.parse(groupManagerSnapshot)); 
                            groupModal.style.display = 'none';
                            renderManager();
                            setTimeout(() => nameInput.focus(), 100);
                            resetGroupEditMode(); 
                        }}
                    ]
                });
            } else {
                groupModal.style.display = 'none';
                renderManager();
                setTimeout(() => nameInput.focus(), 100);
                resetGroupEditMode(); 
            }
        };
    }


    // --- MAIN SUBJECT MANAGER LOGIC ---
    const renderManager = () => {
        const groups = getNestedSubjects();
        pillTray.innerHTML = '';
        listContainer.innerHTML = '';

        // 1. RENDER SGT (GROUP TRAY)
        groups.forEach(group => {
            if (group.id === 'group_default') return; 

            const pill = document.createElement('div');
            pill.className = 'todo-tint-pill';
            pill.textContent = group.name;
            pill.dataset.id = group.id;
            
            pill.style.maxWidth = '110px';
            pill.style.whiteSpace = 'nowrap';
            pill.style.overflow = 'hidden';
            pill.style.textOverflow = 'ellipsis';
            pill.style.flexShrink = '0';
            pill.style.display = 'block';
            
            if (group.id === activeGroupId) {
                pill.classList.add('selected');
                pill.style.backgroundColor = `color-mix(in srgb, var(--color-primary) 20%, var(--color-surface))`;
                pill.style.borderColor = 'var(--color-primary)';
                pill.style.color = 'var(--color-primary)';
            }

            pill.addEventListener('mousedown', (e) => e.preventDefault());
            pill.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

            pill.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                
                const now = Date.now();
                if (lastClickedGroupId === group.id && (now - lastClickTime) < 300) {
                    lastClickTime = 0; 
                    if (group.isDeletable) handleDeleteGroup(group);
                } else {
                    lastClickTime = now;
                    lastClickedGroupId = group.id;
                    if (activeGroupId !== group.id) { activeGroupId = group.id; } 
                    else { activeGroupId = 'group_default'; }
                    renderManager(); 
                }
            });
            
            pillTray.appendChild(pill);
        });

        // ADD GROUP PILL
        const addPill = document.createElement('div');
        addPill.className = 'todo-tint-pill';
        addPill.style.borderStyle = 'dashed';
        addPill.textContent = '+ Add Group';
        addPill.style.whiteSpace = 'nowrap';
        addPill.style.flexShrink = '0';
        addPill.style.display = 'block';
        
        addPill.addEventListener('mousedown', (e) => e.preventDefault());
        addPill.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

        addPill.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            resetGroupEditMode();
            
            groupManagerSnapshot = JSON.stringify(getNestedSubjects()); 
            
            renderGroupManager();
            groupModal.style.display = 'flex';
            setTimeout(() => groupNameInput.focus(), 100);
        });
        pillTray.appendChild(addPill);

        // 2. RENDER UNIFIED PILL LIST
        groups.forEach(group => {
            if (group.id !== 'group_default' && group.subjects.length > 0) {
                const header = document.createElement('div');
                header.style.cssText = 'color: var(--color-text-muted); font-size: 0.75rem; font-weight: bold; margin: 15px 0 8px 5px; text-transform: uppercase; letter-spacing: 1px; width: 100%;';
                header.textContent = group.name;
                listContainer.appendChild(header);
            }

            const dropzone = document.createElement('div');
            dropzone.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; padding: 5px 0; min-height: 20px;';
            dropzone.dataset.groupId = group.id;

            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.background = 'rgba(255,255,255,0.02)'; });
            dropzone.addEventListener('dragleave', () => dropzone.style.background = 'transparent');
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.background = 'transparent';
                const subjectId = e.dataTransfer.getData('text/plain');
                if (!subjectId) return;

                const allGroups = getNestedSubjects();
                let draggedSubject = null;

                allGroups.forEach(g => {
                    const idx = g.subjects.findIndex(s => s.id === subjectId);
                    if (idx !== -1) { draggedSubject = g.subjects[idx]; g.subjects.splice(idx, 1); }
                });

                if (draggedSubject) {
                    const targetGroup = allGroups.find(g => g.id === group.id);
                    targetGroup.subjects.push(draggedSubject);
                    saveNestedSubjects(allGroups);
                    renderManager();
                }
            });

            group.subjects.forEach(sub => {
                const pill = document.createElement('div');
                pill.draggable = true;
                pill.style.cssText = `display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 12px; border-radius: var(--rad-pill); border: 1px solid ${sub.color}; background: color-mix(in srgb, ${sub.color} 15%, var(--color-surface)); color: ${sub.color}; font-size: 0.85rem; font-weight: bold; cursor: grab; transition: transform 0.2s;`;
                pill.innerHTML = `
                    <span style="user-select: none;">${sub.name}</span>
                    <span class="delete-subject-btn" style="cursor: pointer; font-size: 1.1rem; line-height: 1; padding-left: 2px; opacity: 0.7;">&times;</span>
                `;

                pill.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', sub.id);
                    setTimeout(() => pill.style.opacity = '0.4', 10);
                });
                pill.addEventListener('dragend', () => pill.style.opacity = '1');

                pill.querySelector('.delete-subject-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const currentGroups = getNestedSubjects();
                    const gIdx = currentGroups.findIndex(g => g.id === group.id);
                    currentGroups[gIdx].subjects = currentGroups[gIdx].subjects.filter(s => s.id !== sub.id);
                    saveNestedSubjects(currentGroups);
                    if(editingSubjectId === sub.id) resetEditMode();
                    renderManager();
                });

                let pClickCount = 0; let pTimer;
                pill.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    pClickCount++;
                    if (pClickCount === 1) {
                        pTimer = setTimeout(() => { pClickCount = 0; }, 250);
                    } else if (pClickCount === 2) {
                        clearTimeout(pTimer); pClickCount = 0;
                        
                        editingSubjectId = sub.id;
                        activeGroupId = group.id; 
                        
                        nameInput.value = sub.name;
                        colorInput.value = sub.color;
                        if (colorWrapper) colorWrapper.style.backgroundColor = sub.color;
                        
                        // UX Edit Trigger
                        const addText = doneBtn?.querySelector('.dynamic-add-text');
                        if (addText) addText.classList.add('show');
                        
                        if(actionIcon) {
                            actionIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
                            actionIcon.style.color = 'var(--color-success)';
                        }
                        renderManager(); 
                        setTimeout(() => nameInput.focus(), 50);
                    }
                });

                dropzone.appendChild(pill);
            });
            listContainer.appendChild(dropzone);
        });
    };

    const resetEditMode = () => {
        editingSubjectId = null;
        nameInput.value = '';
        
        // UX Reset
        const addText = doneBtn?.querySelector('.dynamic-add-text');
        if (addText) addText.classList.remove('show');
        
        if(actionIcon) {
            actionIcon.innerHTML = `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`;
            actionIcon.style.color = 'var(--color-primary)';
        }
    }

    const handleDeleteGroup = (group) => {
        if (group.subjects.length > 0) {
            window.AppAlert.show({ title: "Cannot Delete", message: "Move or delete all subjects inside this group before deleting it.", buttons: [{ text: "OK", type: "primary" }] });
            return;
        }
        window.AppAlert.show({
            title: "Delete Group?",
            message: `Remove the "${group.name}" group?`,
            buttons: [
                { text: "Cancel", type: "ghost" },
                { text: "Delete", type: "danger", onClick: () => {
                    const currentGroups = getNestedSubjects().filter(g => g.id !== group.id);
                    saveNestedSubjects(currentGroups);
                    activeGroupId = 'group_default';
                    renderManager();
                }}
            ]
        });
    };

    manageBtn.addEventListener('click', () => { 
        resetEditMode();
        subjectManagerSnapshot = JSON.stringify(getNestedSubjects());
        renderManager(); 
        modal.style.display = 'flex'; 
    });
    
    // SUBJECT MANAGER DONE & CANCEL LOGIC
    if (doneBtn) {
        doneBtn.onclick = () => {
            // UX UPGRADE: If there's text waiting, add it before closing
            if (nameInput && nameInput.value.trim()) {
                executeAddSubject();
            }
            modal.style.display = 'none'; 
            if (window.AppEvents) AppEvents.emit('SUBJECTS_UPDATED');
            resetEditMode(); // Reset
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            const currentState = JSON.stringify(getNestedSubjects());
            if (subjectManagerSnapshot && currentState !== subjectManagerSnapshot) {
                window.AppAlert.show({
                    title: "Discard Changes?",
                    message: "Are you sure you want to discard all changes made to your subjects and groups?",
                    buttons: [
                        { text: "Keep Editing", type: "ghost" },
                        { text: "Discard", type: "danger", onClick: () => {
                            saveNestedSubjects(JSON.parse(subjectManagerSnapshot)); 
                            modal.style.display = 'none';
                            if (window.AppEvents) AppEvents.emit('SUBJECTS_UPDATED');
                            resetEditMode(); 
                        }}
                    ]
                });
            } else {
                modal.style.display = 'none';
                if (window.AppEvents) AppEvents.emit('SUBJECTS_UPDATED');
                resetEditMode(); 
            }
        };
    }

    if (colorInput && colorWrapper) {
        colorInput.addEventListener('input', (e) => colorWrapper.style.backgroundColor = e.target.value);
    }

    // --- BULLETPROOF SFI ADD / EDIT LOGIC ---
    if (actionIcon) actionIcon.style.pointerEvents = 'none';

    const executeAddSubject = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const sName = nameInput.value.trim();
        if (!sName) { nameInput.focus(); return; }

        const groups = getNestedSubjects();

        if (editingSubjectId) {
            let foundSub = null;
            let originalGroupId = null;
            let originalIndex = -1;

            groups.forEach(g => {
                const idx = g.subjects.findIndex(s => s.id === editingSubjectId);
                if (idx !== -1) {
                    foundSub = g.subjects[idx];
                    originalGroupId = g.id;
                    originalIndex = idx;
                }
            });

            if (foundSub) {
                foundSub.name = sName;
                foundSub.color = colorInput.value;
                const destGroupId = activeGroupId || 'group_default';

                if (originalGroupId !== destGroupId) {
                    const oldGroup = groups.find(g => g.id === originalGroupId);
                    oldGroup.subjects.splice(originalIndex, 1);
                    const newGroup = groups.find(g => g.id === destGroupId);
                    if (newGroup) newGroup.subjects.push(foundSub);
                }
            }
            resetEditMode();
        } else {
            const targetGroupId = activeGroupId || 'group_default';
            const gIdx = groups.findIndex(g => g.id === targetGroupId);
            if (gIdx !== -1) {
                groups[gIdx].subjects.push({ id: 'sub_' + Date.now(), name: sName, color: colorInput.value });
            }
        }

        saveNestedSubjects(groups);
        nameInput.value = '';
        
        // UX Reset after add
        const addText = doneBtn?.querySelector('.dynamic-add-text');
        if (addText) addText.classList.remove('show');

        renderManager();
        listContainer.scrollTop = listContainer.scrollHeight;
        
        nameInput.focus(); 
    };

    if (addSubjectBtn) {
        addSubjectBtn.onmousedown = (e) => e.preventDefault(); 
        addSubjectBtn.onclick = executeAddSubject;
        addSubjectBtn.ontouchend = (e) => { e.preventDefault(); executeAddSubject(); };
    }

    if (nameInput) {
        nameInput.onkeydown = (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                executeAddSubject();
            }
        };
    }
}

// =================================================================
// 5.0 [DATA MANAGEMENT & BACKUP V2]
// =================================================================
function setupDataManagement() {
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const resetBtn = document.getElementById('factoryResetBtn');

    // Backup V2 Modals
    const restoreModal = document.getElementById('restoreBackupModalOverlay');
    const restoreDropzone = document.getElementById('restoreFileDropzone');
    const dropzoneContent = document.getElementById('dropzoneContent');
    const v2ImportInput = document.getElementById('v2ImportInput');
    const modeMerge = document.getElementById('restoreModeMerge');
    const modeOverwrite = document.getElementById('restoreModeOverwrite');
    const scopePillsContainer = document.getElementById('restoreScopePills');
    const executeRestoreBtn = document.getElementById('executeRestoreBtn');
    const closeRestoreBtn = document.getElementById('closeRestoreModalBtn');
    const restoreDesc = document.getElementById('restoreModeDesc');

    let parsedBackupData = null;
    let selectedMode = 'merge'; 
    let selectedScopes = new Set(['all']); 

    if (!exportBtn || !importBtn || !resetBtn) return;

    // --- JSON EXPORTER V2 ---
    exportBtn.addEventListener('click', () => {
        try {
            const backup = {
                metadata: { app_id: "billus_diary", backup_date: new Date().toISOString(), version: "2.0" },
                settings: {},
                momentum: JSON.parse(localStorage.getItem('momentumHabits')) || [],
                planner: {
                    targets: JSON.parse(localStorage.getItem('plannerTargets')) || {},
                    completed: JSON.parse(localStorage.getItem('plannerCompleted')) || [],
                    subjects: JSON.parse(localStorage.getItem('appSubjects')) || []
                },
                todo: {}
            };

            ['userDisplayName', 'themeOLED', 'appCustomBg', 'appAccentColor', 'appTextColor', 'userUltimateGoalName', 'userUltimateGoalDate'].forEach(k => {
                const val = localStorage.getItem(k);
                if (val) backup.settings[k] = val;
            });

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('todo_')) backup.todo[key] = JSON.parse(localStorage.getItem(key));
            }

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            const dateStr = new Date().toISOString().split('T')[0];
            downloadAnchorNode.setAttribute("download", `billus_diary_backup_${dateStr}.json`);
            
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (err) {
            window.AppAlert.show({ title: "Backup Failed", message: "Failed to generate V2 backup.", buttons: [{ text: "OK", type: "primary" }] });
        }
    });

    // --- RESTORE TARGET PILLS RENDERER ---
    const renderScopePills = () => {
        if (!scopePillsContainer) return;
        scopePillsContainer.innerHTML = '';
        const scopes = [
            { id: 'all', label: 'Complete APP' },
            { id: 'momentum', label: 'Momentum' },
            { id: 'planner', label: 'Planner Targets' },
            { id: 'todo', label: 'TODO Tasks' },
            { id: 'subjects', label: 'Subjects' },
            { id: 'colors', label: 'Colors' }
        ];

        scopes.forEach(s => {
            const pill = document.createElement('div');
            const isActive = selectedScopes.has(s.id);
            
            pill.className = 'todo-tint-pill';
            pill.textContent = s.label;
            
            if (isActive) {
                pill.classList.add('selected');
                pill.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 20%, transparent)';
                pill.style.borderColor = 'var(--color-primary)';
                pill.style.color = 'var(--color-primary)';
            } else {
                pill.style.backgroundColor = 'rgba(255,255,255,0.05)';
                pill.style.borderColor = 'var(--color-glass-border)';
                pill.style.color = 'var(--color-text)';
            }

            pill.addEventListener('click', () => {
                if (s.id === 'all') {
                    selectedScopes.clear();
                    selectedScopes.add('all');
                } else {
                    selectedScopes.delete('all');
                    
                    if (selectedScopes.has(s.id)) {
                        if (s.id === 'subjects' && (selectedScopes.has('planner') || selectedScopes.has('todo'))) {
                            if (window.showAppToast) window.showAppToast("Subjects are required for Planner and TODO data.");
                            return; 
                        }
                        
                        selectedScopes.delete(s.id);
                        if (selectedScopes.size === 0) selectedScopes.add('all'); 
                    } else {
                        selectedScopes.add(s.id);
                        
                        if (s.id === 'planner' || s.id === 'todo') {
                            selectedScopes.add('subjects');
                        }

                        if (selectedScopes.has('momentum') && selectedScopes.has('planner') && selectedScopes.has('todo') && selectedScopes.has('subjects') && selectedScopes.has('colors')) {
                            selectedScopes.clear();
                            selectedScopes.add('all');
                        }
                    }
                }
                renderScopePills();
            });

            scopePillsContainer.appendChild(pill);
        });
    };

    // --- SMART RESTORE UI ---
    importBtn.addEventListener('click', () => {
        if (!restoreModal) return;
        parsedBackupData = null;
        const fn = document.getElementById('restoreFileName');
        if (fn) fn.textContent = "Select Backup File (.json)";
        if (executeRestoreBtn) {
            executeRestoreBtn.disabled = true;
            executeRestoreBtn.style.opacity = '0.4';
        }
        selectedScopes = new Set(['all']);
        renderScopePills();
        restoreModal.style.display = 'flex';
    });

    closeRestoreBtn?.addEventListener('click', () => restoreModal.style.display = 'none');
    restoreDropzone?.addEventListener('click', () => v2ImportInput?.click());

    // --- DRAG TO BLUR LOGIC ---
    if (restoreDropzone) {
        restoreDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            restoreDropzone.style.background = 'rgba(255,255,255,0.05)';
            restoreDropzone.style.borderColor = 'var(--color-primary)';
            if (dropzoneContent) dropzoneContent.style.filter = 'blur(4px)';
        });
        const resetDropState = () => {
            restoreDropzone.style.background = 'rgba(0,0,0,0.2)';
            restoreDropzone.style.borderColor = 'var(--color-glass-border)';
            if (dropzoneContent) dropzoneContent.style.filter = 'none';
        };
        restoreDropzone.addEventListener('dragleave', resetDropState);
        restoreDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            resetDropState();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && v2ImportInput) {
                v2ImportInput.files = e.dataTransfer.files;
                v2ImportInput.dispatchEvent(new Event('change'));
            }
        });
    }

    // --- WIRE UP CANCEL BUTTONS ---
    document.querySelectorAll('.restore-cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (restoreModal) restoreModal.style.display = 'none';
        });
    });

    // --- MERGE / OVERWRITE TOGGLES ---
    modeMerge?.addEventListener('click', () => {
        selectedMode = 'merge';
        
        modeMerge.classList.remove('btn-ghost', 'btn-danger');
        modeMerge.classList.add('btn-primary');
        modeMerge.style.borderColor = 'var(--color-primary)';
        
        if (modeOverwrite) { 
            modeOverwrite.classList.remove('btn-primary', 'btn-danger');
            modeOverwrite.classList.add('btn-ghost');
            modeOverwrite.style.borderColor = 'transparent'; 
        }
        if (restoreDesc) { 
            restoreDesc.textContent = "Combines backup with current data safely."; 
            restoreDesc.style.color = "#4ade80"; 
        }
    });

    modeOverwrite?.addEventListener('click', () => {
        selectedMode = 'overwrite';
        
        modeOverwrite.classList.remove('btn-ghost', 'btn-primary');
        modeOverwrite.classList.add('btn-danger');
        modeOverwrite.style.borderColor = 'var(--color-danger)';
        
        if (modeMerge) { 
            modeMerge.classList.remove('btn-primary', 'btn-danger');
            modeMerge.classList.add('btn-ghost');
            modeMerge.style.borderColor = 'transparent'; 
        }
        if (restoreDesc) { 
            restoreDesc.textContent = "Replaces current data. Missing data will be lost."; 
            restoreDesc.style.color = "var(--color-danger)"; 
        }
    });

    // --- BACKUP FILE VALIDATOR ---
    v2ImportInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (typeof data !== 'object' || !data.metadata || data.metadata.app_id !== "billus_diary") {
                    throw new Error("Invalid app identifier");
                }
                
                parsedBackupData = data;
                const fn = document.getElementById('restoreFileName');
                if (fn) fn.textContent = file.name;
                if (executeRestoreBtn) {
                    executeRestoreBtn.disabled = false;
                    executeRestoreBtn.style.opacity = '1';
                }
            } catch (err) {
                window.AppAlert.show({ title: "Invalid File", message: "This file is not a valid Billu's Diary backup.", buttons: [{ text: "OK", type: "primary" }] });
            }
        };
        reader.readAsText(file);
    });

    // --- STRICT NON-DESTRUCTIVE MERGE ENGINE ---
    const hasScope = (target) => selectedScopes.has('all') || selectedScopes.has(target);

    executeRestoreBtn?.addEventListener('click', async () => {
        if (!parsedBackupData) return;

        const isV2 = parsedBackupData.metadata && parsedBackupData.metadata.version === "2.0";
        const execute = async () => {
            try {
                if (selectedMode === 'overwrite') {
                    if (hasScope('momentum')) localStorage.removeItem('momentumHabits');
                    if (hasScope('planner')) {
                        localStorage.removeItem('plannerTargets'); localStorage.removeItem('plannerCompleted'); 
                    }
                    if (hasScope('subjects')) {
                        localStorage.removeItem('appSubjects');
                        localStorage.removeItem('plannerSubjects');
                    }
                    if (hasScope('todo')) {
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            if (localStorage.key(i).startsWith('todo_')) keysToRemove.push(localStorage.key(i));
                        }
                        keysToRemove.forEach(k => localStorage.removeItem(k));
                    }
                }

                if (isV2) {
                    if (hasScope('colors') || hasScope('all')) {
                        const colorKeys = ['themeOLED', 'appCustomBg', 'appAccentColor', 'appTextColor'];
                        colorKeys.forEach(k => {
                            if (parsedBackupData.settings && parsedBackupData.settings[k]) {
                                if (selectedMode === 'overwrite' || !localStorage.getItem(k)) localStorage.setItem(k, parsedBackupData.settings[k]);
                            }
                        });
                    }
                    if (hasScope('all')) {
                        const otherKeys = ['userDisplayName', 'userUltimateGoalName', 'userUltimateGoalDate'];
                        otherKeys.forEach(k => {
                            if (parsedBackupData.settings && parsedBackupData.settings[k]) {
                                if (selectedMode === 'overwrite' || !localStorage.getItem(k)) localStorage.setItem(k, parsedBackupData.settings[k]);
                            }
                        });
                    }
                    if (hasScope('momentum')) {
                        const currentHabits = JSON.parse(localStorage.getItem('momentumHabits')) || [];
                        const backupHabits = parsedBackupData.momentum || [];
                        backupHabits.forEach(bh => { if (!currentHabits.find(ch => ch.id === bh.id)) currentHabits.push(bh); });
                        localStorage.setItem('momentumHabits', JSON.stringify(currentHabits));
                    }
                    if (hasScope('planner')) {
                        const currentTargets = JSON.parse(localStorage.getItem('plannerTargets')) || {};
                        const backupTargets = parsedBackupData.planner.targets || {};
                        Object.keys(backupTargets).forEach(date => { if (!currentTargets[date]) currentTargets[date] = backupTargets[date]; });
                        localStorage.setItem('plannerTargets', JSON.stringify(currentTargets));

                        const currentComp = JSON.parse(localStorage.getItem('plannerCompleted')) || [];
                        const backupComp = parsedBackupData.planner.completed || [];
                        backupComp.forEach(date => { if (!currentComp.includes(date)) currentComp.push(date); });
                        localStorage.setItem('plannerCompleted', JSON.stringify(currentComp));
                    }
                    
                    if (hasScope('subjects')) {
                        let currentGroups = JSON.parse(localStorage.getItem('appSubjects'));
                        if (!currentGroups || !Array.isArray(currentGroups) || currentGroups.length === 0) {
                            currentGroups = [{ id: 'group_default', name: 'General', isDeletable: false, subjects: [] }];
                        }
                        
                        const backupSubs = parsedBackupData.planner.subjects || [];
                        
                        if (backupSubs.length > 0) {
                            if (backupSubs[0].subjects) {
                                backupSubs.forEach(bg => {
                                    const existingGroup = currentGroups.find(cg => cg.id === bg.id);
                                    if (existingGroup) {
                                        existingGroup.subjects = existingGroup.subjects || [];
                                        const incomingSubjects = bg.subjects || [];
                                        incomingSubjects.forEach(bs => {
                                            if (!existingGroup.subjects.find(cs => cs.id === bs.id)) existingGroup.subjects.push(bs);
                                        });
                                    } else {
                                        bg.subjects = bg.subjects || [];
                                        currentGroups.push(bg);
                                    }
                                });
                            } else {
                                const generalGroup = currentGroups.find(g => g.id === 'group_default') || currentGroups[0];
                                generalGroup.subjects = generalGroup.subjects || [];
                                backupSubs.forEach(bs => {
                                    if (bs.id !== 'off' && !generalGroup.subjects.find(cs => cs.id === bs.id)) {
                                        generalGroup.subjects.push(bs);
                                    }
                                });
                            }
                        }
                        localStorage.setItem('appSubjects', JSON.stringify(currentGroups));
                    }
                    
                    if (hasScope('todo')) {
                        Object.keys(parsedBackupData.todo || {}).forEach(dateKey => {
                            const currentTasks = JSON.parse(localStorage.getItem(dateKey)) || [];
                            const backupTasks = parsedBackupData.todo[dateKey] || [];
                            backupTasks.forEach(bt => { if (!currentTasks.find(ct => ct.id === bt.id)) currentTasks.push(bt); });
                            localStorage.setItem(dateKey, JSON.stringify(currentTasks));
                        });
                    }
                } else {
                    Object.keys(parsedBackupData).forEach(key => {
                        if (selectedMode === 'overwrite' || !localStorage.getItem(key)) {
                            localStorage.setItem(key, parsedBackupData[key]);
                        }
                    });
                }

                if (window.AppDB && AppDB.session) await AppDB.forcePushToCloud();
                
                setTimeout(() => {
                    window.AppAlert.show({
                        title: "Success", message: "Data restored successfully. The app will now reload.",
                        buttons: [{ text: "Reload", type: "primary", onClick: () => window.location.reload() }]
                    });
                }, 150);

            } catch (e) {
                setTimeout(() => {
                    window.AppAlert.show({ title: "Error", message: "Failed to merge backup.", buttons: [{ text: "OK", type: "primary" }] });
                }, 150);
            }
        };

        if (selectedMode === 'overwrite') {
            window.AppAlert.show({
                title: "Are you absolutely sure?",
                message: "This will completely erase your selected current data and replace it with the backup.",
                buttons: [
                    { text: "Cancel", type: "ghost" },
                    { text: "OVERWRITE", type: "danger", onClick: execute }
                ]
            });
        } else {
            execute();
        }
    });

    // --- ERASE ALL DATA FIX ---
    resetBtn.addEventListener('click', () => {
        window.AppAlert.show({
            title: "Factory Reset",
            message: "WARNING: This will permanently delete all tasks, habits, and settings across ALL devices. This cannot be undone.",
            buttons: [
                { text: "Cancel", type: "ghost" },
                { text: "Erase Everything", type: "danger", onClick: async () => {
                    try {
                        if (window.AppDB && AppDB.session) await AppDB.nukeCloudData();
                        AppDB.localWipeAndReload();
                    } catch(e) {
                        AppDB.localWipeAndReload();
                    }
                }}
            ]
        });
    });
}

// =================================================================
// 6.0 [AUTHENTICATION CONTROLLER]
// =================================================================
function initAuthUI() {
    const loggedOutSettingsView = document.getElementById('loggedOutSettingsView');
    const loggedInSettingsView = document.getElementById('loggedInSettingsView');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const openAuthModalBtn = document.getElementById('openAuthModalBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn || !openAuthModalBtn) return; // Safety guard

    // Modals
    const authModalOverlay = document.getElementById('authModalOverlay');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const authModalTitle = document.getElementById('authModalTitle');
    const authModalSubtitle = document.getElementById('authModalSubtitle');
    const primaryAuthBtn = document.getElementById('primaryAuthBtn');
    const primaryAuthText = document.getElementById('primaryAuthText');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const googleAuthText = document.getElementById('googleAuthText');
    const authFeedback = document.getElementById('authFeedback');
    
    // UX UPGRADE: New Explicit Toggle Buttons
    const modeLoginBtn = document.getElementById('modeLoginBtn');
    const modeSignupBtn = document.getElementById('modeSignupBtn');

    const openUpdatePasswordBtn = document.getElementById('openUpdatePasswordBtn');
    const updatePasswordModalOverlay = document.getElementById('updatePasswordModalOverlay');
    const closeUpdatePasswordBtn = document.getElementById('closeUpdatePasswordBtn');
    const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');
    const updateAuthFeedback = document.getElementById('updateAuthFeedback');

    // Multi-Device Modals
    const linkedDevicesModal = document.getElementById('linkedDevicesModalOverlay');
    const activeDevicesList = document.getElementById('activeDevicesList');
    const logoutAllBtn = document.getElementById('logoutAllBtn');
    const closeLinkedDevicesBtn = document.getElementById('closeLinkedDevicesBtn');

    // Inject "Manage Linked Devices" Button dynamically safely
    let manageDevicesBtn = document.getElementById('manageDevicesBtn');
    if (!manageDevicesBtn && loggedInSettingsView) {
        const row = loggedInSettingsView.querySelector('.settings-input-row');
        if (row) {
            manageDevicesBtn = document.createElement('button');
            manageDevicesBtn.id = 'manageDevicesBtn';
            manageDevicesBtn.className = 'btn-secondary settings-action-btn';
            manageDevicesBtn.textContent = 'Manage Linked Devices';
            manageDevicesBtn.style.marginBottom = '10px';
            row.parentNode.insertBefore(manageDevicesBtn, row); 
        }
    }

    const checkSession = async () => {
        try {
            const session = await AppDB.checkSession();
            if (session) {
                if (loggedOutSettingsView) loggedOutSettingsView.style.display = 'none';
                if (loggedInSettingsView) loggedInSettingsView.style.display = 'flex';
                if (userEmailDisplay) userEmailDisplay.textContent = `Synced as: ${session.email}`;
            } else {
                if (loggedOutSettingsView) loggedOutSettingsView.style.display = 'flex';
                if (loggedInSettingsView) loggedInSettingsView.style.display = 'none';
            }
        } catch (error) { console.error("Session check failed:", error); }
    };

    let isLoginMode = true;

    // --- UX UPGRADE: Auth Mode Switcher (Crossfade & Spatial Lock) ---
    const setAuthMode = (toLogin) => {
        if (isLoginMode === toLogin) return; 
        isLoginMode = toLogin;
        SettingsUtils.clearFeedback(authFeedback); 
        
        // 1. Toggle Button Styles
        if (isLoginMode) {
            if (modeLoginBtn) { modeLoginBtn.classList.remove('btn-ghost'); modeLoginBtn.classList.add('btn-primary'); modeLoginBtn.style.borderColor = 'var(--color-primary)'; }
            if (modeSignupBtn) { modeSignupBtn.classList.remove('btn-primary'); modeSignupBtn.classList.add('btn-ghost'); modeSignupBtn.style.borderColor = 'transparent'; }
        } else {
            if (modeLoginBtn) { modeLoginBtn.classList.remove('btn-primary'); modeLoginBtn.classList.add('btn-ghost'); modeLoginBtn.style.borderColor = 'transparent'; }
            if (modeSignupBtn) { modeSignupBtn.classList.remove('btn-ghost'); modeSignupBtn.classList.add('btn-primary'); modeSignupBtn.style.borderColor = 'var(--color-primary)'; }
        }
        
        // 2. Smooth Text & Visibility Crossfade
        if (authModalTitle) authModalTitle.style.opacity = '0';
        if (primaryAuthText) primaryAuthText.style.opacity = '0'; 
        
        if (forgotPasswordBtn) {
            if (isLoginMode) {
                forgotPasswordBtn.style.visibility = 'visible';
                setTimeout(() => forgotPasswordBtn.style.opacity = '1', 10);
            } else {
                forgotPasswordBtn.style.opacity = '0';
                setTimeout(() => forgotPasswordBtn.style.visibility = 'hidden', 200); 
            }
        }

        // Swap text after fade out, then fade back in
        setTimeout(() => {
            if (isLoginMode) {
                if (authModalTitle) authModalTitle.textContent = "Welcome Back";
                if (primaryAuthText) primaryAuthText.textContent = "Login"; 
            } else {
                if (authModalTitle) authModalTitle.textContent = "Create Account";
                if (primaryAuthText) primaryAuthText.textContent = "Sign Up"; 
            }
            
            if (authModalTitle) authModalTitle.style.opacity = '1';
            if (primaryAuthText) primaryAuthText.style.opacity = '1'; 
        }, 150); 
    };

    modeLoginBtn?.addEventListener('click', (e) => { e.preventDefault(); setAuthMode(true); });
    modeSignupBtn?.addEventListener('click', (e) => { e.preventDefault(); setAuthMode(false); });

    openAuthModalBtn.addEventListener('click', () => {
        setAuthMode(true); // Default to login when opened
        SettingsUtils.clearFeedback(authFeedback);
        
        const container = document.getElementById('mainAuthInputContainer');
        if (container) {
            container.innerHTML = `
                <input type="email" id="authEmail" class="auth-input" placeholder="Email address" autocomplete="username" style="margin-bottom: 15px; width: 100%; padding: 12px var(--pad-md); background: var(--color-bg); border: 1px solid var(--color-glass-border); color: var(--color-text); border-radius: var(--rad-md); outline: none;" />
                <div class="password-wrapper" style="width: 100%;">
                    <input type="password" id="authPassword" class="auth-input" placeholder="Password" autocomplete="current-password" style="margin-bottom: 0; padding: 12px 40px 12px var(--pad-md); width: 100%; background: var(--color-bg); border: 1px solid var(--color-glass-border); color: var(--color-text); border-radius: var(--rad-md); outline: none;" />
                    <button id="togglePasswordVisBtn" class="password-eye-btn" type="button">
                        <svg id="eyeIconHidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        <svg id="eyeIconVisible" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            `;

            document.getElementById('togglePasswordVisBtn')?.addEventListener('click', () => {
                const passInput = document.getElementById('authPassword');
                const eyeHidden = document.getElementById('eyeIconHidden');
                const eyeVisible = document.getElementById('eyeIconVisible');
                if (passInput && passInput.type === 'password') {
                    passInput.type = 'text'; eyeHidden.style.display = 'none'; eyeVisible.style.display = 'block';
                } else if (passInput) {
                    passInput.type = 'password'; eyeHidden.style.display = 'block'; eyeVisible.style.display = 'none';
                }
            });

            document.getElementById('authEmail')?.addEventListener('input', () => SettingsUtils.clearFeedback(authFeedback));
            document.getElementById('authPassword')?.addEventListener('input', () => SettingsUtils.clearFeedback(authFeedback));
        }

        if (authModalOverlay) authModalOverlay.style.display = 'flex';
    });
    
    // UX UPGRADE: Attach close logic to BOTH cancel buttons (Desktop & Mobile)
    document.querySelectorAll('.auth-cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const container = document.getElementById('mainAuthInputContainer');
            if (container) container.innerHTML = '';
            if (authModalOverlay) authModalOverlay.style.display = 'none';
        });
    });

    // --- UX UPGRADE: Firebase Error Filter ---
    const filterAuthError = (error) => {
        const code = error.code;
        if (code === 'auth/invalid-credential') return "Incorrect email or password.";
        if (code === 'auth/email-already-in-use') return "This email is already registered.";
        if (code === 'auth/weak-password') return "Password must be at least 6 characters.";
        if (code === 'auth/invalid-email') return "Please enter a valid email format.";
        if (code === 'auth/network-request-failed') return "Network error. Check your connection.";
        if (code === 'auth/unauthorized-domain') return "App configuration error (Domain unauthorized).";
        if (code === 'auth/popup-closed-by-user') return "Sign-in was canceled."; 
        if (code === 'auth/user-not-found') return "No account found with this email.";
        if (code === 'auth/too-many-requests') return "Too many attempts. Try again later.";
        
        return error.message.length > 50 ? "An unexpected authentication error occurred." : error.message;
    };

    primaryAuthBtn?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail')?.value.trim() || '';
        const password = document.getElementById('authPassword')?.value || '';
        if(!email || !password) return SettingsUtils.showFeedback(authFeedback, "Please enter both email and password.", "error");
        
        const originalText = primaryAuthText ? primaryAuthText.textContent : (isLoginMode ? "Login" : "Sign Up");
        if (primaryAuthText) primaryAuthText.textContent = isLoginMode ? "Logging in..." : "Creating Account...";
        primaryAuthBtn.disabled = true;

        try {
            if (isLoginMode) await AppDB.login(email, password);
            else await AppDB.register(email, password);
            window.location.reload(); 
        } catch (error) {
            SettingsUtils.showFeedback(authFeedback, filterAuthError(error), "error");
            if (primaryAuthText) primaryAuthText.textContent = originalText;
            primaryAuthBtn.disabled = false;
        }
    });

    googleAuthBtn?.addEventListener('click', async () => {
        const originalText = googleAuthText ? googleAuthText.textContent : "Connect";
        if (googleAuthText) googleAuthText.textContent = "Connecting...";
        googleAuthBtn.disabled = true;
        try {
            await AppDB.loginWithGoogle();
            window.location.reload(); 
        } catch (error) {
            SettingsUtils.showFeedback(authFeedback, filterAuthError(error), "error");
            if (googleAuthText) googleAuthText.textContent = originalText;
            googleAuthBtn.disabled = false;
        }
    });

    forgotPasswordBtn?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail')?.value.trim() || '';
        if(!email) return SettingsUtils.showFeedback(authFeedback, "Please type your email address first.", "error");
        try {
            await AppDB.resetPassword(email);
            SettingsUtils.showFeedback(authFeedback, `Reset link sent to ${email}`, "success");
        } catch (error) {
            SettingsUtils.showFeedback(authFeedback, filterAuthError(error), "error");
        }
    });

    openUpdatePasswordBtn?.addEventListener('click', () => {
        SettingsUtils.clearFeedback(updateAuthFeedback);
        const container = document.getElementById('updatePasswordContainer');
        if (container) {
            container.innerHTML = `
                <div class="password-wrapper" style="width: 100%;">
                    <input type="password" id="newPasswordInput" class="auth-input" placeholder="Enter new password..." style="margin-bottom: 0; padding: 12px 40px 12px var(--pad-md); width: 100%; background: var(--color-bg); border: 1px solid var(--color-glass-border); color: var(--color-text); border-radius: var(--rad-md); outline: none;" />
                    <button id="toggleUpdatePasswordVisBtn" class="password-eye-btn" type="button">
                        <svg id="updateEyeIconHidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        <svg id="updateEyeIconVisible" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            `;
            document.getElementById('toggleUpdatePasswordVisBtn')?.addEventListener('click', () => {
                const passInput = document.getElementById('newPasswordInput');
                const eyeHidden = document.getElementById('updateEyeIconHidden');
                const eyeVisible = document.getElementById('updateEyeIconVisible');
                if (passInput && passInput.type === 'password') { passInput.type = 'text'; eyeHidden.style.display = 'none'; eyeVisible.style.display = 'block'; } 
                else if (passInput) { passInput.type = 'password'; eyeHidden.style.display = 'block'; eyeVisible.style.display = 'none'; }
            });
            document.getElementById('newPasswordInput')?.addEventListener('input', () => SettingsUtils.clearFeedback(updateAuthFeedback));
        }
        if (updatePasswordModalOverlay) updatePasswordModalOverlay.style.display = 'flex';
    });
    
    closeUpdatePasswordBtn?.addEventListener('click', () => {
        const container = document.getElementById('updatePasswordContainer');
        if (container) container.innerHTML = '';
        if (updatePasswordModalOverlay) updatePasswordModalOverlay.style.display = 'none';
    });

    saveNewPasswordBtn?.addEventListener('click', async () => {
        const newPass = document.getElementById('newPasswordInput')?.value || '';
        if(!newPass || newPass.length < 6) return SettingsUtils.showFeedback(updateAuthFeedback, "Password must be at least 6 characters.", "error");
        const originalText = saveNewPasswordBtn.textContent;
        saveNewPasswordBtn.textContent = "Updating...";
        saveNewPasswordBtn.disabled = true;
        try {
            await AppDB.updatePassword(newPass);
            SettingsUtils.showFeedback(updateAuthFeedback, "Password updated successfully!", "success");
            setTimeout(() => {
                const container = document.getElementById('updatePasswordContainer');
                if (container) container.innerHTML = '';
                if (updatePasswordModalOverlay) updatePasswordModalOverlay.style.display = 'none';
            }, 1500);
        } catch (error) { SettingsUtils.showFeedback(updateAuthFeedback, filterAuthError(error), "error"); } 
        finally { saveNewPasswordBtn.textContent = originalText; saveNewPasswordBtn.disabled = false; }
    });

    // --- MULTI-DEVICE LOGIC (MAIN DEVICE ARCHITECTURE) ---
    manageDevicesBtn?.addEventListener('click', async () => {
        if (!AppDB.session) return;
        if (activeDevicesList) activeDevicesList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--color-text-muted);">Fetching active sessions...</div>';
        if (linkedDevicesModal) linkedDevicesModal.style.display = 'flex';
        
        try {
            const doc = await firebase.firestore().collection('users').doc(AppDB.session.uid).get();
            const data = doc.data();
            if (activeDevicesList) activeDevicesList.innerHTML = '';

            if (data && data.sessions && activeDevicesList) {
                const myDeviceId = localStorage.getItem('appDeviceId');
                
                let mainDeviceId = null;
                let oldestTime = Infinity;
                
                Object.keys(data.sessions).forEach(id => {
                    const sessionData = data.sessions[id];
                    if (sessionData.isMain) {
                        mainDeviceId = id;
                    } else {
                        const ts = sessionData.createdAt || sessionData.timestamp || Date.now();
                        if (ts < oldestTime) {
                            oldestTime = ts;
                            mainDeviceId = id;
                        }
                    }
                });
                
                if (!mainDeviceId) mainDeviceId = Object.keys(data.sessions)[0];
                const amIMain = myDeviceId === mainDeviceId;

                Object.keys(data.sessions).forEach(devId => {
                    const sessionData = data.sessions[devId];
                    const isMe = devId === myDeviceId;
                    const isThisMain = devId === mainDeviceId;
                    
                    let deviceName = 'Linked Device';
                    const ua = sessionData.userAgent || '';
                    if (ua) {
                        let os = 'Unknown OS';
                        if (ua.includes('Win')) os = 'Windows';
                        else if (ua.includes('Mac') && !ua.includes('iPhone') && !ua.includes('iPad')) os = 'macOS';
                        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                        else if (ua.includes('Android')) os = 'Android';
                        else if (ua.includes('Linux')) os = 'Linux';
                        
                        let type = 'Desktop';
                        if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) type = 'Mobile';
                        else if (ua.includes('Tablet') || ua.includes('iPad')) type = 'Tablet';
                        
                        deviceName = `${os} ${type}`;
                    } else if (sessionData.name && sessionData.name !== 'Unknown Device') {
                        deviceName = sessionData.name;
                    }

                    let badgeIcons = '';
                    if (isThisMain) {
                        badgeIcons += `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; transform: translateY(-2px);"><polygon points="6.5 21 17.5 21 20 11 15 15 12 6 9 15 4 11"></polygon></svg>`;
                    }
                    if (isMe) {
                        badgeIcons += `<svg width="8" height="8" viewBox="0 0 24 24" fill="var(--color-primary)" style="margin-left: 6px;"><circle cx="12" cy="12" r="10"></circle></svg>`;
                    }

                    const canRemove = amIMain && !isMe;

                    const item = document.createElement('div');
                    item.className = 'subject-manager-item';
                    item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: rgba(255,255,255,0.02); border: 1px solid var(--color-glass-border); border-radius: var(--rad-md); margin-bottom: 8px;';
                    
                    item.innerHTML = `
                        <div style="display: flex; align-items: center; font-weight: 700; color: ${isMe || isThisMain ? 'var(--color-primary)' : 'var(--color-text)'}; font-size: 0.95rem;">
                            ${deviceName}
                            ${badgeIcons}
                        </div>
                        ${canRemove ? `<button class="btn-danger remove-device-btn" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--rad-sm);">Remove</button>` : ''}
                    `;
                    
                    if (canRemove) {
                        item.querySelector('.remove-device-btn').addEventListener('click', async () => {
                            window.AppAlert.show({
                                title: "Remove Linked Device?",
                                message: `Are you sure you want to remotely log out this ${deviceName}?`,
                                buttons: [
                                    { text: "Cancel", type: "ghost" },
                                    { text: "Remove", type: "danger", onClick: async () => {
                                        await firebase.firestore().collection('users').doc(AppDB.session.uid).set({
                                            sessions: { [devId]: firebase.firestore.FieldValue.delete() }
                                        }, { merge: true });
                                        item.remove();
                                    }}
                                ]
                            });
                        });
                    }
                    activeDevicesList.appendChild(item);
                });
            }
        } catch (e) {
            if (activeDevicesList) activeDevicesList.innerHTML = '<div style="text-align: center; color: var(--color-danger);">Failed to load devices.</div>';
        }
    });

    closeLinkedDevicesBtn?.addEventListener('click', () => {
        if (linkedDevicesModal) linkedDevicesModal.style.display = 'none';
    });

    logoutAllBtn?.addEventListener('click', () => {
        window.AppAlert.show({
            title: "Logout All Devices?",
            message: "This will sign you out of Billu's Diary on every connected browser and device.",
            buttons: [
                { text: "Cancel", type: "ghost" },
                { text: "Logout All", type: "danger", onClick: async () => {
                    if (AppDB.session) {
                        await firebase.firestore().collection('users').doc(AppDB.session.uid).set({
                            sessions: firebase.firestore.FieldValue.delete()
                        }, { merge: true });
                    }
                    AppDB.logout();
                }}
            ]
        });
    });

    logoutBtn.addEventListener('click', () => {
        window.AppAlert.show({
            title: "Log Out",
            message: "Are you sure you want to log out of this device? Your data is safely synced to the cloud.",
            buttons: [
                { text: "Cancel", type: "ghost" },
                { text: "Log Out", type: "danger", onClick: () => AppDB.logout() }
            ]
        });
    });

    checkSession();
}