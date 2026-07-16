import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { posApi, inventoryApi, cashApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const createSessionSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  // cashAccountId: z.string().min(1, 'Cash account is required'),
  // openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
});

type CreateSessionFormData = z.infer<typeof createSessionSchema>;

interface CreatePosSessionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePosSessionModal = ({
  onClose,
  onSuccess,
}: CreatePosSessionModalProps) => {
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      warehouseId: user?.warehouseId || "",
      // openingBalance: 0
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-pos"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  // const { data: cashAccounts } = useQuery({
  //   queryKey: ['cash-accounts-for-pos'],
  //   queryFn: () => cashApi.getCashAccounts()
  // });

  const onSubmit = async (data: CreateSessionFormData) => {
    try {
      await posApi.createSession(data);
      toast.success("POS session started successfully");
      onSuccess();
    } catch (error) {
      console.error("Create POS session error:", error);
    }
  };

  console.log(user);
  // Filter warehouses and cash accounts based on user permissions
  // const availableWarehouses = user?.roles.includes('CFO') || user?.roles.includes('General Manager')
  //   ? warehouses?.warehouses
  //   : warehouses?.warehouses?.filter((w: any) => w.id === user?.warehouseId);
  const availableWarehouses =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Manager") ||
    user?.roles[0].includes("POS")
      ? warehouses?.warehouses
      : warehouses?.warehouses?.filter((w: any) => w.id === user?.warehouseId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">POS Session</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                Start New Session
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Session Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-start">
                <div className="p-3 bg-white rounded-xl shadow-sm mr-4">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">
                    Starting New Session
                  </h3>

                  <p className="text-sm text-gray-600 mt-1">
                    User: {user?.name}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Warehouse Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Warehouse
              </label>

              <select
                {...register("warehouseId")}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose warehouse</option>

                {availableWarehouses?.map((warehouse: any) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>

              {errors.warehouseId && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.warehouseId.message}
                </p>
              )}
            </div>

            {/* Optional Future Fields Placeholder */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
              <p className="text-sm text-gray-600">
                Opening balance and cash account options can be enabled later if
                needed.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? "Starting..." : "Start Session"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="fixed inset-0 z-50 overflow-y-auto">
  //     <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
  //       <div
  //         className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
  //         onClick={onClose}
  //       />

  //       <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
  //         <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
  //           <div className="flex items-center justify-between mb-4">
  //             <h3 className="text-lg leading-6 font-medium text-gray-900">
  //               Start POS Session
  //             </h3>
  //             <button
  //               onClick={onClose}
  //               className="text-gray-400 hover:text-gray-600"
  //             >
  //               <X className="h-6 w-6" />
  //             </button>
  //           </div>

  //           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  //             <div className="bg-blue-50 p-4 rounded-lg">
  //               <div className="flex items-center">
  //                 <Clock className="h-5 w-5 text-blue-500 mr-2" />
  //                 <div>
  //                   <div className="font-medium text-blue-900">
  //                     Starting New Session
  //                   </div>
  //                   <div className="text-sm text-blue-700">
  //                     User: {user?.name} | Time: {new Date().toLocaleString()}
  //                   </div>
  //                 </div>
  //               </div>
  //             </div>

  //             <div>
  //               <label className="block text-sm font-medium text-gray-700">
  //                 Warehouse *
  //               </label>
  //               <select
  //                 {...register("warehouseId")}
  //                 // disabled={!user?.roles.includes('CFO') && !user?.roles.includes('General Manager')}
  //                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
  //               >
  //                 <option value="">Select warehouse</option>
  //                 {availableWarehouses?.map((warehouse: any) => (
  //                   <option key={warehouse.id} value={warehouse.id}>
  //                     {warehouse.code} - {warehouse.name}
  //                   </option>
  //                 ))}
  //               </select>
  //               {errors.warehouseId && (
  //                 <p className="mt-1 text-sm text-red-600">
  //                   {errors.warehouseId.message}
  //                 </p>
  //               )}
  //             </div>

  //             {/* <div>
  //               <label className="block text-sm font-medium text-gray-700">
  //                 Cash Account *
  //               </label>
  //               <select
  //                 {...register('cashAccountId')}
  //                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //               >
  //                 <option value="">Select cash account</option>
  //                 {cashAccounts?.accounts?.map((account: any) => (
  //                   <option key={account.id} value={account.id}>
  //                     {account.code} - {account.name} (₦{Number(account.balance).toLocaleString()})
  //                   </option>
  //                 ))}
  //               </select>
  //               {errors.cashAccountId && (
  //                 <p className="mt-1 text-sm text-red-600">{errors.cashAccountId.message}</p>
  //               )}
  //             </div> */}

  //             {/* <div>
  //               <label className="block text-sm font-medium text-gray-700">
  //                 Opening Balance *
  //               </label>
  //               <input
  //                 {...register('openingBalance', { valueAsNumber: true })}
  //                 type="number"
  //                 step="0.01"
  //                 min="0"
  //                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                 placeholder="0.00"
  //               />
  //               {errors.openingBalance && (
  //                 <p className="mt-1 text-sm text-red-600">{errors.openingBalance.message}</p>
  //               )}
  //               <p className="mt-1 text-sm text-gray-500">
  //                 Count the cash in the register to determine opening balance
  //               </p>
  //             </div> */}

  //             <div className="flex justify-end space-x-3 pt-4">
  //               <button
  //                 type="button"
  //                 onClick={onClose}
  //                 className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //               >
  //                 Cancel
  //               </button>
  //               <button
  //                 type="submit"
  //                 disabled={isSubmitting}
  //                 className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  //               >
  //                 {isSubmitting ? "Starting..." : "Start Session"}
  //               </button>
  //             </div>
  //           </form>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default CreatePosSessionModal;
