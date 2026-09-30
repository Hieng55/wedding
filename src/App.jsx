import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Edit3,
  FolderHeart,
  Heart,
  ImagePlus,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  Menu,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { database, storage } from "./firebase";

const folderColors = ["#b98276", "#aa9070", "#7f9283", "#94839f", "#bd8e5e", "#718b9d"];
const folderIcons = ["♡", "✦", "❀", "♕", "◌", "☾"];
const weddingImages = [
  "/images/tra_1764.jpg",
  "/images/tra_0896.jpg",
  "/images/tra_1249.jpg",
  "/images/tra_0032.jpg",
  "/images/tra_0277.jpg",
  "/images/tra_0526.jpg",
  "/images/tra_1406.jpg",
  "/images/tra_1607.jpg"
];

const initialFolder = {
  name: "",
  description: "",
  color: folderColors[0],
  icon: folderIcons[0],
  pinned: false
};

const initialTask = {
  title: "",
  description: "",
  dueDate: "",
  dueTime: "",
  reminderAt: "",
  priority: "medium",
  status: "todo",
  imageUrl: "",
  imagePath: "",
  completed: false
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function objectToArray(value) {
  return value ? Object.entries(value).map(([id, item]) => ({ id, ...item })) : [];
}

function formatDate(value) {
  if (!value) return "Chưa đặt ngày";
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function formatReminder(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function Modal({ open, title, eyebrow, onClose, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal-card ${wide ? "modal-wide" : ""}`}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="empty-state">
      <div className="empty-art"><Heart size={35} strokeWidth={1.2} /></div>
      <span className="eyebrow">Bắt đầu thật nhẹ nhàng</span>
      <h2>Mỗi kế hoạch đẹp đều bắt đầu từ một việc nhỏ.</h2>
      <p>Tạo công việc đầu tiên và cùng nhau biến ngày trọng đại thành những khoảnh khắc trọn vẹn.</p>
      <button className="primary-button" onClick={onCreate}><Plus size={18} /> Thêm công việc đầu tiên</button>
    </div>
  );
}

function App() {
  const [folders, setFolders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [folderModal, setFolderModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [folderForm, setFolderForm] = useState(initialFolder);
  const [taskForm, setTaskForm] = useState(initialTask);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [featuredImage, setFeaturedImage] = useState(0);
  const notifiedTasks = useRef(new Set());

  useEffect(() => {
    const handleConnectionError = () => {
      setConnectionError("Firebase chưa cho phép truy cập. Hãy bật Realtime Database và kiểm tra Security Rules.");
      setLoading(false);
    };
    const unsubscribeFolders = onValue(ref(database, "folders"), (snapshot) => {
      const nextFolders = objectToArray(snapshot.val()).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.createdAt || 0) - (b.createdAt || 0));
      setFolders(nextFolders);
      setConnectionError("");
      setLoading(false);
    }, handleConnectionError);
    const unsubscribeTasks = onValue(ref(database, "tasks"), (snapshot) => {
      setTasks(objectToArray(snapshot.val()).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || (a.createdAt || 0) - (b.createdAt || 0)));
      setConnectionError("");
      setLoading(false);
    }, handleConnectionError);
    return () => {
      unsubscribeFolders();
      unsubscribeTasks();
    };
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      tasks.forEach((task) => {
        const reminderTime = task.reminderAt ? new Date(task.reminderAt).getTime() : 0;
        if (!task.completed && reminderTime && reminderTime <= now && now - reminderTime < 60000 && !notifiedTasks.current.has(task.id)) {
          notifiedTasks.current.add(task.id);
          setToast(`Đến giờ: ${task.title}`);
          if (Notification.permission === "granted") new Notification("Nhắc việc đám cưới", { body: task.title });
        }
      });
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timer);
  }, [tasks]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeaturedImage((current) => (current + 1) % weddingImages.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const folderTasks = tasks.filter((task) => activeFolderId === "all" || task.folderId === activeFolderId);
  const visibleTasks = folderTasks.filter((task) => {
    const matchesSearch = `${task.title} ${task.description || ""}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "done" ? task.completed : !task.completed);
    return matchesSearch && matchesStatus;
  });
  const completedCount = folderTasks.filter((task) => task.completed).length;
  const progress = folderTasks.length ? Math.round((completedCount / folderTasks.length) * 100) : 0;

  const upcoming = useMemo(() => tasks.filter((task) => !task.completed && task.dueDate).slice(0, 4), [tasks]);

  function openFolderForm(folder = null) {
    setEditingFolder(folder);
    setFolderForm(folder ? { ...initialFolder, ...folder } : { ...initialFolder, color: folderColors[folders.length % folderColors.length], icon: folderIcons[folders.length % folderIcons.length] });
    setFolderModal(true);
  }

  function openTaskForm(task = null) {
    setEditingTask(task);
    setTaskForm(task ? { ...initialTask, ...task } : { ...initialTask, folderId: activeFolderId === "all" ? folders[0]?.id || "" : activeFolderId });
    setImageFile(null);
    setImagePreview(task?.imageUrl || "");
    setTaskModal(true);
  }

  async function saveFolder(event) {
    event.preventDefault();
    if (!folderForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingFolder) {
        await update(ref(database, `folders/${editingFolder.id}`), { ...folderForm, updatedAt: Date.now() });
      } else {
        const newFolderRef = push(ref(database, "folders"));
        await set(newFolderRef, { ...folderForm, name: folderForm.name.trim(), createdAt: Date.now() });
        setActiveFolderId(newFolderRef.key);
      }
      setFolderModal(false);
      setToast(editingFolder ? "Đã cập nhật danh mục" : "Đã tạo danh mục mới");
    } catch {
      setToast("Không thể lưu. Vui lòng kiểm tra quyền truy cập Firebase.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTask(event) {
    event.preventDefault();
    if (!taskForm.title.trim() || !taskForm.folderId) return;
    setSaving(true);
    try {
      const taskId = editingTask?.id || push(ref(database, "tasks")).key;
      let imageUrl = taskForm.imageUrl || "";
      let imagePath = taskForm.imagePath || "";
      if (imageFile) {
        imagePath = `tasks/${taskId}/${Date.now()}-${imageFile.name}`;
        const uploadRef = storageRef(storage, imagePath);
        await uploadBytes(uploadRef, imageFile);
        imageUrl = await getDownloadURL(uploadRef);
        if (editingTask?.imagePath) deleteObject(storageRef(storage, editingTask.imagePath)).catch(() => {});
      }
      const payload = {
        ...taskForm,
        title: taskForm.title.trim(),
        imageUrl,
        imagePath,
        updatedAt: Date.now(),
        completed: taskForm.status === "done" || Boolean(taskForm.completed)
      };
      if (editingTask) await update(ref(database, `tasks/${taskId}`), payload);
      else await set(ref(database, `tasks/${taskId}`), { ...payload, createdAt: Date.now() });
      setTaskModal(false);
      setDetailTask(null);
      setToast(editingTask ? "Đã cập nhật công việc" : "Đã thêm công việc mới");
      if (taskForm.reminderAt && Notification.permission === "default") Notification.requestPermission();
    } catch {
      setToast("Không thể lưu. Hãy kiểm tra Database, Storage và Security Rules.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    await update(ref(database, `tasks/${task.id}`), {
      completed: !task.completed,
      status: !task.completed ? "done" : "todo",
      completedAt: !task.completed ? Date.now() : null,
      updatedAt: Date.now()
    });
  }

  async function deleteTask(task) {
    if (!window.confirm(`Xóa công việc “${task.title}”?`)) return;
    await remove(ref(database, `tasks/${task.id}`));
    if (task.imagePath) deleteObject(storageRef(storage, task.imagePath)).catch(() => {});
    setDetailTask(null);
    setToast("Đã xóa công việc");
  }

  async function deleteFolder(folder) {
    const relatedTasks = tasks.filter((task) => task.folderId === folder.id);
    if (!window.confirm(`Xóa danh mục “${folder.name}” và ${relatedTasks.length} công việc bên trong?`)) return;
    await Promise.all(relatedTasks.map((task) => remove(ref(database, `tasks/${task.id}`))));
    await remove(ref(database, `folders/${folder.id}`));
    relatedTasks.filter((task) => task.imagePath).forEach((task) => deleteObject(storageRef(storage, task.imagePath)).catch(() => {}));
    setActiveFolderId("all");
    setToast("Đã xóa danh mục");
  }

  async function togglePin(folder) {
    await update(ref(database, `folders/${folder.id}`), { pinned: !folder.pinned, updatedAt: Date.now() });
  }

  function selectImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  if (loading) {
    return <div className="app-loader"><LoaderCircle className="spin" size={30} /><span>Đang chuẩn bị kế hoạch của bạn…</span></div>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Heart size={20} fill="currentColor" /></div>
          <div><strong>Hiển love Giao</strong><span>wedding planner</span></div>
        </div>
        <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={20} /></button>

        <nav className="sidebar-nav">
          <button className={activeFolderId === "all" ? "active" : ""} onClick={() => { setActiveFolderId("all"); setSidebarOpen(false); }}>
            <LayoutGrid size={18} /><span>Tổng quan</span><em>{tasks.length}</em>
          </button>
          <div className="nav-label"><span>Danh mục kế hoạch</span><button onClick={() => openFolderForm()} aria-label="Thêm danh mục"><Plus size={16} /></button></div>
          {folders.length === 0 && <p className="folder-hint">Tạo danh mục như Mua sắm, Nghi lễ, Khách mời…</p>}
          {folders.map((folder) => (
            <button key={folder.id} className={`folder-link ${activeFolderId === folder.id ? "active" : ""}`} onClick={() => { setActiveFolderId(folder.id); setSidebarOpen(false); }}>
              <i style={{ background: `${folder.color}22`, color: folder.color }}>{folder.icon}</i>
              <span>{folder.name}</span>
              {folder.pinned && <Pin size={13} fill="currentColor" />}
              <em>{tasks.filter((task) => task.folderId === folder.id).length}</em>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <Sparkles size={18} />
          <p><strong>Một chút mỗi ngày</strong><span>{progress}% kế hoạch hiện tại đã hoàn thành.</span></p>
        </div>
        <div className="couple-card"><div className="avatar-stack"><span>A</span><span>M</span></div><p><strong>Kế hoạch của chúng mình</strong><span>Đồng bộ thời gian thực</span></p><CheckCircle2 size={17} /></div>
      </aside>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="search-box"><Search size={18} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm công việc…" /></div>
          <div className="topbar-actions">
            <button className="date-chip"><CalendarDays size={17} /><span>{fullDateFormatter.format(new Date())}</span></button>
            <button className="notification-button" onClick={() => Notification.requestPermission()}><Bell size={19} /><i /></button>
            <button className="primary-button small" onClick={() => openTaskForm()} disabled={!folders.length}><Plus size={18} /> Thêm công việc</button>
          </div>
        </header>

        <section className="page-content">
          {connectionError && <div className="connection-banner"><Bell size={17} /><span>{connectionError}</span></div>}
          <div className="page-heading">
            <div>
              <span className="eyebrow">Wedding planner · 2026</span>
              <h1>{activeFolder ? activeFolder.name : "Kế hoạch ngày cưới"}</h1>
              <p>{activeFolder?.description || "Cùng nhau chuẩn bị cho một ngày thật trọn vẹn."}</p>
            </div>
            {activeFolder && (
              <div className="heading-actions">
                <button className={`secondary-button ${activeFolder.pinned ? "pinned" : ""}`} onClick={() => togglePin(activeFolder)}><Pin size={16} /> {activeFolder.pinned ? "Đã ghim" : "Ghim"}</button>
                <button className="icon-button" onClick={() => openFolderForm(activeFolder)}><Edit3 size={17} /></button>
                <button className="icon-button danger" onClick={() => deleteFolder(activeFolder)}><Trash2 size={17} /></button>
              </div>
            )}
          </div>

          <section className="memory-banner">
            <img className="memory-backdrop" src={weddingImages[featuredImage]} alt="" />
            <img className="memory-photo" src={weddingImages[featuredImage]} alt="Khoảnh khắc cưới của Hiển và Giao" />
            <div className="memory-overlay">
              <span className="eyebrow">Our little story</span>
              <h2>Từng việc nhỏ, cho ngày hạnh phúc thật trọn vẹn.</h2>
              <p>Giữ mọi kế hoạch và những khoảnh khắc đẹp ở cùng một nơi.</p>
            </div>
            <div className="memory-thumbnails">
              {weddingImages.slice(0, 5).map((image, index) => (
                <button key={image} className={featuredImage === index ? "active" : ""} onClick={() => setFeaturedImage(index)} aria-label={`Xem ảnh ${index + 1}`}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          </section>

          <div className="stats-grid">
            <div className="stat-card hero-stat"><div className="stat-icon"><CheckCircle2 /></div><div><span>Tiến độ hoàn thành</span><strong>{progress}%</strong></div><div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` }}><span>{completedCount}/{folderTasks.length}</span></div></div>
            <div className="stat-card"><span>Công việc còn lại</span><strong>{folderTasks.length - completedCount}</strong><small><Clock3 size={14} /> Mình làm từng bước nhé</small></div>
            <div className="stat-card"><span>Danh mục kế hoạch</span><strong>{folders.length}</strong><small><FolderHeart size={14} /> {folders.filter((folder) => folder.pinned).length} mục quan trọng</small></div>
            <div className="stat-card"><span>Sắp đến hạn</span><strong>{upcoming.length}</strong><small><Bell size={14} /> Đã bật nhắc việc</small></div>
          </div>

          {folders.length === 0 ? (
            <div className="welcome-card">
              <div><span className="eyebrow">Không gian của hai bạn</span><h2>Trước tiên, hãy tạo một danh mục kế hoạch.</h2><p>Ví dụ: Việc cần làm, Mua sắm, Nghi lễ, Trang trí hoặc Khách mời.</p><button className="primary-button" onClick={() => openFolderForm()}><Plus size={18} /> Tạo danh mục đầu tiên</button></div>
              <div className="welcome-ornament"><img className="ornament-backdrop" src="/images/tra_0032.jpg" alt="" /><img className="ornament-photo" src="/images/tra_0032.jpg" alt="Cô dâu trong ngày cưới" /><span>Hiển love Giao<small>our wedding plan</small></span></div>
            </div>
          ) : (
            <div className="planner-grid">
              <section className="task-section">
                <div className="section-toolbar">
                  <div><h2>Danh sách công việc</h2><span>{visibleTasks.length} công việc</span></div>
                  <div className="filter-tabs"><ListFilter size={16} />{[["all", "Tất cả"], ["todo", "Chưa xong"], ["done", "Hoàn thành"]].map(([value, label]) => <button key={value} className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>{label}</button>)}</div>
                </div>

                {visibleTasks.length === 0 ? <EmptyState onCreate={() => openTaskForm()} /> : (
                  <div className="task-list">
                    {visibleTasks.map((task) => {
                      const folder = folders.find((item) => item.id === task.folderId);
                      return (
                        <article key={task.id} className={`task-card ${task.completed ? "completed" : ""}`}>
                          <button className="check-button" onClick={() => toggleTask(task)} aria-label="Đánh dấu hoàn thành">{task.completed ? <Check size={16} /> : <Circle size={20} />}</button>
                          {task.imageUrl && <button className="task-thumb" onClick={() => setDetailTask(task)}><img src={task.imageUrl} alt="" /></button>}
                          <button className="task-main" onClick={() => setDetailTask(task)}>
                            <div className="task-meta"><span style={{ color: folder?.color }}>{folder?.icon} {folder?.name}</span><i className={`priority ${task.priority}`}>{task.priority === "high" ? "Quan trọng" : task.priority === "low" ? "Thong thả" : "Vừa"}</i></div>
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                            <div className="task-date"><CalendarDays size={15} /> {formatDate(task.dueDate)} {task.dueTime && <><Clock3 size={15} /> {task.dueTime}</>} {task.reminderAt && <span><Bell size={14} /> {formatReminder(task.reminderAt)}</span>}</div>
                          </button>
                          <div className="task-actions"><button onClick={() => openTaskForm(task)}><Edit3 size={16} /></button><button onClick={() => deleteTask(task)}><Trash2 size={16} /></button><button onClick={() => setDetailTask(task)}><ChevronRight size={18} /></button></div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside className="right-panel">
                <div className="panel-heading"><div><span className="eyebrow">Tiếp theo</span><h3>Lịch sắp tới</h3></div><CalendarDays size={20} /></div>
                <div className="upcoming-list">
                  {upcoming.length === 0 && <p className="muted">Chưa có lịch sắp tới.</p>}
                  {upcoming.map((task) => <button key={task.id} onClick={() => setDetailTask(task)}><span className="date-box"><strong>{new Date(`${task.dueDate}T00:00:00`).getDate()}</strong><small>Th{new Date(`${task.dueDate}T00:00:00`).getMonth() + 1}</small></span><p><strong>{task.title}</strong><span>{task.dueTime || "Cả ngày"}</span></p><ChevronRight size={15} /></button>)}
                </div>
                <div className="quote-card"><span>“</span><p>Tình yêu không chỉ là nhìn nhau, mà là cùng nhìn về một hướng.</p><small>— Antoine de Saint-Exupéry</small></div>
                <button className="outline-add" onClick={() => openFolderForm()}><Plus size={17} /> Thêm danh mục mới</button>
              </aside>
            </div>
          )}
        </section>
      </main>

      <Modal open={folderModal} title={editingFolder ? "Chỉnh sửa danh mục" : "Danh mục mới"} eyebrow="Sắp xếp kế hoạch" onClose={() => setFolderModal(false)}>
        <form onSubmit={saveFolder} className="form-grid">
          <label className="full"><span>Tên danh mục</span><input autoFocus value={folderForm.name} onChange={(event) => setFolderForm({ ...folderForm, name: event.target.value })} placeholder="Ví dụ: Nghi lễ, Mua sắm…" required /></label>
          <label className="full"><span>Mô tả ngắn</span><textarea value={folderForm.description} onChange={(event) => setFolderForm({ ...folderForm, description: event.target.value })} placeholder="Những việc cần chuẩn bị trong danh mục này" rows="3" /></label>
          <fieldset className="full"><legend>Biểu tượng</legend><div className="option-row">{folderIcons.map((icon) => <button type="button" key={icon} className={folderForm.icon === icon ? "selected" : ""} onClick={() => setFolderForm({ ...folderForm, icon })}>{icon}</button>)}</div></fieldset>
          <fieldset className="full"><legend>Màu sắc</legend><div className="color-row">{folderColors.map((color) => <button type="button" key={color} className={folderForm.color === color ? "selected" : ""} style={{ background: color }} onClick={() => setFolderForm({ ...folderForm, color })}>{folderForm.color === color && <Check size={14} />}</button>)}</div></fieldset>
          <label className="toggle-row full"><input type="checkbox" checked={folderForm.pinned} onChange={(event) => setFolderForm({ ...folderForm, pinned: event.target.checked })} /><span><Pin size={17} /> Ghim danh mục quan trọng</span></label>
          <div className="form-actions full"><button type="button" className="secondary-button" onClick={() => setFolderModal(false)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Lưu danh mục</button></div>
        </form>
      </Modal>

      <Modal open={taskModal} title={editingTask ? "Chỉnh sửa công việc" : "Thêm công việc mới"} eyebrow="Chi tiết kế hoạch" onClose={() => setTaskModal(false)} wide>
        <form onSubmit={saveTask} className="form-grid">
          <label className="full"><span>Tên công việc</span><input autoFocus value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Bạn cần chuẩn bị việc gì?" required /></label>
          <label className="full"><span>Mô tả chi tiết</span><textarea value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Ghi rõ các bước, địa chỉ, người phụ trách…" rows="4" /></label>
          <label><span>Danh mục</span><select value={taskForm.folderId || ""} onChange={(event) => setTaskForm({ ...taskForm, folderId: event.target.value })} required><option value="">Chọn danh mục</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.icon} {folder.name}</option>)}</select></label>
          <label><span>Mức ưu tiên</span><select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}><option value="low">Thong thả</option><option value="medium">Vừa</option><option value="high">Quan trọng</option></select></label>
          <label><span>Ngày thực hiện</span><input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>
          <label><span>Giờ thực hiện</span><input type="time" value={taskForm.dueTime} onChange={(event) => setTaskForm({ ...taskForm, dueTime: event.target.value })} /></label>
          <label className="full"><span>Nhắc tôi vào lúc</span><input type="datetime-local" value={taskForm.reminderAt} onChange={(event) => setTaskForm({ ...taskForm, reminderAt: event.target.value })} /></label>
          <label className="image-upload full">
            <input type="file" accept="image/*" onChange={selectImage} />
            {imagePreview ? <><img src={imagePreview} alt="Xem trước" /><span><ImagePlus size={18} /> Chọn ảnh khác</span></> : <><ImagePlus size={25} /><strong>Thêm hình ảnh</strong><small>PNG, JPG hoặc WEBP</small></>}
          </label>
          <div className="form-actions full"><button type="button" className="secondary-button" onClick={() => setTaskModal(false)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} {editingTask ? "Lưu thay đổi" : "Thêm công việc"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(detailTask)} title={detailTask?.title || ""} eyebrow="Chi tiết công việc" onClose={() => setDetailTask(null)} wide>
        {detailTask && <div className="detail-content">
          {detailTask.imageUrl && <img className="detail-image" src={detailTask.imageUrl} alt={detailTask.title} />}
          <div className="detail-tags"><span className={`priority ${detailTask.priority}`}>{detailTask.priority === "high" ? "Quan trọng" : detailTask.priority === "low" ? "Thong thả" : "Ưu tiên vừa"}</span><span><FolderHeart size={15} /> {folders.find((folder) => folder.id === detailTask.folderId)?.name}</span></div>
          <p className="detail-description">{detailTask.description || "Chưa có mô tả chi tiết cho công việc này."}</p>
          <div className="detail-info"><div><CalendarDays size={18} /><span>Ngày thực hiện<strong>{formatDate(detailTask.dueDate)}</strong></span></div><div><Clock3 size={18} /><span>Thời gian<strong>{detailTask.dueTime || "Cả ngày"}</strong></span></div>{detailTask.reminderAt && <div><Bell size={18} /><span>Nhắc việc<strong>{formatReminder(detailTask.reminderAt)}</strong></span></div>}</div>
          <div className="detail-actions"><button className={`complete-button ${detailTask.completed ? "done" : ""}`} onClick={() => { toggleTask(detailTask); setDetailTask({ ...detailTask, completed: !detailTask.completed }); }}>{detailTask.completed ? <><CheckCircle2 size={18} /> Đã hoàn thành</> : <><Circle size={18} /> Đánh dấu hoàn thành</>}</button><button className="secondary-button" onClick={() => openTaskForm(detailTask)}><Edit3 size={16} /> Chỉnh sửa</button><button className="icon-button danger" onClick={() => deleteTask(detailTask)}><Trash2 size={17} /></button></div>
        </div>}
      </Modal>

      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  );
}

export default App;
