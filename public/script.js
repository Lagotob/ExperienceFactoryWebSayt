async function registerUser() {
    const userData = {
        name1: document.getElementById("reg-name").value,
        username: document.getElementById("reg-username").value,
        password: document.getElementById("reg-password").value,
        school: document.getElementById("reg-school").value,
        viloyat: document.getElementById("reg-region").value
    };

    try {
        const response = await fetch('/register', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
}), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        if (response.ok) {
            alert("Ro'yxatdan o'tdingiz!");
        } else {
            alert("Xatolik: " + result.error);
        }
    } catch (error) {
        console.error("Server bilan bog'lanishda xatolik:", error);
    }
}

document.getElementById("btn").addEventListener("click", registerUser);
