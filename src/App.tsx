import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Plus, 
  Image as ImageIcon, 
  FileText, 
  Settings, 
  LogOut, 
  Brain, 
  CheckCircle2, 
  Clock, 
  Search,
  Users,
  Award,
  Info,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Zap,
  Github,
  Twitter,
  Linkedin,
  Mail,
  ExternalLink,
  ChevronRight,
  Shield,
  Cpu,
  Sun,
  Moon,
  Volume2,
  Image as LucideImage,
  Mic,
  MicOff,
  Download,
  Copy,
  Check,
  GraduationCap,
  ChevronLeft,
  Play,
  Fingerprint,
  Upload,
  ShieldCheck,
  Calendar,
  Video,
  Globe,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider } from './lib/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  where,
  limit
} from 'firebase/firestore';
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import { cn } from './lib/utils';

// Types
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: any;
  attachments?: Attachment[];
}

interface Attachment {
  name: string;
  type: string;
  url: string;
}

interface CustomVoice {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
}

interface AcademicTask {
  id: string;
  title: string;
  deadline: string | null;
  completed: boolean;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: any;
  role: 'user' | 'admin';
  customVoices?: CustomVoice[];
}

// Components
const ScanningEffect = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
    <motion.div 
      className="w-full h-1 bg-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
      initial={{ top: '0%' }}
      animate={{ top: '100%' }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-20" />
  </div>
);

const MMLogo = ({ className }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full glow-effect" />
    <Brain className="w-8 h-8 text-primary relative z-10" />
  </div>
);

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Girl', icon: <User className="w-3 h-3" />, desc: 'Young & Bright' },
  { id: 'Zephyr', label: 'Woman', icon: <User className="w-3 h-3" />, desc: 'Soft & Calm' },
  { id: 'Puck', label: 'Man', icon: <User className="w-3 h-3" />, desc: 'Clear & Energetic' },
  { id: 'Charon', label: 'Deep Man', icon: <User className="w-3 h-3" />, desc: 'Deep & Authoritative' },
  { id: 'Robot', label: 'Robot', icon: <Bot className="w-3 h-3" />, desc: 'Monotone & Futuristic' },
];

const handleDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface TutorialStep {
  title: string;
  description: string;
  videoUrl?: string;
  action?: string;
  tab?: 'chat' | 'lab' | 'playground' | 'knowledge' | 'profile' | 'founders';
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: TutorialStep[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'intro',
    title: 'Neural Onboarding',
    description: 'Master the basics of MentorMind communication.',
    icon: <MessageSquare className="w-5 h-5" />,
    steps: [
      {
        title: 'Meet your Mentor',
        description: 'MentorMind is your personal guide. Start by sending a simple greeting in the chat to establish a neural link.',
        tab: 'chat',
        videoUrl: 'https://cdn.pixabay.com/video/2019/12/31/30810-383790108_tiny.mp4'
      },
      {
        title: 'Direct Interaction',
        description: 'Notice the action hub on every message. You can copy text or use "Neural Synthesis" to hear the AI speak.',
        tab: 'chat'
      }
    ]
  },
  {
    id: 'lab',
    title: 'Neural Lab Mastery',
    description: 'Learn to forge images and weave voices.',
    icon: <Sparkles className="w-5 h-5" />,
    steps: [
      {
        title: 'Image Forge',
        description: 'Enter a creative prompt in the Forge. Use the "Blast" button to instantly visualize your vision.',
        tab: 'lab',
        videoUrl: 'https://cdn.pixabay.com/video/2021/04/12/70860-537446559_tiny.mp4'
      },
      {
        title: 'Voice Weaver',
        description: 'Choose a neural personality and enter text. Use "Express Weave" to synthesize high-fidelity audio.',
        tab: 'lab'
      }
    ]
  },
  {
    id: 'playground',
    title: 'Cognitive Arena',
    description: 'Train your brain with interactive tasks.',
    icon: <Zap className="w-5 h-5" />,
    steps: [
      {
        title: 'Interactive Tasks',
        description: 'Select a training module like "Neural Memory" or "Logic Flow" to begin your cognitive session.',
        tab: 'playground'
      }
    ]
  },
  {
    id: 'imprint',
    title: 'Neural Imprint',
    description: 'Clone your own voice for standard interaction.',
    icon: <Fingerprint className="w-5 h-5" />,
    steps: [
      {
        title: 'Gather Biometrics',
        description: 'Navigate to the Neural Lab and find the "Neural Imprint" section. This is where you upload your voice samples.',
        tab: 'lab'
      },
      {
        title: 'Begin Cloning',
        description: 'Enter a name for your voice and upload clear audio samples. Once processed, your voice will appear in the "Voice Weaver" and chat selector.',
        tab: 'lab'
      }
    ]
  }
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'lab' | 'playground' | 'knowledge' | 'profile' | 'mentorship'>('chat');
  const [activeTutorial, setActiveTutorial] = useState<{ tutorialId: string, stepIndex: number } | null>(null);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);

  const allVoiceOptions = [
    ...VOICE_OPTIONS,
    ...customVoices.map(cv => ({ 
      id: cv.id, 
      label: cv.name, 
      icon: <Fingerprint className="w-3 h-3" />, 
      desc: cv.description || 'Neural Imprint' 
    }))
  ];

  const themeRef = useRef<'light' | 'dark'>('dark');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function adjustHeight() {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0';
      const newHeight = Math.max(44, Math.min(textarea.scrollHeight, 240));
      textarea.style.height = `${newHeight}px`;
    }
  }

  useEffect(() => {
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [inputText]);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch or create profile
        const profileRef = doc(db, 'users', user.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Explorer',
              email: user.email || '',
              photoURL: user.photoURL || '',
              joinedAt: serverTimestamp(),
              role: 'user'
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }

        // Subscribe to messages
        const q = query(
          collection(db, 'users', user.uid, 'messages'),
          orderBy('timestamp', 'asc'),
          limit(50)
        );
        const unsubMessages = onSnapshot(q, async (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
          setMessages(msgs);

          // Send welcome message if no messages exist
          if (msgs.length === 0) {
            await addDoc(collection(db, 'users', user.uid, 'messages'), {
              text: `Hello ${user.displayName || 'Explorer'}! I'm MentorMind, your personal AI mentor. Welcome to MentorMind. Let's start your cognitive journey together!`,
              sender: 'ai',
              timestamp: serverTimestamp()
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/messages`);
        });
        return () => unsubMessages();
      } else {
        setProfile(null);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (profile?.customVoices) {
      setCustomVoices(profile.customVoices);
    }
  }, [profile]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 768;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized in Firebase. Please add your Vercel URL to authorized domains in Firebase Console.");
      } else {
        setLoginError(error.message || "An unexpected error occurred during login.");
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    
    recognitionRef.current.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputText(transcript);
    };

    recognitionRef.current.start();
  };

  const handleLogout = () => signOut(auth);


  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const speakText = async (text: string, messageId: string) => {
    if (isSpeaking) return;
    setIsSpeaking(messageId);
    try {
      // Check if it's a custom voice (TwelveLabs/ElevenLabs)
      const isCustomVoice = customVoices.some(cv => cv.id === selectedVoice);
      
      if (isCustomVoice) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId: selectedVoice })
        });

        if (!response.ok) throw new Error('Proxy TTS failed');

        const audioBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await audioCtx.decodeAudioData(audioBuffer);
        
        const source = audioCtx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsSpeaking(null);
        source.start();
        return;
      }

      // Default Gemini TTS
      const actualVoiceMapping: { [key: string]: string } = {
        'Robot': 'Fenrir',
        'Male': 'Puck',
        'Female': 'Kore',
        'Calm': 'Zephyr',
        'Narrator': 'Charon'
      };
      
      const voiceName = actualVoiceMapping[selectedVoice] || 'Kore';
      const ttsPrompt = voiceName === 'Fenrir' 
        ? `Say this in a monotone, futuristic robotic voice: ${text}` 
        : `Say this naturally and clearly: ${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName as any },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const arrayBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0)).buffer;
        
        // The data is raw 16-bit PCM, let's create a buffer
        const floatData = new Float32Array(arrayBuffer.byteLength / 2);
        const intData = new Int16Array(arrayBuffer);
        for (let i = 0; i < intData.length; i++) {
          floatData[i] = intData[i] / 32768.0;
        }

        const buffer = audioCtx.createBuffer(1, floatData.length, 24000);
        buffer.getChannelData(0).set(floatData);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsSpeaking(null);
        source.start();
      } else {
        setIsSpeaking(null);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(null);
    }
  };

  const generateAIImage = async (promptOverride?: string): Promise<string | null> => {
    const prompt = promptOverride || inputText;
    if (!prompt.trim() || isGeneratingImage) return null;
    
    if (!promptOverride) setInputText('');
    setIsGeneratingImage(true);
    
    try {
      // Add user placeholder message
      await addDoc(collection(db, 'users', user!.uid, 'messages'), {
        text: `Creating image: ${prompt}`,
        sender: 'user',
        timestamp: serverTimestamp(),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A futuristic, high-tech digital illustration: ${prompt}` }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        // Compress image to stay under Firestore 1MB limit
        const compressedUrl = await compressImage(imageUrl);
        
        await addDoc(collection(db, 'users', user!.uid, 'messages'), {
          text: `Here is your visual aid for: ${prompt}`,
          sender: 'ai',
          timestamp: serverTimestamp(),
          attachments: [{ name: 'Visual Aid', type: 'image/jpeg', url: compressedUrl }]
        });
        return compressedUrl;
      } else {
        await addDoc(collection(db, 'users', user!.uid, 'messages'), {
          text: "I couldn't generate the image right now. Let's try describing it in words instead!",
          sender: 'ai',
          timestamp: serverTimestamp(),
        });
        return null;
      }
    } catch (error) {
      console.error("Image Gen Error:", error);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const processed = await Promise.all(
        Array.from(files).map(async (file: File): Promise<Attachment> => {
          return new Promise<Attachment>((resolve) => {
            const reader = new FileReader();
            reader.onload = async (re) => {
              let url = re.target?.result as string;
              if (file.type.startsWith('image/')) {
                url = await compressImage(url);
              }
              resolve({ name: file.name, type: file.type, url });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      setAttachments([...attachments, ...processed]);
    }
  };

  const generateQuiz = () => {
    setInputText("Generate a 3-question multiple-choice quiz about my recent learning progress.");
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || !user || isLoading) return;

    const text = inputText;
    const currentAttachments = [...attachments];
    setInputText('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Save user message
      await addDoc(collection(db, 'users', user.uid, 'messages'), {
        text,
        sender: 'user',
        timestamp: serverTimestamp(),
        attachments: currentAttachments
      });

      // Get AI response
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text || "Analyze these attachments",
        config: {
          systemInstruction: "You are MentorMind, a visionary AI mentor for MentorMind. You are encouraging, brilliant, and focused on helping students reach their cognitive potential. Keep responses concise but impactful. Use a friendly, futuristic tone."
        }
      });

      const aiText = response.text || "I'm processing your request...";

      // Save AI message
      await addDoc(collection(db, 'users', user.uid, 'messages'), {
        text: aiText,
        sender: 'ai',
        timestamp: serverTimestamp()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/messages`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-heading">
        <div className="atmosphere" />
        <div className="grid-overlay" />
        
        {/* Decorative elements inspired by Theme.tsx */}
        <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-br from-[#FF8A65]/10 via-[#9C27B0]/10 to-[#2196F3]/10 -skew-y-6 origin-top-left -z-10" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass-panel p-10 rounded-[2.5rem] text-center space-y-8 relative overflow-hidden border-white/20 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF8A65] via-[#9C27B0] to-[#2196F3]" />
            
            <button 
              onClick={toggleTheme}
              className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-all hover:rotate-12"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
            </button>

            <MMLogo className="mx-auto scale-125 mb-4" />
            
            <div className="space-y-3">
              <h1 className="text-5xl font-bold tracking-tight text-gradient">MentorMind</h1>
              <p className="text-muted-foreground font-medium text-lg">Present your mind in the most beautiful way</p>
            </div>
            
            <div className="space-y-4 pt-4">
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-primary hover:brightness-110 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-4 shadow-xl shadow-primary/20 group"
              >
                <div className="bg-white p-1 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                Authorize Your Mind
              </button>
              
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold"
                >
                  {loginError}
                </motion.div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[280px] mx-auto">
              By connecting your mind, you agree to our <span className="text-primary font-bold cursor-pointer">Terms of Service</span> and <span className="text-primary font-bold cursor-pointer">Privacy Protocol</span>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground relative overflow-hidden">
      <div className="atmosphere" />
      <div className="grid-overlay" />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 glass-panel border-r flex flex-col z-[50] transition-transform duration-500 lg:relative lg:translate-x-0 overflow-hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <MMLogo />
                <h1 className="text-xl font-heading font-bold text-gradient">MentorMind</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-muted rounded-xl transition-colors"
                title="Close sidebar"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* User Profile Summary */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white rounded-2xl mb-6 shadow-xl shadow-blue-500/20 border border-white/10 group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <div className="font-bold text-sm truncate tracking-tight">{user?.displayName || 'Explorer'}</div>
                <div className="text-[10px] text-white/70 truncate uppercase font-bla tracking-widest mt-0.5">
                  Cognitive Interface
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <NavButton 
                active={activeTab === 'chat'} 
                onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
                icon={<MessageSquare className="w-5 h-5" />}
                label="Chat Arena"
              />
              <NavButton 
                active={activeTab === 'lab'} 
                onClick={() => { setActiveTab('lab'); setIsSidebarOpen(false); }}
                icon={<Sparkles className="w-5 h-5" />}
                label="Neural Lab"
              />
              <NavButton 
                active={activeTab === 'playground'} 
                onClick={() => { setActiveTab('playground'); setIsSidebarOpen(false); }}
                icon={<Zap className="w-5 h-5" />}
                label="Mind Playground"
              />
              <NavButton 
                active={activeTab === 'knowledge'} 
                onClick={() => { setActiveTab('knowledge'); setIsSidebarOpen(false); }}
                icon={<Brain className="w-5 h-5" />}
                label="Knowledge Base"
              />
              <NavButton 
                active={activeTab === 'profile'} 
                onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                icon={<User className="w-5 h-5" />}
                label="Mind Profile"
              />
              <NavButton 
                active={activeTab === 'mentorship'} 
                onClick={() => { setActiveTab('mentorship'); setIsSidebarOpen(false); }}
                icon={<Award className="w-5 h-5" />}
                label="Elite Mentorship"
              />
            </nav>

            <div className="mt-8 space-y-3 pt-6 border-t border-white/10">
              <h3 className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <GraduationCap className="w-3 h-3 text-primary" />
                Neural Academy
              </h3>
              <div className="space-y-1">
                {TUTORIALS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.steps[0].tab || 'chat');
                      setActiveTutorial({ tutorialId: t.id, stepIndex: 0 });
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <div className="p-1.5 bg-muted group-hover:bg-primary/10 rounded-lg transition-colors">
                      {React.cloneElement(t.icon as React.ReactElement, { className: "w-3 h-3" })}
                    </div>
                    <span className="font-medium">{t.title}</span>
                    <Play className="ml-auto w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 border-t border-white/5">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Header */}
              <header className="p-4 md:p-8 border-b flex items-center justify-between glass-panel relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FF8A65] via-[#9C27B0] to-[#2196F3]" />
                <div className="flex items-center gap-3 md:gap-4 relative z-10 shrink-0">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden p-2 hover:bg-muted rounded-xl transition-colors"
                    title="Menu"
                  >
                    <MessageSquare size={20} className="text-primary" />
                  </button>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <Bot className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-black text-sm md:text-xl tracking-tight truncate">MentorMind</h2>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-emerald-500 uppercase tracking-widest truncate">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Neural Link
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-muted/30 rounded-2xl border border-white/5 shadow-inner">
                    {allVoiceOptions.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVoice(v.id as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all relative overflow-hidden shrink-0",
                          selectedVoice === v.id 
                            ? "bg-primary text-white shadow-lg" 
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full text-[10px] font-black text-accent-foreground border border-accent/30 tracking-widest uppercase">
                    <Shield className="w-3 h-3" />
                    AI Guardian
                  </div>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-gradient-to-b from-transparent to-primary/5">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
                      <MMLogo className="w-24 h-24" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-2xl font-bold text-gradient">Initializing Neural Connection</h3>
                      <p className="text-sm text-muted-foreground">Welcome to your cognitive sanctuary. I am MentorMind, your guide to peak mental performance.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                      <button onClick={generateQuiz} className="glass-card p-4 rounded-2xl hover:border-primary/50 transition-all text-left space-y-2 group">
                        <Zap className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <div className="font-bold text-sm">Quick Quiz</div>
                        <div className="text-[10px] text-muted-foreground">Test your current knowledge level</div>
                      </button>
                      <button 
                        onClick={() => setInputText('A futuristic blue Lamborghini racing through a neon neural network city')} 
                        className="glass-card p-4 rounded-2xl hover:border-primary/50 transition-all text-left space-y-2 group"
                      >
                        <LucideImage className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <div className="font-bold text-sm">Mind Canvas</div>
                        <div className="text-[10px] text-muted-foreground">Visualize ideas like a Blue Lamborghini</div>
                      </button>
                      <button onClick={() => setActiveTab('playground')} className="glass-card p-4 rounded-2xl hover:border-primary/50 transition-all text-left space-y-2 group col-span-2">
                        <Brain className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <div className="font-bold text-sm text-center w-full">Mind Playground</div>
                        <div className="text-[10px] text-muted-foreground text-center w-full">Explore interactive cognitive tasks</div>
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        duration: 0.3 
                      }}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 transition-transform hover:scale-110",
                        msg.sender === 'user' ? "bg-primary text-white shadow-lg shadow-primary/20" : "glass-card border-primary/20"
                      )}>
                        {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
                      </div>
                      <div className={cn(
                        "space-y-2 group/msg",
                        msg.sender === 'user' ? "items-end flex flex-col" : "items-start flex flex-col"
                      )}>
                        <div className={cn(
                          "p-4 rounded-2xl relative shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                          msg.sender === 'user' 
                            ? "bg-primary text-white rounded-tr-none hover:bg-primary/95" 
                            : "glass-panel border-white/5 rounded-tl-none font-medium leading-relaxed hover:border-primary/20"
                        )}>
                          {msg.text}
                          
                          <div className={cn(
                            "flex items-center gap-2 mt-3 opacity-0 group-hover/msg:opacity-100 transition-all duration-300 transform translate-y-1 group-hover/msg:translate-y-0",
                            msg.sender === 'user' ? "justify-end" : "justify-start"
                          )}>
                            {msg.sender === 'ai' && (
                              <button 
                                onClick={() => speakText(msg.text, msg.id)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase font-bold tracking-wider transition-all",
                                  isSpeaking === msg.id ? "text-primary animate-pulse" : "text-muted-foreground/80 hover:text-primary"
                                )}
                              >
                                <Volume2 className={cn("w-3 h-3", isSpeaking === msg.id && "animate-bounce")} />
                                {isSpeaking === msg.id ? "Playing" : "Speak"}
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text);
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80 hover:text-primary transition-all"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                        </div>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={cn(
                            "flex flex-wrap gap-3",
                            msg.sender === 'user' ? "justify-end" : "justify-start"
                          )}>
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="glass-card p-2 rounded-2xl border-white/5 shadow-xl group/att relative min-w-[160px] max-w-[240px]">
                                {att.type.startsWith('image/') ? (
                                  <div className="relative overflow-hidden rounded-xl">
                                    <img 
                                      src={att.url} 
                                      alt={att.name} 
                                      className="w-full h-auto object-cover transition-transform group-hover/att:scale-105 duration-500"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => handleDownload(att.url, att.name)}
                                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:scale-110"
                                        title="Download"
                                      >
                                        <Download className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] truncate flex-1">{att.name}</span>
                                    <button 
                                      onClick={() => handleDownload(att.url, att.name)}
                                      className="p-1 hover:text-primary transition-colors"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                {isRecognizing && (
                  <div className="flex gap-4 max-w-[80%]">
                    <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div className="glass-panel p-4 rounded-2xl relative overflow-hidden min-w-[200px]">
                      <ScanningEffect />
                      <div className="flex items-center gap-3 text-sm">
                        <Sparkles className="w-4 h-4 text-primary animate-spin" />
                        <span>Analyzing Neural Patterns...</span>
                      </div>
                    </div>
                  </div>
                )}
                {isLoading && !isRecognizing && (
                  <div className="flex gap-4 max-w-[80%]">
                    <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div className="glass-panel p-4 rounded-2xl">
                      <div className="flex gap-1">
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Container */}
              <div className="p-4 md:p-6 pb-6 md:pb-8 shrink-0">
                <form onSubmit={sendMessage} className="relative max-w-5xl mx-auto w-full">
                  <div className="glass-panel p-2 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FF8A65]/20 via-[#9C27B0]/20 to-[#2196F3]/20" />
                    
                    {attachments.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-4 flex flex-wrap gap-2 p-2">
                        {attachments.map((att, i) => (
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            key={i} 
                            className="glass-card p-1.5 md:p-2 rounded-lg md:rounded-xl flex items-center gap-2 text-[10px] border-primary/30 overflow-hidden"
                          >
                            {att.type.startsWith('image/') ? (
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded overflow-hidden border border-white/10 shrink-0">
                                <img src={att.url} alt="preview" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 pr-1">
                              <span className="truncate max-w-[80px] md:max-w-[120px] font-medium">{att.name}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                              className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all shrink-0"
                            >
                              <Plus className="w-3 h-3 md:w-4 md:h-4 rotate-45" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4">
                      <div className="flex-1 relative flex items-end min-w-0">
                        <textarea 
                          ref={textareaRef}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type your query..."
                          rows={1}
                          className="w-full bg-muted/30 border-none focus:ring-0 rounded-xl md:rounded-2xl px-4 py-3 outline-none transition-all pr-10 md:pr-44 text-sm font-medium resize-none overflow-y-auto scrollbar-none"
                          style={{ minHeight: '44px' }}
                        />
                        {/* Mobile Submit Button (Inside textarea for compact view) */}
                        <div className="absolute right-1 bottom-1 md:hidden">
                           <button 
                            type="submit"
                            disabled={isLoading || isGeneratingImage || (!inputText.trim() && attachments.length === 0)}
                            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white w-8 h-8 rounded-full transition-all shadow-lg flex items-center justify-center"
                          >
                            {isLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <div className="hidden md:flex absolute right-0 bottom-1 items-center gap-0.5 pr-1">
                          <button 
                            type="button"
                            onClick={generateQuiz}
                            className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                          >
                            <Zap className="w-3 h-3" />
                            Quiz
                          </button>
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 hover:bg-muted rounded-xl transition-colors"
                          >
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button 
                            type="button"
                            onClick={toggleListening}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-muted text-muted-foreground"
                            )}
                          >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                          <button 
                            type="button"
                            onClick={generateAIImage}
                            disabled={isGeneratingImage || !inputText.trim()}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              isGeneratingImage ? "bg-primary/20 text-primary" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                            )}
                          >
                            {isGeneratingImage ? <Sparkles className="w-4 h-4 animate-spin" /> : <LucideImage className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Mobile Row for Action Buttons */}
                      <div className="md:hidden flex items-center justify-between gap-1 px-1">
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={generateQuiz}
                            className="p-2.5 bg-muted rounded-lg text-primary"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 bg-muted rounded-lg text-muted-foreground"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={toggleListening}
                            className={cn("p-2.5 rounded-lg", isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-muted text-muted-foreground")}
                          >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                          <button 
                            type="button"
                            onClick={generateAIImage}
                            disabled={isGeneratingImage || !inputText.trim()}
                            className={cn("p-2.5 rounded-lg", isGeneratingImage ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {inputText.length} chars
                        </span>
                      </div>

                      <button 
                        type="submit"
                        disabled={isLoading || isGeneratingImage || (!inputText.trim() && attachments.length === 0)}
                        className="hidden md:flex bg-primary hover:bg-primary/90 disabled:opacity-50 text-white w-11 h-11 rounded-full transition-all shadow-lg hover:shadow-primary/20 items-center justify-center shrink-0 self-end mb-0.5"
                      >
                        {isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'lab' && <NeuralLabView generateAIImage={generateAIImage} speakText={speakText} isGeneratingImage={isGeneratingImage} selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} customVoices={customVoices} profile={profile} setProfile={setProfile} />}
          {activeTab === 'playground' && <PlaygroundView user={user} />}
          {activeTab === 'knowledge' && <KnowledgeView />}
          {activeTab === 'profile' && <ProfileView profile={profile} messages={messages} />}
          {activeTab === 'mentorship' && <MentorshipView />}
        </AnimatePresence>

        {activeTutorial && (
          <TutorialOverlay 
            activeTutorial={activeTutorial}
            onClose={() => setActiveTutorial(null)}
            onNext={() => {
              const tutorial = TUTORIALS.find(t => t.id === activeTutorial.tutorialId);
              if (!tutorial) return;
              
              if (activeTutorial.stepIndex < tutorial.steps.length - 1) {
                const nextStep = tutorial.steps[activeTutorial.stepIndex + 1];
                if (nextStep.tab) setActiveTab(nextStep.tab);
                setActiveTutorial({ ...activeTutorial, stepIndex: activeTutorial.stepIndex + 1 });
              } else {
                setActiveTutorial(null);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

// Sub-components
function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active 
          ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      <span className="font-semibold truncate text-sm">{label}</span>
      {active && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-white md:bg-primary shrink-0" />}
    </button>
  );
}

function NeuralLabView({ 
  generateAIImage, 
  speakText, 
  isGeneratingImage, 
  selectedVoice, 
  setSelectedVoice,
  customVoices,
  profile,
  setProfile
}: { 
  generateAIImage: (prompt: string) => Promise<string | null>, 
  speakText: (text: string, id: string) => Promise<void>,
  isGeneratingImage: boolean,
  selectedVoice: string,
  setSelectedVoice: (v: any) => void,
  customVoices: CustomVoice[],
  profile: UserProfile | null,
  setProfile: (p: any) => void
}) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [progress, setProgress] = useState({ image: 0, voice: 0 });
  const [lastForged, setLastForged] = useState<string | null>(null);

  // Cloning State
  const [isCloning, setIsCloning] = useState(false);
  const [cloningName, setCloningName] = useState("");
  const [voiceFiles, setVoiceFiles] = useState<File[]>([]);
  const cloneFileInputRef = useRef<HTMLInputElement>(null);
  const [cloningStatus, setCloningStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const allVoiceOptions = [
    ...VOICE_OPTIONS,
    ...customVoices.map(cv => ({ 
      id: cv.id, 
      label: cv.name, 
      icon: <Fingerprint className="w-3 h-3" />, 
      desc: cv.description || 'Neural Imprint' 
    }))
  ];

  const handleVoiceClone = async () => {
    if (!cloningName || voiceFiles.length === 0) return;
    setIsCloning(true);
    setCloningStatus(null);
    try {
      const formData = new FormData();
      formData.append('name', cloningName);
      formData.append('description', `Neural Imprint by ${profile?.displayName}`);
      voiceFiles.forEach(file => formData.append('files', file));

      const response = await fetch('/api/voices/add', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Voice cloning failed');
      const data = await response.json();
      
      const newVoice: CustomVoice = {
        id: data.voice_id,
        name: cloningName,
        description: 'Neural Imprint'
      };

      if (profile) {
        const updatedVoices = [...(profile.customVoices || []), newVoice];
        await updateDoc(doc(db, 'users', profile.uid), {
          customVoices: updatedVoices
        });
        setProfile({ ...profile, customVoices: updatedVoices });
      }

      setCloningName("");
      setVoiceFiles([]);
      setCloningStatus({ type: 'success', message: 'Neural Imprint successful! Your custom voice is now available.' });
      setTimeout(() => setCloningStatus(null), 5000);
    } catch (error) {
      console.error("Cloning error:", error);
      setCloningStatus({ type: 'error', message: 'Failed to create neural imprint. Check console for details.' });
      setTimeout(() => setCloningStatus(null), 5000);
    } finally {
      setIsCloning(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isGeneratingImage) {
      setProgress(p => ({ ...p, image: 0 }));
      interval = setInterval(() => {
        setProgress(p => ({ ...p, image: Math.min(p.image + (Math.random() * 15), 95) }));
      }, 500);
    } else {
      setProgress(p => ({ ...p, image: 0 }));
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isGeneratingImage]);

  useEffect(() => {
    let interval: any;
    if (isSpeakingLocal) {
      setProgress(p => ({ ...p, voice: 0 }));
      interval = setInterval(() => {
        setProgress(p => ({ ...p, voice: Math.min(p.voice + (Math.random() * 25), 95) }));
      }, 400);
    } else {
      setProgress(p => ({ ...p, voice: 0 }));
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSpeakingLocal]);

  const handleImageForge = async () => {
    if (!imagePrompt.trim()) return;
    const url = await generateAIImage(imagePrompt);
    if (url) setLastForged(url);
    setImagePrompt("");
  };

  const handleVoiceGen = async () => {
    if (!voiceText.trim()) return;
    setIsSpeakingLocal(true);
    await speakText(voiceText, 'local-lab-tts');
    setIsSpeakingLocal(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 h-full overflow-y-auto"
    >
      <div className="space-y-2">
        <h2 className="text-2xl md:text-4xl font-heading font-bold text-gradient flex items-center gap-3">
          <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
          Neural Lab
        </h2>
        <p className="text-muted-foreground">The creative core where ideas take flight through sound and vision.</p>
      </div>

      {/* API Setup Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-6 rounded-3xl border-orange-500/30 bg-orange-500/5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="p-4 bg-orange-500/10 rounded-2xl shrink-0">
          <Settings className="w-8 h-8 text-orange-500" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left relative z-10">
          <h4 className="font-bold text-lg text-orange-500">ElevenLabs Integration Required</h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Voice cloning requires an <span className="text-foreground font-bold">API Key</span>. Create your account at ElevenLabs and add the key to your <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">ELEVENLABS_API_KEY</span> environment variable.
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <a 
            href="https://elevenlabs.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
          >
            Get API Key
          </a>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Forge */}
        <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 flex flex-col relative overflow-hidden">
          {isGeneratingImage && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress.image}%` }}
              className="absolute top-0 left-0 h-1 bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)] z-20"
            />
          )}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <LucideImage className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Image Forge</h3>
              <p className="text-sm text-muted-foreground">Visualize anything you describe</p>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <textarea 
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="A cosmic garden where neurons bloom like glowing flowers..."
              className="w-full h-32 bg-muted/50 border border-border focus:border-primary/50 rounded-2xl p-4 outline-none transition-all resize-none shadow-inner"
            />
            <button 
              onClick={handleImageForge}
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2 group"
            >
              {isGeneratingImage ? <Sparkles className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
              {isGeneratingImage ? 'Forging Matrix...' : 'Accelerated Forge'}
            </button>
            {lastForged && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl overflow-hidden border border-primary/20 bg-muted/50 aspect-square"
              >
                <img src={lastForged} alt="Fused Result" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => handleDownload(lastForged, 'mentormind-forge.jpg')}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:scale-110"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                  <p className="text-[10px] text-white font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Neural Fusion Complete
                  </p>
                </div>
              </motion.div>
            )}
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">Turbo Mode Active</p>
          </div>
        </div>

        {/* Voice Weaver */}
        <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 flex flex-col relative overflow-hidden">
          {isSpeakingLocal && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress.voice}%` }}
              className="absolute top-0 left-0 h-1 bg-accent shadow-[0_0_10px_rgba(245,158,11,0.5)] z-20"
            />
          )}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-2xl">
              <Volume2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Voice Weaver</h3>
              <p className="text-sm text-muted-foreground">Transform text into futuristic speech</p>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
              {allVoiceOptions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id as any)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl transition-all border relative overflow-hidden group/iv",
                    selectedVoice === v.id 
                      ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
                      : "bg-muted/30 border-border text-muted-foreground hover:border-accent/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0",
                    selectedVoice === v.id ? "bg-accent text-accent-foreground shadow-lg" : "bg-muted"
                  )}>
                    {v.icon}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate w-full">{v.label}</span>
                    <span className="text-[8px] opacity-70 italic truncate w-full">{v.desc}</span>
                  </div>
                  {selectedVoice === v.id && (
                    <motion.div 
                      layoutId="activeVoiceLab"
                      className="absolute inset-0 border-2 border-accent/20 rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <textarea 
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Greetings explorer. The neural pathways are clear for our journey today."
              className="w-full h-32 bg-muted/50 border border-border focus:border-accent/50 rounded-2xl p-4 outline-none transition-all resize-none shadow-inner"
            />
            <button 
              onClick={handleVoiceGen}
              disabled={isSpeakingLocal || !voiceText.trim()}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              <Volume2 className={cn("w-5 h-5", isSpeakingLocal && "animate-bounce")} />
              {isSpeakingLocal ? 'Weaving Frequencies...' : `Express Weave (${allVoiceOptions.find(v => v.id === selectedVoice)?.label})`}
            </button>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold text-accent font-bold">Instant Core Link</p>
          </div>
        </div>
      </div>

      {/* Neural Imprint - Voice Cloning */}
      <div className="glass-panel p-8 rounded-[2.5rem] space-y-8 relative overflow-hidden">
      {isCloning && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-xl z-30 flex flex-col items-center justify-center gap-6 p-8"
        >
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-full scale-150"
            />
            <Fingerprint className="w-20 h-20 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-3 max-w-xs">
            <h4 className="text-2xl font-bold tracking-tight">Syncing Biometrics...</h4>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "easeInOut" }}
                className="h-full bg-primary"
              />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Integrating with ElevenLabs Matrix</p>
          </div>
        </motion.div>
      )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Fingerprint className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Neural Imprint</h3>
              <p className="text-sm text-muted-foreground">Clone your essence into a custom AI voice personality</p>
            </div>
          </div>
          <div className="hidden sm:block px-4 py-1.5 bg-primary/10 rounded-full text-[10px] font-bold text-primary border border-primary/20 uppercase tracking-widest">
            ElevenLabs Fusion Active
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Voice Designation</label>
              <input 
                value={cloningName}
                onChange={(e) => setCloningName(e.target.value)}
                placeholder="e.g. My Neural Echo"
                className="w-full bg-muted/50 border border-border focus:border-primary/50 rounded-2xl px-6 py-4 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Neural Samples (Audio Files)</label>
              <div 
                onClick={() => cloneFileInputRef.current?.click()}
                className="group border-2 border-dashed border-primary/20 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 hover:bg-primary/5 transition-all cursor-pointer bg-muted/20"
              >
                <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">Neural Data Ingestion</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
                    Upload 1-5 minutes of speech samples for matrix mapping. High quality MP3/WAV recommended.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => cloneFileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/30 hover:bg-primary hover:text-white transition-all transform active:scale-95 shadow-lg shadow-primary/5"
                >
                  Choose Neural Samples
                </button>
                <input 
                  type="file" 
                  multiple 
                  accept="audio/*"
                  ref={cloneFileInputRef}
                  onChange={(e) => setVoiceFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
              </div>
              {voiceFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {voiceFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl text-xs font-medium border border-border">
                      <Volume2 className="w-3 h-3 text-primary" />
                      {file.name}
                      <button onClick={() => setVoiceFiles(prev => prev.filter((_, idx) => idx !== i))}>
                        <Plus className="w-3 h-3 rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cloningStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-xl text-xs font-medium border",
                  cloningStatus.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                )}
              >
                {cloningStatus.message}
              </motion.div>
            )}

            <button 
              onClick={handleVoiceClone}
              disabled={isCloning || !cloningName || voiceFiles.length === 0}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group"
            >
              <Fingerprint className="w-5 h-5 group-hover:animate-pulse" />
              Begin Neural Imprint
            </button>
          </div>

          <div className="glass-card rounded-[2rem] p-8 space-y-6 bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-4">Imprint Guidelines</h4>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed"><span className="text-foreground font-bold">Clear Environment:</span> Ensure zero background noise for the highest cloning fidelity.</p>
              </li>
              <li className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed"><span className="text-foreground font-bold">Tonality Check:</span> Speak with your natural inflection and emotional range.</p>
              </li>
              <li className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed"><span className="text-foreground font-bold">Duration Mastery:</span> 5 minutes of data provides the "Master Grade" imprint quality.</p>
              </li>
            </ul>
            <div className="mt-8 p-4 bg-muted/40 rounded-2xl border border-white/5 italic text-[10px] text-muted-foreground">
              "Biometric voice data is processed securely through ElevenLabs Enterprise matrix and encrypted for your neural profile."
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-[2rem] border-dashed border-primary/30 flex flex-col items-center justify-center text-center gap-4">
        <Bot className="w-12 h-12 text-primary opacity-50" />
        <div className="space-y-1">
          <h4 className="font-bold">Neural Efficiency: 98.4%</h4>
          <p className="text-xs text-muted-foreground max-w-md">Processing units optimized for sub-minute generation. Estimated throughput: ~20s image / ~5s audio.</p>
        </div>
      </div>
    </motion.div>
  );
}

function PlaygroundView({ user }: { user: FirebaseUser | null }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 overflow-y-auto h-full"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-gradient">Mind Playground</h2>
          <p className="text-sm text-muted-foreground">Interactive arenas to sharpen your cognitive edge</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold truncate">Daily Streak: 5</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { 
            title: "Neural Memory", 
            icon: <Brain />, 
            progress: 65, 
            color: "text-blue-500",
            desc: "Match complex neural patterns to boost recall speed.",
            difficulty: "Medium"
          },
          { 
            title: "Logic Flow", 
            icon: <Zap />, 
            progress: 42, 
            color: "text-yellow-500",
            desc: "Solve algorithmic puzzles in a race against time.",
            difficulty: "Hard"
          },
          { 
            title: "Focus Matrix", 
            icon: <Sparkles />, 
            progress: 88, 
            color: "text-purple-500",
            desc: "Filter out cognitive noise in high-density environments.",
            difficulty: "Easy"
          },
          { 
            title: "Academic Engine", 
            icon: <Calendar />, 
            progress: 92, 
            color: "text-orange-500",
            desc: "Manage academic goals and synchronize learning schedules.",
            difficulty: "Essential"
          },
          { 
            title: "Video Generate", 
            icon: <Video />, 
            progress: 10, 
            color: "text-red-500",
            desc: "Generate cinematic neural visualizers from textual seeds.",
            difficulty: "Advanced"
          },
          { 
            title: "Quiz Arena", 
            icon: <HelpCircle />, 
            progress: 25, 
            color: "text-emerald-500",
            desc: "Compete in real-time knowledge challenges.",
            difficulty: "Dynamic"
          }
        ].map((task, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-[2rem] space-y-6 group cursor-pointer hover:border-primary/50 transition-all relative overflow-hidden"
            onClick={() => setActiveGame(task.title)}
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              {React.cloneElement(task.icon as React.ReactElement, { className: "w-24 h-24" })}
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className={cn("p-4 rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors", task.color)}>
                {React.cloneElement(task.icon as React.ReactElement, { className: "w-8 h-8" })}
              </div>
              <div className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold uppercase tracking-wider">
                {task.difficulty}
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{task.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{task.desc}</p>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Mastery Level</span>
                <span className="font-bold">{task.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                />
              </div>
            </div>

            <button className="w-full py-3 bg-primary/5 group-hover:bg-primary group-hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
              Enter Arena
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      {activeGame && (
        <GameModal activeGame={activeGame} onClose={() => setActiveGame(null)} user={user} />
      )}
    </motion.div>
  );
}

function GameModal({ activeGame, onClose, user }: { activeGame: string, onClose: () => void, user: FirebaseUser | null }) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-background/80 backdrop-blur-xl"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] relative z-10 border-primary/20 shadow-2xl flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {gameState === 'intro' ? (
          <div className="space-y-8 text-center max-w-2xl mx-auto py-12">
            <ScanningEffect />
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Cpu className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-4xl font-bold">Initializing {activeGame}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Calibrating neural interface for optimal performance. MentorMind AI is preparing a personalized training session based on your current cognitive metrics.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={onClose}
                className="px-8 py-4 bg-muted hover:bg-muted/80 rounded-2xl font-bold transition-all min-w-[140px]"
              >
                Abort
              </button>
              <button 
                onClick={() => setGameState('playing')}
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 min-w-[140px]"
              >
                Start Session
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {activeGame === 'Neural Memory' && <MemoryGame />}
            {activeGame === 'Logic Flow' && <LogicPuzzleGame />}
            {activeGame === 'Video Generate' && <VideoGen />}
            {activeGame === 'Academic Engine' && <AcademicTaskManager user={user} />}
            {activeGame === 'Quiz Arena' && <QuizArena />}
            {activeGame === 'Focus Matrix' && <FocusMatrix />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FocusMatrix() {
  const [score, setScore] = useState(0);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(20);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isStarted && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsStarted(false);
    }
    return () => clearInterval(timer);
  }, [isStarted, timeLeft]);

  const moveTarget = () => {
    if (!isStarted) return;
    setScore(s => s + 1);
    setTargetPos({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10
    });
  };

  return (
    <div className="space-y-8 py-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          Focus Matrix Alpha
        </h3>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-purple-500/10 rounded-xl font-bold text-purple-500">
            Time: {timeLeft}s
          </div>
          <div className="px-4 py-2 bg-primary/10 rounded-xl font-bold text-primary">
            Precision: {score}
          </div>
        </div>
      </div>

      {!isStarted && timeLeft === 20 && (
        <div className="flex-1 flex items-center justify-center">
          <button 
            onClick={() => { setIsStarted(true); moveTarget(); }}
            className="px-12 py-6 bg-primary text-white rounded-[2rem] font-bold text-xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            Engage Neural Link
          </button>
        </div>
      )}

      {timeLeft === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-6xl font-black text-primary">{score}</div>
          <div className="text-xl font-bold">Focus Density Confirmed</div>
          <button 
            onClick={() => { setTimeLeft(20); setScore(0); setIsStarted(false); }}
            className="px-8 py-3 bg-muted rounded-xl font-bold"
          >
            Restart Matrix
          </button>
        </div>
      )}

      {isStarted && timeLeft > 0 && (
        <div className="flex-1 relative glass-panel rounded-[2rem] overflow-hidden bg-muted/20 cursor-crosshair">
          <motion.div
            layout
            initial={false}
            animate={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
            onClick={moveTarget}
            className="absolute w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)] border-2 border-white/20"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

function QuizArena() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const questions = [
    {
      q: "What does 'LLM' stand for in the context of modern AI?",
      options: ["Logic Learning Model", "Large Language Model", "Level Line Multiplier", "Linear Language Mapping"],
      a: 1
    },
    {
      q: "Which neural architecture revolutionized Natural Language Processing in 2017?",
      options: ["Transformer", "RNN", "CNN", "LSTM"],
      a: 0
    },
    {
      q: "In computational logic, which operator represents 'IF AND ONLY IF'?",
      options: ["AND", "OR", "XOR", "XNOR"],
      a: 3
    }
  ];

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    if (index === questions[currentQuestion].a) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setShowResult(true);
      }
    }, 1000);
  };

  if (showResult) {
    return (
      <div className="text-center space-y-8 py-12">
        <div className="relative inline-block">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
          >
            <Award className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full">
            SYNC DONE
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-bold">Arena Sync Complete</h3>
          <p className="text-muted-foreground italic">Neural accuracy verified across knowledge nodes.</p>
        </div>
        <div className="text-5xl font-black text-primary">
          {Math.round((score / questions.length) * 100)}%
        </div>
        <button 
          onClick={() => {
            setCurrentQuestion(0);
            setScore(0);
            setShowResult(false);
            setSelectedOption(null);
          }}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          Initialize Re-Calibration
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-8 max-w-2xl mx-auto">
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-4">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span className="text-primary">Node: Knowledge_V4</span>
        </div>
        <h3 className="text-2xl font-bold leading-tight tracking-tight">
          {questions[currentQuestion].q}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {questions[currentQuestion].options.map((option, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOptionSelect(i)}
            disabled={selectedOption !== null}
            className={cn(
              "w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden",
              selectedOption === null 
                ? "glass-card border-white/10 hover:border-primary/50 hover:bg-primary/5" 
                : i === questions[currentQuestion].a 
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : selectedOption === i 
                    ? "bg-red-500/20 border-red-500 text-red-500"
                    : "glass-card border-white/5 opacity-50"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                selectedOption === i ? "bg-white/10" : "bg-muted"
              )}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className="font-bold">{option}</span>
            </div>
            {selectedOption !== null && i === questions[currentQuestion].a && (
              <Check className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 animate-in zoom-in" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function AcademicTaskManager({ user }: { user: FirebaseUser | null }) {
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AcademicTask[];
      setTasks(taskList);
    });
    return () => unsubscribe();
  }, [user]);

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
        title: newTaskTitle,
        deadline: newDeadline || null,
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTaskTitle('');
      setNewDeadline('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', id), {
        completed: !completed
      });
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
    } catch (error) {
       console.error("Error deleting task:", error);
    }
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-orange-500" />
          Academic Engine
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-6 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 rounded-3xl space-y-4 border-primary/20 bg-primary/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="What is your academic objective?"
                  className="p-3 bg-background border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <input 
                  type="date" 
                  className="p-3 bg-background border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-bold text-muted-foreground"
                >
                  Cancel
                </button>
                <button 
                  onClick={addTask}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm"
                >
                  Initialise Task
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Pending Strategy ({pendingTasks.length})
          </h4>
          <div className="space-y-3">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center glass-card border-dashed rounded-3xl opacity-50">
                <p className="text-xs italic">No pending objectives detected.</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <motion.div 
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel p-4 rounded-2xl flex items-center gap-4 group hover:border-primary/30 transition-all"
                >
                  <button 
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-6 h-6 rounded-lg border-2 border-primary/20 flex items-center justify-center hover:bg-primary/10 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-sm bg-primary opacity-0 group-hover:opacity-20" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm truncate">{task.title}</h5>
                    {task.deadline && (
                      <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Deadline: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-500 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-sm text-emerald-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Sync Complete ({completedTasks.length})
          </h4>
          <div className="space-y-3">
            {completedTasks.length === 0 ? (
              <div className="p-8 text-center glass-card border-dashed rounded-3xl opacity-50">
                <p className="text-xs italic">Complete objectives to sync neural progress.</p>
              </div>
            ) : (
              completedTasks.map(task => (
                <motion.div 
                  key={task.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-4 rounded-2xl flex items-center gap-4 bg-emerald-500/5 border-emerald-500/10"
                >
                  <button 
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm truncate text-muted-foreground line-through">{task.title}</h5>
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoryGame() {
  const icons = [<Brain />, <Zap />, <Sparkles />, <Bot />, <Cpu />, <Fingerprint />, <Globe />, <Shield />];
  const [cards, setCards] = useState<{ id: number, iconIndex: number, isFlipped: boolean, isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const shuffled = [...icons.keys(), ...icons.keys()].sort(() => Math.random() - 0.5).map((iconIndex, index) => ({
      id: index,
      iconIndex,
      isFlipped: false,
      isMatched: false
    }));
    setCards(shuffled);
  }, []);

  const handleFlip = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].iconIndex === cards[second].iconIndex) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const isWin = cards.length > 0 && cards.every(c => c.isMatched);

  return (
    <div className="space-y-8 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          Neural Memory Match
        </h3>
        <div className="px-4 py-2 bg-primary/10 rounded-xl font-bold text-primary">
          Moves: {moves}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleFlip(i)}
            className={cn(
              "aspect-square rounded-2xl cursor-pointer flex items-center justify-center text-2xl transition-all duration-500 transform-style-3d",
              card.isFlipped || card.isMatched ? "bg-primary text-white rotate-y-180" : "glass-card border-primary/20 hover:border-primary"
            )}
          >
            {(card.isFlipped || card.isMatched) ? icons[card.iconIndex] : <div className="w-4 h-4 bg-primary/20 rounded-full" />}
          </motion.div>
        ))}
      </div>

      {isWin && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 glass-card border-emerald-500/30 rounded-3xl space-y-4"
        >
          <Award className="w-12 h-12 text-emerald-500 mx-auto" />
          <h4 className="text-2xl font-bold text-emerald-500">Neural Sync Confirmed!</h4>
          <p className="text-muted-foreground">Memory pathways optimized with {moves} operations.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold">Restart Matrix</button>
        </motion.div>
      )}
    </div>
  );
}

function LogicPuzzleGame() {
  const [puzzle, setPuzzle] = useState({ q: "What belongs to you, but others use it more than you do?", a: "Your name." });
  const [showAnswer, setShowAnswer] = useState(false);
  const [userInput, setUserInput] = useState("");

  const puzzles = [
    { q: "What belongs to you, but others use it more than you do?", a: "Your Name." },
    { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind.", a: "An Echo." },
    { q: "You measure my life in hours and I serve you by expiring. I'm quick when I'm thin and slow when I'm fat. The wind is my enemy.", a: "A Candle." },
    { q: "I have keys, but no locks and space, and no rooms. You can enter, but you can’t go outside.", a: "A Keyboard." }
  ];

  const nextPuzzle = () => {
    const next = puzzles[Math.floor(Math.random() * puzzles.length)];
    setPuzzle(next);
    setShowAnswer(false);
    setUserInput("");
  };

  return (
    <div className="space-y-8 py-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Logic Flow Arena
        </h3>
      </div>

      <div className="glass-card p-10 rounded-[3rem] space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles className="w-32 h-32 text-primary" />
        </div>
        
        <p className="text-2xl font-bold leading-relaxed relative z-10">"{puzzle.q}"</p>

        <div className="space-y-4 relative z-10">
          <input 
            type="text" 
            placeholder="Type your hypothesis..."
            className="w-full p-4 bg-muted border-white/5 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <div className="flex gap-4">
            <button 
              onClick={() => setShowAnswer(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex-1"
            >
              Check Answer
            </button>
            <button 
              onClick={nextPuzzle}
              className="px-6 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold"
            >
              Next Puzzle
            </button>
          </div>
        </div>

        {showAnswer && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-primary/10 rounded-2xl border border-primary/20 text-center"
          >
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Neural Verification Result</span>
            {/* The user requested to leave one line before giving answers */}
            <br />
            <p className="text-3xl font-bold text-primary">{puzzle.a}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function VideoGen() {
  const [prompt, setPrompt] = useState("");
  const [storyboard, setStoryboard] = useState<{ frame: string, desc: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStoryboard = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a cinematic 4-frame video storyboard description for: "${prompt}". 
          Format strictly as a JSON array ONLY, no markdown: [{"frame": "Scene 1: Close Up", "desc": "A drop of golden liquid hits a neural network matrix..."}, ...]`
      });
      const dataText = result.text || "";
      // Try to parse JSON from AI response
      const jsonStr = dataText.match(/\[.*\]/s)?.[0];
      if (jsonStr) {
        setStoryboard(JSON.parse(jsonStr));
      } else {
        setStoryboard([{ frame: "Synthesis Error", desc: "The neural network returned non-standard data. Please try another seed." }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-6 h-6 text-red-500" />
          Video Synthesis Arena
        </h3>
      </div>

      <div className="flex gap-4">
        <input 
          type="text" 
          placeholder="Describe the cinematic neural motion..."
          className="flex-1 p-4 bg-muted border-white/5 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button 
          onClick={generateStoryboard}
          disabled={isGenerating}
          className="px-8 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {isGenerating ? <Sparkles className="animate-spin" /> : "Synthesize"}
        </button>
      </div>

      {storyboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {storyboard.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 rounded-[2rem] space-y-4"
            >
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent animate-pulse" />
                <span className="text-4xl font-bold opacity-10">{i + 1}</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-primary">{s.frame}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeView() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 overflow-y-auto h-full"
    >
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-gradient">Knowledge Vault</h2>
        <p className="text-sm text-muted-foreground">Your personal library of synthesized concepts</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { title: "Quantum Computing Basics", desc: "Summary of your last session on qubits and superposition.", type: "Physics", time: "2h ago" },
          { title: "Neural Networks 101", desc: "Deep dive into backpropagation and activation functions.", type: "AI", time: "5h ago" },
          { title: "Cognitive Biases", desc: "Understanding the shortcuts your brain takes.", type: "Psychology", time: "1d ago" }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-[2rem] flex items-center gap-6 hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
            <div className="text-xs text-muted-foreground flex flex-col items-end gap-2">
              <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                <Clock className="w-3 h-3" /> {item.time}
              </span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-bold border border-primary/20">
                {item.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileView({ profile, messages }: { profile: UserProfile | null, messages: Message[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 overflow-y-auto h-full"
    >
      <div className="glass-panel p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 md:p-8">
          <Award className="w-8 h-8 md:w-12 md:h-12 text-primary/20" />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl overflow-hidden border-4 border-primary/20">
              <img src={profile?.photoURL || "https://picsum.photos/seed/user/200"} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-lg">
              <Zap className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-1 md:space-y-2">
            <h2 className="text-2xl md:text-3xl font-heading font-bold">{profile?.displayName}</h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none">{profile?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="glass-card p-6 rounded-3xl text-center space-y-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Neural Sync</span>
            <div className="text-3xl font-bold text-primary">98.2%</div>
          </div>
          <div className="glass-card p-6 rounded-3xl text-center space-y-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Sync Operations</span>
            <div className="text-3xl font-bold text-primary">{messages.length}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TutorialOverlay({ 
  activeTutorial, 
  onClose, 
  onNext 
}: { 
  activeTutorial: { tutorialId: string, stepIndex: number }, 
  onClose: () => void,
  onNext: () => void
}) {
  const tutorial = TUTORIALS.find(t => t.id === activeTutorial.tutorialId);
  if (!tutorial) return null;

  const currentStep = tutorial.steps[activeTutorial.stepIndex];
  const isLastStep = activeTutorial.stepIndex === tutorial.steps.length - 1;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 pointer-events-auto border-primary/20"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider">{tutorial.title}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Step {activeTutorial.stepIndex + 1} of {tutorial.steps.length}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors group"
          >
            <Plus className="w-4 h-4 rotate-45 text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          {currentStep.videoUrl && (
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/20 border border-white/10 group">
              <video 
                src={currentStep.videoUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-none" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Neural Preview</span>
              </div>
            </div>
          )}
          <h4 className="text-xl font-bold">{currentStep.title}</h4>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-1">
            {tutorial.steps.map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === activeTutorial.stepIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <button 
            onClick={onNext}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/25"
          >
            {isLastStep ? 'Complete Journey' : 'Next Protocol'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MentorshipView() {
  const mentors = [
    { id: 'm1', name: 'Dr. Althea', role: 'Senior Cognitive Architect', bio: 'Expert in neural pattern recognition and high-dimensional data analysis.', expertise: 'Neural Architecture', color: 'from-blue-500 to-cyan-500' },
    { id: 'm2', name: 'Master Zephyr', role: 'Elite Knowledge Weaver', bio: 'Specializes in creative data synthesis and multidimensional knowledge mapping.', expertise: 'Creative Synthesis', color: 'from-purple-500 to-pink-500' },
    { id: 'm3', name: 'Nova Prime', role: 'Strategic Logic Director', bio: 'Advanced specialist in decision matrix analysis and tactical logic flows.', expertise: 'Strategic Logic', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12 atmosphere bg-gradient-to-br from-background via-background to-primary/5 min-h-0"
    >
      <div className="max-w-6xl mx-auto space-y-16 py-8">
        <div className="space-y-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.2em] mb-2 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
          >
            <ShieldCheck className="w-3 h-3" />
            Elite Cognitive Network
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-heading font-black text-gradient leading-tight tracking-tighter">
            Neural Mentorship <br/> System <span className="text-primary font-serif italic text-3xl md:text-5xl tracking-normal">Alpha</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            Engage with high-tier synthetic intelligences designed for specialized cognitive guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {mentors.map((mentor, index) => (
            <motion.div 
              key={mentor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="glass-panel p-8 rounded-[3rem] flex flex-col space-y-6 border-white/5 hover:border-primary/40 transition-all group relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Brain className="w-32 h-32" />
              </div>
              
              <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${mentor.color} flex items-center justify-center shadow-xl shadow-black/20 group-hover:rotate-6 transition-transform`}>
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-black tracking-tight">{mentor.name}</h3>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                  {mentor.role}
                </div>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed relative z-10">
                {mentor.bio}
              </p>
              
              <div className="pt-6 mt-auto space-y-4 relative z-10">
                <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest border-t border-white/5 pt-6">
                  <span>Core Logic</span>
                  <span className="text-foreground">{mentor.expertise}</span>
                </div>
                <button className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-bold hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2 group/btn active:scale-95">
                  Request Sync Session
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              Active Sync Timeline
            </h3>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-full border border-white/5">
              Current Cycle: April 2026
            </div>
          </div>
          
          <div className="glass-panel p-10 rounded-[3rem] border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-accent to-transparent opacity-20" />
            <div className="space-y-8">
              <motion.div 
                whileHover={{ x: 10 }}
                className="flex flex-col md:flex-row items-start md:items-center gap-8 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted flex flex-col items-center justify-center font-black transition-colors group-hover:bg-primary/20 group-hover:text-primary">
                  <span className="text-[10px] opacity-60">TUE</span>
                  <span className="text-xl">24</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-lg">Neural Pattern Analysis & Optimization</div>
                  <p className="text-sm text-muted-foreground">Strategic sync with <span className="text-primary font-bold">Dr. Althea</span> • 45 min duration</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-5 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase tracking-widest border border-emerald-500/20 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Confirmed
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all" />
                </div>
              </motion.div>
              
              <div className="flex flex-col items-center justify-center py-10 space-y-4 opacity-50">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground font-medium italic">No further sync sessions scheduled in the current neural buffer.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
