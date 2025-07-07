import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Mic, StopCircle, Calendar, Clock, Ban, History, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { requestMicrophonePermission, startRecording } from '../../utils/microphone';
import { useSubscription } from '../../hooks/useSubscription';

import toast from 'react-hot-toast';

interface CustomerAIChatProps {
  businessId: string;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageCount {
  total_messages: number;
  remaining_messages: number;
  monthly_limit: number;
  month_year: string;
}

const QUICK_REPLIES = [
  {
    text: 'מה התורים שלי?',
    icon: Calendar
  },
  {
    text: 'רוצה לקבוע תור',
    icon: Clock
  },
  {
    text: 'רוצה לבטל תור',
    icon: Ban
  },
  {
    text: 'מה שעות הפעילות?',
    icon: Clock
  },
  {
    text: 'היסטוריית תורים',
    icon: History
  }
];

// הוסף פונקציה לחסימת הצ'אט ללקוח
function isCustomerChatBlocked(businessTokensInfo: any, trialAvailable: boolean) {
  return businessTokensInfo && !businessTokensInfo.available && !trialAvailable;
}

export function CustomerAIChat({ businessId, onClose }: CustomerAIChatProps) {
  const { trialAvailable } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState<MessageCount | null>(null);
  const [businessTokensInfo, setBusinessTokensInfo] = useState<any>(null);

  // שימוש בפונקציה החדשה
  const blocked = isCustomerChatBlocked(businessTokensInfo, trialAvailable);

  useEffect(() => {
    // Get customer phone from localStorage
    const customerPhone = localStorage.getItem('customerPhone');
    if (!customerPhone) {
      onClose();
      return;
    }

    // Set session ID based on customer phone
    setSessionId(customerPhone);

    // Get customer ID and message count
    const initializeChat = async () => {
      try {
        // Get customer ID
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .eq('business_id', businessId)
          .single();

        if (customerError) throw customerError;
        setCustomerId(customer.id);

        // Get message count
        const { data: countData, error: countError } = await supabase
          .rpc('get_customer_monthly_messages', {
            p_customer_id: customer.id,
            p_business_id: businessId
          });

        if (countError) throw countError;
        setMessageCount(countData);

        // Check business tokens availability
        const { data: tokensData, error: tokensError } = await supabase
          .rpc('get_remaining_tokens', {
            p_business_id: businessId
          });

        if (tokensError) throw tokensError;
        setBusinessTokensInfo(tokensData);

      } catch (error) {
        console.error('Error initializing chat:', error);
        toast.error('שגיאה בטעינת נתוני הצ\'אט');
        onClose();
        return;
      }
    };

    initializeChat();

    // Add initial welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'היי! אני לוליטה, העוזרת החכמה שלך 😊 איך אוכל לעזור לך היום?',
      timestamp: new Date()
    }]);

    // Subscribe to chat responses
    const channel = supabase.channel('chat_responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_chat_histories',
          filter: `session_id=eq.${customerPhone}`
        },
        (payload) => {
          const chatMessage = payload.new;
          if (chatMessage.message.type === 'ai') {
            setIsTyping(false);
            addMessage({
              id: chatMessage.id,
              role: 'assistant',
              content: chatMessage.message.content,
              timestamp: new Date()
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [businessId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    // Hide quick replies after user sends a message
    setShowQuickReplies(false);
  };

  const sendMessageToWebhook = async (message: string, type: string = 'text', recordingUrl?: string) => {
    if (!customerId || !businessId) {
      throw new Error('חסרים פרטי משתמש או עסק');
    }

    try {
      // Check if business has enough tokens
      const { data: tokensCheck, error: tokensError } = await supabase
        .rpc('check_tokens_for_action', {
          p_business_id: businessId,
          p_tokens_needed: 1000 // Estimate for a typical message
        });

      if (tokensError) throw tokensError;

      if (tokensCheck && !tokensCheck.has_enough_tokens) {
        throw new Error('לבית העסק אין מספיק טוקנים לביצוע פעולה זו');
      }

      const response = await fetch('https://ofekperetz.app.n8n.cloud/webhook/d0a6e75d-9feb-4bbf-a10f-18c589e165ab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          customer_id: customerId,
          chat_id: sessionId,
          message: type === 'audio' ? recordingUrl : message,
          message_type: type,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message to webhook:', error);
      throw error;
    }
  };

  const handleSendMessage = async (text?: string) => {
    if (blocked) return;
    const messageContent = text || newMessage;
    if (!messageContent.trim()) return;

    // Check if business has enough tokens
    if (businessTokensInfo && !businessTokensInfo.available) {
      toast.error('לבית העסק אין אפשרות לשימוש בבינה מלאכותית בחבילה הנוכחית');
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    addMessage(userMessage);
    setNewMessage('');
    setIsTyping(true);

    try {
      // First save message to database
      const { data: logResult, error: logError } = await supabase
        .rpc('log_customer_message', {
          p_customer_id: customerId,
          p_business_id: businessId,
          p_message: messageContent,
          p_message_type: 'text'
        });

      if (logError) throw logError;

      if (!logResult.success) {
        throw new Error(logResult.error || 'שגיאה בשמירת ההודעה');
      }

      // Update message count
      setMessageCount(logResult.message_count);

      // Then send to webhook
      await sendMessageToWebhook(messageContent);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'שגיאה בשליחת ההודעה');
      setIsTyping(false);
    }
  };

  const handleStartRecording = async () => {
    if (blocked) return;

    // Check if business has enough tokens
    if (businessTokensInfo && !businessTokensInfo.available) {
      toast.error('לבית העסק אין אפשרות לשימוש בבינה מלאכותית בחבילה הנוכחית');
      return;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      toast.error('נדרשת גישה למיקרופון');
      return;
    }

    const recorder = await startRecording();
    if (recorder) {
      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();

      // Start recording duration timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setRecordingTimer(timer);

      // Set up recording data handler
      recorder.ondataavailable = async (event) => {
        const blob = new Blob([event.data], { type: 'audio/wav' });
        try {
          // Upload recording to storage
          const fileName = `${sessionId}/${Date.now()}.wav`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat_recordings')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('chat_recordings')
            .getPublicUrl(fileName);

          const recordingUrl = urlData.publicUrl;

          // First save message to database
          const { data: logResult, error: logError } = await supabase
            .rpc('log_customer_message', {
              p_customer_id: customerId,
              p_business_id: businessId,
              p_message: recordingUrl,
              p_message_type: 'audio'
            });

          if (logError) throw logError;

          if (!logResult.success) {
            throw new Error(logResult.error || 'שגיאה בשמירת ההודעה');
          }

          // Update message count
          setMessageCount(logResult.message_count);

          // Add recording message to chat
          const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: '🎤 הקלטה קולית',
            timestamp: new Date()
          };

          addMessage(userMessage);
          setIsTyping(true);

          // Send recording URL to webhook
          await sendMessageToWebhook('', 'audio', recordingUrl);
        } catch (error: any) {
          console.error('Error sending recording:', error);
          toast.error(error.message || 'שגיאה בשליחת ההקלטה');
          setIsTyping(false);
        }
      };
    } else {
      toast.error('שגיאה בהפעלת ההקלטה');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] overflow-hidden shadow-xl flex flex-col"
        style={{ height: '92vh' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <MessageCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">לוליטה</h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">העוזרת החכמה שלך 🤖✨</p>
                 {businessTokensInfo && !businessTokensInfo.available && !trialAvailable && (
                    <div className="flex items-center gap-1 text-xs">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <span className="text-red-600">
                        שירות לא זמין בחבילה הנוכחית
                      </span>
                    </div>
                  )}
                  {messageCount && (
                    <div className="flex items-center gap-1 text-xs">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-600">
                        נותרו {messageCount.remaining_messages} הודעות החודש
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-[20px] p-4 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('he-IL')}
                </p>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 rounded-[20px] rounded-bl-md p-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {showQuickReplies && (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
              {QUICK_REPLIES.map((reply, index) => {
                const Icon = reply.icon;
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSendMessage(reply.text)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{reply.text}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 relative">
          {blocked && (
            <div className="absolute inset-0 z-20 bg-white/80 flex items-center justify-center rounded-2xl pointer-events-auto">
              <span className="text-red-500 font-semibold text-sm">
                השירות אינו זמין בחבילה הנוכחית
              </span>
            </div>
          )}
          <div className={blocked ? "pointer-events-none select-none opacity-60" : ""}>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={blocked}
                className={`flex items-center justify-center w-[52px] h-[52px] rounded-2xl flex-shrink-0 ${
                  isRecording
                    ? 'bg-red-100 text-red-600 animate-pulse'
                    : blocked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isRecording ? (
                  <StopCircle className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </motion.button>

              <div className="flex-1 relative">
                {isRecording ? (
                  <div className="flex items-center justify-center h-[52px] bg-gray-100 rounded-2xl px-4">
                    <span className="text-red-600 animate-pulse">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center bg-gray-100 rounded-2xl pr-4 pl-12">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="הקלד הודעה..."
                      className="w-full py-3 bg-transparent focus:outline-none resize-none"
                      style={{ height: '52px', lineHeight: '1.5' }}
                      rows={1}
                      disabled={blocked}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSendMessage()}
                      disabled={blocked}
                      className={`absolute left-3 p-2 ${
                        blocked
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-indigo-600 hover:text-indigo-700'
                      }`}
                    >
                      <Send className="h-6 w-6" />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}