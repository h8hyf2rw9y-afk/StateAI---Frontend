"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { getAvatarUrl, getDisplayName } from "@/features/auth/lib";
import { getInitials } from "@/lib/format";

/**
 * Reads the real Supabase session via useUser() — see hooks/useUser.ts.
 * Renders a loading skeleton until the first auth state is known, so there
 * is never a flash of a fake or stale user.
 */
export function UserMenu() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="hidden h-4 w-24 sm:block" />
      </div>
    );
  }

  if (!user) return null;

  const name = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex h-auto items-center gap-2 px-2 py-1.5"
          />
        }
      >
        <Avatar className="size-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
