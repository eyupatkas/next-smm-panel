"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  Layers,
  Package,
  Pencil,
  Trash2,
  Star,
  FolderOpen,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  Filter,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deletePackageAdmin } from "@/lib/actions/admin-actions";
import { AddPackageDialog } from "./AddPackageDialog";
import { AddCategoryDialog } from "./AddCategoryDialog";
import { AdminPackagePricingTab } from "./AdminPackagePricingTab";
import { EditPackageDialog, type EditablePkg } from "./EditPackageDialog";
import type {
  PackagePricingRecommendation,
  PackageProfitability,
  PackageProfitabilitySummary,
} from "@/lib/services/package-profitability";

type Subcategory = {
  id: string;
  name: string;
  icon: string | null;
  status: boolean;
  _count: { children: number; packages: number };
};

type Platform = Subcategory & { children: Subcategory[] };

type PkgItem = EditablePkg & {
  sortOrder: number;
  categoryId: string;
  comboItems?: Array<{ serviceId: string; quantity: number; label?: string }> | null;
  profitability: PackageProfitability;
  suggestedPricing: PackagePricingRecommendation | null;
};

type CategoryOption = { id: string; name: string; parentName?: string | null };

interface Props {
  platforms: Platform[];
  packages: PkgItem[];
  categoryOptions: CategoryOption[];
  profitabilitySummary: PackageProfitabilitySummary;
  markupSettings: {
    retailMarkupPercent: number;
    resellerMarkupPercent: number;
  };
}

type ProfitFilter = "all" | "loss" | "low-margin" | "healthy" | "unknown";

function PlatformAvatar({ name, icon }: { name: string; icon: string | null }) {
  const slug = (icon || name).toLowerCase().replace(/[^a-z0-9]/g, "");

  const svgMap: Record<string, React.ReactNode> = {
    instagram: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    telegram: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    discord: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    spotify: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
    soundcloud: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M1.175 12.225c-.015 0-.03.002-.044.003C.516 12.295 0 12.837 0 13.5c0 .688.547 1.25 1.219 1.25.672 0 1.219-.562 1.219-1.25 0-.11-.014-.217-.04-.319a3.15 3.15 0 0 1-.04-.322zm0-1.65c-.066 0-.131.008-.195.02-.048-.638-.118-1.222-.211-1.734a.576.576 0 0 0-.567-.469.575.575 0 0 0-.578.575c0 .25.16.462.39.547.1 1.1.143 2.243.124 3.4-.01.602.467 1.1 1.063 1.1a1.085 1.085 0 0 0 .095-2.165 1.09 1.09 0 0 0-.121-.274zM24 13.148a3.734 3.734 0 0 0-3.734-3.734c-.305 0-.6.038-.882.107a5.645 5.645 0 0 0-5.45-4.196 5.634 5.634 0 0 0-4.043 1.708 5.631 5.631 0 0 0-1.61 3.961v.003l.002 5.888a2.735 2.735 0 0 0 2.733 2.734h9.25A3.734 3.734 0 0 0 24 13.148z"/>
      </svg>
    ),
    twitch: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    pinterest: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
    snapchat: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074a8.65 8.65 0 0 0-1.712-.162c-.389 0-.734.031-1.042.099-.344.073-.479.165-.674.316l-.04.028c-.48.36-1.048.856-1.948.856a2.91 2.91 0 0 1-.149-.007h-.045c-.9 0-1.468-.496-1.948-.856l-.04-.028c-.195-.151-.33-.243-.674-.316a6.06 6.06 0 0 0-1.042-.099c-.637 0-1.152.079-1.712.162a5.915 5.915 0 0 1-.54.074h-.03c-.284 0-.479-.134-.554-.405a5.512 5.512 0 0 1-.134-.553c-.045-.195-.105-.48-.164-.57-1.873-.283-2.906-.702-3.146-1.271a.598.598 0 0 1-.045-.225c-.015-.239.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.014l.015-.015c.18-.344.209-.644.12-.868-.195-.45-.884-.675-1.333-.81-.135-.044-.255-.09-.345-.119-1.004-.42-1.139-.93-.952-1.297.165-.359.554-.54.973-.54.12 0 .255.015.39.045.379.166.735.27 1.035.286.2 0 .329-.045.39-.09l-.015-.06c-.104-1.628-.225-3.654.299-4.847C7.859 1.07 11.216.793 12.206.793z"/>
      </svg>
    ),
    reddit: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
    binance: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272 0l2.7154 2.7164-2.7154 2.7164-2.7154-2.7164zm-9.2722 0L5.4316 12l-2.7164 2.7164L0 12l2.7164-2.7164zM12.001 0l7.353 7.352-2.7164 2.7164-4.6366-4.6185-4.6366 4.6185-2.7164-2.7164z"/>
      </svg>
    ),
    applemusic: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.096.958 1.31 1.88.825 3.048A7.293 7.293 0 0 0 .213 5.88a61.44 61.44 0 0 0-.005.734v11.4a10.58 10.58 0 0 0 .198 2.045c.276 1.318.976 2.356 2.09 3.108.508.34 1.069.58 1.67.722a9.455 9.455 0 0 0 1.768.198c.064.003.127.007.19.01h11.872c.223-.013.446-.02.668-.04 1.048-.095 2.017-.41 2.83-1.063.684-.538 1.17-1.234 1.497-2.038a7.574 7.574 0 0 0 .47-2.3c.014-.273.018-.547.018-.82V6.824c0-.233-.005-.466-.014-.7zM12 17A5 5 0 1 1 12 7a5 5 0 0 1 0 10zm7-9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-7 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
      </svg>
    ),
    bluesky: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.504 6.479.368 2.507 1.486 3.338 2.885 3.339h.28c-1.795.301-4.17 1.176-3.768 4.236.226 1.72 1.909 3.572 4.087 2.808 1.682-.588 3.012-2.143 3.014-2.143.002 0 .834-1.16 4.998-1.16 4.164 0 4.996 1.16 4.998 1.16.002 0 1.332 1.555 3.014 2.143 2.178.764 3.861-1.088 4.087-2.808.402-3.06-1.973-3.935-3.768-4.236h.28c1.399-.001 2.517-.832 2.885-3.339C23.622 9.418 24 4.458 24 3.768c0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8z"/>
      </svg>
    ),
    package: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  };

  const iconNode = svgMap[slug];

  return (
    <span className={cn(
      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
      iconNode ? "bg-white/8 text-white" : "bg-primary/10 text-primary text-sm font-bold"
    )}>
      {iconNode ?? name.slice(0, 2).toUpperCase()}
    </span>
  );
}

const TH = ({ children, right, center }: { children?: React.ReactNode; right?: boolean; center?: boolean }) => (
  <th className={cn(
    "pb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
    right && "text-right",
    center && "text-center",
    !right && !center && "text-left"
  )}>
    {children}
  </th>
);

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminPackagesClient({ platforms, packages, categoryOptions, profitabilitySummary, markupSettings }: Props) {
  const [selPlatform, setSelPlatform] = useState<string | null>(null);
  const [selCategory, setSelCategory] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState<EditablePkg | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profitFilter, setProfitFilter] = useState<ProfitFilter>("all");

  const platform = useMemo(
    () => platforms.find((p) => p.id === selPlatform) ?? null,
    [platforms, selPlatform]
  );

  const viewPkgs = useMemo(() => {
    if (!selCategory) return [];

    const categoryPackages = packages.filter((p) => p.categoryId === selCategory);

    return categoryPackages.filter((pkg) => {
      switch (profitFilter) {
        case "loss":
          return pkg.profitability.isLossMaking;
        case "low-margin":
          return !pkg.profitability.isLossMaking && pkg.profitability.isLowMargin;
        case "healthy":
          return !pkg.profitability.isLossMaking && !pkg.profitability.isLowMargin && !pkg.profitability.hasMissingCost;
        case "unknown":
          return pkg.profitability.hasMissingCost;
        default:
          return true;
      }
    });
  }, [packages, profitFilter, selCategory]);

  const categoryProfitSummary = useMemo(() => {
    const source = selCategory ? packages.filter((pkg) => pkg.categoryId === selCategory) : [];
    return source.reduce(
      (summary, pkg) => {
        summary.total += 1;
        summary.loss += pkg.profitability.isLossMaking ? 1 : 0;
        summary.lowMargin += pkg.profitability.isLowMargin ? 1 : 0;
        summary.unknown += pkg.profitability.hasMissingCost ? 1 : 0;
        summary.estimatedProfit += pkg.profitability.primaryProfit ?? 0;
        return summary;
      },
      { total: 0, loss: 0, lowMargin: 0, unknown: 0, estimatedProfit: 0 }
    );
  }, [packages, selCategory]);

  const selCategoryName = useMemo(
    () => platform?.children.find((c) => c.id === selCategory)?.name ?? "",
    [platform, selCategory]
  );

  const pkgCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of packages) map[p.categoryId] = (map[p.categoryId] ?? 0) + 1;
    return map;
  }, [packages]);

  const platformPkgCount = (pid: string) => {
    const p = platforms.find((x) => x.id === pid);
    return p?.children.reduce((s, c) => s + (pkgCountByCategory[c.id] ?? 0), 0) ?? 0;
  };

  const totalCategories = platforms.reduce((s, p) => s + p.children.length, 0);

  const highRiskPackages = useMemo(
    () => packages.filter((pkg) => pkg.profitability.isLossMaking || pkg.profitability.isLowMargin),
    [packages]
  );

  const summaryCards = [
    {
      label: "Tahmini Toplam Maliyet",
      value: formatMoney(profitabilitySummary.totalBaseCost),
      icon: CircleDollarSign,
      tone: "text-sky-400",
      note: "Tüm hazır paket içerik maliyetleri",
    },
    {
      label: "Satıştan Gelen Kar",
      value: formatMoney(profitabilitySummary.totalBaseProfit),
      icon: BadgeDollarSign,
      tone: profitabilitySummary.totalBaseProfit >= 0 ? "text-emerald-400" : "text-rose-400",
      note: "Baz fiyat üstünden hesaplandı",
    },
    {
      label: "Zarardaki Paketler",
      value: profitabilitySummary.lossCount,
      icon: AlertTriangle,
      tone: profitabilitySummary.lossCount > 0 ? "text-rose-400" : "text-emerald-400",
      note: "Anında fiyat iyileştirmesi gerektirir",
    },
    {
      label: "Düşük Marj",
      value: profitabilitySummary.lowMarginCount,
      icon: BarChart3,
      tone: profitabilitySummary.lowMarginCount > 0 ? "text-amber-400" : "text-emerald-400",
      note: "Kar var ama güvenli tampon zayıf",
    },
  ];

  const profitFilterOptions: Array<{ key: ProfitFilter; label: string; count: number }> = [
    { key: "all", label: "Tümü", count: categoryProfitSummary.total },
    { key: "loss", label: "Zarar", count: categoryProfitSummary.loss },
    { key: "low-margin", label: "Düşük Marj", count: categoryProfitSummary.lowMargin },
    { key: "healthy", label: "Sağlıklı", count: Math.max(categoryProfitSummary.total - categoryProfitSummary.loss - categoryProfitSummary.lowMargin - categoryProfitSummary.unknown, 0) },
    { key: "unknown", label: "Maliyet Eksik", count: categoryProfitSummary.unknown },
  ];

  function selectPlatform(id: string) {
    setSelPlatform(id);
    setSelCategory(null);
    setConfirmDel(null);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const fd = new FormData();
      fd.set("id", id);
      await deletePackageAdmin(fd);
      toast.success("Paket silindi.");
      setConfirmDel(null);
    } catch {
      toast.error("Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header + Tabs ──────────────────────────────── */}
      <Tabs defaultValue="catalog" className="flex flex-col">
        <div className="rounded-t-2xl border border-white/10 bg-card/70 px-4 pt-3 pb-0 shadow-sm">
          {/* Top row: title + stats + buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
                <Badge variant="outline" className="text-[10px]">Paketler</Badge>
              </div>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight">Paket Yönetimi</h1>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="hidden items-center gap-4 rounded-xl border border-white/10 bg-background/40 px-3 py-1.5 sm:flex">
                {[
                  { label: "Platf.", value: platforms.length, color: "text-sky-400" },
                  { label: "Kat.", value: totalCategories, color: "text-fuchsia-400" },
                  { label: "Paket", value: packages.length, color: "text-emerald-400" },
                  { label: "Aktif", value: packages.filter((p) => p.status).length, color: "text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={cn("text-sm font-bold tabular-nums leading-none", s.color)}>{s.value}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <AddCategoryDialog parents={platforms.map((p) => ({ id: p.id, name: p.name }))} />
              <AddPackageDialog
                categories={categoryOptions}
                defaultCategoryId={selCategory ?? undefined}
              />
            </div>
          </div>
          {/* Tabs bar — flush bottom of header card */}
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="catalog">Paket Katalogu</TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1.5">
              Fiyat Optimizasyonu
              {highRiskPackages.length > 0 && (
                <Badge className="ml-0.5 border border-amber-500/30 bg-amber-500/20 px-1.5 py-0 text-[10px] text-amber-300">
                  {highRiskPackages.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="catalog" className="mt-3">
          {/* Compact profitability KPI strip */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-card/60 px-3 py-2 shadow-sm">
                <div className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5">
                  <card.icon size={13} className={card.tone} />
                </div>
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-bold tabular-nums", card.tone)}>{card.value}</p>
                  <p className="text-[10px] text-muted-foreground">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
          {highRiskPackages.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <Sparkles size={13} className="shrink-0" />
              <span>
                {highRiskPackages.length} riskli paket var — &quot;Fiyat Optimizasyonu&quot; sekmesinden toplu güncelleyebilirsiniz.
              </span>
            </div>
          )}
          {/* ── Main layout ───────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* Platform sidebar */}
        <div className="max-h-80 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-card/60 p-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-120px)]">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Platformlar
          </p>
          {platforms.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Henüz platform yok. &quot;Kategori Ekle&quot; ile oluşturun.
            </p>
          )}
          {platforms.map((p) => {
            const count = platformPkgCount(p.id);
            return (
              <button
                key={p.id}
                onClick={() => selectPlatform(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5",
                  selPlatform === p.id
                    ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
                    : "text-foreground/80"
                )}
              >
                <PlatformAvatar name={p.name} icon={p.icon} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.children.length} kategori</p>
                </div>
                {count > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-[10px] tabular-nums">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="min-w-0 rounded-2xl border border-white/10 bg-card/60 p-4 sm:p-5">
          {/* Breadcrumb */}
          {selPlatform && (
            <nav className="mb-5 flex items-center gap-1.5 text-sm">
              <button
                onClick={() => { setSelPlatform(null); setSelCategory(null); }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Tüm Platformlar
              </button>
              {platform && (
                <>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                  <button
                    onClick={() => setSelCategory(null)}
                    className={cn(
                      "transition-colors hover:text-foreground",
                      !selCategory ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {platform.name}
                  </button>
                </>
              )}
              {selCategory && (
                <>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                  <span className="font-semibold text-foreground">{selCategoryName}</span>
                </>
              )}
            </nav>
          )}

          {/* Empty state */}
          {!selPlatform && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Layers size={52} className="mb-4 opacity-15" />
              <p className="text-sm">Soldaki listeden bir platform seçin</p>
            </div>
          )}

          {/* Category grid */}
          {selPlatform && !selCategory && (
            <>
              {platform!.children.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FolderOpen size={44} className="mb-3 opacity-15" />
                  <p className="text-sm">Bu platformda alt kategori yok.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {platform!.children.map((cat) => {
                    const count = pkgCountByCategory[cat.id] ?? 0;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelCategory(cat.id)}
                        className="group flex min-h-20 items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors group-hover:border-primary/20 group-hover:bg-primary/10">
                          <Package size={20} className="text-sky-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{count} paket</p>
                        </div>
                        <ChevronRight size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Package table */}
          {selCategory && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-semibold">Kategori Karlılık Özeti</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tahmini kar: <span className={cn("font-semibold", categoryProfitSummary.estimatedProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>₺{categoryProfitSummary.estimatedProfit.toFixed(2)}</span>
                    {" · "}Zarar: {categoryProfitSummary.loss}
                    {" · "}Düşük marj: {categoryProfitSummary.lowMargin}
                    {" · "}Maliyet eksik: {categoryProfitSummary.unknown}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Filter size={13} /> Karlılık filtresi
                  </span>
                  {profitFilterOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setProfitFilter(option.key)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                        profitFilter === option.key
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{option.label}</span>
                      <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] tabular-nums">{option.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {viewPkgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Package size={44} className="mb-3 opacity-15" />
                  <p className="text-sm">
                    {profitFilter === "all"
                      ? "Bu kategoride paket yok."
                      : "Bu filtrede eşleşen paket bulunamadı."}
                  </p>
                  <p className="mt-1 text-xs">
                    {profitFilter === "all"
                      ? 'Yukarıdaki "Yeni Paket Ekle" butonunu kullanın.'
                      : "Başka bir karlılık filtresi seçin."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <TH>Paket Adı</TH>
                        <TH right>Adet</TH>
                        <TH right>Maliyet</TH>
                        <TH right>Fiyat</TH>
                        <TH right>Perakende</TH>
                        <TH right>Bayi</TH>
                        <TH right>Kar / Zarar</TH>
                        <TH center>Seviye</TH>
                        <TH center>Vitrin</TH>
                        <TH center>Durum</TH>
                        <th className="w-24 pb-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {viewPkgs.map((pkg) => {
                        const primaryPrice = pkg.profitability.primaryTier === "retail"
                          ? pkg.profitability.retail.price
                          : pkg.profitability.base.price;
                        const primaryProfit = pkg.profitability.primaryProfit;
                        const primaryMargin = pkg.profitability.primaryMargin;
                        const statusTone = pkg.profitability.hasMissingCost
                          ? "unknown"
                          : pkg.profitability.isLossMaking
                            ? "loss"
                            : pkg.profitability.isLowMargin
                              ? "low"
                              : "healthy";

                        return (
                        <tr
                          key={pkg.id}
                          className={cn(
                            "group transition-colors hover:bg-white/3",
                            statusTone === "loss" && "bg-rose-500/5",
                            statusTone === "low" && "bg-amber-500/5"
                          )}
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 text-primary">
                                <Package size={15} />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium leading-tight">{pkg.name}</p>
                                  {pkg.profitability.isCombo && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {pkg.profitability.comboServiceCount} servisli kombo
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">
                                  {pkg.service.name}
                                </p>
                                {pkg.profitability.breakdown.length > 0 && (
                                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                                    {pkg.profitability.breakdown
                                      .map((item) => `${item.label}: ${item.quantity.toLocaleString("tr")}`)
                                      .join(" · ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                            {pkg.quantity.toLocaleString("tr")}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {pkg.profitability.baseCost != null ? (
                              <>
                                <span className="font-semibold text-foreground">₺{pkg.profitability.baseCost.toFixed(2)}</span>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">İçerik toplam maliyeti</p>
                              </>
                            ) : (
                              <span className="text-amber-300">Eksik</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums font-semibold text-emerald-400">
                            ₺{pkg.price.toFixed(2)}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                            {pkg.retailPrice ? `₺${pkg.retailPrice.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                            {pkg.resellerPrice ? `₺${pkg.resellerPrice.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {primaryProfit != null && primaryPrice != null ? (
                              <>
                                <span className={cn("font-semibold", primaryProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                  {primaryProfit >= 0 ? "+" : ""}₺{primaryProfit.toFixed(2)}
                                </span>
                                <p className={cn("mt-0.5 text-[10px]", (primaryMargin ?? 0) >= 15 ? "text-muted-foreground" : "text-amber-300")}>
                                  %{primaryMargin?.toFixed(1) ?? "0.0"} marj
                                </p>
                              </>
                            ) : (
                              <span className="text-amber-300">Hesaplanamadı</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            {pkg.profitability.hasMissingCost ? (
                              <Badge variant="outline" className="border-amber-500/30 text-amber-300">Maliyet Eksik</Badge>
                            ) : pkg.profitability.isLossMaking ? (
                              <Badge className="bg-rose-500/15 text-rose-300 border border-rose-500/30">Zarar</Badge>
                            ) : pkg.profitability.isLowMargin ? (
                              <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">Düşük Marj</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Sağlıklı</Badge>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            {pkg.showOnHomepage ? (
                              <Star size={14} className="mx-auto fill-yellow-400 text-yellow-400" />
                            ) : (
                              <span className="text-muted-foreground/25">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <Badge
                              variant={pkg.status ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {pkg.status ? "Aktif" : "Pasif"}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => setEditPkg(pkg)}
                              >
                                <Pencil size={12} />
                              </Button>
                              {confirmDel === pkg.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => handleDelete(pkg.id)}
                                    disabled={deleting}
                                  >
                                    Evet
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => setConfirmDel(null)}
                                  >
                                    Hayır
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                  onClick={() => setConfirmDel(pkg.id)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-3">
          <AdminPackagePricingTab packages={packages} markupSettings={markupSettings} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      {editPkg && (
        <EditPackageDialog
          pkg={editPkg}
          open={true}
          onClose={() => setEditPkg(null)}
        />
      )}
    </div>
  );
}
