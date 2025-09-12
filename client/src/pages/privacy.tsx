import Navigation from "@/components/layout/navigation";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
            <p>
              GardenScape Pro collects information you provide directly to us, such as when you create an account, 
              use our garden design tools, or contact us for support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Creating and managing your garden designs</li>
              <li>Providing plant identification and recommendations</li>
              <li>Processing payments for premium features</li>
              <li>Communicating with you about our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our contact page 
              or reach out via the support channels available in your account.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}