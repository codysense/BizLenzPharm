import { Fragment, useState, useEffect, useMemo } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "../utils/debounce";
import { inventoryApi } from "../lib/api";
import { ItemLookup } from "../types/itemLookup";

interface Item {
  id: string;
  sku: string;
  name: string;
  stockQty: number;
}

interface ItemSelectProps {
  value: string;
  onChange?: (value: string, item?: ItemLookup) => void;
  error?: string;
  typeFilter?: string;
  noZeroItem?: boolean;
}

export function ItemSelect({
  value,
  onChange,
  error,
  typeFilter,
  noZeroItem,
}: ItemSelectProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);

  const debouncedSearch = useDebounce(search, 500);

  /**
   * Reset pagination + items when search or filter changes
   */
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [debouncedSearch, typeFilter]);

  /**
   * Fetch paginated items
   */
  const { data, isLoading } = useQuery({
    queryKey: ["items", { page, search: debouncedSearch, type: typeFilter }],
    queryFn: () =>
      inventoryApi.getItems({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter && { type: typeFilter }),
        ...(noZeroItem && { noZeroItem: true }),
      }),
    placeholderData: keepPreviousData,
  });

  /**
   * Merge paginated results safely
   */
  useEffect(() => {
    if (!data?.items) return;

    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));

      data.items.forEach((item: Item) => {
        map.set(item.id, item);
      });

      return Array.from(map.values());
    });
  }, [data]);

  /**
   * Ensure selected item always exists in state
   * Critical for Edit mode
   */
  useEffect(() => {
    if (!value) return;

    const exists = items.find((i) => i.id === value);
    if (exists) return;

    inventoryApi
      .getItemById(value)
      .then((item: Item) => {
        setItems((prev) => {
          const map = new Map(prev.map((i) => [i.id, i]));
          map.set(item.id, item);
          return Array.from(map.values());
        });
      })
      .catch(() => {
        // silently ignore if item no longer exists
      });
  }, [value]);

  const total = data?.pagination?.total ?? 0;

  /**
   * Infinite scroll pagination
   */
  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 5;

    if (bottom && items.length < total && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  /**
   * Memoized display lookup for performance
   */
  const selectedItem = useMemo(
    () => items.find((i) => i.id === value),
    [items, value],
  );

  return (
    <div>
      <Combobox value={value} onChange={onChange}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
              displayValue={() => selectedItem?.name ?? ""}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item..."
            />

            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" />
            </Combobox.Button>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options
              className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 sm:text-sm"
              onScroll={handleScroll}
            >
              {items.length === 0 && !isLoading ? (
                <div className="cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                items.map((i) => (
                  <Combobox.Option
                    key={i.id}
                    value={i.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-blue-600 text-white" : "text-gray-900"
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? "font-medium" : "font-normal"
                          }`}
                        >
                          {i.name} - {i.stockQty}
                        </span>

                        {selected && (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? "text-white" : "text-blue-600"
                            }`}
                          >
                            <Check className="h-5 w-5" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}

              {isLoading && (
                <div className="py-2 px-4 text-gray-500">Loading...</div>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
