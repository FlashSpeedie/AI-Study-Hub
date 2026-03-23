import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Layers, FileText, GraduationCap, Timer, Shield, Sparkles } from 'lucide-react';
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
    { emoji: '📊', name: 'Grade Tracking', desc: 'Track assignments and see your GPA live' },
    { emoji: '🤖', name: 'AI Notes', desc: 'Let AI enhance and organize your notes' },
    { emoji: '🃏', name: 'Flashcards', desc: 'Generate flashcards from any topic' },
    { emoji: '📝', name: 'Quiz Generator', desc: 'Test yourself with AI-generated quizzes' },
    { emoji: '🎓', name: 'AI Tutor', desc: 'Get help from an AI-powered tutor' },
    { emoji: '⏱️', name: 'Pomodoro Timer', desc: 'Stay focused with timed study sessions' },
  ];

  const stats = [
    '10+ AI Tools',
    '100% Free',
    'Cloud Synced',
    'Built for Students'
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
                APEX
              </span>{' '}
              <span className="text-foreground">AI Study Hub</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8"
          >
            Study Smarter with AI
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            The all-in-one academic companion for students
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" onClick={() => navigate('/login')} className="text-lg px-8">
              Get Started Free
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-3">{feature.emoji}</div>
                  <h3 className="text-lg font-semibold mb-2">{feature.name}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
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
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
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
          <h2 className="text-3xl font-display font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: 'Sign Up Free', desc: 'Create your account in seconds' },
              { step: 2, title: 'Add Your Subjects', desc: 'Set up your courses and grades' },
              { step: 3, title: 'Study Smarter', desc: 'Use AI tools to boost productivity' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
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
