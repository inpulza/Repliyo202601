import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion, useInView, useScroll, useTransform, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowRight, Play, Check, X, Sparkles, Inbox, Users, Users2, Bell, MessageSquare, BarChart2, Send, Zap, Clock, Heart, Instagram, Facebook, Music, AlertCircle } from 'lucide-react';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { GoogleBusinessIcon } from '../GoogleBusinessIcon';
import avatarMaria from '@assets/generated_images/maria_customer_avatar_headshot.png';
import avatarCarlos from '@assets/generated_images/carlos_customer_avatar_headshot.png';
import avatarAna from '@assets/generated_images/ana_customer_avatar_headshot.png';
import agentAna from '@assets/generated_images/ana_agent_headshot_portrait.png';
import agentLuis from '@assets/generated_images/luis_agent_headshot_portrait.png';
import agentSara from '@assets/generated_images/sara_agent_headshot_portrait.png';
import agentCarlos from '@assets/generated_images/carlos_agent_headshot_portrait.png';
import agentMaria from '@assets/generated_images/maria_agent_headshot_portrait.png';
import icon3dClock from '@assets/generated_images/modern_flat_clock_icon.png';
import icon3dX from '@assets/generated_images/modern_flat_x_mark_icon.png';
import icon3dMessage from '@assets/generated_images/modern_flat_chat_bubble_icon.png';
import icon3dLightning from '@assets/generated_images/modern_flat_lightning_bolt_icon.png';
import icon3dInbox from '@assets/generated_images/modern_flat_inbox_icon.png';
import icon3dSparkles from '@assets/generated_images/modern_flat_sparkles_icon.png';
import icon3dBell from '@assets/generated_images/modern_flat_bell_icon.png';
import icon3dUsers from '@assets/generated_images/modern_flat_users_group_icon.png';
import featureIconInbox from '@assets/generated_images/modern_flat_unified_inbox_icon.png';
import featureIconMultiAgent from '@assets/generated_images/modern_flat_multi-agent_team_icon.png';
import featureIconAI from '@assets/generated_images/modern_flat_ai_sparkles_icon.png';
import featureIconCRM from '@assets/generated_images/modern_flat_crm_contact_icon.png';
import featureIconReminder from '@assets/generated_images/modern_flat_reminder_bell_icon.png';
import featureIconComments from '@assets/generated_images/modern_flat_comments_icon.png';
import featureIconAnalytics from '@assets/generated_images/modern_flat_analytics_chart_icon.png';
import timelineSendIcon from '@assets/generated_images/square_purple_send_icon.png';
import timelineCheckIcon from '@assets/generated_images/square_green_check_icon.png';
import timelineBellIcon from '@assets/generated_images/square_orange_bell_icon.png';
import timelineChatIcon from '@assets/generated_images/square_blue_chat_icon.png';
import stepsBgPurple from '@assets/generated_images/purple_gradient_grain_background.png';
import stepsBgBlue from '@assets/generated_images/blue_gradient_grain_background.png';
import stepsBgGreen from '@assets/generated_images/green_gradient_grain_background.png';
import stepsBgVibrant from '@assets/generated_images/vibrant_blue_violet_gradient.png';
import stepsBgLight from '@assets/generated_images/teal_cyan_bottom_to_top_gradient.png';
import testimonialBettys from '../../assets/testimonial-bettys.jpg';
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
          <Sparkles className="w-5 h-5 text-blue-400" />
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
          <div className="timeline-icon send-icon overflow-hidden p-0">
            <img src={timelineSendIcon} alt="" className="w-full h-full object-cover" />
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
          <div className="timeline-icon check-icon overflow-hidden p-0">
            <img src={timelineCheckIcon} alt="" className="w-full h-full object-cover" />
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
          <div className="timeline-icon bell-icon overflow-hidden p-0">
            <img src={timelineBellIcon} alt="" className="w-full h-full object-cover" />
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
          <div className="timeline-icon follow-icon overflow-hidden p-0">
            <img src={timelineChatIcon} alt="" className="w-full h-full object-cover" />
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
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [cycle, setCycle] = useState(0);
  
  const messages = [
    { platform: 'instagram', name: 'María G.', avatar: avatarMaria, preview: '¿Tienen talla M?', Icon: FaInstagram, time: 'Ahora' },
    { platform: 'tiktok', name: 'Carlos R.', avatar: avatarCarlos, preview: 'Vi tu video!', Icon: FaTiktok, time: '2m' },
    { platform: 'facebook', name: 'Ana L.', avatar: avatarAna, preview: 'Quiero reservar', Icon: FaFacebook, time: '5m' },
    { platform: 'instagram', name: 'Pedro S.', avatar: avatarCarlos, preview: '¿Hacen envíos?', Icon: FaInstagram, time: '8m' },
    { platform: 'tiktok', name: 'Laura M.', avatar: avatarMaria, preview: '¡Me encanta!', Icon: FaTiktok, time: '12m' },
    { platform: 'facebook', name: 'Diego R.', avatar: avatarAna, preview: '¿Precio?', Icon: FaFacebook, time: '15m' },
  ];
  
  useEffect(() => {
    setVisibleItems([]);
    const timers: NodeJS.Timeout[] = [];
    
    messages.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setVisibleItems(prev => [...prev, idx]);
      }, idx * 400));
    });
    
    timers.push(setTimeout(() => {
      setCycle(c => c + 1);
    }, 5000));
    
    return () => timers.forEach(clearTimeout);
  }, [cycle]);
  
  return (
    <div className="feature-inbox-mockup">
      <div className="inbox-header-mini">
        <span className="inbox-count">{messages.length} nuevos</span>
        <div className="inbox-platforms-mini">
          <FaInstagram className="w-3 h-3 text-pink-400" />
          <FaTiktok className="w-3 h-3 tiktok-icon-adaptive" />
          <FaFacebook className="w-3 h-3 text-blue-500" />
        </div>
      </div>
      <div className="inbox-list-v2">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            className={`inbox-item-v2 ${idx === 0 && visibleItems.includes(0) ? 'selected' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: visibleItems.includes(idx) ? 1 : 0,
              x: visibleItems.includes(idx) ? 0 : 20
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="inbox-avatar-wrap">
              <img src={msg.avatar} alt={msg.name} className="inbox-avatar-img" />
              <div className={`inbox-platform-badge ${msg.platform}`}>
                <msg.Icon className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div className="inbox-item-info">
              <div className="inbox-item-row">
                <span className="inbox-item-name-v2">{msg.name}</span>
                <span className="inbox-item-time">{msg.time}</span>
              </div>
              <span className="inbox-item-preview-v2">{msg.preview}</span>
            </div>
            {idx < 3 && <div className="inbox-unread-dot" />}
          </motion.div>
        ))}
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
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="ai-generated-text">
          {text}
          <span className="typing-cursor" />
        </span>
      </div>
    </div>
  );
}

function FeatureCRMMockup() {
  const [showDetails, setShowDetails] = useState(false);
  const [cycle, setCycle] = useState(0);
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    setShowDetails(false);
    
    timers.push(setTimeout(() => setShowDetails(true), 800));
    timers.push(setTimeout(() => setCycle(c => c + 1), 4000));
    
    return () => timers.forEach(clearTimeout);
  }, [cycle]);
  
  return (
    <div className="feature-crm-mockup">
      <motion.div 
        className="crm-mini-card-v2"
        animate={{ scale: showDetails ? 1 : 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <div className="crm-mini-header">
          <div className="crm-mini-avatar-v2">
            <img src={avatarMaria} alt="Cliente" />
          </div>
          <div className="crm-mini-info-v2">
            <span className="crm-mini-name-v2">María García</span>
            <div className="crm-mini-channels">
              <FaInstagram className="w-3 h-3 text-pink-400" />
              <FaFacebook className="w-3 h-3 text-blue-500" />
            </div>
          </div>
        </div>
        <motion.div 
          className="crm-mini-details"
          initial={{ opacity: 0 }}
          animate={{ opacity: showDetails ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="crm-mini-stat">
            <span className="crm-stat-label">Compras</span>
            <span className="crm-stat-value">$1.2k</span>
          </div>
          <div className="crm-mini-stat">
            <span className="crm-stat-label">Mensajes</span>
            <span className="crm-stat-value">24</span>
          </div>
          <div className="crm-mini-tags-v2">
            <span className="crm-tag vip">VIP</span>
            <span className="crm-tag loyal">Leal</span>
          </div>
        </motion.div>
      </motion.div>
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
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  
  const comments = [
    { question: '¿Precio?', answer: '$299 + envío gratis' },
    { question: '¿Colores?', answer: 'Negro, blanco y azul' },
    { question: '¿Tallas?', answer: 'S, M, L y XL' },
  ];
  
  useEffect(() => {
    setPhase(0);
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setPhase(1), 400));
    timers.push(setTimeout(() => setPhase(2), 1200));
    timers.push(setTimeout(() => setPhase(3), 2000));
    timers.push(setTimeout(() => setPhase(4), 2800));
    timers.push(setTimeout(() => setPhase(5), 3600));
    timers.push(setTimeout(() => setPhase(6), 4400));
    timers.push(setTimeout(() => setCycle(c => c + 1), 6000));
    
    return () => timers.forEach(clearTimeout);
  }, [cycle]);
  
  return (
    <div className="feature-comments-mockup-v2">
      <div className="comments-thread-v2">
        {comments.map((c, idx) => (
          <div key={idx} className="comment-pair">
            <motion.div 
              className="comment-q"
              initial={{ opacity: 0, x: -15 }}
              animate={{ 
                opacity: phase >= idx * 2 + 1 ? 1 : 0, 
                x: phase >= idx * 2 + 1 ? 0 : -15 
              }}
              transition={{ duration: 0.3 }}
            >
              <FaInstagram className="w-2.5 h-2.5 text-pink-400" />
              <span>{c.question}</span>
            </motion.div>
            <motion.div 
              className="comment-a"
              initial={{ opacity: 0, x: 15 }}
              animate={{ 
                opacity: phase >= idx * 2 + 2 ? 1 : 0, 
                x: phase >= idx * 2 + 2 ? 0 : 15 
              }}
              transition={{ duration: 0.3 }}
            >
              <Sparkles className="w-2.5 h-2.5 text-blue-400" />
              <span>{c.answer}</span>
            </motion.div>
          </div>
        ))}
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

function FeatureMultiAgentMockup() {
  const [activeAgent, setActiveAgent] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [visibleAssignments, setVisibleAssignments] = useState<number[]>([]);
  
  const agents = [
    { name: 'Ana', color: 'bg-pink-500', initials: 'AN', avatar: agentAna, conversations: 12, responseTime: '2m' },
    { name: 'Luis', color: 'bg-blue-500', initials: 'LU', avatar: agentLuis, conversations: 8, responseTime: '3m' },
    { name: 'Sara', color: 'bg-green-500', initials: 'SA', avatar: agentSara, conversations: 15, responseTime: '1m' },
    { name: 'Carlos', color: 'bg-orange-500', initials: 'CA', avatar: agentCarlos, conversations: 6, responseTime: '4m' },
    { name: 'María', color: 'bg-blue-500', initials: 'MA', avatar: agentMaria, conversations: 10, responseTime: '2m' },
  ];

  const recentAssignments = [
    { customer: 'Pedro M.', platform: 'instagram', agent: 'Ana', time: 'Ahora' },
    { customer: 'Laura G.', platform: 'tiktok', agent: 'Luis', time: '1m' },
  ];
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    setVisibleAssignments([]);
    
    agents.forEach((_, idx) => {
      timers.push(setTimeout(() => setActiveAgent(idx), 300 + idx * 1000));
    });

    recentAssignments.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setVisibleAssignments(prev => [...prev, idx]);
      }, 500 + idx * 600));
    });

    timers.push(setTimeout(() => setCycle(c => c + 1), 300 + agents.length * 1000 + 500));
    
    return () => timers.forEach(clearTimeout);
  }, [cycle]);
  
  return (
    <div className="feature-multiagent-mockup">
      <div className="multiagent-header">
        <span className="multiagent-title">Equipo activo</span>
        <span className="multiagent-count">{agents.length} online</span>
      </div>
      <div className="multiagent-avatars">
        {agents.map((agent, idx) => (
          <motion.div
            key={idx}
            className={`multiagent-avatar ${activeAgent === idx ? 'active' : 'inactive'}`}
            animate={{ 
              scale: activeAgent === idx ? 1.2 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            <img src={agent.avatar} alt={agent.name} className="agent-avatar-img" />
            {activeAgent === idx && (
              <motion.div 
                className="agent-typing-indicator"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </motion.div>
        ))}
      </div>
      <motion.div 
        className="multiagent-status"
        key={activeAgent}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="status-dot" />
        <span className="status-text">{agents[activeAgent].name} respondiendo...</span>
      </motion.div>

      <div className="multiagent-assignments">
        <div className="assignments-header">
          <span className="assignments-title">Asignaciones recientes</span>
        </div>
        {recentAssignments.map((assignment, idx) => (
          <motion.div
            key={idx}
            className="assignment-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: visibleAssignments.includes(idx) ? 1 : 0,
              x: visibleAssignments.includes(idx) ? 0 : -10
            }}
            transition={{ duration: 0.3 }}
          >
            <div className={`assignment-platform ${assignment.platform}`}>
              {assignment.platform === 'instagram' && <FaInstagram className="w-2.5 h-2.5 text-white" />}
              {assignment.platform === 'tiktok' && <FaTiktok className="w-2.5 h-2.5 text-white" />}
              {assignment.platform === 'facebook' && <FaFacebook className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="assignment-customer">{assignment.customer}</span>
            <span className="assignment-arrow">→</span>
            <span className="assignment-agent">{assignment.agent}</span>
            <span className="assignment-time">{assignment.time}</span>
          </motion.div>
        ))}
      </div>

      <div className="multiagent-stats">
        {agents.slice(0, 3).map((agent, idx) => (
          <motion.div 
            key={idx} 
            className="agent-stat"
            animate={{ 
              opacity: activeAgent === idx ? 1 : 0.6,
              scale: activeAgent === idx ? 1.05 : 1
            }}
          >
            <span className={`agent-stat-dot ${agent.color}`} />
            <span className="agent-stat-name">{agent.name}</span>
            <span className="agent-stat-count">{agent.conversations}</span>
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
                  <Sparkles className="w-4 h-4 text-blue-500" />
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

function Header() {
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
        <a href="/" className="font-display font-bold text-2xl text-white" data-testid="link-logo">Repliyo</a>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="nav-link" data-testid="link-nav-producto">Producto</a>
          <a href="#how" className="nav-link" data-testid="link-nav-como-funciona">Cómo funciona</a>
          <a href="#testimonial" className="nav-link" data-testid="link-nav-testimonios">Testimonios</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login" className="nav-link hidden sm:block" data-testid="link-login">
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
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-3xl" />
        </Parallax>
        
        <motion.div style={{ y: textY, opacity }} className="relative z-10 max-w-5xl mx-auto px-6 text-center mb-20">
          <motion.h1 
            className="font-display font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-tight mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="block text-white">Responde más rápido.</span>
            <span className="block"><span className="text-white/60">Vende más</span> <span className="text-white">con IA.</span></span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg md:text-xl lg:text-2xl text-white/50 max-w-2xl mx-auto mb-8 leading-relaxed"
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
      <div className="marquee-inner py-8 border-y border-white/20 section-dark relative">
        <div className={prefersReducedMotion ? "flex flex-wrap justify-center gap-4" : "marquee-container"}>
          <div className={prefersReducedMotion ? "flex flex-wrap justify-center gap-4" : "marquee-content"}>
            {(prefersReducedMotion ? items : [...items, ...items]).map((item, i) => (
              <span key={i} className="inline-flex items-center gap-4 px-8">
                <span className="font-display text-2xl md:text-3xl font-medium hover:text-white/80 transition-colors cursor-default text-white">
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

function ProblemMockup() {
  return (
    <div className="problem-mockup-card">
      <div className="mockup-phone-grid">
        <div className="chaos-phone instagram">
          <div className="phone-header">
            <div className="phone-notch" />
          </div>
          <div className="phone-app-bar">
            <FaInstagram className="w-4 h-4" />
            <span>Instagram</span>
            <div className="notification-badge">23</div>
          </div>
          <div className="phone-messages">
            <div className="unread-msg" />
            <div className="unread-msg" />
            <div className="unread-msg faded" />
          </div>
        </div>
        
        <div className="chaos-phone tiktok">
          <div className="phone-header">
            <div className="phone-notch" />
          </div>
          <div className="phone-app-bar">
            <FaTiktok className="w-4 h-4" />
            <span>TikTok</span>
            <div className="notification-badge">47</div>
          </div>
          <div className="phone-messages">
            <div className="unread-msg" />
            <div className="unread-msg" />
            <div className="unread-msg faded" />
          </div>
        </div>
        
        <div className="chaos-phone facebook">
          <div className="phone-header">
            <div className="phone-notch" />
          </div>
          <div className="phone-app-bar">
            <FaFacebook className="w-4 h-4" />
            <span>Facebook</span>
            <div className="notification-badge">12</div>
          </div>
          <div className="phone-messages">
            <div className="unread-msg" />
            <div className="unread-msg faded" />
          </div>
        </div>

        <div className="chaos-phone linkedin">
          <div className="phone-header">
            <div className="phone-notch" />
          </div>
          <div className="phone-app-bar">
            <FaLinkedin className="w-4 h-4" />
            <span>LinkedIn</span>
            <div className="notification-badge">8</div>
          </div>
          <div className="phone-messages">
            <div className="unread-msg" />
            <div className="unread-msg faded" />
          </div>
        </div>

        <div className="chaos-phone youtube">
          <div className="phone-header">
            <div className="phone-notch" />
          </div>
          <div className="phone-app-bar">
            <FaYoutube className="w-4 h-4" />
            <span>YouTube</span>
            <div className="notification-badge">31</div>
          </div>
          <div className="phone-messages">
            <div className="unread-msg" />
            <div className="unread-msg" />
            <div className="unread-msg faded" />
          </div>
        </div>

        <div className="chaos-phone google">
          <div className="phone-header">
            <div className="phone-notch" />
          </div>
          <div className="phone-app-bar">
            <GoogleBusinessIcon className="w-4 h-4" />
            <span>Google</span>
            <div className="notification-badge">5</div>
          </div>
          <div className="phone-messages">
            <div className="unread-msg" />
            <div className="unread-msg faded" />
          </div>
        </div>
      </div>
      
      <div className="chaos-overlay">
        <div className="floating-notification n1">
          <Bell className="w-3 h-3" />
          <span>+82 mensajes sin leer</span>
        </div>
        <div className="floating-notification n2">
          <Clock className="w-3 h-3" />
          <span>Lead esperando 4 horas</span>
        </div>
        <div className="floating-notification n3">
          <AlertCircle className="w-3 h-3" />
          <span>Cliente frustrado</span>
        </div>
        <div className="floating-notification n4">
          <MessageSquare className="w-3 h-3" />
          <span>Venta perdida</span>
        </div>
      </div>
    </div>
  );
}

function SolutionMockup() {
  return (
    <div className="solution-mockup-card">
      <div className="unified-inbox-preview">
        <div className="inbox-sidebar">
          <div className="sidebar-item active">
            <MessageSquare className="w-4 h-4" />
            <span>Inbox</span>
            <div className="count-badge">0</div>
          </div>
          <div className="sidebar-item">
            <Users className="w-4 h-4" />
            <span>CRM</span>
          </div>
          <div className="sidebar-item">
            <Bell className="w-4 h-4" />
            <span>Recordatorios</span>
          </div>
        </div>
        
        <div className="inbox-main">
          <div className="inbox-header-bar">
            <div className="platform-tabs">
              <span className="tab active">Todos</span>
              <span className="tab"><FaInstagram className="w-3 h-3" /></span>
              <span className="tab"><FaTiktok className="w-3 h-3" /></span>
              <span className="tab"><FaFacebook className="w-3 h-3" /></span>
            </div>
          </div>
          
          <div className="conversation-list-mini">
            <div className="conv-item answered">
              <div className="conv-avatar" />
              <div className="conv-content">
                <div className="conv-name" />
                <div className="conv-preview" />
              </div>
              <div className="conv-status">
                <Check className="w-3 h-3 text-[var(--landing-primary)]" />
              </div>
            </div>
            <div className="conv-item answered">
              <div className="conv-avatar" />
              <div className="conv-content">
                <div className="conv-name" />
                <div className="conv-preview" />
              </div>
              <div className="conv-status">
                <Check className="w-3 h-3 text-[var(--landing-primary)]" />
              </div>
            </div>
            <div className="conv-item ai-draft">
              <div className="conv-avatar" />
              <div className="conv-content">
                <div className="conv-name" />
                <div className="conv-preview" />
              </div>
              <div className="conv-status">
                <Sparkles className="w-3 h-3 text-[var(--landing-primary)]" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="inbox-detail">
          <div className="detail-header">
            <div className="customer-info">
              <div className="customer-avatar" />
              <div className="customer-meta">
                <div className="customer-name" />
                <div className="customer-platform">
                  <Instagram className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
          <div className="ai-response-preview">
            <div className="ai-badge">
              <Sparkles className="w-3 h-3" />
              <span>IA</span>
            </div>
            <div className="response-lines">
              <div className="line" />
              <div className="line short" />
            </div>
            <button className="send-btn">
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="success-indicators">
        <div className="indicator i1">
          <Check className="w-3 h-3" />
          <span>Respuesta en 2 min</span>
        </div>
        <div className="indicator i2">
          <Zap className="w-3 h-3" />
          <span>IA genera borradores</span>
        </div>
        <div className="indicator i3">
          <MessageSquare className="w-3 h-3" />
          <span>Un solo inbox</span>
        </div>
        <div className="indicator i4">
          <Users className="w-3 h-3" />
          <span>CRM integrado</span>
        </div>
        <div className="indicator i5">
          <Bell className="w-3 h-3" />
          <span>Recordatorios automáticos</span>
        </div>
      </div>
    </div>
  );
}

function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ 
    target: sectionRef, 
    offset: ['start end', 'end start'] 
  });
  
  const problemY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -50]);
  const solutionY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [150, -30]);
  const problemOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0.5]);
  const solutionOpacity = useTransform(scrollYProgress, [0, 0.25, 0.8, 1], [0, 1, 1, 0.5]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Problem Section */}
      <div className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div 
            style={{ y: problemY, opacity: problemOpacity }}
            className="problem-side text-center"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-white/40 font-semibold mb-4 block">
              El problema
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-12 leading-tight">
              Responder mensajes en 5 apps es <span className="text-white/50">agotador</span>
            </h2>
            <div className="max-w-3xl mx-auto">
              <ProblemMockup />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            style={{ y: solutionY, opacity: solutionOpacity }}
            className="solution-side text-center"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--landing-primary)] font-semibold mb-4 block">
              La solución
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-12 leading-tight">
              Un inbox inteligente que <span className="text-white/60">trabaja por ti</span>
            </h2>
            <div className="max-w-4xl mx-auto">
              <SolutionMockup />
            </div>
          </motion.div>
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,145,250,0.08)_0%,transparent_70%)]" />
      
      <Parallax speed={-5} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full border border-blue-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] md:w-[600px] md:h-[600px] rounded-full border border-blue-500/5" />
      </Parallax>
      
      <motion.div 
        style={{ scale, opacity }}
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
      >
        <div className="font-display font-black text-[25vw] md:text-[18vw] leading-none text-white mb-4">
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
              De caos a control en <span className="text-white/60">3 pasos</span>
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
            De caos a control en <span className="text-white/60">3 pasos</span>
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

        <div className="how-steps-wrapper" style={{ 
          backgroundImage: `url(${stepsBgLight})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
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
                  <p className="text-white text-lg md:text-xl leading-relaxed max-w-md">
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
      iconImage: featureIconInbox, 
      title: 'Inbox unificado', 
      description: 'Todas tus conversaciones de Instagram, TikTok y Facebook en un solo lugar.',
      size: 'medium',
      mockup: <FeatureInboxMockup />
    },
    { 
      iconImage: featureIconMultiAgent, 
      title: 'Multi-agente', 
      description: 'Varios miembros del equipo colaborando en tiempo real.',
      size: 'medium',
      mockup: <FeatureMultiAgentMockup />
    },
    { 
      iconImage: featureIconAI, 
      title: 'Respuestas IA', 
      description: 'Borradores que capturan tu tono de voz único.',
      size: 'small',
      mockup: <FeatureAIMockup />
    },
    { 
      iconImage: featureIconCRM, 
      title: 'CRM integrado', 
      description: 'Perfil completo de cada contacto con historial.',
      size: 'small',
      mockup: <FeatureCRMMockup />
    },
    { 
      iconImage: featureIconReminder, 
      title: 'Recordatorios', 
      description: 'Seguimiento automático para leads inactivos.',
      size: 'medium',
      mockup: <FeatureReminderMockup />
    },
    { 
      iconImage: featureIconComments, 
      title: 'Comentarios', 
      description: 'Gestiona comentarios de posts desde el inbox.',
      size: 'medium',
      mockup: <FeatureCommentsMockup />
    },
    { 
      iconImage: featureIconAnalytics, 
      title: 'Analytics', 
      description: 'Métricas de rendimiento y tiempo de respuesta.',
      size: 'medium',
      mockup: <FeatureAnalyticsMockup />
    },
  ];

  return (
    <section id="features" ref={sectionRef} className="py-32 section-dark relative overflow-hidden">
      <Parallax speed={-3} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
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
            Todo lo que necesitas para <span className="text-white/60">escalar</span>
          </h2>
          <p className="text-white/50 text-xl max-w-2xl mx-auto">
            Herramientas diseñadas para equipos que manejan cientos de conversaciones al día.
          </p>
        </motion.div>

        <div className="bento-grid">
          {features.map((feature, i) => {
            return (
              <div
                key={feature.title}
                className={`feature-card bento-${feature.size}`}
              >
                <div className="feature-card-inner">
                  <div className="feature-icon-wrapper overflow-hidden bg-transparent">
                    <img src={feature.iconImage} alt="" className="w-14 h-14 object-contain" />
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
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const quoteY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -100]);
  const quoteRotate = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-5, 5]);

  const testimonials = [
    {
      quote: "Con Repliyo respondemos los DMs de nuestro TikTok de 40k seguidores en minutos. La IA entiende perfectamente el tono de nuestra marca.",
      name: "Bettys Sarmiento",
      role: "CEO, BO Trust Services",
      image: testimonialBettys,
      highlight: "respondemos los DMs"
    },
    {
      quote: "Pasamos de responder en 4 horas a responder en 15 minutos. Repliyo cambió completamente cómo gestionamos nuestras redes.",
      name: "Carlos Mendoza",
      role: "Director de Marketing, TechStartup",
      image: avatarCarlos,
      highlight: "15 minutos"
    },
    {
      quote: "Los recordatorios automáticos nos ayudaron a recuperar leads que habíamos perdido. Ahora cerramos un 30% más de ventas.",
      name: "Ana Rodríguez",
      role: "Fundadora, StyleBoutique",
      image: avatarAna,
      highlight: "30% más de ventas"
    }
  ];

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, testimonials.length]);

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
        <div className="testimonial-carousel">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              className="testimonial-slide"
              initial={false}
              animate={{
                opacity: activeIndex === idx ? 1 : 0,
                filter: activeIndex === idx ? 'blur(0px)' : 'blur(8px)',
                scale: activeIndex === idx ? 1 : 0.95,
                zIndex: activeIndex === idx ? 10 : 1
              }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              <blockquote className="font-display text-2xl md:text-4xl lg:text-5xl font-medium text-white leading-relaxed mb-12">
                "{testimonial.quote.split(testimonial.highlight)[0]}
                <span className="text-white/60">{testimonial.highlight}</span>
                {testimonial.quote.split(testimonial.highlight)[1]}"
              </blockquote>

              <div className="inline-flex items-center gap-5 p-5 pr-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/20"
                />
                <div className="text-left">
                  <div className="font-semibold text-white text-xl md:text-2xl">{testimonial.name}</div>
                  <div className="text-base md:text-lg text-white/60">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="testimonial-dots mt-10">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`testimonial-dot ${activeIndex === idx ? 'active' : ''}`}
              aria-label={`Ver testimonio ${idx + 1}`}
            />
          ))}
        </div>
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
  return (
    <ParallaxProvider>
      <div className="landing-page theme-light" data-testid="landing-page">
        <Header />
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
