import { useState } from "react";
import { useAuth } from "../SSOAuthContext";
import { auth } from "../lib/firebase";

export default function DebugAuth() {
  const { user, role } = useAuth();
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const copyIdToken = async () => {
    if (!user) {
      setOutput("Error: Not signed in");
      return;
    }
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        await navigator.clipboard.writeText(token);
        setTokenCopied(true);
        setOutput("ID Token copied to clipboard!");
        setTimeout(() => setTokenCopied(false), 3000);
      } else {
        setOutput("Error: Could not get ID token");
      }
    } catch (err) {
      setOutput(`Error copying token: ${err.message}`);
    }
  };

  const testBrokerHealth = async () => {
    setLoading(true);
    setOutput("");
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/health`);
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Broker returned non-JSON response (${contentType}). Check VITE_API_BASE or CORS.`);
      }
      
      const data = await response.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      if (err.message.includes("Failed to fetch")) {
        setOutput(`Error: Cannot reach broker at ${import.meta.env.VITE_API_BASE}\nCheck if broker is running and CORS is configured.`);
      } else {
        setOutput(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testAuthEndpoint = async (endpoint, method = "GET") => {
    if (!user) {
      setOutput("Error: Not signed in");
      return;
    }
    
    setLoading(true);
    setOutput("");
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const baseUrl = import.meta.env.VITE_API_BASE || "http://localhost:8000";
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Broker returned non-JSON response (${contentType}). Check VITE_API_BASE or CORS.`);
      }
      
      const data = await response.json();
      setOutput(`Status: ${response.status}\n\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🔧 Debug Auth & Broker</h1>
        
        {/* User Info Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Current User</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Email:</span>{" "}
              <span className="text-gray-700">{user?.email || "Not signed in"}</span>
            </div>
            <div>
              <span className="font-medium">UID:</span>{" "}
              <span className="text-gray-700 font-mono text-xs">{user?.uid || "—"}</span>
            </div>
            <div>
              <span className="font-medium">Role:</span>{" "}
              <span className="text-gray-700">{role || "unknown (broker /me not implemented)"}</span>
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Environment</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">SSO Enabled:</span>{" "}
              <span className={`font-mono ${import.meta.env.VITE_ENABLE_SSO === 'true' ? 'text-green-600' : 'text-red-600'}`}>
                {String(import.meta.env.VITE_ENABLE_SSO)}
              </span>
            </div>
            <div>
              <span className="font-medium">API Base:</span>{" "}
              <span className="text-gray-700 font-mono text-xs">
                {import.meta.env.VITE_API_BASE || "not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyIdToken}
              disabled={!user}
              className={`px-4 py-2 rounded-md font-medium ${
                tokenCopied 
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {tokenCopied ? "✓ Copied!" : "Copy ID Token"}
            </button>
            
            <button
              onClick={testBrokerHealth}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Test Broker Health
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => testAuthEndpoint("/cbrt/releases")}
              disabled={loading || !user}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              GET /cbrt/releases
            </button>
            
            <button
              onClick={() => testAuthEndpoint("/cbrt/releases/123/stage", "POST")}
              disabled={loading || !user}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              POST /stage (loader+)
            </button>
            
            <button
              onClick={() => testAuthEndpoint("/cbrt/releases/123/verify", "POST")}
              disabled={loading || !user}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              POST /verify (supervisor+)
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Output</h3>
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap min-h-[200px]">
            {loading ? "Loading..." : output || "Results will appear here..."}
          </pre>
        </div>

        {/* Quick Help */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Test Steps:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Test Broker Health - should return JSON with ok: true</li>
            <li>Copy ID Token - use this for curl tests</li>
            <li>Test /cbrt/releases - should return 200 with items: []</li>
            <li>Test role-based endpoints - verify 403/200 by role</li>
          </ol>
        </div>
      </div>
    </div>
  );
}