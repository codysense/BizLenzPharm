import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect } from "react";

type KeyOf<T> = keyof T;

interface GenericSelectProps<T> {
  data: T[];
  value: any;
  onChange: (value: any) => void;

  // How to extract value (id)
  valueKey: KeyOf<T>;

  //  Fields to search
  searchKeys: KeyOf<T>[];

  //  How to render label in dropdown
  renderOption: (item: T) => string;

  //  How to display selected value in input
  displayValue: (item: T | undefined) => string;

  placeholder?: string;
  error?: string;

  onSearchRemote?: (query: string) => Promise<T | null>;
}

export function GenericSearchSelect<T>({
  data,
  value,
  onChange,
  valueKey,
  searchKeys,
  renderOption,
  displayValue,
  placeholder = "Search...",
  error,
  onSearchRemote,
}: GenericSelectProps<T>) {
  const [query, setQuery] = useState("");

  const [remoteItem, setRemoteItem] = useState<T | null>(null);
  // const [extendedData, setExtendedData] = useState<T[]>(data);

  // useEffect(() => {
  //   setExtendedData(data);
  // }, [data]);

  useEffect(() => {
    if (!query || !onSearchRemote) return;

    // Check if item already exists locally
    const existsLocally = data.some((item) =>
      searchKeys.some((key) =>
        String(item[key] ?? "")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    );

    if (!existsLocally) {
      const timer = setTimeout(async () => {
        try {
          const result = await onSearchRemote(query);
          setRemoteItem(result);
        } catch (err) {
          console.error("Remote search error:", err);
          setRemoteItem(null);
        }
      }, 400); // debounce

      return () => clearTimeout(timer);
    } else {
      setRemoteItem(null);
    }
  }, [query, data, searchKeys, onSearchRemote]);

  // const filtered =
  //   query === ""
  //     ? data
  //     : data.filter((item) =>
  //         searchKeys
  //           .map((key) => String(item[key] ?? ""))
  //           .join(" ")
  //           .toLowerCase()
  //           .includes(query.toLowerCase()),
  //       );

  const baseFiltered =
    query === ""
      ? data
      : data.filter((item) =>
          searchKeys
            .map((key) => String(item[key] ?? ""))
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
        );

  //  Merge remote item if exists
  const filtered =
    remoteItem &&
    !baseFiltered.some((i) => i[valueKey] === remoteItem[valueKey])
      ? [remoteItem, ...baseFiltered]
      : baseFiltered;

  const selectedItem =
    data.find((item) => item[valueKey] === value) ||
    (remoteItem && remoteItem[valueKey] === value ? remoteItem : undefined);

  return (
    <div>
      <Combobox value={value} onChange={onChange}>
        <div className="relative mt-1">
          {/* Input */}
          <div className="relative w-full cursor-default overflow-hidden rounded-md border border-blue-300 bg-white text-left shadow-sm focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
              displayValue={() => displayValue(selectedItem)}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />

            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" />
            </Combobox.Button>
          </div>

          {/* Dropdown */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-blue/5 sm:text-sm">
              {filtered.length === 0 && query !== "" ? (
                <div className="py-2 px-4 text-gray-700">Nothing found.</div>
              ) : (
                filtered.map((item, idx) => {
                  const itemValue = item[valueKey];

                  return (
                    <Combobox.Option
                      key={idx}
                      value={itemValue}
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
                            {renderOption(item)}
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
                  );
                })
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
