import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Layers, FileText, GraduationCap, Timer, Shield, Sparkles, Mic, Calculator, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const features = [
    { 
      emoji: '📊', 
      name: 'Grade Tracker & GPA Calculator', 
      desc: 'Track every assignment, category, and weighted grade in one place. See your GPA in real time and calculate exactly what you need on your final exam to reach your target grade.',
      icon: BookOpen
    },
    { 
      emoji: '🃏', 
      name: 'AI Flashcard Generator', 
      desc: 'Generate study-ready flashcards from any topic in seconds using AI. Study with flip cards, track mastery, and never waste time making cards manually again.',
      icon: Layers
    },
    { 
      emoji: '📝', 
      name: 'AI Quiz Generator', 
      desc: 'Create unlimited multiple-choice quizzes on any subject instantly. Perfect for exam prep, self-testing, and reinforcing what you have learned.',
      icon: FileText
    },
    { 
      emoji: '✍️', 
      name: 'AI Note Taking', 
      desc: 'Write notes and let AI summarize, outline, and extract key concepts for you. Organize notes by subject with folders and color tags for easy retrieval.',
      icon: Brain
    },
    { 
      emoji: '🎓', 
      name: 'AI Tutor', 
      desc: 'Get personalized tutoring for any subject with an AI classroom tutor. Ask questions, get explanations, and learn at your own pace from anywhere.',
      icon: GraduationCap
    },
    { 
      emoji: '⏱️', 
      name: 'Pomodoro Timer', 
      desc: 'Stay focused with the proven Pomodoro technique. 25-minute study sessions with short breaks scientifically shown to improve retention and reduce burnout.',
      icon: Timer
    },
    { 
      emoji: '🔍', 
      name: 'AI Text Detector & Humanizer', 
      desc: 'Check any text for AI detection probability and humanize AI-generated writing to sound natural and authentic. Perfect for editing and originality.',
      icon: Search
    },
    { 
      emoji: '🎤', 
      name: 'Lecture Recording & Transcription', 
      desc: 'Record lectures and automatically transcribe them with AI. Never miss important details and review key points anytime with searchable transcripts.',
      icon: Mic
    },
  ];

  const stats = [
    '10+ AI Tools',
    '100% Free',
    'Cloud Synced',
    'Built for Students'
  ];

  const howItWorks = [
    { step: 1, title: 'Create your free account', desc: 'Sign up in seconds with just your email. No credit card required.' },
    { step: 2, title: 'Add your subjects and assignments', desc: 'Set up your courses, categories, and start tracking your grades.' },
    { step: 3, title: 'Let AI help you study smarter', desc: 'Generate flashcards, quizzes, and get AI assistance throughout your studies.' },
  ];

  const testimonials = [
    { quote: "APEX helped me raise my GPA by 0.5 points in one semester. The grade calculator is a game changer!", author: "Sarah M., College Student" },
    { quote: "I love the AI flashcard generator. It saves me hours of study time every week.", author: "James T., High School Senior" },
    { quote: "The best free study tool I've found. Everything I need is in one place.", author: "Emily R., University Freshman" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* APEX Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <span className="text-white font-black text-5xl">A</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-black mb-4">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                The Free AI Study Hub for Students
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8"
          >
            Track grades, generate flashcards, create quizzes, and study smarter with AI. Completely free.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            The all-in-one academic companion for students — built by students, for students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" onClick={() => navigate('/login')} className="text-lg px-8">
              Start for Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-lg px-8">
              Sign In
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need to Study Smarter
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful AI-powered tools designed to help you succeed academically — all in one place.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0">{feature.emoji}</div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{feature.name}</h3>
                      <p className="text-muted-foreground text-sm">{feature.desc}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-lg font-semibold text-primary">{stat}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Get Started in 3 Steps
            </h2>
            <p className="text-lg text-muted-foreground">
              Start using APEX AI Study Hub in minutes — no setup required.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Built for Students Who Want Results
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of students already using APEX to boost their grades.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                  <p className="text-sm font-medium">— {testimonial.author}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Start Studying Smarter Today
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of students who are already improving their grades with APEX AI Study Hub.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/login')} 
              className="text-lg px-8 bg-white text-primary hover:bg-white/90"
            >
              Create Free Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground">
            © 2026 APEX AI Study Hub · Built for students
          </p>
        </div>
      </footer>
    </div>
  );
}
