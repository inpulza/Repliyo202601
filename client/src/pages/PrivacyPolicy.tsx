import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, FileText, Mail, ArrowLeft, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import { GlowButton } from '../components/landing/GlowButton';
import repliyoLogo from '../assets/repliyo-logo.jpg';
import '../styles/landing.css';

const PrivacyPolicy = () => {
  const [, setLocation] = useLocation();

  const sections = [
    {
      icon: <Eye className="w-6 h-6 text-blue-400" />,
      title: "Información que recopilamos",
      content: "Recopilamos información necesaria para proporcionar nuestros servicios de gestión de bandejas de entrada, lo que incluye: datos de cuentas de redes sociales (páginas de Facebook, cuentas comerciales de Instagram), mensajes entrantes, comentarios, mensajes directos (DMs) e información del perfil de usuario obtenida a través de las APIs de Meta."
    },
    {
      icon: <FileText className="w-6 h-6 text-purple-400" />,
      title: "Uso de la información",
      content: "La información recopilada se utiliza exclusivamente para potenciar las funciones de gestión de la bandeja de entrada con IA, generar borradores de respuestas, facilitar el envío de respuestas manuales y automatizadas, y proporcionar métricas de rendimiento de la comunicación."
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: "Integraciones de terceros",
      content: "Repliyo se integra con Meta (Facebook e Instagram) a través de la Graph API y la Messenger API para acceder y gestionar tus conversaciones sociales de manera centralizada. No compartimos tus datos personales con terceros para fines publicitarios."
    },
    {
      icon: <Lock className="w-6 h-6 text-rose-400" />,
      title: "Seguridad y Retención",
      content: "Implementamos medidas de seguridad de nivel empresarial para proteger tus datos. Retenemos la información solo mientras sea necesario para proporcionar el servicio o hasta que solicites su eliminación."
    },
    {
      icon: <Mail className="w-6 h-6 text-orange-400" />,
      title: "Tus Derechos y Contacto",
      content: "Tienes derecho a acceder, rectificar o eliminar tus datos en cualquier momento. Para cualquier consulta sobre tu privacidad, contáctanos en privacy@repliyo.com."
    }
  ];

  return (
    <div className="landing-page min-h-screen bg-[#050505] text-white font-body selection:bg-blue-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer group" 
            onClick={() => setLocation('/')}
            data-testid="link-home"
          >
            <img 
              src={repliyoLogo} 
              alt="Repliyo" 
              className="h-8 w-auto object-contain group-hover:opacity-80 transition-opacity" 
            />
          </div>
          
          <button 
            onClick={() => setLocation('/')}
            className="text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 hover:bg-white/5"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-16">
            <h1 className="text-h2 font-heading font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Política de Privacidad
            </h1>
            <div className="flex items-center gap-4 text-sm text-white/40">
              <span>Última actualización: Marzo 2026</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>Versión 1.2</span>
            </div>
          </div>

          <div className="grid gap-12">
            {sections.map((section, idx) => (
              <motion.section
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:border-white/10 group-hover:bg-white/[0.05] transition-all duration-300">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-semibold mb-3 text-white/90 group-hover:text-white transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-white/60 leading-relaxed text-lg">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-24 p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center"
          >
            <h3 className="text-lg font-heading font-medium mb-4">¿Tienes preguntas sobre tus datos?</h3>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Estamos comprometidos con la transparencia y la protección de tu información personal en cada paso del camino.
            </p>
            <GlowButton 
              onClick={() => window.location.href = 'mailto:privacy@repliyo.com'}
              className="mx-auto"
              data-testid="button-contact-privacy"
            >
              Contactar Soporte de Privacidad
            </GlowButton>
          </motion.div>
        </motion.div>
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 bg-[#050505]">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-white/30">
          <p>© 2026 Repliyo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
