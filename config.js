// config.js — ma'lumotlar bazasi faqat server orqali (server.js + DATABASE_URL muhit o'zgaruvchisi).
// Parol yoki connection stringni bu faylga qo'ymang — GitHubga chiqadi.

// Neon DB uchun REST API endpoint (Neon HTTP API orqali)
const API_BASE = "https://your-neon-api-endpoint.com/api"; // Neon HTTP API manzili
// Agar Neon HTTP API bo'lmasa, siz backend qilishingiz kerak

// MUHIM: Neon DB to'g'ridan-to'g'ri frontenddan ishlamaydi!
// Shuning uchun men sizga Express backend yozib berdim (server.js)

// Foydalanuvchi ma'lumotlarini saqlash
let currentUser = null;

// Neon DB dan foydalanuvchini olish (backend orqali)
async function fetchUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            return currentUser;
        }
    } catch (e) {
        console.error("Xatolik:", e);
    }
    return null;
}

// Foydalanuvchini yangilash
async function updateUser(userId, updates) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            return currentUser;
        }
    } catch (e) {
        console.error("Xatolik:", e);
    }
    return null;
}

// Level hisoblash
function getLevel(xp) {
    return Math.floor((xp || 0) / 1000) + 1;
}

// XP progress foizi
function getProgress(xp) {
    return ((xp || 0) % 1000) / 10;
}

// Tizimdan chiqish
function logout() {
    if (confirm("Tizimdan chiqmoqchimisiz?")) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        window.location.href = 'login.html';
    }
}

// Admin tekshiruvi
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}