export interface SelectOption {
  value: string
  label: string
  group?: string
}

interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export function Select({ label, value, options, onChange }: SelectProps) {
  const groups = [...new Set(options.map((o) => o.group))]
  const renderOptions = (opts: SelectOption[]) =>
    opts.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
      >
        {groups.length > 1 || groups[0] !== undefined
          ? groups.map((g) => (
              <optgroup key={g ?? ''} label={g}>
                {renderOptions(options.filter((o) => o.group === g))}
              </optgroup>
            ))
          : renderOptions(options)}
      </select>
    </label>
  )
}
