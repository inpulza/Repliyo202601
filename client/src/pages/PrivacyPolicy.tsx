import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, FileText, Mail, ArrowLeft, Shield, Database, UserCheck, Globe, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { GlowButton } from '../components/landing/GlowButton';
import repliyoLogo from '../assets/repliyo-logo.jpg';
import '../styles/landing.css';

interface Section {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const PrivacyPolicy = () => {
  const [, setLocation] = useLocation();

  const sections: Section[] = [
    {
      icon: <Eye className="w-6 h-6 text-blue-400" />,
      title: "1. Information We Collect",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>When you connect your social media accounts to Repliyo, we collect the following categories of information through the Meta Graph API and Messenger API:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Account identifiers:</strong> Facebook Page IDs, Instagram Business Account IDs, Page-Scoped User IDs (PSIDs), and Instagram-Scoped User IDs (IGSIDs).</li>
            <li><strong className="text-white/80">Message content and metadata:</strong> Text content of messages, comments, and direct messages received by your connected pages; sender and recipient identifiers; message timestamps; and platform-specific message IDs.</li>
            <li><strong className="text-white/80">Page and account information:</strong> Facebook Page names, Instagram Business account names, profile pictures, and associated account settings required to deliver our services.</li>
            <li><strong className="text-white/80">Webhook event data:</strong> Incoming event notifications from Meta platforms, including new messages, comment events, and messaging status updates.</li>
            <li><strong className="text-white/80">Account credentials:</strong> OAuth access tokens (Page Access Tokens) required to authenticate API calls on your behalf. These are stored securely and never exposed to third parties.</li>
          </ul>
          <p>We do <strong className="text-white/80">not</strong> collect personal payment information, government-issued IDs, or sensitive personal data beyond what is described above.</p>
        </div>
      )
    },
    {
      icon: <FileText className="w-6 h-6 text-purple-400" />,
      title: "2. How We Use Your Information",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>The information we collect is used exclusively to provide and improve the Repliyo platform. Specific uses include:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Unified inbox management:</strong> Aggregating messages, comments, and direct messages from your connected Facebook Pages and Instagram Business accounts into a single interface.</li>
            <li><strong className="text-white/80">AI-assisted responses:</strong> Generating suggested or automated reply drafts for incoming messages and comments using your configured AI agent settings.</li>
            <li><strong className="text-white/80">Private reply delivery:</strong> Sending private messages to users who comment on your Facebook or Instagram posts via the Meta Messenger API, on your explicit instruction.</li>
            <li><strong className="text-white/80">CRM and contact management:</strong> Creating and maintaining customer conversation histories within your Repliyo account to support business communication workflows.</li>
            <li><strong className="text-white/80">Analytics and performance metrics:</strong> Providing aggregated metrics on response times, message volumes, and AI performance within your Repliyo dashboard.</li>
            <li><strong className="text-white/80">Service delivery and account management:</strong> Authentication, billing, customer support, and platform maintenance.</li>
          </ul>
          <p>We do <strong className="text-white/80">not</strong> use your data for advertising, sale to third parties, or any purpose other than those listed above.</p>
        </div>
      )
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: "3. Meta Platform Data & Third-Party Integrations",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>Repliyo integrates with Meta Platforms (Facebook and Instagram) via the Meta Graph API and Messenger Platform API. By connecting your accounts, you authorize Repliyo to access data under the permissions you grant, which may include <code className="text-white/70 bg-white/5 px-1.5 py-0.5 rounded text-sm">pages_messaging</code>, <code className="text-white/70 bg-white/5 px-1.5 py-0.5 rounded text-sm">instagram_manage_messages</code>, <code className="text-white/70 bg-white/5 px-1.5 py-0.5 rounded text-sm">pages_read_engagement</code>, and related permissions.</p>
          <p><strong className="text-white/80">Media Content from CDN URLs:</strong> Repliyo accesses media files (images, videos) shared in messages via temporary Meta CDN URLs for display purposes only. We do <strong className="text-white/80">not</strong> permanently store, cache, or re-host any media content from Meta CDN URLs. All media is accessed transiently and is not retained on our servers after the session ends.</p>
          <p><strong className="text-white/80">Human Escalation:</strong> Our AI-assisted reply feature is always subject to human review and approval. Users interacting with a Repliyo-connected account can request to speak with a human agent at any time. Businesses using Repliyo are responsible for ensuring their customers can escalate to a live human representative.</p>
          <p><strong className="text-white/80">Service Providers:</strong> We use trusted third-party infrastructure providers (cloud hosting, database services) to operate the Repliyo platform. These providers process data only as necessary to provide their services to us and are bound by appropriate data processing agreements. We do not sell your data to any third party.</p>
          <p>Meta's own use of data is governed by <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Meta's Privacy Policy</a>.</p>
        </div>
      )
    },
    {
      icon: <Database className="w-6 h-6 text-rose-400" />,
      title: "4. Data Retention",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>We retain your data for as long as your Repliyo account is active and as necessary to provide our services:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Message and conversation data:</strong> Retained for the duration of your account subscription, or until you request deletion.</li>
            <li><strong className="text-white/80">Access tokens:</strong> Stored securely and deleted immediately upon disconnecting a social media account or closing your Repliyo account.</li>
            <li><strong className="text-white/80">Account deletion:</strong> Upon account closure, all associated data is deleted within 30 days, except where retention is required by applicable law.</li>
            <li><strong className="text-white/80">Backup systems:</strong> Deleted data may persist in secure backup systems for up to 90 days before permanent erasure.</li>
          </ul>
        </div>
      )
    },
    {
      icon: <Lock className="w-6 h-6 text-amber-400" />,
      title: "5. Data Security",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>We implement industry-standard security measures to protect your data, including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Encryption in transit (TLS/HTTPS) for all data transmissions</li>
            <li>Encryption at rest for stored access tokens and sensitive account data</li>
            <li>Access controls limiting data access to authorized personnel only</li>
            <li>Regular security reviews and monitoring</li>
          </ul>
          <p>While we take all reasonable precautions, no method of transmission or storage is 100% secure. We encourage you to use strong, unique passwords for your accounts and report any suspected security issues to <a href="mailto:privacy@repliyo.com" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@repliyo.com</a>.</p>
        </div>
      )
    },
    {
      icon: <Globe className="w-6 h-6 text-cyan-400" />,
      title: "6. Cookies and Tracking",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>Repliyo uses essential session cookies to maintain your authenticated session while using the platform. We do not use advertising cookies, tracking pixels, or third-party behavioral analytics cookies.</p>
          <p>You can configure your browser to refuse cookies, but doing so may prevent certain features of Repliyo from functioning correctly.</p>
        </div>
      )
    },
    {
      icon: <UserCheck className="w-6 h-6 text-green-400" />,
      title: "7. Your Rights and Choices",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong className="text-white/80">Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong className="text-white/80">Erasure:</strong> Request deletion of your personal data. You can also disconnect your social media accounts at any time from within the Repliyo settings, which will stop further data collection for those accounts.</li>
            <li><strong className="text-white/80">Restriction:</strong> Request that we limit how we use your data.</li>
            <li><strong className="text-white/80">Portability:</strong> Request a machine-readable copy of your data.</li>
            <li><strong className="text-white/80">Objection:</strong> Object to certain types of data processing.</li>
          </ul>
          <p>To exercise any of these rights, or to request deletion of your data, please contact us at <a href="mailto:privacy@repliyo.com" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@repliyo.com</a>. We will respond to all verified requests within 30 days.</p>
          <p><strong className="text-white/80">Opting out of AI automation:</strong> If you are a user interacting with a business that uses Repliyo, you may request to be responded to by a human agent. Contact the business directly or reach out to us if you have concerns about automated responses.</p>
        </div>
      )
    },
    {
      icon: <Trash2 className="w-6 h-6 text-red-400" />,
      title: "8. Data Deletion Instructions",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>You can request deletion of all your Repliyo data at any time through one of the following methods:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Self-service:</strong> Log in to your Repliyo account, go to Settings, and select "Delete Account." This will immediately remove all your data from our active systems.</li>
            <li><strong className="text-white/80">Email request:</strong> Send a deletion request to <a href="mailto:privacy@repliyo.com" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@repliyo.com</a> with the subject line "Data Deletion Request" and include the email address associated with your account.</li>
          </ul>
          <p>Upon receiving a verified deletion request, we will permanently delete your account data within 30 days and confirm completion via email.</p>
        </div>
      )
    },
    {
      icon: <Mail className="w-6 h-6 text-orange-400" />,
      title: "9. Contact Us",
      content: (
        <div className="space-y-4 text-white/60 leading-relaxed text-base">
          <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
          <ul className="list-none space-y-2">
            <li><strong className="text-white/80">Email:</strong> <a href="mailto:privacy@repliyo.com" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@repliyo.com</a></li>
            <li><strong className="text-white/80">Platform:</strong> Repliyo — Social Media Inbox Management</li>
            <li><strong className="text-white/80">Website:</strong> repliyo.com</li>
          </ul>
          <p>We are committed to resolving any complaints or concerns about our privacy practices promptly and transparently.</p>
        </div>
      )
    }
  ];

  return (
    <div className="landing-page min-h-screen bg-[#050505] text-white font-body selection:bg-blue-500/30">
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
            Back to Home
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
            <div className="inline-flex items-center gap-2 text-xs font-mono text-white/30 uppercase tracking-widest mb-6 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              <Shield className="w-3 h-3" />
              Legal
            </div>
            <h1 className="text-h2 font-heading font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <div className="flex items-center gap-4 text-sm text-white/40">
              <span>Last updated: March 2026</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>Version 2.0</span>
            </div>
            <p className="mt-6 text-white/50 leading-relaxed max-w-2xl">
              This Privacy Policy describes how Repliyo ("we," "us," or "our") collects, uses, shares, and protects information when you use our social media inbox management platform. This policy applies to our application, services, and all features available through the Repliyo platform.
            </p>
          </div>

          <div className="grid gap-10">
            {sections.map((section, idx) => (
              <motion.section
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:border-white/10 group-hover:bg-white/[0.05] transition-all duration-300">
                    {section.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-heading font-semibold mb-4 text-white/90 group-hover:text-white transition-colors">
                      {section.title}
                    </h2>
                    {section.content}
                  </div>
                </div>
                {idx < sections.length - 1 && (
                  <div className="mt-10 border-b border-white/[0.04]" />
                )}
              </motion.section>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-20 p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center"
          >
            <h3 className="text-lg font-heading font-medium mb-3">Questions about your data?</h3>
            <p className="text-white/50 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              We are committed to transparency and the protection of your personal information. Reach out to our privacy team anytime.
            </p>
            <GlowButton
              onClick={() => window.location.href = 'mailto:privacy@repliyo.com'}
              className="mx-auto"
              data-testid="button-contact-privacy"
            >
              Contact Privacy Support
            </GlowButton>
          </motion.div>
        </motion.div>
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 bg-[#050505]">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-white/30">
          <p>© 2026 Repliyo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
