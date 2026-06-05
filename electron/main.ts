import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV !== 'production'

// Global render engine instance
let renderEngine: any = null

async function getRenderEngine() {
  if (renderEngine) return renderEngine

  try {
    // Import and initialize render engine
    const { RenderEngine } = await import('../src/services/render-engine/engine')

    renderEngine = new RenderEngine({
      concurrency: 2,
      cacheDirectory: path.join(app.getPath('userData'), 'render-cache'),
      persistenceDirectory: path.join(app.getPath('userData'), '.render-jobs'),
      maxQueueSize: 100,
      maxRetries: 2,
      cacheTimeoutHours: 24,
    })

    await renderEngine.initialize()

    return renderEngine
  } catch (error) {
    console.error('Failed to initialize render engine:', error)
    throw error
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  if (renderEngine) {
    try {
      await renderEngine.gracefulShutdown()
    } catch (error) {
      console.error('Error during render engine shutdown:', error)
    }
  }
})

// IPC: open file dialog
ipcMain.handle('dialog/open-file', async (_event, opts) => {
  const { dialog } = require('electron')
  const res = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], ...(opts || {}) })
  return res
})

// Example IPC handlers
ipcMain.handle('app/get-version', async () => {
  return app.getVersion()
})

// ===== Render Engine IPC Handlers =====

// Get render engine status
ipcMain.handle('render-engine/status', async () => {
  try {
    const engine = await getRenderEngine()
    const metrics = engine.getMetrics()
    const health = engine.getHealth()

    return {
      ready: true,
      metrics,
      health,
    }
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

// Get queue metrics
ipcMain.handle('render-engine/metrics', async () => {
  try {
    const engine = await getRenderEngine()
    return engine.getMetrics()
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Get resource usage
ipcMain.handle('render-engine/resources', async () => {
  try {
    const engine = await getRenderEngine()
    return engine.getResourceUsage()
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Get job history
ipcMain.handle('render-engine/job-history', async (_event, limit?: number) => {
  try {
    const engine = await getRenderEngine()
    return engine.getJobHistory(limit || 100)
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Get dead letter queue
ipcMain.handle('render-engine/dead-letter-queue', async () => {
  try {
    const engine = await getRenderEngine()
    return engine.getDeadLetterQueue()
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Get job details
ipcMain.handle('render-engine/job', async (_event, jobId: string) => {
  try {
    const engine = await getRenderEngine()
    return engine.getJob(jobId)
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Cancel job
ipcMain.handle('render-engine/cancel-job', async (_event, jobId: string) => {
  try {
    const engine = await getRenderEngine()
    engine.cancelJob(jobId)
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Get logs
ipcMain.handle('render-engine/logs', async (_event, filter?: any) => {
  try {
    const engine = await getRenderEngine()
    return engine.getLogs(filter)
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
})

// Subscribe to render engine events (via ipc send)
ipcMain.on('render-engine/subscribe', async (_event) => {
  try {
    const engine = await getRenderEngine()

    const onJobEnqueued = (data: any) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('render-engine/job:enqueued', data)
      })
    }

    const onJobStarted = (data: any) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('render-engine/job:started', data)
      })
    }

    const onJobProgress = (data: any) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('render-engine/job:progress', data)
      })
    }

    const onJobCompleted = (data: any) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('render-engine/job:completed', data)
      })
    }

    const onJobFailed = (data: any) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('render-engine/job:failed', data)
      })
    }

    engine.on('job:enqueued', onJobEnqueued)
    engine.on('job:started', onJobStarted)
    engine.on('job:progress', onJobProgress)
    engine.on('job:completed', onJobCompleted)
    engine.on('job:failed', onJobFailed)
  } catch (error) {
    console.error('Failed to subscribe to render engine events:', error)
  }
})
