export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** Nhóm nút chọn một trong vài lựa chọn. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-stone-200 p-0.5 dark:bg-stone-800">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
              o.value === value
                ? 'bg-white font-medium text-stone-900 shadow-sm dark:bg-stone-600 dark:text-white'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
