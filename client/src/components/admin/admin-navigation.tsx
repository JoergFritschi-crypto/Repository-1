import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Home, 
  Settings, 
  Database, 
  Shield,
  TestTube,
  ChevronRight,
  Map
} from "lucide-react";

interface AdminNavigationProps {
  currentPage?: string;
  gardenId?: string;
}

export function AdminNavigation({ currentPage, gardenId }: AdminNavigationProps) {
  const [location] = useLocation();
  
  // Determine if we're in a garden design context from admin
  const isGardenDesign = location.includes('/garden-design/');
  const isFromAdmin = sessionStorage.getItem('navigationSource') === 'admin';
  
  return (
    <Card className="mb-4 border-2 border-gray-200">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Breadcrumb and Back Navigation */}
          <div className="flex items-center gap-3">
            {/* Back to Main App Button */}
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                Main App
              </Button>
            </Link>
            
            <ChevronRight className="w-4 h-4 text-gray-400" />
            
            {/* Admin Dashboard Link */}
            {!isGardenDesign && (
              <span className="font-medium text-gray-900">Admin Dashboard</span>
            )}
            
            {isGardenDesign && (
              <>
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Admin Dashboard
                  </Button>
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">Garden Design</span>
              </>
            )}
            
            {currentPage && !isGardenDesign && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{currentPage}</span>
              </>
            )}
          </div>
          
          {/* Right side - Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Navigation Buttons */}
            {isGardenDesign && gardenId && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Admin
                </Button>
              </Link>
            )}
            
            {!isGardenDesign && (
              <>
                <Link href="/admin">
                  <Button 
                    variant={location === '/admin' ? 'default' : 'ghost'} 
                    size="sm"
                    className="gap-2"
                  >
                    <Database className="w-4 h-4" />
                    Plants
                  </Button>
                </Link>
                
                <Link href="/admin/test-garden">
                  <Button 
                    variant={location === '/admin/test-garden' ? 'default' : 'ghost'} 
                    size="sm"
                    className="gap-2"
                  >
                    <TestTube className="w-4 h-4" />
                    Test Garden
                  </Button>
                </Link>
                
                <Link href="/admin/security">
                  <Button 
                    variant={location === '/admin/security' ? 'default' : 'ghost'} 
                    size="sm"
                    className="gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Security
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}