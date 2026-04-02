import React, { useEffect, useMemo, useState } from 'react'

const DOC_KINDS = [
  { value: 'base', label: 'AGENTS.md' },
  { value: 'override', label: 'AGENTS.override.md' },
]

const EMPTY_DOC = {
  path: '',
  displayPath: '',
  exists: false,
  content: '',
  sizeBytes: 0,
  modifiedAt: null,
}

function getByteSize(content) {
  return new Blob([content || '']).size
}

function formatDateTime(value) {
  if (!value) return '未创建'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function uniqueAgents(agents = []) {
  const seen = new Set()
  return agents.filter((agent) => {
    if (!agent?.name || seen.has(agent.name)) return false
    seen.add(agent.name)
    return true
  })
}

function findAgentBySandbox(agents, sandboxMode) {
  return uniqueAgents(agents).find((agent) => agent?.sandbox_mode === sandboxMode)?.name || null
}

function buildGlobalTemplate(globalCustomAgents = []) {
  const readOnlyAgent = findAgentBySandbox(globalCustomAgents, 'read-only') || '[请创建 read-only 全局代理]'
  const standardAgent = findAgentBySandbox(globalCustomAgents, 'workspace-write') || '[请创建 workspace-write 全局代理]'
  const privilegedAgent = findAgentBySandbox(globalCustomAgents, 'danger-full-access') || '[请创建 danger-full-access 全局代理]'

  return `# AGENTS.md - Global Subagent Orchestration Policy

## 重要说明
- 本文件只定义自然语言编排策略，不直接设置 sandbox_mode。
- 真实权限仍来自 ~/.codex/agents/*.toml 与 config.toml。
- 修改后通常对下一次新任务 / 新会话生效，不保证立即热更新当前会话。

## 默认路由规则
- 默认优先使用 \`${readOnlyAgent}\` 处理分析、审查、阅读、检索、追踪代码路径等只读任务。
- 只有在任务明确需要修改工作区文件时，才允许使用 \`${standardAgent}\`。
- 只有当用户明确授权高权限操作时，才允许使用 \`${privilegedAgent}\`。

## 高权限授权约束
- 若用户没有明确表达“允许修改”“可以高权限执行”“允许 full access”之类授权，不得使用 danger-full-access 代理。
- 调用高权限代理前，必须先总结：
  1. 将要使用的代理名称
  2. 对应 sandbox_mode
  3. 计划修改的文件
  4. 计划执行的命令

## 输出要求
- 所有 subagent 的结果应精炼返回，只保留对主代理继续决策必要的信息。
- 避免把长日志、无关上下文和重复分析回传给主代理。
`
}

function buildProjectTemplate(projectAgents = [], globalCustomAgents = []) {
  const mergedReadOnlyAgents = uniqueAgents([...projectAgents, ...globalCustomAgents])
  const mergedPrivilegedAgents = uniqueAgents([...projectAgents, ...globalCustomAgents])
  const readOnlyAgent = findAgentBySandbox(mergedReadOnlyAgents, 'read-only') || '[请创建 read-only 项目代理]'
  const standardAgent = findAgentBySandbox(uniqueAgents([...projectAgents, ...globalCustomAgents]), 'workspace-write') || '[请创建 workspace-write 项目代理]'
  const privilegedAgent = findAgentBySandbox(mergedPrivilegedAgents, 'danger-full-access') || '[请创建 danger-full-access 项目代理]'

  return `# AGENTS.md - Project Subagent Permission Policy

## 重要说明
- 本文件只定义项目级编排规则，不直接设置 sandbox_mode。
- 真实权限仍来自 .codex/agents/*.toml 与 config.toml。
- 修改后通常对下一次新任务 / 新会话生效，不保证立即热更新当前会话。

## 项目默认编排
- 默认使用 \`${readOnlyAgent}\` 处理代码分析、架构理解、review、排查与资料收集。
- 仅当任务明确要求修改工作区文件时，才允许使用 \`${standardAgent}\`。
- 仅当用户明确授权高权限操作时，才允许使用 \`${privilegedAgent}\`。

## 高权限约束
- 未获得用户明确授权前，禁止使用 danger-full-access 代理。
- 调用高权限代理前，必须先总结：
  1. 将要使用的代理名称
  2. 对应 sandbox_mode
  3. 将要修改的文件
  4. 将要执行的命令
- 如果用户只要求分析、解释、定位问题，不得切换到高权限代理。

## 输出要求
- 所有 subagent 输出应尽量简洁，避免长日志和无关上下文回流。
- 需要修改代码时，优先先由只读代理确认范围，再交给写权限代理执行。
`
}

export default function AgentsMdEditor({
  scope = 'global',
  projectDir = '',
  onClose,
  onSaved,
  globalCustomAgents = [],
  projectAgents = [],
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ scope, projectDir: projectDir || null, currentCwd: projectDir || null, effectiveLimitBytes: 32768, fallbackFilenames: [], chain: [] })
  const [docs, setDocs] = useState({ base: EMPTY_DOC, override: EMPTY_DOC })
  const [drafts, setDrafts] = useState({ base: '', override: '' })
  const [activeKind, setActiveKind] = useState('base')
  const [cwdInput, setCwdInput] = useState(projectDir || '')

  const isProjectScope = scope === 'project'

  const loadDocs = async ({ silent = false, cwd = undefined } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const nextCwd = cwd !== undefined ? cwd : cwdInput
      const url = scope === 'project'
        ? `/api/agents-md?scope=project&project=${encodeURIComponent(projectDir)}${nextCwd ? `&cwd=${encodeURIComponent(nextCwd)}` : ''}`
        : '/api/agents-md?scope=global'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '加载 AGENTS 文件失败')
      setMeta({
        scope: data.scope,
        projectDir: data.projectDir || null,
        currentCwd: data.currentCwd || data.projectDir || null,
        effectiveLimitBytes: data.effectiveLimitBytes || 32768,
        fallbackFilenames: Array.isArray(data.fallbackFilenames) ? data.fallbackFilenames : [],
        chain: Array.isArray(data.chain) ? data.chain : [],
      })
      if (scope === 'project') {
        setCwdInput(data.currentCwd || data.projectDir || projectDir || '')
      }
      setDocs({
        base: data.base || EMPTY_DOC,
        override: data.override || EMPTY_DOC,
      })
      setDrafts({
        base: data.base?.content || '',
        override: data.override?.content || '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    const initialCwd = projectDir || ''
    setCwdInput(initialCwd)
    loadDocs({ cwd: initialCwd })
  }, [scope, projectDir])

  const hasUnsavedChanges = useMemo(
    () => drafts.base !== docs.base.content || drafts.override !== docs.override.content,
    [drafts, docs],
  )
  const currentDraft = drafts[activeKind]
  const currentDoc = docs[activeKind]
  const currentSize = getByteSize(currentDraft)
  const overLimit = currentSize > meta.effectiveLimitBytes

  const handleClose = () => {
    if (hasUnsavedChanges && !confirm('存在未保存修改，确定要关闭吗？')) return
    onClose?.()
  }

  const handleDraftChange = (value) => {
    setDrafts((prev) => ({ ...prev, [activeKind]: value }))
    setError('')
  }

  const handleReload = async () => {
    if (drafts[activeKind] !== docs[activeKind].content && !confirm(`当前 ${DOC_KINDS.find((item) => item.value === activeKind)?.label} 有未保存修改，确定要重新加载吗？`)) {
      return
    }
    await loadDocs({ silent: false })
  }

  const handleTemplateInsert = () => {
    const template = isProjectScope
      ? buildProjectTemplate(projectAgents, globalCustomAgents)
      : buildGlobalTemplate(globalCustomAgents)

    if (currentDraft.trim()) {
      if (confirm('当前编辑区已有内容。是否用模板替换当前内容？')) {
        handleDraftChange(template)
        return
      }
      if (confirm('是否将模板追加到当前内容末尾？')) {
        handleDraftChange(`${currentDraft.trimEnd()}\n\n${template}`)
      }
      return
    }

    handleDraftChange(template)
  }

  const handleSave = async () => {
    if (!currentDraft.trim()) {
      setError('内容不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = isProjectScope
        ? `/api/agents-md?scope=project&project=${encodeURIComponent(projectDir)}`
        : '/api/agents-md?scope=global'
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: activeKind, content: currentDraft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      setDocs((prev) => ({ ...prev, [activeKind]: data.doc || EMPTY_DOC }))
      setDrafts((prev) => ({ ...prev, [activeKind]: data.doc?.content || '' }))
      onSaved?.(`${DOC_KINDS.find((item) => item.value === activeKind)?.label} 已保存`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定删除 ${DOC_KINDS.find((item) => item.value === activeKind)?.label} 吗？`)) return
    setDeleting(true)
    setError('')
    try {
      const url = isProjectScope
        ? `/api/agents-md?scope=project&project=${encodeURIComponent(projectDir)}&kind=${activeKind}`
        : `/api/agents-md?scope=global&kind=${activeKind}`
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')
      setDocs((prev) => ({ ...prev, [activeKind]: data.doc || EMPTY_DOC }))
      setDrafts((prev) => ({ ...prev, [activeKind]: '' }))
      onSaved?.(`${DOC_KINDS.find((item) => item.value === activeKind)?.label} 已删除`)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const title = isProjectScope ? '项目 AGENTS 规则' : '全局 AGENTS 规则'
  const fallbackText = meta.fallbackFilenames.length > 0 ? meta.fallbackFilenames.join(', ') : '未配置'
  const activeLabel = DOC_KINDS.find((item) => item.value === activeKind)?.label || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 animate-apple-fade-in backdrop-blur-sm">
      <div className="w-full max-w-4xl glass-modal animate-apple-scale-in flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-[hsl(var(--border))] shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-apple-title text-[hsl(var(--foreground))]">{title}</h2>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {isProjectScope ? meta.projectDir || projectDir : '~/.codex'}
            </p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-[var(--radius)] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-all duration-300 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          <div className="p-4 rounded-[var(--radius)] bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[13px] leading-relaxed space-y-1">
            <p>AGENTS.md 不直接设置 sandbox_mode。</p>
            <p>真实权限仍来自 `.codex/agents/*.toml` 和 `config.toml`。</p>
            <p>保存后通常对下一次新任务 / 新会话生效，不保证当前会话热更新。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
            <div className="glass-card !p-4 shadow-none">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">大小建议</p>
              <p className="mt-2 font-mono text-[hsl(var(--foreground))]">{meta.effectiveLimitBytes} bytes</p>
            </div>
            <div className="glass-card !p-4 shadow-none">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Fallback Filenames</p>
              <p className="mt-2 text-[hsl(var(--foreground))] break-words">{fallbackText}</p>
            </div>
            <div className="glass-card !p-4 shadow-none">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">模板来源</p>
              <p className="mt-2 text-[hsl(var(--foreground))]">
                {isProjectScope ? '优先项目 agents，其次全局 custom agents' : '全局 custom agents'}
              </p>
            </div>
          </div>

          {isProjectScope && (
            <div className="glass-card !p-5 shadow-none space-y-4">
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <p className="text-apple-title text-[hsl(var(--foreground))]">目录链浏览</p>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                    查看从项目根目录到当前目录的 AGENTS 文件覆盖链。这里只读，不在这里直接编辑子目录文件。
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={cwdInput}
                    onChange={(e) => setCwdInput(e.target.value)}
                    placeholder={projectDir}
                    className="copyable-text flex-1 md:w-[420px] h-10 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 font-mono text-[12px] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))]"
                  />
                  <button type="button" onClick={() => loadDocs({ silent: false })} className="glass-button h-10 px-4 whitespace-nowrap">
                    查看链路
                  </button>
                </div>
              </div>

              {meta.currentCwd && (
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  当前目录：<span className="font-mono text-[hsl(var(--foreground))]">{meta.currentCwd}</span>
                </p>
              )}

              <div className="space-y-3">
                {meta.chain.length === 0 ? (
                  <div className="p-4 rounded-[var(--radius)] border border-dashed border-[hsl(var(--border))] text-[12px] text-[hsl(var(--muted-foreground))]">
                    当前没有可展示的目录链信息。
                  </div>
                ) : meta.chain.map((item, index) => (
                  <div key={`${item.dir}-${index}`} className="p-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.45]">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{item.relativeDir === '.' ? '项目根目录' : item.relativeDir}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 break-all">{item.dir}</p>
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))] space-y-1 md:text-right">
                        <p>AGENTS.md：{item.base?.exists ? '存在' : '无'}</p>
                        <p>AGENTS.override.md：{item.override?.exists ? '存在' : '无'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DOC_KINDS.map((item) => {
              const isDirty = drafts[item.value] !== docs[item.value].content
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveKind(item.value)}
                  className={`glass-card !p-4 shadow-none text-left transition-colors ${activeKind === item.value ? 'border-[hsl(var(--accent))]' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-apple-title text-[hsl(var(--foreground))]">{item.label}</p>
                      <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                        {docs[item.value].exists ? '已创建' : '未创建'}
                        {isDirty ? ' · 未保存修改' : ''}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${docs[item.value].exists ? 'border-emerald-500/20 text-emerald-600 bg-emerald-500/10' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]'}`}>
                      {docs[item.value].exists ? 'EXISTS' : 'EMPTY'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-3 break-all">{docs[item.value].displayPath || '未生成路径'}</p>
                </button>
              )
            })}
          </div>

          <div className="glass-card !p-5 shadow-none">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <p className="text-apple-title text-[hsl(var(--foreground))]">{activeLabel}</p>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1 break-all">{currentDoc.displayPath || '未生成路径'}</p>
              </div>
              <div className="text-[12px] text-[hsl(var(--muted-foreground))] md:text-right">
                <p>{currentDoc.exists ? `最后修改：${formatDateTime(currentDoc.modifiedAt)}` : '文件尚未创建'}</p>
                <p className={overLimit ? 'text-red-500 font-semibold mt-1' : 'mt-1'}>
                  当前大小：{currentSize} bytes{overLimit ? ` · 超出建议上限 ${meta.effectiveLimitBytes}` : ''}
                </p>
              </div>
            </div>

            <textarea
              value={currentDraft}
              onChange={(e) => handleDraftChange(e.target.value)}
              rows={18}
              className="copyable-text w-full rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 font-mono text-[13px] leading-relaxed text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] resize-y"
              placeholder={`在这里编辑 ${activeLabel}...`}
            />

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button type="button" onClick={handleSave} disabled={loading || saving || deleting} className="glass-button-primary min-w-[96px] h-9 !py-0 disabled:opacity-50">
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" onClick={handleReload} disabled={loading || saving || deleting} className="glass-button min-w-[96px] h-9 !py-0 disabled:opacity-50">
                重新加载
              </button>
              <button type="button" onClick={handleTemplateInsert} disabled={loading || saving || deleting} className="glass-button min-w-[96px] h-9 !py-0 disabled:opacity-50">
                插入模板
              </button>
              <button type="button" onClick={handleDelete} disabled={loading || saving || deleting} className="glass-button min-w-[96px] h-9 !py-0 text-red-500 hover:text-red-500 disabled:opacity-50">
                {deleting ? '删除中…' : '删除文件'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] font-bold animate-apple-fade-in shadow-none">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[hsl(var(--border))] shrink-0 bg-apple-section-secondary flex items-center justify-between rounded-b-[inherit]">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {loading ? '加载中…' : hasUnsavedChanges ? '存在未保存修改' : '已与磁盘内容同步'}
          </p>
          <button type="button" onClick={handleClose} className="glass-button !border-none text-[hsl(var(--muted-foreground))] uppercase tracking-widest text-[11px] !bg-transparent shadow-none hover:bg-[hsl(var(--muted))]">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
