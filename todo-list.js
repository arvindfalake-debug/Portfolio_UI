(function () {
  'use strict';

  var STORAGE_KEY = 'todo-list-tasks';
  var UNDO_MS = 6000;

  var PRIORITIES = {
    high:   { label: 'High',   rank: 0 },
    medium: { label: 'Medium', rank: 1 },
    low:    { label: 'Low',    rank: 2 }
  };

  /* ---------- Elements ---------- */
  var listEl = document.getElementById('task-list');
  var emptyEl = document.getElementById('empty');
  var summaryEl = document.getElementById('summary');
  var todayEl = document.getElementById('today');
  var addForm = document.getElementById('add-form');
  var newTaskInput = document.getElementById('new-task');
  var newPriority = document.getElementById('new-priority');
  var clearDoneBtn = document.getElementById('clear-done');
  var filterBtns = document.querySelectorAll('[data-filter]');
  var toastEl = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  var toastUndo = document.getElementById('toast-undo');

  /* ---------- State ---------- */
  var tasks = loadTasks();
  var filter = 'all';        // 'all' | 'active' | 'done'
  var editingId = null;      // id of the task being edited
  var focusAfterRender = null;
  var removed = [];          // last deleted tasks, for Undo
  var toastTimer = null;

  /* ---------- Storage ---------- */
  function loadTasks() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!Array.isArray(data)) return [];
      return data.filter(function (t) {
        return t && typeof t.id === 'string' && typeof t.text === 'string' && PRIORITIES[t.priority];
      }).map(function (t) {
        return { id: t.id, text: t.text, priority: t.priority, done: !!t.done, created: t.created || 0 };
      });
    } catch (e) {
      return [];
    }
  }

  function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Helpers ---------- */
  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function findTask(id) {
    for (var i = 0; i < tasks.length; i++) if (tasks[i].id === id) return tasks[i];
    return null;
  }

  // To-do tasks first, then by priority, then oldest first
  function sortTasks(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank;
    return a.created - b.created;
  }

  function visibleTasks() {
    return tasks.filter(function (t) {
      if (filter === 'active') return !t.done;
      if (filter === 'done') return t.done;
      return true;
    }).sort(sortTasks);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function requireText(input) {
    var text = input.value.trim();
    if (!text) {
      input.setCustomValidity('Write a task first.');
      input.reportValidity();
      return null;
    }
    input.setCustomValidity('');
    return text;
  }

  /* ---------- Building list items ---------- */
  function buildViewItem(task) {
    var li = el('li', 'task task--' + task.priority + (task.done ? ' task--done' : ''));
    li.setAttribute('data-id', task.id);

    var check = el('input', 'task__check');
    check.type = 'checkbox';
    check.checked = task.done;
    check.setAttribute('data-action', 'toggle');
    check.setAttribute('aria-label', 'Mark as done: ' + task.text);

    var body = el('div', 'task__body');
    body.appendChild(el('p', 'task__text', task.text));
    body.appendChild(el('span', 'task__badge', PRIORITIES[task.priority].label + ' priority'));

    var actions = el('div', 'task__actions');
    var edit = el('button', 'task__btn', 'Edit');
    edit.type = 'button';
    edit.setAttribute('data-action', 'edit');
    edit.setAttribute('aria-label', 'Edit task: ' + task.text);

    var del = el('button', 'task__btn task__btn--delete', 'Delete');
    del.type = 'button';
    del.setAttribute('data-action', 'delete');
    del.setAttribute('aria-label', 'Delete task: ' + task.text);

    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(actions);
    return li;
  }

  function buildEditItem(task) {
    var li = el('li', 'task task--editing');
    li.setAttribute('data-id', task.id);

    var form = el('form', 'edit-form');
    form.setAttribute('data-action', 'save');
    form.setAttribute('aria-label', 'Edit task');

    var text = el('input', 'edit-form__text');
    text.type = 'text';
    text.maxLength = 120;
    text.value = task.text;
    text.setAttribute('aria-label', 'Task name');

    var select = el('select', 'edit-form__priority');
    select.setAttribute('aria-label', 'Priority');
    Object.keys(PRIORITIES).forEach(function (key) {
      var option = el('option', '', PRIORITIES[key].label);
      option.value = key;
      option.selected = key === task.priority;
      select.appendChild(option);
    });

    var buttons = el('div', 'edit-form__buttons');
    var cancel = el('button', 'btn btn--quiet', 'Cancel');
    cancel.type = 'button';
    cancel.setAttribute('data-action', 'cancel');
    var save = el('button', 'btn btn--primary', 'Save');
    save.type = 'submit';
    buttons.appendChild(cancel);
    buttons.appendChild(save);

    form.appendChild(text);
    form.appendChild(select);
    form.appendChild(buttons);
    li.appendChild(form);
    return li;
  }

  /* ---------- Render ---------- */
  var EMPTY_MESSAGES = {
    none:   'Nothing here yet. Add your first task above.',
    active: 'Nothing left to do. Nice work!',
    done:   'No completed tasks yet.'
  };

  function render() {
    var visible = visibleTasks();
    var total = tasks.length;
    var doneCount = tasks.filter(function (t) { return t.done; }).length;
    var activeCount = total - doneCount;

    listEl.innerHTML = '';
    visible.forEach(function (task) {
      listEl.appendChild(task.id === editingId ? buildEditItem(task) : buildViewItem(task));
    });

    // Empty message
    if (visible.length === 0) {
      emptyEl.textContent = total === 0 ? EMPTY_MESSAGES.none
        : filter === 'active' ? EMPTY_MESSAGES.active
        : EMPTY_MESSAGES.done;
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
    }

    // Summary and counts
    if (total === 0) summaryEl.textContent = 'No tasks yet';
    else if (activeCount === 0) summaryEl.textContent = 'All done!';
    else summaryEl.textContent = activeCount + (activeCount === 1 ? ' task left' : ' tasks left');

    document.getElementById('count-all').textContent = total;
    document.getElementById('count-active').textContent = activeCount;
    document.getElementById('count-done').textContent = doneCount;

    filterBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === filter));
    });
    clearDoneBtn.disabled = doneCount === 0;

    // Keep keyboard focus in a sensible place
    if (focusAfterRender) {
      var target = focusAfterRender;
      focusAfterRender = null;
      var item = listEl.querySelector('[data-id="' + target.id + '"]');
      var node = item && item.querySelector(target.selector);
      if (node) {
        node.focus();
        if (node.select) node.select();
      }
    }
  }

  function update() {
    saveTasks();
    render();
  }

  /* ---------- Undo toast ---------- */
  function showToast(message) {
    toastText.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, UNDO_MS);
  }

  function hideToast() {
    toastEl.hidden = true;
    removed = [];
    clearTimeout(toastTimer);
  }

  function undoRemove() {
    // Put tasks back in their old positions (lowest index first)
    removed.sort(function (a, b) { return a.index - b.index; }).forEach(function (item) {
      tasks.splice(Math.min(item.index, tasks.length), 0, item.task);
    });
    hideToast();
    update();
  }

  function removeTasks(predicate, message) {
    var kept = [];
    removed = [];
    tasks.forEach(function (task, index) {
      if (predicate(task)) removed.push({ task: task, index: index });
      else kept.push(task);
    });
    if (removed.length === 0) return;
    tasks = kept;
    update();
    showToast(message);
  }

  /* ---------- Events ---------- */

  // Add a task
  addForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = requireText(newTaskInput);
    if (!text) return;
    tasks.push({
      id: makeId(),
      text: text,
      priority: newPriority.value,
      done: false,
      created: Date.now()
    });
    newTaskInput.value = '';
    // Make sure the new task is visible
    if (filter === 'done') filter = 'all';
    update();
    newTaskInput.focus();
  });

  newTaskInput.addEventListener('input', function () { newTaskInput.setCustomValidity(''); });

  // Filters
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filter = btn.getAttribute('data-filter');
      editingId = null;
      render();
    });
  });

  // Clear completed
  clearDoneBtn.addEventListener('click', function () {
    var count = tasks.filter(function (t) { return t.done; }).length;
    removeTasks(function (t) { return t.done; },
      count === 1 ? '1 completed task cleared' : count + ' completed tasks cleared');
    newTaskInput.focus();
  });

  toastUndo.addEventListener('click', undoRemove);

  // Task actions (toggle, edit, delete, cancel)
  listEl.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) return;
    var item = button.closest('[data-id]');
    var id = item.getAttribute('data-id');
    var action = button.getAttribute('data-action');

    if (action === 'edit') {
      editingId = id;
      focusAfterRender = { id: id, selector: '.edit-form__text' };
      render();
    } else if (action === 'cancel') {
      editingId = null;
      focusAfterRender = { id: id, selector: '[data-action="edit"]' };
      render();
    } else if (action === 'delete') {
      removeTasks(function (t) { return t.id === id; }, 'Task deleted');
      newTaskInput.focus();
    }
  });

  listEl.addEventListener('change', function (event) {
    var check = event.target.closest('input[data-action="toggle"]');
    if (!check) return;
    var task = findTask(check.closest('[data-id]').getAttribute('data-id'));
    if (!task) return;
    task.done = check.checked;
    update();
  });

  // Save an edit
  listEl.addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var id = form.closest('[data-id]').getAttribute('data-id');
    var task = findTask(id);
    var input = form.querySelector('.edit-form__text');
    var text = requireText(input);
    if (!task || !text) return;
    task.text = text;
    task.priority = form.querySelector('.edit-form__priority').value;
    editingId = null;
    focusAfterRender = { id: id, selector: '[data-action="edit"]' };
    update();
  });

  listEl.addEventListener('input', function (event) {
    if (event.target.classList.contains('edit-form__text')) event.target.setCustomValidity('');
  });

  // Escape cancels editing
  listEl.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !editingId) return;
    var id = editingId;
    editingId = null;
    focusAfterRender = { id: id, selector: '[data-action="edit"]' };
    render();
  });

  /* ---------- Start ---------- */
  todayEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  render();
})();
