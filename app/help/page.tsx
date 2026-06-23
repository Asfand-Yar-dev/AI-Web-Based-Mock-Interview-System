'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mic,
  Camera,
  Brain,
  BarChart3,
  FileDown,
  Globe,
  Shield,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface FAQ {
  q: string;
  a: string;
}

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  faqs: FAQ[];
}

const SECTIONS: Section[] = [
  {
    icon: Mic,
    title: 'Audio & Speech Recognition',
    color: 'text-accent',
    faqs: [
      {
        q: 'What microphone setup do I need?',
        a: 'Any built-in or external microphone works. For best results, use a headset in a quiet room. The AI speech-to-text model (Whisper) works best with clear, close-up audio.',
      },
      {
        q: 'Which languages are supported for interviews?',
        a: 'English (en) and Urdu (ur) are currently supported. You can select your preferred language on the Interview Setup page before starting a session.',
      },
      {
        q: 'Why is my speech not being transcribed?',
        a: 'Make sure your browser has microphone permission granted. Speak clearly and at a normal pace. If issues persist, check that your default recording device is set correctly in your OS settings.',
      },
      {
        q: 'How long should each answer be?',
        a: 'Aim for 30–120 seconds per answer. Too short (under 5 seconds) may not trigger AI scoring. The timer in the session view shows your remaining time per question.',
      },
    ],
  },
  {
    icon: Camera,
    title: 'Camera & Facial Analysis',
    color: 'text-accent',
    faqs: [
      {
        q: 'What does the camera capture during an interview?',
        a: 'The camera captures video frames analysed by the DeepFace/OpenCV facial model to measure confidence, engagement, and body language. No video is permanently stored — only numeric scores are saved.',
      },
      {
        q: 'The camera failed to start. What should I do?',
        a: 'The system automatically retries 3 times (SRS FR-9). If all retries fail, you will see options to "Reconfigure & Retry", go back to Setup, or terminate the session. Ensure browser camera permission is granted.',
      },
      {
        q: 'Can I do an interview without a camera?',
        a: 'Yes. If the camera cannot start, you can still complete the interview using audio only. The Non-Verbal Analysis section will show 0 for facial scores, but NLP Content Analysis will still be fully evaluated.',
      },
    ],
  },
  {
    icon: Brain,
    title: 'AI Scoring & Feedback',
    color: 'text-success',
    faqs: [
      {
        q: 'How is my score calculated?',
        a: 'Your results show two separate AI analyses: (1) Content Analysis (NLP) using Sentence-BERT — measures technical accuracy, relevance, and clarity of your spoken answers. (2) Non-Verbal Analysis using the Fusion Model (Wav2Vec2 + DeepFace) — measures vocal tone, confidence, and body language.',
      },
      {
        q: 'Why does the results page show 0 for some scores?',
        a: 'Scores of 0 usually mean the AI pipeline did not receive enough audio/video data for that metric. Ensure you speak for at least 10–15 seconds per answer with camera enabled for the best evaluation.',
      },
      {
        q: 'How long does AI processing take?',
        a: 'AI analysis runs in the background immediately after each answer is submitted. Full results are typically available within 30–60 seconds after the session ends. Refresh the results page if scores are still loading.',
      },
      {
        q: 'What is the Fusion Model?',
        a: 'The Fusion Model combines Wav2Vec2 (voice emotion analysis) and DeepFace (facial expression analysis) into a single confidence and body language score. This is unique to Intervexa and goes beyond text-only interview platforms.',
      },
    ],
  },
  {
    icon: BarChart3,
    title: 'Progress & Dashboard',
    color: 'text-info',
    faqs: [
      {
        q: 'How does the Progress Chart work?',
        a: 'The progress chart on your dashboard shows your overall score trend across your last 20 completed sessions. The dashed reference line marks your average. An upward trend badge means your performance is improving.',
      },
      {
        q: 'What do the dashboard stats mean?',
        a: '"Total Interviews" counts all sessions you have started. "Average Score" is the mean overall score across completed sessions that were fully evaluated by AI.',
      },
    ],
  },
  {
    icon: FileDown,
    title: 'Downloading Reports',
    color: 'text-warning',
    faqs: [
      {
        q: 'How do I download my interview report?',
        a: 'On the Results page, click the "Download Report" button. This triggers your browser\'s print dialog — choose "Save as PDF" to save a clean formatted report with all scores and feedback.',
      },
      {
        q: 'The printed report looks different from the screen. Is that normal?',
        a: 'Yes — the print layout hides navigation, sidebars, and animated elements to produce a clean document. All scores, feedback sections, and question breakdowns are included.',
      },
    ],
  },
  {
    icon: Globe,
    title: 'Account & Verification',
    color: 'text-success',
    faqs: [
      {
        q: 'Why do I need to verify my email?',
        a: 'Email verification confirms your account and enables account-recovery features. A verification link is sent to your registered email on signup. Check your spam folder if you do not see it.',
      },
      {
        q: 'I did not receive the verification email. What now?',
        a: 'Click "Resend verification email" in the yellow banner on your dashboard. There is a 6-minute cooldown between resend requests to prevent spam.',
      },
      {
        q: 'Can I sign in with Google?',
        a: 'Yes. Click "Continue with Google" on the login or signup page. Google accounts are automatically verified — no email verification step is needed.',
      },
    ],
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    color: 'text-destructive',
    faqs: [
      {
        q: 'Is my audio and video stored?',
        a: 'Audio recordings are processed by the AI pipeline and then deleted. Only the transcript text and numeric scores are stored. Video frames are analysed in real-time and never stored.',
      },
      {
        q: 'Who can see my interview results?',
        a: 'Only you can see your results by default. Admins can see aggregate statistics but not individual answers.',
      },
    ],
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const query = search.trim().toLowerCase();
  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    faqs: query
      ? section.faqs.filter((f) => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query))
      : section.faqs,
  })).filter((s) => s.faqs.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold text-foreground">Help & FAQ</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        {/* Intro */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-foreground">How can we help?</h2>
          <p className="mt-1 text-muted-foreground">
            Find answers about interview sessions, AI scoring, reports, and account settings.
          </p>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </motion.div>

        {filteredSections.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No results found for &ldquo;{search}&rdquo;. Try a different keyword.
          </div>
        )}

        {/* FAQ sections */}
        {filteredSections.map((section) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <section.icon className={`h-5 w-5 ${section.color}`} />
              <h3 className="font-semibold text-foreground">{section.title}</h3>
            </div>

            <div className="space-y-2">
              {section.faqs.map((faq, idx) => {
                const key = `${section.title}-${idx}`;
                const isOpen = !!openItems[key];
                return (
                  <div key={key} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                    <button
                      onClick={() => toggle(key)}
                      className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium text-card-foreground hover:bg-secondary/30 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="border-t border-border/40 px-5 py-3.5 text-sm text-muted-foreground leading-relaxed">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Still have questions? Reach out to your project team or raise an issue on GitHub.
        </p>
      </main>
    </div>
  );
}
