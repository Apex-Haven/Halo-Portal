import { createContext, useContext, useState } from 'react'

const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  const [open, setOpen] = useState(false)
  return (
    <ChatContext.Provider value={{ open, setOpen }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const ctx = useContext(ChatContext)
  return ctx || { open: false, setOpen: () => {} }
}
