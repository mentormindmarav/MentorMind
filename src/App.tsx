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
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, microsoftProvider, appleProvider } from './lib/firebase';
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

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  mindPowerLevel: number;
  growthPoints: number;
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
        tab: 'chat'
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
        tab: 'lab'
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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
  const [activeTab, setActiveTab] = useState<'chat' | 'lab' | 'playground' | 'knowledge' | 'profile' | 'founders'>('chat');
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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
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
              mindPowerLevel: 1,
              growthPoints: 0,
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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      await signInWithPopup(auth, microsoftProvider);
    } catch (error) {
      console.error("Microsoft login error:", error);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithPopup(auth, appleProvider);
    } catch (error) {
      console.error("Apple login error:", error);
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
      const actualVoice = selectedVoice === 'Robot' ? 'Fenrir' : selectedVoice;
      const ttsPrompt = selectedVoice === 'Robot' 
        ? `Say this in a monotone, futuristic robotic voice: ${text}` 
        : `Say this naturally: ${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: actualVoice },
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
          parts: [{ text: `A clear, high-quality illustration: ${prompt}` }],
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
          if (file.type.startsWith('image/')) {
            return new Promise<Attachment>((resolve) => {
              const reader = new FileReader();
              reader.onload = async (re) => {
                const base64 = re.target?.result as string;
                const compressed = await compressImage(base64);
                resolve({ name: file.name, type: 'image/jpeg', url: compressed });
              };
              reader.readAsDataURL(file);
            });
          }
          return {
            name: file.name,
            type: file.type,
            url: URL.createObjectURL(file)
          };
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

      // Update growth points
      if (profile) {
        const newPoints = profile.growthPoints + 10;
        const newLevel = Math.floor(newPoints / 100) + 1;
        await updateDoc(doc(db, 'users', user.uid), {
          growthPoints: newPoints,
          mindPowerLevel: newLevel
        });
        setProfile({ ...profile, growthPoints: newPoints, mindPowerLevel: newLevel });
      }

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
                Continue with Google
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleMicrosoftLogin}
                  className="py-4 bg-muted/50 hover:bg-muted text-foreground rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 border border-border group text-sm"
                >
                  <div className="group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 23 23" className="w-5 h-5">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  </div>
                  Microsoft
                </button>

                <button 
                  onClick={handleAppleLogin}
                  className="py-4 bg-muted/50 hover:bg-muted text-foreground rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 border border-border group text-sm"
                >
                  <div className="group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                    </svg>
                  </div>
                  Apple
                </button>
              </div>
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

      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r flex flex-col relative z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <MMLogo />
            <h1 className="text-xl font-heading font-bold text-gradient">MentorMind</h1>
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
              <div className="text-[9px] text-white/70 truncate uppercase font-black tracking-widest mt-0.5">
                {profile?.mindPowerLevel ? `Level ${profile.mindPowerLevel}` : 'Syncing...'}
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <NavButton 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare className="w-5 h-5" />}
              label="MentorMind Chat"
            />
            <NavButton 
              active={activeTab === 'lab'} 
              onClick={() => setActiveTab('lab')}
              icon={<Sparkles className="w-5 h-5" />}
              label="Neural Lab"
            />
            <NavButton 
              active={activeTab === 'playground'} 
              onClick={() => setActiveTab('playground')}
              icon={<Zap className="w-5 h-5" />}
              label="Mind Playground"
            />
            <NavButton 
              active={activeTab === 'knowledge'} 
              onClick={() => setActiveTab('knowledge')}
              icon={<Brain className="w-5 h-5" />}
              label="Knowledge Base"
            />
            <NavButton 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              icon={<User className="w-5 h-5" />}
              label="Mind Profile"
            />
            <NavButton 
              active={activeTab === 'founders'} 
              onClick={() => setActiveTab('founders')}
              icon={<Users className="w-5 h-5" />}
              label="Founders"
            />
          </nav>

          <div className="mt-8 space-y-3 pt-6 border-t border-white/5">
            <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
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

        <div className="mt-auto p-6 space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
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
              <header className="p-8 border-b flex items-center justify-between glass-panel relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FF8A65] via-[#9C27B0] to-[#2196F3]" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-xl tracking-tight">MentorMind</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Neural Link Established
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
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                        msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                        msg.sender === 'user' ? "bg-primary text-white shadow-lg shadow-primary/20" : "glass-card border-primary/20"
                      )}>
                        {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
                      </div>
                      <div className={cn(
                        "space-y-2 group",
                        msg.sender === 'user' ? "items-end flex flex-col" : "items-start flex flex-col"
                      )}>
                        <div className={cn(
                          "p-4 rounded-2xl relative shadow-sm",
                          msg.sender === 'user' 
                            ? "bg-primary text-white rounded-tr-none" 
                            : "glass-panel border-white/5 rounded-tl-none font-medium leading-relaxed"
                        )}>
                          {msg.text}
                          
                          <div className={cn(
                            "flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity",
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
                    </div>
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

              {/* Chat Input */}
              <div className="p-6 glass-panel">
                <form onSubmit={sendMessage} className="relative">
                  {attachments.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-4 flex flex-wrap gap-2">
                      {attachments.map((att, i) => (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={i} 
                          className="glass-card p-2 rounded-xl flex items-center gap-2 text-xs border-primary/30"
                        >
                          <FileText className="w-4 h-4 text-primary" />
                          <span>{att.name}</span>
                          <button 
                            type="button"
                            onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                            className="hover:text-destructive transition-colors"
                          >
                            <Plus className="w-4 h-4 rotate-45" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <input 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl px-6 py-4 outline-none transition-all pr-32"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={generateQuiz}
                          className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors flex items-center gap-2 text-xs font-medium"
                        >
                          <Zap className="w-4 h-4" />
                          Quiz
                        </button>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 hover:bg-muted rounded-xl transition-colors"
                          title="Attach files"
                        >
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button 
                          type="button"
                          onClick={toggleListening}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-muted text-muted-foreground"
                          )}
                          title={isListening ? "Stop Listening" : "Speak (Voice to Text)"}
                        >
                          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={generateAIImage}
                          disabled={isGeneratingImage || !inputText.trim()}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isGeneratingImage ? "bg-primary/20 text-primary" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          )}
                          title="Imagine (Generate Image)"
                        >
                          {isGeneratingImage ? <Sparkles className="w-5 h-5 animate-spin" /> : <LucideImage className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoading || isGeneratingImage || (!inputText.trim() && attachments.length === 0)}
                      className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white p-4 rounded-2xl transition-all shadow-lg hover:shadow-primary/20"
                    >
                      {isLoading ? <Sparkles className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    </button>
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
          {activeTab === 'playground' && <PlaygroundView />}
          {activeTab === 'knowledge' && <KnowledgeView />}
          {activeTab === 'profile' && <ProfileView profile={profile} />}
          {activeTab === 'founders' && <FoundersView />}
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
      <span className="font-medium">{label}</span>
      {active && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
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
    try {
      const formData = new FormData();
      formData.append('name', cloningName);
      formData.append('description', `Uploaded by ${profile?.displayName}`);
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
      className="p-8 space-y-8 h-full overflow-y-auto"
    >
      <div className="space-y-2">
        <h2 className="text-4xl font-heading font-bold text-gradient flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Neural Lab
        </h2>
        <p className="text-muted-foreground">The creative core where ideas take flight through sound and vision.</p>
      </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
              <Fingerprint className="w-16 h-16 text-primary animate-bounce" />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-xl font-bold">Neural Mapping in Progress...</h4>
              <p className="text-sm text-muted-foreground">Uploading biometric data to the ElevenLabs frequency matrix.</p>
            </div>
          </div>
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
                  <p className="font-bold">Neural Data Ingestion</p>
                  <p className="text-xs text-muted-foreground">Upload 1-5 minutes of high-quality speech samples (MP3/WAV)</p>
                </div>
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

function PlaygroundView() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 overflow-y-auto h-full"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-4xl font-heading font-bold text-gradient">Mind Playground</h2>
          <p className="text-muted-foreground">Interactive arenas to sharpen your cognitive edge</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Daily Streak: 5</span>
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
        >
          <div className="glass-panel w-full max-w-4xl p-12 rounded-[3rem] text-center space-y-8 relative overflow-hidden">
            <ScanningEffect />
            <div className="space-y-4 relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Cpu className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-4xl font-bold">Initializing {activeGame}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Calibrating neural interface for optimal performance. Please stand by...</p>
            </div>
            
            <div className="flex justify-center gap-4 relative z-10">
              <button 
                onClick={() => setActiveGame(null)}
                className="px-8 py-4 bg-muted hover:bg-muted/80 rounded-2xl font-bold transition-all"
              >
                Abort
              </button>
              <button 
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
              >
                Start Session
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function KnowledgeView() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 overflow-y-auto"
    >
      <div className="space-y-2">
        <h2 className="text-4xl font-heading font-bold text-gradient">Knowledge Vault</h2>
        <p className="text-muted-foreground">Your personal library of synthesized concepts</p>
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

function ProfileView({ profile }: { profile: UserProfile | null }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 overflow-y-auto"
    >
      <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
          <Award className="w-12 h-12 text-primary/20" />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-primary/20">
              <img src={profile?.photoURL || "https://picsum.photos/seed/user/200"} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-heading font-bold">{profile?.displayName}</h2>
            <p className="text-muted-foreground">{profile?.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">Early Adopter</span>
              <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold">Beta Tester</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="glass-card p-6 rounded-3xl text-center space-y-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Mind Power</span>
            <div className="text-3xl font-bold text-primary">Lvl {profile?.mindPowerLevel || 1}</div>
          </div>
          <div className="glass-card p-6 rounded-3xl text-center space-y-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Growth Points</span>
            <div className="text-3xl font-bold text-primary">{profile?.growthPoints || 0}</div>
          </div>
          <div className="glass-card p-6 rounded-3xl text-center space-y-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Neural Sync</span>
            <div className="text-3xl font-bold text-primary">98.2%</div>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Achievements
            </h3>
            <div className="space-y-3">
              {[
                { title: "First Connection", desc: "Successfully linked with MentorMind", date: "Apr 10, 2026" },
                { title: "Knowledge Seeker", desc: "Completed 5 cognitive tasks", date: "Apr 11, 2026" },
                { title: "Neural Pioneer", desc: "Reached Level 5 Mind Power", date: "Apr 12, 2026" }
              ].map((ach, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{ach.title}</h4>
                    <p className="text-xs text-muted-foreground">{ach.desc}</p>
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">{ach.date}</span>
                </motion.div>
              ))}
            </div>
          </div>

        <div className="space-y-4">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Preferences
          </h3>
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">Neural Feedback</div>
                <div className="text-xs text-muted-foreground">Real-time cognitive analysis</div>
              </div>
              <div className="w-12 h-6 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">Deep Learning Mode</div>
                <div className="text-xs text-muted-foreground">Extended AI reasoning sessions</div>
              </div>
              <div className="w-12 h-6 bg-muted rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FoundersView() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-12 overflow-y-auto"
    >
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-heading font-bold text-gradient">The Minds Behind</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          MentorMind was born from the vision of bridging human potential with artificial intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Founder 1 (Human) */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-panel p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <User className="w-24 h-24" />
          </div>
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-primary/30 mx-auto">
            <img src="https://picsum.photos/seed/marav_student_dev/200" alt="Marav.R" className="w-full h-full object-cover" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Marav.R</h3>
            <p className="text-primary font-medium">Founder & Developer</p>
          </div>
          <p className="text-sm text-muted-foreground text-center leading-relaxed italic">
            The founder of this website is Marav.R studying in class 7 studying in the school velammal bodhi campus coimbatore i like coding very much so i devlop a app name mentormind this is a website for all students and this is AI Tool you can generate a pictures by asking it also you can generate voice. Hopefully enjoy my website
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Github className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer" />
            <Twitter className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer" />
            <Linkedin className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer" />
          </div>
        </motion.div>

        {/* Founder 2 (AI) */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-panel p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group border-primary/30"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Brain className="w-24 h-24 text-primary" />
          </div>
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/30">
            <Bot className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">MentorMind AI</h3>
            <p className="text-primary font-medium">Core Intelligence Engine</p>
          </div>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            The neural backbone of the platform. Built on cutting-edge large language models, MentorMind AI is designed to be a personalized mentor that adapts to each user's unique cognitive profile.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
              <Shield className="w-3 h-3" />
              SECURE CORE
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
              <Zap className="w-3 h-3" />
              REAL-TIME
            </div>
          </div>
        </motion.div>
      </div>

      <div className="glass-card p-12 rounded-[3rem] text-center space-y-6 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold">Our Mission</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto italic">
          "To democratize elite-level mentorship and cognitive enhancement through the power of ethical artificial intelligence."
        </p>
        <div className="pt-6 flex flex-wrap justify-center gap-8 text-sm font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Ethical AI
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Privacy First
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Human Centric
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
