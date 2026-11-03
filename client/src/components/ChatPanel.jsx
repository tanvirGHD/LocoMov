import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCheck, CircleDashed, SendHorizonal, ShieldCheck, X } from 'lucide-react';
import { api } from '../api';
import { getChatSocket } from '../socket';

const quickReplies = {
  en: ['I\'m on my way', 'I\'ve arrived', 'Please share the exact location', 'Picked up'],
  bn: ['আমি রওনা হয়েছি', 'আমি পৌঁছে গেছি', 'দয়া করে সঠিক লোকেশন শেয়ার করুন', 'উত্তোলন করেছি'],
};

function formatClock(value, locale) {
  return new Date(value).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

function formatDateForSeparator(value, locale) {
  const date = new Date(value);
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function messageKey(message) {
  return String(message.clientId || message._id);
}

function sameConversation(message, conversationId) {
  const id = message?.conversation?._id || message?.conversation;
  return String(id) === String(conversationId);
}

function upsertMessages(current, incoming) {
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const next = [...current];
  for (const message of list) {
    if (!message) continue;
    const index = next.findIndex((item) => (
      (message._id && item._id && String(item._id) === String(message._id) && !String(item._id).startsWith('temp-'))
      || (message.clientId && item.clientId && item.clientId === message.clientId)
    ));
    if (index >= 0) next[index] = { ...next[index], ...message };
    else next.push(message);
  }
  next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return next;
}

function buildGroups(messages) {
  const groups = [];
  let current = null;
  for (const message of messages) {
    const key = new Date(message.createdAt).toDateString();
    if (!current || current.key !== key) {
      current = { key, items: [] };
      groups.push(current);
    }
    current.items.push(message);
  }
  return groups;
}

export default function ChatPanel({ task, user, language, open, onClose }) {
  const isBn = language === 'bn';
  const locale = isBn ? 'bn-BD' : 'en-US';
  const copy = isBn ? {
    inbox: 'ইনবক্স',
    statusOnline: 'অনলাইন',
    statusOffline: 'অফলাইন',
    readOnly: 'শুধু পড়া যায়',
    typeHint: 'বার্তা লিখুন',
    send: 'পাঠান',
    report: 'এই কথোপকথন রিপোর্ট করুন',
    newMessages: 'নতুন বার্তা',
    jumpLatest: 'সর্বশেষে যান',
    loading: 'কথোপকথন লোড হচ্ছে...',
    empty: 'এখনও কোনো বার্তা নেই',
    noJobs: 'এখনও কোনো কথোপকথন নেই',
    reportReason: 'কী সমস্যা হয়েছে লিখুন।',
    today: 'আজ',
    error: 'বার্তা পাঠানো যায়নি।',
    readOnlyHint: 'ডেলিভারির পর ৪৮ ঘণ্টা চ্যাট পড়া যায়, নতুন বার্তা পাঠানো যায় না।',
  } : {
    inbox: 'Inbox',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    readOnly: 'Read-only',
    typeHint: 'Type a message',
    send: 'Send',
    report: 'Report this conversation',
    newMessages: 'New messages',
    jumpLatest: 'Jump to latest',
    loading: 'Loading conversation...',
    empty: 'No messages yet',
    noJobs: 'No active conversation yet',
    reportReason: 'Please tell us what went wrong.',
    today: 'Today',
    error: 'Could not send your message.',
    readOnlyHint: 'After delivery, chat stays readable for 48 hours and cannot accept new messages after that.',
  };

  const currentUserId = user?.id || user?._id;
  const [inbox, setInbox] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showJump, setShowJump] = useState(false);
  const [presenceMap, setPresenceMap] = useState({});
  const [safetyWarning, setSafetyWarning] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const threadRef = useRef(null);
  const messagesRef = useRef([]);
  const nearBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const selectedIdRef = useRef(null);

  messagesRef.current = messages;
  selectedIdRef.current = selectedConversationId;

  const openTask = useMemo(() => {
    if (!task) return null;
    return {
      otherName: user.role === 'customer' ? (task.runnerId?.name || 'Runner') : (task.customerId?.name || 'Customer'),
    };
  }, [task, user.role]);

  const selectedConversation = useMemo(() => inbox.find((item) => item._id === selectedConversationId) || null, [inbox, selectedConversationId]);
  const selectedOtherUser = selectedConversation?.otherUser || null;

  const scrollToBottom = (force = false) => {
    const node = threadRef.current;
    if (!node) return;
    if (!force && !nearBottomRef.current) {
      setShowJump(true);
      return;
    }
    node.scrollTop = node.scrollHeight;
    setShowJump(false);
    nearBottomRef.current = true;
  };

  const updateNearBottom = () => {
    const node = threadRef.current;
    if (!node) return false;
    const near = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
    nearBottomRef.current = near;
    setShowJump(!near);
    return near;
  };

  const loadInbox = async () => {
    try {
      if (task?._id) {
        try {
          await api.conversationByTask(task._id);
        } catch (_) {}
      }
      const result = await api.conversations();
      const conversations = result.conversations || [];
      setInbox(conversations);
      setSelectedConversationId((current) => {
        const preferred = conversations.find((item) => item.job?._id === task?._id);
        if (preferred) return preferred._id;
        if (current && conversations.some((item) => item._id === current)) return current;
        return conversations[0]?._id || null;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedConversationId || !window.confirm(isBn ? 'এই বার্তাটি মুছে ফেলতে চান?' : 'Delete this message?')) return;
    try {
      await api.deleteMessage(selectedConversationId, messageId);
      setMessages((current) => current.filter((item) => item._id !== messageId));
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.conversationMessages(conversationId);
      setMessages(upsertMessages([], result.messages || []));
      setHasMore(Boolean(result.hasMore));
      setReadOnly(Boolean(result.conversation?.readOnly));
      setInbox((current) => current.map((item) => item._id === conversationId ? { ...item, ...result.conversation, unreadCount: 0 } : item));
      await api.markSeen(conversationId);
      nearBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOlder = async () => {
    const conversationId = selectedIdRef.current;
    const oldest = messagesRef.current[0];
    if (!conversationId || !hasMore || !oldest || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const node = threadRef.current;
    const previousHeight = node?.scrollHeight || 0;
    try {
      const result = await api.conversationMessages(conversationId, oldest.createdAt);
      setMessages((current) => upsertMessages(current, result.messages || []));
      setHasMore(Boolean(result.hasMore));
      requestAnimationFrame(() => {
        if (!threadRef.current) return;
        threadRef.current.scrollTop = threadRef.current.scrollHeight - previousHeight;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    if (!open || !task) return undefined;
    loadInbox();
    return undefined;
  }, [open, task]);

  useEffect(() => {
    if (!selectedConversationId) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!open) return undefined;
    const socket = getChatSocket();

    const onConnect = () => {
      if (selectedIdRef.current) {
        socket.emit('join:conversation', { conversationId: selectedIdRef.current });
      }
    };

    const onNew = (payload) => {
      const incoming = payload?.message;
      if (!incoming || !sameConversation(incoming, selectedIdRef.current)) return;
      setMessages((current) => upsertMessages(current, incoming));
      setInbox((current) => current.map((item) => item._id === selectedIdRef.current ? { ...item, lastMessage: incoming, unreadCount: 0 } : item));
    };

    const onTypingStart = ({ userId, conversationId }) => {
      if (conversationId !== selectedIdRef.current || userId === currentUserId) return;
      setTypingUsers((current) => (current.includes(userId) ? current : [...current, userId]));
    };

    const onTypingStop = ({ userId, conversationId }) => {
      if (conversationId !== selectedIdRef.current) return;
      setTypingUsers((current) => current.filter((item) => item !== userId));
    };

    const onPresence = ({ userId, status }) => {
      setPresenceMap((current) => ({ ...current, [userId]: status }));
    };

    const onDeleted = ({ messageId }) => {
      setMessages((current) => current.filter((item) => item._id !== messageId));
    };

    socket.on('connect', onConnect);
    socket.on('message:new', onNew);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('presence', onPresence);
    socket.on('message:deleted', onDeleted);
    onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('message:new', onNew);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('presence', onPresence);
      socket.off('message:deleted', onDeleted);
    };
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open || !selectedConversationId) return undefined;
    const socket = getChatSocket();
    socket.emit('join:conversation', { conversationId: selectedConversationId });
    return undefined;
  }, [open, selectedConversationId]);

  useEffect(() => {
    if (loading || loadingOlder) return;
    scrollToBottom(false);
  }, [messages, loading, loadingOlder]);

  const sendMessage = async () => {
    if (sending || readOnly || !selectedConversationId || (!text.trim() && !previewImage)) return;
    const clientId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const outgoingText = text.trim();
    const optimistic = {
      _id: `temp-${clientId}`,
      clientId,
      conversation: selectedConversationId,
      sender: { _id: currentUserId, name: user.name, role: user.role },
      type: previewImage ? 'image' : 'text',
      text: outgoingText || (previewImage ? (isBn ? 'ছবি পাঠানো হয়েছে' : 'Uploaded an image') : ''),
      imageUrl: previewImage?.url || '',
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    nearBottomRef.current = true;
    setMessages((current) => upsertMessages(current, optimistic));
    setSending(true);
    setError('');
    setSafetyWarning('');
    setText('');
    const imageToSend = previewImage;
    setPreviewImage(null);
    try {
      let result;
      if (imageToSend) {
        const formData = new FormData();
        formData.append('image', imageToSend.file);
        formData.append('clientId', clientId);
        if (outgoingText) formData.append('text', outgoingText);
        result = await api.sendMessage(selectedConversationId, formData);
      } else {
        result = await api.sendMessage(selectedConversationId, { text: outgoingText, clientId });
      }
      setMessages((current) => upsertMessages(current, result.message));
      if (result.safetyWarning) setSafetyWarning(result.safetyWarning);
      const socket = getChatSocket();
      socket.emit('typing:stop', { conversationId: selectedConversationId });
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err) {
      setMessages((current) => current.filter((item) => item.clientId !== clientId));
      setError(err.message || copy.error);
      setText(outgoingText);
      setPreviewImage(imageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (value) => {
    if (readOnly) return;
    setText(value);
  };

  const handleReport = async () => {
    if (!selectedConversationId) return;
    const reason = window.prompt(copy.reportReason || 'Please tell us what went wrong.');
    if (!reason) return;
    try {
      await api.reportConversation(selectedConversationId, reason);
      setError(isBn ? 'রিপোর্ট করা হয়েছে।' : 'Report created successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleModeration = async (action, enabled) => {
    if (!selectedConversationId) return;
    try {
      await api.moderateConversation(selectedConversationId, action, enabled);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file || readOnly) return;
    const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isAllowed) {
      setError(isBn ? 'শুধু JPG, PNG ও WebP ছবি চলবে।' : 'Only JPG, PNG, and WebP images are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1280;
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const compressedFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
          setPreviewImage({ file: compressedFile, url: canvas.toDataURL(file.type || 'image/jpeg') });
        }, file.type || 'image/jpeg', 0.82);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  if (!open || !task) return null;

  return (
    <div className="chat-overlay" onClick={onClose}>
      <aside className="chat-shell" onClick={(event) => event.stopPropagation()}>
        <div className="chat-inbox">
          <div className="chat-inbox-header">
            <button className="icon-button" onClick={onClose}><ArrowLeft size={16} /></button>
            <div>
              <strong>{copy.inbox}</strong>
              <small>{task.title}</small>
            </div>
          </div>
          <div className="chat-list">
            {inbox.length === 0 ? <div className="chat-empty-state">{copy.noJobs}</div> : inbox.map((item) => {
              const lastMessage = item.lastMessage;
              const isSelected = item._id === selectedConversationId;
              const lastText = lastMessage?.type === 'image' ? 'Image' : lastMessage?.text || 'Started';
              return (
                <button key={item._id} className={`conversation-item ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedConversationId(item._id)}>
                  <div className="avatar-circle">{item.otherUser?.name?.slice(0, 1).toUpperCase() || 'C'}</div>
                  <div className="conversation-copy">
                    <b>{item.otherUser?.name || 'Chat'}</b>
                    <span>{item.job?.title || task.title}</span>
                    <small>{lastText}</small>
                  </div>
                  <div className="conversation-meta">
                    <time>{lastMessage?.createdAt ? formatClock(lastMessage.createdAt, locale) : ''}</time>
                    {item.unreadCount > 0 && <em>{item.unreadCount}</em>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="chat-thread">
          <header className="chat-thread-header">
            <div className="chat-user-meta">
              <div className="avatar-circle large">{selectedOtherUser?.name?.slice(0, 1).toUpperCase() || 'R'}</div>
              <div>
                <div className="chat-user-name-row">
                  <strong>{selectedOtherUser?.name || openTask?.otherName || 'Runner'}</strong>
                  <ShieldCheck size={14} />
                  {readOnly && <span className="read-only-chip">{copy.readOnly}</span>}
                </div>
                <div className="chat-user-status-row">
                  <span className={`presence-dot ${presenceMap[selectedOtherUser?._id] === 'online' ? 'online' : ''}`} />
                  <small>{presenceMap[selectedOtherUser?._id] === 'online' ? copy.statusOnline : copy.statusOffline}</small>
                </div>
              </div>
            </div>
            <div className="chat-job-title">
              <span>{task.title}</span>
              <div className="chat-moderation-buttons">
                <button className="mini-link" onClick={() => handleModeration('mute', !(selectedConversation?.mutedUsers || []).includes(selectedOtherUser?._id))}>{(selectedConversation?.mutedUsers || []).includes(selectedOtherUser?._id) ? 'Unmute' : 'Mute'}</button>
                <button className="mini-link" onClick={() => handleModeration('block', !(selectedConversation?.blockedUsers || []).includes(selectedOtherUser?._id))}>{(selectedConversation?.blockedUsers || []).includes(selectedOtherUser?._id) ? 'Unblock' : 'Block'}</button>
                <button className="mini-link" onClick={handleReport}>{copy.report}</button>
              </div>
            </div>
          </header>

          {safetyWarning && <div className="chat-safety-banner"><AlertTriangle size={14} /> {safetyWarning}</div>}

          <div
            className="chat-body"
            ref={threadRef}
            onScroll={() => {
              const node = threadRef.current;
              if (!node) return;
              updateNearBottom();
              if (node.scrollTop < 40) loadOlder();
            }}
          >
            {loadingOlder && <div className="chat-older-loader">{copy.loading}</div>}
            {loading ? <div className="chat-skeleton">{copy.loading}</div> : messages.length === 0 ? <div className="chat-empty-state large">{copy.empty}</div> : buildGroups(messages).map((group) => (
              <div key={group.key} className="message-day-group">
                <div className="date-separator">{group.key === new Date().toDateString() ? copy.today : formatDateForSeparator(group.items[0].createdAt, locale)}</div>
                {group.items.map((message) => {
                  const isMine = String(message.sender?._id || message.sender) === String(currentUserId);
                  return (
                    <div key={messageKey(message)} className={`message-row ${isMine ? 'mine' : ''}`}>
                      <div className={`message-bubble ${isMine ? 'mine' : ''}`}>
                        {message.type === 'system' ? <div className="system-message">{message.text}</div> : (
                          <>
                            {message.type === 'image' && message.imageUrl && <img src={message.imageUrl} alt="Chat attachment" className="chat-image" onClick={() => setLightboxImage(message.imageUrl)} />}
                            {message.text && <p>{message.text}</p>}
                            <div className="message-meta">
                              <span>{formatClock(message.createdAt, locale)}</span>
                              {isMine && <CheckCheck size={12} className={message.status === 'seen' ? 'status-seen' : ''} />}
                              {isMine && message._id && !String(message._id).startsWith('temp-') && <button type="button" className="message-delete-action" title={isBn ? 'মুছুন' : 'Delete'} onClick={() => handleDeleteMessage(message._id)}>×</button>}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {typingUsers.length > 0 && <div className="typing-indicator">{typingUsers.length > 1 ? 'Several people are typing' : 'Typing...'}</div>}
            {showJump && <button className="jump-button" onClick={() => scrollToBottom(true)}>{copy.jumpLatest}</button>}
          </div>

          <div className="chat-footer">
            {!readOnly && (
              <div className="chat-quick-replies">
                {quickReplies[language || 'en'].map((reply) => (
                  <button key={reply} type="button" className="reply-chip" onClick={() => handleQuickReply(reply)}>{reply}</button>
                ))}
              </div>
            )}

            {previewImage && <div className="image-preview-box">
              <img src={previewImage.url} alt="Preview" />
              <button type="button" className="remove-image" onClick={() => setPreviewImage(null)}><X size={14} /></button>
            </div>}

            {error && <div className="chat-error">{error}</div>}
            {readOnly && <div className="chat-read-only-banner">{copy.readOnlyHint}</div>}

            <div className="chat-composer">
              <label className={`image-picker ${readOnly || sending ? 'disabled' : ''}`}>
                <Camera size={18} />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} disabled={readOnly || sending} />
              </label>
              <textarea
                value={text}
                rows={1}
                maxLength={3000}
                disabled={readOnly || sending}
                onChange={(event) => {
                  setText(event.target.value);
                  const socket = getChatSocket();
                  if (selectedConversationId) socket.emit('typing:start', { conversationId: selectedConversationId });
                }}
                onBlur={() => {
                  const socket = getChatSocket();
                  if (selectedConversationId) socket.emit('typing:stop', { conversationId: selectedConversationId });
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={readOnly ? copy.readOnly : copy.typeHint}
              />
              <button className="button button-primary" onClick={sendMessage} disabled={sending || readOnly || (!text.trim() && !previewImage)}>
                {sending ? <CircleDashed size={16} className="spin" /> : <SendHorizonal size={16} />} {copy.send}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {lightboxImage && <div className="image-lightbox" onClick={() => setLightboxImage(null)}>
        <button className="icon-button lightbox-close" onClick={() => setLightboxImage(null)}><X size={18} /></button>
        <img src={lightboxImage} alt="Expanded chat media" />
      </div>}
    </div>
  );
}
