import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle,
  Plus,
  X,
  Trash2,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { managementApi } from "../../lib/api";
import { ApprovalWorkflow, ApprovalRequest } from "../../types/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  entity: z.enum([
    "PURCHASE_ORDER",
    "SALES_ORDER",
    "PRODUCTION_ORDER",
    "INVENTORY_ADJUSTMENT",
  ]),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  steps: z
    .array(
      z.object({
        name: z.string().min(1, "Step name is required"),
        roleId: z.string().min(1, "Role is required"),
        isRequired: z.boolean().default(true),
      }),
    )
    .min(1, "At least one approval step is required"),
});

type CreateWorkflowFormData = z.infer<typeof createWorkflowSchema>;

const ApprovalFlows = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);
  const queryClient = useQueryClient();

  const { data: workflowsData, isLoading: loadingWorkflows } = useQuery({
    queryKey: ["approval-workflows"],
    queryFn: () => managementApi.getApprovalWorkflows(),
  });

  const { data: requestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ["approval-requests"],
    queryFn: () => managementApi.getApprovalRequests(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles-for-approval"],
    queryFn: () => managementApi.getRolesWithPermissions(),
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (data: CreateWorkflowFormData) =>
      managementApi.createApprovalWorkflow(data),
    onSuccess: () => {
      toast.success("Approval workflow created successfully");
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      setShowCreateModal(false);
    },
    onError: (error) => {
      console.error("Create workflow error:", error);
      toast.error("Failed to create approval workflow");
    },
  });

  const processActionMutation = useMutation({
    mutationFn: ({
      id,
      action,
      comments,
    }: {
      id: string;
      action: "APPROVE" | "REJECT";
      comments?: string;
    }) => managementApi.processApprovalAction(id, { action, comments }),
    onSuccess: () => {
      toast.success("Approval action processed successfully");
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      setSelectedRequest(null);
    },
    onError: (error) => {
      console.error("Process approval error:", error);
      toast.error("Failed to process approval action");
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkflowFormData>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      steps: [{ name: "", roleId: "", isRequired: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "steps",
  });

  const workflowColumns = [
    {
      key: "name",
      header: "Workflow Name",
      width: "w-48",
    },
    {
      key: "entity",
      header: "Entity Type",
      cell: (workflow: ApprovalWorkflow) => (
        <StatusBadge
          status={workflow.entity.replace("_", " ")}
          variant="info"
        />
      ),
      width: "w-36",
    },
    {
      key: "minAmount",
      header: "Min Amount",
      cell: (workflow: ApprovalWorkflow) =>
        workflow.minAmount
          ? `₦${workflow.minAmount.toLocaleString()}`
          : "No limit",
      width: "w-32",
    },
    {
      key: "maxAmount",
      header: "Max Amount",
      cell: (workflow: ApprovalWorkflow) =>
        workflow.maxAmount
          ? `₦${workflow.maxAmount.toLocaleString()}`
          : "No limit",
      width: "w-32",
    },
    {
      key: "steps",
      header: "Steps",
      cell: (workflow: ApprovalWorkflow) => (
        <div className="space-y-1">
          {workflow.steps.map((step, index) => (
            <div
              key={step.id}
              className="text-xs bg-gray-100 px-2 py-1 rounded"
            >
              {index + 1}. {step.role?.name}
            </div>
          ))}
        </div>
      ),
      width: "w-48",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (workflow: ApprovalWorkflow) => (
        <StatusBadge status={workflow.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
  ];

  const requestColumns = [
    {
      key: "entityType",
      header: "Type",
      cell: (request: ApprovalRequest) => (
        <StatusBadge
          status={request.entityType.replace("_", " ")}
          variant="info"
        />
      ),
      width: "w-36",
    },
    {
      key: "workflow.name",
      header: "Workflow",
      width: "w-48",
    },
    {
      key: "requestedByUser.name",
      header: "Requested By",
      width: "w-32",
    },
    {
      key: "currentStep.role.name",
      header: "Current Step",
      cell: (request: ApprovalRequest) =>
        request.currentStep?.role?.name || "Completed",
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (request: ApprovalRequest) => (
        <StatusBadge status={request.status} />
      ),
      width: "w-24",
    },
    {
      key: "requestedAt",
      header: "Requested",
      cell: (request: ApprovalRequest) =>
        new Date(request.requestedAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const requestActions = (request: ApprovalRequest) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedRequest(request);
          setShowRequestsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {request.status === "PENDING" && (
        <>
          <button
            onClick={() =>
              processActionMutation.mutate({
                id: request.id,
                action: "APPROVE",
                comments: "Approved via management interface",
              })
            }
            className="text-green-600 hover:text-green-900"
            title="Approve"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              processActionMutation.mutate({
                id: request.id,
                action: "REJECT",
                comments: "Rejected via management interface",
              })
            }
            className="text-red-600 hover:text-red-900"
            title="Reject"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );

  const onSubmit = (data: CreateWorkflowFormData) => {
    createWorkflowMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Approval Flows</h1>
          <p className="text-gray-600">
            Configure approval workflows and manage requests
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </button>
      </div>

      {/* Approval Workflows */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Approval Workflows
          </h3>
        </div>
        <div className="p-6">
          <DataTable
            data={workflowsData?.workflows || []}
            columns={workflowColumns}
            loading={loadingWorkflows}
          />
        </div>
      </div>

      {/* Pending Approval Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Approval Requests
          </h3>
        </div>
        <div className="p-6">
          <DataTable
            data={requestsData?.requests || []}
            columns={requestColumns}
            loading={loadingRequests}
            actions={requestActions}
          />
        </div>
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Create Approval Workflow
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Workflow Name *
                      </label>
                      <input
                        {...register("name")}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., High Value Purchase Approval"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Entity Type *
                      </label>
                      <select
                        {...register("entity")}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="PURCHASE_ORDER">Purchase Orders</option>
                        <option value="SALES_ORDER">Sales Orders</option>
                        <option value="PRODUCTION_ORDER">
                          Production Orders
                        </option>
                        <option value="INVENTORY_ADJUSTMENT">
                          Inventory Adjustments
                        </option>
                      </select>
                      {errors.entity && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.entity.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Minimum Amount (₦)
                      </label>
                      <input
                        {...register("minAmount", { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Maximum Amount (₦)
                      </label>
                      <input
                        {...register("maxAmount", { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                  </div>

                  {/* Approval Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">
                        Approval Steps
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          append({ name: "", roleId: "", isRequired: true })
                        }
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Step
                      </button>
                    </div>

                    {errors.steps && (
                      <p className="mb-4 text-sm text-red-600">
                        {errors.steps.message}
                      </p>
                    )}

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="bg-gray-50 p-4 rounded-lg"
                        >
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Step Name *
                              </label>
                              <input
                                {...register(`steps.${index}.name`)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="e.g., CFO Approval"
                              />
                              {errors.steps?.[index]?.name && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.steps[index]?.name?.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Approver Role *
                              </label>
                              <select
                                {...register(`steps.${index}.roleId`)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              >
                                <option value="">Select role</option>
                                {rolesData?.roles?.map((role: any) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                              {errors.steps?.[index]?.roleId && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.steps[index]?.roleId?.message}
                                </p>
                              )}
                            </div>

                            <div className="flex items-end">
                              <div className="flex items-center space-x-2">
                                <input
                                  {...register(`steps.${index}.isRequired`)}
                                  type="checkbox"
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="text-sm text-gray-900">
                                  Required
                                </label>
                              </div>
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="ml-4 text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Creating..." : "Create Workflow"}
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

export default ApprovalFlows;
