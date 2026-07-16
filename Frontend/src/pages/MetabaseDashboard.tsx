import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, AlertTriangle } from "lucide-react";
import { reportsApi } from "../lib/api";

const MetabaseDashboard: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["metabase-dashboard-embed"],
    queryFn: () => reportsApi.getDashboardEmbed(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const embedUrl = data?.url;

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Business intelligence reports powered by Metabase
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow h-[calc(100vh-180px)]">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">
                Loading dashboard...
              </span>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load dashboard.</span>
              <button
                onClick={() => refetch()}
                className="ml-2 text-sm underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && embedUrl && (
          <iframe
            src={embedUrl}
            title="Metabase Dashboard"
            className="w-full h-full rounded-lg"
            frameBorder="0"
          />
        )}

        {!isLoading && !isError && !embedUrl && (
          <div className="flex items-center justify-center h-full text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Dashboard URL not available.
          </div>
        )}
      </div>
    </div>
  );
};

export default MetabaseDashboard;
