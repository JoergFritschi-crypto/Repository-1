import Navigation from "@/components/layout/navigation";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
            <p>
              By accessing and using GardenScape Pro, you accept and agree to be bound by the terms 
              and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Service Description</h2>
            <p>
              GardenScape Pro provides AI-powered garden design tools, plant identification services, 
              and gardening advice. Our services include:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Garden design and layout tools</li>
              <li>Plant library and identification</li>
              <li>3D visualization capabilities</li>
              <li>Premium features for advanced users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">User Responsibilities</h2>
            <p>
              Users are responsible for maintaining the confidentiality of their account information 
              and for all activities that occur under their account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment Terms</h2>
            <p>
              Premium features require payment as outlined in our pricing plans. All payments are processed 
              securely through our payment partners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
            <p>
              GardenScape Pro provides gardening advice and tools for informational purposes. 
              Plant care results may vary based on local conditions and individual implementation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}