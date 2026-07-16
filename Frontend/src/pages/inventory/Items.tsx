import React, { useState, useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Search, Package, Edit, Trash2 } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Item } from "../../types/api";
import CreateItemModal from "./CreateItemModal";
import EditItemModal from "./EditItemModal";
import toast from "react-hot-toast";
import { useDebounce } from "../../utils/debounce";
import PriceListCell from "../../components/PriceListCell";
import { ItemSelect } from "../../components/ItemSelect";

const Items = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["items", { page, search: debouncedSearch, type: typeFilter }],
    queryFn: () =>
      inventoryApi.getItems({
        page,
        limit: 10,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter && { type: typeFilter }),
      }),
    placeholderData: keepPreviousData,
  });
  // console.log(data)

  const columns = [
    {
      key: "sku",
      header: "SKU",
      width: "w-32",
    },
    {
      key: "name",
      header: "Name",
      width: "w-48",
    },
    {
      key: "type",
      header: "Type",
      cell: (item: Item) => (
        <StatusBadge status={item.type.replace("_", " ")} />
      ),
      width: "w-36",
    },
    {
      key: "uom",
      header: "UOM",
      width: "w-20",
    },
    {
      key: "costingMethod",
      header: "Costing Method",
      cell: (item: Item) => (
        <StatusBadge
          status={item.costingMethod.replace("_", " ")}
          variant="info"
        />
      ),
      width: "w-32",
    },
    {
      key: "standardCost",
      header: "Standard Cost",
      cell: (item: Item) =>
        item.standardCost ? `₦${item.standardCost.toLocaleString()}` : "-",
      width: "w-32",
    },
    // {
    //   key: 'sellingPriceWIC',
    //   header: 'WIC Price',
    //   cell: (item: Item) => item.sellingPriceWIC ? `₦${item.sellingPriceWIC.toLocaleString()}` : '-',
    //   width: 'w-32'
    // },
    // {
    //   key: 'sellingPriceOrdinary',
    //   header: 'Retail Price',
    //   cell: (item: Item) => item.sellingPriceOrdinary ? `₦${item.sellingPriceOrdinary.toLocaleString()}` : '-',
    //   width: 'w-32'
    // },
    // {
    //   key: 'sellingPriceBulk',
    //   header: 'BUlk Price',
    //   cell: (item: Item) => item.sellingPriceBulk ? `₦${item.sellingPriceBulk.toLocaleString()}` : '-',
    //   width: 'w-32'
    // },
    {
      key: "priceList",
      header: "Selling Price",
      cell: (item: Item) => <PriceListCell item={item} />,
      width: "w-40",
    },
    {
      key: "stockQty",
      header: "Stock Qty",
      cell: (item: Item & { stockQty?: number }) =>
        item.stockQty !== undefined ? item.stockQty.toString() : "-",
      width: "w-24",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (item: Item) => (
        <StatusBadge status={item.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
  ];

  const handleCreateItem = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditItem = () => {
    refetch();
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = async (item: Item) => {
    if (confirm(`Are you sure you want to delete Inventory ${item.name}?`)) {
      try {
        await inventoryApi.deleteItem(item.sku);
        toast.success("Item deleted successfully");
        refetch();
      } catch (error) {
        console.error("Delete Item error:", error);
      }
    }
  };

  const actions = (item: Item) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedItem(item);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Item"
      >
        <Edit className="h-4 w-4" />
      </button>

      <button
        onClick={() => handleDeleteItem(item)}
        className="text-red-600 hover:text-red-900"
        title="Delete Item"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
          <p className="text-gray-500 mt-1">
            Manage and organize your stock items efficiently
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Item
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />

            <input
              type="text"
              placeholder="Search items by SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* TYPE FILTER */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">All Types</option>
            <option value="RAW_MATERIAL">Raw Material</option>
            <option value="WORK_IN_PROGRESS">Work in Progress</option>
            <option value="FINISHED_GOODS">Finished Goods</option>
            <option value="CONSUMABLE">Consumable</option>
          </select>

          {/* OPTIONAL: QUICK ACTION SLOT (future proofing) */}
          <div className="hidden md:flex items-center justify-end text-sm text-gray-400">
            Filter inventory results
          </div>
        </div>
      </div>

      {/* TABLE WRAPPER */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <DataTable
          data={data?.items || []}
          columns={columns}
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          actions={actions}
        />
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <CreateItemModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateItem}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedItem && (
        <EditItemModal
          item={selectedItem}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          onSuccess={handleEditItem}
        />
      )}
    </div>
  );
};

export default Items;
