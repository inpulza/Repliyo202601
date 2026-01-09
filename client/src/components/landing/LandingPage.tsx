import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, Check, X, Sparkles, Inbox, Users, Bell, MessageSquare, BarChart2, Instagram, Music2, Facebook } from 'lucide-react';
import '../../styles/landing.css';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const fadeInUpReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const staggerContainerReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } }
};

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

  return <span ref={ref} className="counter-number">{count}</span>;
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      setDisplayText(text);
      return;
    }
    const timeout = setTimeout(() => {
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timer);
        }
      }, 40);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [isInView, text, delay, prefersReducedMotion]);

  return <span ref={ref}>{displayText}{!prefersReducedMotion && <span className="animate-pulse">|</span>}</span>;
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
        scrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/5' : ''
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
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [1, 0]);

  const containerVariants = prefersReducedMotion ? staggerContainerReduced : staggerContainer;
  const itemVariants = prefersReducedMotion ? fadeInUpReduced : fadeInUp;

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5 opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5 opacity-20" />
      
      <motion.div style={prefersReducedMotion ? {} : { y, opacity }} className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8"
        >
          <Sparkles className="w-4 h-4 text-[var(--landing-accent)]" />
          <span className="text-sm text-white/70">Respuestas IA personalizadas</span>
        </motion.div>

        <motion.h1 
          className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.span variants={itemVariants} className="block text-white">Responde más rápido.</motion.span>
          <motion.span variants={itemVariants} className="block text-gradient">Vende más.</motion.span>
          <motion.span variants={itemVariants} className="block text-white/40">Con IA.</motion.span>
        </motion.h1>

        <motion.p 
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.4, duration: 0.6 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Unifica todos tus DMs y comentarios de Instagram, TikTok y Facebook en un inbox inteligente que responde automáticamente.
        </motion.p>

        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <a href="/login" className="btn-primary" data-testid="button-empezar-gratis-hero">
            Empezar gratis <ArrowRight className="w-4 h-4" />
          </a>
          <button className="btn-secondary" data-testid="button-ver-demo">
            <Play className="w-4 h-4" /> Ver demo
          </button>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.6, duration: 0.6 }}
          className="flex items-center justify-center gap-6 text-white/40 text-sm"
        >
          <span>Conecta:</span>
          <div className="flex items-center gap-4">
            <Instagram className="w-5 h-5 text-pink-500" />
            <Music2 className="w-5 h-5 text-white" />
            <Facebook className="w-5 h-5 text-blue-500" />
          </div>
        </motion.div>
      </motion.div>

      {!prefersReducedMotion && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent"
          />
        </div>
      )}
    </section>
  );
}

function MarqueeSection() {
  const prefersReducedMotion = useReducedMotion();
  const items = ['DMs', 'Comentarios', 'Respuestas IA', 'Recordatorios', 'CRM', 'Analytics', 'Multi-plataforma'];
  
  return (
    <section className="py-8 border-y border-white/5 bg-[#080808]">
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
    </section>
  );
}

function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();
  const containerVariants = prefersReducedMotion ? staggerContainerReduced : staggerContainer;
  const itemVariants = prefersReducedMotion ? fadeInUpReduced : fadeInUp;

  const problems = [
    'Saltar entre Instagram, TikTok y Facebook todo el día',
    'Olvidar responder mensajes de clientes potenciales',
    'Copiar y pegar las mismas respuestas una y otra vez',
    'Perder ventas porque los leads se enfrían sin seguimiento'
  ];

  const solutions = [
    'Todos tus mensajes en una sola pantalla',
    'La IA genera respuestas personalizadas en segundos',
    'Recordatorios automáticos para leads sin respuesta',
    'CRM integrado para conocer a cada cliente'
  ];

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-red-500 font-semibold mb-4 block">El problema</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
              Responder mensajes en 5 apps es agotador
            </h2>
            <motion.ul className="space-y-4" variants={containerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
              {problems.map((problem, i) => (
                <motion.li key={i} variants={itemVariants} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-500" />
                  </div>
                  <span className="text-white/60">{problem}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.2 }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-green-500 font-semibold mb-4 block">La solución</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
              Un inbox inteligente que trabaja por ti
            </h2>
            <motion.ul className="space-y-4" variants={containerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
              {solutions.map((solution, i) => (
                <motion.li key={i} variants={itemVariants} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-white/60">{solution}</span>
                </motion.li>
              ))}
            </motion.ul>
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

  return (
    <section ref={ref} className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--landing-primary)]/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      
      <motion.div 
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
      >
        <div className="font-display font-black text-[20vw] md:text-[15vw] leading-none text-gradient mb-4">
          <AnimatedCounter target={80} />%
        </div>
        <h2 className="font-display text-2xl md:text-4xl font-bold text-white mb-4">
          menos tiempo respondiendo
        </h2>
        <p className="text-white/50 text-lg max-w-xl mx-auto">
          Nuestros usuarios reducen drásticamente el tiempo dedicado a gestionar mensajes de redes sociales.
        </p>
      </motion.div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();

  const steps = [
    {
      number: '01',
      title: 'Conecta tus redes',
      description: 'Vincula Instagram, TikTok y Facebook en menos de 2 minutos. Sin configuración técnica.',
      visual: 'connect'
    },
    {
      number: '02',
      title: 'La IA aprende tu estilo',
      description: 'Entrena al asistente con ejemplos de tus mejores respuestas. Genera borradores que suenan como tú.',
      visual: 'ai'
    },
    {
      number: '03',
      title: 'Responde y haz seguimiento',
      description: 'Revisa, edita si quieres, y envía. Los recordatorios aseguran que ningún lead se enfríe.',
      visual: 'send'
    }
  ];

  return (
    <section id="how" ref={ref} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={prefersReducedMotion ? { duration: 0 } : undefined}
          className="text-center mb-16"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--landing-primary)] font-semibold mb-4 block">
            Cómo funciona
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
            De caos a control en 3 pasos
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: i * 0.15, duration: 0.6 }}
              className="card-landing hover-lift group"
            >
              <span className="font-display text-6xl font-bold text-white/10 group-hover:text-[var(--landing-primary)]/20 transition-colors">
                {step.number}
              </span>
              <h3 className="font-display text-xl font-bold text-white mt-4 mb-3">{step.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{step.description}</p>
              
              <div className="mt-6 h-40 rounded-lg bg-[var(--landing-bg-elevated)] border border-white/5 flex items-center justify-center overflow-hidden">
                {step.visual === 'connect' && (
                  <div className="flex items-center gap-4">
                    <motion.div 
                      animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                      transition={prefersReducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 2, delay: 0 }}
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"
                    >
                      <Instagram className="w-6 h-6 text-white" />
                    </motion.div>
                    <motion.div 
                      animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                      transition={prefersReducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 2, delay: 0.3 }}
                      className="w-12 h-12 rounded-xl bg-black flex items-center justify-center"
                    >
                      <Music2 className="w-6 h-6 text-white" />
                    </motion.div>
                    <motion.div 
                      animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                      transition={prefersReducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 2, delay: 0.6 }}
                      className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center"
                    >
                      <Facebook className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                )}
                {step.visual === 'ai' && (
                  <div className="p-4 text-left w-full">
                    <div className="text-xs text-[var(--landing-primary)] mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Borrador IA
                    </div>
                    <div className="text-sm text-white/70">
                      <TypewriterText text="¡Hola! Gracias por tu interés. Te cuento más sobre..." delay={500} />
                    </div>
                  </div>
                )}
                {step.visual === 'send' && (
                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
                      transition={prefersReducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 1.5 }}
                      className="w-full max-w-[160px] h-8 rounded bg-[var(--landing-primary)] flex items-center justify-center text-white text-sm font-medium"
                    >
                      Enviar <ArrowRight className="w-3 h-3 ml-1" />
                    </motion.div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Bell className="w-3 h-3" />
                      <span>Recordatorio en 24h</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();

  const features = [
    { icon: Inbox, title: 'Inbox unificado', description: 'Todas tus conversaciones en un solo lugar ordenadas por prioridad.', size: 'large' },
    { icon: Sparkles, title: 'Respuestas IA', description: 'Borradores que capturan tu tono de voz.', size: 'small' },
    { icon: Users, title: 'CRM integrado', description: 'Perfil completo de cada contacto.', size: 'small' },
    { icon: Bell, title: 'Recordatorios', description: 'Seguimiento automático para leads inactivos.', size: 'medium' },
    { icon: MessageSquare, title: 'Comentarios', description: 'Gestiona comentarios de posts directamente.', size: 'medium' },
    { icon: BarChart2, title: 'Analytics', description: 'Métricas de rendimiento y tiempo de respuesta.', size: 'small' },
  ];

  return (
    <section id="features" ref={ref} className="py-24 md:py-32 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={prefersReducedMotion ? { duration: 0 } : undefined}
          className="text-center mb-16"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--landing-primary)] font-semibold mb-4 block">
            Características
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            Todo lo que necesitas para escalar
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Herramientas diseñadas para equipos que manejan cientos de conversaciones al día.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={prefersReducedMotion ? { duration: 0 } : { delay: i * 0.1, duration: 0.5 }}
                className={`card-landing hover-lift group ${
                  feature.size === 'large' ? 'col-span-2 row-span-2' : 
                  feature.size === 'medium' ? 'col-span-2 md:col-span-1' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--landing-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--landing-primary)]/20 transition-colors">
                  <Icon className="w-6 h-6 text-[var(--landing-primary)]" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [100, -100]);

  return (
    <section id="testimonial" ref={ref} className="py-24 md:py-40 relative overflow-hidden">
      <motion.div style={prefersReducedMotion ? {} : { y }} className="absolute top-0 left-10 text-[20rem] font-display font-black text-white/[0.02] select-none">
        "
      </motion.div>
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.blockquote
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
          className="font-display text-2xl md:text-4xl font-medium text-white leading-relaxed mb-12"
        >
          "Pasamos de responder en 4 horas a responder en 15 minutos. 
          <span className="text-gradient"> Repliyo cambió completamente</span> cómo gestionamos nuestro Instagram de 50k seguidores."
        </motion.blockquote>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.6 }}
          className="inline-flex items-center gap-4 p-3 pr-6 rounded-full bg-white/5 border border-white/10"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center text-white font-bold text-lg">
            MG
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">María González</div>
            <div className="text-sm text-white/50">Head of Social Media, FashionBrand</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section ref={ref} className="relative border-t border-white/5">
      <div className="grid lg:grid-cols-12">
        <div className="lg:col-span-8 p-12 md:p-20 border-r border-white/5">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
          >
            <h2 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-6">
              ¿LISTO PARA<br />
              <span className="text-outline hover:text-white transition-colors duration-500 cursor-default">ESCALAR?</span>
            </h2>
            <p className="text-white/50 text-lg md:text-xl max-w-md">
              Automatiza respuestas. Deleita clientes. Sin tarjeta de crédito.
            </p>
          </motion.div>
        </div>

        <div className="lg:col-span-4 p-12 md:p-20 flex items-center justify-center bg-gradient-to-br from-[var(--landing-primary)]/5 to-transparent relative group overflow-hidden">
          <div className="absolute inset-0 bg-[var(--landing-primary)]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <motion.a
            href="/login"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.6, type: 'spring' }}
            className="btn-cta-circle relative z-10"
            data-testid="button-empezar-cta"
          >
            <span className="font-display">Empezar</span>
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
    <footer className="bg-[#080808] border-t border-white/5">
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

      <div className="relative w-full overflow-hidden border-t border-white/5 pt-10 pb-6">
        <h1 className="font-display font-black text-[15vw] leading-[0.75] text-center select-none tracking-tight text-outline">
          REPLIYO
        </h1>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-white/40 font-mono mt-6">
          <span>© 2025 Repliyo Inc.</span>
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
    <div className="landing-page" data-testid="landing-page">
      <Header />
      <main>
        <HeroSection />
        <MarqueeSection />
        <ProblemSection />
        <MetricSection />
        <HowItWorksSection />
        <FeaturesSection />
        <TestimonialSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
