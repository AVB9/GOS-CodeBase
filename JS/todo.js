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

    // --- INSTANT REACTIVITY LINK (Bulletproof Mobile Fix) ---
    window.forceTodoRefresh = () => {
        renderSubjectTray();
        renderTasks(); // Updates any changed subject names/colors in the UI
    };

    // We use a slight delay so Planner has time to fully boot up before we link them together!
    setTimeout(() => {
        const existingRefresh = window.forcePlannerRefresh;
        window.forcePlannerRefresh = () => {
            if (existingRefresh) existingRefresh();
            if (window.forceTodoRefresh) window.forceTodoRefresh();
        };
    }, 500);

    // --- SUBJECT TRAY LOGIC ---
    const renderSubjectTray = () => {
        if (!tray) return;
        tray.innerHTML = '';
        const subjects = getSubjects().filter(s => s.id !== 'off');

        subjects.forEach(sub => {
            const pill = document.createElement('div');
            pill.className = `todo-tint-pill ${selectedSubjectId === sub.id ? 'selected' : ''}`;
            pill.textContent = sub.name;
            
            // Dynamic Color vs Plain Frosted
            if (selectedSubjectId === sub.id) {
                pill.style.backgroundColor = hexToRgba(sub.color, 0.2);
                pill.style.borderColor = sub.color;
                pill.style.color = sub.color;
            } else {
                pill.style.backgroundColor = '';
                pill.style.borderColor = '';
                pill.style.color = '';
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
        if (!e.target.closest('#floatingTodoInput')) {
            tray.classList.remove('active');
        }
    });

    // --- RENDER TASKS (WITH SMART HEADINGS) ---
    const updateArrayOrderFromDOM = () => {
        const newArray = [];
        // Only grab actual items, ignoring the header text
        listEl.querySelectorAll('.todo-item').forEach(item => {
            const originalIndex = parseInt(item.dataset.index);
            newArray.push(tasks[originalIndex]);
        });
        tasks = newArray;
        saveTasks();
        renderTasks(); 
    };

    const renderTasks = () => {
        listEl.innerHTML = '';
        if (tasks.length === 0) {
            listEl.innerHTML = `<li style="text-align: center; color: var(--color-text-muted); margin-top: 20px;">No tasks for this day.</li>`;
            return;
        }

        const subjects = getSubjects();
        let currentSubject = null;

        tasks.forEach((task, index) => {
            // Grouping Logic: Inject a heading when the subject changes
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
                currentSubject = null; // Resets tracker if untagged
            }

            // Render standard list item
            const li = document.createElement('li');
            li.className = `todo-item ${task.done ? 'done' : ''}`;
            li.dataset.index = index;
            li.dataset.taskId = task.id; 
            
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${task.done ? 'checked' : ''}>
                <span class="todo-text">${task.text}</span>
                <button class="todo-delete">×</button>
            `;

            li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
                tasks[index].done = e.target.checked;
                saveTasks();
                renderTasks();
            });

            li.querySelector('.todo-delete').addEventListener('click', () => {
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
            });

            // Drag and Drop
            let holdTimer;
            let isDragging = false;

            li.addEventListener('touchstart', () => {
                holdTimer = setTimeout(() => {
                    isDragging = true;
                    li.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 400); 
            }, { passive: true });

            li.addEventListener('touchmove', (e) => {
                if (!isDragging) { clearTimeout(holdTimer); return; }
                e.preventDefault(); // Prevents the screen from scrolling
                
                const touch = e.touches[0];
                
                // THE SMOOTH TRICK: Momentarily make the dragged item "invisible" to touch 
                // so document.elementFromPoint can see exactly what task is underneath it.
                li.style.pointerEvents = 'none';
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                li.style.pointerEvents = 'auto'; // Turn it back on immediately
                
                const overItem = target?.closest('.todo-item');
                
                if (overItem && overItem !== li) {
                    const allItems = [...listEl.querySelectorAll('.todo-item')];
                    const draggedIdx = allItems.indexOf(li);
                    const overIdx = allItems.indexOf(overItem);
                    
                    if (draggedIdx < overIdx) overItem.after(li);
                    else overItem.before(li);
                }
            }, { passive: false });

            const endDrag = () => {
                clearTimeout(holdTimer);
                if (isDragging) {
                    isDragging = false;
                    li.classList.remove('dragging');
                    updateArrayOrderFromDOM();
                }
            };

            li.addEventListener('touchend', endDrag);
            li.addEventListener('touchcancel', endDrag);

            listEl.appendChild(li);
        });
    };

    // --- ADD TASK ---
    const addTask = () => {
        const text = input.value.trim();
        if (text) {
            const newTask = { id: Date.now(), text: text, done: false, subjectId: selectedSubjectId };

            if (!selectedSubjectId) {
                // UNTAGGED: Top of list
                tasks.unshift(newTask);
            } else {
                // TAGGED: Find last item of same group, insert after
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

    // --- CORE DATE LOGIC EXPOSED ---
    const changeDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        loadTasks();
    };

    window.todoNextDay = () => changeDate(1);
    window.todoPrevDay = () => changeDate(-1);
    window.todoSetDate = (dateObj) => { currentDate = new Date(dateObj); loadTasks(); };
    window.todoGetDateStr = () => {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    prevBtn.addEventListener('click', () => changeDate(-1));
    nextBtn.addEventListener('click', () => changeDate(1));

    renderSubjectTray();
    loadTasks();
}