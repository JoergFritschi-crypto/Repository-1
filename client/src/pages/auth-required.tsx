import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Lock } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthRequired() {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    const returnPath = window.location.pathname;
    // Store the return path in session storage so we can redirect after login
    sessionStorage.setItem('authReturnPath', returnPath);
    // Redirect to Replit authentication
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Sign In Required</CardTitle>
          <CardDescription className="text-base mt-2">
            You need to be signed in to access this garden design
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              GardenScape Pro requires authentication to access your personal gardens and designs. 
              Sign in with your Replit account to continue.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleSignIn}
              className="w-full"
              size="lg"
              data-testid="button-signin"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In with Replit
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-home"
            >
              Go to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}