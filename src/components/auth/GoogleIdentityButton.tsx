import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentityApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "signin_with" | "signup_with";
      shape: "rect";
      logo_alignment: "left";
      width: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  }
}

type GoogleIdentityButtonProps = {
  intent: "login" | "signup";
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
};

const GOOGLE_SCRIPT_ID = "google-identity-services";

export function GoogleIdentityButton({
  intent,
  onCredential,
  disabled = false,
}: GoogleIdentityButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [configurationMissing, setConfigurationMissing] = useState(false);

  onCredentialRef.current = onCredential;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    const container = containerRef.current;
    if (!container) return;
    if (!clientId) {
      setConfigurationMissing(true);
      return;
    }

    let disposed = false;
    const renderGoogleButton = () => {
      const googleIdentity = window.google?.accounts?.id;
      if (!googleIdentity || disposed || !containerRef.current) return;

      googleIdentity.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) void onCredentialRef.current(response.credential);
        },
      });
      containerRef.current.replaceChildren();
      googleIdentity.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: intent === "signup" ? "signup_with" : "signin_with",
        shape: "rect",
        logo_alignment: "left",
        width: Math.min(Math.max(containerRef.current.clientWidth, 200), 400),
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
    } else {
      const script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderGoogleButton);
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      existingScript?.removeEventListener("load", renderGoogleButton);
    };
  }, [intent]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        aria-label={intent === "signup" ? "Sign up with Google" : "Sign in with Google"}
        aria-disabled={disabled || configurationMissing}
        className={`flex min-h-[40px] w-full justify-center overflow-hidden rounded-[10px] ${
          disabled || configurationMissing ? "pointer-events-none opacity-50" : ""
        }`}
      />
      {configurationMissing ? (
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Google sign-in needs a client ID before it can be used.
        </p>
      ) : null}
    </div>
  );
}
