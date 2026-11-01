import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PUSTE = "__puste__"

export function Wybor({ value, onChange, opcje, puste = "wszystkie", className, size }: {
  value: string
  onChange: (value: string) => void
  opcje: [string, string][]
  puste?: string
  className?: string
  size?: "sm" | "default"
}) {
  return (
    <Select value={value || PUSTE} onValueChange={(v) => onChange(v === PUSTE ? "" : v)}>
      <SelectTrigger size={size} className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PUSTE}>{puste}</SelectItem>
        {opcje.map(([id, nazwa]) => (
          <SelectItem key={id} value={id}>{nazwa}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
