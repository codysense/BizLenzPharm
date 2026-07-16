import { useState } from "react";
import { ChevronDown, ChevronUp, PlusIcon } from "lucide-react";

function PriceListCell({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);

  if (!item.priceList || item.priceList.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-blue-600 hover:underline"
      >
        <PlusIcon size={14} className="inline" />
        <span>{item.priceList.length}</span>
        {expanded ? (
          <ChevronUp size={14} className="inline" />
        ) : (
          <ChevronDown size={14} className="inline" />
        )}
      </button>

      {/* Dropdown list */}
      {expanded && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2 w-40">
          {item.priceList.map((pl: any, i: number) => (
            <div
              key={i}
              className="flex justify-between text-sm text-gray-700 border-b last:border-b-0 py-1"
            >
              <span>{pl.customerGroup}</span>
              <span>₦{Number(pl.price).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PriceListCell;
