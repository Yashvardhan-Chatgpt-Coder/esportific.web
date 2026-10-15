import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";


import appCss from "../styles.css?url";
import { MyToastRegion } from "@/components/ui/Toast";
import { ExportProgressOverlay } from "@/components/ui/ExportProgressOverlay";
import { getStoredUser, type ApiUser } from "@/lib/api";
import { Smartphone } from "lucide-react";

const applyInitialThemeScript = `(function(){try{var p=window.location.pathname;var auth=p==="/login"||p==="/signup"||p==="/admin/login";var u=JSON.parse(localStorage.getItem("user")||"null");var m=auth?"light":(u&&u.appearanceMode)||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.appearanceMode=m;document.documentElement.dataset.esTheme=d?"dark":"light"}catch(_){}})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-bold text-[#000000] tracking-tight">404</h1>
        <h2 className="mt-4 text-[22px] font-semibold text-[#000000]">Page not found</h2>
        <p className="mt-2 text-[15px] text-[#9aa1b0]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex h-[40px] items-center justify-center rounded-[8px] bg-[#000000] px-6 text-[14px] font-medium text-white transition-all hover:bg-[#333]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="text-[24px] font-bold tracking-tight text-[#000000]">
          This page didn't load
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#9aa1b0]">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {error ? (
          <div className="mt-4 max-w-full overflow-hidden rounded-[8px] border border-red-200 bg-red-50/70 p-3 text-left">
            <p className="text-[12px] font-semibold text-red-700">
              {error.name || "Error"}: {error.message || String(error)}
            </p>
            {error.stack ? (
              <pre className="mt-1.5 max-h-40 overflow-auto text-[11px] leading-tight text-red-900/80">
                {error.stack}
              </pre>
            ) : null}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-[42px] items-center justify-center rounded-[8px] bg-[#000000] px-6 text-[14px] font-medium text-white transition-all hover:bg-[#333]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-[42px] items-center justify-center rounded-[8px] border-2 border-[#eef0f4] bg-white px-6 text-[14px] font-medium text-[#4b5563] transition-all hover:bg-[#f7f8fb]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dashboard | Esportific" },
      { name: "description", content: "Manage esports tournaments, teams, matches, and scoring with Esportific." },
      { name: "author", content: "Esportific" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Dashboard | Esportific" },
      { property: "og:description", content: "Manage esports tournaments, teams, matches, and scoring with Esportific." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Dashboard | Esportific" },
      { name: "twitter:description", content: "Manage esports tournaments, teams, matches, and scoring with Esportific." },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyInitialThemeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeClassManager pathname={location.pathname} />
      <div className="hidden md:block">
        <Outlet />
        <ExportProgressOverlay />
        <MyToastRegion />
      </div>
      <MobileAccessNotice />
    </QueryClientProvider>
  );
}

function MobileAccessNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-7 py-12 text-[#111111] md:hidden">
      <section className="w-full max-w-[380px] text-center">
        <img
          src="/Brand/new-logo.png"
          alt="Esportific"
          className="mx-auto mb-12 h-11 w-auto object-contain"
        />
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#eceef2] text-[#4b5563]">
          <Smartphone aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.7} />
        </div>
        <h1 className="text-[23px] font-semibold tracking-tight">Desktop access only</h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[#69707d]">
          The Esportific web dashboard is available on desktop. On your phone, use the Esportific
          mobile app.
        </p>
        <button
          type="button"
          disabled
          title="The mobile app link will be added here."
          className="mt-8 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-[9px] bg-black px-5 text-[14px] font-semibold text-white"
        >
          Get the mobile app
        </button>
        <p className="mt-3 text-[12px] text-[#8a90a0]">App link will be added here.</p>
      </section>
    </main>
  );
}

function resolveDarkMode(mode: ApiUser["appearanceMode"]): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function ThemeClassManager({ pathname }: { pathname: string }) {
  useEffect(() => {
    const authPages = new Set(["/login", "/signup", "/admin/login"]);
    const root = document.documentElement;

    const applyTheme = (mode?: ApiUser["appearanceMode"]) => {
      if (authPages.has(pathname)) {
        root.classList.remove("dark");
        root.dataset.appearanceMode = "light";
        root.dataset.esTheme = "light";
        return;
      }

      const nextMode = mode || getStoredUser()?.appearanceMode || "system";
      const isDark = resolveDarkMode(nextMode);
      root.classList.toggle("dark", isDark);
      root.dataset.appearanceMode = nextMode;
      root.dataset.esTheme = isDark ? "dark" : "light";
    };

    applyTheme();

    const onUserUpdated = (event: Event) => {
      const user = (event as CustomEvent<ApiUser>).detail;
      applyTheme(user?.appearanceMode);
    };
    const onPreview = (event: Event) => {
      applyTheme((event as CustomEvent<ApiUser["appearanceMode"]>).detail);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => applyTheme();

    window.addEventListener("esports:user-updated", onUserUpdated);
    window.addEventListener("esports:appearance-preview", onPreview);
    media.addEventListener("change", onSystemThemeChange);

    return () => {
      window.removeEventListener("esports:user-updated", onUserUpdated);
      window.removeEventListener("esports:appearance-preview", onPreview);
      media.removeEventListener("change", onSystemThemeChange);
    };
  }, [pathname]);

  return null;
}
