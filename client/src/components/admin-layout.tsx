import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, LayoutGrid, LogOut, Users } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useUser();
  const [location, setLocation] = useLocation();

  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  const navigation = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Exercises",
      href: "/admin/exercises",
      icon: LayoutGrid,
    },
    {
      name: "User Management",
      href: "/admin/progress",
      icon: Users,
    },
    {
      name: "AI Config",
      href: "/admin/ai-config",
      icon: LayoutGrid,
    },
    {
      name: "Tools",
      href: "/admin/tools",
      icon: LayoutGrid,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.name}
                    variant={location === item.href ? "default" : "outline"}
                    onClick={() => setLocation(item.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}