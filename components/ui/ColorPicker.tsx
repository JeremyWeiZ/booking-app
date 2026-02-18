'use client'

const PRESET_COLORS = [
  '#4f46e5', '#4338ca', '#7c3aed', '#6d28d9',
  '#db2777', '#be185d', '#e11d48', '#b91c1c',
  '#ea580c', '#c2410c', '#ca8a04', '#a16207',
  '#16a34a', '#15803d', '#0f766e', '#0e7490',
  '#1d4ed8', '#1e40af', '#4b5563', '#374151',
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
