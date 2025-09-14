import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bug, Bomb, AlertTriangle, CheckCircle } from 'lucide-react';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  trigger: () => void;
}

export function ErrorBoundaryTest() {
  const [testStatus, setTestStatus] = useState<string>('');

  const testScenarios: TestScenario[] = [
    {
      id: 'throw-error',
      name: 'Throw Simple Error',
      description: 'Throws a basic JavaScript error to test error boundary',
      icon: <Bug className="h-4 w-4" />,
      trigger: () => {
        throw new Error('Test error: This is a simulated error for testing the error boundary');
      }
    },
    {
      id: 'null-reference',
      name: 'Null Reference Error',
      description: 'Attempts to access property of null object',
      icon: <AlertTriangle className="h-4 w-4" />,
      trigger: () => {
        const nullObj: any = null;
        // This will throw a TypeError
        console.log(nullObj.nonExistentProperty);
      }
    },
    {
      id: 'async-error',
      name: 'Async Error',
      description: 'Simulates an async operation failure',
      icon: <Bomb className="h-4 w-4" />,
      trigger: async () => {
        setTestStatus('Simulating async error...');
        await new Promise(resolve => setTimeout(resolve, 500));
        throw new Error('Async operation failed: Network timeout simulation');
      }
    },
    {
      id: 'render-error',
      name: 'Render Error',
      description: 'Causes error during render phase',
      icon: <Bug className="h-4 w-4" />,
      trigger: () => {
        // Force a re-render with invalid state
        setTestStatus(null as any);
        // This will cause error when trying to render
        (window as any).forceRenderError = true;
      }
    }
  ];

  // Component that will throw error during render if flag is set
  const ErrorComponent = () => {
    if ((window as any).forceRenderError) {
      throw new Error('Render phase error: Component failed to render');
    }
    return null;
  };

  const handleTest = (scenario: TestScenario) => {
    setTestStatus(`Testing: ${scenario.name}`);
    try {
      scenario.trigger();
    } catch (error) {
      // Let error propagate to error boundary
      throw error;
    }
  };

  return (
    <div className="space-y-6" data-testid="error-boundary-test">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Boundary Test Suite
          </CardTitle>
          <CardDescription>
            Test different error scenarios to verify error boundaries work correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> These buttons will intentionally cause errors to test
              the error boundary. The app should recover gracefully without crashing.
            </AlertDescription>
          </Alert>

          {testStatus && (
            <Alert>
              <AlertDescription>{testStatus}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {testScenarios.map((scenario) => (
              <Card key={scenario.id} className="border-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      {scenario.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {scenario.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleTest(scenario)}
                    data-testid={`test-${scenario.id}`}
                  >
                    <Bomb className="h-4 w-4 mr-2" />
                    Trigger Error
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Expected Behavior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Error boundary catches the error</li>
                <li>• User-friendly error message is displayed</li>
                <li>• "Try Again" button allows recovery</li>
                <li>• App doesn't completely crash</li>
                <li>• Error details available in development mode</li>
              </ul>
            </CardContent>
          </Card>

          <ErrorComponent />
        </CardContent>
      </Card>
    </div>
  );
}

// Component to throw error after mount
export function DelayedErrorComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Delayed error: This error was triggered after component mount');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delayed Error Test</CardTitle>
        <CardDescription>
          This component will throw an error 2 seconds after the button is clicked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => {
            setTimeout(() => setShouldError(true), 2000);
          }}
          data-testid="trigger-delayed-error"
        >
          Trigger Delayed Error (2s)
        </Button>
      </CardContent>
    </Card>
  );
}