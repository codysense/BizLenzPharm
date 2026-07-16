import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save, Edit, X, Plus } from "lucide-react";
import { managementApi } from "../../lib/api";
import { SystemSetting } from "../../types/api";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";

const systemSettingSchema = z.object({
  category: z.string().min(1, "Category is required"),
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  dataType: z.enum(["STRING", "NUMBER", "BOOLEAN", "JSON"]).default("STRING"),
  description: z.string().optional(),
});

type SystemSettingFormData = z.infer<typeof systemSettingSchema>;

const SystemSettings = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["system-settings", selectedCategory],
    queryFn: () =>
      managementApi.getSystemSettings(selectedCategory || undefined),
  });

  const { data: costingPolicy } = useQuery({
    queryKey: ["costing-policy"],
    queryFn: () => managementApi.getCostingPolicy(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SystemSettingFormData) =>
      managementApi.updateSystemSetting(data),
    onSuccess: () => {
      toast.success("Setting updated successfully");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      setEditingSetting(null);
    },
    onError: (error) => {
      console.error("Update setting error:", error);
      toast.error("Failed to update setting");
    },
  });

  const updateCostingMutation = useMutation({
    mutationFn: (method: "FIFO" | "WEIGHTED_AVG") =>
      managementApi.updateCostingPolicy(method),
    onSuccess: () => {
      toast.success("Costing policy updated successfully");
      queryClient.invalidateQueries({ queryKey: ["costing-policy"] });
    },
    onError: (error) => {
      console.error("Update costing policy error:", error);
      toast.error("Failed to update costing policy");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SystemSettingFormData>({
    resolver: zodResolver(systemSettingSchema),
  });

  const categories = [
    ...new Set(
      settingsData?.settings?.map((s: SystemSetting) => s.category) || [],
    ),
  ];

  const handleEditSetting = (setting: SystemSetting) => {
    setEditingSetting(setting);
    reset({
      category: setting.category,
      key: setting.key,
      value: setting.value,
      dataType: setting.dataType,
      description: setting.description || "",
    });
  };

  const onSubmit = (data: SystemSettingFormData) => {
    updateMutation.mutate(data);
  };

  const handleCostingPolicyChange = (method: "FIFO" | "WEIGHTED_AVG") => {
    updateCostingMutation.mutate(method);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">System Settings</h1>
          <p className="text-gray-600">
            Configure system-wide settings and policies
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Setting
        </button>
      </div>

      {/* Costing Policy Quick Setting */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Global Costing Policy
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Set the default inventory costing method for all items
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleCostingPolicyChange("WEIGHTED_AVG")}
              disabled={updateCostingMutation.isPending}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                costingPolicy?.costingMethod === "WEIGHTED_AVG"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">Weighted Average</div>
              <div className="text-sm text-gray-500 mt-1">
                Average cost of all units in stock
              </div>
            </button>

            <button
              onClick={() => handleCostingPolicyChange("FIFO")}
              disabled={updateCostingMutation.isPending}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                costingPolicy?.costingMethod === "FIFO"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">FIFO (First In, First Out)</div>
              <div className="text-sm text-gray-500 mt-1">
                Cost based on oldest inventory first
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            System Settings
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {settingsData?.settings?.map((setting: SystemSetting) => (
            <div key={setting.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {setting.key.replace(/_/g, " ")}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {setting.description}
                      </p>
                    </div>
                    <StatusBadge status={setting.category} variant="info" />
                    <StatusBadge status={setting.dataType} />
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-medium text-gray-900">
                      Current Value:
                    </span>
                    <span className="ml-2 text-sm text-blue-600">
                      {setting.dataType === "BOOLEAN"
                        ? setting.value === "true"
                          ? "Enabled"
                          : "Disabled"
                        : setting.value}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Last updated by {setting.updatedByUser?.name} on{" "}
                    {new Date(setting.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {setting.isEditable && (
                    <button
                      onClick={() => handleEditSetting(setting)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Setting"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Setting Modal */}
      {editingSetting && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setEditingSetting(null)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Edit System Setting
                  </h3>
                  <button
                    onClick={() => setEditingSetting(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      {...register("category")}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Key
                    </label>
                    <input
                      {...register("key")}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Value *
                    </label>
                    {editingSetting.dataType === "BOOLEAN" ? (
                      <select
                        {...register("value")}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <input
                        {...register("value")}
                        type={
                          editingSetting.dataType === "NUMBER"
                            ? "number"
                            : "text"
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    )}
                    {errors.value && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.value.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingSetting(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
