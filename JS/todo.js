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
        localStorage.setItem(getDateKey(currentDate), JSON.stringify(tasks));
    };

    // --- SUBJECT TRAY LOGIC ---
    const renderSubjectTray = () => {
        if (!tray) return;
        tray.innerHTML = '';
        const subjects = getSubjects().filter(s => s.id !== 'off');

        subjects.forEach(sub => {
            const pill = document.createElement('div');
            pill.className = `todo-tint-pill ${selectedSubjectId === sub.id ? 'selected' : ''}`;
            pill.textContent = sub.name;
            
            // Note: Inline styles are kept here because this color data is strictly dynamic 
            // and cannot be predefined in CSS.
            if (selectedSubjectId === sub.id) {
                pill.style.backgroundColor = hexToRgba(sub.color, 0.2); 
                pill.style.borderColor = sub.color;
                pill.style.color = sub.color;
            }

            pill.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                selectedSubjectId = selectedSubjectId === sub.id ? null : sub.id;
                renderSubjectTray(); 
            });

            tray.appendChild(pill);
        });
    };

    input.addEventListener('focus', () => tray.classList.add('active'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#floatingTodoInput')) tray.classList.remove('active');
    });

    const updateArrayOrderFromDOM = () => {
        const newArray = [];
        listEl.querySelectorAll('.todo-item').forEach(item => {
            const taskId = parseInt(item.dataset.taskId);
            const task = tasks.find(t => t.id === taskId);
            if (task) newArray.push(task);
        });
        tasks = newArray;
        saveTasks();
        renderTasks(); // Re-render to fix heading order
    };

    // --- OPTIMIZED RENDER ENGINE ---
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
                        hdr.style.color = sub.color; // Dynamic color logic
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

            // THE PRODUCTION FIX: Instant Toggle Logic (No Re-rendering the list)
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

            // THE PRODUCTION FIX: Instant Edit Logic (No Re-rendering the list)
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
                    if (e.key === 'Enter') editInput.blur(); // Blur safely triggers saveEdit
                });
            });

            // --- PREMIUM DRAG & DROP ENGINE (Fluid Glass Physics) ---
            let holdTimer;
            let isDragging = false;
            let currentClone = null; // Stores the glassy flying copy
            let startTouchX = 0, startTouchY = 0;
            let startRect = null;

            // Prevents native menus from popping during hold
            li.addEventListener('contextmenu', (e) => e.preventDefault());

            li.addEventListener('touchstart', (e) => {
                // If user is editing, don't drag
                if (li.querySelector('.todo-edit-input')) return;

                holdTimer = setTimeout(() => {
                    isDragging = true;
                    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback

                    // 1. Snapshot where the item is right now
                    startRect = li.getBoundingClientRect();
                    startTouchX = e.touches[0].clientX;
                    startTouchY = e.touches[0].clientY;

                    // 2. Create the beautiful glassy 'flying' clone
                    currentClone = li.cloneNode(true);
                    currentClone.classList.add('flying-glass-task');
                    
                    // Force the clone to look exactly like the current item, 
                    // but positioned fixed so we can move it with JS
                    currentClone.style.width = `${startRect.width}px`;
                    currentClone.style.height = `${startRect.height}px`;
                    currentClone.style.left = `${startRect.left}px`;
                    currentClone.style.top = `${startRect.top}px`;
                    
                    document.body.appendChild(currentClone);

                    // 3. Make the original item turn into a faded placeholder
                    li.classList.add('dragging-placeholder');
                    
                }, 400); // 0.4s hold to start drag
            }, { passive: true });

            li.addEventListener('touchmove', (e) => {
                if (!isDragging || !currentClone) { clearTimeout(holdTimer); return; }
                e.preventDefault(); // Lock screen from scrolling

                const currentTouch = e.touches[0];
                
                // 1. CALCULATE MOVEMENT & MOVE CLONE (GPU-Accelerated)
                // We calculate how much your finger moved and add it to the start position.
                // translate3d forces the GPU to render the movement, making it buttery smooth.
                const deltaX = currentTouch.clientX - startTouchX;
                const deltaY = currentTouch.clientY - startTouchY;
                currentClone.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.04)`;

                // 2. FIND DROPPABLE TARGET BELOW
                // We use a clever trick to hide the clone from elementFromPoint so we can 
                // "see through" it to find out which task is below your finger.
                currentClone.classList.add('ghost-mode');
                const targetEl = document.elementFromPoint(currentTouch.clientX, currentTouch.clientY);
                currentClone.classList.remove('ghost-mode');
                
                const overItem = targetEl?.closest('.todo-item:not(.dragging-placeholder)');
                
                // 3. APPLY REORDERING & BOUNDARY LOCK
                if (overItem && overItem !== li) {
                    const draggedTaskData = tasks.find(t => t.id === task.id);
                    const overTaskData = tasks.find(t => t.id === parseInt(overItem.dataset.taskId));
                    
                    if (draggedTaskData && overTaskData && draggedTaskData.subjectId === overTaskData.subjectId) {
                        const allItems = [...listEl.querySelectorAll('.todo-item')];
                        const draggedIdx = allItems.indexOf(li);
                        const overIdx = allItems.indexOf(overItem);
                        
                        // Seamlessly move the original (the ghost-placeholder) beneath the flying clone
                        if (draggedIdx < overIdx) overItem.after(li);
                        else overItem.before(li);
                    }
                }
            }, { passive: false });

            const endDrag = () => {
                clearTimeout(holdTimer);
                if (isDragging) {
                    isDragging = false;
                    
                    // Visual cleanup
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
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    const changeDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        loadTasks();
    };

    if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

    dateDisplay.addEventListener('click', () => {
        AppEvents.emit('REQUEST_DATE_PICKER', { tab: 'todo', dateStr: getDateKey(currentDate).replace('todo_', '') });
    });

    // --- NEW EVENT BUS LISTENERS ---
    AppEvents.on('DATE_CHANGE', ({ tab, direction }) => {
        if (tab === 'todo') changeDate(direction);
    });

    AppEvents.on('JUMP_DATE', ({ tab, date }) => {
        if (tab === 'todo') {
            currentDate = new Date(date);
            loadTasks();
        }
    });

    // Replaces the 500ms hack! Instantly updates if settings change.
    AppEvents.on('SUBJECTS_UPDATED', () => {
        renderSubjectTray();
        renderTasks();
    });

    renderSubjectTray();
    loadTasks();
}