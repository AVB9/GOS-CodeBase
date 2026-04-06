document.addEventListener('DOMContentLoaded', () => {
    initMomentumTab();
});

function initMomentumTab() {
    const listContainer = document.getElementById('activeHabitsList');
    const archivedContainer = document.getElementById('archivedHabitsList');
    const addBtn = document.getElementById('addHabitBtn');
    
    const detailsModal = document.getElementById('habitDetailsModal');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const homeWidgetList = document.getElementById('homeHabitList');

    if (!listContainer) return;

    let habits = JSON.parse(localStorage.getItem('momentumHabits')) || [];
    let selectedHabitId = null;

    // Helper: Normalize Dates
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    const getPastDates = (daysCount) => {
        const dates = [];
        for (let i = 0; i < daysCount; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
        }
        return dates.reverse(); // oldest to newest
    };

    // The Magic Resilience Logic
    const calculateStreak = (habit) => {
        if (habit.completions.length === 0) return 0;
        
        const dates = habit.completions.sort((a,b) => new Date(b) - new Date(a)); // Newest first
        const today = getTodayStr();
        
        let currentStreak = 0;
        let missedBuffer = 0;
        
        const checkDate = new Date();
        let loopSafeGuard = 0;
        
        while(loopSafeGuard < 1000) {
            loopSafeGuard++;
            const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
            
            if (dates.includes(checkStr)) {
                currentStreak++;
                missedBuffer = 0; 
            } else {
                if (checkStr === today) {
                    // Today not done yet. Doesn't break streak.
                } else {
                    missedBuffer++;
                    if (missedBuffer > 2) break; // Buffer exceeded
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
            if (diff <= 3) { temp++; } // Forgiving diff
            else { temp = 1; }
            if (temp > max) max = temp;
        }
        return max;
    };

    const saveHabits = () => {
        localStorage.setItem('momentumHabits', JSON.stringify(habits));
        renderList();
        renderHomeWidget();
        if (selectedHabitId) renderDetails(selectedHabitId);
    };

    const toggleCompletion = (habitId, dateStr) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        
        if (habit.completions.includes(dateStr)) {
            habit.completions = habit.completions.filter(d => d !== dateStr);
        } else {
            habit.completions.push(dateStr);
            if (dateStr === getTodayStr() && navigator.vibrate) navigator.vibrate(50);
        }
        saveHabits();
    };

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
        const last7Days = getPastDates(7);

        if (active.length === 0 && archived.length === 0) {
            listContainer.innerHTML = `<div class="empty-task-text" style="text-align: center; margin-top: 40px;">No habits yet. Click + to build momentum.</div>`;
            return;
        }

        active.forEach(habit => {
            const streak = calculateStreak(habit);
            const card = document.createElement('div');
            card.className = `habit-card ${selectedHabitId === habit.id ? 'active-selection' : ''}`;
            
            // Build Weekly Dots
            let dotsHtml = '';
            last7Days.forEach((dateStr) => {
                const isDone = habit.completions.includes(dateStr);
                const isToday = dateStr === todayStr;
                let dotClass = 'dot';
                
                if (isDone) dotClass += ' filled';
                else if (isToday && !isDone) dotClass += ' today-empty';
                else if (!isDone && streak > 0 && !isToday) dotClass += ' buffer'; 
                
                dotsHtml += `
                    <div class="dot-day">
                        <span class="dot-label">${new Date(dateStr).toLocaleDateString('en-US', {weekday: 'narrow'})}</span>
                        <div class="${dotClass}"></div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="bento-title" style="margin-bottom: 0;">${habit.name}</div>
                <div class="habit-header-row">
                    <div class="habit-streak-display">
                        <span class="habit-streak-num">${streak}</span>
                        <span class="habit-streak-label">Days</span>
                    </div>
                    <div class="todo-checkbox ${habit.completions.includes(todayStr) ? 'done' : ''}" style="width: 32px; height: 32px;">
                        <svg viewBox="0 0 24 24" class="checkbox-svg" style="width:18px; height:18px;">
                            <polyline points="20 6 9 17 4 12" class="tick-path" style="stroke-width: 4;"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="weekly-dots">${dotsHtml}</div>
            `;

            // Setup interactions
            card.querySelector('.todo-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCompletion(habit.id, todayStr);
            });

            card.addEventListener('click', () => {
                document.querySelectorAll('.habit-card').forEach(c => c.classList.remove('active-selection'));
                card.classList.add('active-selection');
                selectedHabitId = habit.id;
                renderDetails(habit.id);
            });

            listContainer.appendChild(card);
        });

        // Render Archived
        const archHeader = document.getElementById('archivedHabitsHeader');
        if (archived.length > 0) {
            archHeader.classList.remove('hidden');
            archived.forEach(habit => {
                const card = document.createElement('div');
                card.className = `home-habit-item done`;
                card.innerHTML = `<span class="habit-name">${habit.name}</span><span style="color:var(--color-primary); font-weight:800;">★ ACHIEVED</span>`;
                card.addEventListener('click', () => {
                    selectedHabitId = habit.id;
                    renderDetails(habit.id);
                });
                archivedContainer.appendChild(card);
            });
        } else {
            archHeader.classList.add('hidden');
        }
    };

    const renderDetails = (habitId) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        // Modal Display Logic
        if (window.innerWidth < 768) {
            detailsModal.style.display = 'flex';
            document.body.classList.add('modal-open');
        } else {
            detailsModal.style.opacity = '1';
        }

        document.getElementById('detailHabitTitle').textContent = habit.name;
        document.getElementById('detailCurrentStreak').textContent = calculateStreak(habit);
        document.getElementById('detailLongestStreak').textContent = calculateLongestStreak(habit);
        document.getElementById('detailTotalDays').textContent = habit.completions.length;

        // Render Mini Calendar
        const grid = document.getElementById('habitDetailGrid');
        grid.innerHTML = '';
        
        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startDay = new Date(year, month, 1).getDay();
        if (startDay === 0) startDay = 7; 

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

        // Detail Buttons
        const archiveBtn = document.getElementById('archiveHabitBtn');
        archiveBtn.textContent = habit.archived ? "Unarchive" : "Achieve";
        archiveBtn.onclick = () => {
            habit.archived = !habit.archived;
            saveHabits();
            if (window.innerWidth < 768) {
                detailsModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        };

        const deleteBtn = document.getElementById('deleteHabitBtn');
        deleteBtn.onclick = () => {
            if(confirm("Permanently delete this habit?")) {
                habits = habits.filter(h => h.id !== habit.id);
                selectedHabitId = null;
                saveHabits();
                if (window.innerWidth < 768) {
                    detailsModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            }
        };
    };

    if(closeDetailsBtn) {
        closeDetailsBtn.classList.add('btn-ghost');
        closeDetailsBtn.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                detailsModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    }

    addBtn.addEventListener('click', () => {
        const name = prompt("What habit are you building momentum for?");
        if (name && name.trim()) {
            const newHabit = {
                id: 'hab_' + Date.now(),
                name: name.trim(),
                createdAt: getTodayStr(),
                archived: false,
                completions: []
            };
            habits.unshift(newHabit);
            saveHabits();
        }
    });

    document.getElementById('archivedHabitsHeader')?.addEventListener('click', () => {
        archivedContainer.classList.toggle('hidden');
    });

    renderList();
    renderHomeWidget();
}