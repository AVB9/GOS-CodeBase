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

    if (!input || !addBtn || !listEl || !dateDisplay) return;

    let currentDate = new Date();
    let tasks = [];

    const getDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `todo_${y}-${m}-${d}`;
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

    const updateArrayOrderFromDOM = () => {
        const newArray = [];
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

        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `todo-item ${task.done ? 'done' : ''}`;
            li.dataset.index = index;
            
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
                e.preventDefault(); 
                
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
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

    const addTask = () => {
        const text = input.value.trim();
        if (text) {
            tasks.push({ text, done: false });
            input.value = '';
            saveTasks();
            renderTasks();
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    };

    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    // --- CORE DATE LOGIC EXPOSED TO GLOBAL WINDOW ---
    const changeDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        loadTasks();
    };

    // Make these accessible to app.js for swipes and modal!
    window.todoNextDay = () => changeDate(1);
    window.todoPrevDay = () => changeDate(-1);
    
    // Exact date jumper for the modal
    window.todoSetDate = (dateObj) => { 
        currentDate = new Date(dateObj); 
        loadTasks(); 
    };
    
    // Returns current date in YYYY-MM-DD format for the modal input
    window.todoGetDateStr = () => {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    prevBtn.addEventListener('click', () => changeDate(-1));
    nextBtn.addEventListener('click', () => changeDate(1));

    loadTasks();
}