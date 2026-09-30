import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '../../lib/supabase';
import React, {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Lock,
  Mail,
  Menu,
  Phone,
  Search,
  Shield,
  Star,
  Trash2,
  User,
  X,
  LogOut,
} from 'lucide-react';


export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarLetter: string;
  avatarBgColor: string;
  memberSince: string;
  bio: string;
  stats: {
    reviewsCount: number;
    followingCount: number;
    helpfulCount: number;
  };
}

export type SearchCategory =
  | 'website'
  | 'email'
  | 'phone'
  | 'crypto'
  | null;

export interface PasswordChecklist {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  hasMixedCase: boolean;
}

export interface PasswordStrength {
  score: number;
  percentage: string;
  label: string;
  color: string;
  checklist: PasswordChecklist;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const detectSearchCategory = (input: string): SearchCategory => {
  const query = input.trim();

  if (query.length < 3) {
    return null;
  }

  // Crypto wallet
  if (
    /^0x[a-fA-F0-9]{40}$/.test(query) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(query) ||
    /^bc1[a-z0-9]{39,59}$/.test(query)
  ) {
    return 'crypto';
  }

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(query)) {
    return 'email';
  }

  // Phone
  const digitsOnly = query.replace(/\D/g, '');

  if (
    /^\+[1-9][\d\s\-()]{7,18}$/.test(query) &&
    digitsOnly.length >= 8 &&
    digitsOnly.length <= 15
  ) {
    return 'phone';
  }

  // Website
  let domain =
    query
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^\/\//, '')
      .split(/[\/?#]/)[0] ?? '';

  if (domain.startsWith('www.')) {
    domain = domain.slice(4);
  }

  const isDomain =
    domain.length > 0 &&
    domain.includes('.') &&
    /^[a-z0-9.-]+$/.test(domain) &&
    !domain.includes('..') &&
    !domain.startsWith('.') &&
    !domain.endsWith('.');

  return isDomain ? 'website' : null;
};

const evaluatePasswordStrength = (
  password: string
): PasswordStrength => {
  const checklist: PasswordChecklist = {
    hasMinLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSymbol: /[^a-zA-Z0-9]/.test(password),
    hasMixedCase:
      /[a-z]/.test(password) && /[A-Z]/.test(password),
  };

  const score = Object.values(checklist).filter(Boolean).length;

  if (password.length === 0) {
    return {
      score: 0,
      percentage: '0%',
      label: '',
      color: 'border',
      checklist,
    };
  }

  switch (score) {
    case 1:
      return {
        score: 1,
        percentage: '25%',
        label: 'Weak',
        color: '#ef4444',
        checklist,
      };

    case 2:
      return {
        score: 2,
        percentage: '50%',
        label: 'Fair',
        color: '#f97316',
        checklist,
      };

    case 3:
      return {
        score: 3,
        percentage: '75%',
        label: 'Good',
        color: 'primary',
        checklist,
      };

    case 4:
      return {
        score: 4,
        percentage: '100%',
        label: 'Strong',
        color: 'primary',
        checklist,
      };

    default:
      return {
        score: 0,
        percentage: '0%',
        label: '',
        color: 'border',
        checklist,
      };
  }
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    displayName: '',
    email: '',
    avatarLetter: 'U',
    avatarBgColor: 'primary',
    memberSince: '',
    bio: '',
    stats: {
      reviewsCount: 0,
      followingCount: 0,
      helpfulCount: 0,
    },
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [isUserMenuOpen, setIsUserMenuOpen] =
    useState(false);

  const [isLangMenuOpen, setIsLangMenuOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [isUpdatingPw, setIsUpdatingPw] =
    useState(false);

  const [toastMessage, setToastMessage] =
    useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] =
    useState(false);

  const searchCategory = useMemo(
    () => detectSearchCategory(searchQuery),
    [searchQuery]
  );

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(newPassword),
    [newPassword]
  );

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (): Promise<void> => {
      setIsLoadingProfile(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setIsLoadingProfile(false);
          showToast('Your session has expired. Please log in again.');
        }
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);

        if (isMounted) {
          setIsLoadingProfile(false);
          showToast('Could not load your profile information.');
        }
        return;
      }

      // Dashboard Home uses profiles.username, so Profile uses the same
      // field as the source of truth for the displayed username.
      const displayName =
        data.username?.trim() || data.full_name?.trim() || 'User';

      if (isMounted) {
        setProfile((previous) => ({
          ...previous,
          id: user.id,
          displayName,
          email: user.email || data.email || '',
          avatarLetter: displayName.charAt(0).toUpperCase(),
          memberSince: new Intl.DateTimeFormat('en-US', {
            month: 'short',
            year: 'numeric',
          }).format(new Date(user.created_at)),
          // No `bio` column is assumed in profiles.
          bio: '',
        }));
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const showToast = (message: string): void => {
    setToastMessage(message);
  };

  const handleProfileSubmit = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (isSavingProfile || !profile.id) {
      return;
    }

    const displayName = profile.displayName.trim();

    if (displayName.length < 2) {
      showToast('Display name must be at least 2 characters.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          // Dashboard Home reads this same field.
          username: displayName,
        })
        .eq('id', profile.id);

      if (profileError) {
        throw profileError;
      }

      setProfile((previous) => ({
        ...previous,
        displayName,
        avatarLetter: displayName.charAt(0).toUpperCase(),
      }));

      showToast('Profile information saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast(
        error instanceof Error
          ? error.message
          : 'Could not save your profile information.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (isUpdatingPw) {
      return;
    }

    if (passwordStrength.score < 4) {
      showToast(
        'Please meet all password requirements before submitting.'
      );
      return;
    }

    if (!currentPassword.trim()) {
      showToast('Please enter your current password.');
      return;
    }

    if (currentPassword === newPassword) {
      showToast(
        'Your new password must be different from your current password.'
      );
      return;
    }

    setIsUpdatingPw(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        throw userError || new Error('No authenticated user found.');
      }

      // Supabase does not expose the current password. Re-authenticate with
      // it first so the existing password field is actually verified.
      const { error: reauthError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

      if (reauthError) {
        throw new Error('Current password is incorrect.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword('');
      setNewPassword('');
      setShowCurrentPw(false);
      setShowNewPw(false);
      showToast('Password updated successfully!');
    } catch (error) {
      console.error('Error updating password:', error);
      showToast(
        error instanceof Error
          ? error.message
          : 'Could not update your password.'
      );
    } finally {
      setIsUpdatingPw(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    if (isLoadingProfile) {
      return;
    }

    setIsUserMenuOpen(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out:', error);
      showToast('Could not log out. Please try again.');
      return;
    }

    window.location.href = '/login';
  };

  const handleDeleteAccount = (): void => {
    setIsDeleteModalOpen(false);
    showToast('Account deletion process initiated.');
  };


  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col antialiased">
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[60] bg-foreground text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border border-border"
        >
          <CheckCircle2 className="w-5 h-5 text-brand-lime flex-shrink-0" />

          <span className="text-xs font-medium">
            {toastMessage}
          </span>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3
              id="delete-account-title"
              className="font-bold text-base text-foreground mb-2"
            >
              Delete Account
            </h3>

            <p className="text-xs text-foreground/60 mb-6 leading-relaxed">
              Are you sure you want to delete your account?
              All reviews and personal data will be permanently
              purged.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-border/50 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <a
              href="/dashboard/home"
              className="flex items-center gap-2.5 group flex-shrink-0"
            >
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-primary/20">
                <Shield className="w-5 h-5 stroke-[2.5]" />
              </div>

              <span className="font-extrabold text-xl text-foreground tracking-tight">
                SCAMLEX
              </span>
            </a>

            {/* Desktop Navigation & Actions */}
            <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
              <a
                href="#about"
                className="text-xs font-medium text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg transition-colors"
              >
                About
              </a>

              <a
                href="#blog"
                className="text-xs font-medium text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg transition-colors"
              >
                Blog
              </a>

              <a
                href="#contact"
                className="text-xs font-medium text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg transition-colors"
              >
                Contact
              </a>

              <a
                href="#dashboard"
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-2 rounded-lg"
              >
                Dashboard
              </a>

              <button
                type="button"
                onClick={() =>
                  showToast('No new notifications')
                }
                aria-label="Notifications"
                className="p-2 text-foreground/60 rounded-lg relative hover:bg-border/50 transition-colors"
              >
                <Bell className="w-4 h-4" />

                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-lime rounded-full ring-2 ring-white" />
              </button>

              {/* User Menu */}
              <div className="relative ml-1">
                <button
                  type="button"
                  aria-expanded={isUserMenuOpen}
                  onClick={() => {
                    setIsUserMenuOpen(
                      (previous) => !previous
                    );
                    setIsLangMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 pr-2.5 bg-white border border-border rounded-xl hover:bg-border/30 transition-colors"
                >
                  <div className="size-6 rounded-2xl border-2 border-white/80 bg-[#3851c2] flex items-center justify-center font-display text-1xl font-bold text-white shadow-sm backdrop-blur-sm">
                    {profile.avatarLetter}
                  </div>

                  <span className="text-xs font-medium text-foreground max-w-[90px] truncate">
                    {profile.displayName}
                  </span>

                  <ChevronDown className="w-3.5 h-3.5 text-foreground/40" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-2xl shadow-xl p-1.5 z-50">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs font-bold text-foreground">
                        {profile.displayName}
                      </p>

                      <p className="text-[11px] text-foreground/50 truncate">
                        {profile.email}
                      </p>
                    </div>

                    <div className="h-px bg-border my-1" />

                    <a
                      href="/auth"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-border/50 transition-colors font-medium"
                    >
                      <LogOut className="size-4 text-primary" />
                      Logout
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                aria-label={
                  isMobileMenuOpen
                    ? 'Close navigation menu'
                    : 'Open navigation menu'
                }
                aria-expanded={isMobileMenuOpen}
                onClick={() =>
                  setIsMobileMenuOpen(
                    (previous) => !previous
                  )
                }
                className="p-2 text-foreground"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-border py-4 space-y-2">
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(
                    e: ChangeEvent<HTMLInputElement>
                  ) => setSearchQuery(e.target.value)}
                  placeholder="Check website, email, phone, wallet..."
                  aria-label="Search"
                  className="w-full bg-border/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:bg-white focus:outline-none focus:ring-2 focus:ring-[primary]/20 focus:border-primary"
                />
              </div>

              <a
                href="#about"
                onClick={() =>
                  setIsMobileMenuOpen(false)
                }
                className="block px-3 py-2.5 text-sm text-foreground/80 hover:bg-border/40 rounded-lg"
              >
                About
              </a>

              <a
                href="#blog"
                onClick={() =>
                  setIsMobileMenuOpen(false)
                }
                className="block px-3 py-2.5 text-sm text-foreground/80 hover:bg-border/40 rounded-lg"
              >
                Blog
              </a>

              <a
                href="#contact"
                onClick={() =>
                  setIsMobileMenuOpen(false)
                }
                className="block px-3 py-2.5 text-sm text-foreground/80 hover:bg-border/40 rounded-lg"
              >
                Contact
              </a>

              <a
                href="#dashboard"
                onClick={() =>
                  setIsMobileMenuOpen(false)
                }
                className="block px-3 py-2.5 text-sm font-bold text-primary bg-primary/10 rounded-lg"
              >
                Dashboard
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Main */}
      <main
        id="dashboard"
        className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full"
      >
        {/* Page Heading */}
        <div className="flex items-center gap-3 mb-6">
          <a
            href="/dashboard/home"
            className="w-9 h-9 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center text-foreground/50 hover:text-primary transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>

          <h1 className="font-extrabold text-2xl text-foreground tracking-tight">
            Profile Settings
          </h1>
        </div>

        {/* Profile Overview */}
        <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="h-1.5 bg-primary" />

          <div className="p-6">
            <div className="flex items-center gap-4 flex-wrap">

              <div className="size-16 rounded-2xl border-2 border-white/80 bg-[#3851c2] flex items-center justify-center font-display text-2xl font-bold text-white shadow-sm backdrop-blur-sm">
                {profile.avatarLetter}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-foreground truncate">
                  {profile.displayName}
                </h2>

                <p className="text-xs text-foreground/50 truncate">
                  {profile.email}
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-lime text-foreground">
                  <span>
                    Member since {profile.memberSince}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-0 border-t border-border mt-5 pt-4">
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-foreground">
                  {profile.stats.reviewsCount}
                </div>

                <div className="text-[11px] text-foreground/50">
                  Reviews
                </div>
              </div>

              <div className="text-center border-x border-border">
                <div className="font-mono text-xl font-bold text-foreground">
                  {profile.stats.followingCount}
                </div>

                <div className="text-[11px] text-foreground/50">
                  Following
                </div>
              </div>

              <div className="text-center">
                <div className="font-mono text-xl font-bold text-foreground">
                  {profile.stats.helpfulCount}
                </div>

                <div className="text-[11px] text-foreground/50">
                  Helpful
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section
          id="profile"
          className="bg-white border border-border rounded-2xl shadow-sm mb-5 overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-border bg-border/20">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>

            <h3 className="font-bold text-sm text-foreground">
              Personal Information
            </h3>
          </div>

          <div className="p-6">
            <form
              onSubmit={handleProfileSubmit}
              className="space-y-4"
            >
              {/* Display Name */}
              <div>
                <label
                  htmlFor="ps-name"
                  className="block text-xs font-bold text-foreground mb-1.5"
                >
                  Display Name
                </label>

                <input
                  type="text"
                  id="ps-name"
                  required
                  minLength={2}
                  maxLength={60}
                  value={profile.displayName}
                  disabled={isLoadingProfile || isSavingProfile}
                  onChange={(
                    e: ChangeEvent<HTMLInputElement>
                  ) =>
                    setProfile((previous) => ({
                      ...previous,
                      displayName: e.target.value,
                    }))
                  }
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[primary]/20 focus:border-primary"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="ps-email"
                  className="block text-xs font-bold text-foreground mb-1.5"
                >
                  Email Address
                </label>

                <input
                  type="email"
                  id="ps-email"
                  disabled
                  value={profile.email}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground/40 bg-border/30 cursor-not-allowed"
                />

                <p className="mt-1.5 text-[11px] text-foreground/50 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Email cannot be changed for account security.
                </p>
              </div>

              {/* Bio */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="ps-bio"
                    className="block text-xs font-bold text-foreground"
                  >
                    Bio{' '}
                    <span className="text-foreground/40 font-normal">
                      (optional)
                    </span>
                  </label>

                  <span className="font-mono text-[11px] text-foreground/40">
                    {profile.bio.length}/500
                  </span>
                </div>

                <textarea
                  id="ps-bio"
                  rows={4}
                  maxLength={500}
                  value={profile.bio}
                  disabled={isLoadingProfile || isSavingProfile}
                  onChange={(
                    e: ChangeEvent<HTMLTextAreaElement>
                  ) =>
                    setProfile((previous) => ({
                      ...previous,
                      bio: e.target.value,
                    }))
                  }
                  placeholder="Tell the community a little about yourself..."
                  className="w-full border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[primary]/20 focus:border-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile || isLoadingProfile}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}

                {isSavingProfile
                  ? 'Saving...'
                  : 'Save Profile'}
              </button>
            </form>
          </div>
        </section>

        {/* Security */}
        <section className="bg-white border border-border rounded-2xl shadow-sm mb-5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-border bg-border/20">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>

            <h3 className="font-bold text-sm text-foreground">
              Change Password
            </h3>
          </div>

          <div className="p-6">
            <form
              onSubmit={handlePasswordSubmit}
              className="space-y-4"
            >
              {/* Current Password */}
              <div>
                <label
                  htmlFor="ps-old-pw"
                  className="block text-xs font-bold text-foreground mb-1.5"
                >
                  Current Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showCurrentPw ? 'text' : 'password'
                    }
                    id="ps-old-pw"
                    required
                    value={currentPassword}
                    onChange={(
                      e: ChangeEvent<HTMLInputElement>
                    ) =>
                      setCurrentPassword(e.target.value)
                    }
                    className="w-full border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[primary]/20 focus:border-primary"
                  />

                  <button
                    type="button"
                    aria-label={
                      showCurrentPw
                        ? 'Hide current password'
                        : 'Show current password'
                    }
                    onClick={() =>
                      setShowCurrentPw(
                        (previous) => !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                  >
                    {showCurrentPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="ps-new-pw"
                  className="block text-xs font-bold text-foreground mb-1.5"
                >
                  New Password
                </label>

                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    id="ps-new-pw"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(
                      e: ChangeEvent<HTMLInputElement>
                    ) => setNewPassword(e.target.value)}
                    className="w-full border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[primary]/20 focus:border-primary"
                  />

                  <button
                    type="button"
                    aria-label={
                      showNewPw
                        ? 'Hide new password'
                        : 'Show new password'
                    }
                    onClick={() =>
                      setShowNewPw(
                        (previous) => !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                  >
                    {showNewPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Strength */}
              {newPassword.length > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: passwordStrength.percentage,
                        backgroundColor:
                          passwordStrength.color,
                      }}
                    />
                  </div>

                  <span
                    className="text-[11px] font-bold"
                    style={{
                      color: passwordStrength.color,
                    }}
                  >
                    {passwordStrength.label} Password
                  </span>
                </div>
              )}

              {/* Password Requirements */}
              <div className="bg-border/30 border border-border rounded-xl p-3.5 text-xs space-y-1.5">
                <p className="font-bold text-foreground mb-1">
                  Strong password tips:
                </p>

                <ul className="space-y-1 text-foreground/60 text-[11px]">
                  <li
                    className={`flex items-center gap-2 ${passwordStrength.checklist.hasMinLength
                      ? 'text-primary font-semibold'
                      : ''
                      }`}
                  >
                    <span>
                      {passwordStrength.checklist.hasMinLength
                        ? '✓'
                        : '○'}
                    </span>
                    At least 8 characters
                  </li>

                  <li
                    className={`flex items-center gap-2 ${passwordStrength.checklist.hasNumber
                      ? 'text-primary font-semibold'
                      : ''
                      }`}
                  >
                    <span>
                      {passwordStrength.checklist.hasNumber
                        ? '✓'
                        : '○'}
                    </span>
                    Contains a number
                  </li>

                  <li
                    className={`flex items-center gap-2 ${passwordStrength.checklist.hasSymbol
                      ? 'text-primary font-semibold'
                      : ''
                      }`}
                  >
                    <span>
                      {passwordStrength.checklist.hasSymbol
                        ? '✓'
                        : '○'}
                    </span>
                    Contains a symbol (!@#$)
                  </li>

                  <li
                    className={`flex items-center gap-2 ${passwordStrength.checklist.hasMixedCase
                      ? 'text-primary font-semibold'
                      : ''
                      }`}
                  >
                    <span>
                      {passwordStrength.checklist.hasMixedCase
                        ? '✓'
                        : '○'}
                    </span>
                    Mixed uppercase & lowercase
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPw}
                className="inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUpdatingPw ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}

                {isUpdatingPw
                  ? 'Updating...'
                  : 'Update Password'}
              </button>
            </form>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-sm text-red-600 mb-1">
            Delete Account
          </h3>

          <p className="text-xs text-foreground/60 mb-4 leading-relaxed">
            Permanently delete your account and all associated
            reviews, reports, and data. This action cannot be
            reversed.
          </p>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-4 py-2 rounded-xl border border-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        </section>
      </main>

      {/* Placeholder anchor targets */}
      <div id="about" className="sr-only" />
      <div id="blog" className="sr-only" />
      <div id="contact" className="sr-only" />
      <div id="reviews" className="sr-only" />
    </div>
  );
}

export const Route = createFileRoute("/dashboard/profile")({
  component: App,
});
