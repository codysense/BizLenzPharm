import { Dialog } from "@headlessui/react";
import { useEffect } from "react";
import { set, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { useCreateMemo } from "../../hooks/useMemo";
import { z } from "zod";
import { inventoryApi, managementApi, salesApi } from "../../lib/api";
import { purchaseApi } from "../../lib/api";
import { X } from "lucide-react";
import { VendorSelect } from "../../components/VendorSelect";
import { CustomerSelect } from "../../components/CustomerSelect";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const memoSchema = z.object({
  date: z.date().optional(),

  module: z.enum(["SALES", "PURCHASES"]),
  memoType: z.enum(["CREDIT", "DEBIT"]),

  // Linked
  saleId: z.string().optional(),
  purchaseId: z.string().optional(),
  warehouseId: z.string().optional(),

  // Standalone
  accountId: z.string().optional(),
  amount: z.number().optional(),

  customerId: z.string().optional(),
  vendorId: z.string().optional(),

  description: z.string().min(3).optional(),
});
// .refine(
//   (data) => {
//     if (data.module === "SALES" && data.memoType !== "CREDIT") return false;
//     if (data.module === "PURCHASES" && data.memoType !== "DEBIT")
//       return false;
//     return true;
//   },
//   {
//     message: "Invalid memo type for selected module",
//   },
// );

type FormValues = z.infer<typeof memoSchema>;

export const MemoModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const createMemo = useCreateMemo();

  // Fetch dropdown data
  const { data: customers } = useQuery({
    queryKey: ["customers-for-payment"],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-payments"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  // console.log('customers ', customers, 'vendors ', vendors, 'chartAccount', chartAccounts)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(memoSchema),
    shouldUnregister: true,
    defaultValues: {
      memoType: "CREDIT",
      description: "",
      amount: 0,
    },
  });

  const selectedModule = watch("module");
  const selectedCustomerId = watch("customerId");
  const selectedVendorId = watch("vendorId");
  const selectedSaleId = watch("saleId");
  const selectedPurchaseId = watch("purchaseId");

  const isLinked = !!selectedSaleId || !!selectedPurchaseId;

  const { data: customerSales } = useQuery({
    queryKey: ["customer-sales", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? salesApi.getSales({
            customerId: selectedCustomerId,

            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });

  const { data: vendorPurchases } = useQuery({
    queryKey: ["vendor-purchases", selectedVendorId],
    queryFn: () =>
      selectedVendorId
        ? purchaseApi.getPurchases({
            vendorId: selectedVendorId,
            limit: 100,
          })
        : null,
    enabled: !!selectedVendorId,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-user"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  useEffect(() => {
    setValue("accountId", "");
    setValue("amount", 0);
    setValue("description", "");
    if (selectedModule === "SALES") {
      setValue("vendorId", undefined);
      setValue("purchaseId", undefined);
      setValue("memoType", "CREDIT");
    }

    if (selectedModule === "PURCHASES") {
      setValue("customerId", undefined);
      setValue("saleId", undefined);
      setValue("memoType", "DEBIT");
      // setValue("accountId", undefined);
      // setValue("amount", 0);
    }
  }, [selectedModule]);

  const onSubmit = async (data: FormValues) => {
    try {
      await createMemo.mutateAsync({
        date: data.date ?? new Date(),
        module: data.module,
        memoType: data.memoType,

        saleId: data.saleId || undefined,
        purchaseId: data.purchaseId || undefined,
        warehouseId: data.warehouseId || undefined,

        customerId: data.customerId,
        vendorId: data.vendorId,

        amount: data.saleId || data.purchaseId ? undefined : data.amount,
        accountId: data.saleId || data.purchaseId ? undefined : data.accountId,

        description: data.description,
      });

      toast.success("Memo created successfully");
      onSuccess();
    } catch {
      toast.error("Failed to create memo");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl">
          <h3 className="text-lg font-semibold">New Memo</h3>

          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Module + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Module
                </label>
                <select
                  {...register("module")}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SALES">Sales</option>
                  <option value="PURCHASES">Purchases</option>
                </select>
                {errors.module && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.module.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  {...register("memoType")}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                </select>
                {errors.memoType && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.memoType.message}
                  </p>
                )}
              </div>
            </div>

            {/* Date + Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  {...register("date", { valueAsDate: true })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>

              {!isLinked && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Reason
              </label>
              <input
                {...register("description")}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Customer */}
            {selectedModule === "SALES" && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer
                </label>
                <CustomerSelect
                  customers={customers?.customers || []}
                  value={watch("customerId")}
                  onChange={(val) =>
                    setValue("customerId", val, { shouldDirty: true })
                  }
                  error={errors.customerId?.message}
                />
              </div>
            )}

            {/* Vendor */}
            {selectedModule === "PURCHASES" && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vendor
                </label>
                <VendorSelect
                  vendors={vendors?.vendors || []}
                  value={watch("vendorId")}
                  onChange={(val) =>
                    setValue("vendorId", val, { shouldDirty: true })
                  }
                  error={errors.vendorId?.message}
                />
              </div>
            )}

            {/* Warehouse (linked only) */}
            {isLinked && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Return Warehouse
                </label>
                <select
                  {...register("warehouseId")}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select warehouse</option>
                  {warehouses?.warehouses?.map((wh: any) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* GL Account */}
            {!isLinked && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  GL Account
                </label>
                <ChartAccountSelect
                  accounts={chartAccounts?.accounts || []}
                  value={watch("accountId")}
                  onChange={(val) =>
                    setValue("accountId", val, { shouldDirty: true })
                  }
                  error={errors.accountId?.message}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t bg-white rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-lg text-white text-sm font-medium
            ${
              watch("memoType") === "CREDIT"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
            >
              {isSubmitting ? "Posting..." : "Post Memo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
