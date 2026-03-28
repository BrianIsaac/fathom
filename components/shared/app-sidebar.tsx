'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Waves,
  Rocket,
  Shield,
  Search,
  TrendingUp,
  ScrollText,
  FlaskConical,
} from 'lucide-react';

const SECTIONS = [
  {
    label: 'Agents',
    items: [
      { title: 'Fathom Pool', href: '/', icon: Waves },
      { title: 'Deploy', href: '/deploy', icon: Rocket },
    ],
  },
  {
    label: 'Run Once',
    items: [
      { title: 'Sentries', href: '/sentries', icon: Shield },
      { title: 'Due Diligence', href: '/due-diligence', icon: Search },
      { title: 'Earnings', href: '/earnings', icon: TrendingUp },
      { title: 'Regulatory', href: '/regulatory', icon: ScrollText },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Eval Dashboard', href: '/eval', icon: FlaskConical },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Waves className="h-6 w-6" />
          <span>Fathom</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {SECTIONS.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <SidebarSeparator />}
            <SidebarGroup>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
