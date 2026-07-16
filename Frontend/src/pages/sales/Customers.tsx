import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users, Edit } from "lucide-react";
import { salesApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Customer } from "../../types/api";
import CreateCustomerModal from "./CreateCustomerModal";
import EditCustomerModal from "./EditCustomerModal";

const Customers = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", { page, search }],
    queryFn: () =>
      salesApi.getCustomers({
        page,
        limit: 10,
        ...(search && { search }),
      }),
  });

  // console.log(data)

  const columns = [
    {
      key: "code",
      header: "Code",
      width: "w-24",
    },
    {
      key: "name",
      header: "Name",
      width: "w-48",
    },
    {
      key: "address",
      header: "Address",
      cell: (customer: Customer) => customer.address || "-",
      width: "w-64",
    },
    {
      key: "phone",
      header: "Phone",
      cell: (customer: Customer) => customer.phone || "-",
      width: "w-32",
    },
    {
      key: "email",
      header: "Email",
      cell: (customer: Customer) => customer.email || "-",
      width: "w-48",
    },
    {
      key: "creditLimit",
      header: "Credit Limit",
      cell: (customer: Customer) =>
        customer.creditLimit
          ? `₦${customer.creditLimit.toLocaleString()}`
          : "-",
      width: "w-32",
    },
    {
      key: "customerGroup.name",
      header: "Customer Group",
      // cell: (customer: Customer) => customer.customerGroup.name || '-',
      width: "w-32",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (customer: Customer) => (
        <StatusBadge status={customer.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
  ];

  const handleCreateCustomer = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditCustomer = () => {
    refetch();
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  //  const handleDeleteItem = async (item: Item) => {
  //     if (confirm(`Are you sure you want to delete Inventory ${item.name}?`)) {
  //       try {
  //         await inventoryApi.deleteItem(item.sku);
  //         toast.success('Item deleted successfully');
  //         refetch();
  //       } catch (error) {
  //         console.error('Delete Item error:', error);
  //       }
  //     }
  //   };

  const actions = (customer: Customer) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedCustomer(customer);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Customer"
      >
        <Edit className="h-4 w-4" />
      </button>

      {/* <button
                      onClick={() => handleDeleteItem(item)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button> */}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer information</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Customer
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Customers
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {data?.pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Customers
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {data?.customers?.filter((c: Customer) => c.isActive)
                      .length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Credit Limit
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    ₦
                    {data?.customers
                      ?.reduce(
                        (sum: number, c: Customer) =>
                          sum + Number(c.creditLimit || 0),
                        0,
                      )
                      .toLocaleString() || "0"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.customers || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateCustomer}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleEditCustomer}
        />
      )}
    </div>
  );
};

export default Customers;
