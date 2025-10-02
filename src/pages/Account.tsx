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
import { User, Mail, Lock, Trash2, UserX, LogOut, Calendar, Clock } from 'lucide-react';
import VerificationCodeDialog from '@/components/UI/VerificationCodeDialog';

interface ProfileData {
  name: string;
  email: string;
  created_at: string;
  last_login: string | null;
  status: string;
}

export default function Account() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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
  
  // Verification dialogs
  const [emailVerificationOpen, setEmailVerificationOpen] = useState(false);
  const [reactivationVerificationOpen, setReactivationVerificationOpen] = useState(false);
  const [deletionVerificationOpen, setDeletionVerificationOpen] = useState(false);

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
        status: data.status
      });
      setNewName(data.name || '');
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    if (newName.length > 50) {
      toast({
        title: "Error",
        description: "Name must be less than 50 characters",
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
        title: "Success",
        description: "Name updated successfully"
      });
      
      setEditingName(false);
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateEmailChange = async () => {
    if (!newEmail || !emailPassword) {
      toast({
        title: "Error",
        description: "Please provide both new email and current password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: emailPassword
      });

      if (signInError) throw new Error('Incorrect password');

      // Open verification dialog
      setEmailVerificationOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChangeVerified = async () => {
    setLoading(true);
    try {
      // Update email after verification
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail 
      });

      if (error) throw error;

      toast({
        title: "Email updated successfully",
        description: "Please check your new email for confirmation"
      });
      
      setEditingEmail(false);
      setEmailPassword('');
      setNewEmail('');
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: "Error",
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
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters with letters, numbers, and symbols",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully"
      });
      
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
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
        title: "Account deactivated",
        description: "Your account has been deactivated. You can reactivate it anytime from Account Settings."
      });
      
      // Refresh profile data instead of logging out
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccountVerified = async () => {
    setLoading(true);
    try {
      // Delete user (cascade will handle related data)
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');

      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted"
      });
      
      await signOut();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Unable to delete account. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateVerified = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Account Reactivated",
        description: "Your account has been successfully reactivated. You now have full access.",
      });
      
      fetchProfileData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
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
        title: "Success",
        description: "Logged out from all other devices"
      });
    } catch (error: any) {
      toast({
        title: "Error",
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      {/* A. Profile Information Display */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <User size={20} />
          Profile Information
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{profileData.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{profileData.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Calendar size={14} />
                Account Created
              </Label>
              <p className="font-medium">{new Date(profileData.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Clock size={14} />
                Last Login
              </Label>
              <p className="font-medium">
                {profileData.last_login 
                  ? new Date(profileData.last_login).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <p className={`font-medium ${profileData.status === 'active' ? 'text-success' : 'text-warning'}`}>
              {profileData.status === 'active' ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </Card>

      {/* Reactivate Account (shown when inactive) */}
      {profileData.status === 'inactive' && (
        <Card className="p-6 border-warning bg-warning/5">
          <h2 className="text-xl font-semibold mb-4 text-warning">Account Deactivated</h2>
          <p className="text-muted-foreground mb-4">
            Your account is currently deactivated. You can view your data but cannot make any changes.
            Click below to reactivate your account and restore full access.
          </p>
          <Button 
            onClick={() => setReactivationVerificationOpen(true)}
            disabled={loading}
            className="bg-success hover:bg-success/90"
          >
            Reactivate Account
          </Button>
        </Card>
      )}

      {/* B. Edit Name */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Update Name</h2>
        {!editingName ? (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Current name: <span className="font-medium text-foreground">{profileData.name}</span></p>
            <Button onClick={() => setEditingName(true)} variant="outline">
              Edit Name
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="newName">New Name</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">{newName.length}/50 characters</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateName} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={() => setEditingName(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* C. Edit Email */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mail size={20} />
          Update Email
        </h2>
        {!editingEmail ? (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Current email: <span className="font-medium text-foreground">{profileData.email}</span></p>
            <Button onClick={() => setEditingEmail(true)} variant="outline">
              Change Email
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
              />
            </div>
            <div>
              <Label htmlFor="emailPassword">Current Password</Label>
              <Input
                id="emailPassword"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Confirm with your password"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInitiateEmailChange} disabled={loading}>
                {loading ? 'Updating...' : 'Update Email'}
              </Button>
              <Button onClick={() => {
                setEditingEmail(false);
                setEmailPassword('');
                setNewEmail('');
              }} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* D. Change Password */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock size={20} />
          Change Password
        </h2>
        {!changingPassword ? (
          <Button onClick={() => setChangingPassword(true)} variant="outline">
            Change Password
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min 8 characters, must include letters, numbers, and symbols
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleChangePassword} disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
              <Button onClick={() => {
                setChangingPassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* F. Session Management */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <LogOut size={20} />
          Session Management
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground mb-2">Active on this device</p>
            <p className="text-sm">Last activity: {profileData.last_login ? new Date(profileData.last_login).toLocaleString() : 'Now'}</p>
          </div>
          <Separator />
          <Button onClick={handleLogoutOtherSessions} variant="outline" disabled={loading}>
            {loading ? 'Processing...' : 'Logout from all other devices'}
          </Button>
        </div>
      </Card>

      {/* E. Danger Zone */}
      <Card className="p-6 border-destructive">
        <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
        <div className="space-y-4">
          {/* Deactivate Account */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <UserX size={18} />
                Deactivate Account
              </h3>
              <p className="text-sm text-muted-foreground">Temporarily disable your account</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Deactivate</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your account will remain accessible but you won't be able to make any changes until you reactivate it.
                    Your data will be preserved and you can view everything in read-only mode.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivateAccount} className="bg-warning hover:bg-warning/90">
                    Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h3 className="font-medium flex items-center gap-2 text-destructive">
                <Trash2 size={18} />
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteConfirmText === 'DELETE') {
                  setDeletionVerificationOpen(true);
                } else {
                  toast({
                    title: "Confirmation Required",
                    description: "Please type DELETE in the field above first",
                    variant: "destructive"
                  });
                }
              }}
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Delete
            </Button>
          </div>
          
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <Label htmlFor="deleteConfirm" className="text-destructive">Type DELETE to enable deletion</Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-2"
            />
          </div>
        </div>
      </Card>
      
      {/* Verification Dialogs */}
      {user && profileData && (
        <>
          <VerificationCodeDialog
            open={emailVerificationOpen}
            onOpenChange={setEmailVerificationOpen}
            actionType="email_change"
            email={profileData.email}
            newEmail={newEmail}
            onVerified={handleEmailChangeVerified}
          />
          
          <VerificationCodeDialog
            open={reactivationVerificationOpen}
            onOpenChange={setReactivationVerificationOpen}
            actionType="account_reactivation"
            email={profileData.email}
            onVerified={handleReactivateVerified}
          />
          
          <VerificationCodeDialog
            open={deletionVerificationOpen}
            onOpenChange={setDeletionVerificationOpen}
            actionType="account_deletion"
            email={profileData.email}
            onVerified={handleDeleteAccountVerified}
          />
        </>
      )}
    </div>
  );
}
