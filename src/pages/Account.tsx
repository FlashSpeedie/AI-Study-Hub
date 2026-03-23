import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Shield, 
  Settings, 
  BarChart3, 
  AlertTriangle, 
  Upload, 
  Camera,
  Mail, 
  Lock, 
  Sun, 
  Moon, 
  Monitor,
  Bell,
  BellOff,
  Check,
  X,
  Loader2,
  BookOpen,
  FileText,
  ListTodo
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const GRADE_LEVELS = [
  'Middle School',
  '9th-12th Grade',
  'College Freshman-Senior',
  'Graduate School'
];

export default function Account() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, academicYears, logout } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [school, setSchool] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Security state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Preferences state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notificationTasksDue, setNotificationTasksDue] = useState(true);
  const [notificationAssignmentsDue, setNotificationAssignmentsDue] = useState(true);
  const [notificationWeeklyReport, setNotificationWeeklyReport] = useState(false);
  
  // Statistics state
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalAssignments: 0,
    totalNotes: 0,
    tasksCompleted: 0,
    memberSince: ''
  });
  
  // Danger zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/');
        return;
      }
      setUser(authUser);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setUsername(profileData.username || '');
        setBio(profileData.bio || '');
        setGradeLevel(profileData.grade_level || '');
        setSchool(profileData.school || '');
        setAvatarUrl(profileData.avatar_url || '');
        setTheme(profileData.theme || 'system');
        setNotificationTasksDue(profileData.notification_preferences?.tasksDue ?? true);
        setNotificationAssignmentsDue(profileData.notification_preferences?.assignmentsDue ?? true);
        setNotificationWeeklyReport(profileData.notification_preferences?.weeklyReport ?? false);
      }
      
      // Fetch stats
      const [subjectsCount, assignmentsCount, notesCount, tasksCompleted] = await Promise.all([
        supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id),
        supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id),
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id).eq('completed', true)
      ]);
      
      const memberSince = profileData?.created_at 
        ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Unknown';
      
      setStats({
        totalSubjects: subjectsCount.count || 0,
        totalAssignments: assignmentsCount.count || 0,
        totalNotes: notesCount.count || 0,
        tasksCompleted: tasksCompleted.count || 0,
        memberSince
      });
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `avatars/${user.id}/avatar.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });
      
      setAvatarUrl(publicUrl);
      toast.success('Photo updated ✓');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          username,
          bio,
          grade_level: gradeLevel,
          school,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      toast.success('Profile updated ✓');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !user) return;
    
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success(`Confirmation email sent to ${newEmail}`);
      setNewEmail('');
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast.error(error.message || 'Failed to change email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated ✓');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          theme: newTheme,
          updated_at: new Date().toISOString()
        });
    }
  };

  const handleNotificationChange = async (
    type: 'tasksDue' | 'assignmentsDue' | 'weeklyReport',
    value: boolean
  ) => {
    let newPrefs = {
      tasksDue: notificationTasksDue,
      assignmentsDue: notificationAssignmentsDue,
      weeklyReport: notificationWeeklyReport
    };
    
    if (type === 'tasksDue') {
      setNotificationTasksDue(value);
      newPrefs.tasksDue = value;
    } else if (type === 'assignmentsDue') {
      setNotificationAssignmentsDue(value);
      newPrefs.assignmentsDue = value;
    } else {
      setNotificationWeeklyReport(value);
      newPrefs.weeklyReport = value;
    }
    
    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          notification_preferences: newPrefs,
          updated_at: new Date().toISOString()
        });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== 'DELETE MY ACCOUNT') return;
    
    setDeleting(true);
    try {
      const userId = user.id;
      
      // Delete in exact order specified
      await supabase.from('assignments').delete().eq('user_id', userId);
      await supabase.from('categories').delete().eq('user_id', userId);
      await supabase.from('subjects').delete().eq('user_id', userId);
      await supabase.from('semesters').delete().eq('user_id', userId);
      await supabase.from('academic_years').delete().eq('user_id', userId);
      await supabase.from('notes').delete().eq('user_id', userId);
      await supabase.from('tasks').delete().eq('user_id', userId);
      await supabase.from('flashcard_decks').delete().eq('user_id', userId);
      await supabase.from('lecture_recordings').delete().eq('user_id', userId);
      await supabase.from('notifications').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      
      await supabase.auth.signOut();
      
      // Clear store and localStorage
      useStore.getState().logout?.();
      localStorage.clear();
      
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Account & Settings</h1>
        <p className="text-muted-foreground">Manage your profile, security, and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2 text-red-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {getInitials(fullName || username || 'User')}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                  aria-label="Change photo"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Click to upload a new photo</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School Name</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. OSSM, OU, OSU"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="mt-6">
              Save Changes
            </Button>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Email</h3>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Change Email</h3>
              <div className="flex gap-3">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="flex-1"
                />
                <Button 
                  onClick={handleChangeEmail} 
                  disabled={!newEmail || emailLoading}
                >
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Link'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                A confirmation link will be sent to your new email address.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button 
                  onClick={handleChangePassword}
                  disabled={!newPassword || !confirmPassword || passwordLoading}
                >
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update Password
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme</h3>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('light')}
                  className="gap-2"
                >
                  <Sun className="w-4 h-4" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('dark')}
                  className="gap-2"
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('system')}
                  className="gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  System
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notify when tasks are due</Label>
                    <p className="text-sm text-muted-foreground">Get notified about upcoming task deadlines</p>
                  </div>
                  <Switch
                    checked={notificationTasksDue}
                    onCheckedChange={(checked) => handleNotificationChange('tasksDue', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notify when assignments are due</Label>
                    <p className="text-sm text-muted-foreground">Get notified about upcoming assignment deadlines</p>
                  </div>
                  <Switch
                    checked={notificationAssignmentsDue}
                    onCheckedChange={(checked) => handleNotificationChange('assignmentsDue', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly study report</Label>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of your progress</p>
                  </div>
                  <Switch
                    checked={notificationWeeklyReport}
                    onCheckedChange={(checked) => handleNotificationChange('weeklyReport', checked)}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{stats.totalSubjects}</p>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold">{stats.totalAssignments}</p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-3xl font-bold">{stats.totalNotes}</p>
                <p className="text-sm text-muted-foreground">Total Notes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <ListTodo className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-3xl font-bold">{stats.tasksCompleted}</p>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center col-span-2 md:col-span-1">
                <User className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-lg font-bold">{stats.memberSince}</p>
                <p className="text-sm text-muted-foreground">Member Since</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <Card className="p-6 border-red-200 dark:border-red-900">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-500 mb-2">Delete My Account</h3>
                <p className="text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. All your data including grades, notes, tasks, and flashcards will be permanently deleted.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete My Account
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please type exactly as shown to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                Warning: This will permanently delete all your data including:
              </p>
              <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                <li>All grades and academic records</li>
                <li>All notes and flashcards</li>
                <li>All tasks and assignments</li>
                <li>Your profile and account</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmDelete">Type "DELETE MY ACCOUNT" to confirm</Label>
              <Input
                id="confirmDelete"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE MY ACCOUNT' || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
