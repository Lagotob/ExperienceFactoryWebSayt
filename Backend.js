async function updateRankings() {
    try {
        const response = await fetch('https://exp-factory-web.onrender.com/dashboard.html');
        const allUsers = await response.json();
        allUsers.sort((a, b) => b.score - a.score);

        const listElement = document.getElementById('ranking-list');
        listElement.innerHTML = '';

        allUsers.forEach((user, index) => {
            const row = document.createElement('li');
            row.innerText = ${index + 1}. ${user.name} - ${user.score} ball;
            if (user.id === currentUserID) {
                row.style.fontWeight = 'bold';
                row.style.color = 'gold';
            }
            
            listElement.appendChild(row);
        });
    } catch (error) {
        console.error("Ma'lumotlarni yuklashda xatolik:", error);
    }
}
