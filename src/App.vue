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
  togglePinned as togglePinnedInDb,
  reorderTasks as reorderTasksInDb,
} from './tasks.js'
import CustomCursor from './CustomCursor.vue'

type Filter = 'all' | 'open' | 'done'
type Priority = 'High' | 'Medium' | 'Low'
type Category = 'Tool' | 'Study' | 'Build' | 'Personal' | 'Admin'
type SortKey = 'smart' | 'manual' | 'due' | 'priority' | 'created' | 'title'
type ViewMode = 'board' | 'calendar'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

interface Task {
  id: number
  title: string
  details: string
  category: Category
  priority: Priority
  due: string
  done: boolean
  pinned: boolean
  recurrence: Recurrence
  recurrenceEnd: string
  createdAt: number
}

interface ToastAction {
  label: string
  handler: () => void
}

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'danger'
  action?: ToastAction
  duration?: number
}

interface BurstParticle {
  id: number
  dx: number
  dy: number
  color: string
  size: number
}

interface CelebrationBurst {
  id: number
  x: number
  y: number
  particles: BurstParticle[]
}

interface CalendarDay {
  key: string
  label: number
  isToday: boolean
  isCurrentMonth: boolean
  isSelected: boolean
  occurrences: CalendarOccurrence[]
}

interface CalendarOccurrence {
  id: string
  date: string
  task: Task
  isRecurring: boolean
}

const categoryOptions: Category[] = ['Tool', 'Study', 'Build', 'Personal', 'Admin']
const priorityOptions: Priority[] = ['High', 'Medium', 'Low']
const recurrenceOptions: Array<{ label: string; value: Recurrence }> = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]
const viewOptions: Array<{ label: string; value: ViewMode; icon: string }> = [
  { label: 'Board', value: 'board', icon: 'view_agenda' },
  { label: 'Calendar', value: 'calendar', icon: 'calendar_month' },
]
const filterOptions: Array<{ label: string; value: Filter }> = [
  { label: 'Everything', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Done', value: 'done' },
]
const sortOptions: Array<{ label: string; value: SortKey }> = [
  { label: 'Smart (default)', value: 'smart' },
  { label: 'Manual (drag to reorder)', value: 'manual' },
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
const heroDateFormatter = new Intl.DateTimeFormat('en-SG', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
const calendarMonthFormatter = new Intl.DateTimeFormat('en-SG', {
  month: 'long',
  year: 'numeric',
})
const selectedDayFormatter = new Intl.DateTimeFormat('en-SG', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const tasks = ref<Task[]>(getTasks() as Task[])
const activeFilter = ref<Filter>('all')
const sortKey = ref<SortKey>('smart')
const categoryFilter = ref<Category | 'all'>('all')
const priorityFilter = ref<Priority | 'all'>('all')
const viewMode = ref<ViewMode>('board')
const searchTerm = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

// Composer modal state
const composerOpen = ref(false)
const newTitle = ref('')
const newDetails = ref('')
const newCategory = ref<Category>('Personal')
const newPriority = ref<Priority>('Medium')
const newDue = ref(todayInput)
const newRecurrence = ref<Recurrence>('none')
const newRecurrenceEnd = ref('')
const composerFirstFieldRef = ref<HTMLInputElement | null>(null)

// Edit modal state
const editingTask = ref<Task | null>(null)
const editTitle = ref('')
const editDetails = ref('')
const editCategory = ref<Category>('Personal')
const editPriority = ref<Priority>('Medium')
const editDue = ref('')
const editRecurrence = ref<Recurrence>('none')
const editRecurrenceEnd = ref('')
const editFirstFieldRef = ref<HTMLInputElement | null>(null)

// Help modal state
const helpOpen = ref(false)

// Toast notifications (with optional undo action)
const toasts = ref<Toast[]>([])
let toastIdCounter = 0
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>()
const dismissToast = (id: number) => {
  toasts.value = toasts.value.filter((t) => t.id !== id)
  const timer = toastTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    toastTimers.delete(id)
  }
}
const pushToast = (
  message: string,
  tone: Toast['tone'] = 'success',
  options: { action?: ToastAction; duration?: number } = {},
) => {
  const id = ++toastIdCounter
  const duration = options.duration ?? (options.action ? 5000 : 2800)
  toasts.value.push({ id, message, tone, action: options.action, duration })
  const timer = setTimeout(() => dismissToast(id), duration)
  toastTimers.set(id, timer)
  return id
}

// Drag-to-reorder state
const draggedTaskId = ref<number | null>(null)
const dragOverTaskId = ref<number | null>(null)

// Swipe gesture state (mobile / touch only)
const swipingTaskId = ref<number | null>(null)
const swipeOffset = ref(0)
const swipeAction = ref<'complete' | 'delete' | null>(null)
const suppressInlineClickTaskId = ref<number | null>(null)
let swipeStartX = 0
let swipeStartY = 0
let swipeDidMove = false
const SWIPE_TRIGGER_THRESHOLD = 96
const SWIPE_MAX_OFFSET = 148

// Completion celebration bursts
const celebrations = ref<CelebrationBurst[]>([])
let celebrationIdCounter = 0
const burstColors = ['#e5392d', '#ffdad5', '#ffc857', '#82d3de', '#fff8df']

// Inline title editing
const inlineEditingId = ref<number | null>(null)
const inlineEditingValue = ref('')
const inlineEditingRef = ref<HTMLInputElement | null>(null)

// Filters disclosure (collapsed by default)
const filtersOpen = ref(false)

// Calendar view state
const calendarMonth = ref(new Date(`${todayInput}T12:00:00`))
const selectedCalendarDate = ref(todayInput)

// Element refs for focus trap
const previouslyFocused = ref<HTMLElement | null>(null)

const isOverdue = (due: string): boolean => {
  const today = new Date().toLocaleDateString('en-CA')
  return due < today
}

const toInputDate = (date: Date): string => date.toLocaleDateString('en-CA')

const dateFromInput = (value: string): Date => new Date(`${value || todayInput}T12:00:00`)

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

const recurrenceLabel = (recurrence: Recurrence): string => {
  return recurrenceOptions.find((option) => option.value === recurrence)?.label ?? 'Does not repeat'
}

const recurrenceBadge = (recurrence: Recurrence): string => {
  if (recurrence === 'none') return ''
  return `Repeats ${recurrence}`
}

const recurrenceEndLabel = (task: Task): string => {
  if (task.recurrence === 'none') return ''
  if (!task.recurrenceEnd) return 'No end date'
  return `Until ${dateFormatter.format(dateFromInput(task.recurrenceEnd))}`
}

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const lastDayOfMonth = (year: number, monthIndex: number): number => {
  return new Date(year, monthIndex + 1, 0).getDate()
}

const addMonthsClamped = (date: Date, months: number): Date => {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  next.setDate(Math.min(day, lastDayOfMonth(next.getFullYear(), next.getMonth())))
  return next
}

const addYearsClamped = (date: Date, years: number): Date => {
  const next = new Date(date)
  const month = next.getMonth()
  const day = next.getDate()
  next.setFullYear(next.getFullYear() + years, month, 1)
  next.setDate(Math.min(day, lastDayOfMonth(next.getFullYear(), month)))
  return next
}

const advanceDate = (date: Date, recurrence: Recurrence): Date => {
  if (recurrence === 'daily') return addDays(date, 1)
  if (recurrence === 'weekly') return addDays(date, 7)
  if (recurrence === 'monthly') return addMonthsClamped(date, 1)
  if (recurrence === 'yearly') return addYearsClamped(date, 1)
  return new Date(date)
}

const recurrenceEndIsInvalid = (
  recurrence: Recurrence,
  due: string,
  recurrenceEnd: string,
): boolean => {
  return recurrence !== 'none' && !!recurrenceEnd && recurrenceEnd < due
}

const normalizedRecurrenceEnd = (
  recurrence: Recurrence,
  recurrenceEnd: string,
): string => {
  return recurrence === 'none' ? '' : recurrenceEnd
}

const nextRecurringDueAfter = (
  task: Task,
  afterDate: string,
): string | null => {
  if (task.recurrence === 'none') return null

  const end = task.recurrenceEnd ? dateFromInput(task.recurrenceEnd) : null
  let cursor = dateFromInput(task.due)
  const target = dateFromInput(afterDate)
  let guard = 0

  while (cursor <= target && guard < 500) {
    cursor = advanceDate(cursor, task.recurrence)
    guard++
  }

  if (end && cursor > end) return null
  return toInputDate(cursor)
}

const taskOccursOnDate = (task: Task, date: Date): boolean => {
  const dateKey = toInputDate(date)
  if (task.recurrence === 'none' || task.done) return task.due === dateKey
  if (dateKey < task.due) return false
  if (task.recurrenceEnd && dateKey > task.recurrenceEnd) return false

  const start = dateFromInput(task.due)
  if (task.recurrence === 'daily') return true
  if (task.recurrence === 'weekly') {
    const diffDays = Math.round((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays % 7 === 0
  }
  if (task.recurrence === 'monthly') {
    let cursor = start
    let guard = 0
    while (toInputDate(cursor) < dateKey && guard < 240) {
      cursor = addMonthsClamped(cursor, 1)
      guard++
    }
    return toInputDate(cursor) === dateKey
  }
  if (task.recurrence === 'yearly') {
    let cursor = start
    let guard = 0
    while (toInputDate(cursor) < dateKey && guard < 80) {
      cursor = addYearsClamped(cursor, 1)
      guard++
    }
    return toInputDate(cursor) === dateKey
  }
  return false
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

  // Pinned open tasks always float to the top; done tasks always sink.
  const pinWeight = (t: Task) => (t.done ? 2 : t.pinned ? 0 : 1)

  if (sortKey.value === 'manual') {
    return [...filtered].sort((a, b) => pinWeight(a) - pinWeight(b))
  }

  const sorters: Record<Exclude<SortKey, 'manual'>, (a: Task, b: Task) => number> = {
    smart: (a, b) =>
      pinWeight(a) - pinWeight(b) ||
      priorityWeight[a.priority] - priorityWeight[b.priority] ||
      b.createdAt - a.createdAt,
    due: (a, b) => pinWeight(a) - pinWeight(b) || a.due.localeCompare(b.due),
    priority: (a, b) =>
      pinWeight(a) - pinWeight(b) || priorityWeight[a.priority] - priorityWeight[b.priority],
    created: (a, b) => pinWeight(a) - pinWeight(b) || b.createdAt - a.createdAt,
    title: (a, b) => pinWeight(a) - pinWeight(b) || a.title.localeCompare(b.title),
  }

  return [...filtered].sort(sorters[sortKey.value])
})

const calendarLabel = computed(() => calendarMonthFormatter.format(calendarMonth.value))

const calendarOccurrencesByDate = computed(() => {
  const byDate = new Map<string, CalendarOccurrence[]>()
  const monthStart = new Date(calendarMonth.value)
  monthStart.setDate(1)
  monthStart.setHours(12, 0, 0, 0)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = addDays(monthStart, -mondayOffset)

  for (let index = 0; index < 42; index++) {
    const date = addDays(gridStart, index)
    const key = toInputDate(date)
    const occurrences: CalendarOccurrence[] = []

    for (const task of visibleTasks.value) {
      if (!taskOccursOnDate(task, date)) continue
      occurrences.push({
        id: `${task.id}-${key}`,
        date: key,
        task,
        isRecurring: task.recurrence !== 'none' && !task.done,
      })
    }

    occurrences.sort(
      (a, b) =>
        Number(a.task.done) - Number(b.task.done) ||
        priorityWeight[a.task.priority] - priorityWeight[b.task.priority] ||
        a.task.title.localeCompare(b.task.title),
    )
    byDate.set(key, occurrences)
  }

  return byDate
})

const calendarDays = computed<CalendarDay[]>(() => {
  const monthStart = new Date(calendarMonth.value)
  monthStart.setDate(1)
  monthStart.setHours(12, 0, 0, 0)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = addDays(monthStart, -mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    const key = toInputDate(date)
    return {
      key,
      label: date.getDate(),
      isToday: key === todayInput,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: key === selectedCalendarDate.value,
      occurrences: calendarOccurrencesByDate.value.get(key) ?? [],
    }
  })
})

const selectedCalendarOccurrences = computed(() => {
  return calendarOccurrencesByDate.value.get(selectedCalendarDate.value) ?? []
})

const selectedCalendarLabel = computed(() => {
  return selectedDayFormatter.format(dateFromInput(selectedCalendarDate.value))
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
    tasks.value.find((task) => !task.done && task.pinned) ??
    tasks.value.find((task) => !task.done && isOverdue(task.due)) ??
    tasks.value.find((task) => !task.done && task.priority === 'High') ??
    tasks.value.find((task) => !task.done) ??
    null
  )
})

const currentDateLabel = longDateFormatter.format(new Date())
const heroDateLabel = heroDateFormatter.format(new Date())

const anyModalOpen = computed(
  () => composerOpen.value || editingTask.value !== null || helpOpen.value,
)

const activeFilterCount = computed(() => {
  let count = 0
  if (activeFilter.value !== 'all') count++
  if (categoryFilter.value !== 'all') count++
  if (priorityFilter.value !== 'all') count++
  if (searchTerm.value.length > 0) count++
  if (sortKey.value !== 'smart') count++
  return count
})

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
  newRecurrence.value = 'none'
  newRecurrenceEnd.value = ''
  previouslyFocused.value?.focus()
}

function addTask() {
  const title = newTitle.value.trim()
  if (!title) return
  if (recurrenceEndIsInvalid(newRecurrence.value, newDue.value || todayInput, newRecurrenceEnd.value)) {
    pushToast('Repeat end must be on or after the due date', 'danger')
    return
  }

  createTask({
    title,
    details: newDetails.value.trim() || 'No extra notes added yet.',
    category: newCategory.value,
    priority: newPriority.value,
    due: newDue.value || todayInput,
    recurrence: newRecurrence.value,
    recurrenceEnd: normalizedRecurrenceEnd(newRecurrence.value, newRecurrenceEnd.value),
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

function spawnCelebration(originEl: Element | null) {
  if (prefersReducedMotion) return
  const rect = (originEl as HTMLElement | null)?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
  const id = ++celebrationIdCounter
  const particles: BurstParticle[] = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4
    const distance = 36 + Math.random() * 28
    return {
      id: i,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      color: burstColors[i % burstColors.length],
      size: 5 + Math.random() * 4,
    }
  })
  celebrations.value.push({ id, x, y, particles })
  setTimeout(() => {
    celebrations.value = celebrations.value.filter((c) => c.id !== id)
  }, 700)
}

function toggleTask(taskId: number, originEl?: Element | null) {
  const task = tasks.value.find((t) => t.id === taskId)
  if (!task) return

  if (!task.done && task.recurrence !== 'none') {
    completeRecurringTask(task, task.due, originEl ?? null)
    return
  }

  toggleTaskInDb(taskId)
  refresh()
  const becomingDone = !task.done
  if (becomingDone) {
    spawnCelebration(originEl ?? null)
  }
  pushToast(task?.done ? 'Marked as open' : 'Marked as done', 'info')
}

function completeRecurringTask(task: Task, occurrenceDate: string, originEl: Element | null) {
  const nextDue = nextRecurringDueAfter(task, occurrenceDate)
  if (nextDue) {
    updateTaskInDb(task.id, { due: nextDue, done: false })
    refresh()
    spawnCelebration(originEl)
    pushToast(`${recurrenceLabel(task.recurrence)} task moved to ${relativeDue(nextDue)}`, 'info')
    return
  }

  updateTaskInDb(task.id, { due: occurrenceDate, done: true })
  refresh()
  spawnCelebration(originEl)
  pushToast('Recurring series completed', 'success')
}

function togglePinned(taskId: number) {
  const task = tasks.value.find((t) => t.id === taskId)
  togglePinnedInDb(taskId)
  refresh()
  pushToast(task?.pinned ? 'Unpinned' : 'Pinned to top', 'info')
}

function openEditModal(task: Task) {
  previouslyFocused.value = document.activeElement as HTMLElement
  editingTask.value = task
  editTitle.value = task.title
  editDetails.value = task.details
  editCategory.value = task.category
  editPriority.value = task.priority
  editDue.value = task.due
  editRecurrence.value = task.recurrence
  editRecurrenceEnd.value = task.recurrenceEnd
  nextTick(() => editFirstFieldRef.value?.focus())
}

function closeEditModal() {
  editingTask.value = null
  editTitle.value = ''
  editDetails.value = ''
  editCategory.value = 'Personal'
  editPriority.value = 'Medium'
  editDue.value = ''
  editRecurrence.value = 'none'
  editRecurrenceEnd.value = ''
  previouslyFocused.value?.focus()
}

function saveTaskEdit() {
  if (!editingTask.value || !editTitle.value.trim()) return
  if (recurrenceEndIsInvalid(editRecurrence.value, editDue.value || todayInput, editRecurrenceEnd.value)) {
    pushToast('Repeat end must be on or after the due date', 'danger')
    return
  }

  updateTaskInDb(editingTask.value.id, {
    title: editTitle.value.trim(),
    details: editDetails.value.trim() || 'No extra notes added yet.',
    category: editCategory.value,
    priority: editPriority.value,
    due: editDue.value,
    recurrence: editRecurrence.value,
    recurrenceEnd: normalizedRecurrenceEnd(editRecurrence.value, editRecurrenceEnd.value),
  })
  refresh()
  pushToast('Task updated')
  closeEditModal()
}

function deleteTaskWithUndo(taskId: number) {
  const target = tasks.value.find((t) => t.id === taskId)
  if (!target) return
  const snapshot = tasks.value.map((t) => ({ ...t }))
  deleteTaskInDb(taskId)
  refresh()
  pushToast(`Deleted "${truncate(target.title, 40)}"`, 'danger', {
    action: {
      label: 'Undo',
      handler: () => {
        replaceAllInDb(snapshot)
        refresh()
        pushToast('Task restored', 'success')
      },
    },
  })
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function focusSearch() {
  searchInputRef.value?.focus()
  searchInputRef.value?.select()
}

function clearCompleted() {
  const removed = doneCount.value
  if (removed === 0) return
  const snapshot = tasks.value.map((t) => ({ ...t }))
  clearCompletedInDb()
  refresh()
  pushToast(`Cleared ${removed} completed task${removed === 1 ? '' : 's'}`, 'info', {
    action: {
      label: 'Undo',
      handler: () => {
        replaceAllInDb(snapshot)
        refresh()
        pushToast('Restored cleared tasks', 'success')
      },
    },
  })
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

function jumpToToday() {
  activeFilter.value = 'open'
  sortKey.value = 'due'
  searchTerm.value = ''
  selectedCalendarDate.value = todayInput
  calendarMonth.value = dateFromInput(todayInput)
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

function setViewMode(mode: ViewMode) {
  viewMode.value = mode
  if (mode === 'calendar') {
    const selected = dateFromInput(selectedCalendarDate.value)
    calendarMonth.value = selected
  }
}

function changeCalendarMonth(delta: number) {
  calendarMonth.value = addMonthsClamped(calendarMonth.value, delta)
}

function resetCalendarToToday() {
  selectedCalendarDate.value = todayInput
  calendarMonth.value = dateFromInput(todayInput)
}

function selectCalendarDay(date: string) {
  selectedCalendarDate.value = date
  calendarMonth.value = dateFromInput(date)
}

function completeCalendarOccurrence(occurrence: CalendarOccurrence, originEl?: Element | null) {
  if (occurrence.task.recurrence !== 'none' && !occurrence.task.done) {
    completeRecurringTask(occurrence.task, occurrence.date, originEl ?? null)
    return
  }
  toggleTask(occurrence.task.id, originEl)
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

  // ESC closes any open modal or inline edit
  if (event.key === 'Escape') {
    if (helpOpen.value) {
      helpOpen.value = false
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
    if (inlineEditingId.value !== null) {
      cancelInlineEdit()
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

// ── Drag-to-reorder (desktop) ──────────────────────────────────────────
function onDragStart(event: DragEvent, taskId: number) {
  if (sortKey.value !== 'manual') {
    event.preventDefault()
    return
  }
  draggedTaskId.value = taskId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(taskId))
  }
}

function onDragOver(event: DragEvent, taskId: number) {
  if (draggedTaskId.value === null || sortKey.value !== 'manual') return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverTaskId.value = taskId
}

function onDrop(event: DragEvent, targetId: number) {
  event.preventDefault()
  const sourceId = draggedTaskId.value
  draggedTaskId.value = null
  dragOverTaskId.value = null
  if (sourceId === null || sourceId === targetId) return

  const current = tasks.value.slice()
  const sourceIdx = current.findIndex((t) => t.id === sourceId)
  const targetIdx = current.findIndex((t) => t.id === targetId)
  if (sourceIdx < 0 || targetIdx < 0) return
  const [moved] = current.splice(sourceIdx, 1)
  current.splice(targetIdx, 0, moved)
  reorderTasksInDb(current.map((t) => t.id))
  refresh()
}

function onDragEnd() {
  draggedTaskId.value = null
  dragOverTaskId.value = null
}

// ── Mobile swipe gestures ──────────────────────────────────────────────
function onSwipeStart(event: PointerEvent, taskId: number) {
  if (event.pointerType !== 'touch') return
  if (inlineEditingId.value === taskId) return
  const target = event.target as Element | null
  if (target?.closest('button, input, textarea, select, a, .task-checkbox, .task-card__drag-handle')) {
    return
  }
  swipingTaskId.value = taskId
  swipeOffset.value = 0
  swipeAction.value = null
  swipeStartX = event.clientX
  swipeStartY = event.clientY
  swipeDidMove = false
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
}

function onSwipeMove(event: PointerEvent, taskId: number) {
  if (swipingTaskId.value !== taskId) return
  const dx = event.clientX - swipeStartX
  const dy = event.clientY - swipeStartY
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
    // vertical scroll — abandon swipe
    swipingTaskId.value = null
    swipeOffset.value = 0
    swipeAction.value = null
    return
  }
  if (Math.abs(dx) > 8) {
    swipeDidMove = true
    event.preventDefault()
  }
  swipeOffset.value = Math.max(-SWIPE_MAX_OFFSET, Math.min(SWIPE_MAX_OFFSET, dx))
  if (dx > SWIPE_TRIGGER_THRESHOLD) swipeAction.value = 'complete'
  else if (dx < -SWIPE_TRIGGER_THRESHOLD) swipeAction.value = 'delete'
  else swipeAction.value = null
}

function onSwipeEnd(taskId: number, originEl?: Element | null) {
  if (swipingTaskId.value !== taskId) return
  const action = swipeAction.value
  swipingTaskId.value = null
  swipeOffset.value = 0
  swipeAction.value = null
  if (swipeDidMove) {
    suppressInlineClickTaskId.value = taskId
    setTimeout(() => {
      if (suppressInlineClickTaskId.value === taskId) suppressInlineClickTaskId.value = null
    }, 0)
  }
  if (action === 'complete') {
    toggleTask(taskId, originEl)
  } else if (action === 'delete') {
    deleteTaskWithUndo(taskId)
  }
}

function cancelSwipe(taskId: number) {
  if (swipingTaskId.value !== taskId) return
  swipingTaskId.value = null
  swipeOffset.value = 0
  swipeAction.value = null
  swipeDidMove = false
}

// ── Inline title editing ───────────────────────────────────────────────
function startInlineEdit(task: Task) {
  if (suppressInlineClickTaskId.value === task.id) {
    suppressInlineClickTaskId.value = null
    return
  }
  if (task.done) return
  inlineEditingId.value = task.id
  inlineEditingValue.value = task.title
  nextTick(() => {
    inlineEditingRef.value?.focus()
    inlineEditingRef.value?.select()
  })
}

function saveInlineEdit() {
  if (inlineEditingId.value === null) return
  const trimmed = inlineEditingValue.value.trim()
  if (trimmed) {
    updateTaskInDb(inlineEditingId.value, { title: trimmed })
    refresh()
    pushToast('Title updated', 'info')
  }
  inlineEditingId.value = null
  inlineEditingValue.value = ''
}

function cancelInlineEdit() {
  inlineEditingId.value = null
  inlineEditingValue.value = ''
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
  toastTimers.forEach((timer) => clearTimeout(timer))
  toastTimers.clear()
})

// Prevent body scroll when modal is open
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

watch(newRecurrence, (recurrence) => {
  if (recurrence === 'none') newRecurrenceEnd.value = ''
})

watch(editRecurrence, (recurrence) => {
  if (recurrence === 'none') editRecurrenceEnd.value = ''
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

    <main class="main-board">
      <!-- Today hero: date masthead + spotlight + inline stat strip -->
      <section class="today-hero panel" aria-labelledby="today-hero-heading">
        <header class="today-hero__header">
          <p class="eyebrow">{{ filterLabel }} · {{ visibleTasks.length }} {{ visibleTasks.length === 1 ? 'task' : 'tasks' }}</p>
          <h1 id="today-hero-heading">{{ heroDateLabel }}</h1>
        </header>

        <div v-if="spotlightTask" class="today-hero__spotlight">
          <p class="panel-kicker">Next up</p>
          <h2>{{ spotlightTask.title }}</h2>
          <p class="today-hero__details">{{ spotlightTask.details }}</p>
          <p class="today-hero__meta">
            <span class="material-symbols-outlined">{{ categoryIcon(spotlightTask.category) }}</span>
            {{ spotlightTask.category }}
            <span class="dot" aria-hidden="true">•</span>
            {{ spotlightTask.priority }}
            <span class="dot" aria-hidden="true">•</span>
            <span :class="dueTone(spotlightTask)">{{ relativeDue(spotlightTask.due) }}</span>
          </p>
          <div class="today-hero__actions">
            <button class="ghost-button ghost-button--light" type="button" @click="openEditModal(spotlightTask)">
              Edit
            </button>
            <button class="submit-button submit-button--light" type="button" @click="(e) => toggleTask(spotlightTask!.id, (e.currentTarget as HTMLElement))">
              {{ spotlightTask.done ? 'Reopen' : 'Mark done' }}
            </button>
          </div>
        </div>
        <div v-else-if="totalCount === 0" class="today-hero__spotlight today-hero__spotlight--empty">
          <p class="panel-kicker">Get started</p>
          <h2>Your board is empty.</h2>
          <p class="today-hero__details">Capture the first thing on your mind — quick add below or <kbd>N</kbd> for the full form.</p>
        </div>
        <div v-else class="today-hero__spotlight today-hero__spotlight--empty">
          <p class="panel-kicker">All clear</p>
          <h2>Every task is done. ✓</h2>
          <p class="today-hero__details">Nice work. Add a new task or reopen something you finished.</p>
        </div>

        <div class="today-hero__stats" role="group" aria-label="Quick stats">
          <button
            class="hero-stat"
            type="button"
            @click="clearAllFilters"
            :class="{ 'is-pressed': activeFilter === 'all' && !hasActiveFilters }"
          >
            <strong>{{ totalCount }}</strong>
            <span>Total</span>
          </button>
          <button
            class="hero-stat"
            type="button"
            @click="jumpToOpen"
            :class="{ 'is-pressed': activeFilter === 'open' }"
          >
            <strong>{{ openCount }}</strong>
            <span>Open</span>
          </button>
          <button
            class="hero-stat hero-stat--accent"
            type="button"
            @click="jumpToToday"
            :disabled="todayCount === 0"
          >
            <strong>{{ todayCount }}</strong>
            <span>Today</span>
          </button>
          <button
            class="hero-stat hero-stat--warn"
            type="button"
            @click="jumpToHighPriority"
            :disabled="highPriorityCount === 0"
          >
            <strong>{{ highPriorityCount }}</strong>
            <span>High</span>
          </button>
          <button
            class="hero-stat hero-stat--danger"
            type="button"
            @click="jumpToOverdue"
            :disabled="overdueCount === 0"
          >
            <strong>{{ overdueCount }}</strong>
            <span>Overdue</span>
          </button>
          <div class="hero-stat hero-stat--progress" aria-label="Completion rate">
            <strong>{{ completionRate }}%</strong>
            <span>Done</span>
            <div class="progress-bar" aria-hidden="true">
              <div class="progress-bar__fill" :style="{ width: `${completionRate}%` }"></div>
            </div>
          </div>
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
          <div class="segmented-control segmented-control--view" role="tablist" aria-label="View mode">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              type="button"
              class="segmented-control__item segmented-control__item--icon"
              :class="{ 'is-active': viewMode === option.value }"
              @click="setViewMode(option.value)"
              role="tab"
              :aria-selected="viewMode === option.value"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ option.icon }}</span>
              {{ option.label }}
            </button>
          </div>

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

        <div class="toolbar__disclosure">
          <button
            class="chip chip--disclosure"
            type="button"
            @click="filtersOpen = !filtersOpen"
            :aria-expanded="filtersOpen"
            aria-controls="filter-chips"
          >
            <span class="material-symbols-outlined">tune</span>
            Filters
            <span v-if="activeFilterCount > 0" class="badge badge--inline">{{ activeFilterCount }}</span>
            <span class="material-symbols-outlined chip-disclosure__caret" aria-hidden="true">
              {{ filtersOpen ? 'expand_less' : 'expand_more' }}
            </span>
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

        <div v-show="filtersOpen" id="filter-chips" class="toolbar__chips">
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
        </div>
      </section>

      <!-- Tasks region -->
      <section id="tasks-region" class="tasks-panel panel" aria-label="Tasks">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">{{ viewMode === 'calendar' ? 'Calendar' : 'Board' }}</p>
            <h2 v-if="viewMode === 'calendar'">{{ calendarLabel }}</h2>
            <h2 v-else>{{ visibleTasks.length }} {{ visibleTasks.length === 1 ? 'task' : 'tasks' }}</h2>
          </div>
          <span v-if="hasActiveFilters" class="badge badge--dark">Filtered</span>
        </div>

        <template v-if="viewMode === 'board'">
          <transition-group v-if="visibleTasks.length" name="card" tag="div" class="task-grid">
            <div
              v-for="task in visibleTasks"
              :key="task.id"
              class="task-card-wrap"
              :class="{
                'is-swiping': swipingTaskId === task.id,
                'swipe-complete': swipingTaskId === task.id && swipeAction === 'complete',
                'swipe-delete': swipingTaskId === task.id && swipeAction === 'delete',
                'is-dragging': draggedTaskId === task.id,
                'is-drag-target': dragOverTaskId === task.id && draggedTaskId !== task.id,
              }"
            >
              <div class="swipe-action swipe-action--complete" aria-hidden="true">
                <span class="material-symbols-outlined">check_circle</span>
                <span>Complete</span>
              </div>
              <div class="swipe-action swipe-action--delete" aria-hidden="true">
                <span>Delete</span>
                <span class="material-symbols-outlined">delete</span>
              </div>
              <article
                class="task-card"
                :class="[
                  cardTone(task.category),
                  {
                    'is-done': task.done,
                    'is-overdue': !task.done && isOverdue(task.due),
                    'is-pinned': task.pinned && !task.done,
                    'is-draggable': sortKey === 'manual',
                  },
                ]"
                :draggable="sortKey === 'manual' && inlineEditingId !== task.id ? 'true' : 'false'"
                @dragstart="onDragStart($event, task.id)"
                @dragover="onDragOver($event, task.id)"
                @drop="onDrop($event, task.id)"
                @dragend="onDragEnd"
                @pointerdown="onSwipeStart($event, task.id)"
                @pointermove="onSwipeMove($event, task.id)"
                @pointerup="(e) => onSwipeEnd(task.id, (e.currentTarget as HTMLElement)?.querySelector('.task-checkbox__box'))"
                @pointercancel="cancelSwipe(task.id)"
                :style="swipingTaskId === task.id ? { transform: `translateX(${swipeOffset}px)` } : undefined"
              >
                <div class="task-card__row">
                  <span
                    v-if="sortKey === 'manual'"
                    class="task-card__drag-handle"
                    aria-hidden="true"
                    title="Drag to reorder"
                  >
                    <span class="material-symbols-outlined">drag_indicator</span>
                  </span>
                  <label class="task-checkbox" :title="task.done ? 'Mark as open' : 'Mark as done'">
                    <input
                      type="checkbox"
                      :checked="task.done"
                      @change="(e) => toggleTask(task.id, (e.currentTarget as HTMLInputElement).closest('.task-checkbox')?.querySelector('.task-checkbox__box'))"
                      :aria-label="task.done ? `Reopen ${task.title}` : `Complete ${task.title}`"
                    />
                    <span class="task-checkbox__box" aria-hidden="true">
                      <span class="material-symbols-outlined">check</span>
                    </span>
                  </label>

                  <div class="task-card__body">
                    <div class="task-card__head">
                      <span v-if="task.pinned && !task.done" class="pin-indicator" aria-label="Pinned">
                        <span class="material-symbols-outlined">push_pin</span>
                      </span>
                      <span class="task-card__label">
                        <span class="material-symbols-outlined" aria-hidden="true">{{ categoryIcons[task.category] }}</span>
                        {{ task.category }}
                      </span>
                      <span
                        class="prio-pill"
                        :class="`prio-pill--${task.priority.toLowerCase()}`"
                      >{{ task.priority }}</span>
                    </div>
                    <form
                      v-if="inlineEditingId === task.id"
                      class="task-card__title-edit"
                      @submit.prevent="saveInlineEdit"
                    >
                      <input
                        ref="inlineEditingRef"
                        v-model="inlineEditingValue"
                        type="text"
                        @keydown.esc.prevent="cancelInlineEdit"
                        @blur="saveInlineEdit"
                        :aria-label="`Edit title for ${task.title}`"
                      />
                    </form>
                    <h3
                      v-else
                      class="task-card__title"
                      :class="{ 'is-editable': !task.done }"
                      @click="startInlineEdit(task)"
                      :title="task.done ? '' : 'Click to edit title'"
                    >{{ task.title }}</h3>
                    <p v-if="task.details" class="task-card__details">{{ task.details }}</p>
                  </div>

                  <div class="task-card__controls">
                    <button
                      class="icon-button icon-button--ghost"
                      :class="task.pinned ? 'icon-button--pinned' : 'icon-button--accent'"
                      type="button"
                      @click="togglePinned(task.id)"
                      :aria-label="task.pinned ? 'Unpin task' : 'Pin task to top'"
                      :title="task.pinned ? 'Unpin' : 'Pin to top'"
                    >
                      <span class="material-symbols-outlined">{{ task.pinned ? 'keep' : 'push_pin' }}</span>
                    </button>
                    <button
                      class="icon-button icon-button--ghost icon-button--accent"
                      type="button"
                      @click="openEditModal(task)"
                      aria-label="Edit task details"
                      title="Edit details"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      class="icon-button icon-button--ghost icon-button--danger"
                      type="button"
                      @click="deleteTaskWithUndo(task.id)"
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
                  <span v-if="task.recurrence !== 'none'" class="recurrence-pill">
                    <span class="material-symbols-outlined" aria-hidden="true">repeat</span>
                    {{ recurrenceBadge(task.recurrence) }}
                    <span class="recurrence-pill__end">{{ recurrenceEndLabel(task) }}</span>
                  </span>
                </div>
              </article>
            </div>
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
        </template>

        <div v-else class="calendar-view">
          <div class="calendar-controls">
            <button class="icon-button icon-button--ghost" type="button" @click="changeCalendarMonth(-1)" aria-label="Previous month">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button class="ghost-button ghost-button--inline" type="button" @click="resetCalendarToToday">
              Today
            </button>
            <button class="icon-button icon-button--ghost" type="button" @click="changeCalendarMonth(1)" aria-label="Next month">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div class="calendar-grid" role="grid" aria-label="Task calendar">
            <div v-for="weekday in weekdayLabels" :key="weekday" class="calendar-weekday" role="columnheader">
              {{ weekday }}
            </div>
            <button
              v-for="day in calendarDays"
              :key="day.key"
              class="calendar-day"
              :class="{
                'is-muted': !day.isCurrentMonth,
                'is-today': day.isToday,
                'is-selected': day.isSelected,
                'has-tasks': day.occurrences.length > 0,
              }"
              type="button"
              role="gridcell"
              @click="selectCalendarDay(day.key)"
              :aria-label="`${day.key}, ${day.occurrences.length} ${day.occurrences.length === 1 ? 'task' : 'tasks'}`"
            >
              <span class="calendar-day__number">{{ day.label }}</span>
              <span v-if="day.occurrences.length" class="calendar-day__count">{{ day.occurrences.length }}</span>
              <span class="calendar-day__tasks" aria-hidden="true">
                <span
                  v-for="occurrence in day.occurrences.slice(0, 3)"
                  :key="occurrence.id"
                  class="calendar-dot"
                  :class="[
                    `calendar-dot--${occurrence.task.priority.toLowerCase()}`,
                    { 'calendar-dot--recurring': occurrence.isRecurring },
                  ]"
                ></span>
              </span>
            </button>
          </div>

          <aside class="calendar-agenda" aria-live="polite">
            <div class="calendar-agenda__heading">
              <div>
                <p class="panel-kicker">Selected day</p>
                <h3>{{ selectedCalendarLabel }}</h3>
              </div>
              <span class="badge">{{ selectedCalendarOccurrences.length }} {{ selectedCalendarOccurrences.length === 1 ? 'task' : 'tasks' }}</span>
            </div>

            <div v-if="selectedCalendarOccurrences.length" class="calendar-agenda__list">
              <article
                v-for="occurrence in selectedCalendarOccurrences"
                :key="occurrence.id"
                class="calendar-agenda__task"
                :class="[cardTone(occurrence.task.category), { 'is-done': occurrence.task.done, 'is-overdue': !occurrence.task.done && occurrence.date < todayInput }]"
              >
                <div>
                  <p class="task-card__label">
                    <span class="material-symbols-outlined" aria-hidden="true">{{ categoryIcons[occurrence.task.category] }}</span>
                    {{ occurrence.task.category }}
                    <span class="prio-pill" :class="`prio-pill--${occurrence.task.priority.toLowerCase()}`">{{ occurrence.task.priority }}</span>
                  </p>
                  <h4>{{ occurrence.task.title }}</h4>
                  <p v-if="occurrence.task.details">{{ occurrence.task.details }}</p>
                  <span v-if="occurrence.task.recurrence !== 'none'" class="recurrence-pill">
                    <span class="material-symbols-outlined" aria-hidden="true">repeat</span>
                    {{ recurrenceBadge(occurrence.task.recurrence) }}
                    <span class="recurrence-pill__end">{{ recurrenceEndLabel(occurrence.task) }}</span>
                  </span>
                </div>
                <div class="calendar-agenda__actions">
                  <button class="icon-button icon-button--ghost icon-button--accent" type="button" @click="openEditModal(occurrence.task)" aria-label="Edit task">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-button icon-button--ghost" type="button" @click="(e) => completeCalendarOccurrence(occurrence, (e.currentTarget as HTMLElement))" :aria-label="occurrence.task.done ? 'Reopen task' : 'Complete task'">
                    <span class="material-symbols-outlined">{{ occurrence.task.done ? 'refresh' : 'check' }}</span>
                  </button>
                </div>
              </article>
            </div>

            <div v-else class="calendar-agenda__empty">
              <p class="panel-kicker">Open space</p>
              <h3>No tasks due here.</h3>
              <button class="submit-button submit-button--compact" type="button" @click="openComposer">
                <span class="material-symbols-outlined">add</span>
                New task
              </button>
            </div>
          </aside>
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

            <label>
              <span>Repeats</span>
              <select v-model="newRecurrence">
                <option v-for="option in recurrenceOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label v-if="newRecurrence !== 'none'">
              <span>Repeat until</span>
              <input v-model="newRecurrenceEnd" type="date" :min="newDue || todayInput" />
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

            <label>
              <span>Repeats</span>
              <select v-model="editRecurrence">
                <option v-for="option in recurrenceOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label v-if="editRecurrence !== 'none'">
              <span>Repeat until</span>
              <input v-model="editRecurrenceEnd" type="date" :min="editDue || todayInput" />
            </label>
          </div>

          <div class="modal-actions">
            <button class="ghost-button" type="button" @click="closeEditModal">Cancel</button>
            <button class="submit-button" type="submit">Save changes</button>
          </div>
        </form>
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
            <div><dt><kbd>Esc</kbd></dt><dd>Close modal · clear search · cancel inline edit</dd></div>
            <div><dt><kbd>Enter</kbd></dt><dd>Quick add: create · Inline edit: save</dd></div>
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
          :class="[`toast--${toast.tone}`, { 'toast--actionable': !!toast.action }]"
          role="status"
        >
          <span class="material-symbols-outlined toast__icon" aria-hidden="true">
            {{ toast.tone === 'danger' ? 'delete' : toast.tone === 'info' ? 'info' : 'check_circle' }}
          </span>
          <span class="toast__message">{{ toast.message }}</span>
          <button
            v-if="toast.action"
            class="toast__action"
            type="button"
            @click="() => { toast.action!.handler(); dismissToast(toast.id) }"
          >
            {{ toast.action.label }}
          </button>
          <span
            v-if="toast.action"
            class="toast__progress"
            :style="{ animationDuration: `${toast.duration}ms` }"
            aria-hidden="true"
          ></span>
        </div>
      </transition-group>
    </div>

    <!-- Completion celebration bursts -->
    <div class="celebration-layer" aria-hidden="true">
      <div
        v-for="burst in celebrations"
        :key="burst.id"
        class="celebration-burst"
        :style="{ left: `${burst.x}px`, top: `${burst.y}px` }"
      >
        <span
          v-for="p in burst.particles"
          :key="p.id"
          class="celebration-particle"
          :style="{
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--color': p.color,
            '--size': `${p.size}px`,
          } as Record<string, string>"
        ></span>
      </div>
    </div>
  </div>
</template>
