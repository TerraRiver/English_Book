import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { SpeakButton } from "@/components/SpeakButton"
import type { WordDetail } from "@/lib/types"

interface WordDetailFieldsProps {
  detail: WordDetail
  onChange: (detail: WordDetail) => void
  note: string
  onNoteChange: (note: string) => void
  bidirectional: boolean
  onBidirectionalChange: (value: boolean) => void
}

export function WordDetailFields({
  detail,
  onChange,
  note,
  onNoteChange,
  bidirectional,
  onBidirectionalChange,
}: WordDetailFieldsProps) {
  function updateSense(i: number, patch: Partial<WordDetail["senses"][number]>) {
    onChange({ ...detail, senses: detail.senses.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) })
  }

  function updateVariant(i: number, patch: Partial<WordDetail["variants"][number]>) {
    onChange({ ...detail, variants: detail.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) })
  }

  function updateExample(i: number, patch: Partial<WordDetail["examples"][number]>) {
    onChange({ ...detail, examples: detail.examples.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Input
          className="h-8 w-40 text-sm text-muted-foreground"
          value={detail.phonetic_uk ?? ""}
          onChange={(e) => onChange({ ...detail, phonetic_uk: e.target.value })}
          placeholder="英式音标"
        />
        <Input
          className="h-8 w-40 text-sm text-muted-foreground"
          value={detail.phonetic_us ?? ""}
          onChange={(e) => onChange({ ...detail, phonetic_us: e.target.value })}
          placeholder="美式音标"
        />
      </div>

      <div className="flex flex-col gap-2">
        {detail.senses.map((sense, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <Input
              className="h-8 w-16 shrink-0 text-center"
              value={sense.pos}
              onChange={(e) => updateSense(i, { pos: e.target.value })}
            />
            <Input
              className="h-8"
              value={sense.translation}
              onChange={(e) => updateSense(i, { translation: e.target.value })}
            />
          </div>
        ))}
      </div>

      {detail.variants.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {detail.variants.map((v, i) => (
              <Badge key={i} variant="outline" className="gap-1">
                <input
                  className="w-14 bg-transparent outline-none"
                  value={v.label}
                  onChange={(e) => updateVariant(i, { label: e.target.value })}
                />
                :
                <input
                  className="w-20 bg-transparent outline-none"
                  value={v.form}
                  onChange={(e) => updateVariant(i, { form: e.target.value })}
                />
              </Badge>
            ))}
          </div>
        </>
      )}

      {detail.examples.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            {detail.examples.map((ex, i) => (
              <div key={i} className="flex flex-col gap-1 text-sm">
                <div className="flex items-start gap-1">
                  <Textarea
                    className="min-h-8 flex-1 resize-none"
                    value={ex.en}
                    onChange={(e) => updateExample(i, { en: e.target.value })}
                  />
                  <SpeakButton text={ex.en} className="mt-0.5 shrink-0" />
                </div>
                <Textarea
                  className="min-h-8 resize-none text-muted-foreground"
                  value={ex.zh}
                  onChange={(e) => updateExample(i, { zh: e.target.value })}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />
      <Textarea
        className="min-h-16 resize-none text-sm text-muted-foreground"
        value={detail.usage_notes ?? ""}
        onChange={(e) => onChange({ ...detail, usage_notes: e.target.value })}
        placeholder="用法辨析（可编辑）"
      />

      <Separator />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">个人备注</Label>
        <Textarea
          id="note"
          className="min-h-16 resize-none"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="助记方法、出处、上下文……（不会被 AI 修改）"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="bidirectional"
          checked={bidirectional}
          onCheckedChange={(v) => onBidirectionalChange(v === true)}
        />
        <Label htmlFor="bidirectional" className="text-sm font-normal">
          同时练习中 → 英（反向回忆，难度更高）
        </Label>
      </div>
    </div>
  )
}
