import type { JobStatus, RenderJob, JobLifecycleHooks, RenderError, LifecycleState } from './types'

export type StateTransition = {
  from: LifecycleState
  to: LifecycleState
  allowed: boolean
  reason?: string
}

const validTransitions: Record<LifecycleState, Set<LifecycleState>> = {
  pending: new Set(['queued', 'cancelled']),
  queued: new Set(['processing', 'cancelled']),
  processing: new Set(['completed', 'failed', 'cancelled']),
  completed: new Set([]),
  failed: new Set(['queued', 'cancelled']),
  cancelled: new Set([]),
}

export class JobLifecycle {
  private job: RenderJob
  private hooks: JobLifecycleHooks = {}
  private eventHistory: Array<{ state: LifecycleState; timestamp: number }> = []

  constructor(job: RenderJob, hooks?: JobLifecycleHooks) {
    this.job = job
    this.hooks = hooks || {}
    this.recordStateChange(job.status)
  }

  private recordStateChange(state: LifecycleState): void {
    this.eventHistory.push({
      state,
      timestamp: Date.now(),
    })
  }

  private async executeHook(
    hook: (() => void | Promise<void>) | undefined
  ): Promise<void> {
    if (!hook) return
    try {
      await Promise.resolve(hook())
    } catch (error) {
      console.error('Hook execution failed:', error)
    }
  }

  canTransitionTo(nextState: LifecycleState): StateTransition {
    const current = this.job.status as LifecycleState
    const validNextStates = validTransitions[current]

    if (!validNextStates) {
      return {
        from: current,
        to: nextState,
        allowed: false,
        reason: `Unknown current state: ${current}`,
      }
    }

    if (!validNextStates.has(nextState)) {
      return {
        from: current,
        to: nextState,
        allowed: false,
        reason: `Cannot transition from ${current} to ${nextState}`,
      }
    }

    return { from: current, to: nextState, allowed: true }
  }

  async toPending(): Promise<void> {
    const transition = this.canTransitionTo('pending')
    if (!transition.allowed) throw new Error(transition.reason)

    this.job.status = 'pending'
    this.job.updatedAt = Date.now()
    this.recordStateChange('pending')
    await this.executeHook(this.hooks.onPending)
  }

  async toQueued(): Promise<void> {
    const transition = this.canTransitionTo('queued')
    if (!transition.allowed) throw new Error(transition.reason)

    this.job.status = 'queued'
    this.job.updatedAt = Date.now()
    this.recordStateChange('queued')
    await this.executeHook(this.hooks.onQueued)
  }

  async toProcessing(): Promise<void> {
    const transition = this.canTransitionTo('processing')
    if (!transition.allowed) throw new Error(transition.reason)

    this.job.status = 'processing'
    this.job.startedAt = Date.now()
    this.job.updatedAt = Date.now()
    this.recordStateChange('processing')
    await this.executeHook(this.hooks.onStart)
  }

  async toCompleted(): Promise<void> {
    const transition = this.canTransitionTo('completed')
    if (!transition.allowed) throw new Error(transition.reason)

    this.job.status = 'completed'
    this.job.completedAt = Date.now()
    this.job.updatedAt = Date.now()
    this.job.progress = 1.0
    this.recordStateChange('completed')
    await this.executeHook(this.hooks.onCompleted)
  }

  async toFailed(error: RenderError): Promise<void> {
    const transition = this.canTransitionTo('failed')
    if (!transition.allowed) throw new Error(transition.reason)

    this.job.status = 'failed'
    this.job.error = error
    this.job.completedAt = Date.now()
    this.job.updatedAt = Date.now()
    this.recordStateChange('failed')
    await this.executeHook(() => this.hooks.onError?.(this.job, error))
  }

  async toCancelled(): Promise<void> {
    const transition = this.canTransitionTo('cancelled')
    if (!transition.allowed) throw new Error(transition.reason)

    this.job.status = 'cancelled'
    this.job.completedAt = Date.now()
    this.job.updatedAt = Date.now()
    this.recordStateChange('cancelled')
    await this.executeHook(this.hooks.onCancelled)
  }

  async updateProgress(progress: number): Promise<void> {
    if (progress < 0 || progress > 1) {
      throw new Error(`Invalid progress: ${progress}. Must be between 0 and 1.`)
    }

    this.job.progress = progress
    this.job.updatedAt = Date.now()
    await this.executeHook(() => this.hooks.onProgress?.(this.job, progress))
  }

  async retrying(attempt: number): Promise<void> {
    if (this.job.status !== 'failed') {
      throw new Error('Can only retry from failed state')
    }

    this.job.status = 'queued'
    this.job.retryCount = attempt
    this.job.updatedAt = Date.now()
    this.recordStateChange('queued')

    const error = this.job.error
    if (error) {
      await this.executeHook(() => this.hooks.onRetry?.(this.job, attempt))
    }
  }

  getJob(): RenderJob {
    return { ...this.job }
  }

  getEventHistory(): Array<{ state: LifecycleState; timestamp: number }> {
    return [...this.eventHistory]
  }

  getDurationMs(): number {
    const startTime = this.job.startedAt || this.job.createdAt
    const endTime = this.job.completedAt || Date.now()
    return endTime - startTime
  }

  getQueueWaitTimeMs(): number {
    if (!this.job.startedAt) return 0
    return this.job.startedAt - this.job.createdAt
  }

  getProcessingTimeMs(): number {
    if (!this.job.startedAt || !this.job.completedAt) return 0
    return this.job.completedAt - this.job.startedAt
  }

  getCurrentState(): LifecycleState {
    return this.job.status as LifecycleState
  }

  isTerminalState(): boolean {
    return this.job.status === 'completed' || this.job.status === 'failed' || this.job.status === 'cancelled'
  }
}

export function createJobLifecycle(job: RenderJob, hooks?: JobLifecycleHooks): JobLifecycle {
  return new JobLifecycle(job, hooks)
}

export function getValidNextStates(currentState: JobStatus): JobStatus[] {
  const current = currentState as LifecycleState
  const states = validTransitions[current]
  return states ? Array.from(states) as JobStatus[] : []
}
