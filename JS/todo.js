document.addEventListener('DOMContentLoaded', () => {
    initTodoTab();
});

function initTodoTab() {
    const input = document.getElementById('newTaskInput');
    const addBtn = document.getElementById('addTaskBtn');
    const listEl = document.getElementById('todoList');
    const prevBtn = document.getElementById('todoPrevDay');
    const nextBtn = document.getElementById('todoNextDay');
    const dateDisplay = document.getElementById('todoDateDisplay');
    const tray = document.getElementById('todoSubjectTray');

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

    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || [{ id: 'off', name: 'Day Off', color: '#555555' }];

    const hexToRgba = (hex, alpha) => {
        if (!hex) return `rgba(255,255,255,${alpha})`;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

    const loadTasks = () => {
        tasks = JSON.parse(localStorage.getItem(getDateKey(currentDate))) || [];
        renderTasks();
        updateDateDisplay();
    };

    const saveTasks = () => {
        try {
            localStorage.setItem(getDateKey(currentDate), JSON.stringify(tasks));
        } catch (e) {
            console.error('Storage error: Could not save tasks.', e);
        }
    };

    const renderSubjectTray = () => {
        if (!tray) return;
        tray.innerHTML = '';
        const subjects = getSubjects().filter(s => s.id !== 'off');

        if (subjects.length === 0) {
            const emptyPill = document.createElement('div');
            emptyPill.className = `todo-tint-pill`;
            emptyPill.textContent = "Add Subjects in Settings →";
            
            const handleEmptyTap = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelector('.bottom-pill-btn[data-target="tab-settings"]')?.click();
            };
            emptyPill.addEventListener('mousedown', handleEmptyTap);
            emptyPill.addEventListener('touchstart', handleEmptyTap, { passive: false });
            
            tray.appendChild(emptyPill);
            return;
        }

        subjects.forEach(sub => {
            const pill = document.createElement('div');
            pill.className = `todo-tint-pill ${selectedSubjectId === sub.id ? 'selected' : ''}`;
            pill.textContent = sub.name;
            
            if (selectedSubjectId === sub.id) {
                pill.style.backgroundColor = hexToRgba(sub.color, 0.2); 
                pill.style.borderColor = sub.color;
                pill.style.color = sub.color;
            }

            const handlePillTap = (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                selectedSubjectId = selectedSubjectId === sub.id ? null : sub.id;
                renderSubjectTray(); 
            };
            
            pill.addEventListener('mousedown', handlePillTap);
            pill.addEventListener('touchstart', handlePillTap, { passive: false });

            tray.appendChild(pill);
        });
    };

    // =========================================================
    // THE IRONCLAD MOBILE TRAY ACTIVATOR
    // =========================================================
    const forceOpenTray = () => {
        if (tray && !tray.classList.contains('active')) {
            tray.classList.add('active');
        }
    };

    const forceCloseTray = (e) => {
        if (tray && tray.classList.contains('active') && !e.target.closest('#floatingTodoInput')) {
            tray.classList.remove('active');
        }
    };

    // Bind to every possible interaction vector so the phone CANNOT ignore it
    input.addEventListener('focus', forceOpenTray);
    input.addEventListener('click', forceOpenTray);
    input.addEventListener('touchstart', forceOpenTray, { passive: true });

    document.addEventListener('click', forceCloseTray);
    document.addEventListener('touchstart', forceCloseTray, { passive: true });
    // =========================================================

    const updateArrayOrderFromDOM = () => {
        const newArray = [];
        listEl.querySelectorAll('.todo-item').forEach(item => {
            const rawId = item.getAttribute('data-task-id');
            if (!rawId) return; 

            const taskId = parseInt(rawId, 10);
            const task = tasks.find(t => t.id === taskId);
            if (task) newArray.push(task);
        });
        tasks = newArray;
        saveTasks();
        renderTasks(); 
    };

    const renderTasks = () => {
        listEl.innerHTML = '';
        if (tasks.length === 0) {
            listEl.innerHTML = `<li class="empty-task-text" style="text-align: center;">No tasks for this day.</li>`;
            return;
        }

        const subjects = getSubjects();
        let currentSubject = null;

        tasks.forEach((task) => {
            if (task.subjectId) {
                if (task.subjectId !== currentSubject) {
                    currentSubject = task.subjectId;
                    const sub = subjects.find(s => s.id === task.subjectId);
                    if (sub) {
                        const hdr = document.createElement('li');
                        hdr.className = 'todo-subject-header';
                        hdr.style.color = sub.color; 
                        hdr.textContent = sub.name;
                        listEl.appendChild(hdr);
                    }
                }
            } else {
                currentSubject = null; 
            }

            const li = document.createElement('li');
            li.className = `todo-item ${task.done ? 'done' : ''}`;
            li.dataset.taskId = task.id; 
            
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${task.done ? 'checked' : ''}>
                <span class="todo-text">${task.text}</span>
                <button class="todo-delete">×</button>
            `;

            const checkbox = li.querySelector('.todo-checkbox');
            checkbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                task.done = isChecked;
                isChecked ? li.classList.add('done') : li.classList.remove('done');
                saveTasks();
            });

            li.querySelector('.todo-delete').addEventListener('click', () => {
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderTasks();
            });

            const textSpan = li.querySelector('.todo-text');
            textSpan.addEventListener('dblclick', function() {
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.value = task.text;
                editInput.className = 'todo-edit-input';
                
                this.replaceWith(editInput);
                editInput.focus();

                const saveEdit = () => {
                    const newText = editInput.value.trim();
                    if (newText) {
                        task.text = newText;
                        saveTasks();
                        textSpan.textContent = newText;
                    }
                    editInput.replaceWith(textSpan);
                };

                editInput.addEventListener('blur', saveEdit);
                editInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') editInput.blur(); 
                });
            });

            let holdTimer;
            let isDragging = false;
            let currentClone = null; 
            let startTouchX = 0, startTouchY = 0;
            let startRect = null;

            li.addEventListener('contextmenu', (e) => e.preventDefault());

            li.addEventListener('touchstart', (e) => {
                if (li.querySelector('.todo-edit-input')) return;

                holdTimer = setTimeout(() => {
                    isDragging = true;
                    if (navigator.vibrate) navigator.vibrate(50); 

                    startRect = li.getBoundingClientRect();
                    startTouchX = e.touches[0].clientX;
                    startTouchY = e.touches[0].clientY;

                    currentClone = li.cloneNode(true);
                    currentClone.classList.add('flying-glass-task');
                    
                    currentClone.style.width = `${startRect.width}px`;
                    currentClone.style.height = `${startRect.height}px`;
                    currentClone.style.left = `${startRect.left}px`;
                    currentClone.style.top = `${startRect.top}px`;
                    
                    document.body.appendChild(currentClone);
                    li.classList.add('dragging-placeholder');
                    
                }, 400); 
            }, { passive: true });

            li.addEventListener('touchmove', (e) => {
                if (!isDragging || !currentClone) { clearTimeout(holdTimer); return; }
                e.preventDefault(); 

                const currentTouch = e.touches[0];
                const deltaX = currentTouch.clientX - startTouchX;
                const deltaY = currentTouch.clientY - startTouchY;
                currentClone.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.04)`;

                currentClone.classList.add('ghost-mode');
                const targetEl = document.elementFromPoint(currentTouch.clientX, currentTouch.clientY);
                currentClone.classList.remove('ghost-mode');
                
                const overItem = targetEl?.closest('.todo-item:not(.dragging-placeholder)');
                
                if (overItem && overItem !== li) {
                    const draggedTaskData = tasks.find(t => t.id === task.id);
                    const overTaskData = tasks.find(t => t.id === parseInt(overItem.getAttribute('data-task-id'), 10));
                    
                    if (draggedTaskData && overTaskData && draggedTaskData.subjectId === overTaskData.subjectId) {
                        const allItems = [...listEl.querySelectorAll('.todo-item')];
                        const draggedIdx = allItems.indexOf(li);
                        const overIdx = allItems.indexOf(overItem);
                        
                        if (draggedIdx < overIdx) overItem.after(li);
                        else overItem.before(li);
                    }
                }
            }, { passive: false });

            const endDrag = () => {
                clearTimeout(holdTimer);
                if (isDragging) {
                    isDragging = false;
                    li.classList.remove('dragging-placeholder');
                    if (currentClone) {
                        currentClone.remove();
                        currentClone = null;
                    }
                    updateArrayOrderFromDOM();
                }
            };

            li.addEventListener('touchend', endDrag);
            li.addEventListener('touchcancel', endDrag);

            listEl.appendChild(li);
        });
    };

    const addTask = () => {
        const text = input.value.trim();
        if (text) {
            const newTask = { id: Date.now(), text: text, done: false, subjectId: selectedSubjectId };

            if (!selectedSubjectId) {
                tasks.unshift(newTask);
            } else {
                let insertIdx = tasks.length;
                for (let i = tasks.length - 1; i >= 0; i--) {
                    if (tasks[i].subjectId === selectedSubjectId) {
                        insertIdx = i + 1;
                        break;
                    }
                }
                if (insertIdx === tasks.length) tasks.push(newTask);
                else tasks.splice(insertIdx, 0, newTask);
            }

            input.value = '';
            saveTasks();
            renderTasks();
            
            setTimeout(() => {
                const addedNode = listEl.querySelector(`.todo-item[data-task-id="${newTask.id}"]`);
                if (addedNode) addedNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
    };

    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') {
            e.preventDefault(); 
            addTask(); 
        } 
    });

    const changeDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        loadTasks();
    };

    if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

    dateDisplay.addEventListener('click', () => {
        AppEvents.emit('REQUEST_DATE_PICKER', { tab: 'todo', dateStr: getDateKey(currentDate).replace('todo_', '') });
    });

    AppEvents.on('DATE_CHANGE', ({ tab, direction }) => {
        if (tab === 'todo') changeDate(direction);
    });

    AppEvents.on('JUMP_DATE', ({ tab, date }) => {
        if (tab === 'todo') {
            currentDate = new Date(date);
            loadTasks();
        }
    });

    AppEvents.on('SUBJECTS_UPDATED', () => {
        renderSubjectTray();
        renderTasks();
    });

    renderSubjectTray();
    loadTasks();
}