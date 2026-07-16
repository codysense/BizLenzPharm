import { Fragment, useEffect, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useDebounce } from "../utils/debounce";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { purchaseApi } from "../lib/api"; // 👈 adjust to your API namespace

interface Vendor {
  id: string;
  code: string;
  name: string;
  phone?: string;
}

interface VendorSelectProps {
  vendors?: Vendor[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  typeFilter?: string; // optional filter if your API supports it
}

export function VendorSelect({
  //vendors,
  value,
  onChange,
  error,
  typeFilter,
}: VendorSelectProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const [loadedVendors, setLoadedVendors] = useState<Vendor[]>([]);

  // Reset page on search or filter change
  useEffect(() => setPage(1), [debouncedSearch, typeFilter]);

  //  Fetch vendors dynamically
  const { data, isLoading } = useQuery({
    queryKey: ["vendors", { page, search: debouncedSearch, type: typeFilter }],
    queryFn: () =>
      purchaseApi.getVendors({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter && { type: typeFilter }),
      }),
    placeholderData: keepPreviousData,
  });

  const remoteVendors: Vendor[] = data?.vendors ?? [];
  const total = data?.pagination?.total ?? 0;

  useEffect(() => {
    setLoadedVendors([]);
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  useEffect(() => {
    if (!remoteVendors) return;

    setLoadedVendors((prev) =>
      page === 1 ? remoteVendors : [...prev, ...remoteVendors],
    );
  }, [remoteVendors, page]);

  const allVendors = loadedVendors;

  const { data: selectedVendorData } = useQuery({
    queryKey: ["vendor", value],
    queryFn: () => purchaseApi.getVendorById(value!),
    enabled: !!value && !allVendors.some((v) => v.id === value),
  });

  const selectedVendor =
    allVendors.find((v) => v.id === value) || selectedVendorData;

  //  Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 5;

    if (bottom && allVendors.length < total && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div>
      <Combobox value={value || ""} onChange={onChange || (() => {})}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
              displayValue={() => selectedVendor?.name || ""}
              // displayValue={(id: string) =>
              //   allVendors.find((v) => v.id === id)?.name || ""
              // }
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor by name, code, or phone..."
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
              {allVendors.length === 0 && !isLoading ? (
                <div className="cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                allVendors.map((v) => (
                  <Combobox.Option
                    key={v.id}
                    value={v.id}
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
                          {v.code} - {v.name} {v.phone ? `(${v.phone})` : ""}
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
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
