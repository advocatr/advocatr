import * as React from "react";
import { useLocation } from "wouter";
import { Menu, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";

export function SiteNavigation() {
  const [, setLocation] = useLocation();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { user, logout } = useUser();

  // Main navigation items - consistent for all users
  const navigationItems = [
    { id: "about", label: "About Advocatr", path: "/about" },
    { id: "how-to-use", label: "How to Use", path: "/how-to-use" },
    { id: "resources", label: "Resources", path: "/resources" },
    { id: "tools", label: "Tools", path: "/tools" },
    { id: "contact", label: "Contact", path: "/contact" }
  ];

  // User account menu items - only shown when logged in
  const accountMenuItems = user ? [
    { id: "exercises", label: "Exercises", path: "/dashboard" },
    { id: "profile", label: "Profile", path: "/profile" },
    ...(user.isAdmin ? [{ id: "admin", label: "Admin", path: "/admin/exercises" }] : []),
  ] : [];

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[200px] sm:w-[240px]">
          <nav className="flex flex-col gap-2 pt-4">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="justify-start"
                onClick={() => setLocation(item.path)}
              >
                {item.label}
              </Button>
            ))}

            {user ? (
              <>
                <div className="my-2 border-t" />
                <div className="text-sm font-medium text-muted-foreground px-3 py-2">
                  My Account
                </div>
                {accountMenuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setLocation(item.path)}
                  >
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => logout()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <div className="my-2 border-t" />
                <Button
                  variant="default"
                  className="justify-start"
                  onClick={() => setLocation("/auth")}
                >
                  Register/Login
                </Button>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-1">
      {/* Main navigation items */}
      <nav className="flex items-center gap-1">
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => setLocation(item.path)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {/* User account section */}
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-2">
              <User className="mr-2 h-4 w-4" />
              My Account
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {accountMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => setLocation(item.path)}
                className="cursor-pointer"
              >
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => setLocation("/auth")}
          className="ml-2"
        >
          Register/Login
        </Button>
      )}
    </div>
  );
}