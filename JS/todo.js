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
    const swipeContainer = document.getElementById('todoSwipeContainer');

    if (!input || !addBtn || !listEl || !dateDisplay) return;

    let currentDate = new Date();
    let tasks = [];

    // Helper: Dynamic Storage Key
    const getDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `todo_${y}-${m}-${d}`;
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

    const loadTasks = () => {
        tasks = JSON.parse(localStorage.getItem(getDateKey(currentDate))) || [];
        renderTasks();
        updateDateDisplay();
    };

    const saveTasks = () => {
        localStorage.setItem(getDateKey(currentDate), JSON.stringify(tasks));
    };

    // Array Rebuilder (called after physical DOM drag-and-drop)
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

            // Standard Interactions
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

            // ==========================================
            // LONG-PRESS DRAG & DROP LOGIC
            // ==========================================
            let holdTimer;
            let isDragging = false;

            li.addEventListener('touchstart', () => {
                // Wait 400ms before picking up the item
                holdTimer = setTimeout(() => {
                    isDragging = true;
                    li.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 400); 
            }, { passive: true });

            li.addEventListener('touchmove', (e) => {
                if (!isDragging) {
                    // If they move finger before 400ms, cancel the grab (allows horizontal swipe to work)
                    clearTimeout(holdTimer);
                    return;
                }
                
                e.preventDefault(); // Prevents screen scrolling while dragging
                
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

    // Add Task
    const addTask = () => {
        const text = input.value.trim();
        if (text) {
            tasks.push({ text, done: false });
            input.value = '';
            saveTasks();
            renderTasks();
            
            // Scroll to bottom so they can see the new task
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    };

    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Date Navigation
    const changeDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        loadTasks();
    };

    prevBtn.addEventListener('click', () => changeDate(-1));
    nextBtn.addEventListener('click', () => changeDate(1));

    // Horizontal Swipe to Change Days
    let touchStartX = 0;
    swipeContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    swipeContainer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) changeDate(1);  // Swipe Left
        if (touchEndX > touchStartX + 50) changeDate(-1); // Swipe Right
    }, { passive: true });

    loadTasks();
}