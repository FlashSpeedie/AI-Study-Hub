import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address').max(255, 'Email is too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long');
const usernameSchema = z.string().min(2, 'Username must be at least 2 characters').max(50, 'Username is too long');

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralCodeStatus, setReferralCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [referralId, setReferralId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check for referral code in URL and pre-fill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      setIsLogin(false);
    }
  }, []);

  // Validate referral code with debounce
  useEffect(() => {
    if (referralCode.length < 8) {
      setReferralCodeStatus('idle');
      setReferralId(null);
      return;
    }

    const timer = setTimeout(async () => {
      setReferralCodeStatus('checking');
      const { data, error } = await supabase
        .from('referrals')
        .select('id, is_active, expires_at, max_uses, current_uses')
        .eq('code', referralCode)
        .single()

      if (error || !data) {
        setReferralCodeStatus('invalid');
        setReferralId(null);
        return;
      }

      const now = new Date();
      const expired = new Date(data.expires_at) < now;
      const maxed = data.current_uses >= data.max_uses

      if (!data.is_active || expired || maxed) {
        setReferralCodeStatus('invalid');
        setReferralId(null);
      } else {
        setReferralCodeStatus('valid');
        setReferralId(data.id);
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [referralCode])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(formData.email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password reset email sent! Check your inbox.');
      setIsForgotPassword(false);
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(formData.email);
      passwordSchema.parse(formData.password);
      if (!isLogin) {
        usernameSchema.parse(formData.username);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const redirectUrl = `${window.location.origin}/dashboard`;
        
        const { error, data } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: formData.username || formData.email.split('@')[0],
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('An account with this email already exists');
          } else {
            toast.error(error.message);
          }
          return;
        }

        // If user signed up with a referral code, record it
        if (referralId && data.user) {
          await supabase.from('referral_uses').insert({
            referral_id: referralId,
            referred_user_id: data.user.id,
          });
          await supabase.rpc('increment_referral_uses', { ref_id: referralId });
          await supabase.from('profiles').update({
            referred_by: referralId
          }).eq('id', data.user.id);
        }

        // Send welcome email (fire-and-forget, wrapped in try/catch)
        if (data.user) {
          try {
            await supabase.functions.invoke('send-welcome-email', {
              body: {
                email: data.user.email,
                username: formData.username || data.user.email?.split('@')[0] || 'Student'
              }
            })
          } catch (e) {
            console.error('Failed to send welcome email:', e)
          }
        }

        toast.success('Account created! You can now sign in.');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy via-navy-light to-navy-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-sky rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-8 mx-auto shadow-xl">
              <span className="text-white font-black text-5xl">A</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r 
              from-primary to-purple-400 bg-clip-text text-transparent">
              APEX
            </h1>
            <p className="text-sm text-muted-foreground tracking-widest uppercase mt-2">
              AI Study Hub
            </p>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-md">
              Your comprehensive educational companion for academic excellence
            </p>
            <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
              {[
                'Grade Tracking',
                'Periodic Table',
                'AI Assistant',
                'Quiz Generator',
                'AI Detector',
                'Humanizer',
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-2 text-primary-foreground/70"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xl">A</span>
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">APEX</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold mb-2">
              {isForgotPassword 
                ? 'Reset password' 
                : isLogin 
                  ? 'Welcome back' 
                  : 'Create account'}
            </h2>
            <p className="text-muted-foreground">
              {isForgotPassword
                ? 'Enter your email to receive a reset link'
                : isLogin
                  ? 'Sign in to continue your learning journey'
                  : 'Start your academic excellence journey'}
            </p>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@student.edu"
                    className="pl-10 h-12"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isLoading}
                    maxLength={255}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-navy-light" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsForgotPassword(false)}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    className="pl-10 h-12"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={isLoading}
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@student.edu"
                  className="pl-10 h-12"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                  maxLength={72}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="referral-code">
                  Referral Code 
                  <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="referral-code"
                    type="text"
                    placeholder="Enter referral code (e.g. APEX1234)"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value.toUpperCase().trim())}
                    maxLength={8}
                    className="uppercase tracking-widest font-mono"
                  />
                  {referralCodeStatus === 'valid' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 
                      text-green-500 text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Valid
                    </div>
                  )}
                  {referralCodeStatus === 'invalid' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 
                      text-red-500 text-xs font-medium flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Invalid
                    </div>
                  )}
                </div>
                {referralCodeStatus === 'valid' && (
                  <p className="text-xs text-green-600 mt-1">
                    🎉 You were referred by a friend! Welcome to APEX.
                  </p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setIsForgotPassword(true)}
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full h-12 bg-primary hover:bg-navy-light" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
          )}

          {!isForgotPassword && (
            <p className="text-center mt-6 text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
