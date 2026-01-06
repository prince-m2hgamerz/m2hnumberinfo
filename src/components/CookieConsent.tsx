import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";
import { useNavigate } from "react-router-dom";

const COOKIE_CONSENT_KEY = "numberinfo_cookie_consent";

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="container max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-secondary items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5 text-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-base font-semibold text-foreground">Cookie Preferences</h3>
                <button 
                  onClick={handleDecline}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Close cookie banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. 
                By clicking "Accept All", you consent to our use of cookies. Read our{" "}
                <button 
                  onClick={() => navigate("/privacy")} 
                  className="text-foreground hover:underline"
                >
                  Privacy Policy
                </button>{" "}
                for more information.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleAcceptAll} size="sm" className="w-full sm:w-auto">
                  Accept All
                </Button>
                <Button onClick={handleAcceptEssential} variant="outline" size="sm" className="w-full sm:w-auto">
                  Essential Only
                </Button>
                <Button onClick={handleDecline} variant="ghost" size="sm" className="w-full sm:w-auto text-muted-foreground">
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to check cookie consent status
export const useCookieConsent = () => {
  const [consent, setConsent] = useState<{
    accepted: boolean;
    analytics: boolean;
    marketing: boolean;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  return consent;
};
