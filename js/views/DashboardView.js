export class DashboardView {
    renderUser(user) {
        const nameEl = document.querySelector('.hero-text h1');
        const dateEl = document.querySelector('.hero-text p');
        const tagEl = document.querySelector('.hero-text .tag');
        if(nameEl) nameEl.textContent = `Buenas tardes, ${user.name}`;
        if(dateEl) dateEl.textContent = user.date;
        if(tagEl) tagEl.textContent = user.role;
    }

    renderStats(stats) {
        const container = document.querySelector('.hero-stats');
        if(!container) return;
        container.innerHTML = '';
        stats.forEach(stat => {
            const div = document.createElement('div');
            div.className = 'stat-item';
            div.innerHTML = `<h2>${stat.count}</h2><p>${stat.label}</p>`;
            container.appendChild(div);
        });
    }
}