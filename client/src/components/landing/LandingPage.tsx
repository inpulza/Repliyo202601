import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion, useInView, useScroll, useTransform, useReducedMotion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Check, CheckCheck, X, Sparkles, Inbox, Users, Users2, Bell, MessageSquare, BarChart2, Send, Zap, Clock, Heart, Instagram, Facebook, Music, AlertCircle, Globe, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlowButton } from './GlowButton';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { GoogleBusinessIcon } from '../GoogleBusinessIcon';
import { useLanguage } from '../../context/LanguageContext';
import avatarMaria from '@assets/generated_images/maria_customer_avatar_headshot.png';
import avatarCarlos from '@assets/generated_images/carlos_customer_avatar_headshot.png';
import avatarAna from '@assets/generated_images/ana_customer_avatar_headshot.png';
import avatarDiego from '@assets/generated_images/hispanic_man_gym_selfie.png';
import avatarLaura from '@assets/generated_images/latina_woman_with_dog.png';
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
import flagES from '@assets/flags/es.png';
import flagGB from '@assets/flags/gb.png';
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
import { LiquidBackground } from './LiquidBackground';

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
  const { t } = useLanguage();
  const fullResponse = t.mockups.step2.aiResponse;
  
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
        const response = fullResponse;
        const typeInterval = setInterval(() => {
          if (charIndex < response.length) {
            setTypedText(response.slice(0, charIndex + 1));
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
  }, [fullResponse]);
  
  return (
    <div className="step-mockup ai-mockup-v3">
      <motion.div 
        className="floating-msg incoming"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
      >
        <div className="msg-avatar">
          <img src={avatarMaria} alt={t.mockups.inbox.crm.client} />
        </div>
        <div className="msg-content">
          <span className="msg-name">{t.mockups.step2.customerName}</span>
          <span className="msg-text">{t.mockups.step2.customerQuestion}</span>
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
          <span>{t.mockups.step2.aiGenerating}</span>
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
              <Sparkles className="w-3 h-3" /> {t.mockups.step2.aiDraft}
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
  const { t } = useLanguage();
  
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
          <div className="timeline-icon-v2 send-icon-v2">
            <Send className="w-5 h-5" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">{t.mockups.step3.sendResponse}</span>
            {phase >= 1 && <span className="timeline-status">{t.mockups.step3.readyToSend}</span>}
          </div>
        </motion.div>
        
        <div className={`timeline-connector ${phase >= 2 ? 'active' : ''}`} />
        
        <motion.div 
          className={`timeline-step ${phase >= 2 ? 'active' : ''}`}
          animate={{ scale: phase === 2 ? [1, 1.1, 1] : 1 }}
        >
          <div className="timeline-icon-v2 check-icon-v2">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">{t.mockups.step3.messageSent}</span>
            {phase >= 2 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="timeline-status success">{t.mockups.step3.delivered}</motion.span>}
          </div>
        </motion.div>
        
        <div className={`timeline-connector ${phase >= 3 ? 'active' : ''}`} />
        
        <motion.div 
          className={`timeline-step ${phase >= 3 ? 'active' : ''}`}
          animate={{ scale: phase === 3 ? [1, 1.1, 1] : 1 }}
        >
          <div className="timeline-icon-v2 bell-icon-v2">
            <Bell className="w-5 h-5" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">{t.mockups.step3.reminder}</span>
            {phase >= 3 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="timeline-status warning">{t.mockups.step3.scheduled24h}</motion.span>}
          </div>
        </motion.div>
        
        <div className={`timeline-connector ${phase >= 4 ? 'active' : ''}`} />
        
        <motion.div 
          className={`timeline-step ${phase >= 4 ? 'active' : ''}`}
          animate={{ scale: phase === 4 ? [1, 1.1, 1] : 1 }}
        >
          <div className="timeline-icon-v2 follow-icon-v2">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="timeline-content">
            <span className="timeline-title">{t.mockups.step3.followUp}</span>
            {phase >= 4 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="timeline-status">{t.mockups.step3.autoSent}</motion.span>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureInboxMockup() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [cycle, setCycle] = useState(0);
  const { t } = useLanguage();
  
  const avatars = [avatarMaria, avatarCarlos, avatarAna, avatarDiego, avatarLaura, avatarAna];
  const platforms: Array<{ platform: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { platform: 'instagram', Icon: FaInstagram },
    { platform: 'tiktok', Icon: FaTiktok },
    { platform: 'facebook', Icon: FaFacebook },
    { platform: 'instagram', Icon: FaInstagram },
    { platform: 'tiktok', Icon: FaTiktok },
    { platform: 'facebook', Icon: FaFacebook },
  ];
  
  const messages = t.mockups.inbox.messages.map((msg, idx) => ({
    ...msg,
    platform: platforms[idx].platform,
    Icon: platforms[idx].Icon,
    avatar: avatars[idx],
  }));
  
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
        <span className="inbox-count">{messages.length} {t.mockups.inbox.newCount}</span>
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
  const { t } = useLanguage();
  const fullText = t.mockups.ai.typingText;
  
  useEffect(() => {
    let charIndex = 0;
    const textToType = fullText;
    const interval = setInterval(() => {
      if (charIndex < textToType.length) {
        setText(textToType.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setTimeout(() => {
          setText('');
          charIndex = 0;
        }, 1500);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [fullText]);
  
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
  const { t } = useLanguage();
  
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
            <img src={avatarMaria} alt={t.mockups.inbox.crm.client} />
          </div>
          <div className="crm-mini-info-v2">
            <span className="crm-mini-name-v2">{t.mockups.step2.customerName}</span>
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
            <span className="crm-stat-label">{t.mockups.crmMini.purchases}</span>
            <span className="crm-stat-value">$1.2k</span>
          </div>
          <div className="crm-mini-stat">
            <span className="crm-stat-label">{t.mockups.crmMini.messages}</span>
            <span className="crm-stat-value">24</span>
          </div>
          <div className="crm-mini-tags-v2">
            <span className="crm-tag vip">{t.mockups.crmMini.vip}</span>
            <span className="crm-tag loyal">{t.mockups.crmMini.loyal}</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FeatureReminderMockup() {
  const [phase, setPhase] = useState(0);
  const { t } = useLanguage();
  
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
          <span>{t.mockups.reminderTimeline.messageSent}</span>
        </div>
        <div className={`reminder-line ${phase >= 1 ? 'active' : ''}`} />
        <div className={`reminder-event pause ${phase >= 1 ? 'active' : ''}`}>
          <Clock className="w-4 h-4" />
          <span>{t.mockups.reminderTimeline.noResponse24h}</span>
        </div>
        <div className={`reminder-line ${phase >= 2 ? 'active' : ''}`} />
        <motion.div 
          className={`reminder-event bell ${phase >= 2 ? 'active' : ''}`}
          animate={phase === 2 ? { scale: [1, 1.1, 1] } : {}}
        >
          <Bell className="w-4 h-4" />
          <span>{t.mockups.reminderTimeline.reminder}</span>
        </motion.div>
        <div className={`reminder-line ${phase >= 3 ? 'active' : ''}`} />
        <motion.div 
          className={`reminder-event follow ${phase >= 3 ? 'active' : ''}`}
          animate={phase === 3 ? { scale: [1, 1.1, 1] } : {}}
        >
          <Send className="w-4 h-4" />
          <span>{t.mockups.reminderTimeline.autoFollowUp}</span>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCommentsMockup() {
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  const { t } = useLanguage();
  
  const comments = t.mockups.comments;
  
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
  const { t } = useLanguage();
  
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
        {t.metrics.weekDays.map((day: string, idx: number) => (
          <span key={idx}>{day}</span>
        ))}
      </div>
    </div>
  );
}

function FeatureMultiAgentMockup() {
  const [activeAgent, setActiveAgent] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [visibleAssignments, setVisibleAssignments] = useState<number[]>([]);
  const { t } = useLanguage();
  
  const agents = [
    { name: 'Ana', color: 'bg-pink-500', initials: 'AN', avatar: agentAna, conversations: 12, responseTime: '2m' },
    { name: 'Luis', color: 'bg-blue-500', initials: 'LU', avatar: agentLuis, conversations: 8, responseTime: '3m' },
    { name: 'Sara', color: 'bg-green-500', initials: 'SA', avatar: agentSara, conversations: 15, responseTime: '1m' },
    { name: 'Carlos', color: 'bg-orange-500', initials: 'CA', avatar: agentCarlos, conversations: 6, responseTime: '4m' },
    { name: 'María', color: 'bg-blue-500', initials: 'MA', avatar: agentMaria, conversations: 10, responseTime: '2m' },
  ];

  const assignmentPlatforms = ['instagram', 'tiktok'];
  const recentAssignments = t.mockups.multiAgent.assignments.map((a, idx) => ({
    ...a,
    platform: assignmentPlatforms[idx] || 'instagram',
  }));
  
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
        <span className="multiagent-title">{t.mockups.multiAgent.activeTeam}</span>
        <span className="multiagent-count">{agents.length} {t.mockups.multiAgent.online}</span>
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
        <span className="status-text">{agents[activeAgent].name} {t.mockups.multiAgent.responding}</span>
      </motion.div>

      <div className="multiagent-assignments">
        <div className="assignments-header">
          <span className="assignments-title">{t.mockups.multiAgent.recentAssignments}</span>
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
  const { t } = useLanguage();
  
  const inboxMessages = t.mockups.inbox.allMessages;
  const allMessages = [
    { id: 1, user: inboxMessages[0].user, avatarImg: avatarMaria, message: inboxMessages[0].message, platform: 'instagram', time: inboxMessages[0].time, unread: true },
    { id: 2, user: inboxMessages[1].user, avatarImg: avatarCarlos, message: inboxMessages[1].message, platform: 'tiktok', time: inboxMessages[1].time, unread: true },
    { id: 3, user: inboxMessages[2].user, avatarImg: avatarAna, message: inboxMessages[2].message, platform: 'facebook', time: inboxMessages[2].time, unread: true },
    { id: 4, user: inboxMessages[3].user, avatarImg: avatarDiego, message: inboxMessages[3].message, platform: 'instagram', time: inboxMessages[3].time, unread: true },
    { id: 5, user: inboxMessages[4].user, avatarImg: avatarLaura, message: inboxMessages[4].message, platform: 'tiktok', time: '12m', unread: false },
  ];

  const floatingBubbles = [
    { id: 1, user: inboxMessages[0].user, avatar: avatarMaria, platform: 'instagram', position: 'pos-top-left', message: inboxMessages[0].message },
    { id: 2, user: inboxMessages[1].user, avatar: avatarCarlos, platform: 'tiktok', position: 'pos-top-right', message: inboxMessages[1].message },
    { id: 3, user: inboxMessages[2].user, avatar: avatarAna, platform: 'facebook', position: 'pos-bottom-left', message: inboxMessages[2].message },
    { id: 4, user: inboxMessages[3].user, avatar: avatarDiego, platform: 'instagram', position: 'pos-bottom-right', message: inboxMessages[3].message },
  ];

  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [inboxCount, setInboxCount] = useState(12);
  const [selectedMsg, setSelectedMsg] = useState(1);
  
  const [chatPhase, setChatPhase] = useState(0);
  const [animationCycle, setAnimationCycle] = useState(0);
  
  const [bubbleTypingTexts, setBubbleTypingTexts] = useState<Record<number, string>>({});
  const [visibleBubbles, setVisibleBubbles] = useState<number[]>([]);

  const chatConversation = t.mockups.inbox.conversation.map((conv: { type: string; text: string; time: string }) => ({
    ...conv,
    isAI: conv.type === 'outgoing'
  }));

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
              {t.mockups.inbox.nav.inbox}
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
              {t.mockups.inbox.nav.crm}
            </span>
            <span className="nav-item">
              <BarChart2 className="w-4 h-4" />
              {t.mockups.inbox.nav.analytics}
            </span>
          </div>
        </div>
        
        <div className="mockup-filters">
          <div className="filter-chip active">{t.mockups.inbox.filters.all}</div>
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
                  <img src={msg.avatarImg} alt={msg.user} className="avatar-img" />
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
                <img src={avatarMaria} alt={inboxMessages[0].user} className="chat-avatar" />
                <div className="chat-user-details">
                  <span className="chat-username">{inboxMessages[0].user}</span>
                  <span className="chat-platform">
                    <FaInstagram className="w-3 h-3 text-pink-500" />
                    {t.mockups.inbox.chat.instagramDirect}
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
                      <img src={avatarMaria} alt={t.mockups.step2.customerName} className="bubble-avatar" />
                    )}
                    <div className="bubble-content">
                      {msg.isAI && (
                        <div className="ai-badge-v2">
                          <Sparkles className="w-3 h-3" /> {t.mockups.step2.aiDraft}
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
                  <span>{t.mockups.inbox.chat.aiGenerating}</span>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="chat-actions-bar">
              <button className="chat-action-btn primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.mockups.inbox.chat.generateDraft}</span>
              </button>
              <button className="chat-action-btn">
                <Send className="w-3.5 h-3.5" />
                <span>{t.mockups.inbox.chat.reply}</span>
              </button>
              <button className="chat-action-btn">
                <Bell className="w-3.5 h-3.5" />
                <span>{t.mockups.inbox.chat.reminder}</span>
              </button>
            </div>
            
            <div className="auto-reply-indicator">
              <div className="auto-reply-badge">
                <Sparkles className="w-4 h-4" />
                <span>{t.mockups.inbox.chat.autoReplyActive}</span>
              </div>
              <span className="auto-reply-status">{t.mockups.inbox.chat.aiResponding}</span>
            </div>
          </div>
          
          <div className="mockup-crm-panel">
            <div className="crm-header">
              <Users className="w-4 h-4" />
              <span>{t.mockups.inbox.crm.client}</span>
            </div>
            <div className="crm-content">
              <img src={avatarMaria} alt={inboxMessages[0].user} className="crm-avatar" />
              <div className="crm-name">{inboxMessages[0].user}</div>
              <div className="crm-email">maria.garcia@email.com</div>
              <div className="crm-stats-grid">
                <div className="crm-stat-item">
                  <span className="stat-number">8</span>
                  <span className="stat-text">{t.mockups.inbox.crm.chats}</span>
                </div>
                <div className="crm-stat-item">
                  <span className="stat-number">$1.2k</span>
                  <span className="stat-text">{t.mockups.inbox.crm.value}</span>
                </div>
              </div>
              <div className="crm-tags">
                <span className="crm-tag vip">{t.mockups.inbox.crm.vip}</span>
                <span className="crm-tag">{t.mockups.inbox.crm.recurring}</span>
              </div>
              <div className="crm-notes">
                <span className="notes-label">{t.mockups.inbox.crm.notes}</span>
                <p className="notes-text">{t.mockups.inbox.crm.notesText}</p>
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

function MobileInboxMockup() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [animationCycle, setAnimationCycle] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  
  const inboxMessages = t.mockups.inbox.allMessages;
  const messages = [
    { id: 1, user: inboxMessages[0].user, avatarImg: avatarMaria, message: inboxMessages[0].message, platform: 'instagram', time: inboxMessages[0].time },
    { id: 2, user: inboxMessages[1].user, avatarImg: avatarCarlos, message: inboxMessages[1].message, platform: 'tiktok', time: inboxMessages[1].time },
    { id: 3, user: inboxMessages[2].user, avatarImg: avatarAna, message: inboxMessages[2].message, platform: 'facebook', time: inboxMessages[2].time },
    { id: 4, user: inboxMessages[3].user, avatarImg: avatarDiego, message: inboxMessages[3].message, platform: 'instagram', time: inboxMessages[3].time },
    { id: 5, user: 'Pedro Sánchez', avatarImg: avatarCarlos, message: '¿Hacen envíos a Canarias?', platform: 'tiktok', time: '15m' },
    { id: 6, user: 'Laura Martín', avatarImg: avatarLaura, message: '¿Tienen catálogo en PDF?', platform: 'facebook', time: '20m' },
  ];
  
  const crmContacts = [
    { id: 1, name: 'Vanessa Vanessa', platform: 'facebook', status: 'lead', messages: 5, time: '4 horas' },
    { id: 2, name: 'franciscoantonio', platform: 'instagram', status: 'lead', messages: 8, time: '9 horas' },
    { id: 3, name: 'Ávila Yüsmaira', platform: 'facebook', status: 'lead', messages: 1, time: '13 horas' },
    { id: 4, name: 'Yenifer Yeimelis', platform: 'facebook', status: 'lead', messages: 5, time: '16 horas' },
    { id: 5, name: 'Javier Rivera', platform: 'facebook', status: 'lead', messages: 2, time: '17 horas' },
  ];
  const [visibleCrmContacts, setVisibleCrmContacts] = useState<number[]>([]);
  
  const chatMessages = t.mockups.inbox.conversation.slice(0, 4);
  const [visibleChat, setVisibleChat] = useState(0);
  const [visibleInbox, setVisibleInbox] = useState<number[]>([]);
  const [crmVisible, setCrmVisible] = useState(false);
  
  // Floating bubbles state
  const [visibleBubbles, setVisibleBubbles] = useState<number[]>([]);
  const [bubbleTypingTexts, setBubbleTypingTexts] = useState<{[key: number]: string}>({});
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  
  const conversationText = t.mockups.inbox.conversation[1]?.text;
  const aiResponseMessage = conversationText ? conversationText.substring(0, 40) + '...' : '¡Hola! Sí, tenemos el vestido azul...';
  
  const mobileBubbles = [
    { id: 1, platform: 'instagram', user: 'Laura M.', avatar: avatarAna, message: t.mockups.inbox.allMessages[0].message.substring(0, 25) + '...', position: 'left', isAi: false },
    { id: 2, platform: 'tiktok', user: 'Pablo R.', avatar: avatarCarlos, message: t.mockups.inbox.allMessages[1].message.substring(0, 22) + '...', position: 'right', isAi: false },
    { id: 3, platform: 'youtube', user: 'Miguel S.', avatar: avatarDiego, message: '¿Hacen envíos a toda España?', position: 'left', isAi: false },
    { id: 4, platform: 'facebook', user: 'Carmen L.', avatar: avatarLaura, message: '¿Cuál es el horario de atención?', position: 'right', isAi: false },
  ];

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleInbox([1, 2, 3, 4, 5, 6]);
      setVisibleChat(4);
      setCrmVisible(true);
      setVisibleBubbles([1, 2, 3, 4]);
      setBubbleTypingTexts({
        1: mobileBubbles[0].message,
        2: mobileBubbles[1].message,
        3: mobileBubbles[2].message,
        4: mobileBubbles[3].message
      });
      setShowAiResponse(true);
      setAiResponseText(aiResponseMessage);
      setVisibleCrmContacts([1, 2, 3, 4, 5]);
      return;
    }
    
    setVisibleInbox([]);
    setVisibleChat(0);
    setCrmVisible(false);
    setActiveSlide(0);
    setVisibleBubbles([]);
    setBubbleTypingTexts({});
    setShowAiResponse(false);
    setAiResponseText('');
    setVisibleCrmContacts([]);
    
    const timers: NodeJS.Timeout[] = [];
    
    messages.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setVisibleInbox(prev => [...prev, idx + 1]);
      }, 400 + idx * 500));
    });
    
    // Bubble 1: Instagram
    timers.push(setTimeout(() => {
      setVisibleBubbles([1]);
      let charIdx = 0;
      const bubble1Msg = mobileBubbles[0].message;
      const typeInterval = setInterval(() => {
        charIdx++;
        setBubbleTypingTexts(prev => ({ ...prev, 1: bubble1Msg.slice(0, charIdx) }));
        if (charIdx >= bubble1Msg.length) clearInterval(typeInterval);
      }, 40);
      timers.push(typeInterval as unknown as NodeJS.Timeout);
    }, 1800));
    
    // Bubble 2: TikTok
    timers.push(setTimeout(() => {
      setVisibleBubbles(prev => [...prev, 2]);
      let charIdx = 0;
      const bubble2Msg = mobileBubbles[1].message;
      const typeInterval = setInterval(() => {
        charIdx++;
        setBubbleTypingTexts(prev => ({ ...prev, 2: bubble2Msg.slice(0, charIdx) }));
        if (charIdx >= bubble2Msg.length) clearInterval(typeInterval);
      }, 45);
      timers.push(typeInterval as unknown as NodeJS.Timeout);
    }, 2600));
    
    // Chat messages appearing sequentially
    timers.push(setTimeout(() => {
      setActiveSlide(1);
      setVisibleChat(1);
    }, 3500));
    
    timers.push(setTimeout(() => setVisibleChat(2), 4200));
    timers.push(setTimeout(() => setVisibleChat(3), 4900));
    timers.push(setTimeout(() => setVisibleChat(4), 5600));
    
    // Bubble 3: YouTube
    timers.push(setTimeout(() => {
      setVisibleBubbles(prev => [...prev, 3]);
      let charIdx = 0;
      const bubble3Msg = mobileBubbles[2].message;
      const typeInterval = setInterval(() => {
        charIdx++;
        setBubbleTypingTexts(prev => ({ ...prev, 3: bubble3Msg.slice(0, charIdx) }));
        if (charIdx >= bubble3Msg.length) clearInterval(typeInterval);
      }, 35);
      timers.push(typeInterval as unknown as NodeJS.Timeout);
    }, 5000));
    
    // Bubble 4: Facebook
    timers.push(setTimeout(() => {
      setVisibleBubbles(prev => [...prev, 4]);
      let charIdx = 0;
      const bubble4Msg = mobileBubbles[3].message;
      const typeInterval = setInterval(() => {
        charIdx++;
        setBubbleTypingTexts(prev => ({ ...prev, 4: bubble4Msg.slice(0, charIdx) }));
        if (charIdx >= bubble4Msg.length) clearInterval(typeInterval);
      }, 38);
      timers.push(typeInterval as unknown as NodeJS.Timeout);
    }, 5800));
    
    // AI Response animation
    timers.push(setTimeout(() => {
      setShowAiResponse(true);
      let charIdx = 0;
      const typeInterval = setInterval(() => {
        charIdx++;
        setAiResponseText(aiResponseMessage.slice(0, charIdx));
        if (charIdx >= aiResponseMessage.length) clearInterval(typeInterval);
      }, 30);
      timers.push(typeInterval as unknown as NodeJS.Timeout);
    }, 6500));
    
    timers.push(setTimeout(() => {
      setActiveSlide(2);
      setCrmVisible(true);
    }, 9500));
    
    // CRM Contacts list animation
    timers.push(setTimeout(() => {
      setActiveSlide(3);
      setVisibleCrmContacts([1]);
    }, 12000));
    
    crmContacts.slice(1).forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setVisibleCrmContacts(prev => [...prev, idx + 2]);
      }, 12400 + idx * 350));
    });
    
    timers.push(setTimeout(() => {
      setAnimationCycle(c => c + 1);
    }, 17000));
    
    return () => timers.forEach(clearTimeout);
  }, [prefersReducedMotion, animationCycle]);

  useEffect(() => {
    if (activeSlide === 1 && visibleChat === 0) {
      setVisibleChat(chatMessages.length);
    }
    if (activeSlide === 2 && !crmVisible) {
      setCrmVisible(true);
    }
  }, [activeSlide]);

  const handleDotClick = (idx: number) => {
    setActiveSlide(idx);
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
      case 'instagram': return <FaInstagram className="w-3 h-3 text-white" />;
      case 'tiktok': return <FaTiktok className="w-3 h-3 text-white" />;
      case 'facebook': return <FaFacebook className="w-3 h-3 text-white" />;
      default: return null;
    }
  };

  return (
    <div className="mobile-mockup-carousel">
      <div className="mobile-phone-frame">
        <div className="mobile-phone-notch" />
        
        <div className="mobile-screens-container">
          <motion.div 
            className="mobile-screen screen-inbox"
            initial={false}
            animate={{ 
              opacity: activeSlide === 0 ? 1 : 0,
              scale: activeSlide === 0 ? 1 : 0.95
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="mobile-slide-header">
              <Inbox className="w-5 h-5" />
              <span>{t.mockups.inbox.nav.inbox}</span>
              <motion.span 
                key={visibleInbox.length}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="mobile-badge"
              >
                {visibleInbox.length || 4}
              </motion.span>
            </div>
            <div className="mobile-messages-list">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: visibleInbox.includes(msg.id) || activeSlide !== 0 ? 1 : 0.3, x: 0 }}
                  transition={{ duration: 0.3, type: 'spring' }}
                  className="mobile-message-item"
                  style={{ opacity: visibleInbox.includes(msg.id) || activeSlide !== 0 ? 1 : 0 }}
                >
                  <div className="mobile-msg-avatar">
                    <img src={msg.avatarImg} alt={msg.user} />
                    <span className={`mobile-platform-dot ${msg.platform}`}>
                      <PlatformIcon platform={msg.platform} />
                    </span>
                  </div>
                  <div className="mobile-msg-content">
                    <div className="mobile-msg-header">
                      <span className="mobile-msg-name">{msg.user}</span>
                      <span className="mobile-msg-time">{msg.time}</span>
                    </div>
                    <span className="mobile-msg-preview">{msg.message.slice(0, 35)}...</span>
                  </div>
                  <span className="mobile-unread-dot" />
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            className="mobile-screen screen-chat"
            initial={false}
            animate={{ 
              opacity: activeSlide === 1 ? 1 : 0,
              scale: activeSlide === 1 ? 1 : 0.95
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="mobile-slide-header">
              <img src={avatarMaria} alt={inboxMessages[0].user} className="mobile-chat-avatar" />
              <div className="mobile-chat-info">
                <span className="mobile-chat-name">{inboxMessages[0].user}</span>
                <span className="mobile-chat-platform">
                  <FaInstagram className="w-3 h-3 text-pink-500" />
                  Instagram
                </span>
              </div>
            </div>
            <div className="mobile-chat-messages">
              {chatMessages.map((msg, idx) => (
                <motion.div
                  key={`chat-${idx}`}
                  className={`mobile-chat-bubble ${msg.type}`}
                  initial={{ opacity: 0, x: msg.type === 'incoming' ? -20 : 20 }}
                  animate={{ 
                    opacity: visibleChat > idx ? 1 : 0,
                    x: visibleChat > idx ? 0 : (msg.type === 'incoming' ? -20 : 20)
                  }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {msg.type === 'outgoing' && (
                    <div className="mobile-ai-badge">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </div>
                  )}
                  <span>{msg.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            className="mobile-screen screen-crm"
            initial={false}
            animate={{ 
              opacity: activeSlide === 2 ? 1 : 0,
              scale: activeSlide === 2 ? 1 : 0.95
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="mobile-slide-header">
              <Users className="w-5 h-5" />
              <span>{t.mockups.inbox.crm.client}</span>
            </div>
            <div className="mobile-crm-content">
              <div className="mobile-crm-profile">
                <img src={avatarMaria} alt={inboxMessages[0].user} className="mobile-crm-avatar" />
                <div className="mobile-crm-name">{inboxMessages[0].user}</div>
                <div className="mobile-crm-email">maria.garcia@email.com</div>
                <div className="mobile-crm-tags">
                  <span className="mobile-crm-tag vip">{t.mockups.inbox.crm.vip}</span>
                  <span className="mobile-crm-tag">{t.mockups.inbox.crm.recurring}</span>
                </div>
              </div>
              <div className="mobile-crm-stats">
                <div className="mobile-crm-stat">
                  <span className="mobile-stat-number">8</span>
                  <span className="mobile-stat-label">{t.mockups.inbox.crm.chats}</span>
                </div>
                <div className="mobile-crm-stat">
                  <span className="mobile-stat-number">$1.2k</span>
                  <span className="mobile-stat-label">{t.mockups.inbox.crm.value}</span>
                </div>
                <div className="mobile-crm-stat">
                  <span className="mobile-stat-number">2m</span>
                  <span className="mobile-stat-label">Resp.</span>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="mobile-screen screen-contacts"
            initial={false}
            animate={{ 
              opacity: activeSlide === 3 ? 1 : 0,
              scale: activeSlide === 3 ? 1 : 0.95
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="mobile-contacts-header">
              <span className="mobile-contacts-title">Contactos</span>
            </div>
            <div className="mobile-contacts-tabs">
              <span className="mobile-tab active">Contactos (100)</span>
              <span className="mobile-tab">Pendientes</span>
              <span className="mobile-tab">Dup.</span>
            </div>
            <div className="mobile-contacts-search">
              <Search className="w-3.5 h-3.5" />
              <span>Buscar...</span>
            </div>
            <div className="mobile-contacts-list">
              {crmContacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ 
                    opacity: visibleCrmContacts.includes(contact.id) ? 1 : 0,
                    x: visibleCrmContacts.includes(contact.id) ? 0 : -15
                  }}
                  transition={{ duration: 0.25 }}
                  className="mobile-contact-row"
                >
                  <div className="mobile-contact-initial">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="mobile-contact-info">
                    <div className="mobile-contact-name">{contact.name}</div>
                    <div className="mobile-contact-meta">
                      <span className="mobile-contact-badge">{contact.status}</span>
                      <span className="mobile-contact-msgs">{contact.messages} msgs</span>
                      <span className="mobile-contact-time">hace {contact.time}</span>
                    </div>
                  </div>
                  <div className={`mobile-contact-platform ${contact.platform}`}>
                    {contact.platform === 'facebook' && <FaFacebook className="w-3 h-3 text-white" />}
                    {contact.platform === 'instagram' && <FaInstagram className="w-3 h-3 text-white" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        <div className="mobile-carousel-dots">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              className={`mobile-dot ${activeSlide === idx ? 'active' : ''}`}
              onClick={() => handleDotClick(idx)}
            />
          ))}
        </div>
      </div>
      
      <div className="mobile-slide-labels">
        <span className={activeSlide === 0 ? 'active' : ''}>{t.mockups.inbox.nav.inbox}</span>
        <span className={activeSlide === 1 ? 'active' : ''}>AI Chat</span>
        <span className={activeSlide === 2 ? 'active' : ''}>{t.mockups.inbox.nav.crm}</span>
        <span className={activeSlide === 3 ? 'active' : ''}>Contactos</span>
      </div>
      
      {/* Floating Bubbles - Row 1 */}
      <div className="mobile-floating-bubbles">
        {mobileBubbles.slice(0, 2).map((bubble) => (
          <div
            key={bubble.id}
            className={`mobile-floating-bubble ${bubble.platform} ${bubble.position} ${visibleBubbles.includes(bubble.id) ? 'visible' : ''}`}
          >
            <div className="mobile-bubble-header">
              <div className={`mobile-bubble-icon ${bubble.platform}`}>
                {bubble.platform === 'instagram' && <FaInstagram className="w-3 h-3 text-white" />}
                {bubble.platform === 'tiktok' && <FaTiktok className="w-3 h-3 text-white" />}
                {bubble.platform === 'facebook' && <FaFacebook className="w-3 h-3 text-white" />}
                {bubble.platform === 'youtube' && <FaYoutube className="w-3 h-3 text-white" />}
              </div>
              <span className="mobile-bubble-platform">
                {bubble.platform === 'instagram' ? 'Instagram' : bubble.platform === 'tiktok' ? 'TikTok' : bubble.platform === 'youtube' ? 'YouTube' : 'Messenger'}
              </span>
            </div>
            <div className="mobile-bubble-user">
              <img src={bubble.avatar} alt={bubble.user} className="mobile-bubble-avatar" />
              <span className="mobile-bubble-name">{bubble.user}</span>
            </div>
            <div className="mobile-bubble-input">
              <span className="mobile-bubble-text">
                {bubbleTypingTexts[bubble.id] || ''}
              </span>
              {visibleBubbles.includes(bubble.id) && (bubbleTypingTexts[bubble.id]?.length || 0) < bubble.message.length && (
                <span className="mobile-bubble-cursor" />
              )}
              <Send className="w-3.5 h-3.5 mobile-bubble-send" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Floating Bubbles - Row 2 */}
      <div className="mobile-floating-bubbles">
        {mobileBubbles.slice(2, 4).map((bubble) => (
          <div
            key={bubble.id}
            className={`mobile-floating-bubble ${bubble.platform} ${bubble.position} ${visibleBubbles.includes(bubble.id) ? 'visible' : ''}`}
          >
            <div className="mobile-bubble-header">
              <div className={`mobile-bubble-icon ${bubble.platform}`}>
                {bubble.platform === 'instagram' && <FaInstagram className="w-3 h-3 text-white" />}
                {bubble.platform === 'tiktok' && <FaTiktok className="w-3 h-3 text-white" />}
                {bubble.platform === 'facebook' && <FaFacebook className="w-3 h-3 text-white" />}
                {bubble.platform === 'youtube' && <FaYoutube className="w-3 h-3 text-white" />}
              </div>
              <span className="mobile-bubble-platform">
                {bubble.platform === 'instagram' ? 'Instagram' : bubble.platform === 'tiktok' ? 'TikTok' : bubble.platform === 'youtube' ? 'YouTube' : 'Messenger'}
              </span>
            </div>
            <div className="mobile-bubble-user">
              <img src={bubble.avatar} alt={bubble.user} className="mobile-bubble-avatar" />
              <span className="mobile-bubble-name">{bubble.user}</span>
            </div>
            <div className="mobile-bubble-input">
              <span className="mobile-bubble-text">
                {bubbleTypingTexts[bubble.id] || ''}
              </span>
              {visibleBubbles.includes(bubble.id) && (bubbleTypingTexts[bubble.id]?.length || 0) < bubble.message.length && (
                <span className="mobile-bubble-cursor" />
              )}
              <Send className="w-3.5 h-3.5 mobile-bubble-send" />
            </div>
          </div>
        ))}
      </div>
      
      {/* AI Response Bubble */}
      <div className={`mobile-ai-response-bubble ${showAiResponse ? 'visible' : ''}`}>
        <div className="mobile-ai-response-header">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span>Repliyo AI</span>
        </div>
        <div className="mobile-ai-response-content">
          <span className="mobile-ai-response-text">
            {aiResponseText}
          </span>
          {showAiResponse && aiResponseText.length < aiResponseMessage.length && (
            <span className="mobile-bubble-cursor" />
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = window.scrollY + elementPosition - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

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
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="nav-link" data-testid="link-nav-producto">{t.header.product}</a>
          <a href="#how" onClick={(e) => scrollToSection(e, 'how')} className="nav-link" data-testid="link-nav-como-funciona">{t.header.howItWorks}</a>
          <a href="#testimonial" onClick={(e) => scrollToSection(e, 'testimonial')} className="nav-link" data-testid="link-nav-testimonios">{t.header.testimonials}</a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="lang-ios-toggle"
            data-testid="button-language-toggle"
            aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <div className="lang-ios-track">
              <div className="lang-ios-flags">
                <img 
                  src={flagES} 
                  alt="Español" 
                  className={`lang-ios-flag flag-es ${language === 'es' ? 'visible' : ''}`}
                />
                <img 
                  src={flagGB} 
                  alt="English" 
                  className={`lang-ios-flag flag-gb ${language === 'en' ? 'visible' : ''}`}
                />
              </div>
              <motion.div 
                className="lang-ios-thumb"
                initial={false}
                animate={{ 
                  left: language === 'es' ? '-2px' : '34px'
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35
                }}
              />
            </div>
          </button>
          <a 
            href="/login" 
            className="text-sm font-medium text-[var(--landing-primary)] hover:text-[var(--landing-primary-dark)] transition-colors"
            data-testid="button-login-header"
          >
            {t.header.login}
          </a>
        </div>
      </div>
    </motion.header>
  );
}

function HeroSection() {
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  
  const textY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 100]);
  const mockupY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -20]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [1, 0.98]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <section ref={containerRef} className="hero-section relative min-h-[140vh] md:min-h-[150vh] overflow-visible">
      <div className="hero-sticky-container sticky top-0 min-h-screen flex flex-col items-center justify-start pt-40 overflow-visible">
        <div className="absolute inset-0 bg-radial-gradient" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        
        <Parallax speed={-10} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-3xl" />
        </Parallax>
        
        <motion.div style={{ y: textY, opacity }} className="hero-text-content relative z-10 max-w-6xl mx-auto px-6 text-center mb-20">
          <div className="overflow-visible mb-8">
            <motion.h1 
              className="hero-title font-display font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-tight"
            >
              <span className="block text-white whitespace-nowrap">
                <motion.span 
                  className="inline"
                  initial={{ opacity: 0, y: 60, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {t.hero.titlePart1}{' '}
                </motion.span>
                <motion.span 
                  className="inline-block relative"
                  initial={{ opacity: 0, x: -80, filter: 'blur(20px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ 
                    duration: 0.35,
                    delay: 0.7,
                    type: "spring",
                    stiffness: 400,
                    damping: 28
                  }}
                >
                  {t.hero.titlePart2}
                  <motion.span
                    className="absolute -top-1 left-[calc(100%-0.25rem)] text-[var(--landing-primary)]"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 1.1,
                      duration: 0.25,
                      type: "spring",
                      stiffness: 500,
                      damping: 15
                    }}
                  >
                    <CheckCheck className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" strokeWidth={2.5} />
                  </motion.span>
                </motion.span>
              </span>
              <motion.span 
                className="block text-white/60"
                initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {t.hero.subtitle}
              </motion.span>
            </motion.h1>
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="hero-description text-xl md:text-2xl lg:text-3xl text-white/50 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            {t.hero.description}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center"
          >
            <GlowButton href="/login">
              {t.hero.cta}
            </GlowButton>
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
            <div className="desktop-mockup-wrapper">
              <InboxMockup />
            </div>
            <div className="mobile-mockup-wrapper">
              <MobileInboxMockup />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function MarqueeSection() {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const items = t.marquee.items;
  
  return (
    <section className="marquee-section relative mt-10 md:mt-16 mb-5 md:mb-8">
      <div className="marquee-inner py-6 md:py-8 border-y border-white/20 section-dark relative">
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

function Tilt3D({ children, maxTilt = 8 }: { children: React.ReactNode; maxTilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const brightness = useMotionValue(1);
  
  const springConfig = { damping: 20, stiffness: 150 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);
  const springBrightness = useSpring(brightness, springConfig);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);
    
    rotateX.set(percentY * -maxTilt);
    rotateY.set(percentX * maxTilt);
    brightness.set(1 + Math.abs(percentX * percentY) * 0.1);
  };
  
  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    brightness.set(1);
  };
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        filter: useTransform(springBrightness, (v) => `brightness(${v})`),
        transformStyle: 'preserve-3d',
        transformPerspective: 1000,
      }}
      className="tilt-3d-wrapper"
    >
      {children}
    </motion.div>
  );
}

function AnimatedBadge({ target, delay, inView }: { target: number; delay: number; inView: boolean }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true;
      const startDelay = delay * 1000;
      const duration = 800 + Math.random() * 400;
      const steps = target;
      const stepDuration = duration / steps;
      
      const timeout = setTimeout(() => {
        let current = 0;
        const interval = setInterval(() => {
          current++;
          setCount(current);
          if (current >= target) {
            clearInterval(interval);
          }
        }, stepDuration);
      }, startDelay);
      
      return () => clearTimeout(timeout);
    }
  }, [inView, target, delay]);
  
  return (
    <motion.div 
      className="notification-badge"
      animate={count > 0 ? { scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.15 }}
      key={count}
    >
      {count}
    </motion.div>
  );
}

function ProblemMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  
  const phones = [
    { platform: 'instagram', icon: FaInstagram, color: '#E1306C', name: 'Instagram', count: 23, messages: 3 },
    { platform: 'tiktok', icon: FaTiktok, color: '#000000', name: 'TikTok', count: 47, messages: 3 },
    { platform: 'facebook', icon: FaFacebook, color: '#1877F2', name: 'Facebook', count: 12, messages: 2 },
    { platform: 'linkedin', icon: FaLinkedin, color: '#0A66C2', name: 'LinkedIn', count: 8, messages: 2 },
    { platform: 'youtube', icon: FaYoutube, color: '#FF0000', name: 'YouTube', count: 31, messages: 3 },
    { platform: 'google', icon: GoogleBusinessIcon, color: '#4285F4', name: 'Google', count: 5, messages: 2 },
  ];
  
  const notifications = [
    { icon: Bell, text: t.problemSolution.notifications.unreadMessages, className: 'n1' },
    { icon: Clock, text: t.problemSolution.notifications.leadWaiting, className: 'n2' },
    { icon: AlertCircle, text: t.problemSolution.notifications.frustratedClient, className: 'n3' },
    { icon: MessageSquare, text: t.problemSolution.notifications.lostSale, className: 'n4' },
  ];

  const cardVariants = {
    hidden: (i: number) => ({
      opacity: 0,
      y: 60,
      x: (i % 3 - 1) * 30,
      scale: 0.8,
      rotateY: (i % 2 === 0 ? -15 : 15),
    }),
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotateY: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    }),
  };

  const notificationVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: 0.8 + i * 0.2,
        duration: 0.4,
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    }),
  };

  if (prefersReducedMotion) {
    return (
      <div className="problem-mockup-card" ref={ref}>
        <div className="mockup-phone-grid">
          {phones.map((phone) => {
            const IconComponent = phone.icon;
            return (
              <div key={phone.platform} className={`chaos-phone ${phone.platform}`}>
                <div className="phone-header">
                  <div className="phone-notch" />
                </div>
                <div className="phone-app-bar">
                  <IconComponent className="w-4 h-4" style={{ color: phone.color }} />
                  <span>{phone.name}</span>
                  <div className="notification-badge">{phone.count}</div>
                </div>
                <div className="phone-messages">
                  {Array.from({ length: phone.messages }).map((_, j) => (
                    <div key={j} className={`unread-msg ${j === phone.messages - 1 ? 'faded' : ''}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="chaos-overlay">
          {notifications.map((notif) => {
            const IconComponent = notif.icon;
            return (
              <div key={notif.className} className={`floating-notification ${notif.className}`}>
                <IconComponent className="w-3 h-3" />
                <span>{notif.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Tilt3D maxTilt={6}>
      <div className="problem-mockup-card" ref={ref}>
        <div className="mockup-phone-grid">
          {phones.map((phone, i) => {
            const IconComponent = phone.icon;
            return (
              <motion.div
                key={phone.platform}
                className={`chaos-phone ${phone.platform}`}
                custom={i}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={cardVariants}
              >
                <div className="phone-header">
                  <div className="phone-notch" />
                </div>
                <div className="phone-app-bar">
                  <IconComponent className="w-4 h-4" style={{ color: phone.color }} />
                  <span>{phone.name}</span>
                  <AnimatedBadge target={phone.count} delay={0.3 + i * 0.15} inView={inView} />
                </div>
                <div className="phone-messages">
                  {Array.from({ length: phone.messages }).map((_, j) => (
                    <motion.div
                      key={j}
                      className={`unread-msg ${j === phone.messages - 1 ? 'faded' : ''}`}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={inView ? { opacity: j === phone.messages - 1 ? 0.7 : 1, scaleX: 1 } : {}}
                      transition={{ delay: 0.5 + i * 0.1 + j * 0.1, duration: 0.3 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="chaos-overlay">
          {notifications.map((notif, i) => {
            const IconComponent = notif.icon;
            return (
              <motion.div
                key={notif.className}
                className={`floating-notification ${notif.className}`}
                custom={i}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={notificationVariants}
              >
                <IconComponent className="w-3 h-3" />
                <span>{notif.text}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Tilt3D>
  );
}

function ProblemMockupMobile() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  
  const platforms = [
    { icon: FaInstagram, color: '#E1306C', name: 'IG', count: 23 },
    { icon: FaTiktok, color: '#000000', name: 'TT', count: 47 },
    { icon: FaFacebook, color: '#1877F2', name: 'FB', count: 12 },
    { icon: FaLinkedin, color: '#0A66C2', name: 'LI', count: 8 },
    { icon: FaYoutube, color: '#FF0000', name: 'YT', count: 31 },
  ];
  
  const totalMessages = platforms.reduce((sum, p) => sum + p.count, 0);
  
  const alerts = [
    { icon: Bell, text: t.problemSolution.notifications.unreadMessages },
    { icon: Clock, text: t.problemSolution.notifications.leadWaiting },
    { icon: AlertCircle, text: t.problemSolution.notifications.frustratedClient },
    { icon: MessageSquare, text: t.problemSolution.notifications.lostSale },
  ];

  if (prefersReducedMotion) {
    return (
      <div className="problem-mockup-mobile" ref={ref}>
        <div className="problem-mobile-platforms">
          {platforms.map((platform) => {
            const IconComponent = platform.icon;
            return (
              <div key={platform.name} className="problem-mobile-platform-item">
                <div 
                  className="problem-mobile-platform-icon"
                  style={{ background: platform.color }}
                >
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <span className="problem-mobile-platform-badge">{platform.count}</span>
              </div>
            );
          })}
        </div>
        <div className="problem-mobile-counter">
          <span className="problem-mobile-counter-number">+{totalMessages}</span>
          <span className="problem-mobile-counter-label">{t.problemSolution.notifications.unreadMessagesLabel}</span>
        </div>
        <div className="problem-mobile-alerts">
          {alerts.map((alert, i) => {
            const IconComponent = alert.icon;
            return (
              <div key={i} className="problem-mobile-alert">
                <IconComponent className="w-4 h-4 text-white" />
                <span>{alert.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="problem-mockup-mobile" ref={ref}>
      {/* Platform Icons Row */}
      <motion.div 
        className="problem-mobile-platforms"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {platforms.map((platform, i) => {
          const IconComponent = platform.icon;
          return (
            <motion.div
              key={platform.name}
              className="problem-mobile-platform-item"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4, type: 'spring' }}
            >
              <div 
                className="problem-mobile-platform-icon"
                style={{ background: platform.color }}
              >
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <motion.span 
                className="problem-mobile-platform-badge"
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : {}}
                transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 400 }}
              >
                {platform.count}
              </motion.span>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Central Counter */}
      <motion.div 
        className="problem-mobile-counter"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
      >
        <motion.span 
          className="problem-mobile-counter-number"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          +{totalMessages}
        </motion.span>
        <span className="problem-mobile-counter-label">
          {t.problemSolution.notifications.unreadMessagesLabel}
        </span>
      </motion.div>

      {/* Alert Pills Stack */}
      <div className="problem-mobile-alerts">
        {alerts.map((alert, i) => {
          const IconComponent = alert.icon;
          return (
            <motion.div
              key={i}
              className="problem-mobile-alert"
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.6 + i * 0.12, duration: 0.4, type: 'spring' }}
            >
              <IconComponent className="w-4 h-4 text-white" />
              <span>{alert.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SolutionMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  
  const sidebarItems = [
    { icon: MessageSquare, label: t.problemSolution.sidebarItems.inbox, count: '0', active: true },
    { icon: Users, label: t.problemSolution.sidebarItems.crm },
    { icon: Bell, label: t.problemSolution.sidebarItems.reminders },
  ];
  
  const conversations = [
    { status: 'answered', icon: Check },
    { status: 'answered', icon: Check },
    { status: 'ai-draft', icon: Sparkles },
  ];
  
  const indicators = [
    { icon: Check, text: t.problemSolution.indicators.responseTime, className: 'i1' },
    { icon: Zap, text: t.problemSolution.indicators.aiDrafts, className: 'i2' },
    { icon: MessageSquare, text: t.problemSolution.indicators.singleInbox, className: 'i3' },
    { icon: Users, text: t.problemSolution.indicators.integratedCrm, className: 'i4' },
    { icon: Bell, text: t.problemSolution.indicators.autoReminders, className: 'i5' },
  ];
  
  const panelVariants = {
    hidden: { opacity: 0, x: -30, rotateY: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      rotateY: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
      }
    })
  };
  
  const indicatorVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: 0.8 + i * 0.12,
        type: 'spring' as const,
        stiffness: 300,
        damping: 20
      }
    })
  };
  
  if (prefersReducedMotion) {
    return (
      <div className="solution-mockup-card" ref={ref}>
        <div className="unified-inbox-preview">
          <div className="inbox-sidebar">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.label} className={`sidebar-item ${item.active ? 'active' : ''}`}>
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.count && <div className="count-badge">{item.count}</div>}
                </div>
              );
            })}
          </div>
          <div className="inbox-main">
            <div className="inbox-header-bar">
              <div className="platform-tabs">
                <span className="tab active">{t.problemSolution.tabs.all}</span>
                <span className="tab"><FaInstagram className="w-3 h-3 text-[#E1306C]" /></span>
                <span className="tab"><FaTiktok className="w-3 h-3 text-white" /></span>
                <span className="tab"><FaFacebook className="w-3 h-3 text-[#1877F2]" /></span>
                <span className="tab"><FaYoutube className="w-3 h-3 text-[#FF0000]" /></span>
              </div>
            </div>
            <div className="conversation-list-mini">
              {conversations.map((conv, i) => {
                const IconComponent = conv.icon;
                return (
                  <div key={i} className={`conv-item ${conv.status}`}>
                    <div className="conv-avatar" />
                    <div className="conv-content">
                      <div className="conv-name" />
                      <div className="conv-preview" />
                    </div>
                    <div className="conv-status">
                      <IconComponent className="w-3 h-3 text-[var(--landing-primary)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="inbox-detail">
            <div className="detail-header">
              <div className="customer-info">
                <div className="customer-avatar" />
                <div className="customer-meta">
                  <div className="customer-name" />
                  <div className="customer-platform"><Instagram className="w-3 h-3" /></div>
                </div>
              </div>
            </div>
            <div className="ai-response-preview">
              <div className="ai-badge"><Sparkles className="w-3 h-3" /><span>AI</span></div>
              <div className="response-lines"><div className="line" /><div className="line short" /></div>
              <button className="send-btn"><Send className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
        <div className="success-indicators">
          {indicators.map((ind) => {
            const IconComponent = ind.icon;
            return (
              <div key={ind.className} className={`indicator ${ind.className}`}>
                <IconComponent className="w-3 h-3" />
                <span>{ind.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  return (
    <Tilt3D maxTilt={6}>
      <div className="solution-mockup-card" ref={ref}>
        <div className="unified-inbox-preview">
          <motion.div
            className="inbox-sidebar"
            custom={0}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={panelVariants}
          >
            {sidebarItems.map((item, i) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.label}
                  className={`sidebar-item ${item.active ? 'active' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.count && <div className="count-badge">{item.count}</div>}
                </motion.div>
              );
            })}
          </motion.div>
          
          <motion.div
            className="inbox-main"
            custom={1}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={panelVariants}
          >
            <motion.div
              className="inbox-header-bar"
              initial={{ opacity: 0, y: -10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="platform-tabs">
                <span className="tab active">{t.problemSolution.tabs.all}</span>
                <span className="tab"><FaInstagram className="w-3 h-3 text-[#E1306C]" /></span>
                <span className="tab"><FaTiktok className="w-3 h-3 text-white" /></span>
                <span className="tab"><FaFacebook className="w-3 h-3 text-[#1877F2]" /></span>
                <span className="tab"><FaYoutube className="w-3 h-3 text-[#FF0000]" /></span>
              </div>
            </motion.div>
            
            <div className="conversation-list-mini">
              {conversations.map((conv, i) => {
                const IconComponent = conv.icon;
                return (
                  <motion.div
                    key={i}
                    className={`conv-item ${conv.status}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.12, duration: 0.4 }}
                  >
                    <div className="conv-avatar" />
                    <div className="conv-content">
                      <div className="conv-name" />
                      <div className="conv-preview" />
                    </div>
                    <div className="conv-status">
                      <IconComponent className="w-3 h-3 text-[var(--landing-primary)]" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
          
          <motion.div
            className="inbox-detail"
            custom={2}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={panelVariants}
          >
            <div className="detail-header">
              <div className="customer-info">
                <motion.div
                  className="customer-avatar"
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : {}}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 400 }}
                />
                <div className="customer-meta">
                  <motion.div
                    className="customer-name"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={inView ? { opacity: 1, scaleX: 1 } : {}}
                    transition={{ delay: 0.7, duration: 0.3 }}
                    style={{ transformOrigin: 'left' }}
                  />
                  <div className="customer-platform"><Instagram className="w-3 h-3" /></div>
                </div>
              </div>
            </div>
            <motion.div
              className="ai-response-preview"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.75, duration: 0.4 }}
            >
              <div className="ai-badge"><Sparkles className="w-3 h-3" /><span>IA</span></div>
              <div className="response-lines">
                <motion.div
                  className="line"
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ delay: 0.85, duration: 0.4 }}
                  style={{ transformOrigin: 'left' }}
                />
                <motion.div
                  className="line short"
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ delay: 0.95, duration: 0.3 }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
              <motion.button
                className="send-btn"
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : {}}
                transition={{ delay: 1.05, type: 'spring', stiffness: 400 }}
              >
                <Send className="w-3 h-3" />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
        
        <div className="success-indicators">
          {indicators.map((ind, i) => {
            const IconComponent = ind.icon;
            return (
              <motion.div
                key={ind.className}
                className={`indicator ${ind.className}`}
                custom={i}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={indicatorVariants}
              >
                <IconComponent className="w-3 h-3" />
                <span>{ind.text}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Tilt3D>
  );
}

function SolutionMockupMobile() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const [activeScreen, setActiveScreen] = useState(0);
  
  const platforms = [
    { icon: FaInstagram, color: '#E1306C', name: 'IG' },
    { icon: FaTiktok, color: '#000000', name: 'TT' },
    { icon: FaFacebook, color: '#1877F2', name: 'FB' },
    { icon: FaYoutube, color: '#FF0000', name: 'YT' },
  ];
  
  const benefits = [
    { icon: MessageSquare, text: t.problemSolution.indicators.singleInbox, key: 'inbox' },
    { icon: Sparkles, text: t.problemSolution.indicators.aiDrafts, key: 'ai' },
    { icon: Users, text: t.problemSolution.indicators.integratedCrm, key: 'crm' },
    { icon: Check, text: t.problemSolution.indicators.responseTime, key: 'speed' },
  ];

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, inView]);

  const screenVariants = {
    enter: { opacity: 0, x: 30, scale: 0.95 },
    center: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -30, scale: 0.95 }
  };

  const ScreenInbox = () => (
    <motion.div 
      className="solution-mobile-screen"
      key="inbox"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="solution-mobile-inbox">
        <div className="solution-mobile-conv">
          <div className="solution-mobile-avatar">
            <span className="solution-mobile-avatar-initials">M</span>
            <FaInstagram className="w-2.5 h-2.5" style={{ color: '#E1306C' }} />
          </div>
          <div className="solution-mobile-conv-content">
            <div className="solution-mobile-conv-name-text">{t.problemSolution.mockupMobile.conv1Name}</div>
            <div className="solution-mobile-conv-preview-text">{t.problemSolution.mockupMobile.conv1Preview}</div>
          </div>
          <div className="solution-mobile-conv-meta">
            <span className="solution-mobile-conv-time">{t.problemSolution.mockupMobile.conv1Time}</span>
            <div className="solution-mobile-conv-status answered"><Check className="w-3 h-3" /></div>
          </div>
        </div>
        <div className="solution-mobile-conv">
          <div className="solution-mobile-avatar">
            <span className="solution-mobile-avatar-initials">C</span>
            <FaTiktok className="w-2.5 h-2.5" style={{ color: '#000' }} />
          </div>
          <div className="solution-mobile-conv-content">
            <div className="solution-mobile-conv-name-text">{t.problemSolution.mockupMobile.conv2Name}</div>
            <div className="solution-mobile-conv-preview-text">{t.problemSolution.mockupMobile.conv2Preview}</div>
          </div>
          <div className="solution-mobile-conv-meta">
            <span className="solution-mobile-conv-time">{t.problemSolution.mockupMobile.conv2Time}</span>
            <div className="solution-mobile-conv-status"><MessageSquare className="w-3 h-3" /></div>
          </div>
        </div>
        <div className="solution-mobile-conv">
          <div className="solution-mobile-avatar">
            <span className="solution-mobile-avatar-initials">A</span>
            <FaFacebook className="w-2.5 h-2.5" style={{ color: '#1877F2' }} />
          </div>
          <div className="solution-mobile-conv-content">
            <div className="solution-mobile-conv-name-text">Ana Ruiz</div>
            <div className="solution-mobile-conv-preview-text">¿Tienen talla XL disponible?</div>
          </div>
          <div className="solution-mobile-conv-meta">
            <span className="solution-mobile-conv-time">5m</span>
            <div className="solution-mobile-conv-status"><MessageSquare className="w-3 h-3" /></div>
          </div>
        </div>
      </div>
      <div className="solution-mobile-screen-label">
        <MessageSquare className="w-4 h-4" />
        <span>{t.problemSolution.indicators.singleInbox}</span>
      </div>
    </motion.div>
  );

  const ScreenAI = () => (
    <motion.div 
      className="solution-mobile-screen"
      key="ai"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="solution-mobile-inbox">
        <div className="solution-mobile-conv ai-draft">
          <div className="solution-mobile-avatar">
            <span className="solution-mobile-avatar-initials">C</span>
            <FaTiktok className="w-2.5 h-2.5" style={{ color: '#000' }} />
          </div>
          <div className="solution-mobile-conv-content">
            <div className="solution-mobile-conv-name-text">{t.problemSolution.mockupMobile.conv2Name}</div>
            <div className="solution-mobile-conv-preview-text">{t.problemSolution.mockupMobile.conv2Preview}</div>
          </div>
          <div className="solution-mobile-conv-meta">
            <span className="solution-mobile-conv-time highlight">{t.problemSolution.mockupMobile.conv2Time}</span>
            <div className="solution-mobile-conv-status ai"><Sparkles className="w-3 h-3" /></div>
          </div>
        </div>
      </div>
      <div className="solution-mobile-ai-response">
        <div className="solution-mobile-ai-header">
          <div className="solution-mobile-ai-badge"><Sparkles className="w-3 h-3" /><span>IA</span></div>
          <span className="solution-mobile-ai-status">{t.problemSolution.mockupMobile.aiGenerating}</span>
        </div>
        <div className="solution-mobile-ai-text">{t.problemSolution.mockupMobile.aiDraftText}</div>
        <button className="solution-mobile-send-btn" data-testid="button-send-ai-draft-mobile">
          <Send className="w-3.5 h-3.5" /><span>{t.problemSolution.mockupMobile.clickToSend}</span>
        </button>
      </div>
    </motion.div>
  );

  const ScreenCRM = () => (
    <motion.div 
      className="solution-mobile-screen"
      key="crm"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="solution-mobile-crm">
        <div className="solution-mobile-crm-header">
          <div className="solution-mobile-avatar" style={{ width: 48, height: 48 }}>
            <span className="solution-mobile-avatar-initials" style={{ fontSize: 18 }}>M</span>
          </div>
          <div className="solution-mobile-crm-info">
            <div className="solution-mobile-conv-name-text" style={{ fontSize: 16 }}>{t.problemSolution.mockupMobile.conv1Name}</div>
            <div className="solution-mobile-conv-preview-text">maria.garcia@email.com</div>
          </div>
        </div>
        <div className="solution-mobile-crm-stats">
          <div className="solution-mobile-crm-stat">
            <span className="crm-stat-value">8</span>
            <span className="crm-stat-label">Chats</span>
          </div>
          <div className="solution-mobile-crm-stat">
            <span className="crm-stat-value">$1.2k</span>
            <span className="crm-stat-label">Value</span>
          </div>
          <div className="solution-mobile-crm-stat">
            <span className="crm-stat-value">VIP</span>
            <span className="crm-stat-label">Status</span>
          </div>
        </div>
        <div className="solution-mobile-crm-tags">
          <span className="crm-tag vip">VIP</span>
          <span className="crm-tag">Recurring</span>
          <span className="crm-tag">Instagram</span>
        </div>
      </div>
      <div className="solution-mobile-screen-label">
        <Users className="w-4 h-4" />
        <span>{t.problemSolution.indicators.integratedCrm}</span>
      </div>
    </motion.div>
  );

  const ScreenSpeed = () => (
    <motion.div 
      className="solution-mobile-screen"
      key="speed"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="solution-mobile-speed">
        <div className="solution-mobile-speed-metric">
          <Clock className="w-5 h-5 text-[var(--landing-primary)]" />
          <div className="speed-value">2m</div>
          <div className="speed-label">{t.problemSolution.indicators.responseTime}</div>
        </div>
        <div className="solution-mobile-speed-comparison">
          <div className="speed-compare-item">
            <span className="speed-compare-label">Before</span>
            <div className="speed-compare-bar old" style={{ width: '100%' }}></div>
            <span className="speed-compare-value">4h avg</span>
          </div>
          <div className="speed-compare-item">
            <span className="speed-compare-label">Now</span>
            <div className="speed-compare-bar new" style={{ width: '15%' }}></div>
            <span className="speed-compare-value highlight">2m avg</span>
          </div>
        </div>
        <div className="solution-mobile-speed-badge">
          <Zap className="w-4 h-4" />
          <span>120x Faster</span>
        </div>
      </div>
    </motion.div>
  );

  const screens = [ScreenInbox, ScreenAI, ScreenCRM, ScreenSpeed];

  if (prefersReducedMotion) {
    return (
      <div className="solution-mockup-mobile" ref={ref}>
        <div className="solution-mobile-tabs">
          <div className="solution-mobile-tab active">{t.problemSolution.tabs.all}</div>
          {platforms.map((platform) => {
            const IconComponent = platform.icon;
            return (
              <div key={platform.name} className="solution-mobile-tab">
                <IconComponent className={`w-3.5 h-3.5 ${platform.name === 'TT' ? 'tiktok-icon' : ''}`}
                  style={platform.name !== 'TT' ? { color: platform.color } : undefined} />
              </div>
            );
          })}
        </div>
        <ScreenInbox />
        <div className="solution-mobile-benefits">
          {benefits.map((benefit, i) => {
            const IconComponent = benefit.icon;
            return (
              <div key={i} className={`solution-mobile-benefit ${i === 0 ? 'active' : ''}`}>
                <IconComponent className="w-3.5 h-3.5" /><span>{benefit.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const ActiveScreen = screens[activeScreen];

  return (
    <div className="solution-mockup-mobile" ref={ref}>
      <motion.div 
        className="solution-mobile-tabs"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="solution-mobile-tab active"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.1 }}
        >{t.problemSolution.tabs.all}</motion.div>
        {platforms.map((platform, i) => {
          const IconComponent = platform.icon;
          return (
            <motion.div key={platform.name} className="solution-mobile-tab"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 400 }}
            >
              <IconComponent className={`w-3.5 h-3.5 ${platform.name === 'TT' ? 'tiktok-icon' : ''}`}
                style={platform.name !== 'TT' ? { color: platform.color } : undefined} />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="solution-mobile-screens-container">
        <AnimatePresence mode="wait">
          <ActiveScreen />
        </AnimatePresence>
      </div>

      <div className="solution-mobile-benefits">
        {benefits.map((benefit, i) => {
          const IconComponent = benefit.icon;
          const isActive = i === activeScreen;
          return (
            <motion.div
              key={benefit.key}
              className={`solution-mobile-benefit ${isActive ? 'active' : ''}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={inView ? { 
                opacity: 1, 
                y: 0, 
                scale: isActive ? 1.05 : 1,
              } : {}}
              transition={{ delay: 0.7 + i * 0.1, type: 'spring', stiffness: 300 }}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{benefit.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll({ 
    target: sectionRef, 
    offset: ['start end', 'end start'] 
  });
  
  const problemY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -50]);
  const solutionY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [150, -30]);
  const problemOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0.5]);
  const solutionOpacity = useTransform(scrollYProgress, [0, 0.25, 0.8, 1], [0, 1, 1, 0.5]);

  return (
    <section id="problem-solution" ref={sectionRef} className="relative overflow-hidden">
      {/* Problem Section */}
      <div className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div 
            style={{ y: problemY, opacity: problemOpacity }}
            className="problem-side text-center"
          >
            <span className="text-sm uppercase tracking-[0.25em] text-white/40 font-semibold mb-4 block">
              {t.problemSolution.problemLabel}
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-16 leading-tight flex flex-col items-center gap-y-2">
              <span>{t.problemSolution.problemTitle}</span>
              <span className="w-full flex justify-center">
                <SmokeDissolveText />
              </span>
            </h2>
            {/* Desktop mockup - hidden on mobile */}
            <div className="max-w-3xl mx-auto hidden md:block">
              <ProblemMockup />
            </div>
            {/* Mobile mockup - visible only on mobile */}
            <div className="md:hidden">
              <ProblemMockupMobile />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            style={{ y: solutionY, opacity: solutionOpacity }}
            className="solution-side text-center"
          >
            <span className="text-sm uppercase tracking-[0.25em] text-[var(--landing-primary)] font-semibold mb-4 block">
              {t.problemSolution.solutionLabel}
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-16 leading-tight flex flex-col items-center gap-y-2">
              <span>{t.problemSolution.solutionTitle}</span>
              <span className="w-full flex justify-center">
                <SolutionAnimatedText />
              </span>
            </h2>
            {/* Desktop mockup - hidden on mobile */}
            <div className="max-w-4xl mx-auto hidden md:block">
              <SolutionMockup />
            </div>
            {/* Mobile mockup - visible only on mobile */}
            <div className="md:hidden">
              <SolutionMockupMobile />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

type SmokeTextProps = {
  words: string[];
  colorClass: string;
  glowColor: string;
  centered?: boolean;
};

function SmokeDissolveTextGeneric({ words, colorClass, glowColor, centered = false }: SmokeTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, words.length]);
  
  const currentWord = words[currentIndex];
  const letters = currentWord.split('');
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);
  
  if (prefersReducedMotion) {
    return <span className={colorClass}>{currentWord}</span>;
  }
  
  return (
    <span 
      className="inline-block relative"
      style={{ verticalAlign: 'baseline' }}
    >
      <span 
        className="invisible"
        aria-hidden="true"
      >
        {longestWord}
      </span>
      
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          className={`inline-flex ${colorClass}`}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ 
            position: 'absolute',
            left: centered ? '50%' : 0,
            top: 0,
            transform: centered ? 'translateX(-50%)' : 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {letters.map((letter, i) => (
            <motion.span
              key={`${currentIndex}-${i}`}
              className="inline-block"
              style={{ 
                willChange: "transform, opacity, filter",
                textShadow: `0 0 20px ${glowColor}`
              }}
              variants={{
                hidden: { 
                  opacity: 0, 
                  y: 20,
                  filter: "blur(12px)",
                  scale: 0.8,
                },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  filter: "blur(0px)",
                  scale: 1,
                  transition: {
                    duration: 0.5,
                    delay: i * 0.04,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }
                },
                exit: { 
                  opacity: 0, 
                  y: -30,
                  x: (i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 15),
                  filter: "blur(16px)",
                  scale: 1.3,
                  rotate: (i % 2 === 0 ? 1 : -1) * (5 + i * 2),
                  transition: {
                    duration: 0.6,
                    delay: i * 0.03,
                    ease: [0.55, 0.085, 0.68, 0.53]
                  }
                }
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function SmokeDissolveText() {
  const { t } = useLanguage();
  return (
    <SmokeDissolveTextGeneric 
      words={t.problemSolution.problemWords} 
      colorClass="text-red-400/80" 
      glowColor="rgba(248,113,113,0.4)"
      centered={true}
    />
  );
}

function SolutionAnimatedText() {
  const { t } = useLanguage();
  return (
    <SmokeDissolveTextGeneric 
      words={t.problemSolution.solutionWords} 
      colorClass="text-blue-400" 
      glowColor="rgba(96,165,250,0.5)"
      centered={true}
    />
  );
}

const ENTRY_DIRECTIONS = [
  { x: -100, y: 0 },
  { x: 0, y: 100 },
  { x: 100, y: 0 },
  { x: -100, y: 0 },
  { x: 0, y: -100 },
];

function AnimatedDigit({ char, index }: { char: string; index: number }) {
  const direction = ENTRY_DIRECTIONS[index % ENTRY_DIRECTIONS.length];

  return (
    <motion.span
      initial={{ opacity: 0, x: direction.x, y: direction.y, scale: 0.5 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -direction.x, y: -direction.y, scale: 0.5 }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 18,
        mass: 0.6,
        delay: index * 0.05,
      }}
      className="inline-block"
      style={{ willChange: "transform, opacity" }}
    >
      {char}
    </motion.span>
  );
}

function AnimatedStatValue({ value, statKey }: { value: string; statKey: number }) {
  const chars = value.split('');
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={statKey}
        className="inline-flex items-baseline justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {chars.map((char, i) => (
          <AnimatedDigit key={`${statKey}-${i}-${char}`} char={char} index={i} />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

function ExpandingRipple({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400/40"
      initial={{ width: 80, height: 80, opacity: 0.7 }}
      animate={{ 
        width: [80, 1000], 
        height: [80, 1000], 
        opacity: [0.6, 0] 
      }}
      transition={{
        duration: 5,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut"
      }}
    />
  );
}

import { LucideIcon } from 'lucide-react';
import { Clock4, ThumbsUp, CheckCircle, Zap as ZapIcon, MessageSquare as MsgSquare, Send as SendIcon, Heart as HeartIcon, Inbox as InboxIcon, Users2 as UsersIcon, TrendingUp, BarChart3, Sparkles as SparklesIcon, Bot, Moon, MessageCircle, Clock3, Rocket, Star, Timer, UserCircle, BellRing, MessageSquareText, BarChart2 as BarChartIcon } from 'lucide-react';

type FloatingElementConfig = {
  component: React.ReactNode;
  position: { x: string; y: string };
  delay: number;
};

function FloatingUIElement({ config }: { config: FloatingElementConfig }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: config.position.x, top: config.position.y }}
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -20 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: config.delay,
      }}
    >
      {config.component}
    </motion.div>
  );
}

function TimeSavedCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-orange-500/20 border border-orange-200/50" style={{ width: 140 }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
          <Timer className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-600">{t.floatingCards.time}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 line-through">4h</span>
        <span className="text-lg">→</span>
        <span className="text-xl font-bold text-orange-500">45min</span>
      </div>
    </div>
  );
}

function RespondidoBadge({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-gradient-to-r from-emerald-400 to-green-500 rounded-full px-4 py-2 shadow-lg shadow-green-500/30 flex items-center gap-2">
      <CheckCircle className="w-4 h-4 text-white" />
      <span className="text-white text-sm font-semibold">{t.floatingCards.responded}</span>
    </div>
  );
}

function AvatarWithStatus({ imageSrc, name, status, t }: { imageSrc: string; name: string; status: 'online' | 'busy'; t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-purple-500/20 border border-purple-200/50 flex items-center gap-3" style={{ width: 160 }}>
      <div className="relative">
        <img src={imageSrc} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-800">{name}</div>
        <div className="text-xs text-gray-500">{status === 'online' ? t.floatingCards.online : t.floatingCards.busy}</div>
      </div>
    </div>
  );
}

function SpeedIndicator({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-cyan-500 rounded-2xl p-4 shadow-lg shadow-cyan-500/30" style={{ width: 110 }}>
      <Rocket className="w-6 h-6 text-white mb-2" />
      <div className="text-2xl font-black text-white">10x</div>
      <div className="text-xs text-white font-medium">{t.floatingCards.faster}</div>
    </div>
  );
}

function ChatBubbleTyping({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-blue-500/20 border border-blue-200/50" style={{ width: 180 }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
          <MsgSquare className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-600">{t.floatingCards.newMessage}</span>
      </div>
      <div className="bg-gray-100 rounded-xl p-2 flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

function QuickReplyPill({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-full px-5 py-3 shadow-lg shadow-purple-500/30 flex items-center gap-2">
      <ZapIcon className="w-4 h-4 text-yellow-300" />
      <span className="text-white text-sm font-semibold">{t.floatingCards.aiReply}</span>
    </div>
  );
}

function SendButtonCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-green-500/20 border border-green-200/50 flex items-center gap-3" style={{ width: 170 }}>
      <div className="flex-1 h-9 bg-gray-100 rounded-xl flex items-center px-3">
        <span className="text-xs text-gray-400">{t.floatingCards.write}</span>
      </div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shrink-0">
        <SendIcon className="w-4 h-4 text-white ml-0.5" />
      </div>
    </div>
  );
}

function NotificationCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-rose-500 rounded-2xl p-3 shadow-lg shadow-rose-500/30 flex items-center gap-3" style={{ width: 170 }}>
      <Bell className="w-5 h-5 text-white" />
      <div>
        <div className="text-sm font-semibold text-white">3 {t.floatingCards.newCount}</div>
        <div className="text-xs text-white font-medium">{t.floatingCards.messages}</div>
      </div>
    </div>
  );
}

function AvatarStack({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-cyan-500/20 border border-cyan-200/50" style={{ width: 150 }}>
      <div className="flex -space-x-3 mb-2">
        <img src={avatarMaria} alt="" className="w-10 h-10 rounded-full border-2 border-white object-cover shrink-0" />
        <img src={avatarCarlos} alt="" className="w-10 h-10 rounded-full border-2 border-white object-cover shrink-0" />
        <img src={avatarAna} alt="" className="w-10 h-10 rounded-full border-2 border-white object-cover shrink-0" />
        <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">+12</div>
      </div>
      <div className="text-xs text-gray-500">{t.floatingCards.activeTeam}</div>
    </div>
  );
}

function GrowthCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-emerald-500 rounded-2xl p-4 shadow-lg shadow-emerald-500/30" style={{ width: 130 }}>
      <TrendingUp className="w-5 h-5 text-white mb-1" />
      <div className="text-2xl font-black text-white">+247</div>
      <div className="text-xs text-white font-medium">{t.floatingCards.leadsToday}</div>
    </div>
  );
}

function StarRatingCard() {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-yellow-500/20 border border-yellow-200/50 flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
      </div>
      <span className="text-sm font-bold text-gray-700">4.9</span>
    </div>
  );
}

function LeadCounterCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-violet-600 rounded-2xl p-4 shadow-lg shadow-violet-500/30" style={{ width: 140 }}>
      <UsersIcon className="w-5 h-5 text-white mb-1" />
      <div className="text-2xl font-black text-white">1,847</div>
      <div className="text-xs text-white font-medium">{t.floatingCards.contacts}</div>
    </div>
  );
}

function AIAutopilotCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-violet-500/20 border border-violet-200/50" style={{ width: 160 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">{t.floatingCards.aiActive}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-12 h-6 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 p-0.5 flex items-center justify-end">
          <div className="w-5 h-5 rounded-full bg-white shadow" />
        </div>
        <span className="text-xs text-green-500 font-medium">ON</span>
      </div>
    </div>
  );
}

function MoonSunToggle({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-indigo-600 rounded-2xl p-4 shadow-lg shadow-indigo-500/30 flex items-center gap-3" style={{ width: 130 }}>
      <Moon className="w-6 h-6 text-yellow-300" />
      <div>
        <div className="text-sm font-bold text-white">24/7</div>
        <div className="text-xs text-white font-medium">{t.floatingCards.active}</div>
      </div>
    </div>
  );
}

function AITypingCard({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-purple-500/20 border border-purple-200/50" style={{ width: 180 }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
          <SparklesIcon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-600">{t.floatingCards.aiTyping}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full animate-pulse" style={{ width: '70%' }} />
      </div>
    </div>
  );
}

function AutoReplyStatus({ t }: { t: ReturnType<typeof useLanguage>['t'] }) {
  return (
    <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full px-4 py-2 shadow-lg shadow-green-500/30 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span className="text-white text-sm font-semibold">{t.floatingCards.autoReply}</span>
    </div>
  );
}

function getStatFloatingElements(t: ReturnType<typeof useLanguage>['t']): { [key: number]: FloatingElementConfig[] } {
  return {
    0: [
      { component: <TimeSavedCard t={t} />, position: { x: '10%', y: '12%' }, delay: 0.05 },
      { component: <AvatarWithStatus imageSrc={avatarMaria} name="María G." status="online" t={t} />, position: { x: '72%', y: '8%' }, delay: 0.1 },
      { component: <RespondidoBadge t={t} />, position: { x: '12%', y: '72%' }, delay: 0.15 },
      { component: <SpeedIndicator t={t} />, position: { x: '78%', y: '66%' }, delay: 0.12 },
    ],
    1: [
      { component: <ChatBubbleTyping t={t} />, position: { x: '8%', y: '10%' }, delay: 0.05 },
      { component: <QuickReplyPill t={t} />, position: { x: '74%', y: '12%' }, delay: 0.1 },
      { component: <SendButtonCard t={t} />, position: { x: '10%', y: '68%' }, delay: 0.15 },
      { component: <NotificationCard t={t} />, position: { x: '74%', y: '66%' }, delay: 0.12 },
    ],
    2: [
      { component: <AvatarStack t={t} />, position: { x: '10%', y: '10%' }, delay: 0.05 },
      { component: <GrowthCard t={t} />, position: { x: '78%', y: '8%' }, delay: 0.1 },
      { component: <LeadCounterCard t={t} />, position: { x: '12%', y: '66%' }, delay: 0.15 },
      { component: <StarRatingCard />, position: { x: '76%', y: '70%' }, delay: 0.12 },
    ],
    3: [
      { component: <AIAutopilotCard t={t} />, position: { x: '10%', y: '10%' }, delay: 0.05 },
      { component: <MoonSunToggle t={t} />, position: { x: '78%', y: '10%' }, delay: 0.1 },
      { component: <AITypingCard t={t} />, position: { x: '8%', y: '66%' }, delay: 0.15 },
      { component: <AutoReplyStatus t={t} />, position: { x: '74%', y: '70%' }, delay: 0.12 },
    ],
  };
}

function MobileStatBadge({ icon: Icon, text, color }: { icon: React.ElementType; text: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl ${color}`} style={{ color: 'white' }}>
      <Icon className="w-4 h-4" style={{ color: 'white' }} />
      <span className="font-semibold text-sm" style={{ color: 'white' }}>{text}</span>
    </div>
  );
}

function getMobileStatElements(t: ReturnType<typeof useLanguage>['t'], activeIndex: number) {
  const elements: { [key: number]: { top: React.ReactNode; bottom: React.ReactNode } } = {
    0: {
      top: <MobileStatBadge icon={Timer} text={t.floatingCards.time} color="bg-gradient-to-r from-orange-400 to-red-500" />,
      bottom: <MobileStatBadge icon={CheckCircle} text={t.floatingCards.responded} color="bg-gradient-to-r from-emerald-400 to-green-500" />,
    },
    1: {
      top: <MobileStatBadge icon={MsgSquare} text={t.floatingCards.newMessage} color="bg-gradient-to-r from-blue-400 to-indigo-500" />,
      bottom: <MobileStatBadge icon={SendIcon} text={t.floatingCards.write} color="bg-gradient-to-r from-violet-500 to-purple-600" />,
    },
    2: {
      top: <MobileStatBadge icon={TrendingUp} text={t.floatingCards.leadsToday} color="bg-gradient-to-r from-green-400 to-teal-500" />,
      bottom: <MobileStatBadge icon={Star} text="5.0" color="bg-gradient-to-r from-yellow-400 to-orange-500" />,
    },
    3: {
      top: <MobileStatBadge icon={Bot} text={t.floatingCards.aiActive} color="bg-gradient-to-r from-purple-400 to-pink-500" />,
      bottom: <MobileStatBadge icon={Moon} text={t.floatingCards.autoReply} color="bg-gradient-to-r from-indigo-400 to-blue-500" />,
    },
  };
  return elements[activeIndex] || elements[0];
}

function MetricSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useLanguage();
  
  const scale = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], prefersReducedMotion ? [1, 1] : [0, 1]);
  
  const stats = t.metrics.stats;
  
  useEffect(() => {
    if (prefersReducedMotion || !isInView) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, isInView, stats.length]);
  
  const currentStat = stats[activeIndex];
  const floatingElements = getStatFloatingElements(t);
  const currentElements = floatingElements[activeIndex] || [];
  const mobileElements = getMobileStatElements(t, activeIndex);

  return (
    <section id="metrics" ref={ref} className="py-40 md:py-64 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,145,250,0.12)_0%,transparent_70%)]" />
      
      {!prefersReducedMotion && isInView && (
        <div className="absolute inset-0 pointer-events-none">
          <ExpandingRipple delay={0} />
          <ExpandingRipple delay={1.6} />
          <ExpandingRipple delay={3.2} />
        </div>
      )}
      
      {/* Desktop floating elements */}
      <AnimatePresence mode="wait">
        {!prefersReducedMotion && (
          <motion.div 
            key={`elements-${activeIndex}`}
            className="absolute inset-0 pointer-events-none hidden md:block"
          >
            {currentElements.map((element, i) => (
              <FloatingUIElement
                key={`${activeIndex}-${i}`}
                config={element}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile floating badges */}
      <AnimatePresence mode="wait">
        {!prefersReducedMotion && isInView && (
          <motion.div
            key={`mobile-elements-${activeIndex}`}
            className="absolute inset-x-0 top-4 flex justify-center md:hidden pointer-events-none z-40"
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {mobileElements.top}
          </motion.div>
        )}
      </AnimatePresence>
      
      
      <motion.div 
        style={{ scale, opacity }}
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
      >
        <div className="font-display font-black text-[20vw] md:text-[16vw] leading-none text-white mb-6 h-[1.1em] flex items-center justify-center overflow-hidden">
          {prefersReducedMotion ? (
            <span>{currentStat.value}</span>
          ) : (
            <AnimatedStatValue value={currentStat.value} statKey={activeIndex} />
          )}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              {currentStat.title}
            </h2>
            <p className="text-white/50 text-xl max-w-xl mx-auto mb-12">
              {currentStat.description}
            </p>
          </motion.div>
        </AnimatePresence>
        
        <div className="flex justify-center gap-2 mt-8">
          {stats.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeIndex === i 
                  ? 'bg-[var(--landing-primary)] w-6' 
                  : 'bg-[var(--landing-primary)]/40 hover:bg-[var(--landing-primary)]/60 w-2.5'
              }`}
              aria-label={`${t.metrics.viewStatistic} ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function HowItWorksMobile() {
  const [activeStep, setActiveStep] = useState(0);
  const { t } = useLanguage();
  const stepMockups = [<Step1ConnectMockup />, <Step2AIMockup />, <Step3SendMockup />];
  const steps = t.howItWorks.steps;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section id="how" className="py-12 md:py-16 px-4 relative overflow-hidden mt-8 md:mt-12">
      <div className="text-center mb-8">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--landing-primary)] font-semibold mb-3 block">
          {t.howItWorks.label}
        </span>
        <h2 className="font-display text-2xl font-bold text-[var(--landing-text)] leading-tight">
          {t.howItWorks.title} <span className="text-[var(--landing-text-muted)]">{t.howItWorks.titleHighlight}</span>
        </h2>
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`w-10 h-10 rounded-full font-display font-bold text-sm transition-all duration-300 ${
              activeStep === i
                ? 'bg-[var(--landing-primary)] text-white scale-110 shadow-lg shadow-[var(--landing-primary)]/30'
                : 'bg-black/10 text-[var(--landing-text-muted)] hover:bg-black/20'
            }`}
          >
            {step.number}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl overflow-hidden mx-auto max-w-sm min-h-[380px]">
        <LiquidBackground 
          colorStart="#06b6d4"
          colorMid="#14b8a6"
          colorEnd="#ffffff"
          speed={0.08}
          scale={0.75}
          className="rounded-2xl"
        />
        
        {/* All slides rendered simultaneously - only opacity changes to prevent layout shifts */}
        <div className="relative z-10 min-h-[340px]">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{ 
                opacity: activeStep === i ? 1 : 0,
                pointerEvents: activeStep === i ? 'auto' : 'none'
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 p-6"
              style={{ position: i === 0 ? 'relative' : 'absolute' }}
            >
              <h3 className="font-display text-xl font-bold text-white text-center mb-4">
                {step.title}
              </h3>
              
              <div className="flex justify-center">
                <div className="w-56 h-auto min-h-[240px]">
                  {stepMockups[i]}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
          <motion.div
            className="h-full bg-[var(--landing-primary)]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
            key={activeStep}
          />
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeStep === i 
                ? 'bg-[var(--landing-primary)] w-6' 
                : 'bg-black/20 w-2'
            }`}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const checkpointsRef = useRef<(HTMLDivElement | null)[]>([]);
  const prefersReducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const { t } = useLanguage();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useGSAP(() => {
    if (prefersReducedMotion || isMobile || !containerRef.current || !sectionRef.current) return;
    
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
            const effectiveScrollRatio = (totalSteps * scrollPerStep) / totalScrollDistance;
            const effectiveProgress = Math.min(progress / effectiveScrollRatio, 1);
            const stepIndex = Math.min(Math.floor(effectiveProgress * totalSteps), totalSteps - 1);
            setActiveStep(stepIndex);
            
            if (progressFillRef.current) {
              gsap.set(progressFillRef.current, { width: `${effectiveProgress * 100}%` });
            }
            
            checkpointsRef.current.forEach((checkpoint, i) => {
              if (!checkpoint) return;
              const stepThreshold = (i + 1) / totalSteps;
              const isCompleted = effectiveProgress >= stepThreshold - 0.01;
              if (isCompleted) {
                checkpoint.classList.add('completed');
              } else {
                checkpoint.classList.remove('completed');
              }
            });
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
  }, { scope: sectionRef, dependencies: [isMobile] });

  const stepMockups = [<Step1ConnectMockup />, <Step2AIMockup />, <Step3SendMockup />];

  if (isMobile) {
    return <HowItWorksMobile />;
  }

  if (prefersReducedMotion) {
    return (
      <section id="how" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-sm uppercase tracking-[0.25em] text-[var(--landing-primary)] font-semibold mb-4 block">
              {t.howItWorks.label}
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white">
              {t.howItWorks.title} <span className="text-white/60">{t.howItWorks.titleHighlight}</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {t.howItWorks.steps.map((step, i) => (
              <div key={step.number} className="how-card">
                <div className="card-inner">
                  <span className="step-number">{step.number}</span>
                  <h3 className="font-display text-2xl font-bold text-white mt-4 mb-3">{step.title}</h3>
                  <p className="text-white/50 text-base leading-relaxed mb-6">{step.description}</p>
                  <div className="step-mockup-container">{stepMockups[i]}</div>
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
          <span className="text-sm uppercase tracking-[0.25em] text-[var(--landing-primary)] font-semibold mb-4 block">
            {t.howItWorks.label}
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-8">
            {t.howItWorks.title} <span className="text-white/60">{t.howItWorks.titleHighlight}</span>
          </h2>
        </div>

        <div className="how-steps-wrapper relative">
          <LiquidBackground 
            colorStart="#06b6d4"
            colorMid="#14b8a6"
            colorEnd="#ffffff"
            speed={0.08}
            scale={0.75}
          />
          {t.howItWorks.steps.map((step, i) => (
            <div 
              key={step.number} 
              className={`how-step-panel ${activeStep === i ? 'active' : ''}`}
            >
              <div className="how-step-content">
                <div className="how-step-info">
                  <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-white text-lg md:text-xl leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>
                <div className="how-step-mockup">
                  {stepMockups[i]}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="how-scroll-progress">
          <div className="how-scroll-progress-bar">
            <div 
              ref={progressFillRef}
              className="how-scroll-progress-fill"
              style={{ width: '0%' }}
            />
          </div>
          <div className="how-scroll-checkmarks">
            {t.howItWorks.steps.map((_, i) => (
              <div
                key={i}
                ref={(el) => { checkpointsRef.current[i] = el; }}
                className="how-scroll-checkpoint"
              >
                <div className="checkpoint-check">
                  <Check className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const [mobileSlide, setMobileSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const featureMockups = [
    <FeatureInboxMockup />,
    <FeatureMultiAgentMockup />,
    <FeatureAIMockup />,
    <FeatureCRMMockup />,
    <FeatureReminderMockup />,
    <FeatureCommentsMockup />,
    <FeatureAnalyticsMockup />,
  ];

  const FeatureIcons = [
    InboxIcon,
    UsersIcon,
    SparklesIcon,
    UserCircle,
    BellRing,
    MessageSquareText,
    BarChartIcon,
  ];

  const featureSizes = ['medium', 'medium', 'small', 'small', 'medium', 'medium', 'medium'];

  const mobileSlides = [
    [0],
    [1],
    [2, 3],
    [4],
    [5],
    [6],
  ];

  const nextSlide = () => setMobileSlide((prev) => (prev + 1) % mobileSlides.length);
  const prevSlide = () => setMobileSlide((prev) => (prev - 1 + mobileSlides.length) % mobileSlides.length);

  const renderFeatureCard = (feature: typeof t.features.items[0], i: number, forMobile = false) => (
    <div
      key={feature.title}
      className={`feature-card ${forMobile ? 'mobile-feature-card' : `bento-${featureSizes[i]}`}`}
    >
      <div className="feature-card-inner">
        <div className="feature-icon-wrapper overflow-hidden bg-transparent flex items-center justify-center">
          {React.createElement(FeatureIcons[i], { className: "w-8 h-8 text-[var(--landing-primary)]" })}
        </div>
        <h3 className="font-display text-xl font-bold text-white mt-4 mb-2">{feature.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
        {featureMockups[i] && (
          <div className="feature-mockup-area">
            {featureMockups[i]}
          </div>
        )}
      </div>
    </div>
  );

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
          <span className="text-sm uppercase tracking-[0.25em] text-[var(--landing-primary)] font-semibold mb-4 block">
            {t.features.label}
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6">
            {t.features.title} <span className="text-white/60">{t.features.titleHighlight}</span>
          </h2>
          <p className="text-white/50 text-xl max-w-2xl mx-auto">
            {t.features.description}
          </p>
        </motion.div>

        {isMobile ? (
          <div className="features-mobile-carousel">
            <div className="features-carousel-container">
              {mobileSlides.map((slideIndices, slideIdx) => (
                <motion.div
                  key={slideIdx}
                  className="features-carousel-slide"
                  initial={false}
                  animate={{
                    opacity: mobileSlide === slideIdx ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ 
                    display: mobileSlide === slideIdx ? 'block' : 'none',
                  }}
                >
                  <div className="features-slide-cards">
                    {slideIndices.map((i) => renderFeatureCard(t.features.items[i], i, true))}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="features-carousel-nav">
              <button
                onClick={prevSlide}
                className="features-nav-arrow"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="features-nav-counter">{mobileSlide + 1} / {mobileSlides.length}</span>
              <button
                onClick={nextSlide}
                className="features-nav-arrow"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bento-grid">
            {t.features.items.map((feature, i) => renderFeatureCard(feature, i))}
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialSection() {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const { t, language } = useLanguage();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const quoteY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -100]);
  const quoteRotate = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-5, 5]);

  const testimonialImages = [testimonialBettys, avatarCarlos, avatarAna];

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % t.testimonials.items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, t.testimonials.items.length]);

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
          {t.testimonials.items.map((testimonial, idx) => (
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
                  src={testimonialImages[idx]} 
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
          {t.testimonials.items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`testimonial-dot ${activeIndex === idx ? 'active' : ''}`}
              aria-label={`${t.testimonials.viewTestimonial} ${idx + 1}`}
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
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -50]);

  return (
    <section id="cta" ref={ref} className="relative border-t border-white/5 overflow-hidden">
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
              {t.cta.titleLine1}<br />
              <span className="text-outline hover:text-white transition-colors duration-500 cursor-default">{t.cta.titleLine2}</span>
            </h2>
            <p className="text-white/50 text-xl md:text-2xl max-w-lg">
              {t.cta.description}
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
            <span className="font-display text-xl">{t.cta.button}</span>
            <ArrowRight className="w-6 h-6" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="section-dark border-t border-white/5">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {Object.entries(t.footer.categories).map(([category, items]) => (
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
          <span>{t.footer.copyright}</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors" data-testid="link-footer-privacy">{t.footer.privacy}</a>
            <a href="#" className="hover:text-white transition-colors" data-testid="link-footer-terms">{t.footer.terms}</a>
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
