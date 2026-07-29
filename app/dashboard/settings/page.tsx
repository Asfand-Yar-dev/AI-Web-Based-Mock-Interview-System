"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { motion } from "framer-motion";
import { User, Bell, Shield, Palette, Loader2, Check, AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth, useRequireAuth } from "@/contexts/auth-context";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading, user, updateProfile, refreshUser } = useRequireAuth() as ReturnType<typeof useAuth> & { isAuthenticated: boolean };
  const { theme, setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    email:    user?.settings?.emailNotifications    ?? true,
    practice: user?.settings?.interviewReminders    ?? false,
    tips:     user?.settings?.resultNotifications   ?? true,
  });

  const [profile, setProfile] = useState({
    name: user?.name || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false });
  const hasPassword = user?.hasPassword ?? (user?.authProvider !== "google");

  // Sync profile name and notification preferences once the user object is loaded
  // (useState initial values run before auth resolves, so we need useEffect here)
  useEffect(() => {
    if (user) {
      setProfile({ name: user.name });
      setNotifications({
        email:    user.settings?.emailNotifications    ?? true,
        practice: user.settings?.interviewReminders    ?? false,
        tips:     user.settings?.resultNotifications   ?? true,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleProfileChange = (key: "name", value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ name: profile.name.trim() });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (hasPassword && !passwordData.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (hasPassword && passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password must be different from your current password");
      return;
    }

    setIsChangingPassword(true);
    try {
      if (hasPassword) {
        await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
        toast.success("Password changed successfully!");
      } else {
        await authApi.setPassword(passwordData.newPassword);
        await refreshUser();
        toast.success("Password set", {
          description: "You can now log in with email and password.",
        });
      }
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(hasPassword ? "Failed to change password" : "Failed to set password", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);

    // Map frontend keys → backend field names
    const backendMap: Record<keyof typeof notifications, string> = {
      email:    "emailNotifications",
      practice: "interviewReminders",
      tips:     "resultNotifications",
    };

    try {
      await authApi.updateSettings({
        [backendMap[key]]: newNotifications[key],
      });
      toast.success("Notification preferences saved");
    } catch (error) {
      // Revert optimistic update on failure
      setNotifications(notifications);
      toast.error("Failed to save preferences", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isGoogleUser = user?.authProvider === 'google';

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and settings
          </p>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-[18px] border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">
                Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Your personal information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  className="bg-secondary/50 border-border/50"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-secondary/50 border-border/50 opacity-60"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
            
            {/* Auth Provider Badge */}
            {isGoogleUser && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm text-muted-foreground">Signed in with Google</span>
              </div>
            )}

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-[18px] border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your notification preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium text-card-foreground">
                  Email Notifications
                </p>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange("email")}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium text-card-foreground">
                  Practice Reminders
                </p>
                <p className="text-sm text-muted-foreground">
                  Daily reminders to practice
                </p>
              </div>
              <Switch
                checked={notifications.practice}
                onCheckedChange={() => handleNotificationChange("practice")}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-card-foreground">Weekly Tips</p>
                <p className="text-sm text-muted-foreground">
                  Receive interview tips weekly
                </p>
              </div>
              <Switch
                checked={notifications.tips}
                onCheckedChange={() => handleNotificationChange("tips")}
              />
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-[18px] border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">
                Security
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your account security
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isGoogleUser && !hasPassword && !showPasswordForm && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-card-foreground">No password set</p>
                  <p className="text-muted-foreground mt-0.5">
                    You signed up with Google. Add a password so you can also sign in with email.
                  </p>
                </div>
              </div>
            )}

            {!showPasswordForm ? (
              <Button
                variant="outline"
                className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent font-medium"
                onClick={() => setShowPasswordForm(true)}
              >
                {hasPassword ? "Change Password" : "Set Password"}
              </Button>
            ) : (
              <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/30">
                {hasPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPw.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="bg-secondary/50 border-border/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPw.current ? "Hide password" : "Show password"}
                      >
                        {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPw.next ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="bg-secondary/50 border-border/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPw.next ? "Hide password" : "Show password"}
                    >
                      {showPw.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPw.next ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {hasPassword ? "Changing..." : "Setting..."}
                      </>
                    ) : (
                      hasPassword ? "Update Password" : "Set Password"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-[18px] border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">
                Appearance
              </h2>
              <p className="text-sm text-muted-foreground">
                Customize your experience
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className={theme === "dark" ? "bg-accent text-accent-foreground" : "bg-transparent border-border/50"}
              onClick={() => setTheme("dark")}
            >
              Dark Mode
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className={theme === "light" ? "bg-accent text-accent-foreground" : "bg-transparent border-border/50"}
              onClick={() => setTheme("light")}
            >
              Light Mode
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className={theme === "system" ? "bg-accent text-accent-foreground" : "bg-transparent border-border/50"}
              onClick={() => setTheme("system")}
            >
              System
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
