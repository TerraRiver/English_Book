import { AddWordView } from "@/components/AddWordView"
import { ReviewView } from "@/components/ReviewView"
import { WordLibraryView } from "@/components/WordLibraryView"
import { StatsView } from "@/components/StatsView"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function App() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-serif text-2xl tracking-tight text-foreground">背单词</h1>
          <p className="text-sm text-muted-foreground">查词 · 收录 · 记忆曲线复习</p>
        </div>
        <SettingsDialog />
      </header>

      <Tabs defaultValue="add">
        <TabsList className="w-full">
          <TabsTrigger value="add">添加</TabsTrigger>
          <TabsTrigger value="review">复习</TabsTrigger>
          <TabsTrigger value="library">词库</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
        </TabsList>
        <TabsContent value="add" className="mt-6">
          <AddWordView />
        </TabsContent>
        <TabsContent value="review" className="mt-6">
          <ReviewView />
        </TabsContent>
        <TabsContent value="library" className="mt-6">
          <WordLibraryView />
        </TabsContent>
        <TabsContent value="stats" className="mt-6">
          <StatsView />
        </TabsContent>
      </Tabs>
    </main>
  )
}

export default App
