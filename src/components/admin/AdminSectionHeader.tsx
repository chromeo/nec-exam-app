import { ReactNode } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { ColorSchemeToggle } from '../ColorSchemeToggle';

interface AdminSectionHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // For action buttons
}

export const AdminSectionHeader = ({ 
  title, 
  description, 
  children 
}: AdminSectionHeaderProps) => {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-6 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ColorSchemeToggle />
          {children}
        </div>
      </div>
    </div>
  );
};