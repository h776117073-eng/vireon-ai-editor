export type QualityLevel = 'draft' | 'standard' | 'high' | 'maximum'
export type VideoFormat = 'h264' | 'h265' | 'vp9' | 'av1' | 'prores' | 'dnxhd'
export type Container = 'mp4' | 'mov' | 'webm' | 'mkv'
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'flac'

export interface VideoPreset {
  codec: VideoFormat
  crf?: number // Constant Rate Factor (quality, lower is better)
  preset?: string // ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
  bitrate?: string // e.g., '5000k'
  maxBitrate?: string
  bufSize?: string
  resolution?: string // e.g., '1920x1080'
  fps?: number
  hwAccel?: string
  extraArgs?: string[]
}

export interface AudioPreset {
  codec: AudioCodec
  bitrate?: string
  sampleRate?: number
  channels?: number
}

export interface ExportPreset {
  name: string
  container: Container
  video: VideoPreset
  audio: AudioPreset
  description: string
}

// Video codec presets by quality level
const videoPresetsByQuality: Record<QualityLevel, Record<VideoFormat, Partial<VideoPreset>>> = {
  draft: {
    h264: {
      crf: 28,
      preset: 'ultrafast',
      bitrate: '2000k',
    },
    h265: {
      crf: 28,
      preset: 'ultrafast',
      bitrate: '1500k',
    },
    vp9: {
      preset: 0,
      bitrate: '1500k',
    },
    av1: {
      preset: 8,
      bitrate: '1000k',
    },
    prores: {
      preset: '422',
      bitrate: '3000k',
    },
    dnxhd: {
      bitrate: '120m',
    },
  },

  standard: {
    h264: {
      crf: 23,
      preset: 'fast',
      bitrate: '5000k',
    },
    h265: {
      crf: 23,
      preset: 'fast',
      bitrate: '3500k',
    },
    vp9: {
      preset: 1,
      bitrate: '3500k',
    },
    av1: {
      preset: 6,
      bitrate: '2500k',
    },
    prores: {
      preset: '422hq',
      bitrate: '8000k',
    },
    dnxhd: {
      bitrate: '185m',
    },
  },

  high: {
    h264: {
      crf: 18,
      preset: 'slow',
      bitrate: '10000k',
    },
    h265: {
      crf: 18,
      preset: 'slow',
      bitrate: '7000k',
    },
    vp9: {
      preset: 2,
      bitrate: '7000k',
    },
    av1: {
      preset: 4,
      bitrate: '5000k',
    },
    prores: {
      preset: '422hq',
      bitrate: '15000k',
    },
    dnxhd: {
      bitrate: '250m',
    },
  },

  maximum: {
    h264: {
      crf: 12,
      preset: 'veryslow',
      bitrate: '20000k',
    },
    h265: {
      crf: 12,
      preset: 'veryslow',
      bitrate: '12000k',
    },
    vp9: {
      preset: 3,
      bitrate: '12000k',
    },
    av1: {
      preset: 2,
      bitrate: '8000k',
    },
    prores: {
      preset: '422hq',
      bitrate: '25000k',
    },
    dnxhd: {
      bitrate: '500m',
    },
  },
}

// Social media export presets
const socialMediaPresets: Record<string, ExportPreset> = {
  youtube: {
    name: 'YouTube',
    container: 'mp4',
    video: {
      codec: 'h264',
      crf: 18,
      preset: 'slow',
      bitrate: '8000k',
      maxBitrate: '10000k',
      bufSize: '20000k',
      resolution: '1920x1080',
      fps: 30,
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 48000,
      channels: 2,
    },
    description: 'Optimized for YouTube upload',
  },

  youtube_4k: {
    name: 'YouTube 4K',
    container: 'mp4',
    video: {
      codec: 'h264',
      crf: 16,
      preset: 'slow',
      bitrate: '16000k',
      maxBitrate: '25000k',
      bufSize: '30000k',
      resolution: '3840x2160',
      fps: 30,
    },
    audio: {
      codec: 'aac',
      bitrate: '192k',
      sampleRate: 48000,
      channels: 2,
    },
    description: 'Optimized for YouTube 4K upload',
  },

  instagram: {
    name: 'Instagram',
    container: 'mp4',
    video: {
      codec: 'h264',
      crf: 23,
      preset: 'fast',
      bitrate: '3000k',
      resolution: '1080x1080',
      fps: 30,
    },
    audio: {
      codec: 'aac',
      bitrate: '96k',
      sampleRate: 44100,
      channels: 2,
    },
    description: 'Optimized for Instagram (square)',
  },

  tiktok: {
    name: 'TikTok',
    container: 'mp4',
    video: {
      codec: 'h264',
      crf: 24,
      preset: 'veryfast',
      bitrate: '2500k',
      resolution: '1080x1920',
      fps: 30,
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2,
    },
    description: 'Optimized for TikTok (vertical)',
  },

  twitter: {
    name: 'Twitter',
    container: 'mp4',
    video: {
      codec: 'h264',
      crf: 23,
      preset: 'fast',
      bitrate: '2500k',
      maxBitrate: '5000k',
      bufSize: '10000k',
      resolution: '1280x720',
      fps: 30,
    },
    audio: {
      codec: 'aac',
      bitrate: '96k',
      sampleRate: 44100,
      channels: 2,
    },
    description: 'Optimized for Twitter/X upload',
  },

  web: {
    name: 'Web Streaming',
    container: 'mp4',
    video: {
      codec: 'h264',
      crf: 23,
      preset: 'medium',
      bitrate: '4000k',
      maxBitrate: '6000k',
      bufSize: '12000k',
      resolution: '1280x720',
      fps: 30,
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 48000,
      channels: 2,
    },
    description: 'Optimized for web streaming',
  },
}

export class PresetManager {
  static getVideoPreset(quality: QualityLevel, codec: VideoFormat): VideoPreset {
    const preset = videoPresetsByQuality[quality]?.[codec]
    if (!preset) {
      throw new Error(`No preset found for quality=${quality}, codec=${codec}`)
    }

    return {
      codec,
      ...preset,
    } as VideoPreset
  }

  static getAudioPreset(codec: AudioCodec = 'aac'): AudioPreset {
    const presets: Record<AudioCodec, AudioPreset> = {
      aac: { codec: 'aac', bitrate: '128k', sampleRate: 48000, channels: 2 },
      mp3: { codec: 'mp3', bitrate: '192k', sampleRate: 44100, channels: 2 },
      opus: { codec: 'opus', bitrate: '128k', sampleRate: 48000, channels: 2 },
      flac: { codec: 'flac', sampleRate: 48000, channels: 2 },
    }

    return presets[codec] || presets.aac
  }

  static getSocialMediaPreset(platform: string): ExportPreset {
    const preset = socialMediaPresets[platform.toLowerCase()]
    if (!preset) {
      throw new Error(`No preset found for platform: ${platform}`)
    }
    return preset
  }

  static getAllSocialMediaPresets(): ExportPreset[] {
    return Object.values(socialMediaPresets)
  }

  static getSocialMediaPlatforms(): string[] {
    return Object.keys(socialMediaPresets)
  }

  static buildFFmpegArgs(
    inputPath: string,
    outputPath: string,
    quality: QualityLevel,
    codec: VideoFormat = 'h264',
    audioCodec: AudioCodec = 'aac'
  ): string[] {
    const video = this.getVideoPreset(quality, codec)
    const audio = this.getAudioPreset(audioCodec)

    const args: string[] = ['-i', inputPath]

    // Video codec
    args.push('-c:v', codec)

    // Video quality settings
    if (video.crf !== undefined) {
      args.push('-crf', String(video.crf))
    }
    if (video.preset) {
      args.push('-preset', video.preset)
    }
    if (video.bitrate) {
      args.push('-b:v', video.bitrate)
    }
    if (video.maxBitrate) {
      args.push('-maxrate', video.maxBitrate)
    }
    if (video.bufSize) {
      args.push('-bufsize', video.bufSize)
    }
    if (video.resolution) {
      args.push('-s', video.resolution)
    }
    if (video.fps) {
      args.push('-r', String(video.fps))
    }

    // Audio codec
    args.push('-c:a', audio.codec)
    if (audio.bitrate) {
      args.push('-b:a', audio.bitrate)
    }
    if (audio.sampleRate) {
      args.push('-ar', String(audio.sampleRate))
    }
    if (audio.channels) {
      args.push('-ac', String(audio.channels))
    }

    // Output
    args.push(outputPath)

    return args
  }

  static buildSocialMediaFFmpegArgs(
    inputPath: string,
    outputPath: string,
    platform: string
  ): string[] {
    const preset = this.getSocialMediaPreset(platform)
    return this.buildFFmpegArgs(
      inputPath,
      outputPath,
      'standard',
      preset.video.codec,
      preset.audio.codec
    )
  }
}

export function getPresetManager(): typeof PresetManager {
  return PresetManager
}
