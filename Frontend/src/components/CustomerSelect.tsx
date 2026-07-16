import { Fragment, useEffect, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useDebounce } from "../utils/debounce";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { salesApi } from "../lib/api";

interface Customer {
  id: string;
  code: string;
  name: string;
  phone?: string;
}

interface CustomerSelectProps {
  customers?: Customer[]; // make optional since you fetch inside anyway
  value?: string; // make optional
  onChange?: (value: string) => void; // optional handler
  error?: string;
  typeFilter?: string;
}
export function CustomerSelect({
  value,
  onChange,
  error,
  typeFilter,
}: CustomerSelectProps) {
  const [search, setSearch] = useState("");
  const [loadedCustomers, setLoadedCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);

  // debounce search
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useQuery({
    queryKey: [
      "customers",
      { page, search: debouncedSearch, type: typeFilter },
    ],
    queryFn: () =>
      salesApi.getCustomers({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter && { type: typeFilter }),
      }),
    placeholderData: keepPreviousData,
  });

  const customers: Customer[] = data?.customers ?? [];
  const total = data?.pagination?.total ?? 0;

  // useEffect(() => {
  //   if (!customers) return;

  //   setLoadedCustomers((prev) =>
  //     page === 1 ? customers : [...prev, ...customers],
  //   );
  // }, [customers, page]);

  useEffect(() => {
    if (!customers) return;

    setLoadedCustomers((prev) => {
      if (page === 1) return customers;

      const merged = [...prev, ...customers];

      return merged.filter(
        (customer, index, self) =>
          index === self.findIndex((c) => c.id === customer.id),
      );
    });
  }, [customers, page]);

  const allCustomers = loadedCustomers;

  const { data: selectedCustomerData } = useQuery({
    queryKey: ["customer", value],
    queryFn: () => salesApi.getCustomerById(value!),
    enabled: !!value && !allCustomers.some((c) => c.id === value),
  });

  // const selectedCustomer = allCustomers.find((c) => c.id === value);

  const selectedCustomer =
    allCustomers.find((c) => c.id === value) || selectedCustomerData;

  useEffect(() => {
    setLoadedCustomers([]);
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  // pagination — simple "load more" when scrolling
  // const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
  //   const bottom =
  //     e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
  //     e.currentTarget.clientHeight + 5;

  //   // if (bottom && customers.length < total && !isLoading) {
  //   //   setPage((prev) => prev + 1);
  //   // }

  //   if (bottom && allCustomers.length < total && !isLoading) {
  //     setPage((prev) => prev + 1);
  //   }
  // };

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 5;

    if (bottom && allCustomers.length < total && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  // //filter customers based on query - this is client-side filtering on already fetched data, you can remove if your API handles search
  // const filtered =
  //   query === ""
  //     ? customers
  //     : customers.filter((c) =>
  //         `${c.code} ${c.name} ${c.phone || ""}`
  //           .toLowerCase()
  //           .includes(query.toLowerCase()),
  //       );

  return (
    <div>
      <Combobox value={value || ""} onChange={onChange || (() => {})}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
              displayValue={() => selectedCustomer?.name || ""}
              // displayValue={(id: string) =>
              //   allCustomers.find((c) => c.id === id)?.name || ""
              // }
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer with name, code or phone number..."
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
              {allCustomers.length === 0 && !isLoading ? (
                <div className="cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                allCustomers.map((c) => (
                  <Combobox.Option
                    key={c.id}
                    value={c.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-blue-600 text-white" : "text-gray-900"
                      }`
                    }
                  >
                    {/* {filtered.length === 0 && query !== "" ? (
                <div className="cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filtered.map((c) => (
                  <Combobox.Option
                    key={c.id}
                    value={c.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-blue-600 text-white" : "text-gray-900"
                      }`
                    }
                  > */}
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                        >
                          {c.code} - {c.name} {c.phone ? `(${c.phone})` : ""}
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
