import { BarChart3Icon, LibraryIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import { AddWordView } from "@/components/AddWordView"
import { ReviewView } from "@/components/ReviewView"
import { WordLibraryView } from "@/components/WordLibraryView"
import { StatsView } from "@/components/StatsView"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const NAV_ITEMS = [
  { value: "add", label: "添加", icon: PlusIcon },
  { value: "review", label: "复习", icon: RotateCcwIcon },
  { value: "library", label: "词库", icon: LibraryIcon },
  { value: "stats", label: "统计", icon: BarChart3Icon },
] as const

function App() {
  return (
    <Tabs
      defaultValue="add"
      orientation="vertical"
      className="h-screen w-full gap-0 overflow-hidden"
    >
      <aside className="flex w-56 shrink-0 flex-col gap-8 border-r border-border px-5 py-8">
        <div className="flex flex-col gap-0.5 px-1">
          <h1 className="font-serif text-2xl tracking-tight text-foreground">背单词</h1>
          <p className="text-sm text-muted-foreground">查词 · 收录 · 记忆曲线复习</p>
        </div>

        <TabsList className="h-fit w-full flex-col items-stretch gap-1 bg-transparent p-0">
          {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-10 w-full justify-start gap-2 rounded-lg px-3 text-base font-normal data-active:font-medium"
            >
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-auto">
          <SettingsDialog />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <TabsContent value="add" className="h-full overflow-y-auto px-12 py-10">
          <div className="mx-auto max-w-xl">
            <AddWordView />
          </div>
        </TabsContent>
        <TabsContent value="review" className="h-full overflow-y-auto px-12 py-10">
          <div className="mx-auto max-w-xl">
            <ReviewView />
          </div>
        </TabsContent>
        <TabsContent value="library" className="flex h-full flex-col overflow-hidden px-12 py-10">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
            <WordLibraryView />
          </div>
        </TabsContent>
        <TabsContent value="stats" className="h-full overflow-y-auto px-12 py-10">
          <div className="mx-auto max-w-4xl">
            <StatsView />
          </div>
        </TabsContent>
      </main>
    </Tabs>
  )
}

export default App
