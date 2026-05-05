async function reg() {
    const userData = {
        name1: document.getElementById("name").value,
        username: document.getElementById("uname").value,
        password: document.getElementById("pass").value,
        school: document.getElementById("sch").value,
        viloyat: document.getElementById("vilo").value
    };

    try {
        const response = await fetch('http://localhost:3000/register', {
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

document.getElementById("btn").addEventListener("click", reg);
