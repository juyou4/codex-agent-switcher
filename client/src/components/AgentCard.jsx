import React, { useState } from 'react'

function CopyButton({ text, label = '复制名称', title = '复制名称' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="glass-button !px-4 !h-11 text-[10px] font-mono group/copy transition-all duration-300"
      title={title}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-500 text-xs">已复制</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover/copy:text-[hsl(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">{label}</span>
        </>
      )}
    </button>
  )
}

export default function AgentCard({ agent, isActive, onActivate, onEdit, onDelete, onReset }) {
  const [activating, setActivating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleActivate = async (e) => {
    e.stopPropagation()
    setActivating(true)
    await onActivate(agent.name)
    setActivating(false)
  }

  return (
    <div
      className={`
        glass-card relative flex flex-col gap-8 animate-apple-fade-in group
        hover:scale-[1.01] hover:shadow-2xl transition-all duration-500
        ${isActive ? 'card-active' : ''}
      `}
    >
      {/* Active badge */}
      {isActive && (
        <div className="absolute -top-3 left-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--accent))] text-white text-[11px] font-bold shadow-lg shadow-blue-500/25 ring-4 ring-[hsl(var(--background))] transition-all duration-500 animate-apple-scale-in">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          正在使用
        </div>
      )}

      {/* Actions - 绝对定位在卡片右上角 */}
      <div className="absolute top-6 right-6 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <button
          onClick={() => onEdit(agent)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-[hsl(var(--background))] shadow-sm border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all active:scale-90"
          title={agent.builtin && !agent.overridden ? '自定义覆盖' : '编辑'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {agent.builtin && agent.overridden && (
          <button
            onClick={() => onReset(agent.name)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[hsl(var(--background))] shadow-sm border border-[hsl(var(--border))] hover:bg-amber-500/10 text-[hsl(var(--muted-foreground))] hover:text-amber-500 transition-all active:scale-90"
            title="恢复预设"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        {!agent.builtin && (
          <button
            onClick={() => onDelete(agent.name)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[hsl(var(--background))] shadow-sm border border-[hsl(var(--border))] hover:bg-red-500/10 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-all active:scale-90"
            title="删除"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-[20px] bg-[hsl(var(--muted))] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-500 shrink-0">
          {agent.icon || '🤖'}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap pr-20">
            <h3 className="text-apple-title text-[17px] leading-none">{agent.name}</h3>
            {agent.builtin && (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] font-semibold text-[hsl(var(--muted-foreground))] leading-none">
                系统
              </span>
            )}
            {agent.overridden && (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-semibold text-amber-600 dark:text-amber-400 leading-none">
                修改
              </span>
            )}
          </div>
          {agent.model && (
            <p className="text-apple-caption !text-[13px] font-mono opacity-60 truncate">
              {agent.model_provider ? `${agent.model_provider} · ` : ''}{agent.model}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-apple-body !text-[14px] text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-3 min-h-[3.5rem]">
        {agent.description}
      </p>

      {/* Instructions preview */}
      {agent.developer_instructions && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-colors group/instr uppercase tracking-widest"
          >
            <svg className={`w-3 h-3 transition-transform duration-500 ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            开发者指令
          </button>
          {expanded && (
            <div className="animate-apple-fade-in">
              <pre className="text-[12px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))/0.5] rounded-2xl p-6 overflow-auto max-h-64 scrollbar-thin whitespace-pre-wrap font-mono leading-relaxed border border-[hsl(var(--border))] shadow-inner">
                {agent.developer_instructions}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-6 border-t border-[hsl(var(--border))]">
        <CopyButton text={agent.name} />
        <button
          onClick={handleActivate}
          disabled={activating || isActive}
          className={`
            ${isActive ? 'glass-button !border-transparent !bg-[hsl(var(--muted))/0.5] !text-[hsl(var(--muted-foreground))]' : 'glass-button-primary'}
            !px-8 !h-11 transition-all duration-500 disabled:opacity-50 disabled:cursor-default active:scale-95 shadow-lg
          `}
        >
          {activating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isActive ? "M5 13l4 4L19 7" : "M13 5l7 7-7 7M5 12h15"} />
            </svg>
          )}
          <span className="text-xs font-bold tracking-tight">{isActive ? '已应用' : '应用配置'}</span>
        </button>
      </div>
    </div>
  )
}
