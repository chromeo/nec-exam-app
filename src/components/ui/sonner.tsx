"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--card-foreground)",
          "--success-bg": "var(--card)",
          "--success-border": "var(--chart-2)",
          "--success-text": "var(--card-foreground)",
          "--info-bg": "var(--card)",
          "--info-border": "var(--primary)",
          "--info-text": "var(--card-foreground)",
          "--warning-bg": "var(--card)",
          "--warning-border": "var(--chart-4)",
          "--warning-text": "var(--card-foreground)",
          "--error-bg": "var(--card)",
          "--error-border": "var(--destructive)",
          "--error-text": "var(--card-foreground)",
          "--description-text": "var(--muted-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--card-foreground)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--border)",
          opacity: 1,
        },
        className: "theme-shadow",
        descriptionClassName: "text-muted-foreground",
      }}
      {...props}
    />
  );
};

export { Toaster };
