"use strict";

/* تنظیمات اولیه */

const $ = (selector) => document.querySelector(selector);

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const API_URL =
    "https://massage-digest-pulse-warned.trycloudflare.com/api/chat";

const STORAGE = {
    theme: "eko_theme",
    name: "eko_user_name",
    history: "eko_chat_history"
};

let chatHistory = [];
let toastTimer = null;


/* ذخیره‌سازی محلی */

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        showToast("ذخیره‌سازی در این محیط امکان‌پذیر نیست.");
        return false;
    }
}

function readHistory() {
    try {
        const value = JSON.parse(
            readStorage(STORAGE.history, "[]")
        );

        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}


/* پیام کوتاه */

function showToast(message) {
    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* تغییر پوسته */

function setTheme(theme) {
    const light = theme === "light";

    document.body.classList.toggle("light", light);

    const metaTheme = document.querySelector(
        'meta[name="theme-color"]'
    );

    if (metaTheme) {
        metaTheme.setAttribute(
            "content",
            light ? "#f4f5fb" : "#11111b"
        );
    }

    saveStorage(STORAGE.theme, light ? "light" : "dark");

    const toggle = $("#themeToggle");

    if (toggle) {
        toggle.textContent = light
            ? "پوسته روشن"
            : "پوسته تاریک";

        toggle.setAttribute(
            "aria-label",
            light ? "فعال‌کردن پوسته تاریک" : "فعال‌کردن پوسته روشن"
        );
    }
}

function initTheme() {
    const savedTheme = readStorage(STORAGE.theme, "dark");
    setTheme(savedTheme === "light" ? "light" : "dark");
}

$("#themeToggle")?.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light");

    setTheme(isLight ? "dark" : "light");
});

$("#darkThemeButton")?.addEventListener("click", () => {
    setTheme("dark");
    showToast("پوسته تاریک فعال شد.");
});

$("#lightThemeButton")?.addEventListener("click", () => {
    setTheme("light");
    showToast("پوسته روشن فعال شد.");
});


/* جابه‌جایی بین صفحه‌ها */

function openPage(pageId) {
    const target = document.getElementById(pageId);

    if (!target || !target.classList.contains("page")) {
        return;
    }

    document.querySelectorAll(".page").forEach((page) => {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav-button").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );
    });

    if (pageId === "historyPage") {
        renderHistory();
    }

    if (pageId === "chatPage") {
        $("#chatInput")?.focus();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-go-page]").forEach((button) => {
    button.addEventListener("click", () => {
        openPage(button.dataset.goPage);
    });
});


/* نام کاربر */

function initProfile() {
    const nameInput = $("#userNameInput");

    if (!nameInput) return;

    nameInput.value = readStorage(STORAGE.name, "");
}

$("#saveProfileButton")?.addEventListener("click", () => {
    const input = $("#userNameInput");
    const status = $("#profileStatus");

    const name = input.value.trim();

    if (name.length > 40) {
        status.textContent = "نام باید حداکثر ۴۰ حرف باشد.";
        return;
    }

    if (saveStorage(STORAGE.name, name)) {
        status.textContent = "نام شما ذخیره شد.";
        showToast("نام ذخیره شد.");
    }
});


/* ساخت پیام در صفحه گفت‌وگو */

function addMessage(role, text) {
    const container = $("#chatMessages");

    if (!container) return null;

    const message = document.createElement("div");

    message.className =
        role === "user"
            ? "message user"
            : "message assistant";

    // متن به صورت ساده نمایش داده می‌شود تا HTML اجرا نشود.
    message.textContent = text;

    container.appendChild(message);
    container.scrollTop = container.scrollHeight;

    return message;
}


/* مدیریت تاریخچه */

function saveHistory() {
    saveStorage(STORAGE.history, JSON.stringify(chatHistory));
}

function addToHistory(role, text) {
    chatHistory.push({
        role: role,
        text: text,
        time: Date.now()
    });

    // جلوگیری از بزرگ‌شدن بیش از حد تاریخچه
    if (chatHistory.length > 200) {
        chatHistory = chatHistory.slice(-200);
    }

    saveHistory();
}

function renderHistory() {
    const container = $("#historyList");
    const search = $("#historySearch");

    if (!container) return;

    const query = search
        ? search.value.trim().toLowerCase()
        : "";

    container.replaceChildren();

    const matches = chatHistory.filter((item) => {
        const text = String(item.text || "").toLowerCase();
        return text.includes(query);
    });

    if (matches.length === 0) {
        const empty = document.createElement("p");

        empty.className = "empty-state";
        empty.textContent = query
            ? "نتیجه‌ای پیدا نشد."
            : "هنوز گفت‌وگویی در تاریخچه موجود نیست.";

        container.appendChild(empty);
        return;
    }

    matches.slice().reverse().forEach((item) => {
        const row = document.createElement("div");
        row.className = "history-item";

        const title = document.createElement("strong");
        title.textContent =
            item.role === "user" ? "پیام شما" : "پاسخ اکو";

        const content = document.createElement("p");
        content.textContent = item.text;

        const date = document.createElement("p");

        date.textContent = new Date(item.time).toLocaleString(
            "fa-AF"
        );

        row.append(title, content, date);
        container.appendChild(row);
    });
}

$("#historySearch")?.addEventListener("input", renderHistory);

$("#clearHistoryButton")?.addEventListener("click", () => {
    if (chatHistory.length === 0) {
        showToast("تاریخچه از قبل خالی است.");
        return;
    }

    const confirmed = window.confirm(
        "آیا می‌خواهی تمام تاریخچه پاک شود؟"
    );

    if (!confirmed) return;

    chatHistory = [];
    saveHistory();
    renderHistory();

    showToast("تاریخچه پاک شد.");
});


/* گفت‌وگوی جدید */

$("#newChatButton")?.addEventListener("click", () => {
    const confirmed = window.confirm(
        "گفت‌وگوی فعلی پاک شود؟ پیام‌های ذخیره‌شده در تاریخچه باقی می‌مانند."
    );

    if (!confirmed) return;

    const container = $("#chatMessages");

    if (container) {
        container.replaceChildren();

        const welcome = document.createElement("div");

        welcome.className = "message assistant";
        welcome.textContent =
            "سلام! من اکو هستم. چطور می‌توانم کمکت کنم؟";

        container.appendChild(welcome);
    }

    $("#chatStatus").textContent = "";
    showToast("گفت‌وگوی جدید آماده است.");
});


/* آغاز برنامه */

function initApp() {
    chatHistory = readHistory();

    initTheme();
    initProfile();
    renderHistory();

    console.log("Eko Mini App آماده است.");
}

initApp();