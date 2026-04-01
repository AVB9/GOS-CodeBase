// Global Toast Helper
window.showAppToast = window.showAppToast || function(msg) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
};

// Global Ultimate Completion Checker
window.checkUltimateCompletion = window.checkUltimateCompletion || function(dateStr) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (dateStr !== todayKey) return; 

    const todoKey = `todo_${todayKey}`;
    const todos = JSON.parse(localStorage.getItem(todoKey)) || [];
    const allTodosDone = todos.length > 0 && todos.every(t => t.status === 'done');

    const plannerCompleted = JSON.parse(localStorage.getItem('plannerCompleted')) || [];
    const plannerDone = plannerCompleted.includes(todayKey);

    const celebKey = 'celebrated_' + todayKey;

    if (allTodosDone && plannerDone) {
        if (!localStorage.getItem(celebKey)) {
            setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 300);
            localStorage.setItem(celebKey, 'true');
        }
    } else {
        localStorage.removeItem(celebKey);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initTodoTab();
});

function initTodoTab() {
    const input = document.getElementById('newTaskInput') || document.getElementById('todoInput');
    const addBtn = document.getElementById('addTaskBtn');
    const listEl = document.getElementById('todoList') || document.getElementById('mobileTodoList');
    const prevBtn = document.getElementById('todoPrevDay');
    const nextBtn = document.getElementById('todoNextDay');
    const dateDisplay = document.getElementById('todoDateDisplay');
    const tray = document.getElementById('todoSubjectTray');

    const pcTodo = document.getElementById('kanban-todo');
    const pcInProgress = document.getElementById('kanban-in-progress');
    const pcDone = document.getElementById('kanban-done');

    if (!input || !addBtn || !listEl || !dateDisplay) return;

    let currentDate = new Date();
    let tasks = [];
    let selectedSubjectId = null;

    const getDateKey = (date) => {
        if (!(date instanceof Date) || isNaN(date)) date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `todo_${y}-${m}-${d}`;
    };

    const isFutureDate = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const viewDate = new Date(currentDate);
        viewDate.setHours(0,0,0,0);
        return viewDate > today;
    };

    const handleStatusCycle = (task) => {
        const nextStatus = task.status === 'todo' ? 'in-progress' : (task.status === 'in-progress' ? 'done' : 'todo');
        if (nextStatus === 'done' && isFutureDate()) {
            window.showAppToast("gmasti tho dekho koi inki!!");
            return false;
        }
        task.status = nextStatus;
        return true;
    };

    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || [{ id: 'off', name: 'Day Off', color: '#555555' }];

    const hexToRgba = (hex, alpha) => {
        if (!hex) return `rgba(255,255,255,${alpha})`;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const r = parseInt(hex.substring(0,2), 16), g = parseInt(hex.substring(2,4), 16), b = parseInt(hex.substring(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const updateDateDisplay = () => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const compareDate = new Date(currentDate); compareDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((compareDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) dateDisplay.textContent = "Today";
        else if (diffDays === -1) dateDisplay.textContent = "Yesterday";
        else if (diffDays === 1) dateDisplay.textContent = "Tomorrow";
        else dateDisplay.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const loadTasks = () => {
        const rawTasks = JSON.parse(localStorage.getItem(getDateKey(currentDate))) || [];
        tasks = rawTasks.map(t => {
            if (!t.status) t.status = t.done ? 'done' : 'todo';
            return t;
        });
        renderTasks();
        updateDateDisplay();
    };

    const saveTasks = () => {
        try {
            localStorage.setItem(getDateKey(currentDate), JSON.stringify(tasks));
            if (window.AppEvents) window.AppEvents.emit('TODO_UPDATED');
        } catch (e) { console.error('Storage error', e); }
    };

    // --- TODO SCROLL ENGINE (TSE) ---
    let tseTimer = null; 
    const triggerTSE = (delay = 300) => {
        clearTimeout(tseTimer);
        tseTimer = setTimeout(() => {
            if (!listEl && !pcTodo) return;
            
            window.isAutoScrolling = true; 
            
            const isDesktop = window.innerWidth >= 768;
            const targetContainer = isDesktop ? pcTodo : listEl;
            if (!targetContainer) {
                window.isAutoScrolling = false;
                return;
            }

            let targetNode = null;
            const taskNodes = Array.from(targetContainer.querySelectorAll(isDesktop ? '.kanban-task' : '.todo-item'));
            
            if (selectedSubjectId) {
                const subjectTasks = taskNodes.filter(el => {
                    const taskId = parseInt(el.dataset.taskId || el.dataset.id, 10);
                    const taskData = tasks.find(t => t.id === taskId);
                    return taskData && taskData.subjectId === selectedSubjectId;
                });
                if (subjectTasks.length > 0) targetNode = subjectTasks[subjectTasks.length - 1];
            } else {
                const generalTasks = taskNodes.filter(el => {
                    const taskId = parseInt(el.dataset.taskId || el.dataset.id, 10);
                    const taskData = tasks.find(t => t.id === taskId);
                    return taskData && (!taskData.subjectId || taskData.subjectId === 'null');
                });
                if (generalTasks.length > 0) targetNode = generalTasks[generalTasks.length - 1];
            }
            
            if (!targetNode) {
                const header = Array.from(targetContainer.querySelectorAll(isDesktop ? '.kanban-subject-header' : '.todo-subject-header'))
                                    .find(el => el.dataset.subjectId === (selectedSubjectId ? selectedSubjectId : 'null'));
                if (header) targetNode = header;
            }
            
            if (targetNode) {
                if (isDesktop) {
                    targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    const floatUI = document.getElementById('floatingTodoInput');
                    const trayUI = document.getElementById('todoSubjectTray');

                    if (floatUI) {
                        const nodeRect = targetNode.getBoundingClientRect();
                        
                        let uiTopEdge = floatUI.getBoundingClientRect().top;
                        if (trayUI && trayUI.classList.contains('active')) {
                            uiTopEdge = trayUI.getBoundingClientRect().top;
                        }

                        // EXACT MATH: Target Bottom - UI Top + 15px Padding
                        const offset = nodeRect.bottom - uiTopEdge + 15;

                        if (Math.abs(offset) > 5) {
                            // THE POLISH: If scrolling UP (negative offset), snap instantly to prevent Float detachment.
                            // If scrolling DOWN (positive offset), keep the smooth animation.
                            const scrollBehavior = offset < 0 ? 'auto' : 'smooth';
                            window.scrollBy({ top: offset, behavior: scrollBehavior });
                        }
                    }
                }
            }
            
            setTimeout(() => window.isAutoScrolling = false, 800); 
        }, delay); 
    };

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            if (document.activeElement === input) {
                triggerTSE(100); // 100ms debounce ensures keyboard completely settles before math calculates
            }
        });
    }

    const renderSubjectTray = () => {
        if (!tray) return;
        tray.innerHTML = '';
        const subjects = getSubjects().filter(s => s.id !== 'off');

        if (subjects.length === 0) {
            const emptyPill = document.createElement('div');
            emptyPill.className = `todo-tint-pill`;
            emptyPill.textContent = "Add Subjects in Settings →";
            
            const handleEmptyClick = (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelector('.bottom-pill-btn[data-target="tab-settings"]')?.click();
            };
            emptyPill.addEventListener('mousedown', handleEmptyClick);
            emptyPill.addEventListener('touchstart', handleEmptyClick, { passive: false });
            tray.appendChild(emptyPill);
            return;
        }

        subjects.forEach(sub => {
            const pill = document.createElement('div');
            pill.className = `todo-tint-pill ${selectedSubjectId === sub.id ? 'selected' : ''}`;
            pill.textContent = sub.name;
            
            if (selectedSubjectId === sub.id) {
                pill.style.backgroundColor = `color-mix(in srgb, ${sub.color} 20%, var(--color-surface))`;
                pill.style.borderColor = sub.color;
                pill.style.color = sub.color;
            }
            
            const handlePillInteraction = (e) => {
                e.preventDefault(); e.stopPropagation();
                selectedSubjectId = selectedSubjectId === sub.id ? null : sub.id;
                renderSubjectTray(); 
                triggerTSE(100); 
            };

            pill.addEventListener('mousedown', handlePillInteraction);
            pill.addEventListener('touchstart', handlePillInteraction, { passive: false });
            tray.appendChild(pill);
        });
    };

    input.addEventListener('focus', () => { 
        if (tray) tray.classList.add('active'); 
        triggerTSE();
    });

    input.addEventListener('click', () => { if (tray) tray.classList.add('active'); });

    document.addEventListener('mousedown', (e) => {
        if (e.target === input || input.contains(e.target)) return; 
        if (tray && (e.target === tray || tray.contains(e.target))) return; 
        if (tray && tray.classList.contains('active')) tray.classList.remove('active');
    });

    document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('#mobileTodoView') && !e.target.closest('.todo-input-group')) {
            const stuckClones = document.querySelectorAll('.flying-glass-task');
            if (stuckClones.length > 0) {
                stuckClones.forEach(c => c.remove());
                document.querySelectorAll('.dragging-placeholder').forEach(el => el.classList.remove('dragging-placeholder'));
                renderTasks(); 
            }
        }
    }, { passive: true });

    const updateMobileOrder = () => {
        if(!listEl) return;
        const newTasks = [];
        let currentSubj = null;
        
        listEl.childNodes.forEach(node => {
            if (node.classList?.contains('todo-subject-header')) {
                currentSubj = node.dataset.subjectId === 'null' ? null : node.dataset.subjectId;
            } else if (node.classList?.contains('todo-item') && !node.classList.contains('dragging-placeholder')) {
                const id = parseInt(node.dataset.taskId, 10);
                const t = tasks.find(x => x.id === id);
                if (t) {
                    t.subjectId = currentSubj;
                    newTasks.push(t);
                }
            }
        });
        tasks = newTasks; 
        saveTasks(); 
        renderTasks(); 
        window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
    };

    const updatePCOrder = () => {
        const newTasks = [];
        const columns = [ { el: pcTodo, status: 'todo' }, { el: pcInProgress, status: 'in-progress' }, { el: pcDone, status: 'done' } ];
        const originalTasks = new Map(tasks.map(t => [t.id, { ...t }]));
        
        columns.forEach(col => {
            if (!col.el) return;
            let currentSubj = null; 
            
            col.el.childNodes.forEach(node => {
                if (node.classList?.contains('kanban-subject-header')) {
                    currentSubj = node.dataset.subjectId === 'null' ? null : node.dataset.subjectId;
                } else if (node.classList?.contains('kanban-task') && !node.classList.contains('is-dragging')) {
                    const id = parseInt(node.dataset.id, 10);
                    const t = tasks.find(x => x.id === id);
                    if (t) {
                        const original = originalTasks.get(id);
                        const oldStatus = original.status;
                        const newStatus = col.status;

                        if (oldStatus !== newStatus) {
                            if (newStatus === 'done' && isFutureDate()) {
                                window.showAppToast("gmasti tho dekho koi inki!!");
                                t.status = oldStatus; 
                                t.subjectId = original.subjectId;
                            } else {
                                t.status = newStatus;
                                t.subjectId = original.subjectId;
                                if (newStatus === 'done') {
                                    setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 100);
                                }
                            }
                        } else {
                            t.status = newStatus;
                            t.subjectId = currentSubj;
                        }
                        newTasks.push(t);
                    }
                }
            });
        });
        
        tasks.forEach(t => { if (!newTasks.find(nt => nt.id === t.id)) newTasks.push(t); });
        tasks = newTasks; 
        saveTasks(); 
        renderTasks();
        window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
    };

    const renderTasks = () => {
        if (listEl) listEl.innerHTML = '';
        if (pcTodo) pcTodo.innerHTML = '';
        if (pcInProgress) pcInProgress.innerHTML = '';
        if (pcDone) pcDone.innerHTML = '';

        if (tasks.length === 0) {
            if (listEl) listEl.innerHTML = `<li class="empty-task-text" style="text-align: center;">No tasks for this day.</li>`;
            return;
        }

        const subjectsList = [{ id: null, name: 'General', color: '#888888' }, ...getSubjects().filter(s => s.id !== 'off')];

        // ---------------------------------------------------------
        // A. MOBILE LIST RENDERING
        // ---------------------------------------------------------
        if (listEl) {
            subjectsList.forEach(sub => {
                const subTasks = tasks.filter(t => (t.subjectId || null) === sub.id);
                if (subTasks.length === 0) return;

                const hdr = document.createElement('li');
                hdr.className = sub.id === null ? 'todo-subject-header hidden' : 'todo-subject-header';
                hdr.dataset.subjectId = sub.id === null ? 'null' : sub.id;
                if (sub.id !== null) { hdr.style.color = sub.color; hdr.textContent = sub.name; }
                else { hdr.style.display = 'none'; }
                listEl.appendChild(hdr);

                subTasks.forEach(task => {
                    const li = document.createElement('li');
                    li.className = `todo-item ${task.status === 'done' ? 'done' : ''} ${task.status === 'in-progress' ? 'in-progress' : ''}`;
                    li.dataset.taskId = task.id; 
                    
                    li.innerHTML = `
                        <div class="todo-checkbox ${task.status}">
                            <svg viewBox="0 0 24 24" class="checkbox-svg">
                                <line x1="6" y1="12" x2="18" y2="12" class="dash-line"></line>
                                <polyline points="20 6 9 17 4 12" class="tick-path"></polyline>
                            </svg>
                        </div>
                        <span class="todo-text">${task.text}</span>
                        <button class="todo-delete">×</button>
                    `;

                    li.querySelector('.todo-delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (li.classList.contains('is-editing')) {
                            const editInput = li.querySelector('.todo-edit-input');
                            if (editInput) editInput.blur(); 
                            return;
                        }
                        tasks = tasks.filter(t => t.id !== task.id); 
                        saveTasks(); 
                        renderTasks();
                        window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', '')); 
                    });

                    li.querySelector('.todo-checkbox').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (handleStatusCycle(task)) {
                            saveTasks(); 
                            renderTasks();
                            if (task.status === 'done') setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 100);
                            window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', '')); 
                        }
                    });

                    const textSpan = li.querySelector('.todo-text');
                    const openEditMode = () => {
                        const taskNode = li;
                        if (taskNode.querySelector('.todo-edit-wrapper')) return; 
                        
                        taskNode.classList.add('is-editing'); 
                        window.isEditingTask = true; 

                        const wrapper = document.createElement('div');
                        wrapper.className = 'todo-edit-wrapper';
                        wrapper.style.flex = '1';
                        wrapper.style.minWidth = '0';
                        wrapper.style.display = 'flex';
                        
                        const editInput = document.createElement('textarea');
                        editInput.value = task.text; 
                        editInput.className = 'todo-edit-input';
                        editInput.style.width = '100%';
                        editInput.setAttribute('autocomplete', 'off');
                        editInput.setAttribute('spellcheck', 'false');
                        
                        wrapper.appendChild(editInput);
                        textSpan.replaceWith(wrapper); 
                        
                        requestAnimationFrame(() => {
                            editInput.style.height = 'auto';
                            editInput.style.height = (editInput.scrollHeight) + 'px';
                        });

                        editInput.addEventListener('input', function() {
                            this.style.height = 'auto';
                            this.style.height = (this.scrollHeight) + 'px';
                        });

                        editInput.focus();
                        editInput.setSelectionRange(editInput.value.length, editInput.value.length);

                        let tomoBtn = null;
                        if (task.status !== 'done') {
                            tomoBtn = document.createElement('button');
                            tomoBtn.className = 'shift-tomorrow-popup'; 
                            tomoBtn.innerHTML = 'Tomorrow ➔';
                            
                            const shiftAction = (e) => {
                                e.preventDefault(); 
                                window.isEditingTask = false;
                                tasks = tasks.filter(t => t.id !== task.id);
                                saveTasks();
                                
                                const tomorrow = new Date(currentDate);
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const targetKey = getDateKey(tomorrow);
                                
                                const targetTasks = JSON.parse(localStorage.getItem(targetKey)) || [];
                                task.status = 'todo'; 
                                targetTasks.unshift(task); 
                                localStorage.setItem(targetKey, JSON.stringify(targetTasks));
                                
                                taskNode.classList.remove('is-editing');
                                renderTasks(); 
                                window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
                            };
                            tomoBtn.addEventListener('mousedown', shiftAction);
                            tomoBtn.addEventListener('touchstart', shiftAction, { passive: false });
                            
                            taskNode.appendChild(tomoBtn); 
                        }
                        
                        const saveEdit = () => {
                            const executeClose = () => {
                                window.isEditingTask = false; 
                                taskNode.classList.remove('is-editing');
                                if (tomoBtn && tomoBtn.parentNode) tomoBtn.remove();
                                const newText = editInput.value.trim();
                                if (newText) { task.text = newText; saveTasks(); }
                                renderTasks();
                            };

                            if (tomoBtn && tomoBtn.parentNode) {
                                tomoBtn.classList.add('closing');
                                setTimeout(executeClose, 250);
                            } else {
                                executeClose();
                            }
                        };
                        
                        editInput.addEventListener('blur', saveEdit);
                        editInput.addEventListener('keypress', (e) => { 
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                editInput.blur(); 
                            }
                        });
                    };

                    let holdTimer = null; 
                    let singleTapTimer = null;
                    let tapCount = 0;
                    let isDragging = false; 
                    let currentClone = null; 
                    let startTouchX = 0, startTouchY = 0; 
                    let touchStartTime = 0;
                    let currentTouchY = 0;     
                    
                    const scrollContainer = document.getElementById('todoSwipeContainer'); 
                    let scrollInterval = null; 

                    const checkAutoScroll = () => {
                        if (!isDragging || !scrollContainer) return;
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const edgeThreshold = 80;
                        if (currentTouchY < containerRect.top + edgeThreshold) scrollContainer.scrollTop -= 12;
                        else if (currentTouchY > containerRect.bottom - edgeThreshold) scrollContainer.scrollTop += 12;
                        if (isDragging) scrollInterval = requestAnimationFrame(checkAutoScroll);
                    };

                    li.addEventListener('contextmenu', (e) => {
                        if (!li.querySelector('.todo-edit-input')) e.preventDefault();
                    });
                    
                    li.addEventListener('touchstart', (e) => {
                        clearTimeout(holdTimer); 
                        if (li.querySelector('.todo-edit-input')) return;
                        
                        startTouchX = e.touches[0].clientX; 
                        startTouchY = e.touches[0].clientY;
                        currentTouchY = startTouchY;
                        touchStartTime = Date.now();

                        cancelAnimationFrame(scrollInterval);
                        
                        if (e.target.closest('.todo-delete') || e.target.closest('.todo-checkbox')) return;
                        
                        holdTimer = setTimeout(() => {
                            isDragging = true;
                            tapCount = 0; 
                            clearTimeout(singleTapTimer);
                            
                            if (navigator.vibrate) navigator.vibrate(50); 
                            const startRect = li.getBoundingClientRect(); 
                            currentClone = li.cloneNode(true); currentClone.classList.add('flying-glass-task');
                            currentClone.style.width = `${startRect.width}px`; currentClone.style.height = `${startRect.height}px`;
                            currentClone.style.left = `${startRect.left}px`; currentClone.style.top = `${startRect.top}px`;
                            document.body.appendChild(currentClone); li.classList.add('dragging-placeholder');
                            checkAutoScroll();
                        }, 400); 
                    }, { passive: true });

                    li.addEventListener('touchmove', (e) => {
                        if (li.querySelector('.todo-edit-input')) return;
                        currentTouchY = e.touches[0].clientY;
                        const deltaX = Math.abs(e.touches[0].clientX - startTouchX); 
                        const deltaY = Math.abs(currentTouchY - startTouchY);

                        if (!isDragging) {
                            if (deltaX > 10 || deltaY > 10) clearTimeout(holdTimer); 
                            return; 
                        }
                        
                        e.preventDefault(); 
                        const moveX = e.touches[0].clientX - startTouchX; 
                        const moveY = currentTouchY - startTouchY;
                        currentClone.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.04)`;
                        
                        currentClone.classList.add('ghost-mode');
                        const targetEl = document.elementFromPoint(e.touches[0].clientX, currentTouchY);
                        currentClone.classList.remove('ghost-mode');
                        
                        const overItem = targetEl?.closest('.todo-item:not(.dragging-placeholder), .todo-subject-header');
                        if (overItem && overItem !== li) {
                            const allItems = [...listEl.children];
                            if (allItems.indexOf(li) < allItems.indexOf(overItem)) overItem.after(li);
                            else overItem.before(li);
                        }
                    }, { passive: false });

                    li.addEventListener('touchend', (e) => {
                        if (li.querySelector('.todo-edit-input')) return;
                        clearTimeout(holdTimer); 

                        if (isDragging) {
                            cancelAnimationFrame(scrollInterval);
                            isDragging = false; 
                            li.classList.remove('dragging-placeholder');
                            if (currentClone) { currentClone.remove(); currentClone = null; }
                            updateMobileOrder(); 
                            return; 
                        }

                        const touchDuration = Date.now() - touchStartTime;
                        const endTouch = e.changedTouches[0];
                        const deltaX = Math.abs(endTouch.clientX - startTouchX);
                        const deltaY = Math.abs(endTouch.clientY - startTouchY);

                        if (touchDuration < 500 && deltaX < 15 && deltaY < 15) {
                            if (e.target.closest('.todo-delete') || e.target.closest('.todo-checkbox')) return; 

                            e.preventDefault(); 
                            tapCount++;
                            if (tapCount === 1) {
                                singleTapTimer = setTimeout(() => {
                                    tapCount = 0;
                                    if (handleStatusCycle(task)) {
                                        saveTasks(); 
                                        renderTasks();
                                        if (task.status === 'done') setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 100);
                                        window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
                                    }
                                }, 250); 
                            } else if (tapCount === 2) {
                                clearTimeout(singleTapTimer);
                                tapCount = 0;
                                openEditMode(); 
                            }
                        }
                    });

                    li.addEventListener('touchcancel', () => {
                        clearTimeout(holdTimer);
                        cancelAnimationFrame(scrollInterval);
                        if (isDragging) {
                            isDragging = false; li.classList.remove('dragging-placeholder');
                            if (currentClone) { currentClone.remove(); currentClone = null; }
                        }
                    });

                    let pcClickTimer = null;
                    li.addEventListener('click', (e) => {
                        if (e.target.closest('.todo-delete') || e.target.closest('.todo-checkbox') || e.target.closest('.todo-edit-input')) return;
                        
                        if (e.detail === 1) { 
                            pcClickTimer = setTimeout(() => {
                                if (handleStatusCycle(task)) {
                                    saveTasks(); 
                                    renderTasks();
                                    if (task.status === 'done') setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 100);
                                    window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
                                }
                            }, 250); 
                        } else if (e.detail === 2) { 
                            clearTimeout(pcClickTimer); 
                            openEditMode(); 
                        }
                    });

                    listEl.appendChild(li);
                });
            });
        }

        // ---------------------------------------------------------
        // B. PC KANBAN RENDERING
        // ---------------------------------------------------------
        const columns = [ { el: pcTodo, status: 'todo' }, { el: pcInProgress, status: 'in-progress' }, { el: pcDone, status: 'done' } ];
        
        columns.forEach(col => {
            if (!col.el) return;
            
            subjectsList.forEach(sub => {
                const subTasks = tasks.filter(t => (t.subjectId || null) === sub.id && t.status === col.status);
                
                if (subTasks.length === 0) return; 

                const hdr = document.createElement('div');
                hdr.className = 'kanban-subject-header';
                hdr.dataset.subjectId = sub.id === null ? 'null' : sub.id;
                if (sub.id !== null) { hdr.style.color = sub.color; hdr.textContent = sub.name; }
                else { hdr.style.display = 'none'; }
                col.el.appendChild(hdr);

                subTasks.forEach(task => {
                    const pcCard = document.createElement('div');
                    pcCard.className = `kanban-task ${task.status === 'done' ? 'done' : ''}`;
                    pcCard.draggable = true;
                    pcCard.dataset.id = task.id;
                    pcCard.dataset.sourceStatus = task.status; 

                    pcCard.innerHTML = `
                        <div class="todo-checkbox ${task.status}">
                            <svg viewBox="0 0 24 24" class="checkbox-svg">
                                <line x1="6" y1="12" x2="18" y2="12" class="dash-line"></line>
                                <polyline points="20 6 9 17 4 12" class="tick-path"></polyline>
                            </svg>
                        </div>
                        <span class="todo-text">${task.text}</span>
                        <button class="todo-delete">×</button>
                    `;

                    pcCard.querySelector('.todo-delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (pcCard.classList.contains('is-editing')) {
                            const editInput = pcCard.querySelector('.todo-edit-input');
                            if (editInput) editInput.blur(); 
                            return;
                        }
                        tasks = tasks.filter(t => t.id !== task.id); 
                        saveTasks(); 
                        renderTasks();
                        window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
                    });

                    const textSpan = pcCard.querySelector('.todo-text');
                    
                    textSpan.addEventListener('dblclick', () => {
                        const taskNode = pcCard;
                        if (taskNode.querySelector('.todo-edit-wrapper')) return; 
                        taskNode.draggable = false; 
                        
                        taskNode.classList.add('is-editing'); 
                        window.isEditingTask = true; 

                        const wrapper = document.createElement('div');
                        wrapper.className = 'todo-edit-wrapper';
                        wrapper.style.flex = '1';
                        wrapper.style.minWidth = '0';
                        wrapper.style.display = 'flex';
                        
                        const editInput = document.createElement('textarea');
                        editInput.value = task.text; 
                        editInput.className = 'todo-edit-input';
                        editInput.style.width = '100%';
                        editInput.setAttribute('autocomplete', 'off');
                        editInput.setAttribute('spellcheck', 'false');
                        
                        wrapper.appendChild(editInput);
                        textSpan.replaceWith(wrapper); 
                        
                        requestAnimationFrame(() => {
                            editInput.style.height = 'auto';
                            editInput.style.height = (editInput.scrollHeight) + 'px';
                        });

                        editInput.addEventListener('input', function() {
                            this.style.height = 'auto';
                            this.style.height = (this.scrollHeight) + 'px';
                        });

                        editInput.focus();
                        editInput.setSelectionRange(editInput.value.length, editInput.value.length);

                        let tomoBtn = null;
                        if (task.status !== 'done') {
                            tomoBtn = document.createElement('button');
                            tomoBtn.className = 'shift-tomorrow-popup'; 
                            tomoBtn.innerHTML = 'Tomorrow ➔';
                            
                            const shiftAction = (e) => {
                                e.preventDefault(); 
                                window.isEditingTask = false;
                                tasks = tasks.filter(t => t.id !== task.id);
                                saveTasks();
                                
                                const tomorrow = new Date(currentDate);
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const targetKey = getDateKey(tomorrow);
                                
                                const targetTasks = JSON.parse(localStorage.getItem(targetKey)) || [];
                                task.status = 'todo'; 
                                targetTasks.unshift(task); 
                                localStorage.setItem(targetKey, JSON.stringify(targetTasks));
                                
                                taskNode.classList.remove('is-editing');
                                renderTasks(); 
                                window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
                            };
                            tomoBtn.addEventListener('mousedown', shiftAction);
                            tomoBtn.addEventListener('touchstart', shiftAction, { passive: false });
                            
                            taskNode.appendChild(tomoBtn); 
                        }
                        
                        const saveEdit = () => {
                            const executeClose = () => {
                                window.isEditingTask = false;
                                taskNode.classList.remove('is-editing');
                                if (tomoBtn && tomoBtn.parentNode) tomoBtn.remove();
                                const newText = editInput.value.trim();
                                if (newText) { task.text = newText; saveTasks(); }
                                renderTasks();
                            };

                            if (tomoBtn && tomoBtn.parentNode) {
                                tomoBtn.classList.add('closing');
                                setTimeout(executeClose, 250);
                            } else {
                                executeClose();
                            }
                        };
                        
                        editInput.addEventListener('blur', saveEdit);
                        editInput.addEventListener('keypress', (e) => { 
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                editInput.blur(); 
                            }
                        });
                    });

                    pcCard.querySelector('.todo-checkbox').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (handleStatusCycle(task)) {
                            saveTasks(); 
                            renderTasks();
                            if (task.status === 'done') setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 100);
                            window.checkUltimateCompletion(getDateKey(currentDate).replace('todo_', ''));
                        }
                    });

                    pcCard.addEventListener('dragstart', (e) => { 
                        if (pcCard.querySelector('.todo-edit-input')) { e.preventDefault(); return; }
                        setTimeout(() => pcCard.classList.add('is-dragging'), 1); 
                        e.dataTransfer.effectAllowed = 'move';
                    });
                    
                    pcCard.addEventListener('dragend', () => { 
                        pcCard.classList.remove('is-dragging'); 
                        document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('inter-drag-target'));
                        updatePCOrder(); 
                    });

                    col.el.appendChild(pcCard);
                });
            });
        });
    };

    const setupKanbanDropzones = () => {
        const columns = [pcTodo, pcInProgress, pcDone];
        
        columns.forEach(dropzone => {
            if(!dropzone) return;
            const columnWrapper = dropzone.closest('.kanban-column');
            
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                const draggingCard = document.querySelector('.is-dragging');
                if(!draggingCard) return;

                const sourceStatus = draggingCard.dataset.sourceStatus;
                const targetStatus = columnWrapper.dataset.status;

                if (sourceStatus !== targetStatus) {
                    columnWrapper.classList.add('inter-drag-target'); 
                    dropzone.appendChild(draggingCard); 
                } else {
                    columnWrapper.classList.remove('inter-drag-target'); 
                    const afterElement = getDragAfterElement(dropzone, e.clientY);
                    if (afterElement == null) dropzone.appendChild(draggingCard);
                    else dropzone.insertBefore(draggingCard, afterElement);
                }
            });

            dropzone.addEventListener('dragleave', (e) => {
                if (!columnWrapper.contains(e.relatedTarget)) {
                    columnWrapper.classList.remove('inter-drag-target');
                }
            });

            dropzone.addEventListener('drop', () => {
                columnWrapper.classList.remove('inter-drag-target');
            });
        });
    };

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.kanban-task:not(.is-dragging), .kanban-subject-header')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const todoTitle = document.querySelector('#tab-todo .tab-title');
    if (todoTitle) {
        todoTitle.style.cursor = 'pointer';
        todoTitle.style.transition = 'transform 0.1s ease';
        todoTitle.addEventListener('mousedown', () => todoTitle.style.transform = 'scale(0.92)');
        todoTitle.addEventListener('mouseup', () => todoTitle.style.transform = 'scale(1)');
        todoTitle.addEventListener('mouseleave', () => todoTitle.style.transform = 'scale(1)');
        todoTitle.addEventListener('touchstart', () => todoTitle.style.transform = 'scale(0.92)', {passive: true});
        todoTitle.addEventListener('touchend', () => todoTitle.style.transform = 'scale(1)');

        todoTitle.addEventListener('click', async () => {
            if (tasks.length === 0) return;

            const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            let exportText = `Date : ${dateStr}\n\n`;

            const statuses = ['todo', 'in-progress', 'done'];
            const statusLabels = { 'todo': 'TODO', 'in-progress': 'IN-PROGRESS', 'done': 'DONE' };
            const subjects = [{ id: null, name: 'General' }, ...getSubjects().filter(s => s.id !== 'off')];

            statuses.forEach(status => {
                const tasksInStatus = tasks.filter(t => t.status === status);
                if (tasksInStatus.length === 0) return;

                exportText += `State : ${statusLabels[status]}\n\n`;

                subjects.forEach(sub => {
                    const subTasks = tasksInStatus.filter(t => (t.subjectId || null) === sub.id);
                    if (subTasks.length === 0) return;

                    if (sub.id !== null) {
                        exportText += `Subject : ${sub.name}\n\n`;
                    }

                    exportText += `Task :- `;

                    subTasks.forEach((t, index) => {
                        if (index === 0) {
                            exportText += `1. ${t.text}\n`;
                        } else {
                            exportText += `        ${index + 1}. ${t.text}\n`;
                        }
                    });
                    exportText += `\n`;
                });
            });

            const copyToClipboard = async (text) => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-999999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        textArea.remove();
                    }
                } catch (err) {
                    console.error('Copy failed', err);
                }
            };

            await copyToClipboard(exportText.trim());
            window.showAppToast('Tasks Copied!!');
        });
    }

    const addTask = () => {
        const text = input.value.trim();
        if (text) {
            const newTask = { id: Date.now(), text: text, status: 'todo', subjectId: selectedSubjectId };
            tasks.push(newTask);
            input.value = ''; 
            saveTasks(); 
            renderTasks();
            
            localStorage.removeItem('celebrated_' + getDateKey(currentDate).replace('todo_', ''));
            triggerTSE(100); 
        }
    };

    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } });

    const changeDate = (days) => { currentDate.setDate(currentDate.getDate() + days); loadTasks(); };
    if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

    dateDisplay.addEventListener('click', () => {
        if(window.AppEvents) AppEvents.emit('REQUEST_DATE_PICKER', { tab: 'todo', dateStr: getDateKey(currentDate).replace('todo_', '') });
    });

    if(window.AppEvents) {
        AppEvents.on('DATE_CHANGE', ({ tab, direction }) => { if (tab === 'todo') changeDate(direction); });
        AppEvents.on('JUMP_DATE', ({ tab, date }) => { if (tab === 'todo') { currentDate = new Date(date); loadTasks(); } });
        AppEvents.on('SUBJECTS_UPDATED', () => { renderSubjectTray(); renderTasks(); });
        AppEvents.on('TODO_UPDATED', () => {
            const rawTasks = JSON.parse(localStorage.getItem(getDateKey(currentDate))) || [];
            tasks = rawTasks.map(t => { if (!t.status) t.status = t.done ? 'done' : 'todo'; return t; });
            renderTasks();
        });
    }

    setupKanbanDropzones();
    renderSubjectTray();
    loadTasks();
}