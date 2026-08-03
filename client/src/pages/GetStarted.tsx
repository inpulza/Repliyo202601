import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, Loader2, ArrowRight, ArrowLeft, Check, User, Building2, Globe2, Target, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { GET_STARTED_COPY, type GetStartedCopy } from '@/locales/getStarted';
import { GetStartedMetadataSync } from '@/components/get-started/GetStartedMetadataSync';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { carouselSlides } from '@/components/auth/CarouselSlides';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TOTAL_STEPS = 5;

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  companyName: string;
  industry: string;
  teamSize: string;
  country: string;
  platforms: string[];
  monthlyVolume: string;
  brandCount: string;
  goals: string[];
  painPoint: string;
  currentTools: string;
}

const STEP_ICONS = [User, Building2, Globe2, Target, Check];

function StepIndicator({ currentStep, copy }: { currentStep: number; copy: GetStartedCopy }) {
  return (
    <div className="mb-10" data-testid="step-indicator">
      <div className="flex items-center justify-between">
        {copy.stepLabels.map((label, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = STEP_ICONS[index];
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <div className="flex-1 h-[2px] relative self-start" style={{ marginTop: 15 }}>
                  <div className="absolute inset-0 bg-gray-200 rounded-full" />
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                    initial={false}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                </div>
              )}
              <div className="flex flex-col items-center shrink-0">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold relative z-10 ${
                    isCompleted
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
                      : isActive
                      ? 'bg-white text-indigo-700 ring-2 ring-indigo-500 shadow-md shadow-indigo-100'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  initial={false}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  data-testid={`step-icon-${index}`}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </motion.div>
                <span
                  className={`text-[10px] font-medium mt-2 whitespace-nowrap hidden sm:block transition-colors duration-300 ${
                    isActive ? 'text-indigo-700' : isCompleted ? 'text-indigo-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function Step1AboutYou({ data, onChange, copy }: { data: FormData; onChange: (updates: Partial<FormData>) => void; copy: GetStartedCopy }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900" data-testid="step-title">{copy.about.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{copy.about.description}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-gray-700">{copy.about.name}</Label>
        <Input
          id="name"
          placeholder={copy.about.namePlaceholder}
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          className="h-12 border-gray-300 focus-visible:ring-indigo-500"
          data-testid="input-lead-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-email" className="text-gray-700">{copy.about.email}</Label>
        <Input
          id="lead-email"
          type="email"
          placeholder={copy.about.emailPlaceholder}
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          required
          className="h-12 border-gray-300 focus-visible:ring-indigo-500"
          data-testid="input-lead-email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-gray-700">{copy.about.phone}</Label>
        <Input
          id="phone"
          type="tel"
          placeholder={copy.about.phonePlaceholder}
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className="h-12 border-gray-300 focus-visible:ring-indigo-500"
          data-testid="input-lead-phone"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role" className="text-gray-700">{copy.about.role}</Label>
        <Select value={data.role} onValueChange={(v) => onChange({ role: v })}>
          <SelectTrigger className="h-12 border-gray-300" data-testid="select-lead-role">
            <SelectValue placeholder={copy.about.rolePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {copy.options.roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Step2Business({ data, onChange, copy }: { data: FormData; onChange: (updates: Partial<FormData>) => void; copy: GetStartedCopy }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900" data-testid="step-title">{copy.business.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{copy.business.description}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company" className="text-gray-700">{copy.business.company}</Label>
        <Input
          id="company"
          placeholder={copy.business.companyPlaceholder}
          value={data.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          className="h-12 border-gray-300 focus-visible:ring-indigo-500"
          data-testid="input-lead-company"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">{copy.business.industry}</Label>
        <Select value={data.industry} onValueChange={(v) => onChange({ industry: v })}>
          <SelectTrigger className="h-12 border-gray-300" data-testid="select-lead-industry">
            <SelectValue placeholder={copy.business.industryPlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {copy.options.industries.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>{industry.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">{copy.business.teamSize}</Label>
        <Select value={data.teamSize} onValueChange={(v) => onChange({ teamSize: v })}>
          <SelectTrigger className="h-12 border-gray-300" data-testid="select-lead-team-size">
            <SelectValue placeholder={copy.business.teamSizePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {copy.options.teamSizes.map((size) => (
              <SelectItem key={size} value={size}>{size} {copy.business.people}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="country" className="text-gray-700">{copy.business.country}</Label>
        <Input
          id="country"
          placeholder={copy.business.countryPlaceholder}
          value={data.country}
          onChange={(e) => onChange({ country: e.target.value })}
          className="h-12 border-gray-300 focus-visible:ring-indigo-500"
          data-testid="input-lead-country"
        />
      </div>
    </div>
  );
}

function Step3SocialMedia({ data, onChange, copy }: { data: FormData; onChange: (updates: Partial<FormData>) => void; copy: GetStartedCopy }) {
  const togglePlatform = (platformId: string) => {
    const current = data.platforms || [];
    const updated = current.includes(platformId)
      ? current.filter((p) => p !== platformId)
      : [...current, platformId];
    onChange({ platforms: updated });
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900" data-testid="step-title">{copy.social.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{copy.social.description}</p>
      </div>
      <div className="space-y-3">
        <Label className="text-gray-700">{copy.social.platforms}</Label>
        <div className="grid grid-cols-2 gap-2">
          {copy.options.platforms.map((platform) => {
            const isSelected = (data.platforms || []).includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => togglePlatform(platform.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                data-testid={`checkbox-platform-${platform.id}`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {platform.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">{copy.social.monthlyVolume}</Label>
        <Select value={data.monthlyVolume} onValueChange={(v) => onChange({ monthlyVolume: v })}>
          <SelectTrigger className="h-12 border-gray-300" data-testid="select-lead-volume">
            <SelectValue placeholder={copy.social.monthlyVolumePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {copy.options.volumeRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">{copy.social.brandCount}</Label>
        <Select value={data.brandCount} onValueChange={(v) => onChange({ brandCount: v })}>
          <SelectTrigger className="h-12 border-gray-300" data-testid="select-lead-brands">
            <SelectValue placeholder={copy.social.brandCountPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {copy.options.brandCounts.map((count) => (
              <SelectItem key={count} value={count}>{count} {count === '1' ? copy.social.brandSingular : copy.social.brandPlural}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Step4Goals({ data, onChange, copy }: { data: FormData; onChange: (updates: Partial<FormData>) => void; copy: GetStartedCopy }) {
  const toggleGoal = (goalId: string) => {
    const current = data.goals || [];
    const updated = current.includes(goalId)
      ? current.filter((g) => g !== goalId)
      : [...current, goalId];
    onChange({ goals: updated });
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900" data-testid="step-title">{copy.goals.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{copy.goals.description}</p>
      </div>
      <div className="space-y-3">
        <Label className="text-gray-700">{copy.goals.goals}</Label>
        <div className="space-y-2">
          {copy.options.goals.map((goal) => {
            const isSelected = (data.goals || []).includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 w-full p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                data-testid={`checkbox-goal-${goal.id}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                {goal.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="painPoint" className="text-gray-700">{copy.goals.painPoint}</Label>
        <Textarea
          id="painPoint"
          placeholder={copy.goals.painPointPlaceholder}
          value={data.painPoint}
          onChange={(e) => onChange({ painPoint: e.target.value })}
          className="min-h-[80px] border-gray-300 focus-visible:ring-indigo-500 resize-none"
          data-testid="textarea-lead-pain"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currentTools" className="text-gray-700">{copy.goals.currentTools}</Label>
        <Input
          id="currentTools"
          placeholder={copy.goals.currentToolsPlaceholder}
          value={data.currentTools}
          onChange={(e) => onChange({ currentTools: e.target.value })}
          className="h-12 border-gray-300 focus-visible:ring-indigo-500"
          data-testid="input-lead-tools"
        />
      </div>
    </div>
  );
}

function Step5Confirmation({ data, copy }: { data: FormData; copy: GetStartedCopy }) {
  const goalLabels = copy.options.goals.filter(g => (data.goals || []).includes(g.id)).map(g => g.label);
  const platformLabels = copy.options.platforms.filter(p => (data.platforms || []).includes(p.id)).map(p => p.label);
  const industryLabel = copy.options.industries.find(industry => industry.value === data.industry)?.label || data.industry;

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900" data-testid="step-title">{copy.review.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{copy.review.description}</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm" data-testid="summary-block">
        <div className="flex justify-between">
          <span className="text-gray-500">{copy.review.name}</span>
          <span className="font-medium text-gray-900">{data.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{copy.review.email}</span>
          <span className="font-medium text-gray-900">{data.email}</span>
        </div>
        {data.phone && (
          <div className="flex justify-between">
            <span className="text-gray-500">{copy.review.phone}</span>
            <span className="font-medium text-gray-900">{data.phone}</span>
          </div>
        )}
        {data.companyName && (
          <div className="flex justify-between">
            <span className="text-gray-500">{copy.review.company}</span>
            <span className="font-medium text-gray-900">{data.companyName}</span>
          </div>
        )}
        {data.industry && (
          <div className="flex justify-between">
            <span className="text-gray-500">{copy.review.industry}</span>
            <span className="font-medium text-gray-900">{industryLabel}</span>
          </div>
        )}
        {data.teamSize && (
          <div className="flex justify-between">
            <span className="text-gray-500">{copy.review.team}</span>
            <span className="font-medium text-gray-900">{data.teamSize} {copy.business.people}</span>
          </div>
        )}
        {platformLabels.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 shrink-0">{copy.review.platforms}</span>
            <span className="font-medium text-gray-900 text-right">{platformLabels.join(', ')}</span>
          </div>
        )}
        {goalLabels.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 shrink-0">{copy.review.goals}</span>
            <span className="font-medium text-gray-900 text-right">{goalLabels.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessState({ copy }: { copy: GetStartedCopy }) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3" data-testid="success-title">{copy.success.title}</h1>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        {copy.success.description}
      </p>
      <div className="flex flex-col gap-3">
        <a
          href="https://wa.me/17864346163"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
          data-testid="link-whatsapp-success"
        >
          <MessageCircle className="h-4 w-4" />
          {copy.success.whatsapp}
        </a>
        <Button asChild variant="outline" className="border-gray-300">
          <a href="/login" data-testid="button-back-to-login">
            {copy.success.login}
          </a>
        </Button>
      </div>
    </div>
  );
}

export function GetStarted() {
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const copy = GET_STARTED_COPY[language];
  const landingHref = language === 'es' ? '/?lang=es' : '/';
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [carouselCurrent, setCarouselCurrent] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    companyName: '',
    industry: '',
    teamSize: '',
    country: '',
    platforms: [],
    monthlyVolume: '',
    brandCount: '',
    goals: [],
    painPoint: '',
    currentTools: '',
  });

  useEffect(() => {
    if (!api) return;
    setCarouselCurrent(api.selectedScrollSnap());
    api.on('select', () => setCarouselCurrent(api.selectedScrollSnap()));
  }, [api]);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        if (!formData.name.trim()) {
          toast({ title: copy.validation.nameTitle, description: copy.validation.nameDescription, variant: 'destructive' });
          return false;
        }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast({ title: copy.validation.emailTitle, description: copy.validation.emailDescription, variant: 'destructive' });
          return false;
        }
        return true;
      case 1:
        if (!formData.industry) {
          toast({ title: copy.validation.industryTitle, description: copy.validation.industryDescription, variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!formData.platforms || formData.platforms.length === 0) {
          toast({ title: copy.validation.platformsTitle, description: copy.validation.platformsDescription, variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        if (!formData.goals || formData.goals.length === 0) {
          toast({ title: copy.validation.goalsTitle, description: copy.validation.goalsDescription, variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'get-started',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit');
      }

      setIsSuccess(true);
      toast({ title: copy.toast.successTitle, description: copy.toast.successDescription });
    } catch (error) {
      console.error('Failed to submit lead request', error);
      toast({ title: copy.toast.errorTitle, description: copy.toast.errorDescription, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const slides = carouselSlides;

  return (
    <div className="min-h-screen flex">
      <GetStartedMetadataSync />
      <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <a href={landingHref} className="flex items-center gap-3" aria-label="Repliyo">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <Command className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Repliyo</span>
            </a>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-700"
              data-testid="button-get-started-language"
            >
              {copy.languageSwitch}
            </button>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <SuccessState copy={copy} />
            </motion.div>
          ) : (
            <>
              <StepIndicator currentStep={step} copy={copy} />

              <div className="min-h-[400px] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {step === 0 && <Step1AboutYou data={formData} onChange={updateFormData} copy={copy} />}
                    {step === 1 && <Step2Business data={formData} onChange={updateFormData} copy={copy} />}
                    {step === 2 && <Step3SocialMedia data={formData} onChange={updateFormData} copy={copy} />}
                    {step === 3 && <Step4Goals data={formData} onChange={updateFormData} copy={copy} />}
                    {step === 4 && <Step5Confirmation data={formData} copy={copy} />}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-600"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {copy.navigation.back}
                  </Button>
                ) : (
                  <a
                    href="/login"
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    data-testid="link-back-login"
                  >
                    {copy.navigation.signIn}
                  </a>
                )}

                {step < TOTAL_STEPS - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
                    data-testid="button-next"
                  >
                    {copy.navigation.next}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
                    data-testid="button-submit-lead"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {copy.navigation.submitting}
                      </>
                    ) : (
                      <>
                        {copy.navigation.submit}
                        <Check className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="w-full h-full flex flex-col items-center justify-center">
          <Carousel
            setApi={setApi}
            opts={{ loop: true }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: false,
              }),
            ]}
            className="w-full max-w-lg"
          >
            <CarouselContent>
              {slides.map((SlideComponent, index) => (
                <CarouselItem key={index}>
                  <div className="h-[520px] flex items-center justify-center">
                    <SlideComponent language={language} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="flex gap-2 mt-8" data-testid="carousel-dots-getstarted">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  carouselCurrent === index
                    ? 'bg-white w-6'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                data-testid={`carousel-dot-gs-${index}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
