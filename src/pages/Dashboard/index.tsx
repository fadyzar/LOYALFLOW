import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, isSameDay, isAfter, startOfDay, endOfDay, addHours, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { useSubscription } from '../../hooks/useSubscription';
import {
  Calendar,
  MessageSquare,
  Mic,
  Send,
  StopCircle,
  User,
  Clock,
  Scissors,
  Ban,
  Check,
  X,
  AlertTriangle,
  UserX,
  Trash2,
  AlertCircle,
  LogOut,
  Settings,
  Users,
  BarChart2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/auth/hooks';
import { supabase } from '../../lib/supabase';
import { AppointmentDetails } from '../../components/appointments/DayView/components/AppointmentDetails';
import { requestMicrophonePermission, startRecording } from '../../utils/microphone';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TokensInfo {
  available: boolean;
  tokens_limit: number | null;
  tokens_used: number;
  tokens_remaining: number | null;
  display_limit: number | null;
  display_used: number;
  display_remaining: number | null;
}

interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  service_name: string;
  staff_id: string;
  staff_name: string;
  start_time: string;
  end_time: string;
  duration: string;
  price: number;
  status: string;
  avatar: string;
}

const QUICK_REPLIES = [
  'מה התורים שלי היום?',
  'מי הלקוחות שלא אישרו הגעה?',
  'שלח עכשיו תזכורת לכל מי שיש לו תור מחר',
  'עדכן אותי אם יש ביטולים או תורים שהתפנו היום',
  'כמה תורים בוטלו השבוע?',
  'מי הלקוחות שביקשו לקבוע תור ועדיין לא סגרו?',
  'מה ההכנסות שלי היום עד עכשיו?',
  'כמה תורים פנויים נשארו לי השבוע?',
  'עדכן את שעות הפעילות שלי להיום',
];

// פונקציה לבדוק האם הצ'אט חסום (העבר אותה לפני הפונקציה Dashboard)
function isChatBlocked(tokensInfo: TokensInfo | null, isDashboardPage: boolean, trialAvailable: boolean) {
  return isDashboardPage && tokensInfo?.available === false && !trialAvailable;
}

function isUserBlockedFromAIAgent(user: any): boolean {
  // חסום תמיד את כל המשתמשים מה-AI, גם בתקופת ניסיון
  return true;
}

function Dashboard() {
  const { trialAvailable } = useSubscription();
  const { isTrialStillValid } = useSubscription();
  const { user, business, signOut, isDashboardPage } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLIES);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tokensInfo, setTokensInfo] = useState<TokensInfo | null>(null);
  const [chatChannel, setChatChannel] = useState<any>(null);
  const [appointmentsChannel, setAppointmentsChannel] = useState<any>(null);
  const [tokensChannel, setTokensChannel] = useState<any>(null);
  const canRecord = window.isSecureContext && 'MediaRecorder' in window && navigator.mediaDevices?.getUserMedia;
  const blocked = isChatBlocked(tokensInfo, isDashboardPage, trialAvailable);
  const userBlocked = isUserBlockedFromAIAgent(user);
  const navigate = useNavigate();
  const [trialCountdown, setTrialCountdown] = useState<string | null>(null);

  // טיימר לסיום 14 ימי ניסיון לפי user.created_at
  useEffect(() => {
    if (!user?.created_at || !trialAvailable) {
      setTrialCountdown(null);
      return;
    }
    const createdAt = new Date(user.created_at);
    const trialEnd = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 ימים
    const updateCountdown = () => {
      const now = new Date();
      const diff = trialEnd.getTime() - now.getTime();
      if (diff <= 0) {
        setTrialCountdown('תקופת הניסיון הסתיימה');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTrialCountdown(
        days > 0
          ? `נותרו ${days} ימים, ${hours} שעות, ${minutes} דקות לסיום תקופת הניסיון`
          : `נותרו ${hours} שעות, ${minutes} דקות לסיום תקופת הניסיון`
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [user?.created_at, trialAvailable]);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Function to add message
  const addMessage = useCallback((newMessage: Message) => {
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(msg => msg.id === newMessage.id)) {
        return prev;
      }
      const newMessages = [...prev, newMessage];
      // Scroll after state update
      setTimeout(scrollToBottom, 100);
      return newMessages;
    });
  }, [scrollToBottom]);

  // Subscribe to chat responses
  const subscribeToChat = useCallback(() => {
    if (!user?.id) return;

    console.log('Setting up chat subscription for user:', user.id);
    const channel = supabase
      .channel('chat_responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_chat_histories',
          filter: `session_id=eq.${user.id}`
        },
        (payload) => {
          try {
            console.log('Received chat message:', payload);
            const chatMessage = payload.new;
            const message = chatMessage.message;
            
            if (message.type === 'ai') {
              setIsTyping(false);
              const newMessage: Message = {
                id: chatMessage.id.toString(),
                role: 'assistant',
                content: message.content,
                timestamp: new Date()
              };
              addMessage(newMessage);
              setLastMessageId(chatMessage.id);
            }
          } catch (error) {
            console.error('Error processing chat message:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    setChatChannel(channel);
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, addMessage]);

  // Subscribe to appointment changes
  const subscribeToAppointments = useCallback((id: string) => {
    if (!user?.id) return;

    console.log('Setting up appointments subscription for business:', id);
    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `staff_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          // Refresh appointments when any change occurs
          loadAppointments(id);
        }
      )
      .subscribe((status) => {
        console.log('Appointments subscription status:', status);
      });

    setAppointmentsChannel(channel);
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // Subscribe to token usage changes
  const subscribeToTokenUsage = useCallback((id: string) => {
    if (!user?.id) return;

    console.log('Setting up token usage subscription for business:', id);
    const channel = supabase
      .channel('token_usage_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'token_usage',
          filter: `business_id=eq.${id}`
        },
        (payload) => {
          console.log('Token usage change detected:', payload);
          // Refresh token info when usage changes
          loadTokensInfo(id);
        }
      )
      .subscribe((status) => {
        console.log('Token usage subscription status:', status);
      });

    setTokensChannel(channel);
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // Load initial data
  useEffect(() => {
    if (isInitialized) return;

    const initializeChat = async () => {
      // Set initial welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'היי! אני לוליטה, העוזרת החכמה שלך 😊 איך אוכל לעזור לך היום?',
        timestamp: new Date()
      }]);

      if (business?.id) {
        setBusinessId(business.id);
        await loadAppointments(business.id);
        const unsubscribeAppointments = subscribeToAppointments(business.id);
        if (isDashboardPage) {
          await loadTokensInfo(business.id);
          const unsubscribeTokens = subscribeToTokenUsage(business.id);
        }
      } else if (user?.id) {
        await fetchBusinessId();
      }

      // אל תטען היסטוריית צ'אט:
      // await loadChatHistory();

      const unsubscribeChat = subscribeToChat();

      setIsInitialized(true);

      return () => {
        if (unsubscribeChat) unsubscribeChat();
        if (chatChannel) chatChannel.unsubscribe();
        if (appointmentsChannel) appointmentsChannel.unsubscribe();
        if (tokensChannel) tokensChannel.unsubscribe();
      };
    };

    initializeChat();
  }, [user?.id, business?.id, isInitialized, subscribeToChat, subscribeToAppointments, subscribeToTokenUsage, isDashboardPage]);

  const loadTokensInfo = async (businessId: string) => {
    try {
      console.log('Loading tokens info for business:', businessId);
      const { data, error } = await supabase
        .rpc('get_remaining_tokens', {
          p_business_id: businessId
        });

      if (error) throw error;
      console.log('Tokens info loaded:', data);
      setTokensInfo(data);
    } catch (error) {
      console.error('Error loading tokens info:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!user?.id) return;

    try {
      console.log('Loading chat history for user:', user.id);
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', user.id)
        .order('id', { ascending: true })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return;

      // Update last message id
      const maxId = Math.max(...data.map(msg => msg.id));
      setLastMessageId(maxId);

      const formattedMessages: Message[] = [];
      
      for (const item of data) {
        try {
          const message = item.message;
          if (message.type === 'human') {
            const content = message.content.split('///')[1]?.trim();
            if (content) {
              formattedMessages.push({
                id: item.id.toString(),
                role: 'user',
                content,
                timestamp: new Date(item.created_at || new Date())
              });
            }
          } else if (message.type === 'ai') {
            formattedMessages.push({
              id: item.id.toString(),
              role: 'assistant',
              content: message.content,
              timestamp: new Date(item.created_at || new Date())
            });
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }

      if (formattedMessages.length > 0) {
        setMessages(prev => {
          const welcomeMessage = prev.find(m => m.id === 'welcome');
          return welcomeMessage ? [welcomeMessage, ...formattedMessages] : formattedMessages;
        });
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const fetchBusinessId = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

      setBusinessId(userData.business_id);
      loadAppointments(userData.business_id);
      
      // Load tokens info only if we're on the dashboard
      let unsubscribeTokens: (() => void) | undefined;
      if (isDashboardPage) {
        await loadTokensInfo(userData.business_id);
        // Subscribe to token usage changes
        unsubscribeTokens = subscribeToTokenUsage(userData.business_id);
      }
      
      // Subscribe to appointment changes
      const unsubscribeAppointments = subscribeToAppointments(userData.business_id);
      
      return () => {
        if (unsubscribeAppointments) unsubscribeAppointments();
        if (unsubscribeTokens) unsubscribeTokens();
      };
    } catch (error) {
      console.error('Error fetching business ID:', error);
      toast.error('שגיאה בטעינת נתוני העסק');
      setLoadingAppointments(false);
    }
  };

  const loadAppointments = async (id: string) => {
    try {
      setLoadingAppointments(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = addDays(today, 7);

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          business_id,
          customer_id,
          start_time,
          end_time,
          customers (
            name,
            phone
          ),
          services (
            id,
            name_he,
            price,
            duration
          ),
          users (
            name
          ),
          status
        `)
        .eq('staff_id', user?.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', nextWeek.toISOString())
        .order('start_time')
        .limit(5);

      if (appointmentsError) throw appointmentsError;

      const now = new Date();
      const activeAppointments = appointments
        .filter(apt => isAfter(parseISO(apt.end_time), now))
        .map(apt => ({
          id: apt.id,
          business_id: apt.business_id,
          customer_id: apt.customer_id,
          customer_name: apt.customers?.name || '',
          customer_phone: apt.customers?.phone || '',
          service_id: apt.services?.id || '',
          service_name: apt.services?.name_he || '',
          staff_id: user?.id || '',
          staff_name: apt.users?.name || '',
          start_time: apt.start_time,
          end_time: apt.end_time,
          duration: apt.services?.duration || '',
          price: apt.services?.price || 0,
          status: apt.status,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(apt.customers?.name || '')}`
        }));

      console.log('Loaded appointments:', activeAppointments.length);
      setAppointments(activeAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('שגיאה בטעינת התורים');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const shuffleQuickReplies = () => {
    setQuickReplies(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const sendMessageToWebhook = async (message: string, type: string = 'text', recordingUrl?: string) => {
    if (!user?.id || !businessId) {
      throw new Error('חסרים פרטי משתמש או עסק');
    }

    try {
      // First log message to database
      const { data: logResult, error: logError } = await supabase
        .rpc('log_business_message', {
          p_user_id: user.id,
          p_business_id: businessId,
          p_message: type === 'audio' ? recordingUrl : message,
          p_message_type: type
        });

      if (logError) throw logError;

      if (!logResult.success) {
        throw new Error(logResult.error || 'שגיאה בשמירת ההודעה');
      }

      // Then send to webhook
      const response = await fetch('https://ofekperetz.app.n8n.cloud/webhook/b0e5c037-e24a-4680-8fb1-843d69a23d1c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          user_id: user.id,
          chat_id: user.id,
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

  // עדכן את handleSendMessage כך שיחסום שליחה אם המשתמש חסום
  const handleSendMessage = async (text?: string) => {
    const messageContent = text || newMessage;
    if (!messageContent.trim()) return;

    console.log('Attempting to send message:', messageContent);
    console.log('User ID:', user?.id);
    console.log('Business ID:', businessId);

    // Check if business has enough tokens only if we're on the dashboard
    if (isDashboardPage && tokensInfo && !tokensInfo.available && !trialAvailable) {
      toast.error('אין אפשרות לשימוש בבינה מלאכותית בחבילה הנוכחית');
      return;
    }

    // בדוק אם המשתמש חסום מה-AI
    if (userBlocked) {
      toast.error('גישה לצ\'אט AI חסומה למשתמשים בתקופת ניסיון.');
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
    shuffleQuickReplies();
    setIsTyping(true);

    try {
      console.log('Sending message to webhook...');
      await sendMessageToWebhook(messageContent);
      console.log('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'שגיאה בשליחת ההודעה');
      setIsTyping(false);
    }
  };

  const handleStartRecording = async () => {
    if (blocked || !canRecord) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();

      const startTime = Date.now();
      const timer = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setRecordingTimer(timer);

      recorder.ondataavailable = async (event) => {
        const blob = new Blob([event.data], { type: 'audio/webm' });
        try {
          const fileName = `${user?.id}/${Date.now()}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat_recordings')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('chat_recordings')
            .getPublicUrl(fileName);

          const recordingUrl = urlData.publicUrl;

          const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: '🎤 הקלטה קולית',
            timestamp: new Date()
          };

          addMessage(userMessage);
          setIsTyping(true);

          await sendMessageToWebhook('', 'audio', recordingUrl);
        } catch (error: any) {
          console.error('Error sending recording:', error);
          toast.error(error.message || 'שגיאה בשליחת ההקלטה');
          setIsTyping(false);
        }
      };
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('יש לאשר גישה למיקרופון');
      } else if (error.name === 'SecurityError') {
        toast.error('יש לפתוח את האתר ב-HTTPS');
      } else {
        toast.error('שגיאה בהפעלת ההקלטה, נסה שוב');
      }
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

  const handleCancelRecording = () => {
    setRecordingBlob(null);
    setRecordingDuration(0);
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleQuickReply = (e: React.MouseEvent, reply: string) => {
    e.preventDefault();
    if (blocked || userBlocked) return;
    handleSendMessage(reply);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    if (blocked || userBlocked) return;
    action();
  };

  // דוגמא ל-shortcuts
  const shortcuts = [
    {
      label: 'ניהול לקוחות',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      href: '/customers',
      bg: 'bg-purple-50',
      onClick: () => navigate('/customers'),
    },
    {
      label: 'דוחות וסטטיסטיקות',
      icon: <BarChart2 className="w-6 h-6 text-indigo-600" />,
      href: '/statistics',
      bg: 'bg-indigo-50',
      onClick: () => navigate('/statistics'),
    },
    {
      label: 'הגדרות מערכת',
      icon: <Settings className="w-6 h-6 text-pink-600" />,
      href: '/settings',
      bg: 'bg-pink-50',
      onClick: () => navigate('/settings'),
    },
    {
      label: 'מרכז העזרה',
      icon: <HelpCircle className="w-6 h-6 text-blue-600" />,
      href: '/help',
      bg: 'bg-blue-50',
      onClick: () => navigate('/help'),
    },
  ];

  // ההודעות שאתה רואה הן לא שגיאות קריטיות אלא אזהרות/מידע מהפיתוח:

  // 1. Download the React DevTools... - המלצה בלבד, לא חובה.
  // 2. [AuthProvider] business is null - כנראה המשתמש מחובר אך אין אובייקט business (עדיין לא נטען או לא משויך).
  // 3. React Router Future Flag Warning... - אזהרות על שינויים עתידיים ב-React Router v7, לא משפיע כרגע.
  // 4. Auth state changed, user: ... - מידע על התחברות משתמש.

  // מה לעשות?
  // - אם הכל עובד, אפשר להתעלם מהאזהרות.
  // - אם business אמור להיות קיים, בדוק שהמשתמש באמת משויך לעסק במסד הנתונים.
  // - אם אתה רוצה להעלים את אזהרת business is null, תוכל להוסיף בדיקות טעינה/המתנה לטעינת העסק לפני הצגת הדף.

  // דוגמה לבדיקה לפני הצגת הדשבורד:
  // if (!business) {
  //   return (
  //     <div className="flex items-center justify-center h-screen text-lg text-gray-500">
  //       טוען נתוני עסק...
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              {business?.logo_url ? (
                <img 
                  src={business.logo_url} 
                  alt={business.name} 
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
              )}
              <h1 className="mr-3 text-lg font-semibold text-gray-900">
                {business?.name || 'דשבורד'}
              </h1>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>התנתק</span>
            </button>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">התורים הקרובים שלך</h1>
                <p className="text-sm text-white/80">
                  {format(new Date(), 'EEEE, d בMMMM', { locale: he })}
                </p>
              </div>
            </div>

            <div className="relative">
              {loadingAppointments ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointments.length > 0 ? (
                <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                  <div className="flex gap-3" style={{ paddingRight: '1px' }}>
                    {appointments.map((appointment) => {
                      const appointmentDate = parseISO(appointment.start_time);
                      const isToday = isSameDay(appointmentDate, new Date());
                      
                      return (
                        <div
                          key={appointment.id}
                          onClick={() => handleAppointmentClick(appointment)}
                          className={`flex-none w-[260px] bg-white/10 backdrop-blur-lg rounded-xl p-3 cursor-pointer ${
                            !isToday ? 'border-2 border-white/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">
                              {appointment.customer_name}
                            </h3>
                            <div className="text-right">
                              <div className="text-sm">
                                {!isToday && (
                                  <span className="block text-amber-200">
                                    {format(appointmentDate, 'EEEE', { locale: he })}
                                  </span>
                                )}
                                {format(appointmentDate, 'HH:mm')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-white/80">
                            <div className="flex items-center gap-2">
                              <Scissors className="h-4 w-4" />
                              <span>{appointment.service_name}</span>
                            </div>
                            <span>₪{appointment.price}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-white/80">
                  אין תורים פעילים בשבוע הקרוב
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <div className="flex-none border-b border-gray-200 bg-white rounded-t-[2rem]">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold">צ'אט עם לוליטה AI</h2>
                  {tokensInfo && (
                    <div className="flex items-center gap-1 text-xs">
                {tokensInfo.available || trialAvailable ? (
  <>
    <AlertCircle className="h-3 w-3 text-indigo-500" />
    <span className="text-indigo-600">
      {tokensInfo.display_limit === null ? (
        'טוקנים ללא הגבלה'
      ) : (
        `נותרו ${tokensInfo.display_remaining} / ${tokensInfo.display_limit} טוקנים`
      )}
    </span>
  </>
) : (
  <>
    <AlertCircle className="h-3 w-3 text-red-500" />
    <span className="text-red-600">
      שירות לא זמין בחבילה הנוכחית
    </span>
  </>
)}

                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div 
              ref={chatContainerRef}
              className="h-full overflow-y-auto p-4 relative"
            >
              {/* Overlay blur על הצ'אט בלבד אם חסום */}
              {(blocked || userBlocked) && (
                <>
                  <div
                    className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[3px] rounded-2xl pointer-events-auto"
                    style={{ transition: 'all 0.2s' }}
                  />
                  {/* כרטיס ברוך הבא לבוט AI */}
                  <div
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
                    style={{ top: '32px' }}
                  >
                    <div
                      className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-purple-200 flex flex-col items-center p-8 gap-4"
                      style={{
                        marginTop: '32px',
                        boxShadow: '0 8px 32px #a78bfa33, 0 1.5px 12px #a78bfa22',
                        background: 'linear-gradient(135deg, #ede9fe 0%, #fff 100%)'
                      }}
                    >
                      {/* אייקון רובוט */}
                      <div className="bg-purple-100 rounded-full p-4 mb-2 flex items-center justify-center">
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png"
                          alt="AI Bot"
                          className="w-14 h-14"
                          style={{ filter: 'drop-shadow(0 2px 8px #a78bfa55)' }}
                        />
                      </div>
                      {/* טקסט הסבר */}
                      <div className="text-center">
                        <h2 className="text-xl font-bold text-purple-700 mb-1">ברוך הבא ללוליטה AI 🤖</h2>
                        <p className="text-gray-700 text-base">
                          כאן תוכל לייעל את העבודה שלך, לקבל תובנות חכמות ולחסוך זמן בעזרת עוזר בינה מלאכותית מתקדם.
                        </p>
                      </div>
                      {/* כפתור קריאה לפעולה */}
                      <button
                        className="pointer-events-auto mt-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold shadow-md hover:from-purple-600 hover:to-indigo-600 transition"
                        onClick={() => window.open('https://merry-axolotl-958eca.netlify.app', '_blank')}
                      >
                        שדרג עכשיו
                      </button>
                      {/* טיימר לסיום תקופת ניסיון 14 יום */}
                      {trialAvailable && trialCountdown && (
                        <div className="w-full mt-2 flex items-center justify-center">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-100 to-yellow-50 border border-orange-200 shadow-sm">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-bold text-orange-700 tracking-tight">
                              {trialCountdown}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* קיצורי דרך (shortcuts) - רק כאן */}
                      <div className="w-full mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          {shortcuts.map((shortcut, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={shortcut.onClick}
                              className={`flex flex-col items-center justify-center rounded-xl shadow-sm hover:shadow-md transition bg-white hover:bg-gradient-to-br hover:from-purple-100 hover:to-indigo-100 border border-gray-100 p-3 group ${shortcut.bg} pointer-events-auto`}
                              style={{ minHeight: 80 }}
                            >
                              <div className="mb-1">{shortcut.icon}</div>
                              <span className="text-xs font-semibold text-gray-700 group-hover:text-purple-700 transition text-center">{shortcut.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* טיפ למטה */}
                      <div className="w-full mt-4">
                        <div className="text-xs text-gray-500 text-center">
                          טיפ: שדרוג לחשבון פרימיום יאפשר לך גישה מלאה לכל יכולות הבוט!
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="max-w-2xl mx-auto space-y-4 relative z-10">
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
                        : 'bg-white text-gray-900 rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                        {format(message.timestamp, 'HH:mm', { locale: he })}
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
                    <div className="bg-white rounded-[20px] rounded-bl-md p-4">
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
            </div>
          </div>

          <div className="flex-none bg-white border-t border-gray-100 mt-auto pb-[72px]">
            <div className="max-w-2xl mx-auto p-4 space-y-4 relative">
              {/* Quick Reply Buttons */}
              <div className="flex items-center gap-2 px-2 overflow-x-auto scrollbar-none">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(e) => handleQuickReply(e, reply)}
                    disabled={blocked || userBlocked}
                    className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap select-none ${
                      blocked || userBlocked
                        ? 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
              {/* Start of blocked overlay */}
              <div className="relative">
                {/* Overlay when blocked */}
                {(blocked || userBlocked) && (
                  <div className="absolute inset-0 z-20 bg-white/70 flex flex-col items-center justify-center rounded-2xl pointer-events-auto">
                  <span className="text-red-500 font-semibold text-sm">
                    {userBlocked
                      ? 'גישה לצ\'אט AI חסומה למשתמשים בתקופת ניסיון'
                      : 'השירות אינו זמין בחבילה הנוכחית'}
                  </span>
                </div>
                )}
                <div className={blocked || userBlocked ? "pointer-events-none opacity-60" : ""}>
                  <div className="flex items-center gap-4">
                    {!recordingBlob ? (
                      <>
                        {/* Recording Button */}
                        <button
                          type="button"
                          onClick={(e) => handleButtonClick(e, isRecording ? handleStopRecording : handleStartRecording)}
                          disabled={blocked || !canRecord}
                          title={!canRecord ? "הקלטה נתמכת רק בדפדפן עם HTTPS (או localhost) ובמכשירים המאפשרים MediaRecorder" : undefined}
                          className={`flex items-center justify-center w-[52px] h-[52px] rounded-2xl flex-shrink-0 select-none ${
                            blocked || !canRecord
                              ? 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                              : isRecording
                              ? 'bg-red-100 text-red-600 animate-pulse'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                          }`}
                        >
                          {isRecording ? (
                            <StopCircle className="h-6 w-6" />
                          ) : (
                            <Mic className="h-6 w-6" />
                          )}
                        </button>

                        <div className="flex-1 relative">
                          {isRecording ? (
                            <div className="flex items-center justify-center h-[52px] bg-gray-100 rounded-2xl px-4">
                              <span className="text-red-600 animate-pulse">
                                {formatDuration(recordingDuration)}
                              </span>
                            </div>
                          ) : (
                            /* Message Input and Send Button */
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
                              <button
                                type="button"
                                onClick={(e) => handleButtonClick(e, () => handleSendMessage())}
                                disabled={blocked}
                                className={`absolute left-3 p-2 select-none ${
                                  blocked
                                    ? 'text-gray-400 opacity-50 cursor-not-allowed'
                                    : 'text-indigo-600 hover:text-indigo-700 active:text-indigo-800'
                                }`}
                                aria-label="שלח הודעה"
                              >
                                <Send className="h-6 w-6" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center gap-4 bg-gray-100 rounded-2xl p-4">
                        <div className="flex-1 flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Mic className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-sm">הקלטה קולית</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleButtonClick(e, handleCancelRecording)}
                            className="p-2 text-red-600 active:text-red-800 select-none"
                            aria-label="בטל הקלטה"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* End of blocked overlay */}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedAppointment && (
            <AppointmentDetails
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onUpdate={() => businessId && loadAppointments(businessId)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Dashboard;