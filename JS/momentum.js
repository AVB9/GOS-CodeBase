// JS/momentum.js

document.addEventListener('DOMContentLoaded', () => {
    initMomentumTab();
});

function initMomentumTab() {
    const listContainer = document.getElementById('activeHabitsList');
    const archivedContainer = document.getElementById('archivedHabitsList');
    const homeWidgetList = document.getElementById('homeHabitList');

    // Modals
    const openAddBtn = document.getElementById('openAddHabitModalBtn'); 
    const addModal = document.getElementById('addHabitModalOverlay');
    const closeAddBtn = document.getElementById('closeAddHabitModalBtn');
    const saveAddBtn = document.getElementById('saveNewHabitBtn');
    const nameInput = document.getElementById('newHabitNameInput');

    const mobileDetailsModal = document.getElementById('mobileHabitDetailsModal');
    const closeMobileDetailsBtn = document.getElementById('closeMobileHabitModalBtn');

    if (!listContainer) return;

    let habits = JSON.parse(localStorage.getItem('momentumHabits')) || [];
    let selectedHabitId = null;
    let currentHabitViewDate = new Date(); // NEW: Tracks the calendar's current month

    const getDateKey = (dateObj) => {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
    };

    const getTodayStr = () => getDateKey(new Date());

    // --- NEW: MONTH NAVIGATION & SWIPE LOGIC ---
    const changeMonth = (direction) => {
        currentHabitViewDate.setMonth(currentHabitViewDate.getMonth() + direction);
        if (selectedHabitId) renderDetails(selectedHabitId, false);
    };

    document.querySelectorAll('.momentum-prev-month').forEach(btn => btn.addEventListener('click', () => changeMonth(-1)));
    document.querySelectorAll('.momentum-next-month').forEach(btn => btn.addEventListener('click', () => changeMonth(1)));

    document.querySelectorAll('.momentum-cal-grid').forEach(grid => {
        let touchStartX = 0;
        grid.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        grid.addEventListener('touchend', e => {
            let touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 40) changeMonth(1);  // Swipe Left -> Next Month
            if (touchEndX - touchStartX > 40) changeMonth(-1); // Swipe Right -> Prev Month
        }, { passive: true });
    });
    // -------------------------------------------

    const calculateStreak = (habit) => {
        if (habit.completions.length === 0) return 0;
        const dates = habit.completions.sort((a,b) => new Date(b) - new Date(a)); 
        const today = getTodayStr();
        
        let currentStreak = 0;
        let missedBuffer = 0;
        
        const checkDate = new Date();
        let loopSafeGuard = 0;
        
        while(loopSafeGuard < 1000) {
            loopSafeGuard++;
            const checkStr = getDateKey(checkDate);
            
            if (dates.includes(checkStr)) {
                currentStreak++;
                missedBuffer = 0; 
            } else {
                if (checkStr !== today) {
                    missedBuffer++;
                    if (missedBuffer > 2) break; 
                }
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return currentStreak;
    };

    const calculateLongestStreak = (habit) => {
        let max = 0;
        let temp = 0;
        const sorted = [...habit.completions].sort((a,b) => new Date(a) - new Date(b));
        
        for(let i=0; i<sorted.length; i++) {
            if (i === 0) { temp = 1; max = 1; continue; }
            const diff = (new Date(sorted[i]) - new Date(sorted[i-1])) / (1000*60*60*24);
            if (diff <= 3) { temp++; } 
            else { temp = 1; }
            if (temp > max) max = temp;
        }
        return max;
    };

    const saveHabits = () => {
        localStorage.setItem('momentumHabits', JSON.stringify(habits));
        renderList();
        renderHomeWidget();
        if (selectedHabitId) renderDetails(selectedHabitId, false);
        if (window.AppEvents) AppEvents.emit('MOMENTUM_UPDATED');
    };

    const toggleCompletion = (habitId, dateStr) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        if (habit.archived) {
            window.showAppToast("Archived habits cannot be edited!");
            return;
        }

        const selectedDate = new Date(dateStr);
        selectedDate.setHours(0,0,0,0);
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);

        if (selectedDate > todayDate) {
            window.showAppToast("gmasti tho dekho koi inki!!");
            return;
        }
        
        if (habit.completions.includes(dateStr)) {
            habit.completions = habit.completions.filter(d => d !== dateStr);
        } else {
            habit.completions.push(dateStr);
            if (dateStr === getTodayStr() && navigator.vibrate) navigator.vibrate(50);
        }
        saveHabits();
    };

    // --- NEW HABIT MODAL LOGIC ---
    openAddBtn.addEventListener('click', () => {
        nameInput.value = '';
        addModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => nameInput.focus(), 100);
    });

    const closeAddModal = () => {
        addModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    closeAddBtn.addEventListener('click', closeAddModal);

    const handleCreateHabit = () => {
        const name = nameInput.value.trim();
        if (name) {
            habits.unshift({
                id: 'hab_' + Date.now(),
                name: name,
                createdAt: getTodayStr(),
                archived: false,
                completions: []
            });
            saveHabits();
            closeAddModal();
        }
    };

    saveAddBtn.addEventListener('click', handleCreateHabit);
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleCreateHabit(); }
    });

    // --- HOME DASHBOARD WIDGET ---
    const renderHomeWidget = () => {
        if (!homeWidgetList) return;
        const activeHabits = habits.filter(h => !h.archived);
        const todayStr = getTodayStr();

        if (activeHabits.length === 0) {
            homeWidgetList.innerHTML = `<div class="empty-task-text">No active habits.</div>`;
            return;
        }

        homeWidgetList.innerHTML = '';
        activeHabits.forEach(habit => {
            const isDone = habit.completions.includes(todayStr);
            const item = document.createElement('div');
            item.className = `home-habit-item ${isDone ? 'done' : ''}`;
            item.innerHTML = `
                <span class="habit-name" style="font-weight: 600;">${habit.name}</span>
                <div class="todo-checkbox ${isDone ? 'done' : ''}">
                    <svg viewBox="0 0 24 24" class="checkbox-svg">
                        <line x1="6" y1="12" x2="18" y2="12" class="dash-line"></line>
                        <polyline points="20 6 9 17 4 12" class="tick-path"></polyline>
                    </svg>
                </div>
            `;
            item.addEventListener('click', () => toggleCompletion(habit.id, todayStr));
            homeWidgetList.appendChild(item);
        });
    };

    // --- MOMENTUM TAB RENDERING ---
    const renderList = () => {
        listContainer.innerHTML = '';
        archivedContainer.innerHTML = '';
        
        const active = habits.filter(h => !h.archived);
        const archived = habits.filter(h => h.archived);
        const todayStr = getTodayStr();
        const desktopPane = document.getElementById('desktopHabitDetailsPane');

        if (active.length === 0 && archived.length === 0) {
            listContainer.innerHTML = `<div class="empty-task-text" style="text-align: center; margin-top: 40px;">No habits yet. Click + to build momentum.</div>`;
            if (desktopPane) desktopPane.classList.add('empty-state');
            return;
        }

        if (desktopPane) desktopPane.classList.remove('empty-state');

        if (window.innerWidth >= 768) {
            const currentExists = habits.find(h => h.id === selectedHabitId);
            if (!currentExists) selectedHabitId = active.length > 0 ? active[0].id : archived[0].id;
        }

        active.forEach(habit => {
            const streak = calculateStreak(habit);
            const card = document.createElement('div');
            card.className = `habit-card ${selectedHabitId === habit.id ? 'active-selection' : ''}`;
            
            let dotsHtml = '';
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = getDateKey(d);
                const isDone = habit.completions.includes(dateStr);
                
                let dotClass = 'streak-dot';
                if (isDone) dotClass += ' filled';
                dotsHtml += `<div class="${dotClass}" title="${dateStr}"></div>`;
            }

            card.innerHTML = `
                <div class="bento-title">${habit.name}</div>
                <div class="habit-header-row">
                    <div class="habit-streak-display">
                        <span class="habit-streak-num">${streak}</span>
                        <span class="habit-streak-label">Days</span>
                    </div>
                    <div class="todo-checkbox ${habit.completions.includes(todayStr) ? 'done' : ''}">
                        <svg viewBox="0 0 24 24" class="checkbox-svg" style="width:18px; height:18px;">
                            <polyline points="20 6 9 17 4 12" class="tick-path" style="stroke-width: 4;"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="weekly-dots">${dotsHtml}</div>
            `;

            card.querySelector('.todo-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCompletion(habit.id, todayStr);
            });

            card.addEventListener('click', () => {
                document.querySelectorAll('.habit-card, .home-habit-item').forEach(c => c.classList.remove('active-selection'));
                card.classList.add('active-selection');
                selectedHabitId = habit.id;
                currentHabitViewDate = new Date(); // RESET calendar to this month!
                renderDetails(habit.id, true);
            });

            listContainer.appendChild(card);
        });

        // Render Archived
        const archHeader = document.getElementById('archivedHabitsHeader');
        if (archived.length > 0) {
            archHeader.classList.remove('hidden');
            archived.forEach(habit => {
                const card = document.createElement('div');
                card.className = `home-habit-item done ${selectedHabitId === habit.id ? 'active-selection' : ''}`;
                card.innerHTML = `<span class="habit-name">${habit.name}</span><span style="color:var(--color-primary); font-weight:800;">★ ACHIEVED</span>`;
                card.addEventListener('click', () => {
                    document.querySelectorAll('.habit-card, .home-habit-item').forEach(c => c.classList.remove('active-selection'));
                    card.classList.add('active-selection');
                    selectedHabitId = habit.id;
                    currentHabitViewDate = new Date(); // RESET calendar to this month!
                    renderDetails(habit.id, true);
                });
                archivedContainer.appendChild(card);
            });
        } else {
            archHeader.classList.add('hidden');
        }

        if (selectedHabitId && window.innerWidth >= 768) {
            renderDetails(selectedHabitId, false);
        }
    };

    const renderDetails = (habitId, isUserClick = true) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        if (window.innerWidth < 768 && isUserClick) {
            mobileDetailsModal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }

        document.querySelectorAll('.momentum-title-el').forEach(el => el.textContent = habit.name);
        document.querySelectorAll('.momentum-streak-el').forEach(el => el.textContent = calculateStreak(habit));
        document.querySelectorAll('.momentum-best-el').forEach(el => el.textContent = calculateLongestStreak(habit));
        document.querySelectorAll('.momentum-total-el').forEach(el => el.textContent = habit.completions.length);

        // Generate Calendar using `currentHabitViewDate` instead of Today
        const year = currentHabitViewDate.getFullYear();
        const month = currentHabitViewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startDay = new Date(year, month, 1).getDay();
        if (startDay === 0) startDay = 7; 

        // Update Month Pill Text
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        document.querySelectorAll('.momentum-month-display').forEach(el => {
            el.textContent = `${monthNames[month]} ${year}`;
        });

        document.querySelectorAll('.momentum-cal-grid').forEach(grid => {
            grid.innerHTML = '';
            for(let i = 1; i < startDay; i++) {
                grid.innerHTML += `<div class="cal-day empty"></div>`;
            }

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isDone = habit.completions.includes(dateStr);
                const isToday = dateStr === getTodayStr();
                const cell = document.createElement('div');
                cell.className = `cal-day ${isToday ? 'today' : ''} ${isDone ? 'completed' : ''}`;
                cell.textContent = d;
                
                cell.addEventListener('click', () => toggleCompletion(habit.id, dateStr));
                grid.appendChild(cell);
            }
        });

        // Setup Actions
        document.querySelectorAll('.momentum-archive-btn').forEach(btn => {
            btn.textContent = habit.archived ? "Unarchive" : "Achieve";
            btn.onclick = () => {
                habit.archived = !habit.archived;
                saveHabits();
                closeMobileDetailsModal();
            };
        });

        document.querySelectorAll('.momentum-delete-btn').forEach(btn => {
            btn.onclick = () => {
                if(confirm("Permanently delete this habit?")) {
                    habits = habits.filter(h => h.id !== habit.id);
                    selectedHabitId = null;
                    saveHabits();
                    closeMobileDetailsModal();
                }
            };
        });
    };

    const closeMobileDetailsModal = () => {
        mobileDetailsModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    if(closeMobileDetailsBtn) {
        closeMobileDetailsBtn.addEventListener('click', closeMobileDetailsModal);
    }

    document.getElementById('archivedHabitsHeader')?.addEventListener('click', () => {
        archivedContainer.classList.toggle('hidden');
    });

    if (window.AppEvents) {
        AppEvents.on('MOMENTUM_SYNCED', () => {
            habits = JSON.parse(localStorage.getItem('momentumHabits')) || [];
            renderList();
            renderHomeWidget();
            if (selectedHabitId) renderDetails(selectedHabitId, false);
        });
    }

    renderList();
    renderHomeWidget();
}