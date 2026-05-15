<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  getTasks,
  createTask,
  toggleTask as toggleTaskInDb,
  deleteTask as deleteTaskInDb,
  clearCompleted as clearCompletedInDb,
  updateTask as updateTaskInDb,
  resetTasks as resetTasksInDb,
  replaceAll as replaceAllInDb,
} from './tasks.js'
import CustomCursor from './CustomCursor.vue'

type Filter = 'all' | 'open' | 'done'
type Priority = 'High' | 'Medium' | 'Low'
type Category = 'Tool' | 'Study' | 'Build' | 'Personal' | 'Admin'
type SortKey = 'smart' | 'due' | 'priority' | 'created' | 'title'

interface Task {
  id: number
  title: string
  details: string
  category: Category
  priority: Priority
  due: string
  done: boolean
  createdAt: number
}

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'danger'
}

const categoryOptions: Category[] = ['Tool', 'Study', 'Build', 'Personal', 'Admin']
const priorityOptions: Priority[] = ['High', 'Medium', 'Low']
const filterOptions: Array<{ label: string; value: Filter }> = [
  { label: 'Everything', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Done', value: 'done' },
]
const sortOptions: Array<{ label: string; value: SortKey }> = [
  { label: 'Smart (default)', value: 'smart' },
  { label: 'Due date', value: 'due' },
  { label: 'Priority', value: 'priority' },
  { label: 'Created', value: 'created' },
  { label: 'Title (A–Z)', value: 'title' },
]

const categoryIcons: Record<Category, string> = {
  Tool: 'build',
  Study: 'menu_book',
  Build: 'construction',
  Personal: 'self_care',
  Admin: 'inventory_2',
}

const priorityWeight: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }

const todayInput = new Date().toLocaleDateString('en-CA')
const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  month: 'short',
  day: 'numeric',
})
const longDateFormatter = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const tasks = ref<Task[]>(getTasks() as Task[])
const activeFilter = ref<Filter>('all')
const sortKey = ref<SortKey>('smart')
const categoryFilter = ref<Category | 'all'>('all')
const priorityFilter = ref<Priority | 'all'>('all')
const searchTerm = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

// Composer modal state
const composerOpen = ref(false)
const newTitle = ref('')
const newDetails = ref('')
const newCategory = ref<Category>('Personal')
const newPriority = ref<Priority>('Medium')
const newDue = ref(todayInput)
const composerFirstFieldRef = ref<HTMLInputElement | null>(null)

// Edit modal state
const editingTask = ref<Task | null>(null)
const editTitle = ref('')
const editDetails = ref('')
const editCategory = ref<Category>('Personal')
const editPriority = ref<Priority>('Medium')
const editDue = ref('')
const editFirstFieldRef = ref<HTMLInputElement | null>(null)

// Delete confirmation state
const taskToDelete = ref<number | null>(null)

// Help modal state
const helpOpen = ref(false)

// Toast notifications
const toasts = ref<Toast[]>([])
let toastIdCounter = 0
const pushToast = (message: string, tone: Toast['tone'] = 'success') => {
  const id = ++toastIdCounter
  toasts.value.push({ id, message, tone })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2800)
}

// Element refs for focus trap
const previouslyFocused = ref<HTMLElement | null>(null)

const isOverdue = (due: string): boolean => {
  const today = new Date().toLocaleDateString('en-CA')
  return due < today
}

const daysUntil = (due: string): number => {
  if (!due) return Number.POSITIVE_INFINITY
  const todayDate = new Date(`${todayInput}T12:00:00`)
  const dueDate = new Date(`${due}T12:00:00`)
  const diffMs = dueDate.getTime() - todayDate.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const relativeDue = (due: string): string => {
  if (!due) return 'No date'
  const days = daysUntil(due)
  if (Number.isNaN(days)) return due
  if (days < -1) return `${Math.abs(days)} days ago`
  if (days === -1) return 'Yesterday'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 6) return `In ${days} days`
  return dateFormatter.format(new Date(`${due}T12:00:00`))
}

const dueTone = (task: Task): string => {
  if (task.done) return ''
  const days = daysUntil(task.due)
  if (days < 0) return 'tone-overdue'
  if (days === 0) return 'tone-today'
  if (days <= 2) return 'tone-soon'
  return ''
}

const visibleTasks = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()

  const filtered = tasks.value.filter((task) => {
    if (activeFilter.value === 'open' && task.done) return false
    if (activeFilter.value === 'done' && !task.done) return false
    if (categoryFilter.value !== 'all' && task.category !== categoryFilter.value) return false
    if (priorityFilter.value !== 'all' && task.priority !== priorityFilter.value) return false
    if (!query) return true

    return [task.title, task.details, task.category, task.priority]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  const sorters: Record<SortKey, (a: Task, b: Task) => number> = {
    smart: (a, b) =>
      Number(a.done) - Number(b.done) ||
      priorityWeight[a.priority] - priorityWeight[b.priority] ||
      b.createdAt - a.createdAt,
    due: (a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due),
    priority: (a, b) =>
      Number(a.done) - Number(b.done) || priorityWeight[a.priority] - priorityWeight[b.priority],
    created: (a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt,
    title: (a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title),
  }

  return [...filtered].sort(sorters[sortKey.value])
})

const totalCount = computed(() => tasks.value.length)
const openCount = computed(() => tasks.value.filter((task) => !task.done).length)
const doneCount = computed(() => tasks.value.filter((task) => task.done).length)
const highPriorityCount = computed(
  () => tasks.value.filter((task) => !task.done && task.priority === 'High').length,
)
const overdueCount = computed(
  () => tasks.value.filter((task) => !task.done && isOverdue(task.due)).length,
)
const todayCount = computed(
  () => tasks.value.filter((task) => !task.done && daysUntil(task.due) === 0).length,
)
const completionRate = computed(() => {
  if (!tasks.value.length) return 0
  return Math.round((doneCount.value / tasks.value.length) * 100)
})

const filterLabel = computed(
  () => filterOptions.find((option) => option.value === activeFilter.value)?.label ?? 'Everything',
)

const spotlightTask = computed(() => {
  return (
    tasks.value.find((task) => !task.done && isOverdue(task.due)) ??
    tasks.value.find((task) => !task.done && task.priority === 'High') ??
    tasks.value.find((task) => !task.done) ??
    null
  )
})

const currentDateLabel = longDateFormatter.format(new Date())

const anyModalOpen = computed(
  () => composerOpen.value || editingTask.value !== null || taskToDelete.value !== null || helpOpen.value,
)

function refresh() {
  tasks.value = getTasks() as Task[]
}

function openComposer() {
  previouslyFocused.value = document.activeElement as HTMLElement
  composerOpen.value = true
  nextTick(() => composerFirstFieldRef.value?.focus())
}

function closeComposer() {
  composerOpen.value = false
  newTitle.value = ''
  newDetails.value = ''
  newCategory.value = 'Personal'
  newPriority.value = 'Medium'
  newDue.value = todayInput
  previouslyFocused.value?.focus()
}

function addTask() {
  const title = newTitle.value.trim()
  if (!title) return

  createTask({
    title,
    details: newDetails.value.trim() || 'No extra notes added yet.',
    category: newCategory.value,
    priority: newPriority.value,
    due: newDue.value || todayInput,
  })
  refresh()
  pushToast('Task added to the board')
  closeComposer()
}

function quickAdd(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  const target = event.target as HTMLInputElement
  const title = target.value.trim()
  if (!title) return

  createTask({
    title,
    details: 'No extra notes added yet.',
    category: 'Personal',
    priority: 'Medium',
    due: todayInput,
  })
  refresh()
  target.value = ''
  pushToast('Quick task added — tap edit to add details')
}

function toggleTask(taskId: number) {
  const task = tasks.value.find((t) => t.id === taskId)
  toggleTaskInDb(taskId)
  refresh()
  pushToast(task?.done ? 'Marked as open' : 'Marked as done', 'info')
}

function openEditModal(task: Task) {
  previouslyFocused.value = document.activeElement as HTMLElement
  editingTask.value = task
  editTitle.value = task.title
  editDetails.value = task.details
  editCategory.value = task.category
  editPriority.value = task.priority
  editDue.value = task.due
  nextTick(() => editFirstFieldRef.value?.focus())
}

function closeEditModal() {
  editingTask.value = null
  editTitle.value = ''
  editDetails.value = ''
  editCategory.value = 'Personal'
  editPriority.value = 'Medium'
  editDue.value = ''
  previouslyFocused.value?.focus()
}

function saveTaskEdit() {
  if (!editingTask.value || !editTitle.value.trim()) return

  updateTaskInDb(editingTask.value.id, {
    title: editTitle.value.trim(),
    details: editDetails.value.trim() || 'No extra notes added yet.',
    category: editCategory.value,
    priority: editPriority.value,
    due: editDue.value,
  })
  refresh()
  pushToast('Task updated')
  closeEditModal()
}

function promptDeleteTask(taskId: number) {
  previouslyFocused.value = document.activeElement as HTMLElement
  taskToDelete.value = taskId
}

function confirmDelete() {
  if (taskToDelete.value !== null) {
    deleteTaskInDb(taskToDelete.value)
    refresh()
    taskToDelete.value = null
    pushToast('Task deleted', 'danger')
    previouslyFocused.value?.focus()
  }
}

function cancelDelete() {
  taskToDelete.value = null
  previouslyFocused.value?.focus()
}

function focusSearch() {
  searchInputRef.value?.focus()
  searchInputRef.value?.select()
}

function clearCompleted() {
  const removed = doneCount.value
  clearCompletedInDb()
  refresh()
  pushToast(`Cleared ${removed} completed task${removed === 1 ? '' : 's'}`, 'info')
}

function resetBoard() {
  resetTasksInDb()
  refresh()
  pushToast('Board reset to sample tasks', 'info')
}

function startFresh() {
  replaceAllInDb([])
  refresh()
  pushToast('Board cleared — start fresh', 'info')
}

function setCategoryFilter(value: Category | 'all') {
  categoryFilter.value = categoryFilter.value === value ? 'all' : value
}

function setPriorityFilter(value: Priority | 'all') {
  priorityFilter.value = priorityFilter.value === value ? 'all' : value
}

function jumpToOverdue() {
  activeFilter.value = 'open'
  categoryFilter.value = 'all'
  priorityFilter.value = 'all'
  sortKey.value = 'due'
  searchTerm.value = ''
}

function jumpToHighPriority() {
  activeFilter.value = 'open'
  priorityFilter.value = 'High'
}

function jumpToOpen() {
  activeFilter.value = 'open'
}

function jumpToDone() {
  activeFilter.value = 'done'
}

function jumpToToday() {
  activeFilter.value = 'open'
  sortKey.value = 'due'
  searchTerm.value = ''
}

function clearAllFilters() {
  activeFilter.value = 'all'
  categoryFilter.value = 'all'
  priorityFilter.value = 'all'
  searchTerm.value = ''
  sortKey.value = 'smart'
}

const hasActiveFilters = computed(
  () =>
    activeFilter.value !== 'all' ||
    categoryFilter.value !== 'all' ||
    priorityFilter.value !== 'all' ||
    searchTerm.value.length > 0 ||
    sortKey.value !== 'smart',
)

function categoryIcon(category: Category) {
  return categoryIcons[category]
}

function cardTone(category: Category) {
  return `card--${category.toLowerCase()}`
}

function focusFirstTask() {
  const firstCheckbox = document.querySelector('.task-card input[type="checkbox"]') as HTMLInputElement
  firstCheckbox?.focus()
}

// Global keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const isInInput =
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'

  // ESC closes any open modal
  if (event.key === 'Escape') {
    if (helpOpen.value) {
      helpOpen.value = false
      event.preventDefault()
      return
    }
    if (taskToDelete.value !== null) {
      cancelDelete()
      event.preventDefault()
      return
    }
    if (editingTask.value) {
      closeEditModal()
      event.preventDefault()
      return
    }
    if (composerOpen.value) {
      closeComposer()
      event.preventDefault()
      return
    }
    if (isInInput && target === searchInputRef.value) {
      searchTerm.value = ''
      target.blur()
      event.preventDefault()
      return
    }
  }

  if (isInInput || anyModalOpen.value) return

  if (event.key === '/') {
    event.preventDefault()
    focusSearch()
  } else if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    openComposer()
  } else if (event.key === '?') {
    event.preventDefault()
    helpOpen.value = true
  } else if (event.key.toLowerCase() === 'j') {
    event.preventDefault()
    focusFirstTask()
  }
}

function loadDisqus() {
  const d = document
  const s = d.createElement('script')
  s.src = 'https://test-zy3jl34rlf.disqus.com/embed.js'
  s.setAttribute('data-timestamp', String(+new Date()))
  ;(d.head || d.body).appendChild(s)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadDisqus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Prevent body scroll when modal is open
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
</script>

<template>
  <div class="app-shell">
    <CustomCursor />
    <div class="grid-overlay" aria-hidden="true"></div>

    <a class="skip-link" href="#tasks-region">Skip to tasks</a>

    <nav class="topbar" aria-label="Primary">
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true">d.</span>
        <div>
          <p class="brand-name">Studio Todo</p>
          <p class="brand-caption">{{ currentDateLabel }}</p>
        </div>
      </div>

      <div class="topbar__actions">
        <button
          class="ghost-button ghost-button--soft"
          type="button"
          @click="helpOpen = true"
          aria-label="Show keyboard shortcuts"
        >
          <span class="material-symbols-outlined">keyboard</span>
          <span class="topbar__action-label">Shortcuts</span>
        </button>
        <button
          class="icon-button"
          type="button"
          aria-label="Focus search (press /)"
          @click="focusSearch"
        >
          <span class="material-symbols-outlined">search</span>
        </button>
        <button
          class="submit-button submit-button--compact"
          type="button"
          @click="openComposer"
          aria-label="New task (press N)"
        >
          <span class="material-symbols-outlined">add</span>
          <span>New task</span>
        </button>
      </div>
    </nav>

    <header class="masthead">
      <p class="eyebrow">Your tasks</p>
      <h1>{{ filterLabel }}</h1>
    </header>

    <main class="main-board">
      <!-- Stat row: clickable filter chips -->
      <section class="stat-row" aria-label="Task summary">
        <button
          class="stat-card stat-card--clickable"
          :class="{ 'is-pressed': activeFilter === 'all' && !hasActiveFilters }"
          type="button"
          @click="clearAllFilters"
        >
          <span class="stat-card__label">Total</span>
          <strong>{{ totalCount }}</strong>
        </button>
        <button
          class="stat-card stat-card--clickable"
          :class="{ 'is-pressed': activeFilter === 'open' && categoryFilter === 'all' && priorityFilter === 'all' }"
          type="button"
          @click="jumpToOpen"
        >
          <span class="stat-card__label">Open</span>
          <strong>{{ openCount }}</strong>
        </button>
        <button
          class="stat-card stat-card--clickable"
          :class="{ 'is-pressed': activeFilter === 'done' }"
          type="button"
          @click="jumpToDone"
        >
          <span class="stat-card__label">Done</span>
          <strong>{{ doneCount }}</strong>
        </button>
        <button
          class="stat-card stat-card--clickable stat-card--accent"
          type="button"
          @click="jumpToToday"
          :disabled="todayCount === 0"
        >
          <span class="stat-card__label">Today</span>
          <strong>{{ todayCount }}</strong>
        </button>
        <button
          class="stat-card stat-card--clickable stat-card--warn"
          type="button"
          @click="jumpToHighPriority"
          :disabled="highPriorityCount === 0"
        >
          <span class="stat-card__label">High</span>
          <strong>{{ highPriorityCount }}</strong>
        </button>
        <button
          class="stat-card stat-card--clickable stat-card--danger"
          type="button"
          @click="jumpToOverdue"
          :disabled="overdueCount === 0"
        >
          <span class="stat-card__label">Overdue</span>
          <strong>{{ overdueCount }}</strong>
        </button>
        <div class="stat-card stat-card--progress">
          <span class="stat-card__label">Done rate</span>
          <strong>{{ completionRate }}%</strong>
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-bar__fill" :style="{ width: `${completionRate}%` }"></div>
          </div>
        </div>
      </section>

      <!-- Spotlight (only if there's a meaningful next-up task) -->
      <section v-if="spotlightTask" class="spotlight panel">
        <div class="spotlight__copy">
          <p class="panel-kicker">Next up</p>
          <h2>{{ spotlightTask.title }}</h2>
          <p class="spotlight__details">{{ spotlightTask.details }}</p>
          <p class="spotlight__meta">
            <span class="material-symbols-outlined">{{ categoryIcon(spotlightTask.category) }}</span>
            {{ spotlightTask.category }}
            <span class="dot" aria-hidden="true">•</span>
            {{ spotlightTask.priority }}
            <span class="dot" aria-hidden="true">•</span>
            <span :class="dueTone(spotlightTask)">{{ relativeDue(spotlightTask.due) }}</span>
          </p>
        </div>
        <div class="spotlight__actions">
          <button class="ghost-button ghost-button--light" type="button" @click="openEditModal(spotlightTask)">
            Edit
          </button>
          <button class="submit-button submit-button--light" type="button" @click="toggleTask(spotlightTask.id)">
            {{ spotlightTask.done ? 'Reopen' : 'Mark done' }}
          </button>
        </div>
      </section>

      <!-- Quick add bar + filter toolbar -->
      <section class="toolbar panel">
        <div class="quick-add">
          <span class="material-symbols-outlined" aria-hidden="true">add_task</span>
          <input
            type="text"
            placeholder="Quick add a task… (press Enter)"
            aria-label="Quick add a task"
            @keydown="quickAdd"
          />
          <button class="ghost-button ghost-button--inline" type="button" @click="openComposer">
            Full form
          </button>
        </div>

        <div class="toolbar__row">
          <label class="search-field search-field--inline">
            <span class="visually-hidden">Search</span>
            <div>
              <span class="material-symbols-outlined" aria-hidden="true">search</span>
              <input
                ref="searchInputRef"
                v-model="searchTerm"
                type="search"
                placeholder="Search tasks  ( / )"
              />
              <button
                v-if="searchTerm"
                class="search-clear"
                type="button"
                @click="searchTerm = ''"
                aria-label="Clear search"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </label>

          <div class="segmented-control" role="tablist" aria-label="Status filter">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              type="button"
              class="segmented-control__item"
              :class="{ 'is-active': activeFilter === option.value }"
              @click="activeFilter = option.value"
              role="tab"
              :aria-selected="activeFilter === option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <label class="sort-select">
            <span class="visually-hidden">Sort by</span>
            <span class="material-symbols-outlined" aria-hidden="true">sort</span>
            <select v-model="sortKey">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                Sort: {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="toolbar__chips">
          <span class="chip-group__label">Category</span>
          <button
            class="chip"
            :class="{ 'is-active': categoryFilter === 'all' }"
            type="button"
            @click="categoryFilter = 'all'"
          >
            All
          </button>
          <button
            v-for="category in categoryOptions"
            :key="category"
            class="chip chip--category"
            :class="[`chip--${category.toLowerCase()}`, { 'is-active': categoryFilter === category }]"
            type="button"
            @click="setCategoryFilter(category)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ categoryIcons[category] }}</span>
            {{ category }}
          </button>

          <span class="chip-divider" aria-hidden="true"></span>

          <span class="chip-group__label">Priority</span>
          <button
            class="chip"
            :class="{ 'is-active': priorityFilter === 'all' }"
            type="button"
            @click="priorityFilter = 'all'"
          >
            Any
          </button>
          <button
            v-for="priority in priorityOptions"
            :key="priority"
            class="chip"
            :class="[`chip--prio-${priority.toLowerCase()}`, { 'is-active': priorityFilter === priority }]"
            type="button"
            @click="setPriorityFilter(priority)"
          >
            {{ priority }}
          </button>

          <button
            v-if="hasActiveFilters"
            class="chip chip--clear"
            type="button"
            @click="clearAllFilters"
          >
            <span class="material-symbols-outlined">close</span>
            Clear filters
          </button>

          <button
            class="chip chip--clear"
            type="button"
            @click="clearCompleted"
            :disabled="doneCount === 0"
          >
            <span class="material-symbols-outlined">cleaning_services</span>
            Clear done
          </button>
        </div>
      </section>

      <!-- Tasks region -->
      <section id="tasks-region" class="tasks-panel panel" aria-label="Tasks">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Board</p>
            <h2>{{ visibleTasks.length }} {{ visibleTasks.length === 1 ? 'task' : 'tasks' }}</h2>
          </div>
          <span v-if="hasActiveFilters" class="badge badge--dark">Filtered</span>
        </div>

        <transition-group v-if="visibleTasks.length" name="card" tag="div" class="task-grid">
          <article
            v-for="task in visibleTasks"
            :key="task.id"
            class="task-card"
            :class="[cardTone(task.category), { 'is-done': task.done, 'is-overdue': !task.done && isOverdue(task.due) }]"
          >
            <div class="task-card__row">
              <label class="task-checkbox" :title="task.done ? 'Mark as open' : 'Mark as done'">
                <input
                  type="checkbox"
                  :checked="task.done"
                  @change="toggleTask(task.id)"
                  :aria-label="task.done ? `Reopen ${task.title}` : `Complete ${task.title}`"
                />
                <span class="task-checkbox__box" aria-hidden="true">
                  <span class="material-symbols-outlined">check</span>
                </span>
              </label>

              <div class="task-card__body">
                <div class="task-card__head">
                  <span class="task-card__label">
                    <span class="material-symbols-outlined" aria-hidden="true">{{ categoryIcons[task.category] }}</span>
                    {{ task.category }}
                  </span>
                  <span
                    class="prio-pill"
                    :class="`prio-pill--${task.priority.toLowerCase()}`"
                  >{{ task.priority }}</span>
                </div>
                <h3>{{ task.title }}</h3>
                <p v-if="task.details" class="task-card__details">{{ task.details }}</p>
              </div>

              <div class="task-card__controls">
                <button
                  class="icon-button icon-button--ghost icon-button--accent"
                  type="button"
                  @click="openEditModal(task)"
                  aria-label="Edit task"
                  title="Edit"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button
                  class="icon-button icon-button--ghost icon-button--danger"
                  type="button"
                  @click="promptDeleteTask(task.id)"
                  aria-label="Delete task"
                  title="Delete"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>

            <div class="task-card__meta">
              <span class="due-pill" :class="dueTone(task)">
                <span class="material-symbols-outlined" aria-hidden="true">event</span>
                {{ relativeDue(task.due) }}
                <span v-if="!task.done && isOverdue(task.due)" class="overdue-badge">Overdue</span>
              </span>
            </div>
          </article>
        </transition-group>

        <div v-else class="empty-state">
          <p class="panel-kicker">Nothing here</p>
          <h3 v-if="hasActiveFilters">No tasks match these filters.</h3>
          <h3 v-else-if="totalCount === 0">Your board is empty.</h3>
          <h3 v-else>No tasks match the current view.</h3>
          <p v-if="hasActiveFilters">Try clearing filters or search to bring the board back.</p>
          <p v-else>Add your first task with the "New task" button or the quick add bar.</p>
          <div class="empty-state__actions">
            <button v-if="hasActiveFilters" class="ghost-button" type="button" @click="clearAllFilters">
              Clear filters
            </button>
            <button v-if="totalCount === 0" class="submit-button" type="button" @click="resetBoard">
              Load sample tasks
            </button>
            <button v-else class="submit-button" type="button" @click="openComposer">
              New task
            </button>
          </div>
        </div>
      </section>

      <!-- Comments -->
      <section class="comments-panel panel" aria-label="Comments">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Discuss</p>
            <h2>Comments</h2>
          </div>
        </div>
        <div id="disqus_thread"></div>
        <noscript>
          Please enable JavaScript to view the
          <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a>
        </noscript>
      </section>
    </main>

    <footer class="site-footer">
      <div>
        <p class="brand-name">Studio Todo</p>
        <p class="brand-caption">Quick capture, clear board, local persistence.</p>
      </div>
      <div class="site-footer__actions">
        <button class="ghost-button ghost-button--light" type="button" @click="resetBoard">
          Reset to samples
        </button>
        <button class="ghost-button ghost-button--light" type="button" @click="startFresh">
          Start fresh
        </button>
      </div>
    </footer>

    <!-- Floating action button (mobile only) -->
    <button class="fab" type="button" @click="openComposer" aria-label="New task">
      <span class="material-symbols-outlined">add</span>
    </button>

    <!-- Composer Modal -->
    <div v-if="composerOpen" class="modal-overlay" @click="closeComposer" role="dialog" aria-modal="true" aria-labelledby="composer-heading">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2 id="composer-heading">New task</h2>
          <button class="modal-close" type="button" @click="closeComposer" aria-label="Close (Esc)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form class="modal-content" @submit.prevent="addTask">
          <label>
            <span>Task name</span>
            <input
              ref="composerFirstFieldRef"
              v-model="newTitle"
              type="text"
              placeholder="Ship the new workshop agenda"
              required
            />
          </label>

          <label>
            <span>Notes</span>
            <textarea
              v-model="newDetails"
              rows="3"
              placeholder="Capture context, stakeholders, or the next step."
            ></textarea>
          </label>

          <div class="task-form__grid">
            <label>
              <span>Category</span>
              <select v-model="newCategory">
                <option v-for="category in categoryOptions" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </label>

            <label>
              <span>Priority</span>
              <select v-model="newPriority">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">
                  {{ priority }}
                </option>
              </select>
            </label>

            <label>
              <span>Due date</span>
              <input v-model="newDue" type="date" />
            </label>
          </div>

          <div class="modal-actions">
            <button class="ghost-button" type="button" @click="closeComposer">Cancel</button>
            <button class="submit-button" type="submit">Add to board</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Task Modal -->
    <div v-if="editingTask" class="modal-overlay" @click="closeEditModal" role="dialog" aria-modal="true" aria-labelledby="edit-heading">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2 id="edit-heading">Edit task</h2>
          <button class="modal-close" type="button" @click="closeEditModal" aria-label="Close (Esc)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form class="modal-content" @submit.prevent="saveTaskEdit">
          <label>
            <span>Task name</span>
            <input ref="editFirstFieldRef" v-model="editTitle" type="text" required />
          </label>

          <label>
            <span>Notes</span>
            <textarea v-model="editDetails" rows="3"></textarea>
          </label>

          <div class="task-form__grid">
            <label>
              <span>Category</span>
              <select v-model="editCategory">
                <option v-for="category in categoryOptions" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </label>

            <label>
              <span>Priority</span>
              <select v-model="editPriority">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">
                  {{ priority }}
                </option>
              </select>
            </label>

            <label>
              <span>Due date</span>
              <input v-model="editDue" type="date" />
            </label>
          </div>

          <div class="modal-actions">
            <button class="ghost-button" type="button" @click="closeEditModal">Cancel</button>
            <button class="submit-button" type="submit">Save changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="taskToDelete !== null" class="modal-overlay" @click="cancelDelete" role="dialog" aria-modal="true" aria-labelledby="delete-heading">
      <div class="modal modal--small" @click.stop>
        <div class="modal-header">
          <h2 id="delete-heading">Delete task?</h2>
        </div>
        <div class="modal-content">
          <p>This task will be removed from your board. You can't undo this.</p>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" @click="cancelDelete">Cancel</button>
          <button class="submit-button submit-button--danger" type="button" @click="confirmDelete">
            Delete task
          </button>
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts Modal -->
    <div v-if="helpOpen" class="modal-overlay" @click="helpOpen = false" role="dialog" aria-modal="true" aria-labelledby="help-heading">
      <div class="modal modal--small" @click.stop>
        <div class="modal-header">
          <h2 id="help-heading">Keyboard shortcuts</h2>
          <button class="modal-close" type="button" @click="helpOpen = false" aria-label="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-content">
          <dl class="shortcuts">
            <div><dt><kbd>N</kbd></dt><dd>New task</dd></div>
            <div><dt><kbd>/</kbd></dt><dd>Focus search</dd></div>
            <div><dt><kbd>J</kbd></dt><dd>Jump to first task</dd></div>
            <div><dt><kbd>?</kbd></dt><dd>Show this help</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Close modal / clear search</dd></div>
            <div><dt><kbd>Enter</kbd></dt><dd>In quick add: create task</dd></div>
          </dl>
        </div>
      </div>
    </div>

    <!-- Toast notifications -->
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.tone}`"
          role="status"
        >
          <span class="material-symbols-outlined" aria-hidden="true">
            {{ toast.tone === 'danger' ? 'delete' : toast.tone === 'info' ? 'info' : 'check_circle' }}
          </span>
          {{ toast.message }}
        </div>
      </transition-group>
    </div>
  </div>
</template>
