"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AmbientBackground } from "../../components/AmbientBackground";
import { GlassContainer } from "../../components/GlassContainer";
import { ChatBubble } from "../../components/ChatBubble";
import { MoodSelector } from "../../components/MoodSelector";
import { useChatStore, Message } from "../../store/useChatStore";
import { usePresenceStore } from "../../store/usePresenceStore";
import { useSocket } from "../../hooks/useSocket";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Heart, MoreHorizontal, Plus, ImageIcon, Mic, Loader2, X, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { BottomNav } from "../../components/BottomNav";
import { useInView } from "react-intersection-observer";
import api from "../../lib/api";
import { Skeleton } from "../../components/Skeleton";

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyTo] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const typingUserName = useChatStore((s) => s.typingUserName);
  const currentUserId = useChatStore((s) => s.currentUserId);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const fetchMoreMessages = useChatStore((s) => s.fetchMoreMessages);
  const isLoadingHistory = useChatStore((s) => s.isLoadingHistory);
  const hasMore = useChatStore((s) => s.hasMore);
  const partnerStatus = usePresenceStore((s) => s.partnerStatus);
  const partnerName = usePresenceStore((s) => s.partnerName);
  const relationshipStatus = usePresenceStore((s) => s.relationshipStatus);
  const fetchRelationship = usePresenceStore((s) => s.fetchRelationship);
  const { user, loading: authLoading } = useAuth();
  
  const { sendMessage, sendTyping, markAsSeen, markAllAsSeen, retryMessage } = useSocket(!!user);
  
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && !user.relationshipId) {
      router.push("/onboarding");
    } else if (user) {
      fetchMessages();
      fetchRelationship(user._id);
    }
  }, [user, authLoading, router, fetchMessages, fetchRelationship]);

  const isAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowNewMessageBadge(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoadingHistory) {
      if (isAtBottom()) {
        scrollToBottom();
      } else {
        setShowNewMessageBadge(true);
      }
    }
  }, [messages, isLoadingHistory, scrollToBottom, isAtBottom]);

  const { ref: topRef, inView: atTop } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (atTop && hasMore && !isLoadingHistory) {
      fetchMoreMessages();
    }
  }, [atTop, hasMore, isLoadingHistory, fetchMoreMessages]);

  const lastPartnerMessage = [...messages].find(m => m.senderId !== currentUserId);

  const handleSend = (content: string, type: string = "text", mediaUrl?: string) => {
    if ((!content.trim() && !mediaUrl) || !user) return;
    const clientGeneratedId = crypto.randomUUID();

    const optimisticMessage: Message = {
      _id: `temp-${clientGeneratedId}`,
      relationshipId: user.relationshipId!,
      senderId: user._id,
      clientGeneratedId,
      content,
      type,
      mediaUrl,
      replyTo: replyingTo,
      status: { sentAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    useChatStore.getState().addMessage(optimisticMessage);
    sendMessage(content, clientGeneratedId, type, mediaUrl, replyingTo?._id);

    setInputValue("");
    setReplyTo(null);
    setShowEmojiPicker(false);
    sendTyping(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const { data: sig } = await api.post("/media/request-upload", { folder: "chat" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", sig.timestamp.toString());
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: formData });
      const cloudData = await cloudRes.json();
      
      // Store public_id, not raw URL — ChatBubble constructs the delivery URL
      handleSend("Shared an image", "image", cloudData.public_id);
      await api.post("/media/confirm-upload", { fileKey: cloudData.public_id, type: "image" });
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  if (authLoading) return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center p-8 bg-[#050505]">
      <div className="w-full max-w-5xl h-[85vh] flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-[2.5rem]" />
        <div className="flex-1 flex flex-col gap-6 py-8 px-4">
           <Skeleton className="h-16 w-1/3 self-start rounded-3xl" />
           <Skeleton className="h-16 w-1/4 self-end rounded-3xl" />
           <Skeleton className="h-32 w-1/2 self-start rounded-3xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (relationshipStatus === "pending") {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center p-4 md:p-8 bg-[#050505]">
        <AmbientBackground />
        <GlassContainer className="w-full max-w-xl p-12 text-center flex flex-col items-center gap-10" intensity="high">
          <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <Heart className="w-10 h-10 text-rose-400/40 animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-serif text-white/90 mb-4 tracking-tight">The Space is Quiet...</h1>
            <p className="text-sm text-white/40 leading-relaxed font-light">
              Your partner hasn't joined this private space yet. <br />
              Once they use your secret code, this chat will come alive.
            </p>
          </div>
          <button onClick={() => router.push("/settings")} className="text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-white/60 font-black transition-all">Go to Settings to copy code</button>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#050505] overflow-hidden font-sans">
      <AmbientBackground />

      <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl flex flex-col min-h-0 flex-1 relative z-10">
        <GlassContainer className="flex-1 min-h-0 flex flex-col shadow-2xl border-white/10 overflow-hidden" intensity="medium">
          {/* Header */}
          <header className="px-6 sm:px-8 py-5 sm:py-6 border-b border-white/5 flex items-center justify-between backdrop-blur-xl bg-white/[0.02]">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative group cursor-pointer">
                <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 blur-md opacity-40 transition-all duration-1000 ${partnerStatus === "online" ? "scale-110 opacity-70 animate-pulse" : "scale-90 opacity-0"}`} />
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-900 border border-white/10 relative z-10 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105 text-white/20 font-serif text-xl sm:text-2xl tracking-tighter italic">
                  {partnerName?.charAt(0) || "Us"}
                </div>
                <div className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#0a0a0a] z-20 shadow-lg ${partnerStatus === "online" ? "bg-emerald-500" : "bg-neutral-600"}`} />
              </div>
              <div>
                <h2 className="font-serif text-lg sm:text-xl text-white/90 tracking-tight leading-none mb-1.5">{partnerName || "My Love"}</h2>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] sm:text-[9px] uppercase tracking-[0.25em] font-black ${partnerStatus === "online" ? "text-emerald-400/80" : "text-white/30"}`}>{partnerStatus}</span>
                  {partnerStatus === "online" && <span className="flex gap-0.5"><span className="w-1 h-1 bg-emerald-400/40 rounded-full animate-ping" /></span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <MoodSelector />
              <div className="h-8 w-px bg-white/5 mx-1" />
              <button className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90 group"><Heart className="w-4 sm:w-5 h-4 sm:h-5 text-white/30 group-hover:text-rose-400/70 transition-colors" /></button>
            </div>
          </header>

          {/* Messages Area */}
          <div className="relative flex-1 overflow-hidden">
          {showNewMessageBadge && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-rose-500/80 backdrop-blur text-white text-[11px] uppercase tracking-widest font-black shadow-lg hover:bg-rose-500 transition-all animate-bounce"
            >
              New Message ↓
            </button>
          )}
          <div ref={scrollRef} onScroll={() => { if (isAtBottom()) setShowNewMessageBadge(false); }} className="h-full overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-4 scroll-smooth scrollbar-hide pb-24 sm:pb-8">
            <div ref={topRef} className="h-1" />
            {isLoadingHistory && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>}
            
            {messages.length === 0 && !isLoadingHistory ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 shadow-inner"><Heart className="w-8 h-8 text-rose-500/20 stroke-[1px] animate-pulse" /></div>
                <h3 className="font-serif text-2xl sm:text-3xl text-white/80 italic mb-3 tracking-tight">The beginning of Us.</h3>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-medium">Every word is a heartbeat</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-1">
                <AnimatePresence initial={false}>
                  {[...messages].reverse().map((msg) => {
                    const isOwn = msg.senderId === currentUserId;
                    const needsSeen = !isOwn && msg._id && !msg.status?.seenAt;
                    return (
                      <div key={msg._id || msg.clientGeneratedId} className="w-full">
                        <ChatBubble
                          message={msg}
                          isOwn={isOwn}
                          onReply={setReplyTo}
                          onRetry={msg.failed ? retryMessage : undefined}
                          onVisible={needsSeen ? () => markAsSeen(msg._id) : undefined}
                        />
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
            
            {isTyping && (
              <motion.div initial={{ opacity: 0, y: 10, x: -5 }} animate={{ opacity: 1, y: 0, x: 0 }} className="text-[10px] text-white/30 italic px-4 py-3 flex items-center gap-3 bg-white/[0.02] rounded-2xl self-start border border-white/5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="font-serif italic tracking-wide">{typingUserName || "Partner"} is thinking...</span>
              </motion.div>
            )}
          </div>
          </div>

          {/* Input Area */}
          <footer className="px-4 sm:px-8 py-5 sm:py-8 bg-black/20 backdrop-blur-3xl border-t border-white/5 relative z-[200]">
            <AnimatePresence>
              {replyingTo && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="absolute bottom-full left-0 right-0 p-4 bg-black/80 backdrop-blur-[100px] border-t border-white/5 flex items-center justify-between"
                >
                  <div className="flex flex-col gap-1 border-l-2 border-rose-500/50 pl-4 overflow-hidden">
                    <span className="text-[9px] uppercase tracking-widest text-rose-400 font-black">Replying to whispering...</span>
                    <p className="text-xs text-white/40 truncate italic">"{replyingTo.content}"</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-2 rounded-full hover:bg-white/5 text-white/20 transition-all"><X className="w-4 h-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.9 }}
                  className="absolute bottom-full left-4 sm:left-8 mb-6 p-4 rounded-[2rem] bg-black/90 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[300] grid grid-cols-6 gap-3"
                >
                  {["❤️", "✨", "😊", "🔥", "🌸", "🥺", "💋", "💌", "💍", "🥰", "👫", "🌙", "☁️", "🫂", "🤞", "🧸", "🤍", "🕊️"].map(emoji => (
                    <button key={emoji} onClick={() => { setInputValue(p => p + emoji); setShowEmojiPicker(false); }} className="text-2xl hover:scale-125 transition-transform p-1.5 active:scale-95">{emoji}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 sm:gap-4">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              <div className="flex items-center gap-1">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-white/70 hover:bg-white/10 transition-all active:scale-95 group">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />}
                </button>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 sm:p-3.5 rounded-2xl transition-all active:scale-95 ${showEmojiPicker ? "bg-white/10 text-white" : "text-white/30 hover:text-white/70"}`}>
                  <Smile className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative flex-1 group">
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={handleInputChange} 
                  onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)} 
                  placeholder="Whisper something..." 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] py-4 sm:py-5 pl-6 sm:pl-7 pr-14 sm:pr-16 text-[14px] sm:text-[15px] text-white/90 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all placeholder:text-white/15 font-light" 
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button className="p-2 sm:p-3 rounded-xl text-white/20 hover:text-white/50 transition-all active:scale-90"><Mic className="w-4 sm:w-5 h-4 sm:h-5" /></button>
                  <motion.button onClick={() => handleSend(inputValue)} disabled={!inputValue.trim()} animate={{ scale: inputValue.trim() ? 1 : 0.8, opacity: inputValue.trim() ? 1 : 0 }} className="p-2.5 sm:p-3.5 rounded-2xl bg-white/10 text-white shadow-xl hover:bg-white/20 active:scale-90 transition-all"><Send className="w-4 sm:w-5 h-4 sm:h-5" /></motion.button>
                </div>
              </div>
            </div>
          </footer>
        </GlassContainer>
      </div>
      </div>
    </div>
  );
}
