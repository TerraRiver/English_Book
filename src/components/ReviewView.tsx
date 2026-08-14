import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { SpeakButton } from "@/components/SpeakButton"
import { getDueCards, reviewCard, setWordBidirectional } from "@/lib/words"
import { DIRECTION_LABEL, type FsrsRating, Rating } from "@/lib/fsrs"
import { getReviewPoolSize } from "@/lib/settings"
import type { DueCard, WordDetail } from "@/lib/types"

export function ReviewView({ onReview }: { onReview?: () => void }) {
  const [pool, setPool] = useState<DueCard[] | null>(null)
  const [revealed, setRevealed] = useState(false)

  const reload = useCallback(() => {
    setRevealed(false)
    getReviewPoolSize()
      .then((poolSize) => getDueCards(poolSize))
      .then(setPool)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleRate(rating: FsrsRating) {
    if (!pool || pool.length === 0) return
    const [current, ...rest] = pool
    await reviewCard(current.card, rating)
    setRevealed(false)
    onReview?.()

    const poolSize = await getReviewPoolSize()
    const need = poolSize - rest.length
    const excludeIds = [current.card.id, ...rest.map((c) => c.card.id)]
    const refill = need > 0 ? await getDueCards(need, excludeIds) : []
    setPool([...rest, ...refill])
  }

  async function handleBidirectionalToggle(checked: boolean) {
    if (!pool || pool.length === 0) return
    const wordId = pool[0].word.id
    const currentCardRemoved = !checked && pool[0].card.direction === "zh_to_en"
    await setWordBidirectional(wordId, checked)
    setPool((prev) => {
      if (!prev) return prev
      let next = prev.map((item) =>
        item.word.id === wordId
          ? { ...item, word: { ...item.word, bidirectional: (checked ? 1 : 0) as 0 | 1 } }
          : item
      )
      if (!checked) {
        next = next.filter((item) => !(item.word.id === wordId && item.card.direction === "zh_to_en"))
      }
      return next
    })
    if (currentCardRemoved) setRevealed(false)
  }

  if (pool === null) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  if (pool.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-lg font-medium">今日复习已完成</p>
        <p className="text-sm text-muted-foreground">没有到期的卡片了，稍后再来看看吧。</p>
        <Button variant="outline" size="sm" onClick={reload} className="mt-2">
          刷新
        </Button>
      </div>
    )
  }

  const { card, word } = pool[0]
  const detail: WordDetail = JSON.parse(word.detail_json)
  const isReverse = card.direction === "zh_to_en"
  const contextExample = detail.examples[0]

  const promptSenses = (
    <div className="flex flex-col gap-1.5">
      {detail.senses.map((sense, i) => (
        <div key={i} className="flex gap-2 text-sm">
          <Badge variant="secondary" className="shrink-0">
            {sense.pos}
          </Badge>
          <span>{sense.translation}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="review-bidirectional"
            checked={word.bidirectional === 1}
            onCheckedChange={(v) => handleBidirectionalToggle(v === true)}
          />
          <Label htmlFor="review-bidirectional" className="text-sm font-normal text-muted-foreground">
            双向背诵
          </Label>
        </div>
        <Badge variant="outline">{DIRECTION_LABEL[card.direction]}</Badge>
      </div>

      <Card className="min-h-72 justify-center">
        <CardHeader className={revealed ? undefined : "items-center text-center"}>
          {isReverse && !revealed ? (
            promptSenses
          ) : (
            <>
              <div className="flex items-center justify-center gap-1">
                <CardTitle className="font-serif text-3xl font-normal">{word.term}</CardTitle>
                <SpeakButton text={word.term} />
              </div>
              {word.phonetic && <p className="text-sm text-muted-foreground">{word.phonetic}</p>}
            </>
          )}

          {!revealed && contextExample && (
            <div className="mt-2 flex items-start gap-1 border-l-2 border-border pl-3 text-left">
              <p className="text-sm text-muted-foreground italic">
                {isReverse ? contextExample.zh : contextExample.en}
              </p>
              <SpeakButton
                text={isReverse ? contextExample.zh : contextExample.en}
                lang={isReverse ? "zh-CN" : "en-US"}
                className="mt-0.5 shrink-0"
              />
            </div>
          )}

          {!revealed && !isReverse && detail.variants.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {detail.variants.map((v, i) => (
                <Badge key={i} variant="outline" className="font-normal">
                  {v.label}: {v.form}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        {revealed && (
          <CardContent className="flex flex-col gap-3">
            <Separator />
            {isReverse ? null : promptSenses}

            {detail.variants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.variants.map((v, i) => (
                  <Badge key={i} variant="outline">
                    {v.label}: {v.form}
                  </Badge>
                ))}
              </div>
            )}

            {detail.examples.length > 0 && (
              <div className="flex flex-col gap-2">
                {detail.examples.map((ex, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-start gap-1">
                      <p className="flex-1">{ex.en}</p>
                      <SpeakButton text={ex.en} className="mt-0.5 shrink-0" />
                    </div>
                    <p className="text-muted-foreground">{ex.zh}</p>
                  </div>
                ))}
              </div>
            )}

            {detail.usage_notes && (
              <p className="text-sm text-muted-foreground">{detail.usage_notes}</p>
            )}

            {word.note && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">📝 {word.note}</p>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {!revealed ? (
        <Button size="lg" className="h-11" onClick={() => setRevealed(true)}>
          显示答案
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <Button size="lg" className="h-11" variant="destructive" onClick={() => handleRate(Rating.Again)}>
            忘记
          </Button>
          <Button size="lg" className="h-11" variant="outline" onClick={() => handleRate(Rating.Hard)}>
            困难
          </Button>
          <Button size="lg" className="h-11" onClick={() => handleRate(Rating.Good)}>
            记得
          </Button>
          <Button size="lg" className="h-11" variant="secondary" onClick={() => handleRate(Rating.Easy)}>
            简单
          </Button>
        </div>
      )}
    </div>
  )
}
