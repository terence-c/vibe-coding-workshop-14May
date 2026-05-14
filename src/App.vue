<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Filter = 'all' | 'open' | 'done'
type Priority = 'High' | 'Medium' | 'Low'
type Category = 'Tool' | 'Study' | 'Build' | 'Personal' | 'Admin'

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

const STORAGE_KEY = 'dschool-todo-app'

const seedTasks: Task[] = [
  {
    id: 1,
    title: 'Outline the workshop flow',
    details: 'Map the warm-up, brainstorm, and reflection blocks before the session starts.',
    category: 'Build',
    priority: 'High',
    due: '2026-05-14',
    done: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
  },
  {
    id: 2,
    title: 'Review feedback notes',
    details: 'Merge the latest participant comments into the next iteration board.',
    category: 'Study',
    priority: 'Medium',
    due: '2026-05-15',
    done: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: 3,
    title: 'Book the meeting room',
    details: 'Reserve the larger room for the afternoon critique and set up the screen.',
    category: 'Admin',
    priority: 'Low',
    due: '2026-05-16',
    done: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: 4,
    title: 'Draft the team update',
    details: 'Summarize progress, blockers, and the next milestone in a short note.',
    category: 'Personal',
    priority: 'Medium',
    due: '2026-05-17',
    done: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 16,
  },
]

const categoryOptions: Category[] = ['Tool', 'Study', 'Build', 'Personal', 'Admin']
const priorityOptions: Priority[] = ['High', 'Medium', 'Low']
const filterOptions: Array<{ label: string; value: Filter }> = [
  { label: 'Everything', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Done', value: 'done' },
]

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

function loadTasks(): Task[] {
  if (typeof window === 'undefined') {
    return seedTasks
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return seedTasks
  }

  try {
    const parsed = JSON.parse(stored) as Task[]

    return parsed.length ? parsed : seedTasks
  } catch {
    return seedTasks
  }
}

const tasks = ref<Task[]>(loadTasks())
const activeFilter = ref<Filter>('all')
const searchTerm = ref('')
const newTitle = ref('')
const newDetails = ref('')
const newCategory = ref<Category>('Tool')
const newPriority = ref<Priority>('High')
const newDue = ref(todayInput)

const nextId = computed(() => {
  return tasks.value.reduce((highest, task) => Math.max(highest, task.id), 0) + 1
})

const visibleTasks = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()

  return tasks.value
    .filter((task) => {
      if (activeFilter.value === 'open' && task.done) {
        return false
      }

      if (activeFilter.value === 'done' && !task.done) {
        return false
      }

      if (!query) {
        return true
      }

      return [task.title, task.details, task.category, task.priority]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
    .sort((left, right) => Number(left.done) - Number(right.done) || right.createdAt - left.createdAt)
})

const totalCount = computed(() => tasks.value.length)
const openCount = computed(() => tasks.value.filter((task) => !task.done).length)
const doneCount = computed(() => tasks.value.filter((task) => task.done).length)
const highPriorityCount = computed(
  () => tasks.value.filter((task) => !task.done && task.priority === 'High').length,
)
const completionRate = computed(() => {
  if (!tasks.value.length) {
    return 0
  }

  return Math.round((doneCount.value / tasks.value.length) * 100)
})

const filterLabel = computed(
  () => filterOptions.find((option) => option.value === activeFilter.value)?.label ?? 'Everything',
)

const spotlightTask = computed(() => {
  return (
    tasks.value.find((task) => !task.done && task.priority === 'High') ??
    tasks.value.find((task) => !task.done) ??
    tasks.value[0] ??
    null
  )
})

const currentDateLabel = longDateFormatter.format(new Date())

function addTask() {
  const title = newTitle.value.trim()

  if (!title) {
    return
  }

  tasks.value.unshift({
    id: nextId.value,
    title,
    details: newDetails.value.trim() || 'No extra notes added yet.',
    category: newCategory.value,
    priority: newPriority.value,
    due: newDue.value || todayInput,
    done: false,
    createdAt: Date.now(),
  })

  newTitle.value = ''
  newDetails.value = ''
  newCategory.value = 'Tool'
  newPriority.value = 'High'
  newDue.value = todayInput
}

function toggleTask(taskId: number) {
  tasks.value = tasks.value.map((task) =>
    task.id === taskId ? { ...task, done: !task.done } : task,
  )
}

function removeTask(taskId: number) {
  tasks.value = tasks.value.filter((task) => task.id !== taskId)
}

function clearCompleted() {
  tasks.value = tasks.value.filter((task) => !task.done)
}

function dueText(due: string) {
  if (!due) {
    return 'No date'
  }

  const parsed = new Date(`${due}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return due
  }

  return dateFormatter.format(parsed)
}

function cardTone(category: Category) {
  return `card--${category.toLowerCase()}`
}

watch(
  tasks,
  (value) => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)
</script>

<template>
  <div class="app-shell">
    <div class="grid-overlay" aria-hidden="true"></div>

    <header class="masthead">
      <p class="eyebrow">I'm organizing...</p>
      <div class="masthead__title-row">
        <button class="hero-orb" type="button" aria-hidden="true">
          <span class="material-symbols-outlined">expand_more</span>
        </button>
        <h1>{{ filterLabel }}</h1>
      </div>
      <p class="masthead__lede">
        Capture work quickly, sort it by signal, and keep the board moving with a clean studio
        rhythm.
      </p>
    </header>

    <nav class="topbar" aria-label="Primary">
      <div class="brand-block">
        <span class="brand-mark">d.</span>
        <div>
          <p class="brand-name">Studio Todo</p>
          <p class="brand-caption">d.school-inspired task system</p>
        </div>
      </div>

      <div class="topbar__actions">
        <div class="stat-pill">
          <span class="stat-pill__label">Today</span>
          <span class="stat-pill__value">{{ currentDateLabel }}</span>
        </div>
        <button class="icon-button" type="button" aria-label="Search tasks">
          <span class="material-symbols-outlined">search</span>
        </button>
      </div>
    </nav>

    <main class="main-board">
      <section class="panel panel--hero">
        <div class="hero-copy">
          <p class="panel-kicker">Focus stack</p>
          <h2>Run the board like a workshop wall.</h2>
          <p>
            Keep one place for all your tasks, one view for what is next, and one clear path to
            done.
          </p>
        </div>

        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat__label">Total</span>
            <strong>{{ totalCount }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__label">Open</span>
            <strong>{{ openCount }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__label">Done</span>
            <strong>{{ doneCount }}</strong>
          </div>
          <div class="hero-stat hero-stat--accent">
            <span class="hero-stat__label">Completion</span>
            <strong>{{ completionRate }}%</strong>
          </div>
        </div>

        <div class="hero-spotlight" v-if="spotlightTask">
          <p class="panel-kicker">Next up</p>
          <h3>{{ spotlightTask.title }}</h3>
          <p>{{ spotlightTask.details }}</p>
        </div>
      </section>

      <section class="panel panel--composer">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Tool</p>
            <h2>Add a task</h2>
          </div>
          <span class="badge badge--dark">Quick capture</span>
        </div>

        <form class="task-form" @submit.prevent="addTask">
          <label>
            <span>Task name</span>
            <input v-model="newTitle" type="text" placeholder="Ship the new workshop agenda" />
          </label>

          <label>
            <span>Notes</span>
            <textarea
              v-model="newDetails"
              rows="4"
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

          <button class="submit-button" type="submit">Add to board</button>
        </form>
      </section>

      <section class="panel panel--filters">
        <div class="panel-heading panel-heading--stack">
          <div>
            <p class="panel-kicker">Sort</p>
            <h2>Filter, search, and clean up</h2>
          </div>
          <button class="ghost-button" type="button" @click="clearCompleted" :disabled="doneCount === 0">
            Clear done
          </button>
        </div>

        <label class="search-field">
          <span>Search</span>
          <div>
            <span class="material-symbols-outlined">search</span>
            <input v-model="searchTerm" type="search" placeholder="Search title, notes, or tag" />
          </div>
        </label>

        <div class="segmented-control" role="tablist" aria-label="Task filters">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="segmented-control__item"
            :class="{ 'is-active': activeFilter === option.value }"
            @click="activeFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="mini-summary">
          <div>
            <span>High priority</span>
            <strong>{{ highPriorityCount }}</strong>
          </div>
          <div>
            <span>Visible</span>
            <strong>{{ visibleTasks.length }}</strong>
          </div>
        </div>
      </section>

      <section class="tasks-panel panel">
        <div class="panel-heading panel-heading--stack">
          <div>
            <p class="panel-kicker">Board</p>
            <h2>Tasks</h2>
          </div>
          <span class="badge">{{ visibleTasks.length }} shown</span>
        </div>

        <div v-if="visibleTasks.length" class="task-grid">
          <article
            v-for="task in visibleTasks"
            :key="task.id"
            class="task-card"
            :class="[cardTone(task.category), { 'is-done': task.done }]"
          >
            <div class="task-card__top">
              <div>
                <span class="task-card__label">{{ task.category }}</span>
                <h3>{{ task.title }}</h3>
              </div>
              <button
                class="icon-button icon-button--small"
                type="button"
                @click="removeTask(task.id)"
                aria-label="Remove task"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <p class="task-card__details">{{ task.details }}</p>

            <div class="task-card__meta">
              <span>Due {{ dueText(task.due) }}</span>
              <span>{{ task.priority }}</span>
            </div>

            <label class="task-toggle">
              <input type="checkbox" :checked="task.done" @change="toggleTask(task.id)" />
              <span>{{ task.done ? 'Mark as open' : 'Mark as done' }}</span>
            </label>
          </article>
        </div>

        <div v-else class="empty-state">
          <p class="panel-kicker">Nothing here</p>
          <h3>No tasks match the current filter.</h3>
          <p>Reset the filter or add a fresh item to bring the board back to life.</p>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div>
        <p class="brand-name">d.school style, todo logic.</p>
        <p class="brand-caption">Built for quick capture, visual sorting, and local persistence.</p>
      </div>

      <div class="site-footer__links">
        <a href="#">About</a>
        <a href="#">Study</a>
        <a href="#">Innovate</a>
        <a href="#">Privacy</a>
      </div>
    </footer>
  </div>
</template>
