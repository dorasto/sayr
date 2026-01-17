"use client";

import { useState, useCallback } from "react";

interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    default?: unknown;
    enum?: string[];
  };
}

interface RequestTesterProps {
  method: string;
  path: string;
  baseUrl: string;
  parameters: Parameter[];
}

const methodConfig: Record<string, { bg: string; text: string }> = {
  GET: {
    bg: "bg-green-800",
    text: "text-green-200",
  },
  POST: {
    bg: "bg-blue-800",
    text: "text-blue-200",
  },
  PUT: {
    bg: "bg-orange-800",
    text: "text-orange-200",
  },
  PATCH: {
    bg: "bg-yellow-800",
    text: "text-yellow-200",
  },
  DELETE: {
    bg: "bg-red-800",
    text: "text-red-200",
  },
};

export function RequestTester({
  method,
  path,
  baseUrl,
  parameters,
}: RequestTesterProps) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const param of parameters) {
      if (param.schema?.default !== undefined) {
        initial[param.name] = String(param.schema.default);
      } else {
        initial[param.name] = "";
      }
    }
    return initial;
  });
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    data: unknown;
    time: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [varsOpen, setVarsOpen] = useState(true);

  const pathParams = parameters.filter((p) => p.in === "path");
  const queryParams = parameters.filter((p) => p.in === "query");

  const buildUrl = useCallback(() => {
    let url = path;

    // Replace path parameters
    for (const param of pathParams) {
      const value = paramValues[param.name];
      if (value) {
        url = url.replace(`{${param.name}}`, encodeURIComponent(value));
      }
    }

    // Add query parameters
    const queryParts: string[] = [];
    for (const param of queryParams) {
      const value = paramValues[param.name];
      if (value) {
        queryParts.push(
          `${encodeURIComponent(param.name)}=${encodeURIComponent(value)}`,
        );
      }
    }

    if (queryParts.length > 0) {
      url += `?${queryParts.join("&")}`;
    }

    return baseUrl + url;
  }, [path, baseUrl, pathParams, queryParams, paramValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const url = buildUrl();
    const startTime = performance.now();

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          Accept: "application/json",
        },
      });

      const endTime = performance.now();
      const data = await res.json();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        time: Math.round(endTime - startTime),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-400";
    if (status >= 400 && status < 500) return "text-orange-400";
    if (status >= 500) return "text-red-400";
    return "text-blue-400";
  };

  const config = methodConfig[method] || {
    bg: "bg-gray-600",
    text: "text-white",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Method + URL Bar */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded ${config.bg} ${config.text} font-mono`}
        >
          {method}
        </span>
        <code className="text-sm text-muted-foreground truncate flex-1">
          {path}
        </code>
      </div>

      <form onSubmit={handleSubmit} className="divide-y divide-border">
        {/* Authorization Section */}
        <div>
          <button
            type="button"
            onClick={() => setAuthOpen(!authOpen)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary bg-accent transition-colors"
          >
            <svg
              className={`w-3 h-3 text-foreground transition-transform ${authOpen ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-foreground">
              Authorization
            </span>
          </button>
          {authOpen && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs text-foreground">bearerAuth</p>
              <p className="text-xs text-foreground">
                Type: <span className="text-foreground">HTTP (bearer)</span>
              </p>
            </div>
          )}
        </div>

        {/* Variables Section */}
        {parameters.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setVarsOpen(!varsOpen)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary bg-accent transition-colors"
            >
              <svg
                className={`w-3 h-3 text-foreground transition-transform ${varsOpen ? "rotate-90" : ""}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-foreground">
                Variables
              </span>
            </button>
            {varsOpen && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {/* Table header */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                    <span>Key</span>
                    <span>Value</span>
                  </div>

                  {/* Parameter rows */}
                  {parameters.map((param) => (
                    <div
                      key={param.name}
                      className="grid grid-cols-2 gap-2 items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">
                          {param.name}
                          {param.required && (
                            <span className="text-red-400 ml-0.5">*</span>
                          )}
                        </span>
                      </div>
                      {param.schema?.enum ? (
                        <select
                          value={paramValues[param.name]}
                          onChange={(e) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [param.name]: e.target.value,
                            }))
                          }
                          className="px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Select...</option>
                          {param.schema.enum.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={
                            param.schema?.type === "integer" ? "number" : "text"
                          }
                          value={paramValues[param.name]}
                          onChange={(e) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [param.name]: e.target.value,
                            }))
                          }
                          placeholder={
                            param.description || `Enter ${param.name}`
                          }
                          className="px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Try it out button */}
        <div className="px-4 py-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-secondary hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground font-medium text-sm rounded-md border border-border transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              "Try it out"
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="border-t border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <h5 className="text-sm font-medium text-foreground">Response</h5>
            <span
              className={`text-sm font-mono font-bold ${getStatusColor(response.status)}`}
            >
              {response.status} {response.statusText}
            </span>
            <span className="text-xs text-muted-foreground">
              {response.time}ms
            </span>
          </div>
          <div className="px-4 pb-4">
            <pre className="p-4 bg-muted/50 rounded-md overflow-x-auto text-xs max-h-80">
              <code className="text-foreground">
                {JSON.stringify(response.data, null, 2)}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
