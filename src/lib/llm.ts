import { fetch } from "@tauri-apps/plugin-http"
import type { LlmSettings } from "./settings"
import type { WordDetail } from "./types"

const SYSTEM_PROMPT = `你是一个英语词典助手。给定一个英文单词或短语，返回该词条的详细信息，仅以 JSON 对象输出，不要包含任何解释性文字或 markdown 代码块标记。JSON 结构如下：
{
  "phonetic_uk": "英式音标，如 /wɜːd/，没有则省略",
  "phonetic_us": "美式音标，没有则省略",
  "senses": [ { "pos": "词性缩写，如 n. / v. / adj.", "translation": "中文释义", "definition_en": "简短英文释义，可省略" } ],
  "variants": [ { "label": "变体名称，如 复数 / 过去式 / 比较级", "form": "对应的词形" } ],
  "examples": [ { "en": "英文例句", "zh": "中文翻译" } ],
  "usage_notes": "用法辨析或使用注意事项，没有则省略"
}
senses 至少包含 1 条，覆盖常见词性和释义；examples 提供 2-3 条例句；variants 只在该词确实存在规则或不规则变体时提供。`

export async function lookupWord(term: string, settings: LlmSettings): Promise<WordDetail> {
  if (!settings.apiKey) {
    throw new Error("请先在设置中填写 API Key")
  }

  const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: term },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`查词请求失败 (${res.status}): ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("模型没有返回有效内容")
  }

  let parsed: WordDetail
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("模型返回的内容不是合法 JSON")
  }

  if (!Array.isArray(parsed.senses) || parsed.senses.length === 0) {
    throw new Error("模型返回结果缺少释义")
  }
  parsed.variants ??= []
  parsed.examples ??= []

  return parsed
}
