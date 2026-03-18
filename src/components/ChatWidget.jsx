import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send, Sparkles, Trash2, History, Plus, ChevronLeft, Pencil, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    content: 'Hi! I\'m HALO AI. I can help you check your transfer status. Try **company + traveler**, your Apex ID, or your name. Say **help** for more options.',
    timestamp: new Date(),
  },
]

const SUGGESTION_CHIPS = [
  'Status for Company, Traveler',
  'Help',
  'Track transfer for John',
]

const CHAT_SESSIONS_KEY = 'halo_chat_sessions'
const CHAT_HISTORY_KEY = 'halo_chat_history' // legacy

function getStorageKey(userId) {
  return `${CHAT_SESSIONS_KEY}_${userId || 'guest'}`
}

function getLegacyKey(userId) {
  return userId ? null : CHAT_HISTORY_KEY
}

function generateId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getChatTitle(messages) {
  const firstUser = messages.find((m) => m.role === 'user')
  if (firstUser?.content) {
    const text = firstUser.content.trim()
    return text.length > 35 ? `${text.slice(0, 35)}…` : text
  }
  return 'New chat'
}

function parseMessage(m) {
  return {
    ...m,
    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
  }
}

function loadChatSessions(userId) {
  try {
    const key = getStorageKey(userId)
    let stored = localStorage.getItem(key)
    if (!stored) {
      // Migrate from legacy single-chat format (guest only)
      const legacyKey = getLegacyKey(userId)
      if (legacyKey) {
        const legacy = localStorage.getItem(legacyKey)
        if (legacy) {
          try {
            const messages = JSON.parse(legacy).map(parseMessage)
            if (messages.length > 0) {
              const migrated = [{
                id: generateId(),
                title: getChatTitle(messages),
                messages,
                createdAt: new Date(),
                updatedAt: new Date(),
              }]
              saveChatSessions(migrated, userId)
              localStorage.removeItem(legacyKey)
              return migrated
            }
          } catch {
            // ignore
          }
        }
      }
      return []
    }
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.map((chat) => ({
      ...chat,
      messages: (chat.messages || []).map(parseMessage),
      createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
      updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : new Date(),
    }))
  } catch {
    return []
  }
}

function saveChatSessions(sessions, userId) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(sessions))
  } catch {
    // Ignore storage errors
  }
}

// Simple **bold** to <strong> conversion, preserve newlines
function formatReply(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>
    return (
      <React.Fragment key={i}>
        {part.split('\n').map((line, j) => (
          <span key={j}>
            {line}
            {j < part.split('\n').length - 1 && <br />}
          </span>
        ))}
      </React.Fragment>
    )
  })
}

const ChatWidget = () => {
  const { user } = useAuth()
  const userId = user?._id || null

  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingChatId, setEditingChatId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const renameInputRef = useRef(null)

  const currentChat = sessions.find((s) => s.id === currentChatId) || sessions[0]
  const messages = currentChat?.messages ?? INITIAL_MESSAGES

  // Load sessions for current user when userId changes (login/logout/switch)
  useEffect(() => {
    const loaded = loadChatSessions(userId)
    if (loaded.length === 0) {
      const newChat = {
        id: generateId(),
        title: 'New chat',
        messages: [...INITIAL_MESSAGES],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setSessions([newChat])
      setCurrentChatId(newChat.id)
    } else {
      setSessions(loaded)
      setCurrentChatId(loaded[0].id)
    }
  }, [userId])

  useEffect(() => {
    if (currentChatId === null && sessions.length > 0) {
      setCurrentChatId(sessions[0].id)
    }
  }, [sessions, currentChatId])

  useEffect(() => {
    if (sessions.length > 0) {
      saveChatSessions(sessions, userId)
    }
  }, [sessions, userId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentChatId])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const updateCurrentChat = (updater) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentChatId
          ? { ...s, ...updater(s), updatedAt: new Date() }
          : s
      )
    )
  }

  const handleSend = async (textToSend) => {
    const text = (textToSend ?? input.trim()).trim()
    if (!text || loading) return

    setInput('')
    const userMsg = { role: 'user', content: text, timestamp: new Date() }
    updateCurrentChat((s) => ({
      messages: [...s.messages, userMsg],
      title: s.messages.length <= 1 ? getChatTitle([...s.messages, userMsg]) : s.title,
    }))
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()

      if (data.success) {
        const botMsg = {
          role: 'bot',
          content: data.reply,
          timestamp: new Date(),
          transferId: data.transferId,
        }
        updateCurrentChat((s) => ({ messages: [...s.messages, botMsg] }))
      } else {
        updateCurrentChat((s) => ({
          messages: [
            ...s.messages,
            {
              role: 'bot',
              content: data.message || 'Something went wrong. Please try again.',
              timestamp: new Date(),
            },
          ],
        }))
      }
    } catch (err) {
      updateCurrentChat((s) => ({
        messages: [
          ...s.messages,
          {
            role: 'bot',
            content: 'Unable to connect. Please check your connection and try again.',
            timestamp: new Date(),
          },
        ],
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    const newChat = {
      id: generateId(),
      title: 'New chat',
      messages: [...INITIAL_MESSAGES],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions((prev) => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setShowHistory(false)
  }

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId)
    setShowHistory(false)
  }

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation()
    setEditingChatId(null)
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== chatId)
      if (currentChatId === chatId && next.length > 0) {
        setCurrentChatId(next[0].id)
      } else if (currentChatId === chatId && next.length === 0) {
        handleNewChat()
      }
      return next
    })
  }

  const handleStartRename = (e, chat) => {
    e.stopPropagation()
    setEditingChatId(chat.id)
    setEditingTitle(chat.title || '')
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const handleSaveRename = (chatId) => {
    const trimmed = editingTitle.trim()
    if (trimmed) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === chatId ? { ...s, title: trimmed, updatedAt: new Date() } : s
        )
      )
    }
    setEditingChatId(null)
    setEditingTitle('')
  }

  const handleRenameKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRename(chatId)
    }
    if (e.key === 'Escape') {
      setEditingChatId(null)
      setEditingTitle('')
    }
  }

  const showSuggestions = messages.length <= 1 && !loading
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center z-40"
        aria-label="Open HALO AI"
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-end p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/50 sm:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex flex-col bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-xl z-10 overflow-hidden w-full sm:w-[460px] h-[85vh] sm:h-[540px] sm:max-h-[85vh]">
            {/* Chat history - slides in as overlay, no layout shift */}
            <div
              className={`absolute left-0 top-0 bottom-0 z-20 flex flex-col bg-card border-r border-border shadow-lg transition-[transform] duration-200 ease-out ${
                showHistory ? 'translate-x-0' : '-translate-x-full'
              } ${!showHistory ? 'pointer-events-none' : ''}`}
              style={{ width: '220px' }}
            >
              <button
                onClick={() => setShowHistory(false)}
                className="flex items-center gap-2 px-3 py-2.5 m-2 rounded-lg hover:bg-muted text-foreground text-sm font-medium shrink-0"
                aria-label="Back to chat"
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-3 py-2.5 mx-2 mb-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus size={16} />
                New chat
              </button>
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 min-h-0">
                {sortedSessions.map((chat) => (
                  <div
                    key={chat.id}
                    className={`rounded-lg mb-1 group flex items-center gap-2 ${
                      chat.id === currentChatId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    } ${editingChatId === chat.id ? 'p-1' : 'p-0'}`}
                  >
                    {editingChatId === chat.id ? (
                      <div className="flex-1 flex items-center gap-1 min-w-0">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleSaveRename(chat.id)}
                          onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveRename(chat.id)
                          }}
                          className="p-1 rounded hover:bg-primary/20 text-primary shrink-0"
                          aria-label="Save"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSelectChat(chat.id)}
                          className="flex-1 min-w-0 text-left px-3 py-2 truncate text-sm"
                        >
                          {chat.title}
                        </button>
                        <button
                          onClick={(e) => handleStartRename(e, chat)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity shrink-0"
                          aria-label="Rename"
                          title="Rename chat"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                          aria-label="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main chat area - full width, history overlays when open */}
            <div className="flex flex-1 min-h-0 flex-col min-w-0 overflow-hidden">
              <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
                {/* Header - fixed, does not scroll with messages */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={showHistory ? 'Hide history' : 'Chat history'}
                    >
                      <History size={20} />
                    </button>
                    <Sparkles size={20} className="text-primary" />
                    <span className="font-semibold text-foreground">HALO AI</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleNewChat}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="New chat"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close chat"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Messages - scrollable area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-foreground border border-border'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">
                          {msg.role === 'bot' ? formatReply(msg.content) : msg.content}
                        </div>
                        {msg.role === 'bot' && msg.transferId && (
                          <Link
                            to={`/tracking?id=${encodeURIComponent(msg.transferId)}`}
                            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
                            onClick={() => setOpen(false)}
                          >
                            View full tracking →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted/50 border border-border rounded-lg px-4 py-2">
                        <span className="inline-flex gap-0.5 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                        </span>
                      </div>
                    </div>
                  )}
                  {showSuggestions && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {SUGGESTION_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleSend(chip)}
                          className="px-3 py-1.5 text-xs rounded-full bg-muted/70 hover:bg-muted border border-border text-foreground transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input - fixed at bottom */}
                <div className="flex-shrink-0 p-4 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Company + traveler, Apex ID, or name..."
                      className="flex-1 px-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      disabled={loading}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWidget
