# Vireon Video Processing Engine

Production-grade video processing backend service for Vireon AI Editor. This engine handles concurrent job queue management, resource allocation, error recovery, and comprehensive monitoring.

## Architecture Overview

### Core Components

#### 1. **Job Queue System** (`ffmpeg/jobs.ts`)
- Priority-based job scheduling (critical, high, normal, low)
- Configurable concurrency control
- Job lifecycle management with state machine
- Graceful shutdown with in-flight job tracking
- Queue metrics and performance tracking
- Automatic job recovery on startup

**Features:**
- Priority queue with 4 levels
- Concurrent job execution with limits
- Job tracking (pending, queued, processing, completed, failed, cancelled)
- Resource-aware scheduling
- Dead-letter queue support

#### 2. **Resource Manager** (`resources.ts`)
- System resource monitoring (CPU, memory, disk)
- Adaptive concurrency based on available resources
- Resource allocation per job
- Health checks and warnings
- Configurable resource limits

**Metrics:**
- Memory usage tracking
- CPU load monitoring
- Disk space validation
- Resource utilization percentages

#### 3. **Error Handling & Recovery** (`errors.ts`, `recovery.ts`)
- Comprehensive error taxonomy with error codes
- Severity levels (critical, error, warning, info)
- Automatic retry with exponential backoff
- Dead-letter queue for permanently failed jobs
- Error context and recovery strategies

**Error Categories:**
- FFmpeg execution errors (retriable)
- Resource exhaustion (retriable with backoff)
- Invalid input (non-retriable)
- System-level errors

#### 4. **Logging & Telemetry** (`logger.ts`)
- Structured logging with multiple levels
- Job-level telemetry tracking
- Performance metrics collection
- Real-time log streaming via events
- Log history with bounded storage

#### 5. **Job Lifecycle Management** (`ffmpeg/jobLifecycle.ts`)
- State machine for job transitions
- Valid state transitions enforced
- Lifecycle hooks for all events
- Event history tracking
- Timing metrics (queue wait, processing time)

#### 6. **Persistence Layer** (`persistence.ts`)
- JSON-based job history (lightweight alternative to SQLite)
- Job recovery on restart
- Metrics aggregation
- Historical analytics
- Data cleanup with age-based deletion

#### 7. **Cache Management** (`ffmpeg/cache.ts`)
- TTL-based cache eviction
- LRU (Least Recently Used) strategy
- Disk quota enforcement
- Cache statistics and hit rate tracking
- Automatic cleanup scheduler

**Features:**
- Configurable TTL (default: 24 hours)
- Size quota with LRU eviction
- Access tracking and hit rate metrics
- Automatic cleanup on interval

#### 8. **FFmpeg Driver Enhancement** (`ffmpeg/ffmpegDriver.ts`)
- Hardware acceleration detection (NVIDIA CUDA, Intel QSV, Apple VideoToolbox)
- Codec availability checking
- Timeout handling with process management
- Better progress parsing
- Enhanced error reporting with context

**Hardware Support:**
- NVIDIA CUDA acceleration
- Intel Quick Sync Video (QSV)
- Apple VideoToolbox
- CPU-based fallback

#### 9. **Codec & Format Presets** (`ffmpeg/presets.ts`)
- Quality-based presets (draft, standard, high, maximum)
- Multiple codec support (H.264, H.265, VP9, AV1, ProRes, DNxHD)
- Social media templates (YouTube, Instagram, TikTok, Twitter)
- Custom preset builder
- FFmpeg argument generation

**Presets Include:**
- YouTube (1080p/4K optimized)
- Instagram (square format)
- TikTok (vertical format)
- Twitter (16:9 format)
- Web streaming
- Professional formats (ProRes, DNxHD)

#### 10. **Monitoring System** (`monitor.ts`)
- Health checks with status reporting
- Real-time system monitoring
- Queue depth tracking
- Resource utilization alerts
- Comprehensive health reports

**Health Metrics:**
- Queue responsiveness
- Resource availability
- Cache integrity
- FFmpeg status

#### 11. **Performance Profiler** (`profiler.ts`)
- Job execution time tracking
- Memory peak and average monitoring
- Disk usage per job
- Aggregate statistics
- Performance trend analysis

**Tracked Metrics:**
- Queue wait time
- Execution time
- Total job time
- Memory usage
- Disk space used
- Success/failure rate

### Data Flow

```
User Request
    ↓
RenderEngine.enqueueJob()
    ↓
JobQueue (priority sorted)
    ↓
ResourceManager (check availability)
    ↓
FFmpegDriver (execute with progress)
    ↓
TempCache (store output)
    ↓
JobPersistence (record metrics)
    ↓
RenderMonitor (collect telemetry)
    ↓
RenderProfiler (track performance)
    ↓
Callback to UI via Redux
```

## Type System

### Core Types

```typescript
// Job lifecycle
type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
type JobPriority = 'critical' | 'high' | 'normal' | 'low'

// Error handling
type ErrorCode = 'FFMPEG_NOT_FOUND' | 'INSUFFICIENT_MEMORY' | ...
type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info'
type RecoveryStrategy = 'retry' | 'partial_retry' | 'fallback' | 'manual_intervention' | 'cancel'

// Jobs
type RenderJob = PreviewJob | ExportJob | AIEditJob

// Metrics
type JobMetrics = { /* timing, resources, status */ }
type QueueMetrics = { /* depth, rates, averages */ }
```

## Integration Points

### With Redux Store
- Job status updates via `renderSlice`
- Metrics collection for dashboard
- Error notifications to UI
- Progress updates for UI components

### With Electron IPC
- Job submission from renderer process
- Status queries from renderer process
- Graceful shutdown signals
- Resource availability checks

### With Existing Services
- FFmpeg driver for video processing
- Preview generator for thumbnails
- Export manager for video output
- AI Editor for complex editing tasks

## Configuration

```typescript
const engineConfig = {
  concurrency: 2,                    // Max concurrent jobs
  cacheDirectory: './cache',         // Cache location
  persistenceDirectory: './.jobs',   // Job history location
  maxQueueSize: 1000,               // Max pending jobs
  maxRetries: 3,                    // Max retry attempts
  retryBackoffMs: 1000,             // Initial retry delay
  jobTimeoutMs: 600000,             // 10 minutes
  healthCheckIntervalMs: 10000,     // Health check frequency
  metricsEnabled: true,             // Enable telemetry
  cacheTimeoutHours: 24,            // Cache TTL
  maxMemoryMB: 8000,                // Memory limit
  maxCacheSizeMB: 5000,             // Cache size limit
}
```

## Usage Example

```typescript
import {
  RenderEngine,
  createLogger,
  createResourceManager,
  createRecoveryManager,
  PreviewGenerator,
  ExportManager,
} from '@/services/render-engine'

// Initialize engine
const engine = new RenderEngine(config)
await engine.initialize()

// Submit a preview job
const job = {
  id: generateId(),
  type: 'preview',
  inputPath: '/path/to/video.mp4',
  outputPath: '/path/to/preview.mp4',
  priority: 'normal',
  previewOptions: { durationSeconds: 5, width: 1920, height: 1080 }
}

engine.enqueuePreview(job)

// Listen for events
engine.on('job:completed', (jobId) => {
  console.log(`Job ${jobId} completed`)
})

engine.on('job:failed', (jobId, error) => {
  console.error(`Job ${jobId} failed: ${error.message}`)
})

// Get metrics
const metrics = engine.getMetrics()
console.log(`Queue size: ${metrics.queuedJobs}`)
console.log(`Avg processing time: ${metrics.avgProcessingTimeMs}ms`)
```

## Performance Characteristics

### Job Processing
- **Concurrency**: Configurable (default 2)
- **Memory per job**: 500MB - 2GB (depends on video size)
- **Typical processing**: 1-3x real-time (varies by codec/quality)
- **Cache efficiency**: LRU with TTL eviction

### Monitoring Overhead
- **Health checks**: ~10ms every 10 seconds
- **Logging**: Minimal (structured, async)
- **Profiling**: Negligible (<1% overhead)

### Scalability
- **Queue capacity**: Virtually unlimited (bounded by memory)
- **Job history**: Configurable retention (default 30 days)
- **Cache disk space**: Configurable with auto-cleanup

## Error Recovery

The system implements a comprehensive retry strategy:

1. **Transient Errors** (retriable):
   - FFmpeg execution timeouts
   - Temporary resource exhaustion
   - Disk space temporarily full
   - **Recovery**: Exponential backoff retry (max 3 attempts)

2. **Permanent Errors** (non-retriable):
   - Invalid input files
   - Unsupported codecs
   - Invalid output paths
   - **Recovery**: Move to dead-letter queue

3. **System Errors**:
   - FFmpeg not installed
   - System level failures
   - **Recovery**: Manual intervention required

## Future Enhancements

- [ ] Distributed processing (remote worker support)
- [ ] GPU acceleration for AI operations
- [ ] Streaming input/output support
- [ ] Advanced scheduling (task dependencies, conditional execution)
- [ ] PostgreSQL persistence (for multi-machine deployments)
- [ ] Real-time monitoring dashboard
- [ ] Predictive resource allocation
- [ ] ML-based job priority optimization

## Testing

### Unit Tests
- Error handling and recovery
- State machine transitions
- Resource calculations
- Metrics aggregation

### Integration Tests
- Queue → FFmpeg → Cache pipeline
- Job lifecycle with recovery
- Concurrent job execution
- Resource limits enforcement

### Load Tests
- Queue 100+ jobs
- Verify concurrency limits
- Memory usage under load
- Cache eviction behavior

## Production Deployment

1. **Prerequisites**:
   - FFmpeg installed and in PATH
   - 8GB+ available RAM
   - 20GB+ available disk space

2. **Configuration**:
   - Set resource limits based on system capacity
   - Configure cache directory on fast storage
   - Enable persistence for job recovery

3. **Monitoring**:
   - Set up health check alerts
   - Monitor dead-letter queue
   - Track processing time trends
   - Alert on resource exhaustion

4. **Maintenance**:
   - Regular cache cleanup
   - Job history pruning (30-day retention)
   - Performance optimization based on profiler data

## License

Part of Vireon AI Editor project.
