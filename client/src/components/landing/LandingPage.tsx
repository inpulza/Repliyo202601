import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion, useInView, useScroll, useTransform, useReducedMotion, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Check, X, Sparkles, Inbox, Users, Bell, MessageSquare, BarChart2, Send, Zap, Clock, Heart, Sun, Moon, Tags, Filter } from 'lucide-react';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { GoogleBusinessIcon } from '../GoogleBusinessIcon';
import avatarMaria from '../../assets/avatars/latina_woman_avatar_headshot.png';
import avatarCarlos from '../../assets/avatars/hispanic_man_avatar_headshot.png';
import avatarAna from '../../assets/avatars/european_woman_avatar_headshot.png';
import { ParallaxProvider, useParallax, Parallax } from 'react-scroll-parallax';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import '../../styles/landing.css';

gsap.registerPlugin(ScrollTrigger);

function Step1ConnectMockup() {
  const orbitIcons = [
    { Icon: FaInstagram, platform: 'instagram' },
    { Icon: FaTiktok, platform: 'tiktok' },
    { Icon: FaFacebook, platform: 'facebook' },
    { Icon: FaYoutube, platform: 'youtube' },
    { Icon: FaLinkedin, platform: 'linkedin' },
    { Icon: GoogleBusinessIcon, platform: 'google' },
  ];
  
  const radius = 110;
  
  return (
    <div className="step-mockup connect-mockup-v3">
      <div className="connect-center-inbox-v3">
        <Inbox className="w-8 h-8 text-white" />
        <div className="radar-ring-css ring-1" />
        <div className="radar-ring-css ring-2" />
        <div className="radar-ring-css ring-3" />
      </div>
      
      <motion.div 
        className="orbit-ring-container"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
      >
        <div className="orbit-ring-large" />
        
        {orbitIcons.map((item, idx) => {
          const baseAngle = (idx * 60) - 90;
          const x = Math.cos(baseAngle * Math.PI / 180) * radius;
          const y = Math.sin(baseAngle * Math.PI / 180) * radius;
          
          return (
            <motion.div
              key={item.platform}
              className={`orbit-icon-static ${item.platform}`}
              style={{ 
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -21,
                marginTop: -21,
                x, 
                y 
              }}
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
            >
              <item.Icon className={`w-5 h-5 ${item.platform === 'tiktok' ? 'text-white' : ''}`} />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function Step2AIMockup() {
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState('');
  const fullResponse = '¡Hola! El precio es $299 con envío gratis. ¿Te gustaría ordenar?';
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];
    
    const runCycle = () => {
      setPhase(0);
      setTypedText('');
      
      timers.push(setTimeout(() => setPhase(1), 500));
      timers.push(setTimeout(() => setPhase(2), 2000));
      timers.push(setTimeout(() => {
        setPhase(3);
        let charIndex = 0;
        const typeInterval = setInterval(() => {
          if (charIndex < fullResponse.length) {
            setTypedText(fullResponse.slice(0, charIndex + 1));
            charIndex++;
          } else {
            clearInterval(typeInterval);
          }
        }, 25);
        intervals.push(typeInterval);
      }, 2500));
      
      timers.push(setTimeout(() => {
        runCycle();
      }, 7000));
    };
    
    runCycle();
    
    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);
  
  return (
    <div className="step-mockup ai-mockup-v3">
      <motion.div 
        className="floating-msg incoming"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
      >
        <div className="msg-avatar">
          <img src={avatarMaria} alt="Cliente" />
        </div>
        <div className="msg-content">
          <span className="msg-name">María García</span>
          <span className="msg-text">¿Cuánto cuesta el producto?</span>
        </div>
      </motion.div>
      
      {phase === 2 && (
        <motion.div 
          className="floating-analyzing"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>IA generando respuesta...</span>
          <div className="analyzing-dots"><span /><span /><span /></div>
        </motion.div>
      )}
      
      {phase >= 3 && (
        <motion.div 
          className="floating-msg outgoing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="msg-content">
            <div className="ai-draft-badge-v2">
              <Sparkles className="w-3 h-3" /> Borrador IA
            </div>
            <span className="msg-text">
              {typedText}
              {typedText.length < fullResponse.length && <span className="typing-cursor" />}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Step3SendMockup() {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    const runCycle = () => {
      setPhase(0);
      timers.push(setTimeout(() => setPhase(1), 500));
      timers.push(setTimeout(() => setPhase(2), 1500));
      timers.push(setTimeout(() => setPhase(3), 2500));
      timers.push(setTimeout(() => setPhase(4), 3500));
      timers.push(setTimeout(() => runCycle(), 6000));
    };
    
    runCycle();
    return () => timers.forEach(clearTimeout);
  }, []);
  
  return (
    <div className="step-mockup send-mockup-v2">
      <div className="send-timeline">
        <motion.div 
          className={`timeline-step ${phase >= 1 ? 'active' : ''}`}
          animate={{ scale: phase === 1 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="timeline-icon send-icon">
            <Send className="w-4 h-4" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">Enviar respuesta</span>
            {phase >= 1 && <span className="timeline-status">Listo para enviar</span>}
          </div>
        </motion.div>
        
        <div className={`timeline-connector ${phase >= 2 ? 'active' : ''}`} />
        
        <motion.div 
          className={`timeline-step ${phase >= 2 ? 'active' : ''}`}
          animate={{ scale: phase === 2 ? [1, 1.1, 1] : 1 }}
        >
          <div className="timeline-icon check-icon">
            <Check className="w-4 h-4" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">Mensaje enviado</span>
            {phase >= 2 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="timeline-status success">Entregado ✓</motion.span>}
          </div>
        </motion.div>
        
        <div className={`timeline-connector ${phase >= 3 ? 'active' : ''}`} />
        
        <motion.div 
          className={`timeline-step ${phase >= 3 ? 'active' : ''}`}
          animate={{ scale: phase === 3 ? [1, 1.1, 1] : 1 }}
        >
          <div className="timeline-icon bell-icon">
            <Bell className="w-4 h-4" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">Recordatorio</span>
            {phase >= 3 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="timeline-status warning">Programado 24h</motion.span>}
          </div>
        </motion.div>
        
        <div className={`timeline-connector ${phase >= 4 ? 'active' : ''}`} />
        
        <motion.div 
          className={`timeline-step ${phase >= 4 ? 'active' : ''}`}
          animate={{ scale: phase === 4 ? [1, 1.1, 1] : 1 }}
        >
          <div className="timeline-icon follow-icon">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">Follow-up</span>
            {phase >= 4 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="timeline-status">Auto-enviado</motion.span>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureInboxMockup() {
  const messagesLeft = [
    { platform: 'instagram', name: 'María G.', avatar: avatarMaria, preview: '¿Tienen talla M?', Icon: FaInstagram, unread: true },
    { platform: 'tiktok', name: 'Carlos R.', avatar: avatarCarlos, preview: 'Vi tu video!', Icon: FaTiktok, unread: true },
    { platform: 'facebook', name: 'Ana L.', avatar: avatarAna, preview: 'Quiero reservar', Icon: FaFacebook, unread: false },
    { platform: 'instagram', name: 'Pedro S.', avatar: avatarCarlos, preview: '¿Hacen envíos?', Icon: FaInstagram, unread: false },
  ];
  
  const messagesRight = [
    { platform: 'facebook', name: 'Laura M.', avatar: avatarAna, preview: '¿Horarios?', Icon: FaFacebook, unread: true },
    { platform: 'instagram', name: 'Diego P.', avatar: avatarCarlos, preview: 'Me encanta!', Icon: FaInstagram, unread: true },
    { platform: 'tiktok', name: 'Sofía R.', avatar: avatarMaria, preview: '¿Descuentos?', Icon: FaTiktok, unread: false },
    { platform: 'facebook', name: 'Pablo G.', avatar: avatarCarlos, preview: 'Gracias!', Icon: FaFacebook, unread: false },
  ];

  const doubledLeft = [...messagesLeft, ...messagesLeft];
  const doubledRight = [...messagesRight, ...messagesRight];
  
  return (
    <div className="feature-inbox-split">
      <div className="inbox-column">
        <div className="inbox-column-header">
          <FaInstagram className="w-3 h-3 text-pink-400" />
          <span>DMs</span>
        </div>
        <div className="inbox-scroll-mask">
          <div className="inbox-scroll-content scroll-anim-left">
            {doubledLeft.map((msg, idx) => (
              <div key={idx} className={`inbox-item-v3 ${idx % messagesLeft.length === 0 ? 'selected' : ''}`}>
                <div className="inbox-avatar-wrap-sm">
                  <img src={msg.avatar} alt={msg.name} className="inbox-avatar-img" />
                  <div className={`inbox-platform-badge-sm ${msg.platform}`}>
                    <msg.Icon className="w-2 h-2 text-white" />
                  </div>
                </div>
                <div className="inbox-item-info-sm">
                  <span className="inbox-item-name-sm">{msg.name}</span>
                  <span className="inbox-item-preview-sm">{msg.preview}</span>
                </div>
                {msg.unread && <div className="inbox-unread-dot-sm" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="inbox-column">
        <div className="inbox-column-header">
          <MessageSquare className="w-3 h-3 text-purple-400" />
          <span>Comentarios</span>
        </div>
        <div className="inbox-scroll-mask">
          <div className="inbox-scroll-content scroll-anim-right">
            {doubledRight.map((msg, idx) => (
              <div key={idx} className="inbox-item-v3">
                <div className="inbox-avatar-wrap-sm">
                  <img src={msg.avatar} alt={msg.name} className="inbox-avatar-img" />
                  <div className={`inbox-platform-badge-sm ${msg.platform}`}>
                    <msg.Icon className="w-2 h-2 text-white" />
                  </div>
                </div>
                <div className="inbox-item-info-sm">
                  <span className="inbox-item-name-sm">{msg.name}</span>
                  <span className="inbox-item-preview-sm">{msg.preview}</span>
                </div>
                {msg.unread && <div className="inbox-unread-dot-sm" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureAIMockup() {
  const [text, setText] = useState('');
  const fullText = '¡Hola! Gracias por escribirnos...';
  
  useEffect(() => {
    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex < fullText.length) {
        setText(fullText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setTimeout(() => {
          setText('');
          charIndex = 0;
        }, 1500);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="feature-ai-mockup">
      <div className="ai-text-box">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="ai-generated-text">
          {text}
          <span className="typing-cursor" />
        </span>
      </div>
    </div>
  );
}

function FeatureCRMMockup() {
  const contacts = [
    { name: 'María G.', avatar: avatarMaria, tag: 'VIP', tagColor: 'gold', spent: '$1.2k' },
    { name: 'Carlos R.', avatar: avatarCarlos, tag: 'Lead', tagColor: 'blue', spent: '$450' },
    { name: 'Ana L.', avatar: avatarAna, tag: 'Nuevo', tagColor: 'green', spent: '$0' },
  ];

  const doubled = [...contacts, ...contacts];
  
  return (
    <div className="feature-crm-mockup">
      <div className="crm-scroll-mask">
        <div className="crm-scroll-content scroll-anim-crm">
          {doubled.map((contact, idx) => (
            <div key={idx} className={`crm-contact-row ${idx % contacts.length === 0 ? 'selected' : ''}`}>
              <div className="crm-contact-avatar">
                <img src={contact.avatar} alt={contact.name} />
              </div>
              <div className="crm-contact-info">
                <span className="crm-contact-name">{contact.name}</span>
                <span className="crm-contact-spent">{contact.spent}</span>
              </div>
              <span className={`crm-contact-tag ${contact.tagColor}`}>{contact.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureReminderMockup() {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="feature-reminder-mockup">
      <div className="reminder-timeline">
        <div className={`reminder-event ${phase >= 0 ? 'active' : ''}`}>
          <MessageSquare className="w-4 h-4" />
          <span>Mensaje enviado</span>
        </div>
        <div className={`reminder-line ${phase >= 1 ? 'active' : ''}`} />
        <div className={`reminder-event pause ${phase >= 1 ? 'active' : ''}`}>
          <Clock className="w-4 h-4" />
          <span>24h sin respuesta</span>
        </div>
        <div className={`reminder-line ${phase >= 2 ? 'active' : ''}`} />
        <motion.div 
          className={`reminder-event bell ${phase >= 2 ? 'active' : ''}`}
          animate={phase === 2 ? { scale: [1, 1.1, 1] } : {}}
        >
          <Bell className="w-4 h-4" />
          <span>Recordatorio</span>
        </motion.div>
        <div className={`reminder-line ${phase >= 3 ? 'active' : ''}`} />
        <motion.div 
          className={`reminder-event follow ${phase >= 3 ? 'active' : ''}`}
          animate={phase === 3 ? { scale: [1, 1.1, 1] } : {}}
        >
          <Send className="w-4 h-4" />
          <span>Follow-up auto</span>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCommentsMockup() {
  const threads = [
    { q: '¿Precio?', a: '$299 + envío gratis' },
    { q: '¿Colores?', a: 'Negro, blanco y azul' },
    { q: '¿Tallas?', a: 'S, M, L y XL' },
    { q: '¿Envío?', a: 'Gratis a todo el país' },
  ];

  const doubled = [...threads, ...threads];
  
  return (
    <div className="feature-comments-mockup-v3">
      <div className="comments-scroll-mask">
        <div className="comments-scroll-content scroll-anim-comments">
          {doubled.map((t, idx) => (
            <div key={idx} className="comment-thread-item">
              <div className="comment-q-v3">
                <FaInstagram className="w-2.5 h-2.5 text-pink-400 flex-shrink-0" />
                <span>{t.q}</span>
              </div>
              <div className="comment-a-v3">
                <Sparkles className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
                <span>{t.a}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureAnalyticsMockup() {
  const bars = [40, 65, 45, 80, 60, 90, 75];
  
  return (
    <div className="feature-analytics-mockup">
      <div className="analytics-chart">
        {bars.map((height, idx) => (
          <motion.div
            key={idx}
            className="analytics-bar"
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ 
              repeat: Infinity,
              repeatDelay: 3,
              duration: 0.6, 
              delay: idx * 0.1,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
      <div className="analytics-labels">
        <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
      </div>
    </div>
  );
}

function FeatureFiltersMockup() {
  const [activeFilter, setActiveFilter] = useState(0);
  const [cycle, setCycle] = useState(0);
  
  const filters = [
    { label: 'Todos', count: 24 },
    { label: 'Sin leer', count: 8 },
    { label: 'Prioritarios', count: 3 },
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFilter(f => (f + 1) % filters.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="feature-filters-mockup">
      <div className="filters-row">
        {filters.map((f, idx) => (
          <motion.div
            key={f.label}
            className={`filter-chip ${activeFilter === idx ? 'active' : ''}`}
            animate={{ scale: activeFilter === idx ? 1.05 : 1 }}
          >
            <span className="filter-label">{f.label}</span>
            <span className="filter-count">{f.count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FeatureTagsMockup() {
  const [visibleTags, setVisibleTags] = useState<number[]>([]);
  const [cycle, setCycle] = useState(0);
  
  const tags = [
    { label: 'VIP', color: 'gold' },
    { label: 'Lead', color: 'blue' },
    { label: 'Nuevo', color: 'green' },
    { label: 'Urgente', color: 'red' },
  ];
  
  useEffect(() => {
    setVisibleTags([]);
    const timers: NodeJS.Timeout[] = [];
    
    tags.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setVisibleTags(prev => [...prev, idx]);
      }, idx * 400));
    });
    
    timers.push(setTimeout(() => setCycle(c => c + 1), 4000));
    
    return () => timers.forEach(clearTimeout);
  }, [cycle]);
  
  return (
    <div className="feature-tags-mockup">
      <div className="tags-grid">
        {tags.map((tag, idx) => (
          <motion.div
            key={tag.label}
            className={`tag-item ${tag.color}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={visibleTags.includes(idx) ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {tag.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AnimatedCounter({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration, prefersReducedMotion]);

  return <span ref={ref}>{count}</span>;
}

function InboxMockup() {
  const mockupRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const allMessages = [
    { id: 1, user: 'María García', avatarImg: avatarMaria, message: '¿Tienen disponible el vestido azul en talla M?', platform: 'instagram', time: 'Ahora', unread: true },
    { id: 2, user: 'Carlos Rodríguez', avatarImg: avatarCarlos, message: 'Quiero reservar una mesa para el sábado', platform: 'tiktok', time: '2m', unread: true },
    { id: 3, user: 'Ana López', avatarImg: avatarAna, message: '¿Hacen envíos internacionales a Madrid?', platform: 'facebook', time: '5m', unread: true },
    { id: 4, user: 'Pedro Sánchez', avatarImg: avatarCarlos, initials: 'PS', message: '¿Cuánto tarda el envío a Barcelona?', platform: 'instagram', time: '8m', unread: true },
    { id: 5, user: 'Laura Martín', avatarImg: avatarAna, initials: 'LM', message: 'Me encantó el producto, gracias!', platform: 'tiktok', time: '12m', unread: false },
  ];

  const floatingBubbles = [
    { id: 1, user: 'María García', avatar: avatarMaria, platform: 'instagram', position: 'pos-top-left', message: '¿Tienen disponible el vestido azul en talla M?' },
    { id: 2, user: 'Carlos Rodríguez', avatar: avatarCarlos, platform: 'tiktok', position: 'pos-top-right', message: 'Quiero reservar una mesa para el sábado' },
    { id: 3, user: 'Ana López', avatar: avatarAna, platform: 'facebook', position: 'pos-bottom-left', message: '¿Hacen envíos internacionales a Madrid?' },
    { id: 4, user: 'Pedro Sánchez', avatar: avatarCarlos, platform: 'instagram', position: 'pos-bottom-right', message: '¿Cuánto tarda el envío a Barcelona?' },
  ];

  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [inboxCount, setInboxCount] = useState(12);
  const [selectedMsg, setSelectedMsg] = useState(1);
  
  const [chatPhase, setChatPhase] = useState(0);
  const [animationCycle, setAnimationCycle] = useState(0);
  
  const [bubbleTypingTexts, setBubbleTypingTexts] = useState<Record<number, string>>({});
  const [visibleBubbles, setVisibleBubbles] = useState<number[]>([]);

  const chatConversation = [
    { type: 'incoming', text: '¿Tienen disponible el vestido azul en talla M?', time: '14:32' },
    { type: 'outgoing', text: '¡Hola María! Sí, tenemos el vestido azul disponible en talla M. ¿Te gustaría que te lo reserve?', time: '14:33', isAI: true },
    { type: 'incoming', text: '¡Perfecto! Sí, por favor resérvenlo', time: '14:35' },
    { type: 'outgoing', text: '¡Listo! Reservado a tu nombre. Puedes recogerlo hoy hasta las 8pm o mañana. ¿Alguna preferencia?', time: '14:36', isAI: true },
    { type: 'incoming', text: 'Mañana por la tarde me viene mejor', time: '14:38' },
    { type: 'outgoing', text: '¡Perfecto María! Te esperamos mañana. Te enviaré un recordatorio. ¿Algo más en lo que pueda ayudarte?', time: '14:39', isAI: true },
  ];

  const bubbleSchedule = [
    { bubbleId: 1, showAt: 100, typingDuration: 1800, inboxArrival: 2000 },
    { bubbleId: 2, showAt: 2200, typingDuration: 1600, inboxArrival: 4000 },
    { bubbleId: 3, showAt: 4200, typingDuration: 1800, inboxArrival: 6200 },
    { bubbleId: 4, showAt: 8000, typingDuration: 1600, inboxArrival: 9800 },
  ];

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleMessages([1, 2, 3, 4, 5]);
      setChatPhase(6);
      setInboxCount(17);
      setVisibleBubbles([1, 2, 3, 4]);
      setBubbleTypingTexts({
        1: floatingBubbles[0].message,
        2: floatingBubbles[1].message,
        3: floatingBubbles[2].message,
        4: floatingBubbles[3].message,
      });
      return;
    }
    
    setVisibleMessages([]);
    setChatPhase(0);
    setInboxCount(12);
    setVisibleBubbles([]);
    setBubbleTypingTexts({});
    
    const timers: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];
    
    bubbleSchedule.forEach((schedule, idx) => {
      const bubble = floatingBubbles[idx];
      const charDelay = schedule.typingDuration / bubble.message.length;
      
      timers.push(setTimeout(() => {
        setVisibleBubbles(prev => [...prev, schedule.bubbleId]);
        
        let charIndex = 0;
        const interval = setInterval(() => {
          if (charIndex < bubble.message.length) {
            setBubbleTypingTexts(prev => ({
              ...prev,
              [bubble.id]: bubble.message.slice(0, charIndex + 1)
            }));
            charIndex++;
          } else {
            clearInterval(interval);
          }
        }, charDelay);
        intervals.push(interval);
      }, schedule.showAt));
      
      timers.push(setTimeout(() => {
        setVisibleMessages(prev => [...prev, schedule.bubbleId]);
        setInboxCount(prev => prev + 1);
      }, schedule.inboxArrival));
    });
    
    timers.push(setTimeout(() => { setVisibleMessages(prev => [...prev, 5]); setInboxCount(17); }, 12000));
    
    timers.push(setTimeout(() => setChatPhase(1), 2200));
    timers.push(setTimeout(() => setChatPhase(2), 4500));
    timers.push(setTimeout(() => setChatPhase(3), 6500));
    timers.push(setTimeout(() => setChatPhase(4), 9000));
    timers.push(setTimeout(() => setChatPhase(5), 11500));
    timers.push(setTimeout(() => setChatPhase(6), 14000));
    
    timers.push(setTimeout(() => {
      setAnimationCycle(c => c + 1);
    }, 18000));
    
    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [prefersReducedMotion, animationCycle]);

  useEffect(() => {
    if (chatContainerRef.current && chatPhase > 0) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatPhase]);

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
      case 'instagram': return <FaInstagram className="w-2.5 h-2.5 text-white" />;
      case 'tiktok': return <FaTiktok className="w-2.5 h-2.5 text-white" />;
      case 'facebook': return <FaFacebook className="w-2.5 h-2.5 text-white" />;
      default: return null;
    }
  };

  const showAiTyping = chatPhase === 1 || chatPhase === 3 || chatPhase === 5;

  return (
    <div ref={mockupRef} className="mockup-container-v2">
      <div className="mockup-window-v2">
        <div className="mockup-header-v2">
          <div className="mockup-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="mockup-nav">
            <span className="nav-item active">
              <Inbox className="w-4 h-4" />
              Inbox
              <motion.span 
                key={inboxCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="nav-badge"
              >
                {inboxCount}
              </motion.span>
            </span>
            <span className="nav-item">
              <Users className="w-4 h-4" />
              CRM
            </span>
            <span className="nav-item">
              <BarChart2 className="w-4 h-4" />
              Analytics
            </span>
          </div>
        </div>
        
        <div className="mockup-filters">
          <div className="filter-chip active">Todos</div>
          <div className="filter-chip"><FaInstagram className="w-3 h-3" /></div>
          <div className="filter-chip"><FaTiktok className="w-3 h-3" /></div>
          <div className="filter-chip"><FaFacebook className="w-3 h-3" /></div>
          <div className="filter-chip"><FaYoutube className="w-3 h-3" /></div>
        </div>
        
        <div className="mockup-content-v2">
          <div className="mockup-sidebar-v2">
            {allMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                animate={visibleMessages.includes(msg.id) ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -30, scale: 0.95 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
                className={`message-preview-v2 ${msg.unread ? 'unread' : ''} ${selectedMsg === msg.id ? 'selected' : ''}`}
                onClick={() => setSelectedMsg(msg.id)}
              >
                <div className="avatar-container">
                  {msg.initials ? (
                    <div className="avatar-initials">{msg.initials}</div>
                  ) : (
                    <img src={msg.avatarImg} alt={msg.user} className="avatar-img" />
                  )}
                  <span className={`platform-indicator ${msg.platform}`}>
                    <PlatformIcon platform={msg.platform} />
                  </span>
                </div>
                <div className="message-info-v2">
                  <div className="message-header">
                    <span className="username">{msg.user}</span>
                    <span className="time">{msg.time}</span>
                  </div>
                  <span className="preview">{msg.message.slice(0, 32)}...</span>
                </div>
                {msg.unread && <span className="unread-dot" />}
              </motion.div>
            ))}
          </div>
          
          <div className="mockup-main-v2">
            <div className="chat-header-v2">
              <div className="chat-user-info">
                <img src={avatarMaria} alt="María García" className="chat-avatar" />
                <div className="chat-user-details">
                  <span className="chat-username">María García</span>
                  <span className="chat-platform">
                    <FaInstagram className="w-3 h-3 text-pink-500" />
                    Instagram Direct
                  </span>
                </div>
              </div>
              <div className="chat-actions">
                <button className="action-btn">
                  <Users className="w-4 h-4" />
                </button>
                <button className="action-btn">
                  <Bell className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div ref={chatContainerRef} className="chat-messages-v2">
              {chatConversation.slice(0, Math.ceil(chatPhase / 1)).map((msg, idx) => {
                const shouldShow = idx < chatPhase;
                if (!shouldShow) return null;
                
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`chat-bubble-v2 ${msg.type}`}
                  >
                    {msg.type === 'incoming' && (
                      <img src={avatarMaria} alt="María" className="bubble-avatar" />
                    )}
                    <div className="bubble-content">
                      {msg.isAI && (
                        <div className="ai-badge-v2">
                          <Sparkles className="w-3 h-3" /> Borrador IA
                        </div>
                      )}
                      {msg.text}
                      <span className="bubble-time">{msg.time}</span>
                    </div>
                  </motion.div>
                );
              })}
              
              {showAiTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ai-typing-v2"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Repliyo AI está generando...</span>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="chat-actions-bar">
              <button className="chat-action-btn primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar borrador</span>
              </button>
              <button className="chat-action-btn">
                <Send className="w-3.5 h-3.5" />
                <span>Responder</span>
              </button>
              <button className="chat-action-btn">
                <Bell className="w-3.5 h-3.5" />
                <span>Recordatorio</span>
              </button>
            </div>
            
            <div className="auto-reply-indicator">
              <div className="auto-reply-badge">
                <Sparkles className="w-4 h-4" />
                <span>Respuesta automática activa</span>
              </div>
              <span className="auto-reply-status">IA respondiendo en tiempo real</span>
            </div>
          </div>
          
          <div className="mockup-crm-panel">
            <div className="crm-header">
              <Users className="w-4 h-4" />
              <span>Cliente</span>
            </div>
            <div className="crm-content">
              <img src={avatarMaria} alt="María" className="crm-avatar" />
              <div className="crm-name">María García</div>
              <div className="crm-email">maria.garcia@email.com</div>
              <div className="crm-stats-grid">
                <div className="crm-stat-item">
                  <span className="stat-number">8</span>
                  <span className="stat-text">Chats</span>
                </div>
                <div className="crm-stat-item">
                  <span className="stat-number">$1.2k</span>
                  <span className="stat-text">Valor</span>
                </div>
              </div>
              <div className="crm-tags">
                <span className="crm-tag vip">VIP</span>
                <span className="crm-tag">Recurrente</span>
              </div>
              <div className="crm-notes">
                <span className="notes-label">Notas</span>
                <p className="notes-text">Cliente frecuente, prefiere talla M...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mockup-glow-v2" />
      
      <div className="floating-bubbles-container">
        {floatingBubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={`floating-bubble ${bubble.platform} ${bubble.position} ${visibleBubbles.includes(bubble.id) ? 'visible' : ''}`}
          >
            <div className="bubble-platform-header">
              <div className={`bubble-platform-icon ${bubble.platform}`}>
                {bubble.platform === 'instagram' && <FaInstagram className="w-3.5 h-3.5 text-white" />}
                {bubble.platform === 'tiktok' && <FaTiktok className="w-3.5 h-3.5 text-white" />}
                {bubble.platform === 'facebook' && <FaFacebook className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="bubble-platform-name">
                {bubble.platform === 'instagram' ? 'Instagram' : bubble.platform === 'tiktok' ? 'TikTok' : 'Messenger'}
              </span>
            </div>
            <div className="bubble-user-row">
              <img src={bubble.avatar} alt={bubble.user} className="bubble-avatar" />
              <span className="bubble-user-name">{bubble.user}</span>
            </div>
            <div className="bubble-input-area">
              <span className="bubble-typing-text">
                {bubbleTypingTexts[bubble.id] || ''}
              </span>
              {visibleBubbles.includes(bubble.id) && (bubbleTypingTexts[bubble.id]?.length || 0) < bubble.message.length && (
                <span className="bubble-typing-cursor" />
              )}
              <Send className="w-4 h-4 bubble-send-icon" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ theme, toggleTheme }: { theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header 
      initial={prefersReducedMotion ? false : { y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'header-scrolled backdrop-blur-xl' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" className="font-display font-bold text-2xl text-gradient" data-testid="link-logo">Repliyo</a>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-white/60 hover:text-white transition-colors text-sm font-medium" data-testid="link-nav-producto">Producto</a>
          <a href="#how" className="text-white/60 hover:text-white transition-colors text-sm font-medium" data-testid="link-nav-como-funciona">Cómo funciona</a>
          <a href="#testimonial" className="text-white/60 hover:text-white transition-colors text-sm font-medium" data-testid="link-nav-testimonios">Testimonios</a>
        </nav>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            data-testid="button-theme-toggle"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <a href="/login" className="text-white/60 hover:text-white transition-colors text-sm font-medium hidden sm:block" data-testid="link-login">
            Iniciar sesión
          </a>
          <a href="/login" className="btn-primary text-sm py-2.5 px-5" data-testid="button-probar-gratis-header">
            Probar gratis
          </a>
        </div>
      </div>
    </motion.header>
  );
}

function HeroSection() {
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  
  const textY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 100]);
  const mockupY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -20]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [1, 0.98]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <section ref={containerRef} className="hero-section relative min-h-[140vh] md:min-h-[150vh] overflow-visible">
      <div className="sticky top-0 min-h-screen flex flex-col items-center justify-start pt-28 overflow-visible">
        <div className="absolute inset-0 bg-radial-gradient" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        
        <Parallax speed={-10} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-3xl" />
        </Parallax>
        
        <motion.div style={{ y: textY, opacity }} className="relative z-10 max-w-5xl mx-auto px-6 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-5"
          >
            <Sparkles className="w-4 h-4 text-[var(--landing-accent)]" />
            <span className="text-sm text-white/70">Respuestas IA personalizadas</span>
          </motion.div>

          <motion.h1 
            className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight mb-5"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="block text-white">Responde más rápido.</span>
            <span className="block text-gradient">Vende más.</span>
            <span className="block text-white/40">Con IA.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-6 leading-relaxed"
          >
            Unifica todos tus DMs y comentarios de Instagram, TikTok y Facebook en un inbox inteligente que responde automáticamente.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="/login" className="btn-primary" data-testid="button-empezar-gratis-hero">
              Empezar gratis <ArrowRight className="w-4 h-4" />
            </a>
            <button className="btn-secondary" data-testid="button-ver-demo">
              <Play className="w-4 h-4" /> Ver demo
            </button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          style={{ y: mockupY, scale: mockupScale }}
          className="relative z-20 w-full max-w-7xl mx-auto px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <InboxMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function MarqueeSection() {
  const prefersReducedMotion = useReducedMotion();
  const items = ['DMs', 'Comentarios', 'Respuestas IA', 'Recordatorios', 'CRM', 'Analytics', 'Multi-plataforma'];
  
  return (
    <section className="marquee-section relative z-30">
      <div className="marquee-overlap-shadow" />
      <div className="marquee-inner py-8 border-y border-white/5 section-dark relative">
        <div className={prefersReducedMotion ? "flex flex-wrap justify-center gap-4" : "marquee-container"}>
          <div className={prefersReducedMotion ? "flex flex-wrap justify-center gap-4" : "marquee-content"}>
            {(prefersReducedMotion ? items : [...items, ...items]).map((item, i) => (
              <span key={i} className="inline-flex items-center gap-4 px-8">
                <span className="font-display text-2xl md:text-3xl font-medium text-white/20 hover:text-white/60 transition-colors cursor-default">
                  {item}
                </span>
                <span className="w-2 h-2 rounded-full bg-[var(--landing-primary)]" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useGSAP(() => {
    if (prefersReducedMotion) return;
    
    const ctx = gsap.context(() => {
      const problems = gsap.utils.toArray('.problem-item');
      const solutions = gsap.utils.toArray('.solution-item');
      
      problems.forEach((item) => {
        gsap.fromTo(item as Element, 
          { opacity: 0, x: -80, rotateY: -15 },
          {
            opacity: 1, x: 0, rotateY: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item as Element,
              start: 'top 85%',
              end: 'top 50%',
              scrub: 1
            }
          }
        );
      });
      
      solutions.forEach((item) => {
        gsap.fromTo(item as Element, 
          { opacity: 0, x: 80, rotateY: 15 },
          {
            opacity: 1, x: 0, rotateY: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item as Element,
              start: 'top 85%',
              end: 'top 50%',
              scrub: 1
            }
          }
        );
      });
    }, sectionRef);
    
    return () => ctx.revert();
  }, { scope: sectionRef });

  const problems = [
    { icon: Clock, text: 'Saltar entre Instagram, TikTok y Facebook todo el día' },
    { icon: X, text: 'Olvidar responder mensajes de clientes potenciales' },
    { icon: MessageSquare, text: 'Copiar y pegar las mismas respuestas una y otra vez' },
    { icon: Zap, text: 'Perder ventas porque los leads se enfrían sin seguimiento' }
  ];

  const solutions = [
    { icon: Inbox, text: 'Todos tus mensajes en una sola pantalla' },
    { icon: Sparkles, text: 'La IA genera respuestas personalizadas en segundos' },
    { icon: Bell, text: 'Recordatorios automáticos para leads sin respuesta' },
    { icon: Users, text: 'CRM integrado para conocer a cada cliente' }
  ];

  return (
    <section ref={sectionRef} className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-20 md:gap-32">
          <div className="space-y-8">
            <div className="sticky top-32">
              <span className="text-xs uppercase tracking-[0.3em] text-red-500 font-semibold mb-4 block">
                El problema
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-12 leading-tight">
                Responder mensajes en 5 apps es <span className="text-red-500">agotador</span>
              </h2>
              
              <div className="space-y-8">
                {problems.map((problem, i) => {
                  const Icon = problem.icon;
                  return (
                    <div key={i} className="problem-item flex items-start gap-5 p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                      <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-7 h-7 text-red-400" />
                      </div>
                      <p className="font-display text-xl md:text-2xl font-semibold text-white leading-snug">{problem.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="sticky top-32">
              <span className="text-xs uppercase tracking-[0.3em] text-green-500 font-semibold mb-4 block">
                La solución
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-12 leading-tight">
                Un inbox inteligente que <span className="text-gradient">trabaja por ti</span>
              </h2>
              
              <div className="space-y-8">
                {solutions.map((solution, i) => {
                  const Icon = solution.icon;
                  return (
                    <div key={i} className="solution-item flex items-start gap-5 p-6 rounded-2xl bg-green-500/5 border border-green-500/10">
                      <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-7 h-7 text-green-400" />
                      </div>
                      <p className="font-display text-xl md:text-2xl font-semibold text-white leading-snug">{solution.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  
  const scale = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], prefersReducedMotion ? [1, 1] : [0, 1]);

  return (
    <section ref={ref} className="py-48 md:py-56 relative overflow-visible">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)]" />
      
      <Parallax speed={-5} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full border border-purple-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] md:w-[600px] md:h-[600px] rounded-full border border-purple-500/5" />
      </Parallax>
      
      <motion.div 
        style={{ scale, opacity }}
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
      >
        <div className="font-display font-black text-[25vw] md:text-[18vw] leading-none text-gradient mb-4">
          <AnimatedCounter target={80} />%
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
          menos tiempo respondiendo
        </h2>
        <p className="text-white/50 text-xl max-w-xl mx-auto">
          Nuestros usuarios reducen drásticamente el tiempo dedicado a gestionar mensajes de redes sociales.
        </p>
      </motion.div>
    </section>
  );
}

function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  useGSAP(() => {
    if (prefersReducedMotion || !containerRef.current || !sectionRef.current) return;
    
    const ctx = gsap.context(() => {
      const stepPanels = gsap.utils.toArray('.how-step-panel') as HTMLElement[];
      const totalSteps = stepPanels.length;
      const scrollPerStep = window.innerHeight * 1.8;
      const holdAtEnd = window.innerHeight * 1.2;
      const totalScrollDistance = totalSteps * scrollPerStep + holdAtEnd;
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => `+=${totalScrollDistance}`,
          pin: containerRef.current,
          anticipatePin: 1,
          scrub: 0.8,
          onUpdate: (self) => {
            const progress = self.progress;
            const adjustedProgress = progress * (totalSteps * scrollPerStep) / (totalSteps * scrollPerStep + holdAtEnd);
            const stepIndex = Math.min(Math.floor(adjustedProgress * totalSteps / (totalSteps - 0.5)), totalSteps - 1);
            setActiveStep(stepIndex);
          }
        }
      });

      stepPanels.forEach((step, index) => {
        gsap.set(step, { 
          autoAlpha: index === 0 ? 1 : 0, 
          x: index === 0 ? 0 : 100,
          scale: index === 0 ? 1 : 0.92,
          zIndex: index === 0 ? 10 : 1
        });
      });

      const enterDuration = 0.5;
      const holdDuration = 0.8;
      const exitDuration = 0.4;
      let currentTime = 0;

      stepPanels.forEach((step, index) => {
        if (index === 0) {
          tl.to({}, { duration: holdDuration }, currentTime);
          currentTime += holdDuration;
          
          tl.to(step, {
            autoAlpha: 0,
            x: -100,
            scale: 0.88,
            zIndex: 1,
            duration: exitDuration,
            ease: 'power1.inOut'
          }, currentTime);
          currentTime += exitDuration;
        } else {
          tl.fromTo(step, 
            { autoAlpha: 0, x: 100, scale: 0.92, zIndex: 1 },
            { 
              autoAlpha: 1, 
              x: 0, 
              scale: 1, 
              zIndex: 10,
              duration: enterDuration,
              ease: 'power2.out'
            }, 
            currentTime
          );
          currentTime += enterDuration;
          
          tl.to({}, { duration: holdDuration }, currentTime);
          currentTime += holdDuration;
          
          if (index < totalSteps - 1) {
            tl.to(step, {
              autoAlpha: 0,
              x: -100,
              scale: 0.88,
              zIndex: 1,
              duration: exitDuration,
              ease: 'power1.inOut'
            }, currentTime);
            currentTime += exitDuration;
          } else {
            tl.to({}, { duration: holdDuration }, currentTime);
            currentTime += holdDuration;
          }
        }
      });
    }, sectionRef);
    
    return () => ctx.revert();
  }, { scope: sectionRef });

  const steps = [
    {
      number: '01',
      title: 'Conecta tus redes',
      description: 'Vincula Instagram, TikTok, Facebook, YouTube, LinkedIn y Google My Business en minutos. Todos tus DMs y comentarios aparecerán en un solo lugar.',
      mockup: <Step1ConnectMockup />
    },
    {
      number: '02',
      title: 'La IA aprende tu estilo',
      description: 'Entrena al asistente con ejemplos de tus mejores respuestas. Genera borradores que suenan exactamente como tú, manteniendo tu tono único y personalizado para cada cliente.',
      mockup: <Step2AIMockup />
    },
    {
      number: '03',
      title: 'Responde y haz seguimiento',
      description: 'Revisa, edita si quieres, y envía. Los recordatorios automáticos aseguran que ningún lead se enfríe. Programa follow-ups y nunca pierdas una oportunidad de venta.',
      mockup: <Step3SendMockup />
    }
  ];

  if (prefersReducedMotion) {
    return (
      <section id="how" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--landing-primary)] font-semibold mb-4 block">
              Cómo funciona
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white">
              De caos a control en <span className="text-gradient">3 pasos</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="how-card">
                <div className="card-inner">
                  <span className="step-number">{step.number}</span>
                  <h3 className="font-display text-2xl font-bold text-white mt-4 mb-3">{step.title}</h3>
                  <p className="text-white/50 text-base leading-relaxed mb-6">{step.description}</p>
                  <div className="step-mockup-container">{step.mockup}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={sectionRef} className="how-pinned-section relative">
      <div ref={containerRef} className="how-pinned-container">
        <div className="how-header">
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--landing-primary)] font-semibold mb-4 block">
            Cómo funciona
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-8">
            De caos a control en <span className="text-gradient">3 pasos</span>
          </h2>
          
          <div className="how-progress-dots">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`how-progress-dot ${activeStep >= i ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="how-steps-wrapper">
          {steps.map((step, i) => (
            <div 
              key={step.number} 
              className={`how-step-panel ${activeStep === i ? 'active' : ''}`}
            >
              <div className="how-step-content">
                <div className="how-step-info">
                  <span className="how-step-number">{step.number}</span>
                  <h3 className="font-display text-3xl md:text-4xl font-bold text-white mt-4 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-white/60 text-lg md:text-xl leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>
                <div className="how-step-mockup">
                  {step.mockup}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useGSAP(() => {
    if (prefersReducedMotion) return;
    
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.feature-card');
      
      cards.forEach((card) => {
        gsap.fromTo(card as Element,
          { opacity: 0, y: 60, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card as Element,
              start: 'top 90%',
              end: 'top 60%',
              scrub: 1
            }
          }
        );
      });
    }, sectionRef);
    
    return () => ctx.revert();
  }, { scope: sectionRef });

  const features = [
    { 
      icon: Inbox, 
      title: 'Inbox unificado', 
      description: 'Todas tus conversaciones de Instagram, TikTok y Facebook en un solo lugar ordenadas por prioridad.',
      size: 'large',
      mockup: <FeatureInboxMockup />
    },
    { 
      icon: Sparkles, 
      title: 'Respuestas IA', 
      description: 'Borradores que capturan tu tono de voz único.',
      size: 'small',
      mockup: <FeatureAIMockup />
    },
    { 
      icon: Users, 
      title: 'CRM integrado', 
      description: 'Perfil completo de cada contacto con historial.',
      size: 'small',
      mockup: <FeatureCRMMockup />
    },
    { 
      icon: Bell, 
      title: 'Recordatorios', 
      description: 'Seguimiento automático para leads inactivos. Nunca pierdas una oportunidad.',
      size: 'medium',
      mockup: <FeatureReminderMockup />
    },
    { 
      icon: MessageSquare, 
      title: 'Comentarios', 
      description: 'Gestiona comentarios de posts directamente desde el inbox.',
      size: 'medium',
      mockup: <FeatureCommentsMockup />
    },
    { 
      icon: BarChart2, 
      title: 'Analytics', 
      description: 'Métricas de rendimiento y tiempo de respuesta en tiempo real.',
      size: 'medium',
      mockup: <FeatureAnalyticsMockup />
    },
  ];

  return (
    <section id="features" ref={sectionRef} className="py-32 section-dark relative overflow-hidden">
      <Parallax speed={-3} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-3xl" />
      </Parallax>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--landing-primary)] font-semibold mb-4 block">
            Características
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6">
            Todo lo que necesitas para <span className="text-gradient">escalar</span>
          </h2>
          <p className="text-white/50 text-xl max-w-2xl mx-auto">
            Herramientas diseñadas para equipos que manejan cientos de conversaciones al día.
          </p>
        </motion.div>

        <div className="bento-grid">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`feature-card bento-${feature.size}`}
              >
                <div className="feature-card-inner">
                  <div className="feature-icon-wrapper">
                    <Icon className="w-7 h-7 text-[var(--landing-primary)]" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mt-4 mb-2">{feature.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                  {feature.mockup && (
                    <div className="feature-mockup-area">
                      {feature.mockup}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const quoteY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -100]);
  const quoteRotate = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-5, 5]);

  return (
    <section id="testimonial" ref={ref} className="py-40 relative overflow-hidden">
      <motion.div 
        style={{ y: quoteY, rotate: quoteRotate }} 
        className="absolute top-10 left-10 text-[25rem] font-display font-black text-white/[0.02] select-none leading-none"
      >
        "
      </motion.div>
      <motion.div 
        style={{ y: useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-100, 100]) }} 
        className="absolute bottom-10 right-10 text-[25rem] font-display font-black text-white/[0.02] select-none leading-none rotate-180"
      >
        "
      </motion.div>
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.blockquote
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-3xl md:text-5xl font-medium text-white leading-relaxed mb-12"
        >
          "Pasamos de responder en 4 horas a responder en 15 minutos. 
          <span className="text-gradient"> Repliyo cambió completamente</span> cómo gestionamos nuestro Instagram de 50k seguidores."
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="inline-flex items-center gap-4 p-4 pr-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center text-white font-bold text-xl">
            MG
          </div>
          <div className="text-left">
            <div className="font-semibold text-white text-lg">María González</div>
            <div className="text-sm text-white/50">Head of Social Media, FashionBrand</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -50]);

  return (
    <section ref={ref} className="relative border-t border-white/5 overflow-hidden">
      <motion.div 
        style={{ y: bgY }}
        className="absolute inset-0 bg-gradient-to-br from-[var(--landing-primary)]/10 via-transparent to-[var(--landing-accent)]/5"
      />
      
      <div className="grid lg:grid-cols-12 relative z-10">
        <div className="lg:col-span-7 p-12 md:p-20 lg:p-24">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-6">
              ¿LISTO PARA<br />
              <span className="text-outline hover:text-white transition-colors duration-500 cursor-default">ESCALAR?</span>
            </h2>
            <p className="text-white/50 text-xl md:text-2xl max-w-lg">
              Automatiza respuestas. Deleita clientes. Sin tarjeta de crédito.
            </p>
          </motion.div>
        </div>

        <div className="lg:col-span-5 p-12 md:p-20 lg:p-24 flex items-center justify-center border-t lg:border-t-0 lg:border-l border-white/5">
          <motion.a
            href="/login"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="btn-cta-circle"
            data-testid="button-empezar-cta"
          >
            <span className="font-display text-xl">Empezar</span>
            <ArrowRight className="w-6 h-6" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const links = {
    Producto: ['Características', 'Integraciones', 'Changelog', 'Roadmap'],
    Recursos: ['Blog', 'Guías', 'API Docs', 'Ayuda'],
    Empresa: ['Nosotros', 'Careers', 'Contacto', 'Legal'],
    Legal: ['Privacidad', 'Términos', 'Cookies', 'GDPR']
  };

  return (
    <footer className="section-dark border-t border-white/5">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {Object.entries(links).map(([category, items]) => (
          <div key={category} className="p-8 md:p-12 border-r border-b border-white/5 last:border-r-0">
            <h4 className="font-mono text-xs text-[var(--landing-primary)] uppercase tracking-[0.2em] mb-6">
              {category}
            </h4>
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/50 hover:text-white hover:translate-x-2 transition-all duration-300 text-sm inline-block" data-testid={`link-footer-${item.toLowerCase().replace(/\s+/g, '-')}`}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative w-full overflow-hidden border-t border-white/5 py-16">
        <motion.h1 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display font-black text-[18vw] leading-[0.75] text-center select-none tracking-tight text-outline"
        >
          REPLIYO
        </motion.h1>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-white/40 font-mono mt-8">
          <span>© 2026 Repliyo Inc.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors" data-testid="link-footer-privacy">Privacy</a>
            <a href="#" className="hover:text-white transition-colors" data-testid="link-footer-terms">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('landing-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('landing-theme', newTheme);
  };

  return (
    <ParallaxProvider>
      <div className={`landing-page ${theme === 'light' ? 'theme-light' : ''}`} data-testid="landing-page">
        <Header theme={theme} toggleTheme={toggleTheme} />
        <main>
          <HeroSection />
          <MarqueeSection />
          <ProblemSolutionSection />
          <MetricSection />
          <HowItWorksSection />
          <FeaturesSection />
          <TestimonialSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </ParallaxProvider>
  );
}
