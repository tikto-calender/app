const state = { tasks: [], events: [], view: "today", taskFilter: "ALL" };

const formatDate = (value, options = {}) => value ? new Intl.DateTimeFormat("vi-VN", options).format(new Date(value)) : "Chưa đặt hạn";
const formatTime = (value) => formatDate(value, { hour: "2-digit", minute: "2-digit" });
const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Có lỗi xảy ra.");
  return result.data;
}

async function loadData() {
  const data = await api("/api/overview");
  state.tasks = data.tasks;
  state.events = data.events;
  render();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function empty(message) {
  return `<div class="empty">${message}</div>`;
}

function taskHtml(task, compact = false) {
  const done = task.status === "DONE";
  const priorityLabel = { LOW: "Thấp", MEDIUM: "Vừa", HIGH: "Cao" }[task.priority];
  return `<article class="task-row ${done ? "done" : ""}">
    <button class="check" data-toggle-task="${task.id}" aria-label="${done ? "Mở lại" : "Hoàn thành"}">✓</button>
    <div><p class="item-title">${escapeHtml(task.title)}</p><p class="item-meta">${task.dueAt ? formatDate(task.dueAt, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Không có hạn"}${compact ? "" : ` · <span class="priority">${priorityLabel}</span>`}</p></div>
    <button class="delete" data-delete-task="${task.id}" aria-label="Xoá công việc">×</button>
  </article>`;
}

function eventHtml(event, compact = false) {
  if (compact) return `<article class="event-row"><span class="event-time">${formatTime(event.startAt)}</span><span class="event-dot ${event.color}"></span><div><p class="item-title">${escapeHtml(event.title)}</p><p class="item-meta">${escapeHtml(event.description || "Không có ghi chú")}</p></div><button class="delete" data-delete-event="${event.id}" aria-label="Xoá sự kiện">×</button></article>`;
  return `<article class="calendar-event" data-color="${event.color}"><strong>${formatTime(event.startAt)}–${formatTime(event.endAt)}</strong><div><p class="item-title">${escapeHtml(event.title)}</p><p class="item-meta">${escapeHtml(event.description || "Không có ghi chú")}</p></div><button class="delete" data-delete-event="${event.id}" aria-label="Xoá sự kiện">×</button></article>`;
}

function renderToday() {
  const now = new Date();
  const todayKey = now.toDateString();
  const todayTasks = [...state.tasks].filter((task) => !task.dueAt || new Date(task.dueAt).toDateString() === todayKey).sort((a, b) => (a.dueAt || "z").localeCompare(b.dueAt || "z"));
  const upcomingEvents = [...state.events].filter((event) => new Date(event.endAt) >= now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const done = todayTasks.filter((task) => task.status === "DONE").length;
  const progress = todayTasks.length ? Math.round(done / todayTasks.length * 100) : 0;
  const dueSoon = state.tasks.filter((task) => task.status !== "DONE" && task.dueAt && new Date(task.dueAt) - now < 86_400_000 && new Date(task.dueAt) >= now).length;

  document.querySelector("#open-count").textContent = state.tasks.filter((task) => task.status !== "DONE").length;
  document.querySelector("#event-count").textContent = upcomingEvents.length;
  document.querySelector("#due-count").textContent = dueSoon;
  document.querySelector("#progress-value").textContent = `${progress}%`;
  document.querySelector(".progress-ring").style.setProperty("--progress", `${progress}%`);
  document.querySelector("#focus-copy").textContent = todayTasks.length ? `Bạn có ${todayTasks.length - done} việc còn lại trong nhịp hôm nay.` : "Bạn chưa có công việc nào cho hôm nay.";
  document.querySelector("#today-tasks").innerHTML = todayTasks.length ? todayTasks.slice(0, 4).map((task) => taskHtml(task, true)).join("") : empty("Một ngày trống — thêm việc đầu tiên nhé.");
  document.querySelector("#today-events").innerHTML = upcomingEvents.length ? upcomingEvents.slice(0, 4).map((event) => eventHtml(event, true)).join("") : empty("Chưa có sự kiện sắp tới.");
}

function renderTasks() {
  const tasks = state.taskFilter === "ALL" ? state.tasks : state.tasks.filter((task) => task.status === state.taskFilter);
  const sorted = [...tasks].sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || (a.dueAt || "z").localeCompare(b.dueAt || "z"));
  document.querySelector("#task-list").innerHTML = sorted.length ? sorted.map((task) => taskHtml(task)).join("") : empty("Không có công việc trong nhóm này.");
}

function renderCalendar() {
  const groups = new Map();
  [...state.events].sort((a, b) => a.startAt.localeCompare(b.startAt)).forEach((event) => {
    const key = new Date(event.startAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });
  document.querySelector("#calendar-list").innerHTML = groups.size ? [...groups].map(([day, events]) => `<section class="calendar-day"><div class="calendar-day-heading">${formatDate(day, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div><div class="item-list">${events.map((event) => eventHtml(event)).join("")}</div></section>`).join("") : empty("Lịch đang trống. Hãy thêm sự kiện đầu tiên.");
}

function render() {
  renderToday();
  renderTasks();
  renderCalendar();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((element) => element.classList.toggle("active", element.id === `${view}-view`));
  document.querySelectorAll(".nav-item").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  const titles = { today: "Một ngày thật nhẹ.", tasks: "Tập trung vào điều quan trọng.", calendar: "Nhìn trước, sống trọn." };
  document.querySelector("#page-title").textContent = titles[view];
}

function openDialog(kind) {
  const dialog = document.querySelector(`#${kind}-dialog`);
  if (kind === "event") {
    const start = new Date(Date.now() + 3_600_000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3_600_000);
    const toLocalInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    dialog.querySelector("[name=startAt]").value = toLocalInput(start);
    dialog.querySelector("[name=endAt]").value = toLocalInput(end);
  }
  dialog.showModal();
  dialog.querySelector("input").focus();
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.view) switchView(target.dataset.view);
  if (target.dataset.go) switchView(target.dataset.go);
  if (target.dataset.open) openDialog(target.dataset.open);
  if (target.id === "quick-add") openDialog(state.view === "calendar" ? "event" : "task");
  if (target.hasAttribute("data-close")) target.closest("dialog").close();
  if (target.dataset.filter) {
    state.taskFilter = target.dataset.filter;
    document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("active", button === target));
    renderTasks();
  }

  try {
    if (target.dataset.toggleTask) {
      const task = state.tasks.find((item) => item.id === target.dataset.toggleTask);
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: task.status === "DONE" ? "TODO" : "DONE" }) });
      await loadData();
    }
    if (target.dataset.deleteTask) {
      await api(`/api/tasks/${target.dataset.deleteTask}`, { method: "DELETE" });
      await loadData();
      showToast("Đã xoá công việc.");
    }
    if (target.dataset.deleteEvent) {
      await api(`/api/events/${target.dataset.deleteEvent}`, { method: "DELETE" });
      await loadData();
      showToast("Đã xoá sự kiện.");
    }
  } catch (error) { showToast(error.message); }
});

function bindForm(kind) {
  const form = document.querySelector(`#${kind}-form`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorElement = form.querySelector(".form-error");
    errorElement.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    try {
      await api(`/api/${kind === "task" ? "tasks" : "events"}`, { method: "POST", body: JSON.stringify(data) });
      form.reset();
      form.closest("dialog").close();
      await loadData();
      showToast(kind === "task" ? "Đã thêm công việc." : "Đã thêm sự kiện.");
    } catch (error) { errorElement.textContent = error.message; }
  });
}

const now = new Date();
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "long" }).format(now);
const updateClock = () => document.querySelector("#clock").textContent = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
updateClock();
window.setInterval(updateClock, 30_000);
bindForm("task");
bindForm("event");
loadData().catch((error) => showToast(error.message));
