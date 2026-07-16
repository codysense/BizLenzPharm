import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Save, Users } from 'lucide-react';
import { managementApi } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: {
    id: string;
    name: string;
  }[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface EditUserRolesModalProps {
  user: UserWithDetails;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserRolesModal = ({ user, roles, onClose, onSuccess }: EditUserRolesModalProps) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const updateRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) => managementApi.updateUserRoles(user.id, roleIds),
    onSuccess: () => {
      toast.success('User roles updated successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error('Update user roles error:', error);
      toast.error('Failed to update user roles');
    }
  });

  // Initialize selected roles
  useEffect(() => {
    setSelectedRoleIds(user.roles.map(role => role.id));
  }, [user]);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRolesMutation.mutate(selectedRoleIds);
  };

  const hasChanges = JSON.stringify(selectedRoleIds.sort()) !== JSON.stringify(user.roles.map(r => r.id).sort());

  return (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    {/* Wrapper */}
    <div className="flex min-h-screen items-start justify-center px-4 py-6 sm:py-10">
      
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl sticky top-0 z-10">
          <h3 className="text-lg font-semibold">
            Edit User Roles
          </h3>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Body */}
          <div className="p-6 space-y-6">
            
            {/* User Info */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-400 mt-1" />

                <div>
                  <div className="font-semibold text-gray-900">
                    {user.name}
                  </div>

                  <div className="text-sm text-gray-500">
                    {user.email}
                  </div>

                  <div className="mt-2">
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Roles */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Current Roles
              </h4>

              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <StatusBadge
                    key={role.id}
                    status={role.name}
                    variant="info"
                  />
                ))}

                {user.roles.length === 0 && (
                  <span className="text-sm text-gray-500 italic">
                    No roles assigned
                  </span>
                )}
              </div>
            </div>

            {/* Available Roles */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Available Roles
              </h4>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-start p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />

                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">
                        {role.name}
                      </div>

                      {role.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {role.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Changes Summary */}
            {hasChanges && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                  Changes Summary
                </h4>

                <div className="text-sm text-yellow-700 space-y-1">
                  <div>
                    <strong>Selected Roles:</strong>{" "}
                    {selectedRoleIds.length}
                  </div>

                  <div>
                    <strong>Previous Roles:</strong>{" "}
                    {user.roles.length}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t bg-white rounded-b-2xl sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                updateRolesMutation.isPending || !hasChanges
              }
              className="inline-flex items-center px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateRolesMutation.isPending
                ? "Updating..."
                : "Update Roles"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};

export default EditUserRolesModal;