'use client'

const PRESET_COLORS = [
  '#818cf8', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f472b6', '#f43f5e', '#ef4444',
  '#f97316', '#fb923c', '#eab308', '#facc15',
  '#22c55e', '#34d399', '#14b8a6', '#06b6d4',
  '#3b82f6', '#60a5fa', '#6b7280', '#9ca3af',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#111' : 'transparent',
          }}
          title={color}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
        title="自定义颜色"
      />
    </div>
  )
}
