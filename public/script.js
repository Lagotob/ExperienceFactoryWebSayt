async function registerUser() {
    // Input elementlari borligini tekshirish
    const nameEl = document.getElementById("reg-name");
    const userEl = document.getElementById("reg-username");
    const passEl = document.getElementById("reg-password");
    const schoolEl = document.getElementById("reg-school");
    const regionEl = document.getElementById("reg-region");

    if (!nameEl || !userEl || !passEl) {
        console.error("Input elementlari topilmadi!");
        return;
    }

    const userData = {
        name1: nameEl.value,
        username: userEl.value,
        password: passEl.value,
        school: schoolEl.value,
        viloyat: regionEl.value
    };

    try {
        const response = await fetch('/index.html', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Ro'yxatdan o'tdingiz!");
            // Inputlarni tozalash (ixtiyoriy)
            nameEl.value = "";
            userEl.value = "";
            passEl.value = "";
        } else {
            alert("Xatolik: " + (result.error || "Noma'lum xato"));
        }
    } catch (error) {
        console.error("Server bilan bog'lanishda xatolik:", error);
        alert("Serverga ulanib bo'lmadi!");
    }
}

// Tugma bosilishini kuzatish
const registerBtn = document.getElementById("btn");
if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
        e.preventDefault(); // Formani qayta yuklashni to'xtatish
        registerUser();
    });
}
