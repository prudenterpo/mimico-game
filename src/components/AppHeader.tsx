"use client"

import { useStore} from "@/stores/store";
import Button from "./Button";
import Avatar from "./Avatar";
import { ArrowLeftEndOnRectangleIcon } from "@heroicons/react/20/solid";
import Logo from "@/components/Logo";
import React from "react";
import Link from "next/link";

interface AppHeaderProps {
    onLogout: () => void;
    title?: string;
    subTitle?: string;
    iconLinkTo?: string;
}

export default function AppHeader({ onLogout, title = "Mímico", subTitle, iconLinkTo }: AppHeaderProps) {
    const { user } = useStore();
    
    return (
        <header className="bg-white shadow-sm px-4 py-3 flex-shrink-0">
           <div className="max-w-6xl mx-auto flex items-center justify-between">
               <div className="flex items-center gap-4">
                   {iconLinkTo ? (
                       <Link href={iconLinkTo} className="transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded">
                           <Logo size="md" />
                       </Link>
                   ) : (
                       <Logo size="md" />
                   )}
                   <div>
                       <h1 className="text-xl font-heading" style={{color: "var(--color-accent)"}}>
                           {title}
                       </h1>
                       <p className="text-sm text-gray-500">{subTitle}</p>
                   </div>
               </div>

               <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2">
                       <Avatar nickname={user?.nickname || ""} size="sm" online={user?.isOnline ?? false} />
                       <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--color-accent)" }}>
                            {user?.nickname}
                       </span>
                   </div>
                   <Button variant="ghost" onClick={onLogout} className="text-sm flex items-center gap-1">
                      <ArrowLeftEndOnRectangleIcon className="h-4 w-4" />
                       <span className="hidden sm:inline">Sair</span>
                   </Button>
               </div>
           </div> 
        </header>
    );
}
