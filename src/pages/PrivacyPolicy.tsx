import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Phone className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-foreground">NumberInfo</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to NumberInfo ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our phone number lookup service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your email address and username.</p>
              <p><strong className="text-foreground">Usage Data:</strong> We collect information about how you use our service, including search queries (phone numbers looked up), timestamps, and feature usage.</p>
              <p><strong className="text-foreground">Payment Information:</strong> When you purchase credits, payment processing is handled by our third-party payment processor. We do not store complete credit card information.</p>
              <p><strong className="text-foreground">Device Information:</strong> We may collect device type, browser type, IP address, and operating system for security and analytics purposes.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <ul className="text-muted-foreground leading-relaxed list-disc pl-6 space-y-2">
              <li>To provide and maintain our phone number lookup service</li>
              <li>To process transactions and manage your account</li>
              <li>To communicate with you about service updates and support</li>
              <li>To improve our services and develop new features</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you services. Search history may be retained for up to 90 days. You may request deletion of your data at any time by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use third-party services for payment processing, analytics, and infrastructure. These services have their own privacy policies, and we encourage you to review them. We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We may also use analytics cookies to understand how users interact with our service. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Your Rights</h2>
            <ul className="text-muted-foreground leading-relaxed list-disc pl-6 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us through our Help section in the dashboard or by email.
            </p>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">NumberInfo</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/privacy")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button>
            <button onClick={() => navigate("/terms")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
