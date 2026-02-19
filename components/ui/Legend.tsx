interface LegendProps {
  lang?: 'zh' | 'en'
}

export default function Legend({ lang = 'zh' }: LegendProps) {
  const isEn = lang === 'en'
  return (
    <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-white border border-gray-200" />
        <span>{isEn ? 'Available' : '可预约'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-200" />
        <span>{isEn ? 'Pending' : '待确认'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-gray-100" />
        <span>{isEn ? 'Unavailable' : '不可用'}</span>
      </div>
    </div>
  )
}
