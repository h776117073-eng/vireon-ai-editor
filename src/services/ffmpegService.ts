// Placeholder FFmpeg integration service
// This module prepares command arguments for future native FFmpeg processing.

export type FFmpegJob = {
  id: string
  input: string
  output: string
  args: string[]
}

export function prepareColorGradeCommand(input: string, output: string, style: string) {
  // In a real implementation this would map `style` to a series of filters
  const args = ['-i', input, '-vf', `eq=contrast=1.1:saturation=1.2`, '-c:a', 'copy', output]
  return { input, output, args }
}

export default { prepareColorGradeCommand }
