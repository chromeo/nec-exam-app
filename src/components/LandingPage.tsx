import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { CheckCircle, Clock, BookOpen, Users, Shield, Zap, ArrowRight, PlayCircle, BarChart3, Target, Smartphone, Award, TrendingUp } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { FeedbackButton } from "./FeedbackButton";
import { getLandingPageContent, type LandingPageContent } from "../services/contentfulService";

interface LandingPageProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
}

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, any> = {
  Zap,
  BookOpen,
  Clock,
  CheckCircle,
  BarChart3,
  Target,
  Smartphone,
  Award,
  TrendingUp,
  Users,
  Shield,
};

export function LandingPage({ onGetStarted, onTryDemo }: LandingPageProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [loading, setLoading] = useState(true);

  // Load content from Contentful on mount
  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const landingContent = await getLandingPageContent();
        setContent(landingContent);
      } catch (error) {
        console.error('❌ Error loading landing page content:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, []);

  // Loading state
  if (loading || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Legacy hardcoded data (now replaced by Contentful, kept for reference)
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Licensed Electrician",
      text: "This platform helped me pass my NEC exam on the first try. The adaptive testing feature was incredibly effective.",
      rating: 5
    },
    {
      name: "Mike Rodriguez",
      role: "Electrical Contractor",
      text: "The realistic exam environment gave me confidence. I felt completely prepared on exam day.",
      rating: 5
    },
    {
      name: "Jennifer Park",
      role: "Apprentice Electrician",
      text: "The progress tracking helped me identify exactly where I needed to focus my studies. Highly recommend!",
      rating: 5
    }
  ];

  const stats = [
    { label: "Students Served", value: "10,000+", icon: Users },
    { label: "Pass Rate", value: "94%", icon: CheckCircle },
    { label: "Questions Available", value: "1,800+", icon: BookOpen },
    { label: "Average Study Time", value: "40 hrs", icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Feedback Button - Fixed to right edge */}
      <FeedbackButton />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-medium text-foreground">J-man Exam Prep</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button onClick={onGetStarted}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6">
            🚀 Trusted by 10,000+ exam candidates
          </Badge>
          <h1 className="text-4xl md:text-6xl font-medium mb-6 text-foreground">
            {content.heroTitle}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            {content.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={onGetStarted}
              className="px-8 py-6 text-lg"
            >
              {content.heroCtaText} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={onTryDemo}
              className="px-8 py-6 text-lg"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {content.heroDemoText}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 7-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-medium text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium mb-4 text-foreground">
              {content.featuresTitle}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform combines the exact features you experience at the state-sponsored exam sites with proven educational methods 
              to maximize your exam success rate.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {content.features.map((feature, index) => {
                const IconComponent = iconMap[feature.icon] || Zap;
                return (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedFeature === feature.title ? 'ring-2 ring-primary border-primary/50' : 'border-border'
                    }`}
                    onClick={() => setSelectedFeature(feature.title)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
            
            <div className="md:sticky md:top-32 md:self-start">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {selectedFeature && (() => {
                      const feature = content.features.find(f => f.title === selectedFeature);
                      if (feature) {
                        const IconComponent = iconMap[feature.icon] || Zap;
                        return (
                          <>
                            <IconComponent className="w-6 h-6 text-primary" />
                            <span>{feature.title}</span>
                          </>
                        );
                      }
                      return null;
                    })()}
                    {!selectedFeature && (
                      <>
                        <Zap className="w-6 h-6 text-primary" />
                        <span>Click a feature to learn more</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedFeature 
                      ? content.features.find(f => f.title === selectedFeature)?.description
                      : "Click on any feature on the left to see detailed information about how it can help you succeed on your certification exam."
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium mb-4 text-foreground">
              {content.testimonialsTitle || 'Success Stories'}
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of professionals who've advanced their careers with our platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {(content.testimonials || testimonials).map((testimonial, index) => (
              <Card key={index} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <CheckCircle key={i} className="w-5 h-5 text-primary fill-current" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">"{testimonial.text || testimonial.quote}"</p>
                  <div>
                    <div className="font-medium text-foreground">{testimonial.name || testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-12 pb-12">
              <h2 className="text-3xl md:text-4xl font-medium mb-4 text-foreground">
                {content.ctaTitle}
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {content.ctaDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  onClick={onGetStarted}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
                >
                  {content.ctaButtonText} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={onTryDemo}
                  className="px-8 py-6 text-lg border-2 text-foreground hover:text-foreground hover:bg-accent border-foreground/20 hover:border-foreground/30"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Try Demo First
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                <Shield className="w-4 h-4 inline mr-1" />
                Secure • GDPR Compliant • No Spam Guarantee
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-card/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-medium text-foreground">ExamMaster Pro</span>
          </div>
          <p className="text-muted-foreground mb-4">
            Professional certification exam preparation platform
          </p>
          <Separator className="my-6" />
          <p className="text-sm text-muted-foreground">
            © 2025 ExamMaster Pro. All rights reserved. Built for professional success.
          </p>
        </div>
      </footer>
    </div>
  );
}