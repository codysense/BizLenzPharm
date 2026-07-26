import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { posApi } from "../../lib/api";
import {
  Search,
  Play,
  Trash2,
  Eye,
  Calendar,
  User,
  ShoppingBag,
} from "lucide-react";
import toast from "react-hot-toast";
import DetailPOSSaleModal from "./DetailPOSSaleModal";
import PosTerminal from "./POSTerminal";
import { PosSession } from "../../types/api";

interface PendingPOSSalesProps {
  session: PosSession;
  onResumeSale: (sale: any) => void; // Parent handler to open POSTerminal with this sale
}

export const PendingPOSSales = ({
  session,
  onResumeSale,
}: PendingPOSSalesProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Fetch pending sales
  const { data, isLoading, error } = useQuery({
    queryKey: ["pendingPOSSales"],
    queryFn: () => posApi.getPendingSales(),
  });

  const pendingSales = data?.pendingSales || [];

  // 2. Delete/Cancel pending sale mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => posApi.deletePendingSale(id),
    onSuccess: () => {
      toast.success("Pending sale deleted/cancelled");
      queryClient.invalidateQueries({ queryKey: ["pendingPOSSales"] });
      setIsDetailOpen(false);
      setSelectedSale(null);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to delete pending sale");
    },
  });

  // Filter sales by search query
  const filteredSales = pendingSales.filter((sale: any) => {
    const saleNo = sale.saleNo.toLowerCase();
    const customerName = (
      sale.customer?.name || "walk-in customer"
    ).toLowerCase();
    const query = searchQuery.toLowerCase();
    return saleNo.includes(query) || customerName.includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        Failed to load pending sales. Please check backend connection.
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paused POS Sales</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage paused sales without any accounting effects. Click resume to
            restore them.
          </p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by sale number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* SALES GRID */}
      {filteredSales.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">
            No paused sales found
          </p>
          <p className="text-gray-500 text-sm mt-1">
            You can pause active sales in the POS terminal to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSales.map((sale: any) => {
            const itemCount =
              sale.pendingSaleLines?.reduce(
                (sum: number, line: any) => sum + Number(line.qty),
                0,
              ) || 0;
            return (
              <div
                key={sale.id}
                className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top line */}
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-900 text-lg">
                      {sale.saleNo}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Paused
                    </span>
                  </div>

                  {/* Customer & Info */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(sale.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {sale.customer?.name || "Walk-in Customer"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                      <span>{itemCount} item(s)</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Value</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      ₦{Number(sale.totalAmount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2 mt-6">
                  <button
                    onClick={() => {
                      setSelectedSale(sale);
                      setIsDetailOpen(true);
                    }}
                    className="py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>

                  <button
                    onClick={() => onResumeSale(sale)}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>

                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete/cancel this pending sale?",
                        )
                      ) {
                        deleteMutation.mutate(sale.id);
                      }
                    }}
                    className="py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedSale && (
        <DetailPOSSaleModal
          sale={selectedSale}
          isPending={true}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedSale(null);
          }}
          onResume={(sale) => {
            setIsDetailOpen(false);
            onResumeSale(sale);
          }}
          onDelete={(id) => {
            deleteMutation.mutate(id);
          }}
        />
      )}
    </div>
  );
};

export default PendingPOSSales;

/**
 * 5. Parent Component Dashboard integration snippet
 *
 * In your POS Dashboard or POS page where you manage terminals:
 *
 * const PosDashboard = () => {
 *   const [activeTab, setActiveTab] = useState<'terminal' | 'pending' | 'history'>('terminal');
 *   const [resumedSale, setResumedSale] = useState<any>(null);
 *   const [isTerminalOpen, setIsTerminalOpen] = useState(false);
 *
 *   const handleResumeSale = (sale: any) => {
 *     setResumedSale(sale);
 *     setIsTerminalOpen(true);
 *   };
 *
 *   return (
 *     <div>
 *       {isTerminalOpen && (
 *         <PosTerminal
 *           session={activeSession}
 *           resumedSale={resumedSale}
 *           onClose={() => {
 *             setIsTerminalOpen(false);
 *             setResumedSale(null);
 *           }}
 *           onSaleComplete={() => {
 *             setIsTerminalOpen(false);
 *             setResumedSale(null);
 *             // refresh queries ...
 *           }}
 *         />
 *       )}
 *
 *       // Render Pending POS Sales List
 *       {activeTab === 'pending' && (
 *         <PendingPOSSales
 *           session={activeSession}
 *           onResumeSale={handleResumeSale}
 *         />
 *       )}
 *     </div>
 *   );
 * };
 */
