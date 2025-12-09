import React, { useState } from 'react';
import { BookOpen, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ThemeToggle } from '../ThemeToggle';
import { ColorSchemeToggle } from '../ColorSchemeToggle';
import { Separator } from '../ui/separator';

interface AppNavbarProps {
  userProfile: any;
  isAdmin: boolean;
  onProfileView: () => void;
  onAdminView: () => void;
  onLogout: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  userProfile,
  isAdmin,
  onProfileView,
  onAdminView,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuItemClick = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <header className="border-b flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo/Brand */}
          <div className="flex items-center">
            <BookOpen className="size-8 text-primary mr-3" />
            <div className="text-xl font-semibold text-foreground">Exam Platform</div>
          </div>
          
          {/* Desktop Navigation (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onProfileView}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <User className="size-4" />
              <span>{userProfile?.name || userProfile?.email}</span>
            </Button>
            
            <ThemeToggle />
            <ColorSchemeToggle />
            
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAdminView}
              >
                <Settings className="size-4 mr-2" />
                Admin
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
            >
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile: Hamburger Menu (shown on mobile only) */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <BookOpen className="size-5 text-primary" />
                    Exam Platform
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigation menu with profile, admin panel access, theme settings, and logout options
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-2">
                  {/* User Profile */}
                  <div className="px-3 py-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {userProfile?.name || 'User'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {userProfile?.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Menu Items */}
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMenuItemClick(onProfileView)}
                    >
                      <User className="size-4 mr-3" />
                      Profile
                    </Button>

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleMenuItemClick(onAdminView)}
                      >
                        <Settings className="size-4 mr-3" />
                        Admin Panel
                      </Button>
                    )}

                    <Separator className="my-2" />

                    {/* Theme Controls */}
                    <div className="px-3 py-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Theme</span>
                        <ThemeToggle />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Color Scheme</span>
                        <ColorSchemeToggle />
                      </div>
                    </div>

                    <Separator className="my-2" />

                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => handleMenuItemClick(onLogout)}
                    >
                      <LogOut className="size-4 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};