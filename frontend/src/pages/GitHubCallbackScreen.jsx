import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Github, CheckCircle, XCircle } from "lucide-react";

const GitHubCallbackScreen = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const success = params.get("success") === "true";
  const error = params.get("error");

  useEffect(() => {
    const t = setTimeout(() => navigate("/settings"), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(var(--canvas))" }}>
      <div className="text-center space-y-6 max-w-sm px-6">
        {success ? (
          <>
            {React.createElement(CheckCircle, { className: "w-16 h-16 mx-auto", style: { color: "oklch(var(--accent))" } })}
            <div className="space-y-2">
              <h1 className="mc-display text-3xl tracking-tight">GitHub connected.</h1>
              <p className="mc-body text-sm" style={{ color: "oklch(var(--text-muted))" }}>
                Redirecting to settings…
              </p>
            </div>
          </>
        ) : (
          <>
            {React.createElement(XCircle, { className: "w-16 h-16 mx-auto", style: { color: "oklch(var(--primary))" } })}
            <div className="space-y-2">
              <h1 className="mc-display text-3xl tracking-tight">Connection failed.</h1>
              <p className="mc-body text-sm" style={{ color: "oklch(var(--text-muted))" }}>
                {error === "token_exchange_failed" ? "GitHub rejected the request." : "Something went wrong."}
              </p>
              <p className="mc-body text-sm" style={{ color: "oklch(var(--text-muted))" }}>
                Redirecting to settings…
              </p>
            </div>
          </>
        )}
        {React.createElement(Github, { className: "w-5 h-5 mx-auto opacity-20" })}
      </div>
    </div>
  );
};

export default GitHubCallbackScreen;
