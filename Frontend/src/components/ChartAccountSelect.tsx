import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check,ChevronsUpDown } from "lucide-react";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
 type?: string;
}

interface ChartAccountSelectProps {
  accounts: ChartAccount[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ChartAccountSelect({ accounts, value, onChange, error }: ChartAccountSelectProps) {
  const [query, setQuery] = useState("");

  const filtered =
    query === ""
      ? accounts
      : accounts.filter((c) =>
          `${c.code} ${c.name} ${c.type || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );

  return (
    <div>
      <Combobox value={value} onChange={onChange}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
              displayValue={(id: string) =>
                accounts.find((c) => c.id === id)?.name || ""
              }
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search COA with name, code or type"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" />
            </Combobox.Button>
          </div>
          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 sm:text-sm">
              {filtered.length === 0 && query !== "" ? (
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
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                          {c.code} - {c.name} {c.type ? `(${c.type})` : ""}
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
