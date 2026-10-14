import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  Building2,
  Eye,
  EyeOff,
  User,
  ShieldAlert,
  Pencil,
  Lock,
  FileText,
  ChevronRight,
  Palette,
  Keyboard,
} from "lucide-react";
import { cn, optimizeCloudinaryUrl } from "@/lib/utils";
import { queue } from "@/components/ui/Toast";
import { authApi, persistUser } from "@/lib/api";
import { AppDatePicker } from "@/components/dashboard/AppDatePicker";
import { AppSelect } from "@/components/dashboard/AppSelect";

type ProfileSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
};

type TabId = "profile" | "organization" | "account" | "security" | "appearance" | "keyboard";
type AppearanceMode = "system" | "light" | "dark";

export function ProfileSettingsModal({ open, onOpenChange, isAdmin }: ProfileSettingsModalProps) {
  // Active Tab state
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  // Account Information States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [organizationLogoFile, setOrganizationLogoFile] = useState<File | null>(null);

  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [twitchChannelUrl, setTwitchChannelUrl] = useState("");
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("system");

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Dynamic System States
  const [userId, setUserId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // UI States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const applyUserToForm = (user: {
    name?: string;
    email?: string;
    dob?: string | null;
    gender?: string;
    avatar?: string | null;
    organization?: {
      name?: string;
      logo?: string;
    };
    appearanceMode?: AppearanceMode;
    integrations?: {
      discordWebhookUrl?: string;
      twitchChannelUrl?: string;
    };
    _id?: string;
    createdAt?: string;
  }) => {
    setName(user.name || "");
    setEmail(user.email || "");
    setOrganizationName(user.organization?.name || user.name || "");
    setOrganizationLogo(user.organization?.logo || null);
    setDob(user.dob || "");
    setGender(user.gender || "Male");
    setAvatar(user.avatar || null);
    setAppearanceMode(user.appearanceMode || "system");
    setDiscordWebhookUrl(user.integrations?.discordWebhookUrl || "");
    setTwitchChannelUrl(user.integrations?.twitchChannelUrl || "");
    setUserId(user._id || "");
    if (user.createdAt) {
      setCreatedAt(
        new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      );
    }
  };

  useEffect(() => {
    if (!open) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const profile = await authApi.getProfile();
        applyUserToForm(profile);
        persistUser(profile);
      } catch (err) {
        queue.add(
          {
            title: "Could not load profile",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "error",
          },
          { timeout: 4000 },
        );
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [open, isAdmin]);

  // Inline Editing States
  const [isEditingName, setIsEditingName] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const organizationLogoInputRef = useRef<HTMLInputElement>(null);

  // Simple Password Strength checker
  const getPasswordStrength = () => {
    if (!newPassword) return { label: "", color: "bg-transparent", textClass: "" };
    if (newPassword.length < 6)
      return { label: "Weak", color: "bg-zinc-300 w-1/3", textClass: "text-zinc-500" };
    if (newPassword.length < 10)
      return { label: "Medium", color: "bg-zinc-500 w-2/3", textClass: "text-zinc-600" };

    // Check if it has mixed characters for Strong
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (hasNumbers && hasSpecial) {
      return { label: "Strong", color: "bg-black w-full", textClass: "text-black font-bold" };
    }
    return { label: "Medium", color: "bg-zinc-500 w-2/3", textClass: "text-zinc-600" };
  };

  const strength = getPasswordStrength();

  // Helper to get initials
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "??";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // File Upload Handlers
  const processFile = (file: File, target: "avatar" | "organization" = "avatar") => {
    if (file.size > 2 * 1024 * 1024) {
      queue.add(
        {
          title: "File Too Large",
          description: "Images are capped at 2MB limit.",
          variant: "error",
        },
        { timeout: 3000 },
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (target === "organization") {
        setOrganizationLogo(reader.result as string);
        setOrganizationLogoFile(file);
      } else {
        setAvatar(reader.result as string);
        setAvatarFile(file);
      }
      queue.add(
        {
          title: target === "organization" ? "Organization Logo Loaded" : "Avatar Loaded",
          description: "New image preview set successfully.",
          variant: "success",
        },
        { timeout: 3000 },
      );
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleOrganizationLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, "organization");
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent("esports:appearance-preview", { detail: undefined }));
    // Reset passwords on close
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsEditingName(false);
    setActiveTab("profile");
    onOpenChange(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      queue.add(
        { title: "Validation Error", description: "Name cannot be left empty.", variant: "error" },
        { timeout: 3000 },
      );
      return;
    }

    if (!organizationName.trim()) {
      queue.add(
        {
          title: "Validation Error",
          description: "Organization name cannot be left empty.",
          variant: "error",
        },
        { timeout: 3000 },
      );
      return;
    }

    setIsSaving(true);

    try {
      // 1. Password update logic if any password fields are filled
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) {
          queue.add(
            {
              title: "Validation Error",
              description: "Please enter your current password to save security changes.",
              variant: "error",
            },
            { timeout: 3000 },
          );
          setIsSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          queue.add(
            {
              title: "Validation Error",
              description: "New password must be at least 6 characters.",
              variant: "error",
            },
            { timeout: 3000 },
          );
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          queue.add(
            {
              title: "Validation Error",
              description: "Confirm password does not match new password.",
              variant: "error",
            },
            { timeout: 3000 },
          );
          setIsSaving(false);
          return;
        }

        await authApi.updatePassword({ currentPassword, newPassword });
      }

      // 2. Profile details update logic
      const profileData = await authApi.updateProfile({
        name,
        organization: {
          name: organizationName.trim(),
          logo: organizationLogo ?? undefined,
        },
        dob,
        gender,
        appearanceMode,
        integrations: {
          discordWebhookUrl,
          twitchChannelUrl,
        },
        avatar: avatarFile ? undefined : (avatar ?? undefined),
        avatarFile,
        organizationLogoFile,
      });

      persistUser(profileData);

      queue.add(
        {
          title: "Settings Saved",
          description: "Your profile configurations were updated successfully.",
          variant: "success",
        },
        { timeout: 3000 },
      );
      handleClose();
    } catch (error) {
      console.error(error);
      queue.add(
        {
          title: "Could not save settings",
          description: error instanceof Error ? error.message : "Could not connect to the server.",
          variant: "error",
        },
        { timeout: 3000 },
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Tab List Navigation Item Render
  const renderTabItem = (
    id: TabId,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
  ) => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          setIsEditingName(false);
          setActiveTab(id);
        }}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-[8px] px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all duration-150 cursor-pointer outline-none",
          active
            ? "bg-[#f4f6fa] text-[#000000]"
            : "text-[#5c6479] hover:bg-[#f7f8fb] hover:text-[#000000]",
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-black" />
        )}
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-black" : "text-[#9aa1b0]")} />
        <span className="flex-1">{label}</span>
        <ChevronRight
          className={cn("h-3 w-3 opacity-0 transition-opacity", active && "opacity-40")}
        />
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="fixed flex h-[620px] w-full max-w-[960px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <DialogTitle className="sr-only">Profile Settings</DialogTitle>

        {/* Drag Visual Overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all"
            >
              <div className="flex flex-col items-center gap-4 text-center p-8 rounded-[12px] border-2 border-dashed border-white max-w-[85%] bg-black/40">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white">
                  <Upload className="h-6 w-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-white">Drop to Upload Avatar</p>
                  <p className="text-[12px] text-white/70">Support PNG, JPG, WEBP (Max 2MB)</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header */}
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#f0f1f3] px-6 bg-[#f9fbfc]">
          <div>
            <h2 className="text-[15px] font-bold text-[#000000]">Settings</h2>
          </div>
        </div>

        {/* Main Body - Left Navigation Sidebar & Right Content panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-[240px] shrink-0 border-r border-[#f0f1f3] bg-[#f9fbfc] p-4">
            <div className="space-y-1.5">
              {renderTabItem("profile", "Profile Information", User)}
              {renderTabItem("organization", "Organization", Building2)}
              {renderTabItem("account", "Account Details", FileText)}
              {renderTabItem("security", "Security & Access", Lock)}
              {renderTabItem("appearance", "Appearance", Palette)}
              {renderTabItem("keyboard", "Keyboard Shortcuts", Keyboard)}
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <form
              id="profile-settings-form"
              onSubmit={handleSave}
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* Tab Content Display Area */}
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-8 py-6">
                {/* PROFILE TAB */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000]">Profile Information</h3>
                      <p className="text-[11px] text-[#888888] mt-0.5">
                        Customize your public gaming avatar and default workspace details.
                      </p>
                    </div>

                    {/* Avatar Display */}
                    <div className="flex flex-col items-center p-4 rounded-[12px] border border-[#eef0f4] bg-[#f9fbfc] text-center">
                      <div className="relative group cursor-pointer grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-dashed border-[#c8cdd5] bg-white mb-3">
                        {avatar ? (
                          <img
                            src={optimizeCloudinaryUrl(avatar, 160, 160)}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-[#e8eef7] text-[24px] font-bold text-[#666666]">
                            {getInitials(name)}
                          </div>
                        )}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#000000] hover:bg-[#f7f8fb]"
                      >
                        Change Picture
                      </button>
                      <p className="mt-2 text-[10px] text-[#9aa1b0]">
                        Drag-and-drop or select an image file (Max 2MB).
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>

                    {/* Full Name & Email Stack */}
                    <div className="space-y-4 max-w-[480px]">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#4b5563] uppercase tracking-wider">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        {isEditingName ? (
                          <div className="relative flex items-center gap-2">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              autoFocus
                              onBlur={() => {
                                if (name.trim()) setName(name.trim());
                                setIsEditingName(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (name.trim()) {
                                    setName(name.trim());
                                    setIsEditingName(false);
                                  }
                                }
                              }}
                              placeholder="Enter your name"
                              className="h-[38px] w-full rounded-[8px] border border-[#e2e5ec] bg-white pl-9 pr-3 text-[13px] text-[#000000] outline-none focus:border-[#000000] transition-colors"
                            />
                          </div>
                        ) : (
                          <div className="flex h-[38px] items-center justify-between rounded-[8px] border border-[#eef0f4] px-3 hover:bg-[#f7f8fb] group transition-colors duration-200">
                            <div className="flex items-center gap-2.5">
                              <User className="h-4 w-4 text-[#9aa1b0]" />
                              <span className="text-[13px] font-medium text-[#000000]">{name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsEditingName(true)}
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#9aa1b0] hover:bg-[#eef0f4] hover:text-[#000000] transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#4b5563] uppercase tracking-wider">
                          Email Address
                        </label>
                        <p className="py-2 text-[13px] font-medium text-[#000000]">{email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ORGANIZATION TAB */}
                {activeTab === "organization" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000]">Organization</h3>
                      <p className="text-[11px] text-[#888888] mt-0.5">
                        Manage the organizer identity shown to viewers and participants.
                      </p>
                    </div>

                    <div className="space-y-4 max-w-[520px]">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#4b5563]">
                          Organization Logo
                        </label>
                        <div className="flex items-center gap-4 rounded-[12px] border border-[#eef0f4] bg-[#f9fbfc] p-4">
                          <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-dashed border-[#c8cdd5] bg-white">
                            {organizationLogo ? (
                              <img
                                src={optimizeCloudinaryUrl(organizationLogo, 160, 160)}
                                alt="Organization logo"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Building2 className="h-6 w-6 text-[#9aa1b0]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => organizationLogoInputRef.current?.click()}
                              className="cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#000000] hover:bg-[#f7f8fb]"
                            >
                              Upload Logo
                            </button>
                            <p className="mt-2 text-[10px] text-[#9aa1b0]">
                              PNG, JPG, WEBP supported. Stored with profile images.
                            </p>
                            <input
                              ref={organizationLogoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleOrganizationLogoChange}
                              className="hidden"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#4b5563]">
                          Organization Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
                          <input
                            type="text"
                            value={organizationName}
                            onChange={(event) => setOrganizationName(event.target.value)}
                            placeholder="Enter organization name"
                            className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] text-[#000000] outline-none transition-all duration-200 placeholder:text-[#9aa1b0] focus:border-[#000000]"
                          />
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-[#eef0f4] bg-[#f9fbfc] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Public Preview
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white text-[14px] font-bold text-[#4b5563] ring-1 ring-[#e2e5ec]">
                            {organizationLogo ? (
                              <img
                                src={optimizeCloudinaryUrl(organizationLogo, 80, 80)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (organizationName || name || "O").slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold text-[#000000]">
                              {organizationName || "Organization name"}
                            </p>
                            <p className="text-[11px] text-[#777777]">Organizer profile</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACCOUNT DETAILS TAB */}
                {activeTab === "account" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000]">Account Details</h3>
                      <p className="text-[11px] text-[#888888] mt-0.5">
                        Maintain up-to-date details for workspace coordination and age
                        verifications.
                      </p>
                    </div>

                    <div className="space-y-4 max-w-[480px]">
                      {/* Birthday Field */}
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#4b5563] uppercase tracking-wider">
                          Date of Birth
                        </label>
                        <AppDatePicker
                          value={dob}
                          onChange={setDob}
                          placeholder="Select date of birth"
                        />
                      </div>

                      {/* Gender Field */}
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#4b5563] uppercase tracking-wider">
                          Gender
                        </label>
                        <AppSelect
                          value={gender}
                          onChange={setGender}
                          options={[
                            { label: "Male", value: "Male" },
                            { label: "Female", value: "Female" },
                            { label: "Other", value: "Other" },
                            { label: "Prefer not to say", value: "Prefer not to say" },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Read-Only Details Card */}
                    <div className="mt-8 p-4 rounded-[12px] border border-[#eef0f4] bg-[#f9fbfc] space-y-2.5 max-w-[480px]">
                      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        System Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-[12px] pt-1">
                        <div>
                          <p className="text-zinc-500">Created At</p>
                          <p className="font-semibold text-black mt-0.5">{createdAt}</p>
                        </div>
                        {userId && (
                          <div className="col-span-2 pt-1 border-t border-[#eef0f4]/80">
                            <p className="text-zinc-500">Unique ID</p>
                            <p className="font-mono text-[10.5px] font-bold text-zinc-700 mt-0.5 select-all">
                              {userId}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY TAB */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000]">Security Settings</h3>
                      <p className="text-[11px] text-[#888888] mt-0.5">
                        Keep your account guarded by replacing weak or recycled login passwords.
                      </p>
                    </div>

                    <div className="p-5 rounded-[12px] border border-[#eef0f4] bg-white space-y-4 max-w-[480px]">
                      <div className="flex items-center gap-1.5 border-b border-[#f0f1f3] pb-3">
                        <ShieldAlert className="h-4 w-4 text-black" />
                        <h4 className="text-[12px] font-bold text-[#000000]">Change Password</h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-[#4b5563]">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              className="h-[38px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 pr-9 text-[13px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#9aa1b0] hover:text-[#000000] outline-none"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-[#4b5563]">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Choose a strong password"
                              className="h-[38px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 pr-9 text-[13px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#9aa1b0] hover:text-[#000000] outline-none"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-[#4b5563]">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              className="h-[38px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 pr-9 text-[13px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#9aa1b0] hover:text-[#000000] outline-none"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Password Strength Indicator */}
                        {newPassword && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-medium">
                              <span>Password complexity:</span>
                              <span className={cn(strength.textClass)}>{strength.label}</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-[#f0f1f3] overflow-hidden">
                              <div
                                className={cn("h-full transition-all duration-300", strength.color)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000]">Appearance</h3>
                      <p className="text-[11px] text-[#888888] mt-0.5">
                        Choose how the software should look on this device.
                      </p>
                    </div>

                    <div className="grid max-w-[620px] gap-3 sm:grid-cols-3">
                      {[
                        {
                          id: "system" as const,
                          title: "System",
                          description: "Follow device theme.",
                        },
                        {
                          id: "light" as const,
                          title: "Light",
                          description: "Use bright interface.",
                        },
                        { id: "dark" as const, title: "Dark", description: "Use dark interface." },
                      ].map((option) => {
                        const selected = appearanceMode === option.id;
                        const previewBackground =
                          option.id === "dark"
                            ? "#111827"
                            : option.id === "light"
                              ? "#ffffff"
                              : "linear-gradient(135deg,#ffffff 0%,#ffffff 50%,#111827 50%,#111827 100%)";
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setAppearanceMode(option.id);
                              window.dispatchEvent(
                                new CustomEvent("esports:appearance-preview", {
                                  detail: option.id,
                                }),
                              );
                            }}
                            className={cn(
                              "cursor-pointer rounded-[10px] border bg-white p-4 text-left transition-colors hover:bg-[#f7f8fb]",
                              selected
                                ? "border-[#000000] ring-2 ring-[#e8eef7]"
                                : "border-[#e2e5ec]",
                            )}
                          >
                            <div
                              className="mb-3 h-20 rounded-[8px] border border-[#e2e5ec]"
                              style={{ background: previewBackground }}
                            />
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[13px] font-bold text-[#000000]">
                                {option.title}
                              </span>
                              <span
                                className={cn(
                                  "grid h-4 w-4 place-items-center rounded-full border",
                                  selected ? "border-[#000000] bg-[#000000]" : "border-[#c8cdd5]",
                                )}
                              >
                                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#777777]">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KEYBOARD SHORTCUTS TAB */}
                {activeTab === "keyboard" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000]">Keyboard Shortcuts</h3>
                      <p className="text-[11px] text-[#888888] mt-0.5">
                        Shortcuts available across the workspace and in the listed dialogs.
                      </p>
                    </div>

                    <div className="max-w-[620px] overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white">
                      {[
                        ["Search", "Ctrl", "K"],
                        ["Continue or submit the current form", "Ctrl", "Enter"],
                        ["Close dialog", "Esc"],
                        ["Collapse or expand the workspace sidebar", "Alt", "S"],
                        ["Add a team (Create Event - Teams step)", "N"],
                        ["Bulk add teams (Create Event - Teams step)", "B"],
                        ["Import teams (Create Event - Teams step)", "I"],
                      ].map(([label, ...keys], index) => (
                        <div
                          key={label}
                          className={cn(
                            "flex min-h-[52px] items-center justify-between gap-4 px-4",
                            index > 0 && "border-t border-[#f0f1f3]",
                          )}
                        >
                          <span className="text-[13px] font-medium text-[#000000]">{label}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {keys.map((key) => (
                              <kbd
                                key={key}
                                className="min-w-[28px] rounded-[6px] border border-[#d8dde6] bg-[#f7f8fb] px-2 py-1 text-center text-[11px] font-bold text-[#4b5563] shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]"
                              >
                                {key}
                              </kbd>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Save/Cancel Bottom Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#f0f1f3] bg-white px-8 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-4 py-2 text-[12px] font-bold text-[#4b5563] hover:bg-[#f7f8fb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="cursor-pointer rounded-[6px] bg-[#000000] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#333] disabled:bg-zinc-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
