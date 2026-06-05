import { EditorCommand, EditorTask } from '@/types/editorCommands'

type Rule = {
  name: string
  test: (text: string) => boolean
  build: (text: string) => EditorTask
}

const rules: Rule[] = [
  {
    name: 'color_grade_cinematic',
    test: (t) => /cinema|cinematic|film|cinematic blue|cinematic look/i.test(t),
    build: (t) => ({ type: 'color_grade', style: 'cinematic_blue', params: {} })
  },
  {
    name: 'background_replace_desert',
    test: (t) => /background replace|replace the background|change background/i.test(t) && /desert/i.test(t),
    build: (t) => ({ type: 'background_replace', background: 'desert', params: {} })
  },
  {
    name: 'motion_track',
    test: (t) => /track|tracking|motion track|track the/i.test(t),
    build: (t) => {
      const match = t.match(/track the ([a-z0-9_ ]+)/i)
      return { type: 'motion_track', target: match ? match[1].trim() : undefined, params: {} }
    }
  },
  {
    name: 'object_removal',
    test: (t) => /remove|object removal|erase|remove the/i.test(t),
    build: (t) => {
      const match = t.match(/remove (the )?([a-z0-9_ ]+)/i)
      return { type: 'object_removal', target: match ? match[2].trim() : undefined, params: {} }
    }
  },
  {
    name: 'audio_enhance',
    test: (t) => /audio|voice|enhance voice|denoise|audio enhancement|clean up audio/i.test(t),
    build: (t) => ({ type: 'audio_enhancement', style: /voice|vocal/i.test(t) ? 'voice_enhance' : 'default', params: {} })
  },
  {
    name: 'subtitles',
    test: (t) => /subtitle|captions|add subtitles|generate subtitles/i.test(t),
    build: (t) => ({ type: 'subtitles', language: detectLanguage(t) || 'en', params: {} })
  },
  {
    name: 'speed_ramping',
    test: (t) => /speed ramp|speed up|slow down|ramp/i.test(t),
    build: (t) => ({ type: 'speed_ramping', ranges: [], params: {} })
  },
  {
    name: 'transition',
    test: (t) => /transition|fade|crossfade|wipe/i.test(t),
    build: (t) => ({ type: 'transition', name: 'crossfade', params: {} })
  }
]

function detectLanguage(text: string) {
  // Placeholder - in real product use language detection library
  if (/esp|spanish|español/i.test(text)) return 'es'
  return 'en'
}

export function interpret(text: string): EditorCommand {
  const tasks: EditorTask[] = []
  const lower = text

  for (const r of rules) {
    try {
      if (r.test(lower)) {
        tasks.push(r.build(lower))
      }
    } catch (err) {
      // ignore rule errors
    }
  }

  // if nothing matched, add a fallback note task
  if (tasks.length === 0) {
    tasks.push({ type: 'effects', name: 'manual_review', params: { note: text } })
  }

  return { tasks }
}

export default { interpret }
