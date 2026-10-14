import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { Calculator, Gamepad2, Image, Layers, Swords, Database, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => pageMeta('Admin dashboard', 'Open administrative tools for Esportific users, events, and content.'),
  component: AdminHomePage,
});

const quickLinks = [
  {
    title: "Users",
    description: "All registered organizers and admins",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Events",
    description: "Events available to this admin",
    url: "/admin/events",
    icon: Swords,
  },
  {
    title: "Scoring rules",
    description: "Platform templates for organizers",
    url: "/admin/scoring-rules",
    icon: Calculator,
  },
  {
    title: "Templates",
    description: "Manage created leaderboard templates",
    url: "/admin/templates",
    icon: Image,
  },
  {
    title: "Assets",
    description: "Design system reference",
    url: "/admin/assets",
    icon: Layers,
  },
  {
    title: "Games",
    description: "Games, maps, and modes catalog",
    url: "/admin/games",
    icon: Gamepad2,
  },
  {
    title: "Cloudinary",
    description: "Audit and purge unused team logo assets",
    url: "/admin/cloudinary",
    icon: Database,
  },
];

function AdminHomePage() {
  return (
    <>
      <SoftwareHeader title="Admin" variant="admin" />
      <motion.main
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-0 flex-1 overflow-y-auto p-8"
      >
        <div className="mx-auto max-w-[900px]">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
            Platform administration
          </h1>
          <p className="mt-2 max-w-[560px] text-[14px] text-[#666666]">
            Manage shared data and platform operations organizers use when running tournaments.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className="flex cursor-pointer gap-4 rounded-[10px] border border-[#e2e5ec] bg-white p-5 transition-colors hover:border-[#d1d5db] hover:bg-[#fcfdfd]"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#f0f1f3]">
                    <Icon className="h-5 w-5 text-[#4b5563]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#000000]">{item.title}</p>
                    <p className="mt-1 text-[13px] text-[#666666]">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.main>
    </>
  );
}
