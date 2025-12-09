import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Mail, Lock, Trash2, UserX, LogOut, Calendar, Clock, Globe, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VerificationCodeDialog from '@/components/UI/VerificationCodeDialog';
import { PageOnboarding, usePageOnboarding, resetAllOnboarding } from '@/components/UI/PageOnboarding';
import { accountOnboarding } from '@/components/UI/onboardingConfigs';
import { useLanguage } from '@/hooks/useLanguage';
import { logError } from '@/lib/errorLogger';

interface ProfileData {
  name: string;
  email: string;
  created_at: string;
  last_login: string | null;
  status: string;
  timezone: string;
}

export default function Account() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { showOnboarding, completeOnboarding } = usePageOnboarding('account');
  
  // Edit Name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Edit Email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  
  // Change Password
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Timezone
  const [selectedTimezone, setSelectedTimezone] = useState('America/Chicago');
  
  // Delete account confirmation
  const [deletePassword, setDeletePassword] = useState('');
  
  // Verification dialog
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'email_change' | 'account_reactivation' | 'account_deletion'>('email_change');

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfileData({
        name: data.name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        created_at: data.created_at,
        last_login: data.last_login,
        status: data.status,
        timezone: data.timezone || 'America/Chicago'
      });
      setNewName(data.name || '');
      setSelectedTimezone(data.timezone || 'America/Chicago');
    } catch (error: any) {
      logError(error, 'Account:fetchProfile');
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) {
      toast({
        title: t('common.error'),
        description: t('account.nameEmpty'),
        variant: "destructive"
      });
      return;
    }

    if (newName.length > 50) {
      toast({
        title: t('common.error'),
        description: t('account.nameTooLong'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('account.nameUpdated')
      });
      
      setEditingName(false);
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTimezone = async (newTimezone: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone: newTimezone })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('account.timezoneUpdated'),
        description: t('account.timezoneUpdatedDesc'),
      });
      
      setSelectedTimezone(newTimezone);
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      toast({
        title: t('common.error'),
        description: t('account.provideEmailPassword'),
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: t('common.error'),
        description: t('account.validEmail'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Verify password server-side with rate limiting
      const { error: verifyError } = await supabase.functions.invoke('verify-password', {
        body: { password: emailPassword }
      });

      if (verifyError) throw new Error('Password verification failed');

      // Update email immediately
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail 
      });

      if (error) throw error;

      toast({
        title: t('account.emailUpdated'),
        description: t('account.emailUpdatedDesc')
      });
      
      setEditingEmail(false);
      setEmailPassword('');
      setNewEmail('');
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('account.fillPasswordFields'),
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('account.passwordsNoMatch'),
        variant: "destructive"
      });
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast({
        title: t('common.error'),
        description: t('account.passwordStrength'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Verify password server-side with rate limiting
      const { error: verifyError } = await supabase.functions.invoke('verify-password', {
        body: { password: currentPassword }
      });

      if (verifyError) throw new Error('Current password is incorrect');

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('account.passwordChanged')
      });
      
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('account.deactivated'),
        description: t('account.deactivateSuccess')
      });
      
      // Log the user out immediately
      await signOut();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: t('account.reactivate'),
        description: t('account.reactivateSuccess'),
      });
      
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) return;

    // Show confirmation prompt before sending code
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. A verification code will be sent to your email.'
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      // Send verification code
      const { error: sendError } = await supabase.functions.invoke('send-verification-code', {
        body: { 
          actionType: 'account_delete',
          email: user.email 
        }
      });

      if (sendError) throw sendError;

      toast({
        title: t('account.verificationCodeSentTitle'),
        description: t('account.verificationCodeSentDesc'),
      });

      setShowVerificationDialog(true);
      setVerificationAction('account_deletion');
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAccountDelete = async (code: string) => {
    setLoading(true);
    try {
      // Call edge function with verification code
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { verificationCode: code }
      });
      
      if (error) throw error;

      toast({
        title: t('account.accountDeleted'),
        description: t('account.accountDeletedDesc'),
      });

      // Sign out after successful deletion
      await signOut();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleLogoutOtherSessions = async () => {
    setLoading(true);
    try {
      // Sign out from all sessions except current
      await supabase.auth.refreshSession();
      
      toast({
        title: t('common.success'),
        description: t('account.logoutSuccess')
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <PageOnboarding config={accountOnboarding} onComplete={completeOnboarding} />
      )}
      
      <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('account.title')}</h1>
        <p className="text-muted-foreground">{t('account.subtitle')}</p>
      </div>

      {/* A. Profile Information Display */}
      <Card className="p-6" data-tour="profile-info">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <User size={20} />
          {t('account.profileInfo')}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('account.name')}</Label>
              <p className="font-medium">{profileData.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('account.email')}</Label>
              <p className="font-medium">{profileData.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Calendar size={14} />
                {t('account.accountCreated')}
              </Label>
              <p className="font-medium">{new Date(profileData.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Clock size={14} />
                {t('account.lastLogin')}
              </Label>
              <p className="font-medium">
                {profileData.last_login 
                  ? new Date(profileData.last_login).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('account.status')}</Label>
            <p className={`font-medium ${profileData.status === 'active' ? 'text-success' : 'text-warning'}`}>
              {profileData.status === 'active' ? t('account.active') : t('account.inactive')}
            </p>
          </div>
        </div>
      </Card>

      {/* Reactivate Account (shown when inactive) */}
      {profileData.status === 'inactive' && (
        <Card className="p-6 border-warning bg-warning/5">
          <h2 className="text-xl font-semibold mb-4 text-warning">{t('account.deactivated')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('account.deactivatedDesc')}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={loading}
                className="bg-success hover:bg-success/90"
              >
                {t('account.reactivate')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('account.reactivateTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('account.reactivateDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleReactivateAccount} className="bg-success hover:bg-success/90">
                  {t('account.reactivate')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      )}

      {/* B. Edit Name */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{t('account.updateName')}</h2>
        {!editingName ? (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">{t('account.currentName')}: <span className="font-medium text-foreground">{profileData.name}</span></p>
            <Button onClick={() => setEditingName(true)} variant="outline">
              {t('account.editName')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="newName">{t('account.newName')}</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('account.enterName')}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">{newName.length}/50 {t('account.characters')}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateName} disabled={loading}>
                {loading ? t('common.updating') : t('common.save')}
              </Button>
              <Button onClick={() => setEditingName(false)} variant="outline">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Timezone Settings */}
      <Card className="p-6" data-tour="timezone">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Globe size={20} />
          {t('account.timezoneSettings')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('account.timezoneDesc')}
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="timezone">{t('account.selectTimezone')}</Label>
            <Select 
              value={selectedTimezone} 
              onValueChange={handleUpdateTimezone}
              disabled={loading}
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder={t('account.selectTimezone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                <SelectItem value="Pacific/Auckland">Auckland (NZDT)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {t('account.currentTimezone')}: {selectedTimezone}
            </p>
          </div>
        </div>
      </Card>

      {/* C. Edit Email */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mail size={20} />
          {t('account.updateEmail')}
        </h2>
        {!editingEmail ? (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">{t('account.currentEmail')}: <span className="font-medium text-foreground">{profileData.email}</span></p>
            <Button onClick={() => setEditingEmail(true)} variant="outline">
              {t('account.changeEmail')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="newEmail">{t('account.newEmail')}</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('account.enterNewEmail')}
              />
            </div>
            <div>
              <Label htmlFor="emailPassword">{t('account.currentPassword')}</Label>
              <Input
                id="emailPassword"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder={t('account.confirmWithPassword')}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleChangeEmail} disabled={loading}>
                {loading ? t('common.updating') : t('account.updateEmail')}
              </Button>
              <Button onClick={() => {
                setEditingEmail(false);
                setEmailPassword('');
                setNewEmail('');
              }} variant="outline">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* D. Change Password */}
      <Card className="p-6" data-tour="security">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock size={20} />
          {t('account.changePassword')}
        </h2>
        {!changingPassword ? (
          <Button onClick={() => setChangingPassword(true)} variant="outline">
            {t('account.changePassword')}
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">{t('account.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('account.enterCurrentPassword')}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">{t('account.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('account.enterNewPassword')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('account.passwordRequirements')}
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('account.confirmNewPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('account.confirmNewPasswordPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleChangePassword} disabled={loading}>
                {loading ? t('common.updating') : t('account.changePassword')}
              </Button>
              <Button onClick={() => {
                setChangingPassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }} variant="outline">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* F. Session Management */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <LogOut size={20} />
          {t('account.sessionManagement')}
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground mb-2">{t('account.activeDevice')}</p>
            <p className="text-sm">{t('account.lastActivity')}: {profileData.last_login ? new Date(profileData.last_login).toLocaleString() : 'Now'}</p>
          </div>
          <Separator />
          <Button onClick={handleLogoutOtherSessions} variant="outline" disabled={loading}>
            {loading ? t('common.loading') : t('account.logoutOtherDevices')}
          </Button>
        </div>
      </Card>

      {/* Reset Tutorials */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <RotateCcw size={20} />
          {t('account.tutorials')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {t('account.tutorialsDesc')}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <RotateCcw size={16} className="mr-2" />
              {t('account.resetAllTutorials')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('account.resetTutorialsTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('account.resetTutorialsDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  resetAllOnboarding();
                  toast({
                    title: t('account.tutorialsReset'),
                    description: t('account.tutorialsResetDesc'),
                  });
                }}
              >
                {t('account.resetAllTutorials')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      {/* E. Danger Zone */}
      <Card className="p-6 border-destructive">
        <h2 className="text-xl font-semibold mb-4 text-destructive">{t('account.dangerZone')}</h2>
        <div className="space-y-4">
          {/* Deactivate Account */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <UserX size={18} />
                {t('account.deactivateAccount')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('account.deactivateAccountDesc')}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">{t('account.deactivate')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('account.deactivateTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('account.deactivateDesc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivateAccount} className="bg-warning hover:bg-warning/90">
                    {t('account.deactivate')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Account */}
          <div className="p-4 border border-destructive rounded-lg space-y-4">
            <div>
              <h3 className="font-medium flex items-center gap-2 text-destructive mb-2">
                <Trash2 size={18} />
                {t('account.deleteAccount')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('account.deleteAccountDesc')}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-4">
                {t('account.verificationCodeSent')}
              </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  {t('account.deleteAccount')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('account.areYouSure')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('account.deleteWarning')}
                    <br /><br />
                    {t('account.verificationCodeTo')} <strong>{user?.email}</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {t('account.sendVerificationCode')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
      
      {/* Verification Code Dialog */}
      <VerificationCodeDialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        actionType={verificationAction}
        email={user?.email || ''}
        newEmail={verificationAction === 'email_change' ? newEmail : undefined}
        onVerified={() => {
          if (verificationAction === 'email_change') {
            fetchProfileData();
            setEditingEmail(false);
            setEmailPassword('');
            setNewEmail('');
          } else if (verificationAction === 'account_deletion') {
            // Already handled in handleVerifyAccountDelete
          }
        }}
      />
    </div>
    </>
  );
}
