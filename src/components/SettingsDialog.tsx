import { useEffect, useState } from "react"
import { SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  DEFAULT_REVIEW_POOL_SIZE,
  getLlmSettings,
  getReviewPoolSize,
  saveLlmSettings,
  saveReviewPoolSize,
  type LlmSettings,
} from "@/lib/settings"

export function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<LlmSettings>({
    baseUrl: "",
    apiKey: "",
    model: "",
  })
  const [poolSize, setPoolSize] = useState(String(DEFAULT_REVIEW_POOL_SIZE))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getLlmSettings().then(setSettings)
      getReviewPoolSize().then((n) => setPoolSize(String(n)))
    }
  }, [open])

  async function handleSave() {
    setSaving(true)
    try {
      const parsed = Math.round(Number(poolSize))
      await Promise.all([
        saveLlmSettings(settings),
        saveReviewPoolSize(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVIEW_POOL_SIZE),
      ])
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-10 w-full justify-start gap-2 px-3 text-foreground/70">
          <SettingsIcon />
          设置
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>
            配置用于查词的大模型 API（OpenAI 兼容接口，默认 DeepSeek 官方 API），以及复习相关选项。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="deepseek-v4-flash"
            />
          </div>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pool-size">复习缓存张数</Label>
            <Input
              id="pool-size"
              type="number"
              min={1}
              step={1}
              value={poolSize}
              onChange={(e) => setPoolSize(e.target.value)}
              placeholder={String(DEFAULT_REVIEW_POOL_SIZE)}
            />
            <p className="text-xs text-muted-foreground">
              复习时后台预先缓存的卡片数量，答完一张自动补一张，越小越贴近最新到期顺序。
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
