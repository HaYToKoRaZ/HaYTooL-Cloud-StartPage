import { Storage } from './storage.js';
/**
 * HaYTooL Cloud StartPage - Hızlı Notlar & To-Do Modülü
 */
export const Notes = {
  todos: [],
  async init() {
    const textarea = document.getElementById('notesTextarea');
    const drawer = document.getElementById('notesDrawer');
    const toggleBtn = document.getElementById('notesToggleBtn');
    const closeBtn = document.getElementById('closeNotesDrawer');
    const tabNotes = document.getElementById('tabNotes');
    const tabTodos = document.getElementById('tabTodos');
    const notesView = document.getElementById('notesView');
    const todosView = document.getElementById('todosView');
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');

    if (textarea) {
      textarea.value = await Storage.get('quick_notes', '');
      let saveTimer;
      textarea.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => Storage.set('quick_notes', textarea.value), 500);
      });
    }

    this.todos = await Storage.get('todos_list', []);
    this.renderTodos();

    if (toggleBtn && drawer) {
      toggleBtn.addEventListener('click', () => drawer.classList.toggle('active'));
    }
    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => drawer.classList.remove('active'));
    }

    if (tabNotes && tabTodos && notesView && todosView) {
      tabNotes.addEventListener('click', () => {
        tabNotes.classList.add('active'); tabTodos.classList.remove('active');
        notesView.style.display = 'block'; todosView.style.display = 'none';
      });
      tabTodos.addEventListener('click', () => {
        tabTodos.classList.add('active'); tabNotes.classList.remove('active');
        notesView.style.display = 'none'; todosView.style.display = 'block';
      });
    }

    if (todoInput && addTodoBtn) {
      const handleAdd = () => {
        const text = todoInput.value.trim();
        if (!text) return;
        this.todos.push({ id: Date.now().toString(), text, done: false });
        Storage.set('todos_list', this.todos);
        this.renderTodos();
        todoInput.value = '';
      };
      addTodoBtn.addEventListener('click', handleAdd);
      todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });
    }
  },
  renderTodos() {
    const list = document.getElementById('todoList');
    if (!list) return;
    list.innerHTML = '';
    this.todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (todo.done ? ' done' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = todo.done;
      cb.addEventListener('change', () => {
        todo.done = cb.checked;
        Storage.set('todos_list', this.todos);
        this.renderTodos();
      });
      const span = document.createElement('span');
      span.textContent = todo.text; span.style.flex = '1';
      const del = document.createElement('button');
      del.innerHTML = '✕';
      del.style.cssText = 'background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:0.75rem;padding:0 4px;';
      del.addEventListener('click', () => {
        this.todos = this.todos.filter(t => t.id !== todo.id);
        Storage.set('todos_list', this.todos);
        this.renderTodos();
      });
      li.appendChild(cb); li.appendChild(span); li.appendChild(del);
      list.appendChild(li);
    });
  }
};