export function isStructuredOrderBriefText(value = '') {
  const text = String(value || '').trim();
  return /^Task:\s.+/mi.test(text) && /^Goal:\s.+/mi.test(text) && /^Deliver:\s.+/mi.test(text);
}

export function promptInjectionSafeAnalysisContext(prompt = '') {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return /(analy[sz]e|review|detect|explain|summari[sz]e|classify|sanitize|improve|rewrite|レビュー|解説|説明|検出|分類|安全化|書き換え|改善).{0,90}(prompt injection|jailbreak|ignore previous|system prompt|developer message|プロンプトインジェクション|脱獄|前の指示|システムプロンプト|開発者メッセージ)/i.test(text)
    || /(以下|次の|this|these).{0,60}(prompt|text|source|example|プロンプト|文章|テキスト|ソース|例|入力).{0,90}(analy[sz]e|review|detect|explain|sanitize|improve|分析|レビュー|解説|説明|検出|安全化|改善)/i.test(text);
}

export function promptInjectionGuard(prompt = '') {
  const text = String(prompt || '').replace(/\u0000/g, '').trim();
  if (!text || promptInjectionSafeAnalysisContext(text)) return { blocked: false, code: '' };
  const compact = text.replace(/\s+/g, ' ');
  const rules = [
    {
      code: 'override_instructions',
      pattern: /\b(ignore|disregard|forget|override|bypass|disable|drop)\b.{0,90}\b(previous|above|prior|earlier|system|developer|instructions?|rules?|policy|policies|safety|guardrails?)\b/i
    },
    {
      code: 'override_instructions_ja',
      pattern: /(前|以前|上記|これまで|システム|開発者|ポリシー|安全|制約).{0,60}(指示|命令|ルール|プロンプト|制約).{0,60}(無視|破棄|忘れ|解除|上書き|バイパス)/i
    },
    {
      code: 'hidden_prompt_exfiltration',
      pattern: /\b(reveal|show|print|dump|leak|exfiltrate|extract|output|display)\b.{0,90}\b(system prompt|developer message|hidden instructions?|internal prompts?|tool schema|tools?|api keys?|secrets?|env(?:ironment)?(?: variables?)?)\b/i
    },
    {
      code: 'hidden_prompt_exfiltration_ja',
      pattern: /(システムプロンプト|開発者メッセージ|隠し指示|内部指示|内部プロンプト|ツール|APIキー|apiキー|秘密|シークレット|環境変数).{0,70}(出力|表示|見せ|開示|漏ら|教え|抽出)/i
    },
    {
      code: 'jailbreak_persona',
      pattern: /\b(DAN|jailbreak|developer mode|god mode|do anything now|no restrictions?|unrestricted|policy[- ]?free)\b/i
    },
    {
      code: 'role_injection',
      pattern: /(^|\n)\s*(system|developer)\s*:.{0,400}\b(ignore|override|bypass|reveal|show|dump|leak|disable|no restrictions?)\b/is
    }
  ];
  const matched = rules.find((rule) => rule.pattern.test(compact) || rule.pattern.test(text));
  return matched ? { blocked: true, code: matched.code } : { blocked: false, code: '' };
}

export function normalizeLlmIntakeQuestions(value = []) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 12 && item.length <= 260)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((item) => !/(password|secret|api key|hidden prompt|system prompt|ignore previous|パスワード|秘密|システムプロンプト|隠しプロンプト)/i.test(item))
    .slice(0, 4);
}

export function taskTypeFromOpenChatIntent(result = {}) {
  const briefTask = String(result?.order_brief || result?.orderBrief || '').match(/^Task:\s*([a-z0-9_-]+)/im)?.[1] || '';
  if (briefTask) return briefTask.trim().toLowerCase();
  return String(result?.task_type || result?.taskType || '').trim().toLowerCase();
}

export function openChatIntentShouldUseStepIntake(result = {}) {
  const action = String(result?.action || '').trim();
  if (action !== 'ask_clarifying_question') return false;
  const intent = String(result?.intent || '').trim();
  return ['natural_business_growth', 'natural_marketing_launch', 'natural_idea_discovery'].includes(intent);
}
