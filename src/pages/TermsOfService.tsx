import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone } from "lucide-react";

const TermsOfService = () => {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using NumberInfo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              NumberInfo provides a phone number lookup service that allows users to retrieve publicly available information associated with Indian mobile phone numbers, including registered names, locations, and telecom operators.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p>You must create an account to use our Service. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Acceptable Use</h2>
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p>You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Harass, stalk, or threaten any individual</li>
                <li>Engage in any illegal activities or fraud</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the privacy rights of others</li>
                <li>Send spam or unsolicited communications based on lookup results</li>
                <li>Attempt to reverse engineer or hack the Service</li>
                <li>Use automated scripts or bots to access the Service</li>
                <li>Resell or redistribute information obtained from the Service</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Credits and Payments</h2>
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p><strong className="text-foreground">Credit System:</strong> Our Service operates on a credit-based system. Each phone number lookup consumes credits from your account.</p>
              <p><strong className="text-foreground">Purchases:</strong> Credits are purchased through our payment system. All purchases are final and non-refundable unless otherwise required by law.</p>
              <p><strong className="text-foreground">Expiration:</strong> Credits do not expire as long as your account remains active.</p>
              <p><strong className="text-foreground">Pricing:</strong> We reserve the right to change pricing at any time. Changes will not affect previously purchased credits.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Accuracy</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we strive to provide accurate information, we do not guarantee the accuracy, completeness, or timeliness of any data provided through the Service. Information is sourced from publicly available databases and may be outdated or incorrect. Users should verify information through other means before making important decisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its design, features, and content, is owned by NumberInfo and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NUMBERINFO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE PAST 12 MONTHS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Account Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes by posting a notice on the Service or sending an email. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through our Help section in the dashboard.
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

export default TermsOfService;
