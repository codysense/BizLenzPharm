import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Trash2,
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Minimize,
} from "lucide-react";
import * as XLSX from "xlsx"; // Requires: npm install xlsx
import { inventoryApi, itemImportApi } from "../../lib/api"; // Adjust API mapping path as necessary
// Zod Schema for frontend validation of the import form
const importItemsSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  openingDate: z.string().min(1, "Opening date is required"),
  remarks: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        type: z.string().default("FINISHED_GOODS"),
        uom: z.string().default("Pcs"),
        minimumStockLevel: z.number().optional(),
        costingMethod: z.string().default("GLOBAL"),
        standardCost: z.number().optional(),
        cartonQuantity: z.number().optional(),
        taxCode: z.string().optional(),
        salesPrice: z.number().nonnegative().default(0),
        wholesalesPrice: z.number().nonnegative().default(0),
        costPrice: z.number().nonnegative().default(0),
        stockBalance: z.number().nonnegative().default(0),
      }),
    )
    .min(1, "Please select and parse a valid Excel/CSV file with items"),
});
type ImportItemsFormData = z.infer<typeof importItemsSchema>;
interface ImportItemsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}
const ImportItemsModal = ({ onClose, onSuccess }: ImportItemsModalProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ImportItemsFormData>({
    resolver: zodResolver(importItemsSchema),
    defaultValues: {
      warehouseId: "",
      openingDate: new Date().toISOString().split("T")[0],
      remarks: "QuickBooks Inventory Import",
      items: [],
    },
  });
  // Query to fetch warehouses for opening stock assignments
  const { data: warehouses } = useQuery<{
    warehouses: Array<{ id: string; name: string }>;
  }>({
    queryKey: ["warehouses-for-item-import"],
    queryFn: () =>
      inventoryApi.getWarehouses() as Promise<{
        warehouses: Array<{ id: string; name: string }>;
      }>,
  });
  const items = watch("items") || [];
  // Parse Excel / CSV files client-side using SheetJS
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("Could not read file data");
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse rows as raw JSON array
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);
        if (rawRows.length === 0) {
          throw new Error("The uploaded sheet appears to be empty.");
        }
        // Map spreadsheet columns to matching API keys
        const formattedItems = rawRows.map((row: any, idx: number) => {
          // Normalise keys by removing extra spaces and forcing lowercase checks
          const normalizedRow: { [key: string]: any } = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          });
          // Extract key name or fallbacks
          const name =
            normalizedRow["name"] ||
            normalizedRow["item name"] ||
            normalizedRow["item"] ||
            normalizedRow["product/service name"];
          if (!name) {
            throw new Error(
              `Row ${idx + 2} is missing the Item Name (must have "name" header)`,
            );
          }
          return {
            name: String(name).trim(),
            description:
              normalizedRow["description"] ||
              normalizedRow["sales description"] ||
              "",
            type: normalizedRow["type"] || "FINISHED_GOODS",
            uom: normalizedRow["uom"] || normalizedRow["unit"] || "Pcs",
            minimumStockLevel: normalizedRow["minimumstocklevel"]
              ? Number(normalizedRow["minimumstocklevel"])
              : undefined,
            costingMethod: normalizedRow["costingmethod"] || "GLOBAL",
            standardCost: normalizedRow["standardcost"]
              ? Number(normalizedRow["standardcost"])
              : undefined,

            cartonQuantity: normalizedRow["cartonquantity"]
              ? Number(normalizedRow["cartonquantity"])
              : undefined,
            taxCode: normalizedRow["taxcode"]
              ? String(normalizedRow["taxcode"])
              : undefined,
            salesPrice: Number(
              normalizedRow["salesprice"] ||
                normalizedRow["price"] ||
                normalizedRow["rate"] ||
                0,
            ),
            wholesalesPrice: Number(
              normalizedRow["wholesalesprice"] ||
                normalizedRow["wholesale price"] ||
                0,
            ),
            costPrice: Number(
              normalizedRow["costprice"] ||
                normalizedRow["cost"] ||
                normalizedRow["average cost"] ||
                0,
            ),
            stockBalance: Number(
              normalizedRow["stockbalance"] ||
                normalizedRow["qty on hand"] ||
                normalizedRow["qty"] ||
                0,
            ),
          };
        });
        // Set items in React Hook Form state
        setValue("items", formattedItems, {
          shouldValidate: true,
          shouldDirty: true,
        });
        toast.success(`Successfully parsed ${formattedItems.length} items`);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        setParseError(
          err?.message || "Failed to parse file. Ensure column headers match.",
        );
        setValue("items", []);
      }
    };
    reader.onerror = () => {
      setParseError("File reading failed.");
    };
    reader.readAsBinaryString(file);
  };
  // Summaries
  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.stockBalance || 0), 0);
  }, [items]);
  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.stockBalance || 0) * Number(item.costPrice || 0);
    }, 0);
  }, [items]);
  const removeItem = (index: number) => {
    const copy = [...items];
    copy.splice(index, 1);
    setValue("items", copy, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const onSubmit = async (data: ImportItemsFormData) => {
    try {
      // Trigger API post mapping to our custom ItemImportController endpoint
      await itemImportApi.importItems(data);
      toast.success(
        "QuickBooks inventory items and opening stock imported successfully!",
      );
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to import items");
    }
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  Import QuickBooks Items
                </h3>
                <p className="mt-1 text-sm text-blue-100">
                  Bulk create items and assign initial opening inventory
                  balances from Excel
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[85vh] overflow-y-auto p-6 space-y-6"
          >
            {/* Setup Settings & File Upload */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-1 rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">
                  Import Settings
                </h4>

                {/* Warehouse */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Warehouse *
                  </label>
                  <select
                    {...register("warehouseId")}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses?.warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {errors.warehouseId && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.warehouseId.message}
                    </p>
                  )}
                </div>
                {/* Date */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Opening Date *
                  </label>
                  <input
                    {...register("openingDate")}
                    type="date"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {errors.openingDate && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.openingDate.message}
                    </p>
                  )}
                </div>
                {/* Remarks */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Remarks
                  </label>
                  <textarea
                    {...register("remarks")}
                    rows={2}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none"
                    placeholder="Optional remarks..."
                  />
                </div>
              </div>
              {/* Right Column: File Upload Area */}
              <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 text-center hover:border-indigo-500 transition-colors relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="my-auto space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-800">
                      {fileName
                        ? `Selected: ${fileName}`
                        : "Upload QuickBooks Excel / CSV File"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports .xlsx, .xls, and .csv formats
                    </p>
                  </div>
                </div>
                {parseError && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Error Message for missing file/items */}
            {errors.items && (
              <p className="text-sm text-red-600 font-medium text-center bg-red-50 py-2 rounded-xl border border-red-100">
                {errors.items.message}
              </p>
            )}
            {/* Preview Section */}
            {items.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-6 py-4 flex justify-between items-center">
                    <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                      Parsed Items Preview ({items.length})
                    </h4>
                  </div>

                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 border-b">
                        <tr className="text-left text-gray-600">
                          <th className="px-6 py-3">#</th>
                          <th className="px-6 py-3">Item Name</th>
                          <th className="px-6 py-3">UOM</th>
                          <th className="px-6 py-3">Minimum Stock Level</th>
                          <th className="px-6 py-3 text-right">Sales Price</th>
                          <th className="px-6 py-3 text-right">
                            Wholesales Price
                          </th>
                          <th className="px-6 py-3 text-right">Cost Price</th>
                          <th className="px-6 py-3 text-right">Qty</th>
                          <th className="px-6 py-3 text-right">
                            Carton Quantity
                          </th>
                          <th className="px-6 py-3 text-right">Line Total</th>
                          <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr
                            key={index}
                            className="border-t hover:bg-gray-50/50"
                          >
                            <td className="px-6 py-3 text-gray-400">
                              {index + 1}
                            </td>
                            <td className="px-6 py-3 font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-3 text-gray-500">
                              {item.uom}
                            </td>
                            <td className="px-6 py-3 text-gray-500">
                              {Number(item.minimumStockLevel).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right">
                              ₦{Number(item.salesPrice).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right">
                              ₦{Number(item.wholesalesPrice).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right">
                              ₦{Number(item.costPrice).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {Number(item.stockBalance).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {Number(item.cartonQuantity).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right font-semibold text-indigo-600">
                              ₦
                              {(
                                Number(item.stockBalance) *
                                Number(item.costPrice)
                              ).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Summaries */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-center md:text-left">
                    <div>
                      <p className="text-sm text-gray-500">
                        Total Items to Import
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {items.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Stock Qty</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {totalQuantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Total Opening Asset Value
                      </p>
                      <p className="mt-1 text-3xl font-bold text-indigo-700">
                        ₦{totalValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? "Importing Ledger..."
                  : "Import Items & Balances"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default ImportItemsModal;
