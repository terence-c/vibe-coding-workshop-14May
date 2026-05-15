const STORAGE_KEY = 'dschool-todo-app'

const seedTasks = [
  {
    id: 1,
    title: 'Outline the workshop flow',
    details: 'Map the warm-up, brainstorm, and reflection blocks before the session starts.',
    category: 'Build',
    priority: 'High',
    due: '2026-05-14',
    done: false,
    pinned: false,
    recurrence: 'weekly',
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
    pinned: false,
    recurrence: 'none',
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
    pinned: false,
    recurrence: 'none',
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
    pinned: false,
    recurrence: 'monthly',
    createdAt: Date.now() - 1000 * 60 * 60 * 16,
  },
]

function migrate(task) {
  return { pinned: false, recurrence: 'none', ...task }
}

function read() {
  if (typeof window === 'undefined') {
    return seedTasks.map(migrate)
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return seedTasks.map(migrate)
  }

  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map(migrate)
    }
    return seedTasks.map(migrate)
  } catch {
    return seedTasks.map(migrate)
  }
}

function write(tasks) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function nextId(tasks) {
  return tasks.reduce((highest, task) => Math.max(highest, task.id), 0) + 1
}

export function getTasks() {
  return read()
}

export function getTask(id) {
  return read().find((task) => task.id === id) ?? null
}

export function createTask(input) {
  const tasks = read()
  const task = {
    id: nextId(tasks),
    title: input.title,
    details: input.details ?? 'No extra notes added yet.',
    category: input.category ?? 'Tool',
    priority: input.priority ?? 'Medium',
    due: input.due ?? new Date().toLocaleDateString('en-CA'),
    done: false,
    pinned: false,
    recurrence: input.recurrence ?? 'none',
    createdAt: Date.now(),
  }
  const next = [task, ...tasks]
  write(next)
  return task
}

export function updateTask(id, patch) {
  const tasks = read()
  let updated = null
  const next = tasks.map((task) => {
    if (task.id !== id) {
      return task
    }
    updated = { ...task, ...patch, id: task.id }
    return updated
  })
  write(next)
  return updated
}

export function toggleTask(id) {
  const task = getTask(id)
  if (!task) {
    return null
  }
  return updateTask(id, { done: !task.done })
}

export function togglePinned(id) {
  const task = getTask(id)
  if (!task) {
    return null
  }
  return updateTask(id, { pinned: !task.pinned })
}

export function deleteTask(id) {
  const tasks = read()
  const next = tasks.filter((task) => task.id !== id)
  const removed = next.length !== tasks.length
  if (removed) {
    write(next)
  }
  return removed
}

export function clearCompleted() {
  const tasks = read()
  const next = tasks.filter((task) => !task.done)
  write(next)
  return tasks.length - next.length
}

export function replaceAll(tasks) {
  write(tasks)
  return read()
}

export function resetTasks() {
  write(seedTasks.map(migrate))
  return read()
}

export function reorderTasks(orderedIds) {
  const tasks = read()
  const byId = new Map(tasks.map((task) => [task.id, task]))
  const reordered = []
  for (const id of orderedIds) {
    const task = byId.get(id)
    if (task) {
      reordered.push(task)
      byId.delete(id)
    }
  }
  // Append any tasks not mentioned in the ordering (defensive).
  for (const task of byId.values()) {
    reordered.push(task)
  }
  write(reordered)
  return reordered
}
